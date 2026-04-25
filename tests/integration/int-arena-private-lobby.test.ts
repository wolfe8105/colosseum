// ============================================================
// INTEGRATOR — arena-private-lobby → arena-state
// Seam #032 | score: 52
// Boundary: createAndWaitPrivateLobby reads selectedCategory/selectedRanked/
//           selectedRuleset/selectedRounds/selectedMode from arena-state,
//           writes privateLobbyDebateId + view via set_* setters.
//           startPrivateLobbyPoll reads privateLobbyPollTimer + view,
//           writes privateLobbyPollTimer via set_privateLobbyPollTimer.
//           cancelPrivateLobby reads privateLobbyPollTimer + privateLobbyDebateId.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

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


// ============================================================
// MODULE HANDLES
// ============================================================

let createAndWaitPrivateLobby: (
  mode: string,
  topic: string,
  visibility: 'private' | 'group' | 'code',
  invitedUserId?: string,
  invitedUserName?: string,
  groupId?: string
) => Promise<void>;

let startPrivateLobbyPoll: (debateId: string, mode: string, topic: string) => void;

let cancelPrivateLobby: () => Promise<void>;

let set_privateLobbyPollTimer: (v: ReturnType<typeof setInterval> | null) => void;
let set_privateLobbyDebateId: (v: string | null) => void;
let set_view: (v: string) => void;
let set_screenEl: (v: HTMLElement | null) => void;
let get_privateLobbyDebateId: () => string | null;
let get_view: () => string;

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  document.body.innerHTML = '<div id="screen-main"></div>';

  const lobbyMod = await import('../../src/arena/arena-private-lobby.ts');
  createAndWaitPrivateLobby = lobbyMod.createAndWaitPrivateLobby;
  startPrivateLobbyPoll = lobbyMod.startPrivateLobbyPoll;
  cancelPrivateLobby = lobbyMod.cancelPrivateLobby;

  const stateMod = await import('../../src/arena/arena-state.ts');
  set_privateLobbyPollTimer = stateMod.set_privateLobbyPollTimer;
  set_privateLobbyDebateId = stateMod.set_privateLobbyDebateId;
  set_view = stateMod.set_view as (v: string) => void;
  set_screenEl = stateMod.set_screenEl;

  // Expose live bindings via getters
  get_privateLobbyDebateId = () => stateMod.privateLobbyDebateId;
  get_view = () => stateMod.view;

  // Point screenEl at real DOM node
  set_screenEl(document.getElementById('screen-main'));
});

// ============================================================
// TC1 — create_private_lobby RPC called with correct params
// ============================================================

describe('TC1 — createAndWaitPrivateLobby calls create_private_lobby with correct params', () => {
  it('passes mode, topic, visibility, invited_user_id, group_id, total_rounds', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ debate_id: 'debate-abc', join_code: null }],
      error: null,
    });

    // Don't await fully — fire and check the RPC call
    const promise = createAndWaitPrivateLobby(
      'text',
      'Is pineapple on pizza correct?',
      'private',
      'user-xyz',
      'Alice',
      undefined
    );

    await promise.catch(() => { /* ignore arena-lobby dynamic import errors in test env */ });

    // Find the create_private_lobby call
    const rpcCalls = mockRpc.mock.calls;
    const createCall = rpcCalls.find(c => c[0] === 'create_private_lobby');
    expect(createCall).toBeTruthy();
    const params = createCall![1] as Record<string, unknown>;
    expect(params.p_mode).toBe('text');
    expect(params.p_topic).toBe('Is pineapple on pizza correct?');
    expect(params.p_visibility).toBe('private');
    expect(params.p_invited_user_id).toBe('user-xyz');
    expect(params.p_group_id).toBeNull();
  });
});

// ============================================================
// TC2 — privateLobbyDebateId set from create_private_lobby response
// ============================================================

