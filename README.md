# FluencyForge — Estúdio de Fluência em Inglês

Plataforma web open-source de **imersão ativa em inglês** voltada para brasileiros que já entendem bem o idioma, mas travam na hora de **montar frases falando**, **ler em voz alta com pronúncia conectada** e **ampliar o vocabulário ativo**.

**Demo ao vivo (Vercel):** https://fluency-forge-silk.vercel.app

---

## Principais Recursos

- **Trilha Guiada Progressiva (estilo Duolingo):** **8 Unidades e 32 Lições** (192 exercícios) com desbloqueio progressivo, barra de progresso, efeitos sonoros e 5 formatos interativos (*Montar Frase por Blocos*, *Múltipla Escolha*, *Escuta*, *Pronúncia em Voz Alta* e *Digitação / Ditado*).
- **Analisador Inteligente de Erros:** quando você erra uma frase escrita ou montada, a plataforma destaca palavra por palavra o que sobrou/faltou, explica **por que aquilo está errado** (20+ erros clássicos de brasileiros) e mostra **por que a forma nova está certa**.
- **Vozes Neurais Naturais Gratuitas:** endpoint serverless (`/api/tts`) usando **Microsoft Azure Neural Voices** (`msedge-tts`) com **8 vozes humanas de estúdio** (EUA e Reino Unido), controle de velocidade (`0.72x` a `1.15x`), cache CDN + navegador e fallback offline.
- **Vocabulário Ativo com SRS (Cartão Invertido PT → EN):** **552 expressões de alta frequência** em **12 trilhas** (*Phrasal Verbs*, *Conectores*, *Pares Casados*, *Reuniões & Trabalho*, *Conversa Livre*, *Verbos Irregulares*, *Adjetivos Pro*, *Falsos Cognatos*, *Tech & Projetos*, *Idioms*, *Entrevistas* e *Viagens & Vida*) + **Diário de Lacunas** personalizado.
- **Motores de Frase & Speed Drills:** Construtor de 3 blocos com **12 cenários** (1.500+ combinações) + **125 Speed Drills** filtráveis por categoria com suporte a microfone.
- **Leitura Guiada & Shadowing:** **22 textos graduados (B1 a C1)** divididos em blocos de sentido, clique em qualquer palavra para ouvir isolada, pegadinhas fonéticas, *Shadowing Loop* com pausa automática e checagem de compreensão.
- **Estúdio de Fala Livre (Técnica 4-3-2 & Paráfrase):** cronômetro 4 → 3 → 2 min com gravador local de áudio (`MediaRecorder`), transcrição ao vivo (`Web Speech Recognition`), **45 temas reais** e **60 desafios de Paráfrase**.
- **Música & Lyrics Training em Tempo Real (LRCLIB + YouTube IFrame API):** experiência *teleprompter* sem spoiler que revela os versos no ritmo exato da voz (com antecipação visual, `Alinhar Agora`, ajuste fino de `±0.2s` salvo por música e replay de verso com `Tab`), **124 músicas organizadas por gênero e artista** (*Imagine Dragons*, *Billie Eilish*, *Coldplay*, *Linkin Park*, *The Weeknd*, *Olivia Rodrigo*, *Eminem* e mais) + busca global, e **4 níveis de dificuldade com múltiplas palavras por verso** (*Fácil*, *Médio*, *Difícil* e *Extremo*).
- **Design Editorial Studio:** tema **Papel Marfim** + **Grafite Quente**, ícones **Lucide**, tipografia `Bricolage Grotesque` + `Plus Jakarta Sans` + `JetBrains Mono` e **Exportação/Importação de Backup (`.json`)**.

---

## Como Rodar Localmente

Pré-requisito: **Node.js 18+**.

```bash
git clone https://github.com/joaoobata/fluency-forge.git
cd fluency-forge
npm install
npm start
```

Acesse: **http://localhost:3456**

*(No Windows, você também pode iniciar com um duplo clique em `abrir-plataforma.bat`.)*

---

## Deploy na Vercel

O projeto já vem pronto com `vercel.json` (estático em `public/` + função serverless em `api/tts.mjs`):

```bash
npx vercel --prod
```

---

## Estrutura do Projeto

```text
FluencyForge/
├── api/
│   ├── tts.mjs               # Serverless Function (Vozes Neurais gratuitas + cache CDN)
│   └── lyrics.mjs            # Serverless Function (Letras sincronizadas LRCLIB + YouTube)
├── public/
│   ├── index.html            # Interface principal (Lucide Icons + Editorial Studio)
│   ├── guia.html             # Guia Visual interativo passo a passo (7 slides)
│   ├── styles.css            # Sistema visual Papel Marfim & Grafite Quente
│   └── js/
│       ├── app.js            # Controlador dos módulos livres e navegação
│       ├── path-player.js    # Trilha guiada progressiva e player de lições
│       ├── lyrics-studio.js  # Estúdio de Música em tempo real (teleprompter + lacunas)
│       ├── error-coach.js    # Analisador de erros PT -> EN com diff visual
│       ├── speech.js         # Cliente de voz neural + cache + reconhecimento de voz
│       ├── sfx.js            # Motor de efeitos sonoros táteis (Web Audio API)
│       ├── store.js          # Persistência local/API + algoritmo SRS (SM-2)
│       ├── data-path.js      # 8 Unidades e 32 Lições
│       ├── data-songs.js     # Catálogo de 124 músicas organizadas por gênero e artista
│       ├── data-vocab*.js    # 552 Flashcards ativos em 12 trilhas
│       ├── data-drills*.js   # 12 Cenários LEGO, 125 Speed Drills, 45 Temas e 60 Paráfrases
│       └── data-reading*.js  # 22 Textos graduados de Leitura & Shadowing
├── server.js                 # Servidor local Node.js (com /api/tts e /api/progress)
├── vercel.json               # Configuração de produção na Vercel
└── LICENSE                   # Licença MIT
```

## Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais detalhes.
