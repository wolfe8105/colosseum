/**
 * Integration tests — SEAM #457
 * src/pages/home.arsenal-shop-sheet.ts → modifiers-render
 *
 * Covers: tierLabel, categoryLabel, rarityClass (pure helpers) and their
 * integration into openBottomSheet DOM rendering.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Supabase mock — mandatory single mock
// ---------------------------------------------------------------------------
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeEffect(overrides: Partial<{
  id: string; name: string; description: string;
  category: string; timing: string; tier_gate: string;
  mod_cost: number; pu_cost: number; effect_num: number;
}> = {}) {
  return {
    id: 'eff-001',
    effect_num: 1,
    name: 'Double Down',
    description: 'Double your token gain.',
    category: 'token',
    timing: 'end_of_debate',
    tier_gate: 'common',
    mod_cost: 50,
    pu_cost: 30,
    ...overrides,
  } as import('../../src/modifiers.ts').ModifierEffect;
}

function makeShopState(overrides: Partial<{
  tokenBalance: number; productType: string;
}> = {}) {
  return {
    catalog: [],
    productType: 'modifier',
    categoryFilter: 'all',
    rarityFilter: 'all',
    timingFilter: 'all',
    affordableOnly: false,
    tokenBalance: 100,
    ...overrides,
  } as import('../../src/pages/home.arsenal-shop-types.ts').ShopState;
}

// ---------------------------------------------------------------------------
// Pure helper tests — no DOM, no module reload needed
// ---------------------------------------------------------------------------

describe('modifiers-render — tierLabel', () => {
  it('capitalises the first letter of each tier', async () => {
    const { tierLabel } = await import('../../src/modifiers-render.ts');
    expect(tierLabel('common')).toBe('Common');
    expect(tierLabel('uncommon')).toBe('Uncommon');
    expect(tierLabel('rare')).toBe('Rare');
    expect(tierLabel('legendary')).toBe('Legendary');
    expect(tierLabel('mythic')).toBe('Mythic');
  });
});

describe('modifiers-render — categoryLabel', () => {
  it('maps known categories to display strings', async () => {
    const { categoryLabel } = await import('../../src/modifiers-render.ts');
    expect(categoryLabel('token')).toBe('Token');
    expect(categoryLabel('elo_xp')).toBe('Elo / XP');
    expect(categoryLabel('opponent_debuff')).toBe('Debuff');
    expect(categoryLabel('cite_triggered')).toBe('Cite');
    expect(categoryLabel('self_mult')).toBe('Multiplier');
  });

  it('falls back to the raw key for unknown categories', async () => {
    const { categoryLabel } = await import('../../src/modifiers-render.ts');
    // Cast to satisfy TypeScript — tests runtime fallback
    expect(categoryLabel('unknown_cat' as never)).toBe('unknown_cat');
  });
});

describe('modifiers-render — rarityClass', () => {
  it('is an identity function for all known tiers', async () => {
    const { rarityClass } = await import('../../src/modifiers-render.ts');
    const tiers = ['common', 'uncommon', 'rare', 'legendary', 'mythic'] as const;
    for (const t of tiers) {
      expect(rarityClass(t)).toBe(t);
    }
  });
});

// ---------------------------------------------------------------------------
// DOM integration tests — openBottomSheet wires tierLabel / rarityClass / categoryLabel
// ---------------------------------------------------------------------------

describe('openBottomSheet — DOM rendering with modifiers-render helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    // Clean up any previously appended overlays
    document.querySelectorAll('.bottom-sheet-overlay').forEach(el => el.remove());
  });

  afterEach(() => {
    vi.useRealTimers();
    document.querySelectorAll('.bottom-sheet-overlay').forEach(el => el.remove());
  });

  it('renders rarityClass tier in the badge class', async () => {
    const { openBottomSheet } = await import('../../src/pages/home.arsenal-shop-sheet.ts');
    const effect = makeEffect({ tier_gate: 'rare' });
    const state = makeShopState();
    const close = openBottomSheet(effect, state, vi.fn());

    const badge = document.querySelector('.mod-rarity-badge--rare');
    expect(badge).not.toBeNull();
    close();
  });

  it('renders tierLabel output inside the rarity badge', async () => {
    const { openBottomSheet } = await import('../../src/pages/home.arsenal-shop-sheet.ts');
    const effect = makeEffect({ tier_gate: 'legendary' });
    const state = makeShopState();
    const close = openBottomSheet(effect, state, vi.fn());

    const badge = document.querySelector('.mod-rarity-badge--legendary');
    expect(badge?.textContent?.trim()).toBe('Legendary');
    close();
  });

  it('renders categoryLabel output inside .mod-category-tag', async () => {
    const { openBottomSheet } = await import('../../src/pages/home.arsenal-shop-sheet.ts');
    const effect = makeEffect({ category: 'elo_xp' });
    const state = makeShopState();
    const close = openBottomSheet(effect, state, vi.fn());

    const tag = document.querySelector('.mod-category-tag');
    expect(tag?.textContent?.trim()).toBe('Elo / XP');
    close();
  });

  it('disables confirm button and adds broke class when balance < cost', async () => {
    const { openBottomSheet } = await import('../../src/pages/home.arsenal-shop-sheet.ts');
    const effect = makeEffect({ mod_cost: 200 });
    const state = makeShopState({ tokenBalance: 50 });
    const close = openBottomSheet(effect, state, vi.fn());

    const confirmBtn = document.querySelector<HTMLButtonElement>('#sheet-confirm');
    expect(confirmBtn?.disabled).toBe(true);
    const brokenCost = document.querySelector('.sheet-cost-val--broke');
    expect(brokenCost).not.toBeNull();
    close();
  });

  it('enables confirm button when balance >= cost', async () => {
    const { openBottomSheet } = await import('../../src/pages/home.arsenal-shop-sheet.ts');
    const effect = makeEffect({ mod_cost: 50 });
    const state = makeShopState({ tokenBalance: 100 });
    const close = openBottomSheet(effect, state, vi.fn());

    const confirmBtn = document.querySelector<HTMLButtonElement>('#sheet-confirm');
    expect(confirmBtn?.disabled).toBe(false);
    const brokenCost = document.querySelector('.sheet-cost-val--broke');
    expect(brokenCost).toBeNull();
    close();
  });

  it('removes overlay when cancel button is clicked', async () => {
    const { openBottomSheet } = await import('../../src/pages/home.arsenal-shop-sheet.ts');
    const effect = makeEffect();
    const state = makeShopState();
    openBottomSheet(effect, state, vi.fn());

    const cancelBtn = document.querySelector<HTMLButtonElement>('#sheet-cancel');
    cancelBtn?.click();

    const overlay = document.querySelector('.bottom-sheet-overlay');
    expect(overlay).toBeNull();
  });

  it('removes overlay when clicking outside the sheet', async () => {
    const { openBottomSheet } = await import('../../src/pages/home.arsenal-shop-sheet.ts');
    const effect = makeEffect();
    const state = makeShopState();
    openBottomSheet(effect, state, vi.fn());

    const overlay = document.querySelector<HTMLElement>('.bottom-sheet-overlay');
    expect(overlay).not.toBeNull();
    // Simulate click directly on overlay backdrop (target === overlay)
    overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const gone = document.querySelector('.bottom-sheet-overlay');
    expect(gone).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ARCH filter — verify modifiers-render is imported via from clause
// ---------------------------------------------------------------------------
describe('ARCH — home.arsenal-shop-sheet imports modifiers-render via from clause', () => {
  it('source file contains a from import for modifiers-render', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const srcPath = path.resolve(
      'C:/Users/wolfe/colosseum/colosseum/src/pages/home.arsenal-shop-sheet.ts',
    );
    const src = fs.readFileSync(srcPath, 'utf8');
    const fromLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasModifiersRender = fromLines.some(l => l.includes('modifiers-render'));
    expect(hasModifiersRender).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SEAM #558 — home.arsenal-shop-sheet → modifiers-handlers
// Tests confirm button interaction with handleBuyModifier / handleBuyPowerup
// ---------------------------------------------------------------------------

describe('openBottomSheet — confirm button calls handleBuyModifier (modifier flow)', () => {
  let buyModifierMock: ReturnType<typeof vi.fn>;
  let buyPowerupMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    buyModifierMock = vi.fn().mockResolvedValue(true);
    buyPowerupMock = vi.fn().mockResolvedValue(true);

    vi.doMock('../../src/modifiers-handlers.ts', () => ({
      handleBuyModifier: buyModifierMock,
      handleBuyPowerup: buyPowerupMock,
    }));

    document.querySelectorAll('.bottom-sheet-overlay').forEach(el => el.remove());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.querySelectorAll('.bottom-sheet-overlay').forEach(el => el.remove());
  });

  it('calls handleBuyModifier with effectId and effectName on confirm click', async () => {
    const { openBottomSheet } = await import('../../src/pages/home.arsenal-shop-sheet.ts');
    const effect = makeEffect({ id: 'eff-mod-01', name: 'Triple Threat', mod_cost: 50 });
    const state = makeShopState({ tokenBalance: 100, productType: 'modifier' });
    openBottomSheet(effect, state, vi.fn());

    const confirmBtn = document.querySelector<HTMLButtonElement>('#sheet-confirm');
    expect(confirmBtn?.disabled).toBe(false);

    confirmBtn?.click();
    await Promise.resolve(); // flush microtask

    expect(buyModifierMock).toHaveBeenCalledWith('eff-mod-01', 'Triple Threat');
    expect(buyPowerupMock).not.toHaveBeenCalled();
  });

  it('calls handleBuyPowerup with effectId and effectName on confirm click for powerup', async () => {
    const { openBottomSheet } = await import('../../src/pages/home.arsenal-shop-sheet.ts');
    const effect = makeEffect({ id: 'eff-pu-02', name: 'Iron Shield', pu_cost: 30 });
    const state = makeShopState({ tokenBalance: 100, productType: 'powerup' });
    openBottomSheet(effect, state, vi.fn());

    const confirmBtn = document.querySelector<HTMLButtonElement>('#sheet-confirm');
    expect(confirmBtn?.disabled).toBe(false);

    confirmBtn?.click();
    await Promise.resolve();

    expect(buyPowerupMock).toHaveBeenCalledWith('eff-pu-02', 'Iron Shield');
    expect(buyModifierMock).not.toHaveBeenCalled();
  });

  it('invokes onBuySuccess and removes overlay when handleBuyModifier returns true', async () => {
    buyModifierMock.mockResolvedValue(true);
    const { openBottomSheet } = await import('../../src/pages/home.arsenal-shop-sheet.ts');
    const effect = makeEffect({ mod_cost: 50 });
    const onBuySuccess = vi.fn();
    const state = makeShopState({ tokenBalance: 100, productType: 'modifier' });
    openBottomSheet(effect, state, onBuySuccess);

    const confirmBtn = document.querySelector<HTMLButtonElement>('#sheet-confirm');
    confirmBtn?.click();
    // flush the async click handler
    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(onBuySuccess).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.bottom-sheet-overlay')).toBeNull();
  });

  it('does NOT invoke onBuySuccess but still closes overlay when handleBuyModifier returns false', async () => {
    buyModifierMock.mockResolvedValue(false);
    const { openBottomSheet } = await import('../../src/pages/home.arsenal-shop-sheet.ts');
    const effect = makeEffect({ mod_cost: 50 });
    const onBuySuccess = vi.fn();
    const state = makeShopState({ tokenBalance: 100, productType: 'modifier' });
    openBottomSheet(effect, state, onBuySuccess);

    const confirmBtn = document.querySelector<HTMLButtonElement>('#sheet-confirm');
    confirmBtn?.click();
    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(onBuySuccess).not.toHaveBeenCalled();
    expect(document.querySelector('.bottom-sheet-overlay')).toBeNull();
  });

  it('disables confirm button and shows Purchasing… text while RPC is in-flight', async () => {
    let resolveRpc!: (v: boolean) => void;
    buyModifierMock.mockReturnValue(new Promise<boolean>(r => { resolveRpc = r; }));

    const { openBottomSheet } = await import('../../src/pages/home.arsenal-shop-sheet.ts');
    const effect = makeEffect({ mod_cost: 50 });
    const state = makeShopState({ tokenBalance: 100, productType: 'modifier' });
    openBottomSheet(effect, state, vi.fn());

    const confirmBtn = document.querySelector<HTMLButtonElement>('#sheet-confirm');
    confirmBtn?.click();
    await Promise.resolve(); // let the click handler start

    expect(confirmBtn?.disabled).toBe(true);
    expect(confirmBtn?.textContent).toBe('Purchasing…');

    resolveRpc(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(confirmBtn?.disabled).toBe(false);
  });

  it('uses pu_cost for the displayed cost when productType is powerup', async () => {
    const { openBottomSheet } = await import('../../src/pages/home.arsenal-shop-sheet.ts');
    const effect = makeEffect({ mod_cost: 999, pu_cost: 25 });
    const state = makeShopState({ tokenBalance: 100, productType: 'powerup' });
    const close = openBottomSheet(effect, state, vi.fn());

    const costVal = document.querySelector('.sheet-cost-val');
    expect(costVal?.textContent).toContain('25');
    expect(costVal?.textContent).not.toContain('999');
    close();
  });
});

// ---------------------------------------------------------------------------
// ARCH #558 — verify modifiers-handlers is imported via from clause
// ---------------------------------------------------------------------------
describe('ARCH #558 — home.arsenal-shop-sheet imports modifiers-handlers via from clause', () => {
  it('source file contains a from import for modifiers-handlers with handleBuyModifier and handleBuyPowerup', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const srcPath = path.resolve(
      'C:/Users/wolfe/colosseum/colosseum/src/pages/home.arsenal-shop-sheet.ts',
    );
    const src = fs.readFileSync(srcPath, 'utf8');
    const fromLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasHandlers = fromLines.some(l => l.includes('modifiers-handlers'));
    expect(hasHandlers).toBe(true);
    const importLine = fromLines.find(l => l.includes('modifiers-handlers')) ?? '';
    expect(importLine).toContain('handleBuyModifier');
    expect(importLine).toContain('handleBuyPowerup');
  });
});
