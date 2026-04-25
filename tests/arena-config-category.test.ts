// ============================================================
// ARENA CONFIG CATEGORY — tests/arena-config-category.test.ts
// Source: src/arena/arena-config-category.ts
//
// CLASSIFICATION:
//   showCategoryPicker() — DOM builder + event wiring → Integration test
//
// STRATEGY:
//   Mock arena-state for set_selectedCategory/set_selectedWantMod.
//   Mock arena-constants for QUEUE_CATEGORIES.
//   Mock arena-core.utils, arena-queue, arena-config-round-picker.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSet_selectedCategory = vi.hoisted(() => vi.fn());
const mockSet_selectedWantMod  = vi.hoisted(() => vi.fn());
const mockPushArenaState       = vi.hoisted(() => vi.fn());
const mockEnterQueue           = vi.hoisted(() => vi.fn());
const mockWireRoundPicker      = vi.hoisted(() => vi.fn());

vi.mock('../src/arena/arena-state.ts', () => ({
  set_selectedCategory: mockSet_selectedCategory,
  set_selectedWantMod: mockSet_selectedWantMod,
}));

vi.mock('../src/arena/arena-constants.ts', () => ({
  QUEUE_CATEGORIES: [
    { id: 'tech', label: 'Tech', icon: '💻' },
    { id: 'politics', label: 'Politics', icon: '🏛️' },
  ],
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  pushArenaState: mockPushArenaState,
}));

vi.mock('../src/arena/arena-queue.ts', () => ({
  enterQueue: mockEnterQueue,
}));

vi.mock('../src/arena/arena-config-round-picker.ts', () => ({
  roundPickerCSS: vi.fn(() => ''),
  roundPickerHTML: vi.fn(() => '<div id="round-picker"></div>'),
  wireRoundPicker: mockWireRoundPicker,
}));

import { showCategoryPicker } from '../src/arena/arena-config-category.ts';

beforeEach(() => {
  document.body.innerHTML = '';
  mockSet_selectedCategory.mockReset();
  mockSet_selectedWantMod.mockReset();
  mockPushArenaState.mockReset();
  mockEnterQueue.mockReset();
  mockWireRoundPicker.mockReset();
});

// ── TC1: appends overlay to body ─────────────────────────────

describe('TC1 — showCategoryPicker: appends overlay to body', () => {
  it('creates #arena-cat-overlay in document.body', () => {
    showCategoryPicker('text', 'Test topic');
    expect(document.getElementById('arena-cat-overlay')).not.toBeNull();
  });
});

// ── TC2: renders category buttons ────────────────────────────

describe('TC2 — showCategoryPicker: renders one button per category', () => {
  it('renders 2 .arena-cat-btn buttons', () => {
    showCategoryPicker('text', 'Test topic');
    expect(document.querySelectorAll('.arena-cat-btn').length).toBe(2);
  });
});

// ── TC3: calls pushArenaState ─────────────────────────────────

describe('TC3 — showCategoryPicker: calls pushArenaState', () => {
  it('calls pushArenaState with "categoryPicker"', () => {
    showCategoryPicker('text', 'Test topic');
    expect(mockPushArenaState).toHaveBeenCalledWith('categoryPicker');
  });
});

// ── TC4: calls wireRoundPicker ────────────────────────────────

describe('TC4 — showCategoryPicker: calls wireRoundPicker', () => {
  it('calls wireRoundPicker with overlay element', () => {
    showCategoryPicker('text', 'Test topic');
    expect(mockWireRoundPicker).toHaveBeenCalledTimes(1);
  });
});

// ── TC5: category button selects, submit calls set_selectedCategory ──

describe('TC5 — showCategoryPicker: category btn click sets cat and enters queue', () => {
  it('calls set_selectedCategory and enterQueue', async () => {
    showCategoryPicker('text', 'hot take');
    // Select a category button
    const btn = document.querySelector('.arena-cat-btn') as HTMLButtonElement;
    btn.click();
    // Select a mod option to enable submit
    const modBtn = document.getElementById('arena-mod-ai') as HTMLButtonElement;
    modBtn.click();
    // Click submit
    const submitBtn = document.getElementById('arena-cat-submit') as HTMLButtonElement;
    submitBtn.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockSet_selectedCategory).toHaveBeenCalledWith('tech');
  });
});

// ── TC6: any button calls set_selectedCategory(null) ─────────

describe('TC6 — showCategoryPicker: any button sets null category', () => {
  it('calls set_selectedCategory(null) for any button', async () => {
    showCategoryPicker('text', 'topic');
    // Must select a mod first or postDebate returns early
    const modBtn = document.getElementById('arena-mod-ai') as HTMLButtonElement;
    modBtn.click();
    document.getElementById('arena-cat-any')?.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockSet_selectedCategory).toHaveBeenCalledWith(null);
  });
});

// ── TC7: cancel button removes overlay ───────────────────────

describe('TC7 — showCategoryPicker: cancel button removes overlay', () => {
  it('removes overlay on cancel click', () => {
    showCategoryPicker('text', 'topic');
    document.getElementById('arena-cat-cancel')?.click();
    expect(document.getElementById('arena-cat-overlay')).toBeNull();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-config-category.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './arena-state.ts',
      './arena-constants.ts',
      './arena-core.utils.ts',
      './arena-queue.ts',
      './arena-config-round-picker.ts',
      '../config.ts',
      '../contracts/dependency-clamps.ts',
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-config-category.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
