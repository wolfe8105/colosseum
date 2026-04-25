// ============================================================
// LEADERBOARD FETCH — tests/leaderboard-fetch.test.ts
// Source: src/leaderboard.fetch.ts
//
// CLASSIFICATION:
//   PLACEHOLDER_DATA  — constant array, no test needed
//   getData()         — Pure: returns liveData ?? PLACEHOLDER_DATA → Unit test
//   fetchLeaderboard()— RPC wrapper + orchestration → Contract test
//   setTab()          — Orchestration + dynamic import → Integration test
//   setTime()         — Orchestration + dynamic import → Integration test
//   loadMore()        — Orchestration → Integration test
//   searchLeaderboard()— RPC wrapper → Contract test
//   clearSearch()     — Pure state mutation → Unit test
//
// IMPORTS:
//   { safeRpc, getCurrentUser, getSupabaseClient, getIsPlaceholderMode } from './auth.ts'
//   { currentTab, liveData, isLoading, currentOffset, hasMore, PAGE_SIZE,
//     searchQuery, searchResults, setCurrentTab, setLiveData, setMyRank,
//     setIsLoading, setCurrentOffset, setHasMore, setSearchQuery,
//     setSearchResults } from './leaderboard.state.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────

const mockSafeRpc            = vi.hoisted(() => vi.fn());
const mockGetCurrentUser     = vi.hoisted(() => vi.fn(() => null));
const mockGetSupabaseClient  = vi.hoisted(() => vi.fn(() => ({})));
const mockGetIsPlaceholder   = vi.hoisted(() => vi.fn(() => false));

// Mutable state mirrors
const stateVars = vi.hoisted(() => ({
  currentTab: 'elo' as string,
  liveData: null as null | unknown[],
  isLoading: false,
  currentOffset: 0,
  hasMore: false,
  PAGE_SIZE: 20,
  searchQuery: '',
  searchResults: null as null | unknown[],
}));

const mockSetCurrentTab    = vi.hoisted(() => vi.fn((v: string) => { stateVars.currentTab = v; }));
const mockSetLiveData      = vi.hoisted(() => vi.fn((v: null | unknown[]) => { stateVars.liveData = v; }));
const mockSetMyRank        = vi.hoisted(() => vi.fn());
const mockSetIsLoading     = vi.hoisted(() => vi.fn((v: boolean) => { stateVars.isLoading = v; }));
const mockSetCurrentOffset = vi.hoisted(() => vi.fn((v: number) => { stateVars.currentOffset = v; }));
const mockSetHasMore       = vi.hoisted(() => vi.fn((v: boolean) => { stateVars.hasMore = v; }));
const mockSetSearchQuery   = vi.hoisted(() => vi.fn((v: string) => { stateVars.searchQuery = v; }));
const mockSetSearchResults = vi.hoisted(() => vi.fn((v: null | unknown[]) => { stateVars.searchResults = v; }));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentUser: mockGetCurrentUser,
  getSupabaseClient: mockGetSupabaseClient,
  getIsPlaceholderMode: mockGetIsPlaceholder,
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/leaderboard.state.ts', () => ({
  get currentTab()    { return stateVars.currentTab; },
  get liveData()      { return stateVars.liveData; },
  get isLoading()     { return stateVars.isLoading; },
  get currentOffset() { return stateVars.currentOffset; },
  get hasMore()       { return stateVars.hasMore; },
  get PAGE_SIZE()     { return stateVars.PAGE_SIZE; },
  get searchQuery()   { return stateVars.searchQuery; },
  get searchResults() { return stateVars.searchResults; },
  setCurrentTab:    mockSetCurrentTab,
  setLiveData:      mockSetLiveData,
  setMyRank:        mockSetMyRank,
  setIsLoading:     mockSetIsLoading,
  setCurrentOffset: mockSetCurrentOffset,
  setHasMore:       mockSetHasMore,
  setSearchQuery:   mockSetSearchQuery,
  setSearchResults: mockSetSearchResults,
}));

