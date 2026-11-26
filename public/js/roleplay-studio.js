import { speak, stopSpeaking, hasSpeechRecognition, createRecognizer, similarityScore } from './speech.js';
import { addXp, addCustomCard, recordWords, updateState } from './store.js';
import { analyzeSentenceMistake, renderMistakeCoachHtml } from './error-coach.js';
import { playClick, playCorrect, playWrong, playVictory, iconHtml, refreshIcons } from './sfx.js';

export const ROLEPLAY_SCENARIOS = [
  {
    id: 'daily-standup',
    category: 'Trabalho & Tech',
    level: 'B1 • Reunião',
    title: 'Daily Standup (Squad Internacional)',
    interlocutor: 'Sarah (Tech Lead • EUA)',
    context: 'Você está na daily de manhã com o time internacional. Explique o que fez ontem, o foco de hoje e um bloqueio.',
    turns: [
      {
        promptEn: "Good morning! Could you give us a quick update on what you worked on yesterday?",
        promptPt: "Bom dia! Você pode dar um resumo rápido do que fez ontem?",
        hintPt: "Diga que ontem você terminou/trabalhou em uma tarefa (ex: página de login, API, relatório) e corrigiu um bug.",
        connectors: ['Yesterday I wrapped up...', 'I focused on...', 'I managed to fix...'],
        idealEn: "Yesterday I wrapped up the main feature and fixed a bug we found during testing.",
        upgradeNote: 'Usar "wrapped up" soa muito mais natural em daily do que "finished all".'
      },
      {
        promptEn: "Awesome, thanks! And what is your main focus for today?",
        promptPt: "Ótimo, obrigado! E qual é o seu foco principal para hoje?",
        hintPt: "Diga qual é sua prioridade hoje (ex: implementar testes, revisar PR, finalizar o deploy).",
        connectors: ['Today my main focus is...', 'I plan to...', 'Next up, I will...'],
        idealEn: "Today my main focus is finishing the integration and reviewing a couple of pull requests.",
        upgradeNote: '"A couple of" deixa sua fala fluida e natural sem parecer robótica.'
      },
      {
        promptEn: "Got it. Do you have any blockers or need help from anyone on the team?",
        promptPt: "Entendi. Você tem algum bloqueio ou precisa de ajuda de alguém do time?",
        hintPt: "Responda se está bloqueado aguardando acesso/revisão OU diga que está tudo certo por enquanto.",
        connectors: ['Actually, I am waiting on...', 'No blockers for now, thanks.', 'It would help if someone could...'],
        idealEn: "Actually, I am waiting on access to the staging environment, so if anyone can help after the call, that would be great.",
        upgradeNote: 'Dizer "waiting on access" + "after the call" é inglês corporativo de nível nativo.'
      },
      {
        promptEn: "Sure, I will ping you right after this call. Do you think we are still on track for Friday's release?",
        promptPt: "Claro, te mando mensagem logo após a call. Você acha que seguimos no prazo para a entrega de sexta?",
        hintPt: "Diga que sim se destravarem o acesso hoje, ou que talvez precisem de mais um dia.",
        connectors: ['Yes, as long as...', 'We should be on track if...', 'To be realistic, we might need...'],
        idealEn: "Yes, as long as we unblock the staging environment today, we are still on track for Friday.",
        upgradeNote: '"As long as..." (contanto que) protege você de prometer sem condição.'
      }
    ]
  },
  {
    id: 'job-interview',
    category: 'Carreira',
    level: 'B1/B2 • Entrevista',
    title: 'Entrevista de Emprego em Inglês',
    interlocutor: 'Michael (Hiring Manager • UK)',
    context: 'Entrevista para vaga remota internacional. Responda com clareza, confiança e exemplos concretos.',
    turns: [
      {
        promptEn: "Thanks for joining today! To kick things off, could you tell me a bit about yourself and your background?",
        promptPt: "Obrigado por participar! Para começar, você pode falar um pouco sobre você e sua experiência?",
        hintPt: "Apresente sua área, o que você gosta de construir/resolver e seu foco atual.",
        connectors: ["I'm a...", 'Over the past couple of years, I have focused on...', 'What I enjoy most is...'],
        idealEn: "I am a software developer focused on building fast web applications, and what I enjoy most is solving real user problems.",
        upgradeNote: 'Evite começar com "My name is... I have 20 years". Use "I am a..." + impacto.'
      },
      {
        promptEn: "That sounds great. Can you share a challenging project you worked on and how you handled it?",
        promptPt: "Muito bom. Pode compartilhar um projeto desafiador em que trabalhou e como lidou com ele?",
        hintPt: "Use o formato Problema → Ação → Resultado em 1 ou 2 frases curtas.",
        connectors: ['We faced a challenge where...', 'So I decided to...', 'As a result, we managed to...'],
        idealEn: "We faced a challenge where our system was very slow, so I redesigned the workflow and cut the loading time in half.",
        upgradeNote: '"Cut the loading time in half" é direto, mensurável e impressiona recrutadores.'
      },
      {
        promptEn: "Impressive! Why are you interested in working with an international team?",
        promptPt: "Impressionante! Por que você tem interesse em trabalhar com um time internacional?",
        hintPt: "Fale sobre aprendizado, escala global, autonomia e crescimento profissional.",
        connectors: ['I want to grow in an environment where...', 'Working with diverse perspectives helps me...', 'I am excited about...'],
        idealEn: "I want to grow in an environment where I can collaborate with talented people worldwide and work on high-impact products.",
        upgradeNote: 'Trocar "I want to earn in dollars" por "grow in a high-impact environment" eleva o nível da resposta.'
      },
      {
        promptEn: "Before we wrap up, do you have any questions for me about the role or the team?",
        promptPt: "Antes de encerrarmos, você tem alguma pergunta para mim sobre a vaga ou o time?",
        hintPt: "Faça uma pergunta inteligente sobre os primeiros 90 dias ou cultura do time.",
        connectors: ['What does success look like in the first 90 days?', 'How does the team usually handle...?', 'What is the biggest priority for...?'],
        idealEn: "Yes, what does success look like for this role during the first ninety days?",
        upgradeNote: 'Nunca diga "No questions". Essa pergunta sobre os 90 dias é padrão ouro em entrevistas.'
      }
    ]
  },
  {
    id: 'client-deadline',
    category: 'Trabalho & Tech',
    level: 'B2 • Negociação',
    title: 'Negociar Prazo com Cliente Gringo',
    interlocutor: 'Claire (Product Director • EUA)',
    context: 'O cliente pediu uma funcionalidade extra de última hora. Seja educado, firme e proponha uma alternativa inteligente.',
    turns: [
      {
        promptEn: "Hey! Thanks for jumping on a quick call. We would love to add a new export dashboard before Monday's launch. Can we squeeze that in?",
        promptPt: "Oi! Obrigado pela call rápida. Queríamos adicionar um novo dashboard de exportação antes do lançamento de segunda. Dá para encaixar?",
        hintPt: "Agradeça a ideia, mas explique com transparência o impacto no prazo de segunda.",
        connectors: ['That is a great idea, however...', 'To make sure we keep quality high...', 'If we add this now, it might impact...'],
        idealEn: "That is a great idea, however adding it now could put Monday's launch at risk.",
        upgradeNote: 'Usar "put the launch at risk" soa profissional e objetivo, nunca defensivo.'
      },
      {
        promptEn: "I see. Is there any way we can deliver at least a simpler version without delaying Monday?",
        promptPt: "Entendo. Existe alguma forma de entregar pelo menos uma versão mais simples sem atrasar segunda?",
        hintPt: "Proponha entregar o MVP/CSV simples na segunda e o dashboard completo na semana seguinte.",
        connectors: ['What we can do is...', 'We could ship a simple version on Monday and...', 'Would that work for you?'],
        idealEn: "What we can do is ship a simple CSV export on Monday and deliver the full dashboard next week. Would that work for you?",
        upgradeNote: 'Fechar com "Would that work for you?" dá sensação de parceria e controle.'
      },
      {
        promptEn: "Yes, that actually works really well! Could you send a quick summary in Slack so everyone is aligned?",
        promptPt: "Sim, isso funciona super bem! Você pode mandar um resumo rápido no Slack para alinhar todo mundo?",
        hintPt: "Confirme que vai enviar o resumo logo após a call com as datas exatas.",
        connectors: ['Absolutely, I will share...', 'Sure thing, I will post an update...', 'Right after this call I will...'],
        idealEn: "Absolutely, I will post a clear summary in Slack right after this call with both delivery dates.",
        upgradeNote: '"Right after this call" passa confiabilidade imediata.'
      }
    ]
  },
  {
    id: 'airport-customs',
    category: 'Viagens',
    level: 'A2/B1 • Viagem',
    title: 'Imigração & Aeroporto Internacional',
    interlocutor: 'Officer Davis (Border Control • EUA)',
    context: 'Você acabou de pousar nos EUA. Responda ao oficial da imigração de forma calma, direta e natural.',
    turns: [
      {
        promptEn: "Good afternoon. Passport, please. What is the purpose of your visit?",
        promptPt: "Boa tarde. Passaporte, por favor. Qual é o motivo da sua viagem?",
        hintPt: "Diga que veio a turismo/férias ou para uma conferência/negócios.",
        connectors: ['Here you go. I am here for...', 'I am visiting for tourism.', 'I am here for a business conference.'],
        idealEn: "Here you go. I am here for tourism and sightseeing.",
        upgradeNote: '"Here you go" é a expressão perfeita ao entregar um documento.'
      },
      {
        promptEn: "How long will you be staying, and where are you staying?",
        promptPt: "Quanto tempo você vai ficar e onde vai se hospedar?",
        hintPt: "Informe quantos dias/semanas e o nome do hotel ou bairro.",
        connectors: ['I will be staying for...', 'I booked a hotel in...', 'I am staying at...'],
        idealEn: "I will be staying for ten days at a hotel downtown.",
        upgradeNote: 'Não diga "I stay for ten days"; use "I will be staying for..."'
      },
      {
        promptEn: "Do you have a return ticket, and what do you do for a living back home?",
        promptPt: "Você tem passagem de volta, e com o que trabalha no seu país?",
        hintPt: "Confirme a volta e diga sua profissão de forma simples.",
        connectors: ['Yes, I fly back on...', 'I work as a...', 'Yes, my return flight is...'],
        idealEn: "Yes, my return flight is next Sunday, and I work as a software developer in Brazil.",
        upgradeNote: '"Work as a..." sempre leva o artigo "a/an" antes da profissão em inglês!'
      }
    ]
  },
  {
    id: 'hotel-problem',
    category: 'Viagens',
    level: 'A2/B1 • Dia a Dia',
    title: 'Resolver Problema no Hotel',
    interlocutor: 'Emma (Front Desk • Londres)',
    context: 'O ar-condicionado ou o Wi-Fi do seu quarto não está funcionando. Peça ajuda de forma educada.',
    turns: [
      {
        promptEn: "Hello! Welcome back to the front desk. How can I help you tonight?",
        promptPt: "Olá! Bem-vindo de volta à recepção. Como posso ajudar hoje à noite?",
        hintPt: "Explique que está no quarto 408 e o Wi-Fi (ou ar-condicionado) não está funcionando.",
        connectors: ['Hi, I am staying in room...', 'I am having a small issue with...', 'It seems that... is not working.'],
        idealEn: "Hi, I am staying in room 408 and I am having a small issue with the Wi-Fi. It is not working.",
        upgradeNote: '"Having a small issue with..." é super educado e resolve problemas mais rápido.'
      },
      {
        promptEn: "I am so sorry about that! Would you like me to send someone up, or would you prefer to switch rooms?",
        promptPt: "Sinto muito por isso! Você prefere que eu mande alguém olhar ou trocar de quarto?",
        hintPt: "Diga qual opção prefere e agradeça.",
        connectors: ['If possible, I would prefer to...', 'Sending someone up would be great...', 'Thank you so much for handling this.'],
        idealEn: "If possible, I would prefer to switch to another room because I have an early meeting tomorrow.",
        upgradeNote: '"If possible, I would prefer to..." soa extremamente polido em inglês britânico e americano.'
      }
    ]
  },
  {
    id: 'small-talk',
    category: 'Conversa Livre',
    level: 'B1 • Social',
    title: 'Small Talk & Networking Natural',
    interlocutor: 'Alex (Evento de Tecnologia)',
    context: 'Você está no intervalo de um evento ou início de uma reunião esperando os outros entrarem. Quebre o gelo!',
    turns: [
      {
        promptEn: "Hey! How is your week going so far? Are you enjoying the event?",
        promptPt: "Oi! Como está indo sua semana até agora? Está curtindo o evento?",
        hintPt: "Responda de forma leve e devolva uma pergunta aberta!",
        connectors: ['Pretty good so far, thanks!', 'It has been busy, but great.', 'What about you?'],
        idealEn: "Pretty good so far, thanks! It has been a busy week, but I am really enjoying the talks. What about you?",
        upgradeNote: 'O segredo do small talk natural é responder + devolver "What about you?"'
      },
      {
        promptEn: "Same here! I have been working on a few AI projects lately. What kind of things have you been building?",
        promptPt: "Eu também! Tenho trabalhado em alguns projetos de IA ultimamente. Que tipo de coisas você anda construindo?",
        hintPt: "Fale brevemente do que você estuda/constrói hoje e mostre entusiasmo.",
        connectors: ['Lately I have been working on...', 'I am currently building...', 'It has been super fun because...'],
        idealEn: "Lately I have been building my own web platform to help people practice English every day.",
        upgradeNote: '"Lately I have been + -ing" é o tempo verbal favorito dos nativos para novidades.'
      },
      {
        promptEn: "No way, that sounds super useful! Let's definitely stay in touch on LinkedIn.",
        promptPt: "Sério? Parece super útil! Vamos definitivamente manter contato no LinkedIn.",
        hintPt: "Concorde com energia e se despeça de forma simpática.",
        connectors: ['For sure! Let me send you...', 'Definitely, it was great talking to you!', 'I would love to connect.'],
        idealEn: "For sure, I would love to connect! It was really great talking to you.",
        upgradeNote: '"It was really great talking to you" fecha qualquer conversa com chave de ouro.'
      }
    ]
  }
];

