// ============================================================
// PROFILE DEBATE ARCHIVE STATE — tests/profile-debate-archive-state.test.ts
// Source: src/profile-debate-archive.state.ts
//
// CLASSIFICATION:
//   setEntries/setFilterCat/setFilterResult/setFilterSearch/setIsOwner — setters → Unit tests
//   resetFilters — reset helper → Unit test
//
// IMPORTS:
//   import type { ArchiveEntry } from './profile-debate-archive.types.ts'
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';

import {
  entries, filterCat, filterResult, filterSearch, isOwner,
  setEntries, setFilterCat, setFilterResult, setFilterSearch, setIsOwner,
  resetFilters,
} from '../src/profile-debate-archive.state.ts';

// Re-import as a namespace so we always read the live binding
import * as state from '../src/profile-debate-archive.state.ts';

beforeEach(() => {
  // Always reset to clean defaults before each test
  resetFilters();
  setIsOwner(false);
});

// ── initial defaults ──────────────────────────────────────────

describe('TC1 — initial defaults are correct', () => {
  it('entries is empty array, filters are "all", isOwner is false', () => {
    expect(state.entries).toEqual([]);
    expect(state.filterCat).toBe('all');
    expect(state.filterResult).toBe('all');
    expect(state.filterSearch).toBe('');
    expect(state.isOwner).toBe(false);
  });
});

// ── setEntries ────────────────────────────────────────────────

describe('TC2 — setEntries: stores array', () => {
  it('updates entries binding', () => {
    const row = { debate_id: 'd-1', topic: 'Test', is_win: true } as any;
    setEntries([row]);
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].debate_id).toBe('d-1');
  });
});

// ── setFilterCat ──────────────────────────────────────────────

describe('TC3 — setFilterCat: updates filterCat', () => {
  it('stores the category string', () => {
    setFilterCat('sports');
    expect(state.filterCat).toBe('sports');
  });
});

// ── setFilterResult ───────────────────────────────────────────

describe('TC4 — setFilterResult: updates filterResult', () => {
  it('stores win/loss/all', () => {
    setFilterResult('win');
    expect(state.filterResult).toBe('win');
    setFilterResult('loss');
    expect(state.filterResult).toBe('loss');
  });
});

// ── setFilterSearch ───────────────────────────────────────────

describe('TC5 — setFilterSearch: updates filterSearch', () => {
  it('stores search query string', () => {
    setFilterSearch('alice');
    expect(state.filterSearch).toBe('alice');
  });
});

// ── setIsOwner ────────────────────────────────────────────────

describe('TC6 — setIsOwner: toggles isOwner', () => {
  it('sets to true then false', () => {
    setIsOwner(true);
    expect(state.isOwner).toBe(true);
    setIsOwner(false);
    expect(state.isOwner).toBe(false);
  });
});

// ── resetFilters ──────────────────────────────────────────────

describe('TC7 — resetFilters: clears entries and resets filter values', () => {
  it('restores all filter defaults regardless of prior mutations', () => {
    setEntries([{ debate_id: 'x' } as any]);
    setFilterCat('music');
    setFilterResult('loss');
    setFilterSearch('bob');

    resetFilters();

    expect(state.entries).toEqual([]);
    expect(state.filterCat).toBe('all');
    expect(state.filterResult).toBe('all');
    expect(state.filterSearch).toBe('');
  });
});

describe('TC8 — resetFilters: does not reset isOwner', () => {
  it('isOwner is unchanged after resetFilters', () => {
    setIsOwner(true);
    resetFilters();
    expect(state.isOwner).toBe(true);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/profile-debate-archive.state.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./profile-debate-archive.types.ts'];
    const source = readFileSync(resolve(__dirname, '../src/profile-debate-archive.state.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
