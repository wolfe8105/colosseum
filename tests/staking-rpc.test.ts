// ============================================================
// STAKING RPC — tests/staking-rpc.test.ts
// Source: src/staking.rpc.ts
//
// CLASSIFICATION:
//   placeStake()   — Multi-step + RPC → Integration/Contract test
//   getPool()      — RPC wrapper → Contract test
//   settleStakes() — RPC wrapper → Contract test
//   getOdds()      — Pure calculation → Unit test
//
// IMPORTS:
//   { safeRpc }        from './auth.ts'
//   { getBalance }     from './tokens.ts'
//   { isDepthBlocked } from './depth-gate.ts'
//   import type { ... } — type-only
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetBalance = vi.hoisted(() => vi.fn(() => 500));
const mockIsDepthBlocked = vi.hoisted(() => vi.fn(() => false));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/tokens.ts', () => ({
  getBalance: mockGetBalance,
}));

vi.mock('../src/depth-gate.ts', () => ({
  isDepthBlocked: mockIsDepthBlocked,
}));

import { placeStake, getPool, settleStakes, getOdds } from '../src/staking.rpc.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetBalance.mockReturnValue(500);
  mockIsDepthBlocked.mockReturnValue(false);
});

// ── getOdds (pure) ────────────────────────────────────────────

describe('TC1 — getOdds: 50/50 pool returns equal percentages', () => {
  it('returns a:50, b:50 for equal pool sizes', () => {
    const odds = getOdds(100, 100);
    expect(odds.a).toBe(50);
    expect(odds.b).toBe(50);
  });
});

describe('TC2 — getOdds: zero total returns default 50/50', () => {
  it('returns a:50, b:50 when total is 0', () => {
    const odds = getOdds(0, 0);
    expect(odds.a).toBe(50);
    expect(odds.b).toBe(50);
    expect(odds.multiplierA).toBe('2.00');
  });
});

describe('TC3 — getOdds: unequal pool gives correct percentages', () => {
  it('returns proportional percentages (300 vs 100)', () => {
    const odds = getOdds(300, 100);
    expect(odds.a).toBe(75);
    expect(odds.b).toBe(25);
  });
});

describe('TC4 — getOdds: multiplier reflects inverse probability', () => {
  it('side with 100% pool has multiplierA ~1.00', () => {
    const odds = getOdds(100, 0);
    expect(odds.multiplierA).toBe('1.00');
    expect(odds.multiplierB).toBe('∞');
  });
});

// ── placeStake ────────────────────────────────────────────────

describe('TC5 — placeStake: blocked by depth gate', () => {
  it('returns failure without calling RPC when depth gate blocks', async () => {
    mockIsDepthBlocked.mockReturnValue(true);

    const result = await placeStake('debate-1', 'a', 50);

    expect(result.success).toBe(false);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC6 — placeStake: missing debateId returns failure', () => {
  it('returns failure for empty debateId without calling RPC', async () => {
    const result = await placeStake('', 'a', 50);
    expect(result.success).toBe(false);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC7 — placeStake: invalid amount returns failure', () => {
  it('returns failure for zero amount', async () => {
    const result = await placeStake('debate-1', 'a', 0);
    expect(result.success).toBe(false);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC8 — placeStake: insufficient balance returns failure', () => {
  it('returns failure when amount exceeds balance', async () => {
    mockGetBalance.mockReturnValue(10);

    const result = await placeStake('debate-1', 'a', 100);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient balance');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC9 — placeStake: calls place_stake RPC on valid input', () => {
  it('calls safeRpc with "place_stake" for valid stake', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await placeStake('debate-valid', 'b', 50);

    expect(mockSafeRpc).toHaveBeenCalledWith('place_stake', expect.objectContaining({
      p_debate_id: 'debate-valid',
      p_side: 'b',
      p_amount: 50,
    }));
  });
});

describe('TC10 — placeStake: import contract — calls isDepthBlocked', () => {
  it('isDepthBlocked mock is called on every placeStake', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await placeStake('debate-1', 'a', 10);

    expect(mockIsDepthBlocked).toHaveBeenCalled();
  });
});

// ── getPool ───────────────────────────────────────────────────

describe('TC11 — getPool: calls get_stake_pool RPC', () => {
  it('calls safeRpc with "get_stake_pool"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { exists: true, total_side_a: 100, total_side_b: 50, pool_status: 'open', user_stake: null }, error: null });

    await getPool('debate-pool');

    expect(mockSafeRpc).toHaveBeenCalledWith('get_stake_pool', { p_debate_id: 'debate-pool' });
  });
});

describe('TC12 — getPool: returns empty pool on RPC error', () => {
  it('returns exists:false when safeRpc returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const result = await getPool('debate-err');

    expect(result.exists).toBe(false);
  });
});

// ── settleStakes ──────────────────────────────────────────────

describe('TC13 — settleStakes: calls settle_stakes RPC', () => {
  it('calls safeRpc with "settle_stakes"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await settleStakes('debate-settle');

    expect(mockSafeRpc).toHaveBeenCalledWith('settle_stakes', { p_debate_id: 'debate-settle' });
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/staking.rpc.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './tokens.ts', './depth-gate.ts', './staking.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/staking.rpc.ts'),
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
