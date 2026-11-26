import {
  EXTRA_BUILDER_SCENARIOS,
  EXTRA_SPEED_DRILLS,
  EXTRA_SPEAKING_TOPICS_432,
  EXTRA_PARAPHRASE_CARDS,
  EXTRA_PRONUNCIATION_RULES
} from './data-drills-extra.js';
import {
  PACK2_BUILDER_SCENARIOS,
  PACK2_SPEED_DRILLS,
  PACK2_SPEAKING_TOPICS_432,
  PACK2_PARAPHRASE_CARDS
} from './data-drills-pack2.js';

const CORE_BUILDER_SCENARIOS = [
  {
    id: 'calls',
    name: 'Status & Reuniões',
    cols: [
      {
        title: '1. Abertura + Ação',
        items: [
          { en: "I'm currently working on", phon: 'áim kâr-rent-li uôr-ki-nón', pt: 'Atualmente estou trabalhando em' },
          { en: 'I just finished reviewing', phon: 'ái djâst fí-nisht ri-viú-in', pt: 'Acabei de revisar' },
          { en: 'We still need to check', phon: 'uí stíl níd tchu tchék', pt: 'Ainda precisamos checar' },
          { en: 'I ran into an issue with', phon: 'ái rén ín-tchu an í-shu uíth', pt: 'Tive um problema com' },
          { en: 'I want to walk you through', phon: 'ái uónt tchu uók iú thrú', pt: 'Quero te explicar passo a passo' }
        ]
      },
      {
        title: '2. O Quê (Foco)',
        items: [
          { en: 'the latest update', phon: 'dhê lêi-test âp-dêit', pt: 'a última atualização' },
          { en: "the client's request", phon: 'dhê klái-ents ri-kuést', pt: 'o pedido do cliente' },
          { en: 'that part of the project', phon: 'dhét párt óv dhê pró-djekt', pt: 'aquela parte do projeto' },
          { en: 'the main priority', phon: 'dhê mêin prai-ó-ri-ti', pt: 'a prioridade principal' },
          { en: 'the new workflow', phon: 'dhê niú uôrk-flôu', pt: 'o novo fluxo de trabalho' }
        ]
      },
      {
        title: '3. Direção / Tempo',
        items: [
          { en: 'so we stay on track.', phon: 'sôu uí stêi ón trék.', pt: 'para mantermos o prazo.' },
          { en: 'before moving forward.', phon: 'bi-fór mú-vin fór-uard.', pt: 'antes de avançar.' },
          { en: "and I'll update you today.", phon: 'énd áil âp-dêit iú tchu-dêi.', pt: 'e te atualizo ainda hoje.' },
          { en: 'by the end of the week.', phon: 'bái dhí énd óv dhê uík.', pt: 'até o fim da semana.' },
          { en: '— could we align on this?', phon: '— kúd uí a-láin ón dhís?', pt: '— podemos alinhar isso?' }
        ]
      }
    ]
  },
  {
    id: 'engines',
    name: 'Motores Universais (Falar Qualquer Coisa)',
    cols: [
      {
        title: '1. Motor de Tempo/Intenção',
        items: [
          { en: 'I need to', phon: 'ái ní-tchu', pt: 'Eu preciso' },
          { en: "I'm gonna", phon: 'áim gó-na', pt: 'Eu vou' },
          { en: "I'm trying to", phon: 'áim trái-in tchu', pt: 'Estou tentando' },
          { en: 'I had to', phon: 'ái réd tchu', pt: 'Eu tive que' },
          { en: "I couldn't", phon: 'ái kú-dent', pt: 'Eu não consegui' }
        ]
      },
      {
        title: '2. Verbo Puro (Não conjuga!)',
        items: [
          { en: 'figure out', phon: 'fí-guer áut', pt: 'resolver / descobrir' },
          { en: 'explain', phon: 'iks-plêin', pt: 'explicar' },
          { en: 'finish', phon: 'fí-nish', pt: 'terminar' },
          { en: 'change', phon: 'tchêindj', pt: 'mudar' },
          { en: 'talk about', phon: 'tók a-báut', pt: 'falar sobre' }
        ]
      },
      {
        title: '3. Complemento Livre',
        items: [
          { en: 'this whole situation today.', phon: 'dhís rôul si-tchu-êi-xan tchu-dêi.', pt: 'essa situação toda hoje.' },
          { en: 'what happened yesterday.', phon: 'uót ré-pend iés-ter-dei.', pt: 'o que aconteceu ontem.' },
          { en: 'my plans for this week.', phon: 'mái plénz fór dhís uík.', pt: 'meus planos para esta semana.' },
          { en: 'the best way to do it.', phon: 'dhê bést uêi tchu dú ít.', pt: 'o melhor jeito de fazer isso.' },
          { en: 'everything before noon.', phon: 'év-ri-thin bi-fór nún.', pt: 'tudo antes do meio-dia.' }
        ]
      }
    ]
  },
  {
    id: 'questions',
    name: 'Motor de Perguntas Rápidas',
    cols: [
      {
        title: '1. Abertura de Pergunta',
        items: [
          { en: 'Can you', phon: 'kén iú', pt: 'Você pode' },
          { en: 'Did you', phon: 'díd djú', pt: 'Você (passado)' },
          { en: 'Are you gonna', phon: 'ár iú gó-na', pt: 'Você vai' },
          { en: 'Do we need to', phon: 'dú uí ní-tchu', pt: 'Nós precisamos' },
          { en: 'How can we', phon: 'ráu kén uí', pt: 'Como podemos' }
        ]
      },
      {
        title: '2. Ação Direta',
        items: [
          { en: 'send me', phon: 'sénd mí', pt: 'me mandar' },
          { en: 'check', phon: 'tchék', pt: 'checar' },
          { en: 'fix', phon: 'fíks', pt: 'consertar' },
          { en: 'explain', phon: 'iks-plêin', pt: 'explicar' },
          { en: 'join', phon: 'djóin', pt: 'entrar em' }
        ]
      },
      {
        title: '3. Fechamento',
        items: [
          { en: 'that link right now?', phon: 'dhét línk ráit náu?', pt: 'aquele link agora?' },
          { en: 'what changed since yesterday?', phon: 'uót tchêindjd síns iés-ter-dei?', pt: 'o que mudou desde ontem?' },
          { en: 'the call in ten minutes?', phon: 'dhê cól ín tén mí-nets?', pt: 'a call em dez minutos?' },
          { en: 'this before we send it?', phon: 'dhís bi-fór uí sénd ít?', pt: 'isso antes de enviarmos?' },
          { en: 'the issue faster?', phon: 'dhí í-shu fés-ter?', pt: 'o problema mais rápido?' }
        ]
      }
    ]
  },
  {
    id: 'problems',
    name: 'Explicar Problemas & Soluções',
    cols: [
      {
        title: '1. Situação',
        items: [
          { en: 'There is a small issue with', phon: 'dhér íz a smól í-shu uíth', pt: 'Tem um pequeno problema com' },
          { en: 'Although we tested', phon: 'ól-dhôu uí tés-ted', pt: 'Embora tenhamos testado' },
          { en: 'Because we ran out of time for', phon: 'bi-kóz uí rén áut óv táim fór', pt: 'Porque ficamos sem tempo para' },
          { en: 'Instead of delaying', phon: 'ins-téd óv di-lêi-in', pt: 'Em vez de atrasar' }
        ]
      },
      {
        title: '2. Alvo',
        items: [
          { en: 'the main feature,', phon: 'dhê mêin fí-tcher,', pt: 'o recurso principal,' },
          { en: 'the final report,', phon: 'dhê fái-nal ri-pórt,', pt: 'o relatório final,' },
          { en: 'this delivery,', phon: 'dhís di-lí-ve-ri,', pt: 'esta entrega,' },
          { en: 'the current setup,', phon: 'dhê kâr-rent sét-âp,', pt: 'a configuração atual,' }
        ]
      },
      {
        title: '3. Saída Profissional',
        items: [
          { en: "I'm already working on a fix.", phon: 'áim ól-ré-di uôr-ki-nón a fíks.', pt: 'já estou trabalhando na correção.' },
          { en: 'let me double-check and get back to you.', phon: 'lét mí dâ-bol tchék énd guét bék tchu iú.', pt: 'deixa eu conferir e te retorno.' },
          { en: 'we should focus on what matters most.', phon: 'uí shúd fôu-kas ón uót mé-ters môust.', pt: 'devemos focar no que importa mais.' },
          { en: 'we can ship a simpler version first.', phon: 'uí kén shíp a sím-pler vêr-jan fêrst.', pt: 'podemos entregar uma versão mais simples primeiro.' }
        ]
      }
    ]
  }
];

