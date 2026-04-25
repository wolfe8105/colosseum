/**
 * Integration tests: src/pages/spectate.ts → src/nudge.ts
 * Seam #225
 *
 * Covers:
 *   ARCH   spectate imports nudge directly; nudge exports the right function
 *   TC-01  replay_entry nudge fires for completed debate (status: complete)
 *   TC-02  nudge does NOT fire for live debate (redirect path)
 *   TC-03  nudge does NOT fire for active/pending debate (polling path)
 *   TC-04  nudge suppressed on second call with same session ID
 *   TC-05  nudge suppressed when SESSION_CAP (3) is reached
 *   TC-06  nudge suppressed by 24h localStorage cooldown
 *   TC-07  nudge writes sessionStorage + localStorage on first fire
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Top-level hoisted Supabase mock (only @supabase/supabase-js) ────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDebate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    topic: 'Test topic',
    status: 'complete',
    debater_a_name: 'Alice',
    debater_b_name: 'Bob',
    debater_a_elo: 1200,
    debater_b_elo: 1200,
    debater_a_avatar: null,
    debater_b_avatar: null,
    vote_count_a: 3,
    vote_count_b: 5,
    spectator_count: 10,
    ...overrides,
  };
}

function setupDom() {
  document.body.innerHTML = `
    <div id="app"></div>
    <div id="loading"></div>
    <button id="back-btn"></button>
    <button id="join-btn"></button>
    <div id="spectator-count"></div>
    <div id="messages"></div>
  `;
}

function setDebateIdInUrl(id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee') {
  // Use Object.defineProperty carefully to allow write
  try {
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: {
        search: `?id=${id}`,
        href: `http://localhost/?id=${id}`,
        host: 'localhost',
        hostname: 'localhost',
        pathname: '/',
        origin: 'http://localhost',
        assign: vi.fn(),
        replace: vi.fn(),
      },
    });
  } catch {
    // already defined — just set search
    (window as any).location = {
      ...window.location,
      search: `?id=${id}`,
      href: `http://localhost/?id=${id}`,
      host: 'localhost',
    };
  }
}

// ─── Shared beforeEach / afterEach ────────────────────────────────────────────

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.getSession.mockReset();

  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });

  // Default RPC returns: complete debate for get_arena_debate_spectator
  mockRpc.mockImplementation(async (fn: string) => {
    if (fn === 'get_arena_debate_spectator') return { data: makeDebate({ status: 'complete' }), error: null };
    if (fn === 'get_debate_messages') return { data: [], error: null };
    if (fn === 'get_spectator_chat') return { data: [], error: null };
    if (fn === 'get_debate_replay_data') return { data: null, error: null };
    return { data: null, error: null };
  });

  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  setupDom();
  setDebateIdInUrl();

  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

// ─── ARCH filter ──────────────────────────────────────────────────────────────

describe('ARCH — spectate.ts imports nudge directly (no barrel)', () => {
  it('spectate.ts import lines include nudge.ts', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/spectate.ts'),
      'utf8',
    );
    const importLines = src.split('\n').filter((l) => /from\s+['"]/.test(l));
    const hasNudge = importLines.some((l) => l.includes('nudge'));
    expect(hasNudge).toBe(true);
  });

  it('nudge.ts exports a function named nudge', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/nudge.ts'),
      'utf8',
    );
    expect(src).toContain('export function nudge(');
  });
});

// ─── TC-01: replay_entry nudge fires on completed debate ──────────────────────
describe('TC-01 — replay_entry nudge fires for completed debate', () => {
  it('nudge("replay_entry", ...) is called when debate status is complete', async () => {
    // Mock auth barrel to avoid auth.core → config chain
    vi.doMock('../../src/auth.ts', () => ({
      ready: Promise.resolve(),
      getSupabaseClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
      safeRpc: vi.fn(async (fn: string) => mockRpc(fn)),
      getCurrentUser: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => false),
    }));

    // Mock sub-modules that do DOM work
    vi.doMock('../../src/pages/spectate.render.ts', () => ({
      showError: vi.fn(),
      renderSpectateView: vi.fn(),
      renderMessages: vi.fn(() => ''),
    }));
    vi.doMock('../../src/pages/spectate.vote.ts', () => ({
      updateVoteBar: vi.fn(),
      updatePulse: vi.fn(),
    }));
    vi.doMock('../../src/pages/spectate.chat.ts', () => ({
      startChatPolling: vi.fn(),
    }));
    vi.doMock('../../src/pages/spectate.state.ts', () => ({
      state: {
        sb: null,
        app: null,
        loading: null,
        debateId: null,
        debateData: null,
        pollTimer: null,
        chatPollTimer: null,
        isLoggedIn: false,
        chatMessages: [],
        lastChatMessageAt: null,
        lastRenderedMessageCount: 0,
        replayData: null,
      },
    }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_arena_debate_spectator: {},
      get_debate_messages: {},
      get_debate_replay_data: {},
      get_spectator_chat: {},
    }));
    vi.doMock('../../src/analytics.ts', () => ({}));

    // Capture showToast calls via nudge.ts which imports from config.ts
    const showToastSpy = vi.fn();
    vi.doMock('../../src/config.ts', () => ({
      showToast: showToastSpy,
      escapeHTML: (s: string) => s,
      friendlyError: (e: unknown) => String(e),
      placeholderMode: { supabase: false },
      SUPABASE_URL: 'https://fake.supabase.co',
      SUPABASE_ANON_KEY: 'fake-key',
      UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    }));
    vi.doMock('../../src/config.toast.ts', () => ({
      showToast: showToastSpy,
    }));

    // safeRpc returns complete debate
    const safeRpcMock = vi.fn(async (fn: string) => {
      if (fn === 'get_arena_debate_spectator') return { data: makeDebate({ status: 'complete' }), error: null };
      if (fn === 'get_debate_messages') return { data: [], error: null };
      if (fn === 'get_spectator_chat') return { data: [], error: null };
      if (fn === 'get_debate_replay_data') return { data: null, error: null };
      return { data: null, error: null };
    });

    vi.doMock('../../src/auth.ts', () => ({
      ready: Promise.resolve(),
      getSupabaseClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
      safeRpc: safeRpcMock,
      getCurrentUser: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => false),
    }));

    // Import nudge AFTER doMock so it picks up the mocked config
    const nudgeMod = await import('../../src/nudge.ts');
    const nudgeSpy = vi.spyOn(nudgeMod, 'nudge');

    // Import spectate — IIFE runs immediately
    await import('../../src/pages/spectate.ts');

    // Let all async chains drain
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(nudgeSpy).toHaveBeenCalledWith('replay_entry', expect.any(String));
    // The message contains the replay text
    const calls = nudgeSpy.mock.calls;
    const replayCall = calls.find((c) => c[0] === 'replay_entry');
    expect(replayCall).toBeDefined();
    expect(replayCall![1]).toContain('replay');
  });
});

// ─── TC-02: nudge NOT fired for live debate (redirect path) ──────────────────
describe('TC-02 — nudge does NOT fire for live debate', () => {
  it('nudge is not called when debate status is live (redirect fires)', async () => {
    const safeRpcMock = vi.fn(async (fn: string) => {
      if (fn === 'get_arena_debate_spectator') return { data: makeDebate({ status: 'live' }), error: null };
      return { data: null, error: null };
    });

    vi.doMock('../../src/auth.ts', () => ({
      ready: Promise.resolve(),
      getSupabaseClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
      safeRpc: safeRpcMock,
      getCurrentUser: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => false),
    }));
    vi.doMock('../../src/pages/spectate.render.ts', () => ({
      showError: vi.fn(),
      renderSpectateView: vi.fn(),
      renderMessages: vi.fn(() => ''),
    }));
    vi.doMock('../../src/pages/spectate.vote.ts', () => ({ updateVoteBar: vi.fn(), updatePulse: vi.fn() }));
    vi.doMock('../../src/pages/spectate.chat.ts', () => ({ startChatPolling: vi.fn() }));
    vi.doMock('../../src/pages/spectate.state.ts', () => ({
      state: {
        sb: null, app: null, loading: null, debateId: null, debateData: null,
        pollTimer: null, chatPollTimer: null, isLoggedIn: false, chatMessages: [],
        lastChatMessageAt: null, lastRenderedMessageCount: 0, replayData: null,
      },
    }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_arena_debate_spectator: {}, get_debate_messages: {},
      get_debate_replay_data: {}, get_spectator_chat: {},
    }));
    vi.doMock('../../src/analytics.ts', () => ({}));
    vi.doMock('../../src/config.ts', () => ({
      showToast: vi.fn(),
      escapeHTML: (s: string) => s,
      friendlyError: (e: unknown) => String(e),
      placeholderMode: { supabase: false },
      SUPABASE_URL: 'https://fake.supabase.co',
      SUPABASE_ANON_KEY: 'fake-key',
      UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    }));
    vi.doMock('../../src/config.toast.ts', () => ({ showToast: vi.fn() }));

    const nudgeMod = await import('../../src/nudge.ts');
    const nudgeSpy = vi.spyOn(nudgeMod, 'nudge');

    await import('../../src/pages/spectate.ts');
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const replayCall = nudgeSpy.mock.calls.find((c) => c[0] === 'replay_entry');
    expect(replayCall).toBeUndefined();
  });
});

// ─── TC-03: nudge NOT fired for pending debate (polling starts) ───────────────
describe('TC-03 — nudge does NOT fire for pending/active debate', () => {
  it('nudge not called when debate status is pending', async () => {
    const safeRpcMock = vi.fn(async (fn: string) => {
      if (fn === 'get_arena_debate_spectator') return { data: makeDebate({ status: 'pending' }), error: null };
      if (fn === 'get_debate_messages') return { data: [], error: null };
      if (fn === 'get_spectator_chat') return { data: [], error: null };
      return { data: null, error: null };
    });

    vi.doMock('../../src/auth.ts', () => ({
      ready: Promise.resolve(),
      getSupabaseClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
      safeRpc: safeRpcMock,
      getCurrentUser: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => false),
    }));
    vi.doMock('../../src/pages/spectate.render.ts', () => ({
      showError: vi.fn(),
      renderSpectateView: vi.fn(),
      renderMessages: vi.fn(() => ''),
    }));
    vi.doMock('../../src/pages/spectate.vote.ts', () => ({ updateVoteBar: vi.fn(), updatePulse: vi.fn() }));
    vi.doMock('../../src/pages/spectate.chat.ts', () => ({ startChatPolling: vi.fn() }));
    vi.doMock('../../src/pages/spectate.state.ts', () => ({
      state: {
        sb: null, app: null, loading: null, debateId: null, debateData: null,
        pollTimer: null, chatPollTimer: null, isLoggedIn: false, chatMessages: [],
        lastChatMessageAt: null, lastRenderedMessageCount: 0, replayData: null,
      },
    }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_arena_debate_spectator: {}, get_debate_messages: {},
      get_debate_replay_data: {}, get_spectator_chat: {},
    }));
    vi.doMock('../../src/analytics.ts', () => ({}));
    vi.doMock('../../src/config.ts', () => ({
      showToast: vi.fn(),
      escapeHTML: (s: string) => s,
      friendlyError: (e: unknown) => String(e),
      placeholderMode: { supabase: false },
      SUPABASE_URL: 'https://fake.supabase.co',
      SUPABASE_ANON_KEY: 'fake-key',
      UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    }));
    vi.doMock('../../src/config.toast.ts', () => ({ showToast: vi.fn() }));

    const nudgeMod = await import('../../src/nudge.ts');
    const nudgeSpy = vi.spyOn(nudgeMod, 'nudge');

    await import('../../src/pages/spectate.ts');
    // Only advance a small amount — polling starts but replay nudge should never fire
    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();
    await Promise.resolve();

    const replayCall = nudgeSpy.mock.calls.find((c) => c[0] === 'replay_entry');
    expect(replayCall).toBeUndefined();
  });
});

// ─── TC-04: nudge suppressed on second call with same session ID ──────────────
describe('TC-04 — nudge suppressed on second call with same ID', () => {
  it('showToast fires once when nudge called twice with same id', async () => {
    const showToastSpy = vi.fn();
    vi.doMock('../../src/config.ts', () => ({
      showToast: showToastSpy,
      escapeHTML: (s: string) => s,
      friendlyError: (e: unknown) => String(e),
      placeholderMode: { supabase: false },
      SUPABASE_URL: 'https://fake.supabase.co',
      SUPABASE_ANON_KEY: 'fake-key',
    }));
    vi.doMock('../../src/config.toast.ts', () => ({ showToast: showToastSpy }));

    const { nudge } = await import('../../src/nudge.ts');

    nudge('test-id', 'First message');
    nudge('test-id', 'Second message — should be suppressed');

    expect(showToastSpy).toHaveBeenCalledTimes(1);
    expect(showToastSpy).toHaveBeenCalledWith('First message', 'info');
  });
});

// ─── TC-05: nudge suppressed when SESSION_CAP reached ────────────────────────
describe('TC-05 — nudge suppressed when SESSION_CAP (3) is reached', () => {
  it('4th nudge with new id does not call showToast', async () => {
    const showToastSpy = vi.fn();
    vi.doMock('../../src/config.ts', () => ({
      showToast: showToastSpy,
      escapeHTML: (s: string) => s,
      friendlyError: (e: unknown) => String(e),
      placeholderMode: { supabase: false },
      SUPABASE_URL: 'https://fake.supabase.co',
      SUPABASE_ANON_KEY: 'fake-key',
    }));
    vi.doMock('../../src/config.toast.ts', () => ({ showToast: showToastSpy }));

    const { nudge } = await import('../../src/nudge.ts');

    nudge('id-1', 'msg 1');
    nudge('id-2', 'msg 2');
    nudge('id-3', 'msg 3');
    nudge('id-4', 'msg 4 — should be suppressed');

    expect(showToastSpy).toHaveBeenCalledTimes(3);
  });
});

// ─── TC-06: nudge suppressed by 24h localStorage cooldown ───────────────────
describe('TC-06 — nudge suppressed by 24h localStorage cooldown', () => {
  it('does not call showToast when cooldown entry exists within 24h', async () => {
    const showToastSpy = vi.fn();
    vi.doMock('../../src/config.ts', () => ({
      showToast: showToastSpy,
      escapeHTML: (s: string) => s,
      friendlyError: (e: unknown) => String(e),
      placeholderMode: { supabase: false },
      SUPABASE_URL: 'https://fake.supabase.co',
      SUPABASE_ANON_KEY: 'fake-key',
    }));
    vi.doMock('../../src/config.toast.ts', () => ({ showToast: showToastSpy }));

    // Pre-seed localStorage with a timestamp 1 hour ago (within 24h)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    localStorage.setItem('mod_nudge_history', JSON.stringify({ 'replay_entry': oneHourAgo }));

    const { nudge } = await import('../../src/nudge.ts');
    nudge('replay_entry', 'should be suppressed by cooldown');

    expect(showToastSpy).not.toHaveBeenCalled();
  });
});

// ─── TC-07: nudge writes sessionStorage + localStorage on first fire ──────────
describe('TC-07 — nudge writes sessionStorage and localStorage on first fire', () => {
  it('persists fired state to sessionStorage and timestamp to localStorage', async () => {
    const showToastSpy = vi.fn();
    vi.doMock('../../src/config.ts', () => ({
      showToast: showToastSpy,
      escapeHTML: (s: string) => s,
      friendlyError: (e: unknown) => String(e),
      placeholderMode: { supabase: false },
      SUPABASE_URL: 'https://fake.supabase.co',
      SUPABASE_ANON_KEY: 'fake-key',
    }));
    vi.doMock('../../src/config.toast.ts', () => ({ showToast: showToastSpy }));

    const { nudge } = await import('../../src/nudge.ts');
    nudge('replay_entry', '👁️ Watching the replay. Judge for yourself.');

    expect(showToastSpy).toHaveBeenCalledOnce();

    // sessionStorage should contain replay_entry
    const sessionRaw = sessionStorage.getItem('mod_nudge_session');
    expect(sessionRaw).not.toBeNull();
    const sessionFired: string[] = JSON.parse(sessionRaw!);
    expect(sessionFired).toContain('replay_entry');

    // localStorage should contain a timestamp for replay_entry
    const historyRaw = localStorage.getItem('mod_nudge_history');
    expect(historyRaw).not.toBeNull();
    const history: Record<string, number> = JSON.parse(historyRaw!);
    expect(history['replay_entry']).toBeGreaterThan(0);
    expect(history['replay_entry']).toBeLessThanOrEqual(Date.now());
  });
});
