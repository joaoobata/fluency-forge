import {
  getProfileAnalytics,
  updateProfile,
  addJournalNote,
  removeJournalNote,
  formatDurationCompact
} from './store.js';
import { speak } from './speech.js';
import { playClick, playCorrect, iconHtml, refreshIcons } from './sfx.js';
import { downloadEvolutionCardPng, buildEvolutionShareText } from './share-card.js';

const AVATAR_COLORS = ['#c2410c', '#0f766e', '#1d4ed8', '#6d28d9', '#be123c', '#334155'];

const MODULE_LABELS = {
  path: 'Trilha Guiada',
  lyrics: 'Música (Lyrics)',
  vocab: 'Vocabulário (SRS)',
  reading: 'Leitura & Shadowing',
  drills: 'Motores & Drills',
  studio: 'Estúdio 4-3-2 (Fala)',
  external: 'Imersão Externa (Séries/Calls)'
};

const pv = {
  editingProfile: false,
  diaryFilter: 'all', // 'all' | 'learned'
  showAllDays: false
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getInitials(name) {
  const parts = String(name || 'EU').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0] || 'EU').slice(0, 2).toUpperCase();
}

function formatDayLabel(dateKey) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayKey = `${y}-${m}-${d}`;
  const yest = new Date(now.getTime() - 86400000);
  const yestKey = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
  const [yy, mm, dd] = dateKey.split('-');
  const br = `${dd}/${mm}/${yy}`;
  if (dateKey === todayKey) return `Hoje • ${br}`;
  if (dateKey === yestKey) return `Ontem • ${br}`;
  return br;
}

