/**
 * Integration tests — home.arsenal-shop.ts → modifiers-catalog.ts
 * SEAM: #512
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ARCH filter — imports from source files
// src/pages/home.arsenal-shop.ts:
//   from '../modifiers-catalog.ts'
//   from './home.arsenal-shop-render.ts'
//   from './home.arsenal-shop-types.ts'
// src/modifiers-catalog.ts:
//   from './auth.ts'
//   from './contracts/rpc-schemas.ts'
//   from './modifiers.ts'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeCatalogItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'effect-001',
    name: 'Time Warp',
    description: 'Extend your speaking time',
    timing: 'in_debate',
    category: 'time',
    rarity: 'common',
    cost: 100,
    ...overrides,
  };
}

// ── Suite A: modifiers-catalog.ts ─────────────────────────────────────────

describe('modifiers-catalog — getModifierCatalog', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'Date'] });
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('TC4 — returns cached result without calling safeRpc a second time within TTL', async () => {
    const mockItems = [makeCatalogItem()];

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
    }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_modifier_catalog: {},
    }));
    vi.doMock('../../src/modifiers.ts', () => ({}));

    const { getModifierCatalog } = await import('../../src/modifiers-catalog.ts');
    const { safeRpc } = await import('../../src/auth.ts');

    await getModifierCatalog(); // first call — populates cache
    await getModifierCatalog(); // second call — should hit cache

    expect(safeRpc).toHaveBeenCalledTimes(1);
  });

  it('TC5 — re-fetches via safeRpc after 60-minute TTL expires', async () => {
    const mockItems = [makeCatalogItem()];
    const safeRpcMock = vi.fn().mockResolvedValue({ data: mockItems, error: null });

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: safeRpcMock,
    }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_modifier_catalog: {},
    }));
    vi.doMock('../../src/modifiers.ts', () => ({}));

    const baseTime = new Date('2026-01-01T00:00:00Z');
    vi.setSystemTime(baseTime);

    const { getModifierCatalog } = await import('../../src/modifiers-catalog.ts');

    await getModifierCatalog(); // first call — populates cache at t=0
    expect(safeRpcMock).toHaveBeenCalledTimes(1);

    // Advance system clock past the 60-minute TTL
    vi.setSystemTime(new Date(baseTime.getTime() + 61 * 60 * 1000));

    await getModifierCatalog(); // should re-fetch because TTL expired
    expect(safeRpcMock).toHaveBeenCalledTimes(2);
  });

  it('TC4b — returns empty array (not throws) when safeRpc returns an error and cache is cold', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: new Error('network error') }),
    }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_modifier_catalog: {},
    }));
    vi.doMock('../../src/modifiers.ts', () => ({}));

    const { getModifierCatalog } = await import('../../src/modifiers-catalog.ts');
    const result = await getModifierCatalog();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

describe('modifiers-catalog — getEffect', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('TC6a — getEffect returns matching item by id', async () => {
    const items = [
      makeCatalogItem({ id: 'e-001' }),
      makeCatalogItem({ id: 'e-002', name: 'Silence' }),
    ];

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: items, error: null }),
    }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_modifier_catalog: {},
    }));
    vi.doMock('../../src/modifiers.ts', () => ({}));

    const { getEffect } = await import('../../src/modifiers-catalog.ts');
    const result = await getEffect('e-002');

    expect(result).not.toBeNull();
    expect(result?.name).toBe('Silence');
  });

  it('TC6b — getEffect returns null for unknown id', async () => {
    const items = [makeCatalogItem({ id: 'e-001' })];

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: items, error: null }),
    }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_modifier_catalog: {},
    }));
    vi.doMock('../../src/modifiers.ts', () => ({}));

    const { getEffect } = await import('../../src/modifiers-catalog.ts');
    const result = await getEffect('no-such-id');

    expect(result).toBeNull();
  });
});

describe('modifiers-catalog — timing filters', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('TC7a — getEndOfDebateEffects returns only end_of_debate items', async () => {
    const items = [
      makeCatalogItem({ id: 'e-001', timing: 'in_debate' }),
      makeCatalogItem({ id: 'e-002', timing: 'end_of_debate' }),
      makeCatalogItem({ id: 'e-003', timing: 'end_of_debate' }),
    ];

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: items, error: null }),
    }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_modifier_catalog: {},
    }));
    vi.doMock('../../src/modifiers.ts', () => ({}));

    const { getEndOfDebateEffects } = await import('../../src/modifiers-catalog.ts');
    const result = await getEndOfDebateEffects();

    expect(result.every(e => e.timing === 'end_of_debate')).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('TC7b — getInDebateEffects returns only in_debate items', async () => {
    const items = [
      makeCatalogItem({ id: 'e-001', timing: 'in_debate' }),
      makeCatalogItem({ id: 'e-002', timing: 'end_of_debate' }),
    ];

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: items, error: null }),
    }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_modifier_catalog: {},
    }));
    vi.doMock('../../src/modifiers.ts', () => ({}));

    const { getInDebateEffects } = await import('../../src/modifiers-catalog.ts');
    const result = await getInDebateEffects();

    expect(result.every(e => e.timing === 'in_debate')).toBe(true);
    expect(result).toHaveLength(1);
  });
});

// ── Suite B: home.arsenal-shop.ts ─────────────────────────────────────────

describe('home.arsenal-shop — loadShopScreen', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('TC1 — shows loading state then calls renderShop on success', async () => {
    const mockCatalog = [makeCatalogItem()];
    const renderShopMock = vi.fn();

    vi.doMock('../../src/modifiers-catalog.ts', () => ({
      getModifierCatalog: vi.fn().mockResolvedValue(mockCatalog),
    }));
    vi.doMock('../../src/pages/home.arsenal-shop-render.ts', () => ({
      renderShop: renderShopMock,
    }));
    vi.doMock('../../src/pages/home.arsenal-shop-types.ts', () => ({}));

    const { loadShopScreen } = await import('../../src/pages/home.arsenal-shop.ts');

    const container = document.createElement('div');
    const promise = loadShopScreen(container);

    // Loading state is set synchronously before awaiting catalog
    expect(container.innerHTML).toContain('Loading');

    await promise;

    expect(renderShopMock).toHaveBeenCalledTimes(1);
    expect(renderShopMock).toHaveBeenCalledWith(
      container,
      expect.objectContaining({ catalog: mockCatalog }),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('TC2 — renders error message when getModifierCatalog throws', async () => {
    vi.doMock('../../src/modifiers-catalog.ts', () => ({
      getModifierCatalog: vi.fn().mockRejectedValue(new Error('fetch failed')),
    }));
    vi.doMock('../../src/pages/home.arsenal-shop-render.ts', () => ({
      renderShop: vi.fn(),
    }));
    vi.doMock('../../src/pages/home.arsenal-shop-types.ts', () => ({}));

    const { loadShopScreen } = await import('../../src/pages/home.arsenal-shop.ts');

    const container = document.createElement('div');
    await loadShopScreen(container);

    expect(container.innerHTML).toContain('Failed to load shop');
  });
});

describe('home.arsenal-shop — cleanupShopScreen', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('TC3 — resets filter state back to defaults after cleanup', async () => {
    const mockCatalog = [makeCatalogItem()];
    const renderShopMock = vi.fn();

    vi.doMock('../../src/modifiers-catalog.ts', () => ({
      getModifierCatalog: vi.fn().mockResolvedValue(mockCatalog),
    }));
    vi.doMock('../../src/pages/home.arsenal-shop-render.ts', () => ({
      renderShop: renderShopMock,
    }));
    vi.doMock('../../src/pages/home.arsenal-shop-types.ts', () => ({}));

    const { loadShopScreen, cleanupShopScreen } = await import('../../src/pages/home.arsenal-shop.ts');

    const container = document.createElement('div');
    await loadShopScreen(container);

    // Capture state passed to renderShop after load
    const stateAfterLoad = renderShopMock.mock.calls[0][1];
    expect(stateAfterLoad.productType).toBe('powerup');
    expect(stateAfterLoad.categoryFilter).toBe('all');
    expect(stateAfterLoad.rarityFilter).toBe('all');
    expect(stateAfterLoad.timingFilter).toBe('all');
    expect(stateAfterLoad.affordableOnly).toBe(false);

    cleanupShopScreen();

    // After cleanup, loading again should call renderShop with fresh defaults
    renderShopMock.mockClear();
    await loadShopScreen(container);
    const stateAfterReinit = renderShopMock.mock.calls[0][1];
    expect(stateAfterReinit.productType).toBe('powerup');
    expect(stateAfterReinit.categoryFilter).toBe('all');
  });
});

// ── Suite C: home.arsenal-shop-render.ts (SEAM #556) ─────────────────────

/**
 * ARCH filter — imports from home.arsenal-shop-render.ts:
 *   from '../modifiers.ts'          (types only)
 *   from './home.arsenal-shop-types.ts' (types only)
 *   from '../modifiers-render.ts'
 *   from '../config.ts'
 *   from './home.arsenal-shop-filters.ts'
 *   from './home.arsenal-shop-wiring.ts'
 */

