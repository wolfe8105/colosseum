/**
 * Integration tests — SEAM #379
 * src/pages/spectate.ts → spectate.state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn((cb: Function) => {
    cb('INITIAL_SESSION', null);
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  }),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

function setupDOM(debateId?: string) {
  const search = debateId !== undefined ? `?id=${debateId}` : '';
  Object.defineProperty(window, 'location', {
    value: { search, href: `http://localhost/${search}`, host: 'localhost' },
    writable: true,
    configurable: true,
  });
  document.body.innerHTML = `
    <div id="app"></div>
    <div id="loading"></div>
    <button id="back-btn"></button>
    <button id="join-btn"></button>
    <div id="spectator-count"></div>
    <div id="messages"></div>
  `;
}

function mockDebateRpc(overrides: Record<string, unknown> = {}) {
  // All fields match get_arena_debate_spectator schema (nullable strings/numbers)
  const base = {
    id: VALID_UUID,
    topic: 'Test Topic',
    status: 'completed',
    mode: 'live',
    debater_a_name: 'Alice',
    debater_a_elo: 1200,
    debater_a_avatar: null as string | null,
    debater_b_name: 'Bob',
    debater_b_elo: 1200,
    debater_b_avatar: null as string | null,
    moderator_type: 'ai',
    moderator_id: null as string | null,
    moderator_name: null as string | null,
    ruleset: 'standard',
    spectator_count: 10,
    current_round: 1,
    total_rounds: 3,
    vote_count_a: 5,
    vote_count_b: 3,
    score_a: 0,
    score_b: 0,
    winner: null as string | null,
    ai_scorecard: null,
    ...overrides,
  };

  mockRpc.mockImplementation((fn: string) => {
    if (fn === 'get_arena_debate_spectator') return Promise.resolve({ data: base, error: null });
    if (fn === 'get_debate_messages') return Promise.resolve({ data: [], error: null });
    if (fn === 'get_spectator_chat') return Promise.resolve({ data: [], error: null });
    if (fn === 'get_debate_replay_data') return Promise.resolve({ data: { power_ups: [], references: [], mod_scores: [] }, error: null });
    if (fn === 'bump_spectator_count') return Promise.resolve({ data: null, error: null });
    if (fn === 'log_debate_watch') return Promise.resolve({ data: null, error: null });
    if (fn === 'log_event') return Promise.resolve({ data: null, error: null });
    return Promise.resolve({ data: null, error: null });
  });
}

// ---------------------------------------------------------------------------
// TC1 — ARCH seam: spectate.ts imports from spectate.state
// ---------------------------------------------------------------------------
describe('ARCH — seam #379', () => {
  it('src/pages/spectate.ts still imports from spectate.state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/pages/spectate.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('spectate.state'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC2 — state defaults: spectate.state exports expected initial values
// ---------------------------------------------------------------------------
describe('TC2 — spectate.state default values', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('state has correct default values on import', async () => {
    const { state } = await import('../../src/pages/spectate.state.ts');
    expect(state.lastRenderedMessageCount).toBe(0);
    expect(state.voteCast).toBe(false);
    expect(state.chatOpen).toBe(true);
    expect(state.pollTimer).toBeNull();
    expect(state.chatPollTimer).toBeNull();
    expect(state.debateId).toBeNull();
    expect(state.debateData).toBeNull();
    expect(state.replayData).toBeNull();
    expect(state.chatMessages).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// TC3 — UUID validation: invalid ID shows error without calling RPCs
// ---------------------------------------------------------------------------
describe('TC3 — UUID validation rejects non-UUID debate ID', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockFrom.mockReset();
    setupDOM('not-a-uuid');
  });

  it('sets #app to invalid debate link message and does not call any RPC', async () => {
    await import('../../src/pages/spectate.ts');
    await vi.runAllTimersAsync();

    const app = document.getElementById('app');
    expect(app?.innerHTML).toContain('Invalid debate link');
    expect(mockRpc).not.toHaveBeenCalledWith('get_arena_debate_spectator', expect.anything(), expect.anything());
  });
});

// ---------------------------------------------------------------------------
// TC4 — Missing debate ID shows no-ID error without calling RPCs
// ---------------------------------------------------------------------------
describe('TC4 — Missing debate ID shows error', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockFrom.mockReset();
    setupDOM(); // no ?id= param
  });

  it('sets #app to no-debate-id message and does not call any RPC', async () => {
    await import('../../src/pages/spectate.ts');
    await vi.runAllTimersAsync();

    const app = document.getElementById('app');
    expect(app?.innerHTML).toContain('No debate ID provided');
    expect(mockRpc).not.toHaveBeenCalledWith('get_arena_debate_spectator', expect.anything(), expect.anything());
  });
});

// ---------------------------------------------------------------------------
// TC5 — Valid UUID sets state.debateId and calls get_arena_debate_spectator
// ---------------------------------------------------------------------------
describe('TC5 — Valid debate ID sets state.debateId and calls RPC', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockFrom.mockReset();
    setupDOM(VALID_UUID);
    mockDebateRpc({ status: 'completed' });
  });

  it('stores debateId in state and calls get_arena_debate_spectator with correct param', async () => {
    await import('../../src/pages/spectate.ts');
    const { state } = await import('../../src/pages/spectate.state.ts');
    await vi.advanceTimersByTimeAsync(100);

    expect(state.debateId).toBe(VALID_UUID);
    // mockRpc is supabase.rpc — safeRpc consumes the schema internally, so only 2 args reach rpc()
    expect(mockRpc).toHaveBeenCalledWith(
      'get_arena_debate_spectator',
      { p_debate_id: VALID_UUID }
    );
  });
});

// ---------------------------------------------------------------------------
// TC6 — Completed debate triggers get_debate_replay_data RPC
// ---------------------------------------------------------------------------
describe('TC6 — Completed debate loads replay data', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockFrom.mockReset();
    setupDOM(VALID_UUID);
    mockDebateRpc({ status: 'completed' });
  });

  it('calls get_debate_replay_data RPC for completed debate', async () => {
    await import('../../src/pages/spectate.ts');
    await vi.advanceTimersByTimeAsync(100);

    // mockRpc is supabase.rpc — safeRpc consumes the schema internally, only 2 args reach rpc()
    expect(mockRpc).toHaveBeenCalledWith(
      'get_debate_replay_data',
      { p_debate_id: VALID_UUID }
    );
  });
});

// ---------------------------------------------------------------------------
// TC7 — Pending debate starts polling (pollTimer becomes non-null)
// ---------------------------------------------------------------------------
describe('TC7 — Pending debate starts poll timer', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockFrom.mockReset();
    setupDOM(VALID_UUID);
    mockDebateRpc({ status: 'pending' });
  });

  it('sets state.pollTimer after loadDebate() for a pending debate', async () => {
    await import('../../src/pages/spectate.ts');
    const { state } = await import('../../src/pages/spectate.state.ts');
    // Flush all pending promises then advance timers to allow loadDebate to complete
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(50);

    // pollTimer should be set (non-null) since debate status is 'pending'
    expect(state.pollTimer).not.toBeNull();
  });
});
