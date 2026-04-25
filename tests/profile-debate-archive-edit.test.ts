// ============================================================
// PROFILE DEBATE ARCHIVE EDIT — tests/profile-debate-archive-edit.test.ts
// Source: src/profile-debate-archive.edit.ts
//
// CLASSIFICATION:
//   loadAndRender() — RPC + orchestration → Contract test
//   showEditSheet() — DOM event wiring + RPC → Behavioral test
//   toggleHide()    — RPC + orchestration → Contract test
//   removeEntry()   — RPC + confirm dialog → Contract test
//
// IMPORTS:
//   { safeRpc }       from './auth.rpc.ts'
//   { escapeHTML, showToast } from './config.ts'
//   { setEntries }    from './profile-debate-archive.state.ts'
//   { renderTable }   from './profile-debate-archive.render.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc      = vi.hoisted(() => vi.fn());
const mockEscapeHTML   = vi.hoisted(() => vi.fn((s: string) => s));
const mockShowToast    = vi.hoisted(() => vi.fn());
const mockSetEntries   = vi.hoisted(() => vi.fn());
const mockRenderTable  = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.rpc.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: mockShowToast,
}));

vi.mock('../src/profile-debate-archive.state.ts', () => ({
  setEntries: mockSetEntries,
  entries: [],
  isOwner: false,
  filterSearch: '',
  filterResult: 'all',
  filterCat: 'all',
  setFilterSearch: vi.fn(),
  setFilterResult: vi.fn(),
  setFilterCat: vi.fn(),
}));

vi.mock('../src/profile-debate-archive.render.ts', () => ({
  renderTable: mockRenderTable,
}));

import { loadAndRender, showEditSheet, toggleHide, removeEntry } from '../src/profile-debate-archive.edit.ts';

type ArchiveEntry = {
  entry_id: string;
  topic?: string;
  custom_name?: string | null;
  custom_desc?: string | null;
  hide_from_public?: boolean;
  is_win?: boolean;
  debate_created_at?: string;
  category?: string;
  my_score?: number | null;
  opp_score?: number | null;
  opponent_name?: string | null;
  opponent_username?: string | null;
  winner?: string | null;
};

const makeEntry = (overrides: Partial<ArchiveEntry> = {}): ArchiveEntry => ({
  entry_id: 'entry-1',
  topic: 'AI will take all jobs',
  custom_name: null,
  custom_desc: null,
  hide_from_public: false,
  ...overrides,
});

const makeContainer = () => document.createElement('div');

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockShowToast.mockReset();
  mockSetEntries.mockReset();
  mockRenderTable.mockReset();
  mockEscapeHTML.mockImplementation((s: string) => s);
  document.body.innerHTML = '';
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

// ── TC1: loadAndRender — calls get_my_debate_archive RPC ─────

describe('TC1 — loadAndRender: calls get_my_debate_archive', () => {
  it('calls safeRpc with get_my_debate_archive', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadAndRender(makeContainer());
    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('get_my_debate_archive');
  });
});

// ── TC2: loadAndRender — calls setEntries and renderTable ────

describe('TC2 — loadAndRender: calls setEntries and renderTable on success', () => {
  it('calls setEntries and renderTable when RPC succeeds', async () => {
    const data = [makeEntry()];
    mockSafeRpc.mockResolvedValue({ data, error: null });
    const container = makeContainer();
    await loadAndRender(container);
    expect(mockSetEntries).toHaveBeenCalledWith(data);
    expect(mockRenderTable).toHaveBeenCalledWith(container);
  });
});

// ── TC3: loadAndRender — shows error message on RPC failure ──

describe('TC3 — loadAndRender: renders error on RPC failure', () => {
  it('sets container innerHTML to error message when RPC fails', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const container = makeContainer();
    await loadAndRender(container);
    expect(container.innerHTML).toContain('Could not load archive');
    expect(mockRenderTable).not.toHaveBeenCalled();
  });
});

// ── TC4: showEditSheet — appends overlay to document.body ────