const CORE_SPEED_DRILLS = [
  { id: 'sd-1', tag: 'Motor: Necessidade', pt: 'Eu preciso resolver isso hoje.', en: 'I need to figure this out today.', alt: ['I need to solve this today.', 'I need to fix this today.'], phon: 'ái ní-tchu fí-guer dhís áut tchu-dêi' },
  { id: 'sd-2', tag: 'Motor: Futuro', pt: 'Eu vou falar com ele agora.', en: "I'm going to talk to him right now.", alt: ["I'm gonna talk to him now.", "I'll talk to him right now."], phon: 'áim gó-na tók tchu rím ráit náu' },
  { id: 'sd-3', tag: 'Motor: Passado', pt: 'Eu tive que mudar meus planos ontem.', en: 'I had to change my plans yesterday.', alt: ['I had to change my plan yesterday.'], phon: 'ái réd tchu tchêindj mái plénz iés-ter-dei' },
  { id: 'sd-4', tag: 'Motor: Negação Passado', pt: 'Eu não consegui terminar tudo a tempo.', en: "I couldn't finish everything on time.", alt: ["I wasn't able to finish everything on time."], phon: 'ái kú-dent fí-nish év-ri-thin ón táim' },
  { id: 'sd-5', tag: 'Motor: Pergunta Passado', pt: 'Você viu a minha mensagem?', en: 'Did you see my message?', alt: ['Have you seen my message?'], phon: 'díd djú sí mái mé-sidj?' },
  { id: 'sd-6', tag: 'Armadilha: There is', pt: 'Tem um problema pequeno aqui.', en: 'There is a small problem here.', alt: ["There's a small issue here."], phon: 'dhérz a smól pró-blem rír' },
  { id: 'sd-7', tag: 'Motor: Tentativa', pt: 'Estou tentando entender o que aconteceu.', en: "I'm trying to understand what happened.", alt: ["I'm trying to figure out what happened."], phon: 'áim trái-in tchu ân-der-sténd uót ré-pend' },
  { id: 'sd-8', tag: 'Call: Pedir Repetição', pt: 'Desculpa, você pode repetir essa última parte?', en: 'Sorry, could you repeat that last part?', alt: ['Sorry, can you say that last part again?'], phon: 'só-ri, kúd djú ri-pít dhét lést párt?' },
  { id: 'sd-9', tag: 'Conector: Although', pt: 'Embora esteja ocupado, vou te ajudar.', en: "Although I'm busy, I'll help you.", alt: ["Even though I'm busy, I'm going to help you."], phon: 'ól-dhôu áim bí-zi, áil rélp iú' },
  { id: 'sd-10', tag: 'Call: Retornar Depois', pt: 'Deixa eu checar e te retorno hoje à tarde.', en: "Let me check and get back to you this afternoon.", alt: ["Let me double-check and I'll get back to you this afternoon."], phon: 'lét mí tchék énd guét bék tchu iú dhís éf-ter-nún' },
  { id: 'sd-11', tag: 'Collocation: Decisão', pt: 'Precisamos tomar uma decisão até sexta.', en: 'We need to make a decision by Friday.', alt: ['We have to make a decision until Friday.'], phon: 'uí ní-tchu mêik a di-sí-jan bái frái-dei' },
  { id: 'sd-12', tag: 'Passado Negativo', pt: 'Eu não recebi o e-mail ainda.', en: "I didn't get the email yet.", alt: ["I haven't received the email yet."], phon: 'ái dí-dent guét dhí í-mêil iét' },
  { id: 'sd-13', tag: 'Motor: Permissão / Pedido', pt: 'Você pode me explicar passo a passo?', en: 'Could you walk me through it?', alt: ['Can you explain it step by step?'], phon: 'kúd djú uók mí thrú ít?' },
  { id: 'sd-14', tag: 'Conector: Instead of', pt: 'Em vez de esperar, vamos começar agora.', en: "Instead of waiting, let's start now.", alt: ["Instead of waiting, let's get started right now."], phon: 'ins-téd óv uêi-tin, léts stárt náu' },
  { id: 'sd-15', tag: 'Motor: Expectativa', pt: 'Era para eu entregar isso ontem.', en: 'I was supposed to deliver this yesterday.', alt: ['I was supposed to finish this yesterday.'], phon: 'ái uóz sa-pôust tchu di-lí-ver dhís iés-ter-dei' },
  { id: 'sd-16', tag: 'Conector: As soon as', pt: 'Te mando o link assim que eu terminar.', en: "I'll send you the link as soon as I finish.", alt: ["I will send you the link as soon as I'm done."], phon: 'áil sénd iú dhê línk éz sún éz ái fí-nish' },
  { id: 'sd-17', tag: 'Call: Alinhamento', pt: 'Só para garantir que estamos alinhados.', en: "Just to make sure we're on the same page.", alt: ["Just to make sure we're aligned."], phon: 'djâst tchu mêik xúr uír ón dhê sêim pêidj' },
  { id: 'sd-18', tag: 'Habilidade', pt: 'Eu quero conseguir falar o que eu precisar.', en: 'I want to be able to say whatever I need.', alt: ['I want to be able to speak whatever I need.'], phon: 'ái uónt tchu bí êi-bol tchu sêi uó-té-ver ái níd' },
  { id: 'sd-19', tag: 'Passado: Hábito', pt: 'Eu costumava travar nas reuniões.', en: 'I used to freeze in meetings.', alt: ['I used to get stuck during meetings.'], phon: 'ái iúst tchu fríz ín mí-tinz' },
  { id: 'sd-20', tag: 'Collocation: Tempo', pt: 'Estamos ficando sem tempo.', en: "We're running out of time.", alt: ['We are running out of time.'], phon: 'uír râ-nin áut óv táim' },
  { id: 'sd-21', tag: 'Pergunta Aberta', pt: 'Como podemos fazer isso mais rápido?', en: 'How can we do this faster?', alt: ['How can we make this faster?'], phon: 'ráu kén uí dú dhís fés-ter?' },
  { id: 'sd-22', tag: 'Conector: Otherwise', pt: 'Precisamos testar agora; caso contrário, vai quebrar.', en: "We need to test it now; otherwise, it'll break.", alt: ['We need to test now, otherwise it will break.'], phon: 'uí ní-tchu tést ít náu; ó-dher-uáiz, í-tol brêik' },
  { id: 'sd-23', tag: 'Opinião', pt: 'O que você falou faz total sentido.', en: 'What you said makes total sense.', alt: ['That makes complete sense.'], phon: 'uót iú séd mêiks tôu-tol séns' },
  { id: 'sd-24', tag: 'Existência Passado', pt: 'Tinha muita gente na chamada ontem.', en: 'There were a lot of people on the call yesterday.', alt: ['There were many people in the call yesterday.'], phon: 'dhér uêr a lót óv pí-pol ón dhê cól iés-ter-dei' }
];

