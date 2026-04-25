/**
 * Integration test: src/arena/arena-config-category.ts → src/contracts/rpc-schemas.ts
 * Seam #088
 *
 * Covers:
 *  TC-01 ARCH   — arena-config-category.ts statically imports create_debate_card
 *                 from contracts/rpc-schemas
 *  TC-02        — create_debate_card schema accepts full { success, error, id } payload
 *  TC-03        — create_debate_card schema accepts minimal {} response (all fields optional)
 *  TC-04        — create_debate_card schema accepts error-only payload { error: 'Not authorized' }
 *  TC-05        — create_debate_card schema accepts a success payload with id only
 *  TC-06        — create_debate_card schema rejects wrong type for id (number instead of string)
 *  TC-07        — create_debate_card schema passes through extra keys (passthrough contract)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Supabase mock (only mock) ─────────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    auth: mockAuth,
    from: mockFrom,
  })),
}));

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.getSession.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockAuth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
});

// ── TC-01: ARCH ───────────────────────────────────────────────────────────────
describe('TC-01 ARCH — arena-config-category.ts imports create_debate_card from rpc-schemas', () => {
  it('has an import line referencing create_debate_card from contracts/rpc-schemas', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-config-category.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const schemaLine = importLines.find(l => l.includes('rpc-schemas'));
    expect(schemaLine).toBeDefined();
    expect(schemaLine).toContain('create_debate_card');
  });
});

// ── TC-02: create_debate_card schema — full payload ───────────────────────────
describe('TC-02 — create_debate_card schema accepts full { success, error, id } payload', () => {
  it('parses a complete create_debate_card success response without throwing', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { create_debate_card } = await import('../../src/contracts/rpc-schemas.ts');
    const result = create_debate_card.safeParse({
      success: true,
      error: undefined,
      id: 'debate-uuid-abc-123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
      expect(result.data.id).toBe('debate-uuid-abc-123');
    }
  });
});

// ── TC-03: create_debate_card schema — minimal empty response ─────────────────
describe('TC-03 — create_debate_card schema accepts minimal {} response', () => {
  it('parses an empty object (all fields optional)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { create_debate_card } = await import('../../src/contracts/rpc-schemas.ts');
    const result = create_debate_card.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ── TC-04: create_debate_card schema — error-only payload ────────────────────
describe('TC-04 — create_debate_card schema accepts error-only payload', () => {
  it('parses { error: "Not authorized" } as valid', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { create_debate_card } = await import('../../src/contracts/rpc-schemas.ts');
    const result = create_debate_card.safeParse({ error: 'Not authorized' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error).toBe('Not authorized');
    }
  });
});

// ── TC-05: create_debate_card schema — id-only payload ───────────────────────
describe('TC-05 — create_debate_card schema accepts a success payload with id only', () => {
  it('parses { id: "new-debate-uuid-456" } as valid', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { create_debate_card } = await import('../../src/contracts/rpc-schemas.ts');
    const result = create_debate_card.safeParse({ id: 'new-debate-uuid-456' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('new-debate-uuid-456');
    }
  });
});

// ── TC-06: create_debate_card schema — wrong type for id ─────────────────────
describe('TC-06 — create_debate_card schema rejects wrong type for id (number instead of string)', () => {
  it('fails parse when id is a number instead of string', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { create_debate_card } = await import('../../src/contracts/rpc-schemas.ts');
    const result = create_debate_card.safeParse({
      success: true,
      id: 12345, // wrong type: number instead of string
    });
    expect(result.success).toBe(false);
  });
});

// ── TC-07: create_debate_card schema — passthrough extra keys ─────────────────
describe('TC-07 — create_debate_card schema passes through extra keys', () => {
  it('preserves extra keys not in the schema definition', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { create_debate_card } = await import('../../src/contracts/rpc-schemas.ts');
    const result = create_debate_card.safeParse({
      success: true,
      id: 'some-uuid',
      extra_server_key: 'extra_value',
      created_at: '2026-04-25T00:00:00Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // passthrough means extra keys survive
      expect((result.data as Record<string, unknown>).extra_server_key).toBe('extra_value');
    }
  });
});
