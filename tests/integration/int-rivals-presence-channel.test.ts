/**
 * Integration tests — src/rivals-presence-channel.ts → async
 * SEAM: #395
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================================
// ARCH FILTER
// ============================================================
const sourceLines = readFileSync(
  resolve(__dirname, '../../src/rivals-presence-channel.ts'),
  'utf-8'
).split('\n').filter((l) => /from\s+['"]/.test(l));

// ============================================================
// HOISTED MOCKS — only @supabase/supabase-js
// ============================================================

const mockTrack = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockSubscribeCb = vi.hoisted(() => ({ fn: null as ((status: string, err?: Error) => void) | null }));

const mockChannel = vi.hoisted(() => {
  const presenceHandlers: Record<string, (payload: unknown) => void> = {};
  return {
    on: vi.fn((type: string, filter: { event: string }, handler: (payload: unknown) => void) => {
      presenceHandlers[filter.event] = handler;
      return mockChannel;
    }),
    subscribe: vi.fn((cb: (status: string, err?: Error) => void) => {
      mockSubscribeCb.fn = cb;
      return mockChannel;
    }),
    track: mockTrack,
    _presenceHandlers: presenceHandlers,
  };
});

const mockRemoveChannel = vi.hoisted(() => vi.fn());
const mockSetAuth = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
    realtime: { setAuth: mockSetAuth },
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  })),
}));

// ============================================================
// BEFORE EACH — reset modules + re-import per test
// ============================================================

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  mockTrack.mockClear();
  mockRemoveChannel.mockClear();
  mockSetAuth.mockClear();
  mockChannel.on.mockClear();
  mockChannel.subscribe.mockClear();
  mockSubscribeCb.fn = null;

  // Reset presence handlers map
  const handlers = (mockChannel as unknown as { _presenceHandlers: Record<string, (p: unknown) => void> })._presenceHandlers;
  for (const k of Object.keys(handlers)) delete handlers[k];
});

// ============================================================
// TC1 — buildRivalSet populates accepted rivals, skips pending
// ============================================================
describe('TC1 — buildRivalSet populates accepted rivals, skips pending', () => {
  it('adds active rival_ids to rivalSet and ignores pending entries', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn(),
      getCurrentUser: vi.fn(),
      getCurrentProfile: vi.fn().mockReturnValue(null),
      getMyRivals: vi.fn().mockResolvedValue([
        { id: 'rel-1', rival_id: 'uid-active-1', status: 'active', direction: 'sent' },
        { id: 'rel-2', rival_id: 'uid-pending', status: 'pending', direction: 'received' },
        { id: 'rel-3', rival_id: 'uid-active-2', status: 'active', direction: 'received' },
      ]),
      ready: Promise.resolve(),
    }));

    const { buildRivalSet } = await import('../../src/rivals-presence-channel.ts');
    const rivalSet = new Set<string>();
    await buildRivalSet(rivalSet);

    expect(rivalSet.has('uid-active-1')).toBe(true);
    expect(rivalSet.has('uid-active-2')).toBe(true);
    expect(rivalSet.has('uid-pending')).toBe(false);
    expect(rivalSet.size).toBe(2);
  });
});

// ============================================================
// TC2 — buildRivalSet clears stale IDs; error leaves set empty
// ============================================================
describe('TC2 — buildRivalSet clears stale IDs; on error leaves set empty', () => {
  it('clears existing entries and leaves set empty when getMyRivals rejects', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn(),
      getCurrentUser: vi.fn(),
      getCurrentProfile: vi.fn().mockReturnValue(null),
      getMyRivals: vi.fn().mockRejectedValue(new Error('network error')),
      ready: Promise.resolve(),
    }));

    const { buildRivalSet } = await import('../../src/rivals-presence-channel.ts');
    const rivalSet = new Set<string>(['stale-uid-1', 'stale-uid-2']);
    await buildRivalSet(rivalSet);

    expect(rivalSet.size).toBe(0);
  });
});

// ============================================================
// TC3 — startPresence returns early when supabase client is null
// ============================================================
describe('TC3 — startPresence returns early when getSupabaseClient returns null', () => {
  it('does not create a channel when supabase client is unavailable', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn().mockReturnValue(null),
      getCurrentUser: vi.fn().mockReturnValue({ id: 'user-123' }),
      getCurrentProfile: vi.fn().mockReturnValue(null),
      getMyRivals: vi.fn().mockResolvedValue([]),
      ready: Promise.resolve(),
    }));

    const { startPresence } = await import('../../src/rivals-presence-channel.ts');
    const onAlert = vi.fn();
    const state = {
      rivalSet: new Set<string>(),
      onlineRivals: new Set<string>(),
      channelRef: { value: null as unknown },
      onAlert,
    };

    await startPresence(state as Parameters<typeof startPresence>[0]);

    // channel() should never have been called since supabase is null
    expect(mockChannel.subscribe).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC4 — startPresence returns early when user is null
// ============================================================
describe('TC4 — startPresence returns early when getCurrentUser returns null', () => {
  it('does not create a channel when no authenticated user', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn().mockReturnValue({
        channel: vi.fn(() => mockChannel),
        removeChannel: mockRemoveChannel,
        realtime: { setAuth: mockSetAuth },
      }),
      getCurrentUser: vi.fn().mockReturnValue(null),
      getCurrentProfile: vi.fn().mockReturnValue(null),
      getMyRivals: vi.fn().mockResolvedValue([]),
      ready: Promise.resolve(),
    }));

    const { startPresence } = await import('../../src/rivals-presence-channel.ts');
    const onAlert = vi.fn();
    const state = {
      rivalSet: new Set<string>(),
      onlineRivals: new Set<string>(),
      channelRef: { value: null as unknown },
      onAlert,
    };

    await startPresence(state as Parameters<typeof startPresence>[0]);

    expect(mockChannel.subscribe).not.toHaveBeenCalled();
    expect(mockRemoveChannel).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC5 — startPresence removes existing channel before creating new one
// ============================================================
describe('TC5 — startPresence removes existing channel before creating new one', () => {
  it('calls removeChannel on the old channelRef.value before re-subscribing', async () => {
    const fakeOldChannel = { _old: true } as unknown;
    const fakeSupa = {
      channel: vi.fn(() => mockChannel),
      removeChannel: mockRemoveChannel,
      realtime: { setAuth: mockSetAuth },
    };

    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn().mockReturnValue(fakeSupa),
      getCurrentUser: vi.fn().mockReturnValue({ id: 'user-abc' }),
      getCurrentProfile: vi.fn().mockReturnValue({ username: 'tester', display_name: 'Tester' }),
      getMyRivals: vi.fn().mockResolvedValue([]),
      ready: Promise.resolve(),
    }));

    const { startPresence } = await import('../../src/rivals-presence-channel.ts');
    const onAlert = vi.fn();
    const state = {
      rivalSet: new Set<string>(),
      onlineRivals: new Set<string>(),
      channelRef: { value: fakeOldChannel },
      onAlert,
    };

    await startPresence(state as Parameters<typeof startPresence>[0]);

    expect(mockRemoveChannel).toHaveBeenCalledWith(fakeOldChannel);
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });
});

// ============================================================
// TC6 — presence join fires onAlert for known rival
// ============================================================
describe('TC6 — presence join fires onAlert for a known rival', () => {
  it('calls onAlert and adds rival to onlineRivals when a rival joins', async () => {
    const fakeSupa = {
      channel: vi.fn(() => mockChannel),
      removeChannel: mockRemoveChannel,
      realtime: { setAuth: mockSetAuth },
    };

    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn().mockReturnValue(fakeSupa),
      getCurrentUser: vi.fn().mockReturnValue({ id: 'me-user' }),
      getCurrentProfile: vi.fn().mockReturnValue({ username: 'me', display_name: 'Me' }),
      getMyRivals: vi.fn().mockResolvedValue([]),
      ready: Promise.resolve(),
    }));

    const { startPresence } = await import('../../src/rivals-presence-channel.ts');
    const onAlert = vi.fn();
    const onlineRivals = new Set<string>();
    const rivalSet = new Set<string>(['rival-uid-1']);

    const state = {
      rivalSet,
      onlineRivals,
      channelRef: { value: null as unknown },
      onAlert,
    };

    await startPresence(state as Parameters<typeof startPresence>[0]);

    // Retrieve the join handler registered via .on('presence', {event:'join'}, ...)
    const onCall = mockChannel.on.mock.calls.find(
      (c: unknown[]) => (c[1] as { event: string }).event === 'join'
    );
    expect(onCall).toBeDefined();
    const joinHandler = onCall![2] as (payload: { newPresences: unknown[] }) => void;

    joinHandler({
      newPresences: [
        { user_id: 'rival-uid-1', username: 'rival1', display_name: 'Rival One' },
      ],
    });

    expect(onAlert).toHaveBeenCalledOnce();
    expect(onAlert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'rival-uid-1' })
    );
    expect(onlineRivals.has('rival-uid-1')).toBe(true);
  });
});

// ============================================================
// TC7 — presence leave removes rival from onlineRivals
// ============================================================
describe('TC7 — presence leave removes rival from onlineRivals', () => {
  it('deletes rival from onlineRivals on leave, allowing future re-alert', async () => {
    const fakeSupa = {
      channel: vi.fn(() => mockChannel),
      removeChannel: mockRemoveChannel,
      realtime: { setAuth: mockSetAuth },
    };

    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn().mockReturnValue(fakeSupa),
      getCurrentUser: vi.fn().mockReturnValue({ id: 'me-user' }),
      getCurrentProfile: vi.fn().mockReturnValue({ username: 'me', display_name: 'Me' }),
      getMyRivals: vi.fn().mockResolvedValue([]),
      ready: Promise.resolve(),
    }));

    const { startPresence } = await import('../../src/rivals-presence-channel.ts');
    const onAlert = vi.fn();
    const onlineRivals = new Set<string>(['rival-uid-x']);
    const rivalSet = new Set<string>(['rival-uid-x']);

    const state = {
      rivalSet,
      onlineRivals,
      channelRef: { value: null as unknown },
      onAlert,
    };

    await startPresence(state as Parameters<typeof startPresence>[0]);

    const onCall = mockChannel.on.mock.calls.find(
      (c: unknown[]) => (c[1] as { event: string }).event === 'leave'
    );
    expect(onCall).toBeDefined();
    const leaveHandler = onCall![2] as (payload: { leftPresences: unknown[] }) => void;

    leaveHandler({
      leftPresences: [
        { user_id: 'rival-uid-x', username: 'rivalx', display_name: 'Rival X' },
      ],
    });

    expect(onlineRivals.has('rival-uid-x')).toBe(false);
    // onAlert should NOT have been called for a leave event
    expect(onAlert).not.toHaveBeenCalled();
  });
});
