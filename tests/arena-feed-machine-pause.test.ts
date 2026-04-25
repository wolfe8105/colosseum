import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockShowToast = vi.hoisted(() => vi.fn());

const mockFeedPaused = vi.hoisted(() => ({ value: false }));
const mockFeedPauseTimeLeft = vi.hoisted(() => ({ value: 0 }));
const mockChallengeRulingTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockActiveChallengeRefId = vi.hoisted(() => ({ value: null as string | null }));
const mockActiveChallengeId = vi.hoisted(() => ({ value: null as string | null }));
const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));

const mockSet_feedPaused = vi.hoisted(() => vi.fn((v: boolean) => { mockFeedPaused.value = v; }));
const mockSet_feedPauseTimeLeft = vi.hoisted(() => vi.fn());
const mockSet_challengeRulingTimer = vi.hoisted(() => vi.fn((v: ReturnType<typeof setInterval> | null) => { mockChallengeRulingTimer.value = v; }));
const mockSet_activeChallengeRefId = vi.hoisted(() => vi.fn());
const mockSet_activeChallengeId = vi.hoisted(() => vi.fn());

const mockPhase = vi.hoisted(() => ({ value: 'speaker_a' as string }));
const mockRound = vi.hoisted(() => ({ value: 1 }));
const mockTimeLeft = vi.hoisted(() => ({ value: 60 }));
const mockSet_timeLeft = vi.hoisted(() => vi.fn());

const mockUpdateTimerDisplay = vi.hoisted(() => vi.fn());
const mockUpdateTurnLabel = vi.hoisted(() => vi.fn());
const mockSetDebaterInputEnabled = vi.hoisted(() => vi.fn());
const mockUpdateCiteButtonState = vi.hoisted(() => vi.fn());
const mockUpdateChallengeButtonState = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
  get feedPaused() { return mockFeedPaused.value; },
  get feedPauseTimeLeft() { return mockFeedPauseTimeLeft.value; },
  get challengeRulingTimer() { return mockChallengeRulingTimer.value; },
  get activeChallengeRefId() { return mockActiveChallengeRefId.value; },
  get activeChallengeId() { return mockActiveChallengeId.value; },
  set_feedPaused: mockSet_feedPaused,
  set_feedPauseTimeLeft: mockSet_feedPauseTimeLeft,
  set_challengeRulingTimer: mockSet_challengeRulingTimer,
  set_activeChallengeRefId: mockSet_activeChallengeRefId,
  set_activeChallengeId: mockSet_activeChallengeId,
}));

vi.mock('../src/arena/arena-types-feed-room.ts', () => ({
  FEED_CHALLENGE_RULING_SEC: 60,
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get phase() { return mockPhase.value; },
  get round() { return mockRound.value; },
  get timeLeft() { return mockTimeLeft.value; },
  set_timeLeft: mockSet_timeLeft,
}));

vi.mock('../src/arena/arena-feed-ui.ts', () => ({
  updateTimerDisplay: mockUpdateTimerDisplay,
  updateTurnLabel: mockUpdateTurnLabel,
  setDebaterInputEnabled: mockSetDebaterInputEnabled,
  updateCiteButtonState: mockUpdateCiteButtonState,
  updateChallengeButtonState: mockUpdateChallengeButtonState,
}));

import { pauseFeed, unpauseFeed } from '../src/arena/arena-feed-machine-pause.ts';

const baseDebate = { id: 'deb-1', modView: false, spectatorView: false };

describe('TC1 — pauseFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeedPaused.value = false;
    mockChallengeRulingTimer.value = null;
    document.body.innerHTML = '<button id="feed-finish-turn"></button>';
  });

  it('does nothing when already paused', () => {
    mockFeedPaused.value = true;
    pauseFeed(baseDebate as never);
    expect(mockSet_feedPaused).not.toHaveBeenCalled();
  });

  it('calls set_feedPaused(true)', () => {
    pauseFeed(baseDebate as never);
    expect(mockSet_feedPaused).toHaveBeenCalledWith(true);
  });

  it('calls setDebaterInputEnabled(false)', () => {
    pauseFeed(baseDebate as never);
    expect(mockSetDebaterInputEnabled).toHaveBeenCalledWith(false);
  });

  it('calls updateTurnLabel', () => {
    pauseFeed(baseDebate as never);
    expect(mockUpdateTurnLabel).toHaveBeenCalled();
  });

  it('disables finish turn button', () => {
    pauseFeed(baseDebate as never);
    const btn = document.getElementById('feed-finish-turn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

describe('TC2 — unpauseFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeedPaused.value = true;
    mockChallengeRulingTimer.value = null;
    document.body.innerHTML = `
      <div id="feed-challenge-overlay"></div>
      <button id="feed-finish-turn"></button>
    `;
  });

  it('does nothing when not paused', () => {
    mockFeedPaused.value = false;
    unpauseFeed();
    expect(mockSet_feedPaused).not.toHaveBeenCalled();
  });

  it('calls set_feedPaused(false)', () => {
    unpauseFeed();
    expect(mockSet_feedPaused).toHaveBeenCalledWith(false);
  });

  it('calls set_activeChallengeRefId(null)', () => {
    unpauseFeed();
    expect(mockSet_activeChallengeRefId).toHaveBeenCalledWith(null);
  });

  it('removes feed-challenge-overlay', () => {
    unpauseFeed();
    expect(document.getElementById('feed-challenge-overlay')).toBeNull();
  });
});

describe('ARCH — arena-feed-machine-pause.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-feed-room.ts',
      './arena-feed-state.ts',
      './arena-feed-ui.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-machine-pause.ts'),
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
