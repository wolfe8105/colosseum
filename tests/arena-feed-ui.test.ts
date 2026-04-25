import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockFormatTimer = vi.hoisted(() => vi.fn((n: number) => `${n}s`));

const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockFeedPaused = vi.hoisted(() => ({ value: false }));
const mockLoadedRefs = vi.hoisted(() => ({ value: [] as { cited: boolean }[] }));
const mockOpponentCitedRefs = vi.hoisted(() => ({ value: [] as { already_challenged: boolean }[] }));
const mockChallengesRemaining = vi.hoisted(() => ({ value: 3 }));

const mockPhase = vi.hoisted(() => ({ value: 'speaker_a' as string }));
const mockRound = vi.hoisted(() => ({ value: 1 }));
const mockTimeLeft = vi.hoisted(() => ({ value: 90 }));
const mockScoreUsed = vi.hoisted(() => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>));
const mockBudgetRound = vi.hoisted(() => ({ value: 1 }));
const mockSentimentA = vi.hoisted(() => ({ value: 60 }));
const mockSentimentB = vi.hoisted(() => ({ value: 40 }));
const mockPendingSentimentA = vi.hoisted(() => ({ value: 5 }));
const mockPendingSentimentB = vi.hoisted(() => ({ value: 0 }));

const mockSet_budgetRound = vi.hoisted(() => vi.fn());
const mockSet_sentimentA = vi.hoisted(() => vi.fn((v: number) => { mockSentimentA.value = v; }));
const mockSet_sentimentB = vi.hoisted(() => vi.fn((v: number) => { mockSentimentB.value = v; }));
const mockSet_pendingSentimentA = vi.hoisted(() => vi.fn((v: number) => { mockPendingSentimentA.value = v; }));
const mockSet_pendingSentimentB = vi.hoisted(() => vi.fn((v: number) => { mockPendingSentimentB.value = v; }));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  formatTimer: mockFormatTimer,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
  get feedPaused() { return mockFeedPaused.value; },
  get loadedRefs() { return mockLoadedRefs.value; },
  get opponentCitedRefs() { return mockOpponentCitedRefs.value; },
  get challengesRemaining() { return mockChallengesRemaining.value; },
}));

vi.mock('../src/arena/arena-types-feed-room.ts', () => ({
  FEED_TOTAL_ROUNDS: 3,
  FEED_SCORE_BUDGET: { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 },
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get phase() { return mockPhase.value; },
  get round() { return mockRound.value; },
  get timeLeft() { return mockTimeLeft.value; },
  get scoreUsed() { return mockScoreUsed; },
  get budgetRound() { return mockBudgetRound.value; },
  get sentimentA() { return mockSentimentA.value; },
  get sentimentB() { return mockSentimentB.value; },
  get pendingSentimentA() { return mockPendingSentimentA.value; },
  get pendingSentimentB() { return mockPendingSentimentB.value; },
  set_budgetRound: mockSet_budgetRound,
  set_sentimentA: mockSet_sentimentA,
  set_sentimentB: mockSet_sentimentB,
  set_pendingSentimentA: mockSet_pendingSentimentA,
  set_pendingSentimentB: mockSet_pendingSentimentB,
}));

import {
  updateTimerDisplay, updateTurnLabel, updateRoundLabel,
  setDebaterInputEnabled, updateBudgetDisplay, resetBudget,
  updateSentimentGauge, applySentimentUpdate,
  updateCiteButtonState, updateChallengeButtonState,
  showDisconnectBanner,
} from '../src/arena/arena-feed-ui.ts';

