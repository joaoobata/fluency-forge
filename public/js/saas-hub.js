import {
  getState,
  updateState,
  getProfileAnalytics,
  formatDurationCompact,
  computeWordStatus
} from './store.js';
import { playClick, playCorrect, playVictory, iconHtml, refreshIcons } from './sfx.js';

const PLANS = [
  {
    id: 'free',
    name: 'Grátis',
    badge: 'Para começar',
    price: 'R$ 0',
    period: 'para sempre',
    desc: 'Ideal para testar o método todos os dias e criar o hábito.',
    features: [
      'Unidade 1 da Trilha Guiada + Rotina do Dia',
      'Música (Lyrics) nos modos Fácil e Médio',
      'Banco de Palavras (até 250 palavras)',
      'Simulador de Calls (2 cenários iniciais)',
      'Progresso salvo localmente no navegador'
    ],
    cta: 'Plano Atual',
    highlight: false
  },
  {
    id: 'pro_annual',
    name: 'Pro Anual',
    badge: 'Mais escolhido • -45%',
    price: 'R$ 19,90',
    period: '/mês no anual (R$ 199/ano)',
    desc: 'Tudo ilimitado para destravar conversação em reuniões, entrevistas e viagens.',
    features: [
      'Todas as 8 Unidades (32 Lições) + 552 Flashcards SRS',
      'Música ilimitada (Difícil & Extremo) + Importador Spotify/YouTube',
      'Todos os 6+ cenários do Simulador de Calls + Vídeo Loop A–B',
      'Banco de Palavras ilimitado + Exportação CSV + Backup',
      'Vozes Neurais gratuitas (EUA e UK) + Analisador PT → EN'
    ],
    cta: 'Assinar Pro Anual',
    highlight: true
  },
  {
    id: 'founder',
    name: 'Passe Fundador',
    badge: 'Lote limitado (100 vagas)',
    price: 'R$ 297',
    period: 'pagamento único • vitalício',
    desc: 'Apoie o projeto desde o início e tenha acesso vitalício a todas as atualizações Pro.',
    features: [
      'Acesso vitalício sem mensalidade',
      'Selo exclusivo de Fundador no Perfil & Card PNG',
      'Acesso antecipado a novos simuladores e trilhas',
      'Prioridade para sugerir recursos e artistas'
    ],
    cta: 'Garantir Passe Fundador',
    highlight: false
  },
  {
    id: 'team',
    name: 'Times & Professores',
    badge: 'B2B / Escolas',
    price: 'R$ 97',
    period: '/mês (até 20 alunos/membros)',
    desc: 'Para professores particulares e times de tecnologia que acompanham a evolução da equipe.',
    features: [
      'Painel de Turmas & Empresas com Ranking de Consistência',
      'Importação de relatórios dos alunos e média CEFR da equipe',
      'Exportação executiva CSV para RH e acompanhamento pedagógico',
      'Trilhas corporativas (Daily, Entrevista, Negociação)'
    ],
    cta: 'Ativar Modo B2B / Turmas',
    highlight: false
  }
];

const DEMO_TEAM = [
  { id: 'demo-1', name: 'Lucas Ferreira', role: 'Dev Backend', cefr: 'B1', score: 54, totalSec: 46800, words: 740, learned: 312, streak: 14, lessons: 18, songs: 9 },
  { id: 'demo-2', name: 'Mariana Costa', role: 'Product Designer', cefr: 'B2', score: 71, totalSec: 79200, words: 1290, learned: 610, streak: 21, lessons: 26, songs: 15 },
  { id: 'demo-3', name: 'Rafael Mendes', role: 'Analista de Dados', cefr: 'A2', score: 33, totalSec: 21600, words: 380, learned: 145, streak: 6, lessons: 9, songs: 4 }
];

