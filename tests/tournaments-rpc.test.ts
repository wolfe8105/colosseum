// ============================================================
// TOURNAMENTS RPC — tests/tournaments-rpc.test.ts
// Source: src/tournaments.rpc.ts
//
// CLASSIFICATION:
//   createTournament()       — RPC wrapper + placeholder guard → Contract test
//   joinTournament()         — RPC wrapper + placeholder guard → Contract test
//   cancelTournament()       — RPC wrapper + placeholder guard → Contract test
//   getActiveTournaments()   — RPC wrapper + placeholder guard → Contract test
//   getTournamentBracket()   — RPC wrapper + placeholder guard → Contract test
//   resolveTournamentMatch() — RPC wrapper + placeholder guard → Contract test
//
// IMPORTS:
//   { safeRpc, getIsPlaceholderMode } from './auth.ts'
//   import type { ... } — type-only
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

import {
  createTournament,
  joinTournament,
  cancelTournament,
  getActiveTournaments,
  getTournamentBracket,
  resolveTournamentMatch,
} from '../src/tournaments.rpc.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
});

// ── createTournament ──────────────────────────────────────────

describe('TC1 — createTournament: calls create_tournament RPC', () => {
  it('calls safeRpc with "create_tournament" and correct params', async () => {
    mockSafeRpc.mockResolvedValue({ data: { tournament_id: 't-1', success: true }, error: null });

    await createTournament({ title: 'Test Cup', category: 'sports', entry_fee: 50, starts_at: '2026-05-01' });

    expect(mockSafeRpc).toHaveBeenCalledWith('create_tournament', expect.objectContaining({
      p_title: 'Test Cup',
      p_category: 'sports',
      p_entry_fee: 50,
      p_starts_at: '2026-05-01',
    }));
  });
});

describe('TC2 — createTournament: defaults max_players to 64', () => {
  it('sends p_max_players: 64 when not specified', async () => {
    mockSafeRpc.mockResolvedValue({ data: { tournament_id: 't-2', success: true }, error: null });

    await createTournament({ title: 'Cup', category: 'tech', entry_fee: 10, starts_at: '2026-06-01' });

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_max_players).toBe(64);
  });
});

describe('TC3 — createTournament: placeholder mode returns error', () => {
  it('returns error without calling RPC in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await createTournament({ title: 'X', category: 'x', entry_fee: 0, starts_at: '2026-01-01' });

    expect(result.error).toBe('Not available');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC4 — createTournament: RPC error returns error', () => {
  it('returns error message on RPC failure', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Permission denied' } });

    const result = await createTournament({ title: 'Y', category: 'y', entry_fee: 10, starts_at: '2026-01-01' });

    expect(result.error).toContain('Permission denied');
    expect(result.tournament_id).toBeUndefined();
  });
});

// ── joinTournament ────────────────────────────────────────────

describe('TC5 — joinTournament: calls join_tournament RPC', () => {
  it('calls safeRpc with "join_tournament" and tournament id', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await joinTournament('t-join-1');

    expect(mockSafeRpc).toHaveBeenCalledWith('join_tournament', { p_tournament_id: 't-join-1' });
  });
});

describe('TC6 — joinTournament: placeholder mode returns error', () => {
  it('returns error without calling RPC in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await joinTournament('t-1');

    expect(result.error).toBe('Not available');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── cancelTournament ──────────────────────────────────────────

describe('TC7 — cancelTournament: calls cancel_tournament RPC', () => {
  it('calls safeRpc with "cancel_tournament" and tournament id', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await cancelTournament('t-cancel-1');

    expect(mockSafeRpc).toHaveBeenCalledWith('cancel_tournament', { p_tournament_id: 't-cancel-1' });
  });
});

// ── getActiveTournaments ──────────────────────────────────────

describe('TC8 — getActiveTournaments: calls get_active_tournaments RPC', () => {
  it('calls safeRpc with "get_active_tournaments"', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await getActiveTournaments();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_active_tournaments', { p_category: null });
  });
});

describe('TC9 — getActiveTournaments: passes category when provided', () => {
  it('sends p_category when specified', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await getActiveTournaments('sports');

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_category).toBe('sports');
  });
});

describe('TC10 — getActiveTournaments: returns empty array on error', () => {
  it('returns [] when RPC errors', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Nope' } });

    const result = await getActiveTournaments();

    expect(result).toEqual([]);
  });
});

// ── getTournamentBracket ──────────────────────────────────────

describe('TC11 — getTournamentBracket: calls get_tournament_bracket RPC', () => {
  it('calls safeRpc with tournament id', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await getTournamentBracket('t-bracket-1');

    expect(mockSafeRpc).toHaveBeenCalledWith('get_tournament_bracket', { p_tournament_id: 't-bracket-1' });
  });
});

// ── resolveTournamentMatch ────────────────────────────────────

describe('TC12 — resolveTournamentMatch: calls resolve_tournament_match RPC', () => {
  it('calls safeRpc with match id and winner id', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await resolveTournamentMatch('match-1', 'winner-user');

    expect(mockSafeRpc).toHaveBeenCalledWith('resolve_tournament_match', {
      p_tournament_match_id: 'match-1',
      p_winner_id: 'winner-user',
    });
  });
});

describe('TC13 — resolveTournamentMatch: returns tournament_complete flag', () => {
  it('passes through tournament_complete from RPC response', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, tournament_complete: true }, error: null });

    const result = await resolveTournamentMatch('match-2', 'user-w');

    expect(result.success).toBe(true);
    expect(result.tournament_complete).toBe(true);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/tournaments.rpc.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './tournaments.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/tournaments.rpc.ts'),
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
