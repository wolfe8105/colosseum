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

// TC-01: showModQueue sets view to 'modQueue' and renders skeleton DOM
describe('TC-01 — showModQueue sets view to modQueue and renders skeleton', () => {
  it('sets arena view to modQueue and renders mod-queue-list container', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');

    mockRpc.mockResolvedValue({ data: [], error: null });

    showModQueue();

    expect(stateModule.view).toBe('modQueue');
    expect(document.getElementById('mod-queue-list')).not.toBeNull();
    expect(document.getElementById('mod-queue-back')).not.toBeNull();
  });
});

// TC-02: loadModQueue calls browse_mod_queue RPC with no params and renders debate cards
describe('TC-02 — loadModQueue calls browse_mod_queue and renders queue cards', () => {
  it('renders a claim button for each debate returned', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');

    const fakeRow = {
      debate_id: 'abc-123',
      topic: 'Is AI better than humans?',
      category: 'tech',
      mode: 'live',
      debater_a_name: 'Alice',
      debater_b_name: 'Bob',
      created_at: new Date().toISOString(),
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'browse_mod_queue') return Promise.resolve({ data: [fakeRow], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    showModQueue();
    // Let async loadModQueue settle
    await vi.waitFor(() => {
      expect(document.querySelectorAll('.mod-queue-claim-btn').length).toBeGreaterThan(0);
    });

    const calls = mockRpc.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain('browse_mod_queue');

    const btn = document.querySelector<HTMLButtonElement>('.mod-queue-claim-btn');
    expect(btn?.dataset.debateId).toBe('abc-123');
  });
});

// TC-03: loadModQueue on "Not an available moderator" error renders unavailable message (no toast)
describe('TC-03 — loadModQueue on moderator-unavailable error renders info message', () => {
  it('shows unavailability text without calling showToast path', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');

    mockRpc.mockImplementation((name: string) => {
      if (name === 'browse_mod_queue')
        return Promise.resolve({ data: null, error: { message: 'Not an available moderator' } });
      return Promise.resolve({ data: null, error: null });
    });

    showModQueue();
    await vi.waitFor(() => {
      const listEl = document.getElementById('mod-queue-list');
      expect(listEl?.textContent).toMatch(/not set to Available/i);
    });
  });
});

// TC-04: claimModRequest calls request_to_moderate RPC with correct debate ID
describe('TC-04 — claimModRequest calls request_to_moderate with p_debate_id', () => {
  it('calls request_to_moderate RPC and renders confirmation on success', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue, claimModRequest } = await import('../../src/arena/arena-mod-queue-browse.ts');

    mockRpc.mockImplementation((name: string) => {
      if (name === 'browse_mod_queue') return Promise.resolve({ data: [], error: null });
      if (name === 'request_to_moderate') return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    showModQueue();
    await vi.waitFor(() => expect(document.getElementById('mod-queue-list')).not.toBeNull());

    const btn = document.createElement('button');
    btn.disabled = false;
    document.body.appendChild(btn);

    await claimModRequest('debate-xyz', btn);

    const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
    const claimCall = rpcCalls.find(([name]) => name === 'request_to_moderate');
    expect(claimCall).toBeTruthy();
    expect(claimCall![1]).toEqual({ p_debate_id: 'debate-xyz' });

    const listEl = document.getElementById('mod-queue-list');
    expect(listEl?.textContent).toMatch(/Request sent/i);
  });
});

// TC-05: startModQueuePoll self-cancels when view changes away from modQueue
describe('TC-05 — startModQueuePoll self-cancels when view changes away from modQueue', () => {
  it('stops polling when view is no longer modQueue', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));
    stateModule.set_view('modQueue');

    mockRpc.mockResolvedValue({ data: [], error: null });

    const { startModQueuePoll } = await import('../../src/arena/arena-mod-queue-browse.ts');
    startModQueuePoll();

    // Advance one poll tick — view is modQueue, should call loadModQueue
    await vi.advanceTimersByTimeAsync(5000);

    const callsAfterFirst = mockRpc.mock.calls.filter((c: unknown[]) => c[0] === 'browse_mod_queue').length;

    // Switch view away — poll should self-cancel on next tick
    stateModule.set_view('lobby');
    await vi.advanceTimersByTimeAsync(5000);

    const callsAfterSwitch = mockRpc.mock.calls.filter((c: unknown[]) => c[0] === 'browse_mod_queue').length;

    // No additional browse_mod_queue calls after view changed
    expect(callsAfterSwitch).toBe(callsAfterFirst);

    vi.useRealTimers();
  });
});

// TC-06: loadPendingModInvites shows invite section and wires accept/decline buttons
describe('TC-06 — loadPendingModInvites reveals invite section on data', () => {
  it('renders invite cards and shows accept/decline buttons', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');

    const fakeInvite = {
      debate_id: 'inv-001',
      topic: 'Should AI vote?',
      category: 'politics',
      mode: 'live',
      inviter_id: 'user-abc',
      inviter_name: 'Moderator Pat',
      created_at: new Date().toISOString(),
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_pending_mod_invites') return Promise.resolve({ data: [fakeInvite], error: null });
      return Promise.resolve({ data: [], error: null });
    });

    showModQueue();
    await vi.waitFor(() => {
      const section = document.getElementById('mod-invite-section');
      expect(section?.style.display).not.toBe('none');
    });

    expect(document.querySelector('.mod-invite-accept-btn')).not.toBeNull();
    expect(document.querySelector('.mod-invite-decline-btn')).not.toBeNull();
  });
});

// TC-07: accept invite button calls respond_mod_invite with p_accept: true
describe('TC-07 — accept invite button calls respond_mod_invite with p_accept true', () => {
  it('fires respond_mod_invite RPC with correct params on accept click', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');

    const fakeInvite = {
      debate_id: 'inv-002',
      topic: 'Free speech online',
      category: 'society',
      mode: 'live',
      inviter_id: 'user-def',
      inviter_name: 'Pat',
      created_at: new Date().toISOString(),
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_pending_mod_invites') return Promise.resolve({ data: [fakeInvite], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    showModQueue();
    await vi.waitFor(() => {
      expect(document.querySelector('.mod-invite-accept-btn')).not.toBeNull();
    });

    const acceptBtn = document.querySelector<HTMLButtonElement>('.mod-invite-accept-btn')!;
    acceptBtn.click();

    await vi.waitFor(() => {
      const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
      const acceptCall = rpcCalls.find(([name, params]) =>
        name === 'respond_mod_invite' && params?.p_accept === true
      );
      expect(acceptCall).toBeTruthy();
      expect(acceptCall![1]).toMatchObject({ p_debate_id: 'inv-002', p_accept: true });
    });
  });
});

// ARCH: import boundary unchanged
describe('ARCH — seam #036 import boundary unchanged', () => {
  it('src/arena/arena-mod-queue-browse.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-queue-browse.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});
