// ============================================================
// REFERENCE ARSENAL UTILS — tests/reference-arsenal-utils.test.ts
// Source: src/reference-arsenal.utils.ts
//
// CLASSIFICATION:
//   compositeScore() — Pure calculation → Unit test
//   powerDisplay()   — Pure calculation using SOURCE_TYPES → Unit test
//
// IMPORTS:
//   import type { ArsenalReference } from './reference-arsenal.types.ts' — type-only
//   { SOURCE_TYPES }              from './reference-arsenal.constants.ts' — used in powerDisplay
//
// SOURCE_TYPES is a pure constant — no mocking needed, use real import.
// ============================================================

import { describe, it, expect } from 'vitest';
import { compositeScore, powerDisplay } from '../src/reference-arsenal.utils.ts';

// ── compositeScore ────────────────────────────────────────────

describe('TC1 — compositeScore: (seconds * 2) + strikes', () => {
  it('returns seconds*2 + strikes', () => {
    const ref = { seconds: 3, strikes: 2 } as Parameters<typeof compositeScore>[0];
    expect(compositeScore(ref)).toBe(8);
  });
});

describe('TC2 — compositeScore: zero values returns 0', () => {
  it('returns 0 for all-zero ref', () => {
    const ref = { seconds: 0, strikes: 0 } as Parameters<typeof compositeScore>[0];
    expect(compositeScore(ref)).toBe(0);
  });
});

describe('TC3 — compositeScore: seconds weighted double vs strikes', () => {
  it('1 second contributes more than 1 strike', () => {
    const withSecond = { seconds: 1, strikes: 0 } as Parameters<typeof compositeScore>[0];
    const withStrike = { seconds: 0, strikes: 1 } as Parameters<typeof compositeScore>[0];
    expect(compositeScore(withSecond)).toBeGreaterThan(compositeScore(withStrike));
  });
});

// ── powerDisplay ──────────────────────────────────────────────

describe('TC4 — powerDisplay: known source type uses ceiling from SOURCE_TYPES', () => {
  it('primary source uses ceiling 5 in denominator', () => {
    const ref = {
      current_power: 3,
      source_type: 'primary',
      graduated: false,
    } as Parameters<typeof powerDisplay>[0];
    expect(powerDisplay(ref)).toBe('3/5');
  });
});

describe('TC5 — powerDisplay: graduated adds 1 to ceiling', () => {
  it('adds 1 to ceiling when graduated is true', () => {
    const ref = {
      current_power: 2,
      source_type: 'academic',
      graduated: true,
    } as Parameters<typeof powerDisplay>[0];
    // academic ceiling is 4, graduated +1 = 5
    expect(powerDisplay(ref)).toBe('2/5');
  });
});

describe('TC6 — powerDisplay: unknown source type falls back to ceiling 1', () => {
  it('uses ceiling 1 for unrecognized source_type', () => {
    const ref = {
      current_power: 1,
      source_type: 'unknown_type',
      graduated: false,
    } as Parameters<typeof powerDisplay>[0];
    expect(powerDisplay(ref)).toBe('1/1');
  });
});

describe('TC7 — powerDisplay: current_power cast with Number()', () => {
  it('casts current_power numerically', () => {
    const ref = {
      current_power: 4 as unknown,
      source_type: 'book',
      graduated: false,
    } as Parameters<typeof powerDisplay>[0];
    const result = powerDisplay(ref);
    expect(result).toMatch(/^\d+\/\d+$/);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/reference-arsenal.utils.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './reference-arsenal.types.ts',
      './reference-arsenal.constants.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/reference-arsenal.utils.ts'),
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
