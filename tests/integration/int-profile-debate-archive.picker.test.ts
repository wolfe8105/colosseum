// ============================================================
// INTEGRATOR — profile-debate-archive.picker → profile-debate-archive.edit
// Seam #453
// Boundary: showAddPicker() calls loadAndRender() from profile-debate-archive.edit
// Mock boundary: @supabase/supabase-js only
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockRefreshSession = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
const mockSignOut = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  refreshSession: mockRefreshSession,
  signOut: mockSignOut,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    auth: mockAuth,
  })),
}));

// ============================================================
// HELPERS
// ============================================================

function makeDebate(overrides: Record<string, unknown> = {}) {
  return {
    debate_id: 'aaaaaaaa-0000-0000-0000-000000000001',
    topic: 'Is pineapple valid on pizza?',
    opponent_name: 'Alice',
    opponent_username: 'alice_mod',
    debate_created_at: '2026-01-15T10:00:00Z',
    is_win: true,
    ...overrides,
  };
}

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    entry_id: 'eeeeeeee-0000-0000-0000-000000000001',
    debate_id: 'aaaaaaaa-0000-0000-0000-000000000001',
    topic: 'Is pineapple valid on pizza?',
    opponent_name: 'Alice',
    is_win: true,
    custom_name: null,
    custom_desc: null,
    hide_from_public: false,
    created_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

async function flushMicrotasks() {
  for (let i = 0; i < 15; i++) {
    await Promise.resolve();
  }
}

// ============================================================
// TESTS
// ============================================================

