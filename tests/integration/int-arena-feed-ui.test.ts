// ============================================================
// INTEGRATOR — arena-feed-ui + arena-state + arena-feed-state + arena-core.utils
// Boundary:
//   arena-feed-ui reads live bindings from arena-state (currentDebate,
//   feedPaused, loadedRefs, opponentCitedRefs, challengesRemaining) and
//   arena-feed-state (phase, round, timeLeft, sentimentA/B, scoreUsed, etc.),
//   then delegates formatting to arena-core.utils (formatTimer).
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let updateTimerDisplay: () => void;
let updateRoundLabel: () => void;
let updateSentimentGauge: () => void;
let applySentimentUpdate: () => void;
let updateBudgetDisplay: () => void;
let resetBudget: (round: number) => void;
let setDebaterInputEnabled: (enabled: boolean) => void;
let updateCiteButtonState: () => void;
let updateChallengeButtonState: () => void;
let showDisconnectBanner: (msg: string) => void;

// arena-state setters
let set_currentDebate: (v: unknown) => void;
let set_loadedRefs: (v: unknown[]) => void;
let set_opponentCitedRefs: (v: unknown[]) => void;
let set_challengesRemaining: (v: number) => void;
let set_feedPaused: (v: boolean) => void;

// arena-feed-state setters
let set_timeLeft: (v: number) => void;
let set_round: (v: number) => void;
let set_sentimentA: (v: number) => void;
let set_sentimentB: (v: number) => void;
let set_pendingSentimentA: (v: number) => void;
let set_pendingSentimentB: (v: number) => void;
let set_phase: (v: string) => void;
let scoreUsed: Record<number, number>;

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  const uiMod = await import('../../src/arena/arena-feed-ui.ts');
  updateTimerDisplay = uiMod.updateTimerDisplay;
  updateRoundLabel = uiMod.updateRoundLabel;
  updateSentimentGauge = uiMod.updateSentimentGauge;
  applySentimentUpdate = uiMod.applySentimentUpdate;
  updateBudgetDisplay = uiMod.updateBudgetDisplay;
  resetBudget = uiMod.resetBudget;
  setDebaterInputEnabled = uiMod.setDebaterInputEnabled;
  updateCiteButtonState = uiMod.updateCiteButtonState;
  updateChallengeButtonState = uiMod.updateChallengeButtonState;
  showDisconnectBanner = uiMod.showDisconnectBanner;

  const stateMod = await import('../../src/arena/arena-state.ts');
  set_currentDebate = stateMod.set_currentDebate as (v: unknown) => void;
  set_loadedRefs = stateMod.set_loadedRefs as (v: unknown[]) => void;
  set_opponentCitedRefs = stateMod.set_opponentCitedRefs as (v: unknown[]) => void;
  set_challengesRemaining = stateMod.set_challengesRemaining;
  set_feedPaused = stateMod.set_feedPaused;

  const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
  set_timeLeft = feedStateMod.set_timeLeft;
  set_round = feedStateMod.set_round;
  set_sentimentA = feedStateMod.set_sentimentA;
  set_sentimentB = feedStateMod.set_sentimentB;
  set_pendingSentimentA = feedStateMod.set_pendingSentimentA;
  set_pendingSentimentB = feedStateMod.set_pendingSentimentB;
  set_phase = feedStateMod.set_phase as (v: string) => void;
  scoreUsed = feedStateMod.scoreUsed;
});

// ============================================================
// TC-I1: updateTimerDisplay — formatTimer wired to timeLeft from arena-feed-state
// ============================================================

describe('TC-I1: updateTimerDisplay uses formatTimer(timeLeft) from real arena-core.utils', () => {
  it('formats 90 seconds as "1:30" in the DOM', () => {
    document.body.innerHTML = '<div id="feed-timer"></div>';
    set_timeLeft(90);
    updateTimerDisplay();
    expect(document.getElementById('feed-timer')!.textContent).toBe('1:30');
  });

  it('formats 0 seconds as "0:00"', () => {
    document.body.innerHTML = '<div id="feed-timer"></div>';
    set_timeLeft(0);
    updateTimerDisplay();
    expect(document.getElementById('feed-timer')!.textContent).toBe('0:00');
  });

  it('does not crash when #feed-timer is absent', () => {
    document.body.innerHTML = '';
    set_timeLeft(60);
    expect(() => updateTimerDisplay()).not.toThrow();
  });
});

// ============================================================
// TC-I2: updateRoundLabel — round from arena-feed-state in DOM
// ============================================================

describe('TC-I2: updateRoundLabel reads round from arena-feed-state', () => {
  it('shows ROUND 2/4 when round is set to 2', () => {
    document.body.innerHTML = '<div id="feed-round-label"></div>';
    set_round(2);
    updateRoundLabel();
    expect(document.getElementById('feed-round-label')!.textContent).toBe('ROUND 2/4');
  });

  it('shows ROUND 1/4 for default round', () => {
    document.body.innerHTML = '<div id="feed-round-label"></div>';
    set_round(1);
    updateRoundLabel();
    expect(document.getElementById('feed-round-label')!.textContent).toBe('ROUND 1/4');
  });
});

