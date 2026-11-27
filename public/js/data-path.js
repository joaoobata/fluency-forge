// 8 Progressive Units x 4 Lessons = 32 Duolingo-style guided lessons
// Each lesson pulls structured interactive exercises (wordbank, choice, listen, type, speak)

export const LEARNING_PATH = [
  {
    id: 'unit-1',
    number: 1,
    color: '#d94826',
    badge: 'UNIDADE 1',
    title: 'Os Motores de Frase (Comece Aqui!)',
    desc: 'Monte frases no presente, futuro e passado usando motores fixos onde o verbo nunca muda.',
    lessons: [
      {
        id: 'u1-l1',
        title: 'Preciso & Quero (Sem Conjugar)',
        icon: 'rocket',
        xp: 30,
        steps: [
          { type: 'choice', prompt: 'Como você diz "Eu preciso resolver isso hoje" de forma natural?', options: ['I need to figure this out today.', 'I needing solve this today.', 'I need for figure out this today.', 'I must to figure out today.'], answer: 0, phon: 'ái ní-tchu fí-guer dhís áut tchu-dêi', explain: 'Use o motor fixo "I need to" + verbo puro ("figure out").' },
          { type: 'wordbank', pt: 'Eu preciso falar com ele agora.', en: 'I need to talk to him now', distractors: ['speaking', 'for'], phon: 'ái ní-tchu tók tchu rím náu', explain: 'Em "talk", o L é mudo (soa "tók").' },
          { type: 'listen', en: 'I want to finish this task before lunch.', pt: 'Eu quero terminar essa tarefa antes do almoço.', options: ['Eu quero terminar essa tarefa antes do almoço.', 'Eu preciso adiar essa tarefa para amanhã.', 'Eu já terminei essa tarefa ontem.', 'Eu não consigo achar essa tarefa.'], answer: 0, phon: 'ái uónt tchu fí-nish dhís tésk bi-fór lântch', explain: '"Lunch" = almoço (lântch). "Want to" na fala rápida vira "wanna".' },
          { type: 'wordbank', pt: 'Estou tentando entender o que aconteceu.', en: "I'm trying to understand what happened", distractors: ['did', 'for'], phon: 'áim trái-in tchu ân-der-sténd uót ré-pend', explain: 'Motor "I\'m trying to" + verbo puro.' },
          { type: 'speak', en: 'I need to check the details today.', pt: 'Eu preciso checar os detalhes hoje.', phon: 'ái ní-tchu tchék dhê dí-têilz tchu-dêi', explain: 'Corte o final de "check" seco (sem falar "tchéqui").' },
          { type: 'type', pt: 'Eu quero falar o que eu precisar.', en: 'I want to say whatever I need.', alt: ['I want to speak whatever I need.', 'I wanna say whatever I need.'], phon: 'ái uónt tchu sêi uó-té-ver ái níd', explain: '"Whatever" = o que quer que / qualquer coisa que.' }
        ]
      },
      {
        id: 'u1-l2',
        title: 'Futuro Natural (Gonna & Will)',
        icon: 'fast-forward',
        xp: 30,
        steps: [
          { type: 'choice', prompt: 'Qual é o jeito mais falado por nativos para "Eu vou falar com ele agora"?', options: ["I'm gonna talk to him right now.", 'I go talk with him right now.', 'I going to talking to him now.', 'I am go to speak him now.'], answer: 0, phon: 'áim gó-na tók tchu rím ráit náu', explain: '"I\'m going to" na fala natural encurta para "I\'m gonna" + verbo puro.' },
          { type: 'wordbank', pt: 'Vou te mandar o link hoje à tarde.', en: "I'll send you the link this afternoon", distractors: ['to', 'sending'], phon: 'áil sénd iú dhê línk dhís éf-ter-nún', explain: '"I\'ll" = I will (decisão rápida na hora da fala).' },
          { type: 'listen', en: "I'm going to fix this issue right away.", pt: 'Vou corrigir esse problema imediatamente.', options: ['Vou corrigir esse problema imediatamente.', 'Eu corrigi esse problema semana passada.', 'Não posso corrigir esse problema hoje.', 'Você pode corrigir isso amanhã?'], answer: 0, phon: 'áim gó-na fíks dhís í-shu ráit a-uêi', explain: '"Right away" = na hora / imediatamente.' },
          { type: 'wordbank', pt: 'Nós vamos revisar tudo antes de sexta.', en: "We're going to review everything before Friday", distractors: ['reviewed', 'in'], phon: 'uír gó-na ri-viú év-ri-thin bi-fór frái-dei', explain: 'Motor "We\'re going to" + verbo puro.' },
          { type: 'speak', en: "I'll check that and get back to you today.", pt: 'Vou checar isso e te retorno ainda hoje.', phon: 'áil tchék dhét énd guét bék tchu iú tchu-dêi', explain: '"Get back to you" = retornar para você.' },
          { type: 'type', pt: 'Eu vou falar com ele agora.', en: "I'm going to talk to him right now.", alt: ["I'm gonna talk to him now.", "I'll talk to him right now."], phon: 'áim gó-na tók tchu rím ráit náu', explain: 'Tanto "I\'m gonna" quanto "I\'ll" funcionam muito bem!' }
        ]
      },
      {
        id: 'u1-l3',
        title: 'Negar & Passado Rápido',
        icon: 'repeat',
        xp: 35,
        steps: [
          { type: 'choice', prompt: 'Como dizer "Eu não consegui terminar a tempo"?', options: ["I couldn't finish on time.", "I didn't can finish on time.", "I no could finished on time.", "I can't finished in time."], answer: 0, phon: 'ái kú-dent fí-nish ón táim', explain: 'Passado de "can\'t" é "couldn\'t" + verbo puro (nunca "didn\'t can"!).' },
          { type: 'wordbank', pt: 'Eu tive que mudar meus planos ontem.', en: 'I had to change my plans yesterday', distractors: ['changed', 'have'], phon: 'ái réd tchu tchêindj mái plénz iés-ter-dei', explain: 'Motor de passado "I had to" (eu tive que) + verbo puro.' },
          { type: 'listen', en: "I didn't get the email yet.", pt: 'Eu não recebi o e-mail ainda.', options: ['Eu não recebi o e-mail ainda.', 'Eu já respondi o e-mail hoje.', 'Eu esqueci de mandar o e-mail.', 'Você viu meu e-mail ontem?'], answer: 0, phon: 'ái dí-dent guét dhí í-mêil iét', explain: 'Depois de "didn\'t", o verbo fica puro ("get", nunca "got").' },
          { type: 'wordbank', pt: 'Você viu a minha mensagem?', en: 'Did you see my message?', distractors: ['saw', 'do'], phon: 'díd djú sí mái mé-sidj?', explain: 'Pergunta no passado sempre abre com "Did you" + verbo puro.' },
          { type: 'speak', en: "I can't hear you very well right now.", pt: 'Não consigo te ouvir muito bem agora.', phon: 'ái ként rír iú vé-ri uél ráit náu', explain: 'Útil demais quando o áudio falha na call.' },
          { type: 'type', pt: 'Eu não consegui terminar tudo.', en: "I couldn't finish everything.", alt: ["I wasn't able to finish everything."], phon: 'ái kú-dent fí-nish év-ri-thin', explain: 'Lembre do motor: "I couldn\'t" + verbo puro.' }
        ]
      },
      {
        id: 'u1-l4',
        title: 'Desafio Unidade 1: Fogo Cruzado',
        icon: 'trophy',
        xp: 50,
        steps: [
          { type: 'wordbank', pt: 'Tem um pequeno problema aqui.', en: 'There is a small problem here', distractors: ['Have', 'Has'], phon: 'dhér íz a smól pró-blem rír', explain: 'Armadilha nº 1: "Tem / Existe" em inglês é "There is / There are", NUNCA "Have"!' },
          { type: 'choice', prompt: 'Qual pergunta está correta para "Você pode me mandar o link?"', options: ['Can you send me the link?', 'Can you to send me the link?', 'Do you can send me the link?', 'Are you can send the link?'], answer: 0, phon: 'kén iú sénd mí dhê línk?', explain: 'Depois de "Can you", nunca coloque "to" nem "do".' },
          { type: 'listen', en: 'I had to work late yesterday, so I am tired today.', pt: 'Tive que trabalhar até tarde ontem, então estou cansado hoje.', options: ['Tive que trabalhar até tarde ontem, então estou cansado hoje.', 'Vou trabalhar até tarde amanhã.', 'Não consegui trabalhar ontem.', 'Estou descansado hoje de manhã.'], answer: 0, phon: 'ái réd tchu uôrk lêit iés-ter-dei, sôu áim tái-erd tchu-dêi', explain: '"So" conecta causa e efeito ("então").' },
          { type: 'type', pt: 'Você viu a minha mensagem?', en: 'Did you see my message?', alt: ['Have you seen my message?'], phon: 'díd djú sí mái mé-sidj?', explain: 'Pergunta direta no passado: "Did you + verbo puro".' },
          { type: 'speak', en: 'I need to figure this out before Friday.', pt: 'Preciso resolver isso antes de sexta.', phon: 'ái ní-tchu fí-guer dhís áut bi-fór frái-dei', explain: 'Fale tudo num fôlego só!' },
          { type: 'type', pt: 'Tem um problema pequeno aqui.', en: 'There is a small problem here.', alt: ["There's a small problem here.", "There's a small issue here."], phon: 'dhérz a smól pró-blem rír', explain: 'Parabéns — você dominou os motores base da Unidade 1!' }
        ]
      }
    ]
  },

  {
    id: 'unit-2',
    number: 2,
    color: '#1e4d8c',
    badge: 'UNIDADE 2',
    title: 'Sobrevivência em Calls & Reuniões',
    desc: 'Entre em qualquer chamada sem travar: dê updates, ganhe tempo e peça clareza.',
    lessons: [
      {
        id: 'u2-l1',
        title: 'Abrir a Call & Dar Updates',
        icon: 'briefcase',
        xp: 35,
        steps: [
          { type: 'choice', prompt: 'Como avisar "Acho que você está no mudo" numa call?', options: ["I think you're on mute.", 'I think you are in silent.', 'You stay without voice.', 'Your mic is closed.'], answer: 0, phon: 'ái thínk iór ón miút', explain: 'A expressão padrão mundial é "on mute".' },
          { type: 'wordbank', pt: 'Atualmente estou trabalhando na última atualização.', en: "I'm currently working on the latest update", distractors: ['actually', 'in'], phon: 'áim kâr-rent-li uôr-ki-nón dhê lêi-test âp-dêit', explain: '"Atualmente" = currently (NUNCA "actually"!).' },
          { type: 'listen', en: 'Let me share my screen to show you the progress.', pt: 'Deixa eu compartilhar minha tela para te mostrar o progresso.', options: ['Deixa eu compartilhar minha tela para te mostrar o progresso.', 'Minha tela travou durante a chamada.', 'Você pode compartilhar sua tela agora?', 'Vamos encerrar a reunião agora.'], answer: 0, phon: 'lét mí shér mái skrín tchu shôu iú dhê pró-gres', explain: '"Let me share my screen" = frase obrigatória de call.' },
          { type: 'wordbank', pt: 'Vamos encerrar a call em cinco minutos.', en: "Let's wrap up the call in five minutes", distractors: ['close', 'at'], phon: 'léts rép âp dhê cól ín fáiv mí-nets', explain: '"Wrap up" (W mudo: rép âp) = finalizar/encerrar.' },
          { type: 'speak', en: 'Can you hear me okay right now?', pt: 'Você consegue me ouvir bem agora?', phon: 'kén iú rír mí ôu-kêi ráit náu?', explain: 'Simples, natural e direto.' },
          { type: 'type', pt: 'Deixa eu compartilhar minha tela.', en: 'Let me share my screen.', alt: ['Let me share my screen with you.'], phon: 'lét mí shér mái skrín', explain: 'Use sempre que for mostrar algo na reunião.' }
        ]
      },
      {
        id: 'u2-l2',
        title: 'Ganhar Tempo Sem Ficar Mudo',
        icon: 'hourglass',
        xp: 35,
        steps: [
          { type: 'choice', prompt: 'O que falar para ganhar 4 segundos quando der branco numa pergunta?', options: ['Let me think about the best way to put this.', 'Wait, I am translating in my head.', 'Stop, my brain stopped.', 'Give me time to open Google.'], answer: 0, phon: 'lét mí thínk a-báut dhê bést uêi tchu pút dhís', explain: '"Put this" = expressar/dizer isso. Soa super inteligente e calmo!' },
          { type: 'wordbank', pt: 'Só para garantir que estamos alinhados.', en: "Just to make sure we're on the same page", distractors: ['in', 'equal'], phon: 'djâst tchu mêik xúr uír ón dhê sêim pêidj', explain: '"On the same page" = alinhados / entendendo a mesma coisa.' },
          { type: 'listen', en: 'Let me double-check the numbers and get back to you.', pt: 'Deixa eu conferir os números duas vezes e te retorno.', options: ['Deixa eu conferir os números duas vezes e te retorno.', 'Os números estão todos errados.', 'Eu não tenho acesso aos números.', 'Já te mandei os números ontem.'], answer: 0, phon: 'lét mí dâ-bol tchék dhê nâm-berz énd guét bék tchu iú', explain: 'Salva você quando não tem um dado de cabeça na call.' },
          { type: 'wordbank', pt: 'Espera um segundo, deixa eu abrir o arquivo.', en: 'Hold on a second, let me open the file', distractors: ['Wait', 'opening'], phon: 'rôuld ón a sé-kond, lét mí ôu-pen dhê fáil', explain: '"Hold on" ou "Hang on" = segura um segundo.' },
          { type: 'speak', en: 'Let me rephrase that in a clearer way.', pt: 'Deixa eu reformular isso de um jeito mais claro.', phon: 'lét mí ri-frêiz dhét ín a klí-rer uêi', explain: 'Se a frase sair torta, solte essa e recomece com calma!' },
          { type: 'type', pt: 'Deixa eu checar e te retorno hoje.', en: 'Let me check and get back to you today.', alt: ["Let me check and I'll get back to you today."], phon: 'lét mí tchék énd guét bék tchu iú tchu-dêi', explain: 'Frase de ouro no trabalho.' }
        ]
      },
      {
        id: 'u2-l3',
        title: 'Pedir Repetição & Clareza',
        icon: 'headphones',
        xp: 35,
        steps: [
          { type: 'choice', prompt: 'O áudio da pessoa picotou na call. Qual frase é mais natural?', options: ['You broke up a bit — could you repeat that?', 'Your voice broken — speak again.', 'You cutted the internet — repeat.', 'I listened nothing — tell again.'], answer: 0, phon: 'iú brôuk âp a bít — kúd djú ri-pít dhét?', explain: '"You broke up" = seu áudio picotou/cortou.' },
          { type: 'wordbank', pt: 'Você pode me explicar passo a passo como isso funciona?', en: 'Could you walk me through how this works?', distractors: ['step', 'working'], phon: 'kúd djú uók mí thrú ráu dhís uôrks?', explain: '"Walk me through" = me guiar / explicar passo a passo.' },
          { type: 'listen', en: 'Sorry, could you slow down just a little bit?', pt: 'Desculpa, você pode falar um pouquinho mais devagar?', options: ['Desculpa, você pode falar um pouquinho mais devagar?', 'Você pode falar mais alto?', 'A chamada vai acabar agora.', 'Não preciso que você repita.'], answer: 0, phon: 'só-ri, kúd djú slôu dáun djâst a lí-rol bít?', explain: 'Nativos respeitam muito quando você pede isso com calma.' },
          { type: 'wordbank', pt: 'Desculpa interromper, mas tenho uma dúvida rápida.', en: 'Sorry to interrupt, but I have a quick question', distractors: ['for', 'doubt'], phon: 'só-ri tchu in-te-râpt, bât ái rév a kuík kués-tchan', explain: 'Dica: "dúvida" em inglês é "question" (raramente "doubt"!).' },
          { type: 'speak', en: 'Does what I explained make sense so far?', pt: 'Faz sentido o que eu expliquei até agora?', phon: 'dâz uót ái iks-plêind mêik séns sôu fár?', explain: 'Mostra segurança total ao explicar algo.' },
          { type: 'type', pt: 'Desculpa, você pode repetir essa última parte?', en: 'Sorry, could you repeat that last part?', alt: ['Sorry, can you repeat that last part?'], phon: 'só-ri, kúd djú ri-pít dhét lést párt?', explain: 'Curta, educada e sempre funciona.' }
        ]
      },
      {
        id: 'u2-l4',
        title: 'Desafio Unidade 2: Reunião Ao Vivo',
        icon: 'trophy',
        xp: 55,
        steps: [
          { type: 'wordbank', pt: 'Só um aviso rápido: vou entrar cinco minutos atrasado.', en: 'Just a quick heads-up: I will join five minutes late', distractors: ['notice', 'enter'], phon: 'djâst a kuík rédz-âp: áil djóin fáiv mí-nets lêit', explain: '"Join a call" = entrar numa chamada (evite "enter the call").' },
          { type: 'choice', prompt: 'Como dizer "Tivemos um atraso, mas já estamos de volta nos trilhos"?', options: ["We had a delay, but we're back on track.", 'We have a late, but we return to rail.', 'We delayed, but now is normal track.', 'We had delay and back in line.'], answer: 0, phon: 'uí réd a di-lêi, bât uír bék ón trék', explain: '"Back on track" = de volta nos trilhos / no prazo.' },
          { type: 'listen', en: 'Just to clarify: does this need to be ready by Friday?', pt: 'Só para esclarecer: isso precisa estar pronto até sexta?', options: ['Só para esclarecer: isso precisa estar pronto até sexta?', 'Isso já ficou pronto na sexta passada.', 'Podemos cancelar a entrega de sexta.', 'Quem vai entregar isso na segunda?'], answer: 0, phon: 'djâst tchu klé-ri-fái: dâz dhís níd tchu bí ré-di bái frái-dei?', explain: '"By Friday" = até sexta-feira (prazo limite).' },
          { type: 'type', pt: 'Acho que você está no mudo.', en: "I think you're on mute.", alt: ['I think you are on mute.'], phon: 'ái thínk iór ón miút', explain: 'Clássico das calls!' },
          { type: 'speak', en: 'Keep me posted if anything changes.', pt: 'Me mantenha informado se algo mudar.', phon: 'kíp mí pôus-ted íf é-ni-thin tchêin-djez', explain: '"Keep me posted" = me mantenha atualizado.' },
          { type: 'type', pt: 'Você pode me explicar passo a passo?', en: 'Could you walk me through it?', alt: ['Can you walk me through it?', 'Can you explain it step by step?'], phon: 'kúd djú uók mí thrú ít?', explain: 'Unidade 2 concluída — você já sobrevive a qualquer call!' }
        ]
      }
    ]
  },

  {
    id: 'unit-3',
    number: 3,
    color: '#1b6b4f',
    badge: 'UNIDADE 3',
    title: 'Destravando Leitura & Sons Difíceis',
    desc: 'Elimine os vícios que fazem brasileiros travar lendo em voz alta: -ed, letras mudas e linking.',
    lessons: [
      {
        id: 'u3-l1',
        title: 'Passado -ed & Consoante Seca',
        icon: 'book-open',
        xp: 35,
        steps: [
          { type: 'choice', prompt: 'Como se pronuncia corretamente "worked" (trabalhei)?', options: ['uôrkt (1 sílaba, SEM ler o E)', 'uôr-ked (lendo o -ed)', 'uôr-ki-dji', 'uór-kéd'], answer: 0, phon: 'uôrkt', explain: 'O -ed só vira uma sílaba extra (-id) depois de T ou D (ex: needed, wanted, started)!' },
          { type: 'choice', prompt: 'Em qual destas palavras o "-ed" REALMENTE se pronuncia como sílaba extra?', options: ['needed (ní-ded)', 'finished (fí-nisht)', 'changed (tchêindjd)', 'helped (rélpt)'], answer: 0, phon: 'ní-ded', explain: 'Porque "need" termina com som de D! As outras terminam com som seco.' },
          { type: 'listen', en: 'I worked late yesterday and finished the final report.', pt: 'Trabalhei até tarde ontem e terminei o relatório final.', options: ['Trabalhei até tarde ontem e terminei o relatório final.', 'Vou trabalhar tarde amanhã no relatório.', 'Preciso começar o relatório ainda hoje.', 'Esqueci de revisar o relatório final.'], answer: 0, phon: 'ái uôrkt lêit iés-ter-dei énd fí-nisht dhê fái-nal ri-pórt', explain: 'Ouça o som seco de T em "worked" e "finished"!' },
          { type: 'wordbank', pt: 'Eu acabei de revisar a última atualização.', en: 'I just finished reviewing the latest update', distractors: ['review', 'to'], phon: 'ái djâst fí-nisht ri-viú-in dhê lêi-test âp-dêit', explain: 'Depois de "finish", o verbo seguinte leva -ing!' },
          { type: 'speak', en: 'I checked the file, fixed the bug, and saved it.', pt: 'Chequei o arquivo, corrigi o bug e salvei.', phon: 'ái tchékt dhê fáil, fíkst dhê bâg, énd sêivd ít', explain: 'Treine os 3 passados SEM ler o E: tchékt, fíkst, sêivd!' },
          { type: 'type', pt: 'O prazo mudou ontem.', en: 'The deadline changed yesterday.', alt: ['The deadline changed yesterday'], phon: 'dhê déd-láin tchêindjd iés-ter-dei', explain: '"Changed" = tchêindjd (1 sílaba).' }
        ]
      },
      {
        id: 'u3-l2',
        title: 'Letras Mudas & Família -ough',
        icon: 'volume-x',
        xp: 35,
        steps: [
          { type: 'choice', prompt: 'Qual é o som correto de "through" (através) e "though" (embora/porém)?', options: ['through = thrú  |  though = dhôu', 'through = trôug  |  though = tóug', 'Os dois se falam "tôu"', 'through = thót  |  though = thrú'], answer: 0, phon: 'thrú / dhôu', explain: 'O "gh" é mudo nos dois! E "thought" (pensei) soa "thót".' },
          { type: 'choice', prompt: 'Qual letra é MUDA em "doubt" (dúvida), "subtle" (sutil) e "climb" (escalar)?', options: ['A letra B (dáut, sâ-tol, kláim)', 'A letra T', 'A letra L', 'Nenhuma — todas se lêem'], answer: 0, phon: 'dáut / sâ-tol / kláim', explain: 'B antes de T ou no final após M é mudo em inglês!' },
          { type: 'listen', en: 'Although our schedule is tight, we have enough time.', pt: 'Embora nossa agenda esteja apertada, temos tempo suficiente.', options: ['Embora nossa agenda esteja apertada, temos tempo suficiente.', 'Nossa agenda está totalmente vazia hoje.', 'Não temos tempo suficiente para terminar.', 'Vamos cancelar a agenda desta semana.'], answer: 0, phon: 'ól-dhôu áu-er ské-djul íz táit, uí rév i-nâf táim', explain: '"Tight" = táit (gh mudo); "Enough" = i-nâf (som de F!).' },
          { type: 'wordbank', pt: 'Vamos conversar sobre isso na quarta-feira.', en: "Let's talk about this on Wednesday", distractors: ['in', 'say'], phon: 'léts tók a-báut dhís ón uênz-dei', explain: 'L mudo em "talk" (tók) e D mudo em "Wednesday" (uênz-dei)!' },
          { type: 'speak', en: 'I thought we had enough time to walk through the answer.', pt: 'Achei que tínhamos tempo suficiente para repassar a resposta.', phon: 'ái thót uí réd i-nâf táim tchu uók thrú dhí én-ser', explain: 'Desafio de letras mudas: thought (thót), enough (i-nâf), walk (uók), answer (én-ser)!' },
          { type: 'type', pt: 'Eu não tenho nenhuma dúvida sobre isso.', en: 'I have no doubt about it.', alt: ["I don't have any doubt about it.", 'I have no doubt about this.'], phon: 'ái rév nôu dáut a-báut ít', explain: '"Doubt" = dáut (B mudo!).' }
        ]
      },
      {
        id: 'u3-l3',
        title: 'Juntando Palavras (Linking & Flap T)',
        icon: 'link-2',
        xp: 40,
        steps: [
          { type: 'choice', prompt: 'Como um americano pronuncia "working on it" em velocidade normal?', options: ['uôr-ki-nó-nit (tudo ligado)', 'uôr-king / ón / ít (pausado)', 'uôr-kí-on-ít-i', 'uór-ken-it'], answer: 0, phon: 'uôr-ki-nó-nit', explain: 'Consoante final cola na vogal seguinte — por isso nativos parecem falar rápido!' },
          { type: 'choice', prompt: 'Como soa o T no meio de "better", "water" e "meeting" no inglês americano?', options: ['Quase como um R fraco (bé-rer, uó-rer, mí-rin)', 'Como um T bem forte (bé-TÊR)', 'Como um S', 'Não existe regra'], answer: 0, phon: 'bé-rer / uó-rer / mí-rin', explain: 'Esse é o famoso "Flap T" americano!' },
          { type: 'listen', en: 'Check it out when you get a chance — this version is much better.', pt: 'Dá uma olhada quando tiver uma chance — essa versão está bem melhor.', options: ['Dá uma olhada quando tiver uma chance — essa versão está bem melhor.', 'Essa versão está bem pior que a antiga.', 'Não precisa olhar o arquivo hoje.', 'A reunião foi remarcada para amanhã.'], answer: 0, phon: 'tché-ki-dáut uén iú gué-ra tchéns — dhís vêr-jan íz mâtch bé-rer', explain: 'Repare em "check it out" → "tché-ki-dáut" e "better" → "bé-rer".' },
          { type: 'wordbank', pt: 'Nós vamos dar um jeito nisso juntos.', en: "We'll figure it out together", distractors: ['on', 'solve'], phon: 'uíl fí-gue-ri-dáut tchu-gué-dher', explain: '"Figure it out" cola virando "fí-gue-ri-dáut".' },
          { type: 'speak', en: "I'm working on it right now and getting much better.", pt: 'Estou trabalhando nisso agora e ficando muito melhor.', phon: 'áim uôr-ki-nó-nit ráit náu énd gué-rin mâtch bé-rer', explain: 'Leia conectado sem pausar entre "working-on-it"!' },
          { type: 'type', pt: 'Essa versão é muito melhor.', en: 'This version is much better.', alt: ['This version is way better.'], phon: 'dhís vêr-jan íz mâtch bé-rer', explain: 'Dica: "way better" é super nativo também!' }
        ]
      },
      {
        id: 'u3-l4',
        title: 'Desafio Unidade 3: Leitura Fluida',
        icon: 'trophy',
        xp: 55,
        steps: [
          { type: 'choice', prompt: 'Qual par tem risco de gafe se você encurtar a vogal longa?', options: ['sheet (planilha: shíít) vs. shit', 'work vs. walk', 'time vs. team', 'make vs. take'], answer: 0, phon: 'shíít (estique o I!)', explain: 'Sempre estique o som de "ee/ea" em sheet, beach e leave!' },
          { type: 'choice', prompt: 'Como se lê "receipt" (recibo)?', options: ['ri-sít (P mudo!)', 're-séipt', 'ri-sí-pi-ti', 'ré-si-pit'], answer: 0, phon: 'ri-sít', explain: 'P mudo! Muito comum em compras e trabalho.' },
          { type: 'listen', en: 'Clear communication is crucial when teams work remotely.', pt: 'Comunicação clara é crucial quando equipes trabalham remotamente.', options: ['Comunicação clara é crucial quando equipes trabalham remotamente.', 'Trabalhar remotamente não exige comunicação.', 'Equipes presenciais nunca precisam de reuniões.', 'A comunicação ficou mais lenta ontem.'], answer: 0, phon: 'klír ko-miú-ni-kêi-xan íz krú-xal uén tímz uôrk ri-môut-li', explain: 'Finais "-tion" viram "-xan"!' },
          { type: 'speak', en: 'Although it felt tricky at first, I worked through it.', pt: 'Embora parecesse complicado no início, eu superei/resolvi.', phon: 'ól-dhôu ít félt trí-ki ét fêrst, ái uôrkt thrú ít', explain: 'Mistura todas as regras: although, worked, through!' },
          { type: 'wordbank', pt: 'Você pode me mandar o recibo por e-mail?', en: 'Can you email me the receipt?', distractors: ['recipe', 'for'], phon: 'kén iú í-mêil mí dhê ri-sít?', explain: '"Email" em inglês também é verbo ("me mandar por e-mail")!' },
          { type: 'type', pt: 'Comunicação clara é crucial.', en: 'Clear communication is crucial.', alt: ['Clear communication is essential.'], phon: 'klír ko-miú-ni-kêi-xan íz krú-xal', explain: 'Unidade 3 concluída — sua leitura em voz alta já subiu de nível!' }
        ]
      }
    ]
  },

  {
    id: 'unit-4',
    number: 4,
    color: '#b56812',
    badge: 'UNIDADE 4',
    title: 'Verbos Coringas (Phrasal Verbs)',
    desc: 'Domine os verbos duplos que carregam 80% do inglês falado no trabalho e na vida.',
    lessons: [
      {
        id: 'u4-l1',
        title: 'Resolver Problemas Como Nativo',
        icon: 'zap',
        xp: 40,
        steps: [
          { type: 'choice', prompt: 'Qual phrasal verb significa "lidar com" um problema ou cliente?', options: ['deal with', 'put off', 'call off', 'show up'], answer: 0, phon: 'díl uíth', explain: '"I deal with this every day" = eu lido com isso todo dia.' },
          { type: 'wordbank', pt: 'Vou investigar esse erro agora mesmo.', en: "I'll look into that error right now", distractors: ['see', 'at'], phon: 'áil lúk ín-tchu dhét é-ror ráit náu', explain: '"Look into" = investigar / dar uma olhada com calma.' },
          { type: 'listen', en: 'We need to come up with a simpler solution.', pt: 'Precisamos bolar uma solução mais simples.', options: ['Precisamos bolar uma solução mais simples.', 'A solução atual já é a mais simples.', 'Desistimos de procurar uma solução.', 'Vamos adiar essa solução para depois.'], answer: 0, phon: 'uí ní-tchu kâm âp uíth a sím-pler so-lú-xan', explain: '"Come up with" = bolar / criar uma ideia ou solução.' },
          { type: 'wordbank', pt: 'Não se preocupe, vamos organizar e resolver isso.', en: "Don't worry, we'll sort this out", distractors: ['make', 'in'], phon: 'dôunt uô-ri, uíl sórt dhís áut', explain: '"Sort out" = resolver / destrinchar uma confusão.' },
          { type: 'speak', en: 'We need to figure out the root cause first.', pt: 'Precisamos descobrir a causa raiz primeiro.', phon: 'uí ní-tchu fí-guer áut dhê rút kóz fêrst', explain: 'Fale com ritmo firme!' },
          { type: 'type', pt: 'Eu lido com esse tipo de problema todo dia.', en: 'I deal with this kind of problem every day.', alt: ['I deal with this kind of issue every day.'], phon: 'ái díl uíth dhís káind óv í-shu év-ri dêi', explain: 'Excelente! "Deal with" é obrigatório.' }
        ]
      },
      {
        id: 'u4-l2',
        title: 'Prazos, Atrasos & Mudanças',
        icon: 'calendar',
        xp: 40,
        steps: [
          { type: 'choice', prompt: 'Qual é a diferença entre "put off" e "call off"?', options: ['put off = adiar  |  call off = cancelar', 'put off = cancelar  |  call off = adiar', 'Os dois significam começar', 'put off = ligar  |  call off = desligar'], answer: 0, phon: 'pút óf / cól óf', explain: 'Guarde esse par: "put off" empurra para depois; "call off" cancela de vez.' },
          { type: 'wordbank', pt: 'Não podemos adiar mais essa reunião.', en: "We can't put off this meeting anymore", distractors: ['call', 'more'], phon: 'uí ként pút óf dhís mí-tin é-ni-mór', explain: 'Equivalente natural de "postpone".' },
          { type: 'listen', en: 'We ran into an unexpected issue this morning.', pt: 'Topamos com um problema inesperado hoje de manhã.', options: ['Topamos com um problema inesperado hoje de manhã.', 'Corremos para pegar o ônibus hoje cedo.', 'Resolvemos tudo ontem à noite.', 'Não tivemos nenhum imprevisto hoje.'], answer: 0, phon: 'uí rén ín-tchu an ân-iks-pék-ted í-shu dhís mór-nin', explain: 'Passado de "run into" é "ran into".' },
          { type: 'wordbank', pt: 'Se não priorizarmos, vamos ficar atrasados no prazo.', en: "If we don't prioritize, we'll fall behind schedule", distractors: ['drop', 'after'], phon: 'íf uí dôunt prai-ó-ri-táiz, uíl fól bi-ráind ské-djul', explain: '"Fall behind" = ficar para trás / atrasar.' },
          { type: 'speak', en: 'In the end, everything worked out great.', pt: 'No final, acabou dando tudo super certo.', phon: 'ín dhí énd, év-ri-thin uôrkt áut grêit', explain: '"Work out" = dar certo no final.' },
          { type: 'type', pt: 'Tivemos que cancelar a reunião.', en: 'We had to call off the meeting.', alt: ['We had to cancel the meeting.'], phon: 'uí réd tchu cól óf dhê mí-tin', explain: 'Tanto "call off" quanto "cancel" estão corretos!' }
        ]
      },
      {
        id: 'u4-l3',
        title: 'Colaboração & Trabalho em Equipe',
        icon: 'handshake',
        xp: 40,
        steps: [
          { type: 'choice', prompt: 'Como pedir para um colega te atualizar do que você perdeu?', options: ['Can you fill me in on what I missed?', 'Can you complete me on what I lost?', 'Can you fill out me the meeting?', 'Can you give me inside the news?'], answer: 0, phon: 'kén iú fíl mí ín ón uót ái míst?', explain: '"Fill someone in" = colocar alguém a par de tudo.' },
          { type: 'wordbank', pt: 'Obrigado por apontar esse erro.', en: 'Thanks for pointing out that mistake', distractors: ['point', 'at'], phon: 'thénks fór póin-tin áut dhét mis-têik', explain: 'Depois de "for", o verbo sempre leva -ing!' },
          { type: 'listen', en: 'I want to bring up an important point before we wrap up.', pt: 'Quero levantar um ponto importante antes de encerrarmos.', options: ['Quero levantar um ponto importante antes de encerrarmos.', 'Quero cancelar o último ponto da pauta.', 'Já falamos desse ponto semana passada.', 'Ninguém trouxe dúvidas na reunião.'], answer: 0, phon: 'ái uónt tchu bríng âp an im-pór-tent póint bi-fór uí rép âp', explain: '"Bring up" = levantar um assunto numa conversa.' },
          { type: 'wordbank', pt: 'Estou cobrando retorno sobre nossa última conversa.', en: "I'm following up on our last conversation", distractors: ['charging', 'for'], phon: 'áim fó-lôu-in âp ón áu-er lést kón-ver-sêi-xan', explain: '"Follow up on" = dar seguimento / cobrar retorno com educação.' },
          { type: 'speak', en: 'Let us go over the details one more time.', pt: 'Vamos repassar os detalhes mais uma vez.', phon: 'léts gôu ôu-ver dhê dí-têilz uân mór táim', explain: '"Go over" = revisar/repassar.' },
          { type: 'type', pt: 'Você pode me colocar a par do que perdi?', en: 'Can you fill me in on what I missed?', alt: ['Could you fill me in on what I missed?', 'Can you catch me up on what I missed?'], phon: 'kén iú fíl mí ín ón uót ái míst?', explain: '"Fill me in" e "catch me up" são ambos excelentes!' }
        ]
      },
      {
        id: 'u4-l4',
        title: 'Desafio Unidade 4: Falando Como Nativo',
        icon: 'trophy',
        xp: 60,
        steps: [
          { type: 'wordbank', pt: 'Acabamos trabalhando até mais tarde ontem.', en: 'We ended up working late yesterday', distractors: ['finished', 'work'], phon: 'uí én-ded âp uôr-kin lêit iés-ter-dei', explain: '"End up + -ing" = acabar fazendo algo.' },
          { type: 'choice', prompt: 'Qual frase significa "Estou ansioso para trabalhar com vocês"?', options: ["I'm looking forward to working with you.", "I'm looking forward to work with you.", "I'm anxious for working with you.", "I'm waiting to work with you."], answer: 0, phon: 'áim lú-kin fór-uard tchu uôr-kin uíth iú', explain: 'Armadilha clássica: depois de "look forward to", sempre use -ing!' },
          { type: 'listen', en: 'It is hard to keep track of all these tasks without a list.', pt: 'É difícil acompanhar todas essas tarefas sem uma lista.', options: ['É difícil acompanhar todas essas tarefas sem uma lista.', 'É fácil lembrar todas as tarefas de cabeça.', 'Nós já deletamos todas as listas antigas.', 'Precisamos de mais tarefas esta semana.'], answer: 0, phon: 'íts rárd tchu kíp trék óv ól dhíz tésks uí-dháut a líst', explain: '"Keep track of" = acompanhar / manter controle.' },
          { type: 'type', pt: 'Não desista quando travar.', en: "Don't give up when you get stuck.", alt: ['Do not give up when you get stuck.'], phon: 'dôunt guív âp uén iú guét stâk', explain: '"Get stuck" = travar.' },
          { type: 'speak', en: 'Go ahead — I am listening carefully.', pt: 'Pode ir em frente — estou ouvindo com atenção.', phon: 'gôu a-réd — áim lí-se-nin kér-fu-li', explain: '"Go ahead" = pode falar / pode seguir.' },
          { type: 'type', pt: 'Vamos manter o plano original por enquanto.', en: "Let's stick to the original plan for now.", alt: ['Let us stick to the original plan for now.'], phon: 'léts stík tchu dhí o-rí-dji-nal plén fór náu', explain: 'Unidade 4 dominada!' }
        ]
      }
    ]
  },

  {
    id: 'unit-5',
    number: 5,
    color: '#82304c',
    badge: 'UNIDADE 5',
    title: 'Passado, Irregulares & Experiências',
    desc: 'Conte qualquer história de ontem, do trabalho ou da sua carreira sem tropeçar nos verbos.',
    lessons: [
      {
        id: 'u5-l1',
        title: 'Irregulares Campeões (Thought / Bought)',
        icon: 'flame',
        xp: 40,
        steps: [
          { type: 'choice', prompt: 'Qual é o passado correto de "think" (pensar) e "bring" (trazer)?', options: ['thought (thót)  |  brought (brót)', 'thinked  |  bringed', 'bought  |  caught', 'taught  |  thought'], answer: 0, phon: 'thót / brót', explain: 'Repare no R de "brought" (trouxe) para não confundir com "bought" (comprou)!' },
          { type: 'wordbank', pt: 'Eu pensei que a reunião fosse às dez.', en: 'I thought the meeting was at ten', distractors: ['think', 'in'], phon: 'ái thót dhê mí-tin uóz ét tén', explain: 'Para horas exatas, sempre use "at" (at ten).' },
          { type: 'listen', en: 'We caught the bug before going live.', pt: 'Nós pegamos o bug antes de ir ao ar.', options: ['Nós pegamos o bug antes de ir ao ar.', 'O bug só apareceu depois que foi ao ar.', 'Não conseguimos achar o bug.', 'Compramos uma ferramenta nova ontem.'], answer: 0, phon: 'uí kót dhê bâg bi-fór gôu-in láiv', explain: '"Caught" (kót) = passado de catch.' },
          { type: 'wordbank', pt: 'Eles construíram a plataforma inteira do zero.', en: 'They built the entire platform from scratch', distractors: ['builded', 'of'], phon: 'dhêi bílt dhí in-tái-er plét-fórm fróm skrétch', explain: '"Built" (bílt — U mudo!). "From scratch" = do zero.' },
          { type: 'speak', en: 'I heard you talk about that project yesterday.', pt: 'Ouvi você falar sobre aquele projeto ontem.', phon: 'ái rêrd iú tók a-báut dhét pró-djekt iés-ter-dei', explain: '"Heard" soa "rêrd"!' },
          { type: 'type', pt: 'Eu pensei que a reunião fosse às dez.', en: 'I thought the meeting was at ten.', alt: ['I thought the call was at ten.', 'I thought the meeting was at 10.'], phon: 'ái thót dhê mí-tin uóz ét tén', explain: 'Passado irregular afiado!' }
        ]
      },
      {
        id: 'u5-l2',
        title: 'Contando Seu Dia (Spent / Meant / Told)',
        icon: 'pen-line',
        xp: 40,
        steps: [
          { type: 'choice', prompt: 'Como dizer "Não foi isso que eu quis dizer"?', options: ["That's not what I meant.", "That's not what I meaned.", "That's not what I wanted say.", "No was that I meant."], answer: 0, phon: 'dhéts nót uót ái mént', explain: '"Meant" soa "mént" (passado de mean).' },
          { type: 'wordbank', pt: 'Eu gastei duas horas tentando consertar isso.', en: 'I spent two hours trying to fix this', distractors: ['spend', 'for'], phon: 'ái spént tchú áu-erz trái-in tchu fíks dhís', explain: '"Spend/spent" + tempo + verbo com -ing!' },
          { type: 'listen', en: 'He told me that the deadline changed and it took five minutes.', pt: 'Ele me disse que o prazo mudou e levou cinco minutos.', options: ['Ele me disse que o prazo mudou e levou cinco minutos.', 'Eu disse a ele que o prazo não mudou.', 'Levou cinco horas para mudar o prazo.', 'Ele esqueceu de avisar sobre o prazo.'], answer: 0, phon: 'rí tôuld mí dhét dhê déd-láin tchêindjd énd ít túk fáiv mí-nets', explain: '"Told me" (nunca "told to me") e "It took" (levou tempo).' },
          { type: 'wordbank', pt: 'A apresentação foi muito melhor do que eu esperava.', en: 'The presentation went much better than I expected', distractors: ['was', 'more'], phon: 'dhê pré-zen-têi-xan uént mâtch bé-rer dhén ái iks-pék-ted', explain: 'Para dizer como algo "foi/correu", use "went"!' },
          { type: 'speak', en: 'I already sent the updated file by email.', pt: 'Já enviei o arquivo atualizado por e-mail.', phon: 'ái ól-ré-di sént dhí âp-dêi-ted fáil bái í-mêil', explain: '"Send → sent".' },
          { type: 'type', pt: 'Não foi isso que eu quis dizer.', en: "That's not what I meant.", alt: ['That is not what I meant.'], phon: 'dhéts nót uót ái mént', explain: 'Uma das frases mais úteis em qualquer idioma!' }
        ]
      },
      {
        id: 'u5-l3',
        title: 'Present Perfect Sem Mistério',
        icon: 'timer',
        xp: 45,
        steps: [
          { type: 'choice', prompt: 'Quando usamos "I\'ve already..." ou "I haven\'t ... yet"?', options: ['Quando algo já aconteceu ou ainda não aconteceu até agora (sem focar na data exata)', 'Apenas para planos do ano que vem', 'Apenas quando citamos "yesterday" na frase', 'Nunca se usa na fala'], answer: 0, phon: 'áiv ól-ré-di / ái ré-vent ... iét', explain: 'Pense assim: passado com data fechada (yesterday) = Simple Past; conectado ao agora (already / yet / ever / lately) = Present Perfect!' },
          { type: 'wordbank', pt: 'Eu já revisei o documento inteiro.', en: "I've already reviewed the entire document", distractors: ['yesterday', 'review'], phon: 'áiv ól-ré-di ri-viúd dhí in-tái-er dó-kiu-ment', explain: '"I\'ve already" + particípio.' },
          { type: 'listen', en: "I've been practicing English every day this week.", pt: 'Venho praticando inglês todos os dias nesta semana.', options: ['Venho praticando inglês todos os dias nesta semana.', 'Parei de praticar inglês na semana passada.', 'Vou começar a praticar no mês que vem.', 'Nunca pratiquei inglês em voz alta.'], answer: 0, phon: 'áiv bín prék-ti-sin íng-glish év-ri dêi dhís uík', explain: '"I\'ve been + -ing" = "Venho fazendo / Estou fazendo há um tempo"!' },
          { type: 'wordbank', pt: 'Você alguma vez já trabalhou com um time internacional?', en: 'Have you ever worked with an international team?', distractors: ['Did', 'never'], phon: 'rév iú é-ver uôrkt uíth an in-ter-né-sha-nal tím?', explain: '"Have you ever...?" = Você já (alguma vez na vida)...?' },
          { type: 'speak', en: "I haven't finished that part yet, doing it now.", pt: 'Ainda não terminei aquela parte, fazendo agora.', phon: 'ái ré-vent fí-nisht dhét párt iét, dú-in ít náu', explain: 'Use "yet" no final de frases negativas e perguntas.' },
          { type: 'type', pt: 'Nós acabamos de subir a nova versão.', en: "We've just deployed the new version.", alt: ['We just deployed the new version.', "We've just shipped the new version."], phon: 'uív djâst di-plóid dhê niú vêr-jan', explain: '"We\'ve just..." = Nós acabamos de...' }
        ]
      },
      {
        id: 'u5-l4',
        title: 'Desafio Unidade 5: Mestre do Tempo',
        icon: 'trophy',
        xp: 60,
        steps: [
          { type: 'wordbank', pt: 'Esqueci completamente de ligar o microfone.', en: 'I completely forgot to turn on the mic', distractors: ['forget', 'open'], phon: 'ái kom-plít-li for-gót tchu têrn ón dhê máik', explain: 'Ligar aparelho = "turn on" (não "open"!).' },
          { type: 'choice', prompt: 'Como se pronuncia "read" na frase "I read that article yesterday"?', options: ['réd (igual à cor vermelho!)', 'ríd', 'rí-ded', 'rêid'], answer: 0, phon: 'ái réd dhét ár-ti-kol iés-ter-dei', explain: 'Mesma escrita, som diferente no passado!' },
          { type: 'listen', en: 'My confidence has improved a lot in the last few days.', pt: 'Minha confiança melhorou muito nos últimos dias.', options: ['Minha confiança melhorou muito nos últimos dias.', 'Perdi a confiança ontem.', 'Minha confiança não mudou nada.', 'Vou precisar de confiança ano que vem.'], answer: 0, phon: 'mái kón-fi-dens réz im-prúvd a lót ín dhê lést fiú dêiz', explain: 'Frase motivadora e super natural!' },
          { type: 'type', pt: 'Eu ainda não terminei aquela parte.', en: "I haven't finished that part yet.", alt: ["I didn't finish that part yet."], phon: 'ái ré-vent fí-nisht dhét párt iét', explain: 'Excelente controle de tempo verbal.' },
          { type: 'speak', en: 'It took only five minutes to set everything up.', pt: 'Levou só cinco minutos para configurar tudo.', phon: 'ít túk ôun-li fáiv mí-nets tchu sét év-ri-thin âp', explain: 'Fale com fluidez!' },
          { type: 'type', pt: 'Nunca vi esse erro acontecer antes.', en: "I've never seen this error happen before.", alt: ['I have never seen this error before.', "I've never seen this bug before."], phon: 'áiv né-ver sín dhís é-ror ré-pen bi-fór', explain: 'Unidade 5 completa!' }
        ]
      }
    ]
  },

  {
    id: 'unit-6',
    number: 6,
    color: '#2b5b6c',
    badge: 'UNIDADE 6',
    title: 'Conectores, Opiniões & Frases Longas',
    desc: 'Saia de frases curtinhas e conecte ideias complexas com naturalidade na fala e na leitura.',
    lessons: [
      {
        id: 'u6-l1',
        title: 'Contraste & Condição (Although / Unless)',
        icon: 'git-branch',
        xp: 40,
        steps: [
          { type: 'choice', prompt: 'O que significa "unless" na frase "We won\'t change it unless the client asks"?', options: ['a menos que / se não', 'enquanto isso', 'apesar de', 'portanto'], answer: 0, phon: 'ân-lés', explain: 'Conector que pega muita gente na leitura! "Unless" = a menos que.' },
          { type: 'wordbank', pt: 'Em vez de esperar, vamos testar agora.', en: "Instead of waiting, let's test it now", distractors: ['wait', 'to'], phon: 'ins-téd óv uêi-tin, léts tést ít náu', explain: 'Depois de "instead of", o verbo sempre leva -ing.' },
          { type: 'listen', en: 'Despite being tired, I kept practicing every day.', pt: 'Apesar de estar cansado, continuei praticando todo dia.', options: ['Apesar de estar cansado, continuei praticando todo dia.', 'Como estava cansado, parei de praticar.', 'Não fiquei cansado praticando hoje.', 'Só pratico quando não estou cansado.'], answer: 0, phon: 'dis-páit bí-in tái-erd, ái képt prék-ti-sin év-ri dêi', explain: '"Despite" + substantivo ou -ing.' },
          { type: 'wordbank', pt: 'Embora esteja ocupado, vou te ajudar.', en: "Although I'm busy, I'll help you", distractors: ['but', 'however'], phon: 'ól-dhôu áim bí-zi, áil rélp iú', explain: 'Atenção: se usar "Although" no início, NÃO coloque "but" no meio!' },
          { type: 'speak', en: 'Even if I make mistakes, I will keep speaking.', pt: 'Mesmo se eu cometer erros, vou continuar falando.', phon: 'í-ven íf ái mêik mis-têiks, áil kíp spí-kin', explain: 'Sua frase-lema de fluência!' },
          { type: 'type', pt: 'Em vez de esperar, vamos começar agora.', en: "Instead of waiting, let's start now.", alt: ["Instead of waiting, let's get started now."], phon: 'ins-téd óv uêi-tin, léts stárt náu', explain: 'Mandou muito bem!' }
        ]
      },
      {
        id: 'u6-l2',
        title: 'Causa, Efeito & Tempo (Otherwise / As soon as)',
        icon: 'link',
        xp: 40,
        steps: [
          { type: 'choice', prompt: 'Qual palavra significa "caso contrário"?', options: ['otherwise', 'meanwhile', 'however', 'besides'], answer: 0, phon: 'ó-dher-uáiz', explain: 'Ex: "Save it now; otherwise, we\'ll lose everything."' },
          { type: 'wordbank', pt: 'Te mando o arquivo assim que eu terminar.', en: "I'll send you the file as soon as I finish", distractors: ['will', 'when'], phon: 'áil sénd iú dhê fáil éz sún éz ái fí-nish', explain: '"As soon as" = assim que.' },
          { type: 'listen', en: 'The meeting was late, and on top of that, my screen froze.', pt: 'A reunião atrasou e, ainda por cima, minha tela congelou.', options: ['A reunião atrasou e, ainda por cima, minha tela congelou.', 'A reunião começou cedo e correu tudo bem.', 'Minha tela travou antes da reunião.', 'A reunião foi cancelada por causa da tela.'], answer: 0, phon: 'dhê mí-tin uóz lêit, énd ón tóp óv dhét, mái skrín frôuz', explain: '"On top of that" = ainda por cima!' },
          { type: 'wordbank', pt: 'É por isso que eu pratico em voz alta todo dia.', en: "That's why I practice out loud every day", distractors: ['because', 'for'], phon: 'dhéts uái ái prék-tis áut láud év-ri dêi', explain: '"That\'s why" = é por isso que.' },
          { type: 'speak', en: 'Save a copy in case the system crashes.', pt: 'Salve uma cópia caso o sistema trave.', phon: 'sêiv a kó-pi ín kêis dhê sís-tem kré-shez', explain: 'Não precisa de "if" — só "in case".' },
          { type: 'type', pt: 'Precisamos sair agora; caso contrário, vamos atrasar.', en: "We need to leave now; otherwise, we'll be late.", alt: ['We need to leave now, otherwise we will be late.'], phon: 'uí ní-tchu lív náu; ó-dher-uáiz, uíl bí lêit', explain: 'Conector dominado!' }
        ]
      },
      {
        id: 'u6-l3',
        title: 'Dar Opinião & Discordar Com Classe',
        icon: 'message-square',
        xp: 45,
        steps: [
          { type: 'choice', prompt: 'Qual é o jeito mais elegante de sugerir uma alternativa numa reunião?', options: ['What if we start with a simpler version first?', 'Your idea is wrong, do mine.', 'No, we will not do that.', 'Why did you think that?'], answer: 0, phon: 'uót íf uí stárt uíth a sím-pler vêr-jan fêrst?', explain: '"What if we...?" abre portas sem gerar defensiva.' },
          { type: 'wordbank', pt: 'O que você explicou faz total sentido.', en: 'What you explained makes total sense', distractors: ['does', 'make'], phon: 'uót iú iks-plêind mêiks tôu-tol séns', explain: 'Sempre "makes sense" (com S no singular!).' },
          { type: 'listen', en: 'It is cheaper; on the other hand, it takes much longer.', pt: 'É mais barato; por outro lado, leva muito mais tempo.', options: ['É mais barato; por outro lado, leva muito mais tempo.', 'É mais caro e mais lento também.', 'É barato e super rápido de fazer.', 'Não vale a pena comparar os dois.'], answer: 0, phon: 'íts tchí-per; ón dhí ó-dher rénd, ít têiks mâtch lóng-guer', explain: '"On the other hand" = por outro lado.' },
          { type: 'wordbank', pt: 'Do meu ponto de vista, a primeira opção é mais segura.', en: 'From my point of view, the first option is safer', distractors: ['In', 'more'], phon: 'fróm mái póint óv viú, dhê fêrst óp-xan íz sêi-fer', explain: 'Adjetivo curto ("safe") ganha "-er" (safer), não "more safe"!' },
          { type: 'speak', en: 'In other words, we need to simplify the process.', pt: 'Em outras palavras, precisamos simplificar o processo.', phon: 'ín ó-dher uôrdz, uí ní-tchu sím-pli-fái dhê pró-ses', explain: 'Excelente para reformular ideias.' },
          { type: 'type', pt: 'O que você falou faz total sentido.', en: 'What you said makes total sense.', alt: ['That makes total sense.', 'What you said makes complete sense.'], phon: 'uót iú séd mêiks tôu-tol séns', explain: 'Naturalíssimo!' }
        ]
      },
      {
        id: 'u6-l4',
        title: 'Desafio Unidade 6: Pensamento Articulado',
        icon: 'trophy',
        xp: 60,
        steps: [
          { type: 'wordbank', pt: 'Independentemente do sotaque, clareza é o que importa.', en: 'Regardless of accent, clarity is what matters', distractors: ['Despite', 'matter'], phon: 'ri-gárd-les óv ék-sent, klé-ri-ti íz uót mé-rerz', explain: '"Regardless of" = independentemente de.' },
          { type: 'choice', prompt: 'Qual frase usa a condicional ("Se eu tivesse..., eu faria...") corretamente?', options: ['If I had more time, I would test another approach.', 'If I have more time, I would tested another approach.', 'If I would have time, I test another approach.', 'If I had time, I will test it.'], answer: 0, phon: 'íf ái réd mór táim, áid tést a-nó-dher a-prôutch', explain: '2ª Condicional: If + Passado (had) → would + verbo puro!' },
          { type: 'listen', en: 'At the end of the day, consistency beats talent.', pt: 'No fim das contas, consistência vence talento.', options: ['No fim das contas, consistência vence talento.', 'Talento sempre vence consistência.', 'No fim do dia precisamos descansar.', 'Consistência não importa para idiomas.'], answer: 0, phon: 'ét dhí énd óv dhê dêi, kon-sís-ten-si bíts té-lent', explain: 'Verdade pura para ficar fluente!' },
          { type: 'type', pt: 'O que você faria no meu lugar?', en: 'What would you do in my place?', alt: ['What would you do if you were me?'], phon: 'uót uúd djú dú ín mái plêis?', explain: 'Pergunta condicional super comum.' },
          { type: 'speak', en: 'No matter what happens, I will stay consistent.', pt: 'Não importa o que aconteça, vou manter consistência.', phon: 'nôu mé-ter uót ré-penz, áil stêi kon-sís-tent', explain: 'Fale com convicção!' },
          { type: 'type', pt: 'No fim das contas, clareza importa mais.', en: 'At the end of the day, clarity matters more.', alt: ['At the end of the day, clarity matters most.'], phon: 'ét dhí énd óv dhê dêi, klé-ri-ti mé-rerz mór', explain: 'Unidade 6 concluída!' }
        ]
      }
    ]
  },

  {
    id: 'unit-7',
    number: 7,
    color: '#a63429',
    badge: 'UNIDADE 7',
    title: 'Fim dos Erros de Brasileiro',
    desc: 'Domine pares casados (collocations), falsos cognatos e adjetivos precisos.',
    lessons: [
      {
        id: 'u7-l1',
        title: 'Pares Casados (Make / Do / Meet)',
        icon: 'handshake',
        xp: 45,
        steps: [
          { type: 'choice', prompt: 'Qual dupla está 100% correta em inglês?', options: ['make a decision  |  do research  |  meet a deadline', 'take a decision  |  make research  |  complete a deadline', 'do a decision  |  do a mistake  |  make notes', 'make a break  |  make me a favor  |  take progress'], answer: 0, phon: 'mêik a di-sí-jan / dú ri-sêrtch / mít a déd-láin', explain: 'Esses 3 pares evitam 90% dos erros literais de brasileiros!' },
          { type: 'wordbank', pt: 'Precisamos tomar uma decisão até sexta.', en: 'We need to make a decision by Friday', distractors: ['take', 'until'], phon: 'uí ní-tchu mêik a di-sí-jan bái frái-dei', explain: 'Decisões se FAZEM ("make"), não se "tomam" ("take")!' },
          { type: 'listen', en: 'Stop wasting time translating word by word.', pt: 'Pare de perder tempo traduzindo palavra por palavra.', options: ['Pare de perder tempo traduzindo palavra por palavra.', 'Economize tempo traduzindo cada palavra.', 'Continue traduzindo tudo no papel.', 'Você tem tempo de sobra hoje.'], answer: 0, phon: 'stóp uêis-tin táim trénz-lêi-tin uôrd bái uôrd', explain: '"Waste time" = desperdiçar/perder tempo.' },
          { type: 'wordbank', pt: 'Tenho dificuldade para pronunciar algumas palavras.', en: 'I have a hard time pronouncing some words', distractors: ['to', 'pronounce'], phon: 'ái rév a rárd táim pro-náun-sin sâm uôrdz', explain: '"Have a hard time + -ing" é muito mais natural que "have difficulty to".' },
          { type: 'speak', en: 'I want to take advantage of my free week to improve.', pt: 'Quero aproveitar minha semana livre para evoluir.', phon: 'ái uónt tchu têik ad-vén-tidj óv mái frí uík tchu im-prúv', explain: '"Take advantage of" = aproveitar uma boa oportunidade.' },
          { type: 'type', pt: 'Precisamos cumprir o prazo.', en: 'We need to meet the deadline.', alt: ['We have to meet the deadline.'], phon: 'uí ní-tchu mít dhê déd-láin', explain: 'Collocation perfeita!' }
        ]
      },
      {
        id: 'u7-l2',
        title: 'Falsos Cognatos Traiçoeiros',
        icon: 'alert-triangle',
        xp: 45,
        steps: [
          { type: 'choice', prompt: 'O que significa "I only just realized the mistake"?', options: ['Só agora eu percebi / me dei conta do erro.', 'Só agora eu realizei o erro.', 'Eu pretendo cometer o erro.', 'Eu fingi que havia um erro.'], answer: 0, phon: 'ái ôun-li djâst rí-a-láizd dhê mis-têik', explain: '"Realize" = perceber / cair a ficha!' },
          { type: 'choice', prompt: 'Qual é o significado REAL de "pretend", "attend" e "eventually"?', options: ['fingir  |  comparecer/participar  |  com o tempo / por fim', 'pretender  |  atender telefone  |  às vezes', 'empurrar  |  assistir TV  |  atualmente', 'resumir  |  suportar  |  sensível'], answer: 0, phon: 'pri-ténd / a-ténd / i-vén-tchu-a-li', explain: 'Esses três pegam quase todo mundo na leitura!' },
          { type: 'wordbank', pt: 'Não finja que entendeu — pergunte na hora!', en: "Don't pretend you understood — ask right away!", distractors: ['intend', 'understand'], phon: 'dôunt pri-ténd iú ân-der-stúd — ésk ráit a-uêi!', explain: 'Pretend = fingir; Intend = pretender.' },
          { type: 'listen', en: 'I won\'t be able to attend today\'s meeting because of a dentist appointment.', pt: 'Não vou conseguir participar da reunião de hoje por causa de uma consulta no dentista.', options: ['Não vou conseguir participar da reunião de hoje por causa de uma consulta no dentista.', 'Vou atender o telefone na reunião de hoje.', 'Cheguei a um acordo com o dentista.', 'A reunião será no consultório do dentista.'], answer: 0, phon: 'ái uôunt bí êi-bol tchu a-ténd tchu-dêiz mí-tin bi-kóz óv a dén-tist a-póint-ment', explain: '"Attend" = comparecer; "Appointment" = hora marcada/consulta.' },
          { type: 'speak', en: 'Actually, I am currently studying English every day.', pt: 'Na verdade, atualmente estou estudando inglês todo dia.', phon: 'ék-tchu-a-li, áim kâr-rent-li stâ-di-in íng-glish év-ri dêi', explain: 'Pratique os dois na mesma frase para nunca mais trocar!' },
          { type: 'type', pt: 'Só agora eu percebi o que estava errado.', en: 'I only just realized what was wrong.', alt: ['I just realized what was wrong.'], phon: 'ái djâst rí-a-láizd uót uóz róng', explain: 'Falsos cognatos neutralizados!' }
        ]
      },
      {
        id: 'u7-l3',
        title: 'Adjetivos Pro (Adeus "Very Good")',
        icon: 'sparkles',
        xp: 45,
        steps: [
          { type: 'choice', prompt: 'Qual adjetivo substitui "very possible / possível de fazer" em prazos?', options: ['doable / feasible', 'vague', 'messy', 'awkward'], answer: 0, phon: 'dú-a-bol / fí-za-bol', explain: '"Totally doable!" é uma das respostas mais queridas em trabalho remoto.' },
          { type: 'wordbank', pt: 'O processo novo é bem direto ao ponto.', en: 'The new process is pretty straightforward', distractors: ['very', 'direct'], phon: 'dhê niú pró-ses íz prí-ti strêit-fór-uard', explain: '"Straightforward" = simples / direto ao ponto.' },
          { type: 'listen', en: 'I am aware of that issue and looking into a reliable fix.', pt: 'Estou ciente desse problema e procurando uma correção confiável.', options: ['Estou ciente desse problema e procurando uma correção confiável.', 'Não sabia desse problema até agora.', 'Esse problema não tem correção.', 'A ferramenta anterior era mais confiável.'], answer: 0, phon: 'áim a-uér óv dhét í-shu énd lú-kin ín-tchu a ri-lái-a-bol fíks', explain: '"Aware of" = ciente de; "Reliable" = confiável.' },
          { type: 'wordbank', pt: 'Com duas horas por dia, essa meta é totalmente fazível.', en: 'With two hours a day, that goal is totally doable', distractors: ['makeable', 'for'], phon: 'uíth tchú áu-erz a dêi, dhét gôul íz tôu-ta-li dú-a-bol', explain: 'Curta e poderosa!' },
          { type: 'speak', en: 'This week was tough, though the outcome is solid.', pt: 'Essa semana foi puxada, mas o resultado está sólido.', phon: 'dhís uík uóz tâf, dhôu dhí áut-kâm íz só-lid', explain: '"Tough" = tâf (som de F!).' },
          { type: 'type', pt: 'Estou disponível amanhã às dez.', en: "I'm available tomorrow at ten.", alt: ['I am available tomorrow at 10.', "I'm free tomorrow at ten."], phon: 'áim a-vêi-la-bol tchu-mó-rôu ét tén', explain: 'Palavra indispensável na agenda!' }
        ]
      },
      {
        id: 'u7-l4',
        title: 'Desafio Unidade 7: Inglês Limpo',
        icon: 'trophy',
        xp: 65,
        steps: [
          { type: 'choice', prompt: 'O que significa "Let\'s resume the meeting"?', options: ['Vamos retomar a reunião.', 'Vamos resumir a reunião.', 'Vamos encerrar a reunião.', 'Vamos mandar o currículo na reunião.'], answer: 0, phon: 'léts ri-zúm dhê mí-tin', explain: 'Verbo "resume" = retomar! Resumir = "summarize / recap".' },
          { type: 'wordbank', pt: 'Estou me acostumando a pensar em inglês.', en: "I'm getting used to thinking in English", distractors: ['think', 'use'], phon: 'áim gué-rin iúst tchu thín-kin ín íng-glish', explain: '"Get used to + -ing" = acostumar-se a.' },
          { type: 'listen', en: 'We reached a compromise that sounded reasonable for both sides.', pt: 'Chegamos a um meio-termo que pareceu razoável para os dois lados.', options: ['Chegamos a um meio-termo que pareceu razoável para os dois lados.', 'Marcamos um compromisso com os dois lados.', 'Ninguém concordou com a proposta.', 'O acordo foi cancelado ontem.'], answer: 0, phon: 'uí rítcht a kóm-pro-máiz dhét sáun-ded rí-za-na-bol fór bôuth sáidz', explain: '"Compromise" = acordo/meio-termo!' },
          { type: 'type', pt: 'Eu costumava travar nas reuniões.', en: 'I used to freeze in meetings.', alt: ['I used to get stuck in meetings.'], phon: 'ái iúst tchu fríz ín mí-tinz', explain: 'Use "used to" para coisas que já ficaram no passado!' },
          { type: 'speak', en: 'It is totally worth practicing every day.', pt: 'Vale totalmente a pena praticar todo dia.', phon: 'íts tôu-ta-li uôrth prék-ti-sin év-ri dêi', explain: '"Worth + -ing" = vale a pena fazer.' },
          { type: 'type', pt: 'Precisamos fazer uma pesquisa antes.', en: 'We need to do some research first.', alt: ['We need to do research before.', 'We have to do some research first.'], phon: 'uí ní-tchu dú sâm ri-sêrtch fêrst', explain: 'Unidade 7 concluída com precisão!' }
        ]
      }
    ]
  },

  {
    id: 'unit-8',
    number: 8,
    color: '#234e3c',
    badge: 'UNIDADE 8',
    title: 'Fluência Real: Entrevistas, Idioms & Mundo',
    desc: 'Fale com naturalidade em entrevistas, viagens, finanças e conversas espontâneas.',
    lessons: [
      {
        id: 'u8-l1',
        title: 'Expressões Nativas (Idioms Reais)',
        icon: 'target',
        xp: 50,
        steps: [
          { type: 'choice', prompt: 'O que significa "Let\'s cut to the chase" numa reunião?', options: ['Vamos direto ao ponto!', 'Vamos encerrar por hoje.', 'Vamos deixar para amanhã.', 'Voltamos à estaca zero.'], answer: 0, phon: 'léts kât tchu dhê tchêis', explain: 'Expressão clássica americana para pular enrolação.' },
          { type: 'wordbank', pt: 'Resumindo, precisamos entregar até sexta.', en: 'In a nutshell, we need to deliver by Friday', distractors: ['resume', 'until'], phon: 'ín a nât-shél, uí ní-tchu di-lí-ver bái frái-dei', explain: '"In a nutshell" = em poucas palavras / resumindo.' },
          { type: 'listen', en: 'We got a lot done today — let us call it a day.', pt: 'Fizemos bastante hoje — vamos encerrar por hoje.', options: ['Fizemos bastante hoje — vamos encerrar por hoje.', 'Ainda temos muitas horas pela frente.', 'Vamos marcar uma ligação hoje.', 'Não conseguimos entregar nada hoje.'], answer: 0, phon: 'uí gót a lót dân tchu-dêi — léts cól ít a dêi', explain: '"Call it a day" = encerrar o expediente por hoje.' },
          { type: 'wordbank', pt: 'Vou pensar com calma até amanhã e te aviso.', en: "I'll sleep on it and let you know tomorrow", distractors: ['think', 'in'], phon: 'áil slíp ón ít énd lét iú nôu tchu-mó-rôu', explain: '"Sleep on it" = dormir sobre o assunto / pensar até amanhã.' },
          { type: 'speak', en: 'You hit the nail on the head with that point.', pt: 'Você acertou na mosca com esse ponto.', phon: 'iú rít dhê nêil ón dhê réd uíth dhét póint', explain: 'Idiom super natural para elogiar uma análise certeira!' },
          { type: 'type', pt: 'Ainda estou em cima do muro sobre isso.', en: "I'm still on the fence about this.", alt: ["I'm still on the fence about it.", 'I am still on the fence about this.'], phon: 'áim stíl ón dhê féns a-báut dhís', explain: '"On the fence" = indeciso / em cima do muro.' }
        ]
      },
      {
        id: 'u8-l2',
        title: 'Entrevista & Carreira Internacional',
        icon: 'trophy',
        xp: 50,
        steps: [
          { type: 'choice', prompt: 'Qual pergunta brilha no final de uma entrevista em inglês?', options: ['What does success look like in the first 90 days?', 'Can I leave early on Fridays?', 'I have no questions at all.', 'How many days until vacation?'], answer: 0, phon: 'uót dâz sâk-sés lúk láik ín dhê fêrst náin-ti dêiz?', explain: 'Mostra mentalidade de dono e foco em resultado!' },
          { type: 'wordbank', pt: 'Deixa eu te explicar minha trajetória rapidamente.', en: 'Let me walk you through my background quickly', distractors: ['say', 'history'], phon: 'lét mí uók iú thrú mái bék-gráund kuík-li', explain: 'Abertura limpa para "Tell me about yourself".' },
          { type: 'listen', en: 'What I lack in years, I make up for in willingness to learn.', pt: 'O que me falta em anos, eu compenso em vontade de aprender.', options: ['O que me falta em anos, eu compenso em vontade de aprender.', 'Tenho muitos anos de experiência na área.', 'Não gosto de aprender ferramentas novas.', 'Preciso de mais anos antes de aplicar.'], answer: 0, phon: 'uót ái lék ín í-erz, ái mêik âp fór ín uí-ling-nes tchu lêrn', explain: 'Frase poderosa para quem tem 20 anos!' },
          { type: 'wordbank', pt: 'Eu lido bem com pressão quando os prazos apertam.', en: 'I handle pressure well when deadlines get tight', distractors: ['deal', 'good'], phon: 'ái rén-dol pré-sher uél uén déd-láinz guét táit', explain: 'Usa-se "well" (advérbio) depois do verbo, não "good"!' },
          { type: 'speak', en: 'I am a fast learner and completely open to feedback.', pt: 'Aprendo rápido e sou totalmente aberto a feedback.', phon: 'áim a fést lêr-ner énd kom-plít-li ôu-pen tchu fíd-bék', explain: 'Fale com postura confiante!' },
          { type: 'type', pt: 'Quais são os próximos passos do processo?', en: 'What are the next steps in the process?', alt: ['What are the next steps in the hiring process?'], phon: 'uót ár dhê nékst stéps ín dhê pró-ses?', explain: 'Sempre pergunte no fechamento!' }
        ]
      },
      {
        id: 'u8-l3',
        title: 'Viagens, Finanças & Vida Lá Fora',
        icon: 'plane',
        xp: 50,
        steps: [
          { type: 'choice', prompt: 'Você foi cobrado duas vezes num site americano. O que dizer?', options: ['I was charged twice and I need a refund.', 'I was payed two times and want my money.', 'They cobrated me double, give back.', 'My card is double, cancel please.'], answer: 0, phon: 'ái uóz tchárdjd tuáis énd ái níd a rí-fând', explain: '"Charged twice" = cobrado duas vezes; "Refund" = reembolso.' },
          { type: 'wordbank', pt: 'Desculpa, estou me atrasando dez minutos!', en: "Sorry, I'm running ten minutes late!", distractors: ['walking', 'delayed'], phon: 'só-ri, áim râ-nin tén mí-nets lêit!', explain: '"Running late" = expressão universal para estar atrasado.' },
          { type: 'listen', en: 'Can we split the bill onto two cards and get a receipt?', pt: 'Podemos dividir a conta em dois cartões e pegar um recibo?', options: ['Podemos dividir a conta em dois cartões e pegar um recibo?', 'Quero pagar tudo em dinheiro agora.', 'A conta veio errada — chame o gerente.', 'Precisamos fazer uma reserva para dois.'], answer: 0, phon: 'kén uí splít dhê bíl ón-tchu tchú kárdz énd guét a ri-sít?', explain: '"Split the bill" = dividir a conta.' },
          { type: 'wordbank', pt: 'Vou enviar a fatura até sexta-feira.', en: "I'll send the invoice by Friday", distractors: ['receipt', 'until'], phon: 'áil sénd dhí ín-vóis bái frái-dei', explain: '"Invoice" = fatura/nota de cobrança para clientes.' },
          { type: 'speak', en: 'Is there a power outlet near this table?', pt: 'Tem alguma tomada perto desta mesa?', phon: 'íz dhér a páu-er áut-let nír dhís têi-bol?', explain: 'Salva sua bateria em qualquer aeroporto ou café!' },
          { type: 'type', pt: 'Podemos dividir a conta?', en: 'Can we split the bill?', alt: ['Could we split the bill?', 'Can we split the check?'], phon: 'kén uí splít dhê bíl?', explain: 'Simples e super útil!' }
        ]
      },
      {
        id: 'u8-l4',
        title: 'Desafio Final: Fluência Funcional!',
        icon: 'crown',
        xp: 100,
        steps: [
          { type: 'wordbank', pt: 'No momento não tenho disponibilidade sem atrasar sexta.', en: "Right now I don't have the bandwidth without delaying Friday", distractors: ['time', 'delay'], phon: 'ráit náu ái dôunt rév dhê bénd-uídth uí-dháut di-lêi-in frái-dei', explain: 'Comunicação profissional nível C1!' },
          { type: 'choice', prompt: 'Como reagir naturalmente quando alguém diz "How are things going?"', options: ["I can't complain — keeping busy in a good way!", 'Things are going on the floor.', 'Yes, I go very good.', 'I am normal, thanks.'], answer: 0, phon: 'ái ként kom-plêin — kí-pin bí-zi ín a gúd uêi!', explain: '"I can\'t complain" = não posso reclamar!' },
          { type: 'listen', en: 'Long story short, we sorted everything out and stayed under budget.', pt: 'Resumindo a história, resolvemos tudo e ficamos dentro do orçamento.', options: ['Resumindo a história, resolvemos tudo e ficamos dentro do orçamento.', 'Gastamos acima do orçamento e não resolvemos.', 'A história ainda não terminou.', 'Precisamos aumentar o orçamento amanhã.'], answer: 0, phon: 'lóng stó-ri shórt, uí sór-ted év-ri-thin áut énd stêid ân-der bâ-djet', explain: 'Três blocos nativos juntos na mesma frase!' },
          { type: 'type', pt: 'Combinado! Te vejo amanhã de manhã.', en: 'Sounds good! See you tomorrow morning.', alt: ['Sounds good, see you tomorrow morning.'], phon: 'sáundz gúd! sí iú tchu-mó-rôu mór-nin', explain: 'Perfeito!' },
          { type: 'speak', en: 'I am ready to speak whatever I need with confidence.', pt: 'Estou pronto para falar o que eu precisar com confiança.', phon: 'áim ré-di tchu spík uó-té-ver ái níd uíth kón-fi-dens', explain: 'Fale alto e com orgulho — você fechou a trilha inteira!' },
          { type: 'type', pt: 'Todo esse esforço vai valer a pena muito em breve.', en: 'All this effort is going to pay off very soon.', alt: ['All this effort will pay off very soon.', 'All this effort is gonna pay off soon.'], phon: 'ól dhís é-fort íz gó-na pêi óf vé-ri sún', explain: '👑 Trilha SpeaklyLab 100% concluída!' }
        ]
      }
    ]
  }
];