function makeEffect(overrides: Record<string, unknown> = {}) {
  return {
    id: 'eff-001',
    effect_num: 1,
    name: 'Time Warp',
    description: 'Extend your speaking time by 10 seconds.',
    category: 'point' as const,
    timing: 'in_debate' as const,
    tier_gate: 'common' as const,
    mod_cost: 50,
    pu_cost: 20,
    ...overrides,
  };
}

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    catalog:        [] as ReturnType<typeof makeEffect>[],
    productType:    'powerup' as const,
    categoryFilter: 'all' as const,
    rarityFilter:   'all' as const,
    timingFilter:   'all' as const,
    affordableOnly: false,
    tokenBalance:   0,
    ...overrides,
  };
}

function setupRenderMocks(wireShopEventsMock = vi.fn()) {
  // Explicitly unmock the render module so Suite B's stub factory does not persist
  vi.doUnmock('../../src/pages/home.arsenal-shop-render.ts');
  // Mock all transitive deps so the real module loads cleanly in jsdom
  vi.doMock('../../src/modifiers.ts', () => ({}));
  vi.doMock('../../src/pages/home.arsenal-shop-types.ts', () => ({}));
  vi.doMock('../../src/modifiers-render.ts', () => ({
    renderEffectCard: (e: { id: string; name: string }) =>
      `<div class="mod-effect-card" data-effect-id="${e.id}">${e.name}</div>`,
    tierLabel:     (t: string) => t,
    timingLabel:   (t: string) => t,
    categoryLabel: (c: string) => c,
    rarityClass:   (t: string) => t,
  }));
  vi.doMock('../../src/pages/home.arsenal-shop-filters.ts', () => ({
    applyFilters: (catalog: unknown[], state: { categoryFilter: string; rarityFilter: string; timingFilter: string; affordableOnly: boolean }) => {
      return catalog.filter((e: unknown) => {
        const eff = e as { category: string; tier_gate: string; timing: string; mod_cost: number; pu_cost: number };
        if (state.categoryFilter !== 'all' && eff.category !== state.categoryFilter) return false;
        if (state.rarityFilter   !== 'all' && eff.tier_gate !== state.rarityFilter)  return false;
        if (state.timingFilter   !== 'all' && eff.timing    !== state.timingFilter)  return false;
        return true;
      });
    },
  }));
  vi.doMock('../../src/pages/home.arsenal-shop-wiring.ts', () => ({
    wireShopEvents: wireShopEventsMock,
  }));
}