describe('TC4 — showEditSheet: appends edit overlay to DOM', () => {
  it('creates .dba-picker-overlay and appends to document.body', () => {
    showEditSheet(makeEntry() as never, makeContainer());
    expect(document.querySelector('.dba-picker-overlay')).not.toBeNull();
  });
});

// ── TC5: showEditSheet — cancel button removes overlay ───────

describe('TC5 — showEditSheet: cancel button removes overlay', () => {
  it('clicking cancel removes .dba-picker-overlay', () => {
    showEditSheet(makeEntry() as never, makeContainer());
    const cancelBtn = document.getElementById('dba-edit-cancel') as HTMLButtonElement;
    cancelBtn.click();
    expect(document.querySelector('.dba-picker-overlay')).toBeNull();
  });
});

// ── TC6: showEditSheet — save button calls update_archive_entry

describe('TC6 — showEditSheet: save calls update_archive_entry RPC', () => {
  it('calls safeRpc with update_archive_entry and entry_id', async () => {
    // save RPC, then loadAndRender fires get_my_debate_archive
    mockSafeRpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    mockSetEntries.mockImplementation(() => {});
    mockRenderTable.mockImplementation(() => {});

    const container = makeContainer();
    showEditSheet(makeEntry({ entry_id: 'entry-xyz' }) as never, container);

    const saveBtn = document.getElementById('dba-edit-save') as HTMLButtonElement;
    saveBtn.click();
    await new Promise(r => setTimeout(r, 0));

    expect(mockSafeRpc.mock.calls.length).toBeGreaterThanOrEqual(1);
    const [fnName, params] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('update_archive_entry');
    expect(params.p_entry_id).toBe('entry-xyz');
  });
});

// ── TC7: showEditSheet — RPC error shows toast ───────────────

describe('TC7 — showEditSheet: shows error toast when save RPC fails', () => {
  it('calls showToast("Could not save", "error") on save failure', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Permission denied' } });
    showEditSheet(makeEntry() as never, makeContainer());
    document.getElementById('dba-edit-save')?.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockShowToast).toHaveBeenCalledWith('Could not save', 'error');
  });
});

// ── TC8: toggleHide — calls update_archive_entry to toggle ──

describe('TC8 — toggleHide: calls update_archive_entry with flipped hide value', () => {
  it('sends p_hide_from_public = true when entry.hide_from_public is false', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    const container = makeContainer();
    await toggleHide(makeEntry({ hide_from_public: false }) as never, container);
    const [fnName, params] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('update_archive_entry');
    expect(params.p_hide_from_public).toBe(true);
  });
});

// ── TC9: toggleHide — error shows toast ──────────────────────

describe('TC9 — toggleHide: shows error toast on RPC failure', () => {
  it('calls showToast("Could not update", "error") on failure', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    await toggleHide(makeEntry() as never, makeContainer());
    expect(mockShowToast).toHaveBeenCalledWith('Could not update', 'error');
  });
});

// ── TC10: removeEntry — calls confirm before removing ────────

describe('TC10 — removeEntry: calls confirm dialog', () => {
  it('calls window.confirm before firing the RPC', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    await removeEntry(makeEntry() as never, makeContainer());
    expect(window.confirm).toHaveBeenCalled();
  });
});

// ── TC11: removeEntry — aborts if confirm returns false ──────

describe('TC11 — removeEntry: aborts when confirm is cancelled', () => {
  it('does not call safeRpc when user cancels confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await removeEntry(makeEntry() as never, makeContainer());
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC12: removeEntry — calls remove_from_archive RPC ────────

describe('TC12 — removeEntry: calls remove_from_archive RPC', () => {
  it('calls safeRpc with remove_from_archive and entry_id', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    await removeEntry(makeEntry({ entry_id: 'e-99' }) as never, makeContainer());
    const [fnName, params] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('remove_from_archive');
    expect(params.p_entry_id).toBe('e-99');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/profile-debate-archive.edit.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './auth.rpc.ts',
      './config.ts',
      './profile-debate-archive.state.ts',
      './profile-debate-archive.render.ts',
      './profile-debate-archive.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/profile-debate-archive.edit.ts'),
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
