import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn().mockReturnValue({ display_name: 'TestUser' }));
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockJoinDebate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLeaveDebate = vi.hoisted(() => vi.fn());
const mockOnWebRTC = vi.hoisted(() => vi.fn());
const mockOffWebRTC = vi.hoisted(() => vi.fn());
const mockGetMyDebateLoadout = vi.hoisted(() => vi.fn().mockResolvedValue([]));

const mockScreenEl = vi.hoisted(() => ({ value: null as HTMLElement | null }));
const mockChallengeRulingTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockSet_currentDebate = vi.hoisted(() => vi.fn());
const mockSet_loadedRefs = vi.hoisted(() => vi.fn());
const mockSet_opponentCitedRefs = vi.hoisted(() => vi.fn());
const mockSet_challengesRemaining = vi.hoisted(() => vi.fn());
const mockSet_feedPaused = vi.hoisted(() => vi.fn());
const mockSet_feedPauseTimeLeft = vi.hoisted(() => vi.fn());
const mockSet_challengeRulingTimer = vi.hoisted(() => vi.fn());
const mockSet_activeChallengeRefId = vi.hoisted(() => vi.fn());

const mockSet_phase = vi.hoisted(() => vi.fn());
const mockSet_round = vi.hoisted(() => vi.fn());
const mockSet_timeLeft = vi.hoisted(() => vi.fn());
const mockSet_scoreA = vi.hoisted(() => vi.fn());
const mockSet_scoreB = vi.hoisted(() => vi.fn());
const mockTimeLeft = vi.hoisted(() => ({ value: 3 }));
const mockResetFeedRoomState = vi.hoisted(() => vi.fn());

const mockSubscribeRealtime = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockUnsubscribeRealtime = vi.hoisted(() => vi.fn());
const mockStopHeartbeat = vi.hoisted(() => vi.fn());
const mockSendGoodbye = vi.hoisted(() => vi.fn());

const mockUpdateCiteButtonState = vi.hoisted(() => vi.fn());
const mockRenderControls = vi.hoisted(() => vi.fn());
const mockInitSpecChat = vi.hoisted(() => vi.fn());
const mockDestroySpecChat = vi.hoisted(() => vi.fn());
const mockStartPreRoundCountdown = vi.hoisted(() => vi.fn());
const mockClearFeedTimer = vi.hoisted(() => vi.fn());
const mockFormatTimer = vi.hoisted(() => vi.fn().mockReturnValue('0:03'));
const mockPushArenaState = vi.hoisted(() => vi.fn());
const mockCleanupDeepgram = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_arena_debate_spectator: {},
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: mockShowToast,
}));

vi.mock('../src/webrtc.ts', () => ({
  joinDebate: mockJoinDebate,
  leaveDebate: mockLeaveDebate,
  on: mockOnWebRTC,
  off: mockOffWebRTC,
}));

vi.mock('../src/reference-arsenal.ts', () => ({
  getMyDebateLoadout: mockGetMyDebateLoadout,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return null; },
  get screenEl() { return mockScreenEl.value; },
  get challengeRulingTimer() { return mockChallengeRulingTimer.value; },
  set_currentDebate: mockSet_currentDebate,
  set_loadedRefs: mockSet_loadedRefs,
  set_opponentCitedRefs: mockSet_opponentCitedRefs,
  set_challengesRemaining: mockSet_challengesRemaining,
  set_feedPaused: mockSet_feedPaused,
  set_feedPauseTimeLeft: mockSet_feedPauseTimeLeft,
  set_challengeRulingTimer: mockSet_challengeRulingTimer,
  set_activeChallengeRefId: mockSet_activeChallengeRefId,
}));

vi.mock('../src/arena/arena-types-feed-room.ts', () => ({
  FEED_TOTAL_ROUNDS: 4,
  FEED_MAX_CHALLENGES: 3,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  formatTimer: mockFormatTimer,
  pushArenaState: mockPushArenaState,
}));

vi.mock('../src/arena/arena-deepgram.ts', () => ({
  cleanupDeepgram: mockCleanupDeepgram,
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get timeLeft() { return mockTimeLeft.value; },
  set_phase: mockSet_phase,
  set_round: mockSet_round,
  set_timeLeft: mockSet_timeLeft,
  set_scoreA: mockSet_scoreA,
  set_scoreB: mockSet_scoreB,
  resetFeedRoomState: mockResetFeedRoomState,
}));

vi.mock('../src/arena/arena-feed-realtime.ts', () => ({
  subscribeRealtime: mockSubscribeRealtime,
  unsubscribeRealtime: mockUnsubscribeRealtime,
  stopHeartbeat: mockStopHeartbeat,
  sendGoodbye: mockSendGoodbye,
}));

vi.mock('../src/arena/arena-feed-ui.ts', () => ({
  updateCiteButtonState: mockUpdateCiteButtonState,
  setDebaterInputEnabled: vi.fn(),
}));

