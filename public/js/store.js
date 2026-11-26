import { BUILTIN_VOCAB } from './data-vocab.js';

const LOCAL_KEY = 'fluencyforge_progress_v1';
const HAS_LOCAL_API = ['localhost', '127.0.0.1'].includes(window.location.hostname);

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultState() {
  return {
    theme: 'light',
    editorialV2: false,
    preferredVoice: '',
    streak: 1,
    lastActiveDate: todayStr(),
    xpDate: todayStr(),
    xpToday: 0,
    dailyGoalXp: 150,
    totalReviews: 0,
    totalDrills: 0,
    totalReadings: 0,
    totalRecordings: 0,
    checklistDate: todayStr(),
    dailyChecklist: {
      turn1_vocab: false,
      turn2_drills: false,
      turn3_reading: false,
      turn4_speaking: false
    },
    srs: {},
    customCards: [],
    completedDrills: [],
    completedReadings: [],
    completedLessons: [],
    pathUnlockAll: false,
    soundEffects: true,
    lexicon: {},
    customSongs: []
  };
}

let state = defaultState();
let saveTimer = null;
const listeners = new Set();

function normalizeDates() {
  const today = todayStr();
  if (state.xpDate !== today) {
    state.xpDate = today;
    state.xpToday = 0;
  }
  if (state.checklistDate !== today) {
    state.checklistDate = today;
    state.dailyChecklist = {
      turn1_vocab: false,
      turn2_drills: false,
      turn3_reading: false,
      turn4_speaking: false
    };
  }
  if (state.lastActiveDate !== today) {
    const prev = new Date(state.lastActiveDate + 'T00:00:00');
    const now = new Date(today + 'T00:00:00');
    const diffDays = Math.round((now - prev) / 86400000);
    if (diffDays === 1) state.streak = (state.streak || 0) + 1;
    else if (diffDays > 1) state.streak = 1;
    state.lastActiveDate = today;
  }
}

export async function initStore() {
  // 1. Load local fallback first
  try {
    const localRaw = localStorage.getItem(LOCAL_KEY);
    if (localRaw) {
      state = { ...defaultState(), ...JSON.parse(localRaw) };
    }
  } catch (_) {}

  // 2. Load authoritative file from D:\FluencyForge\data\progress.json (local server only)
  if (HAS_LOCAL_API) {
    try {
      const res = await fetch('/api/progress', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          state = { ...defaultState(), ...json.data };
        }
      }
    } catch (_) {}
  }

  if (!state.editorialV2) {
    state.theme = 'light';
    state.editorialV2 = true;
  }
  normalizeDates();
  persistNow();
  notify();
  return state;
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn(state));
}

function persistNow() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch (_) {}

  if (!HAS_LOCAL_API) return;

  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
    } catch (_) {}
  }, 250);
}

export function updateState(mutator) {
  normalizeDates();
  mutator(state);
  persistNow();
  notify();
}

export function addXp(amount) {
  updateState(s => {
    s.xpToday = (s.xpToday || 0) + amount;
  });
}

export function getAllVocabCards() {
  const custom = (state.customCards || []).map(c => ({ ...c, deck: 'custom' }));
  return [...BUILTIN_VOCAB, ...custom];
}

export function getDueCards(deckId = 'all') {
  const now = Date.now();
  const all = getAllVocabCards().filter(c => deckId === 'all' || c.deck === deckId);
  const due = [];
  const fresh = [];
  const upcoming = [];

  for (const card of all) {
    const rec = state.srs[card.id];
    if (!rec) {
      fresh.push(card);
    } else if (rec.due <= now) {
      due.push({ ...card, _due: rec.due });
    } else {
      upcoming.push({ ...card, _due: rec.due });
    }
  }

  due.sort((a, b) => a._due - b._due);
  upcoming.sort((a, b) => a._due - b._due);
  return { due, fresh, upcoming, queue: [...due, ...fresh], all };
}

