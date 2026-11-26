const UA = 'FluencyForge/1.0 (https://github.com/joaoobata/fluency-forge)';

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

async function searchYoutubeVideo(query) {
  // Search lyric videos first because official Vevo videos sometimes restrict third-party embeds
  const searchTerm = `${query} lyrics audio`;
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  if (!resp.ok) throw new Error(`YouTube search HTTP ${resp.status}`);
  const html = await resp.text();
  const matches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map(m => m[1]);
  const unique = [...new Set(matches)].slice(0, 6);
  return unique;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const id = (searchParams.get('id') || '').trim();
  const ytq = (searchParams.get('ytq') || '').trim();

  try {
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
      return new Response(JSON.stringify({ ok: false, error: 'Informe o parâmetro q' }), {
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
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Erro ao buscar letra' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