describe('TC1 — timer and label updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="feed-timer"></div>
      <div id="feed-turn-label"></div>
      <div id="feed-round-label"></div>
    `;
  });

  it('updateTimerDisplay sets textContent via formatTimer', () => {
    mockTimeLeft.value = 45;
    updateTimerDisplay();
    expect(mockFormatTimer).toHaveBeenCalledWith(45);
    expect(document.getElementById('feed-timer')?.textContent).toBe('45s');
  });

  it('updateTurnLabel sets textContent', () => {
    updateTurnLabel('Your turn');
    expect(document.getElementById('feed-turn-label')?.textContent).toBe('Your turn');
  });

  it('updateRoundLabel sets round/total format', () => {
    mockRound.value = 2;
    updateRoundLabel();
    expect(document.getElementById('feed-round-label')?.textContent).toBe('ROUND 2/3');
  });

  it('updateTimerDisplay does not crash when element absent', () => {
    document.body.innerHTML = '';
    expect(() => updateTimerDisplay()).not.toThrow();
  });
});

describe('TC2 — setDebaterInputEnabled toggles input state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <textarea id="feed-debater-input"></textarea>
      <button id="feed-debater-send-btn"></button>
      <button id="feed-finish-turn"></button>
    `;
  });

  it('enables input when true', () => {
    setDebaterInputEnabled(true);
    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    expect(input.disabled).toBe(false);
  });

  it('disables input when false', () => {
    setDebaterInputEnabled(false);
    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    expect(input.disabled).toBe(true);
  });

  it('enables finishBtn when true', () => {
    setDebaterInputEnabled(true);
    expect((document.getElementById('feed-finish-turn') as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('TC3 — budget display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <span class="feed-score-badge" data-badge="1">5</span>
      <button class="feed-score-btn" data-pts="1"></button>
      <span class="feed-score-badge" data-badge="2">4</span>
      <button class="feed-score-btn" data-pts="2"></button>
    `;
    mockScoreUsed[1] = 0;
    mockScoreUsed[2] = 0;
  });

  it('updateBudgetDisplay sets badge text', () => {
    updateBudgetDisplay();
    expect(document.querySelector('.feed-score-badge[data-badge="1"]')?.textContent).toBe('5');
  });

  it('disables score button when budget exhausted', () => {
    mockScoreUsed[1] = 5;
    updateBudgetDisplay();
    const btn = document.querySelector('.feed-score-btn[data-pts="1"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('resetBudget calls set_budgetRound', () => {
    resetBudget(2);
    expect(mockSet_budgetRound).toHaveBeenCalledWith(2);
  });
});

describe('TC4 — sentiment gauge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="feed-sentiment-a" style="width:50%"></div>
      <div id="feed-sentiment-b" style="width:50%"></div>
    `;
    mockSentimentA.value = 60;
    mockSentimentB.value = 40;
  });

  it('updateSentimentGauge sets widths proportionally', () => {
    updateSentimentGauge();
    const fillA = document.getElementById('feed-sentiment-a') as HTMLElement;
    expect(fillA.style.width).toBe('60%');
  });

  it('defaults to 50/50 when both are zero', () => {
    mockSentimentA.value = 0;
    mockSentimentB.value = 0;
    updateSentimentGauge();
    expect((document.getElementById('feed-sentiment-a') as HTMLElement).style.width).toBe('50%');
  });

  it('applySentimentUpdate adds pending to totals', () => {
    mockSentimentA.value = 60;
    mockPendingSentimentA.value = 5;
    applySentimentUpdate();
    expect(mockSet_sentimentA).toHaveBeenCalledWith(65);
    expect(mockSet_pendingSentimentA).toHaveBeenCalledWith(0);
  });
});

describe('TC5 — cite/challenge button states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <button id="feed-cite-btn" disabled></button>
      <button id="feed-challenge-btn" disabled></button>
    `;
    mockPhase.value = 'speaker_a';
    mockCurrentDebate.value = { role: 'a', modView: false };
    mockFeedPaused.value = false;
    mockLoadedRefs.value = [{ cited: false }];
    mockOpponentCitedRefs.value = [{ already_challenged: false }];
    mockChallengesRemaining.value = 3;
  });

  it('enables cite button when it is my turn and refs available', () => {
    updateCiteButtonState();
    expect((document.getElementById('feed-cite-btn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables cite button when no uncited refs', () => {
    mockLoadedRefs.value = [];
    updateCiteButtonState();
    expect((document.getElementById('feed-cite-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables challenge button when refs available', () => {
    updateChallengeButtonState();
    expect((document.getElementById('feed-challenge-btn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables challenge button when challengesRemaining is 0', () => {
    mockChallengesRemaining.value = 0;
    updateChallengeButtonState();
    expect((document.getElementById('feed-challenge-btn') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('TC6 — showDisconnectBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div class="feed-room"></div>';
  });

  it('appends banner to .feed-room', () => {
    showDisconnectBanner('Connection lost');
    expect(document.getElementById('feed-disconnect-banner')).not.toBeNull();
  });

  it('sets banner text', () => {
    showDisconnectBanner('Opponent left');
    expect(document.getElementById('feed-disconnect-banner')?.textContent).toBe('Opponent left');
  });

  it('replaces existing banner', () => {
    showDisconnectBanner('First');
    showDisconnectBanner('Second');
    expect(document.querySelectorAll('#feed-disconnect-banner').length).toBe(1);
    expect(document.getElementById('feed-disconnect-banner')?.textContent).toBe('Second');
  });
});

describe('ARCH — arena-feed-ui.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './arena-core.utils.ts',
      './arena-state.ts',
      './arena-types-feed-room.ts',
      './arena-feed-state.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-ui.ts'),
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