vi.mock('../src/leaderboard.render.ts', () => ({
  render: vi.fn(),
}));

vi.mock('../src/leaderboard.list.ts', () => ({
  renderList: vi.fn(() => '<div></div>'),
}));

import {
  getData,
  fetchLeaderboard,
  setTab,
  setTime,
  loadMore,
  searchLeaderboard,
  clearSearch,
  PLACEHOLDER_DATA,
} from '../src/leaderboard.fetch.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetCurrentUser.mockReturnValue(null);
  mockGetSupabaseClient.mockReturnValue({});
  mockGetIsPlaceholder.mockReturnValue(false);
  mockSetCurrentTab.mockClear();
  mockSetLiveData.mockClear();
  mockSetMyRank.mockClear();
  mockSetIsLoading.mockClear();
  mockSetCurrentOffset.mockClear();
  mockSetHasMore.mockClear();
  mockSetSearchQuery.mockClear();
  mockSetSearchResults.mockClear();
  // Reset state mirrors
  stateVars.currentTab = 'elo';
  stateVars.liveData = null;
  stateVars.isLoading = false;
  stateVars.currentOffset = 0;
  stateVars.hasMore = false;
  stateVars.searchQuery = '';
  stateVars.searchResults = null;
});

// ── TC1: getData — returns PLACEHOLDER_DATA when liveData is null ─

describe('TC1 — getData: returns PLACEHOLDER_DATA when liveData is null', () => {
  it('returns the 10-entry placeholder array when no live data', () => {
    stateVars.liveData = null;
    const result = getData();
    expect(result).toBe(PLACEHOLDER_DATA);
    expect(result.length).toBe(10);
  });
});

// ── TC2: getData — returns liveData when set ─────────────────

describe('TC2 — getData: returns liveData when available', () => {
  it('returns liveData array instead of placeholder', () => {
    const live = [{ rank: 1, user: 'ALPHA', elo: 1900, wins: 50, losses: 10, streak: 5, level: 10, tier: 'free' }];
    stateVars.liveData = live;
    expect(getData()).toBe(live);
  });
});

// ── TC3: fetchLeaderboard — early return if isLoading ────────

