/**
 * Integration tests: src/modifiers-catalog.ts → rpc-schemas
 * Seam #069
 *
 * 7 TCs:
 *   TC-1  ARCH   — import still present
 *   TC-2  cache miss calls safeRpc on first fetch
 *   TC-3  cache hit — second call within TTL skips safeRpc
 *   TC-4  RPC error fallback returns []
 *   TC-5  getEffect returns matching item or null
 *   TC-6  getEndOfDebateEffects filters by timing
 *   TC-7  getInDebateEffects filters by timing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── ARCH filter ──────────────────────────────────────────────────────────────
const SOURCE_PATH = resolve(__dirname, '../../src/modifiers-catalog.ts');
const sourceLines = readFileSync(SOURCE_PATH, 'utf-8')
  .split('\n')
  .filter(l => /from\s+['"]/.test(l));

// ── shared mock data ─────────────────────────────────────────────────────────
const MOCK_CATALOG = [
  {
    id: 'effect-001',
    effect_num: 1,
    name: 'Iron Will',
    description: 'Grants +5 at end.',
    category: 'point',
    timing: 'end_of_debate',
    tier_gate: 'common',
    mod_cost: 1,
    pu_cost: 0,
  },
  {
    id: 'effect-002',
    effect_num: 2,
    name: 'Quick Strike',
    description: 'Doubles in-debate mult.',
    category: 'self_mult',
    timing: 'in_debate',
    tier_gate: 'uncommon',
    mod_cost: 2,
    pu_cost: 1,
  },
  {
    id: 'effect-003',
    effect_num: 3,
    name: 'Endgame Surge',
    description: '+10 at end.',
    category: 'point',
    timing: 'end_of_debate',
    tier_gate: 'rare',
    mod_cost: 3,
    pu_cost: 0,
  },
];

// ── mock setup ───────────────────────────────────────────────────────────────
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

describe('int-modifiers-catalog-rpc-schemas (#069)', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  // ── TC-1: ARCH — import present ──────────────────────────────────────────
  it('TC-1 ARCH: modifiers-catalog imports get_modifier_catalog from rpc-schemas', () => {
    const hasImport = sourceLines.some(
      l => l.includes('get_modifier_catalog') && l.includes('rpc-schemas'),
    );
    expect(hasImport).toBe(true);
  });

  // ── TC-2: cache miss calls safeRpc on first fetch ────────────────────────
  it('TC-2: getModifierCatalog calls safeRpc on first (cold) fetch', async () => {
    const safeRpcMock = vi.fn().mockResolvedValue({ data: MOCK_CATALOG, error: null });
    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/modifiers.ts', () => ({}));

    const { getModifierCatalog } = await import('../../src/modifiers-catalog.ts');
    const result = await getModifierCatalog();

    expect(safeRpcMock).toHaveBeenCalledTimes(1);
    expect(safeRpcMock).toHaveBeenCalledWith(
      'get_modifier_catalog',
      {},
      expect.anything(), // zod schema
    );
    expect(result).toEqual(MOCK_CATALOG);
  });

  // ── TC-3: cache hit — second call within TTL skips safeRpc ───────────────
  it('TC-3: getModifierCatalog returns cache on second call within TTL', async () => {
    const safeRpcMock = vi.fn().mockResolvedValue({ data: MOCK_CATALOG, error: null });
    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/modifiers.ts', () => ({}));

    const { getModifierCatalog } = await import('../../src/modifiers-catalog.ts');

    // First call — populates cache
    await getModifierCatalog();
    // Second call — should hit cache
    const result = await getModifierCatalog();

    expect(safeRpcMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(MOCK_CATALOG);
  });

  // ── TC-4: RPC error fallback returns [] ──────────────────────────────────
  it('TC-4: getModifierCatalog returns [] when safeRpc returns an error', async () => {
    const safeRpcMock = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'DB unreachable' } });
    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/modifiers.ts', () => ({}));

    const { getModifierCatalog } = await import('../../src/modifiers-catalog.ts');
    const result = await getModifierCatalog();

    expect(result).toEqual([]);
  });

  // ── TC-5: getEffect returns match or null ────────────────────────────────
  it('TC-5: getEffect returns the matching effect by id, null when missing', async () => {
    const safeRpcMock = vi.fn().mockResolvedValue({ data: MOCK_CATALOG, error: null });
    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/modifiers.ts', () => ({}));

    const { getEffect } = await import('../../src/modifiers-catalog.ts');

    const found = await getEffect('effect-002');
    const missing = await getEffect('no-such-id');

    expect(found).toMatchObject({ id: 'effect-002', name: 'Quick Strike' });
    expect(missing).toBeNull();
  });

  // ── TC-6: getEndOfDebateEffects filters correctly ────────────────────────
  it('TC-6: getEndOfDebateEffects returns only end_of_debate timing entries', async () => {
    const safeRpcMock = vi.fn().mockResolvedValue({ data: MOCK_CATALOG, error: null });
    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/modifiers.ts', () => ({}));

    const { getEndOfDebateEffects } = await import('../../src/modifiers-catalog.ts');
    const results = await getEndOfDebateEffects();

    expect(results.every(e => e.timing === 'end_of_debate')).toBe(true);
    expect(results).toHaveLength(2);
    expect(results.map(e => e.id)).toEqual(
      expect.arrayContaining(['effect-001', 'effect-003']),
    );
  });

  // ── TC-7: getInDebateEffects filters correctly ───────────────────────────
  it('TC-7: getInDebateEffects returns only in_debate timing entries', async () => {
    const safeRpcMock = vi.fn().mockResolvedValue({ data: MOCK_CATALOG, error: null });
    vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
    vi.doMock('../../src/modifiers.ts', () => ({}));

    const { getInDebateEffects } = await import('../../src/modifiers-catalog.ts');
    const results = await getInDebateEffects();

    expect(results.every(e => e.timing === 'in_debate')).toBe(true);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('effect-002');
  });
});
