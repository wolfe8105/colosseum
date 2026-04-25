// ============================================================
// LEADERBOARD RENDER — tests/leaderboard-render.test.ts
// Source: src/leaderboard.render.ts
//
// CLASSIFICATION:
//   render() — DOM builder → Behavioral test
//
// IMPORTS:
//   { escapeHTML }        from './config.ts'
//   { getCurrentProfile } from './auth.ts'
//   { currentTab, myRank, isLoading, searchQuery, searchResults } from './leaderboard.state.ts'
//   { renderList, renderShimmer, renderSearchResults }             from './leaderboard.list.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => null));
const mockLeaderboardState = vi.hoisted(() => ({
  currentTab: 'elo' as string,
  myRank: null as number | null,
  isLoading: false,
  searchQuery: '',
  searchResults: null as unknown[] | null,
}));
const mockRenderList = vi.hoisted(() => vi.fn(() => '<div class="lb-list-mock"></div>'));
const mockRenderShimmer = vi.hoisted(() => vi.fn(() => '<div class="lb-shimmer"></div>'));
const mockRenderSearchResults = vi.hoisted(() => vi.fn(() => '<div class="lb-search-results"></div>'));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/leaderboard.state.ts', () => ({
  get currentTab() { return mockLeaderboardState.currentTab; },
  get myRank() { return mockLeaderboardState.myRank; },
  get isLoading() { return mockLeaderboardState.isLoading; },
  get searchQuery() { return mockLeaderboardState.searchQuery; },
  get searchResults() { return mockLeaderboardState.searchResults; },
}));

vi.mock('../src/leaderboard.list.ts', () => ({
  renderList: mockRenderList,
  renderShimmer: mockRenderShimmer,
  renderSearchResults: mockRenderSearchResults,
}));

import { render } from '../src/leaderboard.render.ts';

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
  mockGetCurrentProfile.mockReturnValue(null);
  mockLeaderboardState.currentTab = 'elo';
  mockLeaderboardState.myRank = null;
  mockLeaderboardState.isLoading = false;
  mockLeaderboardState.searchQuery = '';
  mockLeaderboardState.searchResults = null;
  mockRenderList.mockReturnValue('<div class="lb-list-mock"></div>');
  mockRenderShimmer.mockReturnValue('<div class="lb-shimmer"></div>');
  document.body.innerHTML = '<div id="screen-leaderboard"></div>';
});

// ── render ────────────────────────────────────────────────────

describe('TC1 — render: no-op when container missing', () => {
  it('does not throw when #screen-leaderboard is absent', () => {
    document.body.innerHTML = '';
    expect(() => render()).not.toThrow();
  });
});

describe('TC2 — render: creates #lb-list container', () => {
  it('renders #lb-list inside the leaderboard screen', () => {
    render();
    expect(document.getElementById('lb-list')).not.toBeNull();
  });
});

describe('TC3 — render: creates 3 tab buttons', () => {
  it('renders elo, wins, streak tab buttons', () => {
    render();
    const tabs = document.querySelectorAll('.lb-tab');
    expect(tabs).toHaveLength(3);
  });
});

describe('TC4 — render: creates lb-search-input', () => {
  it('renders #lb-search-input', () => {
    render();
    expect(document.getElementById('lb-search-input')).not.toBeNull();
  });
});

describe('TC5 — render: shows rank as #-- when myRank is null', () => {
  it('renders #-- when no rank is available', () => {
    mockLeaderboardState.myRank = null;
    render();
    const container = document.getElementById('screen-leaderboard')!;
    expect(container.innerHTML).toContain('#--');
  });
});

describe('TC6 — render: shows actual rank when myRank is set', () => {
  it('renders #42 when myRank is 42', () => {
    mockLeaderboardState.myRank = 42;
    render();
    const container = document.getElementById('screen-leaderboard')!;
    expect(container.innerHTML).toContain('#42');
  });
});

describe('TC7 — render: calls renderList when not loading and no search results', () => {
  it('invokes renderList to populate list content', () => {
    mockLeaderboardState.searchResults = null;
    mockLeaderboardState.isLoading = false;
    render();
    expect(mockRenderList).toHaveBeenCalled();
  });
});

describe('TC8 — render: calls renderShimmer when loading', () => {
  it('invokes renderShimmer when isLoading is true', () => {
    mockLeaderboardState.isLoading = true;
    mockLeaderboardState.searchResults = null;
    render();
    expect(mockRenderShimmer).toHaveBeenCalled();
  });
});

describe('TC9 — render: calls renderSearchResults when searchResults is set', () => {
  it('invokes renderSearchResults when there are search results', () => {
    mockLeaderboardState.searchResults = [{ id: 'u-1' }];
    render();
    expect(mockRenderSearchResults).toHaveBeenCalled();
  });
});

describe('TC10 — render: uses escapeHTML for user name', () => {
  it('calls escapeHTML with the username from profile', () => {
    mockGetCurrentProfile.mockReturnValue({ username: 'alice', elo_rating: 1300, wins: 5 });
    render();
    expect(mockEscapeHTML).toHaveBeenCalledWith(expect.stringContaining('ALICE'));
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/leaderboard.render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './config.ts',
      './auth.ts',
      './leaderboard.state.ts',
      './leaderboard.list.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/leaderboard.render.ts'),
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
