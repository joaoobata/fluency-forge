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
  { id: 'beginner', label: 'Iniciante (15%)', ratio: 0.18 },
  { id: 'intermediate', label: 'Intermediário (32%)', ratio: 0.34 },
  { id: 'advanced', label: 'Avançado (55%)', ratio: 0.55 },
  { id: 'expert', label: 'Especialista (75%)', ratio: 0.75 }
];

const STOP_WORDS = new Set(['the', 'and', 'you', 'for', 'are', 'but', 'not', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'that', 'this', 'with', 'have', 'from', 'they', 'your', 'just', 'like', 'been', 'will', 'when', 'what', 'ooh', 'yeah', 'hey', 'whoa', 'hmm', 'la', 'na', 'da']);

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
  // Gather pool of candidate words from the entire song for smart distractors!
  const allWords = [];
  for (const l of rawLines) {
    for (const tok of l.text.split(/\s+/)) {
      const clean = normWord(tok);
      if (clean.length >= 3 && !allWords.includes(clean)) allWords.push(clean);
    }
  }
  const fallbackDistractors = ['night', 'heart', 'dream', 'world', 'light', 'never', 'always', 'still', 'right', 'shine', 'alone', 'break', 'close', 'voice', 'today', 'away'];

  return rawLines.map((line, idx) => {
    const tokens = line.text.split(/\s+/);
    const nextTime = rawLines[idx + 1] ? rawLines[idx + 1].time : line.time + 5.5;
    // Choose eligible words (len >= 3, prefer content words)
    const candidates = tokens
      .map((t, i) => ({ raw: t, clean: normWord(t), i }))
      .filter(x => x.clean.length >= 3);

    let blank = null;
    // Deterministic-ish distribution so difficulty feels smooth
    const shouldBlank = candidates.length > 0 && (((idx * 37 + 11) % 100) / 100 < diff.ratio);

    if (shouldBlank) {
      const contentOnly = candidates.filter(x => !STOP_WORDS.has(x.clean));
      const pool = contentOnly.length ? contentOnly : candidates;
      const pick = pool[(idx * 7 + 3) % pool.length];

      // Build 3 realistic distractors from the same song + fallback
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
        options: shuffle([pick.clean, ...uniqueDistractors]),
        status: 'pending', // 'pending' | 'solved' | 'skipped'
        userWrongFlash: false
      };
    }

    return {
      idx,
      time: line.time,
      endTime: Math.max(line.time + 1.2, nextTime),
      text: line.text,
      tokens,
      blank
    };
  });
}

// Persistent state for Lyrics Studio
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

  // Gameplay live state
  activeLineIdx: 0,
  waitingForBlank: false,
  score: 0,
  combo: 0,
  solvedCount: 0,
  totalBlanks: 0,
  skippedCount: 0,
  finished: false
};

let ytApiPromise = null;
let ytPlayer = null;
let syncTimer = null;
let toastFn = () => {};
let rerenderAllFn = () => {};

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
  if (ls.view === 'play') return renderLyricsPlayerShell();
  return renderLyricsCatalog();
}

