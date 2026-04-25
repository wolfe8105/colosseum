// ============================================================
// GK F-58 — SENTIMENT TIPPING — tests/gk-staking-rpc.test.ts
// Source: src/staking.rpc.ts
//
// Spec: docs/THE-MODERATOR-PUNCH-LIST.md row F-58
//
// F-58 introduces settle_sentiment_tips as the tip-refund path.
// These tests verify that staking.rpc.ts (F-09) is preserved
// separately from F-58 tipping: correct RPC names, no
// multiplier in the settle call, and no cast_sentiment_vote.
//
// CLASSIFICATION:
//   placeStake()   — Multi-step orchestration → mock all deps
//   getPool()      — RPC wrapper → mock safeRpc
//   settleStakes() — RPC wrapper → mock safeRpc
//   getOdds()      — Pure calculation → no mocks
//
// IMPORTS:
//   { safeRpc }        from './auth.ts'
//   { getBalance }     from './tokens.ts'
//   { isDepthBlocked } from './depth-gate.ts'
//   import type { ... } — type-only
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc        = vi.hoisted(() => vi.fn());
const mockGetBalance     = vi.hoisted(() => vi.fn(() => 500));
const mockIsDepthBlocked = vi.hoisted(() => vi.fn(() => false));

vi.mock('../src/auth.ts', () => ({
  safeRpc:            mockSafeRpc,
  getSupabaseClient:  vi.fn(),
  getCurrentUser:     vi.fn(),
  onAuthStateChange:  vi.fn(),
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

// ── TC1: settleStakes calls settle_stakes, not settle_sentiment_tips ──
// F-58 spec: settle_sentiment_tips is a NEW F-58 RPC. F-09 settle_stakes
// is preserved as the staking settlement path, kept separate from tip refunds.

describe('TC1 — settleStakes: calls settle_stakes not settle_sentiment_tips', () => {
  it('invokes safeRpc with "settle_stakes"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await settleStakes('debate-tc1');

    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    const [rpcName] = mockSafeRpc.mock.calls[0];
    expect(rpcName).toBe('settle_stakes');
  });

  it('does not call settle_sentiment_tips', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await settleStakes('debate-tc1-b');

    const rpcNames = mockSafeRpc.mock.calls.map(([name]) => name);
    expect(rpcNames).not.toContain('settle_sentiment_tips');
  });
});

// ── TC2: settleStakes sends only p_debate_id — no p_multiplier ──
// F-58 spec: "2x Multiplier NOT applied to F-58 tip refunds."
// F-09 spec: "multiplier is hardcoded to 1 server-side. Client never
// determines payout math." (S230 security fix)

describe('TC2 — settleStakes: sends only p_debate_id — no p_multiplier', () => {
  it('call args contain p_debate_id and no other keys', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await settleStakes('debate-tc2');

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params).toHaveProperty('p_debate_id', 'debate-tc2');
    expect(params).not.toHaveProperty('p_multiplier');
  });
});

// ── TC3: settleStakes sends no p_winner ──
// F-09 spec: S230 removed winner param — SQL reads arena_debates.winner.

describe('TC3 — settleStakes: sends no p_winner param', () => {
  it('call args do not include p_winner', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await settleStakes('debate-tc3');

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params).not.toHaveProperty('p_winner');
  });
});

// ── TC4: placeStake is blocked by depth gate ──
// F-09 spec (F-63 gate): sub-25% users cannot stake.