vi.mock('../src/arena/arena-feed-wiring.ts', () => ({
  renderControls: mockRenderControls,
}));

vi.mock('../src/arena/arena-feed-spec-chat.ts', () => ({
  initSpecChat: mockInitSpecChat,
  destroy: mockDestroySpecChat,
}));

vi.mock('../src/arena/arena-feed-machine-turns.ts', () => ({
  startPreRoundCountdown: mockStartPreRoundCountdown,
  clearFeedTimer: mockClearFeedTimer,
}));

vi.mock('../src/arena/arena-feed-events.ts', () => ({
  appendFeedEvent: vi.fn(),
  addLocalSystem: vi.fn(),
  writeFeedEvent: vi.fn(),
}));

vi.mock('../src/arena/arena-feed-transcript.ts', () => ({
  clearInterimTranscript: vi.fn(),
}));

import { enterFeedRoom, enterFeedRoomAsSpectator, cleanupFeedRoom } from '../src/arena/arena-feed-room.ts';

const baseDebate = {
  id: 'deb-1',
  topic: 'Test Topic',
  role: 'a' as const,
  mode: 'text' as never,
  round: 1,
  totalRounds: 4,
  opponentName: 'Opponent',
  opponentElo: 1200,
  ranked: false,
  messages: [],
  language: 'en',
  moderatorName: null,
  debaterAName: undefined,
  debaterBName: undefined,
  modView: false,
  spectatorView: false,
};

describe('TC1 — enterFeedRoom (debater)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScreenEl.value = document.createElement('div');
    document.body.appendChild(mockScreenEl.value);
  });

  it('calls set_currentDebate with debate', () => {
    enterFeedRoom(baseDebate as never);
    expect(mockSet_currentDebate).toHaveBeenCalledWith(baseDebate);
  });

  it('calls pushArenaState with room', () => {
    enterFeedRoom(baseDebate as never);
    expect(mockPushArenaState).toHaveBeenCalledWith('room');
  });

  it('calls set_phase with pre_round', () => {
    enterFeedRoom(baseDebate as never);
    expect(mockSet_phase).toHaveBeenCalledWith('pre_round');
  });

  it('calls set_round with 1', () => {
    enterFeedRoom(baseDebate as never);
    expect(mockSet_round).toHaveBeenCalledWith(1);
  });

  it('calls set_scoreA and set_scoreB with 0', () => {
    enterFeedRoom(baseDebate as never);
    expect(mockSet_scoreA).toHaveBeenCalledWith(0);
    expect(mockSet_scoreB).toHaveBeenCalledWith(0);
  });

  it('appends feed-room element to screenEl', () => {
    enterFeedRoom(baseDebate as never);
    expect(mockScreenEl.value?.querySelector('.feed-room')).not.toBeNull();
  });

  it('calls subscribeRealtime with debate id', () => {
    enterFeedRoom(baseDebate as never);
    expect(mockSubscribeRealtime).toHaveBeenCalledWith('deb-1');
  });

  it('calls renderControls', () => {
    enterFeedRoom(baseDebate as never);
    expect(mockRenderControls).toHaveBeenCalled();
  });

  it('calls startPreRoundCountdown', () => {
    enterFeedRoom(baseDebate as never);
    expect(mockStartPreRoundCountdown).toHaveBeenCalled();
  });

  it('calls getMyDebateLoadout for debater (non-mod, non-spectator)', () => {
    enterFeedRoom(baseDebate as never);
    expect(mockGetMyDebateLoadout).toHaveBeenCalledWith('deb-1');
  });

  it('does NOT call initSpecChat for debater', () => {
    enterFeedRoom(baseDebate as never);
    expect(mockInitSpecChat).not.toHaveBeenCalled();
  });
});

describe('TC2 — enterFeedRoom (spectator)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScreenEl.value = document.createElement('div');
  });

  it('calls initSpecChat for spectator', () => {
    enterFeedRoom({ ...baseDebate, spectatorView: true } as never);
    expect(mockInitSpecChat).toHaveBeenCalledWith('deb-1');
  });

  it('does NOT call getMyDebateLoadout for spectator', () => {
    enterFeedRoom({ ...baseDebate, spectatorView: true } as never);
    expect(mockGetMyDebateLoadout).not.toHaveBeenCalled();
  });

  it('renders feed-spec-chat-panel for spectator', () => {
    enterFeedRoom({ ...baseDebate, spectatorView: true } as never);
    expect(mockScreenEl.value?.querySelector('#feed-spec-chat-panel')).not.toBeNull();
  });
});

describe('TC3 — enterFeedRoom (modView)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScreenEl.value = document.createElement('div');
  });

  it('does NOT call getMyDebateLoadout for mod', () => {
    enterFeedRoom({ ...baseDebate, modView: true } as never);
    expect(mockGetMyDebateLoadout).not.toHaveBeenCalled();
  });

  it('does NOT call initSpecChat for mod', () => {
    enterFeedRoom({ ...baseDebate, modView: true } as never);
    expect(mockInitSpecChat).not.toHaveBeenCalled();
  });
});

