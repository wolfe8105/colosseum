/**
 * Integration tests — home.arsenal-shop-wiring → home.arsenal-shop-sheet
 * SEAM: #557
 *
 * ARCH filter (imports from wiring):
 *   import type { ModifierEffect, ModifierCategory, RarityTier } from '../modifiers.ts';
 *   import type { ShopState } from './home.arsenal-shop-types.ts';
 *   import { openBottomSheet } from './home.arsenal-shop-sheet.ts';
 *
 * ARCH filter (imports from sheet):
 *   import type { ModifierEffect } from '../modifiers.ts';
 *   import type { ShopState } from './home.arsenal-shop-types.ts';
 *   import { handleBuyModifier, handleBuyPowerup } from '../modifiers-handlers.ts';
 *   import { tierLabel, categoryLabel, rarityClass } from '../modifiers-render.ts';
 *   import { escapeHTML } from '../config.ts';
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — declared before dynamic imports
// ---------------------------------------------------------------------------

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
  })),
}));

vi.mock('../../src/modifiers-handlers.ts', () => ({
  handleBuyModifier: vi.fn().mockResolvedValue(true),
  handleBuyPowerup: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../src/modifiers-render.ts', () => ({
  tierLabel: vi.fn((t: string) => t),
  categoryLabel: vi.fn((c: string) => c),
  rarityClass: vi.fn((t: string) => t),
}));

vi.mock('../../src/config.ts', () => ({
  escapeHTML: vi.fn((s: string) => s),
  showToast: vi.fn(),
  ModeratorConfig: { escapeHTML: vi.fn((s: string) => s) },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEffect(overrides: Partial<{
  id: string; name: string; description: string; mod_cost: number; pu_cost: number;
  tier_gate: string; timing: string; category: string;
}> = {}): Record<string, unknown> {
  return {
    id: 'eff-001',
    name: 'Test Modifier',
    description: 'A test effect',
    mod_cost: 50,
    pu_cost: 30,
    tier_gate: 'bronze',
    timing: 'in_debate',
    category: 'attack',
    ...overrides,
  };
}

function makeState(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    catalog: [makeEffect()],
    productType: 'modifier',
    categoryFilter: 'all',
    rarityFilter: 'all',
    timingFilter: 'all',
    affordableOnly: false,
    tokenBalance: 100,
    ...overrides,
  };
}

function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('wireShopEvents — product type toggle', () => {
  let wireShopEvents: (
    container: HTMLElement,
    state: Record<string, unknown>,
    onStateChange: () => void,
    onSheetOpen: (cleanup: () => void) => void,
  ) => void;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    const mod = await import('../../src/pages/home.arsenal-shop-wiring.ts');
    wireShopEvents = mod.wireShopEvents as typeof wireShopEvents;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC-557-01: clicking [data-product] sets state.productType and calls onStateChange', async () => {
    const container = makeContainer();
    const btn = document.createElement('button');
    btn.dataset.product = 'powerup';
    container.appendChild(btn);

    const state = makeState();
    const onStateChange = vi.fn();
    const onSheetOpen = vi.fn();

    wireShopEvents(container, state, onStateChange, onSheetOpen);
    btn.click();

    expect(state.productType).toBe('powerup');
    expect(onStateChange).toHaveBeenCalledOnce();
  });

  it('TC-557-02: clicking [data-cat] sets state.categoryFilter and calls onStateChange', async () => {
    const container = makeContainer();
    const btn = document.createElement('button');
    btn.dataset.cat = 'attack';
    container.appendChild(btn);

    const state = makeState();
    const onStateChange = vi.fn();

    wireShopEvents(container, state, onStateChange, vi.fn());
    btn.click();

    expect(state.categoryFilter).toBe('attack');
    expect(onStateChange).toHaveBeenCalledOnce();
  });

  it('TC-557-03: clicking [data-rarity] sets state.rarityFilter and calls onStateChange', async () => {
    const container = makeContainer();
    const btn = document.createElement('button');
    btn.dataset.rarity = 'legendary';
    container.appendChild(btn);

    const state = makeState();
    const onStateChange = vi.fn();

    wireShopEvents(container, state, onStateChange, vi.fn());
    btn.click();

    expect(state.rarityFilter).toBe('legendary');
    expect(onStateChange).toHaveBeenCalledOnce();
  });
});

describe('wireShopEvents — timing toggle', () => {
  let wireShopEvents: (
    container: HTMLElement,
    state: Record<string, unknown>,
    onStateChange: () => void,
    onSheetOpen: (cleanup: () => void) => void,
  ) => void;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    const mod = await import('../../src/pages/home.arsenal-shop-wiring.ts');
    wireShopEvents = mod.wireShopEvents as typeof wireShopEvents;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC-557-04: clicking [data-timing] sets timingFilter; second click on same button resets to all', async () => {
    const container = makeContainer();
    const btn = document.createElement('button');
    btn.dataset.timing = 'in_debate';
    container.appendChild(btn);

    const state = makeState();
    const onStateChange = vi.fn();

    wireShopEvents(container, state, onStateChange, vi.fn());

    btn.click();
    expect(state.timingFilter).toBe('in_debate');
    expect(onStateChange).toHaveBeenCalledTimes(1);

    btn.click();
    expect(state.timingFilter).toBe('all');
    expect(onStateChange).toHaveBeenCalledTimes(2);
  });

  it('TC-557-05: clicking [data-afford] toggles state.affordableOnly and calls onStateChange', async () => {
    const container = makeContainer();
    const btn = document.createElement('button');
    btn.dataset.afford = 'true';
    container.appendChild(btn);

    const state = makeState({ affordableOnly: false });
    const onStateChange = vi.fn();

    wireShopEvents(container, state, onStateChange, vi.fn());

    btn.click();
    expect(state.affordableOnly).toBe(true);
    expect(onStateChange).toHaveBeenCalledTimes(1);

    btn.click();
    expect(state.affordableOnly).toBe(false);
    expect(onStateChange).toHaveBeenCalledTimes(2);
  });
});

describe('wireShopEvents — card tap opens bottom sheet', () => {
  let wireShopEvents: (
    container: HTMLElement,
    state: Record<string, unknown>,
    onStateChange: () => void,
    onSheetOpen: (cleanup: () => void) => void,
  ) => void;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    const mod = await import('../../src/pages/home.arsenal-shop-wiring.ts');
    wireShopEvents = mod.wireShopEvents as typeof wireShopEvents;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC-557-06: clicking .mod-effect-card (not on buy-btn) calls onSheetOpen with a cleanup fn', async () => {
    const effect = makeEffect();
    const container = makeContainer();
    const card = document.createElement('div');
    card.className = 'mod-effect-card';
    card.dataset.effectId = effect.id as string;
    container.appendChild(card);

    const state = makeState({ catalog: [effect] });
    const onStateChange = vi.fn();
    const onSheetOpen = vi.fn();

    wireShopEvents(container, state, onStateChange, onSheetOpen);
    card.click();

    expect(onSheetOpen).toHaveBeenCalledOnce();
    // cleanup fn returned from openBottomSheet is a function
    const arg = onSheetOpen.mock.calls[0][0];
    expect(typeof arg).toBe('function');
  });

  it('TC-557-07: clicking .mod-buy-btn calls onSheetOpen and does not propagate to card handler', async () => {
    const effect = makeEffect();
    const container = makeContainer();

    // card wrapping the buy button
    const card = document.createElement('div');
    card.className = 'mod-effect-card';
    card.dataset.effectId = effect.id as string;

    const buyBtn = document.createElement('button');
    buyBtn.className = 'mod-buy-btn';
    buyBtn.dataset.effectId = effect.id as string;
    card.appendChild(buyBtn);
    container.appendChild(card);

    const state = makeState({ catalog: [effect] });
    const onStateChange = vi.fn();
    const onSheetOpen = vi.fn();

    wireShopEvents(container, state, onStateChange, onSheetOpen);
    buyBtn.click();

    // onSheetOpen called exactly once — from the buy-btn handler, not duplicated by card handler
    expect(onSheetOpen).toHaveBeenCalledOnce();
  });
});
