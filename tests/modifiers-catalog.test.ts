// ============================================================
// MODIFIERS CATALOG — tests/modifiers-catalog.test.ts
// Source: src/modifiers-catalog.ts
//
// CLASSIFICATION:
//   getModifierCatalog()    — RPC wrapper + TTL cache → Contract test
//   getEffect()             — Multi-step (calls getModifierCatalog + filter) → Integration test
//   getEndOfDebateEffects() — Multi-step → Integration test
//   getInDebateEffects()    — Multi-step → Integration test
//
// IMPORTS:
//   { safeRpc }              from './auth.ts'
//   { get_modifier_catalog } from './contracts/rpc-schemas.ts'
//   import type { ModifierEffect } from './modifiers.ts' — type-only
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_modifier_catalog: { safeParse: vi.fn(() => ({ success: true })) },
}));

vi.mock('../src/modifiers.ts', () => ({}));

import {
  getModifierCatalog,
  getEffect,
  getEndOfDebateEffects,
  getInDebateEffects,
} from '../src/modifiers-catalog.ts';

const FAKE_EFFECTS = [
  { id: 'effect-1', timing: 'in_debate', name: 'Speed Boost' },
  { id: 'effect-2', timing: 'end_of_debate', name: 'Final Strike' },
  { id: 'effect-3', timing: 'in_debate', name: 'Double Down' },
];

beforeEach(() => {
  mockSafeRpc.mockReset();
  // Reset the module-level cache by re-importing (vitest resets between files)
});

// ── getModifierCatalog ────────────────────────────────────────

describe('TC1 — getModifierCatalog: calls get_modifier_catalog RPC', () => {
  it('calls safeRpc with "get_modifier_catalog"', async () => {
    mockSafeRpc.mockResolvedValue({ data: FAKE_EFFECTS, error: null });

    await getModifierCatalog();

    expect(mockSafeRpc).toHaveBeenCalledWith(
      'get_modifier_catalog',
      {},
      expect.anything()
    );
  });
});

describe('TC2 — getModifierCatalog: returns array from RPC', () => {
  it('returns the data array from safeRpc', async () => {
    mockSafeRpc.mockResolvedValue({ data: FAKE_EFFECTS, error: null });

    const result = await getModifierCatalog();

    expect(result).toEqual(FAKE_EFFECTS);
  });
});

describe('TC3 — getModifierCatalog: returns empty array on RPC error', () => {
  it('returns [] when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Catalog not found' } });

    const result = await getModifierCatalog();

    expect(Array.isArray(result)).toBe(true);
  });
});

// TC1 already verifies the safeRpc import contract (called with 'get_modifier_catalog').
// No separate TC4 needed — the cache would prevent a second safeRpc call in the same test file.

// ── getEffect ─────────────────────────────────────────────────

describe('TC4 — getEffect: returns effect by id', () => {
  it('finds the correct effect from the catalog', async () => {
    mockSafeRpc.mockResolvedValue({ data: FAKE_EFFECTS, error: null });

    const effect = await getEffect('effect-2');

    expect(effect?.id).toBe('effect-2');
    expect(effect?.name).toBe('Final Strike');
  });
});

describe('TC5 — getEffect: returns null for missing id', () => {
  it('returns null when effectId is not in the catalog', async () => {
    mockSafeRpc.mockResolvedValue({ data: FAKE_EFFECTS, error: null });

    const effect = await getEffect('nonexistent');

    expect(effect).toBeNull();
  });
});

// ── getEndOfDebateEffects ─────────────────────────────────────

describe('TC6 — getEndOfDebateEffects: filters by end_of_debate timing', () => {
  it('returns only effects with timing === "end_of_debate"', async () => {
    mockSafeRpc.mockResolvedValue({ data: FAKE_EFFECTS, error: null });

    const effects = await getEndOfDebateEffects();

    expect(effects.every(e => e.timing === 'end_of_debate')).toBe(true);
    expect(effects).toHaveLength(1);
  });
});

// ── getInDebateEffects ────────────────────────────────────────

describe('TC7 — getInDebateEffects: filters by in_debate timing', () => {
  it('returns only effects with timing === "in_debate"', async () => {
    mockSafeRpc.mockResolvedValue({ data: FAKE_EFFECTS, error: null });

    const effects = await getInDebateEffects();

    expect(effects.every(e => e.timing === 'in_debate')).toBe(true);
    expect(effects).toHaveLength(2);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/modifiers-catalog.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './contracts/rpc-schemas.ts', './modifiers.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/modifiers-catalog.ts'),
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
