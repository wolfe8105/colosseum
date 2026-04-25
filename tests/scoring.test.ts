// ============================================================
// SCORING — tests/scoring.test.ts
// Source: src/scoring.ts
//
// CLASSIFICATION:
//   validateUUID()    — Pure calculation → Unit test
//   castVote()        — RPC wrapper (calls safeRpc) → Contract test
//   placePrediction() — RPC wrapper (calls safeRpc) → Contract test
//
// IMPORTS:
//   { safeRpc, getIsPlaceholderMode } from './auth.ts'
//   { UUID_RE }                       from './config.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/config.ts', () => ({
  UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  SUPABASE_URL: 'https://faomczmipsccwbhpivmp.supabase.co',
  SUPABASE_ANON_KEY: 'mock-key',
  ModeratorConfig: { escapeHTML: (s: string) => s },
}));

import { validateUUID, castVote, placePrediction } from '../src/scoring.ts';

const VALID_UUID = '00000000-0000-4000-8000-000000000000';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
});

// ── validateUUID ──────────────────────────────────────────────

describe('TC1 — validateUUID: valid UUID passes through', () => {
  it('returns the UUID unchanged for a valid UUID', () => {
    expect(validateUUID(VALID_UUID)).toBe(VALID_UUID);
  });
});

describe('TC2 — validateUUID: invalid UUID throws', () => {
  it('throws for non-UUID string', () => {
    expect(() => validateUUID('not-a-uuid')).toThrow('Invalid user ID format');
  });
});

describe('TC3 — validateUUID: empty string throws', () => {
  it('throws for empty string', () => {
    expect(() => validateUUID('')).toThrow('Invalid user ID format');
  });
});

describe('TC4 — validateUUID: SQL injection attempt throws', () => {
  it('throws for SQL injection string', () => {
    expect(() => validateUUID("'; DROP TABLE users; --")).toThrow('Invalid user ID format');
  });
});

// ── castVote ──────────────────────────────────────────────────

describe('TC5 — castVote: calls cast_vote RPC', () => {
  it('calls safeRpc with "cast_vote"', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, vote_count_a: 3, vote_count_b: 2, your_vote: VALID_UUID },
      error: null,
    });

    await castVote('debate-1', VALID_UUID);

    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    expect(mockSafeRpc.mock.calls[0][0]).toBe('cast_vote');
  });
});

describe('TC6 — castVote: sends p_debate_id, p_voted_for, p_round', () => {
  it('passes named parameters to safeRpc', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, vote_count_a: 1, vote_count_b: 2, your_vote: VALID_UUID },
      error: null,
    });

    await castVote('debate-tc6', VALID_UUID, 2);

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params).toHaveProperty('p_debate_id', 'debate-tc6');
    expect(params).toHaveProperty('p_voted_for', VALID_UUID);
    expect(params).toHaveProperty('p_round', 2);
  });
});

describe('TC7 — castVote: placeholder mode returns mock data without RPC', () => {
  it('does not call safeRpc in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await castVote('debate-ph', VALID_UUID);

    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});

describe('TC8 — castVote: RPC error throws', () => {
  it('throws when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Vote failed' } });

    await expect(castVote('debate-tc8', VALID_UUID)).rejects.toThrow('Vote failed');
  });
});

describe('TC9 — castVote: RPC null data throws', () => {
  it('throws when safeRpc returns null data with no error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    await expect(castVote('debate-tc9', VALID_UUID)).rejects.toThrow('cast_vote returned no data');
  });
});

// ── placePrediction ───────────────────────────────────────────

describe('TC10 — placePrediction: calls place_prediction RPC', () => {
  it('calls safeRpc with "place_prediction"', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, amount: 10, new_balance: 40 },
      error: null,
    });

    await placePrediction('debate-1', VALID_UUID, 10);

    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    expect(mockSafeRpc.mock.calls[0][0]).toBe('place_prediction');
  });
});

describe('TC11 — placePrediction: sends named params', () => {
  it('passes p_debate_id, p_predicted_winner, p_amount', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, amount: 5, new_balance: 45 },
      error: null,
    });

    await placePrediction('debate-tc11', VALID_UUID, 5);

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params).toHaveProperty('p_debate_id', 'debate-tc11');
    expect(params).toHaveProperty('p_predicted_winner', VALID_UUID);
    expect(params).toHaveProperty('p_amount', 5);
  });
});

describe('TC12 — placePrediction: placeholder mode skips RPC', () => {
  it('does not call safeRpc when placeholder mode is active', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await placePrediction('debate-ph', VALID_UUID, 10);

    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});

describe('TC13 — placePrediction: import contract — calls safeRpc', () => {
  it('safeRpc mock is called (import contract)', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, amount: 15, new_balance: 35 },
      error: null,
    });

    await placePrediction('debate-contract', VALID_UUID, 15);

    expect(mockSafeRpc).toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/scoring.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/scoring.ts'),
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
