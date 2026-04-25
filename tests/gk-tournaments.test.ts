// ============================================================
// GK — F-08 TOURNAMENT SYSTEM — tests/gk-tournaments.test.ts
// Source: src/tournaments.ts
//
// SPEC: docs/THE-MODERATOR-PUNCH-LIST.md row F-08
//   Singles only. Single-elimination, ELO-seeded, min 8/max 64,
//   highest ELO gets bye. Standard ranked format. Single-sitting,
//   creator sets start time, auto-locks.
//   70/20/10 of 90% winner pool, platform 10%, 5% mod pool only
//   when mod present. F-33 gate. No tournament power-ups v1.
//   Spectator betting deferred.
//   Gold fast-blink dot top-left of bell on match ready.
//   Cancel before lock = full refund.
//   Client: src/tournaments.ts
//
// CLASSIFICATION:
//   initTournaments() — Multi-step orchestration: mock ready + startTournamentMatchPoll
//   Re-export surface — Barrel callable checks
//   ARCH              — Import allowlist
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ────────────────────────────────────────────

const mockReady = vi.hoisted(() => ({
  then: vi.fn((cb: () => void) => { cb(); return Promise.resolve(); }),
}));

const mockStartTournamentMatchPoll = vi.hoisted(() => vi.fn());
const mockStopTournamentMatchPoll  = vi.hoisted(() => vi.fn());
const mockCheckMyTournamentMatch   = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockGetPendingMatch          = vi.hoisted(() => vi.fn(() => null));

const mockCreateTournament         = vi.hoisted(() => vi.fn());
const mockJoinTournament           = vi.hoisted(() => vi.fn());
const mockCancelTournament         = vi.hoisted(() => vi.fn());
const mockGetActiveTournaments     = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockGetTournamentBracket     = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockResolveTournamentMatch   = vi.hoisted(() => vi.fn().mockResolvedValue({ tournament_complete: false }));

const mockRenderTournamentBanner   = vi.hoisted(() => vi.fn(() => '<div>banner</div>'));
const mockRenderTournamentCard     = vi.hoisted(() => vi.fn(() => '<div>card</div>'));

// ── Module mocks ─────────────────────────────────────────────

vi.mock('../src/auth.ts', () => ({
  ready: mockReady,
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  getCurrentProfile: vi.fn(),
  getIsPlaceholderMode: vi.fn(() => false),
  onAuthStateChange: vi.fn(),
  safeRpc: vi.fn(),
}));

vi.mock('../src/tournaments.indicator.ts', () => ({
  startTournamentMatchPoll: mockStartTournamentMatchPoll,
  stopTournamentMatchPoll:  mockStopTournamentMatchPoll,
  checkMyTournamentMatch:   mockCheckMyTournamentMatch,
  getPendingMatch:          mockGetPendingMatch,
}));

vi.mock('../src/tournaments.rpc.ts', () => ({
  createTournament:       mockCreateTournament,
  joinTournament:         mockJoinTournament,
  cancelTournament:       mockCancelTournament,
  getActiveTournaments:   mockGetActiveTournaments,
  getTournamentBracket:   mockGetTournamentBracket,
  resolveTournamentMatch: mockResolveTournamentMatch,
}));

vi.mock('../src/tournaments.render.ts', () => ({
  renderTournamentBanner: mockRenderTournamentBanner,
  renderTournamentCard:   mockRenderTournamentCard,
}));

vi.mock('../src/tournaments.types.ts', () => ({}));

// ── Import after mocks ───────────────────────────────────────

import {
  initTournaments,
  startTournamentMatchPoll,
  stopTournamentMatchPoll,
  checkMyTournamentMatch,
  getPendingMatch,
  createTournament,
  joinTournament,
  cancelTournament,
  getActiveTournaments,
  getTournamentBracket,
  resolveTournamentMatch,
  renderTournamentBanner,
  renderTournamentCard,
} from '../src/tournaments.ts';

// ── beforeEach reset ─────────────────────────────────────────

beforeEach(() => {
  mockStartTournamentMatchPoll.mockReset();
  mockStopTournamentMatchPoll.mockReset();
  mockCheckMyTournamentMatch.mockReset().mockResolvedValue(null);
  mockGetPendingMatch.mockReset().mockReturnValue(null);
  mockCreateTournament.mockReset();
  mockJoinTournament.mockReset();
  mockCancelTournament.mockReset();
  mockGetActiveTournaments.mockReset().mockResolvedValue([]);
  mockGetTournamentBracket.mockReset().mockResolvedValue([]);
  mockResolveTournamentMatch.mockReset().mockResolvedValue({ tournament_complete: false });
  mockRenderTournamentBanner.mockReset().mockReturnValue('<div>banner</div>');
  mockRenderTournamentCard.mockReset().mockReturnValue('<div>card</div>');
  mockReady.then.mockImplementation((cb: () => void) => { cb(); return Promise.resolve(); });
});

