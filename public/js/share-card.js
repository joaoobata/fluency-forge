import { getProfileAnalytics, formatDurationCompact } from './store.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function downloadEvolutionCardPng() {
  const a = getProfileAnalytics();
  const p = a.profile;

  const W = 1200;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Warm Ivory Paper background
  ctx.fillStyle = '#f5f1e8';
  ctx.fillRect(0, 0, W, H);

  // Subtle editorial dot grid
  ctx.fillStyle = 'rgba(28, 25, 23, 0.08)';
  for (let x = 24; x < W; x += 28) {
    for (let y = 24; y < H; y += 28) {
      ctx.beginPath();
      ctx.arc(x, y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Outer card frame with editorial offset shadow
  ctx.fillStyle = '#1c1917';
  roundRect(ctx, 48, 48, W - 88, H - 88, 24);
  ctx.fill();

  ctx.fillStyle = '#fffdf8';
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 3;
  roundRect(ctx, 40, 40, W - 88, H - 88, 24);
  ctx.fill();
  ctx.stroke();

  // Brand top-left
  ctx.fillStyle = '#c2410c';
  roundRect(ctx, 84, 78, 175, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#fffdf8';
  ctx.font = '700 15px monospace';
  ctx.fillText('FLUENCYFORGE', 108, 100);

  // Date top-right
  ctx.fillStyle = '#78716c';
  ctx.font = '600 15px monospace';
  const todayBr = new Date().toLocaleDateString('pt-BR');
  ctx.fillText(`DIÁRIO DE EVOLUÇÃO • ${todayBr}`, 800, 100);

  // Avatar monogram
  const initials = String(p.name || 'EU').trim().split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();
  ctx.fillStyle = p.avatarColor || '#c2410c';
  roundRect(ctx, 84, 138, 86, 86, 18);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(initials, 127, 193);
  ctx.textAlign = 'left';

  // User Name + Goal
  ctx.fillStyle = '#1c1917';
  ctx.font = '800 40px sans-serif';
  ctx.fillText(String(p.name || 'Estudante').slice(0, 26), 192, 176);
  ctx.fillStyle = '#57534e';
  ctx.font = '500 19px sans-serif';
  ctx.fillText(String(p.goal || 'Imersão ativa em inglês').slice(0, 56), 192, 212);

  // CEFR Stamp on right
  ctx.fillStyle = '#fff7ed';
  ctx.strokeStyle = '#c2410c';
  ctx.lineWidth = 3;
  roundRect(ctx, 920, 136, 196, 92, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c2410c';
  ctx.font = '700 13px monospace';
  ctx.fillText('NÍVEL ESTIMADO', 944, 163);
  ctx.font = '800 42px sans-serif';
  ctx.fillText(a.cefr.code, 944, 210);
  ctx.fillStyle = '#78716c';
  ctx.font = '600 15px monospace';
  ctx.fillText(`${a.overallScore}/100`, 1028, 206);

  // 4 Big KPI boxes
  const kpis = [
    { label: 'HORAS DE INGLÊS', val: formatDurationCompact(a.totalSec), sub: `Meta: ${a.nextHoursTarget}h`, accent: '#c2410c' },
    { label: 'PALAVRAS VISTAS', val: String(a.lx.totalUnique), sub: `${a.lx.knownTotal} aprendidas`, accent: '#15803d' },
    { label: 'SEQUÊNCIA ATIVA', val: `${a.streak} dias`, sub: `${a.activeDays} dia(s) ativo(s)`, accent: '#1d4ed8' },
    { label: 'PRÁTICAS FEITAS', val: String(a.lessonsDone + a.drillsDone + a.readingsDone + a.songsDone), sub: `${a.songsDone} músicas • ${a.lessonsDone} lições`, accent: '#1c1917' }
  ];

  kpis.forEach((k, idx) => {
    const x = 84 + idx * 262;
    const y = 262;
    ctx.fillStyle = '#f5f1e8';
    ctx.strokeStyle = '#d6cfc2';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, 244, 128, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#78716c';
    ctx.font = '700 12px monospace';
    ctx.fillText(k.label, x + 18, y + 30);

    ctx.fillStyle = k.accent;
    ctx.font = '800 36px sans-serif';
    ctx.fillText(k.val, x + 18, y + 78);

    ctx.fillStyle = '#57534e';
    ctx.font = '500 14px sans-serif';
    ctx.fillText(k.sub, x + 18, y + 108);
  });

  // 5 Skill bars at bottom
  const skillList = [
    ['Vocabulário', a.skills.vocab],
    ['Estrutura', a.skills.grammar],
    ['Escuta', a.skills.listening],
    ['Leitura', a.skills.reading],
    ['Fala Ativa', a.skills.speaking]
  ];
  skillList.forEach(([lbl, val], i) => {
    const x = 84 + i * 210;
    const y = 434;
    ctx.fillStyle = '#1c1917';
    ctx.font = '700 14px sans-serif';
    ctx.fillText(`${lbl} (${val}%)`, x, y);
    ctx.fillStyle = '#e7e0d3';
    roundRect(ctx, x, y + 12, 186, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#c2410c';
    roundRect(ctx, x, y + 12, Math.max(12, Math.round((val / 100) * 186)), 12, 6);
    ctx.fill();
  });

  // Footer
  ctx.fillStyle = '#78716c';
  ctx.font = '600 15px monospace';
  ctx.fillText('fluency-forge-silk.vercel.app  •  Estúdio de Imersão Ativa em Inglês', 84, 540);

  const link = document.createElement('a');
  link.download = `fluencyforge-evolucao-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function buildEvolutionShareText() {
  const a = getProfileAnalytics();
  return [
    `Minha evolução no inglês com FluencyForge:`,
    `• Nível estimado: ${a.cefr.code} (${a.overallScore}/100)`,
    `• Tempo de imersão: ${formatDurationCompact(a.totalSec)}`,
    `• Banco de Palavras: ${a.lx.totalUnique} palavras vistas (${a.lx.knownTotal} aprendidas)`,
    `• Sequência: ${a.streak} dia(s)`,
    `Treine grátis em https://fluency-forge-silk.vercel.app`
  ].join('\n');
}