export function rateCard(cardId, rating) {
  // rating: 'again' | 'hard' | 'good' | 'easy'
  const now = Date.now();
  const HOUR = 3600 * 1000;
  const DAY = 24 * HOUR;

  updateState(s => {
    const cur = s.srs[cardId] || { reps: 0, intervalDays: 0, ease: 2.5 };
    let { reps, intervalDays, ease } = cur;
    let nextDue = now;

    if (rating === 'again') {
      reps = 0;
      intervalDays = 0;
      ease = Math.max(1.3, ease - 0.2);
      nextDue = now + 2 * 60 * 1000; // 2 min
    } else if (rating === 'hard') {
      reps = Math.max(1, reps);
      intervalDays = Math.max(0.5, intervalDays * 1.2 || 0.5);
      ease = Math.max(1.3, ease - 0.15);
      nextDue = now + intervalDays * DAY;
    } else if (rating === 'good') {
      reps += 1;
      if (reps === 1) intervalDays = 1;
      else if (reps === 2) intervalDays = 3;
      else intervalDays = Math.round(intervalDays * ease);
      nextDue = now + intervalDays * DAY;
    } else if (rating === 'easy') {
      reps += 1;
      ease = Math.min(3.0, ease + 0.15);
      intervalDays = reps === 1 ? 4 : Math.max(4, Math.round(intervalDays * ease * 1.3));
      nextDue = now + intervalDays * DAY;
    }

    s.srs[cardId] = {
      reps,
      intervalDays,
      ease,
      due: nextDue,
      lastRating: rating,
      updatedAt: now
    };
    s.totalReviews = (s.totalReviews || 0) + 1;
    s.xpToday = (s.xpToday || 0) + (rating === 'again' ? 3 : 10);
  });
}

export function addCustomCard({ pt, chunk, en, phon, note }) {
  const id = 'custom-' + Date.now();
  const cleanChunk = chunk.trim();
  const hint = cleanChunk
    .split(/\s+/)
    .map(w => (w.length <= 2 ? w[0] + '_' : w[0] + '_'.repeat(Math.min(6, w.length - 1))))
    .join(' ');

  const card = {
    id,
    deck: 'custom',
    pt: pt.trim(),
    chunk: cleanChunk,
    en: (en || cleanChunk).trim(),
    phon: (phon || '').trim() || 'Clique em ouvir para escutar a pronúncia nativa',
    hint,
    note: (note || 'Adicionada do seu Diário de Lacunas.').trim()
  };

  updateState(s => {
    s.customCards = [card, ...(s.customCards || [])];
    s.xpToday = (s.xpToday || 0) + 15;
  });
  return card;
}

export function removeCustomCard(cardId) {
  updateState(s => {
    s.customCards = (s.customCards || []).filter(c => c.id !== cardId);
    delete s.srs[cardId];
  });
}

export function getMasteredCount() {
  return Object.values(state.srs || {}).filter(r => r.reps >= 2).length;
}

export function exportProgressJson() {
  return JSON.stringify(state, null, 2);
}

export function importProgressJson(raw) {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') throw new Error('Arquivo inválido');
  state = { ...defaultState(), ...parsed };
  if (!state.lexicon || typeof state.lexicon !== 'object') state.lexicon = {};
  if (!Array.isArray(state.customSongs)) state.customSongs = [];
  if (!state.editorialV2) {
    state.theme = 'light';
    state.editorialV2 = true;
  }
  normalizeDates();
  persistNow();
  notify();
}

// =========================================================================
// GLOBAL LEXICON ENGINE (Tracks every English word seen, typed, read, heard)
// =========================================================================

const lexiconListeners = new Set();

export function subscribeLexicon(fn) {
  lexiconListeners.add(fn);
  return () => lexiconListeners.delete(fn);
}

function notifyLexicon() {
  const stats = getLexiconStats();
  lexiconListeners.forEach(fn => {
    try { fn(stats); } catch (_) {}
  });
}

