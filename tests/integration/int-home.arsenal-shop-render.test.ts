// int-home.arsenal-shop-render.test.ts
// Seam #458 — src/pages/home.arsenal-shop-render.ts → modifiers-render
// renderShop delegates card HTML generation to renderEffectCard from modifiers-render.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { ModifierEffect } from '../../src/modifiers.ts';
import type { ShopState } from '../../src/pages/home.arsenal-shop-types.ts';

// No Supabase calls in this seam — modifiers-render is pure HTML rendering.
// We still mock @supabase/supabase-js to prevent any transitive import complaints.
const mockRpc = vi.hoisted(() => vi.fn());
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
  })),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEffect(overrides: Partial<ModifierEffect> = {}): ModifierEffect {
  return {
    id:          'eff-001',
    effect_num:  1,
    name:        'Test Boost',
    description: 'Boosts your score',
    category:    'point',
    timing:      'in_debate',
    tier_gate:   'common',
    mod_cost:    50,
    pu_cost:     30,
    ...overrides,
  };
}

function makeState(overrides: Partial<ShopState> = {}): ShopState {
  return {
    catalog:        [],
    productType:    'modifier',
    categoryFilter: 'all',
    rarityFilter:   'all',
    timingFilter:   'all',
    affordableOnly: false,
    tokenBalance:   200,
    ...overrides,
  };
}

// ── beforeEach ────────────────────────────────────────────────────────────────

