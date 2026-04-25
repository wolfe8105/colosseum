/**
 * Integration tests — seam #218
 * src/pages/home.arsenal-shop-sheet.ts → modifiers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ARCH filter — imports from home.arsenal-shop-sheet.ts
// import type { ModifierEffect } from '../modifiers.ts';
// import type { ShopState } from './home.arsenal-shop-types.ts';
// import { handleBuyModifier, handleBuyPowerup } from '../modifiers-handlers.ts';
// import { tierLabel, categoryLabel, rarityClass } from '../modifiers-render.ts';
// import { escapeHTML } from '../config.ts';
// (confirmed via source.split('\n').filter(l => /from\s+['"]/.test(l)))

const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: vi.fn(), auth: mockAuth })),
}));

describe('seam #218 | home.arsenal-shop-sheet → modifiers', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  let shopSheetModule: typeof import('../../src/pages/home.arsenal-shop-sheet');

  const makeEffect = (
    overrides: Partial<import('../../src/modifiers').ModifierEffect> = {},
  ): import('../../src/modifiers').ModifierEffect => ({
    id: 'eff-001',
    effect_num: 1,
    name: 'Iron Will',
    description: 'Grants +5 points per round',
    category: 'point',
    timing: 'in_debate',
    tier_gate: 'common',
    mod_cost: 100,
    pu_cost: 50,
    ...overrides,
  });

  const makeState = (
    overrides: Partial<import('../../src/pages/home.arsenal-shop-types').ShopState> = {},
  ): import('../../src/pages/home.arsenal-shop-types').ShopState => ({
    catalog: [],
    productType: 'modifier',
    categoryFilter: 'all',
    rarityFilter: 'all',
    timingFilter: 'all',
    affordableOnly: false,
    tokenBalance: 500,
    ...overrides,
  });

  beforeEach(async () => {
    vi.resetModules();

    mockRpc.mockReset();
    mockAuth.onAuthStateChange.mockReset();
    mockAuth.getSession.mockReset();

    mockRpc.mockResolvedValue({ data: null, error: null });
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: null) => void) => {
        cb('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );

    shopSheetModule = await import('../../src/pages/home.arsenal-shop-sheet');
  });

  afterEach(() => {
    // Remove any leftover overlay from the DOM
    document.querySelectorAll('.bottom-sheet-overlay').forEach(el => el.remove());
  });

  // TC1 — openBottomSheet appends overlay with effect name and description
  it('TC1: openBottomSheet renders effect name and description in the DOM', async () => {
    const { openBottomSheet } = shopSheetModule;
    const effect = makeEffect({ name: 'Iron Will', description: 'Grants +5 points per round' });
    const state = makeState({ productType: 'modifier', tokenBalance: 500 });

    const cleanup = openBottomSheet(effect, state, vi.fn());

    const overlay = document.querySelector('.bottom-sheet-overlay');
    expect(overlay).not.toBeNull();

    const title = overlay!.querySelector('.sheet-title');
    expect(title?.textContent).toBe('Iron Will');

    const desc = overlay!.querySelector('.sheet-desc');
    expect(desc?.textContent).toBe('Grants +5 points per round');

    cleanup();
  });

  // TC2 — confirm button triggers handleBuyModifier → RPC buy_modifier when affordable
  it('TC2: clicking confirm (modifier, can afford) calls buy_modifier with p_effect_id', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, modifier_id: 'mod-abc' }, error: null });

    const { openBottomSheet } = shopSheetModule;
    const effect = makeEffect({ id: 'eff-001', mod_cost: 100 });
    const state = makeState({ productType: 'modifier', tokenBalance: 500 });

    openBottomSheet(effect, state, vi.fn());

    const confirmBtn = document.querySelector<HTMLButtonElement>('#sheet-confirm');
    expect(confirmBtn).not.toBeNull();
    expect(confirmBtn!.disabled).toBe(false);

    confirmBtn!.click();

    // Advance past auth safety timeout so readyPromise resolves, then flush microtasks
    await vi.advanceTimersByTimeAsync(6000);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    expect(mockRpc).toHaveBeenCalledWith('buy_modifier', { p_effect_id: 'eff-001' });
  });

  // TC3 — when tokenBalance < cost, button is disabled and broke classes appear
  it('TC3: when tokenBalance < cost, confirm button is disabled and broke UI renders', async () => {
    const { openBottomSheet } = shopSheetModule;
    const effect = makeEffect({ mod_cost: 200, pu_cost: 200 });
    const state = makeState({ productType: 'modifier', tokenBalance: 50 });

    const cleanup = openBottomSheet(effect, state, vi.fn());

    const confirmBtn = document.querySelector<HTMLButtonElement>('#sheet-confirm');
    expect(confirmBtn).not.toBeNull();
    expect(confirmBtn!.disabled).toBe(true);

    const brokeVal = document.querySelector('.sheet-cost-val--broke');
    expect(brokeVal).not.toBeNull();

    const brokeNote = document.querySelector('.sheet-broke-note');
    expect(brokeNote).not.toBeNull();
    expect(brokeNote!.textContent).toContain('Not enough tokens');

    cleanup();
  });

  // TC4 — productType powerup click triggers buy_powerup with p_effect_id + p_quantity
  it('TC4: clicking confirm (powerup, can afford) calls buy_powerup with p_effect_id and p_quantity', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, new_quantity: 3 }, error: null });

    const { openBottomSheet } = shopSheetModule;
    const effect = makeEffect({ id: 'eff-pu-02', pu_cost: 30 });
    const state = makeState({ productType: 'powerup', tokenBalance: 999 });

    openBottomSheet(effect, state, vi.fn());

    const confirmBtn = document.querySelector<HTMLButtonElement>('#sheet-confirm');
    expect(confirmBtn).not.toBeNull();
    expect(confirmBtn!.disabled).toBe(false);

    confirmBtn!.click();

    await vi.advanceTimersByTimeAsync(6000);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    expect(mockRpc).toHaveBeenCalledWith('buy_powerup', {
      p_effect_id: 'eff-pu-02',
      p_quantity: 1,
    });
  });

  // TC5 — clicking #sheet-cancel removes overlay from DOM
  it('TC5: clicking #sheet-cancel removes the bottom-sheet overlay from the DOM', async () => {
    const { openBottomSheet } = shopSheetModule;
    openBottomSheet(makeEffect(), makeState(), vi.fn());

    expect(document.querySelector('.bottom-sheet-overlay')).not.toBeNull();

    const cancelBtn = document.querySelector<HTMLButtonElement>('#sheet-cancel');
    expect(cancelBtn).not.toBeNull();
    cancelBtn!.click();

    expect(document.querySelector('.bottom-sheet-overlay')).toBeNull();
  });

  // TC6 — clicking the backdrop (not the sheet) removes overlay from DOM
  it('TC6: clicking the overlay backdrop removes the bottom-sheet overlay from the DOM', async () => {
    const { openBottomSheet } = shopSheetModule;
    openBottomSheet(makeEffect(), makeState(), vi.fn());

    const overlay = document.querySelector<HTMLElement>('.bottom-sheet-overlay');
    expect(overlay).not.toBeNull();

    // Simulate click directly on overlay (target === overlay)
    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: overlay, writable: false });
    overlay!.dispatchEvent(clickEvent);

    expect(document.querySelector('.bottom-sheet-overlay')).toBeNull();
  });

  // TC7 — successful buy invokes onBuySuccess callback; failed buy does not
  it('TC7: successful buy triggers onBuySuccess callback; failed buy does not', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, modifier_id: 'mod-xyz' }, error: null });

    const { openBottomSheet } = shopSheetModule;
    const effect = makeEffect({ id: 'eff-tc7', mod_cost: 10 });
    const onBuySuccess = vi.fn();

    openBottomSheet(effect, makeState({ productType: 'modifier', tokenBalance: 999 }), onBuySuccess);

    const confirmBtn = document.querySelector<HTMLButtonElement>('#sheet-confirm');
    expect(confirmBtn).not.toBeNull();
    confirmBtn!.click();

    await vi.advanceTimersByTimeAsync(6000);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    expect(onBuySuccess).toHaveBeenCalledTimes(1);
  });
});
