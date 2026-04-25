/**
 * Integration tests — SEAM #207
 * src/powerups.rpc.ts → tokens (getBalance)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Supabase mock ────────────────────────────────────────────────────────────
vi.mock('@supabase/supabase-js', () => {
  const rpcMock = vi.fn();
  const fromMock = vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }));
  const authMock = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  };
  return {
    createClient: vi.fn(() => ({
      rpc: rpcMock,
      from: fromMock,
      auth: authMock,
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    })),
    __rpcMock: rpcMock,
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function importModule() {
  const mod = await import('../../src/powerups.rpc.ts');
  return mod;
}

async function importSupabaseMock() {
  const sb = await import('@supabase/supabase-js');
  return (sb as unknown as { __rpcMock: ReturnType<typeof vi.fn> }).__rpcMock;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('SEAM #207 | src/powerups.rpc.ts → tokens', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── ARCH: import lines only ─────────────────────────────────────────────────
  it('ARCH: only imports from auth.ts and tokens.ts (no wall imports)', async () => {
    const source = await import('../../src/powerups.rpc.ts?raw');
    const importLines = source.default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const wallTerms = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of importLines) {
      for (const term of wallTerms) {
        expect(line).not.toContain(term);
      }
    }
    expect(importLines.some((l: string) => l.includes('./auth'))).toBe(true);
    expect(importLines.some((l: string) => l.includes('./tokens'))).toBe(true);
  });

  // ── TC1: buy() insufficient balance — no RPC call ──────────────────────────
  it('TC1: buy() returns insufficient-balance error without calling RPC when balance < cost', async () => {
    vi.resetModules();
    // Seed tokens.balance so getBalance() returns a low value
    vi.doMock('../../src/tokens.balance.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/tokens.balance.ts')>();
      return { ...actual, getBalance: () => 50 };
    });
    vi.doMock('../../src/auth.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.ts')>();
      return { ...actual, safeRpc: vi.fn() };
    });

    const { buy } = await importModule();
    const result = await buy('shield', 1, 200);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Insufficient balance/);
    expect(result.error).toContain('50');

    const { safeRpc } = await import('../../src/auth.ts');
    expect(safeRpc).not.toHaveBeenCalled();
  });

  // ── TC2: buy() sufficient balance calls safeRpc with correct params ─────────
  it('TC2: buy() with sufficient balance calls buy_power_up RPC', async () => {
    vi.resetModules();
    const safeRpcMock = vi.fn().mockResolvedValue({ data: { success: true, new_quantity: 2 }, error: null });
    vi.doMock('../../src/tokens.balance.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/tokens.balance.ts')>();
      return { ...actual, getBalance: () => 500 };
    });
    vi.doMock('../../src/auth.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.ts')>();
      return { ...actual, safeRpc: safeRpcMock };
    });

    const { buy } = await importModule();
    const result = await buy('shield', 2, 100);

    expect(safeRpcMock).toHaveBeenCalledWith('buy_power_up', { p_power_up_id: 'shield', p_quantity: 2 });
    expect(result.success).toBe(true);
  });

  // ── TC3: buy() RPC error → returns error object ─────────────────────────────
  it('TC3: buy() RPC error returns { success: false, error: message }', async () => {
    vi.resetModules();
    const safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not enough tokens' } });
    vi.doMock('../../src/tokens.balance.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/tokens.balance.ts')>();
      return { ...actual, getBalance: () => null };
    });
    vi.doMock('../../src/auth.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.ts')>();
      return { ...actual, safeRpc: safeRpcMock };
    });

    const { buy } = await importModule();
    const result = await buy('shield', 1);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not enough tokens');
  });

  // ── TC4: equip() calls equip_power_up with correct params ──────────────────
  it('TC4: equip() calls equip_power_up RPC with debate/powerup/slot params', async () => {
    vi.resetModules();
    const safeRpcMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    vi.doMock('../../src/auth.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.ts')>();
      return { ...actual, safeRpc: safeRpcMock };
    });
    vi.doMock('../../src/tokens.balance.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/tokens.balance.ts')>();
      return { ...actual, getBalance: () => null };
    });

    const { equip } = await importModule();
    const result = await equip('debate-123', 'shield', 1);

    expect(safeRpcMock).toHaveBeenCalledWith('equip_power_up', {
      p_debate_id: 'debate-123',
      p_power_up_id: 'shield',
      p_slot_number: 1,
    });
    expect(result.success).toBe(true);
  });

  // ── TC5: activate() calls activate_power_up with correct params ─────────────
  it('TC5: activate() calls activate_power_up RPC', async () => {
    vi.resetModules();
    const safeRpcMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    vi.doMock('../../src/auth.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.ts')>();
      return { ...actual, safeRpc: safeRpcMock };
    });
    vi.doMock('../../src/tokens.balance.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/tokens.balance.ts')>();
      return { ...actual, getBalance: () => null };
    });

    const { activate } = await importModule();
    const result = await activate('debate-456', 'time-warp');

    expect(safeRpcMock).toHaveBeenCalledWith('activate_power_up', {
      p_debate_id: 'debate-456',
      p_power_up_id: 'time-warp',
    });
    expect(result.success).toBe(true);
  });

  // ── TC6: getMyPowerUps() without debateId — no p_debate_id in params ────────
  it('TC6: getMyPowerUps(null) calls get_my_power_ups with empty params (no p_debate_id)', async () => {
    vi.resetModules();
    const safeRpcMock = vi.fn().mockResolvedValue({
      data: { success: true, inventory: [], equipped: [], questions_answered: 0 },
      error: null,
    });
    vi.doMock('../../src/auth.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.ts')>();
      return { ...actual, safeRpc: safeRpcMock };
    });
    vi.doMock('../../src/tokens.balance.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/tokens.balance.ts')>();
      return { ...actual, getBalance: () => null };
    });

    const { getMyPowerUps } = await importModule();
    const result = await getMyPowerUps(null);

    expect(safeRpcMock).toHaveBeenCalledWith('get_my_power_ups', {});
    expect(result.inventory).toEqual([]);
  });

  // ── TC7: getMyPowerUps(debateId) includes p_debate_id ───────────────────────
  it('TC7: getMyPowerUps(debateId) passes p_debate_id to get_my_power_ups', async () => {
    vi.resetModules();
    const safeRpcMock = vi.fn().mockResolvedValue({
      data: { success: true, inventory: [{ id: 'x' }], equipped: [], questions_answered: 5 },
      error: null,
    });
    vi.doMock('../../src/auth.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.ts')>();
      return { ...actual, safeRpc: safeRpcMock };
    });
    vi.doMock('../../src/tokens.balance.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/tokens.balance.ts')>();
      return { ...actual, getBalance: () => null };
    });

    const { getMyPowerUps } = await importModule();
    const result = await getMyPowerUps('debate-789');

    expect(safeRpcMock).toHaveBeenCalledWith('get_my_power_ups', { p_debate_id: 'debate-789' });
    expect(result.questions_answered).toBe(5);
  });

  // ── TC8: getOpponentPowerUps() calls correct RPC ─────────────────────────────
  it('TC8: getOpponentPowerUps() calls get_opponent_power_ups with p_debate_id', async () => {
    vi.resetModules();
    const safeRpcMock = vi.fn().mockResolvedValue({
      data: { success: true, equipped: [{ power_up_id: 'shield', slot: 1 }] },
      error: null,
    });
    vi.doMock('../../src/auth.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.ts')>();
      return { ...actual, safeRpc: safeRpcMock };
    });
    vi.doMock('../../src/tokens.balance.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/tokens.balance.ts')>();
      return { ...actual, getBalance: () => null };
    });

    const { getOpponentPowerUps } = await importModule();
    const result = await getOpponentPowerUps('debate-abc');

    expect(safeRpcMock).toHaveBeenCalledWith('get_opponent_power_ups', { p_debate_id: 'debate-abc' });
    expect(result.success).toBe(true);
    expect(result.equipped).toHaveLength(1);
  });
});