const rp = {
  activeScenarioId: null,
  turnIdx: 0,
  hidePromptText: false,
  userInput: '',
  recognizer: null,
  messages: [], // { role: 'ai'|'user', text, score, analysis, idealEn, upgradeNote }
  finished: false,
  scores: []
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stopRoleplayStudio() {
  stopSpeaking();
  if (rp.recognizer) {
    try { rp.recognizer.stop(); } catch (_) {}
    rp.recognizer = null;
  }
}

function getScenario() {
  return ROLEPLAY_SCENARIOS.find(s => s.id === rp.activeScenarioId) || null;
}

function startScenario(id) {
  stopRoleplayStudio();
  const sc = ROLEPLAY_SCENARIOS.find(s => s.id === id);
  if (!sc) return;
  rp.activeScenarioId = id;
  rp.turnIdx = 0;
  rp.userInput = '';
  rp.finished = false;
  rp.scores = [];
  rp.messages = [{
    role: 'ai',
    text: sc.turns[0].promptEn,
    pt: sc.turns[0].promptPt
  }];
  recordWords(sc.turns[0].promptEn, {
    source: 'speaking',
    action: 'seen',
    sample: sc.turns[0].promptEn,
    sampleFrom: `Simulador — ${sc.title}`
  });
  speak(sc.turns[0].promptEn, 0.96);
}

export function renderRoleplayView() {
  const sc = getScenario();

  if (!sc) {
    return `
      <div class="stack-lg">
        <div class="card path-hero stack-sm">
          <span class="pill" style="width:fit-content;">${iconHtml('phone-call', 13)} Simulador de Calls &amp; Entrevistas com Voz Neural</span>
          <h2 style="font-size:24px;">Treine conversas reais antes da hora H</h2>
          <p class="muted">O interlocutor fala com <strong>Voz Neural</strong>, você responde falando no microfone ou digitando, e recebe <strong>correção PT → EN + versão "Como um nativo diria"</strong> em cada turno. Todas as palavras vão para o seu <strong>Banco de Palavras</strong>.</p>
        </div>

        <div class="grid-3">
          ${ROLEPLAY_SCENARIOS.map(item => `
            <div class="card card-interactive stack-sm" data-rp-start="${esc(item.id)}" style="cursor:pointer; justify-content:space-between;">
              <div class="stack-sm">
                <div class="row-between">
                  <span class="pill">${esc(item.category)}</span>
                  <span class="muted" style="font-size:11.5px; font-weight:700;">${esc(item.level)}</span>
                </div>
                <h3 style="font-size:18px;">${esc(item.title)}</h3>
                <p class="muted" style="font-size:13px;">${esc(item.context)}</p>
              </div>
              <div class="row-between" style="padding-top:8px; border-top:1px solid var(--border); font-size:12px;">
                <span class="muted">${iconHtml('user-round', 12)} ${esc(item.interlocutor)}</span>
                <strong style="color:var(--primary);">${item.turns.length} turnos →</strong>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  const curTurn = sc.turns[rp.turnIdx];
  const avgScore = rp.scores.length ? Math.round(rp.scores.reduce((a, b) => a + b, 0) / rp.scores.length) : 0;

  return `
    <div class="stack-md">
      <!-- TOP BAR -->
      <div class="card row-between" style="padding:12px 16px; flex-wrap:wrap; gap:10px;">
        <div class="row" style="gap:10px;">
          <button class="btn btn-ghost btn-sm" id="btn-rp-back">${iconHtml('arrow-left', 14)} Cenários</button>
          <div>
            <strong>${esc(sc.title)}</strong>
            <div class="muted" style="font-size:12px;">${esc(sc.interlocutor)} • Turno ${Math.min(rp.turnIdx + 1, sc.turns.length)}/${sc.turns.length}</div>
          </div>
        </div>
        <div class="row" style="gap:6px;">
          <button class="btn btn-secondary btn-sm" id="btn-rp-toggle-blind" title="Esconder texto do interlocutor para treinar só o ouvido">
            ${iconHtml(rp.hidePromptText ? 'eye' : 'eye-off', 14)} ${rp.hidePromptText ? 'Mostrar Texto' : 'Modo Só Ouvido'}
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-rp-replay">
            ${iconHtml('volume-2', 14)} Ouvir Novamente
          </button>
        </div>
      </div>

      <!-- CHAT CONVERSATION -->
      <div class="card stack-md" style="min-height:300px;">
        ${rp.messages.map((m, idx) => {
          if (m.role === 'ai') {
            return `
              <div class="rp-bubble rp-ai">
                <div class="row-between" style="margin-bottom:4px;">
                  <span class="mini-label">${esc(sc.interlocutor)}</span>
                  <button class="btn btn-ghost btn-sm" style="padding:2px 6px;" data-rp-speak-msg="${idx}">${iconHtml('volume-2', 13)}</button>
                </div>
                ${rp.hidePromptText ? `
                  <div class="muted" style="font-style:italic;">[Modo Só Ouvido ativo — clique no alto-falante para ouvir]</div>
                ` : `
                  <div style="font-size:15.5px; font-weight:600; line-height:1.45;">${esc(m.text)}</div>
                  <div class="muted" style="font-size:12px; margin-top:4px;">PT: ${esc(m.pt)}</div>
                `}
              </div>
            `;
          }
          return `
            <div class="rp-bubble rp-user stack-sm">
              <div class="row-between">
                <span class="mini-label">Sua resposta</span>
                <span class="pill" style="font-size:11px; color:${m.score >= 70 ? 'var(--success)' : 'var(--warning)'};">Clareza: ${m.score}%</span>
              </div>
              <div style="font-size:15px; font-weight:600;">"${esc(m.text)}"</div>

              ${m.analysis ? renderMistakeCoachHtml(m.analysis) : ''}

              <div class="rp-upgrade-box">
                <div class="row-between">
                  <strong style="font-size:12px; color:var(--primary);">${iconHtml('sparkles', 12)} Como um nativo diria (Upgrade):</strong>
                  <div class="row" style="gap:4px;">
                    <button class="btn btn-ghost btn-sm" style="padding:2px 6px; font-size:11px;" data-rp-speak-text="${esc(m.idealEn)}">${iconHtml('volume-2', 12)} Ouvir</button>
                    <button class="btn btn-ghost btn-sm" style="padding:2px 6px; font-size:11px;" data-rp-save-srs="${esc(m.idealEn)}">+ SRS</button>
                  </div>
                </div>
                <div style="font-size:13.5px; margin-top:4px;">"${esc(m.idealEn)}"</div>
                <div class="muted" style="font-size:12px; margin-top:2px;">${esc(m.upgradeNote)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${rp.finished ? `
        <div class="card path-hero stack-md" style="text-align:center;">
          <span class="pill" style="margin:0 auto;">${iconHtml('award', 14)} Call Finalizada!</span>
          <h2 style="font-size:24px;">Scorecard da Conversa: ${avgScore}%</h2>
          <p class="muted">Você completou os ${sc.turns.length} turnos de <strong>${esc(sc.title)}</strong> (+40 XP). Todas as palavras faladas e ouvidas já estão no seu <strong>Banco de Palavras</strong>!</p>
          <div class="row" style="justify-content:center; gap:10px;">
            <button class="btn btn-primary" id="btn-rp-restart">${iconHtml('rotate-ccw', 14)} Treinar Novamente</button>
            <button class="btn btn-secondary" id="btn-rp-back-end">Escolher Outro Cenário</button>
          </div>
        </div>
      ` : `
        <!-- ACTIVE RESPONSE COMPOSER -->
        <div class="card stack-sm">
          <div class="row-between" style="flex-wrap:wrap; gap:6px;">
            <span class="mini-label">${iconHtml('lightbulb', 12)} Dica: ${esc(curTurn.hintPt)}</span>
          </div>
          <div class="row" style="gap:6px;">
            <span class="mini-label">Ganchos anti-branco:</span>
            ${curTurn.connectors.map(c => `
              <button type="button" class="btn btn-ghost btn-sm" style="border:1px solid var(--border); font-size:12px; padding:4px 9px;" data-rp-chip="${esc(c)}">${esc(c)}</button>
            `).join('')}
          </div>
          <form id="rp-reply-form" class="row" style="align-items:stretch; gap:8px;">
            <input type="text" id="rp-input" value="${esc(rp.userInput)}" placeholder="Responda em inglês (ou clique no microfone para falar)..." style="flex:1; padding:11px 14px; font-size:14.5px;" />
            ${hasSpeechRecognition() ? `
              <button type="button" class="btn btn-secondary ${rp.recognizer ? 'btn-danger mic-pulse' : ''}" id="btn-rp-mic">
                ${rp.recognizer ? `${iconHtml('square', 14)} Parar` : `${iconHtml('mic', 14)} Falar`}
              </button>
            ` : ''}
            <button type="submit" class="btn btn-primary">${iconHtml('send', 14)} Enviar</button>
          </form>
        </div>
      `}
    </div>
  `;
}

function submitTurn(rerender, showToast) {
  const sc = getScenario();
  if (!sc || rp.finished) return;
  const turn = sc.turns[rp.turnIdx];
  const answer = rp.userInput.trim();
  if (!answer) {
    showToast('Fale no microfone ou digite sua resposta em inglês primeiro!');
    return;
  }

  const wordCount = answer.split(/\s+/).filter(Boolean).length;
  const sim = similarityScore(answer, turn.idealEn);
  const score = Math.min(100, Math.max(sim, wordCount >= 6 ? 72 : wordCount >= 4 ? 58 : 40));
  const analysis = sim < 82 ? analyzeSentenceMistake(answer, turn.idealEn, [], turn.upgradeNote) : null;

  rp.messages.push({
    role: 'user',
    text: answer,
    score,
    analysis,
    idealEn: turn.idealEn,
    upgradeNote: turn.upgradeNote
  });
  rp.scores.push(score);
  rp.userInput = '';

  recordWords(answer, {
    source: 'speaking',
    action: score >= 65 ? 'correct' : 'seen',
    sample: answer,
    sampleFrom: `Simulador — ${sc.title}`
  });
  recordWords(turn.idealEn, {
    source: 'speaking',
    action: 'seen',
    sample: turn.idealEn,
    sampleFrom: `Upgrade Nativo — ${sc.title}`
  });

  if (rp.turnIdx + 1 < sc.turns.length) {
    rp.turnIdx++;
    const nextTurn = sc.turns[rp.turnIdx];
    rp.messages.push({
      role: 'ai',
      text: nextTurn.promptEn,
      pt: nextTurn.promptPt
    });
    recordWords(nextTurn.promptEn, {
      source: 'speaking',
      action: 'seen',
      sample: nextTurn.promptEn,
      sampleFrom: `Simulador — ${sc.title}`
    });
    playCorrect();
    addXp(10);
    rerender();
    setTimeout(() => speak(nextTurn.promptEn, 0.96), 250);
  } else {
    rp.finished = true;
    playVictory();
    addXp(40);
    updateState(s => {
      s.totalRecordings = (s.totalRecordings || 0) + 1;
    });
    showToast('Simulação concluída! +40 XP');
    rerender();
  }
}

export function bindRoleplayEvents(root, rerender, showToast) {
  root.querySelectorAll('[data-rp-start]').forEach(el => {
    el.addEventListener('click', () => {
      playClick();
      startScenario(el.dataset.rpStart);
      rerender();
    });
  });

  const goBack = () => {
    playClick();
    stopRoleplayStudio();
    rp.activeScenarioId = null;
    rerender();
  };
  document.getElementById('btn-rp-back')?.addEventListener('click', goBack);
  document.getElementById('btn-rp-back-end')?.addEventListener('click', goBack);
  document.getElementById('btn-rp-restart')?.addEventListener('click', () => {
    playClick();
    startScenario(rp.activeScenarioId);
    rerender();
  });

  document.getElementById('btn-rp-toggle-blind')?.addEventListener('click', () => {
    playClick();
    rp.hidePromptText = !rp.hidePromptText;
    rerender();
  });

  document.getElementById('btn-rp-replay')?.addEventListener('click', () => {
    const sc = getScenario();
    const cur = sc?.turns[rp.turnIdx];
    if (cur) speak(cur.promptEn, 0.92);
  });

  root.querySelectorAll('[data-rp-speak-msg]').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = rp.messages[Number(btn.dataset.rpSpeakMsg)];
      if (m) speak(m.text, 0.92);
    });
  });

  root.querySelectorAll('[data-rp-speak-text]').forEach(btn => {
    btn.addEventListener('click', () => speak(btn.dataset.rpSpeakText, 0.95));
  });

  root.querySelectorAll('[data-rp-save-srs]').forEach(btn => {
    btn.addEventListener('click', () => {
      playCorrect();
      const text = btn.dataset.rpSaveSrs;
      const sc = getScenario();
      addCustomCard({
        pt: `Frase de call (${sc?.title || 'Simulador'})`,
        chunk: text.split(' ').slice(0, 4).join(' '),
        en: text,
        note: 'Salva do Simulador de Calls & Entrevistas.'
      });
      showToast('Frase salva em Minhas Lacunas (SRS)!');
    });
  });

  root.querySelectorAll('[data-rp-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      const chip = btn.dataset.rpChip.replace(/\.{3}$/, '') + ' ';
      rp.userInput = (rp.userInput ? rp.userInput.trim() + ' ' : '') + chip;
      const inp = document.getElementById('rp-input');
      if (inp) {
        inp.value = rp.userInput;
        inp.focus();
      }
    });
  });

  const inp = document.getElementById('rp-input');
  if (inp) {
    inp.addEventListener('input', (e) => { rp.userInput = e.target.value; });
  }

  document.getElementById('rp-reply-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitTurn(rerender, showToast);
  });

  document.getElementById('btn-rp-mic')?.addEventListener('click', () => {
    if (rp.recognizer) {
      try { rp.recognizer.stop(); } catch (_) {}
      rp.recognizer = null;
      rerender();
      return;
    }
    playClick();
    rp.recognizer = createRecognizer({
      continuous: false,
      onInterim: (t) => {
        rp.userInput = t;
        const el = document.getElementById('rp-input');
        if (el) el.value = t;
      },
      onFinal: (t) => {
        rp.userInput = t;
        rp.recognizer = null;
        rerender();
      },
      onError: (err) => { showToast(`Microfone: ${err}`); rp.recognizer = null; rerender(); },
      onEnd: () => { rp.recognizer = null; rerender(); }
    });
    if (rp.recognizer) {
      rp.recognizer.start();
      rerender();
    }
  });

  refreshIcons();
}
