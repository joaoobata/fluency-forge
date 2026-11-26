import { CURATED_SONGS, SONG_GENRES } from './data-songs.js';
import { playClick, playCorrect, playWrong, playVictory, iconHtml, refreshIcons } from './sfx.js';
import { addXp, addCustomCard } from './store.js';
import { speak } from './speech.js';

const DIFFICULTIES = [
  { id: 'easy', label: 'Fácil', desc: '1 palavra em poucos versos', lineRatio: 0.32, maxWords: 1, minWords: 1 },
  { id: 'medium', label: 'Médio', desc: '1 a 2 palavras por verso', lineRatio: 0.65, maxWords: 2, minWords: 1 },
  { id: 'hard', label: 'Difícil', desc: '2 a 3 palavras por verso', lineRatio: 0.90, maxWords: 3, minWords: 2 },
  { id: 'extreme', label: 'Extremo', desc: 'Quase todas as palavras', lineRatio: 1.0, maxWords: 4, minWords: 2 }
];

// Show each verse slightly BEFORE the exact vocal timestamp so reading feels instant and never late
const LEAD_IN_SEC = 0.65;
// Allow the singer to finish the last syllable before pausing on an unsolved blank
const END_GRACE_SEC = 0.35;
const SYNC_STORAGE_KEY = 'fluencyforge_lyrics_offsets_v1';