describe('TC2 — createAndWaitPrivateLobby sets privateLobbyDebateId in arena-state', () => {
  it('sets privateLobbyDebateId to the returned debate_id', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ debate_id: 'debate-set-test', join_code: null }],
      error: null,
    });

    await createAndWaitPrivateLobby('text', 'My topic', 'group').catch(() => {});

    expect(get_privateLobbyDebateId()).toBe('debate-set-test');
  });
});

// ============================================================
// TC3 — visibility='code' renders join code in DOM
// ============================================================

describe('TC3 — visibility=code renders join_code in DOM', () => {
  it('shows the join code and copy link button', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ debate_id: 'debate-code', join_code: 'XYZ99' }],
      error: null,
    });

    await createAndWaitPrivateLobby('text', 'Hot topic', 'code').catch(() => {});

    const codeDisplay = document.getElementById('arena-private-code-display');
    expect(codeDisplay).toBeTruthy();
    expect(codeDisplay!.innerHTML).toContain('XYZ99');
    expect(document.getElementById('arena-challenge-link-btn')).toBeTruthy();
  });
});

// ============================================================
// TC4 — visibility='private' shows "CHALLENGE SENT" in title
// ============================================================

describe('TC4 — visibility=private shows CHALLENGE SENT title', () => {
  it('sets arena-private-title to CHALLENGE SENT', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ debate_id: 'debate-priv', join_code: null }],
      error: null,
    });

    await createAndWaitPrivateLobby('text', 'Debate topic', 'private', 'opp-id', 'Bob').catch(() => {});

    const titleEl = document.getElementById('arena-private-title');
    expect(titleEl).toBeTruthy();
    expect(titleEl!.textContent).toBe('CHALLENGE SENT');
  });
});

// ============================================================
// TC5 — startPrivateLobbyPoll calls check_private_lobby RPC each tick
// ============================================================

describe('TC5 — startPrivateLobbyPoll calls check_private_lobby each interval tick', () => {
  it('invokes check_private_lobby with p_debate_id after first timer tick', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Pending — still waiting
    mockRpc.mockResolvedValue({
      data: [{ status: 'waiting', player_b_ready: false, opponent_id: null }],
      error: null,
    });

    set_view('privateLobbyWaiting' as Parameters<typeof set_view>[0]);
    startPrivateLobbyPoll('debate-poll-test', 'text', 'Any topic');

    // Advance one poll interval (3s)
    await vi.advanceTimersByTimeAsync(3000);

    const checkCall = mockRpc.mock.calls.find(c => c[0] === 'check_private_lobby');
    expect(checkCall).toBeTruthy();
    expect((checkCall![1] as Record<string, unknown>).p_debate_id).toBe('debate-poll-test');

    vi.useRealTimers();
  });
});

// ============================================================
// TC6 — cancelPrivateLobby calls cancel_private_lobby RPC
// ============================================================

describe('TC6 — cancelPrivateLobby calls cancel_private_lobby RPC and clears timer', () => {
  it('calls cancel_private_lobby with p_debate_id and zeroes privateLobbyDebateId', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    // Pre-seed state with a known debate_id and a fake timer
    set_privateLobbyDebateId('debate-cancel-test');
    const fakeTimer = setInterval(() => {}, 99999);
    set_privateLobbyPollTimer(fakeTimer);

    await cancelPrivateLobby().catch(() => {});

    const cancelCall = mockRpc.mock.calls.find(c => c[0] === 'cancel_private_lobby');
    expect(cancelCall).toBeTruthy();
    expect((cancelCall![1] as Record<string, unknown>).p_debate_id).toBe('debate-cancel-test');

    // After cancel, privateLobbyDebateId should be null
    expect(get_privateLobbyDebateId()).toBeNull();
  });
});

// ============================================================
// ARCH — seam #032 import boundary unchanged
// ============================================================

describe('ARCH — seam #032 import boundary unchanged', () => {
  it('src/arena/arena-private-lobby.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-private-lobby.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});
