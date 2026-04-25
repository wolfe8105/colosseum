// ============================================================
// INTEGRATOR — async.fetch + async.state
// Seam #210: fetchPredictions / fetchStandaloneQuestions
//            read from safeRpc and write into state
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi
    .fn()
    .mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: vi.fn(),
    auth: mockAuth,
  })),
}));

// ============================================================
// HELPERS
// ============================================================

function makePredictionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    debate_id: 'debate-uuid-001',
    topic: 'AI will dominate by 2030',
    p1_username: 'alice',
    p2_username: 'bob',
    p1_display_name: 'Alice Display',
    p2_display_name: 'Bob Display',
    p1_elo: 1350,
    p2_elo: 1280,
    prediction_count: 100,
    picks_a: 60,
    picks_b: 40,
    status: 'live',
    ...overrides,
  };
}

function makeQuestionRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'question-uuid-001',
    topic: 'Should remote work be default?',
    side_a_label: 'Yes',
    side_b_label: 'No',
    category: 'work',
    picks_a: 30,
    picks_b: 20,
    ...overrides,
  };
}

// ============================================================
// MODULE RE-IMPORT PER TEST
// ============================================================

let fetchPredictions: () => Promise<void>;
let fetchStandaloneQuestions: (category?: string) => Promise<void>;
let state: { predictions: unknown[]; standaloneQuestions: unknown[] };

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });

  // auth.core listens to onAuthStateChange — provide a no-op unsubscribe
  mockAuth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });

  // Advance past the 6-second auth safety timeout
  const authMod = await import('../../src/auth.core.ts');
  void authMod;

  const fetchMod = await import('../../src/async.fetch.ts');
  fetchPredictions = fetchMod.fetchPredictions;
  fetchStandaloneQuestions = fetchMod.fetchStandaloneQuestions;

  const stateMod = await import('../../src/async.state.ts');
  state = stateMod.state as unknown as { predictions: unknown[]; standaloneQuestions: unknown[] };

  // Reset state between tests
  state.predictions = [];
  state.standaloneQuestions = [];
});

// ============================================================
// ARCH: import lines only contain real 'from' imports
// ============================================================

