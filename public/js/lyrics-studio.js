import { CURATED_SONGS, SONG_GENRES } from './data-songs.js';
import { playClick, playCorrect, playWrong, playVictory, iconHtml, refreshIcons } from './sfx.js';
import {
  addXp,
  addCustomCard,
  recordWords,
  getCustomSongs,
  addCustomSongs,
  removeCustomSong,
  clearCustomSongs,
  markSongCompleted,
  recordSongPlay,
  getSongPlays
} from './store.js';
import { speak, createRecognizer, hasSpeechRecognition } from './speech.js';
import { analyzeVerseNativeXray, scoreVoiceVerse } from './music-native-xray.js';

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
const TRANS_CACHE_KEY = 'fluencyforge_lyrics_pt_v1';

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
          wrongGuesses: [],
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
  catalogFilter: '',
  catalogSort: 'popular', // 'popular' | 'default' | 'alpha'
  searchQuery: '',
  searching: false,
  searchResults: [],
  loadingMsg: '',

  // Bulk Song Importer
  showImporter: false,
  importTab: 'artist', // 'artist' | 'playlist' | 'text'
  importBusy: false,
  importArtistInput: '',
  importArtistLimit: 15,
  importPlaylistUrl: '',
  importTextList: '',

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
  mode: 'choice', // 'choice' | 'write' | 'voice' | 'karaoke'
  difficulty: 'medium', // 'easy' | 'medium' | 'hard' | 'extreme'
  playbackRate: 1.0,
  syncOffset: 0,
  autoPause: true,
  showTranslation: true,
  showFullBilingual: false,
  translations: [],
  translating: false,
  showTools: false,

  // Live playback state
  phase: 'ready', // 'ready' | 'intro' | 'singing' | 'break' | 'ended'
  isPlaying: false,
  duration: 0,
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

  // Voice Shadowing Live State
  voiceListening: false,
  voiceTranscript: '',
  voiceScorePct: 0,
  voiceMatchedIdx: [],
  voiceError: '',
  voicePassedLines: {},

  // Native X-Ray active pill index
  xraySelectedKey: '',

  // Firebase Music Hub (Global Leaderboard, Hard Words & Auto-Sync)
  hubLoading: false,
  hubData: null,
  hubScoreSaved: false,
  hubIsNewRecord: false,
  communitySyncApplied: false,
  globalTrending: [],
  globalTrendingLoaded: false
};

let activeVoiceRec = null;
let pendingMissWords = new Set();
let missFlushTimer = null;
let offsetSyncTimer = null;

let seekLockUntil = 0;

function fmtClock(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

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

export function stopVoiceMic() {
  if (activeVoiceRec) {
    try { activeVoiceRec.abort(); } catch (_) {}
    activeVoiceRec = null;
  }
  ls.voiceListening = false;
}

export function stopLyricsStudio() {
  stopVoiceMic();
  if (missFlushTimer) { clearTimeout(missFlushTimer); missFlushTimer = null; }
  if (offsetSyncTimer) { clearTimeout(offsetSyncTimer); offsetSyncTimer = null; }
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  if (ytPlayer) {
    try { ytPlayer.destroy(); } catch (_) {}
    ytPlayer = null;
  }
}

function loadCachedTranslation(songKey, expectedLen) {
  try {
    const map = JSON.parse(localStorage.getItem(TRANS_CACHE_KEY) || '{}');
    const arr = map[songKey];
    if (Array.isArray(arr) && arr.length === expectedLen && arr.some(Boolean)) return arr;
  } catch (_) {}
  return null;
}

function saveCachedTranslation(songKey, arr) {
  try {
    const map = JSON.parse(localStorage.getItem(TRANS_CACHE_KEY) || '{}');
    map[songKey] = arr;
    const keys = Object.keys(map);
    if (keys.length > 35) delete map[keys[0]];
    localStorage.setItem(TRANS_CACHE_KEY, JSON.stringify(map));
  } catch (_) {}
}

async function fetchSongTranslations(songKey, lines) {
  const cached = loadCachedTranslation(songKey, lines.length);
  if (cached) {
    ls.translations = cached;
    ls.translating = false;
    renderTeleprompter(true);
    renderBilingualPanel();
    return;
  }

  ls.translations = [];
  ls.translating = true;
  renderTeleprompter(true);
  renderBilingualPanel();

  try {
    const res = await fetch('/api/lyrics', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: lines.map(l => l.text) })
    });
    const json = await res.json();
    if (ls.songKey !== songKey) return;
    ls.translating = false;
    if (json.ok && Array.isArray(json.translations)) {
      ls.translations = json.translations;
      saveCachedTranslation(songKey, json.translations);
    }
  } catch (_) {
    if (ls.songKey !== songKey) return;
    ls.translating = false;
  }
  renderTeleprompter(true);
  renderBilingualPanel();
}

function renderBilingualPanel() {
  const host = document.getElementById('ls-bilingual-panel');
  if (!host) return;
  host.classList.toggle('hidden', !ls.showFullBilingual);
  if (!ls.showFullBilingual) return;

  host.innerHTML = `
    <div class="row-between" style="flex-wrap:wrap; gap:8px;">
      <div class="row" style="gap:8px; align-items:center;">
        <strong style="font-family:'Bricolage Grotesque',sans-serif; font-size:16px;">${iconHtml('languages', 16)} Letra Completa &amp; Tradução (Inglês • Português)</strong>
        <span class="pill" style="font-size:11px;">${ls.lines.length} versos • clique para pular</span>
      </div>
      <button type="button" class="btn btn-ghost btn-sm" id="btn-ls-close-bilingual">${iconHtml('x', 14)} Ocultar</button>
    </div>
    <div class="music-bilingual-list">
      ${ls.lines.map((line, i) => {
        const pt = ls.translations[i] || (ls.translating ? 'Traduzindo...' : '');
        const isCur = i === ls.activeLineIdx;
        return `
          <button type="button" class="music-bilingual-row ${isCur ? 'is-current' : ''}" data-bi-jump="${i}">
            <span class="mono muted" style="font-size:11px;">${fmtClock(line.time)}</span>
            <span style="font-weight:600; font-size:13.5px;">${esc(line.text)}</span>
            <span class="muted music-bilingual-pt" style="font-size:13px;">${esc(pt)}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;

  host.querySelectorAll('[data-bi-jump]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.biJump);
      const line = ls.lines[idx];
      if (!line) return;
      playClick();
      stopVoiceMic();
      ls.phase = 'singing';
      ls.activeLineIdx = idx;
      ls.lineProgress = 0;
      seekSafe(line.time - 0.55 - ls.syncOffset, true);
      renderTeleprompter(true);
      updateBilingualActiveRow();
    });
  });

  document.getElementById('btn-ls-close-bilingual')?.addEventListener('click', () => {
    playClick();
    ls.showFullBilingual = false;
    document.getElementById('btn-ls-toggle-bilingual')?.classList.remove('btn-tune-on');
    renderBilingualPanel();
  });
  refreshIcons();
}

function updateBilingualActiveRow() {
  const host = document.getElementById('ls-bilingual-panel');
  if (!host || host.classList.contains('hidden')) return;
  host.querySelectorAll('[data-bi-jump]').forEach(el => {
    const isCur = Number(el.dataset.biJump) === ls.activeLineIdx;
    el.classList.toggle('is-current', isCur);
    if (isCur) {
      try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) {}
    }
  });
}

// =========================================================================
// COMMUNITY EDITION: LOCAL ONLY (CLOUD LEADERBOARD IS PART OF FLUENCYFORGE PRO)
// =========================================================================
async function fetchGlobalTrendingOnce() {}

function renderFirebaseHubPanel() {
  const host = document.getElementById('ls-firebase-hub');
  if (!host) return;
  host.innerHTML = `
    <div class="card row-between" style="padding:14px 16px; gap:12px; flex-wrap:wrap; background:var(--bg-soft);">
      <div class="row" style="gap:10px; align-items:center;">
        <span class="pill" style="font-size:11px;">${iconHtml('trophy', 12)} Modo Local (Community MIT)</span>
        <span class="muted" style="font-size:12.5px;">Quer competir no <strong>Ranking Global por Música</strong>, ver onde brasileiros mais travam e sincronizar na nuvem? Conheça o <strong>FluencyForge Pro</strong>.</span>
      </div>
      <div class="row" style="gap:6px;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-ls-challenge-friend">${iconHtml('share-2', 13)} Compartilhar Placar</button>
        <a href="https://fluency-forge-pro.vercel.app/" target="_blank" rel="noopener" class="btn btn-primary btn-sm" style="text-decoration:none;">Ver Edição Pro</a>
      </div>
    </div>
  `;
  document.getElementById('btn-ls-challenge-friend')?.addEventListener('click', copyChallengeInvite);
  refreshIcons();
}

function copyChallengeInvite() {
  playClick();
  const text = ls.score > 0
    ? `Fiz ${ls.score.toLocaleString('pt-BR')} pts em "${ls.songTitle}" (${ls.songArtist}) no FluencyForge! Consegue bater meu placar? https://fluency-forge-pro.vercel.app/`
    : `Estou treinando inglês ao vivo com "${ls.songTitle}" (${ls.songArtist}) no FluencyForge! https://fluency-forge-pro.vercel.app/`;
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text).then(() => {
      toastFn('Placar copiado para compartilhar!');
    }).catch(() => toastFn(text));
  } else {
    toastFn(text);
  }
}

async function initFirebaseHubForSong() { renderFirebaseHubPanel(); }
async function submitScoreToFirebaseHub() {}
function queueCommunityMissWord() {}
function shareCommunitySyncOffset() {}

export function renderLyricsView() {
  if (ls.view === 'play') return renderCinemaPlayerShell();
  return renderLyricsCatalog();
}

const FEATURED_ARTISTS = [
  'Imagine Dragons', 'Billie Eilish', 'Coldplay', 'Linkin Park',
  'Bruno Mars', 'The Weeknd', 'Olivia Rodrigo', 'Arctic Monkeys',
  'Adele', 'Ed Sheeran', 'Eminem', 'Twenty One Pilots', 'Queen'
];

const QUICK_IMPORT_PACKS = [
  { label: 'Pack Rock & Metal', artists: 'Metallica, Foo Fighters, System of a Down, AC/DC', limit: 10 },
  { label: 'Pack Pop Atual', artists: 'Dua Lipa, Sabrina Carpenter, Harry Styles, Tate McRae', limit: 10 },
  { label: 'Pack Indie & Alt', artists: 'Lana Del Rey, The Neighbourhood, Tame Impala, Radiohead', limit: 10 },
  { label: 'Pack Clássicos 80s/90s', artists: 'Michael Jackson, Bon Jovi, Oasis, U2', limit: 10 }
];

function getAllCatalogSongs() {
  return [...getCustomSongs(), ...CURATED_SONGS];
}

