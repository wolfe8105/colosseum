/**
 * Integration tests — seam #217
 * src/pages/home.arsenal-shop-wiring.ts → modifiers
 *
 * Tests that wireShopEvents correctly mutates ShopState on UI interactions
 * and delegates bottom-sheet opens to openBottomSheet from home.arsenal-shop-sheet.
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
// home.arsenal-shop-wiring imports:
//   import type { ModifierEffect, ModifierCategory, RarityTier } from '../modifiers.ts'
//   import type { ShopState } from './home.arsenal-shop-types.ts'
//   import { openBottomSheet } from './home.arsenal-shop-sheet.ts'

vi.mock('../../src/pages/home.arsenal-shop-sheet.ts', () => ({
  openBottomSheet: vi.fn(() => vi.fn()),
}));

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

import type { ModifierEffect, ModifierCategory, RarityTier } from '../../src/modifiers';
import type { ShopState } from '../../src/pages/home.arsenal-shop-types';

describe('seam #217 | home.arsenal-shop-wiring → modifiers', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  let wiringModule: typeof import('../../src/pages/home.arsenal-shop-wiring');
  let sheetModule: typeof import('../../src/pages/home.arsenal-shop-sheet');

  const makeEffect = (overrides: Partial<ModifierEffect> = {}): ModifierEffect => ({
    id: 'eff-001',
    effect_num: 1,
    name: 'Test Effect',
    description: 'A test modifier effect',
    category: 'token' as ModifierCategory,
    timing: 'in_debate',
    tier_gate: 'common' as RarityTier,
    mod_cost: 50,
    pu_cost: 20,
    ...overrides,
  });

  const makeState = (overrides: Partial<ShopState> = {}): ShopState => ({
    catalog: [makeEffect()],
    productType: 'modifier',
    categoryFilter: 'all',
    rarityFilter: 'all',
    timingFilter: 'all',
    affordableOnly: false,
    tokenBalance: 100,
    ...overrides,
  });

  const makeContainer = (html: string): HTMLElement => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div;
  };

  beforeEach(async () => {
    vi.resetModules();
    // Re-mock sheet module after resetModules
    vi.mock('../../src/pages/home.arsenal-shop-sheet.ts', () => ({
      openBottomSheet: vi.fn(() => vi.fn()),
    }));
    wiringModule = await import('../../src/pages/home.arsenal-shop-wiring');
    sheetModule = await import('../../src/pages/home.arsenal-shop-sheet');
  });

  // TC1: Product-type toggle sets state.productType
  it('TC1 — [data-product] click sets state.productType to the button value', () => {
    const state = makeState({ productType: 'modifier' });
    const onStateChange = vi.fn();
    const onSheetOpen = vi.fn();

    const container = makeContainer(`
      <button data-product="modifier">Modifiers</button>
      <button data-product="powerup">Power-Ups</button>
    `);

    wiringModule.wireShopEvents(container, state, onStateChange, onSheetOpen);

    const powerupBtn = container.querySelector<HTMLButtonElement>('[data-product="powerup"]')!;
    powerupBtn.click();

    expect(state.productType).toBe('powerup');
    expect(onStateChange).toHaveBeenCalledTimes(1);
  });

  // TC2: Category chip sets state.categoryFilter
  it('TC2 — [data-cat] click sets state.categoryFilter to the button value', () => {
    const state = makeState({ categoryFilter: 'all' });
    const onStateChange = vi.fn();
    const onSheetOpen = vi.fn();

    const container = makeContainer(`
      <button data-cat="token">Token</button>
      <button data-cat="elo_xp">Elo/XP</button>
    `);

    wiringModule.wireShopEvents(container, state, onStateChange, onSheetOpen);

    const tokenBtn = container.querySelector<HTMLButtonElement>('[data-cat="token"]')!;
    tokenBtn.click();

    expect(state.categoryFilter).toBe('token');
    expect(onStateChange).toHaveBeenCalledTimes(1);
  });

  // TC3: Rarity chip sets state.rarityFilter
  it('TC3 — [data-rarity] click sets state.rarityFilter to the button value', () => {
    const state = makeState({ rarityFilter: 'all' });
    const onStateChange = vi.fn();
    const onSheetOpen = vi.fn();

    const container = makeContainer(`
      <button data-rarity="rare">Rare</button>
      <button data-rarity="legendary">Legendary</button>
    `);

    wiringModule.wireShopEvents(container, state, onStateChange, onSheetOpen);

    const rareBtn = container.querySelector<HTMLButtonElement>('[data-rarity="rare"]')!;
    rareBtn.click();

    expect(state.rarityFilter).toBe('rare');
    expect(onStateChange).toHaveBeenCalledTimes(1);
  });

  // TC4: Timing chip toggles — clicking active chip resets to 'all'
  it('TC4 — [data-timing] click sets filter; clicking same chip again resets to "all"', () => {
    const state = makeState({ timingFilter: 'all' });
    const onStateChange = vi.fn();
    const onSheetOpen = vi.fn();

    const container = makeContainer(`
      <button data-timing="in_debate">Live</button>
    `);

    wiringModule.wireShopEvents(container, state, onStateChange, onSheetOpen);

    const btn = container.querySelector<HTMLButtonElement>('[data-timing="in_debate"]')!;

    // First click: sets to 'in_debate'
    btn.click();
    expect(state.timingFilter).toBe('in_debate');

    // Second click: same chip → resets to 'all'
    btn.click();
    expect(state.timingFilter).toBe('all');

    expect(onStateChange).toHaveBeenCalledTimes(2);
  });

  // TC5: Afford toggle flips state.affordableOnly
  it('TC5 — [data-afford] click toggles state.affordableOnly', () => {
    const state = makeState({ affordableOnly: false });
    const onStateChange = vi.fn();
    const onSheetOpen = vi.fn();

    const container = makeContainer(`<button data-afford="true">Affordable Only</button>`);

    wiringModule.wireShopEvents(container, state, onStateChange, onSheetOpen);

    const affordBtn = container.querySelector<HTMLButtonElement>('[data-afford]')!;
    affordBtn.click();
    expect(state.affordableOnly).toBe(true);
    expect(onStateChange).toHaveBeenCalledTimes(1);

    affordBtn.click();
    expect(state.affordableOnly).toBe(false);
    expect(onStateChange).toHaveBeenCalledTimes(2);
  });

  // TC6: Card tap (not on .mod-buy-btn) calls openBottomSheet and passes cleanup to onSheetOpen
  it('TC6 — .mod-effect-card tap calls openBottomSheet with matching effect and passes cleanup to onSheetOpen', async () => {
    const effect = makeEffect({ id: 'eff-abc' });
    const state = makeState({ catalog: [effect] });
    const onStateChange = vi.fn();
    const onSheetOpen = vi.fn();

    const container = makeContainer(`
      <div class="mod-effect-card" data-effect-id="eff-abc">
        <span class="card-name">Test Effect</span>
      </div>
    `);

    wiringModule.wireShopEvents(container, state, onStateChange, onSheetOpen);

    const card = container.querySelector<HTMLElement>('.mod-effect-card')!;
    card.click();

    expect(sheetModule.openBottomSheet).toHaveBeenCalledWith(effect, state, onStateChange);
    expect(onSheetOpen).toHaveBeenCalledTimes(1);
    // The cleanup fn returned by openBottomSheet must be passed to onSheetOpen
    const cleanupArg = (onSheetOpen.mock.calls[0] as unknown[])[0];
    expect(typeof cleanupArg).toBe('function');
  });

  // TC7: .mod-buy-btn click also calls openBottomSheet (same path as card tap despite comment)
  it('TC7 — .mod-buy-btn click calls openBottomSheet (stops propagation, same purchase path)', async () => {
    const effect = makeEffect({ id: 'eff-buy' });
    const state = makeState({ catalog: [effect] });
    const onStateChange = vi.fn();
    const onSheetOpen = vi.fn();

    const container = makeContainer(`
      <div class="mod-effect-card" data-effect-id="eff-buy">
        <button class="mod-buy-btn" data-effect-id="eff-buy">Buy</button>
      </div>
    `);

    wiringModule.wireShopEvents(container, state, onStateChange, onSheetOpen);

    const buyBtn = container.querySelector<HTMLButtonElement>('.mod-buy-btn')!;
    buyBtn.click();

    expect(sheetModule.openBottomSheet).toHaveBeenCalledWith(effect, state, onStateChange);
    expect(onSheetOpen).toHaveBeenCalledTimes(1);
  });
});
