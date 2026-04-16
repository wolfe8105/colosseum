/**
 * THE MODERATOR — Cards Module (TypeScript)
 *
 * Typed mirror of moderator-cards.js. ESPN-style debate result cards
 * with watermark branding. Generates images in 4 sizes for sharing.
 *
 * Source of truth for runtime: moderator-cards.js (until Phase 4 cutover)
 * Source of truth for types: this file
 *
 * Migration: Session 127 (Phase 3)
 */

import type { CardSize, CardDimensions, GenerateCardOptions } from './cards.types.ts';
import { SIZES, COLORS, CANVAS_FONT } from './cards.types.ts';
import { truncLabel, roundRect, wrapText, validateSize } from './cards.helpers.ts';

// Re-export types to preserve existing import paths
export type { CardSize, CardDimensions, GenerateCardOptions } from './cards.types.ts';
export { SIZES } from './cards.types.ts';

// ============================================================
// CARD GENERATION
// ============================================================

export function generateCard(opts: GenerateCardOptions): HTMLCanvasElement {
  const sizeKey = validateSize(opts.size);
  const size = SIZES[sizeKey];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d')!;

  const W = size.w;
  const H = size.h;
  const isVertical = H > W;
  const scale = W / 1200;

  const sideA = truncLabel(opts.sideA || 'Side A', 30);
  const sideB = truncLabel(opts.sideB || 'Side B', 30);

  // --- Background gradient ---
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1a2d4a');
  grad.addColorStop(0.3, '#2d5a8e');
  grad.addColorStop(0.6, '#5b8abf');
  grad.addColorStop(0.85, '#3d5a80');
  grad.addColorStop(1, '#1a2d4a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // --- Subtle radial overlay ---
  const rGrad = ctx.createRadialGradient(W * 0.3, H * 0.3, 0, W * 0.3, H * 0.3, W * 0.7);
  rGrad.addColorStop(0, 'rgba(212, 168, 67, 0.06)');
  rGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = rGrad;
  ctx.fillRect(0, 0, W, H);

  // --- Glass card ---
  const pad = isVertical ? 60 * scale : 40 * scale;
  const cardX = pad;
  const cardY = isVertical ? H * 0.15 : pad + 20 * scale;
  const cardW = W - pad * 2;
  const cardH = isVertical ? H * 0.6 : H - pad * 2 - 60 * scale;
  const radius = 24 * scale;

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, cardX, cardY, cardW, cardH, radius);
  ctx.fillStyle = 'rgba(10, 17, 40, 0.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2 * scale;
  ctx.stroke();
  ctx.restore();

  // --- Branding top ---
  const brandY = cardY + 36 * scale;
  ctx.fillStyle = COLORS.goldDim;
  ctx.font = `400 ${12 * scale}px ${CANVAS_FONT}`;
  ctx.textAlign = 'center';
  (ctx as unknown as Record<string, string>)['letterSpacing'] = `${4 * scale}px`;
  ctx.fillText('THE', W / 2, brandY);
  ctx.fillStyle = COLORS.gold;
  ctx.font = `700 ${22 * scale}px ${CANVAS_FONT}`;
  ctx.fillText('MODERATOR', W / 2, brandY + 24 * scale);
  (ctx as unknown as Record<string, string>)['letterSpacing'] = '0px';

  // --- Divider ---
  const divY = brandY + 42 * scale;
  ctx.strokeStyle = 'rgba(212, 168, 67, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + cardW * 0.2, divY);
  ctx.lineTo(cardX + cardW * 0.8, divY);
  ctx.stroke();

  // --- Topic text (wrapped) ---
  const topicY = divY + 32 * scale;
  ctx.fillStyle = COLORS.white;
  ctx.font = `700 ${Math.min(28 * scale, 34)}px ${CANVAS_FONT}`;
  ctx.textAlign = 'center';
  const topicLines = wrapText(ctx, opts.topic || 'Debate Topic', cardW - 60 * scale);
  topicLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, topicY + i * (34 * scale));
  });

  // --- Vote bar ---
  const total = (Number(opts.yesVotes) || 0) + (Number(opts.noVotes) || 0);
  const yesPct = total > 0 ? Math.round(((Number(opts.yesVotes) || 0) / total) * 100) : 50;
  const noPct = 100 - yesPct;

  const barY = topicY + topicLines.length * (34 * scale) + 30 * scale;
  const barH = 40 * scale;
  const barX = cardX + 30 * scale;
  const barW = cardW - 60 * scale;
  const barRadius = 8 * scale;

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, barX, barY, barW, barH, barRadius);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fill();
  ctx.restore();

  const yesW = Math.max((barW * yesPct) / 100, barRadius * 2);
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, barX, barY, yesW, barH, barRadius);
  ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
  ctx.fill();
  ctx.restore();

  ctx.font = `700 ${16 * scale}px ${CANVAS_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.green;
  ctx.fillText(`${yesPct}%`, barX + 12 * scale, barY + barH / 2 + 6 * scale);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.red;
  ctx.fillText(`${noPct}%`, barX + barW - 12 * scale, barY + barH / 2 + 6 * scale);

  // --- Side labels ---
  const labelY = barY + barH + 24 * scale;
  ctx.font = `700 ${16 * scale}px ${CANVAS_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.white;
  ctx.fillText(sideA, barX, labelY);

  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.goldDim;
  ctx.font = `400 ${12 * scale}px ${CANVAS_FONT}`;
  ctx.fillText('VS', W / 2, labelY);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.white;
  ctx.font = `700 ${16 * scale}px ${CANVAS_FONT}`;
  ctx.fillText(sideB, barX + barW, labelY);

  // --- Vote count ---
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.whiteDim;
  ctx.font = `400 ${13 * scale}px ${CANVAS_FONT}`;
  ctx.fillText(`${total.toLocaleString()} votes`, W / 2, labelY + 26 * scale);

  // --- Winner badge ---
  if (yesPct !== noPct) {
    const winner = yesPct > noPct ? sideA : sideB;
    const badgeY = labelY + 50 * scale;
    const badgeW = 180 * scale;
    const badgeH = 32 * scale;

    ctx.save();
    ctx.beginPath();
    roundRect(ctx, W / 2 - badgeW / 2, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fillStyle = 'rgba(212, 168, 67, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 168, 67, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = COLORS.gold;
    ctx.font = `700 ${13 * scale}px ${CANVAS_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`👑 ${winner} LEADS`, W / 2, badgeY + badgeH / 2 + 5 * scale);
  }

  // --- Watermark ---
  const wmY = H - 20 * scale;
  ctx.fillStyle = 'rgba(160, 168, 184, 0.5)';
  ctx.font = `400 ${11 * scale}px ${CANVAS_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('⚔️ Settle YOUR debate → themoderator.app', W / 2, wmY);

  return canvas;
}

export function downloadCard(opts: GenerateCardOptions): void {
  const canvas = generateCard(opts);
  const sizeKey = validateSize(opts.size);
  const link = document.createElement('a');
  link.download = `moderator-debate-${sizeKey}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function shareCard(opts: GenerateCardOptions): Promise<void> {
  const canvas = generateCard(opts);
  try {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('toBlob returned null');
    const file = new File([blob], 'moderator-debate.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: opts.topic || 'Debate Result',
        text: `${truncLabel(opts.topic || 'Debate Result', 200)} — Cast your vote at The Moderator!`,
        files: [file],
      });
      return;
    }
  } catch {
    // Share API failed or canceled — fall through to download
  }
  downloadCard(opts);
}

// ============================================================
// WINDOW GLOBAL BRIDGE (removed in Phase 4)
// ============================================================

export const ModeratorCards = {
  generateCard,
  downloadCard,
  shareCard,
  SIZES,
} as const;
