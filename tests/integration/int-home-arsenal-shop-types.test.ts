/**
 * Integration tests — seam #135
 * src/pages/home.arsenal-shop-types.ts → src/modifiers.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// ARCH filter — imports from home.arsenal-shop-types
// import type { ModifierEffect, ModifierCategory, RarityTier } from '../modifiers.ts';
// (confirmed via source.split('\n').filter(l => /from\s+['"]/.test(l)))

describe('seam #135 | home.arsenal-shop-types → modifiers (types)', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  let shopTypesModule: typeof import('../../src/pages/home.arsenal-shop-types');
  let modifiersModule: typeof import('../../src/modifiers');

  beforeEach(async () => {
    vi.resetModules();
    shopTypesModule = await import('../../src/pages/home.arsenal-shop-types');
    modifiersModule = await import('../../src/modifiers');
  });

  // TC1 — ShopState.catalog accepts valid ModifierEffect array
  it('TC1: ShopState.catalog accepts a valid ModifierEffect array', async () => {
    const effect: import('../../src/modifiers').ModifierEffect = {
      id: 'eff-001',
      effect_num: 1,
      name: 'Iron Will',
      description: '+5 points per round',
      category: 'point',
      timing: 'in_debate',
      tier_gate: 'common',
      mod_cost: 100,
      pu_cost: 50,
    };

    const state: import('../../src/pages/home.arsenal-shop-types').ShopState = {
      catalog: [effect],
      productType: 'modifier',
      categoryFilter: 'all',
      rarityFilter: 'all',
      timingFilter: 'all',
      affordableOnly: false,
      tokenBalance: 500,
    };

    expect(state.catalog).toHaveLength(1);
    expect(state.catalog[0].id).toBe('eff-001');
    expect(state.catalog[0].name).toBe('Iron Will');
    expect(state.catalog[0].mod_cost).toBe(100);
    expect(state.catalog[0].pu_cost).toBe(50);
    expect(state.catalog[0].effect_num).toBe(1);
  });

  // TC2 — ProductType only accepts 'modifier' | 'powerup'
  it('TC2: ProductType values are "modifier" and "powerup"', async () => {
    const modifierType: import('../../src/pages/home.arsenal-shop-types').ProductType = 'modifier';
    const powerupType: import('../../src/pages/home.arsenal-shop-types').ProductType = 'powerup';

    const stateModifier: import('../../src/pages/home.arsenal-shop-types').ShopState = {
      catalog: [],
      productType: modifierType,
      categoryFilter: 'all',
      rarityFilter: 'all',
      timingFilter: 'all',
      affordableOnly: false,
      tokenBalance: 0,
    };

    const statePowerup: import('../../src/pages/home.arsenal-shop-types').ShopState = {
      ...stateModifier,
      productType: powerupType,
    };

    expect(stateModifier.productType).toBe('modifier');
    expect(statePowerup.productType).toBe('powerup');
  });

  // TC3 — categoryFilter accepts any ModifierCategory or 'all'
  it('TC3: ShopState.categoryFilter accepts all ModifierCategory values and "all"', async () => {
    const categories: Array<import('../../src/modifiers').ModifierCategory | 'all'> = [
      'all', 'token', 'point', 'reference', 'elo_xp', 'crowd', 'survival',
      'self_mult', 'self_flat', 'opponent_debuff', 'cite_triggered', 'conditional', 'special',
    ];

    for (const cat of categories) {
      const state: import('../../src/pages/home.arsenal-shop-types').ShopState = {
        catalog: [],
        productType: 'modifier',
        categoryFilter: cat,
        rarityFilter: 'all',
        timingFilter: 'all',
        affordableOnly: false,
        tokenBalance: 0,
      };
      expect(state.categoryFilter).toBe(cat);
    }

    expect(categories).toHaveLength(13);
  });

  // TC4 — rarityFilter accepts any RarityTier or 'all'
  it('TC4: ShopState.rarityFilter accepts all RarityTier values and "all"', async () => {
    const rarities: Array<import('../../src/modifiers').RarityTier | 'all'> = [
      'all', 'common', 'uncommon', 'rare', 'legendary', 'mythic',
    ];

    for (const rarity of rarities) {
      const state: import('../../src/pages/home.arsenal-shop-types').ShopState = {
        catalog: [],
        productType: 'modifier',
        categoryFilter: 'all',
        rarityFilter: rarity,
        timingFilter: 'all',
        affordableOnly: false,
        tokenBalance: 0,
      };
      expect(state.rarityFilter).toBe(rarity);
    }

    expect(rarities).toHaveLength(6);
  });

  // TC5 — timingFilter accepts 'all', 'in_debate', 'end_of_debate'
  it('TC5: ShopState.timingFilter accepts "all", "in_debate", "end_of_debate"', async () => {
    const timings: Array<'all' | 'in_debate' | 'end_of_debate'> = [
      'all', 'in_debate', 'end_of_debate',
    ];

    for (const timing of timings) {
      const state: import('../../src/pages/home.arsenal-shop-types').ShopState = {
        catalog: [],
        productType: 'modifier',
        categoryFilter: 'all',
        rarityFilter: 'all',
        timingFilter: timing,
        affordableOnly: false,
        tokenBalance: 0,
      };
      expect(state.timingFilter).toBe(timing);
    }

    expect(timings).toHaveLength(3);
  });

  // TC6 — affordableOnly is boolean, tokenBalance is number
  it('TC6: ShopState.affordableOnly is boolean and tokenBalance is number', async () => {
    const stateTrue: import('../../src/pages/home.arsenal-shop-types').ShopState = {
      catalog: [],
      productType: 'powerup',
      categoryFilter: 'all',
      rarityFilter: 'all',
      timingFilter: 'all',
      affordableOnly: true,
      tokenBalance: 1337,
    };

    const stateFalse: import('../../src/pages/home.arsenal-shop-types').ShopState = {
      ...stateTrue,
      affordableOnly: false,
      tokenBalance: 0,
    };

    expect(typeof stateTrue.affordableOnly).toBe('boolean');
    expect(stateTrue.affordableOnly).toBe(true);
    expect(stateTrue.tokenBalance).toBe(1337);
    expect(typeof stateTrue.tokenBalance).toBe('number');

    expect(stateFalse.affordableOnly).toBe(false);
    expect(stateFalse.tokenBalance).toBe(0);
  });

  // TC7 — ModifierEffect shape has all required fields
  it('TC7: ModifierEffect from modifiers exposes all required fields', async () => {
    const effect: import('../../src/modifiers').ModifierEffect = {
      id: 'eff-legendary',
      effect_num: 42,
      name: 'Shadow Clone',
      description: 'Copies opponents last move',
      category: 'special',
      timing: 'end_of_debate',
      tier_gate: 'legendary',
      mod_cost: 9999,
      pu_cost: 4999,
    };

    expect(effect.id).toBe('eff-legendary');
    expect(effect.effect_num).toBe(42);
    expect(effect.category).toBe('special');
    expect(effect.timing).toBe('end_of_debate');
    expect(effect.tier_gate).toBe('legendary');
    expect(effect.mod_cost).toBe(9999);
    expect(effect.pu_cost).toBe(4999);

    // Verify catalog can hold it in a ShopState
    const state: import('../../src/pages/home.arsenal-shop-types').ShopState = {
      catalog: [effect],
      productType: 'modifier',
      categoryFilter: 'special',
      rarityFilter: 'legendary',
      timingFilter: 'end_of_debate',
      affordableOnly: true,
      tokenBalance: 10000,
    };

    expect(state.catalog[0].tier_gate).toBe('legendary');
    expect(state.catalog[0].category).toBe('special');
  });
});
