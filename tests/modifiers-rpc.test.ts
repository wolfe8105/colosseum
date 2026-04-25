// ============================================================
// MODIFIERS RPC — tests/modifiers-rpc.test.ts
// Source: src/modifiers-rpc.ts
//
// CLASSIFICATION:
//   buyModifier()          — RPC wrapper → Contract test
//   buyPowerup()           — RPC wrapper → Contract test
//   socketModifier()       — RPC wrapper → Contract test
//   equipPowerupForDebate() — RPC wrapper → Contract test
//   getUserInventory()     — RPC wrapper + Zod schema → Contract test
//
// IMPORTS:
//   { safeRpc }                      from './auth.ts'
//   { get_user_modifier_inventory }  from './contracts/rpc-schemas.ts'
//   import type { UserInventory }    — type-only
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
  get_user_modifier_inventory: { safeParse: vi.fn(() => ({ success: true })) },
}));

vi.mock('../src/modifiers.ts', () => ({}));

import {
  buyModifier,
  buyPowerup,
  socketModifier,
  equipPowerupForDebate,
  getUserInventory,
} from '../src/modifiers-rpc.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
});

// ── buyModifier ───────────────────────────────────────────────

describe('TC1 — buyModifier: calls buy_modifier RPC', () => {
  it('calls safeRpc with "buy_modifier" and effect id', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, modifier_id: 'm-1' }, error: null });

    await buyModifier('effect-fast-talk');

    expect(mockSafeRpc).toHaveBeenCalledWith('buy_modifier', { p_effect_id: 'effect-fast-talk' });
  });
});

describe('TC2 — buyModifier: RPC error returns failure', () => {
  it('returns success:false with error message on RPC error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Not enough tokens' } });

    const result = await buyModifier('effect-x');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Not enough tokens');
  });
});

describe('TC3 — buyModifier: returns modifier_id on success', () => {
  it('passes through modifier_id from RPC response', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, modifier_id: 'mod-abc', cost: 25 }, error: null });

    const result = await buyModifier('effect-shield');

    expect(result.success).toBe(true);
    expect(result.modifier_id).toBe('mod-abc');
    expect(result.cost).toBe(25);
  });
});

// ── buyPowerup ────────────────────────────────────────────────

describe('TC4 — buyPowerup: calls buy_powerup RPC', () => {
  it('calls safeRpc with "buy_powerup", effect id, and quantity', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, new_quantity: 3 }, error: null });

    await buyPowerup('effect-boost', 3);

    expect(mockSafeRpc).toHaveBeenCalledWith('buy_powerup', {
      p_effect_id: 'effect-boost',
      p_quantity: 3,
    });
  });
});

describe('TC5 — buyPowerup: defaults quantity to 1', () => {
  it('sends p_quantity: 1 when not specified', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, new_quantity: 1 }, error: null });

    await buyPowerup('effect-speed');

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_quantity).toBe(1);
  });
});

describe('TC6 — buyPowerup: RPC error returns failure', () => {
  it('returns success:false on RPC error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Inventory full' } });

    const result = await buyPowerup('effect-x');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Inventory full');
  });
});

// ── socketModifier ────────────────────────────────────────────

describe('TC7 — socketModifier: calls socket_modifier RPC', () => {
  it('calls safeRpc with reference_id, socket_index, modifier_id', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await socketModifier('ref-123', 0, 'mod-xyz');

    expect(mockSafeRpc).toHaveBeenCalledWith('socket_modifier', {
      p_reference_id: 'ref-123',
      p_socket_index: 0,
      p_modifier_id: 'mod-xyz',
    });
  });
});

describe('TC8 — socketModifier: RPC error returns failure', () => {
  it('returns success:false on RPC error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Socket occupied' } });

    const result = await socketModifier('ref-x', 1, 'mod-y');

    expect(result.success).toBe(false);
  });
});

// ── equipPowerupForDebate ─────────────────────────────────────

describe('TC9 — equipPowerupForDebate: calls equip_powerup_for_debate RPC', () => {
  it('calls safeRpc with debate_id and effect_id', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, slots_used: 1 }, error: null });

    await equipPowerupForDebate('debate-1', 'effect-freeze');

    expect(mockSafeRpc).toHaveBeenCalledWith('equip_powerup_for_debate', {
      p_debate_id: 'debate-1',
      p_effect_id: 'effect-freeze',
    });
  });
});

describe('TC10 — equipPowerupForDebate: returns slots_used on success', () => {
  it('passes through slots_used from RPC response', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, slots_used: 2 }, error: null });

    const result = await equipPowerupForDebate('debate-2', 'effect-x');

    expect(result.success).toBe(true);
    expect(result.slots_used).toBe(2);
  });
});

// ── getUserInventory ──────────────────────────────────────────

describe('TC11 — getUserInventory: calls get_user_modifier_inventory RPC', () => {
  it('calls safeRpc with "get_user_modifier_inventory"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { modifiers: [], powerups: [] }, error: null });

    await getUserInventory();

    expect(mockSafeRpc).toHaveBeenCalledWith(
      'get_user_modifier_inventory',
      { p_debate_id: null },
      expect.anything()
    );
  });
});

describe('TC12 — getUserInventory: passes debate_id when provided', () => {
  it('sends p_debate_id when debateId is specified', async () => {
    mockSafeRpc.mockResolvedValue({ data: { modifiers: [], powerups: [] }, error: null });

    await getUserInventory('debate-abc');

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_debate_id).toBe('debate-abc');
  });
});

describe('TC13 — getUserInventory: returns null on RPC error', () => {
  it('returns null when safeRpc returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Unauthorized' } });

    const result = await getUserInventory();

    expect(result).toBeNull();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/modifiers-rpc.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './contracts/rpc-schemas.ts', './modifiers.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/modifiers-rpc.ts'),
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
