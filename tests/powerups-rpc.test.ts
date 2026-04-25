// ============================================================
// POWERUPS RPC — tests/powerups-rpc.test.ts
// Source: src/powerups.rpc.ts
//
// CLASSIFICATION:
//   buy()                — RPC wrapper + balance check → Contract test
//   equip()              — RPC wrapper → Contract test
//   activate()           — RPC wrapper → Contract test
//   getMyPowerUps()      — RPC wrapper → Contract test
//   getOpponentPowerUps() — RPC wrapper → Contract test
//
// IMPORTS:
//   { safeRpc }     from './auth.ts'
//   { getBalance }  from './tokens.ts'
//   import type { ... } — type-only
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetBalance = vi.hoisted(() => vi.fn(() => 100));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/tokens.ts', () => ({
  getBalance: mockGetBalance,
}));

import { buy, equip, activate, getMyPowerUps, getOpponentPowerUps } from '../src/powerups.rpc.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetBalance.mockReturnValue(100);
});

// ── buy ───────────────────────────────────────────────────────

describe('TC1 — buy: calls buy_power_up RPC', () => {
  it('calls safeRpc with "buy_power_up"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await buy('power-up-1', 1);

    expect(mockSafeRpc).toHaveBeenCalledWith('buy_power_up', expect.objectContaining({ p_power_up_id: 'power-up-1' }));
  });
});

describe('TC2 — buy: sends p_power_up_id and p_quantity', () => {
  it('passes correct named params to safeRpc', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await buy('pu-xyz', 3);

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_power_up_id).toBe('pu-xyz');
    expect(params.p_quantity).toBe(3);
  });
});

describe('TC3 — buy: returns failure when balance insufficient', () => {
  it('returns failure without calling RPC when cost exceeds balance', async () => {
    mockGetBalance.mockReturnValue(50);

    const result = await buy('expensive-pu', 1, 100);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient balance');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC4 — buy: import contract — calls getBalance when cost provided', () => {
  it('getBalance mock is called when cost arg is present', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });
    mockGetBalance.mockReturnValue(200);

    await buy('pu-bal', 1, 10);

    expect(mockGetBalance).toHaveBeenCalled();
  });
});

describe('TC5 — buy: RPC error returns failure', () => {
  it('returns { success: false, error } when safeRpc returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Not enough tokens' } });

    const result = await buy('pu-err', 1);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Not enough tokens');
  });
});

// ── equip ─────────────────────────────────────────────────────

describe('TC6 — equip: calls equip_power_up RPC', () => {
  it('calls safeRpc with "equip_power_up"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await equip('debate-1', 'pu-equip', 1);

    expect(mockSafeRpc).toHaveBeenCalledWith('equip_power_up', expect.objectContaining({
      p_debate_id: 'debate-1',
      p_power_up_id: 'pu-equip',
      p_slot_number: 1,
    }));
  });
});

// ── activate ──────────────────────────────────────────────────

describe('TC7 — activate: calls activate_power_up RPC', () => {
  it('calls safeRpc with "activate_power_up"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await activate('debate-2', 'pu-activate');

    expect(mockSafeRpc).toHaveBeenCalledWith('activate_power_up', expect.objectContaining({
      p_debate_id: 'debate-2',
      p_power_up_id: 'pu-activate',
    }));
  });
});

// ── getMyPowerUps ─────────────────────────────────────────────

describe('TC8 — getMyPowerUps: calls get_my_power_ups RPC', () => {
  it('calls safeRpc with "get_my_power_ups"', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, inventory: [], equipped: [], questions_answered: 0 },
      error: null,
    });

    await getMyPowerUps();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_my_power_ups', expect.any(Object));
  });
});

describe('TC9 — getMyPowerUps: passes debate_id when provided', () => {
  it('includes p_debate_id in params when debateId is not null', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, inventory: [], equipped: [], questions_answered: 0 }, error: null });

    await getMyPowerUps('debate-power-test');

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_debate_id).toBe('debate-power-test');
  });
});

describe('TC10 — getMyPowerUps: returns empty result on error', () => {
  it('returns empty inventory on RPC error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const result = await getMyPowerUps();

    expect(result.success).toBe(false);
    expect(result.inventory).toEqual([]);
  });
});

// ── getOpponentPowerUps ───────────────────────────────────────

describe('TC11 — getOpponentPowerUps: calls get_opponent_power_ups RPC', () => {
  it('calls safeRpc with "get_opponent_power_ups"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, equipped: [] }, error: null });

    await getOpponentPowerUps('debate-opp');

    expect(mockSafeRpc).toHaveBeenCalledWith('get_opponent_power_ups', { p_debate_id: 'debate-opp' });
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/powerups.rpc.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './tokens.ts', './powerups.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/powerups.rpc.ts'),
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