function renderBulkImporterPanel() {
  if (!ls.showImporter) return '';
  return `
    <div class="card stack-md" style="border-color:var(--primary); background:var(--surface);">
      <div class="row-between">
        <div>
          <span class="pill" style="margin-bottom:6px;">${iconHtml('sparkles', 13)} Importador Automático em Massa</span>
          <h3 style="font-size:19px;">Adicione dezenas de músicas em 1 clique</h3>
          <p class="muted" style="font-size:13px;">Importe discografias por artista, cole o link de uma playlist (Spotify, Deezer ou YouTube) ou cole uma lista em texto.</p>
        </div>
        <button class="btn btn-ghost btn-sm" id="btn-ls-close-importer">${iconHtml('x', 15)} Fechar</button>
      </div>

      <div class="row" style="gap:6px;">
        <button class="btn btn-sm ${ls.importTab === 'artist' ? 'btn-primary' : 'btn-secondary'}" data-ls-imp-tab="artist">${iconHtml('users', 14)} Por Artista / Banda</button>
        <button class="btn btn-sm ${ls.importTab === 'playlist' ? 'btn-primary' : 'btn-secondary'}" data-ls-imp-tab="playlist">${iconHtml('link', 14)} Link de Playlist (Spotify/Deezer/YT)</button>
        <button class="btn btn-sm ${ls.importTab === 'text' ? 'btn-primary' : 'btn-secondary'}" data-ls-imp-tab="text">${iconHtml('file-text', 14)} Colar Lista em Texto</button>
      </div>

      ${ls.importTab === 'artist' ? `
        <form id="ls-import-artist-form" class="stack-sm">
          <div class="row" style="align-items:stretch;">
            <input type="text" id="ls-imp-artist-input" value="${esc(ls.importArtistInput)}" placeholder="Digite 1 ou vários artistas separados por vírgula (ex: Paramore, Metallica, Avril Lavigne)" style="flex:1; padding:10px 12px;" />
            <select id="ls-imp-artist-limit" style="padding:10px 12px;">
              <option value="10" ${ls.importArtistLimit === 10 ? 'selected' : ''}>10 por artista</option>
              <option value="15" ${ls.importArtistLimit === 15 ? 'selected' : ''}>15 por artista</option>
              <option value="25" ${ls.importArtistLimit === 25 ? 'selected' : ''}>25 por artista</option>
            </select>
            <button type="submit" class="btn btn-primary" ${ls.importBusy ? 'disabled' : ''}>
              ${iconHtml('download', 14)} ${ls.importBusy ? 'Importando...' : 'Importar Agora'}
            </button>
          </div>
          <div class="row" style="gap:6px; align-items:center;">
            <span class="mini-label">Packs prontos (+40 músicas):</span>
            ${QUICK_IMPORT_PACKS.map((p, i) => `
              <button type="button" class="btn btn-ghost btn-sm" style="border:1px solid var(--border); font-size:12px;" data-ls-imp-pack="${i}" ${ls.importBusy ? 'disabled' : ''}>
                + ${esc(p.label)}
              </button>
            `).join('')}
          </div>
        </form>
      ` : ls.importTab === 'playlist' ? `
        <form id="ls-import-playlist-form" class="stack-sm">
          <div class="row" style="align-items:stretch;">
            <input type="url" id="ls-imp-playlist-url" value="${esc(ls.importPlaylistUrl)}" placeholder="https://open.spotify.com/playlist/... ou Deezer ou YouTube Playlist" style="flex:1; padding:10px 12px;" />
            <button type="submit" class="btn btn-primary" ${ls.importBusy ? 'disabled' : ''}>
              ${iconHtml('download', 14)} ${ls.importBusy ? 'Lendo playlist...' : 'Importar Playlist'}
            </button>
          </div>
          <div class="muted" style="font-size:12px;">Funciona com qualquer playlist ou álbum público do <strong>Spotify</strong>, <strong>Deezer</strong> ou <strong>YouTube</strong> — sem precisar fazer login.</div>
        </form>
      ` : `
        <form id="ls-import-text-form" class="stack-sm">
          <textarea id="ls-imp-text-area" rows="5" placeholder="Cole 1 música por linha (ex:&#10;Imagine Dragons - Warriors&#10;Billie Eilish - Chihiro&#10;Linkin Park - Breaking the Habit&#10;Arctic Monkeys - R U Mine?)" style="width:100%; padding:10px 12px; font-family:'JetBrains Mono',monospace; font-size:13px;">${esc(ls.importTextList)}</textarea>
          <div class="row-between">
            <span class="muted" style="font-size:12px;">Aceita dezenas ou centenas de linhas no formato <code>Artista - Música</code> ou só o nome da música.</span>
            <button type="submit" class="btn btn-primary">
              ${iconHtml('plus', 14)} Importar Lista Inteira
            </button>
          </div>
        </form>
      `}
    </div>
  `;
}

const DEFAULT_POPULAR_QUERIES = [
  'Imagine Dragons Believer',
  'Billie Eilish Birds of a Feather',
  'Coldplay Yellow',
  'The Weeknd Blinding Lights',
  'Lady Gaga Bruno Mars Die With A Smile',
  'Linkin Park Numb',
  'Imagine Dragons Demons',
  'Billie Eilish bad guy',
  'Arctic Monkeys Do I Wanna Know',
  'Adele Someone Like You',
  'Post Malone Sunflower',
  'Queen Bohemian Rhapsody'
];

function songPlayKey(artist, title) {
  const norm = (str) => String(str || '')
    .replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return `${norm(artist)}::${norm(title)}`;
}

