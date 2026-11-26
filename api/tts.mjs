import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

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

async function generateEdgeNeural(text, voice, ssmlRate) {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text, { rate: ssmlRate });
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const buf = Buffer.concat(chunks);
    if (!buf.length) throw new Error('Empty audio buffer from Edge TTS');
    return buf;
  } finally {
    try { tts.close(); } catch (_) {}
  }
}

async function generateGoogleFallback(text) {
  const clipped = text.slice(0, 195);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(clipped)}`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!resp.ok) throw new Error(`Google TTS fallback HTTP ${resp.status}`);
  const arr = await resp.arrayBuffer();
  return Buffer.from(arr);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawText = (searchParams.get('text') || '').replace(/\s+/g, ' ').trim();
  const reqVoice = searchParams.get('voice') || 'en-US-AndrewMultilingualNeural';
  const voice = ALLOWED_VOICES.has(reqVoice) ? reqVoice : 'en-US-AndrewMultilingualNeural';
  const ssmlRate = toSsmlRate(searchParams.get('rate') || '1.0');

  if (!rawText) {
    return new Response(JSON.stringify({ error: 'Missing text parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  const text = rawText.slice(0, 480);

  try {
    const buffer = await generateEdgeNeural(text, voice, ssmlRate);
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'X-TTS-Provider': 'azure-neural-free'
      }
    });
  } catch (err) {
    console.error('[TTS] Edge Neural error, trying fallback:', err?.message || err);
    try {
      const fallbackBuf = await generateGoogleFallback(text);
      return new Response(fallbackBuf, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          'X-TTS-Provider': 'google-fallback'
        }
      });
    } catch (fbErr) {
      console.error('[TTS] Fallback failed:', fbErr?.message || fbErr);
      return new Response(JSON.stringify({ error: 'TTS generation failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
  }
}
