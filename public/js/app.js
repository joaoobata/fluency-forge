import { VOCAB_DECKS } from './data-vocab.js';
import {
  BUILDER_SCENARIOS,
  SPEED_DRILLS,
  SPEAKING_TOPICS_432,
  PARAPHRASE_CARDS,
  PRONUNCIATION_RULES
} from './data-drills.js';
import { READING_PASSAGES } from './data-reading.js';
import {
  initVoices,
  setPreferredVoice,
  speak,
  stopSpeaking,
  hasSpeechRecognition,
  createRecognizer,
  similarityScore
} from './speech.js';
import {
  initStore,
  getState,
  subscribe,
  updateState,
  addXp,
  getAllVocabCards,
  getDueCards,
  rateCard,
  addCustomCard,
  removeCustomCard,
  getMasteredCount,
  exportProgressJson,
  importProgressJson
} from './store.js';

import {
  renderPathView,
  bindPathEvents,
  handlePathKeydown,
  exitLesson,
  stopLessonMedia,
  getAllLessonsFlat
} from './path-player.js';
import { analyzeSentenceMistake, renderMistakeCoachHtml } from './error-coach.js';
import {
  playClick,
  playFlip,
  playCorrect,
  playWrong,
  playVictory,
  playBell,
  refreshIcons,
  iconHtml
} from './sfx.js';

const VIEW_META = {
  path: ['Trilha Guiada (Passo a Passo)', 'Comece pela Lição 1 e avance unidade por unidade no estilo Duolingo'],
  dashboard: ['Painel & Rotina de Imersão', 'Treino 100% ativo para falar o que precisar sem travar'],
  vocab: ['Vocabulário Ativo (SRS)', 'Cartão invertido Português → Inglês para puxar palavras da memória na hora'],
  drills: ['Motores de Frase & Speed Drill', 'Monte qualquer ideia em 3 blocos sem traduzir palavra por palavra'],
  reading: ['Leitura Guiada & Shadowing', 'Clique em qualquer palavra para ouvir • treine ritmo, blocos de sentido e pronúncia'],
  studio: ['Estúdio de Fala Livre (4-3-2)', 'Grave sua própria voz, destrave velocidade e pratique paráfrase anti-branco'],
  arsenal: ['Diário de Lacunas & Arsenal', 'Suas palavras salvas, as 10 regras de pronúncia e melhores fontes gratuitas']
};

let currentView = 'path';

// View-local state
const ui = {
  // Vocab
  vocabDeck: 'all',
  vocabMode: 'study', // 'study' | 'browse'
  vocabFreeReview: false,
  vocabQueueIdx: 0,
  vocabRevealed: false,
  vocabShowHint: false,
  vocabSearch: '',
  vocabSpoken: '',
  vocabScore: null,

  // Drills
  drillsTab: 'builder', // 'builder' | 'speed'
  builderScenario: 0,
  builderPicks: [0, 0, 0],
  speedIdx: 0,
  speedFilter: 'all',
  speedOnlyPending: false,
  speedInput: '',
  speedChecked: false,
  speedScore: null,

  // Reading
  readingIdx: 0,
  readingRate: 0.9,
  readingActiveSent: -1,
  readingShowPhon: true,
  readingShowPt: false,
  readingShowTraps: true,
  readingSelectedWord: '',
  readingQuizPicked: null,
  shadowingActive: false,

  // Studio
  studioTab: '432', // '432' | 'paraphrase'
  topicIdx: 0,
  roundSeconds: 240,
  timerLeft: 240,
  timerRunning: false,
  recording: false,
  transcript: '',
  recordings: [], // { label, url, duration }
  paraIdx: 0,
  paraShowExample: false
};

let activeTimer = null;
let activeRecognizer = null;
let mediaRecorder = null;
let mediaStream = null;
let audioChunks = [];
let shadowToken = 0;

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 2600);
}

function cleanupAsyncActivities() {
  stopLessonMedia();
  shadowToken++;
  ui.shadowingActive = false;
  stopSpeaking();
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
    ui.timerRunning = false;
  }
  if (activeRecognizer) {
    try { activeRecognizer.stop(); } catch (_) {}
    activeRecognizer = null;
  }
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    try { mediaRecorder.stop(); } catch (_) {}
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  ui.recording = false;
}

