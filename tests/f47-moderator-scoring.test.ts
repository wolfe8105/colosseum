// ============================================================
// F-47 STEP 8 — MODERATOR SCORING TESTS
// Tests scoreModerator() from src/auth.ts.
// jsdom environment required — auth.ts has a top-level
// document.readyState block that fires on module load.
// vi.hoisted() required — vi.mock factory is hoisted before
// const declarations, so mockRpc must be declared with
// vi.hoisted() to avoid TDZ errors during module init.
// Session 175.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── mockRpc must be hoisted to avoid TDZ in vi.mock factory ──

const mockRpc = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  })),
}));

import { scoreModerator } from '../src/auth.ts';

// ── Setup ────────────────────────────────────────────────────

beforeEach(() => {
  mockRpc.mockReset();
});

// ── TC1: Correct RPC name ─────────────────────────────────────

describe('TC1 — correct RPC function name', () => {
  it('calls score_moderator (not a renamed or legacy function)', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    await scoreModerator('debate-tc1', 25);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [fnName] = mockRpc.mock.calls[0];
    expect(fnName).toBe('score_moderator');
  });
});

// ── TC2: Named params — p_debate_id and p_score ───────────────

describe('TC2 — named parameters', () => {
  it('sends p_debate_id and p_score as named keys (LM-188 guard)', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    await scoreModerator('debate-tc2-abc', 25);

    const [, args] = mockRpc.mock.calls[0];
    expect(typeof args).toBe('object');
    expect(Object.keys(args)).toEqual(['p_debate_id', 'p_score']);
  });
});

// ── TC3: Debate ID threads through correctly ──────────────────

describe('TC3 — debate ID passed correctly', () => {
  it('p_debate_id matches the value passed to scoreModerator', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    await scoreModerator('debate-specific-id-xyz', 25);

    const [, args] = mockRpc.mock.calls[0];
    expect(args.p_debate_id).toBe('debate-specific-id-xyz');
  });
});

// ── TC4: Happy path — success ─────────────────────────────────

describe('TC4 — happy path success', () => {
  it('returns { success: true } when RPC succeeds', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    const result = await scoreModerator('debate-tc4', 25);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

// ── TC5: Null data fallback ───────────────────────────────────

describe('TC5 — null data fallback', () => {
  it('returns { success: true } when RPC returns null data (no error)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await scoreModerator('debate-tc5', 25);

    expect(result.success).toBe(true);
  });
});

// ── TC6: RPC error → failure ──────────────────────────────────

describe('TC6 — RPC error returns failure', () => {
  it('returns { success: false, error } when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Permission denied: not a participant' },
    });

    const result = await scoreModerator('debate-tc6', 25);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied');
  });
});

// ── TC7: Debater fair score (👍) = 25 ─────────────────────────

describe('TC7 — fair score value', () => {
  it('sends p_score = 25 for a thumbs-up rating', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    await scoreModerator('debate-tc7', 25);

    const [, args] = mockRpc.mock.calls[0];
    expect(args.p_score).toBe(25);
  });
});

// ── TC8: Debater unfair score (👎) = 0 ────────────────────────

describe('TC8 — unfair score value', () => {
  it('sends p_score = 0 for a thumbs-down rating and is non-negative', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    await scoreModerator('debate-tc8', 0);

    const [, args] = mockRpc.mock.calls[0];
    expect(args.p_score).toBe(0);
    expect(args.p_score).toBeGreaterThanOrEqual(0);
  });
});
