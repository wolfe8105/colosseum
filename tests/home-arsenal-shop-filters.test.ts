// ============================================================
// HOME ARSENAL SHOP FILTERS — tests/home-arsenal-shop-filters.test.ts
// Source: src/pages/home.arsenal-shop-filters.ts
//
// CLASSIFICATION:
//   applyFilters(): Pure calculation → Unit tests (no mocks needed)
//
// IMPORTS: type-only only — nothing to mock
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { applyFilters } from '../src/pages/home.arsenal-shop-filters.ts';
import type { ModifierEffect } from '../src/modifiers.ts';
import type { ShopState } from '../src/pages/home.arsenal-shop-types.ts';

// ── Helpers ───────────────────────────────────────────────────

function makeEffect(overrides: Partial<ModifierEffect> = {}): ModifierEffect {
  return {
    id: 'e1',
    effect_num: 1,
    name: 'Test Effect',
    description: 'desc',
    category: 'point',
    timing: 'in_debate',
    tier_gate: 'common',
    mod_cost: 100,
    pu_cost: 50,
    ...overrides,
  };
}

function makeState(overrides: Partial<ShopState> = {}): ShopState {
  return {
    catalog: [],
    productType: 'powerup',
    categoryFilter: 'all',
    rarityFilter: 'all',
    timingFilter: 'all',
    affordableOnly: false,
    tokenBalance: 1000,
    ...overrides,
  };
}

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — applyFilters returns all items when all filters are "all"', () => {
  it('returns full catalog when no filters active', () => {
    const effects = [makeEffect({ id: 'e1' }), makeEffect({ id: 'e2' })];
    expect(applyFilters(effects, makeState())).toHaveLength(2);
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — applyFilters filters by category', () => {
  it('returns only items matching categoryFilter', () => {
    const effects = [
      makeEffect({ id: 'e1', category: 'point' }),
      makeEffect({ id: 'e2', category: 'token' }),
    ];
    const result = applyFilters(effects, makeState({ categoryFilter: 'point' }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e1');
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — applyFilters filters by rarity', () => {
  it('returns only items matching rarityFilter', () => {
    const effects = [
      makeEffect({ id: 'e1', tier_gate: 'common' }),
      makeEffect({ id: 'e2', tier_gate: 'legendary' }),
    ];
    const result = applyFilters(effects, makeState({ rarityFilter: 'legendary' }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e2');
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — applyFilters filters by timing', () => {
  it('returns only items matching timingFilter', () => {
    const effects = [
      makeEffect({ id: 'e1', timing: 'in_debate' }),
      makeEffect({ id: 'e2', timing: 'end_of_debate' }),
    ];
    const result = applyFilters(effects, makeState({ timingFilter: 'end_of_debate' }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e2');
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — applyFilters affordableOnly uses mod_cost for modifier productType', () => {
  it('excludes items where mod_cost > tokenBalance', () => {
    const effects = [
      makeEffect({ id: 'e1', mod_cost: 100 }),
      makeEffect({ id: 'e2', mod_cost: 500 }),
    ];
    const state = makeState({ productType: 'modifier', affordableOnly: true, tokenBalance: 200 });
    const result = applyFilters(effects, state);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e1');
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — applyFilters affordableOnly uses pu_cost for powerup productType', () => {
  it('excludes items where pu_cost > tokenBalance', () => {
    const effects = [
      makeEffect({ id: 'e1', pu_cost: 50 }),
      makeEffect({ id: 'e2', pu_cost: 500 }),
    ];
    const state = makeState({ productType: 'powerup', affordableOnly: true, tokenBalance: 100 });
    const result = applyFilters(effects, state);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e1');
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — applyFilters returns empty array when nothing matches', () => {
  it('returns [] when all items are filtered out', () => {
    const effects = [makeEffect({ category: 'point' })];
    expect(applyFilters(effects, makeState({ categoryFilter: 'token' }))).toHaveLength(0);
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — applyFilters applies multiple filters simultaneously', () => {
  it('combines category + rarity filters', () => {
    const effects = [
      makeEffect({ id: 'e1', category: 'point', tier_gate: 'common' }),
      makeEffect({ id: 'e2', category: 'point', tier_gate: 'legendary' }),
      makeEffect({ id: 'e3', category: 'token', tier_gate: 'common' }),
    ];
    const state = makeState({ categoryFilter: 'point', rarityFilter: 'common' });
    const result = applyFilters(effects, state);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e1');
  });
});

// ── TC9 ───────────────────────────────────────────────────────

describe('TC9 — applyFilters passes through items exactly at tokenBalance', () => {
  it('includes item where cost === tokenBalance', () => {
    const effects = [makeEffect({ pu_cost: 100 })];
    const state = makeState({ productType: 'powerup', affordableOnly: true, tokenBalance: 100 });
    expect(applyFilters(effects, state)).toHaveLength(1);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/home.arsenal-shop-filters.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../modifiers.ts', './home.arsenal-shop-types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.arsenal-shop-filters.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
