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

// ── ARCH ──────────────────────────────────────────────────────────────────────
describe('ARCH — profile-debate-archive.edit import surface', () => {
  it('only imports from allowed modules and not from banned ones', () => {
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
    expect(imports.some(l => l.includes('profile-debate-archive.state'))).toBe(true);
    expect(imports.some(l => l.includes('auth.rpc'))).toBe(true);
  });
});

// ── TC1: loadAndRender success — calls setEntries with RPC data ───────────────
describe('TC1 — loadAndRender success path calls setEntries with archive data', () => {
  it('calls safeRpc(get_my_debate_archive) and setEntries with returned entries', async () => {
    const archiveData = [
      {
        entry_id: 'e1', debate_id: 'd1', custom_name: 'My Win', custom_desc: null,
        hide_from_public: false, entry_created_at: '2026-01-01', topic: 'Test',
        category: 'politics', debate_created_at: '2025-12-31', opponent_id: 'u2',
        opponent_name: 'Alice', opponent_username: 'alice', my_side: 'pro',
        winner: 'pro', my_score: 80, opp_score: 60, is_win: true, debate_mode: 'live',
      },
    ];
    mockRpc.mockResolvedValueOnce({ data: archiveData, error: null });

    const mockSetEntries = vi.fn();
    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: mockSetEntries,
      entries: [],
      filterCat: 'all',
      filterResult: 'all',
      filterSearch: '',
      isOwner: false,
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
    expect(mockSetEntries).toHaveBeenCalledWith(archiveData);
  });
});

// ── TC2: loadAndRender error — does NOT call setEntries, renders dba-empty ────
describe('TC2 — loadAndRender error path skips setEntries and renders error message', () => {
  it('does not call setEntries and shows .dba-empty when RPC returns error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB failure' } });

    const mockSetEntries = vi.fn();
    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: mockSetEntries,
      entries: [],
      filterCat: 'all',
      filterResult: 'all',
      filterSearch: '',
      isOwner: false,
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

    expect(mockSetEntries).not.toHaveBeenCalled();
    expect(container.querySelector('.dba-empty')).not.toBeNull();
    expect(container.innerHTML).toContain('Could not load archive');
  });
});

// ── TC3: showEditSheet — DOM overlay pre-fills entry fields ──────────────────
describe('TC3 — showEditSheet renders overlay pre-filled with entry field values', () => {
  it('appends .dba-picker-overlay with name, desc and hide_from_public pre-filled', async () => {
    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: vi.fn(),
      entries: [],
      filterCat: 'all',
      filterResult: 'all',
      filterSearch: '',
      isOwner: false,
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
      entry_id: 'entry-tc3',
      debate_id: 'debate-tc3',
      custom_name: 'Best debate',
      custom_desc: 'Short note',
      hide_from_public: true,
    };

    showEditSheet(entry as any, container);

    const overlay = document.querySelector('.dba-picker-overlay');
    expect(overlay).not.toBeNull();

    const nameInput = document.getElementById('dba-edit-name') as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    expect(nameInput.value).toBe('Best debate');

    const descInput = document.getElementById('dba-edit-desc') as HTMLInputElement;
    expect(descInput).not.toBeNull();
    expect(descInput.value).toBe('Short note');

    const hideCheck = document.getElementById('dba-edit-hide') as HTMLInputElement;
    expect(hideCheck).not.toBeNull();
    expect(hideCheck.checked).toBe(true);
  });
});

// ── TC4: showEditSheet cancel — overlay removed, no RPC ──────────────────────
describe('TC4 — showEditSheet cancel button removes overlay without calling RPC', () => {
  it('clicking #dba-edit-cancel removes overlay and does not call safeRpc', async () => {
    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: vi.fn(),
      entries: [],
      filterCat: 'all',
      filterResult: 'all',
      filterSearch: '',
      isOwner: false,
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
      entry_id: 'entry-tc4',
      debate_id: 'debate-tc4',
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

// ── TC5: showEditSheet save — calls update_archive_entry and then setEntries ──
describe('TC5 — showEditSheet save calls update_archive_entry and reloads via setEntries', () => {
  it('calls safeRpc(update_archive_entry) with correct params and invokes setEntries after reload', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: null })  // update_archive_entry
      .mockResolvedValueOnce({ data: [], error: null });    // loadAndRender → get_my_debate_archive

    const mockSetEntries = vi.fn();
    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: mockSetEntries,
      entries: [],
      filterCat: 'all',
      filterResult: 'all',
      filterSearch: '',
      isOwner: false,
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
      entry_id: 'entry-tc5',
      debate_id: 'debate-tc5',
      custom_name: 'Old name',
      custom_desc: 'Old desc',
      hide_from_public: false,
    };

    showEditSheet(entry as any, container);

    const nameInput = document.getElementById('dba-edit-name') as HTMLInputElement;
    const descInput = document.getElementById('dba-edit-desc') as HTMLInputElement;
    const hideCheck = document.getElementById('dba-edit-hide') as HTMLInputElement;
    nameInput.value = 'Updated name';
    descInput.value = 'Updated desc';
    hideCheck.checked = true;

    const saveBtn = document.getElementById('dba-edit-save') as HTMLButtonElement;
    saveBtn.click();

    await vi.advanceTimersByTimeAsync(100);

    expect(mockRpc).toHaveBeenCalledWith('update_archive_entry', {
      p_entry_id: 'entry-tc5',
      p_custom_name: 'Updated name',
      p_custom_desc: 'Updated desc',
      p_hide_from_public: true,
    });
    expect(mockSetEntries).toHaveBeenCalledWith([]);
    expect(mockShowToast).toHaveBeenCalledWith('Saved', 'success');
  });
});

