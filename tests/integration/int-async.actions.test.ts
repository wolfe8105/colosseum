/**
 * Integration tests — SEAM #493
 * src/async.actions.ts → src/async.actions-predict.ts
 *
 * Verifies the barrel re-export wiring and core behaviour of the three
 * exported functions: placePrediction, pickStandaloneQuestion,
 * openCreatePredictionForm.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── hoisted mocks ────────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ── mock helpers ─────────────────────────────────────────────────

function setupAuthMocks(authenticated = true) {
  vi.doMock('../../src/auth.ts', () => ({
    requireAuth: vi.fn(() => authenticated),
    safeRpc: mockRpc,
    getCurrentUser: vi.fn(() => (authenticated ? { id: 'user-1' } : null)),
    getCurrentProfile: vi.fn(() =>
      authenticated ? { id: 'user-1', display_name: 'Tester' } : null,
    ),
    getSupabaseClient: vi.fn(() => ({ rpc: mockRpc })),
    getIsPlaceholderMode: vi.fn(() => false),
  }));
  vi.doMock('../../src/config.ts', () => ({
    escapeHTML: (s: string) => s,
    showToast: vi.fn(),
    friendlyError: vi.fn(),
    isAnyPlaceholder: false,
    FEATURES: {},
  }));
  vi.doMock('../../src/tokens.ts', () => ({
    claimPrediction: vi.fn(),
    updateBalance: vi.fn(),
  }));
  vi.doMock('../../src/async.render.ts', () => ({
    loadHotTakes: vi.fn(),
    renderPredictions: vi.fn(),
    _hideWagerPicker: vi.fn(),
  }));
  vi.doMock('../../src/async.fetch.ts', () => ({
    fetchStandaloneQuestions: vi.fn().mockResolvedValue(undefined),
  }));
  vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
    place_prediction: {},
  }));
}

function setupPlaceholderMocks() {
  vi.doMock('../../src/auth.ts', () => ({
    requireAuth: vi.fn(() => true),
    safeRpc: mockRpc,
    getCurrentUser: vi.fn(() => ({ id: 'user-1' })),
    getCurrentProfile: vi.fn(() => ({ id: 'user-1', display_name: 'Tester' })),
    getSupabaseClient: vi.fn(() => null),       // no client
    getIsPlaceholderMode: vi.fn(() => true),    // placeholder mode
  }));
  vi.doMock('../../src/config.ts', () => ({
    escapeHTML: (s: string) => s,
    showToast: vi.fn(),
    friendlyError: vi.fn(),
    isAnyPlaceholder: true,
    FEATURES: {},
  }));
  vi.doMock('../../src/tokens.ts', () => ({
    claimPrediction: vi.fn(),
    updateBalance: vi.fn(),
  }));
  vi.doMock('../../src/async.render.ts', () => ({
    loadHotTakes: vi.fn(),
    renderPredictions: vi.fn(),
    _hideWagerPicker: vi.fn(),
  }));
  vi.doMock('../../src/async.fetch.ts', () => ({
    fetchStandaloneQuestions: vi.fn().mockResolvedValue(undefined),
  }));
  vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
    place_prediction: {},
  }));
}

function makePrediction(overrides = {}) {
  return {
    debate_id: 'debate-1',
    topic: 'Test debate',
    p1: 'PlayerOne',
    p2: 'PlayerTwo',
    p1_elo: 1400,
    p2_elo: 1350,
    total: 100,
    pct_a: 60,
    pct_b: 40,
    user_pick: null as null | 'a' | 'b',
    status: 'live',
    ...overrides,
  };
}

function makeQuestion(overrides = {}) {
  return {
    id: 'q-1',
    topic: 'Will AI take over?',
    side_a_label: 'Yes',
    side_b_label: 'No',
    category: null as string | null,
    picks_a: 5,
    picks_b: 3,
    total_picks: 8,
    creator_display_name: 'Tester',
    _userPick: null as null | 'a' | 'b' | undefined,
    ...overrides,
  };
}

// ── shared beforeEach ────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();

  mockRpc.mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });

  document.body.innerHTML = '<div id="predictions-feed"></div>';
});

// ── TC1: ARCH filter ─────────────────────────────────────────────

describe('TC1 — ARCH: async.actions.ts barrel only imports from async.actions-predict', () => {
  it('has exactly one import line pointing to ./async.actions-predict.ts', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/async.actions.ts'),
      'utf8',
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines).toHaveLength(1);
    expect(importLines[0]).toContain('./async.actions-predict');
  });
});

// ── TC2: barrel re-exports all three functions ───────────────────

describe('TC2 — barrel re-exports placePrediction, pickStandaloneQuestion, openCreatePredictionForm', () => {
  it('all three named exports are functions', async () => {
    setupAuthMocks();
    vi.doMock('../../src/async.state.ts', () => ({
      state: {
        predictions: [],
        standaloneQuestions: [],
        predictingInFlight: new Set<string>(),
      },
    }));

    const barrel = await import('../../src/async.actions.ts');
    const predict = await import('../../src/async.actions-predict.ts');

    expect(typeof barrel.placePrediction).toBe('function');
    expect(typeof barrel.pickStandaloneQuestion).toBe('function');
    expect(typeof barrel.openCreatePredictionForm).toBe('function');

    // Verify identity — barrel must re-export the same functions
    expect(barrel.placePrediction).toBe(predict.placePrediction);
    expect(barrel.pickStandaloneQuestion).toBe(predict.pickStandaloneQuestion);
    expect(barrel.openCreatePredictionForm).toBe(predict.openCreatePredictionForm);
  });
});

// ── TC3: placePrediction skips RPC in placeholder mode ───────────

describe('TC3 — placePrediction skips RPC when getIsPlaceholderMode is true', () => {
  it('does not call safeRpc in placeholder mode', async () => {
    setupPlaceholderMocks();
    const pred = makePrediction();
    vi.doMock('../../src/async.state.ts', () => ({
      state: {
        predictions: [pred],
        standaloneQuestions: [],
        predictingInFlight: new Set<string>(),
      },
    }));

    const { placePrediction } = await import('../../src/async.actions-predict.ts');
    await placePrediction('debate-1', 'a', 10);

    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ── TC4: placePrediction shows success toast on clean RPC ────────

describe('TC4 — placePrediction shows success toast after RPC resolves cleanly', () => {
  it('calls showToast with success when place_prediction succeeds', async () => {
    setupAuthMocks();
    const showToastMock = vi.fn();
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
      showToast: showToastMock,
      friendlyError: vi.fn(),
      isAnyPlaceholder: false,
      FEATURES: {},
    }));

    const pred = makePrediction();
    vi.doMock('../../src/async.state.ts', () => ({
      state: {
        predictions: [pred],
        standaloneQuestions: [],
        predictingInFlight: new Set<string>(),
      },
    }));

    mockRpc.mockResolvedValue({ data: { new_balance: 90 }, error: null });

    const { placePrediction } = await import('../../src/async.actions-predict.ts');
    await placePrediction('debate-1', 'a', 10);

    const calls = showToastMock.mock.calls;
    const successCall = calls.find(([, type]) => type === 'success');
    expect(successCall).toBeDefined();
  });
});

// ── TC5: placePrediction reverts optimistic update on RPC error ──

describe('TC5 — placePrediction reverts optimistic update on RPC error', () => {
  it('restores user_pick to null when RPC returns error', async () => {
    setupAuthMocks();
    const pred = makePrediction({ user_pick: null });
    vi.doMock('../../src/async.state.ts', () => ({
      state: {
        predictions: [pred],
        standaloneQuestions: [],
        predictingInFlight: new Set<string>(),
      },
    }));

    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const { placePrediction } = await import('../../src/async.actions-predict.ts');
    await placePrediction('debate-1', 'a', 10);

    // Optimistic pick should be reverted to oldPick (null)
    expect(pred.user_pick).toBeNull();
  });
});

// ── TC6: pickStandaloneQuestion optimistic + RPC ─────────────────

describe('TC6 — pickStandaloneQuestion increments picks_a optimistically and calls pick_prediction', () => {
  it('increments picks_a and calls safeRpc pick_prediction', async () => {
    setupAuthMocks();
    const q = makeQuestion({ picks_a: 5, picks_b: 3, _userPick: null });
    vi.doMock('../../src/async.state.ts', () => ({
      state: {
        predictions: [],
        standaloneQuestions: [q],
        predictingInFlight: new Set<string>(),
      },
    }));

    mockRpc.mockResolvedValue({ data: null, error: null });

    const { pickStandaloneQuestion } = await import('../../src/async.actions-predict.ts');
    await pickStandaloneQuestion('q-1', 'a');

    expect(q.picks_a).toBe(6);
    expect(q._userPick).toBe('a');
    expect(mockRpc).toHaveBeenCalledWith(
      'pick_prediction',
      { p_question_id: 'q-1', p_pick: 'a' },
    );
  });
});

// ── TC7: openCreatePredictionForm topic length validation ─────────

describe('TC7 — openCreatePredictionForm validates topic length < 10 chars', () => {
  it('shows error toast and does not call RPC when topic is too short', async () => {
    setupAuthMocks();
    const showToastMock = vi.fn();
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
      showToast: showToastMock,
      friendlyError: vi.fn(),
      isAnyPlaceholder: false,
      FEATURES: {},
    }));
    vi.doMock('../../src/async.state.ts', () => ({
      state: {
        predictions: [],
        standaloneQuestions: [],
        predictingInFlight: new Set<string>(),
      },
    }));

    const { openCreatePredictionForm } = await import('../../src/async.actions-predict.ts');
    openCreatePredictionForm();

    // Simulate filling in a short topic and clicking submit
    const topicEl = document.getElementById('cpq-topic') as HTMLTextAreaElement;
    const submitBtn = document.getElementById('cpq-submit') as HTMLButtonElement;
    expect(topicEl).toBeTruthy();
    expect(submitBtn).toBeTruthy();

    topicEl.value = 'Short';
    submitBtn.click();

    // Allow microtasks to flush
    await vi.runAllTimersAsync();

    const errorCall = showToastMock.mock.calls.find(([, type]) => type === 'error');
    expect(errorCall).toBeDefined();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