function renderLyricsCatalog() {
  return `
    <div class="stack-lg">
      <div class="card path-hero stack-md">
        <div class="row-between">
          <div class="stack-sm">
            <span class="pill" style="width:fit-content;">${iconHtml('music', 13)} LyricsTraining Engine • LRCLIB + YouTube</span>
            <h2 style="font-size:22px;">Treine o ouvido completando letras de músicas reais</h2>
            <p class="muted">A música toca sincronizada e <strong>pausa automaticamente</strong> quando falta uma palavra. Escolha um hit abaixo ou busque <strong>qualquer música em inglês</strong>.</p>
          </div>
        </div>

        <form id="lyrics-search-form" class="row" style="align-items:stretch;">
          <input type="text" id="lyrics-search-input" value="${esc(ls.searchQuery)}" placeholder="Busque qualquer música ou artista (ex: Adele Hello, Oasis Wonderwall, Eminem Lose Yourself)..." style="flex:1; font-size:14px; padding:11px 14px;" />
          <button type="submit" class="btn btn-primary" ${ls.searching ? 'disabled' : ''}>
            ${iconHtml('search', 15)} ${ls.searching ? 'Buscando...' : 'Buscar Música'}
          </button>
        </form>

        <div class="row">
          <span class="mini-label">Modo:</span>
          <button class="btn btn-sm ${ls.mode === 'choice' ? 'btn-primary' : 'btn-secondary'}" data-ls-mode="choice">${iconHtml('list-checks', 14)} Escolha (4 opções)</button>
          <button class="btn btn-sm ${ls.mode === 'write' ? 'btn-primary' : 'btn-secondary'}" data-ls-mode="write">${iconHtml('keyboard', 14)} Digitar (Clássico)</button>
          <button class="btn btn-sm ${ls.mode === 'karaoke' ? 'btn-primary' : 'btn-secondary'}" data-ls-mode="karaoke">${iconHtml('mic', 14)} Karaokê (Só Ler)</button>

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
                <span class="btn btn-primary btn-sm">${iconHtml('play', 14)} Jogar</span>
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="stack-md">
        <div class="row-between">
          <h2>Músicas Recomendadas Para Destravar o Ouvido</h2>
          <span class="muted">1 clique já busca a letra sincronizada + vídeo</span>
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
                <span style="color:var(--primary); font-weight:700; font-size:12px;" class="row">${iconHtml('play', 13)} Tocar</span>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderLyricsPlayerShell() {
  return `
    <div class="stack-md">
      <!-- Top Controls Bar -->
      <div class="card row-between" style="padding:14px 18px;">
        <div class="row">
          <button class="btn btn-ghost btn-sm" id="btn-ls-back">${iconHtml('arrow-left', 14)} Trocar Música</button>
          <div>
            <div style="font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:17px;">${esc(ls.songTitle)}</div>
            <div class="muted">${esc(ls.songArtist)}</div>
          </div>
        </div>

        <div class="row" id="ls-hud">
          <span class="pill">${iconHtml('trophy', 13)} <strong id="hud-score">${ls.score}</strong> pts</span>
          <span class="pill">${iconHtml('flame', 13)} Combo <strong id="hud-combo">x${ls.combo}</strong></span>
          <span class="pill">${iconHtml('check', 13)} <strong id="hud-progress">${ls.solvedCount}/${ls.totalBlanks}</strong></span>
        </div>
      </div>

      <!-- Main Split: Video + Sync Controls | Interactive Lyrics Game -->
      <div class="lyrics-grid">
        <div class="stack-md">
          <div class="card stack-sm" style="padding:14px;">
            <div class="yt-frame-wrap">
              <div id="yt-player-host"></div>
            </div>

            <div id="ls-video-fallback" class="${ls.videoError ? '' : 'hidden'}" style="padding:10px; border-radius:8px; background:var(--warning-soft); border:1px solid var(--warning); font-size:12px;">
              Este vídeo do YouTube restringiu incorporação. Clique em <strong>Outro Vídeo</strong> abaixo ou cole qualquer link do YouTube!
            </div>

            <div class="row-between" style="padding-top:6px;">
              <div class="row" style="gap:6px;">
                <button class="btn btn-secondary btn-sm" id="btn-ls-replay" title="Atalho: Tab">${iconHtml('rotate-ccw', 14)} Repetir Verso (Tab)</button>
                <button class="btn btn-secondary btn-sm" id="btn-ls-speed">${iconHtml('gauge', 14)} ${ls.playbackRate}x</button>
              </div>
              <div class="row" style="gap:6px;">
                <button class="btn btn-ghost btn-sm" id="btn-ls-sync-minus" title="Adiantar letra 0.5s">-0.5s</button>
                <span class="mono muted" id="ls-sync-val" style="font-size:11px;">Sync ${ls.syncOffset >= 0 ? '+' : ''}${ls.syncOffset.toFixed(1)}s</span>
                <button class="btn btn-ghost btn-sm" id="btn-ls-sync-plus" title="Atrasar letra 0.5s">+0.5s</button>
              </div>
            </div>

            <div class="row-between" style="padding-top:6px; border-top:1px solid var(--border);">
              <div class="row" style="gap:6px;">
                <button class="btn btn-ghost btn-sm" id="btn-ls-alt-video">${iconHtml('shuffle', 13)} Outro Vídeo (${ls.videoIdx + 1}/${Math.max(1, ls.videoIds.length)})</button>
                <button class="btn btn-ghost btn-sm" id="btn-ls-neural-line" title="Ouvir verso atual com voz neural">${iconHtml('volume-2', 13)} Voz Neural</button>
              </div>
              <div class="row" style="gap:6px;">
                <input type="text" id="ls-custom-yt" placeholder="Colar link YouTube..." style="width:155px; padding:5px 8px; font-size:12px;" />
                <button class="btn btn-secondary btn-sm" id="btn-ls-load-yt">Usar</button>
              </div>
            </div>
          </div>

          <div class="card row-between" style="padding:12px 16px;">
            <div class="row" style="gap:6px;">
              <button class="btn btn-sm ${ls.mode === 'choice' ? 'btn-primary' : 'btn-secondary'}" data-ls-live-mode="choice">Escolha</button>
              <button class="btn btn-sm ${ls.mode === 'write' ? 'btn-primary' : 'btn-secondary'}" data-ls-live-mode="write">Digitar</button>
              <button class="btn btn-sm ${ls.mode === 'karaoke' ? 'btn-primary' : 'btn-secondary'}" data-ls-live-mode="karaoke">Karaokê</button>
            </div>
            <select id="ls-live-diff" class="select-input" style="width:auto; padding:5px 8px; font-size:12px;">
              ${DIFFICULTIES.map(d => `<option value="${d.id}" ${ls.difficulty === d.id ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Right Column: Live Synced Lyrics & Answer Controls -->
        <div class="card stack-md lyrics-stage-card">
          <div id="ls-active-stage"></div>
          <div id="ls-scroll-list" class="lyrics-scroll-list"></div>
        </div>
      </div>
    </div>
  `;
}

function updateLiveStageDOM() {
  const stage = document.getElementById('ls-active-stage');
  const listEl = document.getElementById('ls-scroll-list');
  if (!stage || !listEl) return;

  // Update HUD counters without touching iframe
  const elScore = document.getElementById('hud-score');
  const elCombo = document.getElementById('hud-combo');
  const elProg = document.getElementById('hud-progress');
  if (elScore) elScore.textContent = ls.score;
  if (elCombo) elCombo.textContent = `x${ls.combo}`;
  if (elProg) elProg.textContent = `${ls.solvedCount}/${ls.totalBlanks}`;

  const cur = ls.lines[ls.activeLineIdx] || ls.lines[0];
  if (!cur) return;

  const hasPendingBlank = ls.mode !== 'karaoke' && cur.blank && cur.blank.status === 'pending';

  // Render active focal line with blank slot
  const lineHtml = cur.tokens.map((tok, idx) => {
    if (ls.mode !== 'karaoke' && cur.blank && cur.blank.wordIndex === idx) {
      if (cur.blank.status === 'pending') {
        const lenHint = '_'.repeat(Math.max(3, cur.blank.answer.length));
        return `<span class="lyric-blank ${ls.waitingForBlank ? 'lyric-blank-wait' : ''}">${lenHint}</span>`;
      }
      if (cur.blank.status === 'solved') {
        return `<span class="lyric-blank lyric-blank-ok">${esc(tok)}</span>`;
      }
      return `<span class="lyric-blank lyric-blank-skip">${esc(tok)}</span>`;
    }
    return `<span>${esc(tok)}</span>`;
  }).join(' ');

  let controlsHtml = '';
  if (hasPendingBlank) {
    if (ls.mode === 'choice') {
      controlsHtml = `
        <div class="stack-sm" style="padding-top:10px;">
          <div class="row-between">
            <span class="mini-label" style="color:${ls.waitingForBlank ? 'var(--primary)' : 'var(--muted)'};">
              ${ls.waitingForBlank ? 'PAUSADO — Escolha a palavra que você ouviu (teclas 1–4):' : 'Escolha a palavra faltando (teclas 1–4):'}
            </span>
            <button class="btn btn-ghost btn-sm" id="btn-ls-skip">Pular palavra</button>
          </div>
          <div class="grid-2" style="gap:8px;">
            ${cur.blank.options.map((opt, idx) => `
              <button class="duo-opt" style="padding:11px 14px;" data-ls-choice="${esc(opt)}">
                <span class="duo-opt-key">${idx + 1}</span>
                <span>${esc(opt)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else if (ls.mode === 'write') {
      controlsHtml = `
        <div class="stack-sm" style="padding-top:10px;">
          <div class="row-between">
            <span class="mini-label" style="color:${ls.waitingForBlank ? 'var(--primary)' : 'var(--muted)'};">
              ${ls.waitingForBlank ? 'PAUSADO — Digite a palavra que você ouviu:' : 'Digite a palavra faltando:'}
            </span>
            <div class="row" style="gap:6px;">
              <span class="mono muted" style="font-size:11px;">Dica: ${esc(cur.blank.answer[0] + '•'.repeat(Math.max(1, cur.blank.answer.length - 1)))} (${cur.blank.answer.length} letras)</span>
              <button class="btn btn-ghost btn-sm" id="btn-ls-skip">Pular</button>
            </div>
          </div>
          <div class="row">
            <input type="text" id="ls-write-input" autocomplete="off" spellcheck="false" placeholder="Digite a palavra em inglês..." style="flex:1; font-size:16px; padding:11px 14px;" />
            <button class="btn btn-primary" id="btn-ls-write-check">Confirmar</button>
          </div>
        </div>
      `;
    }
  } else if (ls.mode === 'karaoke') {
    controlsHtml = `
      <div class="row-between" style="padding-top:8px;">
        <span class="muted">Modo Karaokê: clique em qualquer verso abaixo para pular o vídeo até ele.</span>
        <button class="btn btn-secondary btn-sm" id="btn-ls-save-line">${iconHtml('plus', 13)} Salvar verso no Diário</button>
      </div>
    `;
  } else {
    controlsHtml = `
      <div class="row-between" style="padding-top:8px;">
        <span class="muted">Acompanhe a música — a próxima lacuna vem aí!</span>
        <button class="btn btn-ghost btn-sm" id="btn-ls-save-line">${iconHtml('plus', 13)} Salvar verso</button>
      </div>
    `;
  }

  stage.innerHTML = `
    <div class="lyrics-focus-box ${ls.waitingForBlank ? 'lyrics-waiting' : ''}">
      <div class="row-between" style="margin-bottom:8px;">
        <span class="mini-label">Verso ${ls.activeLineIdx + 1} de ${ls.lines.length}</span>
        ${ls.waitingForBlank ? `<span class="pill" style="background:var(--primary-soft); color:var(--primary); border-color:var(--primary);">Aguardando resposta</span>` : ''}
      </div>
      <div class="lyrics-focus-line">${lineHtml}</div>
      ${controlsHtml}
    </div>
  `;

  // Render scrolling context lines (5 before, 8 after)
  const start = Math.max(0, ls.activeLineIdx - 2);
  const end = Math.min(ls.lines.length, ls.activeLineIdx + 8);
  listEl.innerHTML = ls.lines.slice(start, end).map((line) => {
    const isAct = line.idx === ls.activeLineIdx;
    const preview = line.tokens.map((t, ti) => {
      if (ls.mode !== 'karaoke' && line.blank && line.blank.wordIndex === ti && line.blank.status === 'pending') {
        return '_____';
      }
      return t;
    }).join(' ');
    const statusDot = line.blank
      ? (line.blank.status === 'solved' ? 'status-dot-ok' : line.blank.status === 'skipped' ? 'status-dot-skip' : 'status-dot-pending')
      : '';
    return `
      <button class="lyrics-line-row ${isAct ? 'active' : ''}" data-seek-line="${line.idx}">
        <span class="mono muted" style="font-size:11px; min-width:38px;">${Math.floor(line.time / 60)}:${String(Math.floor(line.time % 60)).padStart(2, '0')}</span>
        <span style="flex:1;">${esc(preview)}</span>
        ${statusDot ? `<span class="status-dot ${statusDot}"></span>` : ''}
      </button>
    `;
  }).join('');

  // Bind dynamic stage events
  stage.querySelectorAll('[data-ls-choice]').forEach(btn => {
    btn.addEventListener('click', () => handleWordGuess(btn.dataset.lsChoice));
  });

  const writeInp = document.getElementById('ls-write-input');
  if (writeInp) {
    writeInp.focus();
    writeInp.addEventListener('input', (e) => {
      const val = normWord(e.target.value);
      if (cur.blank && val === cur.blank.answer) {
        handleWordGuess(val);
      }
    });
    writeInp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleWordGuess(writeInp.value);
      }
    });
  }
  const btnWriteCheck = document.getElementById('btn-ls-write-check');
  if (btnWriteCheck && writeInp) {
    btnWriteCheck.addEventListener('click', () => handleWordGuess(writeInp.value));
  }

  const btnSkip = document.getElementById('btn-ls-skip');
  if (btnSkip) {
    btnSkip.addEventListener('click', skipCurrentBlank);
  }

  const btnSaveLine = document.getElementById('btn-ls-save-line');
  if (btnSaveLine) {
    btnSaveLine.addEventListener('click', () => {
      const targetWord = cur.blank ? cur.blank.raw : cur.tokens[0];
      addCustomCard({
        pt: `Verso da música "${ls.songTitle}" (${ls.songArtist})`,
        chunk: targetWord,
        en: cur.text,
        note: `Minerado da música "${ls.songTitle}".`
      });
      playCorrect();
      toastFn('Verso salvo no seu Diário de Lacunas (+15 XP)!');
    });
  }

  listEl.querySelectorAll('[data-seek-line]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetIdx = Number(btn.dataset.seekLine);
      seekToLine(targetIdx);
    });
  });

  refreshIcons();
}