describe('TC4 — enterFeedRoomAsSpectator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScreenEl.value = document.createElement('div');
  });

  it('calls safeRpc get_arena_debate_spectator', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { topic: 'Sports', current_round: 1, total_rounds: 4, debater_a_name: 'Alice', debater_b_name: 'Bob' },
      error: null,
    });
    await enterFeedRoomAsSpectator('deb-2');
    expect(mockSafeRpc).toHaveBeenCalledWith('get_arena_debate_spectator', { p_debate_id: 'deb-2' }, expect.anything());
  });

  it('shows toast and returns early on error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: 'not found' });
    await enterFeedRoomAsSpectator('deb-err');
    expect(mockShowToast).toHaveBeenCalledWith('Could not load debate', 'error');
    expect(mockSet_currentDebate).not.toHaveBeenCalled();
  });

  it('calls enterFeedRoom with spectatorView:true on success', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { topic: 'Tech', current_round: 2, total_rounds: 4, debater_a_name: 'X', debater_b_name: 'Y' },
      error: null,
    });
    await enterFeedRoomAsSpectator('deb-3');
    expect(mockSet_currentDebate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'deb-3', spectatorView: true })
    );
  });
});

describe('TC5 — cleanupFeedRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChallengeRulingTimer.value = null;
    document.body.innerHTML = `
      <div id="feed-ref-dropdown"></div>
      <div id="feed-challenge-overlay"></div>
      <div id="feed-ad-overlay"></div>
      <div id="feed-vote-gate"></div>
      <div id="feed-disconnect-banner"></div>
    `;
  });

  it('calls sendGoodbye', () => {
    cleanupFeedRoom();
    expect(mockSendGoodbye).toHaveBeenCalled();
  });

  it('calls set_currentDebate(null)', () => {
    cleanupFeedRoom();
    expect(mockSet_currentDebate).toHaveBeenCalledWith(null);
  });

  it('calls clearFeedTimer', () => {
    cleanupFeedRoom();
    expect(mockClearFeedTimer).toHaveBeenCalled();
  });

  it('calls unsubscribeRealtime', () => {
    cleanupFeedRoom();
    expect(mockUnsubscribeRealtime).toHaveBeenCalled();
  });

  it('calls cleanupDeepgram', () => {
    cleanupFeedRoom();
    expect(mockCleanupDeepgram).toHaveBeenCalled();
  });

  it('calls resetFeedRoomState', () => {
    cleanupFeedRoom();
    expect(mockResetFeedRoomState).toHaveBeenCalled();
  });

  it('calls set_feedPaused(false)', () => {
    cleanupFeedRoom();
    expect(mockSet_feedPaused).toHaveBeenCalledWith(false);
  });

  it('calls stopHeartbeat', () => {
    cleanupFeedRoom();
    expect(mockStopHeartbeat).toHaveBeenCalled();
  });

  it('calls leaveDebate', () => {
    cleanupFeedRoom();
    expect(mockLeaveDebate).toHaveBeenCalled();
  });

  it('calls destroySpecChat', () => {
    cleanupFeedRoom();
    expect(mockDestroySpecChat).toHaveBeenCalled();
  });

  it('removes feed DOM overlays', () => {
    cleanupFeedRoom();
    expect(document.getElementById('feed-ref-dropdown')).toBeNull();
    expect(document.getElementById('feed-challenge-overlay')).toBeNull();
    expect(document.getElementById('feed-ad-overlay')).toBeNull();
    expect(document.getElementById('feed-vote-gate')).toBeNull();
    expect(document.getElementById('feed-disconnect-banner')).toBeNull();
  });

  it('clears challengeRulingTimer when set', () => {
    mockChallengeRulingTimer.value = setInterval(() => {}, 99999);
    cleanupFeedRoom();
    expect(mockSet_challengeRulingTimer).toHaveBeenCalledWith(null);
  });

  it('calls set_challengeRulingTimer(null) when timer is null', () => {
    mockChallengeRulingTimer.value = null;
    cleanupFeedRoom();
    expect(mockSet_challengeRulingTimer).toHaveBeenCalledWith(null);
  });
});

describe('ARCH — arena-feed-room.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      '../config.ts',
      '../webrtc.ts',
      '../reference-arsenal.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-feed-room.ts',
      './arena-core.utils.ts',
      './arena-deepgram.ts',
      './arena-feed-state.ts',
      './arena-feed-realtime.ts',
      './arena-feed-ui.ts',
      './arena-feed-wiring.ts',
      './arena-feed-spec-chat.ts',
      './arena-feed-machine-turns.ts',
      './arena-feed-events.ts',
      './arena-feed-transcript.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-room.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import ') || line.trimStart().startsWith('export {'));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
