// ============================================================
// MODIFIERS HANDLERS — tests/modifiers-handlers.test.ts
// Source: src/modifiers-handlers.ts
//
// CLASSIFICATION:
//   handleBuyModifier()  — Orchestration (RPC + toast) → Integration test
//   handleBuyPowerup()   — Orchestration (RPC + toast) → Integration test
//   handleEquip()        — Orchestration (RPC + toast) → Integration test
//
// IMPORTS:
//   { showToast }                                    from './config.ts'
//   { buyModifier, buyPowerup, equipPowerupForDebate } from './modifiers-rpc.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockShowToast = vi.hoisted(() => vi.fn());
const mockBuyModifier = vi.hoisted(() => vi.fn());
const mockBuyPowerup = vi.hoisted(() => vi.fn());
const mockEquipPowerupForDebate = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

vi.mock('../src/modifiers-rpc.ts', () => ({
  buyModifier: mockBuyModifier,
  buyPowerup: mockBuyPowerup,
  equipPowerupForDebate: mockEquipPowerupForDebate,
}));

import { handleBuyModifier, handleBuyPowerup, handleEquip } from '../src/modifiers-handlers.ts';

beforeEach(() => {
  mockShowToast.mockReset();
  mockBuyModifier.mockReset();
  mockBuyPowerup.mockReset();
  mockEquipPowerupForDebate.mockReset();
});

// ── handleBuyModifier ─────────────────────────────────────────

describe('TC1 — handleBuyModifier: calls buyModifier with effectId', () => {
  it('invokes buyModifier with the correct effect id', async () => {
    mockBuyModifier.mockResolvedValue({ success: true });

    await handleBuyModifier('effect-shield', 'Shield');

    expect(mockBuyModifier).toHaveBeenCalledWith('effect-shield');
  });
});

describe('TC2 — handleBuyModifier: success shows success toast and returns true', () => {
  it('shows success toast with effect name and returns true', async () => {
    mockBuyModifier.mockResolvedValue({ success: true });

    const result = await handleBuyModifier('effect-x', 'Iron Will');

    expect(result).toBe(true);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Iron Will'),
      'success'
    );
  });
});

describe('TC3 — handleBuyModifier: failure shows error toast and returns false', () => {
  it('shows error toast with error message and returns false', async () => {
    mockBuyModifier.mockResolvedValue({ success: false, error: 'Not enough tokens' });

    const result = await handleBuyModifier('effect-y', 'Speed');

    expect(result).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('Not enough tokens', 'error');
  });
});

describe('TC4 — handleBuyModifier: fallback error toast when no error message', () => {
  it('shows "Purchase failed" when no error message provided', async () => {
    mockBuyModifier.mockResolvedValue({ success: false });

    await handleBuyModifier('effect-z', 'Boost');

    expect(mockShowToast).toHaveBeenCalledWith('Purchase failed', 'error');
  });
});

// ── handleBuyPowerup ──────────────────────────────────────────

describe('TC5 — handleBuyPowerup: calls buyPowerup with effectId and quantity', () => {
  it('invokes buyPowerup with correct params', async () => {
    mockBuyPowerup.mockResolvedValue({ success: true });

    await handleBuyPowerup('effect-boost', 'Boost', 3);

    expect(mockBuyPowerup).toHaveBeenCalledWith('effect-boost', 3);
  });
});

describe('TC6 — handleBuyPowerup: success shows toast with quantity', () => {
  it('includes quantity in success toast message', async () => {
    mockBuyPowerup.mockResolvedValue({ success: true });

    await handleBuyPowerup('effect-q', 'Quick Flame', 2);

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('×2'),
      'success'
    );
  });
});

describe('TC7 — handleBuyPowerup: failure returns false', () => {
  it('returns false on failure', async () => {
    mockBuyPowerup.mockResolvedValue({ success: false, error: 'Sold out' });

    const result = await handleBuyPowerup('eff', 'Eff', 1);

    expect(result).toBe(false);
  });
});

// ── handleEquip ───────────────────────────────────────────────

describe('TC8 — handleEquip: calls equipPowerupForDebate', () => {
  it('invokes equipPowerupForDebate with debate and effect ids', async () => {
    mockEquipPowerupForDebate.mockResolvedValue({ success: true, slots_used: 1 });

    await handleEquip('debate-1', 'effect-e', 'Effect E');

    expect(mockEquipPowerupForDebate).toHaveBeenCalledWith('debate-1', 'effect-e');
  });
});

describe('TC9 — handleEquip: success shows slot count in toast', () => {
  it('includes slots_used in success toast message', async () => {
    mockEquipPowerupForDebate.mockResolvedValue({ success: true, slots_used: 2 });

    await handleEquip('d-1', 'e-1', 'Quick Wit');

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('2/3'),
      'success'
    );
  });
});

describe('TC10 — handleEquip: failure shows error toast and returns false', () => {
  it('returns false and shows error toast on failure', async () => {
    mockEquipPowerupForDebate.mockResolvedValue({ success: false, error: 'Slots full' });

    const result = await handleEquip('d-2', 'e-2', 'Speed');

    expect(result).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith('Slots full', 'error');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/modifiers-handlers.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts', './modifiers-rpc.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/modifiers-handlers.ts'),
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
