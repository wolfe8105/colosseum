/**
 * Integration test: src/pages/home.feed.ts → src/contracts/rpc-schemas.ts
 * Seam #066
 *
 * Covers:
 *  TC-01 ARCH   — home.feed.ts statically imports create_debate_card, cancel_debate_card,
 *                 and react_debate_card from contracts/rpc-schemas
 *  TC-02        — create_debate_card schema accepts { success, error, id } shape
 *  TC-03        — create_debate_card schema accepts partial response (only id)
 *  TC-04        — cancel_debate_card schema accepts { success: false, error: 'not owner' }
 *  TC-05        — react_debate_card schema accepts { reacted: true, reaction_count: 42 }
 *  TC-06        — react_debate_card schema rejects response missing required reacted field
 *  TC-07        — react_debate_card schema rejects response with wrong type for reaction_count
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
describe('TC-01 ARCH — home.feed.ts imports rpc-schemas exports', () => {
  it('has import lines referencing create_debate_card, cancel_debate_card, react_debate_card from rpc-schemas', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/home.feed.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const schemaLine = importLines.find(l => l.includes('rpc-schemas'));
    expect(schemaLine).toBeDefined();
    expect(schemaLine).toContain('create_debate_card');
    expect(schemaLine).toContain('cancel_debate_card');
    expect(schemaLine).toContain('react_debate_card');
  });
});

// ── TC-02: create_debate_card schema — full shape ─────────────────────────────
describe('TC-02 — create_debate_card schema accepts full { success, error, id } shape', () => {
  it('parses a complete create_debate_card response without throwing', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { create_debate_card } = await import('../../src/contracts/rpc-schemas.ts');
    const result = create_debate_card.safeParse({
      success: true,
      error: undefined,
      id: 'abc-123-uuid',
    });
    expect(result.success).toBe(true);
  });
});

// ── TC-03: create_debate_card schema — partial (only id) ─────────────────────
describe('TC-03 — create_debate_card schema accepts partial response with only id', () => {
  it('parses a response with only id field (all fields optional except passthrough)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { create_debate_card } = await import('../../src/contracts/rpc-schemas.ts');
    const result = create_debate_card.safeParse({ id: 'new-debate-uuid-456' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('new-debate-uuid-456');
    }
  });
});

// ── TC-04: cancel_debate_card schema — error path ────────────────────────────
describe('TC-04 — cancel_debate_card schema accepts { success: false, error: "not owner" }', () => {
  it('parses the error response shape returned when user is not the card owner', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { cancel_debate_card } = await import('../../src/contracts/rpc-schemas.ts');
    const result = cancel_debate_card.safeParse({
      success: false,
      error: 'not owner',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe('not owner');
    }
  });
});

// ── TC-05: react_debate_card schema — valid response ─────────────────────────
describe('TC-05 — react_debate_card schema accepts { reacted: true, reaction_count: 42 }', () => {
  it('parses a valid react toggle response', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { react_debate_card } = await import('../../src/contracts/rpc-schemas.ts');
    const result = react_debate_card.safeParse({
      reacted: true,
      reaction_count: 42,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reacted).toBe(true);
      expect(result.data.reaction_count).toBe(42);
    }
  });
});

// ── TC-06: react_debate_card schema — missing required field ──────────────────
describe('TC-06 — react_debate_card schema rejects response missing required reacted field', () => {
  it('fails parse when reacted field is absent', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { react_debate_card } = await import('../../src/contracts/rpc-schemas.ts');
    const result = react_debate_card.safeParse({
      reaction_count: 5,
      // reacted intentionally omitted
    });
    expect(result.success).toBe(false);
  });
});

// ── TC-07: react_debate_card schema — wrong type for reaction_count ───────────
describe('TC-07 — react_debate_card schema rejects wrong type for reaction_count', () => {
  it('fails parse when reaction_count is a string instead of number', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { react_debate_card } = await import('../../src/contracts/rpc-schemas.ts');
    const result = react_debate_card.safeParse({
      reacted: false,
      reaction_count: '7', // wrong type
    });
    expect(result.success).toBe(false);
  });
});