function handleWordGuess(rawGuess) {
  const cur = ls.lines[ls.activeLineIdx];
  if (!cur || !cur.blank || cur.blank.status !== 'pending') return;

  const guess = normWord(rawGuess);
  if (guess === cur.blank.answer) {
    cur.blank.status = 'solved';
    ls.solvedCount++;
    ls.combo++;
    ls.score += 100 + Math.min(100, ls.combo * 15);
    ls.waitingForBlank = false;
    addXp(5);
    playCorrect();

    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
      ytPlayer.playVideo();
    }
    if (ls.solvedCount >= ls.totalBlanks && ls.totalBlanks > 0) {
      playVictory();
      addXp(30);
      toastFn('Incrível! Você completou todas as lacunas da música! +30 XP');
    }
    updateLiveStageDOM();
  } else {
    ls.combo = 0;
    playWrong();
    const inp = document.getElementById('ls-write-input');
    if (inp) {
      inp.style.borderColor = 'var(--danger)';
      setTimeout(() => { if (inp) inp.style.borderColor = ''; }, 400);
    }
    toastFn('Quase! Aperte Tab para repetir o verso.');
    const elCombo = document.getElementById('hud-combo');
    if (elCombo) elCombo.textContent = 'x0';
  }
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
  updateLiveStageDOM();
}