const NOISE_TOKENS = new Set([
  'la', 'na', 'da', 'ooh', 'ooo', 'oooh', 'ah', 'ahh', 'eh', 'uh', 'um', 'hm', 'hmm',
  'mmm', 'woah', 'whoa', 'ayy', 'ay', 'ha', 'haha', 'hahaha', 'ba', 'pa', 'ta', 'ya',
  'ehh', 'uhh', 'ohhh', 'yeahhh', 'sha', 'doo', 'bop', 'boom'
]);

export function tokenizeEnglish(text) {
  if (!text) return [];
  const raw = String(text)
    .replace(/[\u2018\u2019`]/g, "'")
    .match(/[a-zA-Z]+(?:'[a-zA-Z]+)?/g);
  if (!raw) return [];
  const out = [];
  for (const tok of raw) {
    const w = tok.toLowerCase().replace(/^'+|'+$/g, '');
    if (!w) continue;
    if (w.length < 2 && w !== 'i' && w !== 'a') continue;
    if (w.length > 28) continue;
    if (NOISE_TOKENS.has(w)) continue;
    if (/^(.)\1{2,}$/.test(w)) continue; // skip "aaa", "ooo"
    out.push(w);
  }
  return out;
}

export function computeWordStatus(entry) {
  if (!entry) return 'seen';
  if (entry.manual && ['seen', 'learning', 'learned', 'mastered'].includes(entry.manual)) {
    return entry.manual;
  }
  const seen = entry.seen || 0;
  const correct = entry.correct || 0;
  const wrong = entry.wrong || 0;
  if (correct >= 4 || (correct >= 3 && seen >= 6)) return 'mastered';
  if (correct >= 2 || (correct >= 1 && seen >= 3) || (seen >= 5 && wrong === 0)) return 'learned';
  if (wrong > 0 || correct >= 1 || seen >= 2) return 'learning';
  return 'seen';
}

/**
 * Record English words passively or actively from any module without forcing full view rerenders.
 * @param {string|string[]} textOrWords
 * @param {{ source?: string, action?: 'seen'|'correct'|'wrong', sample?: string, sampleFrom?: string }} opts
 * @returns {{ added: number, touched: number }}
 */
export function recordWords(textOrWords, opts = {}) {
  const tokens = Array.isArray(textOrWords)
    ? textOrWords.flatMap(t => tokenizeEnglish(t))
    : tokenizeEnglish(textOrWords);
  if (!tokens.length) return { added: 0, touched: 0 };

  if (!state.lexicon || typeof state.lexicon !== 'object') state.lexicon = {};
  const source = opts.source || 'general';
  const action = opts.action || 'seen'; // 'seen' | 'correct' | 'wrong'
  const sample = String(opts.sample || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const sampleFrom = String(opts.sampleFrom || '').trim().slice(0, 70);
  const now = Date.now();

  // Deduplicate within a single sentence/event so one lyric line counts as 1 exposure per unique word
  const uniqueTokens = [...new Set(tokens)];
  let added = 0;

  for (const w of uniqueTokens) {
    let rec = state.lexicon[w];
    if (!rec) {
      rec = {
        w,
        seen: 0,
        correct: 0,
        wrong: 0,
        sources: [],
        sample: '',
        sampleFrom: '',
        manual: '',
        firstSeen: now,
        lastSeen: now
      };
      state.lexicon[w] = rec;
      added++;
    }
    rec.seen = (rec.seen || 0) + 1;
    if (action === 'correct') rec.correct = (rec.correct || 0) + 1;
    if (action === 'wrong') rec.wrong = (rec.wrong || 0) + 1;
    if (source && !rec.sources.includes(source)) rec.sources.push(source);
    if (sample && (!rec.sample || action === 'correct' || action === 'wrong')) {
      rec.sample = sample;
      rec.sampleFrom = sampleFrom || rec.sampleFrom;
    }
    rec.lastSeen = now;
  }

  persistNow();
  notifyLexicon();
  return { added, touched: uniqueTokens.length };
}

export function setWordManualStatus(word, manualStatus) {
  const key = String(word || '').toLowerCase().trim();
  if (!key || !state.lexicon?.[key]) return;
  updateState(s => {
    s.lexicon[key].manual = manualStatus; // '' | 'seen' | 'learning' | 'learned' | 'mastered'
    s.lexicon[key].lastSeen = Date.now();
  });
  notifyLexicon();
}

export function removeLexiconWord(word) {
  const key = String(word || '').toLowerCase().trim();
  if (!key || !state.lexicon?.[key]) return;
  updateState(s => {
    delete s.lexicon[key];
  });
  notifyLexicon();
}

export function getLexiconEntries() {
  const dict = state.lexicon || {};
  return Object.values(dict).map(rec => ({
    ...rec,
    status: computeWordStatus(rec)
  }));
}

export function getLexiconStats() {
  const entries = getLexiconEntries();
  let seenOnly = 0;
  let learning = 0;
  let learned = 0;
  let mastered = 0;
  let totalExposures = 0;
  const bySource = { music: 0, reading: 0, path: 0, vocab: 0, drills: 0, speaking: 0 };

  for (const e of entries) {
    totalExposures += e.seen || 0;
    if (e.status === 'mastered') mastered++;
    else if (e.status === 'learned') learned++;
    else if (e.status === 'learning') learning++;
    else seenOnly++;
    for (const src of e.sources || []) {
      if (bySource[src] !== undefined) bySource[src]++;
    }
  }

  const totalUnique = entries.length;
  const knownTotal = learned + mastered;

  // Milestones aligned with Paul Nation's English coverage benchmarks
  const milestones = [
    { target: 250, label: 'Início Ativo (A1)' },
    { target: 500, label: 'Base A1 (~70% fala)' },
    { target: 1000, label: 'Conversa A2 (~80% fala)' },
    { target: 2000, label: 'Fluência Funcional B1 (~88%)' },
    { target: 3000, label: 'Alta Fluência B2 (~95%)' },
    { target: 5000, label: 'Domínio C1 (~98%)' }
  ];
  const nextMilestone = milestones.find(m => totalUnique < m.target) || milestones[milestones.length - 1];

  return {
    totalUnique,
    seenOnly,
    learning,
    learned,
    mastered,
    knownTotal,
    totalExposures,
    bySource,
    nextMilestone
  };
}

// =========================================================================
// CUSTOM IMPORTED SONGS LIBRARY (Bulk import persistence)
// =========================================================================

export function getCustomSongs() {
  return Array.isArray(state.customSongs) ? state.customSongs : [];
}

export function addCustomSongs(newSongs, existingCurated = []) {
  const existingKeys = new Set();
  const normKey = (s) =>
    `${String(s.artist || '').toLowerCase().replace(/[^a-z0-9]/g, '')}::${String(s.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  for (const s of existingCurated) existingKeys.add(normKey(s));
  for (const s of getCustomSongs()) existingKeys.add(normKey(s));

  const toAdd = [];
  for (const s of newSongs || []) {
    if (!s || !s.title) continue;
    const item = {
      query: s.query || `${s.artist || ''} ${s.title}`.trim(),
      title: String(s.title).trim(),
      artist: String(s.artist || 'Artista').trim(),
      level: s.level || 'Médio • B1',
      genre: s.genre || 'pop',
      custom: true,
      addedAt: Date.now()
    };
    const key = normKey(item);
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    toAdd.push(item);
  }

  if (toAdd.length) {
    updateState(s => {
      s.customSongs = [...toAdd, ...(s.customSongs || [])];
    });
  }
  return { added: toAdd.length, skipped: (newSongs?.length || 0) - toAdd.length };
}

export function removeCustomSong(query) {
  updateState(s => {
    s.customSongs = (s.customSongs || []).filter(c => c.query !== query);
  });
}

export function clearCustomSongs() {
  updateState(s => {
    s.customSongs = [];
  });
}