describe('TC4 — placeStake: depth gate blocks — no RPC call', () => {
  it('returns failure without calling safeRpc when isDepthBlocked returns true', async () => {
    mockIsDepthBlocked.mockReturnValue(true);

    const result = await placeStake('debate-tc4', 'a', 50);

    expect(result.success).toBe(false);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC5: placeStake rejects empty debateId ──
// F-09 spec: "validate: non-empty"

describe('TC5 — placeStake: rejects empty debateId', () => {
  it('returns failure for empty string debateId', async () => {
    const result = await placeStake('', 'a', 50);

    expect(result.success).toBe(false);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC6: placeStake rejects empty side ──
// F-09 spec: "validate: non-empty"

describe('TC6 — placeStake: rejects empty side', () => {
  it('returns failure for empty string side', async () => {
    const result = await placeStake('debate-tc6', '', 50);

    expect(result.success).toBe(false);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC7: placeStake rejects zero and negative amounts ──
// F-09 spec: "validate: positive int"

describe('TC7 — placeStake: rejects zero amount', () => {
  it('returns failure for amount 0', async () => {
    const result = await placeStake('debate-tc7', 'a', 0);

    expect(result.success).toBe(false);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC7b — placeStake: rejects negative amount', () => {
  it('returns failure for amount -10', async () => {
    const result = await placeStake('debate-tc7b', 'b', -10);

    expect(result.success).toBe(false);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC8: placeStake rejects amount exceeding balance ──
// F-09 spec: "within balance" — client-side soft gate before RPC.

describe('TC8 — placeStake: rejects amount exceeding balance', () => {
  it('returns "Insufficient balance" error without calling RPC', async () => {
    mockGetBalance.mockReturnValue(20);

    const result = await placeStake('debate-tc8', 'a', 100);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient balance');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC9: placeStake calls place_stake RPC with correct named params ──
// F-09 spec: "place_stake(debate_id, side, amount)"

describe('TC9 — placeStake: calls place_stake with p_debate_id, p_side, p_amount', () => {
  it('sends all three required named params', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await placeStake('debate-tc9', 'b', 25);

    expect(mockSafeRpc).toHaveBeenCalledWith('place_stake', {
      p_debate_id: 'debate-tc9',
      p_side: 'b',
      p_amount: 25,
    });
  });
});

// ── TC10: placeStake parses string amounts to integer ──
// F-09 spec: amount comes from DOM input (string). Must be parsed to int.

describe('TC10 — placeStake: parses string amount to integer', () => {
  it('sends p_amount as a number when given string "50"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await placeStake('debate-tc10', 'a', '50');

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(typeof params.p_amount).toBe('number');
    expect(params.p_amount).toBe(50);
  });
});

// ── TC11: getPool calls get_stake_pool RPC with p_debate_id ──
// F-09 spec: "GetPoolFn → safeRpc(get_stake_pool, {debate_id})"

describe('TC11 — getPool: calls get_stake_pool with p_debate_id', () => {
  it('invokes safeRpc with correct name and param', async () => {
    mockSafeRpc.mockResolvedValue({ data: { exists: true, total_side_a: 200, total_side_b: 100, pool_status: 'open', user_stake: null }, error: null });

    await getPool('debate-tc11');

    expect(mockSafeRpc).toHaveBeenCalledWith('get_stake_pool', { p_debate_id: 'debate-tc11' });
  });
});

// ── TC12: getPool returns empty pool on RPC error ──
// F-09 spec: if getPool fails, panel silently doesn't render (emptyPool fallback).

describe('TC12 — getPool: returns exists:false on RPC error', () => {
  it('returns empty pool shape when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const pool = await getPool('debate-tc12');

    expect(pool.exists).toBe(false);
    expect(pool.total_side_a).toBe(0);
    expect(pool.total_side_b).toBe(0);
  });
});

// ── TC13: getOdds returns 50/50 and multiplier '2.00' when total is 0 ──
// F-09 spec: parimutuel odds default on empty pool.

describe('TC13 — getOdds: 50/50 default on empty pool', () => {
  it('returns a:50, b:50, multiplierA:"2.00", multiplierB:"2.00" for 0 vs 0', () => {
    const odds = getOdds(0, 0);

    expect(odds.a).toBe(50);
    expect(odds.b).toBe(50);
    expect(odds.multiplierA).toBe('2.00');
    expect(odds.multiplierB).toBe('2.00');
  });
});

// ── TC14: getOdds calculates proportional percentages ──
// F-09 spec: parimutuel odds reflect pool share.

describe('TC14 — getOdds: proportional percentages for unequal pools', () => {
  it('returns a:75, b:25 for 300 vs 100', () => {
    const odds = getOdds(300, 100);

    expect(odds.a).toBe(75);
    expect(odds.b).toBe(25);
  });
});

// ── TC15: getOdds returns ∞ multiplierB when side B total is 0 ──
// F-09 spec: multiplier = total / side; division by zero → ∞.

describe('TC15 — getOdds: ∞ multiplier when side B is 0', () => {
  it('returns multiplierB:"∞" when side B has no tokens', () => {
    const odds = getOdds(100, 0);

    expect(odds.multiplierB).toBe('∞');
  });
});

// ── TC16: cast_sentiment_vote is NOT referenced in staking.rpc.ts ──
// F-58 spec: "drops cast_sentiment_vote RPC" — the old free-vote RPC is
// retired. staking.rpc.ts must not call it.

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('TC16 — F-58: cast_sentiment_vote is absent from staking.rpc.ts', () => {
  it('source file does not reference cast_sentiment_vote', () => {
    const source = readFileSync(
      resolve(__dirname, '../src/staking.rpc.ts'),
      'utf-8'
    );
    expect(source).not.toContain('cast_sentiment_vote');
  });
});

// ── ARCH: staking.rpc.ts imports only from the allowed list ──────

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
