// ============================================================
// PROFILE DEBATE ARCHIVE RENDER — tests/profile-debate-archive-render.test.ts
// Source: src/profile-debate-archive.render.ts
//
// CLASSIFICATION:
//   renderTable() — DOM builder + event wiring → Integration test
//
// IMPORTS:
//   { escapeHTML }               from './config.ts'
//   { showAdInterstitial }       from './arena/arena-ads.ts'
//   { entries, isOwner, filterSearch, filterResult, filterCat,
//     setFilterSearch, setFilterResult, setFilterCat } from './profile-debate-archive.state.ts'
//   { filtered, archiveUrl }     from './profile-debate-archive.filter.ts'
//   { showAddPicker }            from './profile-debate-archive.picker.ts'
//   { showEditSheet, toggleHide, removeEntry } from './profile-debate-archive.edit.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML          = vi.hoisted(() => vi.fn((s: string) => s));
const mockShowAdInterstitial  = vi.hoisted(() => vi.fn((cb: () => void) => cb()));
const mockFiltered            = vi.hoisted(() => vi.fn(() => [] as unknown[]));
const mockArchiveUrl          = vi.hoisted(() => vi.fn(() => 'https://example.com/debate/1'));
const mockShowAddPicker       = vi.hoisted(() => vi.fn());
const mockShowEditSheet       = vi.hoisted(() => vi.fn());
const mockToggleHide          = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRemoveEntry         = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockSetFilterSearch     = vi.hoisted(() => vi.fn());
const mockSetFilterResult     = vi.hoisted(() => vi.fn());
const mockSetFilterCat        = vi.hoisted(() => vi.fn());

const stateVars = vi.hoisted(() => ({
  entries: [] as unknown[],
  isOwner: false,
  filterSearch: '',
  filterResult: 'all',
  filterCat: 'all',
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: vi.fn(),
}));

vi.mock('../src/arena/arena-ads.ts', () => ({
  showAdInterstitial: mockShowAdInterstitial,
}));

vi.mock('../src/profile-debate-archive.state.ts', () => ({
  get entries()       { return stateVars.entries; },
  get isOwner()       { return stateVars.isOwner; },
  get filterSearch()  { return stateVars.filterSearch; },
  get filterResult()  { return stateVars.filterResult; },
  get filterCat()     { return stateVars.filterCat; },
  setFilterSearch: mockSetFilterSearch,
  setFilterResult: mockSetFilterResult,
  setFilterCat: mockSetFilterCat,
}));

vi.mock('../src/profile-debate-archive.filter.ts', () => ({
  filtered: mockFiltered,
  archiveUrl: mockArchiveUrl,
}));

vi.mock('../src/profile-debate-archive.picker.ts', () => ({
  showAddPicker: mockShowAddPicker,
}));

vi.mock('../src/profile-debate-archive.edit.ts', () => ({
  showEditSheet: mockShowEditSheet,
  toggleHide: mockToggleHide,
  removeEntry: mockRemoveEntry,
}));

import { renderTable } from '../src/profile-debate-archive.render.ts';

const makeEntry = (overrides = {}) => ({
  entry_id: 'e-1',
  topic: 'AI will rule',
  custom_name: null,
  custom_desc: null,
  debate_created_at: new Date().toISOString(),
  is_win: true,
  winner: 'me',
  opponent_name: 'Bob',
  opponent_username: 'bob',
  my_score: 8.5,
  opp_score: 7.0,
  category: 'tech',
  hide_from_public: false,
  ...overrides,
});

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockFiltered.mockReturnValue([]);
  mockArchiveUrl.mockReturnValue('https://example.com/debate/1');
  mockShowAddPicker.mockReset();
  mockShowEditSheet.mockReset();
  mockToggleHide.mockReset().mockResolvedValue(undefined);
  mockRemoveEntry.mockReset().mockResolvedValue(undefined);
  mockSetFilterSearch.mockReset();
  mockSetFilterResult.mockReset();
  mockSetFilterCat.mockReset();
  stateVars.entries = [];
  stateVars.isOwner = false;
  stateVars.filterSearch = '';
  stateVars.filterResult = 'all';
  stateVars.filterCat = 'all';
  document.body.innerHTML = '';
});

// ── TC1: renderTable — renders dba-header ────────────────────

describe('TC1 — renderTable: renders .dba-header', () => {
  it('sets container innerHTML containing dba-header', () => {
    const container = document.createElement('div');
    renderTable(container);
    expect(container.innerHTML).toContain('dba-header');
  });
});

// ── TC2: renderTable — empty state when no rows ──────────────

describe('TC2 — renderTable: shows dba-empty when filtered() returns []', () => {
  it('renders dba-empty element when no rows', () => {
    mockFiltered.mockReturnValue([]);
    const container = document.createElement('div');
    renderTable(container);
    expect(container.querySelector('.dba-empty')).not.toBeNull();
  });
});