const sh = {
  showFounderConfig: false
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSub() {
  return {
    plan: 'founder', // Open/founder access by default for owner, configurable to test paywall
    checkoutProUrl: '',
    checkoutFounderUrl: '',
    checkoutTeamUrl: '',
    ...(getState().subscription || {})
  };
}

function getTeamMembers() {
  const s = getState();
  const me = getProfileAnalytics();
  const selfRow = {
    id: 'self',
    name: `${me.profile.name} (Você)`,
    role: me.profile.goal.slice(0, 32),
    cefr: me.cefr.code,
    score: me.overallScore,
    totalSec: me.totalSec,
    words: me.lx.totalUnique,
    learned: me.lx.knownTotal,
    streak: me.streak,
    lessons: me.lessonsDone,
    songs: me.songsDone,
    isSelf: true
  };
  const saved = Array.isArray(s.teamRoster) ? s.teamRoster : DEMO_TEAM;
  return [selfRow, ...saved].sort((a, b) => b.totalSec - a.totalSec);
}

export function renderPricingView() {
  const sub = getSub();
  const activePlanObj = PLANS.find(p => p.id === sub.plan) || PLANS[2];

  return `
    <div class="stack-lg">
      <div class="card path-hero stack-md">
        <div class="row-between" style="flex-wrap:wrap; gap:12px;">
          <div class="stack-sm">
            <span class="pill" style="width:fit-content;">${iconHtml('sparkles', 13)} Estrutura Comercial SaaS • Planos &amp; Checkout</span>
            <h2 style="font-size:24px;">FluencyForge Pro &amp; Monetização</h2>
            <p class="muted">Plano ativo no seu navegador: <strong>${esc(activePlanObj.name)}</strong>. Configure seus links reais de checkout (Stripe, Mercado Pago, AbacatePay ou Kiwify) ou visualize a página pública de vendas.</p>
          </div>
          <div class="row" style="gap:8px;">
            <a class="btn btn-secondary btn-sm" href="/landing.html" target="_blank" style="text-decoration:none;">
              ${iconHtml('external-link', 14)} Abrir Landing Page Comercial
            </a>
            <button class="btn btn-primary btn-sm" id="btn-saas-config-toggle">
              ${iconHtml('settings', 14)} ${sh.showFounderConfig ? 'Fechar Config' : 'Configurar Checkout (Fundador)'}
            </button>
          </div>
        </div>

        ${sh.showFounderConfig ? `
          <form id="saas-founder-form" class="card stack-md" style="background:var(--bg-soft);">
            <div>
              <strong>Painel do Fundador — Conectar Checkout Real (Pix / Cartão)</strong>
              <p class="muted" style="font-size:12.5px;">Cole abaixo seus links reais da Stripe, AbacatePay, Mercado Pago ou Kiwify. Quando um visitante clicar em assinar, será redirecionado direto para o seu checkout.</p>
            </div>
            <div class="grid-3">
              <label class="field">
                <span>Link Checkout Pro Anual (R$ 199)</span>
                <input type="url" id="cfg-url-pro" value="${esc(sub.checkoutProUrl)}" placeholder="https://pay.abacatepay.com/..." />
              </label>
              <label class="field">
                <span>Link Passe Fundador (R$ 297)</span>
                <input type="url" id="cfg-url-founder" value="${esc(sub.checkoutFounderUrl)}" placeholder="https://pay.kiwify.com.br/..." />
              </label>
              <label class="field">
                <span>Link Times &amp; Professores (R$ 97/mês)</span>
                <input type="url" id="cfg-url-team" value="${esc(sub.checkoutTeamUrl)}" placeholder="https://buy.stripe.com/..." />
              </label>
            </div>
            <div class="row-end">
              <button type="submit" class="btn btn-primary btn-sm">${iconHtml('check', 14)} Salvar Links de Checkout</button>
            </div>
          </form>
        ` : ''}
      </div>

      <!-- PRICING GRID -->
      <div class="grid-4" style="align-items:stretch;">
        ${PLANS.map(plan => {
          const isCurrent = sub.plan === plan.id;
          return `
            <div class="card stack-md" style="justify-content:space-between; ${plan.highlight ? 'border-color:var(--primary); box-shadow: 4px 4px 0 var(--primary);' : ''}">
              <div class="stack-sm">
                <div class="row-between">
                  <span class="pill" style="font-size:11px; ${plan.highlight ? 'background:var(--primary); color:#fff;' : ''}">${esc(plan.badge)}</span>
                  ${isCurrent ? `<span class="pill" style="font-size:10px; color:var(--success); border-color:var(--success);">Ativo</span>` : ''}
                </div>
                <h3 style="font-size:20px;">${esc(plan.name)}</h3>
                <div>
                  <span style="font-family:'Bricolage Grotesque',sans-serif; font-size:30px; font-weight:800;">${esc(plan.price)}</span>
                  <div class="muted" style="font-size:12px;">${esc(plan.period)}</div>
                </div>
                <p class="muted" style="font-size:12.5px;">${esc(plan.desc)}</p>
                <ul class="saas-feature-list">
                  ${plan.features.map(f => `<li>${iconHtml('check', 13)} <span>${esc(f)}</span></li>`).join('')}
                </ul>
              </div>

              <button class="btn ${plan.highlight ? 'btn-primary' : 'btn-secondary'} btn-full" data-saas-pick="${esc(plan.id)}">
                ${isCurrent ? 'Plano Ativo' : esc(plan.cta)}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export function renderTeamsView() {
  const members = getTeamMembers();
  const totalHoursSec = members.reduce((acc, m) => acc + (m.totalSec || 0), 0);
  const avgWords = members.length ? Math.round(members.reduce((acc, m) => acc + (m.words || 0), 0) / members.length) : 0;
  const avgScore = members.length ? Math.round(members.reduce((acc, m) => acc + (m.score || 0), 0) / members.length) : 0;
  const avgCefr = avgScore >= 85 ? 'C1' : avgScore >= 65 ? 'B2' : avgScore >= 42 ? 'B1' : avgScore >= 22 ? 'A2' : 'A1';

  return `
    <div class="stack-lg">
      <div class="card path-hero stack-md">
        <div class="row-between" style="flex-wrap:wrap; gap:12px;">
          <div class="stack-sm">
            <span class="pill" style="width:fit-content;">${iconHtml('building-2', 13)} Painel B2B • Professores &amp; Empresas</span>
            <h2 style="font-size:24px;">Gestão de Turmas &amp; Equipes de Inglês</h2>
            <p class="muted">Acompanhe horas reais de imersão, evolução CEFR e banco de palavras de cada aluno ou funcionário. Importe o arquivo de backup (<code>.json</code>) de qualquer aluno para atualizar o painel em 1 clique.</p>
          </div>
          <div class="row" style="gap:8px; flex-wrap:wrap;">
            <label class="btn btn-primary btn-sm" style="cursor:pointer;">
              ${iconHtml('upload', 14)} Importar Aluno (.json)
              <input type="file" id="team-import-json" accept="application/json" style="display:none;" />
            </label>
            <button class="btn btn-secondary btn-sm" id="btn-team-export-csv">${iconHtml('download', 14)} Relatório Executivo CSV</button>
          </div>
        </div>

        <div class="grid-4">
          <div class="card stat-card">
            <span class="stat-label">Membros / Alunos</span>
            <span class="stat-value">${members.length}</span>
            <span class="muted" style="font-size:12px;">Ativos no painel</span>
          </div>
          <div class="card stat-card">
            <span class="stat-label">Horas da Equipe</span>
            <span class="stat-value" style="color:var(--primary);">${formatDurationCompact(totalHoursSec)}</span>
            <span class="muted" style="font-size:12px;">Imersão acumulada</span>
          </div>
          <div class="card stat-card">
            <span class="stat-label">Média de Palavras</span>
            <span class="stat-value" style="color:var(--success);">${avgWords}</span>
            <span class="muted" style="font-size:12px;">Por membro no Léxico</span>
          </div>
          <div class="card stat-card">
            <span class="stat-label">Nível Médio (CEFR)</span>
            <span class="stat-value">${avgCefr}</span>
            <span class="muted" style="font-size:12px;">Score médio: ${avgScore}/100</span>
          </div>
        </div>
      </div>

      <!-- QUICK ADD STUDENT / MEMBER -->
      <form id="team-add-form" class="card row" style="gap:8px; flex-wrap:wrap; align-items:stretch;">
        <input type="text" id="team-new-name" placeholder="Nome do aluno ou colaborador" style="flex:1; min-width:180px; padding:9px 12px;" required />
        <input type="text" id="team-new-role" placeholder="Cargo ou Turma (ex: Dev Frontend, Turma B1)" style="flex:1; min-width:180px; padding:9px 12px;" />
        <select id="team-new-cefr" style="padding:9px 10px;">
          ${['A1', 'A2', 'B1', 'B2', 'C1'].map(l => `<option value="${l}">${l}</option>`).join('')}
        </select>
        <button type="submit" class="btn btn-secondary btn-sm">${iconHtml('user-plus', 14)} Adicionar à Turma</button>
      </form>

      <!-- LEADERBOARD TABLE -->
      <div class="card stack-md" style="overflow-x:auto;">
        <div class="row-between">
          <h3>Ranking de Evolução &amp; Consistência</h3>
          <span class="muted" style="font-size:12px;">Ordenado por horas reais de inglês</span>
        </div>

        <table class="team-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Membro / Aluno</th>
              <th>Nível</th>
              <th>Horas</th>
              <th>Palavras</th>
              <th>Sequência</th>
              <th>Lições / Músicas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${members.map((m, idx) => `
              <tr>
                <td class="mono" style="font-weight:700;">${idx + 1}</td>
                <td>
                  <strong>${esc(m.name)}</strong>
                  <div class="muted" style="font-size:11.5px;">${esc(m.role || 'Estudante')}</div>
                </td>
                <td><span class="cefr-badge" style="font-size:11px;">${esc(m.cefr)}</span></td>
                <td class="mono"><strong>${formatDurationCompact(m.totalSec)}</strong></td>
                <td class="mono">${m.words} <span class="muted">(${m.learned} apr.)</span></td>
                <td class="mono">${m.streak}d</td>
                <td class="mono">${m.lessons} liç. • ${m.songs} mús.</td>
                <td>
                  ${m.isSelf ? '' : `<button class="btn btn-ghost btn-sm" style="padding:3px 6px;" data-team-del="${esc(m.id)}" title="Remover">${iconHtml('x', 12)}</button>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function bindPricingEvents(root, rerender, showToast) {
  document.getElementById('btn-saas-config-toggle')?.addEventListener('click', () => {
    playClick();
    sh.showFounderConfig = !sh.showFounderConfig;
    rerender();
  });

  document.getElementById('saas-founder-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    playCorrect();
    updateState(s => {
      s.subscription = {
        ...(s.subscription || {}),
        checkoutProUrl: (document.getElementById('cfg-url-pro')?.value || '').trim(),
        checkoutFounderUrl: (document.getElementById('cfg-url-founder')?.value || '').trim(),
        checkoutTeamUrl: (document.getElementById('cfg-url-team')?.value || '').trim()
      };
    });
    sh.showFounderConfig = false;
    showToast('Links de checkout salvos!');
    rerender();
  });

  root.querySelectorAll('[data-saas-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      const planId = btn.dataset.saasPick;
      const sub = getSub();
      const checkoutUrl =
        planId === 'pro_annual' ? sub.checkoutProUrl :
        planId === 'founder' ? sub.checkoutFounderUrl :
        planId === 'team' ? sub.checkoutTeamUrl : '';

      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank', 'noopener');
        return;
      }
      playVictory();
      updateState(s => {
        s.subscription = { ...(s.subscription || {}), plan: planId };
      });
      const planName = PLANS.find(p => p.id === planId)?.name || planId;
      showToast(`Modo ${planName} ativado! Configure um link real de checkout em "Configurar Checkout" quando for vender.`);
      rerender();
    });
  });

  refreshIcons();
}

export function bindTeamsEvents(root, rerender, showToast) {
  document.getElementById('team-add-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('team-new-name')?.value || '').trim();
    const role = (document.getElementById('team-new-role')?.value || 'Aluno').trim();
    const cefr = document.getElementById('team-new-cefr')?.value || 'A2';
    if (!name) return;
    const scoreMap = { A1: 15, A2: 30, B1: 50, B2: 72, C1: 90 };
    playCorrect();
    updateState(s => {
      const base = Array.isArray(s.teamRoster) ? [...s.teamRoster] : [...DEMO_TEAM];
      base.unshift({
        id: 'tm-' + Date.now(),
        name,
        role,
        cefr,
        score: scoreMap[cefr] || 30,
        totalSec: 0,
        words: 0,
        learned: 0,
        streak: 1,
        lessons: 0,
        songs: 0
      });
      s.teamRoster = base;
    });
    showToast(`${name} adicionado(a) à turma!`);
    rerender();
  });

  document.getElementById('team-import-json')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const wordsArr = Object.values(data.lexicon || {});
      const learned = wordsArr.filter(w => {
        const st = computeWordStatus(w);
        return st === 'learned' || st === 'mastered';
      }).length;
      const totalSec = data.totalStudySeconds || 0;
      const lessons = (data.completedLessons || []).length;
      const songs = (data.songsCompleted || []).length;
      const name = data.profile?.name || file.name.replace(/\.json$/i, '');
      const role = data.profile?.goal?.slice(0, 32) || 'Aluno Importado';
      const cefr = data.profile?.startLevel || 'A2';
      const score = Math.min(100, Math.round(20 + (wordsArr.length / 40) + (lessons * 1.5)));

      playVictory();
      updateState(s => {
        const base = Array.isArray(s.teamRoster) ? [...s.teamRoster] : [...DEMO_TEAM];
        base.unshift({
          id: 'imp-' + Date.now(),
          name,
          role,
          cefr,
          score,
          totalSec,
          words: wordsArr.length,
          learned,
          streak: data.streak || 1,
          lessons,
          songs
        });
        s.teamRoster = base;
      });
      showToast(`Relatório de ${name} importado com sucesso!`);
      rerender();
    } catch (_) {
      showToast('Arquivo JSON inválido.');
    }
  });

  root.querySelectorAll('[data-team-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick();
      const id = btn.dataset.teamDel;
      updateState(s => {
        const base = Array.isArray(s.teamRoster) ? s.teamRoster : [...DEMO_TEAM];
        s.teamRoster = base.filter(m => m.id !== id);
      });
      rerender();
    });
  });

  document.getElementById('btn-team-export-csv')?.addEventListener('click', () => {
    playClick();
    const rows = getTeamMembers();
    const header = 'nome,cargo_turma,nivel_cefr,minutos_ingles,palavras_vistas,palavras_aprendidas,sequencia_dias,licoes,musicas';
    const lines = rows.map(m => [
      `"${String(m.name).replace(/"/g, '""')}"`,
      `"${String(m.role || '').replace(/"/g, '""')}"`,
      m.cefr,
      Math.round((m.totalSec || 0) / 60),
      m.words || 0,
      m.learned || 0,
      m.streak || 0,
      m.lessons || 0,
      m.songs || 0
    ].join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fluencyforge-equipe-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    showToast(`Relatório executivo CSV exportado (${rows.length} membros)!`);
  });

  refreshIcons();
}
