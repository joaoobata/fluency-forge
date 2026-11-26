import {
  getLexiconEntries,
  getLexiconStats,
  setWordManualStatus,
  removeLexiconWord,
  recordWords,
  addCustomCard
} from './store.js';
import { speak } from './speech.js';
import { playClick, playCorrect, iconHtml, refreshIcons } from './sfx.js';

const SOURCE_META = {
  music: { label: 'Música', icon: 'music' },
  reading: { label: 'Leitura', icon: 'book-open-text' },
  path: { label: 'Trilha', icon: 'map' },
  vocab: { label: 'Vocabulário', icon: 'layers' },
  drills: { label: 'Drills', icon: 'blocks' },
  speaking: { label: 'Fala', icon: 'mic' },
  manual: { label: 'Manual', icon: 'pen-line' }
};

const STATUS_META = {
  mastered: { label: 'Dominada', color: 'var(--success)', bg: 'var(--success-soft)' },
  learned: { label: 'Aprendida', color: 'var(--primary)', bg: 'var(--primary-soft)' },
  learning: { label: 'Em Progresso', color: 'var(--warning)', bg: 'var(--warning-soft)' },
  seen: { label: 'Vista', color: 'var(--text-muted)', bg: 'var(--bg-soft)' }
};

const lx = {
  statusFilter: 'all', // 'all' | 'mastered' | 'learned' | 'learning' | 'seen'
  sourceFilter: 'all', // 'all' | 'music' | 'reading' | 'path' | 'vocab' | 'drills' | 'speaking'
  sortBy: 'recent', // 'recent' | 'freq' | 'alpha' | 'review'
  query: '',
  limit: 60
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getFilteredEntries() {
  const q = lx.query.trim().toLowerCase();
  const entries = getLexiconEntries().filter(e => {
    if (lx.statusFilter !== 'all' && e.status !== lx.statusFilter) return false;
    if (lx.sourceFilter !== 'all' && !(e.sources || []).includes(lx.sourceFilter)) return false;
    if (q && !e.w.includes(q) && !(e.sample || '').toLowerCase().includes(q)) return false;
    return true;
  });

  if (lx.sortBy === 'recent') {
    entries.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  } else if (lx.sortBy === 'freq') {
    entries.sort((a, b) => (b.seen || 0) - (a.seen || 0) || a.w.localeCompare(b.w));
  } else if (lx.sortBy === 'alpha') {
    entries.sort((a, b) => a.w.localeCompare(b.w));
  } else if (lx.sortBy === 'review') {
    entries.sort((a, b) => ((b.wrong || 0) - (b.correct || 0)) - ((a.wrong || 0) - (a.correct || 0)) || (a.correct || 0) - (b.correct || 0));
  }

  return entries;
}

export function renderLexiconView() {
  const stats = getLexiconStats();
  const filtered = getFilteredEntries();
  const visible = filtered.slice(0, lx.limit);
  const milestonePct = Math.min(100, Math.round((stats.totalUnique / stats.nextMilestone.target) * 100));

  return `
    <div class="stack-lg">
      <!-- HERO + MILESTONE -->
      <div class="card path-hero stack-md">
        <div class="row-between">
          <div class="stack-sm">
            <span class="pill" style="width:fit-content;">${iconHtml('book-marked', 13)} Diário Automático de Palavras</span>
            <h2 style="font-size:24px;">Meu Léxico em Inglês</h2>
            <p class="muted">Cada palavra que você lê, escreve, escuta nas músicas, fala ou pratica nos módulos é anotada automaticamente aqui e evolui de <strong>Vista</strong> → <strong>Em Progresso</strong> → <strong>Aprendida</strong> → <strong>Dominada</strong>.</p>
          </div>
          <div class="row">
            <button class="btn btn-secondary btn-sm" id="btn-lx-export-csv">${iconHtml('download', 14)} Exportar CSV</button>
          </div>
        </div>

        <div class="grid-4">
          <div class="card stat-card">
            <span class="stat-label">Palavras Únicas Vistas</span>
            <span class="stat-value" style="color:var(--primary);">${stats.totalUnique}</span>
            <span class="muted" style="font-size:12px;">${stats.totalExposures} exposições totais</span>
          </div>
          <div class="card stat-card">
            <span class="stat-label">Aprendidas + Dominadas</span>
            <span class="stat-value" style="color:var(--success);">${stats.knownTotal}</span>
            <span class="muted" style="font-size:12px;">${stats.mastered} dominadas • ${stats.learned} aprendidas</span>
          </div>
          <div class="card stat-card">
            <span class="stat-label">Em Progresso</span>
            <span class="stat-value" style="color:var(--warning);">${stats.learning}</span>
            <span class="muted" style="font-size:12px;">${stats.seenOnly} vistas 1ª vez</span>
          </div>
          <div class="card stat-card">
            <span class="stat-label">Próxima Meta CEFR</span>
            <span class="stat-value">${stats.nextMilestone.target}</span>
            <span class="muted" style="font-size:12px;">${esc(stats.nextMilestone.label)}</span>
          </div>
        </div>

        <div class="stack-sm">
          <div class="row-between" style="font-size:12px;">
            <span style="font-weight:700;">Progresso até ${stats.nextMilestone.target} palavras (${esc(stats.nextMilestone.label)})</span>
            <span class="mono" style="font-weight:700; color:var(--primary);">${stats.totalUnique} / ${stats.nextMilestone.target} (${milestonePct}%)</span>
          </div>
          <div class="progress-track" style="height:10px;">
            <div class="progress-fill" style="width:${milestonePct}%;"></div>
          </div>
          <div class="muted" style="font-size:12px;">
            Referência linguística (Paul Nation): <strong>1.000 palavras</strong> cobrem ~80% da conversa diária; <strong>3.000 palavras</strong> cobrem ~95% de músicas, séries e reuniões.
          </div>
        </div>
      </div>

      <!-- QUICK ADD + FILTERS -->
      <div class="card stack-md">
        <div class="row-between" style="flex-wrap:wrap; gap:10px;">
          <div class="row" style="gap:6px;">
            <span class="mini-label">Status:</span>
            <button class="btn btn-sm ${lx.statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" data-lx-status="all">Todas (${stats.totalUnique})</button>
            <button class="btn btn-sm ${lx.statusFilter === 'mastered' ? 'btn-primary' : 'btn-secondary'}" data-lx-status="mastered">Dominadas (${stats.mastered})</button>
            <button class="btn btn-sm ${lx.statusFilter === 'learned' ? 'btn-primary' : 'btn-secondary'}" data-lx-status="learned">Aprendidas (${stats.learned})</button>
            <button class="btn btn-sm ${lx.statusFilter === 'learning' ? 'btn-primary' : 'btn-secondary'}" data-lx-status="learning">Em Progresso (${stats.learning})</button>
            <button class="btn btn-sm ${lx.statusFilter === 'seen' ? 'btn-primary' : 'btn-secondary'}" data-lx-status="seen">Vistas (${stats.seenOnly})</button>
          </div>
          <div class="row" style="gap:6px;">
            <select id="lx-sort" style="padding:6px 10px; font-size:13px;">
              <option value="recent" ${lx.sortBy === 'recent' ? 'selected' : ''}>Mais recentes</option>
              <option value="freq" ${lx.sortBy === 'freq' ? 'selected' : ''}>Mais vistas</option>
              <option value="review" ${lx.sortBy === 'review' ? 'selected' : ''}>Precisam de treino</option>
              <option value="alpha" ${lx.sortBy === 'alpha' ? 'selected' : ''}>Ordem alfabética (A–Z)</option>
            </select>
          </div>
        </div>

        <div class="row" style="gap:6px;">
          <span class="mini-label">Origem:</span>
          <button class="btn btn-sm ${lx.sourceFilter === 'all' ? 'btn-primary' : 'btn-ghost'}" style="border:1px solid var(--border); padding:4px 10px; font-size:12px;" data-lx-source="all">Todas as origens</button>
          ${Object.entries(SOURCE_META).filter(([k]) => k !== 'manual').map(([k, meta]) => `
            <button class="btn btn-sm ${lx.sourceFilter === k ? 'btn-primary' : 'btn-ghost'}" style="border:1px solid var(--border); padding:4px 10px; font-size:12px;" data-lx-source="${k}">
              ${iconHtml(meta.icon, 12)} ${meta.label} (${stats.bySource[k] || 0})
            </button>
          `).join('')}
        </div>

        <div class="row" style="gap:10px; align-items:stretch;">
          <input type="text" id="lx-search" value="${esc(lx.query)}" placeholder="Filtrar palavras anotadas ou exemplos..." style="flex:1; padding:9px 12px;" />
          <form id="lx-manual-form" class="row" style="gap:6px;">
            <input type="text" id="lx-manual-word" placeholder="Anotar palavra ou frase..." style="width:220px; padding:9px 12px;" />
            <button type="submit" class="btn btn-secondary btn-sm">${iconHtml('plus', 14)} Anotar</button>
          </form>
        </div>
      </div>

      <!-- WORD LIST -->
      ${filtered.length === 0 ? `
        <div class="card stack-sm" style="text-align:center; padding:36px 20px;">
          <div style="color:var(--text-muted);">${iconHtml('book-marked', 32)}</div>
          <h3>${stats.totalUnique === 0 ? 'Seu léxico começa a crescer automaticamente agora!' : 'Nenhuma palavra encontrada neste filtro.'}</h3>
          <p class="muted" style="max-width:520px; margin:0 auto;">
            ${stats.totalUnique === 0
              ? 'Jogue uma música em <strong>Música (Lyrics)</strong>, faça uma lição na <strong>Trilha Guiada</strong>, clique em palavras na <strong>Leitura</strong> ou revise <strong>Flashcards</strong> — tudo será registrado aqui automaticamente.'
              : 'Tente limpar a busca ou selecionar outro filtro de status/origem.'}
          </p>
        </div>
      ` : `
        <div class="stack-sm">
          <div class="row-between">
            <span class="muted" style="font-size:13px;">Mostrando <strong>${visible.length}</strong> de <strong>${filtered.length}</strong> palavras</span>
          </div>

          <div class="lexicon-grid">
            ${visible.map(e => {
              const sm = STATUS_META[e.status] || STATUS_META.seen;
              return `
                <div class="card lexicon-card stack-sm" data-lx-word-card="${esc(e.w)}">
                  <div class="row-between" style="gap:8px;">
                    <div class="row" style="gap:8px; align-items:center;">
                      <button class="btn btn-ghost btn-sm" style="padding:4px 7px;" data-lx-speak="${esc(e.w)}" title="Ouvir pronúncia">${iconHtml('volume-2', 14)}</button>
                      <strong class="lexicon-word">${esc(e.w)}</strong>
                    </div>
                    <span class="lexicon-status-pill" style="color:${sm.color}; background:${sm.bg};">${sm.label}</span>
                  </div>

                  <div class="row" style="gap:10px; font-size:12px; color:var(--text-muted);">
                    <span>Viu <strong>${e.seen}x</strong></span>
                    ${e.correct ? `<span style="color:var(--success);">Acertou <strong>${e.correct}x</strong></span>` : ''}
                    ${e.wrong ? `<span style="color:var(--danger);">Errou <strong>${e.wrong}x</strong></span>` : ''}
                  </div>

                  ${e.sample ? `
                    <div class="lexicon-sample">
                      "${esc(e.sample)}"
                      ${e.sampleFrom ? `<div style="font-size:11px; color:var(--text-muted); margin-top:2px;">— ${esc(e.sampleFrom)}</div>` : ''}
                    </div>
                  ` : ''}

                  <div class="row-between" style="padding-top:4px; border-top:1px solid var(--border); gap:6px;">
                    <div class="row" style="gap:4px;">
                      ${(e.sources || []).slice(0, 3).map(src => {
                        const m = SOURCE_META[src] || { label: src, icon: 'tag' };
                        return `<span class="lexicon-src-tag">${esc(m.label)}</span>`;
                      }).join('')}
                    </div>
                    <div class="row" style="gap:4px;">
                      <button class="btn btn-ghost btn-sm" style="padding:3px 7px; font-size:11px;" data-lx-mark="${esc(e.w)}" data-lx-next="${e.status === 'mastered' ? 'learning' : e.status === 'learned' ? 'mastered' : 'learned'}" title="Mudar nível de domínio">
                        ${e.status === 'mastered' ? 'Revisar' : e.status === 'learned' ? 'Dominar' : 'Aprendi'}
                      </button>
                      <button class="btn btn-ghost btn-sm" style="padding:3px 7px; font-size:11px;" data-lx-srs="${esc(e.w)}" title="Enviar para Flashcards (Minhas Lacunas)">+ SRS</button>
                      <button class="btn btn-ghost btn-sm" style="padding:3px 6px; font-size:11px; opacity:0.65;" data-lx-del="${esc(e.w)}" title="Remover">${iconHtml('x', 12)}</button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          ${filtered.length > visible.length ? `
            <div style="text-align:center; padding-top:8px;">
              <button class="btn btn-secondary" id="btn-lx-more">Mostrar mais (+60 palavras)</button>
            </div>
          ` : ''}
        </div>
      `}
    </div>
  `;
}

export function bindLexiconEvents(root, rerender, showToast) {
  root.querySelectorAll('[data-lx-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      lx.statusFilter = btn.dataset.lxStatus;
      lx.limit = 60;
      rerender();
    });
  });

  root.querySelectorAll('[data-lx-source]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      lx.sourceFilter = btn.dataset.lxSource;
      lx.limit = 60;
      rerender();
    });
  });

  document.getElementById('lx-sort')?.addEventListener('change', (e) => {
    lx.sortBy = e.target.value;
    rerender();
  });

  const searchEl = document.getElementById('lx-search');
  if (searchEl) {
    searchEl.addEventListener('input', (e) => {
      lx.query = e.target.value;
      lx.limit = 60;
      rerender();
      const ref = document.getElementById('lx-search');
      if (ref) {
        ref.focus();
        ref.setSelectionRange(ref.value.length, ref.value.length);
      }
    });
  }

  document.getElementById('lx-manual-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = document.getElementById('lx-manual-word');
    const txt = (inp?.value || '').trim();
    if (!txt) return;
    playCorrect();
    const res = recordWords(txt, { source: 'manual', action: 'seen', sample: txt, sampleFrom: 'Anotação manual' });
    showToast(`${res.touched} palavra(s) anotada(s) no seu Léxico!`);
    rerender();
  });

  document.getElementById('btn-lx-export-csv')?.addEventListener('click', () => {
    playClick();
    const entries = getLexiconEntries();
    if (!entries.length) {
      showToast('Nenhuma palavra anotada ainda para exportar.');
      return;
    }
    const header = 'palavra,status,vistas,acertos,erros,origens,exemplo,origem_exemplo';
    const csvRows = entries.map(e => [
      e.w,
      e.status,
      e.seen || 0,
      e.correct || 0,
      e.wrong || 0,
      (e.sources || []).join('|'),
      `"${String(e.sample || '').replace(/"/g, '""')}"`,
      `"${String(e.sampleFrom || '').replace(/"/g, '""')}"`
    ].join(','));
    const blob = new Blob([[header, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fluencyforge-lexico-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    showToast(`CSV exportado com ${entries.length} palavras!`);
  });

  document.getElementById('btn-lx-more')?.addEventListener('click', () => {
    playClick();
    lx.limit += 60;
    rerender();
  });

  root.querySelectorAll('[data-lx-speak]').forEach(btn => {
    btn.addEventListener('click', () => {
      speak(btn.dataset.lxSpeak, 0.9);
    });
  });

  root.querySelectorAll('[data-lx-mark]').forEach(btn => {
    btn.addEventListener('click', () => {
      playCorrect();
      const w = btn.dataset.lxMark;
      const next = btn.dataset.lxNext;
      setWordManualStatus(w, next);
      showToast(`"${w}" marcada como ${STATUS_META[next]?.label || next}!`);
      rerender();
    });
  });

  root.querySelectorAll('[data-lx-srs]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      const w = btn.dataset.lxSrs;
      const entry = getLexiconEntries().find(x => x.w === w);
      addCustomCard({
        pt: `Palavra do Léxico: "${w}"`,
        chunk: w,
        en: entry?.sample || w,
        note: entry?.sampleFrom ? `Capturada em ${entry.sampleFrom}` : 'Adicionada do Meu Léxico.'
      });
      showToast(`"${w}" enviada para Flashcards (Minhas Lacunas)!`);
    });
  });

  root.querySelectorAll('[data-lx-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      removeLexiconWord(btn.dataset.lxDel);
      rerender();
    });
  });

  refreshIcons();
}
