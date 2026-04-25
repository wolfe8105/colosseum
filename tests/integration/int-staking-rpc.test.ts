/**
 * int-staking-rpc.test.ts
 * Seam #236 | src/staking.rpc.ts → tokens
 * 7 TCs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Stable mocks (module-level)
// ---------------------------------------------------------------------------

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() })),
  })),
}));

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('staking.rpc → tokens integration (seam #236)', () => {
  let placeStake: typeof import('../../src/staking.rpc.ts').placeStake;
  let getPool: typeof import('../../src/staking.rpc.ts').getPool;
  let settleStakes: typeof import('../../src/staking.rpc.ts').settleStakes;
  let getOdds: typeof import('../../src/staking.rpc.ts').getOdds;

  // Hoisted mutable stubs — reset each test
  let safeRpcMock: ReturnType<typeof vi.fn>;
  let isDepthBlockedMock: ReturnType<typeof vi.fn>;
  let getBalanceMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    safeRpcMock = vi.fn(() => Promise.resolve({ data: { success: true }, error: null }));
    isDepthBlockedMock = vi.fn(() => false);
    getBalanceMock = vi.fn(() => null); // default: no balance cap

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: safeRpcMock,
      getCurrentUser: vi.fn(() => ({ id: 'user-123' })),
      getCurrentProfile: vi.fn(() => ({ token_balance: 1000 })),
      getIsPlaceholderMode: vi.fn(() => false),
      onChange: vi.fn(),
      onAuthStateChange: vi.fn(),
    }));

    vi.doMock('../../src/tokens.ts', () => ({
      getBalance: getBalanceMock,
    }));

    vi.doMock('../../src/depth-gate.ts', () => ({
      isDepthBlocked: isDepthBlockedMock,
    }));

    vi.doMock('../../src/staking.types.ts', () => ({}));

    const mod = await import('../../src/staking.rpc.ts');
    placeStake = mod.placeStake;
    getPool = mod.getPool;
    settleStakes = mod.settleStakes;
    getOdds = mod.getOdds;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // ARCH: import lines from staking.rpc.ts
  // -------------------------------------------------------------------------
  it('ARCH: staking.rpc.ts imports getBalance from tokens', async () => {
    const source = await import('../../src/staking.rpc.ts?raw').then(m => m.default).catch(() => '');
    if (!source) {
      // Fallback: read via fs (Vitest environment)
      const { readFileSync } = await import('fs');
      const text = readFileSync(new URL('../../src/staking.rpc.ts', import.meta.url), 'utf-8');
      const importLines = text.split('\n').filter(l => /from\s+['"]/.test(l));
      const hasTokens = importLines.some(l => l.includes("'./tokens.ts'") || l.includes('"./tokens.ts"'));
      expect(hasTokens).toBe(true);
      const hasGetBalance = text.includes('getBalance');
      expect(hasGetBalance).toBe(true);
      return;
    }
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasTokens = importLines.some(l => l.includes("'./tokens.ts'") || l.includes('"./tokens.ts"'));
    expect(hasTokens).toBe(true);
  });

  // -------------------------------------------------------------------------
  // TC1: placeStake happy path — calls place_stake with correct params
  // -------------------------------------------------------------------------
  it('TC1: placeStake calls place_stake RPC with correct params', async () => {
    safeRpcMock.mockResolvedValue({ data: { success: true, stake_id: 'stk-abc' }, error: null });

    const result = await placeStake('debate-001', 'a', 50);

    expect(safeRpcMock).toHaveBeenCalledWith('place_stake', {
      p_debate_id: 'debate-001',
      p_side: 'a',
      p_amount: 50,
    });
    expect(result.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // TC2: placeStake blocked by depth gate — no RPC call
  // -------------------------------------------------------------------------
  it('TC2: placeStake returns profile-incomplete error when depth-blocked', async () => {
    isDepthBlockedMock.mockReturnValue(true);

    const result = await placeStake('debate-001', 'a', 50);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Profile incomplete');
    expect(safeRpcMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // TC3: placeStake blocked by insufficient balance — no RPC call
  // -------------------------------------------------------------------------
  it('TC3: placeStake returns insufficient-balance error when balance is too low', async () => {
    getBalanceMock.mockReturnValue(20); // balance is 20, stake is 50

    const result = await placeStake('debate-001', 'b', 50);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Insufficient balance/);
    expect(safeRpcMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // TC4: placeStake rejects NaN / non-numeric amount
  // -------------------------------------------------------------------------
  it('TC4: placeStake returns amount-error for non-numeric input', async () => {
    const result = await placeStake('debate-001', 'a', 'abc');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Amount must be a positive number');
    expect(safeRpcMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // TC5: getPool calls get_stake_pool and returns pool data
  // -------------------------------------------------------------------------
  it('TC5: getPool calls get_stake_pool RPC and returns pool data', async () => {
    const fakePool = {
      exists: true,
      total_side_a: 200,
      total_side_b: 100,
      pool_status: 'open',
      user_stake: null,
    };
    safeRpcMock.mockResolvedValue({ data: fakePool, error: null });

    const result = await getPool('debate-002');

    expect(safeRpcMock).toHaveBeenCalledWith('get_stake_pool', { p_debate_id: 'debate-002' });
    expect(result.exists).toBe(true);
    expect(result.total_side_a).toBe(200);
    expect(result.pool_status).toBe('open');
  });

  // -------------------------------------------------------------------------
  // TC6: settleStakes calls settle_stakes RPC with debate ID
  // -------------------------------------------------------------------------
  it('TC6: settleStakes calls settle_stakes RPC with p_debate_id', async () => {
    safeRpcMock.mockResolvedValue({ data: { success: true, payout: 150 }, error: null });

    const result = await settleStakes('debate-003');

    expect(safeRpcMock).toHaveBeenCalledWith('settle_stakes', { p_debate_id: 'debate-003' });
    expect(result.success).toBe(true);
    expect((result as { payout?: number }).payout).toBe(150);
  });

  // -------------------------------------------------------------------------
  // TC7: getOdds pure-function: zero pool → 50/50; known pool → correct split
  // -------------------------------------------------------------------------
  it('TC7: getOdds returns 50/50 for empty pool and correct split for known totals', () => {
    const empty = getOdds(0, 0);
    expect(empty.a).toBe(50);
    expect(empty.b).toBe(50);
    expect(empty.multiplierA).toBe('2.00');
    expect(empty.multiplierB).toBe('2.00');

    // 300 on A, 100 on B → 75% A, 25% B
    const split = getOdds(300, 100);
    expect(split.a).toBe(75);
    expect(split.b).toBe(25);
    expect(split.multiplierA).toBe((400 / 300).toFixed(2));
    expect(split.multiplierB).toBe((400 / 100).toFixed(2));
  });
});
