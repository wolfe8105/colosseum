// ============================================================
// GK — F-14 ELO AND TIER SYSTEM — tests/gk-tiers.test.ts
// Source: src/tiers.ts
//
// SPEC MISMATCH NOTE: docs/product/F-14-role-hierarchy.md describes
// the group role hierarchy (src/pages/groups.ts) — no testable
// claims from that spec apply to src/tiers.ts. Authoritative spec
// data for src/tiers.ts is derived from:
//   docs/product/F-09-token-staking.md (directly names tiers.ts)
//   docs/product/THE-MODERATOR-FEATURE-SPECS-PENDING.md §staking table
//     lines 346-353: "Client mirror src/tiers.ts TIER_THRESHOLDS must
//     stay in sync — LM-172 governs the dual-update rule."
//
// CLASSIFICATION (all pure — no RPCs, no DOM):
//   TIER_THRESHOLDS   — Constant data: value test, no mocks
//   getTier()         — Pure lookup: no mocks
//   canStake()        — Pure calculation: no mocks
//   getPowerUpSlots() — Pure calculation: no mocks
//   getNextTier()     — Pure calculation: no mocks
//   renderTierBadge() — HTML string builder: mock escapeHTML
//   renderTierProgress() — HTML string builder: mock escapeHTML
//
// ALLOWED IMPORTS: ['./config.ts']
// REGRESSION SURFACE: tests/tiers.test.ts
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

import {
  getTier,
  canStake,
  getNextTier,
  renderTierBadge,
  renderTierProgress,
  TIER_THRESHOLDS,
} from '../src/tiers.ts';

beforeEach(() => {
  mockEscapeHTML.mockReset();
  mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
});

// ── TC1: 0Q → Unranked (tier 0) ──────────────────────────────

describe('TC1 — 0 questions answered returns Unranked tier 0', () => {
  it('getTier(0) has name "Unranked" and tier 0', () => {
    const t = getTier(0);
    expect(t.name).toBe('Unranked');
    expect(t.tier).toBe(0);
  });
});

// ── TC2: 9Q → Unranked (below 10Q Spectator+ threshold) ──────

describe('TC2 — 9 questions is still Unranked (LM-172: Spectator+ threshold is 10)', () => {
  it('getTier(9) has name "Unranked" — boundary one below Spectator+', () => {
    const t = getTier(9);
    expect(t.name).toBe('Unranked');
    expect(t.tier).toBe(0);
  });
});

// ── TC3: 10Q → Spectator+ (LM-172 breakpoint) ────────────────

describe('TC3 — exactly 10 questions returns Spectator+ (LM-172 breakpoint)', () => {
  it('getTier(10) has name "Spectator+" and tier 1', () => {
    const t = getTier(10);
    expect(t.name).toBe('Spectator+');
    expect(t.tier).toBe(1);
  });
});

// ── TC4: 24Q → Spectator+ (below 25Q Contender threshold) ────

describe('TC4 — 24 questions is still Spectator+ (LM-172: Contender threshold is 25)', () => {
  it('getTier(24) has name "Spectator+" — boundary one below Contender', () => {
    const t = getTier(24);
    expect(t.name).toBe('Spectator+');
    expect(t.tier).toBe(1);
  });
});

// ── TC5: 25Q → Contender (LM-172 breakpoint) ─────────────────

describe('TC5 — exactly 25 questions returns Contender (LM-172 breakpoint)', () => {
  it('getTier(25) has name "Contender" and tier 2', () => {
    const t = getTier(25);
    expect(t.name).toBe('Contender');
    expect(t.tier).toBe(2);
  });
});

// ── TC6: 50Q → Gladiator (LM-172 breakpoint) ─────────────────

describe('TC6 — exactly 50 questions returns Gladiator (LM-172 breakpoint)', () => {
  it('getTier(50) has name "Gladiator" and tier 3', () => {
    const t = getTier(50);
    expect(t.name).toBe('Gladiator');
    expect(t.tier).toBe(3);
  });
});

// ── TC7: 75Q → Champion (LM-172 breakpoint) ──────────────────

describe('TC7 — exactly 75 questions returns Champion (LM-172 breakpoint)', () => {
  it('getTier(75) has name "Champion" and tier 4', () => {
    const t = getTier(75);
    expect(t.name).toBe('Champion');
    expect(t.tier).toBe(4);
  });
});

// ── TC8: 100Q → Legend (LM-172 breakpoint) ───────────────────

describe('TC8 — exactly 100 questions returns Legend (LM-172 breakpoint)', () => {
  it('getTier(100) has name "Legend" and tier 5', () => {
    const t = getTier(100);
    expect(t.name).toBe('Legend');
    expect(t.tier).toBe(5);
  });
});

// ── TC9: Unranked maxStake = 0 (locked) ──────────────────────

describe('TC9 — Unranked maxStake is 0 (locked, cannot stake)', () => {
  it('getTier(0).maxStake is 0', () => {
    expect(getTier(0).maxStake).toBe(0);
  });
});

// ── TC10: Spectator+ maxStake = 5 ────────────────────────────

describe('TC10 — Spectator+ maxStake is 5 (spec: 10-24Q, max 5)', () => {
  it('getTier(10).maxStake is 5', () => {
    expect(getTier(10).maxStake).toBe(5);
  });
});

