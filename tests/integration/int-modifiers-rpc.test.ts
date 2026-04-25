/**
 * Integration tests for src/modifiers-rpc.ts → src/modifiers.ts
 * Seam #221
 *
 * Verifies:
 *   - buyModifier, buyPowerup, socketModifier, equipPowerupForDebate, getUserInventory
 *   - correct RPC names and params passed via safeRpc
 *   - error paths return { success: false, error }
 *   - getUserInventory returns typed UserInventory or null on failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    auth: mockAuth,
  })),
}));

// ── Shared beforeEach ────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockAuth.getSession.mockReset();
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  // Default: successful RPC returning empty data
  mockRpc.mockResolvedValue({ data: { success: true }, error: null });
});

// ── ARCH check ───────────────────────────────────────────────────────────────

describe('ARCH — modifiers-rpc.ts import surface', () => {
  it('only imports from ./auth.ts, ./contracts/rpc-schemas.ts, and type-only from ./modifiers.ts', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/modifiers-rpc.ts'),
      'utf8',
    );
    const importLines = src
      .split('\n')
      .filter((l) => /from\s+['"]/.test(l));

    const sources = importLines.map((l) => {
      const m = l.match(/from\s+['"](.*?)['"]/);
      return m ? m[1] : '';
    });

    // Must import safeRpc from auth
    expect(sources.some((s) => s.includes('auth'))).toBe(true);
    // Must import schema from contracts/rpc-schemas
    expect(sources.some((s) => s.includes('rpc-schemas'))).toBe(true);
    // Must reference modifiers for the UserInventory type
    expect(sources.some((s) => s.includes('modifiers'))).toBe(true);

    // Must NOT import from any wall modules
    const wallModules = [
      'webrtc', 'feed-room', 'intro-music', 'cards', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-sounds', 'peermetrics',
    ];
    for (const wall of wallModules) {
      expect(sources.some((s) => s.includes(wall))).toBe(false);
    }
  });
});

// ── TC1: buyModifier success ─────────────────────────────────────────────────

describe('TC1 — buyModifier calls buy_modifier RPC with p_effect_id and returns success shape', () => {
  it('calls safeRpc("buy_modifier", { p_effect_id }) and returns modifier_id + cost', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true, modifier_id: 'mod-uuid-123', cost: 50 },
      error: null,
    });

    const { buyModifier } = await import('../../src/modifiers-rpc.ts');
    const result = await buyModifier('effect-001');

    expect(mockRpc).toHaveBeenCalledOnce();
    const [rpcName, rpcParams] = mockRpc.mock.calls[0];
    expect(rpcName).toBe('buy_modifier');
    expect(rpcParams).toMatchObject({ p_effect_id: 'effect-001' });

    expect(result.success).toBe(true);
    expect(result.modifier_id).toBe('mod-uuid-123');
    expect(result.cost).toBe(50);
  });
});

// ── TC2: buyModifier error path ──────────────────────────────────────────────

describe('TC2 — buyModifier returns { success: false, error } when RPC errors', () => {
  it('maps RPC error to { success: false, error: message }', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'insufficient tokens' },
    });

    const { buyModifier } = await import('../../src/modifiers-rpc.ts');
    const result = await buyModifier('effect-001');

    expect(result.success).toBe(false);
    expect(result.error).toBe('insufficient tokens');
    expect(result.modifier_id).toBeUndefined();
  });
});

// ── TC3: buyPowerup success ──────────────────────────────────────────────────

describe('TC3 — buyPowerup calls buy_powerup with p_effect_id + p_quantity and returns new_quantity', () => {
  it('passes quantity to RPC and surfaces new_quantity in return value', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true, new_quantity: 5, cost: 20 },
      error: null,
    });

    const { buyPowerup } = await import('../../src/modifiers-rpc.ts');
    const result = await buyPowerup('pu-effect-002', 3);

    expect(mockRpc).toHaveBeenCalledOnce();
    const [rpcName, rpcParams] = mockRpc.mock.calls[0];
    expect(rpcName).toBe('buy_powerup');
    expect(rpcParams).toMatchObject({ p_effect_id: 'pu-effect-002', p_quantity: 3 });

    expect(result.success).toBe(true);
    expect(result.new_quantity).toBe(5);
    expect(result.cost).toBe(20);
  });

  it('defaults quantity to 1 when not provided', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true, new_quantity: 1, cost: 20 },
      error: null,
    });

    const { buyPowerup } = await import('../../src/modifiers-rpc.ts');
    await buyPowerup('pu-effect-003');

    const [, rpcParams] = mockRpc.mock.calls[0];
    expect(rpcParams.p_quantity).toBe(1);
  });
});

// ── TC4: socketModifier ──────────────────────────────────────────────────────

describe('TC4 — socketModifier calls socket_modifier with correct triple of params', () => {
  it('passes p_reference_id, p_socket_index (0-based), p_modifier_id to RPC', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true },
      error: null,
    });

    const { socketModifier } = await import('../../src/modifiers-rpc.ts');
    const result = await socketModifier('ref-uuid-abc', 0, 'mod-uuid-xyz');

    expect(mockRpc).toHaveBeenCalledOnce();
    const [rpcName, rpcParams] = mockRpc.mock.calls[0];
    expect(rpcName).toBe('socket_modifier');
    expect(rpcParams).toMatchObject({
      p_reference_id: 'ref-uuid-abc',
      p_socket_index: 0,
      p_modifier_id: 'mod-uuid-xyz',
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns { success: false, error } on RPC failure', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'slot already occupied' },
    });

    const { socketModifier } = await import('../../src/modifiers-rpc.ts');
    const result = await socketModifier('ref-uuid-abc', 1, 'mod-uuid-xyz');

    expect(result.success).toBe(false);
    expect(result.error).toBe('slot already occupied');
  });
});

// ── TC5: equipPowerupForDebate ───────────────────────────────────────────────

describe('TC5 — equipPowerupForDebate calls equip_powerup_for_debate with debate + effect ids', () => {
  it('passes p_debate_id and p_effect_id, returns slots_used on success', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true, slots_used: 2 },
      error: null,
    });

    const { equipPowerupForDebate } = await import('../../src/modifiers-rpc.ts');
    const result = await equipPowerupForDebate('debate-uuid-001', 'pu-effect-004');

    expect(mockRpc).toHaveBeenCalledOnce();
    const [rpcName, rpcParams] = mockRpc.mock.calls[0];
    expect(rpcName).toBe('equip_powerup_for_debate');
    expect(rpcParams).toMatchObject({
      p_debate_id: 'debate-uuid-001',
      p_effect_id: 'pu-effect-004',
    });

    expect(result.success).toBe(true);
    expect(result.slots_used).toBe(2);
  });

  it('returns { success: false, error } when equip fails', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'max 3 powerups per debate' },
    });

    const { equipPowerupForDebate } = await import('../../src/modifiers-rpc.ts');
    const result = await equipPowerupForDebate('debate-uuid-001', 'pu-effect-005');

    expect(result.success).toBe(false);
    expect(result.error).toBe('max 3 powerups per debate');
  });
});

// ── TC6: getUserInventory with debateId ──────────────────────────────────────

describe('TC6 — getUserInventory passes p_debate_id and returns typed UserInventory', () => {
  it('calls get_user_modifier_inventory with provided debateId and surfaces 3 arrays', async () => {
    const inventoryFixture = {
      unsocketed_modifiers: [
        {
          modifier_id: 'mod-1',
          effect_id: 'eff-1',
          name: 'Crowd Surge',
          description: '+10 crowd score',
          category: 'crowd',
          timing: 'end_of_debate',
          tier_gate: 'common',
          acquired_at: '2026-04-01T00:00:00Z',
          acquisition_type: 'purchase',
        },
      ],
      powerup_stock: [
        {
          effect_id: 'pu-1',
          name: 'Quick Draw',
          description: 'Extra rebuttal',
          category: 'special',
          timing: 'in_debate',
          tier_gate: 'uncommon',
          quantity: 3,
          pu_cost: 15,
        },
      ],
      equipped_loadout: [],
    };

    mockRpc.mockResolvedValueOnce({ data: inventoryFixture, error: null });

    const { getUserInventory } = await import('../../src/modifiers-rpc.ts');
    const result = await getUserInventory('debate-uuid-999');

    expect(mockRpc).toHaveBeenCalledOnce();
    const [rpcName, rpcParams] = mockRpc.mock.calls[0];
    expect(rpcName).toBe('get_user_modifier_inventory');
    expect(rpcParams).toMatchObject({ p_debate_id: 'debate-uuid-999' });

    expect(result).not.toBeNull();
    expect(result!.unsocketed_modifiers).toHaveLength(1);
    expect(result!.unsocketed_modifiers[0].modifier_id).toBe('mod-1');
    expect(result!.powerup_stock).toHaveLength(1);
    expect(result!.powerup_stock[0].quantity).toBe(3);
    expect(result!.equipped_loadout).toHaveLength(0);
  });
});

// ── TC7: getUserInventory without debateId → p_debate_id: null ──────────────

describe('TC7 — getUserInventory() without arg passes p_debate_id: null', () => {
  it('sends p_debate_id: null when no argument given', async () => {
    const inventoryFixture = {
      unsocketed_modifiers: [],
      powerup_stock: [],
      equipped_loadout: [],
    };
    mockRpc.mockResolvedValueOnce({ data: inventoryFixture, error: null });

    const { getUserInventory } = await import('../../src/modifiers-rpc.ts');
    const result = await getUserInventory();

    const [, rpcParams] = mockRpc.mock.calls[0];
    expect(rpcParams.p_debate_id).toBeNull();

    expect(result).not.toBeNull();
    expect(result!.unsocketed_modifiers).toEqual([]);
  });

  it('returns null when RPC errors', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'not authenticated' },
    });

    const { getUserInventory } = await import('../../src/modifiers-rpc.ts');
    const result = await getUserInventory();

    expect(result).toBeNull();
  });
});
