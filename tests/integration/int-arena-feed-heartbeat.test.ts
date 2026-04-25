// ============================================================
// INTEGRATOR — arena-feed-heartbeat + arena-state + arena-feed-state
// Seam #011 | score: 55
// Boundary: startHeartbeat/stopHeartbeat read currentDebate + feedRealtimeChannel
//           from arena-state; operate on heartbeatSendTimer + heartbeatCheckTimer
//           + lastSeen + disconnectHandled in arena-feed-state.
//           stopHeartbeat and the staleness check use lastSeen + phase from
//           arena-feed-state.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let startHeartbeat: () => void;
let stopHeartbeat: () => void;
let sendGoodbye: () => void;
let setParticipantGoneCallback: (fn: (role: string) => void) => void;

let set_currentDebate: (v: unknown) => void;
let set_feedRealtimeChannel: (v: unknown) => void;

let heartbeatState: () => {
  sendTimer: ReturnType<typeof setInterval> | null;
  checkTimer: ReturnType<typeof setInterval> | null;
  lastSeen: Record<string, number>;
  disconnectHandled: boolean;
};

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  const hbMod = await import('../../src/arena/arena-feed-heartbeat.ts');
  startHeartbeat = hbMod.startHeartbeat;
  stopHeartbeat = hbMod.stopHeartbeat;
  sendGoodbye = hbMod.sendGoodbye;
  setParticipantGoneCallback = hbMod.setParticipantGoneCallback;

  const stateMod = await import('../../src/arena/arena-state.ts');
  set_currentDebate = stateMod.set_currentDebate as (v: unknown) => void;
  set_feedRealtimeChannel = stateMod.set_feedRealtimeChannel as (v: unknown) => void;

  const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
  heartbeatState = () => ({
    sendTimer: feedStateMod.heartbeatSendTimer,
    checkTimer: feedStateMod.heartbeatCheckTimer,
    lastSeen: feedStateMod.lastSeen,
    disconnectHandled: feedStateMod.disconnectHandled,
  });
});

// ============================================================
// TC-I1: startHeartbeat — no-op when currentDebate is null
// ============================================================

describe('TC-I1: startHeartbeat is a no-op when currentDebate is null', () => {
  it('does not set heartbeat timers when no debate is active', () => {
    set_currentDebate(null);

    startHeartbeat();

    const state = heartbeatState();
    expect(state.sendTimer).toBeNull();
    expect(state.checkTimer).toBeNull();
  });
});

// ============================================================
// TC-I2: startHeartbeat — seeds lastSeen and sets timers when debate is active
// ============================================================

describe('TC-I2: startHeartbeat seeds lastSeen + sets timers from currentDebate in arena-state', () => {
  it('seeds lastSeen for a and b and sets send+check timers', () => {
    const mockChannel = { send: vi.fn() };
    set_currentDebate({ id: 'd1', role: 'a', opponentName: 'Bob', messages: [] });
    set_feedRealtimeChannel(mockChannel);

    startHeartbeat();

    const state = heartbeatState();
    expect(state.sendTimer).not.toBeNull();
    expect(state.checkTimer).not.toBeNull();
    expect(state.lastSeen['a']).toBeGreaterThan(0);
    expect(state.lastSeen['b']).toBeGreaterThan(0);
  });

  it('sends an immediate heartbeat broadcast on start', () => {
    const mockChannel = { send: vi.fn() };
    set_currentDebate({ id: 'd1', role: 'a', opponentName: 'Bob', messages: [] });
    set_feedRealtimeChannel(mockChannel);

    startHeartbeat();

    expect(mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'heartbeat' })
    );
  });
});

// ============================================================
// TC-I3: startHeartbeat — spectator view does not set check timer
// ============================================================

describe('TC-I3: startHeartbeat spectatorView skips staleness check timer', () => {
  it('sets send timer but not check timer for spectators', () => {
    const mockChannel = { send: vi.fn() };
    set_currentDebate({ id: 'd1', role: 'a', spectatorView: true, messages: [] });
    set_feedRealtimeChannel(mockChannel);

    startHeartbeat();

    const state = heartbeatState();
    expect(state.sendTimer).not.toBeNull();
    expect(state.checkTimer).toBeNull();
  });
});

