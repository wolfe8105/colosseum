import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetSupabaseClient = vi.hoisted(() => vi.fn().mockReturnValue({}));
const mockGetAccessToken = vi.hoisted(() => vi.fn().mockResolvedValue('tok-123'));
const mockSetRealtimeAuth = vi.hoisted(() => vi.fn());
const mockCreateChannel = vi.hoisted(() => vi.fn());
const mockRemoveChannel = vi.hoisted(() => vi.fn());
const mockClampRealtime = vi.hoisted(() => vi.fn());

const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockFeedRealtimeChannel = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockSet_feedRealtimeChannel = vi.hoisted(() => vi.fn((v: Record<string, unknown> | null) => { mockFeedRealtimeChannel.value = v; }));

const mockLastSeen = vi.hoisted(() => ({} as Record<string, number>));

const mockAppendFeedEvent = vi.hoisted(() => vi.fn());
const mockStartHeartbeat = vi.hoisted(() => vi.fn());
const mockStopHeartbeat = vi.hoisted(() => vi.fn());
const mockSendGoodbye = vi.hoisted(() => vi.fn());
const mockSetParticipantGoneCallback = vi.hoisted(() => vi.fn());
const mockHandleParticipantGone = vi.hoisted(() => vi.fn());
const mockModNullDebate = vi.hoisted(() => vi.fn());
const mockIsPlaceholder = vi.hoisted(() => ({ value: false }));

vi.mock('../src/auth.ts', () => ({
  getSupabaseClient: mockGetSupabaseClient,
}));

vi.mock('../src/arena/arena-realtime-client.ts', () => ({
  getAccessToken: mockGetAccessToken,
  setRealtimeAuth: mockSetRealtimeAuth,
  createChannel: mockCreateChannel,
  removeChannel: mockRemoveChannel,
}));

vi.mock('../src/contracts/dependency-clamps.ts', () => ({
  clampRealtime: mockClampRealtime,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
  get feedRealtimeChannel() { return mockFeedRealtimeChannel.value; },
  set_feedRealtimeChannel: mockSet_feedRealtimeChannel,
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get lastSeen() { return mockLastSeen; },
}));

vi.mock('../src/arena/arena-feed-room.ts', () => ({
  appendFeedEvent: mockAppendFeedEvent,
}));

vi.mock('../src/arena/arena-feed-heartbeat.ts', () => ({
  startHeartbeat: mockStartHeartbeat,
  stopHeartbeat: mockStopHeartbeat,
  sendGoodbye: mockSendGoodbye,
  setParticipantGoneCallback: mockSetParticipantGoneCallback,
}));

vi.mock('../src/arena/arena-feed-disconnect.ts', () => ({
  handleParticipantGone: mockHandleParticipantGone,
  modNullDebate: mockModNullDebate,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  get isPlaceholder() { return () => mockIsPlaceholder.value; },
}));

// Channel mock with chainable .on() and .subscribe()
function makeChannelMock() {
  const ch: Record<string, unknown> = {};
  ch.on = vi.fn().mockReturnValue(ch);
  ch.subscribe = vi.fn().mockReturnValue(ch);
  return ch;
}

import { subscribeRealtime, unsubscribeRealtime } from '../src/arena/arena-feed-realtime.ts';

describe('TC1 — subscribeRealtime subscribes to channel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPlaceholder.value = false;
    mockFeedRealtimeChannel.value = null;
    mockGetSupabaseClient.mockReturnValue({});
    const ch = makeChannelMock();
    mockCreateChannel.mockReturnValue(ch);
  });

  it('returns early when client is null', async () => {
    mockGetSupabaseClient.mockReturnValue(null);
    await subscribeRealtime('deb-1');
    expect(mockCreateChannel).not.toHaveBeenCalled();
  });

  it('returns early in placeholder mode', async () => {
    mockIsPlaceholder.value = true;
    await subscribeRealtime('deb-1');
    expect(mockCreateChannel).not.toHaveBeenCalled();
  });

  it('calls getAccessToken', async () => {
    await subscribeRealtime('deb-1');
    expect(mockGetAccessToken).toHaveBeenCalled();
  });

  it('calls setRealtimeAuth when token available', async () => {
    await subscribeRealtime('deb-1');
    expect(mockSetRealtimeAuth).toHaveBeenCalledWith(expect.anything(), 'tok-123');
  });

  it('calls createChannel with feed:debateId', async () => {
    await subscribeRealtime('deb-1');
    expect(mockCreateChannel).toHaveBeenCalledWith(expect.anything(), 'feed:deb-1', expect.any(Object));
  });

  it('calls set_feedRealtimeChannel with the channel', async () => {
    await subscribeRealtime('deb-1');
    expect(mockSet_feedRealtimeChannel).toHaveBeenCalled();
  });

  it('calls startHeartbeat', async () => {
    await subscribeRealtime('deb-1');
    expect(mockStartHeartbeat).toHaveBeenCalled();
  });

  it('tears down existing channel before subscribing', async () => {
    const existingCh = makeChannelMock();
    mockFeedRealtimeChannel.value = existingCh as never;
    await subscribeRealtime('deb-1');
    expect(mockRemoveChannel).toHaveBeenCalled();
    expect(mockStopHeartbeat).toHaveBeenCalled();
  });
});

describe('TC2 — unsubscribeRealtime cleans up', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not crash when client is null', () => {
    mockGetSupabaseClient.mockReturnValue(null);
    expect(() => unsubscribeRealtime()).not.toThrow();
  });

  it('calls removeChannel when channel exists', () => {
    const ch = makeChannelMock();
    mockFeedRealtimeChannel.value = ch as never;
    mockGetSupabaseClient.mockReturnValue({});
    unsubscribeRealtime();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('calls stopHeartbeat', () => {
    unsubscribeRealtime();
    expect(mockStopHeartbeat).toHaveBeenCalled();
  });

  it('sets feedRealtimeChannel to null', () => {
    const ch = makeChannelMock();
    mockFeedRealtimeChannel.value = ch as never;
    mockGetSupabaseClient.mockReturnValue({});
    unsubscribeRealtime();
    expect(mockSet_feedRealtimeChannel).toHaveBeenCalledWith(null);
  });
});

describe('ARCH — arena-feed-realtime.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      './arena-realtime-client.ts',
      '../contracts/dependency-clamps.ts',
      './arena-state.ts',
      './arena-feed-state.ts',
      './arena-types-feed-room.ts',
      './arena-core.utils.ts',
      './arena-feed-room.ts',
      './arena-feed-heartbeat.ts',
      './arena-feed-disconnect.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-realtime.ts'),
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