function getPlayCountForSong(song, playsMap) {
  const exactKey = songPlayKey(song.artist, song.title);
  if (playsMap[exactKey]?.count) return playsMap[exactKey].count;
  const normTitle = String(song.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normArtist = String(song.artist || '').split(/[&,]/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  let total = 0;
  for (const [k, rec] of Object.entries(playsMap)) {
    if (!rec?.count) continue;
    if (normTitle && normArtist && k.includes(normArtist) && k.includes(normTitle)) {
      total += rec.count;
    }
  }
  return total;
}

function getPopularityRank(song, playsMap) {
  const userPlays = getPlayCountForSong(song, playsMap);
  const defIdx = DEFAULT_POPULAR_QUERIES.indexOf(song.query);
  const basePop = defIdx >= 0 ? (20 - defIdx) : 0;
  return userPlays * 1000 + basePop;
}

function getFilteredCatalogSongs(allSongs) {
  const playsMap = getSongPlays();
  const q = ls.catalogFilter.trim().toLowerCase();
  const list = allSongs.filter(s => {
    const genreOk =
      ls.genreFilter === 'all' ||
      (ls.genreFilter === 'custom' ? Boolean(s.custom) : s.genre === ls.genreFilter);
    const artistOk = !ls.artistFilter || s.artist.toLowerCase().includes(ls.artistFilter.toLowerCase());
    const textOk = !q ||
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      (s.level || '').toLowerCase().includes(q);
    return genreOk && artistOk && textOk;
  });

  if (ls.catalogSort === 'popular') {
    list.sort((a, b) => getPopularityRank(b, playsMap) - getPopularityRank(a, playsMap));
  } else if (ls.catalogSort === 'alpha') {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }
  return list;
}

function getSongCoverUrl(song) {
  if (song?.ytId) return `https://i.ytimg.com/vi/${encodeURIComponent(song.ytId)}/mqdefault.jpg`;
  if (song?.coverUrl) return song.coverUrl;
  return '';
}

function renderCatalogCardsHtml(filteredSongs, allSongs) {
  const playsMap = getSongPlays();
  if (!filteredSongs.length) {
    const q = ls.catalogFilter.trim();
    return `
      <div class="card stack-sm" style="grid-column: 1 / -1; text-align:center; padding:28px 18px;">
        <div class="muted">Nenhuma música encontrada no catálogo para <strong>"${esc(q)}"</strong>.</div>
        ${q ? `
          <div style="padding-top:4px;">
            <button type="button" class="btn btn-primary btn-sm" id="btn-ls-fallback-global">
              ${iconHtml('search', 14)} Buscar "${esc(q)}" no mundo inteiro (LRCLIB)
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }
  return filteredSongs.map((song) => {
    const origIdx = allSongs.indexOf(song);
    const plays = getPlayCountForSong(song, playsMap);
    const cover = getSongCoverUrl(song);
    return `
      <div class="card card-interactive song-cover-card" data-ls-curated="${origIdx}">
        <div class="song-cover-media">
          ${cover
            ? `<img src="${esc(cover)}" alt="Capa de ${esc(song.title)} - ${esc(song.artist)}" loading="lazy" decoding="async" />`
            : `<div class="song-cover-fallback">${iconHtml('music', 26)}</div>`}
          <span class="song-cover-level">${esc(song.level)}</span>
          ${plays > 0 ? `<span class="song-cover-plays">${iconHtml('flame', 11)} ${plays}x</span>` : ''}
          ${song.custom ? `<button type="button" class="song-cover-del" data-ls-del-song="${esc(song.query)}" title="Remover música importada">${iconHtml('x', 12)}</button>` : ''}
          <div class="song-cover-play-overlay">
            <span class="song-cover-play-pill">${iconHtml('play', 14)} Jogar</span>
          </div>
        </div>
        <div class="song-cover-meta">
          <div class="song-cover-title">${esc(song.title)}</div>
          <div class="song-cover-artist">${esc(song.artist)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderLyricsCatalog() {
  const allSongs = getAllCatalogSongs();
  const playsMap = getSongPlays();
  const customCount = getCustomSongs().length;
  const filteredSongs = getFilteredCatalogSongs(allSongs);

  // Top 6 Most Played (user's real most played songs first, filled cleanly with global top hits)
  const mostPlayed = [...allSongs]
    .sort((a, b) => getPopularityRank(b, playsMap) - getPopularityRank(a, playsMap))
    .slice(0, 6);
  const userPlayedTotal = Object.values(playsMap).reduce((acc, r) => acc + (r.count || 0), 0);

  return `
    <div class="stack-lg">
      <div class="card path-hero stack-md">
        <div class="row-between" style="flex-wrap:wrap; gap:10px;">
          <div class="stack-sm">
            <span class="pill" style="width:fit-content;">${iconHtml('music', 13)} Palco Real-Time • ${allSongs.length} Músicas + Importação em Massa</span>
            <h2 style="font-size:22px;">A letra surge ao vivo no ritmo do cantor — escolha seu nível</h2>
            <p class="muted">Escolha <strong>Fácil</strong> (1 palavra), <strong>Médio</strong> (1–2 palavras/verso), <strong>Difícil</strong> (2–3 palavras/verso) ou <strong>Extremo</strong>. Toda palavra ouvida e acertada entra automaticamente no seu <strong>Banco de Palavras</strong>.</p>
          </div>
          <button class="btn ${ls.showImporter ? 'btn-primary' : 'btn-secondary'}" id="btn-ls-toggle-importer">
            ${iconHtml('folder-plus', 15)} Importar em Massa
          </button>
        </div>

        <form id="lyrics-search-form" class="row" style="align-items:stretch;">
          <input type="text" id="lyrics-search-input" value="${esc(ls.searchQuery)}" placeholder="Busque qualquer música do mundo fora do catálogo (ex: Drake, Lana Del Rey, Coldplay)..." style="flex:1; font-size:14px; padding:11px 14px;" />
          <button type="submit" class="btn btn-primary" ${ls.searching ? 'disabled' : ''}>
            ${iconHtml('globe', 15)} ${ls.searching ? 'Buscando...' : 'Busca Global'}
          </button>
        </form>

        <div class="stack-sm">
          <div class="row">
            <span class="mini-label" style="min-width:74px;">Modo:</span>
            <button class="btn btn-sm ${ls.mode === 'choice' ? 'btn-primary' : 'btn-secondary'}" data-ls-mode="choice">${iconHtml('list-checks', 14)} Escolha (4 opções)</button>
            <button class="btn btn-sm ${ls.mode === 'write' ? 'btn-primary' : 'btn-secondary'}" data-ls-mode="write">${iconHtml('keyboard', 14)} Digitar na Letra</button>
            <button class="btn btn-sm ${ls.mode === 'voice' ? 'btn-primary' : 'btn-secondary'}" data-ls-mode="voice">${iconHtml('mic', 14)} Voz ao Vivo (Shadowing) <span class="pill" style="font-size:9.5px; padding:1px 6px; margin-left:3px; background:var(--card); color:var(--primary);">NOVO</span></button>
            <button class="btn btn-sm ${ls.mode === 'karaoke' ? 'btn-primary' : 'btn-secondary'}" data-ls-mode="karaoke">${iconHtml('headphones', 14)} Karaokê</button>
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

      ${renderBulkImporterPanel()}

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

      <!-- MAIS JOGADAS SHELF -->
      <div class="stack-sm">
        <div class="row-between" style="flex-wrap:wrap; gap:8px;">
          <div class="row" style="gap:8px; align-items:center;">
            <h2 style="font-size:19px;">${iconHtml('flame', 18)} Mais Jogadas</h2>
            <span class="pill" style="font-size:11px;">${userPlayedTotal > 0 ? `${userPlayedTotal} partida(s) suas + Top Hits` : 'Top Hits da Comunidade'}</span>
          </div>
        </div>
        <div class="grid-3">
          ${mostPlayed.map((song, rank) => {
            const origIdx = allSongs.indexOf(song);
            const plays = getPlayCountForSong(song, playsMap);
            const cover = getSongCoverUrl(song);
            const sKey = `${song.artist}::${song.title}`.toLowerCase();
            const gMatch = (ls.globalTrending || []).find(t => t.songKey === sKey || (t.title && t.title.toLowerCase() === song.title.toLowerCase()));
            const globalBadge = gMatch && gMatch.topScore > 0
              ? `🏆 ${esc(gMatch.topPlayer || 'Líder')}: ${Number(gMatch.topScore).toLocaleString('pt-BR')} pts`
              : `${esc(song.artist)} • ${esc(song.level.split('•')[0].trim())}`;
            const displayPlays = Math.max(plays, Number(gMatch?.plays || 0));
            return `
              <div class="card card-interactive row-between" style="padding:10px 12px; cursor:pointer; gap:10px;" data-ls-curated="${origIdx}">
                <div class="row" style="gap:10px; align-items:center; min-width:0;">
                  <div class="most-played-thumb">
                    ${cover ? `<img src="${esc(cover)}" alt="${esc(song.title)}" loading="lazy" decoding="async" />` : `<div class="song-cover-fallback">${iconHtml('music', 16)}</div>`}
                    <span class="most-played-rank-badge">#${rank + 1}</span>
                  </div>
                  <div style="min-width:0;">
                    <div style="font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:15.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(song.title)}</div>
                    <div class="muted" style="font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${globalBadge}</div>
                  </div>
                </div>
                <div class="row" style="gap:6px; flex-shrink:0;">
                  ${displayPlays > 0 ? `<span class="pill" style="font-size:11px; color:var(--primary); border-color:var(--primary);">${displayPlays}x</span>` : ''}
                  <span class="btn btn-primary btn-sm" style="padding:6px 10px;">${iconHtml('play', 13)}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- FULL CATALOG WITH INSTANT SEARCH BAR & SORT -->
      <div class="stack-md">
        <div class="row-between" style="flex-wrap:wrap; gap:10px;">
          <h2>Catálogo de Músicas (<span id="ls-catalog-count">${filteredSongs.length}</span>)</h2>

          <div class="row" style="gap:8px; flex:1; justify-content:flex-end; min-width:260px; flex-wrap:wrap;">
            <div class="catalog-search-box">
              <span class="catalog-search-icon">${iconHtml('search', 14)}</span>
              <input type="text" id="ls-catalog-search" value="${esc(ls.catalogFilter)}" placeholder="Pesquisar música, artista ou nível no catálogo..." autocomplete="off" />
              <button type="button" id="btn-ls-clear-cat-search" class="btn btn-ghost btn-sm ${ls.catalogFilter ? '' : 'hidden'}" style="padding:2px 6px;" title="Limpar pesquisa">${iconHtml('x', 13)}</button>
            </div>
            <select id="ls-catalog-sort" style="padding:8px 10px; font-size:12.5px;">
              <option value="popular" ${ls.catalogSort === 'popular' ? 'selected' : ''}>Ordenar: Mais Jogadas</option>
              <option value="default" ${ls.catalogSort === 'default' ? 'selected' : ''}>Ordenar: Padrão</option>
              <option value="alpha" ${ls.catalogSort === 'alpha' ? 'selected' : ''}>Ordenar: A–Z</option>
            </select>
          </div>
        </div>

        <div class="row" style="gap:6px;">
          ${customCount > 0 ? `
            <button class="btn btn-sm ${!ls.artistFilter && ls.genreFilter === 'custom' ? 'btn-primary' : 'btn-secondary'}" data-ls-genre="custom">
              ${iconHtml('folder-heart', 13)} Importadas (${customCount})
            </button>
          ` : ''}
          ${SONG_GENRES.map(g => {
            const cnt = g.id === 'all' ? allSongs.length : allSongs.filter(s => s.genre === g.id).length;
            return `
              <button class="btn btn-sm ${!ls.artistFilter && ls.genreFilter === g.id ? 'btn-primary' : 'btn-secondary'}" data-ls-genre="${g.id}">
                ${esc(g.label)} (${cnt})
              </button>
            `;
          }).join('')}
          ${ls.genreFilter === 'custom' && customCount > 0 ? `
            <button class="btn btn-ghost btn-sm" id="btn-ls-clear-custom" style="color:var(--danger);">${iconHtml('trash-2', 13)} Limpar Importadas</button>
          ` : ''}
        </div>

        <div class="row" style="gap:6px; align-items:center;">
          <span class="mini-label" style="margin-right:2px;">Artistas:</span>
          ${ls.artistFilter ? `<button class="btn btn-ghost btn-sm" data-ls-artist="">Todos</button>` : ''}
          ${FEATURED_ARTISTS.map(artist => {
            const cnt = allSongs.filter(s => s.artist.toLowerCase().includes(artist.toLowerCase())).length;
            const active = ls.artistFilter === artist;
            return `
              <button class="btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}" style="border:1px solid var(--border); padding:4px 10px; font-size:12px;" data-ls-artist="${esc(artist)}">
                ${esc(artist)} (${cnt})
              </button>
            `;
          }).join('')}
        </div>

        <div class="grid-3" id="ls-catalog-grid">
          ${renderCatalogCardsHtml(filteredSongs, allSongs)}
        </div>
      </div>
    </div>
  `;
}

function renderCinemaPlayerShell() {
  const diffObj = DIFFICULTIES.find(d => d.id === ls.difficulty) || DIFFICULTIES[1];
  return `
    <div class="music-studio-shell stack-md">
      <!-- TOP STUDIO HEADER: Unmistakable Back button + Song Info + Score HUD -->
      <div class="card music-studio-topbar">
        <div class="row" style="gap:12px; align-items:center;">
          <button class="btn btn-secondary btn-sm" id="btn-ls-back" title="Voltar para o catálogo de músicas">
            ${iconHtml('arrow-left', 15)} Voltar
          </button>
          <div>
            <div style="font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:17px; line-height:1.15;">${esc(ls.songTitle)}</div>
            <div class="muted" style="font-size:12px;">${esc(ls.songArtist)} • <strong id="hud-diff-label">${esc(diffObj.label)}</strong> • <span id="hud-verse-pos">Verso 1/${ls.lines.length}</span></div>
          </div>
        </div>

        <div class="row" style="gap:7px; flex-wrap:wrap;">
          <span class="pill">${iconHtml('trophy', 13)} <strong id="hud-score">${ls.score}</strong></span>
          <span class="pill">${iconHtml('flame', 13)} <strong id="hud-combo">x${ls.combo}</strong></span>
          <span class="pill">${iconHtml('check', 13)} <strong id="hud-progress">${ls.solvedCount}/${ls.totalBlanks}</strong></span>
          <button class="btn btn-ghost btn-sm" id="btn-ls-restart-top" title="Reiniciar música do zero">
            ${iconHtml('refresh-cw', 14)} Reiniciar
          </button>
          <button class="btn ${ls.showTools ? 'btn-primary' : 'btn-secondary'} btn-sm" id="btn-ls-tools-toggle" title="Dificuldade, modo e link de vídeo">
            ${iconHtml('sliders-horizontal', 14)} Ajustes
          </button>
        </div>
      </div>

      <!-- OPTIONAL SETTINGS DRAWER (Difficulty, Mode, Custom YouTube URL) -->
      <div id="ls-tools-drawer" class="card ${ls.showTools ? '' : 'hidden'} stack-sm" style="padding:14px 16px;">
        <div class="row-between" style="flex-wrap:wrap; gap:10px;">
          <div class="row" style="gap:6px;">
            <span class="mini-label">Dificuldade:</span>
            ${DIFFICULTIES.map(d => `
              <button class="btn btn-sm ${ls.difficulty === d.id ? 'btn-primary' : 'btn-secondary'}" data-ls-live-diff="${d.id}">${esc(d.label)}</button>
            `).join('')}
          </div>
          <div class="row" style="gap:6px;">
            <span class="mini-label">Modo:</span>
            <button class="btn btn-sm ${ls.mode === 'choice' ? 'btn-primary' : 'btn-secondary'}" data-ls-live-mode="choice">Escolha (4 opções)</button>
            <button class="btn btn-sm ${ls.mode === 'write' ? 'btn-primary' : 'btn-secondary'}" data-ls-live-mode="write">Digitar</button>
            <button class="btn btn-sm ${ls.mode === 'voice' ? 'btn-primary' : 'btn-secondary'}" data-ls-live-mode="voice">${iconHtml('mic', 13)} Voz ao Vivo</button>
            <button class="btn btn-sm ${ls.mode === 'karaoke' ? 'btn-primary' : 'btn-secondary'}" data-ls-live-mode="karaoke">Karaokê</button>
          </div>
        </div>

        <div class="row-between" style="padding-top:8px; border-top:1px solid var(--border); flex-wrap:wrap; gap:8px;">
          <div class="row" style="gap:6px;">
            <button class="btn btn-ghost btn-sm" id="btn-ls-alt-video">${iconHtml('shuffle', 13)} Outro Vídeo (${ls.videoIdx + 1}/${Math.max(1, ls.videoIds.length)})</button>
            <button class="btn btn-ghost btn-sm" id="btn-ls-neural-line">${iconHtml('volume-2', 13)} Ouvir Verso (Voz Neural)</button>
          </div>
          <div class="row" style="gap:6px;">
            <input type="text" id="ls-custom-yt" placeholder="Colar outro link do YouTube..." style="width:200px; padding:6px 10px; font-size:12px;" />
            <button class="btn btn-secondary btn-sm" id="btn-ls-load-yt">Carregar</button>
          </div>
        </div>
      </div>

      <!-- NEW SPLIT-SCREEN MUSIC STUDIO LAYOUT -->
      <div class="music-studio-grid">
        <!-- LEFT COLUMN: VIDEO + SCRUBBER + FULL TRANSPORT CONTROLS -->
        <div class="card music-deck-col" style="padding:0; overflow:hidden;">
          <div class="music-video-box">
            <div id="yt-player-host"></div>
            <div id="ls-burst-layer" class="ls-burst-layer"></div>
          </div>

          <div id="ls-video-fallback" class="${ls.videoError ? '' : 'hidden'}" style="padding:10px 14px; background:var(--warning-soft); border-top:1px solid var(--warning); font-size:12px; display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <span>Vídeo bloqueado. Troque para outra versão:</span>
            <button class="btn btn-secondary btn-sm" id="btn-ls-fallback-next">Trocar Vídeo</button>
          </div>

          <!-- SCRUBBER TIMELINE -->
          <div class="music-deck-body stack-sm">
            <div class="stack-sm" style="gap:5px;">
              <div class="music-scrub-track" id="ls-scrub-track" title="Clique para pular para qualquer trecho da música">
                <div class="music-scrub-fill" id="ls-scrub-fill" style="width:0%;"></div>
              </div>
              <div class="row-between mono muted" style="font-size:11px;">
                <span id="ls-time-cur">00:00</span>
                <span id="ls-time-dur">--:--</span>
              </div>
            </div>

            <!-- 5-BUTTON TRANSPORT BAR -->
            <div class="music-transport-row">
              <button class="btn btn-secondary btn-sm" id="btn-ls-prev-verse" title="Verso Anterior (Seta ←)">
                ${iconHtml('skip-back', 14)} <span class="tr-lbl">Anterior</span>
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-ls-rew5" title="Voltar 5 segundos">
                ${iconHtml('rewind', 14)} <span>-5s</span>
              </button>
              <button class="btn btn-primary btn-sm" id="btn-ls-play-pause" title="Play / Pausar">
                ${iconHtml('play', 15)} <span>Play</span>
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-ls-replay" title="Repetir verso atual (Tab)">
                ${iconHtml('rotate-ccw', 14)} <span class="tr-lbl">Repetir</span>
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-ls-next-verse" title="Próximo Verso (Seta →)">
                <span class="tr-lbl">Próximo</span> ${iconHtml('skip-forward', 14)}
              </button>
            </div>

            <!-- QUICK INLINE STUDIO TUNING (NO HIDDEN MENUS NEEDED!) -->
            <div class="music-quick-tuning">
              <button class="btn btn-ghost btn-sm" id="btn-ls-speed" title="Alternar velocidade 0.75x / 1.0x">
                ${iconHtml('gauge', 13)} ${ls.playbackRate}x
              </button>
              <button class="btn btn-ghost btn-sm ${ls.autoPause ? 'btn-tune-on' : ''}" id="btn-ls-autopause" title="Pausar automaticamente se faltar completar uma palavra">
                ${iconHtml('pause-circle', 13)} Auto-Pausa: ${ls.autoPause ? 'ON' : 'OFF'}
              </button>
              <button class="btn btn-ghost btn-sm ${ls.showTranslation ? 'btn-tune-on' : ''}" id="btn-ls-toggle-trans" title="Mostrar ou ocultar tradução em português abaixo do verso">
                ${iconHtml('languages', 13)} Tradução PT: ${ls.showTranslation ? 'ON' : 'OFF'}
              </button>
              <button class="btn btn-ghost btn-sm ${ls.showFullBilingual ? 'btn-tune-on' : ''}" id="btn-ls-toggle-bilingual" title="Abrir letra completa com tradução lado a lado">
                ${iconHtml('book-open', 13)} Letra Completa
              </button>
              <div class="row" style="gap:3px; margin-left:auto;">
                <button class="btn btn-ghost btn-sm" style="padding:4px 7px;" id="btn-ls-sync-minus" title="Atrasar letra 0.2s">-0.2s</button>
                <button class="btn btn-secondary btn-sm" style="padding:4px 8px; font-size:11.5px;" id="btn-ls-snap-sync" title="Sincronizar letra com a voz agora">
                  ${iconHtml('crosshair', 12)} <span id="ls-sync-val">${ls.syncOffset >= 0 ? '+' : ''}${ls.syncOffset.toFixed(1)}s</span>
                </button>
                <button class="btn btn-ghost btn-sm" style="padding:4px 7px;" id="btn-ls-sync-plus" title="Adiantar letra 0.2s">+0.2s</button>
              </div>
            </div>
          </div>
        </div>

        <!-- DIRECTLY BELOW VIDEO: DEDICATED REAL-TIME LYRICS & TRANSLATION STAGE -->
        <div class="card music-stage-col" style="padding:0; overflow:hidden;">
          <div id="ls-teleprompter" class="music-stage-dock"></div>
        </div>

        <!-- FULL BILINGUAL LYRICS + TRANSLATION DRAWER (CLICK ANY VERSE TO JUMP) -->
        <div id="ls-bilingual-panel" class="card music-bilingual-card stack-sm ${ls.showFullBilingual ? '' : 'hidden'}"></div>
      </div>

      <!-- FIREBASE MUSIC HUB: GLOBAL LEADERBOARD + COMMUNITY HARD WORDS + AUTO-SYNC -->
      <div id="ls-firebase-hub" style="width:100%; max-width:880px; margin:0 auto;"></div>
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
  const elVerse = document.getElementById('hud-verse-pos');
  if (elScore) elScore.textContent = ls.score;
  if (elCombo) elCombo.textContent = `x${ls.combo}`;
  if (elProg) elProg.textContent = `${ls.solvedCount}/${ls.totalBlanks}`;
  if (elDiff) {
    const d = DIFFICULTIES.find(x => x.id === ls.difficulty);
    if (d) elDiff.textContent = d.label;
  }
  if (elVerse) {
    const pos = Math.max(1, ls.activeLineIdx + 1);
    elVerse.textContent = `Verso ${pos}/${Math.max(1, ls.lines.length)}`;
  }
}

let lastPlayBtnState = null;
function updateDeckClock(ytNow, ytDur, isPlaying) {
  const curEl = document.getElementById('ls-time-cur');
  const durEl = document.getElementById('ls-time-dur');
  const fillEl = document.getElementById('ls-scrub-fill');
  if (curEl) curEl.textContent = fmtClock(ytNow);
  if (durEl && ytDur > 0) durEl.textContent = fmtClock(ytDur);
  if (fillEl && ytDur > 0) {
    fillEl.style.width = `${Math.max(0, Math.min(100, (ytNow / ytDur) * 100)).toFixed(2)}%`;
  }
  if (lastPlayBtnState !== isPlaying) {
    lastPlayBtnState = isPlaying;
    const ppBtn = document.getElementById('btn-ls-play-pause');
    if (ppBtn) {
      ppBtn.innerHTML = isPlaying
        ? `${iconHtml('pause', 15)} <span>Pausar</span>`
        : `${iconHtml('play', 15)} <span>Play</span>`;
      refreshIcons();
    }
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

function toggleVoiceShadowingForCurrentLine() {
  const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
  if (!cur) return;
  if (ls.voiceListening) {
    stopVoiceMic();
    renderTeleprompter(true);
    return;
  }
  if (!hasSpeechRecognition()) {
    ls.voiceError = 'Seu navegador não suporta reconhecimento de voz (use Chrome ou Edge).';
    toastFn(ls.voiceError);
    renderTeleprompter(true);
    return;
  }

  // Pause video cleanly while user speaks/sings the verse
  if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
    try { ytPlayer.pauseVideo(); } catch (_) {}
  }

  ls.voiceError = '';
  ls.voiceTranscript = '';
  ls.voiceScorePct = 0;
  ls.voiceMatchedIdx = [];
  ls.voiceListening = true;
  playClick();
  renderTeleprompter(true);

  const targetLineIdx = ls.activeLineIdx;
  const evaluateSpoken = (text, isFinal) => {
    if (ls.activeLineIdx !== targetLineIdx) return;
    ls.voiceTranscript = text;
    const res = scoreVoiceVerse(text, cur.tokens);
    ls.voiceScorePct = res.pct;
    ls.voiceMatchedIdx = [...res.matchedIndices];

    if (res.passed && !ls.voicePassedLines[targetLineIdx]) {
      ls.voicePassedLines[targetLineIdx] = res.pct;
      stopVoiceMic();
      ls.combo++;
      if (ls.combo > ls.maxCombo) ls.maxCombo = ls.combo;
      const pts = (res.pct >= 85 ? 180 : 120) + Math.min(120, ls.combo * 15);
      ls.score += pts;
      ls.solvedCount++;
      addXp(8);
      playCorrect();
      triggerScoreBurst(`🎙️ ${res.pct}% • +${pts} pts`);
      recordWords(cur.text, {
        source: 'music',
        action: 'correct',
        sample: cur.text,
        sampleFrom: `${ls.songArtist} — ${ls.songTitle}`
      });
      ls.waitingForBlank = false;
      ls.hubScoreSaved = false;
      renderTeleprompter(true);
      renderFirebaseHubPanel();
      // Auto-advance video cleanly after short celebration
      setTimeout(() => {
        if (ls.view === 'play' && ls.activeLineIdx === targetLineIdx && ytPlayer && typeof ytPlayer.playVideo === 'function') {
          seekLockUntil = Date.now() + 500;
          ytPlayer.playVideo();
        }
      }, 650);
      return;
    }

    if (isFinal) {
      stopVoiceMic();
      if (!res.passed) {
        playWrong();
        if (res.missingWords.length) queueCommunityMissWord(res.missingWords[0]);
      }
    }
    renderTeleprompter(true);
  };

  activeVoiceRec = createRecognizer({
    continuous: false,
    onInterim: (txt) => evaluateSpoken(txt, false),
    onFinal: (txt) => evaluateSpoken(txt, true),
    onError: (err) => {
      ls.voiceError = err === 'not-allowed'
        ? 'Permissão de microfone bloqueada. Ative o microfone no cadeado do navegador.'
        : 'Não consegui captar sua voz. Tente falar um pouco mais perto do microfone.';
      stopVoiceMic();
      renderTeleprompter(true);
    },
    onEnd: () => {
      ls.voiceListening = false;
      activeVoiceRec = null;
      renderTeleprompter(true);
    }
  });

  try {
    activeVoiceRec.start();
  } catch (_) {
    stopVoiceMic();
    ls.voiceError = 'Não foi possível iniciar o microfone agora.';
    renderTeleprompter(true);
  }
}

function skipVoiceVerse() {
  stopVoiceMic();
  const idx = ls.activeLineIdx;
  if (idx >= 0) ls.voicePassedLines[idx] = -1;
  ls.waitingForBlank = false;
  ls.combo = 0;
  playClick();
  if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
    seekLockUntil = Date.now() + 500;
    ytPlayer.playVideo();
  }
  renderTeleprompter(true);
}

function renderTeleprompter(force = false) {
  const dock = document.getElementById('ls-teleprompter');
  if (!dock) return;
  updateHud();

  const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
  const curPt = ls.activeLineIdx >= 0 ? (ls.translations[ls.activeLineIdx] || '') : '';
  const blankSig = cur && cur.blanks.length
    ? cur.blanks.map(b => `${b.status}:${b.typedCount}`).join(',')
    : 'none';
  const voiceSig = ls.mode === 'voice'
    ? `${ls.voiceListening}|${ls.voiceScorePct}|${ls.voiceTranscript}|${ls.voiceError}|${ls.voicePassedLines[ls.activeLineIdx] || 0}`
    : '';
  const key = `${ls.phase}|${ls.activeLineIdx}|${ls.waitingForBlank}|${ls.mode}|${ls.difficulty}|${blankSig}|${voiceSig}|${ls.xraySelectedKey}|${ls.showTranslation}|${ls.translating}|${curPt}`;
  if (!force && key === lastRenderedPhaseKey) {
    updateWordSweepVisual();
    return;
  }
  lastRenderedPhaseKey = key;
  updateBilingualActiveRow();

  // PHASE 1: READY
  if (ls.phase === 'ready') {
    const firstTime = ls.lines[0]?.time || 0;
    const readyEyebrow = ls.mode === 'voice'
      ? `MODO VOZ AO VIVO (SHADOWING) • ${ls.lines.length} VERSOS PARA FALAR NO MICROFONE`
      : `PRONTO PARA COMEÇAR • ${ls.totalBlanks} PALAVRAS PARA COMPLETAR`;
    const readyTitle = ls.mode === 'voice'
      ? 'Ouça o artista e repita cada verso no microfone com nota de pronúncia ao vivo'
      : 'Aperte Play — cada verso vai surgir ao vivo no ritmo da música';
    dock.innerHTML = `
      <div class="tp-center stack-sm">
        <div class="tp-eyebrow">${readyEyebrow}</div>
        <div class="tp-ready-title">${readyTitle}</div>
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
    const totalTarget = ls.mode === 'voice' ? Math.max(1, ls.lines.length) : ls.totalBlanks;
    const doneTarget = ls.mode === 'voice'
      ? Object.values(ls.voicePassedLines).filter(v => v >= 65).length
      : ls.solvedCount;
    const pct = totalTarget ? Math.min(100, Math.round((doneTarget / totalTarget) * 100)) : 100;
    const grade = pct >= 90 ? 'S' : pct >= 75 ? 'A' : pct >= 55 ? 'B' : 'C';
    const rankInfo = ls.hubData?.myRank ? `• #${ls.hubData.myRank} no Ranking Global` : '';
    dock.innerHTML = `
      <div class="tp-center stack-md">
        <div class="row" style="justify-content:center; gap:14px;">
          <div class="grade-stamp">${grade}</div>
          <div style="text-align:left;">
            <div class="tp-eyebrow">MÚSICA FINALIZADA ${ls.hubIsNewRecord ? '• 🏆 NOVO RECORDE NO RANKING!' : rankInfo}</div>
            <h3 style="font-size:20px;">${esc(ls.songTitle)} — ${esc(ls.songArtist)}</h3>
            <div class="muted">${doneTarget}/${totalTarget} ${ls.mode === 'voice' ? 'versos falados' : 'palavras acertadas'} (${pct}%) • Melhor Combo: x${ls.maxCombo} • ${ls.score.toLocaleString('pt-BR')} pts</div>
          </div>
        </div>
        <div class="row" style="justify-content:center; flex-wrap:wrap;">
          <button class="btn btn-primary" id="btn-tp-replay-song">${iconHtml('rotate-ccw', 15)} Jogar Novamente</button>
          <button class="btn btn-secondary" id="btn-tp-challenge">${iconHtml('share-2', 15)} Desafiar Amigo</button>
          <button class="btn btn-ghost" id="btn-tp-other-song">${iconHtml('music', 15)} Outra Música</button>
        </div>
      </div>
    `;
    document.getElementById('btn-tp-replay-song')?.addEventListener('click', () => { playClick(); restartCurrentSong(); });
    document.getElementById('btn-tp-challenge')?.addEventListener('click', copyChallengeInvite);
    document.getElementById('btn-tp-other-song')?.addEventListener('click', () => {
      playClick();
      stopLyricsStudio();
      ls.view = 'catalog';
      rerenderAllFn();
    });
    refreshIcons();
    return;
  }

  // PHASE 4: LIVE SINGING TELEPROMPTER (Choice / Write / Voice Shadowing / Karaoke + Native X-Ray!)
  if (!cur) return;
  const prevLine = ls.activeLineIdx > 0 ? ls.lines[ls.activeLineIdx - 1] : null;
  const isBlankMode = ls.mode === 'choice' || ls.mode === 'write';
  const activeBlank = isBlankMode ? getActiveBlank(cur) : null;
  const remainingInLine = isBlankMode ? cur.blanks.filter(b => b.status === 'pending').length : 0;
  const voiceMatchedSet = new Set(ls.voiceMatchedIdx || []);
  const hasVoiceAttempt = ls.mode === 'voice' && (ls.voiceTranscript.length > 0 || Boolean(ls.voicePassedLines[ls.activeLineIdx] > 0));

  const prevHtml = prevLine
    ? `<button type="button" class="tp-prev-line tp-prev-btn" id="btn-tp-prev-jump" title="Voltar para este verso">${esc(prevLine.text)}</button>`
    : `<div class="tp-prev-line">&nbsp;</div>`;

  const currentLineHtml = cur.tokens.map((tok, idx) => {
    const b = isBlankMode ? cur.blanks.find(x => x.wordIndex === idx) : null;
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
        return `<span class="lt-inline-slot lt-slot-ok karaoke-word-click" data-speak-word="${esc(normWord(tok))}" title="Clique para ouvir pronúncia">${esc(tok)}</span>`;
      }
      return `<span class="lt-inline-slot lt-slot-skip karaoke-word-click" data-speak-word="${esc(normWord(tok))}" title="Clique para ouvir pronúncia">${esc(tok)}</span>`;
    }

    let voiceCls = '';
    if (hasVoiceAttempt) {
      if (ls.voicePassedLines[ls.activeLineIdx] >= 65 || voiceMatchedSet.has(idx)) voiceCls = 'voice-word-hit';
      else if (!ls.voiceListening && ls.voiceTranscript) voiceCls = 'voice-word-miss';
    }
    return `<span class="karaoke-word karaoke-word-click ${voiceCls}" data-word-pos="${idx}" data-speak-word="${esc(tok)}" title="Clique para ouvir em Voz Neural">${esc(tok)}</span>`;
  }).join(' ');

  let interactionHtml = '';
  if (ls.mode === 'voice') {
    const passedPct = ls.voicePassedLines[ls.activeLineIdx] || 0;
    const displayPct = passedPct > 0 ? passedPct : ls.voiceScorePct;
    interactionHtml = `
      <div class="tp-voice-dock">
        <div class="row" style="gap:8px; justify-content:center; flex-wrap:wrap;">
          <button type="button" class="tp-voice-btn ${ls.voiceListening ? 'is-listening' : ''}" id="btn-ls-voice-rec">
            ${iconHtml(ls.voiceListening ? 'square' : 'mic', 16)}
            <span>${ls.voiceListening ? 'Ouvindo sua voz... (Clique p/ parar)' : passedPct >= 65 ? `Aprovado (${passedPct}%) — Falar de novo` : 'Falar / Cantar Verso (Espaço)'}</span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-ls-speak-cur" title="Ouvir em Voz Neural lenta (0.8x)">${iconHtml('volume-2', 14)} Ouvir 0.8x</button>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-ls-voice-skip">Pular Verso</button>
        </div>

        <div class="tp-voice-meter" title="Precisão de pronúncia deste verso">
          <div class="tp-voice-meter-fill ${displayPct >= 65 ? 'is-pass' : ''}" style="width:${displayPct}%;"></div>
        </div>

        <div class="row-between" style="width:100%; font-size:12px; gap:8px; flex-wrap:wrap;">
          <span class="muted">
            ${ls.voiceError
              ? `<span style="color:var(--danger);">${esc(ls.voiceError)}</span>`
              : ls.voiceTranscript
                ? `Você disse: <strong>"${esc(ls.voiceTranscript)}"</strong>`
                : (ls.waitingForBlank ? 'Pausado! Aperte Espaço ou o botão acima e repita o verso em voz alta (meta: 65%+).' : 'Ouça o artista e repita o verso no microfone • Tab repete o verso')}
          </span>
          <strong class="mono" style="color:${displayPct >= 65 ? 'var(--success)' : 'var(--primary)'};">${displayPct}%</strong>
        </div>
      </div>
    `;
  } else if (activeBlank) {
    const wrongSet = new Set(activeBlank.wrongGuesses || []);
    const multiBadge = remainingInLine > 1 ? ` • Faltam ${remainingInLine} palavras neste verso` : '';
    if (ls.mode === 'choice') {
      interactionHtml = `
        <div class="tp-choices-dock tp-choices-2x2">
          ${activeBlank.options.map((opt, idx) => {
            const isWrong = wrongSet.has(normWord(opt));
            return `
              <button class="tp-choice-btn ${isWrong ? 'duo-opt-wrong' : ''}" data-ls-choice="${esc(opt)}" ${isWrong ? 'disabled' : ''}>
                <span class="duo-opt-key">${idx + 1}</span>
                <span>${esc(opt)}</span>
              </button>
            `;
          }).join('')}
        </div>
        <div class="tp-subbar">
          <span class="muted" style="font-size:12px;">${ls.waitingForBlank ? 'Pausado esperando sua escolha — Tab repete o verso' : 'Escolha a palavra destacada (teclas 1–4)'}${multiBadge}</span>
          <div class="row" style="gap:6px;">
            <button class="btn btn-ghost btn-sm" id="btn-ls-speak-cur" title="Ouvir pronúncia deste verso">${iconHtml('volume-2', 13)} Ouvir</button>
            <button class="btn btn-ghost btn-sm" id="btn-ls-skip">Pular</button>
          </div>
        </div>
      `;
    } else if (ls.mode === 'write') {
      interactionHtml = `
        <div class="tp-write-dock">
          <input type="text" id="ls-live-keybox" class="tp-write-input" autocomplete="off" spellcheck="false" placeholder="Digite a palavra destacada..." />
          <button class="btn btn-secondary btn-sm" id="btn-ls-hint-letter">Dica (+1 letra)</button>
          <button class="btn btn-ghost btn-sm" id="btn-ls-skip">Pular</button>
        </div>
        <div class="tp-subbar">
          <span class="muted" style="font-size:12px;">${ls.waitingForBlank ? 'Pausado — digite ou aperte Tab para repetir' : 'Digite letra por letra em tempo real (Tab repete)'}${multiBadge}</span>
          <button class="btn btn-ghost btn-sm" id="btn-ls-speak-cur">${iconHtml('volume-2', 13)} Ouvir</button>
        </div>
      `;
    }
  } else {
    interactionHtml = `
      <div class="tp-subbar">
        <span class="muted" style="font-size:12px;">Verso ${ls.activeLineIdx + 1} de ${ls.lines.length} • Clique em qualquer palavra para ouvir em Voz Neural</span>
        <div class="row" style="gap:6px;">
          <button class="btn btn-ghost btn-sm" id="btn-ls-speak-cur">${iconHtml('volume-2', 13)} Ouvir</button>
          <button class="btn btn-ghost btn-sm" id="btn-ls-save-line">${iconHtml('plus', 13)} Salvar no Diário</button>
        </div>
      </div>
    `;
  }

  // RAIO-X DE INGLÊS REAL (Connected Speech, Contractions & Phrasal Verbs)
  const xrayItems = analyzeVerseNativeXray(cur.text);
  const selectedXray = xrayItems.find(x => `${ls.activeLineIdx}:${x.raw}` === ls.xraySelectedKey) || xrayItems[0] || null;
  const xrayHtml = xrayItems.length ? `
    <div class="xray-strip">
      <div class="row-between" style="gap:6px; flex-wrap:wrap;">
        <span class="mini-label" style="color:var(--primary);">${iconHtml('sparkles', 12)} Raio-X de Inglês Real neste verso</span>
        <span class="muted" style="font-size:11px;">Clique para ouvir ou salvar no SRS</span>
      </div>
      <div class="xray-pills">
        ${xrayItems.map(item => {
          const itemKey = `${ls.activeLineIdx}:${item.raw}`;
          const isAct = selectedXray && selectedXray.raw === item.raw;
          return `
            <button type="button" class="xray-pill ${isAct ? 'is-active' : ''}" data-xray-key="${esc(itemKey)}">
              <strong>${esc(item.raw)}</strong>
              <span class="muted">→</span>
              <span>${esc(item.expanded)}</span>
            </button>
          `;
        }).join('')}
      </div>
      ${selectedXray ? `
        <div class="xray-detail">
          <div style="flex:1; min-width:180px;">
            <span class="pill" style="font-size:10px; padding:1px 6px; margin-right:6px;">${esc(selectedXray.label)}</span>
            <strong>${esc(selectedXray.raw)}</strong> = <strong>${esc(selectedXray.expanded)}</strong> — <span class="muted">${esc(selectedXray.tip)}</span>
          </div>
          <div class="row" style="gap:5px; flex-shrink:0;">
            <button type="button" class="btn btn-ghost btn-sm" id="btn-xray-speak">${iconHtml('volume-2', 12)} Ouvir</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-xray-srs">${iconHtml('plus', 12)} + SRS</button>
          </div>
        </div>
      ` : ''}
    </div>
  ` : '';

  const translationHtml = ls.showTranslation
    ? `
      <div class="tp-translation-line">
        <span class="tp-translation-tag">PT-BR</span>
        <span>${curPt ? esc(curPt) : (ls.translating ? 'Traduzindo verso para português...' : 'Tradução automática em carregamento...')}</span>
      </div>
    `
    : '';

  dock.innerHTML = `
    <div class="tp-sweep-track">
      <div id="ls-line-sweep-fill" class="tp-sweep-fill ${ls.waitingForBlank ? 'tp-sweep-paused' : ''}" style="width:${Math.round(ls.lineProgress * 100)}%;"></div>
    </div>
    <div class="tp-live-body">
      ${prevHtml}
      <div class="tp-current-line">${currentLineHtml}</div>
      ${translationHtml}
      ${interactionHtml}
      ${xrayHtml}
    </div>
  `;

  dock.querySelectorAll('[data-ls-choice]').forEach(btn => {
    btn.addEventListener('click', () => handleChoiceGuess(btn.dataset.lsChoice, btn));
  });

  dock.querySelectorAll('[data-speak-word]').forEach(el => {
    el.addEventListener('click', () => {
      const w = el.dataset.speakWord;
      if (w) speak(w, 0.85);
    });
  });

  dock.querySelectorAll('[data-xray-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      ls.xraySelectedKey = btn.dataset.xrayKey;
      renderTeleprompter(true);
    });
  });

  document.getElementById('btn-xray-speak')?.addEventListener('click', () => {
    if (selectedXray) speak(selectedXray.raw, 0.8);
  });

  document.getElementById('btn-xray-srs')?.addEventListener('click', () => {
    if (!selectedXray) return;
    addCustomCard({
      pt: `${selectedXray.expanded} (${selectedXray.label})`,
      chunk: selectedXray.raw,
      en: cur.text,
      note: `${selectedXray.tip} • Minerado em "${ls.songTitle}".`
    });
    playCorrect();
    toastFn(`"${selectedXray.raw}" salvo nos seus Flashcards SRS (+15 XP)!`);
  });

  document.getElementById('btn-ls-voice-rec')?.addEventListener('click', toggleVoiceShadowingForCurrentLine);
  document.getElementById('btn-ls-voice-skip')?.addEventListener('click', skipVoiceVerse);

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

  document.getElementById('btn-tp-prev-jump')?.addEventListener('click', goPrevVerse);

  document.getElementById('btn-ls-speak-cur')?.addEventListener('click', () => {
    if (cur) speak(cur.text, 0.82);
  });

  document.getElementById('btn-ls-hint-letter')?.addEventListener('click', () => {
    const ab = getActiveBlank(cur);
    if (!ab) return;
    playClick();
    ab.typedCount = Math.min(ab.answer.length, ab.typedCount + 1);
    if (ab.typedCount >= ab.answer.length) completeActiveBlank(false);
    else patchActiveWriteSlot(ab);
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

// Updates ONLY the active typing slot DOM without destroying/refocusing the input (zero flicker!)
function patchActiveWriteSlot(ab) {
  const slot = document.getElementById('lt-inline-slot');
  if (!slot || !ab) {
    renderTeleprompter(true);
    return;
  }
  const ans = ab.answer;
  const typed = ans.slice(0, ab.typedCount);
  const rest = ans.slice(ab.typedCount);
  const dots = rest.split('').map(() => '<span class="lt-dot">•</span>').join('');
  slot.innerHTML = `<span class="lt-typed">${esc(typed)}</span>${dots}`;
  // Keep phase signature in sync so 40ms poll doesn't re-render unnecessarily
  const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
  const curPt = ls.activeLineIdx >= 0 ? (ls.translations[ls.activeLineIdx] || '') : '';
  const blankSig = cur && cur.blanks.length ? cur.blanks.map(b => `${b.status}:${b.typedCount}`).join(',') : 'none';
  const voiceSig = ls.mode === 'voice'
    ? `${ls.voiceListening}|${ls.voiceScorePct}|${ls.voiceTranscript}|${ls.voiceError}|${ls.voicePassedLines[ls.activeLineIdx] || 0}`
    : '';
  lastRenderedPhaseKey = `${ls.phase}|${ls.activeLineIdx}|${ls.waitingForBlank}|${ls.mode}|${ls.difficulty}|${blankSig}|${voiceSig}|${ls.xraySelectedKey}|${ls.showTranslation}|${ls.translating}|${curPt}`;
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
    else patchActiveWriteSlot(ab);
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
  const norm = normWord(rawGuess);
  if (norm === ab.answer) {
    completeActiveBlank(true);
  } else {
    ls.combo = 0;
    playWrong();
    if (!ab.wrongGuesses) ab.wrongGuesses = [];
    if (!ab.wrongGuesses.includes(norm)) ab.wrongGuesses.push(norm);
    recordWords(ab.answer, {
      source: 'music',
      action: 'wrong',
      sample: cur.text,
      sampleFrom: `${ls.songArtist} — ${ls.songTitle}`
    });
    queueCommunityMissWord(ab.answer);
    updateHud();
    if (btnEl) {
      btnEl.classList.add('duo-opt-wrong', 'lt-shake');
      btnEl.disabled = true;
    } else {
      renderTeleprompter(true);
    }
  }
}

function completeActiveBlank(withPoints) {
  const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
  const ab = getActiveBlank(cur);
  if (!ab) return;
  ab.status = 'solved';
  ls.solvedCount++;

  recordWords(ab.answer, {
    source: 'music',
    action: withPoints ? 'correct' : 'seen',
    sample: cur.text,
    sampleFrom: `${ls.songArtist} — ${ls.songTitle}`
  });

  if (withPoints) {
    ls.combo++;
    if (ls.combo > ls.maxCombo) ls.maxCombo = ls.combo;
    const pts = 100 + Math.min(140, ls.combo * 15);
    ls.score += pts;
    ls.hubScoreSaved = false;
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
    markSongCompleted(ls.songKey);
    submitScoreToFirebaseHub(false);
    toastFn('Incrível! Você acertou todas as lacunas da música! +35 XP');
  }
  renderTeleprompter(true);
  renderFirebaseHubPanel();
}

function skipActiveBlank() {
  const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
  const ab = getActiveBlank(cur);
  if (!ab) return;
  ab.status = 'skipped';
  ls.skippedCount++;
  ls.combo = 0;
  playClick();
  recordWords(ab.answer, {
    source: 'music',
    action: 'wrong',
    sample: cur.text,
    sampleFrom: `${ls.songArtist} — ${ls.songTitle}`
  });
  queueCommunityMissWord(ab.answer);

  const stillHasBlank = Boolean(getActiveBlank(cur));
  if (!stillHasBlank) {
    ls.waitingForBlank = false;
    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
      ytPlayer.playVideo();
    }
  }
  renderTeleprompter(true);
}

function seekSafe(targetYtSec, autoPlay = true) {
  const clamped = Math.max(0, Number(targetYtSec) || 0);
  // Protect against YouTube iframe seek latency so sync loop never immediately re-pauses on stale timestamp!
  seekLockUntil = Date.now() + 750;
  ls.waitingForBlank = false;
  if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
    ytPlayer.seekTo(clamped, true);
    if (autoPlay && typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
  }
}

function skipIntroToFirstVerse() {
  if (!ls.lines.length) return;
  playClick();
  ls.phase = 'singing';
  ls.activeLineIdx = 0;
  seekSafe(ls.lines[0].time - 0.8 - ls.syncOffset, true);
  renderTeleprompter(true);
}

function snapSyncToLine(lineIdx) {
  if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
  const target = ls.lines[lineIdx];
  if (!target) return;
  const ytNow = ytPlayer.getCurrentTime();
  ls.syncOffset = Number((target.time - ytNow).toFixed(2));
  saveOffset(ls.songKey, ls.syncOffset);
  shareCommunitySyncOffset();
  const el = document.getElementById('ls-sync-val');
  if (el) el.textContent = `${ls.syncOffset >= 0 ? '+' : ''}${ls.syncOffset.toFixed(1)}s`;
  playCorrect();
  toastFn(`Sincronia alinhada (${ls.syncOffset >= 0 ? '+' : ''}${ls.syncOffset.toFixed(1)}s)!`);
  renderTeleprompter(true);
}

function repeatActiveVerse() {
  if (!ls.lines.length) return;
  const idx = Math.max(0, ls.activeLineIdx);
  const line = ls.lines[idx];
  if (!line) return;
  playClick();
  ls.phase = 'singing';
  ls.activeLineIdx = idx;
  ls.lineProgress = 0;
  seekSafe(line.time - 0.65 - ls.syncOffset, true);
  renderTeleprompter(true);
}

function goPrevVerse() {
  if (!ls.lines.length) return;
  const targetIdx = Math.max(0, ls.activeLineIdx <= 0 ? 0 : ls.activeLineIdx - 1);
  const line = ls.lines[targetIdx];
  if (!line) return;
  playClick();
  ls.phase = 'singing';
  ls.activeLineIdx = targetIdx;
  ls.lineProgress = 0;
  seekSafe(line.time - 0.65 - ls.syncOffset, true);
  renderTeleprompter(true);
}

function goNextVerse() {
  if (!ls.lines.length) return;
  const targetIdx = Math.min(ls.lines.length - 1, ls.activeLineIdx + 1);
  const line = ls.lines[targetIdx];
  if (!line) return;
  playClick();
  ls.phase = 'singing';
  ls.activeLineIdx = targetIdx;
  ls.lineProgress = 0;
  seekSafe(line.time - 0.55 - ls.syncOffset, true);
  renderTeleprompter(true);
}

function rewindSeconds(deltaSec = 5) {
  if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
  playClick();
  const curYt = ytPlayer.getCurrentTime();
  const nextYt = Math.max(0, curYt - deltaSec);
  const nextLyricTime = nextYt + ls.syncOffset;
  // Find matching verse for the rewound timestamp
  let idx = -1;
  for (let i = 0; i < ls.lines.length; i++) {
    if (nextLyricTime >= ls.lines[i].time - LEAD_IN_SEC) idx = i;
    else break;
  }
  ls.activeLineIdx = idx;
  ls.phase = idx < 0 ? 'intro' : 'singing';
  seekSafe(nextYt, true);
  renderTeleprompter(true);
}

function togglePlayPause() {
  if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;
  playClick();
  const st = ytPlayer.getPlayerState();
  if (st === 1) {
    ytPlayer.pauseVideo();
    ls.isPlaying = false;
    updateDeckClock(ytPlayer.getCurrentTime() || 0, ls.duration, false);
  } else {
    // Smart resume: if auto-paused on an unsolved blank, replay that verse instead of re-freezing 40ms later!
    if (ls.waitingForBlank && ls.activeLineIdx >= 0 && ls.lines[ls.activeLineIdx]) {
      repeatActiveVerse();
      return;
    }
    seekLockUntil = Date.now() + 450;
    ytPlayer.playVideo();
    ls.isPlaying = true;
    updateDeckClock(ytPlayer.getCurrentTime() || 0, ls.duration, true);
  }
}

function restartCurrentSong() {
  stopVoiceMic();
  ls.lines = buildGameLines(ls.rawLines, ls.difficulty);
  ls.totalBlanks = countTotalBlanks(ls.lines);
  ls.activeLineIdx = -1;
  ls.phase = 'intro';
  ls.waitingForBlank = false;
  ls.score = 0;
  ls.combo = 0;
  ls.maxCombo = 0;
  ls.solvedCount = 0;
  ls.skippedCount = 0;
  ls.voiceTranscript = '';
  ls.voiceScorePct = 0;
  ls.voiceMatchedIdx = [];
  ls.voiceError = '';
  ls.voicePassedLines = {};
  ls.hubScoreSaved = false;
  ls.hubIsNewRecord = false;
  seekSafe(0, true);
  renderTeleprompter(true);
  renderFirebaseHubPanel();
}

// Fast 40ms real-time sync loop with seekLockUntil protection (eliminates replay/rewind freeze bugs!)
function startSyncLoop() {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function' || typeof ytPlayer.getPlayerState !== 'function') return;
    const ytState = ytPlayer.getPlayerState();
    const ytNow = ytPlayer.getCurrentTime() || 0;
    const ytDur = typeof ytPlayer.getDuration === 'function' ? (ytPlayer.getDuration() || 0) : 0;
    if (ytDur > 0) ls.duration = ytDur;
    ls.isPlaying = ytState === 1;
    updateDeckClock(ytNow, ls.duration, ls.isPlaying);

    if (ytState === 0) {
      if (ls.phase !== 'ended') {
        stopVoiceMic();
        ls.phase = 'ended';
        ls.waitingForBlank = false;
        playVictory();
        if (ls.score > 0 && !ls.hubScoreSaved) submitScoreToFirebaseHub(false);
        renderTeleprompter(true);
      }
      return;
    }

    if (ytState !== 1) return;

    // Wait briefly after explicit seeks so stale YouTube getCurrentTime never causes false auto-pauses
    if (Date.now() < seekLockUntil) return;

    const now = ytNow + ls.syncOffset;
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

    // 2. Auto-pause if current verse still has unsolved blanks or unpassed Voice Shadowing verse
    const cur = ls.activeLineIdx >= 0 ? ls.lines[ls.activeLineIdx] : null;
    const isBlankMode = ls.mode === 'choice' || ls.mode === 'write';
    const curNeedsVoice = ls.mode === 'voice' && cur && !ls.voicePassedLines[cur.idx];
    const curHasPending = ls.autoPause && (
      (isBlankMode && Boolean(getActiveBlank(cur))) ||
      Boolean(curNeedsVoice)
    );
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

    // Do not advance to next verse while current verse still has pending blanks/voice (when autoPause is ON)
    if (curHasPending && foundIdx > ls.activeLineIdx) {
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
      (!getActiveBlank(activeLine) || !isBlankMode || !ls.autoPause)
    ) {
      ls.phase = 'break';
      ls.countdownSec = nextLine.time - now;
      renderTeleprompter(false);
      return;
    }

    // 5. Active live verse
    if (ls.activeLineIdx !== foundIdx) {
      stopVoiceMic();
      ls.voiceTranscript = '';
      ls.voiceScorePct = 0;
      ls.voiceMatchedIdx = [];
      ls.voiceError = '';
    }
    ls.phase = 'singing';
    ls.activeLineIdx = foundIdx;
    ls.waitingForBlank = false;
    if (activeLine && !activeLine._lexLogged) {
      activeLine._lexLogged = true;
      recordWords(activeLine.text, {
        source: 'music',
        action: 'seen',
        sample: activeLine.text,
        sampleFrom: `${ls.songArtist} — ${ls.songTitle}`
      });
    }
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

async function launchSong(track, preferredYtId = '') {
  ls.loadingMsg = `Carregando "${track.trackName}" e sincronizando vídeo oficial...`;
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

  if (preferredYtId) {
    videoIds = [preferredYtId, ...videoIds.filter(id => id !== preferredYtId)];
  }

  ls.loadingMsg = '';
  ls.songKey = `${track.artistName}::${track.trackName}`.toLowerCase();
  ls.songTitle = track.trackName;
  ls.songArtist = track.artistName;
  recordSongPlay({
    query: `${track.artistName} ${track.trackName}`,
    title: track.trackName,
    artist: track.artistName
  });
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
  stopVoiceMic();
  ls.voiceTranscript = '';
  ls.voiceScorePct = 0;
  ls.voiceMatchedIdx = [];
  ls.voiceError = '';
  ls.voicePassedLines = {};
  ls.xraySelectedKey = '';
  ls.syncOffset = loadSavedOffset(ls.songKey);
  ls.showTools = false;
  ls.view = 'play';
  lastRenderedPhaseKey = '';

  rerenderAllFn();
  renderTeleprompter(true);
  fetchSongTranslations(ls.songKey, ls.lines);
  initFirebaseHubForSong(ls.songKey, ls.songTitle, ls.songArtist);
  if (videoIds[0]) mountYoutubePlayer(videoIds[0]);
}

async function searchSongs(query, autoLaunchFirst = false, preferredYtId = '') {
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
    if (autoLaunchFirst) await launchSong(json.items[0], preferredYtId);
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

async function runArtistImport(artistsStr, limitVal) {
  const clean = String(artistsStr || '').trim();
  if (!clean) {
    toastFn('Digite pelo menos um artista ou banda (ex: Metallica, Paramore).');
    return;
  }
  ls.importBusy = true;
  ls.importArtistInput = clean;
  ls.importArtistLimit = Number(limitVal) || 15;
  ls.loadingMsg = `Importando músicas de "${clean}"...`;
  rerenderAllFn();

  try {
    const res = await fetch(`/api/lyrics?artist=${encodeURIComponent(clean)}&limit=${ls.importArtistLimit}`);
    const json = await res.json();
    ls.importBusy = false;
    ls.loadingMsg = '';
    if (!json.ok || !Array.isArray(json.songs) || !json.songs.length) {
      toastFn(json.error || 'Nenhuma música encontrada para esse artista.');
      rerenderAllFn();
      return;
    }
    const { added, skipped } = addCustomSongs(json.songs, CURATED_SONGS);
    ls.genreFilter = 'custom';
    ls.artistFilter = '';
    ls.showImporter = false;
    playVictory();
    toastFn(`+${added} músicas importadas para sua biblioteca${skipped ? ` (${skipped} já existiam)` : ''}!`);
    rerenderAllFn();
  } catch (err) {
    ls.importBusy = false;
    ls.loadingMsg = '';
    toastFn('Erro ao importar por artista. Tente novamente.');
    rerenderAllFn();
  }
}

async function runPlaylistImport(urlStr) {
  const clean = String(urlStr || '').trim();
  if (!clean) {
    toastFn('Cole o link de uma playlist pública do Spotify, Deezer ou YouTube.');
    return;
  }
  ls.importBusy = true;
  ls.importPlaylistUrl = clean;
  ls.loadingMsg = 'Extraindo músicas da playlist...';
  rerenderAllFn();

  try {
    const res = await fetch(`/api/lyrics?importUrl=${encodeURIComponent(clean)}`);
    const json = await res.json();
    ls.importBusy = false;
    ls.loadingMsg = '';
    if (!json.ok || !Array.isArray(json.songs) || !json.songs.length) {
      toastFn(json.error || 'Não foi possível extrair faixas deste link.');
      rerenderAllFn();
      return;
    }
    const { added, skipped } = addCustomSongs(json.songs, CURATED_SONGS);
    ls.genreFilter = 'custom';
    ls.artistFilter = '';
    ls.showImporter = false;
    ls.importPlaylistUrl = '';
    playVictory();
    toastFn(`Playlist "${json.playlistName || ''}" importada: +${added} músicas${skipped ? ` (${skipped} duplicadas)` : ''}!`);
    rerenderAllFn();
  } catch (err) {
    ls.importBusy = false;
    ls.loadingMsg = '';
    toastFn('Erro ao ler playlist. Verifique se o link é público.');
    rerenderAllFn();
  }
}

function runTextListImport(rawText) {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map(l => l.replace(/^\s*(?:\d+[\.\)\-]\s*|[-*•]\s*)/, '').trim())
    .filter(l => l.length >= 2);
  if (!lines.length) {
    toastFn('Cole pelo menos uma linha no formato "Artista - Música".');
    return;
  }
  const parsed = lines.map(line => {
    const parts = line.split(/\s+[-–—]\s+/);
    if (parts.length >= 2) {
      const artist = parts[0].trim();
      const title = parts.slice(1).join(' - ').trim();
      return { query: `${artist} ${title}`, artist, title, genre: 'pop', level: 'Médio • B1' };
    }
    return { query: line, artist: 'Lista Importada', title: line, genre: 'pop', level: 'Médio • B1' };
  });
  const { added, skipped } = addCustomSongs(parsed, CURATED_SONGS);
  ls.importTextList = '';
  ls.genreFilter = 'custom';
  ls.artistFilter = '';
  ls.showImporter = false;
  playVictory();
  toastFn(`+${added} músicas adicionadas da lista${skipped ? ` (${skipped} já existiam)` : ''}!`);
  rerenderAllFn();
}

export function bindLyricsEvents(root, rerender, showToast) {
  toastFn = showToast;
  rerenderAllFn = rerender;

  if (ls.view === 'catalog') {
    fetchGlobalTrendingOnce();
    document.getElementById('btn-ls-toggle-importer')?.addEventListener('click', () => {
      playClick();
      ls.showImporter = !ls.showImporter;
      rerender();
    });
    document.getElementById('btn-ls-close-importer')?.addEventListener('click', () => {
      playClick();
      ls.showImporter = false;
      rerender();
    });
    root.querySelectorAll('[data-ls-imp-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        ls.importTab = btn.dataset.lsImpTab;
        rerender();
      });
    });
    document.getElementById('ls-import-artist-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      playClick();
      const artists = document.getElementById('ls-imp-artist-input')?.value || '';
      const limitVal = document.getElementById('ls-imp-artist-limit')?.value || 15;
      runArtistImport(artists, limitVal);
    });
    root.querySelectorAll('[data-ls-imp-pack]').forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        const pack = QUICK_IMPORT_PACKS[Number(btn.dataset.lsImpPack)];
        if (pack) runArtistImport(pack.artists, pack.limit);
      });
    });
    document.getElementById('ls-import-playlist-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      playClick();
      const urlVal = document.getElementById('ls-imp-playlist-url')?.value || '';
      runPlaylistImport(urlVal);
    });
    document.getElementById('ls-import-text-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      playClick();
      const txt = document.getElementById('ls-imp-text-area')?.value || '';
      runTextListImport(txt);
    });

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
    document.getElementById('btn-ls-clear-custom')?.addEventListener('click', () => {
      playClick();
      if (!confirm('Remover todas as músicas que você importou? (As 124 do catálogo fixo continuam.)')) return;
      clearCustomSongs();
      ls.genreFilter = 'all';
      showToast('Músicas importadas removidas.');
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
    const bindCatalogCardClicks = (container) => {
      container.querySelectorAll('[data-ls-del-song]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          playClick();
          removeCustomSong(btn.dataset.lsDelSong);
          showToast('Música removida da sua biblioteca.');
          rerender();
        });
      });
      container.querySelectorAll('[data-ls-curated]').forEach(btn => {
        btn.addEventListener('click', () => {
          playClick();
          const allSongs = getAllCatalogSongs();
          const song = allSongs[Number(btn.dataset.lsCurated)];
          if (song) searchSongs(song.query, true, song.ytId || '');
        });
      });
      container.querySelector('#btn-ls-fallback-global')?.addEventListener('click', () => {
        playClick();
        searchSongs(ls.catalogFilter, false);
      });
    };

    const refreshCatalogGridInPlace = () => {
      const allSongs = getAllCatalogSongs();
      const filtered = getFilteredCatalogSongs(allSongs);
      const grid = document.getElementById('ls-catalog-grid');
      const countEl = document.getElementById('ls-catalog-count');
      const clearBtn = document.getElementById('btn-ls-clear-cat-search');
      if (countEl) countEl.textContent = filtered.length;
      if (clearBtn) clearBtn.classList.toggle('hidden', !ls.catalogFilter);
      if (grid) {
        grid.innerHTML = renderCatalogCardsHtml(filtered, allSongs);
        bindCatalogCardClicks(grid);
        refreshIcons();
      }
    };

    document.getElementById('ls-catalog-search')?.addEventListener('input', (e) => {
      ls.catalogFilter = e.target.value;
      refreshCatalogGridInPlace();
    });

    document.getElementById('btn-ls-clear-cat-search')?.addEventListener('click', () => {
      playClick();
      ls.catalogFilter = '';
      const inp = document.getElementById('ls-catalog-search');
      if (inp) { inp.value = ''; inp.focus(); }
      refreshCatalogGridInPlace();
    });

    document.getElementById('ls-catalog-sort')?.addEventListener('change', (e) => {
      playClick();
      ls.catalogSort = e.target.value;
      refreshCatalogGridInPlace();
    });

    bindCatalogCardClicks(root);
    return;
  }

  // PLAY VIEW BINDINGS
  lastPlayBtnState = null;
  renderTeleprompter(true);
  renderBilingualPanel();
  renderFirebaseHubPanel();

  document.getElementById('btn-ls-back')?.addEventListener('click', () => {
    playClick();
    stopLyricsStudio();
    ls.view = 'catalog';
    rerender();
  });

  document.getElementById('btn-ls-restart-top')?.addEventListener('click', () => {
    playClick();
    restartCurrentSong();
    toastFn('Música reiniciada!');
  });

  document.getElementById('btn-ls-prev-verse')?.addEventListener('click', goPrevVerse);
  document.getElementById('btn-ls-rew5')?.addEventListener('click', () => rewindSeconds(5));
  document.getElementById('btn-ls-play-pause')?.addEventListener('click', togglePlayPause);
  document.getElementById('btn-ls-replay')?.addEventListener('click', repeatActiveVerse);
  document.getElementById('btn-ls-next-verse')?.addEventListener('click', goNextVerse);

  document.getElementById('ls-scrub-track')?.addEventListener('click', (e) => {
    if (!ls.duration || ls.duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetYt = ratio * ls.duration;
    const targetLyric = targetYt + ls.syncOffset;
    let idx = -1;
    for (let i = 0; i < ls.lines.length; i++) {
      if (targetLyric >= ls.lines[i].time - LEAD_IN_SEC) idx = i;
      else break;
    }
    ls.activeLineIdx = idx;
    ls.phase = idx < 0 ? 'intro' : 'singing';
    playClick();
    seekSafe(targetYt, true);
    renderTeleprompter(true);
  });

  const btnAutoPause = document.getElementById('btn-ls-autopause');
  if (btnAutoPause) {
    btnAutoPause.addEventListener('click', () => {
      playClick();
      ls.autoPause = !ls.autoPause;
      btnAutoPause.classList.toggle('btn-tune-on', ls.autoPause);
      btnAutoPause.innerHTML = `${iconHtml('pause-circle', 13)} Auto-Pausa: ${ls.autoPause ? 'ON' : 'OFF'}`;
      if (!ls.autoPause && ls.waitingForBlank) {
        ls.waitingForBlank = false;
        if (ytPlayer && typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
      }
      refreshIcons();
      toastFn(ls.autoPause ? 'Auto-Pausa ativada nas lacunas.' : 'Modo Contínuo ativado (sem pausas).');
    });
  }

  const btnToggleTrans = document.getElementById('btn-ls-toggle-trans');
  if (btnToggleTrans) {
    btnToggleTrans.addEventListener('click', () => {
      playClick();
      ls.showTranslation = !ls.showTranslation;
      btnToggleTrans.classList.toggle('btn-tune-on', ls.showTranslation);
      btnToggleTrans.innerHTML = `${iconHtml('languages', 13)} Tradução PT: ${ls.showTranslation ? 'ON' : 'OFF'}`;
      renderTeleprompter(true);
      refreshIcons();
    });
  }

  const btnToggleBilingual = document.getElementById('btn-ls-toggle-bilingual');
  if (btnToggleBilingual) {
    btnToggleBilingual.addEventListener('click', () => {
      playClick();
      ls.showFullBilingual = !ls.showFullBilingual;
      btnToggleBilingual.classList.toggle('btn-tune-on', ls.showFullBilingual);
      renderBilingualPanel();
    });
  }

  document.getElementById('btn-ls-tools-toggle')?.addEventListener('click', () => {
    playClick();
    ls.showTools = !ls.showTools;
    document.getElementById('ls-tools-drawer')?.classList.toggle('hidden', !ls.showTools);
    const btn = document.getElementById('btn-ls-tools-toggle');
    if (btn) btn.className = `btn ${ls.showTools ? 'btn-primary' : 'btn-secondary'} btn-sm`;
  });

  const btnSpeed = document.getElementById('btn-ls-speed');
  if (btnSpeed) {
    btnSpeed.addEventListener('click', () => {
      playClick();
      ls.playbackRate = ls.playbackRate === 1.0 ? 0.75 : 1.0;
      if (ytPlayer && typeof ytPlayer.setPlaybackRate === 'function') ytPlayer.setPlaybackRate(ls.playbackRate);
      btnSpeed.innerHTML = `${iconHtml('gauge', 13)} ${ls.playbackRate}x`;
      refreshIcons();
    });
  }

  const updateSyncText = () => {
    saveOffset(ls.songKey, ls.syncOffset);
    shareCommunitySyncOffset();
    const el = document.getElementById('ls-sync-val');
    if (el) el.textContent = `${ls.syncOffset >= 0 ? '+' : ''}${ls.syncOffset.toFixed(1)}s`;
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
      stopVoiceMic();
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
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    goPrevVerse();
    return true;
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    goNextVerse();
    return true;
  }
  if (ls.phase !== 'singing') return false;
  if (ls.mode === 'voice' && e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    toggleVoiceShadowingForCurrentLine();
    return true;
  }
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
