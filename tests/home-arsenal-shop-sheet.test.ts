// ============================================================
// HOME ARSENAL SHOP SHEET — tests/home-arsenal-shop-sheet.test.ts
// Source: src/pages/home.arsenal-shop-sheet.ts
//
// CLASSIFICATION:
//   openBottomSheet(): DOM behavioral — appends overlay, returns close fn
//
// IMPORTS:
//   { handleBuyModifier, handleBuyPowerup } from '../modifiers-handlers.ts'
//   { tierLabel, categoryLabel, rarityClass } from '../modifiers-render.ts'
//   { escapeHTML }                           from '../config.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockHandleBuyModifier = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const mockHandleBuyPowerup  = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const mockTierLabel         = vi.hoisted(() => vi.fn((t: string) => t ?? 'Common'));
const mockCategoryLabel     = vi.hoisted(() => vi.fn((c: string) => c ?? 'point'));
const mockRarityClass       = vi.hoisted(() => vi.fn((t: string) => t ?? 'common'));

vi.mock('../src/modifiers-handlers.ts', () => ({
  handleBuyModifier: mockHandleBuyModifier,
  handleBuyPowerup:  mockHandleBuyPowerup,
}));

vi.mock('../src/modifiers-render.ts', () => ({
  tierLabel:     mockTierLabel,
  categoryLabel: mockCategoryLabel,
  rarityClass:   mockRarityClass,
  renderEffectCard: vi.fn(() => '<div class="mod-effect-card"></div>'),
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: (s: string) => s,
  showToast: vi.fn(),
  FEATURES: {},
}));

import { openBottomSheet } from '../src/pages/home.arsenal-shop-sheet.ts';

// ── Helpers ───────────────────────────────────────────────────

const makeEffect = (overrides = {}) => ({
  id: 'e1',
  name: 'Speed Surge',
  description: 'Boost points',
  category: 'point' as const,
  timing: 'in_debate' as const,
  tier_gate: 'common' as const,
  mod_cost: 100,
  pu_cost: 50,
  rarity: 'common' as const,
  ...overrides,
});

const makeState = (overrides = {}) => ({
  productType: 'modifier' as const,
  tokenBalance: 500,
  catalog: [],
  categoryFilter: 'all' as const,
  rarityFilter: 'all' as const,
  timingFilter: 'all' as const,
  affordableOnly: false,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — openBottomSheet appends overlay to document.body', () => {
  it('adds .bottom-sheet-overlay to body', () => {
    openBottomSheet(makeEffect(), makeState(), vi.fn());
    expect(document.body.querySelector('.bottom-sheet-overlay')).not.toBeNull();
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — openBottomSheet renders effect name in sheet title', () => {
  it('sheet-title contains the effect name', () => {
    openBottomSheet(makeEffect({ name: 'Mystic Surge' }), makeState(), vi.fn());
    expect(document.body.querySelector('.sheet-title')?.textContent).toBe('Mystic Surge');
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — returned close fn removes overlay from body', () => {
  it('overlay is removed after calling close()', () => {
    const close = openBottomSheet(makeEffect(), makeState(), vi.fn());
    close();
    expect(document.body.querySelector('.bottom-sheet-overlay')).toBeNull();
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — cancel button closes the sheet', () => {
  it('clicking #sheet-cancel removes the overlay', () => {
    openBottomSheet(makeEffect(), makeState(), vi.fn());
    const cancelBtn = document.getElementById('sheet-cancel') as HTMLButtonElement;
    cancelBtn.click();
    expect(document.body.querySelector('.bottom-sheet-overlay')).toBeNull();
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — clicking overlay backdrop closes the sheet', () => {
  it('clicking directly on the overlay removes it', () => {
    openBottomSheet(makeEffect(), makeState(), vi.fn());
    const overlay = document.body.querySelector<HTMLElement>('.bottom-sheet-overlay')!;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // backdrop click only fires when e.target === overlay
    // We set it as target by dispatching directly on overlay
    expect(document.body.querySelector('.bottom-sheet-overlay')).toBeNull();
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — confirm button disabled when balance < cost', () => {
  it('btn.disabled is true when tokenBalance < mod_cost', () => {
    openBottomSheet(makeEffect({ mod_cost: 300 }), makeState({ tokenBalance: 50 }), vi.fn());
    const btn = document.getElementById('sheet-confirm') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — confirm button enabled when balance >= cost', () => {
  it('btn.disabled is false when tokenBalance >= mod_cost', () => {
    openBottomSheet(makeEffect({ mod_cost: 100 }), makeState({ tokenBalance: 200 }), vi.fn());
    const btn = document.getElementById('sheet-confirm') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — confirm button calls handleBuyModifier for modifier productType', () => {
  it('calls handleBuyModifier with effect id and name on click', async () => {
    openBottomSheet(makeEffect({ id: 'e1', name: 'Surge' }), makeState({ productType: 'modifier', tokenBalance: 999 }), vi.fn());
    const btn = document.getElementById('sheet-confirm') as HTMLButtonElement;
    btn.click();
    await vi.waitFor(() => expect(mockHandleBuyModifier).toHaveBeenCalledWith('e1', 'Surge'));
  });
});

// ── TC9 ───────────────────────────────────────────────────────

describe('TC9 — confirm button calls handleBuyPowerup for powerup productType', () => {
  it('calls handleBuyPowerup with effect id and name on click', async () => {
    openBottomSheet(makeEffect({ id: 'e2', name: 'Flash' }), makeState({ productType: 'powerup', tokenBalance: 999 }), vi.fn());
    const btn = document.getElementById('sheet-confirm') as HTMLButtonElement;
    btn.click();
    await vi.waitFor(() => expect(mockHandleBuyPowerup).toHaveBeenCalledWith('e2', 'Flash'));
  });
});

// ── TC10 ──────────────────────────────────────────────────────

describe('TC10 — onBuySuccess callback called after successful purchase', () => {
  it('invokes onBuySuccess when handleBuyModifier resolves true', async () => {
    const onBuySuccess = vi.fn();
    mockHandleBuyModifier.mockResolvedValue(true);
    openBottomSheet(makeEffect(), makeState({ tokenBalance: 999 }), onBuySuccess);
    const btn = document.getElementById('sheet-confirm') as HTMLButtonElement;
    btn.click();
    await vi.waitFor(() => expect(onBuySuccess).toHaveBeenCalled());
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/home.arsenal-shop-sheet.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../modifiers.ts',
      './home.arsenal-shop-types.ts',
      '../modifiers-handlers.ts',
      '../modifiers-render.ts',
      '../config.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.arsenal-shop-sheet.ts'),
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
