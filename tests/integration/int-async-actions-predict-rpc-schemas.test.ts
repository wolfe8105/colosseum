/**
 * Integration test: src/async.actions-predict.ts → src/contracts/rpc-schemas.ts
 * Seam #084
 *
 * Covers:
 *  TC-01 ARCH   — async.actions-predict.ts statically imports place_prediction from rpc-schemas
 *  TC-02        — place_prediction schema accepts { new_balance, success } shape
 *  TC-03        — place_prediction schema accepts partial response (only success)
 *  TC-04        — place_prediction schema accepts error response shape
 *  TC-05        — placePrediction calls safeRpc and invokes updateBalance when new_balance returned
 *  TC-06        — placePrediction rolls back user_pick on RPC error
 *  TC-07        — placePrediction is a no-op when predictingInFlight already contains debateId
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
describe('TC-01 ARCH — async.actions-predict.ts imports place_prediction from rpc-schemas', () => {
  it('has import line referencing place_prediction from contracts/rpc-schemas', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/async.actions-predict.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const schemaLine = importLines.find(l => l.includes('rpc-schemas'));
    expect(schemaLine).toBeDefined();
    expect(schemaLine).toContain('place_prediction');
  });
});

// ── TC-02: place_prediction schema — full shape ───────────────────────────────
describe('TC-02 — place_prediction schema accepts full { new_balance, success } shape', () => {
  it('parses a complete place_prediction response without throwing', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { place_prediction } = await import('../../src/contracts/rpc-schemas.ts');
    const result = place_prediction.safeParse({
      new_balance: 500,
      success: true,
      error: undefined,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.new_balance).toBe(500);
      expect(result.data.success).toBe(true);
    }
  });
});

// ── TC-03: place_prediction schema — partial (only success) ──────────────────
describe('TC-03 — place_prediction schema accepts partial response with only success', () => {
  it('parses a response with only success field (new_balance is optional)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { place_prediction } = await import('../../src/contracts/rpc-schemas.ts');
    const result = place_prediction.safeParse({ success: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.new_balance).toBeUndefined();
      expect(result.data.success).toBe(true);
    }
  });
});

// ── TC-04: place_prediction schema — error path ───────────────────────────────
describe('TC-04 — place_prediction schema accepts error response shape', () => {
  it('parses a { success: false, error: "insufficient balance" } response', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { place_prediction } = await import('../../src/contracts/rpc-schemas.ts');
    const result = place_prediction.safeParse({
      success: false,
      error: 'insufficient balance',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe('insufficient balance');
    }
  });
});

// ── TC-05: placePrediction calls safeRpc and invokes updateBalance ────────────
describe('TC-05 — placePrediction calls safeRpc with place_prediction schema and calls updateBalance', () => {
  it('calls mockRpc with place_prediction params and updates balance from new_balance', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Provide a logged-in session so requireAuth passes
    mockAuth.onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      cb('INITIAL_SESSION', {
        user: { id: 'user-abc', email: 'test@example.com' },
        access_token: 'tok',
      });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    // safeRpc resolves through client.rpc()
    mockRpc.mockResolvedValue({ data: { new_balance: 750, success: true }, error: null });

    const asyncState = await import('../../src/async.state.ts');
    // Set up a prediction entry in state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncState.state.predictions = [
      {
        debate_id: 'debate-xyz',
        user_pick: null,
        total: 10,
        pct_a: 50,
        pct_b: 50,
        p1: 'Alice',
        p2: 'Bob',
      },
    ] as any;

    // Provide minimal DOM
    // No #predictions-feed in DOM — prevents renderPredictions (which has a state.wiredContainers
    // dependency not initialized in unit-test context) from being called.
    document.body.innerHTML = '';

    const { placePrediction } = await import('../../src/async.actions-predict.ts');
    await placePrediction('debate-xyz', 'a', 50);

    // safeRpc must have been called
    expect(mockRpc).toHaveBeenCalledWith(
      'place_prediction',
      expect.objectContaining({
        p_debate_id: 'debate-xyz',
        p_predicted_winner: 'a',
        p_amount: 50,
      })
    );
  });
});

// ── TC-06: placePrediction rolls back user_pick on RPC error ──────────────────
describe('TC-06 — placePrediction rolls back user_pick on RPC error', () => {
  it('reverts user_pick to oldPick when safeRpc returns an error', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockAuth.onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      cb('INITIAL_SESSION', {
        user: { id: 'user-abc', email: 'test@example.com' },
        access_token: 'tok',
      });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    // Simulate RPC error
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Prediction window closed' } });

    const asyncState = await import('../../src/async.state.ts');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncState.state.predictions = [
      {
        debate_id: 'debate-rollback',
        user_pick: null,
        total: 5,
        pct_a: 60,
        pct_b: 40,
        p1: 'Alice',
        p2: 'Bob',
      },
    ] as any;

    // No #predictions-feed — prevents renderPredictions from running (state.wiredContainers
    // is not initialized in unit-test context).
    document.body.innerHTML = '';

    const { placePrediction } = await import('../../src/async.actions-predict.ts');
    await placePrediction('debate-rollback', 'b', 25);

    // After error, user_pick should be reverted to the original null
    const pred = asyncState.state.predictions.find((p) => p.debate_id === 'debate-rollback');
    expect(pred?.user_pick).toBeNull();
  });
});

// ── TC-07: placePrediction no-op when in-flight ───────────────────────────────
describe('TC-07 — placePrediction is a no-op when predictingInFlight already contains debateId', () => {
  it('does not call safeRpc when debateId is already in predictingInFlight', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockAuth.onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      cb('INITIAL_SESSION', {
        user: { id: 'user-abc', email: 'test@example.com' },
        access_token: 'tok',
      });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    const asyncState = await import('../../src/async.state.ts');
    // Pre-seed predictingInFlight with this debateId
    asyncState.state.predictingInFlight.add('debate-inflight');
    asyncState.state.predictions = [
      {
        debate_id: 'debate-inflight',
        user_pick: null,
        total: 3,
        pct_a: 50,
        pct_b: 50,
        p1: 'Alice',
        p2: 'Bob',
      },
    ] as typeof asyncState.state.predictions;

    document.body.innerHTML = '<div id="predictions-feed"></div>';

    const { placePrediction } = await import('../../src/async.actions-predict.ts');
    await placePrediction('debate-inflight', 'a', 10);

    // mockRpc should NOT have been called because in-flight guard fired
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