let renderShop: typeof import('../../src/pages/home.arsenal-shop-render.ts').renderShop;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();
  mockRpc.mockReset();

  // Mock dependencies so the module loads in test env (no real DOM APIs needed)
  vi.doMock('../../src/config.ts', () => ({
    escapeHTML: (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    showToast: vi.fn(),
    friendlyError: vi.fn(),
    FEATURES: {},
  }));
  vi.doMock('../../src/pages/home.arsenal-shop-wiring.ts', () => ({
    wireShopEvents: vi.fn(),
  }));

  const mod = await import('../../src/pages/home.arsenal-shop-render.ts');
  renderShop = mod.renderShop;
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Seam #458 | home.arsenal-shop-render → modifiers-render', () => {

  // TC1: ARCH filter — import of renderEffectCard from modifiers-render
  it('TC1: imports renderEffectCard from modifiers-render (ARCH)', () => {
    const sourcePath = resolve('src/pages/home.arsenal-shop-render.ts');
    const source = readFileSync(sourcePath, 'utf8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasImport = importLines.some(l =>
      l.includes('renderEffectCard') && l.includes('modifiers-render')
    );
    expect(hasImport).toBe(true);
  });

  // TC2: Empty catalog renders shop-empty div
  it('TC2: empty catalog renders shop-empty div', () => {
    const container = document.createElement('div');
    const state = makeState({ catalog: [] });

    renderShop(container, state, vi.fn(), vi.fn());

    expect(container.querySelector('.shop-empty')).not.toBeNull();
    expect(container.querySelector('.shop-card-grid')?.innerHTML).toContain('No effects match your filters');
  });

  // TC3: Catalog with one effect renders mod-effect-card in the grid
  it('TC3: one catalog entry renders a mod-effect-card in the grid', () => {
    const container = document.createElement('div');
    const effect = makeEffect({ id: 'eff-abc', name: 'Power Surge' });
    const state = makeState({ catalog: [effect] });

    renderShop(container, state, vi.fn(), vi.fn());

    const grid = container.querySelector('#shop-card-grid');
    expect(grid).not.toBeNull();
    expect(grid!.innerHTML).toContain('mod-effect-card');
    expect(grid!.innerHTML).toContain('Power Surge');
  });

  // TC4: productType='modifier' causes mod-buy-btn--modifier to appear
  it('TC4: productType=modifier renders mod-buy-btn--modifier button', () => {
    const container = document.createElement('div');
    const effect = makeEffect({ id: 'eff-mod', mod_cost: 75 });
    const state = makeState({ catalog: [effect], productType: 'modifier' });

    renderShop(container, state, vi.fn(), vi.fn());

    const btn = container.querySelector('.mod-buy-btn--modifier');
    expect(btn).not.toBeNull();
    expect(btn!.getAttribute('data-effect-id')).toBe('eff-mod');
    // no powerup button when productType=modifier
    expect(container.querySelector('.mod-buy-btn--powerup')).toBeNull();
  });

  // TC5: productType='powerup' causes mod-buy-btn--powerup to appear
  it('TC5: productType=powerup renders mod-buy-btn--powerup button', () => {
    const container = document.createElement('div');
    const effect = makeEffect({ id: 'eff-pu', pu_cost: 40 });
    const state = makeState({ catalog: [effect], productType: 'powerup' });

    renderShop(container, state, vi.fn(), vi.fn());

    const btn = container.querySelector('.mod-buy-btn--powerup');
    expect(btn).not.toBeNull();
    expect(btn!.getAttribute('data-effect-id')).toBe('eff-pu');
    expect(container.querySelector('.mod-buy-btn--modifier')).toBeNull();
  });

  // TC6: Token balance is rendered in #shop-balance-display
  it('TC6: tokenBalance value appears in #shop-balance-display', () => {
    const container = document.createElement('div');
    const state = makeState({ tokenBalance: 999 });

    renderShop(container, state, vi.fn(), vi.fn());

    const balanceEl = container.querySelector('#shop-balance-display');
    expect(balanceEl).not.toBeNull();
    expect(balanceEl!.textContent?.trim()).toBe('999');
  });

  // TC7: affordableOnly=true hides effects whose cost exceeds tokenBalance
  it('TC7: affordableOnly filters out effects that cost more than tokenBalance', () => {
    const container = document.createElement('div');
    const expensive = makeEffect({ id: 'eff-exp', name: 'Pricey Mod', mod_cost: 500 });
    const cheap = makeEffect({ id: 'eff-chp', name: 'Cheap Mod', mod_cost: 20 });
    const state = makeState({
      catalog: [expensive, cheap],
      productType: 'modifier',
      affordableOnly: true,
      tokenBalance: 50,
    });

    renderShop(container, state, vi.fn(), vi.fn());

    const grid = container.querySelector('#shop-card-grid')!;
    expect(grid.innerHTML).not.toContain('Pricey Mod');
    expect(grid.innerHTML).toContain('Cheap Mod');
  });

  // TC8: Result count text updates with filtered count
  it('TC8: result count reflects number of visible effects after filtering', () => {
    const container = document.createElement('div');
    const effects = [
      makeEffect({ id: 'e1', timing: 'in_debate' }),
      makeEffect({ id: 'e2', timing: 'end_of_debate' }),
    ];
    const state = makeState({ catalog: effects, timingFilter: 'in_debate' });

    renderShop(container, state, vi.fn(), vi.fn());

    const count = container.querySelector('.shop-result-count');
    expect(count).not.toBeNull();
    expect(count!.textContent?.trim()).toBe('1 effect');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Seam #559 — src/pages/home.arsenal-shop-render.ts → home.arsenal-shop-wiring
// renderShop calls wireShopEvents; wiring mutates ShopState on user interactions.
// ─────────────────────────────────────────────────────────────────────────────

describe('Seam #559 | home.arsenal-shop-render → home.arsenal-shop-wiring', () => {
  let renderShop559: typeof import('../../src/pages/home.arsenal-shop-render.ts').renderShop;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    mockRpc.mockReset();

    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      showToast: vi.fn(),
      friendlyError: vi.fn(),
      FEATURES: {},
    }));
    // Explicitly un-mock wiring so the real module loads (outer beforeEach mocks it as noop)
    vi.doUnmock('../../src/pages/home.arsenal-shop-wiring.ts');
    // Mock the sheet module so openBottomSheet doesn't need real Supabase
    vi.doMock('../../src/pages/home.arsenal-shop-sheet.ts', () => ({
      openBottomSheet: vi.fn(() => vi.fn()),
    }));

    const mod = await import('../../src/pages/home.arsenal-shop-render.ts');
    renderShop559 = mod.renderShop;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // TC559-1: ARCH — import of wireShopEvents from home.arsenal-shop-wiring
  it('TC559-1: imports wireShopEvents from home.arsenal-shop-wiring (ARCH)', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const source = readFileSync(resolve('src/pages/home.arsenal-shop-render.ts'), 'utf8');
    const importLines = source.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = importLines.some((l: string) =>
      l.includes('wireShopEvents') && l.includes('home.arsenal-shop-wiring')
    );
    expect(hasImport).toBe(true);
  });

  // TC559-2: clicking product toggle mutates state.productType and fires onRerender
  it('TC559-2: product toggle click mutates state.productType and calls onRerender', () => {
    const container = document.createElement('div');
    const state = makeState({ productType: 'modifier' });
    const onRerender = vi.fn();

    renderShop559(container, state, onRerender, vi.fn());

    const puBtn = container.querySelector<HTMLButtonElement>('[data-product="powerup"]');
    expect(puBtn).not.toBeNull();
    puBtn!.click();

    expect(state.productType).toBe('powerup');
    expect(onRerender).toHaveBeenCalledTimes(1);
  });

  // TC559-3: clicking a category chip mutates state.categoryFilter and fires onRerender
  it('TC559-3: category chip click mutates state.categoryFilter and calls onRerender', () => {
    const container = document.createElement('div');
    const state = makeState({ categoryFilter: 'all' });
    const onRerender = vi.fn();

    renderShop559(container, state, onRerender, vi.fn());

    const tokenChip = container.querySelector<HTMLButtonElement>('[data-cat="token"]');
    expect(tokenChip).not.toBeNull();
    tokenChip!.click();

    expect(state.categoryFilter).toBe('token');
    expect(onRerender).toHaveBeenCalledTimes(1);
  });

  // TC559-4: clicking a rarity chip mutates state.rarityFilter and fires onRerender
  it('TC559-4: rarity chip click mutates state.rarityFilter and calls onRerender', () => {
    const container = document.createElement('div');
    const state = makeState({ rarityFilter: 'all' });
    const onRerender = vi.fn();

    renderShop559(container, state, onRerender, vi.fn());

    const rareChip = container.querySelector<HTMLButtonElement>('[data-rarity="rare"]');
    expect(rareChip).not.toBeNull();
    rareChip!.click();

    expect(state.rarityFilter).toBe('rare');
    expect(onRerender).toHaveBeenCalledTimes(1);
  });

  // TC559-5: clicking a timing chip sets state.timingFilter; clicking again toggles back to 'all'
  it('TC559-5: timing chip toggles state.timingFilter to value then back to all', () => {
    const container = document.createElement('div');
    const state = makeState({ timingFilter: 'all' });
    const onRerender = vi.fn();

    renderShop559(container, state, onRerender, vi.fn());

    const inDebateChip = container.querySelector<HTMLButtonElement>('[data-timing="in_debate"]');
    expect(inDebateChip).not.toBeNull();

    // First click: set to 'in_debate'
    inDebateChip!.click();
    expect(state.timingFilter).toBe('in_debate');
    expect(onRerender).toHaveBeenCalledTimes(1);

    // Second click on same chip: toggle back to 'all'
    inDebateChip!.click();
    expect(state.timingFilter).toBe('all');
    expect(onRerender).toHaveBeenCalledTimes(2);
  });

  // TC559-6: clicking afford toggle flips state.affordableOnly and fires onRerender
  it('TC559-6: afford toggle click flips state.affordableOnly and calls onRerender', () => {
    const container = document.createElement('div');
    const state = makeState({ affordableOnly: false });
    const onRerender = vi.fn();

    renderShop559(container, state, onRerender, vi.fn());

    const affordBtn = container.querySelector<HTMLButtonElement>('[data-afford]');
    expect(affordBtn).not.toBeNull();

    affordBtn!.click();
    expect(state.affordableOnly).toBe(true);
    expect(onRerender).toHaveBeenCalledTimes(1);

    affordBtn!.click();
    expect(state.affordableOnly).toBe(false);
    expect(onRerender).toHaveBeenCalledTimes(2);
  });

  // TC559-7: clicking a card (not buy btn) calls onSheetOpen with a cleanup function
  it('TC559-7: card tap (non-buy-btn) calls onSheetOpen with a cleanup function', () => {
    const container = document.createElement('div');
    const effect = makeEffect({ id: 'eff-tap', name: 'Tap Mod' });
    const state = makeState({ catalog: [effect] });
    const onSheetOpen = vi.fn();

    renderShop559(container, state, vi.fn(), onSheetOpen);

    const card = container.querySelector<HTMLElement>('.mod-effect-card');
    expect(card).not.toBeNull();

    card!.click();

    expect(onSheetOpen).toHaveBeenCalledTimes(1);
    expect(typeof onSheetOpen.mock.calls[0][0]).toBe('function');
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// Seam #560 — src/pages/home.arsenal-shop-render.ts → home.arsenal-shop-filters
// renderShop calls applyFilters(state.catalog, state) to obtain the filtered
// subset before building HTML. TCs verify the filter→render contract directly.
// ═══════════════════════════════════════════════════════════════════════════════

describe('Seam #560 | home.arsenal-shop-render.ts → home.arsenal-shop-filters', () => {

  let applyFilters: typeof import('../../src/pages/home.arsenal-shop-filters.ts').applyFilters;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      showToast: vi.fn(),
      friendlyError: vi.fn(),
      FEATURES: {},
    }));
    vi.doMock('../../src/pages/home.arsenal-shop-wiring.ts', () => ({
      wireShopEvents: vi.fn(),
    }));

    const mod = await import('../../src/pages/home.arsenal-shop-filters.ts');
    applyFilters = mod.applyFilters;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // TC560a-1: ARCH — render imports applyFilters from home.arsenal-shop-filters
  it('TC560a-1: home.arsenal-shop-render.ts imports applyFilters from home.arsenal-shop-filters (ARCH)', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const source = readFileSync(resolve('src/pages/home.arsenal-shop-render.ts'), 'utf8');
    const importLines = source.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = importLines.some((l: string) =>
      l.includes('applyFilters') && l.includes('home.arsenal-shop-filters'),
    );
    expect(hasImport).toBe(true);
  });

  // TC560a-2: categoryFilter='all' passes all entries through
  it('TC560a-2: categoryFilter="all" returns entire catalog', () => {
    const catalog = [
      makeEffect({ id: 'a', category: 'token' }),
      makeEffect({ id: 'b', category: 'point' }),
      makeEffect({ id: 'c', category: 'elo_xp' }),
    ];
    const state = makeState({ catalog, categoryFilter: 'all' });
    const result = applyFilters(catalog, state);
    expect(result).toHaveLength(3);
  });

  // TC560a-3: specific categoryFilter excludes non-matching entries
  it('TC560a-3: categoryFilter="token" excludes non-token entries', () => {
    const catalog = [
      makeEffect({ id: 'tok', category: 'token' }),
      makeEffect({ id: 'pt',  category: 'point' }),
    ];
    const state = makeState({ catalog, categoryFilter: 'token' });
    const result = applyFilters(catalog, state);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('tok');
  });

  // TC560a-4: rarityFilter filters by tier_gate field
  it('TC560a-4: rarityFilter="rare" includes only entries with tier_gate="rare"', () => {
    const catalog = [
      makeEffect({ id: 'r1', tier_gate: 'rare' }),
      makeEffect({ id: 'c1', tier_gate: 'common' }),
      makeEffect({ id: 'r2', tier_gate: 'rare' }),
    ];
    const state = makeState({ catalog, rarityFilter: 'rare' });
    const result = applyFilters(catalog, state);
    expect(result).toHaveLength(2);
    expect(result.every(e => e.tier_gate === 'rare')).toBe(true);
  });

  // TC560a-5: timingFilter filters by timing field
  it('TC560a-5: timingFilter="end_of_debate" excludes in_debate entries', () => {
    const catalog = [
      makeEffect({ id: 'end1', timing: 'end_of_debate' }),
      makeEffect({ id: 'in1',  timing: 'in_debate' }),
    ];
    const state = makeState({ catalog, timingFilter: 'end_of_debate' });
    const result = applyFilters(catalog, state);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('end1');
  });

  // TC560a-6: affordableOnly=true with productType="modifier" uses mod_cost
  it('TC560a-6: affordableOnly filters by mod_cost when productType="modifier"', () => {
    const catalog = [
      makeEffect({ id: 'cheap', mod_cost: 20 }),
      makeEffect({ id: 'pricey', mod_cost: 300 }),
    ];
    const state = makeState({ catalog, productType: 'modifier', affordableOnly: true, tokenBalance: 50 });
    const result = applyFilters(catalog, state);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cheap');
  });

  // TC560a-7: multiple filters apply AND logic — only entries passing all predicates survive
  it('TC560a-7: combined filters (category + rarity + affordableOnly) apply AND logic', () => {
    const catalog = [
      makeEffect({ id: 'match',   category: 'token', tier_gate: 'uncommon', mod_cost: 10 }),
      makeEffect({ id: 'cat-miss',category: 'point', tier_gate: 'uncommon', mod_cost: 10 }),
      makeEffect({ id: 'rar-miss',category: 'token', tier_gate: 'common',   mod_cost: 10 }),
      makeEffect({ id: 'cost-miss',category: 'token', tier_gate: 'uncommon', mod_cost: 999 }),
    ];
    const state = makeState({
      catalog,
      categoryFilter: 'token',
      rarityFilter: 'uncommon',
      productType: 'modifier',
      affordableOnly: true,
      tokenBalance: 100,
    });
    const result = applyFilters(catalog, state);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('match');
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// Seam #560 (legacy) — src/pages/home.arsenal-shop-render.ts → modifiers-catalog
// The orchestrator (home.arsenal-shop.ts) calls getModifierCatalog() and feeds
// the result into renderShop(). TCs cover the catalog-fetch → render pipeline.
// ═══════════════════════════════════════════════════════════════════════════════

const mockSafeRpc560 = vi.hoisted(() => vi.fn());

vi.mock('../../src/auth.ts', () => ({
  safeRpc: mockSafeRpc560,
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

function makeEffect560(overrides: Partial<import('../../src/modifiers.ts').ModifierEffect> = {}): import('../../src/modifiers.ts').ModifierEffect {
  return {
    id: 'eff-560',
    effect_num: 1,
    name: 'Catalog Effect',
    description: 'From catalog',
    category: 'token',
    timing: 'in_debate',
    tier_gate: 'common',
    mod_cost: 10,
    pu_cost: 5,
    ...overrides,
  };
}

describe('Seam #560-legacy | home.arsenal-shop-render.ts → modifiers-catalog', () => {

  let getModifierCatalog: typeof import('../../src/modifiers-catalog.ts').getModifierCatalog;
  let getEffect560fn: typeof import('../../src/modifiers-catalog.ts').getEffect;
  let getEndOfDebateEffects: typeof import('../../src/modifiers-catalog.ts').getEndOfDebateEffects;
  let getInDebateEffects: typeof import('../../src/modifiers-catalog.ts').getInDebateEffects;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    mockSafeRpc560.mockReset();

    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      showToast: vi.fn(),
      friendlyError: vi.fn(),
      FEATURES: {},
    }));

    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_modifier_catalog: vi.fn(),
    }));

    const mod = await import('../../src/modifiers-catalog.ts');
    getModifierCatalog = mod.getModifierCatalog;
    getEffect560fn = mod.getEffect;
    getEndOfDebateEffects = mod.getEndOfDebateEffects;
    getInDebateEffects = mod.getInDebateEffects;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // TC560-1: ARCH — home.arsenal-shop.ts imports getModifierCatalog from modifiers-catalog
  it('TC560-1: home.arsenal-shop.ts imports getModifierCatalog from modifiers-catalog (ARCH)', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const source = readFileSync(resolve('src/pages/home.arsenal-shop.ts'), 'utf8');
    const importLines = source.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = importLines.some((l: string) =>
      l.includes('getModifierCatalog') && l.includes('modifiers-catalog'),
    );
    expect(hasImport).toBe(true);
  });

  // TC560-2: getModifierCatalog resolves data from safeRpc result
  it('TC560-2: getModifierCatalog returns data when safeRpc succeeds', async () => {
    const effects = [makeEffect560({ id: 'cat-1', name: 'Effect One' })];
    mockSafeRpc560.mockResolvedValueOnce({ data: effects, error: null });

    const result = await getModifierCatalog();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cat-1');
    expect(result[0].name).toBe('Effect One');
  });

  // TC560-3: second call within 60-minute TTL returns cached data without re-calling safeRpc
  it('TC560-3: second call within TTL returns cached data without another safeRpc call', async () => {
    const effects = [makeEffect560({ id: 'cached-eff' })];
    mockSafeRpc560.mockResolvedValueOnce({ data: effects, error: null });

    const first = await getModifierCatalog();
    const second = await getModifierCatalog();

    expect(mockSafeRpc560).toHaveBeenCalledTimes(1);
    expect(second).toBe(first); // same reference — cache hit
  });

  // TC560-4: getModifierCatalog returns empty array on RPC error with no prior cache
  it('TC560-4: getModifierCatalog returns [] on RPC error when no prior cache exists', async () => {
    mockSafeRpc560.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const result = await getModifierCatalog();
    expect(result).toEqual([]);
  });

  // TC560-5: getEffect returns matching effect by id from catalog cache
  it('TC560-5: getEffect returns the matching effect by id', async () => {
    const effects = [
      makeEffect560({ id: 'find-me', name: 'Target Effect' }),
      makeEffect560({ id: 'other', name: 'Other' }),
    ];
    mockSafeRpc560.mockResolvedValueOnce({ data: effects, error: null });

    const found = await getEffect560fn('find-me');
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Target Effect');
  });

  // TC560-6: getEffect returns null for unknown id
  it('TC560-6: getEffect returns null for an unknown effect id', async () => {
    const effects = [makeEffect560({ id: 'real-id' })];
    mockSafeRpc560.mockResolvedValueOnce({ data: effects, error: null });

    const found = await getEffect560fn('no-such-id');
    expect(found).toBeNull();
  });

  // TC560-7: timing helpers filter catalog by bucket
  it('TC560-7: getEndOfDebateEffects and getInDebateEffects filter by timing bucket', async () => {
    const inDebate = makeEffect560({ id: 'in-1', timing: 'in_debate' });
    const endOf = makeEffect560({ id: 'end-1', timing: 'end_of_debate' });
    mockSafeRpc560.mockResolvedValue({ data: [inDebate, endOf], error: null });

    const endResults = await getEndOfDebateEffects();
    expect(endResults.every(e => e.timing === 'end_of_debate')).toBe(true);
    expect(endResults.some(e => e.id === 'end-1')).toBe(true);
    expect(endResults.some(e => e.id === 'in-1')).toBe(false);

    const inResults = await getInDebateEffects();
    expect(inResults.every(e => e.timing === 'in_debate')).toBe(true);
    expect(inResults.some(e => e.id === 'in-1')).toBe(true);
    expect(inResults.some(e => e.id === 'end-1')).toBe(false);
  });

});