const CORE_SPEAKING_TOPICS_432 = [
  { title: 'O que você faz no trabalho', prompt: 'Explique seu trabalho para alguém que não é da sua área: o que você faz no dia a dia, que ferramentas usa e qual é a parte mais desafiadora.' },
  { title: 'Um problema que você resolveu', prompt: 'Conte sobre um problema ou imprevisto recente (no trabalho ou na vida), o que deu errado primeiro e como você resolveu.' },
  { title: 'Sua rotina de estudos hoje', prompt: 'Explique por que você precisa do inglês agora, o que mais te trava e o que você está fazendo esta semana para destravar.' },
  { title: 'Explicar uma ferramenta ou app que você ama', prompt: 'Escolha um aplicativo, site ou software que você usa todo dia e explique como ele funciona e por que economiza seu tempo.' },
  { title: 'Como você imagina sua vida em 2 anos', prompt: 'Fale sobre onde quer trabalhar, que habilidades quer ter aos 22 anos e o que muda quando você ficar fluente.' },
  { title: 'Trabalho remoto vs. presencial', prompt: 'Dê sua opinião com prós e contras: qual você prefere, por quê, e como manter foco trabalhando de casa.' },
  { title: 'Uma reunião que poderia ser um e-mail', prompt: 'Explique o que torna uma reunião produtiva e o que faz uma call ser perda de tempo.' },
  { title: 'Um erro que te ensinou algo importante', prompt: 'Conte de um erro que você cometeu (estudo, projeto ou decisão) e o que você faz diferente hoje por causa dele.' },
  { title: 'Resumo do seu dia ontem', prompt: 'Fale em ordem cronológica (usando passado!) o que você fez desde a hora em que acordou até ir dormir ontem.' },
  { title: 'Seus planos para o próximo fim de semana', prompt: 'Treine futuro ("I\'m gonna...", "I want to...", "If I have time...") explicando o que pretende fazer no fim de semana.' },
  { title: 'Por que Inteligência Artificial muda o trabalho', prompt: 'Explique como você usa IA no dia a dia e quais habilidades continuam sendo essenciais para humanos.' },
  { title: 'Ensinar algo simples passo a passo', prompt: 'Escolha algo que você sabe fazer bem (fazer café, montar um PC, organizar tarefas, jogar algo) e explique o passo a passo em inglês.' }
];