// ── TC3: renderTable — renders rows when entries present ─────

describe('TC3 — renderTable: renders dba-row for each filtered entry', () => {
  it('creates one .dba-row per filtered entry', () => {
    mockFiltered.mockReturnValue([makeEntry(), makeEntry({ entry_id: 'e-2' })]);
    const container = document.createElement('div');
    renderTable(container);
    expect(container.querySelectorAll('.dba-row').length).toBe(2);
  });
});

// ── TC4: renderTable — shows ADD button for owner ────────────

describe('TC4 — renderTable: shows #dba-add-btn when isOwner', () => {
  it('renders add button for owner', () => {
    stateVars.isOwner = true;
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);
    expect(container.querySelector('#dba-add-btn')).not.toBeNull();
  });

  it('does not render add button for non-owner', () => {
    stateVars.isOwner = false;
    const container = document.createElement('div');
    renderTable(container);
    expect(container.querySelector('#dba-add-btn')).toBeNull();
  });
});

// ── TC5: renderTable — add button calls showAddPicker ────────

describe('TC5 — renderTable: add button click calls showAddPicker', () => {
  it('calls showAddPicker when #dba-add-btn is clicked', () => {
    stateVars.isOwner = true;
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);
    container.querySelector<HTMLButtonElement>('#dba-add-btn')?.click();
    expect(mockShowAddPicker).toHaveBeenCalledTimes(1);
  });
});

// ── TC6: renderTable — win badge shows W ─────────────────────

describe('TC6 — renderTable: win entry shows W badge', () => {
  it('renders dba-badge.win with text W for a win entry', () => {
    mockFiltered.mockReturnValue([makeEntry({ is_win: true, winner: 'me' })]);
    const container = document.createElement('div');
    renderTable(container);
    const badge = container.querySelector('.dba-badge.win');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('W');
  });
});

// ── TC7: renderTable — loss badge shows L ────────────────────

describe('TC7 — renderTable: loss entry shows L badge', () => {
  it('renders dba-badge.loss for a loss entry', () => {
    mockFiltered.mockReturnValue([makeEntry({ is_win: false, winner: 'opp' })]);
    const container = document.createElement('div');
    renderTable(container);
    const badge = container.querySelector('.dba-badge.loss');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('L');
  });
});

// ── TC8: renderTable — search input triggers setFilterSearch ─

describe('TC8 — renderTable: search input calls setFilterSearch', () => {
  it('fires setFilterSearch when input event fires on #dba-search', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);
    const input = container.querySelector<HTMLInputElement>('#dba-search')!;
    input.value = 'query';
    input.dispatchEvent(new Event('input'));
    expect(mockSetFilterSearch).toHaveBeenCalledWith('query');
  });
});

// ── TC9: renderTable — result chip click sets filter ─────────

describe('TC9 — renderTable: result chip click calls setFilterResult', () => {
  it('calls setFilterResult with "win" when win chip clicked', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);
    const winChip = container.querySelector<HTMLElement>('[data-result="win"]')!;
    winChip.click();
    expect(mockSetFilterResult).toHaveBeenCalledWith('win');
  });
});

// ── TC10: renderTable — owner edit button calls showEditSheet ─

describe('TC10 — renderTable: edit button calls showEditSheet', () => {
  it('calls showEditSheet when edit action button is clicked', () => {
    stateVars.isOwner = true;
    stateVars.entries = [makeEntry({ entry_id: 'e-edit' }) as never];
    mockFiltered.mockReturnValue([makeEntry({ entry_id: 'e-edit' })]);
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);
    const editBtn = container.querySelector<HTMLElement>('[data-action="edit"]')!;
    editBtn.click();
    expect(mockShowEditSheet).toHaveBeenCalledTimes(1);
  });
});

// ── TC11: renderTable — escapes user content ──────────────────

describe('TC11 — renderTable: calls escapeHTML on user-supplied content', () => {
  it('passes entry topic through escapeHTML', () => {
    mockFiltered.mockReturnValue([makeEntry({ topic: '<script>xss</script>' })]);
    stateVars.entries = [makeEntry({ topic: '<script>xss</script>' }) as never];
    const container = document.createElement('div');
    renderTable(container);
    const calls = mockEscapeHTML.mock.calls.map(([s]) => s);
    expect(calls).toContain('<script>xss</script>');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/profile-debate-archive.render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './config.ts',
      './arena/arena-ads.ts',
      './profile-debate-archive.state.ts',
      './profile-debate-archive.filter.ts',
      './profile-debate-archive.picker.ts',
      './profile-debate-archive.edit.ts',
      './profile-debate-archive.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/profile-debate-archive.render.ts'),
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