const STOP_WORDS = new Set([
  'the', 'and', 'you', 'for', 'are', 'but', 'not', 'all', 'can', 'her', 'was',
  'one', 'our', 'out', 'that', 'this', 'with', 'have', 'from', 'they', 'your',
  'just', 'like', 'been', 'will', 'when', 'what', 'ooh', 'yeah', 'hey', 'whoa',
  'hmm', 'la', 'na', 'da'
]);

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normWord(w) {
  return String(w || '').toLowerCase().replace(/[^a-z']/g, '');
}

function loadSavedOffset(songKey) {
  try {
    const map = JSON.parse(localStorage.getItem(SYNC_STORAGE_KEY) || '{}');
    return typeof map[songKey] === 'number' ? map[songKey] : 0;
  } catch (_) {
    return 0;
  }
}

function saveOffset(songKey, offset) {
  try {
    const map = JSON.parse(localStorage.getItem(SYNC_STORAGE_KEY) || '{}');
    map[songKey] = Number(offset.toFixed(2));
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(map));
  } catch (_) {}
}

function parseLRC(lrcText) {
  const lines = [];
  const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;
  for (const raw of String(lrcText || '').split('\n')) {
    const m = regex.exec(raw.trim());
    if (!m) continue;
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    const ms = parseInt((m[3] || '0').padEnd(3, '0'), 10);
    const text = m[4].trim();
    if (!text || /^\[.*\]$/.test(text) || /^[\W_]+$/.test(text)) continue;
    lines.push({ time: min * 60 + sec + ms / 1000, text });
  }
  lines.sort((a, b) => a.time - b.time);
  return lines;
}

function extractYoutubeId(input) {
  const s = String(input || '').trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildOptionsForWord(cleanAnswer, allWords, fallbackDistractors) {
  const distractorPool = shuffle([
    ...allWords.filter(w => w !== cleanAnswer && Math.abs(w.length - cleanAnswer.length) <= 3),
    ...fallbackDistractors.filter(w => w !== cleanAnswer)
  ]);
  const uniqueDistractors = [];
  for (const d of distractorPool) {
    if (!uniqueDistractors.includes(d) && d !== cleanAnswer) uniqueDistractors.push(d);
    if (uniqueDistractors.length === 3) break;
  }
  return shuffle([cleanAnswer, ...uniqueDistractors]);
}

function buildGameLines(rawLines, difficultyId) {
  const diff = DIFFICULTIES.find(d => d.id === difficultyId) || DIFFICULTIES[1];
  const allWords = [];
  for (const l of rawLines) {
    for (const tok of l.text.split(/\s+/)) {
      const clean = normWord(tok);
      if (clean.length >= 3 && !allWords.includes(clean)) allWords.push(clean);
    }
  }
  const fallbackDistractors = [
    'night', 'heart', 'dream', 'world', 'light', 'never', 'always', 'still',
    'right', 'shine', 'alone', 'break', 'close', 'voice', 'today', 'away',
    'time', 'mind', 'feel', 'stay', 'back', 'hold', 'home', 'fire'
  ];

  return rawLines.map((line, idx) => {
    const tokens = line.text.split(/\s+/);
    const nextTime = rawLines[idx + 1] ? rawLines[idx + 1].time : line.time + 5.5;
    const candidates = tokens
      .map((t, i) => ({ raw: t, clean: normWord(t), i }))
      .filter(x => x.clean.length >= 3);

    const blanks = [];
    const shouldBlankLine = candidates.length > 0 && (((idx * 37 + 11) % 100) / 100 < diff.lineRatio);

    if (shouldBlankLine) {
      const contentOnly = candidates.filter(x => !STOP_WORDS.has(x.clean));
      const primaryPool = contentOnly.length ? contentOnly : candidates;
      // Target how many blanks to place in this verse (multi-word for Medium/Hard/Extreme!)
      const desired = Math.min(
        candidates.length,
        diff.maxWords === 1
          ? 1
          : Math.min(diff.maxWords, Math.max(diff.minWords, Math.ceil(candidates.length * (diff.id === 'extreme' ? 0.65 : diff.id === 'hard' ? 0.5 : 0.35))))
      );

      // Prefer spaced-out content words first, then remaining eligible candidates
      const orderedPool = [
        ...shuffle(primaryPool),
        ...shuffle(candidates.filter(c => !primaryPool.some(p => p.i === c.i)))
      ];

      const chosen = [];
      for (const cand of orderedPool) {
        if (chosen.length >= desired) break;
        if (!chosen.some(c => c.i === cand.i)) {
          chosen.push(cand);
        }
      }

      // Sort left-to-right so user solves words naturally in singing order!
      chosen.sort((a, b) => a.i - b.i);

      for (const pick of chosen) {
        blanks.push({
          wordIndex: pick.i,
          raw: pick.raw,
          answer: pick.clean,
          typedCount: 0,
          options: buildOptionsForWord(pick.clean, allWords, fallbackDistractors),
          status: 'pending' // 'pending' | 'solved' | 'skipped'
        });
      }
    }

    return {
      idx,
      time: line.time,
      endTime: Math.max(line.time + 1.4, Math.min(nextTime, line.time + 8.5)),
      nextTime,
      text: line.text,
      tokens,
      blanks
    };
  });
}

function getActiveBlank(line) {
  if (!line || !line.blanks || !line.blanks.length) return null;
  return line.blanks.find(b => b.status === 'pending') || null;
}

function countTotalBlanks(lines) {
  return lines.reduce((acc, l) => acc + (l.blanks ? l.blanks.length : 0), 0);
}

// Persistent state for Real-Time Lyrics Cinema
const ls = {
  view: 'catalog', // 'catalog' | 'play'
  genreFilter: 'all',
  artistFilter: '',
  searchQuery: '',
  searching: false,
  searchResults: [],
  loadingMsg: '',

  // Active song
  songKey: '',
  songTitle: '',
  songArtist: '',
  rawLines: [],
  lines: [],
  videoIds: [],
  videoIdx: 0,
  videoError: false,

  // Settings
  mode: 'choice', // 'choice' | 'write' | 'karaoke'
  difficulty: 'medium', // 'easy' | 'medium' | 'hard' | 'extreme'
  playbackRate: 1.0,
  syncOffset: 0,
  showTools: false,

  // Live playback state
  phase: 'ready', // 'ready' | 'intro' | 'singing' | 'break' | 'ended'
  currentTime: 0,
  activeLineIdx: -1,
  lineProgress: 0,
  countdownSec: 0,
  waitingForBlank: false,
  score: 0,
  combo: 0,
  maxCombo: 0,
  solvedCount: 0,
  totalBlanks: 0,
  skippedCount: 0
};

let ytApiPromise = null;
let ytPlayer = null;
let syncTimer = null;
let toastFn = () => {};
let rerenderAllFn = () => {};
let lastRenderedPhaseKey = '';

function loadYoutubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

export function stopLyricsStudio() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  if (ytPlayer) {
    try { ytPlayer.destroy(); } catch (_) {}
    ytPlayer = null;
  }
}

export function renderLyricsView() {
  if (ls.view === 'play') return renderCinemaPlayerShell();
  return renderLyricsCatalog();
}

const FEATURED_ARTISTS = [
  'Imagine Dragons', 'Billie Eilish', 'Coldplay', 'Linkin Park',
  'Bruno Mars', 'The Weeknd', 'Olivia Rodrigo', 'Arctic Monkeys',
  'Adele', 'Ed Sheeran', 'Eminem', 'Twenty One Pilots', 'Queen'
];

function renderLyricsCatalog() {
  const filteredSongs = CURATED_SONGS.filter(s => {
    const genreOk = ls.genreFilter === 'all' || s.genre === ls.genreFilter;
    const artistOk = !ls.artistFilter || s.artist.toLowerCase().includes(ls.artistFilter.toLowerCase());
    return genreOk && artistOk;
  });

  return `
    <div class="stack-lg">
      <div class="card path-hero stack-md">
        <div class="stack-sm">
          <span class="pill" style="width:fit-content;">${iconHtml('music', 13)} Palco Real-Time • ${CURATED_SONGS.length} Músicas + Busca Global</span>
          <h2 style="font-size:22px;">A letra surge ao vivo no ritmo do cantor — escolha seu nível</h2>
          <p class="muted">Escolha <strong>Fácil</strong> (1 palavra), <strong>Médio</strong> (1–2 palavras/verso), <strong>Difícil</strong> (2–3 palavras/verso) ou <strong>Extremo</strong>, dê play e complete em tempo real.</p>
        </div>

        <form id="lyrics-search-form" class="row" style="align-items:stretch;">
          <input type="text" id="lyrics-search-input" value="${esc(ls.searchQuery)}" placeholder="Busque qualquer música ou artista do mundo (ex: Drake, Lana Del Rey, Coldplay)..." style="flex:1; font-size:14px; padding:11px 14px;" />
          <button type="submit" class="btn btn-primary" ${ls.searching ? 'disabled' : ''}>
            ${iconHtml('search', 15)} ${ls.searching ? 'Buscando...' : 'Buscar Música'}
          </button>
        </form>

        <div class="stack-sm">
          <div class="row">
            <span class="mini-label" style="min-width:74px;">Modo:</span>
            <button class="btn btn-sm ${ls.mode === 'choice' ? 'btn-primary' : 'btn-secondary'}" data-ls-mode="choice">${iconHtml('list-checks', 14)} Escolha (4 opções)</button>
            <button class="btn btn-sm ${ls.mode === 'write' ? 'btn-primary' : 'btn-secondary'}" data-ls-mode="write">${iconHtml('keyboard', 14)} Digitar na Letra</button>
            <button class="btn btn-sm ${ls.mode === 'karaoke' ? 'btn-primary' : 'btn-secondary'}" data-ls-mode="karaoke">${iconHtml('mic', 14)} Karaokê ao Vivo</button>
          </div>
          <div class="row">
            <span class="mini-label" style="min-width:74px;">Dificuldade:</span>
            ${DIFFICULTIES.map(d => `
              <button class="btn btn-sm ${ls.difficulty === d.id ? 'btn-primary' : 'btn-secondary'}" data-ls-diff="${d.id}" title="${esc(d.desc)}">
                ${esc(d.label)} <span style="opacity:0.75; font-weight:500;">(${d.id === 'easy' ? '1 pal.' : d.id === 'medium' ? '1–2 pal.' : d.id === 'hard' ? '2–3 pal.' : 'Quase tudo'})</span>
              </button>
            `).join('')}
          </div>
        </div>

        ${ls.loadingMsg ? `<div class="pill" style="width:fit-content; color:var(--primary);">${iconHtml('loader', 13)} ${esc(ls.loadingMsg)}</div>` : ''}
      </div>

      ${ls.searchResults.length > 0 ? `
        <div class="card stack-md">
          <div class="row-between">
            <h3>Resultados com letra sincronizada (${ls.searchResults.length})</h3>
            <button class="btn btn-ghost btn-sm" id="btn-ls-clear-search">Limpar busca</button>
          </div>
          <div class="grid-2">
            ${ls.searchResults.map((item, idx) => `
              <button class="card card-interactive row-between" style="text-align:left; padding:14px 16px;" data-ls-result="${idx}">
                <div>
                  <div style="font-weight:700; font-size:15px;">${esc(item.trackName)}</div>
                  <div class="muted">${esc(item.artistName)} ${item.duration ? `• ${Math.floor(item.duration / 60)}:${String(Math.round(item.duration % 60)).padStart(2, '0')}` : ''}</div>
                </div>
                <span class="btn btn-primary btn-sm">${iconHtml('play', 14)} Tocar</span>
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="stack-md">
        <div class="row-between">
          <h2>Catálogo de Músicas (${filteredSongs.length})</h2>
          <div class="row" style="gap:6px;">
            ${SONG_GENRES.map(g => {
              const cnt = g.id === 'all' ? CURATED_SONGS.length : CURATED_SONGS.filter(s => s.genre === g.id).length;
              return `
                <button class="btn btn-sm ${!ls.artistFilter && ls.genreFilter === g.id ? 'btn-primary' : 'btn-secondary'}" data-ls-genre="${g.id}">
                  ${esc(g.label)} (${cnt})
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="row" style="gap:6px; align-items:center;">
          <span class="mini-label" style="margin-right:2px;">Artistas:</span>
          ${ls.artistFilter ? `<button class="btn btn-ghost btn-sm" data-ls-artist="">Todos</button>` : ''}
          ${FEATURED_ARTISTS.map(artist => {
            const cnt = CURATED_SONGS.filter(s => s.artist.toLowerCase().includes(artist.toLowerCase())).length;
            const active = ls.artistFilter === artist;
            return `
              <button class="btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}" style="border:1px solid var(--border); padding:4px 10px; font-size:12px;" data-ls-artist="${esc(artist)}">
                ${esc(artist)} (${cnt})
              </button>
            `;
          }).join('')}
        </div>

        <div class="grid-3">
          ${filteredSongs.map((song) => {
            const origIdx = CURATED_SONGS.indexOf(song);
            return `
              <button class="card card-interactive stack-sm" style="text-align:left;" data-ls-curated="${origIdx}">
                <div class="row-between">
                  <span class="pill">${esc(song.level)}</span>
                </div>
                <div style="font-family:'Bricolage Grotesque',sans-serif; font-size:18px; font-weight:800;">${esc(song.title)}</div>
                <div class="row-between">
                  <span class="muted">${esc(song.artist)}</span>
                  <span style="color:var(--primary); font-weight:700; font-size:12px;" class="row">${iconHtml('play', 13)} Jogar</span>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderCinemaPlayerShell() {
  const diffObj = DIFFICULTIES.find(d => d.id === ls.difficulty) || DIFFICULTIES[1];
  return `
    <div class="cinema-shell stack-md">
      <!-- Compact Game HUD -->
      <div class="card cinema-hud row-between">
        <div class="row">
          <button class="btn btn-ghost btn-sm" id="btn-ls-back">${iconHtml('arrow-left', 14)} Catálogo</button>
          <div>
            <div style="font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:16px; line-height:1.15;">${esc(ls.songTitle)}</div>
            <div class="muted" style="font-size:12px;">${esc(ls.songArtist)} • <strong id="hud-diff-label">${esc(diffObj.label)}</strong></div>
          </div>
        </div>

        <div class="row" style="gap:7px;">
          <span class="pill">${iconHtml('trophy', 13)} <strong id="hud-score">${ls.score}</strong></span>
          <span class="pill">${iconHtml('flame', 13)} <strong id="hud-combo">x${ls.combo}</strong></span>
          <span class="pill">${iconHtml('check', 13)} <strong id="hud-progress">${ls.solvedCount}/${ls.totalBlanks}</strong></span>
          <button class="btn btn-secondary btn-sm" id="btn-ls-replay" title="Repetir verso atual (Tab)">
            ${iconHtml('rotate-ccw', 14)} Repetir (Tab)
          </button>
          <button class="btn btn-ghost btn-sm" id="btn-ls-tools-toggle" title="Dificuldade, modo, sincronia e vídeo">
            ${iconHtml('sliders-horizontal', 14)} Ajustes
          </button>
        </div>
      </div>

      <!-- Quick Difficulty & Mode Strip + Optional Sync/Video Drawer -->
      <div id="ls-tools-drawer" class="card ${ls.showTools ? '' : 'hidden'} stack-sm" style="padding:14px 16px;">
        <div class="row-between">
          <div class="row" style="gap:6px;">
            <span class="mini-label">Dificuldade:</span>
            ${DIFFICULTIES.map(d => `
              <button class="btn btn-sm ${ls.difficulty === d.id ? 'btn-primary' : 'btn-secondary'}" data-ls-live-diff="${d.id}">${esc(d.label)}</button>
            `).join('')}
          </div>
          <div class="row" style="gap:6px;">
            <span class="mini-label">Modo:</span>
            <button class="btn btn-sm ${ls.mode === 'choice' ? 'btn-primary' : 'btn-secondary'}" data-ls-live-mode="choice">Escolha</button>
            <button class="btn btn-sm ${ls.mode === 'write' ? 'btn-primary' : 'btn-secondary'}" data-ls-live-mode="write">Digitar</button>
            <button class="btn btn-sm ${ls.mode === 'karaoke' ? 'btn-primary' : 'btn-secondary'}" data-ls-live-mode="karaoke">Karaokê</button>
          </div>
        </div>

        <div class="row-between" style="padding-top:8px; border-top:1px solid var(--border);">
          <div class="row" style="gap:6px;">
            <button class="btn btn-secondary btn-sm" id="btn-ls-speed">${iconHtml('gauge', 14)} ${ls.playbackRate}x</button>
            <button class="btn btn-ghost btn-sm" id="btn-ls-sync-minus" title="Letra está adiantada? Atrasar 0.2s">-0.2s</button>
            <span class="mono muted" id="ls-sync-val" style="font-size:11px;">Sync ${ls.syncOffset >= 0 ? '+' : ''}${ls.syncOffset.toFixed(1)}s</span>
            <button class="btn btn-ghost btn-sm" id="btn-ls-sync-plus" title="Letra está atrasada? Adiantar 0.2s">+0.2s</button>
            <button class="btn btn-secondary btn-sm" id="btn-ls-snap-sync" title="Clique no exato instante em que o verso atual começar a ser cantado">${iconHtml('crosshair', 13)} Alinhar Agora</button>
          </div>

          <div class="row" style="gap:6px;">
            <button class="btn btn-ghost btn-sm" id="btn-ls-alt-video">${iconHtml('shuffle', 13)} Outro Vídeo (${ls.videoIdx + 1}/${Math.max(1, ls.videoIds.length)})</button>
            <button class="btn btn-ghost btn-sm" id="btn-ls-neural-line">${iconHtml('volume-2', 13)} Voz Neural</button>
            <input type="text" id="ls-custom-yt" placeholder="Link YouTube..." style="width:140px; padding:5px 8px; font-size:12px;" />
            <button class="btn btn-secondary btn-sm" id="btn-ls-load-yt">Usar</button>
          </div>
        </div>
      </div>

      <!-- CINEMA THEATER STAGE -->
      <div class="cinema-stage-frame">
        <div class="cinema-video-area">
          <div id="yt-player-host"></div>
          <div id="ls-burst-layer" class="ls-burst-layer"></div>
        </div>

        <div id="ls-video-fallback" class="${ls.videoError ? '' : 'hidden'}" style="padding:10px 16px; background:var(--warning-soft); border-top:1px solid var(--warning); font-size:12px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <span>Este vídeo bloqueou incorporação. Clique em <strong>Tentar Outro Vídeo</strong> ou cole outro link em <strong>Ajustes</strong>.</span>
          <button class="btn btn-secondary btn-sm" id="btn-ls-fallback-next">Tentar Outro Vídeo</button>
        </div>

        <!-- LIVE REAL-TIME TELEPROMPTER -->
        <div id="ls-teleprompter" class="teleprompter-dock"></div>
      </div>
    </div>
  `;
}

function triggerScoreBurst(text) {
  const layer = document.getElementById('ls-burst-layer');
  if (!layer) return;
  const el = document.createElement('div');
  el.className = 'score-burst';
  el.textContent = text;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1050);
}

function updateHud() {
  const elScore = document.getElementById('hud-score');
  const elCombo = document.getElementById('hud-combo');
  const elProg = document.getElementById('hud-progress');
  const elDiff = document.getElementById('hud-diff-label');
  if (elScore) elScore.textContent = ls.score;
  if (elCombo) elCombo.textContent = `x${ls.combo}`;
  if (elProg) elProg.textContent = `${ls.solvedCount}/${ls.totalBlanks}`;
  if (elDiff) {
    const d = DIFFICULTIES.find(x => x.id === ls.difficulty);
    if (d) elDiff.textContent = d.label;
  }
}

function updateWordSweepVisual() {
  const bar = document.getElementById('ls-line-sweep-fill');
  if (bar) bar.style.width = `${Math.round(ls.lineProgress * 100)}%`;
  const cd = document.getElementById('ls-countdown-num');
  if (cd) cd.textContent = `${Math.max(1, Math.ceil(ls.countdownSec))}s`;

  const wordEls = document.querySelectorAll('#ls-teleprompter [data-word-pos]');
  if (wordEls.length) {
    const activePos = Math.floor(ls.lineProgress * wordEls.length);
    wordEls.forEach((el) => {
      const pos = Number(el.dataset.wordPos);
      el.classList.toggle('karaoke-sung', pos <= activePos);
    });
  }
}

function renderTeleprompter(force = false) {
  const dock = document.getElementById('ls-teleprompter');
  if (!dock) return;
  updateHud();

  const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
  const blankSig = cur && cur.blanks.length
    ? cur.blanks.map(b => `${b.status}:${b.typedCount}`).join(',')
    : 'none';
  const key = `${ls.phase}|${ls.activeLineIdx}|${ls.waitingForBlank}|${ls.mode}|${ls.difficulty}|${blankSig}`;
  if (!force && key === lastRenderedPhaseKey) {
    updateWordSweepVisual();
    return;
  }
  lastRenderedPhaseKey = key;

  // PHASE 1: READY
  if (ls.phase === 'ready') {
    const firstTime = ls.lines[0]?.time || 0;
    dock.innerHTML = `
      <div class="tp-center stack-sm">
        <div class="tp-eyebrow">PRONTO PARA COMEÇAR • ${ls.totalBlanks} PALAVRAS PARA COMPLETAR</div>
        <div class="tp-ready-title">Aperte Play — cada verso vai surgir ao vivo no ritmo da música</div>
        <div class="row" style="justify-content:center; padding-top:4px;">
          <button class="btn btn-primary" id="btn-tp-play-now">${iconHtml('play', 15)} Começar Música Agora</button>
          ${firstTime > 6 ? `<button class="btn btn-secondary" id="btn-tp-skip-intro">${iconHtml('fast-forward', 15)} Ir direto para o 1º verso (${Math.floor(firstTime)}s)</button>` : ''}
        </div>
      </div>
    `;
    document.getElementById('btn-tp-play-now')?.addEventListener('click', () => {
      playClick();
      if (ytPlayer && typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
    });
    document.getElementById('btn-tp-skip-intro')?.addEventListener('click', skipIntroToFirstVerse);
    refreshIcons();
    return;
  }

  // PHASE 2: INTRO / INSTRUMENTAL BREAK
  if (ls.phase === 'intro' || ls.phase === 'break') {
    const label = ls.phase === 'intro' ? 'INTRODUÇÃO INSTRUMENTAL' : 'PAUSA INSTRUMENTAL';
    dock.innerHTML = `
      <div class="tp-center stack-sm">
        <div class="tp-wave" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="tp-eyebrow">${label}</div>
        <div class="tp-ready-title">Prepare o ouvido — próximo verso em <strong id="ls-countdown-num" style="color:var(--primary);">${Math.max(1, Math.ceil(ls.countdownSec))}s</strong></div>
        ${ls.phase === 'intro' && ls.countdownSec > 3 ? `
          <div class="row" style="justify-content:center; padding-top:4px;">
            <button class="btn btn-secondary btn-sm" id="btn-tp-skip-intro">${iconHtml('fast-forward', 14)} Pular Introdução</button>
            <button class="btn btn-ghost btn-sm" id="btn-tp-snap-first">${iconHtml('crosshair', 13)} O cantor já começou! (Sincronizar)</button>
          </div>
        ` : ''}
      </div>
    `;
    document.getElementById('btn-tp-skip-intro')?.addEventListener('click', skipIntroToFirstVerse);
    document.getElementById('btn-tp-snap-first')?.addEventListener('click', () => snapSyncToLine(0));
    refreshIcons();
    return;
  }

  // PHASE 3: ENDED
  if (ls.phase === 'ended') {
    const pct = ls.totalBlanks ? Math.round((ls.solvedCount / ls.totalBlanks) * 100) : 100;
    const grade = pct >= 90 ? 'S' : pct >= 75 ? 'A' : pct >= 55 ? 'B' : 'C';
    dock.innerHTML = `
      <div class="tp-center stack-md">
        <div class="row" style="justify-content:center; gap:14px;">
          <div class="grade-stamp">${grade}</div>
          <div style="text-align:left;">
            <div class="tp-eyebrow">MÚSICA FINALIZADA</div>
            <h3 style="font-size:20px;">${esc(ls.songTitle)} — ${esc(ls.songArtist)}</h3>
            <div class="muted">${ls.solvedCount}/${ls.totalBlanks} palavras acertadas (${pct}%) • Melhor Combo: x${ls.maxCombo} • ${ls.score} pts</div>
          </div>
        </div>
        <div class="row" style="justify-content:center;">
          <button class="btn btn-primary" id="btn-tp-replay-song">${iconHtml('rotate-ccw', 15)} Jogar Novamente</button>
          <button class="btn btn-secondary" id="btn-tp-other-song">${iconHtml('music', 15)} Escolher Outra Música</button>
        </div>
      </div>
    `;
    document.getElementById('btn-tp-replay-song')?.addEventListener('click', () => { playClick(); restartCurrentSong(); });
    document.getElementById('btn-tp-other-song')?.addEventListener('click', () => {
      playClick();
      stopLyricsStudio();
      ls.view = 'catalog';
      rerenderAllFn();
    });
    refreshIcons();
    return;
  }

  // PHASE 4: LIVE SINGING TELEPROMPTER (Multi-word blanks supported!)
  if (!cur) return;
  const prevLine = ls.activeLineIdx > 0 ? ls.lines[ls.activeLineIdx - 1] : null;
  const activeBlank = ls.mode !== 'karaoke' ? getActiveBlank(cur) : null;
  const remainingInLine = ls.mode !== 'karaoke' ? cur.blanks.filter(b => b.status === 'pending').length : 0;

  const prevHtml = prevLine
    ? `<div class="tp-prev-line">${esc(prevLine.text)}</div>`
    : `<div class="tp-prev-line">&nbsp;</div>`;

  const currentLineHtml = cur.tokens.map((tok, idx) => {
    const b = ls.mode !== 'karaoke' ? cur.blanks.find(x => x.wordIndex === idx) : null;
    if (b) {
      const isCurrentActive = activeBlank && activeBlank.wordIndex === b.wordIndex;
      if (b.status === 'pending') {
        if (isCurrentActive && ls.mode === 'write') {
          const ans = b.answer;
          const typed = ans.slice(0, b.typedCount);
          const rest = ans.slice(b.typedCount);
          const dots = rest.split('').map(() => '<span class="lt-dot">•</span>').join('');
          return `
            <span class="lt-inline-slot lt-slot-active ${ls.waitingForBlank ? 'lt-slot-wait' : ''}" id="lt-inline-slot">
              <span class="lt-typed">${esc(typed)}</span>${dots}
            </span>
          `;
        }
        const dashes = '_'.repeat(Math.max(3, b.answer.length));
        return `<span class="lt-inline-slot ${isCurrentActive ? (ls.waitingForBlank ? 'lt-slot-wait' : 'lt-slot-active') : 'lt-slot-queued'}">${dashes}</span>`;
      }
      if (b.status === 'solved') {
        return `<span class="lt-inline-slot lt-slot-ok">${esc(tok)}</span>`;
      }
      return `<span class="lt-inline-slot lt-slot-skip">${esc(tok)}</span>`;
    }
    return `<span class="karaoke-word" data-word-pos="${idx}">${esc(tok)}</span>`;
  }).join(' ');

  let interactionHtml = '';
  if (activeBlank) {
    const multiBadge = remainingInLine > 1 ? ` • Faltam ${remainingInLine} palavras neste verso` : '';
    if (ls.mode === 'choice') {
      interactionHtml = `
        <div class="tp-choices-dock">
          ${activeBlank.options.map((opt, idx) => `
            <button class="tp-choice-btn" data-ls-choice="${esc(opt)}">
              <span class="duo-opt-key">${idx + 1}</span>
              <span>${esc(opt)}</span>
            </button>
          `).join('')}
        </div>
        <div class="tp-subbar">
          <span class="muted" style="font-size:12px;">${ls.waitingForBlank ? 'Pausado esperando sua escolha — Tab repete o verso' : 'Escolha a palavra destacada (teclas 1–4)'}${multiBadge}</span>
          <button class="btn btn-ghost btn-sm" id="btn-ls-skip">Pular</button>
        </div>
      `;
    } else if (ls.mode === 'write') {
      interactionHtml = `
        <div class="tp-write-dock">
          <input type="text" id="ls-live-keybox" class="tp-write-input" autocomplete="off" spellcheck="false" placeholder="Digite a palavra destacada..." />
          <button class="btn btn-ghost btn-sm" id="btn-ls-hint-letter">Dica (+1 letra)</button>
          <button class="btn btn-ghost btn-sm" id="btn-ls-skip">Pular</button>
        </div>
        <div class="tp-subbar">
          <span class="muted" style="font-size:12px;">${ls.waitingForBlank ? 'Pausado — digite ou aperte Tab para repetir o verso' : 'Digite letra por letra em tempo real (Tab repete o verso)'}${multiBadge}</span>
        </div>
      `;
    }
  } else {
    interactionHtml = `
      <div class="tp-subbar">
        <span class="muted" style="font-size:12px;">Verso ${ls.activeLineIdx + 1} de ${ls.lines.length} • Acompanhe o ritmo em tempo real</span>
        <button class="btn btn-ghost btn-sm" id="btn-ls-save-line">${iconHtml('plus', 13)} Salvar verso no Diário</button>
      </div>
    `;
  }

  dock.innerHTML = `
    <div class="tp-sweep-track">
      <div id="ls-line-sweep-fill" class="tp-sweep-fill ${ls.waitingForBlank ? 'tp-sweep-paused' : ''}" style="width:${Math.round(ls.lineProgress * 100)}%;"></div>
    </div>
    <div class="tp-live-body">
      ${prevHtml}
      <div class="tp-current-line">${currentLineHtml}</div>
      ${interactionHtml}
    </div>
  `;

  dock.querySelectorAll('[data-ls-choice]').forEach(btn => {
    btn.addEventListener('click', () => handleChoiceGuess(btn.dataset.lsChoice, btn));
  });

  const liveInput = document.getElementById('ls-live-keybox');
  if (liveInput) {
    liveInput.focus();
    liveInput.addEventListener('input', (e) => {
      const raw = e.target.value;
      if (!raw) return;
      for (const ch of raw) handleTypedLetter(ch);
      e.target.value = '';
    });
  }

  document.getElementById('btn-ls-hint-letter')?.addEventListener('click', () => {
    const ab = getActiveBlank(cur);
    if (!ab) return;
    playClick();
    ab.typedCount = Math.min(ab.answer.length, ab.typedCount + 1);
    if (ab.typedCount >= ab.answer.length) completeActiveBlank(false);
    else renderTeleprompter(true);
  });

  document.getElementById('btn-ls-skip')?.addEventListener('click', skipActiveBlank);

  document.getElementById('btn-ls-save-line')?.addEventListener('click', () => {
    const targetWord = cur.blanks[0] ? cur.blanks[0].raw : cur.tokens[0];
    addCustomCard({
      pt: `Verso da música "${ls.songTitle}" (${ls.songArtist})`,
      chunk: targetWord,
      en: cur.text,
      note: `Minerado ao vivo em "${ls.songTitle}".`
    });
    playCorrect();
    toastFn('Verso salvo no Diário de Lacunas (+15 XP)!');
  });

  updateWordSweepVisual();
  refreshIcons();
}

function handleTypedLetter(char) {
  const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
  const ab = getActiveBlank(cur);
  if (!ab) return;
  const ch = char.toLowerCase();
  if (!/[a-z']/.test(ch)) return;

  const expected = ab.answer[ab.typedCount];
  if (ch === expected) {
    playClick();
    ab.typedCount++;
    if (ab.answer[ab.typedCount] === "'") ab.typedCount++;
    if (ab.typedCount >= ab.answer.length) completeActiveBlank(true);
    else renderTeleprompter(true);
  } else {
    playWrong();
    ls.combo = 0;
    updateHud();
    const slot = document.getElementById('lt-inline-slot');
    if (slot) {
      slot.classList.remove('lt-shake');
      void slot.offsetWidth;
      slot.classList.add('lt-shake');
    }
  }
}

function handleChoiceGuess(rawGuess, btnEl = null) {
  const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
  const ab = getActiveBlank(cur);
  if (!ab) return;
  if (normWord(rawGuess) === ab.answer) {
    completeActiveBlank(true);
  } else {
    ls.combo = 0;
    playWrong();
    updateHud();
    if (btnEl) {
      btnEl.classList.add('duo-opt-wrong', 'lt-shake');
      btnEl.disabled = true;
    }
  }
}

function completeActiveBlank(withPoints) {
  const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
  const ab = getActiveBlank(cur);
  if (!ab) return;
  ab.status = 'solved';
  ls.solvedCount++;

  if (withPoints) {
    ls.combo++;
    if (ls.combo > ls.maxCombo) ls.maxCombo = ls.combo;
    const pts = 100 + Math.min(140, ls.combo * 15);
    ls.score += pts;
    addXp(5);
    playCorrect();
    triggerScoreBurst(`+${pts} pts${ls.combo >= 2 ? ` • x${ls.combo}` : ''}`);
  } else {
    playClick();
  }

  // Only resume video once ALL blanks in the current verse are finished!
  const stillHasBlank = Boolean(getActiveBlank(cur));
  if (!stillHasBlank) {
    ls.waitingForBlank = false;
    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
      ytPlayer.playVideo();
    }
  }

  if (ls.solvedCount >= ls.totalBlanks && ls.totalBlanks > 0) {
    playVictory();
    addXp(35);
    toastFn('Incrível! Você acertou todas as lacunas da música! +35 XP');
  }
  renderTeleprompter(true);
}

function skipActiveBlank() {
  const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
  const ab = getActiveBlank(cur);
  if (!ab) return;
  ab.status = 'skipped';
  ls.skippedCount++;
  ls.combo = 0;
  playClick();

  const stillHasBlank = Boolean(getActiveBlank(cur));
  if (!stillHasBlank) {
    ls.waitingForBlank = false;
    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
      ytPlayer.playVideo();
    }
  }
  renderTeleprompter(true);
}

function skipIntroToFirstVerse() {
  if (!ls.lines.length) return;
  playClick();
  const targetTime = Math.max(0, ls.lines[0].time - 1.2 - ls.syncOffset);
  if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
    ytPlayer.seekTo(targetTime, true);
    ytPlayer.playVideo();
  }
}

function snapSyncToLine(lineIdx) {
  if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
  const target = ls.lines[lineIdx];
  if (!target) return;
  const ytNow = ytPlayer.getCurrentTime();
  ls.syncOffset = Number((target.time - ytNow).toFixed(2));
  saveOffset(ls.songKey, ls.syncOffset);
  const el = document.getElementById('ls-sync-val');
  if (el) el.textContent = `Sync ${ls.syncOffset >= 0 ? '+' : ''}${ls.syncOffset.toFixed(1)}s`;
  playCorrect();
  toastFn(`Sincronia alinhada (${ls.syncOffset >= 0 ? '+' : ''}${ls.syncOffset.toFixed(1)}s)!`);
  renderTeleprompter(true);
}

function repeatActiveVerse() {
  if (ls.activeLineIdx < 0) return;
  const line = ls.lines[ls.activeLineIdx];
  if (!line) return;
  ls.waitingForBlank = false;
  playClick();
  if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
    ytPlayer.seekTo(Math.max(0, line.time - 0.6 - ls.syncOffset), true);
    ytPlayer.playVideo();
  }
  renderTeleprompter(true);
}

function restartCurrentSong() {
  ls.lines = buildGameLines(ls.rawLines, ls.difficulty);
  ls.totalBlanks = countTotalBlanks(ls.lines);
  ls.activeLineIdx = -1;
  ls.phase = 'ready';
  ls.waitingForBlank = false;
  ls.score = 0;
  ls.combo = 0;
  ls.maxCombo = 0;
  ls.solvedCount = 0;
  ls.skippedCount = 0;
  if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
    ytPlayer.seekTo(0, true);
    ytPlayer.playVideo();
  }
  renderTeleprompter(true);
}

// Fast 40ms real-time sync loop with LEAD_IN_SEC anticipation so verses NEVER feel late!
function startSyncLoop() {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function' || typeof ytPlayer.getPlayerState !== 'function') return;
    const ytState = ytPlayer.getPlayerState();

    if (ytState === 0) {
      if (ls.phase !== 'ended') {
        ls.phase = 'ended';
        ls.waitingForBlank = false;
        playVictory();
        renderTeleprompter(true);
      }
      return;
    }

    if (ytState !== 1) return;

    const now = ytPlayer.getCurrentTime() + ls.syncOffset;
    ls.currentTime = now;

    if (!ls.lines.length) return;

    // 1. Intro countdown until 0.65s BEFORE first verse
    const firstLine = ls.lines[0];
    if (now < firstLine.time - LEAD_IN_SEC) {
      ls.phase = 'intro';
      ls.activeLineIdx = -1;
      ls.countdownSec = firstLine.time - now;
      renderTeleprompter(false);
      return;
    }

    // 2. Auto-pause if current verse still has unsolved blanks after singer finishes it (+END_GRACE_SEC)
    const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
    const curHasPending = ls.mode !== 'karaoke' && Boolean(getActiveBlank(cur));
    if (curHasPending && now >= cur.endTime + END_GRACE_SEC) {
      ytPlayer.pauseVideo();
      ls.waitingForBlank = true;
      ls.lineProgress = 1;
      renderTeleprompter(true);
      return;
    }

    // 3. Find live line with LEAD_IN_SEC anticipation
    let foundIdx = 0;
    for (let i = 0; i < ls.lines.length; i++) {
      if (now >= ls.lines[i].time - LEAD_IN_SEC) foundIdx = i;
      else break;
    }

    // Do not advance to next verse while current verse still has pending blanks!
    if (curHasPending && foundIdx > ls.activeLineIdx) {
      // Only pause once the singer actually passed the current verse end (+grace)
      if (now >= cur.endTime + END_GRACE_SEC) {
        ytPlayer.pauseVideo();
        ls.waitingForBlank = true;
        ls.lineProgress = 1;
        renderTeleprompter(true);
      } else {
        const dur = Math.max(0.8, cur.endTime - cur.time);
        ls.lineProgress = Math.max(0, Math.min(1, (now - cur.time) / dur));
        updateWordSweepVisual();
      }
      return;
    }

    const activeLine = ls.lines[foundIdx];
    const nextLine = ls.lines[foundIdx + 1];

    // 4. Long instrumental break between verses
    if (
      nextLine &&
      now > activeLine.endTime + 2.0 &&
      nextLine.time - now > 2.4 &&
      (!getActiveBlank(activeLine) || ls.mode === 'karaoke')
    ) {
      ls.phase = 'break';
      ls.countdownSec = nextLine.time - now;
      renderTeleprompter(false);
      return;
    }

    // 5. Active live verse
    ls.phase = 'singing';
    ls.activeLineIdx = foundIdx;
    ls.waitingForBlank = false;
    const dur = Math.max(0.8, activeLine.endTime - activeLine.time);
    ls.lineProgress = Math.max(0, Math.min(1, (now - activeLine.time) / dur));
    renderTeleprompter(false);
  }, 40);
}

async function mountYoutubePlayer(videoId) {
  ls.videoError = false;
  document.getElementById('ls-video-fallback')?.classList.add('hidden');

  await loadYoutubeApi();
  const host = document.getElementById('yt-player-host');
  if (!host) return;

  if (ytPlayer) {
    try { ytPlayer.destroy(); } catch (_) {}
    ytPlayer = null;
  }
  host.innerHTML = '';

  ytPlayer = new window.YT.Player('yt-player-host', {
    width: '100%',
    height: '100%',
    videoId,
    playerVars: {
      rel: 0,
      modestbranding: 1,
      playsinline: 1
    },
    events: {
      onReady: (e) => {
        try { e.target.setPlaybackRate(ls.playbackRate); } catch (_) {}
        startSyncLoop();
      },
      onError: () => {
        ls.videoError = true;
        document.getElementById('ls-video-fallback')?.classList.remove('hidden');
        if (ls.videoIdx + 1 < ls.videoIds.length) {
          ls.videoIdx++;
          toastFn('Vídeo bloqueado para embed — trocando para alternativa...');
          mountYoutubePlayer(ls.videoIds[ls.videoIdx]);
        }
      }
    }
  });
}

async function launchSong(track) {
  ls.loadingMsg = `Carregando "${track.trackName}" e sincronizando vídeo...`;
  rerenderAllFn();

  const parsed = parseLRC(track.syncedLyrics);
  if (!parsed.length) {
    ls.loadingMsg = '';
    toastFn('Essa faixa não tem timestamps sincronizados. Tente outro resultado!');
    rerenderAllFn();
    return;
  }

  let videoIds = [];
  try {
    const r = await fetch(`/api/lyrics?ytq=${encodeURIComponent(`${track.artistName} ${track.trackName}`)}`);
    const j = await r.json();
    if (j.ok && Array.isArray(j.videoIds)) videoIds = j.videoIds;
  } catch (_) {}

  ls.loadingMsg = '';
  ls.songKey = `${track.artistName}::${track.trackName}`.toLowerCase();
  ls.songTitle = track.trackName;
  ls.songArtist = track.artistName;
  ls.rawLines = parsed;
  ls.lines = buildGameLines(parsed, ls.difficulty);
  ls.totalBlanks = countTotalBlanks(ls.lines);
  ls.videoIds = videoIds;
  ls.videoIdx = 0;
  ls.videoError = videoIds.length === 0;
  ls.phase = 'ready';
  ls.activeLineIdx = -1;
  ls.lineProgress = 0;
  ls.waitingForBlank = false;
  ls.score = 0;
  ls.combo = 0;
  ls.maxCombo = 0;
  ls.solvedCount = 0;
  ls.skippedCount = 0;
  ls.syncOffset = loadSavedOffset(ls.songKey);
  ls.showTools = false;
  ls.view = 'play';
  lastRenderedPhaseKey = '';

  rerenderAllFn();
  renderTeleprompter(true);
  if (videoIds[0]) mountYoutubePlayer(videoIds[0]);
}

async function searchSongs(query, autoLaunchFirst = false) {
  const q = String(query || '').trim();
  if (!q) return;
  ls.searchQuery = q;
  ls.searching = true;
  ls.loadingMsg = autoLaunchFirst ? `Buscando letra sincronizada de "${q}"...` : '';
  rerenderAllFn();

  try {
    const res = await fetch(`/api/lyrics?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    ls.searching = false;
    ls.loadingMsg = '';
    if (!json.ok || !json.items || !json.items.length) {
      toastFn('Nenhuma letra sincronizada encontrada. Tente "Artista Música".');
      rerenderAllFn();
      return;
    }
    if (autoLaunchFirst) await launchSong(json.items[0]);
    else {
      ls.searchResults = json.items;
      rerenderAllFn();
    }
  } catch (err) {
    ls.searching = false;
    ls.loadingMsg = '';
    toastFn('Erro ao consultar LRCLIB. Tente novamente.');
    rerenderAllFn();
  }
}

export function bindLyricsEvents(root, rerender, showToast) {
  toastFn = showToast;
  rerenderAllFn = rerender;

  if (ls.view === 'catalog') {
    document.getElementById('lyrics-search-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      playClick();
      searchSongs(document.getElementById('lyrics-search-input').value, false);
    });
    document.getElementById('btn-ls-clear-search')?.addEventListener('click', () => {
      playClick();
      ls.searchResults = [];
      ls.searchQuery = '';
      rerender();
    });
    root.querySelectorAll('[data-ls-mode]').forEach(btn => {
      btn.addEventListener('click', () => { playClick(); ls.mode = btn.dataset.lsMode; rerender(); });
    });
    root.querySelectorAll('[data-ls-diff]').forEach(btn => {
      btn.addEventListener('click', () => { playClick(); ls.difficulty = btn.dataset.lsDiff; rerender(); });
    });
    root.querySelectorAll('[data-ls-genre]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        ls.genreFilter = btn.dataset.lsGenre;
        ls.artistFilter = '';
        rerender();
      });
    });
    root.querySelectorAll('[data-ls-artist]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        const picked = btn.dataset.lsArtist;
        ls.artistFilter = ls.artistFilter === picked ? '' : picked;
        if (ls.artistFilter) ls.genreFilter = 'all';
        rerender();
      });
    });
    root.querySelectorAll('[data-ls-result]').forEach(btn => {
      btn.addEventListener('click', () => { playClick(); launchSong(ls.searchResults[Number(btn.dataset.lsResult)]); });
    });
    root.querySelectorAll('[data-ls-curated]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        searchSongs(CURATED_SONGS[Number(btn.dataset.lsCurated)].query, true);
      });
    });
    return;
  }

  // PLAY VIEW BINDINGS
  renderTeleprompter(true);

  document.getElementById('btn-ls-back')?.addEventListener('click', () => {
    playClick();
    stopLyricsStudio();
    ls.view = 'catalog';
    rerender();
  });

  document.getElementById('btn-ls-replay')?.addEventListener('click', repeatActiveVerse);

  document.getElementById('btn-ls-tools-toggle')?.addEventListener('click', () => {
    playClick();
    ls.showTools = !ls.showTools;
    document.getElementById('ls-tools-drawer')?.classList.toggle('hidden', !ls.showTools);
  });

  const btnSpeed = document.getElementById('btn-ls-speed');
  if (btnSpeed) {
    btnSpeed.addEventListener('click', () => {
      playClick();
      ls.playbackRate = ls.playbackRate === 1.0 ? 0.75 : 1.0;
      if (ytPlayer && typeof ytPlayer.setPlaybackRate === 'function') ytPlayer.setPlaybackRate(ls.playbackRate);
      btnSpeed.innerHTML = `${iconHtml('gauge', 14)} ${ls.playbackRate}x`;
      refreshIcons();
    });
  }

  const updateSyncText = () => {
    saveOffset(ls.songKey, ls.syncOffset);
    const el = document.getElementById('ls-sync-val');
    if (el) el.textContent = `Sync ${ls.syncOffset >= 0 ? '+' : ''}${ls.syncOffset.toFixed(1)}s`;
  };
  document.getElementById('btn-ls-sync-minus')?.addEventListener('click', () => { ls.syncOffset = Number((ls.syncOffset - 0.2).toFixed(2)); updateSyncText(); });
  document.getElementById('btn-ls-sync-plus')?.addEventListener('click', () => { ls.syncOffset = Number((ls.syncOffset + 0.2).toFixed(2)); updateSyncText(); });
  document.getElementById('btn-ls-snap-sync')?.addEventListener('click', () => snapSyncToLine(Math.max(0, ls.activeLineIdx)));

  const switchAltVideo = () => {
    if (!ls.videoIds.length) return;
    playClick();
    ls.videoIdx = (ls.videoIdx + 1) % ls.videoIds.length;
    const altBtn = document.getElementById('btn-ls-alt-video');
    if (altBtn) {
      altBtn.innerHTML = `${iconHtml('shuffle', 13)} Outro Vídeo (${ls.videoIdx + 1}/${ls.videoIds.length})`;
      refreshIcons();
    }
    mountYoutubePlayer(ls.videoIds[ls.videoIdx]);
  };
  document.getElementById('btn-ls-alt-video')?.addEventListener('click', switchAltVideo);
  document.getElementById('btn-ls-fallback-next')?.addEventListener('click', switchAltVideo);

  document.getElementById('btn-ls-neural-line')?.addEventListener('click', () => {
    const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : ls.lines[0];
    if (cur) speak(cur.text, 0.85);
  });

  document.getElementById('btn-ls-load-yt')?.addEventListener('click', () => {
    const vid = extractYoutubeId(document.getElementById('ls-custom-yt').value);
    if (!vid) { toastFn('Cole um link válido do YouTube!'); return; }
    ls.videoIds.unshift(vid);
    ls.videoIdx = 0;
    mountYoutubePlayer(vid);
    toastFn('Vídeo carregado!');
  });

  root.querySelectorAll('[data-ls-live-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      ls.mode = btn.dataset.lsLiveMode;
      ls.waitingForBlank = false;
      root.querySelectorAll('[data-ls-live-mode]').forEach(b => {
        b.className = `btn btn-sm ${b.dataset.lsLiveMode === ls.mode ? 'btn-primary' : 'btn-secondary'}`;
      });
      renderTeleprompter(true);
    });
  });

  root.querySelectorAll('[data-ls-live-diff]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      ls.difficulty = btn.dataset.lsLiveDiff;
      ls.lines = buildGameLines(ls.rawLines, ls.difficulty);
      ls.totalBlanks = countTotalBlanks(ls.lines);
      ls.solvedCount = 0;
      ls.waitingForBlank = false;
      root.querySelectorAll('[data-ls-live-diff]').forEach(b => {
        b.className = `btn btn-sm ${b.dataset.lsLiveDiff === ls.difficulty ? 'btn-primary' : 'btn-secondary'}`;
      });
      renderTeleprompter(true);
    });
  });
}

export function handleLyricsKeydown(e) {
  if (ls.view !== 'play') return false;
  if (e.key === 'Tab') {
    e.preventDefault();
    repeatActiveVerse();
    return true;
  }
  if (ls.phase !== 'singing') return false;
  const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
  const ab = getActiveBlank(cur);
  if (!ab) return false;

  if (ls.mode === 'choice' && ['1', '2', '3', '4'].includes(e.key)) {
    const opt = ab.options[Number(e.key) - 1];
    if (opt) {
      handleChoiceGuess(opt);
      return true;
    }
  }
  if (ls.mode === 'write' && e.key.length === 1 && /[a-zA-Z']/.test(e.key) && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    handleTypedLetter(e.key);
    return true;
  }
  return false;
}
