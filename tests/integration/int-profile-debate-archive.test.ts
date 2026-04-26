/**
 * Integration tests — src/profile-debate-archive.ts → auth.rpc
 * SEAM: #214
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ── Supabase mock ────────────────────────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────
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

async function getRpcMock() {
  const mod = await import('@supabase/supabase-js');
  return (mod as unknown as { __rpcMock: ReturnType<typeof vi.fn> }).__rpcMock;
}

// ── Describe block ────────────────────────────────────────────────────────────
describe('SEAM #214 | profile-debate-archive.ts → auth.rpc', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    // Minimal DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC 1: ARCH filter ─────────────────────────────────────────────────────
  it('TC1: profile-debate-archive.ts imports safeRpc from auth.rpc', () => {
    const filePath = path.resolve('src/profile-debate-archive.ts');
    const source = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasAuthRpc = importLines.some(l => l.includes('auth.rpc'));
    const hasSafeRpc = importLines.some(l => l.includes('safeRpc'));
    expect(hasAuthRpc).toBe(true);
    expect(hasSafeRpc).toBe(true);
  });

  // ── TC 2: loadPublicDebateArchive — success path ──────────────────────────
  it('TC2: loadPublicDebateArchive calls get_public_debate_archive with p_user_id', async () => {
    const rpcMock = await getRpcMock();
    const entries = [makeEntry()];
    rpcMock.mockResolvedValueOnce({ data: entries, error: null });

    const { loadPublicDebateArchive } = await import('../../src/profile-debate-archive.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);

    await loadPublicDebateArchive(container, 'user-uuid-abc');

    expect(rpcMock).toHaveBeenCalledWith('get_public_debate_archive', { p_user_id: 'user-uuid-abc' });
    // Table should have rendered — no loading/error div
    expect(container.innerHTML).not.toContain('dba-loading');
    expect(container.innerHTML).not.toContain('Archive unavailable');
  });

  // ── TC 3: loadPublicDebateArchive — error path ────────────────────────────
  it('TC3: loadPublicDebateArchive shows "Archive unavailable" on RPC error', async () => {
    const rpcMock = await getRpcMock();
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

    const { loadPublicDebateArchive } = await import('../../src/profile-debate-archive.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);

    await loadPublicDebateArchive(container, 'user-uuid-abc');

    expect(container.innerHTML).toContain('Archive unavailable');
  });

  // ── TC 4: loadDebateArchive owner=true calls get_my_debate_archive ─────────
  it('TC4: loadDebateArchive with isOwner=true calls get_my_debate_archive', async () => {
    const rpcMock = await getRpcMock();
    const entries = [makeEntry()];
    rpcMock.mockResolvedValueOnce({ data: entries, error: null });

    const { loadDebateArchive } = await import('../../src/profile-debate-archive.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);

    await loadDebateArchive(container, true);

    expect(rpcMock).toHaveBeenCalledWith('get_my_debate_archive', {});
    expect(container.innerHTML).not.toContain('dba-loading');
  });

  // ── TC 5: loadDebateArchive owner=false skips RPC ────────────────────────
  it('TC5: loadDebateArchive with isOwner=false does not call any RPC', async () => {
    const rpcMock = await getRpcMock();
    rpcMock.mockClear();

    const { loadDebateArchive } = await import('../../src/profile-debate-archive.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);

    await loadDebateArchive(container, false);

    expect(rpcMock).not.toHaveBeenCalled();
    expect(container.innerHTML).toContain('Archive unavailable');
  });

  // ── TC 6: removeEntry calls remove_from_archive with p_entry_id ──────────
  it('TC6: removeEntry calls safeRpc remove_from_archive with correct p_entry_id', async () => {
    const rpcMock = await getRpcMock();
    rpcMock.mockResolvedValueOnce({ data: null, error: null }); // remove_from_archive
    rpcMock.mockResolvedValueOnce({ data: [], error: null });   // loadAndRender re-fetch

    // Stub window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { removeEntry } = await import('../../src/profile-debate-archive.edit.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const entry = makeEntry({ entry_id: 'entry-remove-1' });

    await removeEntry(entry as never, container);

    expect(rpcMock).toHaveBeenCalledWith('remove_from_archive', { p_entry_id: 'entry-remove-1' });
  });

  // ── TC 7: toggleHide calls update_archive_entry flipping hide_from_public ─
  it('TC7: toggleHide calls update_archive_entry toggling hide_from_public', async () => {
    const rpcMock = await getRpcMock();
    rpcMock.mockResolvedValueOnce({ data: null, error: null }); // update_archive_entry
    rpcMock.mockResolvedValueOnce({ data: [], error: null });   // loadAndRender re-fetch

    const { toggleHide } = await import('../../src/profile-debate-archive.edit.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const entry = makeEntry({ entry_id: 'entry-toggle-1', hide_from_public: false });

    await toggleHide(entry as never, container);

    expect(rpcMock).toHaveBeenCalledWith('update_archive_entry', {
      p_entry_id: 'entry-toggle-1',
      p_hide_from_public: true,
    });
  });
});

/**
 * Integration tests — src/profile-debate-archive.edit.ts → safeRpc
 * SEAM: #452
 */

