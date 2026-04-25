// ============================================================
// HOME ARSENAL SHOP RENDER — tests/home-arsenal-shop-render.test.ts
// Source: src/pages/home.arsenal-shop-render.ts
//
// CLASSIFICATION:
//   renderShop(): DOM behavioral — populates container, calls wireShopEvents
//
// IMPORTS:
//   { renderEffectCard }  from '../modifiers-render.ts'
//   { escapeHTML }        from '../config.ts'
//   { applyFilters }      from './home.arsenal-shop-filters.ts'
//   { wireShopEvents }    from './home.arsenal-shop-wiring.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockRenderEffectCard = vi.hoisted(() => vi.fn((e: { id?: string }) => `<div class="mod-effect-card" data-effect-id="${e.id}"></div>`));
const mockApplyFilters     = vi.hoisted(() => vi.fn((catalog: unknown[]) => catalog));
const mockWireShopEvents   = vi.hoisted(() => vi.fn());

vi.mock('../src/modifiers-render.ts', () => ({
  renderEffectCard: mockRenderEffectCard,
  tierLabel:     vi.fn((t: string) => t),
  categoryLabel: vi.fn((c: string) => c),
  rarityClass:   vi.fn((t: string) => t),
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: (s: string) => s,
  showToast: vi.fn(),
  FEATURES: {},
}));

vi.mock('../src/pages/home.arsenal-shop-filters.ts', () => ({
  applyFilters: mockApplyFilters,
}));

vi.mock('../src/pages/home.arsenal-shop-wiring.ts', () => ({
  wireShopEvents: mockWireShopEvents,
}));

vi.mock('../src/modifiers.ts', () => ({}));
vi.mock('../src/pages/home.arsenal-shop-types.ts', () => ({}));

import { renderShop } from '../src/pages/home.arsenal-shop-render.ts';

// ── Helpers ───────────────────────────────────────────────────

const makeEffect = (id = 'e1') => ({
  id,
  name: `Effect ${id}`,
  description: 'desc',
  category: 'point' as const,
  timing: 'in_debate' as const,
  tier_gate: 'common' as const,
  mod_cost: 100,
  pu_cost: 50,
  rarity: 'common' as const,
});

const makeState = (overrides = {}) => ({
  productType: 'modifier' as const,
  tokenBalance: 500,
  catalog: [makeEffect()],
  categoryFilter: 'all' as const,
  rarityFilter: 'all' as const,
  timingFilter: 'all' as const,
  affordableOnly: false,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  mockApplyFilters.mockImplementation((catalog: unknown[]) => catalog);
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — renderShop injects .shop-wrap into container', () => {
  it('container has .shop-wrap after renderShop', () => {
    const container = document.createElement('div');
    renderShop(container, makeState(), vi.fn(), vi.fn());
    expect(container.querySelector('.shop-wrap')).not.toBeNull();
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — renderShop renders balance in #shop-balance-display', () => {
  it('shows tokenBalance value in the balance pill', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderShop(container, makeState({ tokenBalance: 750 }), vi.fn(), vi.fn());
    expect(document.getElementById('shop-balance-display')?.textContent).toBe('750');
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — renderShop calls applyFilters with catalog and state', () => {
  it('delegates filtering to applyFilters', () => {
    const container = document.createElement('div');
    const state = makeState();
    renderShop(container, state, vi.fn(), vi.fn());
    expect(mockApplyFilters).toHaveBeenCalledWith(state.catalog, state);
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — renderShop calls wireShopEvents after rendering', () => {
  it('wires events after populating container', () => {
    const container = document.createElement('div');
    const onRerender = vi.fn();
    const onSheetOpen = vi.fn();
    const state = makeState();
    renderShop(container, state, onRerender, onSheetOpen);
    expect(mockWireShopEvents).toHaveBeenCalledWith(container, state, onRerender, onSheetOpen);
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — renderShop shows empty message when no filtered results', () => {
  it('renders .shop-empty when applyFilters returns empty array', () => {
    mockApplyFilters.mockReturnValue([]);
    const container = document.createElement('div');
    renderShop(container, makeState(), vi.fn(), vi.fn());
    expect(container.querySelector('.shop-empty')).not.toBeNull();
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — renderShop calls renderEffectCard for each filtered item', () => {
  it('calls renderEffectCard once per filtered effect', () => {
    mockApplyFilters.mockReturnValue([makeEffect('e1'), makeEffect('e2')]);
    const container = document.createElement('div');
    renderShop(container, makeState(), vi.fn(), vi.fn());
    expect(mockRenderEffectCard).toHaveBeenCalledTimes(2);
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — renderShop shows result count', () => {
  it('.shop-result-count shows "N effects"', () => {
    mockApplyFilters.mockReturnValue([makeEffect('e1'), makeEffect('e2'), makeEffect('e3')]);
    const container = document.createElement('div');
    renderShop(container, makeState(), vi.fn(), vi.fn());
    expect(container.querySelector('.shop-result-count')?.textContent).toContain('3');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/home.arsenal-shop-render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../modifiers.ts',
      './home.arsenal-shop-types.ts',
      '../modifiers-render.ts',
      '../config.ts',
      './home.arsenal-shop-filters.ts',
      './home.arsenal-shop-wiring.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.arsenal-shop-render.ts'),
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
