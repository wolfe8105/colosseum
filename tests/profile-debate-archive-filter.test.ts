// ============================================================
// PROFILE DEBATE ARCHIVE FILTER — tests/profile-debate-archive-filter.test.ts
// Source: src/profile-debate-archive.filter.ts
//
// CLASSIFICATION:
//   archiveUrl() — pure URL builder → Unit test
//   filtered()   — pure filter over state → Unit test
//
// IMPORTS:
//   { entries, filterCat, filterResult, filterSearch } from './profile-debate-archive.state.ts'
//   import type { ArchiveEntry }                        from './profile-debate-archive.types.ts'
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { setEntries, setFilterCat, setFilterResult, setFilterSearch, resetFilters } from '../src/profile-debate-archive.state.ts';
import { archiveUrl, filtered } from '../src/profile-debate-archive.filter.ts';

const makeEntry = (overrides: Partial<any> = {}): any => ({
  debate_id: 'debate-1',
  topic: 'Topic One',
  category: 'politics',
  is_win: true,
  opponent_name: 'Opponent',
  opponent_username: 'opponent_user',
  custom_name: '',
  debate_mode: 'live',
  ...overrides,
});

beforeEach(() => {
  resetFilters();
});

// ── archiveUrl ────────────────────────────────────────────────

describe('TC1 — archiveUrl: ai mode returns auto-debate URL', () => {
  it('builds /moderator-auto-debate.html?id= for debate_mode ai', () => {
    const entry = makeEntry({ debate_id: 'abc-123', debate_mode: 'ai' });
    expect(archiveUrl(entry)).toBe('/moderator-auto-debate.html?id=abc-123');
  });
});

describe('TC2 — archiveUrl: non-ai mode returns spectate URL', () => {
  it('builds /moderator-spectate.html?id= for live mode', () => {
    const entry = makeEntry({ debate_id: 'xyz-789', debate_mode: 'live' });
    expect(archiveUrl(entry)).toBe('/moderator-spectate.html?id=xyz-789');
  });
});

describe('TC3 — archiveUrl: encodes special characters in debate_id', () => {
  it('percent-encodes the id', () => {
    const entry = makeEntry({ debate_id: 'id with spaces', debate_mode: 'text' });
    expect(archiveUrl(entry)).toContain('id%20with%20spaces');
  });
});

// ── filtered ─────────────────────────────────────────────────

describe('TC4 — filtered: returns all when no filters set', () => {
  it('returns every entry when filterCat/filterResult/filterSearch are defaults', () => {
    setEntries([makeEntry(), makeEntry({ debate_id: 'debate-2', category: 'sports', is_win: false })]);
    expect(filtered()).toHaveLength(2);
  });
});

describe('TC5 — filtered: filterCat excludes non-matching categories', () => {
  it('only includes entries matching the active category', () => {
    setEntries([
      makeEntry({ debate_id: 'd-1', category: 'politics' }),
      makeEntry({ debate_id: 'd-2', category: 'sports' }),
    ]);
    setFilterCat('sports');
    const result = filtered();
    expect(result).toHaveLength(1);
    expect(result[0].debate_id).toBe('d-2');
  });
});

describe('TC6 — filtered: filterResult win excludes losses', () => {
  it('only includes is_win entries when filterResult is "win"', () => {
    setEntries([
      makeEntry({ debate_id: 'w-1', is_win: true }),
      makeEntry({ debate_id: 'l-1', is_win: false }),
    ]);
    setFilterResult('win');
    const result = filtered();
    expect(result).toHaveLength(1);
    expect(result[0].debate_id).toBe('w-1');
  });
});

describe('TC7 — filtered: filterResult loss excludes wins', () => {
  it('only includes !is_win entries when filterResult is "loss"', () => {
    setEntries([
      makeEntry({ debate_id: 'w-2', is_win: true }),
      makeEntry({ debate_id: 'l-2', is_win: false }),
    ]);
    setFilterResult('loss');
    const result = filtered();
    expect(result).toHaveLength(1);
    expect(result[0].debate_id).toBe('l-2');
  });
});

describe('TC8 — filtered: filterSearch matches topic', () => {
  it('returns entries whose topic contains the query', () => {
    setEntries([
      makeEntry({ debate_id: 'a', topic: 'Climate change is real' }),
      makeEntry({ debate_id: 'b', topic: 'Economy debate' }),
    ]);
    setFilterSearch('climate');
    const result = filtered();
    expect(result).toHaveLength(1);
    expect(result[0].debate_id).toBe('a');
  });
});

describe('TC9 — filtered: filterSearch matches opponent_name', () => {
  it('returns entries whose opponent_name contains the query', () => {
    setEntries([
      makeEntry({ debate_id: 'x', opponent_name: 'Alice Smith', topic: 'Foo' }),
      makeEntry({ debate_id: 'y', opponent_name: 'Bob Jones', topic: 'Bar' }),
    ]);
    setFilterSearch('alice');
    const result = filtered();
    expect(result).toHaveLength(1);
    expect(result[0].debate_id).toBe('x');
  });
});

describe('TC10 — filtered: filterSearch is case-insensitive', () => {
  it('matches uppercase query against lowercase content', () => {
    setEntries([makeEntry({ topic: 'climate policy' })]);
    setFilterSearch('CLIMATE');
    expect(filtered()).toHaveLength(1);
  });
});

describe('TC11 — filtered: category "all" passes entries with any category', () => {
  it('returns entries with null category when filterCat is "all"', () => {
    setEntries([makeEntry({ category: null })]);
    // filterCat is 'all' by default after resetFilters
    expect(filtered()).toHaveLength(1);
  });
});

describe('TC12 — filtered: null category treated as "general" for category filter', () => {
  it('matches null category as "general"', () => {
    setEntries([makeEntry({ category: null })]);
    setFilterCat('general');
    expect(filtered()).toHaveLength(1);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/profile-debate-archive.filter.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./profile-debate-archive.state.ts', './profile-debate-archive.types.ts'];
    const source = readFileSync(resolve(__dirname, '../src/profile-debate-archive.filter.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
