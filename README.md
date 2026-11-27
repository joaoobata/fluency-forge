# FluencyForge — Estúdio Open-Source de Fluência Ativa em Inglês

![License: MIT](https://img.shields.io/badge/License-MIT-c2410c.svg)
![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-15803d.svg)
![Deploy: Vercel](https://img.shields.io/badge/Deploy-Vercel-1c1917.svg)
![Architecture: Open--Core](https://img.shields.io/badge/Model-Open--Core-2563eb.svg)

Plataforma web open-source de **imersão ativa em inglês** voltada para brasileiros que já entendem bem o idioma passivamente, mas travam na hora de **montar frases falando**, **responder calls e entrevistas**, **ler em voz alta com pronúncia conectada** e **ampliar o vocabulário ativo**.

- **Edição Community (Open-Source / Gratuita):** https://fluency-forge-silk.vercel.app
- **Edição Pro (Nuvem, Perfil & Turmas B2B):** https://fluency-forge-pro.vercel.app
- **Guia Visual Passo a Passo:** https://fluency-forge-silk.vercel.app/guia.html

---

## Novidades Recentes

- **Estúdio de Música 2.0 — Modo Voz ao Vivo (Shadowing) & Raio-X de Inglês Real:** 4º modo no palco de músicas para cantar/falar cada verso no microfone com avaliação palavra por palavra em tempo real (`0–100%`), detector automático de **Fala Conectada** (*I'ma*, *gonna*, *wanna*, *ain't*, *runnin'*) e **Phrasal Verbs** com explicação PT-BR + 1 clique para virar Flashcard SRS, e clique em qualquer palavra do verso para ouvir em Voz Neural.
- **Estúdio de Música Split-Screen & Clipes Oficiais (124/124 capas HD):** player redesenhado lado a lado com barra de transporte completa (*Anterior*, *-5s*, *Play/Pausar*, *Repetir*, *Próximo*), timeline clicável, modo *Auto-Pausa ON/OFF*, estante **Mais Jogadas (Top 6)** com contador de partidas, **busca instantânea no catálogo** e buscador inteligente que **sempre prioriza clipes oficiais** (rejeitando *lyric videos* e karaokês).
- **Simulador de Calls & Entrevistas:** 6 cenários reais com Vozes Neurais, microfone, modo *Só Ouvido*, diagnóstico de erros PT → EN e sugestão *"Como um nativo diria"*.
- **Estúdio de Vídeos & Loop A–B:** cole qualquer link do YouTube, marque pontos **A** e **B** a `0.75x`, pratique ditado e salve marcadores de tempo direto no Banco de Palavras.
- **Perfil CEFR, Diário de Evolução & Card PNG:** cronômetro automático de horas reais por módulo, radar SVG de 5 habilidades, mapa de consistência de 84 dias e gerador de **Card PNG 1200×630** pronto para LinkedIn/Stories.
- **SEO & GEO Completos:** `og-image.png` (1200×630), `favicon.svg`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, `llms.txt` e Schema.org JSON-LD.

Veja o histórico detalhado de versões em [CHANGELOG.md](./CHANGELOG.md).

---

## Principais Módulos

- **Trilha Guiada Progressiva (estilo Duolingo):** **8 Unidades e 32 Lições** (192 exercícios) com desbloqueio progressivo, efeitos sonoros e 5 formatos interativos (*Blocos*, *Múltipla Escolha*, *Escuta*, *Fala* e *Digitação*).
- **Música & Lyrics Training em Tempo Real + Importação em Massa:** **124 músicas prontas com capas e clipes oficiais** + **Importador em Massa** (por *Artista/Banda*, *Playlist pública do Spotify / Deezer / YouTube* ou *Lista em Texto*) e 4 níveis de dificuldade (*Fácil*, *Médio*, *Difícil* e *Extremo*).
- **Simulador de Calls & Entrevistas (Roleplay Neural):** *Daily Standup*, *Entrevista Internacional*, *Negociação de Prazo*, *Imigração*, *Hotel* e *Small Talk* com upgrade nativo.
- **Vídeo & Loop A–B:** treino de escuta fina em qualquer vídeo do YouTube com repetição de trechos exatos e ditado.
- **Vocabulário Ativo com SRS (PT → EN):** **552 expressões de alta frequência** em **12 trilhas** + **Diário de Lacunas** personalizado com algoritmo SM-2.
- **Motores de Frase & Speed Drills:** Construtor de 3 blocos com **12 cenários** (1.500+ combinações) + **125 Speed Drills** com microfone.
- **Leitura Guiada & Shadowing:** **22 textos graduados (B1 a C1)** em blocos de sentido, clique em qualquer palavra para ouvir isolada e *Shadowing Loop*.
- **Fala Livre (Técnica 4-3-2 & Paráfrase):** cronômetro 4 → 3 → 2 min com gravador local (`MediaRecorder`), transcrição ao vivo, **45 temas reais** e **60 desafios de Paráfrase**.
- **Analisador Inteligente de Erros (PT → EN):** compara sua frase palavra por palavra, explica **por que está errado** (20+ armadilhas clássicas de brasileiros) e mostra a forma natural.
- **Vozes Neurais Naturais Gratuitas:** endpoint serverless (`/api/tts`) com **8 vozes neurais** (EUA e Reino Unido), controle de velocidade (`0.72x` a `1.15x`) e cache CDN.
- **Banco Automático de Palavras (Meu Léxico CEFR):** captura toda palavra em inglês vista/lida/escrita/ouvida/falada, evolui de *Vista → Em Progresso → Aprendida → Dominada* e exporta em **CSV**.
- **Design Editorial Studio:** temas **Papel Marfim** e **Grafite Quente**, ícones **Lucide**, tipografia `Bricolage Grotesque` + `Plus Jakarta Sans` + `JetBrains Mono` e backup completo em `.json`.

---

## Modelo Open-Core: Community vs. Pro

O FluencyForge segue o modelo **Open-Core**: este repositório contém a edição **Community (MIT)** 100% aberta para uso local, estudo e contribuições da comunidade. A edição comercial **FluencyForge Pro** adiciona a camada SaaS em nuvem em um repositório privado separado.

| Recurso | Community (MIT — Este Repo) | FluencyForge Pro (SaaS) |
| :--- | :---: | :---: |
| Trilha Guiada (32 lições), 552 Flashcards SRS & 125 Drills | ✅ | ✅ |
| Música com 124+ Clipes Oficiais, Capas HD & Importador | ✅ | ✅ |
| Simulador de Calls, Vídeo Loop A–B & Banco de Palavras CEFR | ✅ | ✅ |
| Vozes Neurais Gratuitas + Backup JSON/CSV Local | ✅ | ✅ |
| Cadastro de Perfil, Login Firebase (Email + Google) & Nuvem | — | ✅ |
| Ranking Global por Música, Termômetro de Erros & Auto-Sync (Firestore) | — | ✅ |
| Sincronização Automática entre PC e Celular | — | ✅ |
| Assinaturas Pix (CN Pay) + Cartão/Apple/Google Pay (Stripe) | — | ✅ |
| Painel B2B para Turmas, Professores & Empresas (CSV Executivo) | — | ✅ |

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

*(No Windows, você também pode iniciar com duplo clique em `abrir-plataforma.bat`.)*

---

## Deploy na Vercel

O projeto já inclui `vercel.json` configurado para servir `public/` + funções serverless em `api/`:

```bash
npx vercel --prod
```

---

## Estrutura do Projeto

```text
FluencyForge/
├── api/
│   ├── tts.mjs               # Serverless Function (8 Vozes Neurais gratuitas + cache CDN)
│   └── lyrics.mjs            # Serverless Function (LRCLIB + buscador de Clipes Oficiais + importador)
├── public/
│   ├── index.html            # Interface principal (Editorial Studio + SEO/JSON-LD)
│   ├── guia.html             # Guia Visual interativo passo a passo (7 slides)
│   ├── styles.css            # Sistema visual Papel Marfim & Grafite Quente
│   ├── favicon.svg           # Ícone vetorial + apple-touch-icon.png + icon-512.png
│   ├── og-image.png          # Card Open Graph 1200x630
│   ├── site.webmanifest      # Manifesto PWA
│   ├── robots.txt            # Diretivas de indexação + sitemap.xml + llms.txt
│   └── js/
│       ├── app.js            # Controlador principal e navegação
│       ├── path-player.js    # Trilha Guiada progressiva (8 unidades / 32 lições)
│       ├── lyrics-studio.js  # Estúdio de Música Split-Screen + Mais Jogadas + Busca
│       ├── roleplay-studio.js# Simulador de Calls & Entrevistas com Voz Neural
│       ├── video-lab.js      # Estúdio de Vídeos do YouTube & Loop A–B
│       ├── lexicon-view.js   # Banco Automático de Palavras CEFR + Exportação CSV
│       ├── profile-view.js   # Perfil, Horas de Inglês, Radar 5 Habilidades & Diário
│       ├── share-card.js     # Gerador de Card PNG 1200x630 compartilhável
│       ├── error-coach.js    # Analisador de erros PT -> EN com diff visual
│       ├── speech.js         # Cliente de voz neural + cache + reconhecimento de voz
│       ├── sfx.js            # Motor de efeitos sonoros táteis (Web Audio API)
│       ├── store.js          # Persistência local/API + algoritmo SRS (SM-2)
│       ├── data-path.js      # 8 Unidades e 32 Lições
│       ├── data-songs.js     # Catálogo de 124 músicas com capas e clipes oficiais
│       ├── data-vocab*.js    # 552 Flashcards ativos em 12 trilhas
│       ├── data-drills*.js   # 12 Cenários, 125 Speed Drills, 45 Temas e 60 Paráfrases
│       └── data-reading*.js  # 22 Textos graduados de Leitura & Shadowing
├── server.js                 # Servidor local Node.js (porta 3456)
├── vercel.json               # Configuração de produção e cache na Vercel
├── CHANGELOG.md              # Histórico de versões e novidades
└── LICENSE                   # Licença MIT
```

---

## Como Contribuir

Contribuições são muito bem-vindas!

1. Faça um **Fork** deste repositório.
2. Crie uma branch para sua melhoria: `git checkout -b feat/minha-melhoria`.
3. Envie um **Pull Request** explicando o que foi adicionado ou corrigido (novas músicas com clipe oficial, decks SRS, textos de leitura, melhorias de acessibilidade ou correções de bugs).

## Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](./LICENSE) para mais detalhes.
