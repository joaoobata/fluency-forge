import { getState } from './store.js';

let ctx = null;

function getAudioContext() {
  if (getState().soundEffects === false) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function tone(c, { freq, endFreq = null, start = 0, dur = 0.12, vol = 0.08, type = 'sine' }) {
  const now = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

// Soft tactile keycap tap (word chips, option selection, nav switches)
export function playClick() {
  try {
    const c = getAudioContext();
    if (!c) return;
    tone(c, { freq: 440, endFreq: 260, dur: 0.045, vol: 0.045, type: 'triangle' });
  } catch (_) {}
}

// Subtle paper card flip (revealing SRS flashcard)
export function playFlip() {
  try {
    const c = getAudioContext();
    if (!c) return;
    tone(c, { freq: 310, endFreq: 520, dur: 0.09, vol: 0.05, type: 'sine' });
  } catch (_) {}
}

// Warm marimba chime on correct answer / completed turn
export function playCorrect() {
  try {
    const c = getAudioContext();
    if (!c) return;
    tone(c, { freq: 523.25, start: 0, dur: 0.14, vol: 0.085, type: 'sine' });
    tone(c, { freq: 659.25, start: 0.08, dur: 0.22, vol: 0.09, type: 'sine' });
    tone(c, { freq: 783.99, start: 0.15, dur: 0.24, vol: 0.055, type: 'triangle' });
  } catch (_) {}
}

// Gentle low muted thud on wrong answer
export function playWrong() {
  try {
    const c = getAudioContext();
    if (!c) return;
    tone(c, { freq: 235, endFreq: 195, start: 0, dur: 0.15, vol: 0.075, type: 'triangle' });
    tone(c, { freq: 185, endFreq: 155, start: 0.12, dur: 0.22, vol: 0.07, type: 'triangle' });
  } catch (_) {}
}

// Celebratory victory chord (lesson complete / quiz complete)
export function playVictory() {
  try {
    const c = getAudioContext();
    if (!c) return;
    tone(c, { freq: 523.25, start: 0.0, dur: 0.15, vol: 0.08 });
    tone(c, { freq: 659.25, start: 0.1, dur: 0.15, vol: 0.08 });
    tone(c, { freq: 783.99, start: 0.2, dur: 0.18, vol: 0.085 });
    tone(c, { freq: 1046.5, start: 0.31, dur: 0.42, vol: 0.095 });
  } catch (_) {}
}

// Studio bell when 4-3-2 speaking timer ends
export function playBell() {
  try {
    const c = getAudioContext();
    if (!c) return;
    tone(c, { freq: 880, start: 0, dur: 0.55, vol: 0.08, type: 'sine' });
    tone(c, { freq: 1318.5, start: 0.04, dur: 0.45, vol: 0.04, type: 'sine' });
  } catch (_) {}
}

// Helper to hydrate Lucide icons after any dynamic render
export function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

export function iconHtml(name, size = 16, extraClass = '') {
  return `<i data-lucide="${name}" class="lucide-ico ${extraClass}" style="width:${size}px;height:${size}px;"></i>`;
}
