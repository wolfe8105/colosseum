import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// Stub @peermetrics/webrtc-stats — pulled in transitively via webrtc.monitor.ts
vi.mock('@peermetrics/webrtc-stats', () => ({
  WebRTCStats: vi.fn().mockImplementation(() => ({
    addConnection: vi.fn(),
    destroy: vi.fn(),
  })),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = '<div id="screen-main"></div>';
});

// TC1: showModDebatePicker sets view to 'modDebatePicker' in arena-state
describe('TC1 — showModDebatePicker sets arena-state view to modDebatePicker', () => {
  it('calls set_view with modDebatePicker', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    expect(state.view).toBe('modDebatePicker');
  });
});

// TC2: showModDebatePicker renders #mod-debate-create-btn into screenEl
describe('TC2 — showModDebatePicker renders #mod-debate-create-btn', () => {
  it('injects create button into the DOM', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    expect(document.getElementById('mod-debate-create-btn')).not.toBeNull();
  });
});

// TC3: showModDebatePicker renders mode select with text/live/voicememo options
describe('TC3 — showModDebatePicker renders #mod-debate-mode with correct options', () => {
  it('includes text, live, and voicememo options in the mode select', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    const modeSelect = document.getElementById('mod-debate-mode') as HTMLSelectElement | null;
    expect(modeSelect).not.toBeNull();
    const values = Array.from(modeSelect!.options).map(o => o.value);
    expect(values).toContain('text');
    expect(values).toContain('live');
    expect(values).toContain('voicememo');
  });
});

// TC4: showModDebatePicker renders #mod-debate-picker-back button
describe('TC4 — showModDebatePicker renders back button', () => {
  it('injects #mod-debate-picker-back into the DOM', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    expect(document.getElementById('mod-debate-picker-back')).not.toBeNull();
  });
});

// TC5: createModDebate calls safeRpc → create_mod_debate with correct params
describe('TC5 — createModDebate calls create_mod_debate RPC with correct params', () => {
  it('fires rpc create_mod_debate including p_mode and p_total_rounds from selectedRounds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));
    state.set_selectedRounds(5);

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    // Mock the create_mod_debate RPC; subsequent poll RPC also needs a response
    mockRpc.mockResolvedValue({ data: { debate_id: 'deb-001', join_code: 'ABC123' }, error: null });

    const createPromise = mod.createModDebate();
    // Advance enough for the async RPC to resolve but not run poll intervals forever
    await vi.advanceTimersByTimeAsync(100);
    await createPromise;

    expect(mockRpc).toHaveBeenCalledWith(
      'create_mod_debate',
      expect.objectContaining({
        p_mode: 'text',
        p_total_rounds: 5,
      }),
    );
  });
});

// TC6: createModDebate calls set_modDebateId with returned debate_id on success
describe('TC6 — createModDebate stores debate_id in arena-state via set_modDebateId', () => {
  it('sets modDebateId to the returned debate_id', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    mockRpc.mockResolvedValue({ data: { debate_id: 'deb-777', join_code: 'XYZ999' }, error: null });

    const createPromise = mod.createModDebate();
    await vi.advanceTimersByTimeAsync(100);
    await createPromise;

    expect(state.modDebateId).toBe('deb-777');
  });
});

// TC7: createModDebate disables button during async call, re-enables after
describe('TC7 — createModDebate disables and re-enables the create button', () => {
  it('button is disabled during call and re-enabled after resolution', async () => {
    // Use real timers so we can directly await the promise without timer loops
    const state = await import('../../src/arena/arena-state.ts');
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-debate-picker.ts');
    mod.showModDebatePicker();

    // Use a deferred promise to capture the in-flight state
    let resolveRpc!: (v: unknown) => void;
    const rpcPromise = new Promise(res => { resolveRpc = res; });
    mockRpc.mockReturnValueOnce(rpcPromise);
    // Subsequent RPC calls (from poll) return empty to avoid side effects
    mockRpc.mockResolvedValue({ data: null, error: null });

    const createPromise = mod.createModDebate();

    const btn = document.getElementById('mod-debate-create-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    resolveRpc({ data: { debate_id: 'deb-999', join_code: 'LMNO' }, error: null });
    await createPromise;

    expect(btn.disabled).toBe(false);
  });
});

// ARCH — seam boundary check
describe('ARCH — seam #038', () => {
  it('src/arena/arena-mod-debate-picker.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-debate-picker.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});
