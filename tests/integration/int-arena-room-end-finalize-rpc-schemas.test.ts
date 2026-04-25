// ============================================================
// INTEGRATOR — arena-room-end-finalize.ts → rpc-schemas
// Seam #085
// Boundary: applyEndOfDebateModifiers() imports
//           apply_end_of_debate_modifiers schema from rpc-schemas
//           and passes it to safeRpc() for runtime validation.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let applyEndOfDebateModifiers: (
  debate: Record<string, unknown>,
  scoreA: number | null,
  scoreB: number | null,
) => Promise<{ scoreA: number | null; scoreB: number | null; breakdown: unknown }>;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
  );
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });

  await vi.advanceTimersByTimeAsync(50);

  const mod = await import('../../src/arena/arena-room-end-finalize.ts');
  applyEndOfDebateModifiers = mod.applyEndOfDebateModifiers;
});

// ============================================================
// ARCH: rpc-schemas import still present in source
// ============================================================

describe('ARCH — rpc-schemas import', () => {
  it('arena-room-end-finalize.ts imports from ../contracts/rpc-schemas.ts', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-room-end-finalize.ts'),
      'utf8',
    );
    const importLines = src.split('\n').filter((l) => /from\s+['"]/.test(l));
    const hasRpcSchemas = importLines.some((l) => l.includes('../contracts/rpc-schemas'));
    expect(hasRpcSchemas).toBe(true);
  });

  it('specifically imports apply_end_of_debate_modifiers from rpc-schemas', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-room-end-finalize.ts'),
      'utf8',
    );
    const importLines = src.split('\n').filter((l) => /from\s+['"]/.test(l));
    const schemaImportLine = importLines.find((l) => l.includes('../contracts/rpc-schemas'));
    expect(schemaImportLine).toBeDefined();
    expect(schemaImportLine).toContain('apply_end_of_debate_modifiers');
  });
});

// ============================================================
// TC-1: apply_end_of_debate_modifiers schema shape (Zod object)
// ============================================================

describe('rpc-schemas — apply_end_of_debate_modifiers schema shape', () => {
  it('schema exports a Zod object with debater_a and debater_b keys', async () => {
    const { apply_end_of_debate_modifiers: schema } = await import(
      '../../src/contracts/rpc-schemas.ts'
    );
    // Zod object has a .shape property
    expect(schema).toBeDefined();
    expect(typeof schema.parse).toBe('function');
    expect(schema.shape).toBeDefined();
    expect(schema.shape.debater_a).toBeDefined();
    expect(schema.shape.debater_b).toBeDefined();
  });

  it('schema accepts valid breakdown data with raw_score, adjustments, final_score', async () => {
    const { apply_end_of_debate_modifiers: schema } = await import(
      '../../src/contracts/rpc-schemas.ts'
    );
    const validData = {
      debater_a: { raw_score: 80, adjustments: [], final_score: 80 },
      debater_b: { raw_score: 70, adjustments: [], final_score: 70 },
    };
    expect(() => schema.parse(validData)).not.toThrow();
    const result = schema.parse(validData);
    expect(result.debater_a.final_score).toBe(80);
    expect(result.debater_b.final_score).toBe(70);
  });

  it('schema accepts optional inventory_effects array', async () => {
    const { apply_end_of_debate_modifiers: schema } = await import(
      '../../src/contracts/rpc-schemas.ts'
    );
    const withInventory = {
      debater_a: { raw_score: 75, adjustments: [{ effect_name: 'bonus', delta: 5 }], final_score: 80 },
      debater_b: { raw_score: 70, adjustments: [], final_score: 70 },
      inventory_effects: [],
    };
    const result = schema.parse(withInventory);
    expect(result.inventory_effects).toEqual([]);
  });
});

// ============================================================
// TC-2: applyEndOfDebateModifiers — role 'a' score assignment
// ============================================================

describe('applyEndOfDebateModifiers — role a score assignment', () => {
  it('when role=a: scoreA gets debater_a.final_score, scoreB gets debater_b.final_score', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        debater_a: { raw_score: 80, adjustments: [], final_score: 85 },
        debater_b: { raw_score: 60, adjustments: [], final_score: 65 },
      },
      error: null,
    });

    const debate = { id: 'debate-uuid-001', role: 'a' };
    const result = await applyEndOfDebateModifiers(debate, null, null);

    expect(result.scoreA).toBe(85);
    expect(result.scoreB).toBe(65);
    expect(result.breakdown).not.toBeNull();
  });
});

// ============================================================
// TC-3: applyEndOfDebateModifiers — role 'b' score swap
// ============================================================

describe('applyEndOfDebateModifiers — role b score swap', () => {
  it('when role=b: scoreA gets debater_b.final_score, scoreB gets debater_a.final_score', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        debater_a: { raw_score: 80, adjustments: [], final_score: 85 },
        debater_b: { raw_score: 60, adjustments: [], final_score: 65 },
      },
      error: null,
    });

    const debate = { id: 'debate-uuid-002', role: 'b' };
    const result = await applyEndOfDebateModifiers(debate, null, null);

    // b-side: my score = debater_b.final_score = 65, opponent = debater_a.final_score = 85
    expect(result.scoreA).toBe(65);
    expect(result.scoreB).toBe(85);
  });
});

// ============================================================
// TC-4: applyEndOfDebateModifiers — null/falsy RPC data
// ============================================================

describe('applyEndOfDebateModifiers — null RPC data', () => {
  it('preserves original scoreA/scoreB when RPC returns null data', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const debate = { id: 'debate-uuid-003', role: 'a' };
    const result = await applyEndOfDebateModifiers(debate, 50, 40);

    expect(result.scoreA).toBe(50);
    expect(result.scoreB).toBe(40);
    expect(result.breakdown).toBeNull();
  });

  it('preserves original scores and returns breakdown=null when RPC throws', async () => {
    mockRpc.mockRejectedValueOnce(new Error('network error'));

    const debate = { id: 'debate-uuid-004', role: 'a' };
    const result = await applyEndOfDebateModifiers(debate, 30, 20);

    expect(result.scoreA).toBe(30);
    expect(result.scoreB).toBe(20);
    expect(result.breakdown).toBeNull();
  });
});