function setView(view) {
  cleanupAsyncActivities();
  if (view !== 'path') exitLesson();
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  document.querySelector('.sidebar').classList.remove('open');
  const [title, sub] = VIEW_META[view] || ['FluencyForge', ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = sub;
  renderView();
}

function updateChrome(state) {
  document.documentElement.setAttribute('data-theme', state.theme || 'dark');
  const goal = state.dailyGoalXp || 150;
  const pct = Math.min(100, Math.round(((state.xpToday || 0) / goal) * 100));
  document.getElementById('sidebar-xp').textContent = `${state.xpToday || 0} / ${goal} XP`;
  document.getElementById('sidebar-xp-bar').style.width = `${pct}%`;
  document.getElementById('sidebar-streak').textContent = state.streak || 1;
  document.getElementById('sidebar-mastered').textContent = getMasteredCount();

  const dueInfo = getDueCards('all');
  const dueBadge = document.getElementById('badge-due');
  const totalPending = dueInfo.due.length + Math.min(15, dueInfo.fresh.length);
  dueBadge.textContent = totalPending;

  const pathBadge = document.getElementById('badge-path');
  if (pathBadge) {
    const totalLessons = getAllLessonsFlat().length;
    const doneLessons = (state.completedLessons || []).length;
    pathBadge.textContent = `${doneLessons}/${totalLessons}`;
  }

  const sfxBtn = document.getElementById('global-sfx-toggle');
  if (sfxBtn) {
    const on = state.soundEffects !== false;
    sfxBtn.innerHTML = `${iconHtml(on ? 'volume-2' : 'volume-x', 15)}<span>${on ? 'Sons' : 'Mudo'}</span>`;
    refreshIcons();
  }
}

// =====================================================================
// VIEW 1: DASHBOARD
// =====================================================================
function renderDashboard() {
  const s = getState();
  const dueInfo = getDueCards('all');
  const mastered = getMasteredCount();
  const totalCards = dueInfo.all.length;
  const cl = s.dailyChecklist || {};
  const doneTurns = Object.values(cl).filter(Boolean).length;

  const turns = [
    {
      key: 'turn1_vocab',
      title: 'Turno 1 — Vocabulário Ativo PT → EN (45 min)',
      desc: 'Revise 15 a 25 cartões invertidos em voz alta puxando as expressões da memória antes de revelar.',
      action: 'vocab',
      actionLabel: 'Abrir Vocabulário'
    },
    {
      key: 'turn2_drills',
      title: 'Turno 2 — Motores de Frase & Speed Drill (45 min)',
      desc: 'Monte variações no Construtor 3 Blocos falando em voz alta e complete pelo menos 8 Speed Drills.',
      action: 'drills',
      actionLabel: 'Abrir Drills'
    },
    {
      key: 'turn3_reading',
      title: 'Turno 3 — Leitura em Blocos + Shadowing (45 min)',
      desc: 'Escolha 1 texto graduado, clique nas palavras difíceis para ouvir e faça o Shadowing Loop repetindo junto.',
      action: 'reading',
      actionLabel: 'Abrir Leitura'
    },
    {
      key: 'turn4_speaking',
      title: 'Turno 4 — Estúdio 4-3-2 + Diário de Lacunas (30 min)',
      desc: 'Grave 1 rodada 4-3-2 sobre um tema real e salve no Diário 3 palavras que faltaram na sua fala.',
      action: 'studio',
      actionLabel: 'Abrir Estúdio'
    }
  ];

  return `
    <div class="stack-lg">
      <div class="grid-4">
        <div class="card">
          <div class="stat-value">${dueInfo.due.length + dueInfo.fresh.length}</div>
          <div class="stat-label">Cards na fila (${dueInfo.due.length} revisões + ${dueInfo.fresh.length} novos)</div>
        </div>
        <div class="card">
          <div class="stat-value">${mastered} / ${totalCards}</div>
          <div class="stat-label">Expressões dominadas (SRS)</div>
        </div>
        <div class="card">
          <div class="stat-value">${s.completedDrills.length} / ${SPEED_DRILLS.length}</div>
          <div class="stat-label">Speed Drills concluídos</div>
        </div>
        <div class="card">
          <div class="stat-value">${s.completedReadings.length} / ${READING_PASSAGES.length}</div>
          <div class="stat-label">Textos de Shadowing feitos</div>
        </div>
      </div>

      <div class="card stack-md">
        <div class="row-between">
          <div>
            <h2>Rotina de Choque de Hoje (${doneTurns}/4 turnos)</h2>
            <p class="muted">Marque cada turno conforme concluir. Foco total em falar em voz alta (Regra 30/70).</p>
          </div>
          <span class="pill">${iconHtml("flame", 14)} ${s.streak || 1} dia(s) seguido(s)</span>
        </div>

        <div class="stack-sm">
          ${turns.map(t => {
            const checked = Boolean(cl[t.key]);
            return `
              <div class="check-item ${checked ? 'done' : ''}" data-toggle-turn="${t.key}">
                <div class="check-box">${checked ? '✓' : ''}</div>
                <div style="flex:1">
                  <div style="font-weight:600; font-size:14px;">${esc(t.title)}</div>
                  <div class="muted">${esc(t.desc)}</div>
                </div>
                <button class="btn btn-secondary btn-sm" data-goto="${t.action}">${esc(t.actionLabel)}</button>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="grid-3">
        <div class="card card-interactive stack-sm" data-goto="vocab">
          <div class="pill">${iconHtml('layers', 13)} Maior Impacto</div>
          <h3>Destravar Vocabulário</h3>
          <p class="muted">${totalCards} expressões de alta frequência em ${VOCAB_DECKS.length - 1} trilhas + suas lacunas com SRS e áudio.</p>
        </div>
        <div class="card card-interactive stack-sm" data-goto="drills">
          <div class="pill">${iconHtml('zap', 13)} Zero Tradução</div>
          <h3>Montar Frases Rápido</h3>
          <p class="muted">${BUILDER_SCENARIOS.length} cenários de 3 blocos + ${SPEED_DRILLS.length} Speed Drills sob cronômetro.</p>
        </div>
        <div class="card card-interactive stack-sm" data-goto="reading">
          <div class="pill">${iconHtml('book-open', 13)} Som + Sentido</div>
          <h3>Ler Sem Travar</h3>
          <p class="muted">${READING_PASSAGES.length} textos graduados em blocos de sentido com áudio palavra por palavra e Shadowing.</p>
        </div>
      </div>
    </div>
  `;
}

// =====================================================================
// VIEW 2: VOCABULARY SRS
// =====================================================================
function getActiveVocabQueue() {
  const info = getDueCards(ui.vocabDeck);
  if (ui.vocabFreeReview) return info.all;
  return info.queue;
}

function renderVocab() {
  const allCards = getAllVocabCards();
  const deckPills = [
    { id: 'all', icon: 'layers', label: `Todos (${allCards.length})` },
    ...VOCAB_DECKS.map(d => {
      const count = allCards.filter(c => c.deck === d.id).length;
      return { id: d.id, icon: d.icon, label: `${d.short} (${count})` };
    })
  ];

  const header = `
    <div class="stack-md">
      <div class="row-between">
        <div class="tabs" style="border-bottom:none; padding-bottom:0;">
          <button class="tab-btn ${ui.vocabMode === 'study' ? 'active' : ''}" data-vocab-mode="study">${iconHtml('target', 14)} Treinar SRS (PT → EN)</button>
          <button class="tab-btn ${ui.vocabMode === 'browse' ? 'active' : ''}" data-vocab-mode="browse">${iconHtml('search', 14)} Explorar &amp; Buscar (${allCards.length})</button>
        </div>
        <button class="btn btn-primary btn-sm" id="vocab-add-gap">${iconHtml('plus', 14)} Nova Lacuna</button>
      </div>

      <div class="row">
        ${deckPills.map(p => `
          <button class="btn btn-sm ${ui.vocabDeck === p.id ? 'btn-primary' : 'btn-secondary'}" data-deck="${p.id}">
            ${iconHtml(p.icon, 14)} ${esc(p.label)}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  if (ui.vocabMode === 'browse') {
    const q = ui.vocabSearch.trim().toLowerCase();
    const list = allCards.filter(c => {
      if (ui.vocabDeck !== 'all' && c.deck !== ui.vocabDeck) return false;
      if (!q) return true;
      return (
        c.chunk.toLowerCase().includes(q) ||
        c.en.toLowerCase().includes(q) ||
        c.pt.toLowerCase().includes(q)
      );
    });

    return `
      <div class="stack-lg">
        ${header}
        <div class="card stack-md">
          <div class="row-between">
            <input type="text" id="vocab-search-input" value="${esc(ui.vocabSearch)}" placeholder="Buscar em português ou inglês (ex: prazo, figure out, although)..." style="max-width:420px;" />
            <span class="muted">${list.length} expressão(ões)</span>
          </div>
          <div style="overflow-x:auto;">
            <table class="vocab-table">
              <thead>
                <tr>
                  <th>Expressão (Chunk)</th>
                  <th>Frase de Contexto &amp; Som</th>
                  <th>Sentido em Português</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${list.map(c => `
                  <tr>
                    <td><strong>${esc(c.chunk)}</strong></td>
                    <td>
                      <div>${esc(c.en)}</div>
                      <div class="phonetic">${esc(c.phon)}</div>
                    </td>
                    <td>${esc(c.pt)}</td>
                    <td>
                      <div class="row" style="flex-wrap:nowrap;">
                        <button class="btn btn-secondary btn-sm" data-speak="${esc(c.en)}">${iconHtml("volume-2", 14)}</button>
                        <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://youglish.com/pronounce/${encodeURIComponent(c.chunk)}/english/us">YG</a>
                        ${c.deck === 'custom' ? `<button class="btn btn-danger btn-sm" data-del-custom="${c.id}">✕</button>` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // STUDY MODE
  const queue = getActiveVocabQueue();
  const dueInfo = getDueCards(ui.vocabDeck);

  if (!queue.length) {
    return `
      <div class="stack-lg">
        ${header}
        <div class="card flashcard-stage stack-md" style="text-align:center; padding:40px 24px;">
          <h2>Fila concluída nesta trilha!</h2>
          <p class="muted">
            ${dueInfo.all.length === 0
              ? 'Você ainda não adicionou nenhuma palavra em "Minhas Lacunas". Clique em "+ Nova Lacuna" acima!'
              : `Você já revisou todas as ${dueInfo.all.length} expressões desta trilha por enquanto.`}
          </p>
          <div class="row" style="justify-content:center;">
            ${dueInfo.all.length > 0 ? `<button class="btn btn-primary" id="btn-free-review">Praticar Mesmo Assim (Revisão Livre)</button>` : ''}
            <button class="btn btn-secondary" data-deck="all">Ir para Todas as Trilhas</button>
          </div>
        </div>
      </div>
    `;
  }

  if (ui.vocabQueueIdx >= queue.length) ui.vocabQueueIdx = 0;
  const card = queue[ui.vocabQueueIdx];
  const deckObj = VOCAB_DECKS.find(d => d.id === card.deck);

  return `
    <div class="stack-lg">
      ${header}
      <div class="flashcard-stage stack-md">
        <div class="row-between muted">
          <span class="row" style="gap:6px;">${deckObj ? `${iconHtml(deckObj.icon, 15)} ${esc(deckObj.name)}` : 'Trilha'}</span>
          <div class="row">
            <span>Restam <strong>${queue.length}</strong> na fila ${ui.vocabFreeReview ? '(Revisão Livre)' : '(SRS)'}</span>
            <button class="btn btn-ghost btn-sm" id="btn-vocab-shuffle">${iconHtml('shuffle', 14)} Aleatória</button>
          </div>
        </div>

        <div class="flashcard">
          <div class="row-between">
            <span class="pill">Fale em inglês em voz alta antes de revelar</span>
            <button class="btn btn-ghost btn-sm" id="btn-toggle-hint">
              ${ui.vocabShowHint ? `Dica: ${esc(card.hint)}` : 'Mostrar Dica (Iniciais)'}
            </button>
          </div>

          <div class="flashcard-pt">${esc(card.pt)}</div>

          ${hasSpeechRecognition() ? `
            <div class="row">
              <button class="btn btn-secondary btn-sm ${activeRecognizer ? 'mic-pulse btn-danger' : ''}" id="btn-vocab-mic">
                ${activeRecognizer ? iconHtml('square', 14) + ' Parar Microfone' : iconHtml('mic', 14) + ' Testar no Microfone'}
              </button>
              ${ui.vocabSpoken ? `
                <span class="muted">Você disse: <strong>"${esc(ui.vocabSpoken)}"</strong>
                  ${ui.vocabScore !== null ? `<span class="pill" style="margin-left:6px;">${ui.vocabScore}% parecido</span>` : ''}
                </span>
              ` : ''}
            </div>
          ` : ''}

          ${!ui.vocabRevealed ? `
            <div class="row" style="padding-top:8px;">
              <button class="btn btn-primary btn-lg" id="btn-reveal-card">Revelar Resposta + Ouvir (Espaço)</button>
            </div>
          ` : `
            <div class="flashcard-answer">
              <div class="row-between">
                <div class="flashcard-chunk">${esc(card.chunk)}</div>
                <div class="row">
                  <button class="btn btn-primary btn-sm" data-speak="${esc(card.en)}">${iconHtml('volume-2', 14)} Normal (R)</button>
                  <button class="btn btn-secondary btn-sm" data-speak-slow="${esc(card.en)}">${iconHtml('gauge', 14)} Devagar 0.75x</button>
                  <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://youglish.com/pronounce/${encodeURIComponent(card.chunk)}/english/us">YouGlish ${iconHtml('external-link', 13)}</a>
                </div>
              </div>
              <div class="flashcard-en">${esc(card.en)}</div>
              <div class="phonetic">Som conectado: ${esc(card.phon)}</div>
              <div class="muted">${esc(card.note)}</div>

              <div style="padding-top:10px;">
                <div class="mini-label" style="margin-bottom:8px;">Você conseguiu puxar da memória? (Atalhos 1 a 4)</div>
                <div class="srs-grid">
                  <button class="btn btn-danger" data-rate="again">1 • Errei (2 min)</button>
                  <button class="btn btn-warning" data-rate="hard">2 • Difícil (12h)</button>
                  <button class="btn btn-success" data-rate="good">3 • Bom (1–3d)</button>
                  <button class="btn btn-primary" data-rate="easy">4 • Fácil (4d+)</button>
                </div>
              </div>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

// =====================================================================
// VIEW 3: SENTENCE MOTORS & SPEED DRILLS
// =====================================================================
function renderDrills() {
  const tabBar = `
    <div class="tabs">
      <button class="tab-btn ${ui.drillsTab === 'builder' ? 'active' : ''}" data-drills-tab="builder">${iconHtml("blocks", 14)} Construtor 3 Blocos</button>
      <button class="tab-btn ${ui.drillsTab === 'speed' ? 'active' : ''}" data-drills-tab="speed">${iconHtml("timer", 14)} Speed Drill (${getState().completedDrills.length}/${SPEED_DRILLS.length})</button>
    </div>
  `;

  if (ui.drillsTab === 'builder') {
    const sc = BUILDER_SCENARIOS[ui.builderScenario];
    const picked = sc.cols.map((col, idx) => col.items[ui.builderPicks[idx] || 0]);
    const fullEn = picked.map(p => p.en).join(' ');
    const fullPhon = picked.map(p => p.phon).join(' / ');
    const fullPt = picked.map(p => p.pt).join(' ');

    return `
      <div class="stack-lg">
        ${tabBar}
        <div class="row-between">
          <div class="row">
            ${BUILDER_SCENARIOS.map((s, i) => `
              <button class="btn btn-sm ${ui.builderScenario === i ? 'btn-primary' : 'btn-secondary'}" data-builder-sc="${i}">
                ${esc(s.name)}
              </button>
            `).join('')}
          </div>
          <button class="btn btn-ghost btn-sm" id="btn-builder-random">${iconHtml("shuffle", 14)} Combinar Aleatório</button>
        </div>

        <div class="grid-3">
          ${sc.cols.map((col, cIdx) => `
            <div class="card stack-sm">
              <div class="mini-label">${esc(col.title)}</div>
              <div class="builder-col">
                ${col.items.map((item, iIdx) => `
                  <button class="builder-opt ${ui.builderPicks[cIdx] === iIdx ? 'active' : ''}" data-pick-col="${cIdx}" data-pick-idx="${iIdx}">
                    <div>${esc(item.en)}</div>
                    <div style="font-size:11px; opacity:0.78;">${esc(item.pt)}</div>
                  </button>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="card stack-sm" style="border-color: var(--primary);">
          <div class="row-between">
            <span class="pill">Frase Montada — Leia em Voz Alta Agora!</span>
            <div class="row">
              <button class="btn btn-primary btn-sm" data-speak="${esc(fullEn)}">${iconHtml("volume-2", 14)} Ouvir Normal</button>
              <button class="btn btn-secondary btn-sm" data-speak-slow="${esc(fullEn)}">${iconHtml("gauge", 14)} 0.75x</button>
            </div>
          </div>
          <div style="font-size:21px; font-weight:700;">${esc(fullEn)}</div>
          <div class="phonetic">Som ligado: ${esc(fullPhon)}</div>
          <div class="muted">Sentido: ${esc(fullPt)}</div>
        </div>
      </div>
    `;
  }

  // SPEED DRILL TAB
  const completed = getState().completedDrills || [];
  const categories = ['all', 'Present Perfect', 'Condicional', 'Entrevista', 'Idiom', 'Call Real', 'Passado Irregular', 'Phrasal Verb', 'Conector', 'Falso Cognato', 'Collocation', 'Vida Adulta', 'Pergunta', 'Motor', 'Vida Real', 'Tech & Projetos'];
  const matchingIndices = SPEED_DRILLS.map((d, i) => ({ d, i })).filter(({ d }) => {
    const tagMatch = ui.speedFilter === 'all' || d.tag.toLowerCase().includes(ui.speedFilter.toLowerCase());
    const pendingMatch = !ui.speedOnlyPending || !completed.includes(d.id);
    return tagMatch && pendingMatch;
  }).map(x => x.i);

  if (matchingIndices.length && !matchingIndices.includes(ui.speedIdx)) {
    ui.speedIdx = matchingIndices[0];
  }
  const drill = SPEED_DRILLS[ui.speedIdx];
  const isDone = completed.includes(drill.id);
  const posInFiltered = matchingIndices.indexOf(ui.speedIdx);

  return `
    <div class="stack-lg">
      ${tabBar}
      <div class="flashcard-stage stack-md">
        <div class="row-between">
          <div class="row">
            <select id="speed-filter-select" class="select-input" style="width:auto;">
              ${categories.map(cat => `<option value="${esc(cat)}" ${ui.speedFilter === cat ? 'selected' : ''}>${cat === 'all' ? `Todas as categorias (${SPEED_DRILLS.length})` : esc(cat)}</option>`).join('')}
            </select>
            <button class="btn btn-sm ${ui.speedOnlyPending ? 'btn-primary' : 'btn-secondary'}" id="btn-speed-pending">
              ${ui.speedOnlyPending ? '✓ Só Pendentes' : '○ Só Pendentes'}
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-speed-random">${iconHtml("shuffle", 14)} Aleatório</button>
          </div>
          <span class="muted">
            ${matchingIndices.length ? `<strong>${posInFiltered + 1}</strong> / ${matchingIndices.length}` : '0 pendentes neste filtro'}
            ${isDone ? ' • ✅ Concluído' : ''}
          </span>
        </div>

        <div class="flashcard">
          <div class="row-between">
            <span class="pill">${esc(drill.tag)}</span>
            <span class="muted">Desafio #${ui.speedIdx + 1}</span>
          </div>
          <div class="muted">Monte em inglês sem usar tradutor (digite ou fale no microfone):</div>
          <div class="flashcard-pt">"${esc(drill.pt)}"</div>

          <div class="row" style="align-items:stretch;">
            <input type="text" id="speed-input" value="${esc(ui.speedInput)}" placeholder="Escreva sua frase em inglês aqui e aperte Enter..." style="flex:1; font-size:15px; padding:12px;" />
            ${hasSpeechRecognition() ? `
              <button class="btn btn-secondary ${activeRecognizer ? 'mic-pulse btn-danger' : ''}" id="btn-speed-mic">
                ${activeRecognizer ? iconHtml('square', 14) + ' Ouvindo...' : iconHtml('mic', 14) + ' Falar'}
              </button>
            ` : ''}
          </div>

          <div class="row-between">
            <div class="row">
              <button class="btn btn-primary" id="btn-speed-check">Verificar Resposta</button>
              <button class="btn btn-ghost" id="btn-speed-skip">Mostrar Natural</button>
            </div>
            <div class="row">
              <button class="btn btn-secondary btn-sm" id="btn-speed-prev">← Anterior</button>
              <button class="btn btn-secondary btn-sm" id="btn-speed-next">Próximo →</button>
            </div>
          </div>

          ${ui.speedChecked ? `
            <div class="flashcard-answer">
              ${ui.speedScore !== null ? `
                <div class="row">
                  <span class="pill" style="background:${ui.speedScore >= 75 ? 'var(--success-soft)' : 'var(--warning-soft)'}; color:${ui.speedScore >= 75 ? 'var(--success)' : 'var(--warning)'};">
                    ${ui.speedScore >= 80 ? '🔥 Excelente!' : ui.speedScore >= 55 ? '👍 Muito perto!' : '💡 Compare e repita em voz alta'} (${ui.speedScore}%)
                  </span>
                </div>
              ` : ''}
              <div class="row-between">
                <div class="flashcard-en" style="color:var(--accent);">${esc(drill.en)}</div>
                <div class="row">
                  <button class="btn btn-primary btn-sm" data-speak="${esc(drill.en)}">${iconHtml("volume-2", 14)} Normal</button>
                  <button class="btn btn-secondary btn-sm" data-speak-slow="${esc(drill.en)}">${iconHtml("gauge", 14)} 0.75x</button>
                </div>
              </div>
              <div class="phonetic">Som conectado: ${esc(drill.phon)}</div>
              ${drill.alt && drill.alt.length ? `<div class="muted">Outras formas naturais: ${drill.alt.map(a => `<strong>${esc(a)}</strong>`).join(' • ')}</div>` : ''}
              ${ui.speedScore !== null && ui.speedScore < 95 && ui.speedInput.trim()
                ? renderMistakeCoachHtml(analyzeSentenceMistake(ui.speedInput, drill.en, drill.alt || [], ''))
                : ''
              }
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// =====================================================================
// VIEW 4: READING & SHADOWING
// =====================================================================
function renderReading() {
  const passage = READING_PASSAGES[ui.readingIdx];
  const completed = getState().completedReadings || [];

  return `
    <div class="stack-lg">
      <div class="row">
        ${READING_PASSAGES.map((p, i) => `
          <button class="btn btn-sm ${ui.readingIdx === i ? 'btn-primary' : 'btn-secondary'}" data-reading-idx="${i}">
            ${completed.includes(p.id) ? '✅ ' : ''}${i + 1}. ${esc(p.topic)}
          </button>
        `).join('')}
      </div>

      <div class="card stack-md">
        <div class="row-between">
          <div>
            <span class="pill">${esc(passage.level)}</span>
            <h2 style="margin-top:6px;">${esc(passage.title)}</h2>
          </div>
          <div class="row">
            <select id="reading-rate-select" class="select-input" style="width:auto;">
              <option value="0.72" ${ui.readingRate === 0.72 ? 'selected' : ''}>🐢 0.72x (Bem devagar)</option>
              <option value="0.85" ${ui.readingRate === 0.85 ? 'selected' : ''}>0.85x (Treino)</option>
              <option value="0.9" ${ui.readingRate === 0.9 ? 'selected' : ''}>0.90x (Claro)</option>
              <option value="1.0" ${ui.readingRate === 1.0 ? 'selected' : ''}>1.0x (Natural)</option>
              <option value="1.15" ${ui.readingRate === 1.15 ? 'selected' : ''}>⚡ 1.15x (Rápido)</option>
            </select>
            <button class="btn btn-primary btn-sm" id="btn-read-all">${iconHtml("play", 14)} Ouvir Texto Todo</button>
            <button class="btn ${ui.shadowingActive ? 'btn-danger' : 'btn-secondary'} btn-sm" id="btn-shadow-loop">
              ${ui.shadowingActive ? iconHtml('square', 14) + ' Parar Shadowing' : iconHtml('repeat', 14) + ' Shadowing Loop'}
            </button>
          </div>
        </div>

        <div class="row">
          <button class="btn btn-ghost btn-sm" id="toggle-read-phon">${ui.readingShowPhon ? '✓' : '○'} Pronúncia Conectada</button>
          <button class="btn btn-ghost btn-sm" id="toggle-read-traps">${ui.readingShowTraps ? '✓' : '○'} Pegadinhas de Leitura</button>
          <button class="btn btn-ghost btn-sm" id="toggle-read-pt">${ui.readingShowPt ? '✓' : '○'} Tradução PT</button>
          <span class="muted" style="margin-left:auto;">Clique em qualquer palavra para ouvir isolada</span>
        </div>

        ${ui.readingSelectedWord ? `
          <div class="row-between" style="padding:10px 14px; border-radius:10px; background:var(--primary-soft); border:1px solid var(--primary);">
            <span>Palavra selecionada: <strong style="font-size:15px;">${esc(ui.readingSelectedWord)}</strong></span>
            <div class="row">
              <button class="btn btn-primary btn-sm" data-speak-slow="${esc(ui.readingSelectedWord)}">${iconHtml("gauge", 14)} Ouvir Devagar</button>
              <a class="btn btn-secondary btn-sm" target="_blank" rel="noopener" href="https://youglish.com/pronounce/${encodeURIComponent(ui.readingSelectedWord)}/english/us">YouGlish ↗</a>
              <a class="btn btn-secondary btn-sm" target="_blank" rel="noopener" href="https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(ui.readingSelectedWord.toLowerCase())}">Cambridge ↗</a>
            </div>
          </div>
        ` : ''}

        <div class="stack-md">
          ${passage.sentences.map((s, sIdx) => {
            const fullText = s.chunks.join(' ');
            return `
              <div class="reading-sentence ${ui.readingActiveSent === sIdx ? 'active-sent' : ''}">
                <div class="row-between" style="margin-bottom:8px;">
                  <span class="mini-label">Frase ${sIdx + 1} — Blocos de sentido</span>
                  <div class="row">
                    <button class="btn btn-secondary btn-sm" data-read-sent="${sIdx}">${iconHtml("volume-2", 14)} Ouvir Frase</button>
                    <button class="btn btn-ghost btn-sm" data-shadow-sent="${sIdx}">${iconHtml("repeat", 14)} Repetir 2x</button>
                  </div>
                </div>
                <div>
                  ${s.chunks.map(chunk => `
                    <span class="chunk-pill">
                      ${chunk.split(/\s+/).map(w => {
                        const cleanWord = w.replace(/[^a-zA-Z'-]/g, '');
                        return `<button class="word-btn" data-word="${esc(cleanWord)}">${esc(w)}</button>`;
                      }).join('')}
                    </span>
                  `).join('<span class="muted" style="margin:0 4px;">/</span>')}
                </div>
                ${ui.readingShowPhon ? `<div class="phonetic" style="margin-top:8px;">Som: ${esc(s.phon)}</div>` : ''}
                ${ui.readingShowTraps ? `<div class="muted" style="margin-top:4px;"><strong>Pegadinha:</strong> ${esc(s.trap)}</div>` : ''}
                ${ui.readingShowPt ? `<div class="muted" style="margin-top:4px;">PT: ${esc(s.pt)}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="card stack-sm">
        <h3>Checagem de Compreensão</h3>
        <p style="font-weight:600;">${esc(passage.question)}</p>
        <div class="stack-sm">
          ${passage.options.map((opt, idx) => {
            let cls = 'btn btn-secondary';
            if (ui.readingQuizPicked !== null) {
              if (idx === passage.answerIndex) cls = 'btn btn-success';
              else if (idx === ui.readingQuizPicked) cls = 'btn btn-danger';
            }
            return `<button class="${cls}" style="justify-content:flex-start;" data-quiz-opt="${idx}">${esc(opt)}</button>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// =====================================================================
// VIEW 5: FREE SPEAKING STUDIO (4-3-2 + PARAPHRASE)
// =====================================================================
function formatClock(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderStudio() {
  const tabBar = `
    <div class="tabs">
      <button class="tab-btn ${ui.studioTab === '432' ? 'active' : ''}" data-studio-tab="432">${iconHtml("mic", 14)} Técnica 4-3-2 (Gravador)</button>
      <button class="tab-btn ${ui.studioTab === 'paraphrase' ? 'active' : ''}" data-studio-tab="paraphrase">${iconHtml("puzzle", 14)} Treino de Paráfrase</button>
    </div>
  `;

  if (ui.studioTab === 'paraphrase') {
    const p = PARAPHRASE_CARDS[ui.paraIdx];
    return `
      <div class="stack-lg">
        ${tabBar}
        <div class="flashcard-stage stack-md">
          <div class="card stack-md">
            <div class="row-between">
              <span class="pill">Regra: Explique em inglês SEM usar as palavras proibidas!</span>
              <span class="muted">${ui.paraIdx + 1} / ${PARAPHRASE_CARDS.length}</span>
            </div>
            <h2 style="font-size:26px;">${esc(p.target)}</h2>
            <div>
              <div class="mini-label" style="margin-bottom:6px;">Proibido falar:</div>
              <div class="row">
                ${p.forbidden.map(w => `<span class="btn btn-danger btn-sm" style="cursor:default;">${esc(w)}</span>`).join('')}
              </div>
            </div>
            <div class="row-between" style="padding-top:8px;">
              <button class="btn btn-primary" id="btn-para-toggle">
                ${ui.paraShowExample ? 'Esconder Exemplo' : 'Ver Exemplo Natural + Ouvir'}
              </button>
              <div class="row">
                <button class="btn btn-secondary btn-sm" id="btn-para-prev">← Anterior</button>
                <button class="btn btn-secondary btn-sm" id="btn-para-next">Próximo →</button>
              </div>
            </div>
            ${ui.paraShowExample ? `
              <div class="flashcard-answer">
                <div class="flashcard-en" style="color:var(--accent);">"${esc(p.example)}"</div>
                <div>
                  <button class="btn btn-secondary btn-sm" data-speak="${esc(p.example)}">${iconHtml("volume-2", 14)} Ouvir Exemplo</button>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // 4-3-2 STUDIO
  const topic = SPEAKING_TOPICS_432[ui.topicIdx];
  return `
    <div class="stack-lg">
      ${tabBar}
      <div class="grid-2">
        <div class="card stack-md">
          <div class="row-between">
            <span class="pill">Tema #${ui.topicIdx + 1}</span>
            <button class="btn btn-secondary btn-sm" id="btn-next-topic">${iconHtml("shuffle", 14)} Trocar Tema</button>
          </div>
          <h2>${esc(topic.title)}</h2>
          <p class="muted">${esc(topic.prompt)}</p>

          <div class="stack-sm" style="padding-top:6px;">
            <div class="mini-label">Escolha a Rodada (4 min → 3 min → 2 min)</div>
            <div class="row">
              <button class="btn btn-sm ${ui.roundSeconds === 240 ? 'btn-primary' : 'btn-secondary'}" data-round-sec="240">Rodada 1 • 4 min</button>
              <button class="btn btn-sm ${ui.roundSeconds === 180 ? 'btn-primary' : 'btn-secondary'}" data-round-sec="180">Rodada 2 • 3 min</button>
              <button class="btn btn-sm ${ui.roundSeconds === 120 ? 'btn-primary' : 'btn-secondary'}" data-round-sec="120">Rodada 3 • 2 min</button>
              <button class="btn btn-sm ${ui.roundSeconds === 60 ? 'btn-primary' : 'btn-secondary'}" data-round-sec="60">Sprint • 1 min</button>
            </div>
          </div>

          <div class="row-between" style="padding:14px 16px; border-radius:12px; background:var(--bg-elev); border:1px solid var(--border);">
            <div class="timer-display" id="studio-clock">${formatClock(ui.timerLeft)}</div>
            <div class="stack-sm">
              ${!ui.timerRunning ? `
                <button class="btn btn-primary" id="btn-start-432">${iconHtml("mic", 15)} Iniciar Gravação + Timer</button>
                <button class="btn btn-ghost btn-sm" id="btn-timer-only">${iconHtml("play", 14)} Só Cronômetro</button>
              ` : `
                <button class="btn btn-danger mic-pulse" id="btn-stop-432">${iconHtml("square", 14)} Encerrar &amp; Salvar Áudio</button>
              `}
            </div>
          </div>

          <div class="muted">
            💡 <strong>Como funciona:</strong> Fale sobre o mesmo tema 3 vezes diminuindo o tempo (4 → 3 → 2 min). Entre uma rodada e outra, anote 2 palavras que faltaram e repita!
          </div>
        </div>

        <div class="card stack-md">
          <div class="row-between">
            <h3>Suas Gravações &amp; Transcrição</h3>
            <button class="btn btn-secondary btn-sm" id="studio-add-gap">+ Salvar Palavra que Travou</button>
          </div>

          ${ui.transcript ? `
            <div style="padding:12px; border-radius:10px; background:var(--bg-elev); border:1px solid var(--border);">
              <div class="mini-label" style="margin-bottom:4px;">Transcrição ao vivo (en-US)</div>
              <div style="font-size:13px;">${esc(ui.transcript)}</div>
            </div>
          ` : `<p class="muted">Quando você gravar pelo Chrome/Edge, sua transcrição ao vivo em inglês aparece aqui junto com o áudio para você se ouvir.</p>`}

          <div class="stack-sm">
            ${ui.recordings.length === 0
              ? '<div class="muted">Nenhuma gravação nesta sessão ainda.</div>'
              : ui.recordings.map(r => `
                <div style="padding:10px 12px; border-radius:10px; background:var(--bg-elev); border:1px solid var(--border);" class="stack-sm">
                  <div class="row-between">
                    <strong style="font-size:13px;">${esc(r.label)}</strong>
                    <span class="muted">${esc(r.duration)}</span>
                  </div>
                  <audio controls src="${r.url}" style="width:100%; height:34px;"></audio>
                </div>
              `).join('')
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

// =====================================================================
// VIEW 6: DIÁRIO DE LACUNAS & ARSENAL
// =====================================================================
function renderArsenal() {
  const custom = getState().customCards || [];
  const resources = [
    { name: 'Engoo Daily News', desc: 'Artigos curtos nível Intermediate (5–6) com vocabulário e perguntas de discussão.', url: 'https://engoo.com.br/app/daily-news' },
    { name: 'YouGlish (US)', desc: 'Ouça qualquer palavra pronunciada por nativos em dezenas de vídeos reais.', url: 'https://youglish.com' },
    { name: 'Cambridge Dictionary', desc: 'Significados claros, exemplos naturais, áudio US/UK e tag de nível B1/B2.', url: 'https://dictionary.cambridge.org' },
    { name: 'Oxford 3000 Wordlist', desc: 'As 3.000 palavras mais frequentes que cobrem ~90% do inglês real.', url: 'https://www.oxfordlearnersdictionaries.com/wordlists/oxford3000-5000' },
    { name: 'BBC 6 Minute English', desc: 'Episódios curtos de 6 minutos com transcrição completa para fazer shadowing.', url: 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english' },
    { name: 'TED Talks (Transcript)', desc: 'Vídeos curtos com transcrição clicável frase por frase.', url: 'https://www.ted.com/talks' }
  ];

  return `
    <div class="stack-lg">
      <div class="card stack-md">
        <div class="row-between">
          <div>
            <h2>${iconHtml("notebook-pen", 18)} Seu Diário de Lacunas (${custom.length})</h2>
            <p class="muted">Toda palavra que faltou na sua cabeça durante o dia fica aqui e entra direto no deck de Vocabulário Ativo (SRS).</p>
          </div>
          <button class="btn btn-primary" id="arsenal-add-gap">+ Adicionar Lacuna</button>
        </div>

        ${custom.length === 0 ? `
          <div class="muted">Nenhuma lacuna salva ainda. Sempre que pensar "como eu falaria isso em inglês?", adicione aqui!</div>
        ` : `
          <div class="stack-sm">
            ${custom.map(c => `
              <div class="row-between" style="padding:12px; border-radius:10px; background:var(--bg-elev); border:1px solid var(--border);">
                <div>
                  <div><strong>${esc(c.chunk)}</strong> — <span class="muted">${esc(c.pt)}</span></div>
                  <div style="font-size:13px;">${esc(c.en)}</div>
                </div>
                <div class="row">
                  <button class="btn btn-secondary btn-sm" data-speak="${esc(c.en)}">${iconHtml("volume-2", 14)}</button>
                  <button class="btn btn-danger btn-sm" data-del-custom="${c.id}">Excluir</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <div class="card stack-md">
        <div>
          <h2>${iconHtml("volume-2", 18)} As ${PRONUNCIATION_RULES.length} Regras de Ouro de Leitura &amp; Pronúncia</h2>
          <p class="muted">Clique em qualquer exemplo para ouvir o som real e eliminar o vício de ler inglês como português.</p>
        </div>
        <div class="stack-md">
          ${PRONUNCIATION_RULES.map(rule => `
            <div style="padding:14px; border-radius:12px; background:var(--bg-elev); border:1px solid var(--border);" class="stack-sm">
              <strong>${esc(rule.title)}</strong>
              <p class="muted">${esc(rule.desc)}</p>
              <div class="grid-2">
                ${rule.examples.map(ex => `
                  <div class="row-between" style="padding:9px 12px; border-radius:9px; background:var(--card); border:1px solid var(--border);">
                    <div>
                      <div><strong>${esc(ex.word)}</strong> <span class="muted" style="text-decoration:line-through;">${esc(ex.wrong)}</span> → <span class="phonetic">${esc(ex.right)}</span></div>
                      <div class="muted" style="font-size:12px;">${esc(ex.phrase)}</div>
                    </div>
                    <button class="btn btn-secondary btn-sm" data-speak-slow="${esc(ex.phrase)}">${iconHtml("volume-2", 14)}</button>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card stack-md">
        <h2>${iconHtml("globe", 18)} Arsenal Externo Gratuito</h2>
        <div class="grid-3">
          ${resources.map(r => `
            <a class="card card-interactive stack-sm" target="_blank" rel="noopener" href="${r.url}" style="text-decoration:none; color:inherit;">
              <strong>${esc(r.name)} ↗</strong>
              <span class="muted">${esc(r.desc)}</span>
            </a>
          `).join('')}
        </div>
      </div>

      <div class="card row-between">
        <div>
          <h3>${iconHtml("hard-drive", 17)} Backup do Progresso (PC ↔ Celular)</h3>
          <p class="muted">Exporte seu arquivo JSON para levar suas revisões, XP e Diário de Lacunas para outro dispositivo.</p>
        </div>
        <div class="row">
          <button class="btn btn-secondary btn-sm" id="btn-export-backup">${iconHtml("download", 14)} Exportar Backup (.json)</button>
          <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
            ${iconHtml("upload", 14)} Importar Backup
            <input type="file" id="input-import-backup" accept=".json,application/json" style="display:none;" />
          </label>
        </div>
      </div>
    </div>
  `;
}

// =====================================================================
// RENDER & EVENT BINDING
// =====================================================================
function renderView() {
  const root = document.getElementById('view-root');
  if (currentView === 'path') root.innerHTML = renderPathView();
  else if (currentView === 'dashboard') root.innerHTML = renderDashboard();
  else if (currentView === 'vocab') root.innerHTML = renderVocab();
  else if (currentView === 'drills') root.innerHTML = renderDrills();
  else if (currentView === 'reading') root.innerHTML = renderReading();
  else if (currentView === 'studio') root.innerHTML = renderStudio();
  else if (currentView === 'arsenal') root.innerHTML = renderArsenal();
  bindViewEvents();
  refreshIcons();
}

function bindViewEvents() {
  const root = document.getElementById('view-root');
  if (currentView === 'path') {
    bindPathEvents(root, renderView, showToast);
    return;
  }

  // Shared audio buttons
  root.querySelectorAll('[data-speak]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speak(btn.dataset.speak, 1.0);
    });
  });
  root.querySelectorAll('[data-speak-slow]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speak(btn.dataset.speakSlow, 0.72);
    });
  });
  root.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      setView(el.dataset.goto);
    });
  });
  root.querySelectorAll('[data-del-custom]').forEach(btn => {
    btn.addEventListener('click', () => {
      removeCustomCard(btn.dataset.delCustom);
      showToast('Expressão removida do Diário.');
      renderView();
    });
  });

  // Dashboard checklist
  root.querySelectorAll('[data-toggle-turn]').forEach(item => {
    item.addEventListener('click', () => {
      const key = item.dataset.toggleTurn;
      let becameDone = false;
      updateState(s => {
        const next = !s.dailyChecklist[key];
        becameDone = next;
        s.dailyChecklist[key] = next;
        if (next) s.xpToday = (s.xpToday || 0) + 20;
      });
      if (becameDone) playCorrect();
      else playClick();
      renderView();
    });
  });

  // Vocab events
  root.querySelectorAll('[data-vocab-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.vocabMode = btn.dataset.vocabMode;
      renderView();
    });
  });
  root.querySelectorAll('[data-deck]').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.vocabDeck = btn.dataset.deck;
      ui.vocabQueueIdx = 0;
      ui.vocabRevealed = false;
      ui.vocabShowHint = false;
      ui.vocabFreeReview = false;
      ui.vocabSpoken = '';
      ui.vocabScore = null;
      renderView();
    });
  });
  const searchInput = document.getElementById('vocab-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      ui.vocabSearch = e.target.value;
      renderView();
      const el = document.getElementById('vocab-search-input');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    });
  }
  const addGapVocab = document.getElementById('vocab-add-gap') || document.getElementById('studio-add-gap') || document.getElementById('arsenal-add-gap');
  if (addGapVocab) addGapVocab.addEventListener('click', openGapModal);

  const btnExport = document.getElementById('btn-export-backup');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const blob = new Blob([exportProgressJson()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fluencyforge-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup baixado com sucesso!');
    });
  }
  const inputImport = document.getElementById('input-import-backup');
  if (inputImport) {
    inputImport.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        importProgressJson(text);
        showToast('Progresso restaurado com sucesso!');
        renderView();
      } catch (err) {
        showToast('Arquivo de backup inválido.');
      }
    });
  }

  const btnFree = document.getElementById('btn-free-review');
  if (btnFree) {
    btnFree.addEventListener('click', () => {
      ui.vocabFreeReview = true;
      ui.vocabQueueIdx = 0;
      ui.vocabRevealed = false;
      renderView();
    });
  }
  const btnHint = document.getElementById('btn-toggle-hint');
  if (btnHint) {
    btnHint.addEventListener('click', () => {
      ui.vocabShowHint = !ui.vocabShowHint;
      renderView();
    });
  }
  const btnReveal = document.getElementById('btn-reveal-card');
  if (btnReveal) {
    btnReveal.addEventListener('click', revealCurrentVocab);
  }
  root.querySelectorAll('[data-rate]').forEach(btn => {
    btn.addEventListener('click', () => rateCurrentVocab(btn.dataset.rate));
  });
  const btnVocabMic = document.getElementById('btn-vocab-mic');
  if (btnVocabMic) {
    btnVocabMic.addEventListener('click', toggleVocabMic);
  }
  const btnVocabShuffle = document.getElementById('btn-vocab-shuffle');
  if (btnVocabShuffle) {
    btnVocabShuffle.addEventListener('click', () => {
      const queue = getActiveVocabQueue();
      if (queue.length > 1) {
        let next = ui.vocabQueueIdx;
        while (next === ui.vocabQueueIdx) next = Math.floor(Math.random() * queue.length);
        ui.vocabQueueIdx = next;
        ui.vocabRevealed = false;
        ui.vocabShowHint = false;
        ui.vocabSpoken = '';
        ui.vocabScore = null;
        renderView();
      }
    });
  }

  // Drills events
  root.querySelectorAll('[data-drills-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.drillsTab = btn.dataset.drillsTab;
      renderView();
    });
  });
  root.querySelectorAll('[data-builder-sc]').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.builderScenario = Number(btn.dataset.builderSc);
      ui.builderPicks = [0, 0, 0];
      renderView();
    });
  });
  root.querySelectorAll('[data-pick-col]').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.builderPicks[Number(btn.dataset.pickCol)] = Number(btn.dataset.pickIdx);
      renderView();
    });
  });
  const btnRand = document.getElementById('btn-builder-random');
  if (btnRand) {
    btnRand.addEventListener('click', () => {
      const sc = BUILDER_SCENARIOS[ui.builderScenario];
      ui.builderPicks = sc.cols.map(col => Math.floor(Math.random() * col.items.length));
      renderView();
      const text = sc.cols.map((c, i) => c.items[ui.builderPicks[i]].en).join(' ');
      speak(text, 0.95);
    });
  }
  const speedInput = document.getElementById('speed-input');
  if (speedInput) {
    speedInput.addEventListener('input', (e) => { ui.speedInput = e.target.value; });
    speedInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkSpeedDrill(); });
  }
  const btnSpeedCheck = document.getElementById('btn-speed-check');
  if (btnSpeedCheck) btnSpeedCheck.addEventListener('click', checkSpeedDrill);
  const btnSpeedSkip = document.getElementById('btn-speed-skip');
  if (btnSpeedSkip) {
    btnSpeedSkip.addEventListener('click', () => {
      ui.speedChecked = true;
      ui.speedScore = null;
      speak(SPEED_DRILLS[ui.speedIdx].en, 0.95);
      renderView();
    });
  }
  const getFilteredSpeedPool = () => {
    const completed = getState().completedDrills || [];
    const pool = SPEED_DRILLS.map((d, i) => ({ d, i })).filter(({ d }) => {
      const tagMatch = ui.speedFilter === 'all' || d.tag.toLowerCase().includes(ui.speedFilter.toLowerCase());
      const pendingMatch = !ui.speedOnlyPending || !completed.includes(d.id);
      return tagMatch && pendingMatch;
    }).map(x => x.i);
    return pool.length ? pool : SPEED_DRILLS.map((_, i) => i);
  };
  const speedFilterSel = document.getElementById('speed-filter-select');
  if (speedFilterSel) {
    speedFilterSel.addEventListener('change', (e) => {
      ui.speedFilter = e.target.value;
      const pool = getFilteredSpeedPool();
      ui.speedIdx = pool[0];
      ui.speedInput = ''; ui.speedChecked = false; ui.speedScore = null;
      renderView();
    });
  }
  const btnSpeedPending = document.getElementById('btn-speed-pending');
  if (btnSpeedPending) {
    btnSpeedPending.addEventListener('click', () => {
      ui.speedOnlyPending = !ui.speedOnlyPending;
      const pool = getFilteredSpeedPool();
      ui.speedIdx = pool[0];
      ui.speedInput = ''; ui.speedChecked = false; ui.speedScore = null;
      renderView();
    });
  }
  const btnSpeedRandom = document.getElementById('btn-speed-random');
  if (btnSpeedRandom) {
    btnSpeedRandom.addEventListener('click', () => {
      const pool = getFilteredSpeedPool();
      ui.speedIdx = pool[Math.floor(Math.random() * pool.length)];
      ui.speedInput = ''; ui.speedChecked = false; ui.speedScore = null;
      renderView();
    });
  }
  const btnSpeedPrev = document.getElementById('btn-speed-prev');
  if (btnSpeedPrev) {
    btnSpeedPrev.addEventListener('click', () => {
      const pool = getFilteredSpeedPool();
      const pos = Math.max(0, pool.indexOf(ui.speedIdx));
      ui.speedIdx = pool[(pos - 1 + pool.length) % pool.length];
      ui.speedInput = ''; ui.speedChecked = false; ui.speedScore = null;
      renderView();
    });
  }
  const btnSpeedNext = document.getElementById('btn-speed-next');
  if (btnSpeedNext) {
    btnSpeedNext.addEventListener('click', () => {
      const pool = getFilteredSpeedPool();
      const pos = Math.max(0, pool.indexOf(ui.speedIdx));
      ui.speedIdx = pool[(pos + 1) % pool.length];
      ui.speedInput = ''; ui.speedChecked = false; ui.speedScore = null;
      renderView();
    });
  }
  const btnSpeedMic = document.getElementById('btn-speed-mic');
  if (btnSpeedMic) btnSpeedMic.addEventListener('click', toggleSpeedMic);

  // Reading events
  root.querySelectorAll('[data-reading-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      cleanupAsyncActivities();
      ui.readingIdx = Number(btn.dataset.readingIdx);
      ui.readingActiveSent = -1;
      ui.readingSelectedWord = '';
      ui.readingQuizPicked = null;
      renderView();
    });
  });
  const rateSel = document.getElementById('reading-rate-select');
  if (rateSel) {
    rateSel.addEventListener('change', (e) => { ui.readingRate = Number(e.target.value); });
  }
  const togglePhon = document.getElementById('toggle-read-phon');
  if (togglePhon) togglePhon.addEventListener('click', () => { ui.readingShowPhon = !ui.readingShowPhon; renderView(); });
  const toggleTraps = document.getElementById('toggle-read-traps');
  if (toggleTraps) toggleTraps.addEventListener('click', () => { ui.readingShowTraps = !ui.readingShowTraps; renderView(); });
  const togglePt = document.getElementById('toggle-read-pt');
  if (togglePt) togglePt.addEventListener('click', () => { ui.readingShowPt = !ui.readingShowPt; renderView(); });

  root.querySelectorAll('[data-word]').forEach(btn => {
    btn.addEventListener('click', () => {
      const w = btn.dataset.word;
      if (!w) return;
      ui.readingSelectedWord = w;
      speak(w, 0.78);
      renderView();
    });
  });
  root.querySelectorAll('[data-read-sent]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sIdx = Number(btn.dataset.readSent);
      const sent = READING_PASSAGES[ui.readingIdx].sentences[sIdx];
      ui.readingActiveSent = sIdx;
      renderView();
      speak(sent.chunks.join(' '), ui.readingRate);
    });
  });
  root.querySelectorAll('[data-shadow-sent]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sIdx = Number(btn.dataset.shadowSent);
      runSingleShadow(sIdx);
    });
  });
  const btnReadAll = document.getElementById('btn-read-all');
  if (btnReadAll) btnReadAll.addEventListener('click', () => playWholePassage(false));
  const btnShadowLoop = document.getElementById('btn-shadow-loop');
  if (btnShadowLoop) {
    btnShadowLoop.addEventListener('click', () => {
      if (ui.shadowingActive) {
        cleanupAsyncActivities();
        renderView();
      } else {
        playWholePassage(true);
      }
    });
  }
  root.querySelectorAll('[data-quiz-opt]').forEach(btn => {
    btn.addEventListener('click', () => {
      const picked = Number(btn.dataset.quizOpt);
      const passage = READING_PASSAGES[ui.readingIdx];
      ui.readingQuizPicked = picked;
      if (picked === passage.answerIndex) {
        playVictory();
        updateState(s => {
          if (!s.completedReadings.includes(passage.id)) {
            s.completedReadings.push(passage.id);
            s.totalReadings = (s.totalReadings || 0) + 1;
            s.xpToday = (s.xpToday || 0) + 25;
          }
        });
        showToast('Correto! +25 XP • Texto concluído!');
      } else {
        playWrong();
        showToast('Ops — releia os blocos acima e tente novamente.');
      }
      renderView();
    });
  });

  // Studio events
  root.querySelectorAll('[data-studio-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      cleanupAsyncActivities();
      ui.studioTab = btn.dataset.studioTab;
      renderView();
    });
  });
  const btnNextTopic = document.getElementById('btn-next-topic');
  if (btnNextTopic) {
    btnNextTopic.addEventListener('click', () => {
      ui.topicIdx = (ui.topicIdx + 1) % SPEAKING_TOPICS_432.length;
      renderView();
    });
  }
  root.querySelectorAll('[data-round-sec]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (ui.timerRunning) return;
      ui.roundSeconds = Number(btn.dataset.roundSec);
      ui.timerLeft = ui.roundSeconds;
      renderView();
    });
  });
  const btnStart432 = document.getElementById('btn-start-432');
  if (btnStart432) btnStart432.addEventListener('click', () => startStudioSession(true));
  const btnTimerOnly = document.getElementById('btn-timer-only');
  if (btnTimerOnly) btnTimerOnly.addEventListener('click', () => startStudioSession(false));
  const btnStop432 = document.getElementById('btn-stop-432');
  if (btnStop432) btnStop432.addEventListener('click', stopStudioSession);

  const btnParaToggle = document.getElementById('btn-para-toggle');
  if (btnParaToggle) {
    btnParaToggle.addEventListener('click', () => {
      ui.paraShowExample = !ui.paraShowExample;
      if (ui.paraShowExample) speak(PARAPHRASE_CARDS[ui.paraIdx].example, 0.95);
      renderView();
    });
  }
  const btnParaPrev = document.getElementById('btn-para-prev');
  if (btnParaPrev) {
    btnParaPrev.addEventListener('click', () => {
      ui.paraIdx = (ui.paraIdx - 1 + PARAPHRASE_CARDS.length) % PARAPHRASE_CARDS.length;
      ui.paraShowExample = false;
      renderView();
    });
  }
  const btnParaNext = document.getElementById('btn-para-next');
  if (btnParaNext) {
    btnParaNext.addEventListener('click', () => {
      ui.paraIdx = (ui.paraIdx + 1) % PARAPHRASE_CARDS.length;
      ui.paraShowExample = false;
      renderView();
    });
  }
}

