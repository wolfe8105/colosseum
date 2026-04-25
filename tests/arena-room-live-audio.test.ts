import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockJoinDebate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockOnWebRTC = vi.hoisted(() => vi.fn());
const mockOffWebRTC = vi.hoisted(() => vi.fn());
const mockToggleMute = vi.hoisted(() => vi.fn());
const mockCreateWaveform = vi.hoisted(() => vi.fn());
const mockGetLocalStream = vi.hoisted(() => vi.fn().mockReturnValue(null));
const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockFormatTimer = vi.hoisted(() => vi.fn((t: number) => `${t}s`));
const mockEndCurrentDebate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockAddSystemMessage = vi.hoisted(() => vi.fn());
const mockAdvanceRound = vi.hoisted(() => vi.fn());

vi.mock('../src/webrtc.ts', () => ({
  joinDebate: mockJoinDebate,
  on: mockOnWebRTC,
  off: mockOffWebRTC,
  toggleMute: mockToggleMute,
  createWaveform: mockCreateWaveform,
  getLocalStream: mockGetLocalStream,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  formatTimer: mockFormatTimer,
}));

vi.mock('../src/arena/arena-room-end.ts', () => ({
  endCurrentDebate: mockEndCurrentDebate,
}));

vi.mock('../src/arena/arena-room-live-messages.ts', () => ({
  addSystemMessage: mockAddSystemMessage,
}));

vi.mock('../src/arena/arena-room-live-poll.ts', () => ({
  advanceRound: mockAdvanceRound,
  submitTextArgument: vi.fn(),
}));

import { destroyLiveAudio, initLiveAudio, toggleLiveMute } from '../src/arena/arena-room-live-audio.ts';

describe('TC1 — destroyLiveAudio calls offWebRTC for all event types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('calls off for all 8 events when handlers are registered', async () => {
    mockCurrentDebate.value = { id: 'debate-1', role: 'for', totalRounds: 3 };
    await initLiveAudio();
    vi.clearAllMocks();
    destroyLiveAudio();
    const events = ['micReady', 'connected', 'disconnected', 'reconnecting', 'connectionFailed', 'muteChanged', 'tick', 'debateEnd'];
    for (const evt of events) {
      expect(mockOffWebRTC).toHaveBeenCalledWith(evt, expect.any(Function));
    }
  });

  it('does not throw when called with no handlers registered', () => {
    expect(() => destroyLiveAudio()).not.toThrow();
  });
});

describe('TC2 — initLiveAudio registers WebRTC handlers and calls joinDebate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="arena-audio-status"></div>
      <button id="arena-mic-btn"></button>
      <div id="arena-room-timer"></div>
    `;
    mockCurrentDebate.value = { id: 'debate-42', role: 'against', totalRounds: 2 };
  });

  it('registers all 8 WebRTC events', async () => {
    await initLiveAudio();
    const registeredEvents = mockOnWebRTC.mock.calls.map((c: unknown[]) => c[0]);
    expect(registeredEvents).toContain('micReady');
    expect(registeredEvents).toContain('connected');
    expect(registeredEvents).toContain('disconnected');
    expect(registeredEvents).toContain('reconnecting');
    expect(registeredEvents).toContain('connectionFailed');
    expect(registeredEvents).toContain('muteChanged');
    expect(registeredEvents).toContain('tick');
    expect(registeredEvents).toContain('debateEnd');
  });

  it('calls joinDebate with debate id, role, and totalRounds', async () => {
    await initLiveAudio();
    expect(mockJoinDebate).toHaveBeenCalledWith('debate-42', 'against', 2);
  });

  it('connected handler updates status text', async () => {
    await initLiveAudio();
    const connectedCall = mockOnWebRTC.mock.calls.find((c: unknown[]) => c[0] === 'connected');
    const handler = connectedCall?.[1] as () => void;
    handler();
    expect(document.getElementById('arena-audio-status')?.textContent).toContain('Connected');
  });

  it('muteChanged handler toggles muted class and text', async () => {
    await initLiveAudio();
    const muteCall = mockOnWebRTC.mock.calls.find((c: unknown[]) => c[0] === 'muteChanged');
    const handler = muteCall?.[1] as (d: unknown) => void;
    const btn = document.getElementById('arena-mic-btn');
    handler({ muted: true });
    expect(btn?.classList.contains('muted')).toBe(true);
    handler({ muted: false });
    expect(btn?.classList.contains('muted')).toBe(false);
  });

  it('tick handler updates timer using formatTimer', async () => {
    await initLiveAudio();
    const tickCall = mockOnWebRTC.mock.calls.find((c: unknown[]) => c[0] === 'tick');
    const handler = tickCall?.[1] as (d: unknown) => void;
    handler({ timeLeft: 30 });
    expect(mockFormatTimer).toHaveBeenCalledWith(30);
    expect(document.getElementById('arena-room-timer')?.textContent).toBe('30s');
  });

  it('tick handler adds warning class when timeLeft <= 15', async () => {
    await initLiveAudio();
    const tickCall = mockOnWebRTC.mock.calls.find((c: unknown[]) => c[0] === 'tick');
    const handler = tickCall?.[1] as (d: unknown) => void;
    handler({ timeLeft: 10 });
    expect(document.getElementById('arena-room-timer')?.classList.contains('warning')).toBe(true);
  });

  it('debateEnd handler calls endCurrentDebate', async () => {
    await initLiveAudio();
    const debateEndCall = mockOnWebRTC.mock.calls.find((c: unknown[]) => c[0] === 'debateEnd');
    const handler = debateEndCall?.[1] as () => void;
    handler();
    expect(mockEndCurrentDebate).toHaveBeenCalled();
  });

  it('sets fallback status text when joinDebate throws', async () => {
    mockJoinDebate.mockRejectedValueOnce(new Error('Permission denied'));
    await initLiveAudio();
    expect(document.getElementById('arena-audio-status')?.textContent).toContain('blocked');
  });
});

describe('TC3 — toggleLiveMute calls toggleMute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls toggleMute', () => {
    toggleLiveMute();
    expect(mockToggleMute).toHaveBeenCalled();
  });
});

describe('ARCH — arena-room-live-audio.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../webrtc.ts',
      './arena-state.ts',
      './arena-core.utils.ts',
      './arena-room-end.ts',
      './arena-room-live-messages.ts',
      './arena-room-live-poll.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-live-audio.ts'),
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
