// Smart Mistake Analyzer & Diff Coach for Brazilian Portuguese speakers learning English

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanTokens(str) {
  return String(str || '')
    .replace(/['’]/g, "'")
    .replace(/[^a-zA-Z0-9'\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function normWord(w) {
  return String(w || '').toLowerCase().replace(/[^a-z0-9']/g, '');
}

// Expand common contractions ONLY for comparison hints, while keeping exact token diffs clear
const CONTRACTION_PAIRS = [
  ["i'm", ['i', 'am']],
  ["i'll", ['i', 'will']],
  ["i've", ['i', 'have']],
  ["i'd", ['i', 'would']],
  ["we're", ['we', 'are']],
  ["we'll", ['we', 'will']],
  ["we've", ['we', 'have']],
  ["you're", ['you', 'are']],
  ["you'll", ['you', 'will']],
  ["don't", ['do', 'not']],
  ["didn't", ['did', 'not']],
  ["couldn't", ['could', 'not']],
  ["can't", ['cannot']],
  ["won't", ['will', 'not']],
  ["haven't", ['have', 'not']],
  ["isn't", ['is', 'not']],
  ["aren't", ['are', 'not']],
  ["that's", ['that', 'is']],
  ["it's", ['it', 'is']],
  ["there's", ['there', 'is']],
  ["let's", ['let', 'us']],
  ["gonna", ['going', 'to']],
  ["wanna", ['want', 'to']]
];

function expandForMatch(tokens) {
  const map = new Map(CONTRACTION_PAIRS);
  const out = [];
  for (const t of tokens) {
    const low = normWord(t);
    if (map.has(low)) out.push(...map.get(low));
    else out.push(low);
  }
  return out;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

// LCS-based word diff between userTokens and targetTokens
function computeWordDiff(userRaw, targetRaw) {
  const uToks = cleanTokens(userRaw);
  const tToks = cleanTokens(targetRaw);
  const uNorm = uToks.map(normWord);
  const tNorm = tToks.map(normWord);

  const m = uNorm.length;
  const n = tNorm.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (uNorm[i] === tNorm[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const userMarked = [];
  const targetMarked = [];
  const missing = [];
  const extra = [];
  const typos = [];

  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (uNorm[i] === tNorm[j]) {
      userMarked.push({ word: uToks[i], status: 'ok' });
      targetMarked.push({ word: tToks[j], status: 'ok' });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      userMarked.push({ word: uToks[i], status: 'wrong' });
      extra.push(uToks[i]);
      i++;
    } else {
      targetMarked.push({ word: tToks[j], status: 'added' });
      missing.push(tToks[j]);
      j++;
    }
  }
  while (i < m) {
    userMarked.push({ word: uToks[i], status: 'wrong' });
    extra.push(uToks[i]);
    i++;
  }
  while (j < n) {
    targetMarked.push({ word: tToks[j], status: 'added' });
    missing.push(tToks[j]);
    j++;
  }

  // Detect near-spelling typos among extra vs missing
  const remainingExtra = [...extra];
  const remainingMissing = [...missing];
  for (const ex of extra) {
    const exL = normWord(ex);
    if (exL.length < 3) continue;
    const matchIdx = remainingMissing.findIndex(ms => {
      const msL = normWord(ms);
      if (msL.length < 3) return false;
      const dist = levenshtein(exL, msL);
      return dist > 0 && dist <= (msL.length >= 6 ? 2 : 1);
    });
    if (matchIdx !== -1) {
      const targetW = remainingMissing[matchIdx];
      typos.push({ wrote: ex, expected: targetW });
      remainingMissing.splice(matchIdx, 1);
      const exPos = remainingExtra.indexOf(ex);
      if (exPos !== -1) remainingExtra.splice(exPos, 1);
    }
  }

  // Detect swapped order (word in both extra and missing)
  const orderSwapped = [];
  for (let k = remainingExtra.length - 1; k >= 0; k--) {
    const w = normWord(remainingExtra[k]);
    const mIdx = remainingMissing.findIndex(x => normWord(x) === w);
    if (mIdx !== -1) {
      orderSwapped.push(remainingExtra[k]);
      remainingExtra.splice(k, 1);
      remainingMissing.splice(mIdx, 1);
    }
  }

  return {
    userMarked,
    targetMarked,
    missing: remainingMissing,
    extra: remainingExtra,
    typos,
    orderSwapped
  };
}

// Specific Brazilian-Portuguese -> English diagnostic rules
const BR_ERROR_RULES = [
  {
    test: (u, t) => /\bhave\b/.test(u) && /\bthere\s+(is|are|was|were|'s)\b/.test(t),
    whyWrong: 'Você usou "have" para dizer "tem / existe". Em inglês, "have" só serve para posse (ex: "I have a car"), nunca para dizer que algo existe.',
    whyRight: 'A forma certa usa "there is / there are" (ou "there\'s"), que é a estrutura obrigatória do inglês para dizer "tem / existe".'
  },
  {
    test: (u) => /\b(didn'?t|did not)\s+can\b|\bno\s+could\b|\bcan'?t\s+\w+ed\b/.test(u),
    whyWrong: 'Em inglês não existe "didn\'t can" nem "no could". O verbo "can" é modal e tem sua própria forma negativa no passado.',
    whyRight: 'Use "couldn\'t" + verbo na forma pura (ex: "I couldn\'t finish"), sem "did" nem "-ed".'
  },
  {
    test: (u) => /\b(did|didn'?t|did not|couldn'?t|could not|can'?t|won'?t|wouldn'?t)\s+(saw|went|did|had|made|took|got|sent|told|thought|bought|brought|finished|changed|worked|started|missed|needed)\b/.test(u),
    whyWrong: 'Você conjugou o verbo principal no passado mesmo já usando um auxiliar ("did / didn\'t / couldn\'t"). Isso gera passado duplo em inglês.',
    whyRight: 'Quando já existe um auxiliar na frase, ele carrega o tempo verbal e o verbo seguinte SEMPRE volta à forma pura (ex: "Did you see", "I didn\'t get", "I couldn\'t finish").'
  },
  {
    test: (u, t) => /\b(need|want|have|had|trying|supposed)\s+for\s+[a-z]+/.test(u) && /\b(need|want|have|had|trying|supposed)\s+to\b/.test(t),
    whyWrong: 'Você usou "for" para ligar dois verbos ("need for..."). Em português dizemos "para", mas antes de verbo em inglês quase nunca se usa "for".',
    whyRight: 'Motores como "need / want / have / trying" sempre usam "to" + verbo puro (ex: "I need to talk").'
  },
  {
    test: (u, t) => /\b(need|want|have|had|going|trying|supposed)\s+(talk|speak|say|solve|fix|finish|check|change|make|do|send|explain|deliver|figure|understand|get|find|meet|leave|start)\b/.test(u) && /\bto\b/.test(t),
    whyWrong: 'Faltou o "to" entre o verbo de intenção ("need / want / have / going / trying") e a ação seguinte.',
    whyRight: 'Em inglês, dois verbos juntos precisam da ponte "to" nesses motores (ex: "need to fix", "want to say", "had to change").'
  },
  {
    test: (u) => /\b(can|could|will|would|should|must)\s+to\s+[a-z]+/.test(u),
    whyWrong: 'Você colocou "to" depois de um verbo modal ("can / could / will / should / would"). Modais nunca aceitam "to" logo depois.',
    whyRight: 'O verbo vai direto na forma pura depois do modal (ex: "Can you send", "I will help", "Could you repeat").'
  },
  {
    test: (u, t) => /\b(talk|speak|listen|explain)\s+(him|her|me|you|them|us)\b/.test(u) && /\bto\s+(him|her|me|you|them|us)\b/.test(t),
    whyWrong: 'Faltou a preposição "to" antes da pessoa ("talk him" / "listen me"). Esses verbos precisam de "to" para apontar com quem você fala.',
    whyRight: 'O padrão correto é "talk to him", "listen to me", "explain to you". (A exceção é "tell", que vai direto: "told me").'
  },
  {
    test: (u) => /\btold\s+to\s+(me|him|her|us|them|you)\b/.test(u),
    whyWrong: 'Você colocou "to" depois de "told". Diferente de "say/talk", o verbo "tell / told" vai direto para a pessoa.',
    whyRight: 'A forma natural é "He told me..." (sem "to").'
  },
  {
    test: (u, t) => /\btake\s+a\s+decision\b/.test(u) && /\bmake\s+a\s+decision\b/.test(t),
    whyWrong: 'Você traduziu "tomar uma decisão" literalmente como "take a decision", mas essa dupla não existe no inglês natural.',
    whyRight: 'Em inglês, decisões são "feitas": o par casado (collocation) correto é "make a decision".'
  },
  {
    test: (u, t) => /\bmake\s+(a\s+)?research\b/.test(u) && /\bdo\s+(some\s+)?research\b/.test(t),
    whyWrong: 'Em inglês não se usa "make" com "research" (e "research" é incontável, não leva "a").',
    whyRight: 'O par correto é "do research" ou "do some research".'
  },
  {
    test: (u, t) => /\bactually\b/.test(u) && /\bcurrently\b/.test(t),
    whyWrong: 'Falso cognato! "Actually" significa "na verdade", e NÃO "atualmente".',
    whyRight: 'Para dizer "atualmente / no momento", a palavra certa em inglês é "currently".'
  },
  {
    test: (u, t) => /\bintend\b/.test(u) && /\bpretend\b/.test(t),
    whyWrong: 'Falso cognato! "Intend" significa "pretender", enquanto "fingir" é "pretend".',
    whyRight: 'Use "pretend" para "fingir" ("Don\'t pretend you understood").'
  },
  {
    test: (u, t) => /\bpretend\b/.test(u) && /\bintend\b/.test(t),
    whyWrong: 'Falso cognato! "Pretend" significa "fingir", NÃO "pretender".',
    whyRight: 'Para "pretender / ter intenção", use "intend" ou "plan to".'
  },
  {
    test: (u, t) => /\bdoubt\b/.test(u) && /\bquestion\b/.test(t),
    whyWrong: 'Em inglês, "doubt" significa desconfiança/incerteza — não se usa para dizer "tenho uma dúvida" numa aula ou reunião.',
    whyRight: 'Quando você quer perguntar algo que não ficou claro, o certo é "I have a question".'
  },
  {
    test: (u, t) => /\b(instead of|for|without|before|after|used to|look forward to|hard time|waste time|wasting time)\s+(wait|point|think|work|delay|translate|pronounce|practice)\b/.test(u) && /\b(waiting|pointing|thinking|working|delaying|translating|pronouncing|practicing)\b/.test(t),
    whyWrong: 'Depois de preposições ("instead of, for, without") e expressões como "get used to / have a hard time / waste time", o verbo não fica no infinitivo puro.',
    whyRight: 'Nesses casos o verbo ganha "-ing" para funcionar como ação/atividade (ex: "instead of waiting", "getting used to thinking").'
  },
  {
    test: (u, t) => /\b(thinked|buyed|bringed|builded|meaned|goed|seed|taked|maded|catched|spended|sended|telled|sayed|forgetted)\b/.test(u),
    whyWrong: 'Você aplicou "-ed" em um verbo irregular. Em inglês, os verbos mais comuns mudam de forma no passado.',
    whyRight: 'Memorize o passado irregular correto mostrado acima (ex: think→thought, bring→brought, build→built, spend→spent, mean→meant).'
  },
  {
    test: (u, t) => /\balthough\b/.test(u) && /\bbut\b/.test(u),
    whyWrong: 'Você usou "although" e "but" na mesma frase. Em inglês os dois expressam contraste, então usar ambos fica redundante.',
    whyRight: 'Escolha só um deles: comece com "Although..., ..." (sem "but") OU ligue com "..., but ...".'
  },
  {
    test: (u, t) => /\buntil\b/.test(u) && /\bby\s+(friday|monday|tuesday|wednesday|thursday|tomorrow|noon|then)\b/.test(t),
    whyWrong: 'Você usou "until" para um prazo de entrega. "Until" indica algo contínuo até aquela hora (ex: trabalhar até as 18h).',
    whyRight: 'Para prazo limite de entrega ("até sexta"), o inglês usa "by" ("by Friday").'
  },
  {
    test: (u, t) => /\b(in|on)\s+silent\b|\bin\s+mute\b/.test(u) && /\bon\s+mute\b/.test(t),
    whyWrong: 'Em inglês não se diz "in mute" nem "in silent" para microfone mutado.',
    whyRight: 'A expressão fixa universal de chamadas é "on mute" ("You\'re on mute").'
  },
  {
    test: (u, t) => !/^(i|i'm|i'll|i've|i'd|you|he|she|it|we|they|there|this|that|these|those|my|our|the|a|an|let|let's|can|could|did|do|does|are|is|was|were|have|has|what|how|who|where|when|why|if|although|even|instead|despite|sorry|just|don't|do|no|all|with|in|at|on|from|sounds|good|hold|hang|go|save|stop|clear|working|manual|regardless)\b/.test(u) && /^(i|it|we|there)\b/.test(t),
    whyWrong: 'Parece que faltou o sujeito explícito no começo da frase (como "I", "It", "We" ou "There"). Diferente do português, o inglês não permite frase sem sujeito.',
    whyRight: 'Começar claramente com o sujeito deixa a frase completa e gramaticalmente correta em inglês.'
  },
  {
    test: (u, t) => /\b(i|you|we|they|he|she|it)\s+go\s+(talk|fix|speak|send|check|review|work|finish)\b/.test(u) && /\b(going to|gonna|will|'ll)\b/.test(t),
    whyWrong: 'Você traduziu "eu vou fazer" como "I go + verbo". Em inglês, "go" sozinho só serve para se deslocar fisicamente até um lugar.',
    whyRight: 'Para futuro próximo use "I\'m going to" ("I\'m gonna") ou "I\'ll" + verbo puro.'
  }
];

function pickClosestTarget(userRaw, targetEn, alternatives = []) {
  const candidates = [targetEn, ...(alternatives || [])].filter(Boolean);
  const uExp = expandForMatch(cleanTokens(userRaw));
  let best = candidates[0];
  let bestScore = -1;

  for (const cand of candidates) {
    const cExp = expandForMatch(cleanTokens(cand));
    let hits = 0;
    const copy = [...cExp];
    for (const w of uExp) {
      const idx = copy.indexOf(w);
      if (idx !== -1) {
        hits++;
        copy.splice(idx, 1);
      }
    }
    const score = hits / Math.max(1, uExp.length, cExp.length);
    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  return best;
}

export function analyzeSentenceMistake(userText, targetEn, alternatives = [], fallbackExplain = '') {
  const closest = pickClosestTarget(userText, targetEn, alternatives);
  const diff = computeWordDiff(userText, closest);
  const uLower = String(userText || '').toLowerCase().trim();
  const tLower = String(closest || '').toLowerCase().trim();

  const whyWrongList = [];
  const whyRightList = [];

  // 1. Check Brazilian-specific grammar/collocation rules
  for (const rule of BR_ERROR_RULES) {
    if (rule.test(uLower, tLower)) {
      whyWrongList.push(rule.whyWrong);
      whyRightList.push(rule.whyRight);
      if (whyWrongList.length >= 2) break;
    }
  }

  // 2. Check spelling typos
  if (diff.typos.length > 0) {
    const pairs = diff.typos.map(tp => `"${tp.wrote}" → "${tp.expected}"`).join(', ');
    whyWrongList.push(`Erro de escrita em ${pairs}. Em inglês, trocar ou faltar uma letra pode mudar a palavra ou a pronúncia.`);
    whyRightList.push(`A grafia correta (${diff.typos.map(tp => `"${tp.expected}"`).join(', ')}) garante clareza na escrita e ajuda a lembrar o som certo.`);
  }

  // 3. Check swapped word order
  if (diff.orderSwapped.length > 0) {
    const words = diff.orderSwapped.map(w => `"${w}"`).join(', ');
    whyWrongList.push(`A ordem das palavras ficou invertida em ${words}. Em inglês a ordem fixa (Sujeito → Auxiliar/Verbo → Complemento) é mais rígida que no português.`);
    whyRightList.push(`Colocando ${words} na posição destacada em verde, a frase segue o fluxo natural que nativos esperam ouvir.`);
  }

  // 4. Generic token-level explanation if no specific rule triggered yet
  if (whyWrongList.length === 0) {
    const parts = [];
    if (diff.extra.length > 0) {
      parts.push(`sobraram ou foram trocadas as palavras ${diff.extra.map(w => `"${w}"`).join(', ')}`);
    }
    if (diff.missing.length > 0) {
      parts.push(`faltaram as peças ${diff.missing.map(w => `"${w}"`).join(', ')}`);
    }
    if (parts.length > 0) {
      whyWrongList.push(`Na comparação com a frase natural, ${parts.join(' e ')}.`);
    } else {
      whyWrongList.push('A estrutura ficou diferente da forma usada por nativos nessa situação.');
    }

    if (fallbackExplain) {
      whyRightList.push(fallbackExplain);
    } else {
      whyRightList.push(`A frase "${closest}" junta os blocos exatos que um nativo usa nessa situação, sem traduzir palavra por palavra.`);
    }
  } else if (fallbackExplain && !whyRightList.some(r => r === fallbackExplain)) {
    whyRightList.push(fallbackExplain);
  }

  return {
    closest,
    diff,
    whyWrong: whyWrongList,
    whyRight: whyRightList
  };
}

export function renderMistakeCoachHtml(analysis) {
  if (!analysis) return '';
  const { diff, whyWrong, whyRight } = analysis;

  const userHtml = diff.userMarked.length
    ? diff.userMarked.map(tok =>
        tok.status === 'ok'
          ? `<span class="diff-tok diff-ok">${esc(tok.word)}</span>`
          : `<span class="diff-tok diff-bad">${esc(tok.word)}</span>`
      ).join(' ')
    : '<span class="muted">(vazio)</span>';

  const targetHtml = diff.targetMarked.map(tok =>
    tok.status === 'ok'
      ? `<span class="diff-tok diff-ok">${esc(tok.word)}</span>`
      : `<span class="diff-tok diff-add">${esc(tok.word)}</span>`
  ).join(' ');

  return `
    <div class="coach-box">
      <div class="coach-diff-grid">
        <div class="coach-row">
          <span class="coach-label">Você escreveu:</span>
          <div class="coach-tokens">${userHtml}</div>
        </div>
        <div class="coach-row">
          <span class="coach-label">Forma correta:</span>
          <div class="coach-tokens">${targetHtml}</div>
        </div>
      </div>

      <div class="coach-reasons">
        <div class="coach-reason-bad">
          <strong class="row" style="gap:6px;"><i data-lucide="alert-circle"></i> O que estava errado e por quê:</strong>
          ${whyWrong.map(msg => `<div>• ${esc(msg)}</div>`).join('')}
        </div>
        <div class="coach-reason-good">
          <strong class="row" style="gap:6px;"><i data-lucide="check-circle-2"></i> Por que a forma nova está certa:</strong>
          ${whyRight.map(msg => `<div>• ${esc(msg)}</div>`).join('')}
        </div>
      </div>
    </div>
  `;
}
