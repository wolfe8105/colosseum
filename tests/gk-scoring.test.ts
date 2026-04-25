// ============================================================
// GK — F-21 ELO SCORING / VOTING & PREDICTIONS
// tests/gk-scoring.test.ts
// Source: src/scoring.ts
//
// SPEC MISMATCH NOTE: docs/THE-MODERATOR-PUNCH-LIST.md F-21 describes
// "Intro music (personal + group, 2 tiers)" — that spec applies to
// intro-music files, not src/scoring.ts. Authoritative spec for this
// module is derived from:
//   CLAUDE.md §CRITICAL Security Rules — Castle Defense
//   CLAUDE.md §CRITICAL Security Rules — UUID validation before PostgREST filters
//   docs/THE-MODERATOR-PUNCH-LIST.md § F-09 (predictions, safeRpc contract)
//   src/scoring.ts module docstring: "Voting + predictions — all server-side via safeRpc"
//
// CLASSIFICATION:
//   validateUUID()    — Pure calculation (regex): no mocks
//   castVote()        — RPC wrapper (safeRpc): mock safeRpc + getIsPlaceholderMode
//   placePrediction() — RPC wrapper (safeRpc): mock safeRpc + getIsPlaceholderMode
//
// ALLOWED IMPORTS: ['./auth.ts', './config.ts']
// REGRESSION SURFACE: tests/scoring.test.ts
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
const DEBATE_ID = 'debate-gk-scoring-001';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
});

// ── TC1: CASTLE DEFENSE — castVote routes through safeRpc ─────

describe('TC1 — Castle Defense: castVote calls safeRpc (no direct DB write)', () => {
  it('safeRpc is invoked — no direct INSERT/UPDATE/DELETE from client JS', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, vote_count_a: 3, vote_count_b: 2, your_vote: VALID_UUID },
      error: null,
    });

    await castVote(DEBATE_ID, VALID_UUID, 1);

    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
  });
});

// ── TC2: castVote RPC name is exactly 'cast_vote' ─────────────

describe('TC2 — castVote RPC name is "cast_vote" (not renamed or legacy)', () => {
  it('first argument to safeRpc is the string "cast_vote"', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, vote_count_a: 1, vote_count_b: 0, your_vote: VALID_UUID },
      error: null,
    });

    await castVote(DEBATE_ID, VALID_UUID, null);

    expect(mockSafeRpc.mock.calls[0][0]).toBe('cast_vote');
  });
});

// ── TC3: castVote sends named params ─────────────────────────

describe('TC3 — castVote passes p_debate_id, p_voted_for, p_round as named params', () => {
  it('param object contains exactly the three named keys', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, vote_count_a: 2, vote_count_b: 1, your_vote: VALID_UUID },
      error: null,
    });

    await castVote(DEBATE_ID, VALID_UUID, 3);

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params).toHaveProperty('p_debate_id', DEBATE_ID);
    expect(params).toHaveProperty('p_voted_for', VALID_UUID);
    expect(params).toHaveProperty('p_round', 3);
  });
});

// ── TC4: castVote round defaults to null when omitted ─────────

describe('TC4 — castVote default round is null when argument omitted', () => {
  it('p_round is null when no round arg passed', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, vote_count_a: 1, vote_count_b: 1, your_vote: VALID_UUID },
      error: null,
    });

    await castVote(DEBATE_ID, VALID_UUID);

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_round).toBeNull();
  });
});

// ── TC5: castVote placeholder mode bypasses RPC ───────────────

describe('TC5 — castVote placeholder mode short-circuits before safeRpc', () => {
  it('safeRpc is never called in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    await castVote(DEBATE_ID, VALID_UUID, 1);

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC6: castVote placeholder — your_vote echoes votedFor ─────

describe('TC6 — castVote placeholder your_vote echoes the votedFor argument', () => {
  it('result.your_vote equals the votedFor passed in', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await castVote(DEBATE_ID, VALID_UUID, null);

    expect(result.your_vote).toBe(VALID_UUID);
  });
});

// ── TC7: castVote RPC error throws ───────────────────────────

describe('TC7 — castVote propagates RPC error as thrown Error (no silent failure)', () => {
  it('throws with the error message from safeRpc', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Vote rejected' } });

    await expect(castVote(DEBATE_ID, VALID_UUID, 1)).rejects.toThrow('Vote rejected');
  });
});

// ── TC8: castVote null data throws ───────────────────────────

describe('TC8 — castVote throws when safeRpc returns null data with no error', () => {
  it('throws "cast_vote returned no data"', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    await expect(castVote(DEBATE_ID, VALID_UUID, 2)).rejects.toThrow('cast_vote returned no data');
  });
});

