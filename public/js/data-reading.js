import { EXTRA_READING_PASSAGES } from './data-reading-extra.js';
import { PACK2_READING_PASSAGES } from './data-reading-pack2.js';

const CORE_READING_PASSAGES = [
  {
    id: 'rd-1',
    level: 'B1 • Reunião Diária',
    title: 'Dando um Update Claro em 30 Segundos',
    topic: 'Trabalho & Calls',
    sentences: [
      {
        chunks: ['Good morning everyone,', 'here is a quick update', 'from my side.'],
        phon: 'gúd mór-nin év-ri-uân / rírz a kuík âp-dêit / fróm mái sáid',
        pt: 'Bom dia pessoal, aqui vai uma atualização rápida do meu lado.',
        trap: '"Here is" junta e vira "rírz". Corte o "d" de "side" sem falar "sáidji".'
      },
      {
        chunks: ['Yesterday I worked through', 'the client feedback', 'and fixed two main issues.'],
        phon: 'iés-ter-dei ái uôrkt thrú / dhê klái-ent fíd-bék / énd fíkst tchú mêin í-shuz',
        pt: 'Ontem eu trabalhei no feedback do cliente e corrigi dois problemas principais.',
        trap: '"Worked" (uôrkt) e "fixed" (fíkst) NÃO pronunciam o "e" do -ed!'
      },
      {
        chunks: ['Today, I am focusing on', 'wrapping up the final report', 'before three PM.'],
        phon: 'tchu-dêi, áim fôu-ka-sin ón / ré-pin âp dhê fái-nal ri-pórt / bi-fór thrí pí-ém',
        pt: 'Hoje estou focado em encerrar o relatório final antes das 15h.',
        trap: 'Em "wrapping" o W é mudo (ré-pin).'
      },
      {
        chunks: ['Although we had a tight schedule,', 'everything is back on track now.'],
        phon: 'ól-dhôu uí réd a táit ské-djul, / év-ri-thin íz bék ón trék náu',
        pt: 'Embora tivéssemos uma agenda apertada, agora tudo voltou aos trilhos.',
        trap: '"Although" = ól-dhôu; "tight" = táit (gh mudo); "schedule" = ské-djul.'
      }
    ],
    question: 'O que a pessoa está fazendo HOJE na reunião?',
    options: [
      'Aguardando o cliente responder um e-mail.',
      'Finalizando o relatório final antes das 15h.',
      'Reagendando a reunião para a próxima semana.'
    ],
    answerIndex: 1
  },
  {
    id: 'rd-2',
    level: 'B1 • Aprendizado',
    title: 'Por Que Você Entende Mas Trava na Fala',
    topic: 'Fluência & Cérebro',
    sentences: [
      {
        chunks: ['Many learners can understand', 'movies and podcasts,', 'yet they freeze when speaking.'],
        phon: 'mé-ni lêr-ners kén ân-der-sténd / mú-viz énd pód-késts, / iét dhêi fríz uén spí-kin',
        pt: 'Muitos estudantes conseguem entender filmes e podcasts, porém travam ao falar.',
        trap: '"Yet" no meio de frase significa "porém / ainda assim".'
      },
      {
        chunks: ['The reason is straightforward:', 'understanding is passive,', 'while speaking is an active skill.'],
        phon: 'dhê rí-zan íz strêit-fór-uard: / ân-der-stén-din íz pé-siv, / uáil spí-kin íz an ék-tiv skíl',
        pt: 'O motivo é direto ao ponto: entender é passivo, enquanto falar é uma habilidade ativa.',
        trap: '"Straightforward" se quebra em "straight" (strêit) + "forward" (fór-uard).'
      },
      {
        chunks: ['Instead of translating word by word,', 'fluent speakers connect', 'small blocks of language.'],
        phon: 'ins-téd óv trénz-lêi-tin uôrd bái uôrd, / flú-ent spí-kers ka-nékt / smól blóks óv léng-guidj',
        pt: 'Em vez de traduzir palavra por palavra, falantes fluentes conectam pequenos blocos de idioma.',
        trap: '"Word" (uôrd) tem som fechado de Ô — cuidado para não confundir com "world" (uôrld).'
      },
      {
        chunks: ['Once you practice out loud every day,', 'your brain starts building', 'sentences automatically.'],
        phon: 'uâns iú prék-tis áut láud év-ri dêi, / iór brêin stárts bíl-din / sén-ten-sez ó-to-mé-ti-kli',
        pt: 'Uma vez que você pratica em voz alta todo dia, seu cérebro começa a montar frases automaticamente.',
        trap: '"Once" soa "uâns" (com som de W na frente!). "Building" não lê o U (bíl-din).'
      }
    ],
    question: 'Segundo o texto, o que falantes fluentes fazem em vez de traduzir palavra por palavra?',
    options: [
      'Decoram o dicionário inteiro.',
      'Conectam pequenos blocos prontos de idioma.',
      'Lêem em silêncio por várias horas.'
    ],
    answerIndex: 1
  },
  {
    id: 'rd-3',
    level: 'B1/B2 • Trabalho',
    title: 'Lidando Com Um Imprevisto Sem Perder a Calma',
    topic: 'Resolução de Problemas',
    sentences: [
      {
        chunks: ['Hey team, just a quick heads-up', 'about the release', 'planned for tomorrow.'],
        phon: 'rêi tím, djâst a kuík rédz-âp / a-báut dhê ri-lís / plénd fór tchu-mó-rôu',
        pt: 'Oi time, só um aviso rápido sobre o lançamento planejado para amanhã.',
        trap: '"Planned" soa "plénd" (sem pronunciar o E).'
      },
      {
        chunks: ['We ran into an unexpected issue', 'during the final tests', 'this morning.'],
        phon: 'uí rén ín-tchu an ân-iks-pék-ted í-shu / diú-rin dhê fái-nal tésts / dhís mór-nin',
        pt: 'Nós topamos com um problema inesperado durante os testes finais hoje de manhã.',
        trap: '"Unexpected" lê o -ed no fim (iks-pék-ted) porque termina com T.'
      },
      {
        chunks: ['I am already looking into it,', 'and I should figure out the root cause', 'within the next hour.'],
        phon: 'áim ól-ré-di lú-kin ín-tchu ít, / énd ái shúd fí-guer áut dhê rút kóz / uí-dhín dhê nékst áu-er',
        pt: 'Já estou investigando e devo descobrir a causa raiz dentro da próxima hora.',
        trap: 'Em "should" o L é mudo (shúd). Em "hour" o H é mudo (áu-er).'
      },
      {
        chunks: ['If we need to put off the launch,', 'I will let everyone know', 'as soon as possible.'],
        phon: 'íf uí níd tchu pút óf dhê lóntch, / áil lét év-ri-uân nôu / éz sún éz pó-si-bol',
        pt: 'Se precisarmos adiar o lançamento, vou avisar todo mundo assim que possível.',
        trap: 'Em "know" o K é mudo (nôu). "Launch" soa "lóntch" (não confunda com "lunch" = lântch, almoço!).'
      }
    ],
    question: 'Qual é o plano da pessoa na próxima hora?',
    options: [
      'Cancelar o projeto definitivamente.',
      'Descobrir a causa raiz do erro nos testes.',
      'Fazer uma apresentação para novos clientes.'
    ],
    answerIndex: 1
  },
  {
    id: 'rd-4',
    level: 'B2 • Tecnologia',
    title: 'Como a IA Está Mudando a Rotina Profissional',
    topic: 'Tecnologia & Carreira',
    sentences: [
      {
        chunks: ['Over the last few years,', 'AI tools have completely changed', 'how teams get work done.'],
        phon: 'ôu-ver dhê lést fiú í-erz, / êi-ái túlz rév kom-plít-li tchêindjd / ráu tímz guét uôrk dân',
        pt: 'Nos últimos anos, ferramentas de IA mudaram completamente como equipes entregam trabalho.',
        trap: '"Changed" = tchêindjd (uma sílaba só). "Done" soa "dân".'
      },
      {
        chunks: ['Tasks that used to take hours', 'of manual research', 'can now be handled in minutes.'],
        phon: 'tésks dhét iúst tchu têik áu-erz / óv mé-niu-al ri-sêrtch / kén náu bí rén-dold ín mí-nets',
        pt: 'Tarefas que costumavam levar horas de pesquisa manual agora podem ser resolvidas em minutos.',
        trap: '"Used to" (costumava) soa "iúst tchu". "Handled" = rén-dold.'
      },
      {
        chunks: ['However, technology alone', 'is never enough', 'if you cannot communicate clearly.'],
        phon: 'rau-é-ver, tek-nó-lo-dji a-lôun / íz né-ver i-nâf / íf iú ké-nót ko-miú-ni-kêit klír-li',
        pt: 'Porém, tecnologia sozinha nunca é suficiente se você não consegue se comunicar com clareza.',
        trap: '"Enough" termina com som de F: "i-nâf"!'
      },
      {
        chunks: ['That is why professionals who combine', 'technical skills with strong English', 'stand out immediately.'],
        phon: 'dhéts uái pro-fé-sha-nalz rú kom-báin / ték-ni-kal skílz uíth stróng íng-glish / sténd áut i-mí-di-at-li',
        pt: 'É por isso que profissionais que combinam habilidades técnicas com inglês forte se destacam imediatamente.',
        trap: '"Stand out" = destacar-se. "Who" tem W mudo (rú).'
      }
    ],
    question: 'Qual combinação faz um profissional se destacar segundo o texto?',
    options: [
      'Trabalhar mais horas sem usar tecnologia.',
      'Combinar habilidades técnicas com comunicação forte em inglês.',
      'Evitar ferramentas de IA no dia a dia.'
    ],
    answerIndex: 1
  },
  {
    id: 'rd-5',
    level: 'B1/B2 • Produtividade',
    title: 'A Armadilha de Fazer Mil Coisas ao Mesmo Tempo',
    topic: 'Foco & Hábitos',
    sentences: [
      {
        chunks: ['Most people believe that', 'multitasking helps them', 'save time during the day.'],
        phon: 'môust pí-pol bi-lív dhét / mâl-ti-tés-kin rélps dhém / sêiv táim diú-rin dhê dêi',
        pt: 'A maioria das pessoas acredita que ser multitarefa ajuda a economizar tempo durante o dia.',
        trap: '"Believe" tem o som longo no meio (bi-lív).'
      },
      {
        chunks: ['In fact, switching between tabs', 'every five minutes', 'makes it harder to focus.'],
        phon: 'ín fékt, suí-tchin bi-tuín tébz / év-ri fáiv mí-nets / mêiks ít rár-der tchu fôu-kas',
        pt: 'Na realidade, alternar entre abas a cada cinco minutos torna mais difícil manter o foco.',
        trap: '"Makes it" junta e vira "mêik-sit".'
      },
      {
        chunks: ['You end up making more mistakes', 'and feeling tired', 'even though you finished less.'],
        phon: 'iú énd âp mêi-kin mór mis-têiks / énd fí-lin tái-erd / í-ven dhôu iú fí-nisht lés',
        pt: 'Você acaba cometendo mais erros e se sentindo cansado, embora tenha terminado menos.',
        trap: '"Tired" soa "tái-erd". "Even though" = í-ven dhôu.'
      },
      {
        chunks: ['Try working in focused blocks', 'of forty-five minutes;', 'otherwise, distractions will win.'],
        phon: 'trái uôr-kin ín fôu-kast blóks / óv fór-ti-fáiv mí-nets; / ó-dher-uáiz, dis-trék-shanz uíl uín',
        pt: 'Tente trabalhar em blocos focados de 45 minutos; caso contrário, as distrações vão vencer.',
        trap: '"Focused" soa "fôu-kast" (sem E). "Otherwise" = caso contrário.'
      }
    ],
    question: 'O que acontece quando você troca de aba a cada 5 minutos?',
    options: [
      'Você termina o trabalho na metade do tempo.',
      'Você comete mais erros, cansa mais e entrega menos.',
      'Seu cérebro aprende mais rápido.'
    ],
    answerIndex: 1
  },
  {
    id: 'rd-6',
    level: 'B2 • Negociação',
    title: 'Como Discordar com Educação em Uma Reunião',
    topic: 'Comunicação Profissional',
    sentences: [
      {
        chunks: ['I see what you mean,', 'and that approach definitely', 'makes sense on paper.'],
        phon: 'ái sí uót iú mín, / énd dhét a-prôutch dé-fi-nit-li / mêiks séns ón pêi-per',
        pt: 'Eu entendo o que você quer dizer, e essa abordagem definitivamente faz sentido no papel.',
        trap: '"Definitely" = dé-fi-nit-li. "Approach" = a-prôutch (abordagem).'
      },
      {
        chunks: ['On the other hand,', 'we should keep in mind', 'how tight our budget is.'],
        phon: 'ón dhí ó-dher rénd, / uí shúd kíp ín máind / ráu táit áu-er bâ-djet íz',
        pt: 'Por outro lado, devemos ter em mente o quão apertado está nosso orçamento.',
        trap: '"Budget" soa "bâ-djet" (o D quase se funde no G).'
      },
      {
        chunks: ['If we try to build everything at once,', 'we might run out of time', 'before the deadline.'],
        phon: 'íf uí trái tchu bíld év-ri-thin ét uâns, / uí máit rân áut óv táim / bi-fór dhê déd-láin',
        pt: 'Se tentarmos construir tudo de uma vez, podemos ficar sem tempo antes do prazo.',
        trap: '"At once" = de uma vez só. "Might" = máit (gh mudo).'
      },
      {
        chunks: ['What if we start with a simpler version', 'and improve it step by step?'],
        phon: 'uót íf uí stárt uíth a sím-pler vêr-jan / énd im-prúv ít stép bái stép?',
        pt: 'E se começarmos com uma versão mais simples e melhorarmos passo a passo?',
        trap: '"What if..." é o jeito nº 1 de sugerir uma alternativa sem parecer autoritário.'
      }
    ],
    question: 'Qual alternativa a pessoa propõe no final?',
    options: [
      'Aumentar o orçamento da equipe imediatamente.',
      'Começar com uma versão mais simples e evoluir passo a passo.',
      'Desistir da ideia por completo.'
    ],
    answerIndex: 1
  }
];

export const READING_PASSAGES = [...CORE_READING_PASSAGES, ...EXTRA_READING_PASSAGES, ...PACK2_READING_PASSAGES];
