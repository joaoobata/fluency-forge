import { addXp, addCustomCard, recordWords, getState, updateState } from './store.js';
import { playClick, playCorrect, iconHtml, refreshIcons } from './sfx.js';

const CURATED_VIDEOS = [
  { id: 'UF8uR6Z6KLc', title: "Steve Jobs' 2005 Stanford Commencement Address", channel: 'Stanford', level: 'B1/B2 • Discurso', tip: 'Excelente dicção pausada e vocabulário inspirador.' },
  { id: 'iG9CE55wbtY', title: 'Do Schools Kill Creativity? — Sir Ken Robinson', channel: 'TED', level: 'B2 • Inglês Britânico', tip: 'Ótimo para treinar humor e sotaque britânico claro.' },
  { id: 'qp0HIF3SfI4', title: 'How Great Leaders Inspire Action — Simon Sinek', channel: 'TED', level: 'B1/B2 • Negócios', tip: 'Vocabulário perfeito para apresentações e liderança.' },
  { id: 'H14bBuluwB8', title: 'Grit: The Power of Passion and Perseverance', channel: 'TED', level: 'B1 • Claro & Direto', tip: 'Frases diretas e ritmo excelente para shadowing.' },
  { id: 'Ks-_Mh1QhMc', title: 'Your Body Language May Shape Who You Are', channel: 'TED', level: 'B1/B2 • Entrevistas', tip: 'Ideal para aprender expressões de confiança e carreira.' },
  { id: 'arj7oStGLkU', title: 'Inside the Mind of a Master Procrastinator', channel: 'TED', level: 'B2 • Conversacional', tip: 'Inglês americano rápido e cheio de expressões do dia a dia.' }
];

const vl = {
  videoId: CURATED_VIDEOS[0].id,
  videoTitle: CURATED_VIDEOS[0].title,
  urlInput: '',
  pointA: null,
  pointB: null,
  loopOn: false,
  rate: 1.0,
  noteDraft: ''
};

let ytApiReady = null;
let vlPlayer = null;
let loopInterval = null;

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtSec(sec) {
  if (sec === null || sec === undefined || Number.isNaN(sec)) return '--:--';
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function extractYoutubeId(input) {
  const s = String(input || '').trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function ensureYtApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiReady) return ytApiReady;
  ytApiReady = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return ytApiReady;
}

export function stopVideoLab() {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
  if (vlPlayer) {
    try { vlPlayer.destroy(); } catch (_) {}
    vlPlayer = null;
  }
}

function getBookmarksForVideo(videoId) {
  const all = getState().videoBookmarks || [];
  return all.filter(b => b.videoId === videoId);
}

function addBookmark(videoId, timeSec, text) {
  updateState(s => {
    if (!Array.isArray(s.videoBookmarks)) s.videoBookmarks = [];
    s.videoBookmarks.unshift({
      id: 'vb-' + Date.now(),
      videoId,
      timeSec: Math.max(0, Math.floor(timeSec || 0)),
      text: text.trim(),
      createdAt: Date.now()
    });
  });
}

function removeBookmark(id) {
  updateState(s => {
    s.videoBookmarks = (s.videoBookmarks || []).filter(b => b.id !== id);
  });
}

