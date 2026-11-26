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
    soundEffects: true
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
  if (!state.editorialV2) {
    state.theme = 'light';
    state.editorialV2 = true;
  }
  normalizeDates();
  persistNow();
  notify();
}