function renderSkillRadarSvg(skills) {
  const axes = [
    { key: 'vocab', label: 'Vocabulário' },
    { key: 'grammar', label: 'Estrutura' },
    { key: 'listening', label: 'Escuta' },
    { key: 'reading', label: 'Leitura' },
    { key: 'speaking', label: 'Fala' }
  ];
  const cx = 130;
  const cy = 122;
  const rMax = 82;
  const point = (idx, pct) => {
    const angle = (-Math.PI / 2) + (idx * 2 * Math.PI) / axes.length;
    const r = (Math.max(8, pct) / 100) * rMax;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const rings = [25, 50, 75, 100].map(level => {
    const pts = axes.map((_, i) => point(i, level).map(n => n.toFixed(1)).join(',')).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="var(--border)" stroke-width="1" />`;
  }).join('');

  const spokes = axes.map((_, i) => {
    const [x, y] = point(i, 100);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="1" />`;
  }).join('');

  const dataPts = axes.map((a, i) => point(i, skills[a.key] || 0));
  const polyStr = dataPts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  const dots = dataPts.map(([x, y]) =>
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="var(--primary)" stroke="var(--surface)" stroke-width="2" />`
  ).join('');

  const labels = axes.map((a, i) => {
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / axes.length;
    const lx = cx + (rMax + 24) * Math.cos(angle);
    const ly = cy + (rMax + 18) * Math.sin(angle);
    return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="var(--text-muted)">${a.label}</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 260 245" class="profile-radar-svg" role="img" aria-label="Gráfico de 5 habilidades em inglês">
      ${rings}
      ${spokes}
      <polygon points="${polyStr}" fill="var(--primary-soft)" stroke="var(--primary)" stroke-width="2.2" />
      ${dots}
      ${labels}
    </svg>
  `;
}

export function renderProfileView() {
  const a = getProfileAnalytics();
  const p = a.profile;
  const todayMin = Math.floor(a.todaySec / 60);
  const dailyGoalMin = p.dailyGoalMinutes || 45;
  const todayGoalPct = Math.min(100, Math.round((todayMin / dailyGoalMin) * 100));
  const hoursPct = Math.min(100, Math.round((a.totalHours / a.nextHoursTarget) * 100));
  const totalModSec = Object.values(a.byMod).reduce((acc, v) => acc + (v || 0), 0);
  const visibleDays = pv.showAllDays ? a.timeline : a.timeline.slice(0, 10);

  return `
    <div class="stack-lg">
      <!-- PROFILE IDENTITY HERO -->
      <div class="card path-hero stack-md">
        <div class="row-between" style="align-items:flex-start; flex-wrap:wrap; gap:16px;">
          <div class="row" style="gap:16px; align-items:center;">
            <div class="profile-avatar" style="background:${esc(p.avatarColor || '#c2410c')};">
              ${esc(getInitials(p.name))}
            </div>
            <div class="stack-sm" style="gap:4px;">
              <div class="row" style="gap:8px; align-items:center;">
                <h2 style="font-size:24px;">${esc(p.name)}</h2>
                <span class="cefr-badge">${esc(a.cefr.code)} • ${esc(a.cefr.name.split(' ')[0])}</span>
              </div>
              <p class="muted" style="font-size:14px;">${esc(p.goal)}</p>
              <div class="row" style="gap:12px; font-size:12px; color:var(--text-muted);">
                <span>${iconHtml('calendar', 13)} Desde ${esc(p.joinedDate.split('-').reverse().join('/'))}</span>
                <span>${iconHtml('target', 13)} Meta diária: <strong>${todayMin} / ${dailyGoalMin} min</strong> (${todayGoalPct}%)</span>
                <span>${iconHtml('flame', 13)} Sequência: <strong>${a.streak} dia(s)</strong></span>
              </div>
            </div>
          </div>

          <div class="row" style="gap:8px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-prof-share-png">
              ${iconHtml('image-down', 14)} Card PNG (Stories/LinkedIn)
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-prof-edit-toggle">
              ${iconHtml(pv.editingProfile ? 'x' : 'user-pen', 14)} ${pv.editingProfile ? 'Fechar Edição' : 'Editar Perfil'}
            </button>
            <button class="btn btn-primary btn-sm" data-goto="lexicon">
              ${iconHtml('book-marked', 14)} Banco de Palavras (${a.lx.totalUnique})
            </button>
          </div>
        </div>

        ${pv.editingProfile ? `
          <form id="profile-edit-form" class="card stack-md" style="background:var(--bg-soft);">
            <div class="grid-2">
              <label class="field">
                <span>Seu Nome</span>
                <input type="text" id="prof-name" value="${esc(p.name)}" maxlength="40" required />
              </label>
              <label class="field">
                <span>Objetivo com o Inglês</span>
                <input type="text" id="prof-goal" value="${esc(p.goal)}" maxlength="110" />
              </label>
              <label class="field">
                <span>Nível Inicial Declarado</span>
                <select id="prof-start-level">
                  ${['A1', 'A2', 'B1', 'B2', 'C1'].map(lvl => `<option value="${lvl}" ${p.startLevel === lvl ? 'selected' : ''}>${lvl}</option>`).join('')}
                </select>
              </label>
              <label class="field">
                <span>Meta Diária de Imersão (minutos)</span>
                <select id="prof-daily-min">
                  ${[15, 30, 45, 60, 90, 120].map(m => `<option value="${m}" ${dailyGoalMin === m ? 'selected' : ''}>${m} min / dia</option>`).join('')}
                </select>
              </label>
            </div>
            <div class="row-between" style="flex-wrap:wrap; gap:10px;">
              <div class="row" style="gap:8px; align-items:center;">
                <span class="mini-label">Cor do Avatar:</span>
                ${AVATAR_COLORS.map(c => `
                  <button type="button" class="avatar-color-dot ${p.avatarColor === c ? 'active' : ''}" data-prof-color="${c}" style="background:${c};" aria-label="Cor ${c}"></button>
                `).join('')}
                <input type="hidden" id="prof-avatar-color" value="${esc(p.avatarColor || '#c2410c')}" />
              </div>
              <button type="submit" class="btn btn-primary btn-sm">${iconHtml('check', 14)} Salvar Perfil</button>
            </div>
          </form>
        ` : ''}

        <!-- TOP 4 EVOLUTION KPIS -->
        <div class="grid-4">
          <div class="card stat-card">
            <span class="stat-label">Horas de Inglês</span>
            <span class="stat-value" style="color:var(--primary);">${formatDurationCompact(a.totalSec)}</span>
            <span class="muted" style="font-size:12px;">Hoje: ${formatDurationCompact(a.todaySec)} • Meta: ${a.nextHoursTarget}h (${hoursPct}%)</span>
          </div>
          <div class="card stat-card">
            <span class="stat-label">Nível Estimado (CEFR)</span>
            <span class="stat-value">${esc(a.cefr.code)}</span>
            <span class="muted" style="font-size:12px;">${a.overallScore}/100 pts • ${a.bandPct}% até ${esc(a.cefr.next)}</span>
          </div>
          <div class="card stat-card">
            <span class="stat-label">Palavras Vistas / Aprendidas</span>
            <span class="stat-value" style="color:var(--success);">${a.lx.totalUnique}</span>
            <span class="muted" style="font-size:12px;">${a.lx.knownTotal} aprendidas • ${a.lx.learning} em progresso</span>
          </div>
          <div class="card stat-card">
            <span class="stat-label">Atividades Concluídas</span>
            <span class="stat-value">${a.lessonsDone + a.drillsDone + a.readingsDone + a.songsDone}</span>
            <span class="muted" style="font-size:12px;">${a.lessonsDone} lições • ${a.songsDone} músicas • ${a.readingsDone} leituras</span>
          </div>
        </div>
      </div>

      <!-- CEFR LEVEL + 5-SKILL RADAR & STUDY HOURS BREAKDOWN -->
      <div class="grid-2">
        <div class="card stack-md">
          <div class="row-between">
            <div>
              <h3>Mapa de Habilidades &amp; Nível CEFR</h3>
              <p class="muted" style="font-size:13px;">Calculado com base real nas suas palavras, lições, músicas, leituras e fala.</p>
            </div>
            <span class="cefr-badge">${esc(a.cefr.code)} → ${esc(a.cefr.next)}</span>
          </div>

          <div class="profile-radar-wrap">
            ${renderSkillRadarSvg(a.skills)}
            <div class="stack-sm" style="flex:1; min-width:170px;">
              ${[
                ['Vocabulário', a.skills.vocab],
                ['Estrutura & Gramática', a.skills.grammar],
                ['Escuta & Música', a.skills.listening],
                ['Leitura & Shadowing', a.skills.reading],
                ['Fala Ativa', a.skills.speaking]
              ].map(([label, val]) => `
                <div class="stack-sm" style="gap:3px;">
                  <div class="row-between" style="font-size:12px;">
                    <span>${label}</span>
                    <strong class="mono">${val}%</strong>
                  </div>
                  <div class="progress-track" style="height:6px;">
                    <div class="progress-fill" style="width:${val}%;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="tip-box" style="font-size:13px;">
            <strong>Próximo passo para chegar em ${esc(a.cefr.next)}:</strong> ${esc(a.cefr.tip)}
          </div>
        </div>

        <div class="card stack-md">
          <div>
            <h3>Horas de Inglês por Área</h3>
            <p class="muted" style="font-size:13px;">O cronômetro conta automaticamente enquanto você estuda ativo na plataforma — e você também pode registrar imersão externa.</p>
          </div>

          <div class="stack-sm">
            ${Object.entries(MODULE_LABELS).map(([k, label]) => {
              const sec = a.byMod[k] || 0;
              const pct = totalModSec > 0 ? Math.round((sec / totalModSec) * 100) : 0;
              return `
                <div class="stack-sm" style="gap:3px;">
                  <div class="row-between" style="font-size:12.5px;">
                    <span>${label}</span>
                    <span class="mono"><strong>${formatDurationCompact(sec)}</strong> ${pct ? `(${pct}%)` : ''}</span>
                  </div>
                  <div class="progress-track" style="height:6px;">
                    <div class="progress-fill" style="width:${pct}%;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <form id="prof-journal-form" class="card stack-sm" style="background:var(--bg-soft); padding:12px 14px;">
            <strong style="font-size:13px;">${iconHtml('pen-line', 13)} Registrar no Diário de Evolução / Tempo Extra</strong>
            <textarea id="prof-note-text" rows="2" placeholder="Ex: Assisti 1 episódio sem legenda, entendi 80% de Believer, fiz reunião em inglês..." style="width:100%; padding:8px 10px; font-size:13px;"></textarea>
            <div class="row-between" style="gap:8px; flex-wrap:wrap;">
              <div class="row" style="gap:6px;">
                <select id="prof-note-tag" style="padding:6px 8px; font-size:12px;">
                  <option value="Evolução">Evolução</option>
                  <option value="Série / Filme">Série / Filme</option>
                  <option value="Reunião / Call">Reunião / Call</option>
                  <option value="Podcast / Áudio">Podcast / Áudio</option>
                  <option value="Conquista">Conquista</option>
                </select>
                <input type="number" id="prof-extra-min" min="0" max="600" placeholder="+ min extras" style="width:110px; padding:6px 8px; font-size:12px;" />
              </div>
              <button type="submit" class="btn btn-primary btn-sm">${iconHtml('plus', 14)} Salvar no Diário</button>
            </div>
          </form>
        </div>
      </div>

      <!-- CONSISTENCY HEATMAP (12 WEEKS) -->
      <div class="card stack-md">
        <div class="row-between" style="flex-wrap:wrap; gap:10px;">
          <div>
            <h3>Consistência nos Últimos 84 Dias</h3>
            <p class="muted" style="font-size:13px;">${a.activeDays} dia(s) ativo(s) registrados • quanto mais escuro o bloco, maior a imersão naquele dia.</p>
          </div>
          <div class="row" style="gap:5px; font-size:11px; color:var(--text-muted); align-items:center;">
            <span>Menos</span>
            <span class="hm-cell hm-l0"></span>
            <span class="hm-cell hm-l1"></span>
            <span class="hm-cell hm-l2"></span>
            <span class="hm-cell hm-l3"></span>
            <span class="hm-cell hm-l4"></span>
            <span>Mais</span>
          </div>
        </div>

        <div class="heatmap-grid" aria-label="Mapa de consistência de estudo">
          ${a.heatmap.map(cell => `
            <div class="hm-cell hm-l${cell.level}" title="${esc(cell.date.split('-').reverse().join('/'))}: ${formatDurationCompact(cell.seconds)} • ${cell.words} palavras • ${cell.xp} XP"></div>
          `).join('')}
        </div>
      </div>

      <!-- ACHIEVEMENTS -->
      <div class="card stack-md">
        <div class="row-between">
          <h3>Marcos &amp; Conquistas (${a.achievements.filter(x => x.unlocked).length}/${a.achievements.length})</h3>
        </div>
        <div class="grid-4">
          ${a.achievements.map(ach => `
            <div class="card achievement-card ${ach.unlocked ? 'ach-unlocked' : 'ach-locked'} stack-sm">
              <div class="row-between">
                <span class="ach-icon">${iconHtml(ach.icon, 16)}</span>
                <span class="pill" style="font-size:10px;">${ach.unlocked ? 'Conquistado' : 'Em breve'}</span>
              </div>
              <strong style="font-size:14px;">${esc(ach.title)}</strong>
              <span class="muted" style="font-size:12px;">${esc(ach.desc)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- DAILY EVOLUTION & WORDS DIARY -->
      <div class="card stack-md">
        <div class="row-between" style="flex-wrap:wrap; gap:10px;">
          <div>
            <h3>Diário Completo de Palavras &amp; Evolução</h3>
            <p class="muted" style="font-size:13px;">Histórico dia a dia de todas as palavras que você viu, praticou e aprendeu — clique em qualquer palavra para ouvir.</p>
          </div>
          <div class="row" style="gap:6px;">
            <button class="btn btn-sm ${pv.diaryFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" data-pv-filter="all">Todas do Dia</button>
            <button class="btn btn-sm ${pv.diaryFilter === 'learned' ? 'btn-primary' : 'btn-secondary'}" data-pv-filter="learned">Só Aprendidas / Dominadas</button>
            <button class="btn btn-ghost btn-sm" data-goto="lexicon">Ver Tabela Completa →</button>
          </div>
        </div>

        ${visibleDays.length === 0 ? `
          <div class="muted" style="padding:20px 0; text-align:center;">
            Seu diário de evolução começa hoje! Assim que você jogar uma música, ler um texto, fazer uma lição ou salvar uma nota acima, cada dia aparecerá aqui.
          </div>
        ` : `
          <div class="stack-md">
            ${visibleDays.map(day => {
              const dayWords = pv.diaryFilter === 'learned'
                ? day.words.filter(w => w.status === 'learned' || w.status === 'mastered')
                : day.words;
              return `
                <div class="diary-day-card stack-sm">
                  <div class="row-between" style="flex-wrap:wrap; gap:8px;">
                    <strong style="font-size:16px; font-family:'Bricolage Grotesque',sans-serif;">${esc(formatDayLabel(day.date))}</strong>
                    <div class="row" style="gap:8px; font-size:12px;">
                      <span class="pill">${iconHtml('clock', 12)} ${formatDurationCompact(day.seconds)}</span>
                      <span class="pill">${iconHtml('book-marked', 12)} ${day.words.length} palavras (${day.learnedCount} aprendidas)</span>
                      ${day.xp ? `<span class="pill">${iconHtml('zap', 12)} +${day.xp} XP</span>` : ''}
                    </div>
                  </div>

                  ${day.notes.length ? `
                    <div class="stack-sm">
                      ${day.notes.map(n => `
                        <div class="diary-note-row">
                          <div>
                            <span class="lexicon-src-tag" style="margin-right:6px;">${esc(n.tag)}</span>
                            ${n.minutes ? `<span class="lexicon-src-tag" style="margin-right:6px; color:var(--primary);">+${n.minutes} min</span>` : ''}
                            <span>${esc(n.text)}</span>
                          </div>
                          <button class="btn btn-ghost btn-sm" style="padding:2px 6px;" data-pv-del-note="${esc(n.id)}" title="Apagar nota">${iconHtml('x', 12)}</button>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}

                  ${dayWords.length ? `
                    <div class="diary-word-chips">
                      ${dayWords.slice(0, 48).map(w => `
                        <button class="diary-word-chip status-${w.status}" data-pv-speak="${esc(w.w)}" title="${esc(w.w)} • viu ${w.seen}x • clique para ouvir">
                          <span>${esc(w.w)}</span>
                          <span class="dwc-count">${w.seen}x</span>
                        </button>
                      `).join('')}
                      ${dayWords.length > 48 ? `<button class="btn btn-ghost btn-sm" data-goto="lexicon">+${dayWords.length - 48} mais</button>` : ''}
                    </div>
                  ` : `<div class="muted" style="font-size:12px;">${pv.diaryFilter === 'learned' ? 'Nenhuma palavra atingiu nível Aprendida neste dia ainda.' : 'Registro de tempo / nota salvo neste dia.'}</div>`}
                </div>
              `;
            }).join('')}

            ${a.timeline.length > 10 ? `
              <div style="text-align:center;">
                <button class="btn btn-secondary btn-sm" id="btn-pv-toggle-days">
                  ${pv.showAllDays ? 'Mostrar últimos 10 dias' : `Mostrar todos os ${a.timeline.length} dias`}
                </button>
              </div>
            ` : ''}
          </div>
        `}
      </div>
    </div>
  `;
}

export function bindProfileEvents(root, rerender, showToast, navigateTo) {
  document.getElementById('btn-prof-share-png')?.addEventListener('click', () => {
    playCorrect();
    downloadEvolutionCardPng();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(buildEvolutionShareText()).catch(() => {});
    }
    showToast('Card PNG baixado e resumo copiado para compartilhar!');
  });

  document.getElementById('btn-prof-edit-toggle')?.addEventListener('click', () => {
    playClick();
    pv.editingProfile = !pv.editingProfile;
    rerender();
  });

  root.querySelectorAll('[data-prof-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      const color = btn.dataset.profColor;
      const hidden = document.getElementById('prof-avatar-color');
      if (hidden) hidden.value = color;
      root.querySelectorAll('[data-prof-color]').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  document.getElementById('profile-edit-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    playCorrect();
    updateProfile({
      name: (document.getElementById('prof-name')?.value || 'Seu Perfil').trim(),
      goal: (document.getElementById('prof-goal')?.value || '').trim(),
      startLevel: document.getElementById('prof-start-level')?.value || 'A2',
      dailyGoalMinutes: Number(document.getElementById('prof-daily-min')?.value || 45),
      avatarColor: document.getElementById('prof-avatar-color')?.value || '#c2410c'
    });
    pv.editingProfile = false;
    showToast('Perfil atualizado!');
    rerender();
  });

  document.getElementById('prof-journal-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = (document.getElementById('prof-note-text')?.value || '').trim();
    const tag = document.getElementById('prof-note-tag')?.value || 'Evolução';
    const extraMinutes = Number(document.getElementById('prof-extra-min')?.value || 0);
    if (!text && !extraMinutes) {
      showToast('Escreva uma anotação ou informe minutos extras de inglês.');
      return;
    }
    playCorrect();
    addJournalNote({ text, tag, extraMinutes });
    showToast(extraMinutes ? `Salvo no Diário (+${extraMinutes} min de inglês)!` : 'Nota salva no Diário de Evolução!');
    rerender();
  });

  root.querySelectorAll('[data-pv-del-note]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      removeJournalNote(btn.dataset.pvDelNote);
      rerender();
    });
  });

  root.querySelectorAll('[data-pv-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      pv.diaryFilter = btn.dataset.pvFilter;
      rerender();
    });
  });

  root.querySelectorAll('[data-pv-speak]').forEach(btn => {
    btn.addEventListener('click', () => {
      speak(btn.dataset.pvSpeak, 0.9);
    });
  });

  root.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      if (navigateTo) navigateTo(btn.dataset.goto);
    });
  });

  document.getElementById('btn-pv-toggle-days')?.addEventListener('click', () => {
    playClick();
    pv.showAllDays = !pv.showAllDays;
    rerender();
  });

  refreshIcons();
}