export function renderVideoLabView() {
  const bookmarks = getBookmarksForVideo(vl.videoId);

  return `
    <div class="stack-lg">
      <div class="card path-hero stack-md">
        <div class="stack-sm">
          <span class="pill" style="width:fit-content;">${iconHtml('clapperboard', 13)} Estúdio de Vídeos &amp; Loop A–B</span>
          <h2 style="font-size:23px;">Transforme qualquer vídeo do YouTube em treino de ouvido e shadowing</h2>
          <p class="muted">Cole qualquer link do YouTube (TED Talk, entrevista, podcast, cena de série), marque os pontos <strong>A</strong> e <strong>B</strong> em frases rápidas para repetir em loop a <code>0.75x</code> e salve expressões direto no seu <strong>Banco de Palavras</strong> e <strong>SRS</strong>.</p>
        </div>

        <form id="vl-url-form" class="row" style="align-items:stretch; gap:8px;">
          <input type="text" id="vl-url-input" value="${esc(vl.urlInput)}" placeholder="Cole qualquer link ou ID do YouTube (ex: https://www.youtube.com/watch?v=...)" style="flex:1; padding:10px 14px;" />
          <button type="submit" class="btn btn-primary">${iconHtml('play', 14)} Carregar Vídeo</button>
        </form>
      </div>

      <div class="grid-2" style="align-items:start;">
        <!-- PLAYER + A-B LOOP CONTROLS -->
        <div class="card stack-md" style="padding:0; overflow:hidden;">
          <div style="position:relative; width:100%; aspect-ratio:16/9; background:#0d0d0c;">
            <div id="vl-player-host" style="position:absolute; inset:0; width:100%; height:100%;"></div>
          </div>

          <div class="stack-sm" style="padding:14px 16px;">
            <div class="row-between" style="flex-wrap:wrap; gap:6px;">
              <strong style="font-size:15px;">${esc(vl.videoTitle)}</strong>
              <span class="mono" id="vl-clock" style="font-size:12px; color:var(--primary); font-weight:700;">00:00</span>
            </div>

            <div class="row" style="gap:6px; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" id="btn-vl-back3">${iconHtml('rotate-ccw', 13)} -3s</button>
              <button class="btn ${vl.pointA !== null ? 'btn-primary' : 'btn-secondary'} btn-sm" id="btn-vl-set-a">
                Marcar A (${fmtSec(vl.pointA)})
              </button>
              <button class="btn ${vl.pointB !== null ? 'btn-primary' : 'btn-secondary'} btn-sm" id="btn-vl-set-b">
                Marcar B (${fmtSec(vl.pointB)})
              </button>
              <button class="btn ${vl.loopOn ? 'btn-success' : 'btn-secondary'} btn-sm" id="btn-vl-loop">
                ${iconHtml('repeat', 13)} ${vl.loopOn ? 'Loop A–B Ativo' : 'Ativar Loop A–B'}
              </button>
              <button class="btn btn-ghost btn-sm" id="btn-vl-clear-ab">Limpar A–B</button>
              <button class="btn btn-secondary btn-sm" id="btn-vl-speed">${iconHtml('gauge', 13)} ${vl.rate}x</button>
            </div>
          </div>
        </div>

        <!-- DICTATION & CHUNK MINER -->
        <div class="card stack-md">
          <div>
            <h3>Bloco de Ditado &amp; Mineração de Trechos</h3>
            <p class="muted" style="font-size:13px;">Escreva o que entendeu no trecho em loop — ao salvar, salvamos o minuto exato e enviamos todas as palavras para o seu <strong>Banco de Palavras</strong>.</p>
          </div>

          <form id="vl-note-form" class="stack-sm">
            <textarea id="vl-note-input" rows="3" placeholder="Ex: You can't connect the dots looking forward, you can only connect them looking backwards." style="width:100%; padding:10px 12px; font-size:14px;">${esc(vl.noteDraft)}</textarea>
            <div class="row-between" style="flex-wrap:wrap; gap:8px;">
              <button type="submit" class="btn btn-primary btn-sm">${iconHtml('bookmark-plus', 14)} Salvar Trecho no Minuto Atual</button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-vl-to-srs">${iconHtml('layers', 14)} Virar Flashcard SRS</button>
            </div>
          </form>

          <div class="stack-sm" style="border-top:1px solid var(--border); padding-top:12px;">
            <strong style="font-size:13px;">Trechos salvos neste vídeo (${bookmarks.length})</strong>
            ${bookmarks.length === 0 ? `
              <div class="muted" style="font-size:12.5px;">Nenhum trecho salvo neste vídeo ainda. Use o loop A–B para destravar uma frase difícil e salve aqui!</div>
            ` : bookmarks.map(b => `
              <div class="diary-note-row">
                <div style="flex:1;">
                  <button class="btn btn-ghost btn-sm mono" style="padding:2px 6px; color:var(--primary); font-weight:700;" data-vl-seek="${b.timeSec}">${fmtSec(b.timeSec)}</button>
                  <span>"${esc(b.text)}"</span>
                </div>
                <button class="btn btn-ghost btn-sm" style="padding:2px 6px;" data-vl-del-bm="${esc(b.id)}" title="Remover">${iconHtml('x', 12)}</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- CURATED CLIPS -->
      <div class="stack-sm">
        <h3>Vídeos Recomendados para Imersão (TED &amp; Discursos Claros)</h3>
        <div class="grid-3">
          ${CURATED_VIDEOS.map(v => `
            <button class="card card-interactive stack-sm" style="text-align:left; ${v.id === vl.videoId ? 'border-color:var(--primary);' : ''}" data-vl-pick="${esc(v.id)}">
              <div class="row-between">
                <span class="pill">${esc(v.level)}</span>
                <span class="muted" style="font-size:11.5px;">${esc(v.channel)}</span>
              </div>
              <strong style="font-size:15px;">${esc(v.title)}</strong>
              <span class="muted" style="font-size:12px;">${esc(v.tip)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

async function mountVlPlayer() {
  stopVideoLab();
  await ensureYtApi();
  const host = document.getElementById('vl-player-host');
  if (!host) return;
  host.innerHTML = '';

  vlPlayer = new window.YT.Player('vl-player-host', {
    width: '100%',
    height: '100%',
    videoId: vl.videoId,
    playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
    events: {
      onReady: (e) => {
        try { e.target.setPlaybackRate(vl.rate); } catch (_) {}
        loopInterval = setInterval(() => {
          if (!vlPlayer || typeof vlPlayer.getCurrentTime !== 'function') return;
          const now = vlPlayer.getCurrentTime();
          const clk = document.getElementById('vl-clock');
          if (clk) clk.textContent = fmtSec(now);
          if (vl.loopOn && vl.pointA !== null && vl.pointB !== null && vl.pointB > vl.pointA + 0.5) {
            if (now >= vl.pointB || now < vl.pointA - 0.5) {
              vlPlayer.seekTo(vl.pointA, true);
            }
          }
        }, 180);
      }
    }
  });
}

export function bindVideoLabEvents(root, rerender, showToast) {
  mountVlPlayer();

  document.getElementById('vl-url-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = document.getElementById('vl-url-input')?.value || '';
    const id = extractYoutubeId(raw);
    if (!id) {
      showToast('Link do YouTube inválido. Cole uma URL completa ou o ID de 11 caracteres.');
      return;
    }
    playClick();
    vl.videoId = id;
    vl.videoTitle = `Vídeo Personalizado (${id})`;
    vl.urlInput = '';
    vl.pointA = null;
    vl.pointB = null;
    vl.loopOn = false;
    rerender();
  });

  root.querySelectorAll('[data-vl-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      const v = CURATED_VIDEOS.find(x => x.id === btn.dataset.vlPick);
      if (!v) return;
      vl.videoId = v.id;
      vl.videoTitle = v.title;
      vl.pointA = null;
      vl.pointB = null;
      vl.loopOn = false;
      rerender();
    });
  });

  document.getElementById('btn-vl-back3')?.addEventListener('click', () => {
    playClick();
    if (vlPlayer && typeof vlPlayer.getCurrentTime === 'function') {
      vlPlayer.seekTo(Math.max(0, vlPlayer.getCurrentTime() - 3), true);
    }
  });

  document.getElementById('btn-vl-set-a')?.addEventListener('click', () => {
    playClick();
    const t = vlPlayer && typeof vlPlayer.getCurrentTime === 'function' ? vlPlayer.getCurrentTime() : 0;
    vl.pointA = Math.floor(t * 10) / 10;
    if (vl.pointB !== null && vl.pointB <= vl.pointA) vl.pointB = null;
    showToast(`Ponto A marcado em ${fmtSec(vl.pointA)}`);
    rerender();
  });

  document.getElementById('btn-vl-set-b')?.addEventListener('click', () => {
    playClick();
    const t = vlPlayer && typeof vlPlayer.getCurrentTime === 'function' ? vlPlayer.getCurrentTime() : 5;
    vl.pointB = Math.floor(t * 10) / 10;
    if (vl.pointA === null) vl.pointA = Math.max(0, vl.pointB - 5);
    vl.loopOn = true;
    showToast(`Loop A–B ativado (${fmtSec(vl.pointA)} → ${fmtSec(vl.pointB)})!`);
    rerender();
  });

  document.getElementById('btn-vl-loop')?.addEventListener('click', () => {
    playClick();
    if (vl.pointA === null || vl.pointB === null) {
      showToast('Marque os pontos A e B primeiro durante o vídeo!');
      return;
    }
    vl.loopOn = !vl.loopOn;
    rerender();
  });

  document.getElementById('btn-vl-clear-ab')?.addEventListener('click', () => {
    playClick();
    vl.pointA = null;
    vl.pointB = null;
    vl.loopOn = false;
    rerender();
  });

  document.getElementById('btn-vl-speed')?.addEventListener('click', () => {
    playClick();
    const speeds = [0.75, 1.0, 1.25];
    const nextIdx = (speeds.indexOf(vl.rate) + 1) % speeds.length;
    vl.rate = speeds[nextIdx];
    if (vlPlayer && typeof vlPlayer.setPlaybackRate === 'function') vlPlayer.setPlaybackRate(vl.rate);
    rerender();
  });

  const noteInp = document.getElementById('vl-note-input');
  if (noteInp) noteInp.addEventListener('input', (e) => { vl.noteDraft = e.target.value; });

  document.getElementById('vl-note-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const txt = vl.noteDraft.trim();
    if (!txt) {
      showToast('Escreva o trecho em inglês que você ouviu no vídeo!');
      return;
    }
    const t = vlPlayer && typeof vlPlayer.getCurrentTime === 'function' ? vlPlayer.getCurrentTime() : 0;
    addBookmark(vl.videoId, t, txt);
    const res = recordWords(txt, { source: 'reading', action: 'correct', sample: txt, sampleFrom: `Vídeo — ${vl.videoTitle}` });
    addXp(10);
    vl.noteDraft = '';
    playCorrect();
    showToast(`Trecho salvo (+${res.touched} palavras no Banco de Palavras)!`);
    rerender();
  });

  document.getElementById('btn-vl-to-srs')?.addEventListener('click', () => {
    const txt = vl.noteDraft.trim();
    if (!txt) {
      showToast('Escreva uma expressão ou frase no bloco acima primeiro!');
      return;
    }
    addCustomCard({
      pt: `Expressão do vídeo "${vl.videoTitle}"`,
      chunk: txt.split(' ').slice(0, 4).join(' '),
      en: txt,
      note: 'Minerada no Vídeo & A–B Loop Lab.'
    });
    recordWords(txt, { source: 'vocab', action: 'seen', sample: txt, sampleFrom: `Vídeo — ${vl.videoTitle}` });
    playCorrect();
    showToast('Salvo como Flashcard SRS (+15 XP)!');
  });

  root.querySelectorAll('[data-vl-seek]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      if (vlPlayer && typeof vlPlayer.seekTo === 'function') {
        vlPlayer.seekTo(Number(btn.dataset.vlSeek), true);
        vlPlayer.playVideo();
      }
    });
  });

  root.querySelectorAll('[data-vl-del-bm]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      removeBookmark(btn.dataset.vlDelBm);
      rerender();
    });
  });

  refreshIcons();
}