// =====================================================================
// ACTIONS: VOCAB, SPEED DRILL, READING SHADOWING, STUDIO 4-3-2
// =====================================================================
function revealCurrentVocab() {
  const queue = getActiveVocabQueue();
  if (!queue.length) return;
  const card = queue[ui.vocabQueueIdx];
  playFlip();
  ui.vocabRevealed = true;
  speak(card.en, 0.95);
  renderView();
}

function rateCurrentVocab(rating) {
  const queue = getActiveVocabQueue();
  if (!queue.length) return;
  const card = queue[ui.vocabQueueIdx];
  if (rating === 'again') playWrong();
  else playCorrect();
  if (!ui.vocabFreeReview) {
    rateCard(card.id, rating);
  } else {
    addXp(5);
    ui.vocabQueueIdx = (ui.vocabQueueIdx + 1) % queue.length;
  }
  ui.vocabRevealed = false;
  ui.vocabShowHint = false;
  ui.vocabSpoken = '';
  ui.vocabScore = null;
  renderView();
}

function toggleVocabMic() {
  if (activeRecognizer) {
    try { activeRecognizer.stop(); } catch (_) {}
    activeRecognizer = null;
    renderView();
    return;
  }
  const queue = getActiveVocabQueue();
  if (!queue.length) return;
  const card = queue[ui.vocabQueueIdx];
  activeRecognizer = createRecognizer({
    continuous: false,
    onInterim: (t) => { ui.vocabSpoken = t; renderView(); },
    onFinal: (t) => {
      ui.vocabSpoken = t;
      ui.vocabScore = Math.max(similarityScore(t, card.chunk), similarityScore(t, card.en));
      renderView();
    },
    onError: (err) => { showToast(`Microfone: ${err}`); },
    onEnd: () => { activeRecognizer = null; renderView(); }
  });
  if (activeRecognizer) {
    activeRecognizer.start();
    renderView();
  }
}