describe('ARCH: async.fetch imports', () => {
  it('only mocks @supabase/supabase-js — no other mocked boundaries', async () => {
    const source = await fetch(
      new URL('../../src/async.fetch.ts', import.meta.url)
    ).then((r) => r.text()).catch(() => null);

    // fallback if fetch fails in node — read via fs
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve('src/async.fetch.ts');
    const text = fs.readFileSync(filePath, 'utf8');

    const importLines = text
      .split('\n')
      .filter((l) => /from\s+['"]/.test(l));

    // Must import from async.state
    expect(importLines.some((l) => l.includes('async.state'))).toBe(true);
    // Must NOT import from webrtc / arena-sounds / deepgram / etc.
    const wallTerms = ['webrtc', 'feed-room', 'deepgram', 'voicememo', 'arena-css', 'arena-sounds'];
    for (const term of wallTerms) {
      expect(importLines.some((l) => l.includes(term))).toBe(false);
    }
  });
});

// ============================================================
// TC-1: fetchPredictions — happy path populates state
// ============================================================

describe('fetchPredictions', () => {
  it('TC-1: calls get_hot_predictions with p_limit:10 and populates state.predictions', async () => {
    const row = makePredictionRow();
    mockRpc.mockResolvedValueOnce({ data: [row], error: null });

    await fetchPredictions();

    expect(mockRpc).toHaveBeenCalledWith(
      'get_hot_predictions',
      expect.objectContaining({ p_limit: 10 })
    );

    expect(state.predictions).toHaveLength(1);
    const pred = state.predictions[0] as Record<string, unknown>;
    expect(pred['debate_id']).toBe('debate-uuid-001');
    expect(pred['topic']).toBe('AI will dominate by 2030');
    expect(pred['p1']).toBe('alice');
    expect(pred['p2']).toBe('bob');
    expect(pred['p1_elo']).toBe(1350);
    expect(pred['p2_elo']).toBe(1280);
    expect(pred['total']).toBe(100);
    expect(pred['pct_a']).toBe(60);
    expect(pred['pct_b']).toBe(40);
    expect(pred['status']).toBe('live');
    expect(pred['user_pick']).toBeNull();
  });

  // ============================================================
  // TC-2: FEATURES.predictions=false → RPC not called
  // ============================================================

  it('TC-2: does not call RPC when FEATURES.predictions is false', async () => {
    // Patch the FEATURES flag
    const configMod = await import('../../src/config.ts');
    const origValue = configMod.FEATURES.predictions;
    (configMod.FEATURES as Record<string, unknown>)['predictions'] = false;

    try {
      await fetchPredictions();
      expect(mockRpc).not.toHaveBeenCalled();
      expect(state.predictions).toHaveLength(0);
    } finally {
      (configMod.FEATURES as Record<string, unknown>)['predictions'] = origValue;
    }
  });

  // ============================================================
  // TC-3: Empty array result → state.predictions unchanged
  // ============================================================

  it('TC-3: empty RPC result leaves state.predictions empty', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    await fetchPredictions();

    // Empty array means the data.length > 0 guard skips assignment
    expect(state.predictions).toHaveLength(0);
  });

  // ============================================================
  // TC-4: Fallback display names when usernames null
  // ============================================================

  it('TC-4: falls back to display_name then "Side A"/"Side B" when usernames absent', async () => {
    const rowNoUsername = makePredictionRow({
      p1_username: null,
      p2_username: null,
    });
    mockRpc.mockResolvedValueOnce({ data: [rowNoUsername], error: null });

    await fetchPredictions();

    const pred = state.predictions[0] as Record<string, unknown>;
    expect(pred['p1']).toBe('Alice Display');
    expect(pred['p2']).toBe('Bob Display');
  });

  it('TC-4b: falls back to "Side A"/"Side B" when both username and display_name absent', async () => {
    const rowNoBoth = makePredictionRow({
      p1_username: null,
      p2_username: null,
      p1_display_name: null,
      p2_display_name: null,
    });
    mockRpc.mockResolvedValueOnce({ data: [rowNoBoth], error: null });

    await fetchPredictions();

    const pred = state.predictions[0] as Record<string, unknown>;
    expect(pred['p1']).toBe('Side A');
    expect(pred['p2']).toBe('Side B');
  });
});

// ============================================================
// TC-5: fetchStandaloneQuestions — no category
// ============================================================

describe('fetchStandaloneQuestions', () => {
  it('TC-5: calls get_prediction_questions with p_limit:20, p_category:null when no arg', async () => {
    const q = makeQuestionRow();
    mockRpc.mockResolvedValueOnce({ data: [q], error: null });

    await fetchStandaloneQuestions();

    expect(mockRpc).toHaveBeenCalledWith(
      'get_prediction_questions',
      expect.objectContaining({ p_limit: 20, p_category: null })
    );

    expect(state.standaloneQuestions).toHaveLength(1);
    const question = state.standaloneQuestions[0] as Record<string, unknown>;
    expect(question['id']).toBe('question-uuid-001');
    expect(question['topic']).toBe('Should remote work be default?');
    expect(question['category']).toBe('work');
  });

  // ============================================================
  // TC-6: fetchStandaloneQuestions with category string
  // ============================================================

  it('TC-6: passes category string as p_category', async () => {
    const q = makeQuestionRow({ category: 'sports' });
    mockRpc.mockResolvedValueOnce({ data: [q], error: null });

    await fetchStandaloneQuestions('sports');

    expect(mockRpc).toHaveBeenCalledWith(
      'get_prediction_questions',
      expect.objectContaining({ p_limit: 20, p_category: 'sports' })
    );

    expect(state.standaloneQuestions).toHaveLength(1);
    const question = state.standaloneQuestions[0] as Record<string, unknown>;
    expect(question['category']).toBe('sports');
  });

  // ============================================================
  // TC-7: RPC error → state unchanged, no throw
  // ============================================================

  it('TC-7: RPC error leaves state.standaloneQuestions empty and does not throw', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('DB timeout') });

    await expect(fetchStandaloneQuestions()).resolves.toBeUndefined();
    expect(state.standaloneQuestions).toHaveLength(0);
  });
});