describe('TC3 — fetchLeaderboard: skips when isLoading is true', () => {
  it('does not call safeRpc when already loading', async () => {
    stateVars.isLoading = true;
    await fetchLeaderboard();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC4: fetchLeaderboard — early return if no client ────────

describe('TC4 — fetchLeaderboard: skips when no supabase client', () => {
  it('does not call safeRpc when getSupabaseClient returns null', async () => {
    mockGetSupabaseClient.mockReturnValue(null);
    await fetchLeaderboard();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC5: fetchLeaderboard — early return if placeholder mode ─

describe('TC5 — fetchLeaderboard: skips in placeholder mode', () => {
  it('does not call safeRpc in placeholder mode', async () => {
    mockGetIsPlaceholder.mockReturnValue(true);
    await fetchLeaderboard();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC6: fetchLeaderboard — calls get_leaderboard RPC ────────

describe('TC6 — fetchLeaderboard: calls get_leaderboard RPC', () => {
  it('calls safeRpc with get_leaderboard', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await fetchLeaderboard();
    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('get_leaderboard');
  });

  it('passes p_sort_by, p_limit, p_offset', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await fetchLeaderboard();
    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params).toHaveProperty('p_sort_by');
    expect(params).toHaveProperty('p_limit');
    expect(params).toHaveProperty('p_offset');
  });
});

// ── TC7: fetchLeaderboard — elo tab uses elo_rating sort ─────

describe('TC7 — fetchLeaderboard: elo tab uses elo_rating sort column', () => {
  it('sends p_sort_by=elo_rating for elo tab', async () => {
    stateVars.currentTab = 'elo';
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await fetchLeaderboard();
    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_sort_by).toBe('elo_rating');
  });
});

// ── TC8: fetchLeaderboard — wins tab uses wins sort ───────────

describe('TC8 — fetchLeaderboard: wins tab uses wins sort column', () => {
  it('sends p_sort_by=wins for wins tab', async () => {
    stateVars.currentTab = 'wins';
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await fetchLeaderboard();
    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_sort_by).toBe('wins');
  });
});

// ── TC9: fetchLeaderboard — maps rows to LeaderboardEntry ────

describe('TC9 — fetchLeaderboard: maps rows with numeric coercion', () => {
  it('calls setLiveData with normalized entries', async () => {
    const rows = [
      { id: 'u1', username: 'Alice', display_name: 'Alice', elo_rating: 1500,
        wins: 10, losses: 5, current_streak: 3, level: 5, subscription_tier: 'contender',
        debates_completed: 15, verified_gladiator: false },
    ];
    mockSafeRpc.mockResolvedValue({ data: rows, error: null });
    stateVars.PAGE_SIZE = 20;
    await fetchLeaderboard();
    expect(mockSetLiveData).toHaveBeenCalledTimes(1);
    const [entries] = mockSetLiveData.mock.calls[0];
    expect(entries[0].user).toBe('ALICE');
    expect(entries[0].elo).toBe(1500);
  });
});

// ── TC10: fetchLeaderboard — sets isLoading to false after ───

describe('TC10 — fetchLeaderboard: resets isLoading to false after fetch', () => {
  it('calls setIsLoading(false) on success', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await fetchLeaderboard();
    const calls = mockSetIsLoading.mock.calls.map(([v]) => v);
    expect(calls).toContain(false);
  });
});

// ── TC11: searchLeaderboard — skips short query ──────────────

describe('TC11 — searchLeaderboard: clears results for query < 2 chars', () => {
  it('calls setSearchResults(null) for single-character query', async () => {
    await searchLeaderboard('a');
    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(mockSetSearchResults).toHaveBeenCalledWith(null);
  });
});

// ── TC12: searchLeaderboard — calls RPC for valid query ──────

describe('TC12 — searchLeaderboard: calls search_users_by_username RPC', () => {
  it('calls safeRpc with search_users_by_username', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await searchLeaderboard('al');
    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('search_users_by_username');
  });
});

// ── TC13: searchLeaderboard — passes query as p_query ────────

describe('TC13 — searchLeaderboard: passes query as p_query', () => {
  it('sends p_query equal to the search string', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await searchLeaderboard('alpha');
    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_query).toBe('alpha');
  });
});

// ── TC14: clearSearch — resets query and results ─────────────

describe('TC14 — clearSearch: resets search state', () => {
  it('calls setSearchQuery with empty string and setSearchResults with null', () => {
    clearSearch();
    expect(mockSetSearchQuery).toHaveBeenCalledWith('');
    expect(mockSetSearchResults).toHaveBeenCalledWith(null);
  });
});

// ── TC15: setTab — resets offset and calls fetchLeaderboard ──

describe('TC15 — setTab: resets offset and fetches fresh data', () => {
  it('calls setCurrentTab, setCurrentOffset(0), and safeRpc', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await setTab('wins');
    expect(mockSetCurrentTab).toHaveBeenCalledWith('wins');
    expect(mockSetCurrentOffset).toHaveBeenCalledWith(0);
    expect(mockSafeRpc).toHaveBeenCalled();
  });
});

// ── TC16: loadMore — skips when hasMore is false ─────────────

describe('TC16 — loadMore: no-op when hasMore is false', () => {
  it('does not call safeRpc when hasMore is false', async () => {
    stateVars.hasMore = false;
    await loadMore();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/leaderboard.fetch.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './leaderboard.state.ts', './leaderboard.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/leaderboard.fetch.ts'),
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
