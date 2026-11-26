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
    customSongs: [],
    songsCompleted: [],
    totalStudySeconds: 0,
    studyByModule: { path: 0, vocab: 0, drills: 0, reading: 0, studio: 0, lyrics: 0, external: 0 },
    dailyLog: {},
    journalNotes: [],
    profile: {
      name: 'Seu Perfil',
      goal: 'Falar com naturalidade em reuniões, viagens e conversas reais',
      dailyGoalMinutes: 45,
      startLevel: 'A2',
      avatarColor: '#c2410c',
      joinedDate: todayStr()
    }
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
    const today = todayStr();
    if (!s.dailyLog || typeof s.dailyLog !== 'object') s.dailyLog = {};
    if (!s.dailyLog[today]) s.dailyLog[today] = { seconds: 0, xp: 0, wordsNew: 0, songs: 0 };
    s.dailyLog[today].xp = (s.dailyLog[today].xp || 0) + amount;
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

  if (added > 0) {
    const today = todayStr();
    if (!state.dailyLog || typeof state.dailyLog !== 'object') state.dailyLog = {};
    if (!state.dailyLog[today]) state.dailyLog[today] = { seconds: 0, xp: 0, wordsNew: 0, songs: 0 };
    state.dailyLog[today].wordsNew = (state.dailyLog[today].wordsNew || 0) + added;
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

// =========================================================================
// USER PROFILE, STUDY HOURS TRACKER, CEFR ENGINE & EVOLUTION DIARY
// =========================================================================

const studyTimeListeners = new Set();

export function subscribeStudyTime(fn) {
  studyTimeListeners.add(fn);
  return () => studyTimeListeners.delete(fn);
}

function ensureDailyBucket(s, dateKey = todayStr()) {
  if (!s.dailyLog || typeof s.dailyLog !== 'object') s.dailyLog = {};
  if (!s.dailyLog[dateKey]) {
    s.dailyLog[dateKey] = { seconds: 0, xp: 0, wordsNew: 0, songs: 0 };
  }
  return s.dailyLog[dateKey];
}

export function formatDurationCompact(totalSec) {
  const sec = Math.max(0, Math.floor(totalSec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m} min`;
  return `${sec}s`;
}

export function dateKeyFromMs(ms) {
  const d = new Date(ms || Date.now());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addStudySeconds(seconds, moduleKey = 'path', silent = true) {
  const delta = Math.max(0, Math.round(seconds || 0));
  if (!delta) return;
  normalizeDates();
  state.totalStudySeconds = (state.totalStudySeconds || 0) + delta;
  if (!state.studyByModule || typeof state.studyByModule !== 'object') {
    state.studyByModule = { path: 0, vocab: 0, drills: 0, reading: 0, studio: 0, lyrics: 0, external: 0 };
  }
  const mod = ['path', 'vocab', 'drills', 'reading', 'studio', 'lyrics', 'external'].includes(moduleKey)
    ? moduleKey
    : 'path';
  state.studyByModule[mod] = (state.studyByModule[mod] || 0) + delta;
  const bucket = ensureDailyBucket(state);
  bucket.seconds = (bucket.seconds || 0) + delta;

  persistNow();
  if (!silent) notify();
  studyTimeListeners.forEach(fn => {
    try { fn(state.totalStudySeconds, bucket.seconds); } catch (_) {}
  });
}

export function updateProfile(patch) {
  updateState(s => {
    s.profile = {
      name: 'Seu Perfil',
      goal: 'Falar com naturalidade em reuniões, viagens e conversas reais',
      dailyGoalMinutes: 45,
      startLevel: 'A2',
      avatarColor: '#c2410c',
      joinedDate: todayStr(),
      ...(s.profile || {}),
      ...patch
    };
  });
}

export function addJournalNote({ text, tag = 'Evolução', extraMinutes = 0 }) {
  const cleanText = String(text || '').trim();
  const mins = Math.max(0, Math.min(600, Number(extraMinutes) || 0));
  if (!cleanText && !mins) return;

  updateState(s => {
    if (!Array.isArray(s.journalNotes)) s.journalNotes = [];
    if (cleanText) {
      s.journalNotes.unshift({
        id: 'jn-' + Date.now(),
        date: todayStr(),
        tag: String(tag || 'Evolução').trim(),
        text: cleanText,
        minutes: mins,
        createdAt: Date.now()
      });
    }
    if (mins > 0) {
      const delta = mins * 60;
      s.totalStudySeconds = (s.totalStudySeconds || 0) + delta;
      if (!s.studyByModule) s.studyByModule = { path: 0, vocab: 0, drills: 0, reading: 0, studio: 0, lyrics: 0, external: 0 };
      s.studyByModule.external = (s.studyByModule.external || 0) + delta;
      const bucket = ensureDailyBucket(s);
      bucket.seconds = (bucket.seconds || 0) + delta;
      s.xpToday = (s.xpToday || 0) + Math.min(60, Math.round(mins * 1.5));
      bucket.xp = (bucket.xp || 0) + Math.min(60, Math.round(mins * 1.5));
    }
  });
}

export function removeJournalNote(id) {
  updateState(s => {
    s.journalNotes = (s.journalNotes || []).filter(n => n.id !== id);
  });
}

export function markSongCompleted(songKey) {
  if (!songKey) return;
  updateState(s => {
    if (!Array.isArray(s.songsCompleted)) s.songsCompleted = [];
    if (!s.songsCompleted.includes(songKey)) s.songsCompleted.push(songKey);
    const bucket = ensureDailyBucket(s);
    bucket.songs = (bucket.songs || 0) + 1;
  });
}

export function getProfileAnalytics() {
  const s = state;
  const profile = {
    name: 'Seu Perfil',
    goal: 'Falar com naturalidade em reuniões, viagens e conversas reais',
    dailyGoalMinutes: 45,
    startLevel: 'A2',
    avatarColor: '#c2410c',
    joinedDate: todayStr(),
    ...(s.profile || {})
  };
  const lx = getLexiconStats();
  const srsMastered = getMasteredCount();
  const lessonsDone = (s.completedLessons || []).length;
  const drillsDone = (s.completedDrills || []).length;
  const readingsDone = (s.completedReadings || []).length;
  const recordingsDone = s.totalRecordings || 0;
  const songsDone = (s.songsCompleted || []).length;
  const totalSec = s.totalStudySeconds || 0;
  const totalHours = totalSec / 3600;
  const todayBucket = (s.dailyLog || {})[todayStr()] || { seconds: 0, xp: 0, wordsNew: 0, songs: 0 };
  const byMod = {
    path: 0, vocab: 0, drills: 0, reading: 0, studio: 0, lyrics: 0, external: 0,
    ...(s.studyByModule || {})
  };

  // Start-level baseline so a user who already reads/understands B1 isn't labeled 0% A1 on day 1,
  // while still requiring real activity to progress up the CEFR ladder.
  const baseScoreByStart = { A1: 6, A2: 22, B1: 42, B2: 65, C1: 85 };
  const baseline = baseScoreByStart[profile.startLevel] || 22;

  // 5 Skill Scores (0..100) from real tracked usage
  const vocabScore = Math.min(100, Math.round(
    Math.min(55, (lx.totalUnique / 1500) * 55) +
    Math.min(30, (lx.knownTotal / 600) * 30) +
    Math.min(15, (srsMastered / 120) * 15)
  ));
  const grammarScore = Math.min(100, Math.round(
    Math.min(60, (lessonsDone / 32) * 60) +
    Math.min(40, (drillsDone / 60) * 40)
  ));
  const listeningScore = Math.min(100, Math.round(
    Math.min(45, (lx.bySource.music / 500) * 45) +
    Math.min(30, (songsDone / 15) * 30) +
    Math.min(25, ((byMod.lyrics + byMod.reading + byMod.external) / 36000) * 25)
  ));
  const readingScore = Math.min(100, Math.round(
    Math.min(60, (readingsDone / 22) * 60) +
    Math.min(40, (lx.bySource.reading / 400) * 40)
  ));
  const speakingScore = Math.min(100, Math.round(
    Math.min(45, (recordingsDone / 12) * 45) +
    Math.min(30, (lx.bySource.speaking / 250) * 30) +
    Math.min(25, (lessonsDone / 32) * 25)
  ));

  const activityAvg = (vocabScore * 0.30 + grammarScore * 0.22 + listeningScore * 0.18 + readingScore * 0.15 + speakingScore * 0.15);
  const immersionBonus = Math.min(15, totalHours * 0.5);
  const overallScore = Math.min(100, Math.round(Math.max(baseline, baseline * 0.55 + activityAvg * 0.85 + immersionBonus)));

  const CEFR_BANDS = [
    { code: 'A1', name: 'Iniciante (A1)', min: 0, max: 22, next: 'A2', tip: 'Complete as primeiras 8 lições da Trilha e acumule 250 palavras no Meu Léxico.' },
    { code: 'A2', name: 'Pré-Intermediário (A2)', min: 22, max: 42, next: 'B1', tip: 'Chegue a 600+ palavras no Léxico, 12 lições da Trilha e 5 textos de Shadowing.' },
    { code: 'B1', name: 'Intermediário Funcional (B1)', min: 42, max: 65, next: 'B2', tip: 'Mire em 1.500 palavras, 20+ Speed Drills, músicas no modo Difícil e gravações 4-3-2.' },
    { code: 'B2', name: 'Fluência Profissional (B2)', min: 65, max: 85, next: 'C1', tip: 'Conclua toda a Trilha, 15+ textos de leitura e 2.500+ palavras ativas com foco em fala.' },
    { code: 'C1', name: 'Avançado / Domínio (C1)', min: 85, max: 100, next: 'C2', tip: 'Mantenha imersão diária com músicas no Extremo, shadowing rápido e fala espontânea.' }
  ];
  const cefr = CEFR_BANDS.find(b => overallScore >= b.min && overallScore < b.max) || CEFR_BANDS[CEFR_BANDS.length - 1];
  const bandPct = Math.min(100, Math.max(0, Math.round(((overallScore - cefr.min) / Math.max(1, cefr.max - cefr.min)) * 100)));

  // Active days & daily timeline (last 84 days for heatmap + grouped word diary)
  const log = s.dailyLog || {};
  const entries = getLexiconEntries();
  const wordsByDay = {};
  for (const e of entries) {
    const dayKey = dateKeyFromMs(e.lastSeen || e.firstSeen);
    if (!wordsByDay[dayKey]) wordsByDay[dayKey] = [];
    wordsByDay[dayKey].push(e);
  }
  const notesByDay = {};
  for (const n of (s.journalNotes || [])) {
    const dk = n.date || dateKeyFromMs(n.createdAt);
    if (!notesByDay[dk]) notesByDay[dk] = [];
    notesByDay[dk].push(n);
  }

  const allDayKeys = new Set([
    ...Object.keys(log),
    ...Object.keys(wordsByDay),
    ...Object.keys(notesByDay)
  ]);
  const timeline = [...allDayKeys]
    .sort((a, b) => b.localeCompare(a))
    .map(date => {
      const b = log[date] || { seconds: 0, xp: 0, wordsNew: 0, songs: 0 };
      const words = (wordsByDay[date] || []).sort((a, c) => (c.lastSeen || 0) - (a.lastSeen || 0));
      const learnedToday = words.filter(w => w.status === 'learned' || w.status === 'mastered').length;
      return {
        date,
        seconds: b.seconds || 0,
        xp: b.xp || 0,
        wordsNew: b.wordsNew || words.length,
        songs: b.songs || 0,
        words,
        learnedCount: learnedToday,
        notes: notesByDay[date] || []
      };
    });

  // 84-day heatmap (12 weeks)
  const heatmap = [];
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  for (let i = 83; i >= 0; i--) {
    const d = new Date(nowDate.getTime() - i * 86400000);
    const dk = dateKeyFromMs(d.getTime());
    const b = log[dk] || { seconds: 0, xp: 0, wordsNew: 0 };
    const wCnt = (wordsByDay[dk] || []).length;
    const score = (b.seconds || 0) / 60 + (b.xp || 0) * 0.3 + wCnt * 0.8;
    const level = score <= 0 ? 0 : score < 10 ? 1 : score < 30 ? 2 : score < 60 ? 3 : 4;
    heatmap.push({ date: dk, seconds: b.seconds || 0, xp: b.xp || 0, words: wCnt, level });
  }

  const activeDays = Object.values(log).filter(b => (b.seconds || 0) >= 60 || (b.xp || 0) > 0 || (b.wordsNew || 0) > 0).length || (entries.length > 0 ? 1 : 0);

  // Achievements / Milestones
  const achievements = [
    { id: 'w50', icon: 'book-marked', title: '50 Palavras no Léxico', desc: 'Primeiras 50 palavras capturadas', unlocked: lx.totalUnique >= 50 },
    { id: 'w250', icon: 'library', title: '250 Palavras (Marco A1)', desc: 'Base sólida de vocabulário ativo', unlocked: lx.totalUnique >= 250 },
    { id: 'w1000', icon: 'crown', title: '1.000 Palavras (80% da fala)', desc: 'Cobertura de conversa cotidiana', unlocked: lx.totalUnique >= 1000 },
    { id: 'h1', icon: 'clock', title: '1ª Hora de Imersão', desc: '60 minutos reais de prática', unlocked: totalSec >= 3600 },
    { id: 'h10', icon: 'flame', title: '10 Horas de Inglês', desc: 'Consistência de quem destrava', unlocked: totalSec >= 36000 },
    { id: 'song1', icon: 'music', title: '1ª Música Concluída', desc: 'Completou todas as lacunas de uma música', unlocked: songsDone >= 1 },
    { id: 'path5', icon: 'route', title: '5 Lições na Trilha', desc: 'Avanço contínuo na Trilha Guiada', unlocked: lessonsDone >= 5 },
    { id: 'streak7', icon: 'zap', title: '7 Dias de Sequência', desc: 'Uma semana inteira em imersão', unlocked: (s.streak || 1) >= 7 }
  ];

  // Next hours milestone (1h, 5h, 10h, 25h, 50h, 100h, 300h)
  const hourTargets = [1, 5, 10, 25, 50, 100, 300, 600];
  const nextHoursTarget = hourTargets.find(h => totalHours < h) || 600;

  return {
    profile,
    lx,
    srsMastered,
    lessonsDone,
    drillsDone,
    readingsDone,
    recordingsDone,
    songsDone,
    totalSec,
    totalHours,
    todaySec: todayBucket.seconds || 0,
    todayWords: (wordsByDay[todayStr()] || []).length,
    byMod,
    activeDays,
    streak: s.streak || 1,
    skills: {
      vocab: vocabScore,
      grammar: grammarScore,
      listening: listeningScore,
      reading: readingScore,
      speaking: speakingScore
    },
    overallScore,
    cefr,
    bandPct,
    nextHoursTarget,
    heatmap,
    timeline,
    achievements
  };
}
