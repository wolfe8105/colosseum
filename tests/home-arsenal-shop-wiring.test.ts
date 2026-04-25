// ============================================================
// HOME ARSENAL SHOP WIRING — tests/home-arsenal-shop-wiring.test.ts
// Source: src/pages/home.arsenal-shop-wiring.ts
//
// CLASSIFICATION:
//   wireShopEvents(): DOM event wiring — binds all filter + card interactions
//
// IMPORTS:
//   { openBottomSheet } from './home.arsenal-shop-sheet.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockOpenBottomSheet = vi.hoisted(() => vi.fn(() => vi.fn()));

vi.mock('../src/pages/home.arsenal-shop-sheet.ts', () => ({
  openBottomSheet: mockOpenBottomSheet,
}));

// type-only imports — no mock needed
vi.mock('../src/modifiers.ts', () => ({}));
vi.mock('../src/pages/home.arsenal-shop-types.ts', () => ({}));

import { wireShopEvents } from '../src/pages/home.arsenal-shop-wiring.ts';

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

const makeState = () => ({
  productType: 'modifier' as const,
  tokenBalance: 500,
  catalog: [makeEffect('e1')],
  categoryFilter: 'all' as const,
  rarityFilter: 'all' as const,
  timingFilter: 'all' as const,
  affordableOnly: false,
});

function buildShopDOM(container: HTMLElement) {
  container.innerHTML = `
    <button data-product="powerup">Power-Ups</button>
    <button data-product="modifier">Modifiers</button>
    <button data-cat="point">Point</button>
    <button data-cat="all">All</button>
    <button data-rarity="rare">Rare</button>
    <button data-rarity="all">All</button>
    <button data-timing="in_debate">In-Debate</button>
    <button data-timing="end_of_debate">Post-Match</button>
    <button data-afford="1">Can Afford</button>
    <div class="mod-effect-card" data-effect-id="e1">
      <button class="mod-buy-btn" data-effect-id="e1">Buy</button>
    </div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — wireShopEvents: product toggle mutates state.productType and calls onStateChange', () => {
  it('sets state.productType to "powerup" and calls onStateChange', () => {
    const container = document.createElement('div');
    buildShopDOM(container);
    const state = makeState();
    const onStateChange = vi.fn();

    wireShopEvents(container, state, onStateChange, vi.fn());
    (container.querySelector('[data-product="powerup"]') as HTMLButtonElement).click();

    expect(state.productType).toBe('powerup');
    expect(onStateChange).toHaveBeenCalled();
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — wireShopEvents: category chip sets categoryFilter', () => {
  it('sets state.categoryFilter and calls onStateChange', () => {
    const container = document.createElement('div');
    buildShopDOM(container);
    const state = makeState();
    const onStateChange = vi.fn();

    wireShopEvents(container, state, onStateChange, vi.fn());
    (container.querySelector('[data-cat="point"]') as HTMLButtonElement).click();

    expect(state.categoryFilter).toBe('point');
    expect(onStateChange).toHaveBeenCalled();
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — wireShopEvents: rarity chip sets rarityFilter', () => {
  it('sets state.rarityFilter and calls onStateChange', () => {
    const container = document.createElement('div');
    buildShopDOM(container);
    const state = makeState();
    const onStateChange = vi.fn();

    wireShopEvents(container, state, onStateChange, vi.fn());
    (container.querySelector('[data-rarity="rare"]') as HTMLButtonElement).click();

    expect(state.rarityFilter).toBe('rare');
    expect(onStateChange).toHaveBeenCalled();
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — wireShopEvents: timing chip sets timingFilter', () => {
  it('sets timingFilter to "in_debate" on first click', () => {
    const container = document.createElement('div');
    buildShopDOM(container);
    const state = makeState();
    const onStateChange = vi.fn();

    wireShopEvents(container, state, onStateChange, vi.fn());
    (container.querySelector('[data-timing="in_debate"]') as HTMLButtonElement).click();

    expect(state.timingFilter).toBe('in_debate');
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — wireShopEvents: clicking active timing chip resets to "all"', () => {
  it('toggles timingFilter back to "all" when clicking active chip', () => {
    const container = document.createElement('div');
    buildShopDOM(container);
    const state = { ...makeState(), timingFilter: 'in_debate' as const };
    const onStateChange = vi.fn();

    wireShopEvents(container, state as ReturnType<typeof makeState>, onStateChange, vi.fn());
    (container.querySelector('[data-timing="in_debate"]') as HTMLButtonElement).click();

    expect((state as ReturnType<typeof makeState>).timingFilter).toBe('all');
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — wireShopEvents: afford toggle flips state.affordableOnly', () => {
  it('flips affordableOnly from false to true', () => {
    const container = document.createElement('div');
    buildShopDOM(container);
    const state = makeState();
    const onStateChange = vi.fn();

    wireShopEvents(container, state, onStateChange, vi.fn());
    (container.querySelector('[data-afford]') as HTMLButtonElement).click();

    expect(state.affordableOnly).toBe(true);
    expect(onStateChange).toHaveBeenCalled();
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — wireShopEvents: card click (not buy btn) calls onSheetOpen', () => {
  it('calls onSheetOpen when clicking the card area', () => {
    const container = document.createElement('div');
    buildShopDOM(container);
    const state = makeState();
    const onSheetOpen = vi.fn();

    wireShopEvents(container, state, vi.fn(), onSheetOpen);
    (container.querySelector('.mod-effect-card') as HTMLElement).click();

    expect(onSheetOpen).toHaveBeenCalled();
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — wireShopEvents: buy button click calls onSheetOpen', () => {
  it('calls onSheetOpen when clicking .mod-buy-btn', () => {
    const container = document.createElement('div');
    buildShopDOM(container);
    const state = makeState();
    const onSheetOpen = vi.fn();

    wireShopEvents(container, state, vi.fn(), onSheetOpen);
    const buyBtn = container.querySelector<HTMLButtonElement>('.mod-buy-btn')!;
    buyBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSheetOpen).toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/home.arsenal-shop-wiring.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../modifiers.ts',
      './home.arsenal-shop-types.ts',
      './home.arsenal-shop-sheet.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.arsenal-shop-wiring.ts'),
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