const CORE_PARAPHRASE_CARDS = [
  { target: 'Deadline (Prazo final)', forbidden: ['deadline', 'date', 'time'], example: 'The final moment when you have to finish and deliver a project.' },
  { target: 'Postpone (Adiar)', forbidden: ['postpone', 'delay', 'late'], example: 'To move a meeting or a task to another day instead of doing it today.' },
  { target: 'Meeting (Reunião)', forbidden: ['meeting', 'call', 'zoom'], example: 'When people from the same team get together to talk and make decisions.' },
  { target: 'Password (Senha)', forbidden: ['password', 'secret', 'login'], example: 'The combination of letters and numbers you type to enter your account.' },
  { target: 'Feedback (Retorno / Avaliação)', forbidden: ['feedback', 'opinion', 'review'], example: 'When someone tells you what was good in your work and what you can improve.' },
  { target: 'Coworker (Colega de trabalho)', forbidden: ['coworker', 'colleague', 'friend'], example: 'Someone who works at the same company or on the same team as you.' },
  { target: 'Overwhelmed (Sobrecarregado)', forbidden: ['overwhelmed', 'busy', 'stress'], example: 'When you have too many things to do at the same time and feel like you cannot handle everything.' },
  { target: 'Reliable (Confiável)', forbidden: ['reliable', 'trust', 'good'], example: 'Something or someone that always works well and never lets you down.' },
  { target: 'Shortcut (Atalho)', forbidden: ['shortcut', 'fast', 'quick'], example: 'A smarter or shorter way to reach the same result with less effort.' },
  { target: 'Budget (Orçamento)', forbidden: ['budget', 'money', 'cost'], example: 'The total amount you are allowed to spend on a project.' },
  { target: 'Mistake (Erro)', forbidden: ['mistake', 'error', 'wrong'], example: 'When you do something that does not match what you planned and need to fix it.' },
  { target: 'Fluent (Fluente)', forbidden: ['fluent', 'language', 'English'], example: 'Being able to express any idea smoothly without stopping to translate every word.' },
  { target: 'Update (Atualização)', forbidden: ['update', 'news', 'new'], example: 'Telling the team what changed since yesterday and what you are doing now.' },
  { target: 'Customer (Cliente)', forbidden: ['customer', 'client', 'buy'], example: 'The person or company that pays for your product or service.' },
  { target: 'Schedule (Agenda / Cronograma)', forbidden: ['schedule', 'calendar', 'plan'], example: 'The list showing what tasks happen on each day and hour.' },
  { target: 'Headphones (Fones de ouvido)', forbidden: ['headphones', 'ear', 'music'], example: 'The device you wear on your head to hear audio privately during a call.' }
];