// ── TC6: toggleHide false→true — calls update_archive_entry, then setEntries ─
describe('TC6 — toggleHide flips hide_from_public and calls setEntries via loadAndRender', () => {
  it('toggles false→true: calls update_archive_entry(p_hide_from_public: true) and setEntries', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: null })  // update_archive_entry
      .mockResolvedValueOnce({ data: [], error: null });    // loadAndRender

    const mockSetEntries = vi.fn();
    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: mockSetEntries,
      entries: [],
      filterCat: 'all',
      filterResult: 'all',
      filterSearch: '',
      isOwner: false,
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
      entry_id: 'entry-tc6a',
      debate_id: 'debate-tc6a',
      custom_name: null,
      custom_desc: null,
      hide_from_public: false,
    };

    await toggleHide(entry as any, container);

    expect(mockRpc).toHaveBeenCalledWith('update_archive_entry', {
      p_entry_id: 'entry-tc6a',
      p_hide_from_public: true,
    });
    expect(mockSetEntries).toHaveBeenCalledWith([]);
    expect(mockShowToast).toHaveBeenCalledWith('Hidden from public', 'info');
  });

  it('toggles true→false: calls update_archive_entry(p_hide_from_public: false) and setEntries', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const mockSetEntries = vi.fn();
    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: mockSetEntries,
      entries: [],
      filterCat: 'all',
      filterResult: 'all',
      filterSearch: '',
      isOwner: false,
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
      entry_id: 'entry-tc6b',
      debate_id: 'debate-tc6b',
      custom_name: null,
      custom_desc: null,
      hide_from_public: true,
    };

    await toggleHide(entry as any, container);

    expect(mockRpc).toHaveBeenCalledWith('update_archive_entry', {
      p_entry_id: 'entry-tc6b',
      p_hide_from_public: false,
    });
    expect(mockSetEntries).toHaveBeenCalledWith([]);
    expect(mockShowToast).toHaveBeenCalledWith('Now visible', 'info');
  });
});

// ── TC7: removeEntry confirmed — calls remove_from_archive and setEntries ─────
describe('TC7 — removeEntry confirmed calls remove_from_archive then setEntries via loadAndRender', () => {
  it('calls safeRpc(remove_from_archive) with p_entry_id and invokes setEntries', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    mockRpc
      .mockResolvedValueOnce({ data: null, error: null })  // remove_from_archive
      .mockResolvedValueOnce({ data: [], error: null });    // loadAndRender

    const mockSetEntries = vi.fn();
    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: mockSetEntries,
      entries: [],
      filterCat: 'all',
      filterResult: 'all',
      filterSearch: '',
      isOwner: false,
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
      entry_id: 'entry-tc7',
      debate_id: 'debate-tc7',
      custom_name: null,
      custom_desc: null,
      hide_from_public: false,
    };

    await removeEntry(entry as any, container);

    expect(mockRpc).toHaveBeenCalledWith('remove_from_archive', { p_entry_id: 'entry-tc7' });
    expect(mockSetEntries).toHaveBeenCalledWith([]);
    expect(mockShowToast).toHaveBeenCalledWith('Removed from archive', 'info');
  });

  it('does NOT call safeRpc when confirm dialog is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const mockSetEntries = vi.fn();
    vi.doMock('../../src/profile-debate-archive.state.ts', () => ({
      setEntries: mockSetEntries,
      entries: [],
      filterCat: 'all',
      filterResult: 'all',
      filterSearch: '',
      isOwner: false,
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
      entry_id: 'entry-tc7b',
      debate_id: 'debate-tc7b',
      custom_name: null,
      custom_desc: null,
      hide_from_public: false,
    };

    await removeEntry(entry as any, container);

    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockSetEntries).not.toHaveBeenCalled();
  });
});
