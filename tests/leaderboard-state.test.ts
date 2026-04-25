// ============================================================
// LEADERBOARD STATE — tests/leaderboard-state.test.ts
// Source: src/leaderboard.state.ts
//
// CLASSIFICATION:
//   All exports — Pure module-level state + setters → Unit test
//
// IMPORTS:
//   import type { ... } — type-only, no mock needed
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  currentTab, liveData, myRank, isLoading, currentOffset, hasMore,
  searchQuery, searchResults, PAGE_SIZE,
  setCurrentTab, setLiveData, setMyRank, setIsLoading,
  setCurrentOffset, setHasMore, setSearchQuery, setSearchResults,
} from '../src/leaderboard.state.ts';

// ── PAGE_SIZE ─────────────────────────────────────────────────

describe('TC1 — PAGE_SIZE: is 50', () => {
  it('exports PAGE_SIZE as 50', () => {
    expect(PAGE_SIZE).toBe(50);
  });
});

// ── currentTab ────────────────────────────────────────────────

describe('TC2 — setCurrentTab: updates currentTab', () => {
  it('changes currentTab to the provided value', () => {
    setCurrentTab('wins');
    expect(currentTab).toBe('wins');
    setCurrentTab('elo'); // restore
  });
});

// ── liveData ──────────────────────────────────────────────────

describe('TC3 — setLiveData: updates liveData', () => {
  it('sets liveData to provided array', () => {
    const rows = [{ id: 'u-1', elo: 1400 } as never];
    setLiveData(rows);
    expect(liveData).toEqual(rows);
    setLiveData(null);
  });
});

// ── myRank ────────────────────────────────────────────────────

describe('TC4 — setMyRank: updates myRank', () => {
  it('sets myRank to a number', () => {
    setMyRank(42);
    expect(myRank).toBe(42);
    setMyRank(null);
  });
});

// ── isLoading ─────────────────────────────────────────────────

describe('TC5 — setIsLoading: updates isLoading', () => {
  it('toggles isLoading', () => {
    setIsLoading(true);
    expect(isLoading).toBe(true);
    setIsLoading(false);
    expect(isLoading).toBe(false);
  });
});

// ── hasMore ───────────────────────────────────────────────────

describe('TC6 — setHasMore: updates hasMore', () => {
  it('sets hasMore flag', () => {
    setHasMore(true);
    expect(hasMore).toBe(true);
    setHasMore(false);
  });
});

// ── searchQuery ───────────────────────────────────────────────

describe('TC7 — setSearchQuery: updates searchQuery', () => {
  it('sets searchQuery to the provided string', () => {
    setSearchQuery('alice');
    expect(searchQuery).toBe('alice');
    setSearchQuery('');
  });
});

// ── searchResults ─────────────────────────────────────────────

describe('TC8 — setSearchResults: updates searchResults', () => {
  it('sets searchResults to provided array or null', () => {
    const results = [{ id: 'u-2', elo: 1300 } as never];
    setSearchResults(results);
    expect(searchResults).toEqual(results);
    setSearchResults(null);
    expect(searchResults).toBeNull();
  });
});

// ── currentOffset ─────────────────────────────────────────────

describe('TC9 — setCurrentOffset: updates currentOffset', () => {
  it('sets currentOffset to provided number', () => {
    setCurrentOffset(50);
    expect(currentOffset).toBe(50);
    setCurrentOffset(0);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/leaderboard.state.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list (type-only)', () => {
    const allowed = ['./leaderboard.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/leaderboard.state.ts'),
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
