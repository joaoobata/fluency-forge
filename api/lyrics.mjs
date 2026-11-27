const UA = 'FluencyForge/1.0 (https://github.com/joaoobata/fluency-forge)';
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function cleanTrackTitle(raw) {
  return String(raw || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s*[\(\[](?:official\s*(?:music\s*)?video|official\s*audio|lyric\s*video|lyrics?|audio|hd|4k|hq|visualizer|remaster(?:ed)?(?:\s*\d{4})?|radio\s*edit|single\s*version|album\s*version|explicit|clean)[\)\]]/gi, '')
    .replace(/\s+-\s*(?:remaster(?:ed)?(?:\s*\d{4})?|radio\s*edit|single\s*version)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanArtistName(raw) {
  return String(raw || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isUnwantedVersion(title) {
  return /\b(karaoke|instrumental|tribute|ringtone|lullaby|sped\s*up|slowed|8d\s*audio|cover\s*version|backing\s*track)\b/i.test(String(title || ''));
}

function mapGenre(rawGenre) {
  const g = String(rawGenre || '').toLowerCase();
  if (/hip-?hop|rap|trap/.test(g)) return { genre: 'rap', level: 'Difícil • B2' };
  if (/rock|alt|indie|metal|punk|grunge/.test(g)) return { genre: 'rock', level: 'Médio • B1/B2' };
  if (/r&b|soul|funk|motown|jazz/.test(g)) return { genre: 'rnb', level: 'Médio • B1' };
  if (/acoustic|folk|singer|country|ballad/.test(g)) return { genre: 'easy', level: 'Fácil • A2/B1' };
  return { genre: 'pop', level: 'Médio • B1' };
}

function dedupeSongs(list) {
  const seen = new Set();
  const out = [];
  for (const s of list) {
    const title = cleanTrackTitle(s.title);
    const artist = cleanArtistName(s.artist);
    if (!title || !artist || isUnwantedVersion(title)) continue;
    const key = `${artist.toLowerCase().replace(/[^a-z0-9]/g, '')}::${title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      query: `${artist.split(',')[0].trim()} ${title}`,
      title,
      artist,
      level: s.level || 'Médio • B1',
      genre: s.genre || 'pop',
      ...(s.ytId ? { ytId: s.ytId } : {}),
      ...(s.coverUrl ? { coverUrl: s.coverUrl } : {}),
      custom: true
    });
  }
  return out;
}

async function searchLrcLib(query) {
  const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!resp.ok) throw new Error(`LRCLIB HTTP ${resp.status}`);
  const rows = await resp.json();
  if (!Array.isArray(rows)) return [];
  return rows
    .filter(r => r && r.syncedLyrics && !r.instrumental)
    .slice(0, 12)
    .map(r => ({
      id: r.id,
      trackName: r.trackName,
      artistName: r.artistName,
      albumName: r.albumName || '',
      duration: r.duration || 0,
      syncedLyrics: r.syncedLyrics
    }));
}

async function getLrcById(id) {
  const url = `https://lrclib.net/api/get/${encodeURIComponent(id)}`;
  const resp = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!resp.ok) throw new Error(`LRCLIB get HTTP ${resp.status}`);
  const r = await resp.json();
  return {
    id: r.id,
    trackName: r.trackName,
    artistName: r.artistName,
    albumName: r.albumName || '',
    duration: r.duration || 0,
    syncedLyrics: r.syncedLyrics || ''
  };
}

function scoreOfficialYoutubeVideo(title, channel, query) {
  const t = String(title || '').toLowerCase();
  const c = String(channel || '').toLowerCase();
  let score = 0;
  if (/official\s+music\s+video/i.test(t)) score += 110;
  else if (/official\s+video/i.test(t)) score += 95;
  else if (/\(official\)|\[official\]/i.test(t)) score += 65;
  else if (/official\s+visualizer/i.test(t)) score += 45;
  else if (/official\s+audio/i.test(t)) score += 30;
  else if (/music\s+video/i.test(t)) score += 35;
  if (/vevo/i.test(c)) score += 30;
  if (/-\s*topic$/i.test(c)) score += 15;
  const qWords = String(query || '').toLowerCase().split(/\s+/).filter(w => w.length >= 3);
  if (qWords.some(w => c.includes(w))) score += 20;
  if (/\b(lyrics?|lyric\s*video|letra|tradu[cç][aã]o|legendado|karaoke|instrumental|sped\s*up|slowed|reverb|8d|nightcore|cover|tutorial|piano\s+version|guitar|reaction|1\s*hour|sub\s+espa[nñ]ol)\b/i.test(t)) {
    score -= 220;
  }
  if (/\b(lyrics?|karaoke|tradu[cç]|legendado|nightcore|cover)\b/i.test(c)) score -= 150;
  return score;
}

function extractYtInitialData(html) {
  const markers = ['var ytInitialData = ', 'window["ytInitialData"] = ', 'ytInitialData = '];
  for (const marker of markers) {
    const start = html.indexOf(marker);
    if (start === -1) continue;
    const jsonStart = html.indexOf('{', start + marker.length - 1);
    if (jsonStart === -1) continue;
    const scriptEnd = html.indexOf('</script>', jsonStart);
    if (scriptEnd === -1) continue;
    let slice = html.slice(jsonStart, scriptEnd).trim();
    if (slice.endsWith(';')) slice = slice.slice(0, -1).trim();
    try { return JSON.parse(slice); } catch (_) {}
  }
  return null;
}

function collectYoutubeVideoRenderers(node, query, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const item of node) collectYoutubeVideoRenderers(item, query, out); return out; }
  if (node.videoRenderer && node.videoRenderer.videoId) {
    const vr = node.videoRenderer;
    const title = (vr.title?.runs || []).map(r => r.text).join('') || vr.title?.simpleText || '';
    const channel = (vr.ownerText?.runs || []).map(r => r.text).join('') || '';
    out.push({ id: vr.videoId, title, channel, score: scoreOfficialYoutubeVideo(title, channel, query) });
  }
  for (const val of Object.values(node)) { if (val && typeof val === 'object') collectYoutubeVideoRenderers(val, query, out); }
  return out;
}

async function searchYoutubeVideo(query) {
  const searchTerm = `${query} official music video`;
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9' }
  });
  if (!resp.ok) throw new Error(`YouTube search HTTP ${resp.status}`);
  const html = await resp.text();
  const ytData = extractYtInitialData(html);
  if (ytData) {
    const all = collectYoutubeVideoRenderers(ytData, query);
    const seen = new Set();
    const unique = [];
    for (const item of all) { if (!item.id || seen.has(item.id)) continue; seen.add(item.id); unique.push(item); }
    unique.sort((a, b) => b.score - a.score);
    const nonLyric = unique.filter(v => v.score > -50);
    const chosen = (nonLyric.length >= 2 ? nonLyric : unique).slice(0, 6);
    if (chosen.length) return chosen.map(v => v.id);
  }
  const matches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map(m => m[1]);
  return [...new Set(matches)].slice(0, 6);
}