function seekToLine(lineIdx) {
  const line = ls.lines[lineIdx];
  if (!line) return;
  ls.activeLineIdx = lineIdx;
  ls.waitingForBlank = false;
  playClick();
  if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
    ytPlayer.seekTo(Math.max(0, line.time - 0.35 - ls.syncOffset), true);
    ytPlayer.playVideo();
  }
  updateLiveStageDOM();
}

function startSyncLoop() {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function' || typeof ytPlayer.getPlayerState !== 'function') return;
    const state = ytPlayer.getPlayerState();
    if (state !== 1) return; // Only sync while PLAYING

    const now = ytPlayer.getCurrentTime() + ls.syncOffset;

    // Check if current line has an unsolved blank and we reached the end of that line!
    const cur = ls.lines[ls.activeLineIdx];
    if (ls.mode !== 'karaoke' && cur && cur.blank && cur.blank.status === 'pending') {
      if (now >= cur.endTime - 0.12) {
        ytPlayer.pauseVideo();
        ls.waitingForBlank = true;
        updateLiveStageDOM();
        return;
      }
    }

    // Otherwise advance active line smoothly with timestamp
    let foundIdx = ls.activeLineIdx;
    for (let i = 0; i < ls.lines.length; i++) {
      if (now >= ls.lines[i].time - 0.15) foundIdx = i;
      else break;
    }

    if (foundIdx !== ls.activeLineIdx) {
      // Do not jump past an unsolved blank line
      if (ls.mode !== 'karaoke' && cur && cur.blank && cur.blank.status === 'pending' && foundIdx > ls.activeLineIdx) {
        ytPlayer.pauseVideo();
        ls.waitingForBlank = true;
        updateLiveStageDOM();
        return;
      }
      ls.activeLineIdx = foundIdx;
      ls.waitingForBlank = false;
      updateLiveStageDOM();
    }
  }, 120);
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
        // Auto-try next discovered video if available
        if (ls.videoIdx + 1 < ls.videoIds.length) {
          ls.videoIdx++;
          toastFn('Vídeo bloqueado para embed — testando alternativa...');
          mountYoutubePlayer(ls.videoIds[ls.videoIdx]);
        }
      }
    }
  });
}

