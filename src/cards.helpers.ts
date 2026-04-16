/**
 * THE MODERATOR — Cards Helpers
 *
 * Private drawing helpers for the Canvas card generator.
 * Used only within cards.ts — not part of the public API.
 */

import type { CardSize } from './cards.types.ts';
import { SIZES } from './cards.types.ts';

// ============================================================
// HELPERS
// ============================================================

/** BUG 1 FIX: Allowlist of valid size keys for filename validation */
const VALID_SIZES: ReadonlySet<string> = new Set(Object.keys(SIZES));

/** BUG 2 FIX: Truncate label strings to prevent canvas overflow */
export function truncLabel(str: unknown, max: number): string {
  const s = String(str ?? '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text).split(' ');
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);

  // Max 3 lines, truncate with ellipsis
  if (lines.length > 3) {
    lines.length = 3;
    lines[2] = (lines[2] ?? '').replace(/\s+\S*$/, '') + '…';
  }

  return lines;
}

export function validateSize(size: string | undefined): CardSize {
  return VALID_SIZES.has(size ?? '') ? (size as CardSize) : 'og';
}
