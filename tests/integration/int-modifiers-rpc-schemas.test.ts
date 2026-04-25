import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(),
    auth: mockAuth,
  })),
}));

// We mock auth.ts so safeRpc is fully controllable without Supabase
vi.mock('../../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockSafeRpc.mockReset();
});

// ── TC1: ARCH ──────────────────────────────────────────────────────────────

describe('TC1 — ARCH: modifiers-rpc.ts imports get_user_modifier_inventory from rpc-schemas', () => {
  it('has import line referencing rpc-schemas and get_user_modifier_inventory', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/modifiers-rpc.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasRpcSchemas = importLines.some(
      l => l.includes('rpc-schemas') && l.includes('get_user_modifier_inventory')
    );
    expect(hasRpcSchemas).toBe(true);
  });
});

// ── TC2: buyModifier success ───────────────────────────────────────────────

describe('TC2 — buyModifier returns data on success', () => {
  it('returns success payload when safeRpc resolves without error', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: { success: true, modifier_id: 'mod-abc', cost: 10 },
      error: null,
    });

    const { buyModifier } = await import('../../src/modifiers-rpc.ts');
    const result = await buyModifier('effect-1');

    expect(result).toEqual({ success: true, modifier_id: 'mod-abc', cost: 10 });
    expect(mockSafeRpc).toHaveBeenCalledWith('buy_modifier', { p_effect_id: 'effect-1' });
  });
});

// ── TC3: buyModifier error ─────────────────────────────────────────────────

describe('TC3 — buyModifier returns error wrapper when safeRpc errors', () => {
  it('returns { success: false, error: message } on RPC error', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'insufficient tokens' },
    });

    const { buyModifier } = await import('../../src/modifiers-rpc.ts');
    const result = await buyModifier('effect-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('insufficient tokens');
  });
});

// ── TC4: buyPowerup passes quantity ────────────────────────────────────────

describe('TC4 — buyPowerup passes p_quantity to safeRpc', () => {
  it('invokes safeRpc with p_effect_id and p_quantity', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: { success: true, new_quantity: 3, cost: 15 },
      error: null,
    });

    const { buyPowerup } = await import('../../src/modifiers-rpc.ts');
    await buyPowerup('eff-2', 3);

    expect(mockSafeRpc).toHaveBeenCalledWith('buy_powerup', {
      p_effect_id: 'eff-2',
      p_quantity: 3,
    });
  });
});

// ── TC5: socketModifier success ────────────────────────────────────────────

describe('TC5 — socketModifier returns success on good response', () => {
  it('returns { success: true } when safeRpc resolves without error', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: { success: true },
      error: null,
    });

    const { socketModifier } = await import('../../src/modifiers-rpc.ts');
    const result = await socketModifier('ref-id', 0, 'mod-id');

    expect(result).toEqual({ success: true });
    expect(mockSafeRpc).toHaveBeenCalledWith('socket_modifier', {
      p_reference_id: 'ref-id',
      p_socket_index: 0,
      p_modifier_id: 'mod-id',
    });
  });
});

// ── TC6: getUserInventory passes schema ─────────────────────────────────────

describe('TC6 — getUserInventory passes get_user_modifier_inventory schema to safeRpc', () => {
  it('calls safeRpc with the schema as 3rd argument', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: {
        unsocketed_modifiers: [],
        powerup_stock: [],
        equipped_loadout: [],
      },
      error: null,
    });

    const { getUserInventory } = await import('../../src/modifiers-rpc.ts');
    const { get_user_modifier_inventory } = await import('../../src/contracts/rpc-schemas.ts');

    await getUserInventory('debate-1');

    expect(mockSafeRpc).toHaveBeenCalledWith(
      'get_user_modifier_inventory',
      { p_debate_id: 'debate-1' },
      get_user_modifier_inventory
    );
  });
});

// ── TC7: getUserInventory returns null on error ────────────────────────────

describe('TC7 — getUserInventory returns null when safeRpc errors', () => {
  it('returns null on RPC error', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'not authenticated' },
    });

    const { getUserInventory } = await import('../../src/modifiers-rpc.ts');
    const result = await getUserInventory();

    expect(result).toBeNull();
  });
});
