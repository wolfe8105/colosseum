/**
 * Integration tests: src/dm/dm.ts → dependency-clamps
 * SEAM #381
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockRpc = vi.hoisted(() => vi.fn());
const mockChannel = vi.hoisted(() => vi.fn());
const mockRemoveChannel = vi.hoisted(() => vi.fn());
const mockSubscribeCb = vi.hoisted(() => vi.fn());

const mockChannelObj = vi.hoisted(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn((cb?: (status: string, err?: Error) => void) => {
    if (cb) mockSubscribeCb.mockImplementation(cb);
    return mockChannelObj;
  }),
}));

const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

const mockTrackEvent = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    auth: mockAuth,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

// ── beforeEach ─────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  mockRpc.mockReset();
  mockChannel.mockReset();
  mockRemoveChannel.mockReset();
  mockSubscribeCb.mockReset();
  mockTrackEvent.mockReset();
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockAuth.onAuthStateChange.mockReset();

  mockRpc.mockResolvedValue({ data: null, error: null });
  mockChannel.mockReturnValue(mockChannelObj);
  mockChannelObj.on.mockReturnThis();
  mockChannelObj.subscribe.mockImplementation((cb?: (status: string, err?: Error) => void) => {
    if (cb) mockSubscribeCb.mockImplementation(cb);
    return mockChannelObj;
  });

  // Provide minimal DOM
  document.body.innerHTML = `
    <div id="screen-dm"></div>
    <div id="dm-dot" style="display:none"></div>
  `;
});

// ── TC1: ARCH filter — dm.ts imports from dependency-clamps ───────────────────

describe('TC1 — ARCH: dm.ts imports clampRealtime from dependency-clamps', () => {
  it('import line uses from keyword pointing to dependency-clamps', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/dm/dm.ts'),
      'utf8',
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const clampsImport = importLines.find(l => l.includes('dependency-clamps'));
    expect(clampsImport).toBeDefined();
    expect(clampsImport).toMatch(/clampRealtime/);
  });
});

// ── TC2: clampRealtime — first SUBSCRIBED (no prior disconnect) ───────────────

describe('TC2 — clampRealtime SUBSCRIBED from cold (no trackEvent fired)', () => {
  it('does not fire trackEvent when first subscribing with no prior disconnect', async () => {
    // Mock analytics before importing clamps so trackEvent is captured
    vi.doMock('../../src/analytics.ts', () => ({
      trackEvent: mockTrackEvent,
    }));

    const { clampRealtime } = await import('../../src/contracts/dependency-clamps.ts');

    clampRealtime('SUBSCRIBED', 'dm:test-thread-1');

    // On fresh state, no reconnect event should fire (no _realtimeDisconnectAt)
    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      'clamp:realtime:reconnect',
      expect.anything(),
    );
  });
});

// ── TC3: clampRealtime — TIMED_OUT fires disconnect event ────────────────────

describe('TC3 — clampRealtime TIMED_OUT fires clamp:realtime:disconnect', () => {
  it('fires trackEvent with channel and status when connected→TIMED_OUT', async () => {
    vi.doMock('../../src/analytics.ts', () => ({
      trackEvent: mockTrackEvent,
    }));

    const { clampRealtime } = await import('../../src/contracts/dependency-clamps.ts');

    // First connect, then timeout
    clampRealtime('SUBSCRIBED', 'dm:thread-abc');
    clampRealtime('TIMED_OUT', 'dm:thread-abc');

    expect(mockTrackEvent).toHaveBeenCalledWith('clamp:realtime:disconnect', {
      channel: 'dm:thread-abc',
      status: 'TIMED_OUT',
    });
  });
});

// ── TC4: clampRealtime — CLOSED fires disconnect event ───────────────────────

describe('TC4 — clampRealtime CLOSED fires clamp:realtime:disconnect', () => {
  it('fires trackEvent with channel and status:CLOSED when connected→CLOSED', async () => {
    vi.doMock('../../src/analytics.ts', () => ({
      trackEvent: mockTrackEvent,
    }));

    const { clampRealtime } = await import('../../src/contracts/dependency-clamps.ts');

    clampRealtime('SUBSCRIBED', 'dm:thread-xyz');
    clampRealtime('CLOSED', 'dm:thread-xyz');

    expect(mockTrackEvent).toHaveBeenCalledWith('clamp:realtime:disconnect', {
      channel: 'dm:thread-xyz',
      status: 'CLOSED',
    });
  });
});

// ── TC5: clampRealtime — CHANNEL_ERROR fires error event ─────────────────────

describe('TC5 — clampRealtime CHANNEL_ERROR fires clamp:realtime:error', () => {
  it('fires trackEvent with channel and error message on CHANNEL_ERROR', async () => {
    vi.doMock('../../src/analytics.ts', () => ({
      trackEvent: mockTrackEvent,
    }));

    const { clampRealtime } = await import('../../src/contracts/dependency-clamps.ts');

    const err = new Error('WebSocket closed unexpectedly');
    clampRealtime('CHANNEL_ERROR', 'dm:thread-err', err);

    expect(mockTrackEvent).toHaveBeenCalledWith('clamp:realtime:error', {
      channel: 'dm:thread-err',
      error: 'WebSocket closed unexpectedly',
    });
  });
});

// ── TC6: clampRealtime — reconnect event includes downtime_ms ────────────────

describe('TC6 — clampRealtime reconnect event fires with downtime_ms', () => {
  it('fires clamp:realtime:reconnect with downtime_ms when reconnecting after disconnect', async () => {
    vi.doMock('../../src/analytics.ts', () => ({
      trackEvent: mockTrackEvent,
    }));

    const { clampRealtime } = await import('../../src/contracts/dependency-clamps.ts');

    // Connect → disconnect → reconnect
    clampRealtime('SUBSCRIBED', 'dm:thread-reconnect');
    clampRealtime('TIMED_OUT', 'dm:thread-reconnect');
    clampRealtime('SUBSCRIBED', 'dm:thread-reconnect');

    const calls = mockTrackEvent.mock.calls;
    const reconnectCall = calls.find(([evt]) => evt === 'clamp:realtime:reconnect');
    expect(reconnectCall).toBeDefined();
    expect(reconnectCall![1]).toMatchObject({
      channel: 'dm:thread-reconnect',
      downtime_ms: expect.any(Number),
    });
  });
});

// ── TC7: fetchThreads calls safeRpc('get_dm_threads') ────────────────────────

describe('TC7 — fetchThreads calls safeRpc get_dm_threads and sets state', () => {
  it('calls rpc with get_dm_threads and populates threads state', async () => {
    const threads = [
      {
        thread_id: 'tid-001',
        other_user_id: 'uid-999',
        other_username: 'debater99',
        other_display_name: 'Debater 99',
        last_message: 'Good debate!',
        last_at: '2026-04-25T00:00:00Z',
        unread_count: 2,
      },
    ];

    mockRpc.mockResolvedValueOnce({
      data: { threads },
      error: null,
    });

    const { fetchThreads } = await import('../../src/dm/dm.fetch.ts');
    await fetchThreads();

    expect(mockRpc).toHaveBeenCalledWith('get_dm_threads', expect.anything());

    // Verify state was set
    const { threads: stateThreads } = await import('../../src/dm/dm.state.ts');
    expect(stateThreads).toEqual(threads);
  });
});

// ── SEAM #537: dm.ts → dm.state ───────────────────────────────────────────────

// ── TC8: setActiveThreadId sets and clears activeThreadId ────────────────────

describe('TC8 — setActiveThreadId stores and clears activeThreadId in dm.state', () => {
  it('sets activeThreadId to a string value then back to null', async () => {
    const { setActiveThreadId, activeThreadId: initial } = await import('../../src/dm/dm.state.ts');
    expect(initial).toBeNull();

    setActiveThreadId('thread-abc');
    const { activeThreadId: afterSet } = await import('../../src/dm/dm.state.ts');
    expect(afterSet).toBe('thread-abc');

    setActiveThreadId(null);
    const { activeThreadId: afterClear } = await import('../../src/dm/dm.state.ts');
    expect(afterClear).toBeNull();
  });
});

// ── TC9: setActiveMessages sets and clears activeMessages ────────────────────

describe('TC9 — setActiveMessages populates and clears the activeMessages array', () => {
  it('sets activeMessages to a list of messages then clears it via empty array', async () => {
    const { setActiveMessages } = await import('../../src/dm/dm.state.ts');

    const msgs = [
      { id: 'msg-1', sender_id: 'uid-100', body: 'Hello!', created_at: '2026-04-26T10:00:00Z', read_at: null },
      { id: 'msg-2', sender_id: 'uid-200', body: 'Hey there', created_at: '2026-04-26T10:01:00Z', read_at: '2026-04-26T10:02:00Z' },
    ];
    setActiveMessages(msgs);

    const { activeMessages: afterSet } = await import('../../src/dm/dm.state.ts');
    expect(afterSet).toHaveLength(2);
    expect(afterSet[0].body).toBe('Hello!');

    setActiveMessages([]);
    const { activeMessages: afterClear } = await import('../../src/dm/dm.state.ts');
    expect(afterClear).toHaveLength(0);
  });
});

// ── TC10: setThreads populates threads array ──────────────────────────────────

describe('TC10 — setThreads populates the threads array in dm.state', () => {
  it('sets threads array and reflects it in exported state', async () => {
    const { setThreads } = await import('../../src/dm/dm.state.ts');

    const newThreads = [
      {
        thread_id: 'tid-999',
        other_user_id: 'uid-555',
        other_username: 'fighter55',
        other_display_name: 'Fighter 55',
        last_message: 'Great match!',
        last_at: '2026-04-26T09:00:00Z',
        unread_count: 0,
      },
    ];
    setThreads(newThreads);

    const { threads: stateThreads } = await import('../../src/dm/dm.state.ts');
    expect(stateThreads).toHaveLength(1);
    expect(stateThreads[0].thread_id).toBe('tid-999');
    expect(stateThreads[0].other_username).toBe('fighter55');
  });
});

// ── TC11: setIsLoadingThreads toggles isLoadingThreads ───────────────────────

describe('TC11 — setIsLoadingThreads toggles isLoadingThreads in dm.state', () => {
  it('sets isLoadingThreads true then false', async () => {
    const { setIsLoadingThreads, isLoadingThreads: initial } = await import('../../src/dm/dm.state.ts');
    expect(initial).toBe(false);

    setIsLoadingThreads(true);
    const { isLoadingThreads: afterTrue } = await import('../../src/dm/dm.state.ts');
    expect(afterTrue).toBe(true);

    setIsLoadingThreads(false);
    const { isLoadingThreads: afterFalse } = await import('../../src/dm/dm.state.ts');
    expect(afterFalse).toBe(false);
  });
});

// ── TC12: setIsLoadingMessages toggles isLoadingMessages ─────────────────────

describe('TC12 — setIsLoadingMessages toggles isLoadingMessages in dm.state', () => {
  it('sets isLoadingMessages true then false', async () => {
    const { setIsLoadingMessages, isLoadingMessages: initial } = await import('../../src/dm/dm.state.ts');
    expect(initial).toBe(false);

    setIsLoadingMessages(true);
    const { isLoadingMessages: afterTrue } = await import('../../src/dm/dm.state.ts');
    expect(afterTrue).toBe(true);

    setIsLoadingMessages(false);
    const { isLoadingMessages: afterFalse } = await import('../../src/dm/dm.state.ts');
    expect(afterFalse).toBe(false);
  });
});

// ── TC13: setUnreadTotal updates unreadTotal ──────────────────────────────────

describe('TC13 — setUnreadTotal updates unreadTotal in dm.state', () => {
  it('sets unreadTotal to a positive number then back to zero', async () => {
    const { setUnreadTotal, unreadTotal: initial } = await import('../../src/dm/dm.state.ts');
    expect(initial).toBe(0);

    setUnreadTotal(5);
    const { unreadTotal: afterFive } = await import('../../src/dm/dm.state.ts');
    expect(afterFive).toBe(5);

    setUnreadTotal(0);
    const { unreadTotal: afterZero } = await import('../../src/dm/dm.state.ts');
    expect(afterZero).toBe(0);
  });
});

// ── TC14: fetchMessages calls safeRpc get_dm_messages and sets activeMessages ─

describe('TC14 — fetchMessages calls safeRpc get_dm_messages and updates dm.state', () => {
  it('calls rpc with get_dm_messages and populates activeMessages via setActiveMessages', async () => {
    const msgs = [
      { id: 'msg-10', sender_id: 'uid-A', body: 'Opening argument', created_at: '2026-04-26T08:00:00Z', read_at: null },
    ];

    mockRpc.mockResolvedValueOnce({
      data: { messages: msgs },
      error: null,
    });

    const { fetchMessages } = await import('../../src/dm/dm.fetch.ts');
    const result = await fetchMessages('thread-123');

    expect(mockRpc).toHaveBeenCalledWith('get_dm_messages', expect.objectContaining({ p_thread_id: 'thread-123' }));
    expect(result).toHaveLength(1);
    expect(result[0].body).toBe('Opening argument');

    const { activeMessages } = await import('../../src/dm/dm.state.ts');
    expect(activeMessages).toHaveLength(1);
    expect(activeMessages[0].id).toBe('msg-10');
  });
});

// ── TC15: ARCH — dm.ts imports from dm.state ─────────────────────────────────

describe('TC15 — ARCH: dm.ts imports state and setters from dm.state', () => {
  it('source file imports threads, activeThreadId, activeMessages, setActiveThreadId, setActiveMessages', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/dm/dm.ts'),
      'utf8',
    );
    // The dm.state import spans multiple lines — match the entire import block
    const stateImportMatch = src.match(/import\s+\{[^}]*\}\s+from\s+['"]\.\/dm\.state(?:\.ts)?['"]/s);
    expect(stateImportMatch).not.toBeNull();
    const stateImportBlock = stateImportMatch![0];
    expect(stateImportBlock).toMatch(/threads/);
    expect(stateImportBlock).toMatch(/activeThreadId/);
    expect(stateImportBlock).toMatch(/activeMessages/);
    expect(stateImportBlock).toMatch(/setActiveThreadId/);
    expect(stateImportBlock).toMatch(/setActiveMessages/);
  });
});
