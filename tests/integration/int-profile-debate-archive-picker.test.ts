// ============================================================
// INTEGRATOR — profile-debate-archive.picker → auth.rpc
// Seam #215
// Boundary: showAddPicker() calls safeRpc() (auth.rpc)
// Mock boundary: @supabase/supabase-js only
// profile-debate-archive.edit is stubbed to isolate the seam.
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

const mockLoadAndRender = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    auth: mockAuth,
  })),
}));

// Stub loadAndRender so the click handler's post-add refresh doesn't
// trigger a real safeRpc call (which would block on auth readyPromise).
vi.mock('../../src/profile-debate-archive.edit.ts', () => ({
  loadAndRender: mockLoadAndRender,
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

/** Flush all pending microtasks (Promise chains). */
async function flushMicrotasks() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

// ============================================================
// TESTS
// ============================================================

describe('profile-debate-archive.picker → auth.rpc (seam #215)', () => {
  let showAddPicker: (container: HTMLElement) => Promise<void>;
  let container: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    mockRpc.mockReset();
    mockLoadAndRender.mockReset();
    mockLoadAndRender.mockResolvedValue(undefined);
    mockRefreshSession.mockReset();
    mockRefreshSession.mockResolvedValue({ error: null });

    // Set up DOM
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    // Import auth.core to trigger init, then fire INITIAL_SESSION to resolve readyPromise
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
  // TC1: Initial load renders debate rows
  // ----------------------------------------------------------
  it('TC1 — calls get_my_recent_debates_for_archive with p_limit:30 and renders rows', async () => {
    const debates = [
      makeDebate({ debate_id: 'aaaaaaaa-0000-0000-0000-000000000001', topic: 'Topic A' }),
      makeDebate({ debate_id: 'aaaaaaaa-0000-0000-0000-000000000002', topic: 'Topic B', is_win: false }),
    ];
    mockRpc.mockResolvedValueOnce({ data: debates, error: null });

    await showAddPicker(container);

    expect(mockRpc).toHaveBeenCalledWith(
      'get_my_recent_debates_for_archive',
      { p_limit: 30 }
    );

    const rows = document.querySelectorAll('.dba-picker-row');
    expect(rows.length).toBe(2);
    expect((rows[0] as HTMLElement).dataset.debate).toBe('aaaaaaaa-0000-0000-0000-000000000001');
    expect((rows[1] as HTMLElement).dataset.debate).toBe('aaaaaaaa-0000-0000-0000-000000000002');
  });

  // ----------------------------------------------------------
  // TC2: Empty state renders no-debates message
  // ----------------------------------------------------------
  it('TC2 — empty list renders dba-picker-empty message', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    await showAddPicker(container);

    const empty = document.querySelector('.dba-picker-empty');
    expect(empty).not.toBeNull();
    expect(empty!.textContent).toContain('No unarchived completed debates');

    const rows = document.querySelectorAll('.dba-picker-row');
    expect(rows.length).toBe(0);
  });

  // ----------------------------------------------------------
  // TC3: RPC error shows toast, no overlay appended
  // ----------------------------------------------------------
  it('TC3 — get_my_recent_debates_for_archive error shows error toast and does not append overlay', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const configMod = await import('../../src/config.ts');
    const toastSpy = vi.spyOn(configMod, 'showToast');

    await showAddPicker(container);

    expect(toastSpy).toHaveBeenCalledWith('Could not load debates', 'error');
    const overlay = document.querySelector('.dba-picker-overlay');
    expect(overlay).toBeNull();

    toastSpy.mockRestore();
  });

  // ----------------------------------------------------------
  // TC4: Clicking a row calls add_debate_to_archive with correct debate ID
  // ----------------------------------------------------------
  it('TC4 — clicking a picker row calls add_debate_to_archive with correct debate ID', async () => {
    const debate = makeDebate({ debate_id: 'bbbbbbbb-0000-0000-0000-000000000001' });
    mockRpc
      .mockResolvedValueOnce({ data: [debate], error: null }) // get_my_recent_debates_for_archive
      .mockResolvedValueOnce({ data: null, error: null });    // add_debate_to_archive

    await showAddPicker(container);

    const row = document.querySelector<HTMLElement>('.dba-picker-row');
    expect(row).not.toBeNull();
    row!.click();

    await flushMicrotasks();

    expect(mockRpc).toHaveBeenCalledWith(
      'add_debate_to_archive',
      { p_debate_id: 'bbbbbbbb-0000-0000-0000-000000000001' }
    );
  });

  // ----------------------------------------------------------
  // TC5: Successful add shows success toast and removes overlay
  // ----------------------------------------------------------
  it('TC5 — successful add_debate_to_archive shows success toast and removes overlay', async () => {
    const debate = makeDebate({ debate_id: 'cccccccc-0000-0000-0000-000000000001' });
    mockRpc
      .mockResolvedValueOnce({ data: [debate], error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const configMod = await import('../../src/config.ts');
    const toastSpy = vi.spyOn(configMod, 'showToast');

    await showAddPicker(container);

    const row = document.querySelector<HTMLElement>('.dba-picker-row');
    expect(row).not.toBeNull();
    row!.click();

    await flushMicrotasks();

    expect(toastSpy).toHaveBeenCalledWith('Added to archive', 'success');
    expect(mockLoadAndRender).toHaveBeenCalledWith(container);

    toastSpy.mockRestore();
  });

  // ----------------------------------------------------------
  // TC6: Failed add shows error toast
  // ----------------------------------------------------------
  it('TC6 — failed add_debate_to_archive shows error toast', async () => {
    const debate = makeDebate({ debate_id: 'dddddddd-0000-0000-0000-000000000001' });
    mockRpc
      .mockResolvedValueOnce({ data: [debate], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });

    const configMod = await import('../../src/config.ts');
    const toastSpy = vi.spyOn(configMod, 'showToast');

    await showAddPicker(container);

    const row = document.querySelector<HTMLElement>('.dba-picker-row');
    expect(row).not.toBeNull();
    row!.click();

    await flushMicrotasks();

    expect(toastSpy).toHaveBeenCalledWith('Could not add debate', 'error');
    // loadAndRender should NOT be called on error
    expect(mockLoadAndRender).not.toHaveBeenCalled();

    toastSpy.mockRestore();
  });

  // ----------------------------------------------------------
  // TC7: Clicking backdrop removes overlay
  // ----------------------------------------------------------
  it('TC7 — clicking the overlay backdrop removes the overlay from DOM', async () => {
    mockRpc.mockResolvedValueOnce({ data: [makeDebate()], error: null });

    await showAddPicker(container);

    const overlay = document.querySelector<HTMLElement>('.dba-picker-overlay');
    expect(overlay).not.toBeNull();

    // Simulate click on the overlay itself — e.target === overlay
    overlay!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.querySelector('.dba-picker-overlay')).toBeNull();
  });

  // ----------------------------------------------------------
  // ARCH: picker module does not import supabase-js directly
  // ----------------------------------------------------------
  it('ARCH — profile-debate-archive.picker imports from auth.rpc not bare supabase', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { resolve, dirname } = await import('node:path');

    const src = readFileSync(
      resolve(process.cwd(), 'src/profile-debate-archive.picker.ts'),
      'utf8'
    );

    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const supabaseDirectImport = importLines.some(l => l.includes('@supabase/supabase-js'));
    expect(supabaseDirectImport).toBe(false);

    const usesAuthRpc = importLines.some(l => l.includes('auth.rpc'));
    expect(usesAuthRpc).toBe(true);
  });
});