function toggleSpeedMic() {
  if (activeRecognizer) {
    try { activeRecognizer.stop(); } catch (_) {}
    activeRecognizer = null;
    renderView();
    return;
  }
  activeRecognizer = createRecognizer({
    continuous: false,
    onInterim: (t) => {
      ui.speedInput = t;
      const inp = document.getElementById('speed-input');
      if (inp) inp.value = t;
    },
    onFinal: (t) => {
      ui.speedInput = t;
      activeRecognizer = null;
      checkSpeedDrill();
    },
    onError: (err) => { showToast(`Microfone: ${err}`); },
    onEnd: () => { activeRecognizer = null; renderView(); }
  });
  if (activeRecognizer) {
    activeRecognizer.start();
    renderView();
  }
}

function checkSpeedDrill() {
  const drill = SPEED_DRILLS[ui.speedIdx];
  const answer = ui.speedInput.trim();
  if (!answer) {
    showToast('Escreva ou fale sua tentativa primeiro!');
    return;
  }
  const candidates = [drill.en, ...(drill.alt || [])];
  const best = Math.max(...candidates.map(c => similarityScore(answer, c)));
  ui.speedScore = best;
  ui.speedChecked = true;
  if (best >= 75) {
    playCorrect();
    updateState(s => {
      if (!s.completedDrills.includes(drill.id)) {
        s.completedDrills.push(drill.id);
        s.totalDrills = (s.totalDrills || 0) + 1;
        s.xpToday = (s.xpToday || 0) + 15;
      }
    });
  } else {
    playWrong();
  }
  speak(drill.en, 0.95);
  renderView();
}

