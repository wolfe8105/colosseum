import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  refreshSession: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue({}),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();
  mockAuth.refreshSession.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockAuth.refreshSession.mockResolvedValue({ error: null });
  document.body.innerHTML = '<div id="dba-container"></div>';
});

// ── ARCH FILTER ──────────────────────────────────────────────────────────────
describe('ARCH — profile-debate-archive.edit.ts import surface', () => {
  it('only imports from auth.rpc, config, state, render, types', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/profile-debate-archive.edit.ts'),
      'utf8'
    );
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const forbidden = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const banned of forbidden) {
      const hit = imports.find(l => l.includes(banned));
      expect(hit, `Unexpected import of ${banned}`).toBeUndefined();
    }
    // Must import safeRpc from auth.rpc
    expect(imports.some(l => l.includes('auth.rpc'))).toBe(true);
  });
});

// ── TC1: loadAndRender — success path ────────────────────────────────────────
describe('TC1 — loadAndRender calls get_my_debate_archive and renders table', () => {
  it('calls safeRpc with get_my_debate_archive and empty args on success', async () => {
    const entries = [
      { entry_id: 'aaa', debate_id: 'd1', custom_name: 'Win', custom_desc: null, hide_from_public: false },
    ];
    mockRpc.mockResolvedValueOnce({ data: entries, error: null });

    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: vi.fn(),
      getEntries: vi.fn(() => entries),
    }));
    vi.doMock('../../src/profile-debate-archive.render.ts', () => ({
      renderTable: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/config.ts')>();
      return { ...actual, showToast: vi.fn() };
    });

    const { loadAndRender } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.getElementById('dba-container') as HTMLElement;

    await loadAndRender(container);

    expect(mockRpc).toHaveBeenCalledWith('get_my_debate_archive', {});
  });
});

// ── TC2: loadAndRender — error path renders dba-empty ────────────────────────
describe('TC2 — loadAndRender renders error message when RPC fails', () => {
  it('sets innerHTML to dba-empty div on RPC error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: vi.fn(),
      getEntries: vi.fn(() => []),
    }));
    vi.doMock('../../src/profile-debate-archive.render.ts', () => ({
      renderTable: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/config.ts')>();
      return { ...actual, showToast: vi.fn() };
    });

    const { loadAndRender } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.getElementById('dba-container') as HTMLElement;

    await loadAndRender(container);

    expect(container.querySelector('.dba-empty')).not.toBeNull();
    expect(container.innerHTML).toContain('Could not load archive');
  });
});

// ── TC3: showEditSheet — appends overlay with correct field values ────────────
describe('TC3 — showEditSheet appends overlay with entry values pre-filled', () => {
  it('appends dba-picker-overlay to body with name and desc pre-filled', async () => {
    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: vi.fn(),
      getEntries: vi.fn(() => []),
    }));
    vi.doMock('../../src/profile-debate-archive.render.ts', () => ({
      renderTable: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/config.ts')>();
      return { ...actual, showToast: vi.fn() };
    });

    const { showEditSheet } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.getElementById('dba-container') as HTMLElement;

    const entry = {
      entry_id: 'entry-001',
      debate_id: 'debate-abc',
      custom_name: 'Great debate',
      custom_desc: 'This was fun',
      hide_from_public: true,
    };

    showEditSheet(entry as any, container);

    const overlay = document.querySelector('.dba-picker-overlay');
    expect(overlay).not.toBeNull();

    const nameInput = document.getElementById('dba-edit-name') as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    expect(nameInput.value).toBe('Great debate');

    const descInput = document.getElementById('dba-edit-desc') as HTMLInputElement;
    expect(descInput).not.toBeNull();
    expect(descInput.value).toBe('This was fun');

    const hideCheck = document.getElementById('dba-edit-hide') as HTMLInputElement;
    expect(hideCheck).not.toBeNull();
    expect(hideCheck.checked).toBe(true);
  });
});

// ── TC4: showEditSheet — cancel button removes overlay ───────────────────────
describe('TC4 — showEditSheet cancel button removes overlay without RPC call', () => {
  it('clicking cancel removes overlay and does not call safeRpc', async () => {
    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: vi.fn(),
      getEntries: vi.fn(() => []),
    }));
    vi.doMock('../../src/profile-debate-archive.render.ts', () => ({
      renderTable: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/config.ts')>();
      return { ...actual, showToast: vi.fn() };
    });

    const { showEditSheet } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.getElementById('dba-container') as HTMLElement;

    const entry = {
      entry_id: 'entry-002',
      debate_id: 'debate-xyz',
      custom_name: null,
      custom_desc: null,
      hide_from_public: false,
    };

    showEditSheet(entry as any, container);

    const cancelBtn = document.getElementById('dba-edit-cancel') as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();

    expect(document.querySelector('.dba-picker-overlay')).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ── TC5: showEditSheet save — calls update_archive_entry with correct params ─
describe('TC5 — showEditSheet save calls update_archive_entry with correct params', () => {
  it('calls safeRpc update_archive_entry with p_entry_id, p_custom_name, p_custom_desc, p_hide_from_public', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: null })  // update_archive_entry
      .mockResolvedValueOnce({ data: [], error: null });    // loadAndRender get_my_debate_archive

    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: vi.fn(),
      getEntries: vi.fn(() => []),
    }));
    vi.doMock('../../src/profile-debate-archive.render.ts', () => ({
      renderTable: vi.fn(),
    }));
    const mockShowToast = vi.fn();
    vi.doMock('../../src/config.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/config.ts')>();
      return { ...actual, showToast: mockShowToast };
    });

    const { showEditSheet } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.getElementById('dba-container') as HTMLElement;

    const entry = {
      entry_id: 'entry-003',
      debate_id: 'debate-999',
      custom_name: 'Old name',
      custom_desc: 'Old desc',
      hide_from_public: false,
    };

    showEditSheet(entry as any, container);

    // Update the inputs before clicking save
    const nameInput = document.getElementById('dba-edit-name') as HTMLInputElement;
    const descInput = document.getElementById('dba-edit-desc') as HTMLInputElement;
    const hideCheck = document.getElementById('dba-edit-hide') as HTMLInputElement;
    nameInput.value = 'New name';
    descInput.value = 'New desc';
    hideCheck.checked = true;

    const saveBtn = document.getElementById('dba-edit-save') as HTMLButtonElement;
    saveBtn.click();

    await vi.advanceTimersByTimeAsync(100);

    expect(mockRpc).toHaveBeenCalledWith('update_archive_entry', {
      p_entry_id: 'entry-003',
      p_custom_name: 'New name',
      p_custom_desc: 'New desc',
      p_hide_from_public: true,
    });
    expect(mockShowToast).toHaveBeenCalledWith('Saved', 'success');
  });
});

