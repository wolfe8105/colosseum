// ============================================================
// CARDS HELPERS — tests/cards-helpers.test.ts
// Source: src/cards.helpers.ts
//
// CLASSIFICATION:
//   truncLabel()   — Pure calculation → Unit test
//   roundRect()    — Behavioral: calls canvas CanvasRenderingContext2D methods → Behavioral test
//   wrapText()     — Behavioral: calls ctx.measureText → Behavioral test (mock ctx)
//   validateSize() — Behavioral: uses VALID_SIZES derived from SIZES import → Unit test
//
// IMPORTS:
//   import type { CardSize } from './cards.types.ts' — type-only
//   { SIZES }               from './cards.types.ts'  — used to derive VALID_SIZES
//
// SIZES is a pure constant — use real import rather than mock.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { truncLabel, roundRect, wrapText, validateSize } from '../src/cards.helpers.ts';

// ── truncLabel ────────────────────────────────────────────────

describe('TC1 — truncLabel: short string passes through unchanged', () => {
  it('returns string unchanged when under max', () => {
    expect(truncLabel('Hello', 10)).toBe('Hello');
  });
});

describe('TC2 — truncLabel: long string is truncated with ellipsis', () => {
  it('truncates to max-1 chars + ellipsis', () => {
    const result = truncLabel('Hello World', 5);
    expect(result).toHaveLength(5);
    expect(result.endsWith('…')).toBe(true);
  });
});

describe('TC3 — truncLabel: exactly at max passes through', () => {
  it('does not truncate when length equals max', () => {
    expect(truncLabel('Hello', 5)).toBe('Hello');
  });
});

describe('TC4 — truncLabel: non-string input is coerced to string', () => {
  it('handles numbers and null', () => {
    expect(truncLabel(42, 10)).toBe('42');
    expect(truncLabel(null, 10)).toBe('');
    expect(truncLabel(undefined, 10)).toBe('');
  });
});

// ── roundRect ─────────────────────────────────────────────────

describe('TC5 — roundRect: calls moveTo, lineTo, arcTo, closePath', () => {
  it('calls the correct canvas path methods', () => {
    const ctx = {
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    roundRect(ctx, 0, 0, 100, 50, 8);

    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.arcTo).toHaveBeenCalled();
    expect(ctx.closePath).toHaveBeenCalled();
  });
});

describe('TC6 — roundRect: calls arcTo exactly 4 times (one per corner)', () => {
  it('calls arcTo 4 times for 4 rounded corners', () => {
    const ctx = {
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    roundRect(ctx, 10, 10, 80, 40, 5);

    expect(ctx.arcTo).toHaveBeenCalledTimes(4);
  });
});

// ── wrapText ─────────────────────────────────────────────────

describe('TC7 — wrapText: short text fits in one line', () => {
  it('returns a single-element array for short text', () => {
    const ctx = {
      measureText: vi.fn((s: string) => ({ width: s.length * 5 })),
    } as unknown as CanvasRenderingContext2D;

    const lines = wrapText(ctx, 'Hello', 200);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('Hello');
  });
});

describe('TC8 — wrapText: long text wraps to multiple lines', () => {
  it('splits text that exceeds maxWidth', () => {
    const ctx = {
      // each character is 10px wide → "Hello World" = 110px
      measureText: vi.fn((s: string) => ({ width: s.length * 10 })),
    } as unknown as CanvasRenderingContext2D;

    const lines = wrapText(ctx, 'Hello World Foo Bar', 50);
    expect(lines.length).toBeGreaterThan(1);
  });
});

describe('TC9 — wrapText: caps at 3 lines with ellipsis on last', () => {
  it('never returns more than 3 lines', () => {
    const ctx = {
      // very narrow width forces each word to its own line
      measureText: vi.fn((s: string) => ({ width: s.length * 20 })),
    } as unknown as CanvasRenderingContext2D;

    const lines = wrapText(ctx, 'one two three four five six', 30);
    expect(lines.length).toBeLessThanOrEqual(3);
    if (lines.length === 3) {
      expect(lines[2]).toContain('…');
    }
  });
});

describe('TC10 — wrapText: calls ctx.measureText (import contract)', () => {
  it('measureText is invoked during wrap calculation', () => {
    const ctx = {
      measureText: vi.fn(() => ({ width: 10 })),
    } as unknown as CanvasRenderingContext2D;

    wrapText(ctx, 'test text', 100);

    expect(ctx.measureText).toHaveBeenCalled();
  });
});

// ── validateSize ──────────────────────────────────────────────

describe('TC11 — validateSize: valid sizes pass through', () => {
  it('returns "og" for input "og"', () => {
    expect(validateSize('og')).toBe('og');
  });
  it('returns "story" for input "story"', () => {
    expect(validateSize('story')).toBe('story');
  });
  it('returns "twitter" for input "twitter"', () => {
    expect(validateSize('twitter')).toBe('twitter');
  });
  it('returns "square" for input "square"', () => {
    expect(validateSize('square')).toBe('square');
  });
});

describe('TC12 — validateSize: unknown size falls back to "og"', () => {
  it('returns "og" for unrecognized size', () => {
    expect(validateSize('giant')).toBe('og');
    expect(validateSize(undefined)).toBe('og');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/cards.helpers.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./cards.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/cards.helpers.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
