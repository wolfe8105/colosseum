/**
 * Integration tests — seam #219
 * src/pages/home.arsenal-shop-render.ts → modifiers
 *
 * Tests that renderShop correctly builds DOM from ShopState using
 * ModifierCategory and RarityTier from modifiers.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn(),
  })),
}));

// ARCH filter — imports detected via source.split('\n').filter(l => /from\s+['"]/.test(l))
// home.arsenal-shop-render.ts imports:
//   import type { ModifierCategory, RarityTier } from '../modifiers.ts'
//   import type { ShopState } from './home.arsenal-shop-types.ts'
//   import { renderEffectCard } from '../modifiers-render.ts'
//   import { escapeHTML } from '../config.ts'
//   import { applyFilters } from './home.arsenal-shop-filters.ts'
//   import { wireShopEvents } from './home.arsenal-shop-wiring.ts'

vi.mock('../../src/config.ts', () => ({
  escapeHTML: (s: string) => s,
  showToast: vi.fn(),
  ModeratorConfig: { escapeHTML: (s: string) => s },
}));

vi.mock('../../src/auth.ts', () => ({
  safeRpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
  supabase: {
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn(),
  },
}));

// Mock the sheet dependency used by wiring
vi.mock('../../src/pages/home.arsenal-shop-sheet.ts', () => ({
  openBottomSheet: vi.fn(() => vi.fn()),
}));

// Mock contracts sub-import to avoid ESM resolution issues
vi.mock('../../src/contracts/rpc-schemas.ts', () => ({
  get_user_modifier_inventory: vi.fn(),
}));

import type { ModifierEffect, ModifierCategory, RarityTier } from '../../src/modifiers';
import type { ShopState } from '../../src/pages/home.arsenal-shop-types';

describe('seam #219 | home.arsenal-shop-render → modifiers', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  let renderModule: typeof import('../../src/pages/home.arsenal-shop-render');

  const makeEffect = (overrides: Partial<ModifierEffect> = {}): ModifierEffect => ({
    id: 'eff-001',
    effect_num: 1,
    name: 'Iron Will',
    description: '+5 points per round',
    category: 'point' as ModifierCategory,
    timing: 'in_debate',
    tier_gate: 'common' as RarityTier,
    mod_cost: 50,
    pu_cost: 20,
    ...overrides,
  });

  const makeState = (overrides: Partial<ShopState> = {}): ShopState => ({
    catalog: [],
    productType: 'modifier',
    categoryFilter: 'all',
    rarityFilter: 'all',
    timingFilter: 'all',
    affordableOnly: false,
    tokenBalance: 100,
    ...overrides,
  });

  beforeEach(async () => {
    vi.resetModules();
    // Re-mock sheet after resetModules
    vi.mock('../../src/pages/home.arsenal-shop-sheet.ts', () => ({
      openBottomSheet: vi.fn(() => vi.fn()),
    }));
    renderModule = await import('../../src/pages/home.arsenal-shop-render');
  });

  // TC1: All 9 category chips rendered (includes 'all' + 8 specific categories)
  it('TC1 — renderShop renders 9 category filter chips into #shop-cat-chips', () => {
    const container = document.createElement('div');
    const state = makeState();
    const onRerender = vi.fn();
    const onSheetOpen = vi.fn();

    renderModule.renderShop(container, state, onRerender, onSheetOpen);

    const catChips = container.querySelectorAll('#shop-cat-chips .shop-chip');
    // CATEGORIES array has 9 entries: all, point, token, reference, elo_xp, survival, self_mult, opponent_debuff, conditional, special
    expect(catChips.length).toBe(10);
  });

  // TC2: All 6 rarity chips rendered (all + 5 tiers)
  it('TC2 — renderShop renders 6 rarity filter chips into #shop-rarity-chips', () => {
    const container = document.createElement('div');
    const state = makeState();
    const onRerender = vi.fn();
    const onSheetOpen = vi.fn();

    renderModule.renderShop(container, state, onRerender, onSheetOpen);

    const rarityChips = container.querySelectorAll<HTMLElement>('[data-rarity]');
    // RARITIES array: all, common, uncommon, rare, legendary, mythic = 6
    expect(rarityChips.length).toBe(6);
  });

  // TC3: Token balance displayed as Number(state.tokenBalance)
  it('TC3 — #shop-balance-display shows the numeric token balance from state', () => {
    const container = document.createElement('div');
    const state = makeState({ tokenBalance: 250 });
    const onRerender = vi.fn();
    const onSheetOpen = vi.fn();

    renderModule.renderShop(container, state, onRerender, onSheetOpen);

    const balanceEl = container.querySelector('#shop-balance-display');
    expect(balanceEl).not.toBeNull();
    expect(balanceEl!.textContent).toBe('250');
  });

  // TC4: Active productType button gets 'active' class; inactive does not
  it('TC4 — active productType button gets "active" class; the other does not', () => {
    const container = document.createElement('div');
    const state = makeState({ productType: 'modifier' });
    const onRerender = vi.fn();
    const onSheetOpen = vi.fn();

    renderModule.renderShop(container, state, onRerender, onSheetOpen);

    const modBtn = container.querySelector<HTMLButtonElement>('[data-product="modifier"]');
    const puBtn = container.querySelector<HTMLButtonElement>('[data-product="powerup"]');

    expect(modBtn).not.toBeNull();
    expect(puBtn).not.toBeNull();
    expect(modBtn!.classList.contains('active')).toBe(true);
    expect(puBtn!.classList.contains('active')).toBe(false);
  });

  // TC5: Active categoryFilter chip gets 'active' class
  it('TC5 — active categoryFilter chip gets "active" class', () => {
    const container = document.createElement('div');
    const state = makeState({ categoryFilter: 'token' });
    const onRerender = vi.fn();
    const onSheetOpen = vi.fn();

    renderModule.renderShop(container, state, onRerender, onSheetOpen);

    const tokenChip = container.querySelector<HTMLButtonElement>('[data-cat="token"]');
    const allChip = container.querySelector<HTMLButtonElement>('[data-cat="all"]');

    expect(tokenChip).not.toBeNull();
    expect(tokenChip!.classList.contains('active')).toBe(true);
    expect(allChip).not.toBeNull();
    expect(allChip!.classList.contains('active')).toBe(false);
  });

  // TC6: Empty catalog shows .shop-empty and result count says "0 effects"
  it('TC6 — empty catalog renders .shop-empty message and "0 effects" result count', () => {
    const container = document.createElement('div');
    const state = makeState({ catalog: [] });
    const onRerender = vi.fn();
    const onSheetOpen = vi.fn();

    renderModule.renderShop(container, state, onRerender, onSheetOpen);

    const empty = container.querySelector('.shop-empty');
    expect(empty).not.toBeNull();
    expect(empty!.textContent).toContain('No effects match your filters.');

    const resultCount = container.querySelector('.shop-result-count');
    expect(resultCount).not.toBeNull();
    expect(resultCount!.textContent).toContain('0 effects');
  });

  // TC7: Cards rendered for each effect in filtered catalog
  it('TC7 — one .mod-effect-card rendered per effect in filtered catalog', () => {
    const container = document.createElement('div');
    const e1 = makeEffect({ id: 'eff-a', name: 'Alpha' });
    const e2 = makeEffect({ id: 'eff-b', name: 'Beta', category: 'token' });
    const state = makeState({ catalog: [e1, e2] });
    const onRerender = vi.fn();
    const onSheetOpen = vi.fn();

    renderModule.renderShop(container, state, onRerender, onSheetOpen);

    const cards = container.querySelectorAll('.mod-effect-card');
    expect(cards.length).toBe(2);

    const ids = Array.from(cards).map(c => (c as HTMLElement).dataset.effectId);
    expect(ids).toContain('eff-a');
    expect(ids).toContain('eff-b');
  });
});
