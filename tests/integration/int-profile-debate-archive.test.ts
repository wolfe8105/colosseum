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
