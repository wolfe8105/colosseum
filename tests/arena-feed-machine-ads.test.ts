import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockNudge = vi.hoisted(() => vi.fn());
const mockPlaySound = vi.hoisted(() => vi.fn());
const mockEndCurrentDebate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockSet_feedTurnTimer = vi.hoisted(() => vi.fn());

const mockRound = vi.hoisted(() => ({ value: 2 }));
const mockTimeLeft = vi.hoisted(() => ({ value: 30 }));
const mockVotedRounds = vi.hoisted(() => new Set<number>());
const mockHasVotedFinal = vi.hoisted(() => ({ value: false }));
const mockSet_phase = vi.hoisted(() => vi.fn());
const mockSet_round = vi.hoisted(() => vi.fn());
const mockSet_timeLeft = vi.hoisted(() => vi.fn((v: number) => { mockTimeLeft.value = v; }));
const mockSet_hasVotedFinal = vi.hoisted(() => vi.fn());

const mockAddLocalSystem = vi.hoisted(() => vi.fn());
const mockUpdateTimerDisplay = vi.hoisted(() => vi.fn());
const mockUpdateTurnLabel = vi.hoisted(() => vi.fn());
const mockUpdateRoundLabel = vi.hoisted(() => vi.fn());
const mockSetDebaterInputEnabled = vi.hoisted(() => vi.fn());
const mockApplySentimentUpdate = vi.hoisted(() => vi.fn());
const mockClearFeedTimer = vi.hoisted(() => vi.fn());
const mockStartPreRoundCountdown = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/nudge.ts', () => ({
  nudge: mockNudge,
}));

vi.mock('../src/arena/arena-sounds.ts', () => ({
  playSound: mockPlaySound,
}));

vi.mock('../src/arena/arena-room-end.ts', () => ({
  endCurrentDebate: mockEndCurrentDebate,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
  set_feedTurnTimer: mockSet_feedTurnTimer,
}));

vi.mock('../src/arena/arena-types-feed-room.ts', () => ({
  FEED_AD_BREAK_DURATION: 10,
  FEED_FINAL_AD_BREAK_DURATION: 15,
  FEED_VOTE_GATE_DURATION: 20,
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get round() { return mockRound.value; },
  get timeLeft() { return mockTimeLeft.value; },
  get votedRounds() { return mockVotedRounds; },
  get hasVotedFinal() { return mockHasVotedFinal.value; },
  set_phase: mockSet_phase,
  set_round: mockSet_round,
  set_timeLeft: mockSet_timeLeft,
  set_hasVotedFinal: mockSet_hasVotedFinal,
}));

vi.mock('../src/arena/arena-feed-events.ts', () => ({
  addLocalSystem: mockAddLocalSystem,
}));

vi.mock('../src/arena/arena-feed-ui.ts', () => ({
  updateTimerDisplay: mockUpdateTimerDisplay,
  updateTurnLabel: mockUpdateTurnLabel,
  updateRoundLabel: mockUpdateRoundLabel,
  setDebaterInputEnabled: mockSetDebaterInputEnabled,
  applySentimentUpdate: mockApplySentimentUpdate,
}));

vi.mock('../src/arena/arena-feed-machine-turns.ts', () => ({
  clearFeedTimer: mockClearFeedTimer,
  startPreRoundCountdown: mockStartPreRoundCountdown,
}));

import { startAdBreak, startFinalAdBreak } from '../src/arena/arena-feed-machine-ads.ts';

const baseDebate = {
  id: 'deb-1',
  role: 'a',
  modView: false,
  spectatorView: false,
  totalRounds: 3,
};

describe('TC1 — startAdBreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockCurrentDebate.value = { ...baseDebate };
    mockRound.value = 1;
    mockTimeLeft.value = 10;
    document.body.innerHTML = `
      <div id="feed-vote-overlay"></div>
    `;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls set_phase with ad_break', () => {
    startAdBreak(baseDebate as never);
    expect(mockSet_phase).toHaveBeenCalledWith('ad_break');
  });

  it('calls setDebaterInputEnabled(false) for debater', () => {
    startAdBreak(baseDebate as never);
    expect(mockSetDebaterInputEnabled).toHaveBeenCalledWith(false);
  });

  it('calls updateTurnLabel', () => {
    startAdBreak(baseDebate as never);
    expect(mockUpdateTurnLabel).toHaveBeenCalled();
  });

  it('calls set_feedTurnTimer with interval', () => {
    startAdBreak(baseDebate as never);
    expect(mockSet_feedTurnTimer).toHaveBeenCalledWith(expect.any(Object));
  });

  it('transitions to next round when countdown expires', async () => {
    startAdBreak(baseDebate as never);
    await vi.advanceTimersByTimeAsync(10001);
    expect(mockSet_round).toHaveBeenCalled();
  });
});

describe('TC2 — startFinalAdBreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockCurrentDebate.value = { ...baseDebate };
    mockRound.value = 3;
    mockTimeLeft.value = 15;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls set_phase with final_ad_break', () => {
    startFinalAdBreak(baseDebate as never);
    expect(mockSet_phase).toHaveBeenCalledWith('final_ad_break');
  });

  it('calls endCurrentDebate after countdown + 2s timeout', async () => {
    startFinalAdBreak(baseDebate as never);
    await vi.advanceTimersByTimeAsync(17001);
    expect(mockEndCurrentDebate).toHaveBeenCalled();
  });
});

describe('ARCH — arena-feed-machine-ads.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      '../nudge.ts',
      './arena-sounds.ts',
      './arena-room-end.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-feed-room.ts',
      './arena-feed-state.ts',
      './arena-feed-events.ts',
      './arena-feed-ui.ts',
      './arena-feed-machine-turns.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-machine-ads.ts'),
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
