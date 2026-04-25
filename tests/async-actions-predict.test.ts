// ============================================================
// ASYNC ACTIONS PREDICT — tests/async-actions-predict.test.ts
// Source: src/async.actions-predict.ts
//
// CLASSIFICATION:
//   placePrediction()          — Optimistic update + RPC → Integration test
//   pickStandaloneQuestion()   — Optimistic update + RPC → Integration test
//   openCreatePredictionForm() — DOM creation + form wiring → Behavioral test
//
// IMPORTS:
//   { state }                        from './async.state.ts'
//   { renderPredictions, ... }       from './async.render.ts'
//   { fetchStandaloneQuestions }     from './async.fetch.ts'
//   { showToast }                    from './config.ts'
//   { safeRpc, requireAuth, ... }    from './auth.ts'
//   { place_prediction }             from './contracts/rpc-schemas.ts'
//   { claimPrediction, updateBalance } from './tokens.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── hoisted mocks ─────────────────────────────────────────────

const mockRequireAuth = vi.hoisted(() => vi.fn(() => true));
const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetSupabaseClient = vi.hoisted(() => vi.fn(() => ({})));
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => null));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockRenderPredictions = vi.hoisted(() => vi.fn());
const mockHideWagerPicker = vi.hoisted(() => vi.fn());
const mockLoadHotTakes = vi.hoisted(() => vi.fn());
const mockFetchStandaloneQuestions = vi.hoisted(() => vi.fn(async () => {}));
const mockClaimPrediction = vi.hoisted(() => vi.fn());
const mockUpdateBalance = vi.hoisted(() => vi.fn());
const mockPlacePredictionSchema = vi.hoisted(() => ({ safeParse: vi.fn(() => ({ success: true })) }));

// State backing arrays — mutated per test
const mockPredictions = vi.hoisted(() => [] as unknown[]);
const mockStandaloneQuestions = vi.hoisted(() => [] as unknown[]);
const mockPredictingInFlight = vi.hoisted(() => new Set<string>());

vi.mock('../src/async.state.ts', () => ({
  get state() {
    return {
      get predictions() { return mockPredictions; },
      get standaloneQuestions() { return mockStandaloneQuestions; },
      get predictingInFlight() { return mockPredictingInFlight; },
    };
  },
  PLACEHOLDER_PREDICTIONS: [],
}));

vi.mock('../src/async.render.ts', () => ({
  renderPredictions: mockRenderPredictions,
  _hideWagerPicker: mockHideWagerPicker,
  loadHotTakes: mockLoadHotTakes,
  _registerWiring: vi.fn(),
}));

vi.mock('../src/async.fetch.ts', () => ({
  fetchStandaloneQuestions: mockFetchStandaloneQuestions,
  fetchPredictions: vi.fn(),
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  escapeHTML: vi.fn((s: unknown) => String(s ?? '')),
  FEATURES: { rivals: true },
  APP: { baseUrl: 'https://themoderator.app' },
}));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  requireAuth: mockRequireAuth,
  getSupabaseClient: mockGetSupabaseClient,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getCurrentProfile: mockGetCurrentProfile,
  getCurrentUser: vi.fn(() => null),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  place_prediction: mockPlacePredictionSchema,
}));

vi.mock('../src/tokens.ts', () => ({
  claimPrediction: mockClaimPrediction,
  updateBalance: mockUpdateBalance,
  getBalance: vi.fn(() => 0),
}));

import { placePrediction, pickStandaloneQuestion, openCreatePredictionForm } from '../src/async.actions-predict.ts';

beforeEach(() => {
  mockRequireAuth.mockReturnValue(true);
  mockSafeRpc.mockReset();
  mockSafeRpc.mockResolvedValue({ data: null, error: null });
  mockGetSupabaseClient.mockReturnValue({});
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockGetCurrentProfile.mockReturnValue(null);
  mockShowToast.mockReset();
  mockRenderPredictions.mockReset();
  mockHideWagerPicker.mockReset();
  mockClaimPrediction.mockReset();
  mockUpdateBalance.mockReset();
  mockPredictions.length = 0;
  mockStandaloneQuestions.length = 0;
  mockPredictingInFlight.clear();
  document.body.innerHTML = '';
});

// ── placePrediction ───────────────────────────────────────────

