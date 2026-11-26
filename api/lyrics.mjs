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

async function searchYoutubeVideo(query) {
  const searchTerm = `${query} lyrics audio`;
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  if (!resp.ok) throw new Error(`YouTube search HTTP ${resp.status}`);
  const html = await resp.text();
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
