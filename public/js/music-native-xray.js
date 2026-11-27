// Real Spoken English X-Ray (Connected Speech, Contractions & Phrasal Verbs)
// + Word-by-Word Live Voice Shadowing Evaluator for FluencyForge Music Studio

const CONNECTED_SPEECH_RULES = [
  { re: /\bi['’]?ma\b/gi, raw: "I'ma", expanded: "I am going to", tip: 'Junção super rápida de "I am going to" — muito comum em pop, rap e fala informal nos EUA.' },
  { re: /\bgonna\b/gi, raw: 'gonna', expanded: 'going to', tip: 'Redução natural de "going to" antes de verbos. Quase nenhum nativo pronuncia "going to" separado falando rápido.' },
  { re: /\bwanna\b/gi, raw: 'wanna', expanded: 'want to', tip: 'Junção falada de "want to" (ou "want a"). Essencial reconhecer de ouvido em músicas e filmes.' },
  { re: /\bgotta\b/gi, raw: 'gotta', expanded: 'got to / have to', tip: 'Redução de "(have) got to", equivalente a "tenho que / precisa".' },
  { re: /\bkinda\b/gi, raw: 'kinda', expanded: 'kind of', tip: 'Significa "meio que / um pouco" na fala cotidiana (ex.: "kinda tired").' },
  { re: /\bsorta\b/gi, raw: 'sorta', expanded: 'sort of', tip: 'Redução de "sort of" ("meio que / tipo assim").' },
  { re: /\boutta\b/gi, raw: 'outta', expanded: 'out of', tip: 'Junção rápida de "out of" ("para fora de / sem").' },
  { re: /\blemme\b/gi, raw: 'lemme', expanded: 'let me', tip: 'Redução direta de "let me" ("deixa eu...").' },
  { re: /\bgimme\b/gi, raw: 'gimme', expanded: 'give me', tip: 'Redução direta de "give me" ("me dá...").' },
  { re: /\bdunno\b/gi, raw: 'dunno', expanded: "don't know", tip: 'Como nativos realmente falam "I don\'t know" rápido: "I dunno".' },
  { re: /\bain['’]?t\b/gi, raw: "ain't", expanded: 'am/is/are/have not', tip: 'Negativa informal universal em música americana — substitui isn\'t, aren\'t, am not ou haven\'t.' },
  { re: /\bshoulda\b/gi, raw: 'shoulda', expanded: 'should have', tip: 'Redução de "should have" ("deveria ter"). O "have" vira só um som de "a".' },
  { re: /\bwoulda\b/gi, raw: 'woulda', expanded: 'would have', tip: 'Redução de "would have" ("teria").' },
  { re: /\bcoulda\b/gi, raw: 'coulda', expanded: 'could have', tip: 'Redução de "could have" ("poderia ter").' },
  { re: /\btryna\b/gi, raw: 'tryna', expanded: 'trying to', tip: 'Fusão rápida de "trying to" ("tentando..."), muito frequente no inglês falado jovem.' },
  { re: /\bfinna\b/gi, raw: 'finna', expanded: 'fixing to / going to', tip: 'Gíria americana (AAVE/Sul dos EUA) equivalente a "prestes a / vou fazer".' },
  { re: /\bc['’]mon\b/gi, raw: "c'mon", expanded: 'come on', tip: 'Junção rápida de "come on" ("vamos lá / qual é").' },
  { re: /(?:^|\s)['’]cause\b/gi, raw: "'cause", expanded: 'because', tip: 'Na fala rápida e em músicas, quase sempre se corta o "be-" de "because".' },
  { re: /(?:^|\s)['’]til\b/gi, raw: "'til", expanded: 'until', tip: 'Forma curta de "until" ("até").' },
  { re: /(?:^|\s)['’]bout\b/gi, raw: "'bout", expanded: 'about', tip: 'Corte do "a-" inicial de "about" ("sobre / quase").' },
  { re: /\by['’]all\b/gi, raw: "y'all", expanded: 'you all', tip: 'Plural informal de "vocês" muito comum nos EUA.' },
  { re: /\bya\b/gi, raw: 'ya', expanded: 'you / your', tip: 'Forma relaxada de "you" na fala rápida ("see ya", "told ya").' },
  { re: /\bwhatcha\b/gi, raw: 'whatcha', expanded: 'what are you / what do you', tip: 'Junção de 3 palavras em 1 som só ("whatcha doing?").' },
  { re: /\bbetcha\b/gi, raw: 'betcha', expanded: 'bet you', tip: 'Fusão de "I bet you" ("aposto com você").' }
];

const PHRASAL_VERBS = [
  { re: /\bgive\s+(?:\w+\s+)?up\b/i, raw: 'give up', expanded: 'desistir', tip: 'Phrasal verb essencial: "don\'t give up" = não desista.' },
  { re: /\bhold\s+on\b/i, raw: 'hold on', expanded: 'aguentar firme / esperar', tip: 'Usado tanto para "espere um segundo" quanto "aguente firme".' },
  { re: /\blet\s+(?:\w+\s+)?go\b/i, raw: 'let go', expanded: 'deixar ir / soltar', tip: 'Significa soltar algo fisicamente ou desapegar emocionalmente.' },
  { re: /\bbreak(?:ing|s)?\s+down\b/i, raw: 'break down', expanded: 'desabar / quebrar', tip: 'Pode ser um carro quebrando, alguém desabando ou dividir um problema em partes.' },
  { re: /\bfall(?:ing|s)?\s+apart\b/i, raw: 'fall apart', expanded: 'desmoronar', tip: 'Muito usado para relacionamentos, planos ou emoções desmoronando.' },
  { re: /\bfigure(?:d|s)?\s+(?:\w+\s+)?out\b/i, raw: 'figure out', expanded: 'descobrir / resolver', tip: 'Um dos phrasal verbs mais usados em trabalho e conversas ("I\'ll figure it out").' },
  { re: /\bwake(?:s|n)?\s+(?:\w+\s+)?up\b/i, raw: 'wake up', expanded: 'acordar / despertar', tip: 'Acordar de manhã ou "cair na real".' },
  { re: /\brun(?:ning|s)?\s+away\b/i, raw: 'run away', expanded: 'fugir / escapar', tip: 'Fugir de um lugar ou evitar enfrentar uma situação.' },
  { re: /\btake(?:s|n)?\s+over\b/i, raw: 'take over', expanded: 'assumir o controle', tip: 'Muito usado tanto em músicas quanto em reuniões ("I\'ll take over from here").' },
  { re: /\bturn(?:ed|ing|s)?\s+around\b/i, raw: 'turn around', expanded: 'virar-se / dar a volta por cima', tip: 'Virar fisicamente ou reverter uma situação.' },
  { re: /\bmove(?:d|s)?\s+on\b/i, raw: 'move on', expanded: 'seguir em frente', tip: 'Superar algo e partir para o próximo assunto ou fase.' },
  { re: /\bfade(?:d|s)?\s+away\b/i, raw: 'fade away', expanded: 'desaparecer aos poucos', tip: 'Perder força, cor ou memória gradualmente.' },
  { re: /\bcome(?:s|ing)?\s+back\b/i, raw: 'come back', expanded: 'voltar / retornar', tip: 'Voltar para um lugar ou situação anterior.' },
  { re: /\blook(?:ing|ed|s)?\s+back\b/i, raw: 'look back', expanded: 'olhar para trás', tip: 'Refletir sobre o passado ("don\'t look back").' },
  { re: /\bstand(?:ing|s)?\s+up\b/i, raw: 'stand up', expanded: 'levantar-se / se posicionar', tip: 'Levantar ou defender algo ("stand up for yourself").' },
  { re: /\bshut(?:ting|s)?\s+down\b/i, raw: 'shut down', expanded: 'desligar / fechar / calar', tip: 'Encerrar algo ou se fechar emocionalmente.' },
  { re: /\bcarry(?:ing)?\s+on\b/i, raw: 'carry on', expanded: 'continuar seguindo', tip: 'Continuar apesar das dificuldades.' },
  { re: /\bhang(?:ing|s)?\s+on\b/i, raw: 'hang on', expanded: 'aguardar / segurar firme', tip: 'Sinônimo informal de "hold on".' },
  { re: /\bget(?:ting|s)?\s+over\b/i, raw: 'get over', expanded: 'superar', tip: 'Superar uma dor, fim de namoro ou obstáculo.' },
  { re: /\bwork(?:ed|ing|s)?\s+out\b/i, raw: 'work out', expanded: 'dar certo / treinar', tip: 'Em músicas costuma significar "dar certo no final" ("everything will work out").' },
  { re: /\bgrow(?:ing|n|s)?\s+up\b/i, raw: 'grow up', expanded: 'crescer / amadurecer', tip: 'Crescer da infância para a vida adulta.' },
  { re: /\bslow(?:ing|ed|s)?\s+down\b/i, raw: 'slow down', expanded: 'desacelerar', tip: 'Reduzir a velocidade ou ir com calma.' },
  { re: /\bcalm(?:ing|ed|s)?\s+down\b/i, raw: 'calm down', expanded: 'acalmar-se', tip: 'Ficar calmo em uma situação tensa.' },
  { re: /\bfind(?:ing|s)?\s+out\b/i, raw: 'find out', expanded: 'descobrir uma informação', tip: 'Descobrir algo que você não sabia antes.' },
  { re: /\breach(?:ing|ed|s)?\s+out\b/i, raw: 'reach out', expanded: 'estender a mão / entrar em contato', tip: 'Super usado em música e no inglês corporativo ("feel free to reach out").' },
  { re: /\bwalk(?:ing|ed|s)?\s+away\b/i, raw: 'walk away', expanded: 'ir embora / abandonar', tip: 'Sair de uma situação ou relacionamento.' },
  { re: /\bkeep(?:ing|s)?\s+on\b/i, raw: 'keep on', expanded: 'continuar fazendo', tip: 'Sempre seguido de verbo com -ing ("keep on trying").' },
  { re: /\bpick(?:ing|ed|s)?\s+(?:\w+\s+)?up\b/i, raw: 'pick up', expanded: 'pegar / buscar / melhorar', tip: 'Um dos phrasal verbs mais versáteis do inglês.' },
  { re: /\bbring(?:ing|s)?\s+(?:\w+\s+)?back\b/i, raw: 'bring back', expanded: 'trazer de volta', tip: 'Trazer uma memória, sensação ou pessoa de volta.' },
  { re: /\btear(?:ing|s)?\s+(?:\w+\s+)?apart\b/i, raw: 'tear apart', expanded: 'despedaçar', tip: 'Rasgar ou destruir emocionalmente.' },
  { re: /\bmess(?:ed|ing)?\s+up\b/i, raw: 'mess up', expanded: 'estragar / errar feio', tip: 'Cometer um erro ("I messed up").' },
  { re: /\bend(?:ed|ing|s)?\s+up\b/i, raw: 'end up', expanded: 'acabar (fazendo/indo)', tip: 'Resultado inesperado ("we ended up talking for hours").' },
  { re: /\bgive(?:s|n)?\s+in\b/i, raw: 'give in', expanded: 'ceder / se render', tip: 'Ceder à pressão ou tentação.' },
  { re: /\blet\s+(?:\w+\s+)?down\b/i, raw: 'let down', expanded: 'decepcionar', tip: '"Don\'t let me down" = não me decepcione.' },
  { re: /\bhold(?:ing|s)?\s+back\b/i, raw: 'hold back', expanded: 'se segurar / conter', tip: 'Esconder emoções ou não dar tudo de si.' },
  { re: /\bfreak(?:ing|ed|s)?\s+out\b/i, raw: 'freak out', expanded: 'surtar / pirar', tip: 'Ficar em pânico ou extremamente empolgado.' },
  { re: /\bwatch\s+out\b/i, raw: 'watch out', expanded: 'cuidado / fique atento', tip: 'Aviso rápido de perigo ou atenção.' }
];

export function analyzeVerseNativeXray(verseText) {
  const text = String(verseText || '').trim();
  if (!text) return [];
  const found = [];
  const seen = new Set();

  for (const rule of CONNECTED_SPEECH_RULES) {
    if (rule.re.test(text)) {
      rule.re.lastIndex = 0;
      const key = rule.raw.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        found.push({
          raw: rule.raw,
          expanded: rule.expanded,
          kind: 'connected',
          label: 'Fala Conectada',
          tip: rule.tip
        });
      }
    }
    if (found.length >= 4) return found;
  }

  // Detect G-dropping contractions like talkin', runnin', feelin', nothin'
  const gDropRegex = /\b([a-z]{3,}in)['’](?:\s|$|[,.!?])/gi;
  let m;
  while ((m = gDropRegex.exec(text)) !== null) {
    const raw = `${m[1]}'`;
    const expanded = `${m[1]}g`;
    const key = raw.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      found.push({
        raw,
        expanded,
        kind: 'connected',
        label: 'Corte de "-g" nativo',
        tip: `Nativos frequentemente cortam o "g" final de "${expanded}" na fala rápida e em músicas.`
      });
    }
    if (found.length >= 4) return found;
  }

  for (const pv of PHRASAL_VERBS) {
    if (pv.re.test(text)) {
      const key = pv.raw.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        found.push({
          raw: pv.raw,
          expanded: pv.expanded,
          kind: 'phrasal',
          label: 'Phrasal Verb',
          tip: pv.tip
        });
      }
    }
    if (found.length >= 4) return found;
  }

  return found;
}

const VOICE_EQUIV = {
  "im": ['i', 'am', "i'm"],
  "i'm": ['i', 'am', 'im'],
  "ima": ['i', 'am', 'going', 'to', "i'ma", 'imma'],
  "i'ma": ['i', 'am', 'going', 'to', 'ima', 'imma'],
  "dont": ["don't", 'do', 'not'],
  "don't": ['dont', 'do', 'not'],
  "cant": ["can't", 'cannot'],
  "can't": ['cant', 'cannot'],
  "wont": ["won't", 'will', 'not'],
  "won't": ['wont', 'will', 'not'],
  "gonna": ['going', 'to', 'gonna'],
  "wanna": ['want', 'to', 'wanna'],
  "gotta": ['got', 'to', 'gotta'],
  "aint": ["ain't", 'not'],
  "ain't": ['aint', 'not'],
  "youre": ["you're", 'you', 'are'],
  "you're": ['youre', 'you', 'are'],
  "ive": ["i've", 'i', 'have'],
  "i've": ['ive', 'i', 'have'],
  "ill": ["i'll", 'i', 'will'],
  "i'll": ['ill', 'i', 'will'],
  "cause": ["'cause", 'because', 'cuz'],
  "'cause": ['cause', 'because', 'cuz']
};

function cleanToken(t) {
  return String(t || '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9']/g, '');
}

function tokensLooselyMatch(targetNorm, spokenPool) {
  if (!targetNorm) return true;
  if (spokenPool.has(targetNorm)) return true;
  // G-drop match (runnin' <-> running)
  if (targetNorm.endsWith("in'") && spokenPool.has(targetNorm.slice(0, -1) + 'g')) return true;
  if (targetNorm.endsWith('ing') && spokenPool.has(targetNorm.slice(0, -1))) return true;
  // Equivalent contractions
  const eqs = VOICE_EQUIV[targetNorm];
  if (eqs && eqs.some(e => spokenPool.has(e))) return true;
  // Soft prefix/fuzzy match for words >= 5 chars (allows minor ASR inflection slips)
  if (targetNorm.length >= 5) {
    const stem = targetNorm.slice(0, targetNorm.length - 1);
    for (const s of spokenPool) {
      if (s.length >= 4 && (s.startsWith(stem) || targetNorm.startsWith(s.slice(0, s.length - 1)))) {
        return true;
      }
    }
  }
  return false;
}

export function scoreVoiceVerse(spokenText, targetTokens) {
  const spokenWords = String(spokenText || '')
    .split(/\s+/)
    .map(cleanToken)
    .filter(Boolean);
  const spokenPool = new Set(spokenWords);

  // Also add expanded equivalents from spoken text
  for (const w of spokenWords) {
    const eq = VOICE_EQUIV[w];
    if (eq) eq.forEach(x => spokenPool.add(x));
  }

  const matchedIndices = new Set();
  const missingWords = [];
  let scorableCount = 0;

  (targetTokens || []).forEach((tok, idx) => {
    const norm = cleanToken(tok);
    if (!norm) {
      matchedIndices.add(idx);
      return;
    }
    scorableCount++;
    if (tokensLooselyMatch(norm, spokenPool)) {
      matchedIndices.add(idx);
    } else {
      missingWords.push(tok);
    }
  });

  const hits = scorableCount - missingWords.length;
  const pct = scorableCount > 0 ? Math.round((hits / scorableCount) * 100) : 0;
  return {
    pct,
    hits,
    total: scorableCount,
    matchedIndices,
    missingWords,
    passed: pct >= 65
  };
}