describe('TC1 — placePrediction: no-op when requireAuth returns false', () => {
  it('does nothing when user not authenticated', async () => {
    mockRequireAuth.mockReturnValue(false);

    await placePrediction('debate-1', 'a', 10);

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC2 — placePrediction: no-op when debate is in-flight', () => {
  it('bails out if same debateId is already in-flight', async () => {
    mockPredictingInFlight.add('debate-dup');

    await placePrediction('debate-dup', 'a', 10);

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC3 — placePrediction: no-op when prediction not in state', () => {
  it('does not call RPC when debate not found in predictions', async () => {
    await placePrediction('nonexistent', 'a', 10);

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC4 — placePrediction: no-op when same side already picked', () => {
  it('returns early when user_pick already equals side', async () => {
    mockPredictions.push({ debate_id: 'd-1', user_pick: 'a', total: 10, pct_a: 60, pct_b: 40, p1: 'Alice', p2: 'Bob' });

    await placePrediction('d-1', 'a', 10);

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC5 — placePrediction: calls safeRpc place_prediction when client available', () => {
  it('invokes RPC with correct parameters', async () => {
    mockPredictions.push({ debate_id: 'd-2', user_pick: null, total: 10, pct_a: 50, pct_b: 50, p1: 'Alice', p2: 'Bob' });

    await placePrediction('d-2', 'a', 15);

    expect(mockSafeRpc).toHaveBeenCalledWith('place_prediction', {
      p_debate_id: 'd-2',
      p_predicted_winner: 'a',
      p_amount: 15,
    }, mockPlacePredictionSchema);
  });
});

describe('TC6 — placePrediction: calls hideWagerPicker', () => {
  it('hides the wager picker as part of optimistic update', async () => {
    mockPredictions.push({ debate_id: 'd-3', user_pick: null, total: 5, pct_a: 50, pct_b: 50, p1: 'X', p2: 'Y' });

    await placePrediction('d-3', 'b', 10);

    expect(mockHideWagerPicker).toHaveBeenCalled();
  });
});

describe('TC7 — placePrediction: shows success toast', () => {
  it('calls showToast with success type', async () => {
    mockPredictions.push({ debate_id: 'd-4', user_pick: null, total: 5, pct_a: 50, pct_b: 50, p1: 'Alpha', p2: 'Beta' });

    await placePrediction('d-4', 'a', 20);

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('20'), 'success');
  });
});

describe('TC8 — placePrediction: updates balance when RPC returns new_balance', () => {
  it('calls updateBalance with numeric value', async () => {
    mockPredictions.push({ debate_id: 'd-5', user_pick: null, total: 3, pct_a: 50, pct_b: 50, p1: 'P1', p2: 'P2' });
    mockSafeRpc.mockResolvedValue({ data: { new_balance: 480 }, error: null });

    await placePrediction('d-5', 'b', 20);

    expect(mockUpdateBalance).toHaveBeenCalledWith(480);
  });
});

// ── pickStandaloneQuestion ────────────────────────────────────

describe('TC9 — pickStandaloneQuestion: no-op when not authenticated', () => {
  it('returns early without calling safeRpc', async () => {
    mockRequireAuth.mockReturnValue(false);

    await pickStandaloneQuestion('q-1', 'a');

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC10 — pickStandaloneQuestion: no-op when question not found', () => {
  it('does not call RPC when questionId not in standaloneQuestions', async () => {
    await pickStandaloneQuestion('missing-q', 'a');

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC11 — pickStandaloneQuestion: no-op when same side already picked', () => {
  it('returns without RPC when _userPick already equals side', async () => {
    mockStandaloneQuestions.push({ id: 'q-2', _userPick: 'b', picks_a: 5, picks_b: 5, side_a_label: 'Yes', side_b_label: 'No' });

    await pickStandaloneQuestion('q-2', 'b');

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC12 — pickStandaloneQuestion: increments picks_a when picking side a', () => {
  it('optimistically increments picks_a', async () => {
    const q: any = { id: 'q-3', _userPick: null, picks_a: 3, picks_b: 2, side_a_label: 'Yes', side_b_label: 'No' };
    mockStandaloneQuestions.push(q);

    await pickStandaloneQuestion('q-3', 'a');

    expect(q.picks_a).toBe(4);
  });
});

describe('TC13 — pickStandaloneQuestion: calls pick_prediction RPC', () => {
  it('invokes safeRpc with correct params', async () => {
    mockStandaloneQuestions.push({ id: 'q-4', _userPick: null, picks_a: 1, picks_b: 1, side_a_label: 'Yes', side_b_label: 'No' });

    await pickStandaloneQuestion('q-4', 'b');

    expect(mockSafeRpc).toHaveBeenCalledWith('pick_prediction', { p_question_id: 'q-4', p_pick: 'b' });
  });
});

describe('TC14 — pickStandaloneQuestion: shows success toast', () => {
  it('calls showToast with success after RPC', async () => {
    mockStandaloneQuestions.push({ id: 'q-5', _userPick: null, picks_a: 0, picks_b: 0, side_a_label: 'Agree', side_b_label: 'Disagree' });

    await pickStandaloneQuestion('q-5', 'a');

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Agree'), 'success');
  });
});

// ── openCreatePredictionForm ──────────────────────────────────

describe('TC15 — openCreatePredictionForm: no-op when not authenticated', () => {
  it('does not create overlay when requireAuth returns false', () => {
    mockRequireAuth.mockReturnValue(false);

    openCreatePredictionForm();

    expect(document.getElementById('create-prediction-sheet')).toBeNull();
  });
});

describe('TC16 — openCreatePredictionForm: creates the sheet overlay', () => {
  it('appends #create-prediction-sheet to body', () => {
    openCreatePredictionForm();

    expect(document.getElementById('create-prediction-sheet')).not.toBeNull();
  });
});

describe('TC17 — openCreatePredictionForm: replaces existing sheet', () => {
  it('removes old sheet before creating new one', () => {
    openCreatePredictionForm();
    openCreatePredictionForm();

    const sheets = document.querySelectorAll('#create-prediction-sheet');
    expect(sheets).toHaveLength(1);
  });
});

describe('TC18 — openCreatePredictionForm: cancel button removes overlay', () => {
  it('clicking #cpq-cancel removes the sheet', () => {
    openCreatePredictionForm();

    const btn = document.getElementById('cpq-cancel') as HTMLButtonElement;
    btn.click();

    expect(document.getElementById('create-prediction-sheet')).toBeNull();
  });
});

describe('TC19 — openCreatePredictionForm: short question shows error toast', () => {
  it('shows error toast when question < 10 chars', async () => {
    openCreatePredictionForm();

    const topic = document.getElementById('cpq-topic') as HTMLTextAreaElement;
    topic.value = 'Short';
    const submit = document.getElementById('cpq-submit') as HTMLButtonElement;
    submit.click();

    // Need to flush microtasks
    await new Promise(r => setTimeout(r, 0));

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('10 characters'), 'error');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/async.actions-predict.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './async.state.ts',
      './async.render.ts',
      './async.fetch.ts',
      './config.ts',
      './auth.ts',
      './contracts/rpc-schemas.ts',
      './tokens.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/async.actions-predict.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
