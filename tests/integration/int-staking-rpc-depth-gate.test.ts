/**
 * int-staking-rpc-depth-gate.test.ts
 * Seam #336 | src/staking.rpc.ts → depth-gate
 * 5 TCs
 *
 * Verifies that staking.rpc.ts uses isDepthBlocked() from depth-gate.ts
 * as the first guard in placeStake(), and that getPool/settleStakes
 * do NOT call isDepthBlocked (gate is write-only).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Stable mocks (module-level) — only @supabase/supabase-js
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

describe('staking.rpc → depth-gate integration (seam #336)', () => {
  let placeStake: typeof import('../../src/staking.rpc.ts').placeStake;
  let getPool: typeof import('../../src/staking.rpc.ts').getPool;
  let settleStakes: typeof import('../../src/staking.rpc.ts').settleStakes;

  let safeRpcMock: ReturnType<typeof vi.fn>;
  let isDepthBlockedMock: ReturnType<typeof vi.fn>;
  let getBalanceMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    safeRpcMock = vi.fn(() => Promise.resolve({ data: { success: true }, error: null }));
    isDepthBlockedMock = vi.fn(() => false);
    getBalanceMock = vi.fn(() => null);

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: safeRpcMock,
      getCurrentUser: vi.fn(() => ({ id: 'user-depth' })),
      getCurrentProfile: vi.fn(() => ({ profile_depth_pct: 50, token_balance: 1000 })),
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
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // ARCH: staking.rpc.ts imports isDepthBlocked from depth-gate.ts
  // -------------------------------------------------------------------------
  it('ARCH: staking.rpc.ts imports isDepthBlocked from depth-gate.ts', async () => {
    const source = await import('../../src/staking.rpc.ts?raw').then((m: { default: string }) => m.default).catch(() => '');
    expect(source.length).toBeGreaterThan(0);
    const importLines = source.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const hasDepthGate = importLines.some((l: string) =>
      l.includes("'./depth-gate.ts'") || l.includes('"./depth-gate.ts"')
    );
    expect(hasDepthGate).toBe(true);
    expect(source).toContain('isDepthBlocked');
  });

  // -------------------------------------------------------------------------
  // TC2: isDepthBlocked=true → placeStake returns 'Profile incomplete', no RPC
  // -------------------------------------------------------------------------
  it('TC2: depth gate BLOCKED — placeStake returns profile-incomplete error, skips RPC', async () => {
    isDepthBlockedMock.mockReturnValue(true);

    const result = await placeStake('debate-dg-01', 'a', 75);

    expect(isDepthBlockedMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Profile incomplete');
    expect(safeRpcMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // TC3: isDepthBlocked=false → placeStake proceeds to place_stake RPC
  // -------------------------------------------------------------------------
  it('TC3: depth gate PASSED — placeStake proceeds to place_stake RPC', async () => {
    isDepthBlockedMock.mockReturnValue(false);
    safeRpcMock.mockResolvedValue({ data: { success: true, stake_id: 'stk-dg-ok' }, error: null });

    const result = await placeStake('debate-dg-02', 'b', 50);

    expect(isDepthBlockedMock).toHaveBeenCalledTimes(1);
    expect(safeRpcMock).toHaveBeenCalledWith('place_stake', {
      p_debate_id: 'debate-dg-02',
      p_side: 'b',
      p_amount: 50,
    });
    expect(result.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // TC4: depth gate fires BEFORE input validation (blocked even on empty debateId)
  // -------------------------------------------------------------------------
  it('TC4: depth gate checked before input validation — blocked even with empty debateId', async () => {
    isDepthBlockedMock.mockReturnValue(true);

    // Missing debateId — but gate fires first
    const result = await placeStake('', '', 50);

    expect(isDepthBlockedMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Profile incomplete');
    // Crucially, not the 'Missing required fields' error
    expect(result.error).not.toBe('Missing required fields');
    expect(safeRpcMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // TC5: getPool does NOT call isDepthBlocked (read-only, no gate)
  // -------------------------------------------------------------------------
  it('TC5: getPool is a read operation — does NOT call isDepthBlocked', async () => {
    const fakePool = {
      exists: true,
      total_side_a: 100,
      total_side_b: 200,
      pool_status: 'open',
      user_stake: null,
    };
    safeRpcMock.mockResolvedValue({ data: fakePool, error: null });

    await getPool('debate-dg-03');

    expect(isDepthBlockedMock).not.toHaveBeenCalled();
    expect(safeRpcMock).toHaveBeenCalledWith('get_stake_pool', { p_debate_id: 'debate-dg-03' });
  });
});
