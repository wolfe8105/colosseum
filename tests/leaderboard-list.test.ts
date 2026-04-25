// ============================================================
// LEADERBOARD LIST — tests/leaderboard-list.test.ts
// Source: src/leaderboard.list.ts
//
// CLASSIFICATION:
//   renderShimmer()       — Pure HTML → Unit test
//   renderList()          — Pure HTML with state → Unit test
//   renderSearchResults() — Pure HTML with state → Unit test
//
// IMPORTS:
//   { escapeHTML }        from './config.ts'
//   { vgBadge }           from './badge.ts'
//   { bountyDot }         from './bounties.ts'
//   { currentTab, liveData, isLoading, hasMore, searchResults } from './leaderboard.state.ts'
//   { getData }           from './leaderboard.fetch.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));
const mockVgBadge = vi.hoisted(() => vi.fn(() => ''));
const mockBountyDot = vi.hoisted(() => vi.fn(() => ''));
const mockLbState = vi.hoisted(() => ({
  currentTab: 'elo' as string,
  liveData: null as unknown[] | null,
  isLoading: false,
  hasMore: false,
  searchResults: null as unknown[] | null,
}));
const mockGetData = vi.hoisted(() => vi.fn(() => [] as unknown[]));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/badge.ts', () => ({
  vgBadge: mockVgBadge,
}));

vi.mock('../src/bounties.ts', () => ({
  bountyDot: mockBountyDot,
}));

vi.mock('../src/leaderboard.state.ts', () => ({
  get currentTab() { return mockLbState.currentTab; },
  get liveData() { return mockLbState.liveData; },
  get isLoading() { return mockLbState.isLoading; },
  get hasMore() { return mockLbState.hasMore; },
  get searchResults() { return mockLbState.searchResults; },
}));

vi.mock('../src/leaderboard.fetch.ts', () => ({
  getData: mockGetData,
}));

import { renderShimmer, renderList, renderSearchResults } from '../src/leaderboard.list.ts';

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
  mockVgBadge.mockReturnValue('');
  mockBountyDot.mockReturnValue('');
  mockLbState.currentTab = 'elo';
  mockLbState.liveData = null;
  mockLbState.isLoading = false;
  mockLbState.hasMore = false;
  mockLbState.searchResults = null;
  mockGetData.mockReturnValue([]);
});

// ── renderShimmer ─────────────────────────────────────────────

describe('TC1 — renderShimmer: contains colo-shimmer elements', () => {
  it('returns HTML with .colo-shimmer class', () => {
    const html = renderShimmer();
    expect(html).toContain('colo-shimmer');
  });
});

describe('TC2 — renderShimmer: has 6 rows', () => {
  it('generates 6 shimmer rows', () => {
    const html = renderShimmer();
    const matches = html.match(/class="colo-shimmer"/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(6);
  });
});

// ── renderList ────────────────────────────────────────────────

describe('TC3 — renderList: shows error message when liveData is null', () => {
  it('returns "Couldn\'t load" message when liveData is null and not loading', () => {
    mockLbState.liveData = null;
    mockLbState.isLoading = false;

    const html = renderList();

    expect(html).toContain("Couldn't load");
  });
});

describe('TC4 — renderList: calls getData to get row data', () => {
  it('invokes getData to retrieve display data', () => {
    mockLbState.liveData = [];
    mockGetData.mockReturnValue([]);

    renderList();

    expect(mockGetData).toHaveBeenCalled();
  });
});

describe('TC5 — renderList: renders user rows with data-username', () => {
  it('includes data-username attribute for each user', () => {
    mockLbState.liveData = [];
    mockGetData.mockReturnValue([
      { id: 'u-1', username: 'alice', user: 'Alice', elo: 1400, wins: 5, losses: 2, streak: 3, rank: 1, tier: 'free', level: 1 },
    ]);

    const html = renderList();

    expect(html).toContain('data-username');
  });
});

describe('TC6 — renderList: shows load-more button when hasMore is true', () => {
  it('includes load-more button when hasMore flag is set', () => {
    mockLbState.liveData = [];
    mockLbState.hasMore = true;
    mockGetData.mockReturnValue([]);

    const html = renderList();

    expect(html).toContain('load-more');
  });
});

// ── renderSearchResults ───────────────────────────────────────

describe('TC7 — renderSearchResults: shows "No users found" for empty results', () => {
  it('returns empty state message when searchResults is empty', () => {
    mockLbState.searchResults = [];

    const html = renderSearchResults();

    expect(html).toContain('No users found');
  });
});

describe('TC8 — renderSearchResults: renders rows for results', () => {
  it('includes data-username for each search result', () => {
    mockLbState.searchResults = [
      { id: 'u-2', username: 'bob', user: 'Bob', elo: 1300, wins: 2, losses: 1, streak: 1 },
    ];

    const html = renderSearchResults();

    expect(html).toContain('data-username');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/leaderboard.list.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './config.ts',
      './badge.ts',
      './bounties.ts',
      './leaderboard.state.ts',
      './leaderboard.fetch.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/leaderboard.list.ts'),
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