// ── TC6: toggleHide — calls update_archive_entry and flips hide_from_public ──
describe('TC6 — toggleHide calls update_archive_entry with flipped hide_from_public', () => {
  it('toggles hide_from_public from false to true and shows "Hidden from public" toast', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: null })  // update_archive_entry
      .mockResolvedValueOnce({ data: [], error: null });    // loadAndRender

    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: vi.fn(),
      getEntries: vi.fn(() => []),
    }));
    vi.doMock('../../src/profile-debate-archive.render.ts', () => ({
      renderTable: vi.fn(),
    }));
    const mockShowToast = vi.fn();
    vi.doMock('../../src/config.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/config.ts')>();
      return { ...actual, showToast: mockShowToast };
    });

    const { toggleHide } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.getElementById('dba-container') as HTMLElement;

    const entry = {
      entry_id: 'entry-004',
      debate_id: 'debate-555',
      custom_name: null,
      custom_desc: null,
      hide_from_public: false, // currently visible — should hide
    };

    await toggleHide(entry as any, container);

    expect(mockRpc).toHaveBeenCalledWith('update_archive_entry', {
      p_entry_id: 'entry-004',
      p_hide_from_public: true,
    });
    expect(mockShowToast).toHaveBeenCalledWith('Hidden from public', 'info');
  });

  it('toggles hide_from_public from true to false and shows "Now visible" toast', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: vi.fn(),
      getEntries: vi.fn(() => []),
    }));
    vi.doMock('../../src/profile-debate-archive.render.ts', () => ({
      renderTable: vi.fn(),
    }));
    const mockShowToast = vi.fn();
    vi.doMock('../../src/config.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/config.ts')>();
      return { ...actual, showToast: mockShowToast };
    });

    const { toggleHide } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.getElementById('dba-container') as HTMLElement;

    const entry = {
      entry_id: 'entry-005',
      debate_id: 'debate-666',
      custom_name: null,
      custom_desc: null,
      hide_from_public: true, // currently hidden — should reveal
    };

    await toggleHide(entry as any, container);

    expect(mockRpc).toHaveBeenCalledWith('update_archive_entry', {
      p_entry_id: 'entry-005',
      p_hide_from_public: false,
    });
    expect(mockShowToast).toHaveBeenCalledWith('Now visible', 'info');
  });
});

// ── TC7: removeEntry — calls remove_from_archive on confirm ──────────────────
describe('TC7 — removeEntry calls remove_from_archive when user confirms', () => {
  it('calls safeRpc remove_from_archive with p_entry_id when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    mockRpc
      .mockResolvedValueOnce({ data: null, error: null })  // remove_from_archive
      .mockResolvedValueOnce({ data: [], error: null });    // loadAndRender

    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: vi.fn(),
      getEntries: vi.fn(() => []),
    }));
    vi.doMock('../../src/profile-debate-archive.render.ts', () => ({
      renderTable: vi.fn(),
    }));
    const mockShowToast = vi.fn();
    vi.doMock('../../src/config.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/config.ts')>();
      return { ...actual, showToast: mockShowToast };
    });

    const { removeEntry } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.getElementById('dba-container') as HTMLElement;

    const entry = {
      entry_id: 'entry-006',
      debate_id: 'debate-777',
      custom_name: null,
      custom_desc: null,
      hide_from_public: false,
    };

    await removeEntry(entry as any, container);

    expect(mockRpc).toHaveBeenCalledWith('remove_from_archive', { p_entry_id: 'entry-006' });
    expect(mockShowToast).toHaveBeenCalledWith('Removed from archive', 'info');
  });

  it('does NOT call safeRpc when user cancels confirm dialog', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: vi.fn(),
      getEntries: vi.fn(() => []),
    }));
    vi.doMock('../../src/profile-debate-archive.render.ts', () => ({
      renderTable: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/config.ts')>();
      return { ...actual, showToast: vi.fn() };
    });

    const { removeEntry } = await import('../../src/profile-debate-archive.edit.ts');
    const container = document.getElementById('dba-container') as HTMLElement;

    const entry = {
      entry_id: 'entry-007',
      debate_id: 'debate-888',
      custom_name: null,
      custom_desc: null,
      hide_from_public: false,
    };

    await removeEntry(entry as any, container);

    expect(mockRpc).not.toHaveBeenCalled();
  });
});
