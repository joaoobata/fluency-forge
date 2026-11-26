# Changelog — FluencyForge (Community Edition)

Todas as atualizações relevantes da edição open-source do FluencyForge ficam registradas aqui.

## [2.4.0] — 2026-11-26
### Adicionado
- **SEO & GEO completos para produção:** `favicon.svg`, `apple-touch-icon.png`, `icon-512.png`, `og-image.png` (1200×630), `site.webmanifest`, `robots.txt`, `sitemap.xml`, `llms.txt` e dados estruturados Schema.org JSON-LD (`SoftwareApplication` e `HowTo`).
- **Títulos dinâmicos por módulo:** atualização automática de `document.title` e `meta description` conforme a tela ativa.
- **Headers de cache na Vercel** em `vercel.json` para ativos estáticos, manifest e arquivos de indexação.

## [2.3.0] — 2026-11-26
### Adicionado
- **Capas reais em 124/124 músicas** no catálogo (thumbnails HD de clipes oficiais do YouTube e capas iTunes em alta resolução) com fallback automático.
### Melhorado
- **Priorização estrita de Clipes Oficiais** em `api/lyrics.mjs`: parser sobre `ytInitialData` que pontua positivamente *Official Music Video*, *VEVO* e canais oficiais de artistas, descartando *lyric videos*, *karaoke*, *covers* e *slowed/reverb*.

## [2.2.0] — 2026-11-26
### Adicionado
- **Estante "Mais Jogadas" (Top 6)** no catálogo de músicas com contador persistente de partidas (`songPlays`) e badge `Nx`.
- **Barra de Pesquisa Instantânea** no catálogo por música, artista ou gênero.
- **Redesign Split-Screen do Estúdio de Música:** vídeo + controles à esquerda, teleprompter sincronizado à direita, barra de transporte completa (`Anterior`, `-5s`, `Play/Pausar`, `Repetir`, `Próximo`), barra de progresso clicável e botão `Auto-Pausa ON/OFF`.
### Corrigido
- Corrigido travamento do player ao clicar em *Repetir* ou *Anterior* (implementado `seekLockUntil`), preservação de erros no verso (`wrongGuesses`) e digitação sem piscar o input (`patchActiveWriteSlot`).

## [2.1.0] — 2026-11-26
### Adicionado
- **Simulador de Calls & Entrevistas (`roleplay-studio.js`):** 6 cenários multi-turno com Voz Neural, microfone, modo *Só Ouvido*, Error Coach PT → EN e sugestões *"Como um nativo diria"*.
- **Estúdio de Vídeos & Loop A–B (`video-lab.js`):** repetidor de precisão A–B para qualquer URL do YouTube com ditado e marcadores de minuto exato.
- **Card PNG Compartilhável (`share-card.js`):** geração de imagem 1200×630 do perfil CEFR pronta para LinkedIn e Stories.
- **Menu lateral reorganizado** em grupos claros (*Começar*, *Praticar*, *Minha Evolução*).

## [2.0.0] — 2026-11-26
### Adicionado
- **Arquitetura Open-Core:** separação limpa entre Community Edition (MIT, este repositório) e FluencyForge Pro (SaaS privado em nuvem).
- **Banco Automático de Palavras (`lexicon-view.js`):** rastreamento automático de palavras em inglês com evolução *Vista → Dominada* e exportação CSV.
- **Perfil, Horas de Inglês & Diário de Evolução (`profile-view.js`):** cronômetro automático por módulo, cálculo CEFR (`A1`–`C1`), radar SVG de 5 habilidades e mapa de consistência de 84 dias.
- **Importador em Massa de Músicas** por artista (iTunes API), link de playlist pública (Spotify/Deezer/YouTube) ou lista em texto.

## [1.0.0] — 2026-11-25
### Adicionado
- Lançamento inicial com Trilha Guiada (8 unidades / 32 lições), 552 Flashcards SRS PT → EN, 125 Speed Drills, 22 Textos de Leitura & Shadowing, Estúdio 4-3-2, Analisador de Erros PT → EN e 8 Vozes Neurais gratuitas (`/api/tts`).