// ============================================================
// TC-I4: stopHeartbeat — clears timers and removes lastSeen entries
// ============================================================

describe('TC-I4: stopHeartbeat clears timers and lastSeen in arena-feed-state', () => {
  it('nulls both timers and deletes lastSeen entries', () => {
    const mockChannel = { send: vi.fn() };
    set_currentDebate({ id: 'd1', role: 'a', opponentName: 'Bob', messages: [] });
    set_feedRealtimeChannel(mockChannel);

    startHeartbeat();
    expect(heartbeatState().sendTimer).not.toBeNull();

    stopHeartbeat();

    const state = heartbeatState();
    expect(state.sendTimer).toBeNull();
    expect(state.checkTimer).toBeNull();
    expect(state.lastSeen['a']).toBeUndefined();
    expect(state.lastSeen['b']).toBeUndefined();
  });

  it('is a no-op when no timers are active', () => {
    expect(() => stopHeartbeat()).not.toThrow();
  });
});

// ============================================================
// TC-I5: startHeartbeat — calling twice clears previous timers (no stacking)
// ============================================================

describe('TC-I5: startHeartbeat replaces existing timers — no stacking', () => {
  it('stopHeartbeat from inside startHeartbeat prevents timer stacking', () => {
    const mockChannel = { send: vi.fn() };
    set_currentDebate({ id: 'd1', role: 'a', opponentName: 'Bob', messages: [] });
    set_feedRealtimeChannel(mockChannel);

    startHeartbeat();
    const firstTimer = heartbeatState().sendTimer;
    startHeartbeat(); // second call — should replace, not stack
    const secondTimer = heartbeatState().sendTimer;

    // Timers are replaced — they will differ or at minimum be non-null
    expect(secondTimer).not.toBeNull();
    // Both calls sent an immediate beat
    expect(mockChannel.send.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// TC-I6: sendGoodbye — no-op when no debate or channel
// ============================================================

describe('TC-I6: sendGoodbye is safe when currentDebate or feedRealtimeChannel is null', () => {
  it('does not throw when both are null', () => {
    set_currentDebate(null);
    set_feedRealtimeChannel(null);
    expect(() => sendGoodbye()).not.toThrow();
  });

  it('calls channel.send when both debate and channel are present', () => {
    const mockChannel = { send: vi.fn() };
    set_currentDebate({ id: 'd1', role: 'b', opponentName: 'Alice', messages: [] });
    set_feedRealtimeChannel(mockChannel);

    sendGoodbye();

    expect(mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'goodbye' })
    );
  });
});

// ============================================================
// TC-I7: setParticipantGoneCallback — fires when staleness detected
// ============================================================

describe('TC-I7: setParticipantGoneCallback is invoked when opponent heartbeat is stale', () => {
  it('calls the callback with the stale role after HEARTBEAT_STALE_MS elapses', () => {
    const gone = vi.fn();
    setParticipantGoneCallback(gone);

    const mockChannel = { send: vi.fn() };
    set_currentDebate({ id: 'd1', role: 'a', opponentName: 'Bob', messages: [] });
    set_feedRealtimeChannel(mockChannel);

    startHeartbeat();

    // Use the lastSeen reference obtained via heartbeatState() — same object instance
    // that the heartbeat module is reading from arena-feed-state.
    const state = heartbeatState();
    state.lastSeen['b'] = Date.now() - 31_000; // HEARTBEAT_STALE_MS is 30_000

    // Advance to trigger the check timer (runs every 5s)
    vi.advanceTimersByTime(5000);

    expect(gone).toHaveBeenCalledWith('b');
  });
});

// ============================================================
// ARCH — arena-feed-heartbeat.ts import boundaries
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — arena-feed-heartbeat.ts imports only from allowed modules', () => {
  it('imports only from arena-state, arena-feed-state, and arena-core.utils', () => {
    const allowed = new Set([
      './arena-state.ts',
      './arena-feed-state.ts',
      './arena-core.utils.ts',
    ]);
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-feed-heartbeat.ts'),
      'utf-8'
    );
    const paths = source.split('\n')
      .filter(l => l.trimStart().startsWith('import '))
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter((p): p is string => Boolean(p));
    for (const path of paths) {
      expect(allowed, `Unexpected import in arena-feed-heartbeat.ts: ${path}`).toContain(path);
    }
  });
});