function waitMs(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function speakAsync(text, rate) {
  return new Promise(res => speak(text, rate, res));
}

async function runSingleShadow(sIdx) {
  const token = ++shadowToken;
  const sent = READING_PASSAGES[ui.readingIdx].sentences[sIdx];
  const text = sent.chunks.join(' ');
  ui.readingActiveSent = sIdx;
  renderView();
  await speakAsync(text, Math.min(0.82, ui.readingRate));
  if (token !== shadowToken) return;
  await waitMs(1800);
  if (token !== shadowToken) return;
  await speakAsync(text, ui.readingRate);
}

async function playWholePassage(withShadowPause) {
  const token = ++shadowToken;
  ui.shadowingActive = withShadowPause;
  const passage = READING_PASSAGES[ui.readingIdx];
  renderView();

  for (let i = 0; i < passage.sentences.length; i++) {
    if (token !== shadowToken) return;
    ui.readingActiveSent = i;
    renderView();
    const text = passage.sentences[i].chunks.join(' ');
    await speakAsync(text, ui.readingRate);
    if (token !== shadowToken) return;
    if (withShadowPause) {
      await waitMs(2400); // Pausa para você repetir em voz alta!
      if (token !== shadowToken) return;
      await speakAsync(text, ui.readingRate);
      if (token !== shadowToken) return;
      await waitMs(2000);
    } else {
      await waitMs(450);
    }
  }
  ui.shadowingActive = false;
  ui.readingActiveSent = -1;
  renderView();
}

async function startStudioSession(withMic) {
  cleanupAsyncActivities();
  ui.timerLeft = ui.roundSeconds;
  ui.timerRunning = true;
  ui.transcript = '';

  if (withMic && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        if (audioChunks.length) {
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          const topic = SPEAKING_TOPICS_432[ui.topicIdx].title;
          const elapsed = ui.roundSeconds - ui.timerLeft;
          ui.recordings.unshift({
            label: `${topic} (${Math.round(ui.roundSeconds / 60)} min)`,
            url,
            duration: `${formatClock(Math.max(1, elapsed))} gravados`
          });
          updateState(s => {
            s.totalRecordings = (s.totalRecordings || 0) + 1;
            s.xpToday = (s.xpToday || 0) + 25;
          });
          playVictory();
          showToast('Gravação salva para ouvir! +25 XP');
          renderView();
        }
      };
      mediaRecorder.start();
      ui.recording = true;

      if (hasSpeechRecognition()) {
        activeRecognizer = createRecognizer({
          continuous: true,
          onFinal: (t) => {
            ui.transcript = (ui.transcript + ' ' + t).trim();
            renderView();
          }
        });
        if (activeRecognizer) activeRecognizer.start();
      }
    } catch (err) {
      showToast('Sem acesso ao microfone — rodando só o cronômetro.');
    }
  }

  activeTimer = setInterval(() => {
    ui.timerLeft -= 1;
    const clockEl = document.getElementById('studio-clock');
    if (clockEl) clockEl.textContent = formatClock(Math.max(0, ui.timerLeft));
    if (ui.timerLeft <= 0) {
      playBell();
      stopStudioSession();
    }
  }, 1000);

  renderView();
}