// ============================================================
// TC-I3: updateSentimentGauge — reads sentimentA/B from arena-feed-state
// ============================================================

describe('TC-I3: updateSentimentGauge reads sentimentA/B from arena-feed-state', () => {
  it('sets fill widths proportionally when A=3, B=1 → A:75%, B:25%', () => {
    document.body.innerHTML = `
      <div id="feed-sentiment-a" style="width:50%"></div>
      <div id="feed-sentiment-b" style="width:50%"></div>`;
    set_sentimentA(3);
    set_sentimentB(1);
    updateSentimentGauge();
    expect(document.getElementById('feed-sentiment-a')!.style.width).toBe('75%');
    expect(document.getElementById('feed-sentiment-b')!.style.width).toBe('25%');
  });

  it('defaults to 50/50 when both sentiments are 0', () => {
    document.body.innerHTML = `
      <div id="feed-sentiment-a"></div>
      <div id="feed-sentiment-b"></div>`;
    set_sentimentA(0);
    set_sentimentB(0);
    updateSentimentGauge();
    expect(document.getElementById('feed-sentiment-a')!.style.width).toBe('50%');
    expect(document.getElementById('feed-sentiment-b')!.style.width).toBe('50%');
  });
});

// ============================================================
// TC-I4: applySentimentUpdate — pending sentiment flushed to real state + DOM updated
// ============================================================

describe('TC-I4: applySentimentUpdate flushes pending sentiment to state and updates DOM', () => {
  it('adds pending sentiment to running totals and clears pending', async () => {
    document.body.innerHTML = `
      <div id="feed-sentiment-a"></div>
      <div id="feed-sentiment-b"></div>`;
    set_sentimentA(2);
    set_sentimentB(2);
    set_pendingSentimentA(1);
    set_pendingSentimentB(3);

    applySentimentUpdate();

    // State: A=3, B=5 → A: 37%, B: 62% (Math.round(3/8*100)=38, 100-38=62)
    // Actually: 3/8 = 0.375 → round → 38%, B=62%
    const fillA = document.getElementById('feed-sentiment-a')!.style.width;
    const fillB = document.getElementById('feed-sentiment-b')!.style.width;
    const pctA = parseInt(fillA);
    const pctB = parseInt(fillB);
    expect(pctA + pctB).toBe(100);
    expect(pctA).toBe(38);
    expect(pctB).toBe(62);

    // Pending reset confirmed via re-importing the module's live binding
    const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
    expect(feedStateMod.pendingSentimentA).toBe(0);
    expect(feedStateMod.pendingSentimentB).toBe(0);
  });
});

// ============================================================
// TC-I5: updateBudgetDisplay — scoreUsed from arena-feed-state shapes badge text + button state
// ============================================================

