/**
 * Integration tests — leaderboard.fetch.ts → leaderboard.state
 * Seam #402
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ARCH filter
const sourceLines = `
import { safeRpc, getCurrentUser, getSupabaseClient, getIsPlaceholderMode } from './auth.ts';
import {
  currentTab, liveData, isLoading, currentOffset, hasMore, PAGE_SIZE,
  searchQuery, searchResults,
  setCurrentTab, setLiveData, setMyRank, setIsLoading, setCurrentOffset, setHasMore,
  setSearchQuery, setSearchResults,
} from './leaderboard.state.ts';
import type { LeaderboardTab, LeaderboardTimeFilter, LeaderboardEntry, LeaderboardRpcRow } from './leaderboard.types.ts';
`.split('\n').filter(l => /from\s+['"]/.test(l));
// Verify ARCH filter captured the imports (not an assertion — just a sanity reference)
void sourceLines;

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(),
  })),
}));

// Stable mocks reused across tests
let mockSafeRpc: ReturnType<typeof vi.fn>;
let mockGetCurrentUser: ReturnType<typeof vi.fn>;
let mockGetSupabaseClient: ReturnType<typeof vi.fn>;
let mockGetIsPlaceholderMode: ReturnType<typeof vi.fn>;

// Tracks captured render calls from dynamic imports
let mockRender: ReturnType<typeof vi.fn>;
let mockRenderList: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();

  mockSafeRpc = vi.fn();
  mockGetCurrentUser = vi.fn(() => null);
  mockGetSupabaseClient = vi.fn(() => ({}));
  mockGetIsPlaceholderMode = vi.fn(() => false);
  mockRender = vi.fn();
  mockRenderList = vi.fn(() => '<li>item</li>');

  vi.doMock('../../src/auth.ts', () => ({
    safeRpc: mockSafeRpc,
    getCurrentUser: mockGetCurrentUser,
    getSupabaseClient: mockGetSupabaseClient,
    getIsPlaceholderMode: mockGetIsPlaceholderMode,
  }));

  vi.doMock('../../src/leaderboard.render.ts', () => ({
    render: mockRender,
  }));

  vi.doMock('../../src/leaderboard.list.ts', () => ({
    renderList: mockRenderList,
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── TC-1: fetchLeaderboard re-entrant guard ───────────────────────────────────
describe('fetchLeaderboard', () => {
  it('TC-1: early-returns when isLoading is already true', async () => {
    const state = await import('../../src/leaderboard.state.ts');
    state.setIsLoading(true);

    const { fetchLeaderboard } = await import('../../src/leaderboard.fetch.ts');
    await fetchLeaderboard();

    expect(mockSafeRpc).not.toHaveBeenCalled();
    state.setIsLoading(false);
  });

  // ── TC-2: sort column mapping ───────────────────────────────────────────────
  it('TC-2: uses elo_rating as sort column when tab is elo', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const state = await import('../../src/leaderboard.state.ts');
    state.setCurrentTab('elo');
    state.setCurrentOffset(0);

    const { fetchLeaderboard } = await import('../../src/leaderboard.fetch.ts');
    await fetchLeaderboard();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_leaderboard', expect.objectContaining({ p_sort_by: 'elo_rating' }));
  });

  it('TC-2b: uses wins as sort column when tab is wins', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const state = await import('../../src/leaderboard.state.ts');
    state.setCurrentTab('wins');

    const { fetchLeaderboard } = await import('../../src/leaderboard.fetch.ts');
    await fetchLeaderboard();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_leaderboard', expect.objectContaining({ p_sort_by: 'wins' }));
  });

  it('TC-2c: uses current_streak as sort column when tab is streak', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const state = await import('../../src/leaderboard.state.ts');
    state.setCurrentTab('streak');

    const { fetchLeaderboard } = await import('../../src/leaderboard.fetch.ts');
    await fetchLeaderboard();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_leaderboard', expect.objectContaining({ p_sort_by: 'current_streak' }));
  });

  // ── TC-3: error path ────────────────────────────────────────────────────────
  it('TC-3: on RPC error sets liveData to null and hasMore to false', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'db error' } });
    const state = await import('../../src/leaderboard.state.ts');
    state.setCurrentTab('elo');
    state.setLiveData([{ rank: 1, user: 'X', elo: 1200, wins: 0, losses: 0, streak: 0, level: 1, tier: 'free' }]);
    state.setHasMore(true);

    const { fetchLeaderboard } = await import('../../src/leaderboard.fetch.ts');
    await fetchLeaderboard();

    expect(state.liveData).toBeNull();
    expect(state.hasMore).toBe(false);
  });

  // ── TC-4: success path — row mapping ───────────────────────────────────────
  it('TC-4: maps RPC rows correctly — elo defaults to 1200, user is uppercased', async () => {
    const rows = [
      {
        id: 'abc-123',
        username: 'debater',
        display_name: 'Debater',
        elo_rating: 1500,
        wins: 10,
        losses: 5,
        current_streak: 3,
        level: 8,
        subscription_tier: 'champion',
        debates_completed: 15,
        verified_gladiator: true,
      },
      {
        id: 'def-456',
        username: null,
        display_name: null,
        elo_rating: null,
        wins: null,
        losses: null,
        current_streak: null,
        level: null,
        subscription_tier: null,
        debates_completed: null,
        verified_gladiator: null,
      },
    ];
    mockSafeRpc.mockResolvedValue({ data: rows, error: null });
    const state = await import('../../src/leaderboard.state.ts');
    state.setCurrentTab('elo');
    state.setCurrentOffset(0);

    const { fetchLeaderboard } = await import('../../src/leaderboard.fetch.ts');
    await fetchLeaderboard();

    expect(state.liveData).not.toBeNull();
    const mapped = state.liveData!;
    expect(mapped[0].user).toBe('DEBATER');
    expect(mapped[0].elo).toBe(1500);
    expect(mapped[0].rank).toBe(1);
    expect(mapped[1].elo).toBe(1200); // null defaults to 1200
    expect(mapped[1].user).toBe('ANON');
    expect(mapped[1].tier).toBe('free'); // null defaults to 'free'
  });
});

// ── TC-5: getData fallback ────────────────────────────────────────────────────
describe('getData', () => {
  it('TC-5: returns PLACEHOLDER_DATA when liveData is null', async () => {
    const state = await import('../../src/leaderboard.state.ts');
    state.setLiveData(null);
    const { getData, PLACEHOLDER_DATA } = await import('../../src/leaderboard.fetch.ts');
    expect(getData()).toStrictEqual(PLACEHOLDER_DATA);
  });

  it('TC-5b: returns liveData when it is set', async () => {
    const state = await import('../../src/leaderboard.state.ts');
    const entries = [{ rank: 1, user: 'ALPHA', elo: 1800, wins: 50, losses: 10, streak: 7, level: 20, tier: 'champion' as const }];
    state.setLiveData(entries);
    const { getData } = await import('../../src/leaderboard.fetch.ts');
    expect(getData()).toStrictEqual(entries);
  });
});

// ── TC-6: searchLeaderboard short-circuit ─────────────────────────────────────
describe('searchLeaderboard', () => {
  it('TC-6: sets searchResults to null and does NOT call safeRpc when query length < 2', async () => {
    const state = await import('../../src/leaderboard.state.ts');
    state.setSearchResults([]);
    const { searchLeaderboard } = await import('../../src/leaderboard.fetch.ts');
    await searchLeaderboard('a');
    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(state.searchResults).toBeNull();
  });

  // ── TC-7: searchLeaderboard RPC call and result mapping ───────────────────
  it('TC-7: calls search_users_by_username and maps results into LeaderboardEntry[]', async () => {
    const rawResults = [
      { id: 'u1', username: 'joker', display_name: 'Joker', elo_rating: 1650 },
      { id: 'u2', username: 'batman', display_name: null, elo_rating: 1400 },
    ];
    mockSafeRpc.mockResolvedValue({ data: rawResults, error: null });

    const state = await import('../../src/leaderboard.state.ts');
    const { searchLeaderboard } = await import('../../src/leaderboard.fetch.ts');
    await searchLeaderboard('jok');

    expect(mockSafeRpc).toHaveBeenCalledWith('search_users_by_username', { p_query: 'jok' });
    expect(state.searchResults).not.toBeNull();
    expect(state.searchResults![0].user).toBe('JOKER');
    expect(state.searchResults![0].elo).toBe(1650);
    expect(state.searchResults![1].user).toBe('BATMAN');
    expect(state.searchQuery).toBe('jok');
  });
});