// Flush all pending microtasks/promises (works with fake timers)
async function flushPromises() {
  // Each await drains one layer; 8 layers covers promise chains of depth ≤ 8
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe('SEAM #452 | profile-debate-archive.edit.ts → safeRpc', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC1: ARCH filter ────────────────────────────────────────────────────────
  it('TC1: profile-debate-archive.edit.ts imports from auth.rpc, config, state, render', () => {
    const filePath = path.resolve('src/profile-debate-archive.edit.ts');
    const source = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('auth.rpc'))).toBe(true);
    expect(importLines.some(l => l.includes('safeRpc'))).toBe(true);
    expect(importLines.some(l => l.includes('config'))).toBe(true);
    expect(importLines.some(l => l.includes('profile-debate-archive.state'))).toBe(true);
    expect(importLines.some(l => l.includes('profile-debate-archive.render'))).toBe(true);
  });

  // ── TC2: loadAndRender success ──────────────────────────────────────────────
  it('TC2: loadAndRender calls get_my_debate_archive and renders table on success', async () => {
    const rpcMock = await getRpcMock();
    const entries = [makeEntry()];
    rpcMock.mockResolvedValueOnce({ data: entries, error: null });

    const { loadAndRender } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    await loadAndRender(container);

    expect(rpcMock).toHaveBeenCalledWith('get_my_debate_archive', {});
    expect(container.innerHTML).not.toContain('dba-loading');
    expect(container.innerHTML).not.toContain('Could not load archive');
  });

  // ── TC3: loadAndRender error path ───────────────────────────────────────────
  it('TC3: loadAndRender shows error message when RPC returns error', async () => {
    const rpcMock = await getRpcMock();
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const { loadAndRender } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    await loadAndRender(container);

    expect(container.innerHTML).toContain('Could not load archive');
  });

  // ── TC4: showEditSheet renders overlay with correct fields ──────────────────
  it('TC4: showEditSheet appends overlay with pre-populated fields', async () => {
    const { showEditSheet } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    const entry = makeEntry({
      entry_id: 'e1',
      custom_name: 'My Best Win',
      custom_desc: 'Great debate',
      hide_from_public: true,
    });

    showEditSheet(entry as never, container);

    const overlay = document.querySelector('.dba-picker-overlay');
    expect(overlay).not.toBeNull();

    const nameInput = document.querySelector<HTMLInputElement>('#dba-edit-name');
    const descInput = document.querySelector<HTMLInputElement>('#dba-edit-desc');
    const hideCheck = document.querySelector<HTMLInputElement>('#dba-edit-hide');

    expect(nameInput?.value).toBe('My Best Win');
    expect(descInput?.value).toBe('Great debate');
    expect(hideCheck?.checked).toBe(true);
  });

  // ── TC5: showEditSheet save calls update_archive_entry and removes overlay ──
  it('TC5: showEditSheet save button calls update_archive_entry and removes overlay on success', async () => {
    const rpcMock = await getRpcMock();
    // update_archive_entry call
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    // loadAndRender re-fetch after save
    rpcMock.mockResolvedValueOnce({ data: [], error: null });

    const { showEditSheet } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    const entry = makeEntry({
      entry_id: 'e-save-1',
      custom_name: null,
      custom_desc: null,
      hide_from_public: false,
    });

    showEditSheet(entry as never, container);

    const nameInput = document.querySelector<HTMLInputElement>('#dba-edit-name')!;
    const descInput = document.querySelector<HTMLInputElement>('#dba-edit-desc')!;
    nameInput.value = 'Updated Name';
    descInput.value = 'Updated Desc';

    const saveBtn = document.querySelector<HTMLButtonElement>('#dba-edit-save')!;
    saveBtn.click();

    // Drain all async layers: safeRpc + loadAndRender + renderTable
    await flushPromises();

    expect(rpcMock).toHaveBeenCalledWith('update_archive_entry', expect.objectContaining({
      p_entry_id: 'e-save-1',
      p_custom_name: 'Updated Name',
      p_custom_desc: 'Updated Desc',
      p_hide_from_public: false,
    }));
    expect(document.querySelector('.dba-picker-overlay')).toBeNull();
  });

  // ── TC6: showEditSheet cancel removes overlay without RPC ───────────────────
  it('TC6: showEditSheet cancel button removes overlay without calling any RPC', async () => {
    const rpcMock = await getRpcMock();
    rpcMock.mockClear();

    const { showEditSheet } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    showEditSheet(makeEntry() as never, container);

    const overlay = document.querySelector('.dba-picker-overlay');
    expect(overlay).not.toBeNull();

    const cancelBtn = document.querySelector<HTMLButtonElement>('#dba-edit-cancel')!;
    cancelBtn.click();

    expect(document.querySelector('.dba-picker-overlay')).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  // ── TC7: showEditSheet save on RPC error — button re-enabled ───────────────
  it('TC7: showEditSheet save on RPC error re-enables the save button', async () => {
    const rpcMock = await getRpcMock();
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'save failed' } });

    const { showEditSheet } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);

    showEditSheet(makeEntry({ entry_id: 'e-err-1' }) as never, container);

    const saveBtn = document.querySelector<HTMLButtonElement>('#dba-edit-save')!;
    saveBtn.click();

    // Drain all async layers
    await flushPromises();

    // Overlay should still be present on error
    expect(document.querySelector('.dba-picker-overlay')).not.toBeNull();
    // Save button re-enabled by finally block
    expect(saveBtn.disabled).toBe(false);
    expect(saveBtn.textContent).toBe('SAVE');
  });
});