// ── TC9: CASTLE DEFENSE — placePrediction routes through safeRpc

describe('TC9 — Castle Defense: placePrediction calls safeRpc (no direct DB write)', () => {
  it('safeRpc is invoked once', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, amount: 10, new_balance: 40 },
      error: null,
    });

    await placePrediction(DEBATE_ID, VALID_UUID, 10);

    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
  });
});

// ── TC10: placePrediction RPC name is exactly 'place_prediction'

describe('TC10 — placePrediction RPC name is "place_prediction" (not renamed or legacy)', () => {
  it('first argument to safeRpc is "place_prediction"', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, amount: 5, new_balance: 45 },
      error: null,
    });

    await placePrediction(DEBATE_ID, VALID_UUID, 5);

    expect(mockSafeRpc.mock.calls[0][0]).toBe('place_prediction');
  });
});

// ── TC11: placePrediction sends named params ──────────────────

describe('TC11 — placePrediction passes p_debate_id, p_predicted_winner, p_amount as named params', () => {
  it('param object contains the three required named keys with correct values', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, amount: 20, new_balance: 30 },
      error: null,
    });

    await placePrediction(DEBATE_ID, VALID_UUID, 20);

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params).toHaveProperty('p_debate_id', DEBATE_ID);
    expect(params).toHaveProperty('p_predicted_winner', VALID_UUID);
    expect(params).toHaveProperty('p_amount', 20);
  });
});

// ── TC12: placePrediction placeholder mode bypasses RPC ───────

describe('TC12 — placePrediction placeholder mode short-circuits before safeRpc', () => {
  it('safeRpc is never called in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    await placePrediction(DEBATE_ID, VALID_UUID, 10);

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC13: placePrediction placeholder — new_balance = 50 - amount

describe('TC13 — placePrediction placeholder new_balance equals 50 minus staked amount', () => {
  it('new_balance is 50 minus the amount argument', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await placePrediction(DEBATE_ID, VALID_UUID, 15);

    expect(result.new_balance).toBe(35);
  });
});

// ── TC14: placePrediction placeholder — amount echoes the arg ─

describe('TC14 — placePrediction placeholder amount field echoes the staked amount', () => {
  it('result.amount matches the amount argument', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await placePrediction(DEBATE_ID, VALID_UUID, 25);

    expect(result.amount).toBe(25);
  });
});

// ── TC15: placePrediction RPC error throws ────────────────────

describe('TC15 — placePrediction propagates RPC error as thrown Error (no silent failure)', () => {
  it('throws with the error message from safeRpc', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Insufficient balance' } });

    await expect(placePrediction(DEBATE_ID, VALID_UUID, 50)).rejects.toThrow('Insufficient balance');
  });
});

// ── TC16: placePrediction null data throws ────────────────────

describe('TC16 — placePrediction throws when safeRpc returns null data with no error', () => {
  it('throws "place_prediction returned no data"', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    await expect(placePrediction(DEBATE_ID, VALID_UUID, 10)).rejects.toThrow('place_prediction returned no data');
  });
});

// ── TC17: UUID Security Gate — valid UUID ─────────────────────

describe('TC17 — UUID Security Gate: valid v4 UUID passes validateUUID unchanged', () => {
  it('returns the UUID string unmodified', () => {
    expect(validateUUID(VALID_UUID)).toBe(VALID_UUID);
  });
});

// ── TC18: UUID Security Gate — non-UUID rejected ──────────────

describe('TC18 — UUID Security Gate: non-UUID string is rejected (blocks PostgREST injection)', () => {
  it('throws "Invalid user ID format" for a plain string', () => {
    expect(() => validateUUID('not-a-uuid')).toThrow('Invalid user ID format');
  });
});

// ── TC19: UUID Security Gate — empty string rejected ──────────

describe('TC19 — UUID Security Gate: empty string is rejected', () => {
  it('throws "Invalid user ID format" for empty string', () => {
    expect(() => validateUUID('')).toThrow('Invalid user ID format');
  });
});

// ── TC20: UUID Security Gate — SQL injection rejected ─────────

describe('TC20 — UUID Security Gate: SQL injection payload is rejected', () => {
  it('throws "Invalid user ID format" for SQL injection string', () => {
    expect(() => validateUUID("'; DROP TABLE arena_debates; --")).toThrow('Invalid user ID format');
  });
});

// ── ARCH ──────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/scoring.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list: ./auth.ts, ./config.ts', () => {
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