const CORE_PRONUNCIATION_RULES = [
  {
    title: '1. Consoante seca no fim (Corte o "i" fantasma)',
    desc: 'Brasileiros colocam uma vogal "i" invisível depois de K, T, D, P, B. Em inglês o som para seco.',
    examples: [
      { word: 'work', wrong: 'uôr-ki', right: 'uôrk', phrase: 'I work from home.' },
      { word: 'need', wrong: 'ní-dji', right: 'níd', phrase: 'I need to check.' },
      { word: 'check', wrong: 'tché-qui', right: 'tchék', phrase: 'Let me double-check.' },
      { word: 'help', wrong: 'rél-pi', right: 'rélp', phrase: 'Can you help me?' }
    ]
  },
  {
    title: '2. Passado em "-ed" quase NUNCA lê o "e"',
    desc: 'Você só pronuncia uma sílaba extra (-id) quando o verbo termina com som de T ou D (needed, started, wanted). Nos outros, é só um som seco de T ou D no final!',
    examples: [
      { word: 'worked', wrong: 'uôr-ked', right: 'uôrkt', phrase: 'I worked late yesterday.' },
      { word: 'finished', wrong: 'fí-ni-shed', right: 'fí-nisht', phrase: 'I just finished the report.' },
      { word: 'changed', wrong: 'tchên-djed', right: 'tchêindjd', phrase: 'The deadline changed.' },
      { word: 'needed', wrong: 'ní-ded (AQUI LÊ!)', right: 'ní-ded', phrase: 'We needed more time.' }
    ]
  },
  {
    title: '3. Letras mudas clássicas do trabalho',
    desc: 'Essas letras estão escritas mas simplesmente NÃO existem na hora de ler em voz alta.',
    examples: [
      { word: 'walk / talk', wrong: 'uólk / tólk', right: 'uók / tók (sem L)', phrase: "Let's talk and walk through it." },
      { word: 'answer', wrong: 'éns-uer', right: 'én-ser (sem W)', phrase: "I'll get you an answer." },
      { word: 'doubt', wrong: 'dáubt', right: 'dáut (sem B)', phrase: 'I have no doubt about it.' },
      { word: 'Wednesday', wrong: 'uéd-nes-dei', right: 'uênz-dei (sem D)', phrase: "Let's meet on Wednesday." }
    ]
  },
  {
    title: '4. A família traiçoeira do "-ough"',
    desc: 'Quatro palavras parecidas na escrita que travam quase todo mundo na leitura. Memorize o som de cada uma:',
    examples: [
      { word: 'through (através)', wrong: 'trôug', right: 'thrú', phrase: 'Walk me through this.' },
      { word: 'though (embora/porém)', wrong: 'tóug', right: 'dhôu', phrase: "It's hard, though I like it." },
      { word: 'thought (pensou/ideia)', wrong: 'tôugt', right: 'thót', phrase: 'I thought we agreed.' },
      { word: 'enough (suficiente)', wrong: 'i-nôug', right: 'i-nâf', phrase: 'We have enough time.' }
    ]
  },
  {
    title: '5. Linking (Juntar palavras num fôlego só)',
    desc: 'Quando uma palavra termina com consoante e a próxima começa com vogal, elas colam e viram uma palavra só.',
    examples: [
      { word: 'working on it', wrong: 'uôr-king / ón / ít', right: 'uôr-ki-nó-nit', phrase: "I'm working on it right now." },
      { word: 'figure it out', wrong: 'fí-guer / ít / áut', right: 'fí-gue-ri-dáut', phrase: "We'll figure it out." },
      { word: 'check it out', wrong: 'tchék / ít / áut', right: 'tché-ki-dáut', phrase: 'Check it out when you can.' },
      { word: 'an issue', wrong: 'én / í-shu', right: 'a-ní-shu', phrase: 'We ran into an issue.' }
    ]
  }
];

export const BUILDER_SCENARIOS = [...CORE_BUILDER_SCENARIOS, ...EXTRA_BUILDER_SCENARIOS, ...PACK2_BUILDER_SCENARIOS];
export const SPEED_DRILLS = [...CORE_SPEED_DRILLS, ...EXTRA_SPEED_DRILLS, ...PACK2_SPEED_DRILLS];
export const SPEAKING_TOPICS_432 = [...CORE_SPEAKING_TOPICS_432, ...EXTRA_SPEAKING_TOPICS_432, ...PACK2_SPEAKING_TOPICS_432];
export const PARAPHRASE_CARDS = [...CORE_PARAPHRASE_CARDS, ...EXTRA_PARAPHRASE_CARDS, ...PACK2_PARAPHRASE_CARDS];
export const PRONUNCIATION_RULES = [...CORE_PRONUNCIATION_RULES, ...EXTRA_PRONUNCIATION_RULES];