describe('TC-I5: updateBudgetDisplay reads scoreUsed from arena-feed-state', () => {
  it('shows remaining count in badge and enables button when budget not exhausted', () => {
    document.body.innerHTML = `
      <span class="feed-score-badge" data-badge="1">?</span>
      <button class="feed-score-btn" data-pts="1">1pt</button>`;
    // FEED_SCORE_BUDGET[1] = 6 (from arena-types-feed-room) — scoreUsed[1]=0 → 6 left
    scoreUsed[1] = 0;
    updateBudgetDisplay();
    const badge = document.querySelector('.feed-score-badge[data-badge="1"]')!;
    const btn = document.querySelector('.feed-score-btn[data-pts="1"]') as HTMLButtonElement;
    expect(badge.textContent).toBe('6');
    expect(btn.disabled).toBe(false);
  });

  it('disables button when budget is exhausted (scoreUsed at limit)', () => {
    document.body.innerHTML = `
      <span class="feed-score-badge" data-badge="1">?</span>
      <button class="feed-score-btn" data-pts="1">1pt</button>`;
    // FEED_SCORE_BUDGET[1] = 6 — set scoreUsed[1]=6 → 0 left
    scoreUsed[1] = 6;
    updateBudgetDisplay();
    const btn = document.querySelector('.feed-score-btn[data-pts="1"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

// ============================================================
// TC-I6: resetBudget — calls set_budgetRound and zeros scoreUsed, then re-renders
// ============================================================

describe('TC-I6: resetBudget updates budgetRound in arena-feed-state and re-renders DOM', () => {
  it('resets scoreUsed to 0 and shows full remaining budget in DOM', async () => {
    document.body.innerHTML = `
      <span class="feed-score-badge" data-badge="1">?</span>
      <button class="feed-score-btn" data-pts="1">1pt</button>`;
    scoreUsed[1] = 6; // exhaust it
    resetBudget(2);

    const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
    expect(feedStateMod.budgetRound).toBe(2);
    expect(scoreUsed[1]).toBe(0);

    const badge = document.querySelector('.feed-score-badge[data-badge="1"]')!;
    expect(badge.textContent).toBe('6');
  });
});

// ============================================================
// TC-I7: updateCiteButtonState — reads currentDebate + loadedRefs + feedPaused from arena-state
// ============================================================

describe('TC-I7: updateCiteButtonState reads cross-module state to enable/disable cite button', () => {
  it('enables cite button when it is debater A turn in speaker_a phase with uncited refs', () => {
    document.body.innerHTML = '<button id="feed-cite-btn" disabled></button>';
    set_currentDebate({ id: 'debate-1', role: 'a', modView: false } as any);
    set_loadedRefs([{ id: 'ref-1', cited: false }]);
    set_feedPaused(false);
    set_phase('speaker_a');

    updateCiteButtonState();

    const btn = document.getElementById('feed-cite-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('disables cite button when feedPaused is true', () => {
    document.body.innerHTML = '<button id="feed-cite-btn"></button>';
    set_currentDebate({ id: 'debate-1', role: 'a', modView: false } as any);
    set_loadedRefs([{ id: 'ref-1', cited: false }]);
    set_feedPaused(true);
    set_phase('speaker_a');

    updateCiteButtonState();

    const btn = document.getElementById('feed-cite-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('disables cite button when all refs are already cited', () => {
    document.body.innerHTML = '<button id="feed-cite-btn"></button>';
    set_currentDebate({ id: 'debate-1', role: 'a', modView: false } as any);
    set_loadedRefs([{ id: 'ref-1', cited: true }]);
    set_feedPaused(false);
    set_phase('speaker_a');

    updateCiteButtonState();

    const btn = document.getElementById('feed-cite-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('ALL CITED');
  });

  it('disables cite button when it is not debater A turn', () => {
    document.body.innerHTML = '<button id="feed-cite-btn"></button>';
    set_currentDebate({ id: 'debate-1', role: 'a', modView: false } as any);
    set_loadedRefs([{ id: 'ref-1', cited: false }]);
    set_feedPaused(false);
    set_phase('speaker_b'); // opponent's turn

    updateCiteButtonState();

    const btn = document.getElementById('feed-cite-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

// ============================================================
// TC-I8: updateChallengeButtonState — reads opponentCitedRefs + challengesRemaining from arena-state
// ============================================================

describe('TC-I8: updateChallengeButtonState reads opponentCitedRefs + challengesRemaining', () => {
  it('enables challenge button when challengeable refs exist and challenges remain', () => {
    document.body.innerHTML = '<button id="feed-challenge-btn" disabled></button>';
    set_currentDebate({ id: 'debate-1', role: 'a', modView: false } as any);
    set_opponentCitedRefs([{ ref_id: 'ref-2', already_challenged: false }]);
    set_challengesRemaining(2);
    set_feedPaused(false);
    set_phase('speaker_a');

    updateChallengeButtonState();

    const btn = document.getElementById('feed-challenge-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toContain('(2)');
  });

  it('disables challenge button when challengesRemaining is 0', () => {
    document.body.innerHTML = '<button id="feed-challenge-btn"></button>';
    set_currentDebate({ id: 'debate-1', role: 'a', modView: false } as any);
    set_opponentCitedRefs([{ ref_id: 'ref-2', already_challenged: false }]);
    set_challengesRemaining(0);
    set_feedPaused(false);
    set_phase('speaker_a');

    updateChallengeButtonState();

    const btn = document.getElementById('feed-challenge-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

// ============================================================
// TC-I9: showDisconnectBanner — creates banner in .feed-room
// ============================================================

describe('TC-I9: showDisconnectBanner creates visible DOM element', () => {
  it('prepends banner to .feed-room with the given message', () => {
    document.body.innerHTML = '<div class="feed-room"></div>';
    showDisconnectBanner('Opponent disconnected');

    const banner = document.getElementById('feed-disconnect-banner');
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toBe('Opponent disconnected');
    expect(document.querySelector('.feed-room')!.firstChild).toBe(banner);
  });

  it('replaces a previous banner rather than stacking', () => {
    document.body.innerHTML = `<div class="feed-room">
      <div id="feed-disconnect-banner" class="feed-disconnect-banner">Old message</div>
    </div>`;
    showDisconnectBanner('New message');

    const banners = document.querySelectorAll('#feed-disconnect-banner');
    expect(banners.length).toBe(1);
    expect(banners[0].textContent).toBe('New message');
  });
});

// ============================================================
// ARCH — import boundaries have not changed
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — arena-feed-ui.ts import boundaries', () => {
  it('imports only from arena-core.utils, arena-state, arena-types-feed-room, arena-feed-state', () => {
    const allowed = new Set([
      './arena-core.utils.ts',
      './arena-state.ts',
      './arena-types-feed-room.ts',
      './arena-feed-state.ts',
    ]);
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-feed-ui.ts'),
      'utf-8'
    );
    const paths = source.split('\n')
      .filter(l => l.trimStart().startsWith('import '))
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter((p): p is string => Boolean(p));
    for (const path of paths) {
      expect(allowed, `Unexpected import in arena-feed-ui.ts: ${path}`).toContain(path);
    }
  });
});