async function importByArtists(artistsRaw, perArtist = 20) {
  const artists = String(artistsRaw || '')
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  const limit = Math.max(5, Math.min(40, Number(perArtist) || 20));
  const raw = [];

  for (const term of artists) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&attribute=artistTerm&limit=${Math.min(50, limit * 2)}`;
    const resp = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!resp.ok) continue;
    const json = await resp.json();
    const results = Array.isArray(json.results) ? json.results : [];
    const termLow = term.toLowerCase();
    // Prefer exact artist match first
    const matched = results.filter(r =>
      r && r.trackName && r.artistName &&
      !isUnwantedVersion(r.trackName) &&
      (r.artistName.toLowerCase().includes(termLow) || termLow.includes(r.artistName.toLowerCase()))
    );
    const chosen = (matched.length ? matched : results).slice(0, limit * 2);
    const artistSongs = dedupeSongs(chosen.map(r => {
      const { genre, level } = mapGenre(r.primaryGenreName);
      return {
        title: r.trackName,
        artist: r.artistName,
        genre,
        level
      };
    })).slice(0, limit);
    raw.push(...artistSongs);
  }
  return { source: 'itunes', songs: dedupeSongs(raw) };
}

async function importFromPlaylistUrl(rawUrl) {
  const urlStr = String(rawUrl || '').trim();

  // 1. Spotify Playlist or Album
  const spMatch = urlStr.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(playlist|album)\/([a-zA-Z0-9]+)/i);
  if (spMatch) {
    const [, kind, id] = spMatch;
    const embedUrl = `https://open.spotify.com/embed/${kind.toLowerCase()}/${id}`;
    const resp = await fetch(embedUrl, { headers: { 'User-Agent': BROWSER_UA } });
    if (!resp.ok) throw new Error(`Spotify HTTP ${resp.status}`);
    const html = await resp.text();
    const m = html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) throw new Error('Não foi possível ler esta playlist do Spotify (verifique se ela é pública).');
    const data = JSON.parse(m[1]);
    const entity = data?.props?.pageProps?.state?.data?.entity;
    const trackList = Array.isArray(entity?.trackList) ? entity.trackList : [];
    const songs = dedupeSongs(trackList.map(t => ({
      title: t.title || '',
      artist: t.subtitle || entity?.subtitle || 'Unknown',
      genre: 'pop',
      level: 'Médio • B1'
    })));
    return { source: 'spotify', playlistName: entity?.name || 'Spotify Playlist', songs };
  }

  // 2. Deezer Playlist or Album
  const dzMatch = urlStr.match(/deezer\.com\/(?:[a-z]{2}\/)?(playlist|album)\/(\d+)/i);
  if (dzMatch) {
    const [, kind, id] = dzMatch;
    const apiUrl = `https://api.deezer.com/${kind.toLowerCase()}/${id}`;
    const resp = await fetch(apiUrl, { headers: { 'User-Agent': UA } });
    if (!resp.ok) throw new Error(`Deezer HTTP ${resp.status}`);
    const data = await resp.json();
    const tracks = Array.isArray(data?.tracks?.data) ? data.tracks.data : [];
    const songs = dedupeSongs(tracks.map(t => ({
      title: t.title || '',
      artist: t.artist?.name || 'Unknown',
      genre: 'pop',
      level: 'Médio • B1'
    })));
    return { source: 'deezer', playlistName: data?.title || 'Deezer Playlist', songs };
  }

  // 3. YouTube Playlist
  const ytMatch = urlStr.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    const listId = ytMatch[1];
    const resp = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}`, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9' }
    });
    if (!resp.ok) throw new Error(`YouTube Playlist HTTP ${resp.status}`);
    const html = await resp.text();
    const m = html.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
    const items = [];
    let playlistName = 'YouTube Playlist';
    if (m) {
      try {
        const ytData = JSON.parse(m[1]);
        playlistName = ytData?.metadata?.playlistMetadataRenderer?.title || playlistName;
        const rawJson = m[1];
        const vidMatches = [...rawJson.matchAll(/"playlistVideoRenderer":\{"videoId":"[a-zA-Z0-9_-]{11}"[\s\S]*?"title":\{"runs":\[\{"text":"([^"]+)"\}/g)];
        for (const vm of vidMatches.slice(0, 100)) {
          const fullTitle = cleanTrackTitle(vm[1]);
          if (!fullTitle || /deleted video|private video/i.test(fullTitle)) continue;
          const parts = fullTitle.split(/\s+[-–—]\s+/);
          if (parts.length >= 2) {
            items.push({ artist: parts[0], title: parts.slice(1).join(' - '), genre: 'pop', level: 'Médio • B1' });
          } else {
            items.push({ artist: 'YouTube', title: fullTitle, genre: 'pop', level: 'Médio • B1' });
          }
        }
      } catch (_) {}
    }
    if (!items.length) throw new Error('Não encontramos faixas públicas nesta playlist do YouTube.');
    return { source: 'youtube', playlistName, songs: dedupeSongs(items) };
  }

  throw new Error('Link não reconhecido. Use um link público de Playlist ou Álbum do Spotify, Deezer ou YouTube.');
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const id = (searchParams.get('id') || '').trim();
  const ytq = (searchParams.get('ytq') || '').trim();
  const artist = (searchParams.get('artist') || '').trim();
  const importUrl = (searchParams.get('importUrl') || '').trim();
  const limit = Number(searchParams.get('limit') || 20);

  try {
    if (artist) {
      const result = await importByArtists(artist, limit);
      return new Response(JSON.stringify({ ok: true, ...result }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600'
        }
      });
    }

    if (importUrl) {
      const result = await importFromPlaylistUrl(importUrl);
      return new Response(JSON.stringify({ ok: true, ...result }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=600, s-maxage=600'
        }
      });
    }

    if (ytq) {
      const videoIds = await searchYoutubeVideo(ytq);
      return new Response(JSON.stringify({ ok: true, videoIds }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400'
        }
      });
    }

    if (id) {
      const item = await getLrcById(id);
      return new Response(JSON.stringify({ ok: true, item }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=604800, s-maxage=604800'
        }
      });
    }

    if (!q) {
      return new Response(JSON.stringify({ ok: false, error: 'Informe o parâmetro q, artist ou importUrl' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const items = await searchLrcLib(q);
    return new Response(JSON.stringify({ ok: true, items }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400'
      }
    });
  } catch (err) {
    console.error('[Lyrics API] Error:', err?.message || err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Erro ao buscar músicas' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

const TRANSLATION_CACHE = new Map();

async function translateBatchEnToPt(uniqueLines) {
  const results = new Map();
  const pending = [];
  for (const line of uniqueLines) {
    const clean = String(line || '').replace(/\s+/g, ' ').trim();
    if (!clean) continue;
    if (TRANSLATION_CACHE.has(clean)) results.set(clean, TRANSLATION_CACHE.get(clean));
    else pending.push(clean);
  }
  if (!pending.length) return results;

  const chunks = [];
  let cur = [];
  let curLen = 0;
  for (const line of pending) {
    if (cur.length >= 22 || (curLen + line.length > 1500 && cur.length > 0)) {
      chunks.push(cur);
      cur = [];
      curLen = 0;
    }
    cur.push(line);
    curLen += line.length + 1;
  }
  if (cur.length) chunks.push(cur);

  await Promise.all(chunks.map(async (chunk) => {
    try {
      const joined = chunk.join('\n');
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(joined)}`;
      const r = await fetch(url, { headers: { 'User-Agent': BROWSER_UA } });
      if (!r.ok) return;
      const data = await r.json();
      const translatedFull = (Array.isArray(data?.[0]) ? data[0] : [])
        .map(part => (Array.isArray(part) ? (part[0] || '') : ''))
        .join('');
      const splitLines = translatedFull.split('\n');
      for (let i = 0; i < chunk.length; i++) {
        const pt = (splitLines[i] || '').trim();
        if (pt) {
          results.set(chunk[i], pt);
          if (TRANSLATION_CACHE.size > 2000) {
            const firstKey = TRANSLATION_CACHE.keys().next().value;
            TRANSLATION_CACHE.delete(firstKey);
          }
          TRANSLATION_CACHE.set(chunk[i], pt);
        }
      }
    } catch (_) {}
  }));
  return results;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawLines = Array.isArray(body?.lines) ? body.lines.slice(0, 160) : [];
    if (!rawLines.length) {
      return new Response(JSON.stringify({ ok: false, error: 'Envie as linhas da letra.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    const normalized = rawLines.map(l => String(l || '').replace(/\s+/g, ' ').trim().slice(0, 260));
    const unique = [...new Set(normalized.filter(Boolean))];
    const map = await translateBatchEnToPt(unique);
    const translations = normalized.map(line => (line ? (map.get(line) || '') : ''));
    return new Response(JSON.stringify({ ok: true, translations }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Erro ao traduzir letra.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
