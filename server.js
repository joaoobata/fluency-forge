const http = require('http');
const fs = require('fs');
const path = require('path');
let MsEdgeTTS = null;
let OUTPUT_FORMAT = null;
try {
  ({ MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts'));
} catch (_) {}

const ALLOWED_VOICES = new Set([
  'en-US-AndrewMultilingualNeural',
  'en-US-AvaMultilingualNeural',
  'en-US-AriaNeural',
  'en-US-BrianMultilingualNeural',
  'en-US-EmmaMultilingualNeural',
  'en-US-GuyNeural',
  'en-GB-SoniaNeural',
  'en-GB-RyanNeural'
]);

function toSsmlRate(rawRate) {
  const num = Number(rawRate);
  if (!Number.isFinite(num)) return '+0%';
  const clamped = Math.max(0.65, Math.min(1.3, num));
  const pct = Math.round((clamped - 1) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

const PORT = process.env.PORT || 3456;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function readProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Erro ao ler progress.json:', err.message);
  }
  return null;
}

function writeProgress(data) {
  const tmpFile = PROGRESS_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpFile, PROGRESS_FILE);
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // API: GET /api/lyrics (LRCLIB synced lyrics + YouTube video lookup)
  if (pathname === '/api/lyrics' && req.method === 'GET') {
    const q = (parsedUrl.searchParams.get('q') || '').trim();
    const id = (parsedUrl.searchParams.get('id') || '').trim();
    const ytq = (parsedUrl.searchParams.get('ytq') || '').trim();
    const UA = 'FluencyForge/1.0 (https://github.com/joaoobata/fluency-forge)';

    (async () => {
      try {
        if (ytq) {
          const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(ytq + ' lyrics audio')}`;
          const resp = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9'
            }
          });
          const html = await resp.text();
          const videoIds = [...new Set([...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map(m => m[1]))].slice(0, 6);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true, videoIds }));
          return;
        }
        if (id) {
          const resp = await fetch(`https://lrclib.net/api/get/${encodeURIComponent(id)}`, { headers: { 'User-Agent': UA } });
          const r = await resp.json();
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true, item: r }));
          return;
        }
        if (!q) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'Missing q' }));
          return;
        }
        const resp = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': UA } });
        const rows = await resp.json();
        const items = Array.isArray(rows)
          ? rows.filter(r => r && r.syncedLyrics && !r.instrumental).slice(0, 12).map(r => ({
              id: r.id,
              trackName: r.trackName,
              artistName: r.artistName,
              albumName: r.albumName || '',
              duration: r.duration || 0,
              syncedLyrics: r.syncedLyrics
            }))
          : [];
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, items }));
      } catch (err) {
        console.error('Local lyrics API error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    })();
    return;
  }

  // API: GET /api/tts (Neural Voices)
  if (pathname === '/api/tts' && req.method === 'GET') {
    const rawText = (parsedUrl.searchParams.get('text') || '').replace(/\s+/g, ' ').trim().slice(0, 480);
    const reqVoice = parsedUrl.searchParams.get('voice') || 'en-US-AndrewMultilingualNeural';
    const voice = ALLOWED_VOICES.has(reqVoice) ? reqVoice : 'en-US-AndrewMultilingualNeural';
    const ssmlRate = toSsmlRate(parsedUrl.searchParams.get('rate') || '1.0');

    if (!rawText || !MsEdgeTTS) {
      res.writeHead(rawText ? 503 : 400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: rawText ? 'msedge-tts not installed' : 'Missing text' }));
      return;
    }

    (async () => {
      const tts = new MsEdgeTTS();
      try {
        await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        const { audioStream } = tts.toStream(rawText, { rate: ssmlRate });
        const chunks = [];
        for await (const chunk of audioStream) chunks.push(chunk);
        const buf = Buffer.concat(chunks);
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400'
        });
        res.end(buf);
      } catch (err) {
        console.error('Local TTS error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'TTS failed' }));
      } finally {
        try { tts.close(); } catch (_) {}
      }
    })();
    return;
  }

  // API: GET /api/progress
  if (pathname === '/api/progress' && req.method === 'GET') {
    const data = readProgress();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, data }));
    return;
  }

  // API: POST /api/progress
  if (pathname === '/api/progress' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Payload muito grande' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        writeProgress(parsed);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'JSON inválido' }));
      }
    });
    return;
  }

  // Static files
  let safePath = pathname === '/' ? '/index.html' : pathname;
  safePath = path.normalize(safePath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Acesso negado');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Arquivo não encontrado');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Erro interno do servidor');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('====================================================');
  console.log('  FluencyForge — Plataforma de Imersão em Inglês');
  console.log(`  Acesse no navegador: http://localhost:${PORT}`);
  console.log('  Progresso salvo em:  D:\\FluencyForge\\data\\progress.json');
  console.log('====================================================');
  console.log('');
});
