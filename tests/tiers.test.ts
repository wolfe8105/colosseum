// ============================================================
// TIERS — tests/tiers.test.ts
// Source: src/tiers.ts
//
// CLASSIFICATION:
//   TIER_THRESHOLDS   — Constant data → Value test
//   getTier()         — Pure lookup → Unit test
//   canStake()        — Pure calculation → Unit test
//   getPowerUpSlots() — Pure calculation → Unit test
//   getNextTier()     — Pure calculation → Unit test
//   renderTierBadge() — Pure HTML render → Unit test
//   renderTierProgress() — Pure HTML render → Unit test
//
// IMPORTS:
//   { escapeHTML } from './config.ts'
// ============================================================

import { describe, it, expect, vi } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

import {
  TIER_THRESHOLDS,
  getTier,
  canStake,
  getPowerUpSlots,
  getNextTier,
  renderTierBadge,
  renderTierProgress,
} from '../src/tiers.ts';

// ── TIER_THRESHOLDS ───────────────────────────────────────────

describe('TC1 — TIER_THRESHOLDS: has 6 tiers (0-5)', () => {
  it('contains entries for all 6 tier levels', () => {
    const levels = TIER_THRESHOLDS.map(t => t.tier).sort();
    expect(levels).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('TC2 — TIER_THRESHOLDS: tier 5 has infinite maxStake', () => {
  it('Legend tier has maxStake of Infinity', () => {
    const legend = TIER_THRESHOLDS.find(t => t.tier === 5)!;
    expect(legend.maxStake).toBe(Infinity);
    expect(legend.name).toBe('Legend');
  });
});

// ── getTier ───────────────────────────────────────────────────

describe('TC3 — getTier: 0 questions returns Unranked', () => {
  it('returns tier 0 for 0 questions', () => {
    const t = getTier(0);
    expect(t.tier).toBe(0);
    expect(t.name).toBe('Unranked');
    expect(t.maxStake).toBe(0);
  });
});

describe('TC4 — getTier: non-number input defaults to 0', () => {
  it('returns Unranked when passed NaN', () => {
    const t = getTier(NaN);
    expect(t.tier).toBe(0);
  });
});

describe('TC5 — getTier: 25 questions returns Contender', () => {
  it('returns tier 2 at exactly 25 questions', () => {
    const t = getTier(25);
    expect(t.tier).toBe(2);
    expect(t.name).toBe('Contender');
  });
});

describe('TC6 — getTier: 100 questions returns Legend', () => {
  it('returns tier 5 at exactly 100 questions', () => {
    const t = getTier(100);
    expect(t.tier).toBe(5);
    expect(t.name).toBe('Legend');
  });
});

describe('TC7 — getTier: stakeCap is alias for maxStake', () => {
  it('stakeCap equals maxStake on returned object', () => {
    const t = getTier(50);
    expect(t.stakeCap).toBe(t.maxStake);
  });
});

// ── canStake ──────────────────────────────────────────────────

describe('TC8 — canStake: false for tier 0', () => {
  it('returns false for 0 questions answered', () => {
    expect(canStake(0)).toBe(false);
  });
});

describe('TC9 — canStake: true for tier 1+', () => {
  it('returns true at 10 questions (Spectator+)', () => {
    expect(canStake(10)).toBe(true);
  });
});

// ── getPowerUpSlots ───────────────────────────────────────────

describe('TC10 — getPowerUpSlots: 0 slots for tier 0 and 1', () => {
  it('returns 0 slots for < 25 questions', () => {
    expect(getPowerUpSlots(0)).toBe(0);
    expect(getPowerUpSlots(10)).toBe(0);
  });
});

describe('TC11 — getPowerUpSlots: 4 slots for Legend', () => {
  it('returns 4 slots at 100+ questions', () => {
    expect(getPowerUpSlots(100)).toBe(4);
  });
});

// ── getNextTier ───────────────────────────────────────────────

describe('TC12 — getNextTier: returns null at max tier', () => {
  it('returns null for 100+ questions (Legend)', () => {
    expect(getNextTier(100)).toBeNull();
  });
});

describe('TC13 — getNextTier: shows questions needed for next tier', () => {
  it('returns correct questionsNeeded for tier progression', () => {
    const next = getNextTier(0)!;
    expect(next).not.toBeNull();
    expect(next.questionsNeeded).toBe(10); // need 10 to reach Spectator+
    expect(next.totalRequired).toBe(10);
  });
});

describe('TC14 — getNextTier: minQuestions is alias for totalRequired', () => {
  it('minQuestions equals totalRequired on returned object', () => {
    const next = getNextTier(0)!;
    expect(next.minQuestions).toBe(next.totalRequired);
  });
});

// ── renderTierBadge ───────────────────────────────────────────

describe('TC15 — renderTierBadge: contains tier-badge class', () => {
  it('returns HTML string with class="tier-badge"', () => {
    const html = renderTierBadge(50);
    expect(html).toContain('tier-badge');
    expect(mockEscapeHTML).toHaveBeenCalled();
  });
});

// ── renderTierProgress ────────────────────────────────────────

describe('TC16 — renderTierProgress: Legend shows max tier message', () => {
  it('returns max tier message for 100 questions', () => {
    const html = renderTierProgress(100);
    expect(html).toContain('Legend');
    expect(html).toContain('Max Tier');
  });
});

describe('TC17 — renderTierProgress: shows progress bar for non-max tier', () => {
  it('returns tier-progress div with fill for tier < 5', () => {
    const html = renderTierProgress(0);
    expect(html).toContain('tier-progress-bar');
    expect(html).toContain('tier-progress-fill');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/tiers.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/tiers.ts'),
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