function stopStudioSession() {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
  ui.timerRunning = false;
  if (activeRecognizer) {
    try { activeRecognizer.stop(); } catch (_) {}
    activeRecognizer = null;
  }
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  ui.recording = false;
  renderView();
}

// =====================================================================
// MODAL: QUICK GAP CAPTURE
// =====================================================================
function openGapModal() {
  document.getElementById('gap-modal').classList.remove('hidden');
  document.getElementById('gap-pt').focus();
}

function closeGapModal() {
  document.getElementById('gap-modal').classList.add('hidden');
  document.getElementById('gap-form').reset();
}

// =====================================================================
// BOOTSTRAP
// =====================================================================
async function boot() {
  const brandSub = document.getElementById('brand-sub');
  if (brandSub) {
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    brandSub.textContent = isLocal ? 'Imersão Ativa • Disco D:' : 'Imersão Ativa • Online';
  }
  await initStore();
  const s = getState();
  setPreferredVoice(s.preferredVoice);
  updateChrome(s);
  subscribe(updateChrome);

  // Populate Neural Voices selector
  initVoices((voices) => {
    const sel = document.getElementById('voice-select');
    const current = getState().preferredVoice || 'en-US-AndrewMultilingualNeural';
    setPreferredVoice(current);
    sel.innerHTML = voices
      .map(v => `<option value="${esc(v.id)}" ${v.id === current ? 'selected' : ''}>${esc(v.label)}</option>`)
      .join('');
  });

  document.getElementById('voice-select').addEventListener('change', (e) => {
    setPreferredVoice(e.target.value);
    updateState(st => { st.preferredVoice = e.target.value; });
    speak("Hi! Now you're listening to a natural neural voice.", 1.0);
  });

  // Nav
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      setView(btn.dataset.view);
    });
  });
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
  });

  // Global SFX toggle
  const globalSfxBtn = document.getElementById('global-sfx-toggle');
  if (globalSfxBtn) {
    globalSfxBtn.addEventListener('click', () => {
      updateState(st => { st.soundEffects = st.soundEffects === false ? true : false; });
      if (getState().soundEffects !== false) playClick();
    });
  }

  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', () => {
    playClick();
    updateState(st => { st.theme = st.theme === 'dark' ? 'light' : 'dark'; });
  });

  // Gap modal
  document.getElementById('quick-gap-btn').addEventListener('click', openGapModal);
  document.getElementById('close-gap-modal').addEventListener('click', closeGapModal);
  document.getElementById('cancel-gap-modal').addEventListener('click', closeGapModal);
  document.getElementById('gap-modal').addEventListener('click', (e) => {
    if (e.target.id === 'gap-modal') closeGapModal();
  });
  document.getElementById('gap-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pt = document.getElementById('gap-pt').value;
    const chunk = document.getElementById('gap-chunk').value;
    const en = document.getElementById('gap-en').value;
    const phon = document.getElementById('gap-phon').value;
    addCustomCard({ pt, chunk, en, phon });
    closeGapModal();
    showToast('Salvo em Minhas Lacunas (+15 XP)! Já virou flashcard SRS.');
    renderView();
  });

  // Keyboard shortcuts for Path & Vocab SRS
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (currentView === 'path') {
      if (handlePathKeydown(e, renderView)) return;
    }
    if (currentView === 'vocab' && ui.vocabMode === 'study') {
      if (e.code === 'Space' && !ui.vocabRevealed) {
        e.preventDefault();
        revealCurrentVocab();
      } else if (ui.vocabRevealed) {
        if (e.key === '1') rateCurrentVocab('again');
        else if (e.key === '2') rateCurrentVocab('hard');
        else if (e.key === '3') rateCurrentVocab('good');
        else if (e.key === '4') rateCurrentVocab('easy');
        else if (e.key.toLowerCase() === 'r') {
          const queue = getActiveVocabQueue();
          if (queue[ui.vocabQueueIdx]) speak(queue[ui.vocabQueueIdx].en, 0.95);
        }
      }
    }
  });

  renderView();
  refreshIcons();
}

boot();

