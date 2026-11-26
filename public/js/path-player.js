import { LEARNING_PATH } from './data-path.js';
import { speak, stopSpeaking, hasSpeechRecognition, createRecognizer, similarityScore } from './speech.js';
import { getState, updateState, recordWords } from './store.js';
import { analyzeSentenceMistake, renderMistakeCoachHtml } from './error-coach.js';
import { playClick, playCorrect, playWrong, playVictory, iconHtml } from './sfx.js';

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shuffleArr(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9'\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getAllLessonsFlat() {
  const list = [];
  for (const u of LEARNING_PATH) {
    for (const l of u.lessons) {
      list.push({ unit: u, lesson: l });
    }
  }
  return list;
}

// Active lesson session state
const session = {
  active: false,
  finished: false,
  unit: null,
  lesson: null,
  queue: [],
  totalInitial: 0,
  doneCount: 0,
  firstTryCorrect: 0,
  attempts: 0,

  // Current step interaction
  selectedOption: null,
  shuffledOptions: [],
  bankTokens: [],
  pickedTokens: [],
  typedText: '',
  spokenText: '',
  speakScore: null,
  checked: false,
  isCorrect: false,
  mistakeAnalysis: null,
  recognizer: null
};

export function isLessonActive() {
  return session.active;
}

export function stopLessonMedia() {
  stopSpeaking();
  if (session.recognizer) {
    try { session.recognizer.stop(); } catch (_) {}
    session.recognizer = null;
  }
}

export function exitLesson() {
  stopLessonMedia();
  session.active = false;
  session.finished = false;
}

function prepareStep() {
  stopLessonMedia();
  session.selectedOption = null;
  session.pickedTokens = [];
  session.typedText = '';
  session.spokenText = '';
  session.speakScore = null;
  session.checked = false;
  session.isCorrect = false;
  session.mistakeAnalysis = null;

  const step = session.queue[0];
  if (!step) return;

  if (step.type === 'choice' || step.type === 'listen') {
    const indexed = step.options.map((text, origIdx) => ({ text, isAnswer: origIdx === step.answer }));
    session.shuffledOptions = shuffleArr(indexed);
    if (step.type === 'listen') {
      setTimeout(() => speak(step.en, 0.92), 180);
    }
  } else if (step.type === 'wordbank') {
    const rawWords = step.en.split(/\s+/);
    const all = [...rawWords, ...(step.distractors || [])];
    session.bankTokens = shuffleArr(all.map((word, id) => ({ id, word, used: false })));
  } else if (step.type === 'speak') {
    setTimeout(() => speak(step.en, 0.92), 180);
  }
}

export function startLessonById(lessonId, rerender) {
  const found = getAllLessonsFlat().find(x => x.lesson.id === lessonId);
  if (!found) return;
  playClick();
  session.active = true;
  session.finished = false;
  session.unit = found.unit;
  session.lesson = found.lesson;
  session.queue = found.lesson.steps.map((s, idx) => ({ ...s, _origIdx: idx, _retried: false }));
  session.totalInitial = session.queue.length;
  session.doneCount = 0;
  session.firstTryCorrect = 0;
  session.attempts = 0;
  prepareStep();
  rerender();
}

export function renderPathView() {
  if (session.active) {
    return session.finished ? renderVictoryScreen() : renderLessonPlayer();
  }
  return renderPathMap();
}

