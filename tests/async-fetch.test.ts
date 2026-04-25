// ============================================================
// ASYNC FETCH — tests/async-fetch.test.ts
// Source: src/async.fetch.ts
//
// CLASSIFICATION:
//   fetchPredictions()        — RPC wrapper + FEATURES guard → Contract test
//   fetchStandaloneQuestions() — RPC wrapper + placeholder guard → Contract test
//
// IMPORTS:
//   { state }                                        from './async.state.ts'
//   { FEATURES }                                     from './config.ts'
//   { safeRpc, getSupabaseClient, getIsPlaceholderMode } from './auth.ts'
//   import type { ... }                              — type-only
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetSupabaseClient = vi.hoisted(() => vi.fn(() => ({})));
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mockFeatures = vi.hoisted(() => ({ predictions: true }));
const mockState = vi.hoisted(() => ({
  predictions: [] as unknown[],
  standaloneQuestions: [] as unknown[],
  predictingInFlight: new Set<string>(),
}));

vi.mock('../src/async.state.ts', () => ({
  get state() { return mockState; },
  PLACEHOLDER_PREDICTIONS: [],
}));

vi.mock('../src/config.ts', () => ({
  get FEATURES() { return mockFeatures; },
}));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getSupabaseClient: mockGetSupabaseClient,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

import { fetchPredictions, fetchStandaloneQuestions } from '../src/async.fetch.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockGetSupabaseClient.mockReturnValue({});
  mockState.predictions = [];
  mockState.standaloneQuestions = [];
  mockFeatures.predictions = true;
});

// ── fetchPredictions ──────────────────────────────────────────

describe('TC1 — fetchPredictions: calls get_hot_predictions RPC', () => {
  it('calls safeRpc with "get_hot_predictions" and p_limit: 10', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await fetchPredictions();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_hot_predictions', { p_limit: 10 });
  });
});

describe('TC2 — fetchPredictions: no-op when FEATURES.predictions is false', () => {
  it('does not call safeRpc when predictions feature is disabled', async () => {
    mockFeatures.predictions = false;

    await fetchPredictions();

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC3 — fetchPredictions: no-op in placeholder mode', () => {
  it('does not call safeRpc in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    await fetchPredictions();

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC4 — fetchPredictions: no-op when no Supabase client', () => {
  it('returns without calling safeRpc when getSupabaseClient returns null', async () => {
    mockGetSupabaseClient.mockReturnValue(null);

    await fetchPredictions();

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC5 — fetchPredictions: updates state.predictions on success', () => {
  it('maps RPC response into state.predictions', async () => {
    mockSafeRpc.mockResolvedValue({
      data: [{
        debate_id: 'd-1', topic: 'Test', p1_username: 'Alice', p2_username: 'Bob',
        p1_elo: 1400, p2_elo: 1300, prediction_count: 100, picks_a: 60, picks_b: 40,
        status: 'live',
      }],
      error: null,
    });

    await fetchPredictions();

    expect(mockState.predictions).toHaveLength(1);
    expect((mockState.predictions[0] as { debate_id: string }).debate_id).toBe('d-1');
  });
});

// ── fetchStandaloneQuestions ──────────────────────────────────

describe('TC6 — fetchStandaloneQuestions: calls get_prediction_questions RPC', () => {
  it('calls safeRpc with "get_prediction_questions"', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await fetchStandaloneQuestions();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_prediction_questions', expect.objectContaining({
      p_limit: 20,
    }));
  });
});

describe('TC7 — fetchStandaloneQuestions: passes category when provided', () => {
  it('includes p_category in params when category is specified', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await fetchStandaloneQuestions('sports');

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_category).toBe('sports');
  });
});

describe('TC8 — fetchStandaloneQuestions: no-op in placeholder mode', () => {
  it('does not call safeRpc in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    await fetchStandaloneQuestions();

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/async.fetch.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './async.state.ts',
      './async.types.ts',
      './config.ts',
      './auth.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/async.fetch.ts'),
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
