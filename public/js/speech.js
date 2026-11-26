export const NEURAL_VOICES = [
  { id: 'en-US-AndrewMultilingualNeural', label: 'Andrew — EUA (Masculina Natural)' },
  { id: 'en-US-AvaMultilingualNeural', label: 'Ava — EUA (Feminina Natural)' },
  { id: 'en-US-AriaNeural', label: 'Aria — EUA (Feminina Clara)' },
  { id: 'en-US-BrianMultilingualNeural', label: 'Brian — EUA (Executiva)' },
  { id: 'en-US-EmmaMultilingualNeural', label: 'Emma — EUA (Conversacional)' },
  { id: 'en-US-GuyNeural', label: 'Guy — EUA (Masculina)' },
  { id: 'en-GB-SoniaNeural', label: 'Sonia — Reino Unido (Feminina)' },
  { id: 'en-GB-RyanNeural', label: 'Ryan — Reino Unido (Masculina)' },
  { id: 'browser', label: 'Modo Offline (Voz do Navegador)' }
];

const DEFAULT_NEURAL_VOICE = 'en-US-AndrewMultilingualNeural';
const audioCache = new Map(); // key -> blobUrl
let currentAudio = null;
let speakSeq = 0;
let preferredVoiceId = DEFAULT_NEURAL_VOICE;
let cachedBrowserVoices = [];

function loadBrowserVoices() {
  if (!('speechSynthesis' in window)) return [];
  cachedBrowserVoices = window.speechSynthesis
    .getVoices()
    .filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
  return cachedBrowserVoices;
}

export function initVoices(onLoaded) {
  loadBrowserVoices();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => loadBrowserVoices();
  }
  if (onLoaded) onLoaded(NEURAL_VOICES);
}

export function getEnglishVoices() {
  return NEURAL_VOICES;
}

export function setPreferredVoice(id) {
  const valid = NEURAL_VOICES.some(v => v.id === id);
  preferredVoiceId = valid ? id : DEFAULT_NEURAL_VOICE;
}

export function getPreferredVoice() {
  return preferredVoiceId;
}

function pickBestBrowserVoice() {
  if (!cachedBrowserVoices.length) loadBrowserVoices();
  if (!cachedBrowserVoices.length) return null;
  return (
    cachedBrowserVoices.find(v => /Google US English/i.test(v.name)) ||
    cachedBrowserVoices.find(v => /en-US/i.test(v.lang)) ||
    cachedBrowserVoices[0]
  );
}

export function stopSpeaking() {
  speakSeq++;
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (_) {}
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function speakBrowserFallback(clean, rate, mySeq, onEnd) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = 'en-US';
  utter.rate = rate;
  const voice = pickBestBrowserVoice();
  if (voice) utter.voice = voice;
  utter.onend = () => { if (mySeq === speakSeq && onEnd) onEnd(); };
  utter.onerror = () => { if (mySeq === speakSeq && onEnd) onEnd(); };
  window.speechSynthesis.speak(utter);
}

async function fetchNeuralAudioUrl(clean, voice, rate) {
  const normRate = Number(rate || 1.0).toFixed(2);
  const key = `${voice}|${normRate}|${clean}`;
  if (audioCache.has(key)) return audioCache.get(key);

  const url = `/api/tts?text=${encodeURIComponent(clean)}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(normRate)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`TTS HTTP ${resp.status}`);
  const blob = await resp.blob();
  if (!blob.size) throw new Error('Empty TTS blob');
  const blobUrl = URL.createObjectURL(blob);

  // Cap memory cache cleanly at 180 phrases
  if (audioCache.size > 180) {
    const firstKey = audioCache.keys().next().value;
    const oldUrl = audioCache.get(firstKey);
    audioCache.delete(firstKey);
    try { URL.revokeObjectURL(oldUrl); } catch (_) {}
  }
  audioCache.set(key, blobUrl);
  return blobUrl;
}

export function speak(text, rate = 1.0, onEnd = null) {
  stopSpeaking();
  const mySeq = speakSeq;
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) {
    if (onEnd) onEnd();
    return false;
  }

  if (preferredVoiceId === 'browser') {
    speakBrowserFallback(clean, rate, mySeq, onEnd);
    return true;
  }

  const voice = preferredVoiceId || DEFAULT_NEURAL_VOICE;
  fetchNeuralAudioUrl(clean, voice, rate)
    .then((blobUrl) => {
      if (mySeq !== speakSeq) return;
      const audio = new Audio(blobUrl);
      currentAudio = audio;
      audio.onended = () => {
        if (currentAudio === audio) currentAudio = null;
        if (mySeq === speakSeq && onEnd) onEnd();
      };
      audio.onerror = () => {
        if (currentAudio === audio) currentAudio = null;
        if (mySeq === speakSeq) speakBrowserFallback(clean, rate, mySeq, onEnd);
      };
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          if (mySeq === speakSeq) speakBrowserFallback(clean, rate, mySeq, onEnd);
        });
      }
    })
    .catch(() => {
      if (mySeq === speakSeq) speakBrowserFallback(clean, rate, mySeq, onEnd);
    });

  return true;
}

export function hasSpeechRecognition() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createRecognizer({ continuous = false, onInterim, onFinal, onEnd, onError }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.continuous = continuous;
  rec.maxAlternatives = 1;

  rec.onresult = (event) => {
    let interim = '';
    let finalText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += t + ' ';
      else interim += t;
    }
    if (interim && onInterim) onInterim(interim.trim());
    if (finalText && onFinal) onFinal(finalText.trim());
  };
  rec.onerror = (e) => { if (onError) onError(e.error || 'erro'); };
  rec.onend = () => { if (onEnd) onEnd(); };
  return rec;
}

export function similarityScore(spoken, target) {
  const norm = s => s.toLowerCase().replace(/[^a-z0-9'\s]/g, '').replace(/\s+/g, ' ').trim();
  const a = norm(spoken).split(' ').filter(Boolean);
  const b = norm(target).split(' ').filter(Boolean);
  if (!a.length || !b.length) return 0;
  let hits = 0;
  const bCopy = [...b];
  for (const w of a) {
    const idx = bCopy.indexOf(w);
    if (idx !== -1) {
      hits++;
      bCopy.splice(idx, 1);
    }
  }
  return Math.round((hits / Math.max(a.length, b.length)) * 100);
}
