import { playClick, playCorrect, playWrong, playVictory, iconHtml, refreshIcons } from './sfx.js';
import { addXp, addCustomCard } from './store.js';
import { speak } from './speech.js';

export const CURATED_SONGS = [
  { query: 'Coldplay Yellow', title: 'Yellow', artist: 'Coldplay', level: 'A2 • Claro e Lento', genre: 'Indie Rock' },
  { query: 'Ed Sheeran Perfect', title: 'Perfect', artist: 'Ed Sheeran', level: 'A2/B1 • Balada', genre: 'Pop' },
  { query: 'Bruno Mars Count on Me', title: 'Count on Me', artist: 'Bruno Mars', level: 'A2 • Frases Úteis', genre: 'Pop Acústico' },
  { query: 'John Lennon Imagine', title: 'Imagine', artist: 'John Lennon', level: 'A2 • Clássico', genre: 'Clássico' },
  { query: 'Adele Someone Like You', title: 'Someone Like You', artist: 'Adele', level: 'B1 • Expressivo', genre: 'Soul / Pop' },
  { query: 'Ed Sheeran Thinking Out Loud', title: 'Thinking Out Loud', artist: 'Ed Sheeran', level: 'B1 • Connected Speech', genre: 'Pop' },
  { query: 'Linkin Park Numb', title: 'Numb', artist: 'Linkin Park', level: 'B1 • Direto', genre: 'Rock' },
  { query: 'Billie Eilish Birds of a Feather', title: 'Birds of a Feather', artist: 'Billie Eilish', level: 'B1 • Moderno', genre: 'Indie Pop' },
  { query: 'The Weeknd Blinding Lights', title: 'Blinding Lights', artist: 'The Weeknd', level: 'B1 • Ritmo Rápido', genre: 'Synthpop' },
  { query: 'Coldplay Viva La Vida', title: 'Viva La Vida', artist: 'Coldplay', level: 'B2 • Vocabulário Rico', genre: 'Alternative' },
  { query: 'Imagine Dragons Believer', title: 'Believer', artist: 'Imagine Dragons', level: 'B2 • Forte', genre: 'Pop Rock' },
  { query: 'Maroon 5 Sugar', title: 'Sugar', artist: 'Maroon 5', level: 'B1 • Conversacional', genre: 'Pop' }
];

const DIFFICULTIES = [
  { id: 'beginner', label: 'Iniciante (18%)', ratio: 0.18 },
  { id: 'intermediate', label: 'Intermediário (34%)', ratio: 0.34 },
  { id: 'advanced', label: 'Avançado (55%)', ratio: 0.55 },
  { id: 'expert', label: 'Especialista (75%)', ratio: 0.75 }
];

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
    'right', 'shine', 'alone', 'break', 'close', 'voice', 'today', 'away'
  ];

  return rawLines.map((line, idx) => {
    const tokens = line.text.split(/\s+/);
    const nextTime = rawLines[idx + 1] ? rawLines[idx + 1].time : line.time + 5.5;
    const candidates = tokens
      .map((t, i) => ({ raw: t, clean: normWord(t), i }))
      .filter(x => x.clean.length >= 3);

    let blank = null;
    const shouldBlank = candidates.length > 0 && (((idx * 37 + 11) % 100) / 100 < diff.ratio);

    if (shouldBlank) {
      const contentOnly = candidates.filter(x => !STOP_WORDS.has(x.clean));
      const pool = contentOnly.length ? contentOnly : candidates;
      const pick = pool[(idx * 7 + 3) % pool.length];

      const distractorPool = shuffle([
        ...allWords.filter(w => w !== pick.clean && Math.abs(w.length - pick.clean.length) <= 3),
        ...fallbackDistractors.filter(w => w !== pick.clean)
      ]);
      const uniqueDistractors = [];
      for (const d of distractorPool) {
        if (!uniqueDistractors.includes(d) && d !== pick.clean) uniqueDistractors.push(d);
        if (uniqueDistractors.length === 3) break;
      }

      blank = {
        wordIndex: pick.i,
        raw: pick.raw,
        answer: pick.clean,
        typedCount: 0,
        options: shuffle([pick.clean, ...uniqueDistractors]),
        status: 'pending' // 'pending' | 'solved' | 'skipped'
      };
    }

    return {
      idx,
      time: line.time,
      endTime: Math.max(line.time + 1.4, Math.min(nextTime, line.time + 8.5)),
      nextTime,
      text: line.text,
      tokens,
      blank
    };
  });
}

