import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockSanitizeUrl = vi.hoisted(() => vi.fn((s: string) => s));
const mockPlaySound = vi.hoisted(() => vi.fn());
const mockVibrate = vi.hoisted(() => vi.fn());

const mockFeedPaused = vi.hoisted(() => ({ value: false }));
const mockOpponentCitedRefs = vi.hoisted(() => ({ value: [] as unknown[] }));
const mockSet_opponentCitedRefs = vi.hoisted(() => vi.fn());
const mockSet_activeChallengeRefId = vi.hoisted(() => vi.fn());

const mockRound = vi.hoisted(() => ({ value: 1 }));
const mockScoreA = vi.hoisted(() => ({ value: 0 }));
const mockScoreB = vi.hoisted(() => ({ value: 0 }));
const mockBudgetRound = vi.hoisted(() => ({ value: 1 }));
const mockPinnedEventIds = vi.hoisted(() => new Set<string>());
const mockScoreUsed = vi.hoisted(() => ({} as Record<number, number>));
const mockPendingSentimentA = vi.hoisted(() => ({ value: 0 }));
const mockPendingSentimentB = vi.hoisted(() => ({ value: 0 }));
const mockSet_scoreA = vi.hoisted(() => vi.fn((v: number) => { mockScoreA.value = v; }));
const mockSet_scoreB = vi.hoisted(() => vi.fn((v: number) => { mockScoreB.value = v; }));
const mockSet_pendingSentimentA = vi.hoisted(() => vi.fn());
const mockSet_pendingSentimentB = vi.hoisted(() => vi.fn());

const mockUpdateBudgetDisplay = vi.hoisted(() => vi.fn());
const mockResetBudget = vi.hoisted(() => vi.fn());
const mockUpdateChallengeButtonState = vi.hoisted(() => vi.fn());
const mockPauseFeed = vi.hoisted(() => vi.fn());
const mockUnpauseFeed = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  sanitizeUrl: mockSanitizeUrl,
}));

vi.mock('../src/arena/arena-sounds.ts', () => ({
  playSound: mockPlaySound,
  vibrate: mockVibrate,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get feedPaused() { return mockFeedPaused.value; },
  get opponentCitedRefs() { return mockOpponentCitedRefs.value; },
  set_opponentCitedRefs: mockSet_opponentCitedRefs,
  set_activeChallengeRefId: mockSet_activeChallengeRefId,
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get round() { return mockRound.value; },
  get scoreA() { return mockScoreA.value; },
  get scoreB() { return mockScoreB.value; },
  get budgetRound() { return mockBudgetRound.value; },
  get pinnedEventIds() { return mockPinnedEventIds; },
  get scoreUsed() { return mockScoreUsed; },
  get pendingSentimentA() { return mockPendingSentimentA.value; },
  get pendingSentimentB() { return mockPendingSentimentB.value; },
  set_scoreA: mockSet_scoreA,
  set_scoreB: mockSet_scoreB,
  set_pendingSentimentA: mockSet_pendingSentimentA,
  set_pendingSentimentB: mockSet_pendingSentimentB,
}));

vi.mock('../src/arena/arena-feed-ui.ts', () => ({
  updateBudgetDisplay: mockUpdateBudgetDisplay,
  resetBudget: mockResetBudget,
  updateChallengeButtonState: mockUpdateChallengeButtonState,
}));

vi.mock('../src/arena/arena-feed-machine-pause.ts', () => ({
  pauseFeed: mockPauseFeed,
  unpauseFeed: mockUnpauseFeed,
}));

import {
  renderSpeechEvent,
  renderPointAwardEvent,
  renderRoundDividerEvent,
  renderReferenceCiteEvent,
  renderDisconnectEvent,
  renderDefaultEvent,
  applySentimentEvent,
} from '../src/arena/arena-feed-events-render.ts';

const names = { a: 'Alice', b: 'Bob' };
const baseSpeechEv = {
  id: 'evt-1',
  debate_id: 'deb-1',
  event_type: 'speech',
  round: 1,
  side: 'a',
  content: 'My argument',
  created_at: new Date().toISOString(),
};

