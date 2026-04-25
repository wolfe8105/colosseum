import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetCurrentProfile = vi.hoisted(() => vi.fn().mockReturnValue({ id: 'u-1' }));
const mockGetLocalStream = vi.hoisted(() => vi.fn().mockReturnValue(null));
const mockPlaySound = vi.hoisted(() => vi.fn());
const mockStartTranscription = vi.hoisted(() => vi.fn());
const mockStopTranscription = vi.hoisted(() => vi.fn());

const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockFeedTurnTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockFeedPaused = vi.hoisted(() => ({ value: false }));
const mockSet_feedTurnTimer = vi.hoisted(() => vi.fn((v: ReturnType<typeof setInterval> | null) => { mockFeedTurnTimer.value = v; }));

const mockPhase = vi.hoisted(() => ({ value: 'open' as string }));
const mockRound = vi.hoisted(() => ({ value: 1 }));
const mockTimeLeft = vi.hoisted(() => ({ value: 90 }));
const mockBudgetRound = vi.hoisted(() => ({ value: 1 }));
const mockFirstSpeaker = vi.hoisted(() => vi.fn().mockReturnValue('a'));
const mockSecondSpeaker = vi.hoisted(() => vi.fn().mockReturnValue('b'));
const mockSet_phase = vi.hoisted(() => vi.fn((v: string) => { mockPhase.value = v; }));
const mockSet_timeLeft = vi.hoisted(() => vi.fn((v: number) => { mockTimeLeft.value = v; }));

const mockAddLocalSystem = vi.hoisted(() => vi.fn());
const mockWriteFeedEvent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockUpdateTimerDisplay = vi.hoisted(() => vi.fn());
const mockUpdateTurnLabel = vi.hoisted(() => vi.fn());
const mockUpdateRoundLabel = vi.hoisted(() => vi.fn());
const mockSetDebaterInputEnabled = vi.hoisted(() => vi.fn());
const mockResetBudget = vi.hoisted(() => vi.fn());
const mockUpdateCiteButtonState = vi.hoisted(() => vi.fn());
const mockUpdateChallengeButtonState = vi.hoisted(() => vi.fn());
const mockHandleDeepgramTranscript = vi.hoisted(() => vi.fn());
const mockShowInterimTranscript = vi.hoisted(() => vi.fn());
const mockClearInterimTranscript = vi.hoisted(() => vi.fn());
const mockUpdateDeepgramStatus = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/webrtc.ts', () => ({
  getLocalStream: mockGetLocalStream,
}));

vi.mock('../src/arena/arena-sounds.ts', () => ({
  playSound: mockPlaySound,
}));

vi.mock('../src/arena/arena-deepgram.ts', () => ({
  startTranscription: mockStartTranscription,
  stopTranscription: mockStopTranscription,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
  get feedTurnTimer() { return mockFeedTurnTimer.value; },
  get feedPaused() { return mockFeedPaused.value; },
  set_feedTurnTimer: mockSet_feedTurnTimer,
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get phase() { return mockPhase.value; },
  get round() { return mockRound.value; },
  get timeLeft() { return mockTimeLeft.value; },
  get budgetRound() { return mockBudgetRound.value; },
  firstSpeaker: mockFirstSpeaker,
  secondSpeaker: mockSecondSpeaker,
  set_phase: mockSet_phase,
  set_timeLeft: mockSet_timeLeft,
}));

vi.mock('../src/arena/arena-feed-events.ts', () => ({
  addLocalSystem: mockAddLocalSystem,
  writeFeedEvent: mockWriteFeedEvent,
}));

vi.mock('../src/arena/arena-feed-ui.ts', () => ({
  updateTimerDisplay: mockUpdateTimerDisplay,
  updateTurnLabel: mockUpdateTurnLabel,
  updateRoundLabel: mockUpdateRoundLabel,
  setDebaterInputEnabled: mockSetDebaterInputEnabled,
  resetBudget: mockResetBudget,
  updateCiteButtonState: mockUpdateCiteButtonState,
  updateChallengeButtonState: mockUpdateChallengeButtonState,
}));

vi.mock('../src/arena/arena-feed-transcript.ts', () => ({
  handleDeepgramTranscript: mockHandleDeepgramTranscript,
  showInterimTranscript: mockShowInterimTranscript,
  clearInterimTranscript: mockClearInterimTranscript,
  updateDeepgramStatus: mockUpdateDeepgramStatus,
}));

import { clearFeedTimer, startPreRoundCountdown, finishCurrentTurn } from '../src/arena/arena-feed-machine-turns.ts';

const baseDebate = {
  id: 'deb-1',
  role: 'a',
  mode: 'text',
  modView: false,
  spectatorView: false,
  totalRounds: 3,
};

describe('TC1 — clearFeedTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeedTurnTimer.value = null;
  });

  it('always calls set_feedTurnTimer(null)', () => {
    clearFeedTimer();
    expect(mockSet_feedTurnTimer).toHaveBeenCalledWith(null);
  });

  it('calls set_feedTurnTimer(null) when timer is active', () => {
    mockFeedTurnTimer.value = setInterval(() => {}, 99999);
    clearFeedTimer();
    expect(mockSet_feedTurnTimer).toHaveBeenCalledWith(null);
  });
});

describe('TC2 — startPreRoundCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockTimeLeft.value = 3;
    mockRound.value = 1;
    mockCurrentDebate.value = { ...baseDebate };
    mockFeedTurnTimer.value = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets phase to pre_round', () => {
    startPreRoundCountdown(baseDebate as never);
    expect(mockSet_phase).toHaveBeenCalledWith('pre_round');
  });

  it('calls set_feedTurnTimer with interval', () => {
    startPreRoundCountdown(baseDebate as never);
    expect(mockSet_feedTurnTimer).toHaveBeenCalledWith(expect.any(Object));
  });

  it('calls updateTurnLabel', () => {
    startPreRoundCountdown(baseDebate as never);
    expect(mockUpdateTurnLabel).toHaveBeenCalled();
  });
});

describe('TC3 — finishCurrentTurn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentDebate.value = { ...baseDebate };
    mockPhase.value = 'speaker_a';
    mockFeedTurnTimer.value = null;
  });

  it('does nothing when currentDebate is null', () => {
    mockCurrentDebate.value = null;
    finishCurrentTurn();
    expect(mockSet_phase).not.toHaveBeenCalled();
  });

  it('calls clearFeedTimer', () => {
    finishCurrentTurn();
    expect(mockSet_feedTurnTimer).toHaveBeenCalledWith(null);
  });
});

describe('ARCH — arena-feed-machine-turns.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../webrtc.ts',
      './arena-sounds.ts',
      './arena-deepgram.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-feed-room.ts',
      './arena-feed-state.ts',
      './arena-feed-events.ts',
      './arena-feed-ui.ts',
      './arena-feed-transcript.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-machine-turns.ts'),
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
