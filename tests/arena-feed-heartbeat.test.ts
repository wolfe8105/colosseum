import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockFeedRealtimeChannel = vi.hoisted(() => ({ value: null as { send: ReturnType<typeof vi.fn> } | null }));

const mockPhase = vi.hoisted(() => ({ value: 'open' as string }));
const mockLastSeen = vi.hoisted(() => ({} as Record<string, number>));
const mockHeartbeatSendTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockHeartbeatCheckTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockDisconnectHandled = vi.hoisted(() => ({ value: false }));
const mockHEARTBEAT_INTERVAL_MS = vi.hoisted(() => 10000);
const mockHEARTBEAT_STALE_MS = vi.hoisted(() => 25000);

const mockSet_heartbeatSendTimer = vi.hoisted(() => vi.fn((v: ReturnType<typeof setInterval> | null) => { mockHeartbeatSendTimer.value = v; }));
const mockSet_heartbeatCheckTimer = vi.hoisted(() => vi.fn((v: ReturnType<typeof setInterval> | null) => { mockHeartbeatCheckTimer.value = v; }));
const mockSet_disconnectHandled = vi.hoisted(() => vi.fn((v: boolean) => { mockDisconnectHandled.value = v; }));

const mockIsPlaceholder = vi.hoisted(() => ({ value: false }));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
  get feedRealtimeChannel() { return mockFeedRealtimeChannel.value; },
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get phase() { return mockPhase.value; },
  get lastSeen() { return mockLastSeen; },
  get heartbeatSendTimer() { return mockHeartbeatSendTimer.value; },
  get heartbeatCheckTimer() { return mockHeartbeatCheckTimer.value; },
  get disconnectHandled() { return mockDisconnectHandled.value; },
  get HEARTBEAT_INTERVAL_MS() { return mockHEARTBEAT_INTERVAL_MS; },
  get HEARTBEAT_STALE_MS() { return mockHEARTBEAT_STALE_MS; },
  set_heartbeatSendTimer: mockSet_heartbeatSendTimer,
  set_heartbeatCheckTimer: mockSet_heartbeatCheckTimer,
  set_disconnectHandled: mockSet_disconnectHandled,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  get isPlaceholder() { return () => mockIsPlaceholder.value; },
}));

import { setParticipantGoneCallback, startHeartbeat, stopHeartbeat, sendGoodbye } from '../src/arena/arena-feed-heartbeat.ts';

describe('TC1 — setParticipantGoneCallback registers callback', () => {
  it('accepts a callback without throwing', () => {
    expect(() => setParticipantGoneCallback(vi.fn())).not.toThrow();
  });
});

describe('TC2 — stopHeartbeat clears timers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeartbeatSendTimer.value = null;
    mockHeartbeatCheckTimer.value = null;
    mockLastSeen['a'] = Date.now();
    mockLastSeen['b'] = Date.now();
    mockLastSeen['mod'] = Date.now();
  });

  it('does not crash when timers are null', () => {
    expect(() => stopHeartbeat()).not.toThrow();
  });

  it('calls set_heartbeatSendTimer(null) when active', () => {
    mockHeartbeatSendTimer.value = setInterval(() => {}, 99999);
    stopHeartbeat();
    expect(mockSet_heartbeatSendTimer).toHaveBeenCalledWith(null);
  });

  it('calls set_heartbeatCheckTimer(null) when active', () => {
    mockHeartbeatCheckTimer.value = setInterval(() => {}, 99999);
    stopHeartbeat();
    expect(mockSet_heartbeatCheckTimer).toHaveBeenCalledWith(null);
  });

  it('removes lastSeen entries', () => {
    stopHeartbeat();
    expect(mockLastSeen['a']).toBeUndefined();
    expect(mockLastSeen['b']).toBeUndefined();
    expect(mockLastSeen['mod']).toBeUndefined();
  });
});

describe('TC3 — startHeartbeat with valid debate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockHeartbeatSendTimer.value = null;
    mockHeartbeatCheckTimer.value = null;
    mockIsPlaceholder.value = false;
    mockCurrentDebate.value = {
      role: 'a',
      modView: false,
      spectatorView: false,
      moderatorId: null,
    };
    const sendMock = vi.fn();
    mockFeedRealtimeChannel.value = { send: sendMock };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns early when currentDebate is null', () => {
    mockCurrentDebate.value = null;
    startHeartbeat();
    expect(mockSet_heartbeatSendTimer).not.toHaveBeenCalled();
  });

  it('returns early in placeholder mode', () => {
    mockIsPlaceholder.value = true;
    startHeartbeat();
    expect(mockSet_heartbeatSendTimer).not.toHaveBeenCalled();
  });

  it('calls set_heartbeatSendTimer with interval', () => {
    startHeartbeat();
    expect(mockSet_heartbeatSendTimer).toHaveBeenCalledWith(expect.any(Object));
  });

  it('sends heartbeat immediately on start', () => {
    startHeartbeat();
    expect(mockFeedRealtimeChannel.value?.send).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'heartbeat' })
    );
  });

  it('calls set_disconnectHandled(false)', () => {
    startHeartbeat();
    expect(mockSet_disconnectHandled).toHaveBeenCalledWith(false);
  });

  it('seeds lastSeen for a and b', () => {
    startHeartbeat();
    expect(mockLastSeen['a']).toBeGreaterThan(0);
    expect(mockLastSeen['b']).toBeGreaterThan(0);
  });

  it('does not set heartbeatCheckTimer for spectators', () => {
    mockCurrentDebate.value = { role: 'a', modView: false, spectatorView: true };
    startHeartbeat();
    expect(mockSet_heartbeatCheckTimer).not.toHaveBeenCalled();
  });

  it('sets heartbeatCheckTimer for non-spectator debaters', () => {
    startHeartbeat();
    expect(mockSet_heartbeatCheckTimer).toHaveBeenCalledWith(expect.any(Object));
  });
});

describe('TC4 — sendGoodbye broadcasts goodbye event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when currentDebate is null', () => {
    mockCurrentDebate.value = null;
    const sendMock = vi.fn();
    mockFeedRealtimeChannel.value = { send: sendMock };
    sendGoodbye();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('does nothing when feedRealtimeChannel is null', () => {
    mockCurrentDebate.value = { role: 'a', modView: false, spectatorView: false };
    mockFeedRealtimeChannel.value = null;
    expect(() => sendGoodbye()).not.toThrow();
  });

  it('sends goodbye event with correct role', () => {
    mockCurrentDebate.value = { role: 'b', modView: false, spectatorView: false };
    const sendMock = vi.fn();
    mockFeedRealtimeChannel.value = { send: sendMock };
    sendGoodbye();
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'goodbye', payload: expect.objectContaining({ role: 'b' }) })
    );
  });

  it('sends goodbye with role "mod" for mod view', () => {
    mockCurrentDebate.value = { role: 'a', modView: true, spectatorView: false };
    const sendMock = vi.fn();
    mockFeedRealtimeChannel.value = { send: sendMock };
    sendGoodbye();
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ role: 'mod' }) })
    );
  });
});

describe('ARCH — arena-feed-heartbeat.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './arena-state.ts',
      './arena-feed-state.ts',
      './arena-core.utils.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-heartbeat.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