describe('TC1 — renderSpeechEvent sets correct class and content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPinnedEventIds.clear();
  });

  it('sets feed-evt-a class for side a', () => {
    const el = document.createElement('div');
    renderSpeechEvent(baseSpeechEv as never, el, names, null);
    expect(el.className).toContain('feed-evt-a');
  });

  it('sets feed-evt-b class for side b', () => {
    const el = document.createElement('div');
    renderSpeechEvent({ ...baseSpeechEv, side: 'b' } as never, el, names, null);
    expect(el.className).toContain('feed-evt-b');
  });

  it('sets feed-evt-mod class for mod side', () => {
    const el = document.createElement('div');
    renderSpeechEvent({ ...baseSpeechEv, side: 'mod' } as never, el, names, null);
    expect(el.className).toContain('feed-evt-mod');
  });

  it('contains argument content', () => {
    const el = document.createElement('div');
    renderSpeechEvent(baseSpeechEv as never, el, names, null);
    expect(el.innerHTML).toContain('My argument');
  });
});

describe('TC2 — renderPointAwardEvent updates score state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScoreA.value = 0;
    mockScoreB.value = 0;
  });

  it('calls set_scoreA when side is a', () => {
    const el = document.createElement('div');
    renderPointAwardEvent({ ...baseSpeechEv, event_type: 'point_award', side: 'a', score: 3 } as never, el, names);
    expect(mockSet_scoreA).toHaveBeenCalledWith(3);
  });

  it('calls set_scoreB when side is b', () => {
    const el = document.createElement('div');
    renderPointAwardEvent({ ...baseSpeechEv, event_type: 'point_award', side: 'b', score: 2 } as never, el, names);
    expect(mockSet_scoreB).toHaveBeenCalledWith(2);
  });

  it('sets feed-evt-points class', () => {
    const el = document.createElement('div');
    renderPointAwardEvent({ ...baseSpeechEv, event_type: 'point_award', side: 'a', score: 1 } as never, el, names);
    expect(el.className).toContain('feed-evt-points');
  });
});

describe('TC3 — renderRoundDividerEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets feed-evt-divider class', () => {
    const el = document.createElement('div');
    renderRoundDividerEvent({ ...baseSpeechEv, event_type: 'round_divider', round: 2 } as never, el);
    expect(el.className).toContain('feed-evt-divider');
  });

  it('renders divider text content', () => {
    const el = document.createElement('div');
    renderRoundDividerEvent({ ...baseSpeechEv, event_type: 'round_divider', content: 'Round 2', round: 2 } as never, el);
    expect(el.innerHTML).toContain('Round 2');
  });
});

describe('TC4 — renderDisconnectEvent', () => {
  it('sets feed-evt-disconnect class', () => {
    const el = document.createElement('div');
    renderDisconnectEvent({ ...baseSpeechEv, event_type: 'disconnect', content: 'left' } as never, el);
    expect(el.className).toContain('feed-evt-disconnect');
  });
});

describe('TC5 — renderDefaultEvent', () => {
  it('sets feed-evt-system class', () => {
    const el = document.createElement('div');
    renderDefaultEvent({ ...baseSpeechEv, event_type: 'system', content: 'System msg' } as never, el);
    expect(el.className).toContain('feed-evt-system');
  });
});

describe('TC6 — applySentimentEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPendingSentimentA.value = 0;
    mockPendingSentimentB.value = 0;
  });

  it('calls set_pendingSentimentA for side a tip using metadata.amount', () => {
    applySentimentEvent({ ...baseSpeechEv, event_type: 'sentiment_tip', side: 'a', metadata: { amount: 5 } } as never);
    expect(mockSet_pendingSentimentA).toHaveBeenCalledWith(5);
  });

  it('calls set_pendingSentimentB for side b tip using metadata.amount', () => {
    applySentimentEvent({ ...baseSpeechEv, event_type: 'sentiment_tip', side: 'b', metadata: { amount: 3 } } as never);
    expect(mockSet_pendingSentimentB).toHaveBeenCalledWith(3);
  });
});

describe('ARCH — arena-feed-events-render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../config.ts',
      './arena-sounds.ts',
      './arena-state.ts',
      './arena-types-feed-room.ts',
      './arena-types.ts',
      './arena-feed-state.ts',
      './arena-feed-ui.ts',
      './arena-feed-machine-pause.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-events-render.ts'),
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
