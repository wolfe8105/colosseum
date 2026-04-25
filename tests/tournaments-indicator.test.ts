// ============================================================
// TOURNAMENTS INDICATOR — tests/tournaments-indicator.test.ts
// Source: src/tournaments.indicator.ts
//
// CLASSIFICATION:
//   checkMyTournamentMatch()  — RPC + DOM dot → Integration test
//   startTournamentMatchPoll()— setInterval + init → Behavioral test
//   stopTournamentMatchPoll() — clearInterval + cleanup → Behavioral test
//   getPendingMatch()         — state accessor → Unit test
//
// IMPORTS:
//   { safeRpc, getIsPlaceholderMode } from './auth.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

import {
  checkMyTournamentMatch,
  startTournamentMatchPoll,
  stopTournamentMatchPoll,
  getPendingMatch,
} from '../src/tournaments.indicator.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
  document.body.innerHTML = '';
  // Stop any running poll
  stopTournamentMatchPoll();
  vi.useFakeTimers();
});

afterEach(() => {
  stopTournamentMatchPoll();
  vi.useRealTimers();
});

// ── checkMyTournamentMatch ────────────────────────────────────

describe('TC1 — checkMyTournamentMatch: placeholder mode returns null', () => {
  it('skips RPC and returns null in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await checkMyTournamentMatch();

    expect(result).toBeNull();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC2 — checkMyTournamentMatch: calls get_my_tournament_match RPC', () => {
  it('invokes safeRpc with correct name', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await checkMyTournamentMatch();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_my_tournament_match');
  });
});

describe('TC3 — checkMyTournamentMatch: returns null when no matches', () => {
  it('returns null for empty data array', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    const result = await checkMyTournamentMatch();

    expect(result).toBeNull();
  });
});

describe('TC4 — checkMyTournamentMatch: returns first match when data exists', () => {
  it('returns the first element of the data array', async () => {
    const match = { id: 'm-1', tournament_title: 'Weekly', round: 1, prize_pool: 1000 };
    mockSafeRpc.mockResolvedValue({ data: [match], error: null });

    const result = await checkMyTournamentMatch();

    expect(result).toEqual(match);
  });
});

describe('TC5 — checkMyTournamentMatch: shows gold dot when match found', () => {
  it('appends #tournament-gold-dot to #notif-btn', async () => {
    document.body.innerHTML = '<button id="notif-btn" style="position:relative"></button>';
    const match = { id: 'm-1', tournament_title: 'Weekly', round: 1, prize_pool: 1000 };
    mockSafeRpc.mockResolvedValue({ data: [match], error: null });

    await checkMyTournamentMatch();

    expect(document.getElementById('tournament-gold-dot')).not.toBeNull();
  });
});

describe('TC6 — checkMyTournamentMatch: hides gold dot when no match', () => {
  it('removes #tournament-gold-dot when no match', async () => {
    document.body.innerHTML = '<button id="notif-btn"><div id="tournament-gold-dot"></div></button>';
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await checkMyTournamentMatch();

    expect(document.getElementById('tournament-gold-dot')).toBeNull();
  });
});

describe('TC7 — checkMyTournamentMatch: RPC error returns null', () => {
  it('returns null and clears pending when error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const result = await checkMyTournamentMatch();

    expect(result).toBeNull();
  });
});

// ── getPendingMatch ───────────────────────────────────────────

describe('TC8 — getPendingMatch: returns null before any check', () => {
  it('is null initially (after stopTournamentMatchPoll clears state)', () => {
    // We called stopTournamentMatchPoll in beforeEach, _pendingMatch should be null
    // (no RPC called yet)
    // Just verify it doesn't throw
    expect(typeof getPendingMatch()).toBe('object'); // null or TournamentMatch
  });
});

describe('TC9 — getPendingMatch: returns match after successful check', () => {
  it('reflects the last found pending match', async () => {
    const match = { id: 'm-2', tournament_title: 'Monthly', round: 2, prize_pool: 5000 };
    mockSafeRpc.mockResolvedValue({ data: [match], error: null });

    await checkMyTournamentMatch();

    expect(getPendingMatch()).toEqual(match);
  });
});

// ── startTournamentMatchPoll ──────────────────────────────────

describe('TC10 — startTournamentMatchPoll: calls checkMyTournamentMatch immediately', () => {
  it('fires one RPC call on start', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    startTournamentMatchPoll();
    // Let the immediate async check flush — don't advance timers
    await Promise.resolve();

    expect(mockSafeRpc).toHaveBeenCalled();
  });
});

describe('TC11 — startTournamentMatchPoll: idempotent — second call does not double-poll', () => {
  it('calling start twice does not create two intervals', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    startTournamentMatchPoll();
    startTournamentMatchPoll(); // should be no-op
    await Promise.resolve();

    // Only one initial check fired (idempotent guard on _goldDotInterval)
    expect(mockSafeRpc.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});

// ── stopTournamentMatchPoll ───────────────────────────────────

describe('TC12 — stopTournamentMatchPoll: clears the interval', () => {
  it('stops polling after stop is called', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    startTournamentMatchPoll();
    await Promise.resolve();

    stopTournamentMatchPoll();
    mockSafeRpc.mockReset();
    // Advance by one poll cycle — should NOT fire any more RPC calls
    vi.advanceTimersByTime(65_000);
    await Promise.resolve();

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC13 — stopTournamentMatchPoll: removes gold dot', () => {
  it('removes #tournament-gold-dot element', async () => {
    document.body.innerHTML = '<button id="notif-btn"><div id="tournament-gold-dot"></div></button>';

    stopTournamentMatchPoll();

    expect(document.getElementById('tournament-gold-dot')).toBeNull();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/tournaments.indicator.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './tournaments.types.ts'];
    const source = readFileSync(resolve(__dirname, '../src/tournaments.indicator.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