function renderPathMap() {
  const s = getState();
  const completed = s.completedLessons || [];
  const unlockAll = Boolean(s.pathUnlockAll);
  const flat = getAllLessonsFlat();
  const totalLessons = flat.length;
  const doneCount = flat.filter(x => completed.includes(x.lesson.id)).length;
  const pct = Math.round((doneCount / totalLessons) * 100);

  const nextEntry = flat.find(x => !completed.includes(x.lesson.id)) || flat[flat.length - 1];

  return `
    <div class="stack-lg">
      <div class="card path-hero">
        <div class="row-between" style="gap:18px;">
          <div class="stack-sm" style="flex:1; min-width:240px;">
            <div class="row">
              <span class="pill">${iconHtml('route', 13)} Trilha Progressiva</span>
              <span class="muted"><strong>${doneCount}</strong> / ${totalLessons} lições (${pct}%)</span>
            </div>
            <h2 style="font-size:22px;">
              ${doneCount === 0
                ? 'Comece pela Lição 1 e destrave seu inglês passo a passo'
                : doneCount === totalLessons
                  ? 'Você concluiu todas as 32 lições da Trilha'
                  : `Próxima parada: ${esc(nextEntry.unit.badge)} — ${esc(nextEntry.lesson.title)}`}
            </h2>
            <div class="progress-track" style="max-width:440px;">
              <div class="progress-fill" style="width:${pct}%"></div>
            </div>
          </div>

          <div class="stack-sm" style="align-items:flex-end;">
            <button class="btn btn-primary btn-lg" data-start-lesson="${nextEntry.lesson.id}">
              ${iconHtml('play', 16)} ${doneCount === 0 ? 'Começar Lição 1 Agora' : 'Continuar Trilha'}
            </button>
            <button class="btn btn-ghost btn-sm" id="btn-toggle-unlock-all">
              ${unlockAll ? `${iconHtml('unlock', 14)} Modo Livre Ativo` : `${iconHtml('lock', 14)} Ordem Guiada (ou liberar todas)`}
            </button>
          </div>
        </div>
      </div>

      <div class="path-units-wrap">
        ${LEARNING_PATH.map((unit) => {
          const unitDone = unit.lessons.filter(l => completed.includes(l.id)).length;
          return `
            <section class="path-unit">
              <div class="path-unit-header" style="border-left: 5px solid ${unit.color};">
                <div>
                  <div class="row" style="gap:8px;">
                    <span class="pill" style="background:${unit.color}1a; color:${unit.color}; border-color:${unit.color}44;">${esc(unit.badge)}</span>
                    <span class="muted">${unitDone}/${unit.lessons.length} lições</span>
                  </div>
                  <h3 style="margin-top:6px; font-size:18px;">${esc(unit.title)}</h3>
                  <p class="muted">${esc(unit.desc)}</p>
                </div>
              </div>

              <div class="path-nodes-col">
                ${unit.lessons.map((lesson, lIdx) => {
                  const globalIdx = flat.findIndex(x => x.lesson.id === lesson.id);
                  const isDone = completed.includes(lesson.id);
                  const prevDone = globalIdx === 0 || completed.includes(flat[globalIdx - 1].lesson.id);
                  const isCurrent = !isDone && prevDone;
                  const isLocked = !isDone && !isCurrent && !unlockAll;

                  const offsets = [0, 56, 0, -56];
                  const offsetPx = offsets[lIdx % offsets.length];
                  const stateClass = isDone ? 'node-done' : isCurrent ? 'node-current' : isLocked ? 'node-locked' : 'node-open';
                  const nodeIconName = isLocked ? 'lock' : isDone ? 'check' : (lesson.icon || 'book-open');

                  return `
                    <div class="path-node-row" style="transform: translateX(${offsetPx}px);">
                      ${isCurrent ? `<div class="start-bubble">COMEÇAR</div>` : ''}
                      <button
                        class="path-node-btn ${stateClass}"
                        style="${isCurrent ? `background:${unit.color};` : ''}"
                        ${isLocked ? 'disabled' : `data-start-lesson="${lesson.id}"`}
                        title="${esc(lesson.title)}"
                      >
                        <span class="path-node-icon">${iconHtml(nodeIconName, 26)}</span>
                      </button>
                      <div class="path-node-meta">
                        <div class="path-node-title">${esc(lesson.title)}</div>
                        <div class="path-node-sub">
                          ${isDone ? 'Concluída — clique para revisar' : isCurrent ? `+${lesson.xp} XP • ${lesson.steps.length} exercícios` : isLocked ? 'Complete a lição anterior' : `Disponível • +${lesson.xp} XP`}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </section>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderLessonPlayer() {
  const step = session.queue[0];
  const progressPct = Math.min(100, Math.round((session.doneCount / session.totalInitial) * 100));
  const soundOn = getState().soundEffects !== false;

  let bodyHtml = '';

  if (step.type === 'choice') {
    bodyHtml = `
      <div class="stack-md">
        <span class="pill" style="width:fit-content;">${iconHtml('zap', 13)} Escolha a resposta natural</span>
        <h2 style="font-size:21px; line-height:1.35;">${esc(step.prompt)}</h2>
        <div class="stack-sm">
          ${session.shuffledOptions.map((opt, idx) => {
            let cls = 'duo-opt';
            if (session.checked) {
              if (opt.isAnswer) cls += ' duo-opt-correct';
              else if (session.selectedOption === idx) cls += ' duo-opt-wrong';
            } else if (session.selectedOption === idx) {
              cls += ' duo-opt-selected';
            }
            return `
              <button class="${cls}" data-duo-opt="${idx}" ${session.checked ? 'disabled' : ''}>
                <span class="duo-opt-key">${idx + 1}</span>
                <span style="flex:1;">${esc(opt.text)}</span>
                ${!/[ãõçáéíóú]/i.test(opt.text) ? `<span class="muted" title="Ouvir opção">${iconHtml('volume-2', 15)}</span>` : ''}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } else if (step.type === 'listen') {
    bodyHtml = `
      <div class="stack-md">
        <span class="pill" style="width:fit-content;">${iconHtml('headphones', 13)} Ouça e escolha o sentido certo</span>
        <div class="row" style="padding:12px 0;">
          <button class="btn btn-primary btn-lg" id="btn-duo-listen">${iconHtml('volume-2', 17)} Ouvir Áudio</button>
          <button class="btn btn-secondary" id="btn-duo-listen-slow">${iconHtml('gauge', 15)} Devagar (0.75x)</button>
        </div>
        ${session.checked ? `<div class="card" style="padding:12px 14px;"><strong>Áudio:</strong> "${esc(step.en)}" <div class="phonetic">${esc(step.phon)}</div></div>` : ''}
        <div class="stack-sm">
          ${session.shuffledOptions.map((opt, idx) => {
            let cls = 'duo-opt';
            if (session.checked) {
              if (opt.isAnswer) cls += ' duo-opt-correct';
              else if (session.selectedOption === idx) cls += ' duo-opt-wrong';
            } else if (session.selectedOption === idx) {
              cls += ' duo-opt-selected';
            }
            return `
              <button class="${cls}" data-duo-opt="${idx}" ${session.checked ? 'disabled' : ''}>
                <span class="duo-opt-key">${idx + 1}</span>
                <span>${esc(opt.text)}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } else if (step.type === 'wordbank') {
    bodyHtml = `
      <div class="stack-md">
        <span class="pill" style="width:fit-content;">${iconHtml('puzzle', 13)} Monte a frase clicando nas palavras</span>
        <h2 style="font-size:21px;">"${esc(step.pt)}"</h2>

        <div class="word-tray" id="word-tray">
          ${session.pickedTokens.length === 0
            ? '<span class="muted">Clique nas palavras abaixo na ordem correta...</span>'
            : session.pickedTokens.map((tokIdx, pos) => {
                const tok = session.bankTokens[tokIdx];
                return `<button class="word-chip chip-picked" data-unpick="${pos}" ${session.checked ? 'disabled' : ''}>${esc(tok.word)}</button>`;
              }).join('')
          }
        </div>

        <div class="word-bank">
          ${session.bankTokens.map((tok, idx) => `
            <button class="word-chip ${tok.used ? 'chip-used' : ''}" data-pick="${idx}" ${tok.used || session.checked ? 'disabled' : ''}>
              ${esc(tok.word)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  } else if (step.type === 'speak') {
    bodyHtml = `
      <div class="stack-md">
        <span class="pill" style="width:fit-content;">${iconHtml('mic', 13)} Pronúncia &amp; Fala em Voz Alta</span>
        <div class="muted">Ouça o modelo neural e fale esta frase em voz alta imitando o som ligado:</div>
        <div class="card stack-sm" style="background:var(--bg);">
          <div style="font-size:22px; font-weight:700;">"${esc(step.en)}"</div>
          <div class="phonetic">Som ligado: ${esc(step.phon)}</div>
          <div class="muted">PT: ${esc(step.pt)}</div>
          <div class="row" style="padding-top:6px;">
            <button class="btn btn-primary btn-sm" id="btn-duo-listen">${iconHtml('volume-2', 15)} Ouvir Modelo</button>
            <button class="btn btn-secondary btn-sm" id="btn-duo-listen-slow">${iconHtml('gauge', 15)} 0.75x</button>
          </div>
        </div>

        <div class="row">
          ${hasSpeechRecognition() ? `
            <button class="btn btn-secondary ${session.recognizer ? 'mic-pulse btn-danger' : ''}" id="btn-duo-mic" ${session.checked ? 'disabled' : ''}>
              ${session.recognizer ? `${iconHtml('square', 14)} Ouvindo sua voz...` : `${iconHtml('mic', 15)} Testar no Microfone`}
            </button>
          ` : ''}
          ${!session.checked ? `
            <button class="btn btn-success" id="btn-duo-spoke-ok">${iconHtml('check', 15)} Já falei em voz alta</button>
          ` : ''}
        </div>

        ${session.spokenText ? `
          <div class="muted">
            O navegador ouviu: <strong>"${esc(session.spokenText)}"</strong>
            ${session.speakScore !== null ? `<span class="pill" style="margin-left:6px;">${session.speakScore}% parecido</span>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  } else if (step.type === 'type') {
    bodyHtml = `
      <div class="stack-md">
        <span class="pill" style="width:fit-content;">${iconHtml('pen-line', 13)} Escreva (ou dite) em inglês sem tradutor</span>
        <h2 style="font-size:21px;">"${esc(step.pt)}"</h2>
        <div class="row" style="align-items:stretch;">
          <input type="text" id="duo-type-input" value="${esc(session.typedText)}" ${session.checked ? 'disabled' : ''} placeholder="Digite em inglês e aperte Enter..." style="flex:1; font-size:16px; padding:13px;" />
          ${hasSpeechRecognition() ? `
            <button class="btn btn-secondary ${session.recognizer ? 'mic-pulse btn-danger' : ''}" id="btn-duo-type-mic" ${session.checked ? 'disabled' : ''}>
              ${session.recognizer ? `${iconHtml('square', 14)} Ouvindo...` : `${iconHtml('mic', 15)} Ditar`}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  const canCheck = !session.checked && (
    ((step.type === 'choice' || step.type === 'listen') && session.selectedOption !== null) ||
    (step.type === 'wordbank' && session.pickedTokens.length > 0) ||
    (step.type === 'type' && session.typedText.trim().length > 0)
  );

  return `
    <div class="lesson-arena">
      <div class="row-between" style="margin-bottom:18px;">
        <button class="btn btn-ghost btn-sm" id="btn-duo-exit">${iconHtml('x', 15)} Sair da Lição</button>
        <div class="progress-track" style="flex:1; height:12px;">
          <div class="progress-fill" style="width:${progressPct}%;"></div>
        </div>
        <span class="muted mono">${session.doneCount}/${session.totalInitial}</span>
        <button class="btn btn-ghost btn-sm" id="btn-duo-sound" title="Som de acerto/erro">
          ${soundOn ? iconHtml('bell', 15) : iconHtml('bell-off', 15)}
        </button>
      </div>

      <div class="muted row" style="margin-bottom:10px; font-size:12px; gap:6px;">
        <span>${esc(session.unit.badge)}</span> • <strong>${esc(session.lesson.title)}</strong>
        ${step._retried ? `<span class="pill" style="color:var(--warning);">${iconHtml('repeat', 12)} Revisando erro</span>` : ''}
      </div>

      <div class="flashcard">
        ${bodyHtml}

        ${!session.checked ? (
          step.type === 'speak' ? '' : `
            <div class="row-end" style="padding-top:10px; border-top:1px solid var(--border);">
              <button class="btn btn-primary btn-lg" id="btn-duo-check" ${canCheck ? '' : 'disabled'}>
                Verificar (Enter)
              </button>
            </div>
          `
        ) : `
          <div class="duo-feedback ${session.isCorrect ? 'duo-fb-ok' : 'duo-fb-err'}">
            <div class="stack-sm" style="flex:1; min-width:260px;">
              <div class="row" style="font-size:16px; font-weight:800; gap:7px;">
                ${session.isCorrect
                  ? `${iconHtml('check-circle-2', 18)} Perfeito! Mandou bem!`
                  : `${iconHtml('x-circle', 18)} Quase! Veja o erro e por que a nova forma está certa:`}
              </div>
              ${!session.isCorrect && session.mistakeAnalysis
                ? renderMistakeCoachHtml(session.mistakeAnalysis)
                : (!session.isCorrect ? `
                  <div style="font-size:14px;">
                    <strong>Forma natural:</strong> ${esc(step.type === 'choice' || step.type === 'listen' ? step.options[step.answer] : step.en)}
                  </div>
                ` : '')
              }
              ${step.phon ? `<div class="phonetic">Som: ${esc(step.phon)}</div>` : ''}
              ${(session.isCorrect || !session.mistakeAnalysis) && step.explain ? `<div class="muted">${esc(step.explain)}</div>` : ''}
            </div>
            <div class="row" style="align-self:flex-end;">
              ${(step.en || step.type === 'choice') ? `<button class="btn btn-secondary btn-sm" id="btn-duo-replay">${iconHtml('volume-2', 15)} Ouvir</button>` : ''}
              <button class="btn ${session.isCorrect ? 'btn-primary' : 'btn-danger'} btn-lg" id="btn-duo-next">
                Continuar ${iconHtml('arrow-right', 16)}
              </button>
            </div>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderVictoryScreen() {
  const accuracy = session.attempts ? Math.round((session.firstTryCorrect / session.totalInitial) * 100) : 100;
  const flat = getAllLessonsFlat();
  const curIdx = flat.findIndex(x => x.lesson.id === session.lesson.id);
  const nextItem = flat[curIdx + 1] || null;

  return `
    <div class="lesson-arena">
      <div class="flashcard stack-md" style="text-align:center; padding:42px 28px;">
        <div style="color:var(--primary); display:flex; justify-content:center;">${iconHtml('award', 52)}</div>
        <h2 style="font-size:28px;">Lição Concluída!</h2>
        <p class="muted">${esc(session.unit.badge)} — <strong>${esc(session.lesson.title)}</strong></p>

        <div class="grid-3" style="max-width:520px; margin:8px auto; width:100%;">
          <div class="card">
            <div class="stat-value" style="color:var(--primary);">+${session.lesson.xp}</div>
            <div class="stat-label">XP Ganho</div>
          </div>
          <div class="card">
            <div class="stat-value" style="color:var(--success);">${Math.min(100, accuracy)}%</div>
            <div class="stat-label">Precisão</div>
          </div>
          <div class="card">
            <div class="stat-value">${getState().streak || 1}d</div>
            <div class="stat-label">Ofensiva</div>
          </div>
        </div>

        <div class="row" style="justify-content:center; padding-top:8px;">
          ${nextItem ? `<button class="btn btn-primary btn-lg" data-start-lesson="${nextItem.lesson.id}">${iconHtml('play', 16)} Próxima: ${esc(nextItem.lesson.title)}</button>` : ''}
          <button class="btn btn-secondary btn-lg" id="btn-duo-back-map">Voltar para a Trilha</button>
        </div>
      </div>
    </div>
  `;
}

function checkCurrentStep(rerender) {
  const step = session.queue[0];
  if (!step || session.checked) return;

  session.attempts++;
  let ok = false;

  if (step.type === 'choice' || step.type === 'listen') {
    const picked = session.shuffledOptions[session.selectedOption];
    ok = Boolean(picked && picked.isAnswer);
  } else if (step.type === 'wordbank') {
    const built = session.pickedTokens.map(i => session.bankTokens[i].word).join(' ');
    ok = normalizeText(built) === normalizeText(step.en);
  } else if (step.type === 'type') {
    const candidates = [step.en, ...(step.alt || [])];
    const best = Math.max(...candidates.map(c => similarityScore(session.typedText, c)));
    ok = best >= 75;
  } else if (step.type === 'speak') {
    ok = true;
  }

  session.checked = true;
  session.isCorrect = ok;
  session.mistakeAnalysis = null;

  // Automatically log encountered/practiced English words into global Lexicon
  const lexTarget =
    step.en ||
    (step.type === 'choice' && !/[ãõçáéíóú]/i.test(step.options[step.answer]) ? step.options[step.answer] : '');
  if (lexTarget) {
    recordWords(lexTarget, {
      source: 'path',
      action: ok ? 'correct' : 'wrong',
      sample: lexTarget,
      sampleFrom: `${session.unit?.badge || 'Trilha'} — ${session.lesson?.title || ''}`
    });
  }

  if (!ok) {
    if (step.type === 'type') {
      session.mistakeAnalysis = analyzeSentenceMistake(session.typedText, step.en, step.alt || [], step.explain || '');
    } else if (step.type === 'wordbank') {
      const built = session.pickedTokens.map(i => session.bankTokens[i].word).join(' ');
      session.mistakeAnalysis = analyzeSentenceMistake(built, step.en, [], step.explain || '');
    } else if (step.type === 'choice' && session.selectedOption !== null) {
      const pickedText = session.shuffledOptions[session.selectedOption]?.text || '';
      const correctText = step.options[step.answer];
      if (!/[ãõçáéíóú]/i.test(correctText)) {
        session.mistakeAnalysis = analyzeSentenceMistake(pickedText, correctText, [], step.explain || '');
      }
    }
  }

  if (ok) {
    playCorrect();
    if (!step._retried) session.firstTryCorrect++;
    if (step.en && step.type !== 'speak') speak(step.en, 0.95);
    else if (step.type === 'choice' && !/[ãõçáéíóú]/i.test(step.options[step.answer])) {
      speak(step.options[step.answer], 0.95);
    }
  } else {
    playWrong();
    const audioText = step.en || (step.type === 'choice' && !/[ãõçáéíóú]/i.test(step.options[step.answer]) ? step.options[step.answer] : '');
    if (audioText) speak(audioText, 0.85);
  }
  rerender();
}

function advanceStep(rerender) {
  playClick();
  const current = session.queue.shift();
  if (session.isCorrect) {
    session.doneCount++;
  } else if (current) {
    session.queue.push({ ...current, _retried: true });
  }

  if (session.queue.length === 0) {
    session.finished = true;
    playVictory();
    updateState(s => {
      if (!s.completedLessons) s.completedLessons = [];
      if (!s.completedLessons.includes(session.lesson.id)) {
        s.completedLessons.push(session.lesson.id);
      }
      s.xpToday = (s.xpToday || 0) + (session.lesson.xp || 30);
    });
    rerender();
  } else {
    prepareStep();
    rerender();
  }
}

export function bindPathEvents(root, rerender, showToast) {
  root.querySelectorAll('[data-start-lesson]').forEach(btn => {
    btn.addEventListener('click', () => startLessonById(btn.dataset.startLesson, rerender));
  });

  const btnUnlock = document.getElementById('btn-toggle-unlock-all');
  if (btnUnlock) {
    btnUnlock.addEventListener('click', () => {
      playClick();
      updateState(s => { s.pathUnlockAll = !s.pathUnlockAll; });
      rerender();
    });
  }

  if (!session.active) return;

  const btnBackMap = document.getElementById('btn-duo-back-map');
  if (btnBackMap) {
    btnBackMap.addEventListener('click', () => {
      playClick();
      exitLesson();
      rerender();
    });
  }

  const btnExit = document.getElementById('btn-duo-exit');
  if (btnExit) {
    btnExit.addEventListener('click', () => {
      playClick();
      exitLesson();
      rerender();
    });
  }

  const btnSound = document.getElementById('btn-duo-sound');
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      updateState(s => { s.soundEffects = s.soundEffects === false ? true : false; });
      if (getState().soundEffects !== false) playClick();
      rerender();
    });
  }

  const step = session.queue[0];
  if (!step) return;

  root.querySelectorAll('[data-duo-opt]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (session.checked) return;
      playClick();
      session.selectedOption = Number(btn.dataset.duoOpt);
      if (step.type === 'choice' && !/[ãõçáéíóú]/i.test(session.shuffledOptions[session.selectedOption].text)) {
        speak(session.shuffledOptions[session.selectedOption].text, 0.98);
      }
      rerender();
    });
  });

  const btnListen = document.getElementById('btn-duo-listen');
  if (btnListen) btnListen.addEventListener('click', () => speak(step.en, 0.92));
  const btnListenSlow = document.getElementById('btn-duo-listen-slow');
  if (btnListenSlow) btnListenSlow.addEventListener('click', () => speak(step.en, 0.72));
  const btnReplay = document.getElementById('btn-duo-replay');
  if (btnReplay) btnReplay.addEventListener('click', () => {
    const audioText = step.en || (step.type === 'choice' ? step.options[step.answer] : '');
    if (audioText) speak(audioText, 0.92);
  });

  root.querySelectorAll('[data-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (session.checked) return;
      const idx = Number(btn.dataset.pick);
      if (session.bankTokens[idx].used) return;
      playClick();
      session.bankTokens[idx].used = true;
      session.pickedTokens.push(idx);
      speak(session.bankTokens[idx].word, 1.0);
      rerender();
    });
  });
  root.querySelectorAll('[data-unpick]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (session.checked) return;
      playClick();
      const pos = Number(btn.dataset.unpick);
      const [tokIdx] = session.pickedTokens.splice(pos, 1);
      if (tokIdx !== undefined) session.bankTokens[tokIdx].used = false;
      rerender();
    });
  });

  const typeInp = document.getElementById('duo-type-input');
  if (typeInp) {
    typeInp.focus();
    typeInp.setSelectionRange(typeInp.value.length, typeInp.value.length);
    typeInp.addEventListener('input', (e) => {
      session.typedText = e.target.value;
      const checkBtn = document.getElementById('btn-duo-check');
      if (checkBtn) checkBtn.disabled = !session.typedText.trim();
    });
    typeInp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && session.typedText.trim()) checkCurrentStep(rerender);
    });
  }

  const btnSpokeOk = document.getElementById('btn-duo-spoke-ok');
  if (btnSpokeOk) {
    btnSpokeOk.addEventListener('click', () => checkCurrentStep(rerender));
  }

  const btnMic = document.getElementById('btn-duo-mic');
  if (btnMic) {
    btnMic.addEventListener('click', () => {
      if (session.recognizer) {
        try { session.recognizer.stop(); } catch (_) {}
        session.recognizer = null;
        rerender();
        return;
      }
      playClick();
      session.recognizer = createRecognizer({
        continuous: false,
        onInterim: (t) => { session.spokenText = t; rerender(); },
        onFinal: (t) => {
          session.spokenText = t;
          session.speakScore = similarityScore(t, step.en);
          session.recognizer = null;
          if (session.speakScore >= 55) {
            checkCurrentStep(rerender);
          } else {
            playWrong();
            showToast(`Ouvi ${session.speakScore}% — tente falar um pouco mais claro ou clique em "Já falei"!`);
            rerender();
          }
        },
        onError: (err) => { showToast(`Microfone: ${err}`); session.recognizer = null; rerender(); },
        onEnd: () => { session.recognizer = null; rerender(); }
      });
      if (session.recognizer) {
        session.recognizer.start();
        rerender();
      }
    });
  }

  const btnTypeMic = document.getElementById('btn-duo-type-mic');
  if (btnTypeMic) {
    btnTypeMic.addEventListener('click', () => {
      if (session.recognizer) {
        try { session.recognizer.stop(); } catch (_) {}
        session.recognizer = null;
        rerender();
        return;
      }
      playClick();
      session.recognizer = createRecognizer({
        continuous: false,
        onInterim: (t) => { session.typedText = t; const el = document.getElementById('duo-type-input'); if (el) el.value = t; },
        onFinal: (t) => { session.typedText = t; session.recognizer = null; rerender(); },
        onError: (err) => { showToast(`Microfone: ${err}`); session.recognizer = null; rerender(); },
        onEnd: () => { session.recognizer = null; rerender(); }
      });
      if (session.recognizer) {
        session.recognizer.start();
        rerender();
      }
    });
  }

  const btnCheck = document.getElementById('btn-duo-check');
  if (btnCheck) btnCheck.addEventListener('click', () => checkCurrentStep(rerender));
  const btnNext = document.getElementById('btn-duo-next');
  if (btnNext) btnNext.addEventListener('click', () => advanceStep(rerender));
}

export function handlePathKeydown(e, rerender) {
  if (!session.active || session.finished) return false;
  const step = session.queue[0];
  if (!step) return false;

  if (e.key === 'Enter') {
    if (session.checked) {
      e.preventDefault();
      advanceStep(rerender);
      return true;
    }
    if (step.type !== 'type') {
      const btn = document.getElementById('btn-duo-check');
      if (btn && !btn.disabled) {
        e.preventDefault();
        checkCurrentStep(rerender);
        return true;
      }
    }
  }
  if (!session.checked && (step.type === 'choice' || step.type === 'listen')) {
    if (['1', '2', '3', '4'].includes(e.key)) {
      const idx = Number(e.key) - 1;
      if (session.shuffledOptions[idx]) {
        playClick();
        session.selectedOption = idx;
        rerender();
        return true;
      }
    }
  }
  return false;
}