async function launchSong(track) {
  ls.loadingMsg = `Carregando "${track.trackName}" e buscando vídeo...`;
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
  ls.activeLineIdx = 0;
  ls.waitingForBlank = false;
  ls.score = 0;
  ls.combo = 0;
  ls.solvedCount = 0;
  ls.skippedCount = 0;
  ls.syncOffset = 0;
  ls.view = 'play';

  rerenderAllFn();
  updateLiveStageDOM();
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
    const clearBtn = document.getElementById('btn-ls-clear-search');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        playClick();
        ls.searchResults = [];
        ls.searchQuery = '';
        rerender();
      });
    }
    root.querySelectorAll('[data-ls-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        ls.mode = btn.dataset.lsMode;
        rerender();
      });
    });
    const diffSel = document.getElementById('ls-diff-select');
    if (diffSel) {
      diffSel.addEventListener('change', (e) => { ls.difficulty = e.target.value; });
    }
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
  updateLiveStageDOM();

  const btnBack = document.getElementById('btn-ls-back');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      playClick();
      stopLyricsStudio();
      ls.view = 'catalog';
      rerender();
    });
  }

  const btnReplay = document.getElementById('btn-ls-replay');
  if (btnReplay) {
    btnReplay.addEventListener('click', () => seekToLine(ls.activeLineIdx));
  }

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
  const btnMinus = document.getElementById('btn-ls-sync-minus');
  if (btnMinus) btnMinus.addEventListener('click', () => { ls.syncOffset -= 0.5; updateSyncText(); });
  const btnPlus = document.getElementById('btn-ls-sync-plus');
  if (btnPlus) btnPlus.addEventListener('click', () => { ls.syncOffset += 0.5; updateSyncText(); });

  const btnAlt = document.getElementById('btn-ls-alt-video');
  if (btnAlt) {
    btnAlt.addEventListener('click', () => {
      if (!ls.videoIds.length) return;
      playClick();
      ls.videoIdx = (ls.videoIdx + 1) % ls.videoIds.length;
      btnAlt.innerHTML = `${iconHtml('shuffle', 13)} Outro Vídeo (${ls.videoIdx + 1}/${ls.videoIds.length})`;
      refreshIcons();
      mountYoutubePlayer(ls.videoIds[ls.videoIdx]);
    });
  }

  const btnNeural = document.getElementById('btn-ls-neural-line');
  if (btnNeural) {
    btnNeural.addEventListener('click', () => {
      const cur = ls.lines[ls.activeLineIdx];
      if (cur) speak(cur.text, 0.85);
    });
  }

  const btnLoadYt = document.getElementById('btn-ls-load-yt');
  if (btnLoadYt) {
    btnLoadYt.addEventListener('click', () => {
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
  }

  root.querySelectorAll('[data-ls-live-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      ls.mode = btn.dataset.lsLiveMode;
      ls.waitingForBlank = false;
      root.querySelectorAll('[data-ls-live-mode]').forEach(b => {
        b.className = `btn btn-sm ${b.dataset.lsLiveMode === ls.mode ? 'btn-primary' : 'btn-secondary'}`;
      });
      updateLiveStageDOM();
    });
  });

  const liveDiff = document.getElementById('ls-live-diff');
  if (liveDiff) {
    liveDiff.addEventListener('change', (e) => {
      ls.difficulty = e.target.value;
      ls.lines = buildGameLines(ls.rawLines, ls.difficulty);
      ls.totalBlanks = ls.lines.filter(l => l.blank).length;
      ls.solvedCount = 0;
      ls.waitingForBlank = false;
      updateLiveStageDOM();
    });
  }
}

export function handleLyricsKeydown(e) {
  if (ls.view !== 'play') return false;
  if (e.key === 'Tab') {
    e.preventDefault();
    seekToLine(ls.activeLineIdx);
    return true;
  }
  if (ls.mode === 'choice' && ['1', '2', '3', '4'].includes(e.key)) {
    const cur = ls.lines[ls.activeLineIdx];
    if (cur && cur.blank && cur.blank.status === 'pending') {
      const opt = cur.blank.options[Number(e.key) - 1];
      if (opt) {
        handleWordGuess(opt);
        return true;
      }
    }
  }
  return false;
}
