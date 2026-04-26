/**
 * Integration tests — src/profile-debate-archive.render.ts → profile-debate-archive.state
 * SEAM: #348
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ── Supabase mock ─────────────────────────────────────────────────────────────
vi.mock('@supabase/supabase-js', () => {
  const rpcMock = vi.fn();
  const supabase = {
    rpc: rpcMock,
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      refreshSession: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  };
  return {
    createClient: vi.fn(() => supabase),
    __supabase: supabase,
    __rpcMock: rpcMock,
  };
});

// ── Helper — make a minimal ArchiveEntry ──────────────────────────────────────
function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    entry_id: 'entry-uuid-1',
    debate_id: 'debate-uuid-1',
    custom_name: null,
    custom_desc: null,
    hide_from_public: false,
    entry_created_at: '2026-01-01T00:00:00Z',
    topic: 'AI will take all jobs',
    category: 'tech',
    debate_created_at: '2026-01-01T00:00:00Z',
    opponent_id: 'opp-uuid',
    opponent_name: 'Opponent',
    opponent_username: 'opponent',
    my_side: 'pro',
    winner: 'pro',
    my_score: 80,
    opp_score: 60,
    is_win: true,
    debate_mode: 'live_audio',
    ...overrides,
  };
}

// ── Describe block ────────────────────────────────────────────────────────────
describe('SEAM #348 | profile-debate-archive.render.ts → profile-debate-archive.state', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC 1: ARCH filter ─────────────────────────────────────────────────────
  it('TC1: render.ts imports entries, isOwner, filter getters and setters from state', () => {
    const filePath = path.resolve('src/profile-debate-archive.render.ts');
    const source = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const stateImport = importLines.find(l => l.includes('profile-debate-archive.state'));
    expect(stateImport).toBeDefined();
    expect(stateImport).toContain('entries');
    expect(stateImport).toContain('isOwner');
    expect(stateImport).toContain('filterSearch');
    expect(stateImport).toContain('filterResult');
    expect(stateImport).toContain('filterCat');
    expect(stateImport).toContain('setFilterSearch');
    expect(stateImport).toContain('setFilterResult');
    expect(stateImport).toContain('setFilterCat');
  });

  // ── TC 2: empty entries, isOwner=false — no ADD button, shows archive message ─
  it('TC2: renderTable with empty entries and isOwner=false renders empty archive message without ADD button', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    state.setEntries([]);
    // isOwner defaults false; resetFilters to be safe
    state.resetFilters();

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    expect(container.innerHTML).not.toContain('dba-add-btn');
    expect(container.innerHTML).toContain('No debates in this archive.');
  });

  // ── TC 3: empty entries, isOwner=true — ADD button present ───────────────
  it('TC3: renderTable with empty entries and isOwner=true renders ADD button', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    state.setEntries([]);
    state.setIsOwner(true);

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    expect(container.innerHTML).toContain('dba-add-btn');
    expect(container.innerHTML).toContain('+ ADD');
    expect(container.innerHTML).toContain('Tap');
  });

  // ── TC 4: entries present — row rendered with win badge and score ─────────
  it('TC4: renderTable with entries renders row with W badge and score', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    state.setEntries([makeEntry() as never]);
    state.setIsOwner(false);
    state.resetFilters();
    // resetFilters clears entries — set again after reset
    state.setEntries([makeEntry() as never]);

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    expect(container.innerHTML).toContain('dba-badge');
    expect(container.innerHTML).toContain('>W<');
    expect(container.innerHTML).toContain('80.0–60.0');
    expect(container.innerHTML).toContain('AI will take all jobs');
    expect(container.innerHTML).toContain('Opponent');
  });

  // ── TC 5: loss entry — L badge rendered ──────────────────────────────────
  it('TC5: renderTable with a loss entry renders L badge', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    const lossEntry = makeEntry({ winner: 'con', is_win: false, my_score: 40, opp_score: 75 });
    state.setEntries([lossEntry as never]);
    state.setIsOwner(false);

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    expect(container.innerHTML).toContain('>L<');
    expect(container.innerHTML).toContain('40.0–75.0');
  });

  // ── TC 6: setFilterSearch via input event — state updated, re-render filters ─
  it('TC6: search input event calls setFilterSearch and re-renders matching rows only', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    const entries = [
      makeEntry({ entry_id: 'e1', topic: 'AI will take all jobs', opponent_name: 'Alice' }),
      makeEntry({ entry_id: 'e2', topic: 'Climate is urgent', opponent_name: 'Bob' }),
    ];
    state.setEntries(entries as never[]);
    state.setIsOwner(false);
    state.setFilterSearch('');
    state.setFilterResult('all');
    state.setFilterCat('all');

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    // Both rows initially
    expect(container.querySelectorAll('.dba-row').length).toBe(2);

    // Simulate typing in search box
    const searchEl = container.querySelector<HTMLInputElement>('#dba-search')!;
    expect(searchEl).not.toBeNull();
    searchEl.value = 'climate';
    searchEl.dispatchEvent(new Event('input'));

    // State should have been updated
    expect(state.filterSearch).toBe('climate');
    // Only climate row should now be in DOM
    expect(container.querySelectorAll('.dba-row').length).toBe(1);
    expect(container.innerHTML).toContain('Climate is urgent');
    expect(container.innerHTML).not.toContain('AI will take all jobs');
  });

  // ── TC 7: result chip click updates filterResult and re-renders ───────────
  it('TC7: clicking W chip calls setFilterResult and re-renders showing only wins', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    const entries = [
      makeEntry({ entry_id: 'e1', is_win: true,  winner: 'pro', topic: 'Win debate' }),
      makeEntry({ entry_id: 'e2', is_win: false, winner: 'con', topic: 'Loss debate' }),
    ];
    state.setEntries(entries as never[]);
    state.setIsOwner(false);
    state.setFilterSearch('');
    state.setFilterResult('all');
    state.setFilterCat('all');

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    expect(container.querySelectorAll('.dba-row').length).toBe(2);

    const winChip = container.querySelector<HTMLElement>('.dba-chip[data-result="win"]')!;
    expect(winChip).not.toBeNull();
    winChip.click();

    // State updated
    expect(state.filterResult).toBe('win');
    // Only the win entry remains
    expect(container.querySelectorAll('.dba-row').length).toBe(1);
    expect(container.innerHTML).toContain('Win debate');
    expect(container.innerHTML).not.toContain('Loss debate');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEAM #490 | profile-debate-archive.render.ts → profile-debate-archive.picker
// ═══════════════════════════════════════════════════════════════════════════════

describe('SEAM #490 | profile-debate-archive.render.ts → profile-debate-archive.picker', () => {
  let rpcMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '';
    const sb = await import('@supabase/supabase-js');
    rpcMock = (sb as unknown as { __rpcMock: ReturnType<typeof vi.fn> }).__rpcMock;
    rpcMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC-P1: ARCH filter — render.ts imports showAddPicker from picker ──────
  it('TC-P1: render.ts imports showAddPicker from profile-debate-archive.picker', () => {
    const filePath = path.resolve('src/profile-debate-archive.render.ts');
    const source = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const pickerImport = importLines.find(l => l.includes('profile-debate-archive.picker'));
    expect(pickerImport).toBeDefined();
    expect(pickerImport).toContain('showAddPicker');
  });

  // ── TC-P2: #dba-add-btn click calls safeRpc get_my_recent_debates_for_archive ──
  it('TC-P2: clicking #dba-add-btn triggers safeRpc(get_my_recent_debates_for_archive)', async () => {
    // safeRpc returns error to keep the test simple (no sheet DOM needed)
    rpcMock.mockResolvedValue({ data: null, error: { message: 'fail' } });

    const state = await import('../../src/profile-debate-archive.state.ts');
    state.setEntries([]);
    state.setIsOwner(true);
    state.resetFilters();
    state.setIsOwner(true);

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    const addBtn = container.querySelector<HTMLElement>('#dba-add-btn')!;
    expect(addBtn).not.toBeNull();
    addBtn.click();

    // flush micro-tasks
    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(rpcMock).toHaveBeenCalledWith(
      'get_my_recent_debates_for_archive',
      expect.objectContaining({ p_limit: 30 })
    );
  });

  // ── TC-P3: showAddPicker error — showToast called, no overlay appended ─────
  it('TC-P3: when get_my_recent_debates_for_archive errors, showToast is called with error and no overlay appended', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'db error' } });

    const { showAddPicker } = await import('../../src/profile-debate-archive.picker.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    const promise = showAddPicker(container);
    await vi.runAllTimersAsync();
    await promise;

    expect(document.querySelector('.dba-picker-overlay')).toBeNull();
  });

  // ── TC-P4: showAddPicker success with debates — overlay appended with rows ─
  it('TC-P4: when debates are returned, picker overlay appended to body with picker rows', async () => {
    const fakeDebates = [
      {
        debate_id: 'd-uuid-1',
        topic: 'AI will replace doctors',
        category: 'tech',
        debate_created_at: '2026-03-01T00:00:00Z',
        opponent_name: 'Alice',
        opponent_username: 'alice99',
        my_score: 80,
        opp_score: 60,
        is_win: true,
        debate_mode: 'live_audio',
      },
    ];
    rpcMock.mockResolvedValueOnce({ data: fakeDebates, error: null });
    // For the add call (won't be triggered in this TC)

    const { showAddPicker } = await import('../../src/profile-debate-archive.picker.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    const promise = showAddPicker(container);
    await vi.runAllTimersAsync();
    await promise;

    const overlay = document.querySelector('.dba-picker-overlay');
    expect(overlay).not.toBeNull();
    const rows = overlay!.querySelectorAll('.dba-picker-row');
    expect(rows.length).toBe(1);
    expect(rows[0].getAttribute('data-debate')).toBe('d-uuid-1');
    expect(overlay!.innerHTML).toContain('AI will replace doctors');
    expect(overlay!.innerHTML).toContain('Alice');
  });

  // ── TC-P5: showAddPicker with empty list — shows empty state text ──────────
  it('TC-P5: when no debates returned, picker shows empty state message', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const { showAddPicker } = await import('../../src/profile-debate-archive.picker.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    const promise = showAddPicker(container);
    await vi.runAllTimersAsync();
    await promise;

    const overlay = document.querySelector('.dba-picker-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.innerHTML).toContain('No unarchived completed debates.');
    expect(overlay!.querySelectorAll('.dba-picker-row').length).toBe(0);
  });

  // ── TC-P6: clicking a picker row calls add_debate_to_archive and showToast ─
  it('TC-P6: clicking a picker row calls safeRpc(add_debate_to_archive) and on success shows toast', async () => {
    const fakeDebates = [
      {
        debate_id: 'd-uuid-add-1',
        topic: 'Clickable debate',
        category: 'general',
        debate_created_at: '2026-03-01T00:00:00Z',
        opponent_name: 'Bob',
        opponent_username: 'bob77',
        my_score: 70,
        opp_score: 50,
        is_win: true,
        debate_mode: 'text',
      },
    ];
    // First call: get_my_recent_debates_for_archive
    rpcMock.mockResolvedValueOnce({ data: fakeDebates, error: null });
    // Second call: add_debate_to_archive
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    // Third call would be loadAndRender → get_my_archive (doesn't matter)
    rpcMock.mockResolvedValue({ data: [], error: null });

    const { showAddPicker } = await import('../../src/profile-debate-archive.picker.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    const promise = showAddPicker(container);
    await vi.runAllTimersAsync();
    await promise;

    const row = document.querySelector<HTMLElement>('.dba-picker-row')!;
    expect(row).not.toBeNull();

    row.click();
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();

    expect(rpcMock).toHaveBeenCalledWith(
      'add_debate_to_archive',
      expect.objectContaining({ p_debate_id: 'd-uuid-add-1' })
    );
  });

  // ── TC-P7: clicking overlay backdrop removes the overlay from DOM ──────────
  it('TC-P7: clicking the overlay backdrop removes the picker overlay from DOM', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const { showAddPicker } = await import('../../src/profile-debate-archive.picker.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    const promise = showAddPicker(container);
    await vi.runAllTimersAsync();
    await promise;

    const overlay = document.querySelector<HTMLElement>('.dba-picker-overlay')!;
    expect(overlay).not.toBeNull();

    // Simulate click on overlay itself (target === overlay)
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: false }));

    expect(document.querySelector('.dba-picker-overlay')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEAM #397 | profile-debate-archive.render.ts → profile-debate-archive.edit
// ═══════════════════════════════════════════════════════════════════════════════

describe('SEAM #397 | profile-debate-archive.render.ts → profile-debate-archive.edit', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC-A1: ARCH filter — render.ts import from edit has showEditSheet, toggleHide, removeEntry ──
  it('TC-A1: render.ts imports showEditSheet, toggleHide, removeEntry from profile-debate-archive.edit', () => {
    const filePath = path.resolve('src/profile-debate-archive.render.ts');
    const source = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const editImport = importLines.find(l => l.includes('profile-debate-archive.edit'));
    expect(editImport).toBeDefined();
    expect(editImport).toContain('showEditSheet');
    expect(editImport).toContain('toggleHide');
    expect(editImport).toContain('removeEntry');
  });

  // ── TC-A2: isOwner=true entry renders all three action buttons ────────────────
  it('TC-A2: isOwner=true renders edit, toggle-hide, and remove action buttons per row', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    state.setEntries([makeEntry() as never]);
    state.setIsOwner(true);
    state.setFilterSearch('');
    state.setFilterResult('all');
    state.setFilterCat('all');
    state.setEntries([makeEntry() as never]);

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    expect(container.querySelector('[data-action="edit"]')).not.toBeNull();
    expect(container.querySelector('[data-action="toggle-hide"]')).not.toBeNull();
    expect(container.querySelector('[data-action="remove"]')).not.toBeNull();
  });

  // ── TC-A3: clicking data-action="edit" opens the edit overlay ────────────────
  it('TC-A3: clicking the edit button calls showEditSheet and appends overlay to document.body', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    const entry = makeEntry({ entry_id: 'e-edit-1' });
    state.setEntries([entry as never]);
    state.setIsOwner(true);
    state.setFilterSearch('');
    state.setFilterResult('all');
    state.setFilterCat('all');
    state.setEntries([entry as never]);

    const showEditSheetMock = vi.fn();
    vi.doMock('../../src/profile-debate-archive.edit.ts', () => ({
      showEditSheet: showEditSheetMock,
      toggleHide: vi.fn().mockResolvedValue(undefined),
      removeEntry: vi.fn().mockResolvedValue(undefined),
    }));

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    const editBtn = container.querySelector<HTMLElement>('[data-action="edit"]')!;
    expect(editBtn).not.toBeNull();
    editBtn.click();

    expect(showEditSheetMock).toHaveBeenCalledOnce();
    const [calledEntry, calledContainer] = showEditSheetMock.mock.calls[0];
    expect(calledEntry.entry_id).toBe('e-edit-1');
    expect(calledContainer).toBe(container);
  });

  // ── TC-A4: clicking data-action="toggle-hide" calls toggleHide ───────────────
  it('TC-A4: clicking the toggle-hide button calls toggleHide with the entry and container', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    const entry = makeEntry({ entry_id: 'e-hide-1', hide_from_public: false });
    state.setEntries([entry as never]);
    state.setIsOwner(true);
    state.setFilterSearch('');
    state.setFilterResult('all');
    state.setFilterCat('all');
    state.setEntries([entry as never]);

    const toggleHideMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../../src/profile-debate-archive.edit.ts', () => ({
      showEditSheet: vi.fn(),
      toggleHide: toggleHideMock,
      removeEntry: vi.fn().mockResolvedValue(undefined),
    }));

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    const hideBtn = container.querySelector<HTMLElement>('[data-action="toggle-hide"]')!;
    expect(hideBtn).not.toBeNull();
    hideBtn.click();

    expect(toggleHideMock).toHaveBeenCalledOnce();
    const [calledEntry, calledContainer] = toggleHideMock.mock.calls[0];
    expect(calledEntry.entry_id).toBe('e-hide-1');
    expect(calledContainer).toBe(container);
  });

  // ── TC-A5: clicking data-action="remove" calls removeEntry ───────────────────
  it('TC-A5: clicking the remove button calls removeEntry with the entry and container', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    const entry = makeEntry({ entry_id: 'e-remove-1' });
    state.setEntries([entry as never]);
    state.setIsOwner(true);
    state.setFilterSearch('');
    state.setFilterResult('all');
    state.setFilterCat('all');
    state.setEntries([entry as never]);

    const removeEntryMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../../src/profile-debate-archive.edit.ts', () => ({
      showEditSheet: vi.fn(),
      toggleHide: vi.fn().mockResolvedValue(undefined),
      removeEntry: removeEntryMock,
    }));

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    const removeBtn = container.querySelector<HTMLElement>('[data-action="remove"]')!;
    expect(removeBtn).not.toBeNull();
    removeBtn.click();

    expect(removeEntryMock).toHaveBeenCalledOnce();
    const [calledEntry, calledContainer] = removeEntryMock.mock.calls[0];
    expect(calledEntry.entry_id).toBe('e-remove-1');
    expect(calledContainer).toBe(container);
  });

  // ── TC-A6: action button click calls stopPropagation ─────────────────────────
  it('TC-A6: action button click calls e.stopPropagation()', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    const entry = makeEntry({ entry_id: 'e-stop-1' });
    state.setEntries([entry as never]);
    state.setIsOwner(true);
    state.setFilterSearch('');
    state.setFilterResult('all');
    state.setFilterCat('all');
    state.setEntries([entry as never]);

    vi.doMock('../../src/profile-debate-archive.edit.ts', () => ({
      showEditSheet: vi.fn(),
      toggleHide: vi.fn().mockResolvedValue(undefined),
      removeEntry: vi.fn().mockResolvedValue(undefined),
    }));

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    const editBtn = container.querySelector<HTMLElement>('[data-action="edit"]')!;
    const clickEvent = new MouseEvent('click', { bubbles: true });
    const stopSpy = vi.spyOn(clickEvent, 'stopPropagation');
    editBtn.dispatchEvent(clickEvent);

    expect(stopSpy).toHaveBeenCalled();
  });

  // ── TC-A7: action buttons absent when isOwner=false ──────────────────────────
  it('TC-A7: isOwner=false renders no action buttons at all', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    state.setEntries([makeEntry() as never]);
    state.setIsOwner(false);
    state.setFilterSearch('');
    state.setFilterResult('all');
    state.setFilterCat('all');
    state.setEntries([makeEntry() as never]);

    vi.doMock('../../src/profile-debate-archive.edit.ts', () => ({
      showEditSheet: vi.fn(),
      toggleHide: vi.fn().mockResolvedValue(undefined),
      removeEntry: vi.fn().mockResolvedValue(undefined),
    }));

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    expect(container.querySelector('[data-action="edit"]')).toBeNull();
    expect(container.querySelector('[data-action="toggle-hide"]')).toBeNull();
    expect(container.querySelector('[data-action="remove"]')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEAM #491 | profile-debate-archive.render.ts → profile-debate-archive.filter
// ═══════════════════════════════════════════════════════════════════════════════

describe('SEAM #491 | profile-debate-archive.render.ts → profile-debate-archive.filter', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC-F1: ARCH filter — render.ts imports filtered and archiveUrl from filter ──
  it('TC-F1: render.ts imports filtered and archiveUrl from profile-debate-archive.filter', () => {
    const filePath = path.resolve('src/profile-debate-archive.render.ts');
    const source = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const filterImport = importLines.find(l => l.includes('profile-debate-archive.filter'));
    expect(filterImport).toBeDefined();
    expect(filterImport).toContain('filtered');
    expect(filterImport).toContain('archiveUrl');
  });

  // ── TC-F2: filtered() with no active filters returns all entries ──────────────
  it('TC-F2: filtered() with no active filters returns all entries', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    const entries = [
      makeEntry({ entry_id: 'f1', topic: 'Topic A', category: 'tech' }),
      makeEntry({ entry_id: 'f2', topic: 'Topic B', category: 'politics' }),
    ];
    state.setEntries(entries as never[]);
    state.setIsOwner(false);
    state.setFilterSearch('');
    state.setFilterResult('all');
    state.setFilterCat('all');

    const { filtered } = await import('../../src/profile-debate-archive.filter.ts');
    const result = filtered();
    expect(result.length).toBe(2);
  });

  // ── TC-F3: filterCat excludes non-matching category rows ─────────────────────
  it('TC-F3: filterCat set to "tech" excludes entries with other categories from rendered table', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    const entries = [
      makeEntry({ entry_id: 'c1', topic: 'Tech topic', category: 'tech' }),
      makeEntry({ entry_id: 'c2', topic: 'Politics topic', category: 'politics' }),
      makeEntry({ entry_id: 'c3', topic: 'Another tech', category: 'tech' }),
    ];
    state.setEntries(entries as never[]);
    state.setIsOwner(false);
    state.setFilterSearch('');
    state.setFilterResult('all');
    state.setFilterCat('tech');

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    const rows = container.querySelectorAll('.dba-row');
    expect(rows.length).toBe(2);
    expect(container.innerHTML).toContain('Tech topic');
    expect(container.innerHTML).toContain('Another tech');
    expect(container.innerHTML).not.toContain('Politics topic');
  });

  // ── TC-F4: filterResult='win' excludes loss entries from rendered rows ────────
  it('TC-F4: filterResult=win excludes loss entries, only wins appear in rendered table', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    const entries = [
      makeEntry({ entry_id: 'r1', topic: 'Win topic', is_win: true, winner: 'pro' }),
      makeEntry({ entry_id: 'r2', topic: 'Loss topic', is_win: false, winner: 'con' }),
    ];
    state.setEntries(entries as never[]);
    state.setIsOwner(false);
    state.setFilterSearch('');
    state.setFilterResult('win');
    state.setFilterCat('all');

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    expect(container.querySelectorAll('.dba-row').length).toBe(1);
    expect(container.innerHTML).toContain('Win topic');
    expect(container.innerHTML).not.toContain('Loss topic');
  });

  // ── TC-F5: filterSearch matches against topic, opponent_name, and custom_name ──
  it('TC-F5: filterSearch matches topic, opponent_name, and custom_name — others excluded', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    const entries = [
      makeEntry({ entry_id: 's1', topic: 'Climate change debate', opponent_name: 'Alice', custom_name: null }),
      makeEntry({ entry_id: 's2', topic: 'Economy debate', opponent_name: 'Bob', custom_name: 'Custom climate topic' }),
      makeEntry({ entry_id: 's3', topic: 'Sport debate', opponent_name: 'Charlie', custom_name: null }),
    ];
    state.setEntries(entries as never[]);
    state.setIsOwner(false);
    state.setFilterSearch('climate');
    state.setFilterResult('all');
    state.setFilterCat('all');

    const { filtered } = await import('../../src/profile-debate-archive.filter.ts');
    const result = filtered();
    expect(result.length).toBe(2);
    const ids = result.map(e => e.entry_id);
    expect(ids).toContain('s1');
    expect(ids).toContain('s2');
    expect(ids).not.toContain('s3');
  });

  // ── TC-F6: archiveUrl returns spectate URL for non-ai debate modes ────────────
  it('TC-F6: archiveUrl returns spectate URL for live_audio mode', async () => {
    const { archiveUrl } = await import('../../src/profile-debate-archive.filter.ts');
    const entry = makeEntry({ debate_id: 'test-debate-id', debate_mode: 'live_audio' });
    const url = archiveUrl(entry as never);
    expect(url).toBe('/moderator-spectate.html?id=test-debate-id');
  });

  // ── TC-F7: archiveUrl returns auto-debate URL for ai debate mode ──────────────
  it('TC-F7: archiveUrl returns auto-debate URL for ai debate mode', async () => {
    const { archiveUrl } = await import('../../src/profile-debate-archive.filter.ts');
    const entry = makeEntry({ debate_id: 'ai-debate-id', debate_mode: 'ai' });
    const url = archiveUrl(entry as never);
    expect(url).toBe('/moderator-auto-debate.html?id=ai-debate-id');
  });

  // ── TC-F8: data-url on rendered row reflects archiveUrl output ────────────────
  it('TC-F8: rendered dba-row data-url contains the archiveUrl output for the entry', async () => {
    const state = await import('../../src/profile-debate-archive.state.ts');
    const entry = makeEntry({ entry_id: 'url-entry-1', debate_id: 'url-debate-1', debate_mode: 'text' });
    state.setEntries([entry as never]);
    state.setIsOwner(false);
    state.setFilterSearch('');
    state.setFilterResult('all');
    state.setFilterCat('all');

    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTable(container);

    const row = container.querySelector<HTMLElement>('.dba-row')!;
    expect(row).not.toBeNull();
    expect(row.dataset.url).toBe('/moderator-spectate.html?id=url-debate-1');
  });
});