// Persistent state for Real-Time Lyrics Cinema
const ls = {
  view: 'catalog', // 'catalog' | 'play'
  searchQuery: '',
  searching: false,
  searchResults: [],
  loadingMsg: '',

  // Active song
  songTitle: '',
  songArtist: '',
  rawLines: [],
  lines: [],
  videoIds: [],
  videoIdx: 0,
  videoError: false,

  // Settings
  mode: 'choice', // 'choice' | 'write' | 'karaoke'
  difficulty: 'intermediate',
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
  skippedCount: 0,
  lastBurst: ''
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

function renderLyricsCatalog() {
  return `
    <div class="stack-lg">
      <div class="card path-hero stack-md">
        <div class="stack-sm">
          <span class="pill" style="width:fit-content;">${iconHtml('music', 13)} Palco Real-Time • Estilo LyricsTraining</span>
          <h2 style="font-size:22px;">A letra aparece ao vivo junto com o cantor — sem spoilers</h2>
          <p class="muted">Dê play e sinta o ritmo: cada verso surge no segundo exato em que é cantado, ilumina palavra por palavra e pausa sozinho se faltar completar a lacuna.</p>
        </div>

        <form id="lyrics-search-form" class="row" style="align-items:stretch;">
          <input type="text" id="lyrics-search-input" value="${esc(ls.searchQuery)}" placeholder="Busque qualquer música ou artista (ex: Adele Hello, Oasis Wonderwall, Coldplay Fix You)..." style="flex:1; font-size:14px; padding:11px 14px;" />
          <button type="submit" class="btn btn-primary" ${ls.searching ? 'disabled' : ''}>
            ${iconHtml('search', 15)} ${ls.searching ? 'Buscando...' : 'Buscar Música'}
          </button>
        </form>

        <div class="row">
          <span class="mini-label">Modo:</span>
          <button class="btn btn-sm ${ls.mode === 'choice' ? 'btn-primary' : 'btn-secondary'}" data-ls-mode="choice">${iconHtml('list-checks', 14)} Escolha (4 opções)</button>
          <button class="btn btn-sm ${ls.mode === 'write' ? 'btn-primary' : 'btn-secondary'}" data-ls-mode="write">${iconHtml('keyboard', 14)} Digitar na Letra</button>
          <button class="btn btn-sm ${ls.mode === 'karaoke' ? 'btn-primary' : 'btn-secondary'}" data-ls-mode="karaoke">${iconHtml('mic', 14)} Karaokê ao Vivo</button>

          <span class="mini-label" style="margin-left:8px;">Nível:</span>
          <select id="ls-diff-select" class="select-input" style="width:auto;">
            ${DIFFICULTIES.map(d => `<option value="${d.id}" ${ls.difficulty === d.id ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}
          </select>
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
          <h2>Músicas Recomendadas Para Destravar o Ouvido</h2>
          <span class="muted">1 clique já abre no palco sincronizado</span>
        </div>
        <div class="grid-3">
          ${CURATED_SONGS.map((song, idx) => `
            <button class="card card-interactive stack-sm" style="text-align:left;" data-ls-curated="${idx}">
              <div class="row-between">
                <span class="pill">${esc(song.level)}</span>
                <span class="muted" style="font-size:11px;">${esc(song.genre)}</span>
              </div>
              <div style="font-family:'Bricolage Grotesque',sans-serif; font-size:18px; font-weight:800;">${esc(song.title)}</div>
              <div class="row-between">
                <span class="muted">${esc(song.artist)}</span>
                <span style="color:var(--primary); font-weight:700; font-size:12px;" class="row">${iconHtml('play', 13)} Jogar</span>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderCinemaPlayerShell() {
  return `
    <div class="cinema-shell stack-md">
      <!-- Compact Game HUD -->
      <div class="card cinema-hud row-between">
        <div class="row">
          <button class="btn btn-ghost btn-sm" id="btn-ls-back">${iconHtml('arrow-left', 14)} Voltar</button>
          <div>
            <div style="font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:16px; line-height:1.15;">${esc(ls.songTitle)}</div>
            <div class="muted" style="font-size:12px;">${esc(ls.songArtist)}</div>
          </div>
        </div>

        <div class="row" style="gap:8px;">
          <span class="pill">${iconHtml('trophy', 13)} <strong id="hud-score">${ls.score}</strong></span>
          <span class="pill" id="hud-combo-pill">${iconHtml('flame', 13)} <strong id="hud-combo">x${ls.combo}</strong></span>
          <span class="pill">${iconHtml('check', 13)} <strong id="hud-progress">${ls.solvedCount}/${ls.totalBlanks}</strong></span>
          <button class="btn btn-secondary btn-sm" id="btn-ls-replay" title="Repetir verso atual (Tab)">
            ${iconHtml('rotate-ccw', 14)} Repetir (Tab)
          </button>
          <button class="btn btn-ghost btn-sm" id="btn-ls-tools-toggle" title="Velocidade, sincronia e vídeo">
            ${iconHtml('sliders-horizontal', 14)} Ajustes
          </button>
        </div>
      </div>

      <!-- Optional Compact Settings Drawer (Collapsed by default for clean cinema view!) -->
      <div id="ls-tools-drawer" class="card ${ls.showTools ? '' : 'hidden'} stack-sm" style="padding:14px 16px;">
        <div class="row-between">
          <div class="row" style="gap:6px;">
            <span class="mini-label">Modo:</span>
            <button class="btn btn-sm ${ls.mode === 'choice' ? 'btn-primary' : 'btn-secondary'}" data-ls-live-mode="choice">Escolha</button>
            <button class="btn btn-sm ${ls.mode === 'write' ? 'btn-primary' : 'btn-secondary'}" data-ls-live-mode="write">Digitar</button>
            <button class="btn btn-sm ${ls.mode === 'karaoke' ? 'btn-primary' : 'btn-secondary'}" data-ls-live-mode="karaoke">Karaokê</button>
            <select id="ls-live-diff" class="select-input" style="width:auto; padding:5px 8px; font-size:12px;">
              ${DIFFICULTIES.map(d => `<option value="${d.id}" ${ls.difficulty === d.id ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}
            </select>
          </div>

          <div class="row" style="gap:6px;">
            <button class="btn btn-secondary btn-sm" id="btn-ls-speed">${iconHtml('gauge', 14)} ${ls.playbackRate}x</button>
            <button class="btn btn-ghost btn-sm" id="btn-ls-sync-minus">-0.5s</button>
            <span class="mono muted" id="ls-sync-val" style="font-size:11px;">Sync ${ls.syncOffset >= 0 ? '+' : ''}${ls.syncOffset.toFixed(1)}s</span>
            <button class="btn btn-ghost btn-sm" id="btn-ls-sync-plus">+0.5s</button>
          </div>
        </div>

        <div class="row-between" style="padding-top:8px; border-top:1px solid var(--border);">
          <div class="row" style="gap:6px;">
            <button class="btn btn-ghost btn-sm" id="btn-ls-alt-video">${iconHtml('shuffle', 13)} Outro Vídeo (${ls.videoIdx + 1}/${Math.max(1, ls.videoIds.length)})</button>
            <button class="btn btn-ghost btn-sm" id="btn-ls-neural-line">${iconHtml('volume-2', 13)} Ouvir Verso (Voz Neural)</button>
          </div>
          <div class="row" style="gap:6px;">
            <input type="text" id="ls-custom-yt" placeholder="Colar link do YouTube..." style="width:185px; padding:5px 9px; font-size:12px;" />
            <button class="btn btn-secondary btn-sm" id="btn-ls-load-yt">Carregar</button>
          </div>
        </div>
      </div>

      <!-- CINEMA THEATER STAGE (Video + Live Real-Time Lyrics Teleprompter docked right underneath) -->
      <div class="cinema-stage-frame">
        <div class="cinema-video-area">
          <div id="yt-player-host"></div>
          <div id="ls-burst-layer" class="ls-burst-layer"></div>
        </div>

        <div id="ls-video-fallback" class="${ls.videoError ? '' : 'hidden'}" style="padding:10px 16px; background:var(--warning-soft); border-top:1px solid var(--warning); font-size:12px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <span>Este vídeo bloqueou incorporação. Clique em <strong>Outro Vídeo</strong> ou abra <strong>Ajustes</strong> para colar outro link.</span>
          <button class="btn btn-secondary btn-sm" id="btn-ls-fallback-next">Tentar Outro Vídeo</button>
        </div>

        <!-- LIVE REAL-TIME TELEPROMPTER (Zero Spoilers!) -->
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
  setTimeout(() => el.remove(), 1100);
}

function updateHud() {
  const elScore = document.getElementById('hud-score');
  const elCombo = document.getElementById('hud-combo');
  const elProg = document.getElementById('hud-progress');
  if (elScore) elScore.textContent = ls.score;
  if (elCombo) elCombo.textContent = `x${ls.combo}`;
  if (elProg) elProg.textContent = `${ls.solvedCount}/${ls.totalBlanks}`;
}

// Fast smooth word-sweep update WITHOUT replacing DOM (runs every 80ms)
function updateWordSweepVisual() {
  const bar = document.getElementById('ls-line-sweep-fill');
  if (bar) {
    bar.style.width = `${Math.round(ls.lineProgress * 100)}%`;
  }
  const cd = document.getElementById('ls-countdown-num');
  if (cd) {
    cd.textContent = `${Math.max(1, Math.ceil(ls.countdownSec))}s`;
  }
  const wordEls = document.querySelectorAll('#ls-teleprompter [data-word-pos]');
  if (wordEls.length) {
    const activePos = Math.floor(ls.lineProgress * wordEls.length);
    wordEls.forEach((el) => {
      const pos = Number(el.dataset.wordPos);
      el.classList.toggle('karaoke-sung', pos <= activePos);
    });
  }
}

// Full teleprompter re-render ONLY when phase, activeLineIdx, waitingForBlank, or blank status changes!
function renderTeleprompter(force = false) {
  const dock = document.getElementById('ls-teleprompter');
  if (!dock) return;
  updateHud();

  const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
  const blankSig = cur?.blank ? `${cur.blank.status}:${cur.blank.typedCount}` : 'none';
  const key = `${ls.phase}|${ls.activeLineIdx}|${ls.waitingForBlank}|${ls.mode}|${blankSig}`;
  if (!force && key === lastRenderedPhaseKey) {
    updateWordSweepVisual();
    return;
  }
  lastRenderedPhaseKey = key;

  // PHASE 1: READY (Before pressing Play on YouTube)
  if (ls.phase === 'ready') {
    const firstTime = ls.lines[0]?.time || 0;
    dock.innerHTML = `
      <div class="tp-center stack-sm">
        <div class="tp-eyebrow">PRONTO PARA COMEÇAR</div>
        <div class="tp-ready-title">Aperte Play no vídeo acima — a letra vai surgir ao vivo com a música</div>
        <div class="row" style="justify-content:center; padding-top:4px;">
          <button class="btn btn-primary" id="btn-tp-play-now">${iconHtml('play', 15)} Começar Música Agora</button>
          ${firstTime > 6 ? `<button class="btn btn-secondary" id="btn-tp-skip-intro">${iconHtml('fast-forward', 15)} Ir direto para o 1º verso (${Math.floor(firstTime)}s)</button>` : ''}
        </div>
      </div>
    `;
    const btnPlay = document.getElementById('btn-tp-play-now');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        playClick();
        if (ytPlayer && typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
      });
    }
    const btnSkipIntro = document.getElementById('btn-tp-skip-intro');
    if (btnSkipIntro) {
      btnSkipIntro.addEventListener('click', skipIntroToFirstVerse);
    }
    refreshIcons();
    return;
  }

  // PHASE 2: INTRO / INSTRUMENTAL BREAK (Zero Spoilers!)
  if (ls.phase === 'intro' || ls.phase === 'break') {
    const label = ls.phase === 'intro' ? 'INTRODUÇÃO INSTRUMENTAL' : 'PAUSA INSTRUMENTAL';
    dock.innerHTML = `
      <div class="tp-center stack-sm">
        <div class="tp-wave" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="tp-eyebrow">${label}</div>
        <div class="tp-ready-title">Prepare o ouvido — próximo verso em <strong id="ls-countdown-num" style="color:var(--primary);">${Math.max(1, Math.ceil(ls.countdownSec))}s</strong></div>
        ${ls.phase === 'intro' && ls.countdownSec > 4 ? `
          <div style="padding-top:4px;">
            <button class="btn btn-secondary btn-sm" id="btn-tp-skip-intro">${iconHtml('fast-forward', 14)} Pular Introdução</button>
          </div>
        ` : ''}
      </div>
    `;
    const btnSkipIntro = document.getElementById('btn-tp-skip-intro');
    if (btnSkipIntro) btnSkipIntro.addEventListener('click', skipIntroToFirstVerse);
    refreshIcons();
    return;
  }

  // PHASE 3: SONG ENDED (Performance Summary Card)
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
            <div class="muted">${ls.solvedCount}/${ls.totalBlanks} lacunas acertadas (${pct}%) • Melhor Combo: x${ls.maxCombo} • ${ls.score} pts</div>
          </div>
        </div>
        <div class="row" style="justify-content:center;">
          <button class="btn btn-primary" id="btn-tp-replay-song">${iconHtml('rotate-ccw', 15)} Jogar Novamente</button>
          <button class="btn btn-secondary" id="btn-tp-other-song">${iconHtml('music', 15)} Escolher Outra Música</button>
        </div>
      </div>
    `;
    document.getElementById('btn-tp-replay-song')?.addEventListener('click', () => {
      playClick();
      restartCurrentSong();
    });
    document.getElementById('btn-tp-other-song')?.addEventListener('click', () => {
      playClick();
      stopLyricsStudio();
      ls.view = 'catalog';
      rerenderAllFn();
    });
    refreshIcons();
    return;
  }

  // PHASE 4: LIVE SINGING TELEPROMPTER
  if (!cur) return;
  const prevLine = ls.activeLineIdx > 0 ? ls.lines[ls.activeLineIdx - 1] : null;
  const hasPendingBlank = ls.mode !== 'karaoke' && cur.blank && cur.blank.status === 'pending';

  const prevHtml = prevLine
    ? `<div class="tp-prev-line">${esc(prevLine.text)}</div>`
    : `<div class="tp-prev-line">&nbsp;</div>`;

  // Render live current line with inline karaoke sweep & inline blank slot!
  const currentLineHtml = cur.tokens.map((tok, idx) => {
    if (ls.mode !== 'karaoke' && cur.blank && cur.blank.wordIndex === idx) {
      if (cur.blank.status === 'pending') {
        if (ls.mode === 'write') {
          // Real LyricsTraining letter-by-letter inline slot!
          const ans = cur.blank.answer;
          const typed = ans.slice(0, cur.blank.typedCount);
          const remaining = ans.slice(cur.blank.typedCount);
          const dots = remaining.split('').map(() => '<span class="lt-dot">•</span>').join('');
          return `
            <span class="lt-inline-slot ${ls.waitingForBlank ? 'lt-slot-wait' : ''}" id="lt-inline-slot">
              <span class="lt-typed">${esc(typed)}</span>${dots}
            </span>
          `;
        }
        const blanks = '_'.repeat(Math.max(4, cur.blank.answer.length));
        return `<span class="lt-inline-slot ${ls.waitingForBlank ? 'lt-slot-wait' : ''}">${blanks}</span>`;
      }
      if (cur.blank.status === 'solved') {
        return `<span class="lt-inline-slot lt-slot-ok">${esc(tok)}</span>`;
      }
      return `<span class="lt-inline-slot lt-slot-skip">${esc(tok)}</span>`;
    }
    return `<span class="karaoke-word" data-word-pos="${idx}">${esc(tok)}</span>`;
  }).join(' ');

  let interactionHtml = '';
  if (hasPendingBlank) {
    if (ls.mode === 'choice') {
      interactionHtml = `
        <div class="tp-choices-dock">
          ${cur.blank.options.map((opt, idx) => `
            <button class="tp-choice-btn" data-ls-choice="${esc(opt)}">
              <span class="duo-opt-key">${idx + 1}</span>
              <span>${esc(opt)}</span>
            </button>
          `).join('')}
        </div>
        <div class="tp-subbar">
          <span class="muted" style="font-size:12px;">${ls.waitingForBlank ? 'Vídeo pausado esperando sua escolha — aperte Tab para ouvir o verso de novo' : 'Toque na palavra ou aperte 1–4'}</span>
          <button class="btn btn-ghost btn-sm" id="btn-ls-skip">Pular</button>
        </div>
      `;
    } else if (ls.mode === 'write') {
      interactionHtml = `
        <div class="tp-write-dock">
          <input type="text" id="ls-live-keybox" class="tp-write-input" autocomplete="off" spellcheck="false" placeholder="Comece a digitar a palavra que ouviu..." />
          <button class="btn btn-ghost btn-sm" id="btn-ls-hint-letter" title="Revelar 1 letra">Dica (+1 letra)</button>
          <button class="btn btn-ghost btn-sm" id="btn-ls-skip">Pular</button>
        </div>
        <div class="tp-subbar">
          <span class="muted" style="font-size:12px;">${ls.waitingForBlank ? 'Vídeo pausado — digite a palavra ou aperte Tab para repetir o verso' : 'Digite letra por letra em tempo real (Tab repete o verso)'}</span>
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

  // Bind live stage controls
  dock.querySelectorAll('[data-ls-choice]').forEach(btn => {
    btn.addEventListener('click', () => handleChoiceGuess(btn.dataset.lsChoice, btn));
  });

  const liveInput = document.getElementById('ls-live-keybox');
  if (liveInput) {
    liveInput.focus();
    liveInput.addEventListener('input', (e) => {
      const raw = e.target.value;
      if (!raw) return;
      // Process each typed character letter-by-letter just like LyricsTraining!
      for (const ch of raw) {
        handleTypedLetter(ch);
      }
      e.target.value = '';
    });
  }

  document.getElementById('btn-ls-hint-letter')?.addEventListener('click', () => {
    if (!cur.blank || cur.blank.status !== 'pending') return;
    playClick();
    cur.blank.typedCount = Math.min(cur.blank.answer.length, cur.blank.typedCount + 1);
    if (cur.blank.typedCount >= cur.blank.answer.length) {
      completeCurrentBlank(false);
    } else {
      renderTeleprompter(true);
    }
  });

  document.getElementById('btn-ls-skip')?.addEventListener('click', skipCurrentBlank);

  document.getElementById('btn-ls-save-line')?.addEventListener('click', () => {
    const targetWord = cur.blank ? cur.blank.raw : cur.tokens[0];
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
  const cur = ls.lines[ls.activeLineIdx];
  if (!cur || !cur.blank || cur.blank.status !== 'pending') return;
  const ch = char.toLowerCase();
  if (!/[a-z']/.test(ch)) return;

  const expected = cur.blank.answer[cur.blank.typedCount];
  if (ch === expected) {
    playClick();
    cur.blank.typedCount++;
    // Auto-skip apostrophe if next char is '
    if (cur.blank.answer[cur.blank.typedCount] === "'") {
      cur.blank.typedCount++;
    }
    if (cur.blank.typedCount >= cur.blank.answer.length) {
      completeCurrentBlank(true);
    } else {
      renderTeleprompter(true);
    }
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
  const cur = ls.lines[ls.activeLineIdx];
  if (!cur || !cur.blank || cur.blank.status !== 'pending') return;
  if (normWord(rawGuess) === cur.blank.answer) {
    completeCurrentBlank(true);
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

function completeCurrentBlank(withPoints) {
  const cur = ls.lines[ls.activeLineIdx];
  if (!cur || !cur.blank || cur.blank.status !== 'pending') return;
  cur.blank.status = 'solved';
  ls.solvedCount++;
  ls.waitingForBlank = false;

  if (withPoints) {
    ls.combo++;
    if (ls.combo > ls.maxCombo) ls.maxCombo = ls.combo;
    const pts = 100 + Math.min(120, ls.combo * 15);
    ls.score += pts;
    addXp(5);
    playCorrect();
    triggerScoreBurst(`+${pts} pts${ls.combo >= 2 ? ` • x${ls.combo}` : ''}`);
  } else {
    playClick();
  }

  if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
    ytPlayer.playVideo();
  }
  if (ls.solvedCount >= ls.totalBlanks && ls.totalBlanks > 0) {
    playVictory();
    addXp(30);
    toastFn('Todas as lacunas completadas! +30 XP');
  }
  renderTeleprompter(true);
}

function skipCurrentBlank() {
  const cur = ls.lines[ls.activeLineIdx];
  if (!cur || !cur.blank || cur.blank.status !== 'pending') return;
  cur.blank.status = 'skipped';
  ls.skippedCount++;
  ls.combo = 0;
  ls.waitingForBlank = false;
  playClick();
  if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
    ytPlayer.playVideo();
  }
  renderTeleprompter(true);
}

function skipIntroToFirstVerse() {
  if (!ls.lines.length) return;
  playClick();
  const targetTime = Math.max(0, ls.lines[0].time - 1.5 - ls.syncOffset);
  if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
    ytPlayer.seekTo(targetTime, true);
    ytPlayer.playVideo();
  }
}

function repeatActiveVerse() {
  if (ls.activeLineIdx < 0) return;
  const line = ls.lines[ls.activeLineIdx];
  if (!line) return;
  ls.waitingForBlank = false;
  playClick();
  if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
    ytPlayer.seekTo(Math.max(0, line.time - 0.5 - ls.syncOffset), true);
    ytPlayer.playVideo();
  }
  renderTeleprompter(true);
}

function restartCurrentSong() {
  ls.lines = buildGameLines(ls.rawLines, ls.difficulty);
  ls.totalBlanks = ls.lines.filter(l => l.blank).length;
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

// Real-time 80ms clock synced directly to YouTube Player
function startSyncLoop() {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function' || typeof ytPlayer.getPlayerState !== 'function') return;
    const ytState = ytPlayer.getPlayerState();

    // Ended
    if (ytState === 0) {
      if (ls.phase !== 'ended') {
        ls.phase = 'ended';
        ls.waitingForBlank = false;
        playVictory();
        renderTeleprompter(true);
      }
      return;
    }

    if (ytState !== 1) return; // Sync live while playing

    const now = ytPlayer.getCurrentTime() + ls.syncOffset;
    ls.currentTime = now;

    if (!ls.lines.length) return;

    // 1. Before first verse starts -> Live Intro Countdown (NO SPOILER!)
    const firstLine = ls.lines[0];
    if (now < firstLine.time - 0.35) {
      ls.phase = 'intro';
      ls.activeLineIdx = -1;
      ls.countdownSec = firstLine.time - now;
      renderTeleprompter(false);
      return;
    }

    // 2. If current line has an unsolved blank and reached its end -> AUTO-PAUSE!
    const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
    if (ls.mode !== 'karaoke' && cur && cur.blank && cur.blank.status === 'pending') {
      if (now >= cur.endTime - 0.1) {
        ytPlayer.pauseVideo();
        ls.waitingForBlank = true;
        ls.lineProgress = 1;
        renderTeleprompter(true);
        return;
      }
    }

    // 3. Find live line matching timestamp
    let foundIdx = 0;
    for (let i = 0; i < ls.lines.length; i++) {
      if (now >= ls.lines[i].time - 0.25) foundIdx = i;
      else break;
    }

    // Guard against skipping past an unsolved blank
    if (ls.mode !== 'karaoke' && cur && cur.blank && cur.blank.status === 'pending' && foundIdx > ls.activeLineIdx) {
      ytPlayer.pauseVideo();
      ls.waitingForBlank = true;
      ls.lineProgress = 1;
      renderTeleprompter(true);
      return;
    }

    const activeLine = ls.lines[foundIdx];
    const nextLine = ls.lines[foundIdx + 1];

    // 4. Long instrumental break between verses (> 5.5s after line finished)
    if (
      nextLine &&
      now > activeLine.endTime + 1.8 &&
      nextLine.time - now > 2.2 &&
      (!activeLine.blank || activeLine.blank.status !== 'pending' || ls.mode === 'karaoke')
    ) {
      ls.phase = 'break';
      ls.countdownSec = nextLine.time - now;
      renderTeleprompter(false);
      return;
    }

    // 5. Active live singing line!
    ls.phase = 'singing';
    ls.activeLineIdx = foundIdx;
    ls.waitingForBlank = false;
    const dur = Math.max(0.8, activeLine.endTime - activeLine.time);
    ls.lineProgress = Math.max(0, Math.min(1, (now - activeLine.time) / dur));
    renderTeleprompter(false);
  }, 80);
}

async function mountYoutubePlayer(videoId) {
  ls.videoError = false;
  const fb = document.getElementById('ls-video-fallback');
  if (fb) fb.classList.add('hidden');

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
        const errBox = document.getElementById('ls-video-fallback');
        if (errBox) errBox.classList.remove('hidden');
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
  ls.songTitle = track.trackName;
  ls.songArtist = track.artistName;
  ls.rawLines = parsed;
  ls.lines = buildGameLines(parsed, ls.difficulty);
  ls.totalBlanks = ls.lines.filter(l => l.blank).length;
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
  ls.syncOffset = 0;
  ls.showTools = false;
  ls.view = 'play';
  lastRenderedPhaseKey = '';

  rerenderAllFn();
  renderTeleprompter(true);
  if (videoIds[0]) {
    mountYoutubePlayer(videoIds[0]);
  }
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
    if (autoLaunchFirst) {
      await launchSong(json.items[0]);
    } else {
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
    const form = document.getElementById('lyrics-search-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        playClick();
        const q = document.getElementById('lyrics-search-input').value;
        searchSongs(q, false);
      });
    }
    document.getElementById('btn-ls-clear-search')?.addEventListener('click', () => {
      playClick();
      ls.searchResults = [];
      ls.searchQuery = '';
      rerender();
    });
    root.querySelectorAll('[data-ls-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        ls.mode = btn.dataset.lsMode;
        rerender();
      });
    });
    const diffSel = document.getElementById('ls-diff-select');
    if (diffSel) diffSel.addEventListener('change', (e) => { ls.difficulty = e.target.value; });
    root.querySelectorAll('[data-ls-result]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        launchSong(ls.searchResults[Number(btn.dataset.lsResult)]);
      });
    });
    root.querySelectorAll('[data-ls-curated]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        const song = CURATED_SONGS[Number(btn.dataset.lsCurated)];
        searchSongs(song.query, true);
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
      if (ytPlayer && typeof ytPlayer.setPlaybackRate === 'function') {
        ytPlayer.setPlaybackRate(ls.playbackRate);
      }
      btnSpeed.innerHTML = `${iconHtml('gauge', 14)} ${ls.playbackRate}x`;
      refreshIcons();
    });
  }

  const updateSyncText = () => {
    const el = document.getElementById('ls-sync-val');
    if (el) el.textContent = `Sync ${ls.syncOffset >= 0 ? '+' : ''}${ls.syncOffset.toFixed(1)}s`;
  };
  document.getElementById('btn-ls-sync-minus')?.addEventListener('click', () => { ls.syncOffset -= 0.5; updateSyncText(); });
  document.getElementById('btn-ls-sync-plus')?.addEventListener('click', () => { ls.syncOffset += 0.5; updateSyncText(); });

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
    const raw = document.getElementById('ls-custom-yt').value;
    const vid = extractYoutubeId(raw);
    if (!vid) {
      toastFn('Cole um link válido do YouTube!');
      return;
    }
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

  document.getElementById('ls-live-diff')?.addEventListener('change', (e) => {
    ls.difficulty = e.target.value;
    ls.lines = buildGameLines(ls.rawLines, ls.difficulty);
    ls.totalBlanks = ls.lines.filter(l => l.blank).length;
    ls.solvedCount = 0;
    ls.waitingForBlank = false;
    renderTeleprompter(true);
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
  const cur = ls.lines[ls.activeLineIdx];
  if (!cur || !cur.blank || cur.blank.status !== 'pending') return false;

  if (ls.mode === 'choice' && ['1', '2', '3', '4'].includes(e.key)) {
    const opt = cur.blank.options[Number(e.key) - 1];
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
