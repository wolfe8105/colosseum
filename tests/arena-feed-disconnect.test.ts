import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockFeedRealtimeChannel = vi.hoisted(() => ({ value: null }));

const mockPhase = vi.hoisted(() => ({ value: 'open' as string }));
const mockDisconnectHandled = vi.hoisted(() => ({ value: false }));
const mockSet_disconnectHandled = vi.hoisted(() => vi.fn((v: boolean) => { mockDisconnectHandled.value = v; }));

const mockAppendFeedEvent = vi.hoisted(() => vi.fn());
const mockSetDebaterInputEnabled = vi.hoisted(() => vi.fn());
const mockClearInterimTranscript = vi.hoisted(() => vi.fn());
const mockClearFeedTimer = vi.hoisted(() => vi.fn());
const mockStopTranscription = vi.hoisted(() => vi.fn());
const mockStopHeartbeat = vi.hoisted(() => vi.fn());
const mockHandleDebaterDisconnect = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockHandleDebaterDisconnectAsViewer = vi.hoisted(() => vi.fn());
const mockHandleModDisconnect = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockModNullDebate = vi.hoisted(() => vi.fn());
const mockShowDisconnectBanner = vi.hoisted(() => vi.fn());

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
  get feedRealtimeChannel() { return mockFeedRealtimeChannel.value; },
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get phase() { return mockPhase.value; },
  get disconnectHandled() { return mockDisconnectHandled.value; },
  set_disconnectHandled: mockSet_disconnectHandled,
}));

vi.mock('../src/arena/arena-feed-room.ts', () => ({
  appendFeedEvent: mockAppendFeedEvent,
  setDebaterInputEnabled: mockSetDebaterInputEnabled,
  clearInterimTranscript: mockClearInterimTranscript,
}));

vi.mock('../src/arena/arena-feed-machine-turns.ts', () => ({
  clearFeedTimer: mockClearFeedTimer,
}));

vi.mock('../src/arena/arena-deepgram.ts', () => ({
  stopTranscription: mockStopTranscription,
}));

vi.mock('../src/arena/arena-feed-heartbeat.ts', () => ({
  stopHeartbeat: mockStopHeartbeat,
}));

vi.mock('../src/arena/arena-feed-disconnect-debater.ts', () => ({
  handleDebaterDisconnect: mockHandleDebaterDisconnect,
  handleDebaterDisconnectAsViewer: mockHandleDebaterDisconnectAsViewer,
}));

vi.mock('../src/arena/arena-feed-disconnect-mod.ts', () => ({
  handleModDisconnect: mockHandleModDisconnect,
  modNullDebate: mockModNullDebate,
}));

vi.mock('../src/arena/arena-feed-ui.ts', () => ({
  showDisconnectBanner: mockShowDisconnectBanner,
}));

import { handleParticipantGone } from '../src/arena/arena-feed-disconnect.ts';

describe('TC1 — handleParticipantGone routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDisconnectHandled.value = false;
    mockPhase.value = 'open';
    mockCurrentDebate.value = {
      id: 'deb-1',
      role: 'a',
      modView: false,
      spectatorView: false,
      concededBy: null,
      _nulled: false,
    };
  });

  it('does nothing when disconnectHandled is true', () => {
    mockDisconnectHandled.value = true;
    handleParticipantGone('b');
    expect(mockSet_disconnectHandled).not.toHaveBeenCalled();
  });

  it('does nothing when currentDebate is null', () => {
    mockCurrentDebate.value = null;
    handleParticipantGone('b');
    expect(mockClearFeedTimer).not.toHaveBeenCalled();
  });

  it('does nothing when phase is finished', () => {
    mockPhase.value = 'finished';
    handleParticipantGone('b');
    expect(mockClearFeedTimer).not.toHaveBeenCalled();
  });

  it('does nothing when debate._nulled is true', () => {
    mockCurrentDebate.value = { ...mockCurrentDebate.value, _nulled: true };
    handleParticipantGone('b');
    expect(mockClearFeedTimer).not.toHaveBeenCalled();
  });

  it('sets disconnectHandled to true', () => {
    handleParticipantGone('b');
    expect(mockSet_disconnectHandled).toHaveBeenCalledWith(true);
  });

  it('calls clearFeedTimer', () => {
    handleParticipantGone('b');
    expect(mockClearFeedTimer).toHaveBeenCalled();
  });

  it('calls stopTranscription', () => {
    handleParticipantGone('b');
    expect(mockStopTranscription).toHaveBeenCalled();
  });

  it('calls stopHeartbeat', () => {
    handleParticipantGone('b');
    expect(mockStopHeartbeat).toHaveBeenCalled();
  });

  it('calls handleModDisconnect when role is mod', () => {
    handleParticipantGone('mod');
    expect(mockHandleModDisconnect).toHaveBeenCalled();
  });

  it('calls handleDebaterDisconnect when debater sees opponent disconnect', () => {
    handleParticipantGone('b');
    expect(mockHandleDebaterDisconnect).toHaveBeenCalled();
  });

  it('calls handleDebaterDisconnectAsViewer for mod watching debater disconnect', () => {
    mockCurrentDebate.value = { ...mockCurrentDebate.value, modView: true };
    handleParticipantGone('a');
    expect(mockHandleDebaterDisconnectAsViewer).toHaveBeenCalled();
  });

  it('calls handleDebaterDisconnectAsViewer for spectator watching debater disconnect', () => {
    mockCurrentDebate.value = { ...mockCurrentDebate.value, spectatorView: true };
    handleParticipantGone('a');
    expect(mockHandleDebaterDisconnectAsViewer).toHaveBeenCalled();
  });

  it('does not disable input for modView', () => {
    mockCurrentDebate.value = { ...mockCurrentDebate.value, modView: true };
    handleParticipantGone('a');
    expect(mockSetDebaterInputEnabled).not.toHaveBeenCalled();
  });

  it('disables debater input for regular debater', () => {
    handleParticipantGone('b');
    expect(mockSetDebaterInputEnabled).toHaveBeenCalledWith(false);
  });
});

describe('ARCH — arena-feed-disconnect.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './arena-state.ts',
      './arena-feed-state.ts',
      './arena-feed-room.ts',
      './arena-feed-machine-turns.ts',
      './arena-deepgram.ts',
      './arena-feed-heartbeat.ts',
      './arena-feed-disconnect-debater.ts',
      './arena-feed-disconnect-mod.ts',
      './arena-feed-ui.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-disconnect.ts'),
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
