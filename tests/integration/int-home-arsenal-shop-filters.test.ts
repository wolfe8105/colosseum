/**
 * Integration tests — seam #220
 * src/pages/home.arsenal-shop-filters.ts → src/modifiers.ts
 *
 * ARCH filter (imports from home.arsenal-shop-filters):
 *   source.split('\n').filter(l => /from\s+['"]/.test(l))
 *   → "import type { ModifierEffect } from '../modifiers.ts';"
 *   → "import type { ShopState } from './home.arsenal-shop-types.ts';"
 *
 * No RPC calls — pure filter function, no DOM access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// Helper: build a minimal ModifierEffect
function makeEffect(
  overrides: Partial<import('../../src/modifiers').ModifierEffect> = {}
): import('../../src/modifiers').ModifierEffect {
  return {
    id: 'eff-default',
    effect_num: 1,
    name: 'Test Effect',
    description: 'A test effect',
    category: 'point',
    timing: 'in_debate',
    tier_gate: 'common',
    mod_cost: 100,
    pu_cost: 50,
    ...overrides,
  };
}

describe('seam #220 | home.arsenal-shop-filters → modifiers (applyFilters)', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  let filtersModule: typeof import('../../src/pages/home.arsenal-shop-filters');

  beforeEach(async () => {
    vi.resetModules();
    filtersModule = await import('../../src/pages/home.arsenal-shop-filters');
  });

  // TC1 — all filters set to 'all', affordableOnly false → full catalog returned unchanged
  it('TC1: all filters "all" and affordableOnly:false returns full catalog', async () => {
    const catalog = [
      makeEffect({ id: 'e1', category: 'token', tier_gate: 'common', timing: 'in_debate' }),
      makeEffect({ id: 'e2', category: 'point', tier_gate: 'rare', timing: 'end_of_debate' }),
      makeEffect({ id: 'e3', category: 'special', tier_gate: 'legendary', timing: 'in_debate' }),
    ];

    const state: import('../../src/pages/home.arsenal-shop-types').ShopState = {
      catalog,
      productType: 'modifier',
      categoryFilter: 'all',
      rarityFilter: 'all',
      timingFilter: 'all',
      affordableOnly: false,
      tokenBalance: 0,
    };

    const result = filtersModule.applyFilters(catalog, state);
    expect(result).toHaveLength(3);
    expect(result.map(e => e.id)).toEqual(['e1', 'e2', 'e3']);
  });

  // TC2 — categoryFilter 'point' → only category==='point' items pass
  it('TC2: categoryFilter "point" excludes non-point items', async () => {
    const catalog = [
      makeEffect({ id: 'e1', category: 'token' }),
      makeEffect({ id: 'e2', category: 'point' }),
      makeEffect({ id: 'e3', category: 'crowd' }),
      makeEffect({ id: 'e4', category: 'point' }),
    ];

    const state: import('../../src/pages/home.arsenal-shop-types').ShopState = {
      catalog,
      productType: 'modifier',
      categoryFilter: 'point',
      rarityFilter: 'all',
      timingFilter: 'all',
      affordableOnly: false,
      tokenBalance: 9999,
    };

    const result = filtersModule.applyFilters(catalog, state);
    expect(result).toHaveLength(2);
    expect(result.every(e => e.category === 'point')).toBe(true);
    expect(result.map(e => e.id)).toEqual(['e2', 'e4']);
  });

  // TC3 — rarityFilter 'rare' → only tier_gate==='rare' items pass
  it('TC3: rarityFilter "rare" excludes non-rare items', async () => {
    const catalog = [
      makeEffect({ id: 'e1', tier_gate: 'common' }),
      makeEffect({ id: 'e2', tier_gate: 'rare' }),
      makeEffect({ id: 'e3', tier_gate: 'legendary' }),
      makeEffect({ id: 'e4', tier_gate: 'rare' }),
    ];

    const state: import('../../src/pages/home.arsenal-shop-types').ShopState = {
      catalog,
      productType: 'modifier',
      categoryFilter: 'all',
      rarityFilter: 'rare',
      timingFilter: 'all',
      affordableOnly: false,
      tokenBalance: 9999,
    };

    const result = filtersModule.applyFilters(catalog, state);
    expect(result).toHaveLength(2);
    expect(result.every(e => e.tier_gate === 'rare')).toBe(true);
    expect(result.map(e => e.id)).toEqual(['e2', 'e4']);
  });

  // TC4 — timingFilter 'in_debate' → only timing==='in_debate' items pass
  it('TC4: timingFilter "in_debate" excludes end_of_debate items', async () => {
    const catalog = [
      makeEffect({ id: 'e1', timing: 'in_debate' }),
      makeEffect({ id: 'e2', timing: 'end_of_debate' }),
      makeEffect({ id: 'e3', timing: 'in_debate' }),
    ];

    const state: import('../../src/pages/home.arsenal-shop-types').ShopState = {
      catalog,
      productType: 'modifier',
      categoryFilter: 'all',
      rarityFilter: 'all',
      timingFilter: 'in_debate',
      affordableOnly: false,
      tokenBalance: 9999,
    };

    const result = filtersModule.applyFilters(catalog, state);
    expect(result).toHaveLength(2);
    expect(result.every(e => e.timing === 'in_debate')).toBe(true);
    expect(result.map(e => e.id)).toEqual(['e1', 'e3']);
  });

  // TC5 — affordableOnly:true + productType:'modifier' → uses mod_cost vs tokenBalance
  it('TC5: affordableOnly:true with productType "modifier" filters by mod_cost', async () => {
    const catalog = [
      makeEffect({ id: 'e1', mod_cost: 50,  pu_cost: 10 }),
      makeEffect({ id: 'e2', mod_cost: 200, pu_cost: 10 }),
      makeEffect({ id: 'e3', mod_cost: 100, pu_cost: 10 }),
    ];

    const state: import('../../src/pages/home.arsenal-shop-types').ShopState = {
      catalog,
      productType: 'modifier',
      categoryFilter: 'all',
      rarityFilter: 'all',
      timingFilter: 'all',
      affordableOnly: true,
      tokenBalance: 100,
    };

    const result = filtersModule.applyFilters(catalog, state);
    // mod_cost <= 100 pass: e1 (50), e3 (100); e2 (200) excluded
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['e1', 'e3']);
  });

  // TC6 — affordableOnly:true + productType:'powerup' → uses pu_cost vs tokenBalance
  it('TC6: affordableOnly:true with productType "powerup" filters by pu_cost', async () => {
    const catalog = [
      makeEffect({ id: 'e1', mod_cost: 10, pu_cost: 30  }),
      makeEffect({ id: 'e2', mod_cost: 10, pu_cost: 300 }),
      makeEffect({ id: 'e3', mod_cost: 10, pu_cost: 75  }),
    ];

    const state: import('../../src/pages/home.arsenal-shop-types').ShopState = {
      catalog,
      productType: 'powerup',
      categoryFilter: 'all',
      rarityFilter: 'all',
      timingFilter: 'all',
      affordableOnly: true,
      tokenBalance: 75,
    };

    const result = filtersModule.applyFilters(catalog, state);
    // pu_cost <= 75: e1 (30), e3 (75); e2 (300) excluded
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['e1', 'e3']);
  });

  // TC7 — multiple filters combined → only items matching ALL criteria pass
  it('TC7: combined filters apply all criteria simultaneously', async () => {
    const catalog = [
      // passes all: category=point, tier=rare, timing=in_debate, mod_cost=50<=200
      makeEffect({ id: 'e1', category: 'point', tier_gate: 'rare', timing: 'in_debate', mod_cost: 50 }),
      // fails category: token != point
      makeEffect({ id: 'e2', category: 'token', tier_gate: 'rare', timing: 'in_debate', mod_cost: 50 }),
      // fails tier: common != rare
      makeEffect({ id: 'e3', category: 'point', tier_gate: 'common', timing: 'in_debate', mod_cost: 50 }),
      // fails timing: end_of_debate != in_debate
      makeEffect({ id: 'e4', category: 'point', tier_gate: 'rare', timing: 'end_of_debate', mod_cost: 50 }),
      // fails affordable: mod_cost 500 > 200
      makeEffect({ id: 'e5', category: 'point', tier_gate: 'rare', timing: 'in_debate', mod_cost: 500 }),
    ];

    const state: import('../../src/pages/home.arsenal-shop-types').ShopState = {
      catalog,
      productType: 'modifier',
      categoryFilter: 'point',
      rarityFilter: 'rare',
      timingFilter: 'in_debate',
      affordableOnly: true,
      tokenBalance: 200,
    };

    const result = filtersModule.applyFilters(catalog, state);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e1');
  });
});