// ── TC1: Gold dot poll wired on auth ready ───────────────────
// Spec: "Gold fast-blink dot top-left of bell on match ready"
// The poll must start exactly when auth ready resolves.

describe('TC1 — initTournaments: wires gold-dot poll after auth ready', () => {
  it('calls startTournamentMatchPoll exactly once when ready resolves', async () => {
    await initTournaments();
    expect(mockStartTournamentMatchPoll).toHaveBeenCalledTimes(1);
  });

  it('calls startTournamentMatchPoll inside ready.then callback, not before', async () => {
    let pollCalledBeforeReady = false;
    mockReady.then.mockImplementation((cb: () => void) => {
      pollCalledBeforeReady = mockStartTournamentMatchPoll.mock.calls.length > 0;
      cb();
      return Promise.resolve();
    });
    await initTournaments();
    expect(pollCalledBeforeReady).toBe(false);
    expect(mockStartTournamentMatchPoll).toHaveBeenCalledTimes(1);
  });
});

// ── TC2: initTournaments returns Promise ─────────────────────
// Spec: async client init

describe('TC2 — initTournaments: returns a Promise<void>', () => {
  it('resolves without throwing', async () => {
    await expect(initTournaments()).resolves.toBeUndefined();
  });

  it('return value is a Promise', () => {
    const result = initTournaments();
    expect(result).toBeInstanceOf(Promise);
    return result;
  });
});

// ── TC3: createTournament exported ──────────────────────────
// Spec: "creator sets start time" — createTournament must be callable from client

describe('TC3 — barrel exports createTournament (tournament creation)', () => {
  it('createTournament is a function exported from the barrel', () => {
    expect(typeof createTournament).toBe('function');
  });
});

// ── TC4: joinTournament exported ─────────────────────────────
// Spec: min 8/max 64 players — join API must be present in client

describe('TC4 — barrel exports joinTournament (player join)', () => {
  it('joinTournament is a function exported from the barrel', () => {
    expect(typeof joinTournament).toBe('function');
  });
});

// ── TC5: cancelTournament exported ───────────────────────────
// Spec: "Cancel before lock = full refund"

describe('TC5 — barrel exports cancelTournament (cancel before lock = full refund)', () => {
  it('cancelTournament is a function exported from the barrel', () => {
    expect(typeof cancelTournament).toBe('function');
  });
});

// ── TC6: getActiveTournaments exported ───────────────────────
// Spec: tournament listing for home / feed

describe('TC6 — barrel exports getActiveTournaments (tournament listing)', () => {
  it('getActiveTournaments is a function exported from the barrel', () => {
    expect(typeof getActiveTournaments).toBe('function');
  });
});

// ── TC7: getTournamentBracket exported ───────────────────────
// Spec: "Single-elimination" — bracket query must be in client surface

describe('TC7 — barrel exports getTournamentBracket (single-elimination bracket)', () => {
  it('getTournamentBracket is a function exported from the barrel', () => {
    expect(typeof getTournamentBracket).toBe('function');
  });
});

// ── TC8: resolveTournamentMatch exported ─────────────────────
// Spec: tournament match resolution (outcome recorded per match)

describe('TC8 — barrel exports resolveTournamentMatch (match resolution)', () => {
  it('resolveTournamentMatch is a function exported from the barrel', () => {
    expect(typeof resolveTournamentMatch).toBe('function');
  });
});

// ── TC9: Render helpers exported ─────────────────────────────
// Spec: UI for tournament banner and tournament card in feed

describe('TC9 — barrel exports renderTournamentBanner and renderTournamentCard (tournament UI)', () => {
  it('renderTournamentBanner is a function exported from the barrel', () => {
    expect(typeof renderTournamentBanner).toBe('function');
  });

  it('renderTournamentCard is a function exported from the barrel', () => {
    expect(typeof renderTournamentCard).toBe('function');
  });
});

// ── TC10: Gold dot indicator API exported ────────────────────
// Spec: "Gold fast-blink dot top-left of bell on match ready"
// All four indicator functions must be accessible via the barrel.

describe('TC10 — barrel exports gold-dot indicator API', () => {
  it('startTournamentMatchPoll is a function', () => {
    expect(typeof startTournamentMatchPoll).toBe('function');
  });

  it('stopTournamentMatchPoll is a function', () => {
    expect(typeof stopTournamentMatchPoll).toBe('function');
  });

  it('checkMyTournamentMatch is a function', () => {
    expect(typeof checkMyTournamentMatch).toBe('function');
  });

  it('getPendingMatch is a function', () => {
    expect(typeof getPendingMatch).toBe('function');
  });
});

// ── ARCH: Import allowlist ───────────────────────────────────

describe('ARCH — src/tournaments.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './auth.ts',
      './tournaments.indicator.ts',
      './tournaments.types.ts',
      './tournaments.rpc.ts',
      './tournaments.render.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/tournaments.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