// ── TC11: Contender maxStake = 25 ────────────────────────────

describe('TC11 — Contender maxStake is 25 (spec: 25-49Q, max 25)', () => {
  it('getTier(25).maxStake is 25', () => {
    expect(getTier(25).maxStake).toBe(25);
  });
});

// ── TC12: Gladiator maxStake = 50 ────────────────────────────

describe('TC12 — Gladiator maxStake is 50 (spec: 50-74Q, max 50)', () => {
  it('getTier(50).maxStake is 50', () => {
    expect(getTier(50).maxStake).toBe(50);
  });
});

// ── TC13: Champion maxStake = 100 ────────────────────────────

describe('TC13 — Champion maxStake is 100 (spec: 75-99Q, max 100)', () => {
  it('getTier(75).maxStake is 100', () => {
    expect(getTier(75).maxStake).toBe(100);
  });
});

// ── TC14: Legend maxStake effective no cap ────────────────────

describe('TC14 — Legend has effective no staking cap (spec: 100+Q, 999999/no-cap)', () => {
  it('getTier(100).maxStake is greater than Champion cap (100)', () => {
    const legendCap = getTier(100).maxStake;
    expect(legendCap).toBeGreaterThan(100);
  });
});

// ── TC15: canStake(0) = false (Unranked locked) ───────────────

describe('TC15 — canStake returns false for Unranked (0Q — locked)', () => {
  it('canStake(0) is false', () => {
    expect(canStake(0)).toBe(false);
  });
});

// ── TC16: canStake(9) = false (still Unranked) ───────────────

describe('TC16 — canStake returns false at 9Q (still Unranked, below LM-172 threshold)', () => {
  it('canStake(9) is false', () => {
    expect(canStake(9)).toBe(false);
  });
});

// ── TC17: canStake(10) = true (Spectator+ unlocked) ──────────

describe('TC17 — canStake returns true at 10Q (Spectator+ — staking unlocked)', () => {
  it('canStake(10) is true', () => {
    expect(canStake(10)).toBe(true);
  });
});

// ── TC18: canStake(100) = true (Legend) ──────────────────────

describe('TC18 — canStake returns true at 100Q (Legend)', () => {
  it('canStake(100) is true', () => {
    expect(canStake(100)).toBe(true);
  });
});

// ── TC19: TIER_THRESHOLDS has exactly 6 entries (tiers 0-5) ──

describe('TC19 — TIER_THRESHOLDS contains exactly 6 tiers (0 through 5)', () => {
  it('has 6 entries covering tier levels 0, 1, 2, 3, 4, 5', () => {
    expect(TIER_THRESHOLDS.length).toBe(6);
    const levels = TIER_THRESHOLDS.map(t => t.tier).sort((a, b) => a - b);
    expect(levels).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

// ── TC20: LM-172 — tier min thresholds are 10/25/50/75/100 ───

describe('TC20 — LM-172: tier thresholds are exactly 10/25/50/75/100 questions', () => {
  it('tiers 1-5 have min values 10, 25, 50, 75, 100 in order', () => {
    const sorted = [...TIER_THRESHOLDS].sort((a, b) => a.tier - b.tier);
    expect(sorted[1].min).toBe(10);  // Spectator+
    expect(sorted[2].min).toBe(25);  // Contender
    expect(sorted[3].min).toBe(50);  // Gladiator
    expect(sorted[4].min).toBe(75);  // Champion
    expect(sorted[5].min).toBe(100); // Legend
  });
});

// ── TC21: getNextTier at Legend = null ───────────────────────

describe('TC21 — getNextTier returns null at Legend (no tier above 5)', () => {
  it('getNextTier(100) is null — Legend is the max tier', () => {
    expect(getNextTier(100)).toBeNull();
  });
});

// ── TC22: getNextTier from 0Q targets Spectator+ at 10Q ──────

describe('TC22 — getNextTier from Unranked (0Q) returns Spectator+ at totalRequired 10', () => {
  it('next tier is Spectator+ requiring 10 total questions', () => {
    const next = getNextTier(0)!;
    expect(next).not.toBeNull();
    expect(next.name).toBe('Spectator+');
    expect(next.totalRequired).toBe(10);
    expect(next.questionsNeeded).toBe(10);
  });
});

// ── TC23: renderTierBadge returns HTML string with escapeHTML ─

describe('TC23 — renderTierBadge returns a non-empty HTML string and uses escapeHTML', () => {
  it('returns string and calls escapeHTML for XSS safety', () => {
    const html = renderTierBadge(50);
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
    expect(mockEscapeHTML).toHaveBeenCalled();
  });
});

// ── TC24: renderTierProgress at Legend shows Max Tier message ─

describe('TC24 — renderTierProgress at 100Q shows Legend max tier message', () => {
  it('output contains "Legend" and "Max Tier"', () => {
    const html = renderTierProgress(100);
    expect(html).toContain('Legend');
    expect(html).toContain('Max Tier');
  });
});

// ── TC25: renderTierProgress below Legend shows progress bar ──

describe('TC25 — renderTierProgress below max tier shows progress bar elements', () => {
  it('output at 0Q contains tier-progress and tier-progress-fill elements', () => {
    const html = renderTierProgress(0);
    expect(html).toContain('tier-progress');
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
