// ============================================================
// TOURNAMENTS BARREL — tests/tournaments-barrel.test.ts
// Source: src/tournaments.ts
//
// CLASSIFICATION:
//   initTournaments() — calls ready.then + startTournamentMatchPoll → Behavioral test
//   ARCH             — import allowlist check
//
// IMPORTS:
//   { ready }                    from './auth.ts'
//   { startTournamentMatchPoll } from './tournaments.indicator.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReady = vi.hoisted(() => ({
  then: vi.fn((cb: () => void) => { cb(); return Promise.resolve(); }),
}));
const mockStartTournamentMatchPoll = vi.hoisted(() => vi.fn());

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
  stopTournamentMatchPoll: vi.fn(),
  checkMyTournamentMatch: vi.fn(),
  getPendingMatch: vi.fn(() => null),
}));

vi.mock('../src/tournaments.rpc.ts', () => ({
  createTournament: vi.fn(),
  joinTournament: vi.fn(),
  cancelTournament: vi.fn(),
  getActiveTournaments: vi.fn(),
  getTournamentBracket: vi.fn(),
  resolveTournamentMatch: vi.fn(),
}));

vi.mock('../src/tournaments.render.ts', () => ({
  renderTournamentBanner: vi.fn(() => ''),
  renderTournamentCard: vi.fn(() => ''),
}));

import { initTournaments } from '../src/tournaments.ts';

beforeEach(() => {
  mockStartTournamentMatchPoll.mockReset();
  mockReady.then.mockImplementation((cb: () => void) => { cb(); return Promise.resolve(); });
});

// ── initTournaments ───────────────────────────────────────────

describe('TC1 — initTournaments: calls startTournamentMatchPoll after ready', () => {
  it('invokes startTournamentMatchPoll once when ready resolves', async () => {
    await initTournaments();
    expect(mockStartTournamentMatchPoll).toHaveBeenCalledTimes(1);
  });
});

describe('TC2 — initTournaments: returns a Promise', () => {
  it('resolves without throwing', async () => {
    await expect(initTournaments()).resolves.not.toThrow();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

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