/**
 * Integration tests — src/profile-debate-archive.ts → profile-debate-archive.render
 * SEAM: #500
 */

describe('SEAM #500 | profile-debate-archive.ts → profile-debate-archive.render', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC1: ARCH filter ────────────────────────────────────────────────────────
  it('TC1: profile-debate-archive.ts imports renderTable from profile-debate-archive.render', () => {
    const filePath = path.resolve('src/profile-debate-archive.ts');
    const source = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('profile-debate-archive.render'))).toBe(true);
    expect(importLines.some(l => l.includes('renderTable'))).toBe(true);
  });

  // ── TC2: renderTable with empty entries shows dba-empty ─────────────────────
  it('TC2: renderTable with no entries renders dba-empty element', async () => {
    const { setEntries, setIsOwner, resetFilters } = await import('../../src/profile-debate-archive.state.ts');
    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');

    setIsOwner(false);
    resetFilters();
    setEntries([]);

    const container = document.createElement('div');
    document.body.appendChild(container);

    renderTable(container);

    expect(container.querySelector('.dba-empty')).not.toBeNull();
    expect(container.querySelector('.dba-table')).toBeNull();
  });

  // ── TC3: renderTable with entries renders rows ───────────────────────────────
  it('TC3: renderTable with entries renders table rows with topic and opponent', async () => {
    const { setEntries, setIsOwner, resetFilters } = await import('../../src/profile-debate-archive.state.ts');
    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');

    setIsOwner(false);
    resetFilters();
    setEntries([makeEntry({ topic: 'AI will replace jobs', opponent_name: 'BobDebater' })]);

    const container = document.createElement('div');
    document.body.appendChild(container);

    renderTable(container);

    expect(container.querySelector('.dba-table')).not.toBeNull();
    expect(container.innerHTML).toContain('AI will replace jobs');
    expect(container.innerHTML).toContain('BobDebater');
  });

  // ── TC4: renderTable with isOwner=true shows ADD button and action buttons ──
  it('TC4: renderTable with isOwner=true renders ADD button and row action buttons', async () => {
    const { setEntries, setIsOwner, resetFilters } = await import('../../src/profile-debate-archive.state.ts');
    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');

    setIsOwner(true);
    resetFilters();
    setEntries([makeEntry()]);

    const container = document.createElement('div');
    document.body.appendChild(container);

    renderTable(container);

    expect(container.querySelector('#dba-add-btn')).not.toBeNull();
    expect(container.querySelectorAll('.dba-action-btn').length).toBeGreaterThan(0);
  });

  // ── TC5: renderTable with isOwner=false hides ADD button and action buttons ─
  it('TC5: renderTable with isOwner=false does not render ADD button or action buttons', async () => {
    const { setEntries, setIsOwner, resetFilters } = await import('../../src/profile-debate-archive.state.ts');
    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');

    setIsOwner(false);
    resetFilters();
    setEntries([makeEntry()]);

    const container = document.createElement('div');
    document.body.appendChild(container);

    renderTable(container);

    expect(container.querySelector('#dba-add-btn')).toBeNull();
    expect(container.querySelectorAll('.dba-action-btn').length).toBe(0);
  });

  // ── TC6: renderTable applies correct badge class for win/loss/draw ───────────
  it('TC6: renderTable applies win/loss/draw badge class based on entry data', async () => {
    const { setEntries, setIsOwner, resetFilters } = await import('../../src/profile-debate-archive.state.ts');
    const { renderTable } = await import('../../src/profile-debate-archive.render.ts');

    setIsOwner(false);
    resetFilters();
    setEntries([
      makeEntry({ entry_id: 'e1', winner: 'pro', is_win: true }),
      makeEntry({ entry_id: 'e2', winner: 'con', is_win: false }),
      makeEntry({ entry_id: 'e3', winner: null, is_win: false }),
    ]);

    const container = document.createElement('div');
    document.body.appendChild(container);

    renderTable(container);

    const badges = container.querySelectorAll('.dba-badge');
    expect(badges[0].classList.contains('win')).toBe(true);
    expect(badges[1].classList.contains('loss')).toBe(true);
    expect(badges[2].classList.contains('draw')).toBe(true);
  });

  // ── TC7: loadPublicDebateArchive end-to-end calls renderTable after setEntries
  it('TC7: loadPublicDebateArchive sets entries via state and calls renderTable (end-to-end)', async () => {
    const rpcMock = await getRpcMock();
    const entry = makeEntry({ topic: 'E2E Topic', opponent_name: 'E2EOpponent' });
    rpcMock.mockResolvedValueOnce({ data: [entry], error: null });

    const { loadPublicDebateArchive } = await import('../../src/profile-debate-archive.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);

    await loadPublicDebateArchive(container, 'user-e2e-uuid');

    // RPC was called
    expect(rpcMock).toHaveBeenCalledWith('get_public_debate_archive', { p_user_id: 'user-e2e-uuid' });
    // renderTable output is present — table rendered from state
    expect(container.querySelector('.dba-table')).not.toBeNull();
    expect(container.innerHTML).toContain('E2E Topic');
    expect(container.innerHTML).toContain('E2EOpponent');
  });
});