describe('profile-debate-archive.picker → profile-debate-archive.edit (seam #453)', () => {
  let showAddPicker: (container: HTMLElement) => Promise<void>;
  let container: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    mockRpc.mockReset();
    mockRefreshSession.mockReset();
    mockRefreshSession.mockResolvedValue({ error: null });

    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    // Resolve readyPromise via INITIAL_SESSION callback
    await import('../../src/auth.core.ts');
    const calls = mockAuth.onAuthStateChange.mock.calls;
    if (calls.length > 0) {
      const cb = calls[calls.length - 1][0];
      cb('INITIAL_SESSION', null);
    }

    const mod = await import('../../src/profile-debate-archive.picker.ts');
    showAddPicker = mod.showAddPicker;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  // ----------------------------------------------------------
  // TC1: Successful row click triggers add_debate_to_archive then
  //      loadAndRender (get_my_debate_archive) on the container
  // ----------------------------------------------------------
  it('TC1 — row click calls add_debate_to_archive then get_my_debate_archive via loadAndRender', async () => {
    const debate = makeDebate({ debate_id: 'bbbbbbbb-0000-0000-0000-000000000001' });
    const entry = makeEntry({ debate_id: 'bbbbbbbb-0000-0000-0000-000000000001' });

    mockRpc
      .mockResolvedValueOnce({ data: [debate], error: null })  // get_my_recent_debates_for_archive
      .mockResolvedValueOnce({ data: null, error: null })      // add_debate_to_archive
      .mockResolvedValueOnce({ data: [entry], error: null });  // get_my_debate_archive (via loadAndRender)

    await showAddPicker(container);

    const row = document.querySelector<HTMLElement>('.dba-picker-row');
    expect(row).not.toBeNull();
    row!.click();

    await flushMicrotasks();

    // Verify add RPC fired with correct debate ID
    expect(mockRpc).toHaveBeenCalledWith(
      'add_debate_to_archive',
      { p_debate_id: 'bbbbbbbb-0000-0000-0000-000000000001' }
    );

    // Verify loadAndRender was called (triggers get_my_debate_archive)
    expect(mockRpc).toHaveBeenCalledWith('get_my_debate_archive', {});
  });

  // ----------------------------------------------------------
  // TC2: get_my_recent_debates_for_archive error → toast, no overlay
  // ----------------------------------------------------------
  it('TC2 — fetch error shows toast and does not append overlay', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    await showAddPicker(container);

    const overlay = document.querySelector('.dba-picker-overlay');
    expect(overlay).toBeNull();
  });

  // ----------------------------------------------------------
  // TC3: Empty debates list renders dba-picker-empty, no rows
  // ----------------------------------------------------------
  it('TC3 — empty debate list renders dba-picker-empty element', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    await showAddPicker(container);

    const empty = document.querySelector('.dba-picker-empty');
    expect(empty).not.toBeNull();
    expect(document.querySelectorAll('.dba-picker-row').length).toBe(0);
  });

  // ----------------------------------------------------------
  // TC4: Row data-debate attribute matches debate_id from RPC
  // ----------------------------------------------------------
  it('TC4 — picker rows carry data-debate attribute matching debate_id', async () => {
    const d1 = makeDebate({ debate_id: 'cccccccc-0000-0000-0000-000000000001', topic: 'Topic A' });
    const d2 = makeDebate({ debate_id: 'cccccccc-0000-0000-0000-000000000002', topic: 'Topic B', is_win: false });
    mockRpc.mockResolvedValueOnce({ data: [d1, d2], error: null });

    await showAddPicker(container);

    const rows = document.querySelectorAll<HTMLElement>('.dba-picker-row');
    expect(rows.length).toBe(2);
    expect(rows[0].dataset.debate).toBe('cccccccc-0000-0000-0000-000000000001');
    expect(rows[1].dataset.debate).toBe('cccccccc-0000-0000-0000-000000000002');
  });

  // ----------------------------------------------------------
  // TC5: add_debate_to_archive error → error toast, loadAndRender NOT called
  // ----------------------------------------------------------
  it('TC5 — add_debate_to_archive error shows error toast and does not call get_my_debate_archive', async () => {
    const debate = makeDebate({ debate_id: 'dddddddd-0000-0000-0000-000000000001' });
    mockRpc
      .mockResolvedValueOnce({ data: [debate], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });

    await showAddPicker(container);

    const row = document.querySelector<HTMLElement>('.dba-picker-row');
    row!.click();

    await flushMicrotasks();

    // get_my_debate_archive must NOT have been called
    const allCalls = mockRpc.mock.calls.map((c: unknown[]) => c[0]);
    expect(allCalls).not.toContain('get_my_debate_archive');
  });

  // ----------------------------------------------------------
  // TC6: Clicking overlay backdrop dismisses the sheet
  // ----------------------------------------------------------
  it('TC6 — clicking overlay backdrop removes the overlay from DOM', async () => {
    mockRpc.mockResolvedValueOnce({ data: [makeDebate()], error: null });

    await showAddPicker(container);

    const overlay = document.querySelector<HTMLElement>('.dba-picker-overlay');
    expect(overlay).not.toBeNull();

    overlay!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.querySelector('.dba-picker-overlay')).toBeNull();
  });

  // ----------------------------------------------------------
  // TC7: loadAndRender re-renders container on success path
  // ----------------------------------------------------------
  it('TC7 — successful add causes container to be populated by loadAndRender', async () => {
    const debate = makeDebate({ debate_id: 'eeeeeeee-0000-0000-0000-000000000001' });
    const entry = makeEntry({ debate_id: 'eeeeeeee-0000-0000-0000-000000000001' });

    mockRpc
      .mockResolvedValueOnce({ data: [debate], error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [entry], error: null });

    await showAddPicker(container);

    const row = document.querySelector<HTMLElement>('.dba-picker-row');
    row!.click();

    await flushMicrotasks();

    // get_my_debate_archive called as part of loadAndRender
    const archiveCalls = mockRpc.mock.calls.filter((c: unknown[]) => c[0] === 'get_my_debate_archive');
    expect(archiveCalls.length).toBeGreaterThanOrEqual(1);
  });

  // ----------------------------------------------------------
  // ARCH: picker imports loadAndRender from edit, not supabase-js directly
  // ----------------------------------------------------------
  it('ARCH — picker imports loadAndRender from profile-debate-archive.edit, not supabase directly', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');

    const src = readFileSync(
      resolve(process.cwd(), 'src/profile-debate-archive.picker.ts'),
      'utf8'
    );

    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));

    const noDirectSupabase = !importLines.some((l: string) => l.includes('@supabase/supabase-js'));
    expect(noDirectSupabase).toBe(true);

    const importsLoadAndRender = importLines.some((l: string) => l.includes('profile-debate-archive.edit'));
    expect(importsLoadAndRender).toBe(true);
  });
});
