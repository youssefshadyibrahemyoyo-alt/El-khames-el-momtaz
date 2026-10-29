import type { GameweekHighlights, LeaguePlayer } from '../types/league';

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function deliverCanvasPng(canvas: HTMLCanvasElement, filename: string, shareTitle: string) {
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;

  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
  };

  if (typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    try {
      if (nav.canShare({ files: [file] })) {
        await nav.share({
          title: shareTitle,
          text: shareTitle,
          files: [file],
        });
        return;
      }
    } catch {
      // User dismissed share sheet or share failed — fall back to clean download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function paintStadiumBackdrop(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  badgeText: string,
  headline: string,
  subline: string
) {
  // Deep stadium night gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#071710');
  bg.addColorStop(0.5, '#0f3121');
  bg.addColorStop(1, '#081a12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Floodlight beams
  const leftBeam = ctx.createRadialGradient(120, 60, 10, 120, 60, 520);
  leftBeam.addColorStop(0, 'rgba(244, 218, 138, 0.22)');
  leftBeam.addColorStop(1, 'rgba(244, 218, 138, 0)');
  ctx.fillStyle = leftBeam;
  ctx.fillRect(0, 0, W, H);

  const rightBeam = ctx.createRadialGradient(W - 120, 60, 10, W - 120, 60, 520);
  rightBeam.addColorStop(0, 'rgba(98, 224, 152, 0.18)');
  rightBeam.addColorStop(1, 'rgba(98, 224, 152, 0)');
  ctx.fillStyle = rightBeam;
  ctx.fillRect(0, 0, W, H);

  // Outer gold frame
  ctx.strokeStyle = 'rgba(236, 205, 120, 0.42)';
  ctx.lineWidth = 3;
  drawRoundRect(ctx, 28, 28, W - 56, H - 56, 32);
  ctx.stroke();

  // Brand pill
  ctx.fillStyle = 'rgba(236, 205, 120, 0.16)';
  drawRoundRect(ctx, 64, 62, 340, 44, 22);
  ctx.fill();
  ctx.fillStyle = '#f3da8a';
  ctx.font = '700 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(`⚽ EL KHAMES EL MOMTAZ · ${badgeText}`, 84, 91);

  // Headline
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 52px system-ui, -apple-system, sans-serif';
  ctx.fillText(headline, 64, 168);

  // Subline
  ctx.fillStyle = '#a9cbb6';
  ctx.font = '600 25px system-ui, -apple-system, sans-serif';
  ctx.fillText(subline, 64, 210);
}

export async function shareOrDownloadSquadCard(params: {
  managerName: string;
  teamName?: string | null;
  gameweekNumber: number;
  selectedCost: number;
  managerBudget: number;
  activeChip: string | null;
  starters: LeaguePlayer[];
  bench: LeaguePlayer[];
  captainId: string;
  viceCaptainId: string;
}): Promise<void> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const clubTitle = params.teamName?.trim() || `${params.managerName}'s XI`;
  const sub = [
    `Manager: ${params.managerName}`,
    `Value: £${params.selectedCost.toFixed(1)}m / £${params.managerBudget.toFixed(1)}m`,
    params.activeChip ? `Chip: ${params.activeChip}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  paintStadiumBackdrop(ctx, W, H, `GW #${params.gameweekNumber}`, clubTitle, sub);

  // 3D Pitch container
  const px = 64;
  const py = 250;
  const pw = W - 128;
  const ph = 720;
  const turf = ctx.createLinearGradient(px, py, px, py + ph);
  turf.addColorStop(0, '#185838');
  turf.addColorStop(0.5, '#1e6b45');
  turf.addColorStop(1, '#14492f');
  ctx.fillStyle = turf;
  drawRoundRect(ctx, px, py, pw, ph, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Halfway line & center circle
  ctx.beginPath();
  ctx.moveTo(px + 30, py + ph / 2);
  ctx.lineTo(px + pw - 30, py + ph / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px + pw / 2, py + ph / 2, 85, 0, Math.PI * 2);
  ctx.stroke();

  // Draw Starting 5 in 2-1-2 formation on pitch
  const positions = [
    { x: px + pw * 0.3, y: py + 165 },
    { x: px + pw * 0.7, y: py + 165 },
    { x: px + pw * 0.5, y: py + 365 },
    { x: px + pw * 0.28, y: py + 565 },
    { x: px + pw * 0.72, y: py + 565 },
  ];

  params.starters.slice(0, 5).forEach((p, idx) => {
    const pos = positions[idx];
    const isCap = p.id === params.captainId;
    const isVc = p.id === params.viceCaptainId;
    const cw = 230;
    const ch = 152;
    const cx = pos.x - cw / 2;
    const cy = pos.y - ch / 2;

    ctx.fillStyle = isCap ? 'rgba(44, 35, 11, 0.92)' : 'rgba(10, 32, 21, 0.9)';
    drawRoundRect(ctx, cx, cy, cw, ch, 20);
    ctx.fill();
    ctx.strokeStyle = isCap ? '#f4da86' : isVc ? '#cfe0d6' : 'rgba(130, 218, 168, 0.55)';
    ctx.lineWidth = isCap ? 3.5 : 2;
    ctx.stroke();

    // Jersey / Initial circle
    ctx.beginPath();
    ctx.arc(pos.x, cy + 48, 28, 0, Math.PI * 2);
    ctx.fillStyle = isCap ? '#eccd74' : '#246644';
    ctx.fill();

    ctx.fillStyle = isCap ? '#102419' : '#ffffff';
    ctx.font = '800 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      p.kit_number != null ? `#${p.kit_number}` : p.name.slice(0, 1).toUpperCase(),
      pos.x,
      cy + 56
    );

    if (isCap || isVc) {
      ctx.fillStyle = isCap ? '#f5de8e' : '#d8e6df';
      drawRoundRect(ctx, cx + cw - 58, cy + 10, 48, 28, 14);
      ctx.fill();
      ctx.fillStyle = '#0f2419';
      ctx.font = '900 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        isCap ? (params.activeChip === 'Triple Captain' ? '3×C' : 'C') : 'VC',
        cx + cw - 34,
        cy + 30
      );
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(p.name.slice(0, 14), pos.x, cy + 106);

    ctx.fillStyle = '#f2d98b';
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(`£${p.price.toFixed(1)}m · ${p.points} pts`, pos.x, cy + 134);
  });

  // Bench Strip
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f3da8a';
  ctx.font = '700 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('SUBSTITUTES BENCH', 64, 1022);

  params.bench.slice(0, 2).forEach((p, idx) => {
    const bx = 64 + idx * 486;
    const by = 1044;
    const bw = 466;
    const bh = 132;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    drawRoundRect(ctx, bx, by, bw, bh, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(236, 205, 120, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f3da8a';
    ctx.font = '800 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(`SUB ${idx + 1}`, bx + 24, by + 48);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `${p.kit_number != null ? `#${p.kit_number} ` : ''}${p.name}`,
      bx + 24,
      by + 88
    );

    ctx.fillStyle = '#a9cbb6';
    ctx.font = '600 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(`£${p.price.toFixed(1)}m · ${p.points} pts`, bx + 24, by + 116);
  });

  // Footer URL
  ctx.fillStyle = '#8eb59d';
  ctx.font = '600 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('elkhameselmomtaz.vercel.app  ·  Thursday Night Fantasy League', 64, 1272);

  await deliverCanvasPng(
    canvas,
    `el-khames-gw${params.gameweekNumber}-squad.png`,
    `${clubTitle} · GW #${params.gameweekNumber}`
  );
}

export async function shareOrDownloadHighlightsCard(
  highlights: GameweekHighlights
): Promise<void> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const gwNum = highlights.gameweek_number ?? 1;
  paintStadiumBackdrop(
    ctx,
    W,
    H,
    `GW #${gwNum} RECAP`,
    `Gameweek #${gwNum} Team of the Week`,
    'Dream V Ballers & Thursday Night Trophies'
  );

  // TOTW 5 rows
  const totw = highlights.team_of_the_week ?? [];
  totw.slice(0, 5).forEach((p, idx) => {
    const ry = 252 + idx * 106;
    ctx.fillStyle = idx === 0 ? 'rgba(244, 218, 138, 0.16)' : 'rgba(255,255,255,0.06)';
    drawRoundRect(ctx, 64, ry, W - 128, 92, 18);
    ctx.fill();
    ctx.strokeStyle = idx === 0 ? '#f3da8a' : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f3da8a';
    ctx.font = '800 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(idx === 0 ? '👑 #1' : `#${idx + 1}`, 92, ry + 56);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `${p.kit_number != null ? `#${p.kit_number} ` : ''}${p.display_name}`,
      190,
      ry + 56
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = '#8ef0b8';
    ctx.font = '800 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${p.points} pts`, W - 92, ry + 56);
    ctx.textAlign = 'left';
  });

  // Awards 2x2 grid
  const awardBoxes = [
    {
      tag: '👑 KING OF THURSDAY',
      title:
        highlights.awards?.gw_champion?.team_name ||
        highlights.awards?.gw_champion?.display_name ||
        '—',
      sub: highlights.awards?.gw_champion
        ? `${highlights.awards.gw_champion.display_name} · ${highlights.awards.gw_champion.points} pts`
        : '—',
    },
    {
      tag: '⚽ GOLDEN BOOT',
      title: highlights.awards?.golden_boot?.display_name || '—',
      sub: highlights.awards?.golden_boot
        ? `${highlights.awards.golden_boot.goals} Goals scored`
        : '—',
    },
    {
      tag: '🧠 CAPTAIN MASTERCLASS',
      title: highlights.awards?.captain_genius?.display_name || '—',
      sub: highlights.awards?.captain_genius
        ? `Captained ${highlights.awards.captain_genius.player_name} (+${highlights.awards.captain_genius.captain_points} pts)`
        : '—',
    },
    {
      tag: '😭 BENCH PAIN AWARD',
      title: highlights.awards?.bench_pain?.display_name || '—',
      sub: highlights.awards?.bench_pain
        ? `${highlights.awards.bench_pain.bench_points} pts left on bench`
        : 'Zero bench regrets!',
    },
  ];

  awardBoxes.forEach((b, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const bx = 64 + col * 486;
    const by = 815 + row * 196;
    ctx.fillStyle = 'rgba(12, 36, 24, 0.92)';
    drawRoundRect(ctx, bx, by, 466, 176, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(236, 205, 120, 0.38)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f3da8a';
    ctx.font = '800 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(b.tag, bx + 24, by + 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(b.title.slice(0, 22), bx + 24, by + 94);

    ctx.fillStyle = '#b4d3c0';
    ctx.font = '600 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(b.sub.slice(0, 34), bx + 24, by + 136);
  });

  ctx.fillStyle = '#8eb59d';
  ctx.font = '600 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('elkhameselmomtaz.vercel.app  ·  El Khames El Momtaz', 64, 1272);

  await deliverCanvasPng(
    canvas,
    `el-khames-gw${gwNum}-recap.png`,
    `El Khames El Momtaz · GW #${gwNum} Recap`
  );
}

export function openWhatsAppShare(message: string) {
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
}