describe('home.arsenal-shop-render — renderShop HTML structure', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('TC-R1 — renders .shop-wrap root element into container', async () => {
    setupRenderMocks();
    const { renderShop } = await import('../../src/pages/home.arsenal-shop-render.ts');
    const container = document.createElement('div');
    const state = makeState({ catalog: [] });

    renderShop(container, state as never, vi.fn(), vi.fn());

    expect(container.querySelector('.shop-wrap')).not.toBeNull();
  });

  it('TC-R2 — displays token balance in #shop-balance-display', async () => {
    setupRenderMocks();
    const { renderShop } = await import('../../src/pages/home.arsenal-shop-render.ts');
    const container = document.createElement('div');
    const state = makeState({ catalog: [], tokenBalance: 250 });

    renderShop(container, state as never, vi.fn(), vi.fn());

    const balanceEl = container.querySelector('#shop-balance-display');
    expect(balanceEl).not.toBeNull();
    expect(balanceEl!.textContent).toBe('250');
  });

  it('TC-R3 — marks active product type toggle with "active" class', async () => {
    setupRenderMocks();
    const { renderShop } = await import('../../src/pages/home.arsenal-shop-render.ts');
    const container = document.createElement('div');
    const state = makeState({ catalog: [], productType: 'modifier' });

    renderShop(container, state as never, vi.fn(), vi.fn());

    const modifierBtn = container.querySelector<HTMLButtonElement>('[data-product="modifier"]');
    const powerupBtn  = container.querySelector<HTMLButtonElement>('[data-product="powerup"]');

    expect(modifierBtn).not.toBeNull();
    expect(powerupBtn).not.toBeNull();
    expect(modifierBtn!.classList.contains('active')).toBe(true);
    expect(powerupBtn!.classList.contains('active')).toBe(false);
  });

  it('TC-R4 — renders .shop-empty when no items pass filters', async () => {
    setupRenderMocks();
    const { renderShop } = await import('../../src/pages/home.arsenal-shop-render.ts');
    const container = document.createElement('div');
    // catalog has 'point' items but categoryFilter is 'token' → 0 results
    const state = makeState({
      catalog:        [makeEffect({ category: 'point' })],
      categoryFilter: 'token',
    });

    renderShop(container, state as never, vi.fn(), vi.fn());

    expect(container.querySelector('.shop-empty')).not.toBeNull();
    expect(container.querySelector('.mod-effect-card')).toBeNull();
  });

  it('TC-R5 — renders .mod-effect-card for each item that passes filters', async () => {
    setupRenderMocks();
    const { renderShop } = await import('../../src/pages/home.arsenal-shop-render.ts');
    const container = document.createElement('div');
    const state = makeState({
      catalog: [
        makeEffect({ id: 'e-001' }),
        makeEffect({ id: 'e-002', name: 'Silence' }),
      ],
    });

    renderShop(container, state as never, vi.fn(), vi.fn());

    const cards = container.querySelectorAll('.mod-effect-card');
    expect(cards.length).toBe(2);
  });

  it('TC-R6 — result count text reflects filtered item count', async () => {
    setupRenderMocks();
    const { renderShop } = await import('../../src/pages/home.arsenal-shop-render.ts');
    const container = document.createElement('div');
    const state = makeState({
      catalog: [
        makeEffect({ id: 'e-001' }),
        makeEffect({ id: 'e-002' }),
        makeEffect({ id: 'e-003' }),
      ],
    });

    renderShop(container, state as never, vi.fn(), vi.fn());

    const countEl = container.querySelector('.shop-result-count');
    expect(countEl).not.toBeNull();
    expect(countEl!.textContent).toContain('3');
  });

  it('TC-R7 — wireShopEvents is called with container, state, and callback functions', async () => {
    const wireShopEventsMock = vi.fn();
    setupRenderMocks(wireShopEventsMock);
    const { renderShop } = await import('../../src/pages/home.arsenal-shop-render.ts');
    const container = document.createElement('div');
    const state = makeState({ catalog: [] });
    const onRerender = vi.fn();
    const onSheetOpen = vi.fn();

    renderShop(container, state as never, onRerender, onSheetOpen);

    expect(wireShopEventsMock).toHaveBeenCalledTimes(1);
    expect(wireShopEventsMock).toHaveBeenCalledWith(
      container,
      state,
      onRerender,
      onSheetOpen,
    );
  });
});
