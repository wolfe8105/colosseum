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

// ─── TC-1: startModDebatePoll sets a 4000ms interval ────────────────────────

describe('TC-1 — startModDebatePoll sets a polling interval', () => {
  it('stores the interval via set_modDebatePollTimer so the timer is non-null after start', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    // Patch away the downstream imports that don't matter for this TC
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({ enterRoom: vi.fn() }));
    vi.doMock('../../src/arena/arena-match-found.ts', () => ({ showMatchFound: vi.fn() }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      getCurrentProfile: vi.fn().mockReturnValue(null),
    }));
    const { startModDebatePoll } = await import('../../src/arena/arena-mod-debate-poll.ts');

    state.set_view('modDebateWaiting' as any);
    startModDebatePoll('debate-abc', 'text', false);

    expect(state.modDebatePollTimer).not.toBeNull();

    state.set_modDebatePollTimer(null); // cleanup
    vi.useRealTimers();
  });
});

// ─── TC-2: Poll fires RPC + updates DOM slot names ──────────────────────────

describe('TC-2 — poll tick calls check_mod_debate and updates slot names', () => {
  it('calls check_mod_debate RPC and sets slot-a-name / slot-b-name textContent', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="screen-main"></div>
      <span id="slot-a-name">waiting…</span>
      <span id="slot-b-name">waiting…</span>
    `;

    const { safeRpc: mockSafeRpc } = await vi.importMock('../../src/auth.ts') as any;
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({
        data: {
          status: 'pending',
          debater_a_name: 'Alice',
          debater_b_name: 'Bob',
        },
        error: null,
      }),
      getCurrentProfile: vi.fn().mockReturnValue({ id: 'mod-user-id' }),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({ enterRoom: vi.fn() }));
    vi.doMock('../../src/arena/arena-match-found.ts', () => ({ showMatchFound: vi.fn() }));

    const state = await import('../../src/arena/arena-state.ts');
    const { startModDebatePoll } = await import('../../src/arena/arena-mod-debate-poll.ts');
    const { safeRpc } = await import('../../src/auth.ts') as any;

    state.set_view('modDebateWaiting' as any);
    startModDebatePoll('debate-xyz', 'text', false);

    await vi.advanceTimersByTimeAsync(4000);

    expect(safeRpc).toHaveBeenCalledWith('check_mod_debate', { p_debate_id: 'debate-xyz' });
    expect(document.getElementById('slot-a-name')?.textContent).toBe('Alice');
    expect(document.getElementById('slot-b-name')?.textContent).toBe('Bob');

    state.set_modDebatePollTimer(null);
    vi.useRealTimers();
  });
});

// ─── TC-3: Poll self-cancels when view is not modDebateWaiting ───────────────

describe('TC-3 — poll self-cancels when view leaves modDebateWaiting', () => {
  it('does not call check_mod_debate when view is not modDebateWaiting', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      getCurrentProfile: vi.fn().mockReturnValue(null),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({ enterRoom: vi.fn() }));
    vi.doMock('../../src/arena/arena-match-found.ts', () => ({ showMatchFound: vi.fn() }));

    const state = await import('../../src/arena/arena-state.ts');
    const { startModDebatePoll } = await import('../../src/arena/arena-mod-debate-poll.ts');
    const { safeRpc } = await import('../../src/auth.ts') as any;

    // Set view to something other than modDebateWaiting
    state.set_view('lobby' as any);
    startModDebatePoll('debate-abc', 'text', false);

    await vi.advanceTimersByTimeAsync(4000);

    expect(safeRpc).not.toHaveBeenCalled();
    // Timer should have been cleared
    expect(state.modDebatePollTimer).toBeNull();

    vi.useRealTimers();
  });
});

// ─── TC-4: When status is 'matched', poll stops ──────────────────────────────

describe('TC-4 — poll stops when check_mod_debate returns status matched', () => {
  it('clears the timer and does not continue polling after matched status', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({
        data: {
          status: 'matched',
          debater_a_name: 'Alice',
          debater_a_id: 'user-a',
          debater_b_name: 'Bob',
          debater_b_id: 'user-b',
          topic: 'Test Topic',
          total_rounds: 3,
          ruleset: 'amplified',
          language: 'en',
        },
        error: null,
      }),
      getCurrentProfile: vi.fn().mockReturnValue({ id: 'mod-user-id' }),
    }));

    const enterRoomMock = vi.fn();
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({ enterRoom: enterRoomMock }));
    vi.doMock('../../src/arena/arena-match-found.ts', () => ({ showMatchFound: vi.fn() }));

    const state = await import('../../src/arena/arena-state.ts');
    const { startModDebatePoll } = await import('../../src/arena/arena-mod-debate-poll.ts');

    state.set_view('modDebateWaiting' as any);
    startModDebatePoll('debate-matched', 'text', false);

    await vi.advanceTimersByTimeAsync(4000);

    // Timer should be cleared after matched
    expect(state.modDebatePollTimer).toBeNull();

    vi.useRealTimers();
  });
});

// ─── TC-5: stopModDebatePoll clears timer ───────────────────────────────────

describe('TC-5 — stopModDebatePoll clears modDebatePollTimer', () => {
  it('sets modDebatePollTimer to null after stop', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      getCurrentProfile: vi.fn().mockReturnValue(null),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({ enterRoom: vi.fn() }));
    vi.doMock('../../src/arena/arena-match-found.ts', () => ({ showMatchFound: vi.fn() }));

    const state = await import('../../src/arena/arena-state.ts');
    const { startModDebatePoll, stopModDebatePoll } = await import('../../src/arena/arena-mod-debate-poll.ts');

    state.set_view('modDebateWaiting' as any);
    startModDebatePoll('debate-abc', 'text', false);
    expect(state.modDebatePollTimer).not.toBeNull();

    stopModDebatePoll();
    expect(state.modDebatePollTimer).toBeNull();

    vi.useRealTimers();
  });
});

// ─── TC-6: cancelModDebate calls cancel_mod_debate RPC + clears modDebateId ──

describe('TC-6 — cancelModDebate calls cancel_mod_debate RPC and clears state', () => {
  it('calls cancel_mod_debate RPC and sets modDebateId to null', async () => {
    vi.doMock('../../src/arena/arena-mod-queue-browse.ts', () => ({ showModQueue: vi.fn() }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({ enterRoom: vi.fn() }));
    vi.doMock('../../src/arena/arena-match-found.ts', () => ({ showMatchFound: vi.fn() }));

    const safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: safeRpcMock,
      getCurrentProfile: vi.fn().mockReturnValue(null),
    }));

    const state = await import('../../src/arena/arena-state.ts');
    const { cancelModDebate } = await import('../../src/arena/arena-mod-debate-poll.ts');

    state.set_modDebateId('debate-to-cancel');
    expect(state.modDebateId).toBe('debate-to-cancel');

    await cancelModDebate('debate-to-cancel');

    expect(safeRpcMock).toHaveBeenCalledWith('cancel_mod_debate', { p_debate_id: 'debate-to-cancel' });
    expect(state.modDebateId).toBeNull();
  });
});

// ─── TC-7 (ARCH): import boundary unchanged ──────────────────────────────────

describe('ARCH — seam #037 import boundary unchanged', () => {
  it('src/arena/arena-mod-debate-poll.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-debate-poll.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});
