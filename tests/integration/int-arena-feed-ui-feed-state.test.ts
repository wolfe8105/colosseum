// ============================================================
// SEAM #070 — arena-feed-ui → arena-feed-state
// Boundary:
//   arena-feed-ui reads phase, round, timeLeft, scoreUsed, budgetRound,
//   sentimentA, sentimentB, pendingSentimentA, pendingSentimentB from
//   arena-feed-state and calls set_budgetRound, set_sentimentA,
//   set_sentimentB, set_pendingSentimentA, set_pendingSentimentB.
// Mock boundary: @supabase/supabase-js only.
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = `
    <div id="feed-timer"></div>
    <div id="feed-turn-label"></div>
    <div id="feed-round-label"></div>
    <div id="feed-sentiment-a" style="width:50%"></div>
    <div id="feed-sentiment-b" style="width:50%"></div>
    <button class="feed-score-btn" data-pts="1"></button>
    <button class="feed-score-btn" data-pts="2"></button>
    <button class="feed-score-btn" data-pts="3"></button>
    <button class="feed-score-btn" data-pts="4"></button>
    <button class="feed-score-btn" data-pts="5"></button>
    <span class="feed-score-badge" data-badge="1"></span>
    <span class="feed-score-badge" data-badge="2"></span>
    <span class="feed-score-badge" data-badge="3"></span>
    <span class="feed-score-badge" data-badge="4"></span>
    <span class="feed-score-badge" data-badge="5"></span>
  `;
});

// TC1: ARCH — arena-feed-ui.ts imports from ./arena-feed-state.ts
describe('TC1 — ARCH: arena-feed-ui imports from arena-feed-state', () => {
  it('has an import line referencing arena-feed-state', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-feed-ui.ts'),
      'utf-8',
    );
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasFeedState = imports.some(l => l.includes('arena-feed-state'));
    expect(hasFeedState).toBe(true);
  });
});

// TC2: updateTimerDisplay uses timeLeft from arena-feed-state
describe('TC2 — updateTimerDisplay reflects timeLeft from arena-feed-state', () => {
  it('sets #feed-timer textContent to formatted timeLeft value', async () => {
    const feedState = await import('../../src/arena/arena-feed-state.ts');
    feedState.set_timeLeft(90);
    const ui = await import('../../src/arena/arena-feed-ui.ts');
    ui.updateTimerDisplay();
    const timerEl = document.getElementById('feed-timer');
    // formatTimer(90) → "1:30"
    expect(timerEl?.textContent).toBe('1:30');
  });
});

// TC3: updateRoundLabel uses round from arena-feed-state
describe('TC3 — updateRoundLabel reflects round from arena-feed-state', () => {
  it('sets #feed-round-label to ROUND {round}/N', async () => {
    const feedState = await import('../../src/arena/arena-feed-state.ts');
    feedState.set_round(2);
    const ui = await import('../../src/arena/arena-feed-ui.ts');
    ui.updateRoundLabel();
    const el = document.getElementById('feed-round-label');
    expect(el?.textContent).toMatch(/^ROUND 2\//);
  });
});

// TC4: updateBudgetDisplay disables buttons when scoreUsed reaches FEED_SCORE_BUDGET limit
describe('TC4 — updateBudgetDisplay disables exhausted score buttons', () => {
  it('disables a score button when its budget is fully consumed', async () => {
    const feedState = await import('../../src/arena/arena-feed-state.ts');
    const { FEED_SCORE_BUDGET } = await import('../../src/arena/arena-types-feed-room.ts');
    // Exhaust the budget for point value 1
    const limit = FEED_SCORE_BUDGET[1] ?? 0;
    feedState.scoreUsed[1] = limit;
    const ui = await import('../../src/arena/arena-feed-ui.ts');
    ui.updateBudgetDisplay();
    const btn = document.querySelector('.feed-score-btn[data-pts="1"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

// TC5: resetBudget calls set_budgetRound and zeroes scoreUsed
describe('TC5 — resetBudget zeroes scoreUsed and updates budgetRound', () => {
  it('sets budgetRound to the new value and resets all scoreUsed entries to 0', async () => {
    const feedState = await import('../../src/arena/arena-feed-state.ts');
    // Pre-fill some usage
    feedState.scoreUsed[1] = 3;
    feedState.scoreUsed[3] = 2;
    const ui = await import('../../src/arena/arena-feed-ui.ts');
    ui.resetBudget(2);
    expect(feedState.budgetRound).toBe(2);
    expect(feedState.scoreUsed[1]).toBe(0);
    expect(feedState.scoreUsed[3]).toBe(0);
  });
});

// TC6: applySentimentUpdate accumulates pendingSentiment into totals and resets pending
describe('TC6 — applySentimentUpdate merges pending into totals and clears pending', () => {
  it('adds pendingSentimentA/B to sentimentA/B and resets pending to 0', async () => {
    const feedState = await import('../../src/arena/arena-feed-state.ts');
    feedState.set_sentimentA(10);
    feedState.set_sentimentB(20);
    feedState.set_pendingSentimentA(5);
    feedState.set_pendingSentimentB(3);
    const ui = await import('../../src/arena/arena-feed-ui.ts');
    ui.applySentimentUpdate();
    expect(feedState.sentimentA).toBe(15);
    expect(feedState.sentimentB).toBe(23);
    expect(feedState.pendingSentimentA).toBe(0);
    expect(feedState.pendingSentimentB).toBe(0);
  });
});

// TC7: updateSentimentGauge calculates correct percentages from sentimentA/B
describe('TC7 — updateSentimentGauge sets fill widths proportionally', () => {
  it('gives 50%/50% when sentimentA and sentimentB are equal', async () => {
    const feedState = await import('../../src/arena/arena-feed-state.ts');
    feedState.set_sentimentA(50);
    feedState.set_sentimentB(50);
    const ui = await import('../../src/arena/arena-feed-ui.ts');
    ui.updateSentimentGauge();
    const fillA = document.getElementById('feed-sentiment-a') as HTMLElement;
    const fillB = document.getElementById('feed-sentiment-b') as HTMLElement;
    expect(fillA.style.width).toBe('50%');
    expect(fillB.style.width).toBe('50%');
  });

  it('gives 75%/25% when sentimentA is 3x sentimentB', async () => {
    const feedState = await import('../../src/arena/arena-feed-state.ts');
    feedState.set_sentimentA(75);
    feedState.set_sentimentB(25);
    const ui = await import('../../src/arena/arena-feed-ui.ts');
    ui.updateSentimentGauge();
    const fillA = document.getElementById('feed-sentiment-a') as HTMLElement;
    const fillB = document.getElementById('feed-sentiment-b') as HTMLElement;
    expect(fillA.style.width).toBe('75%');
    expect(fillB.style.width).toBe('25%');
  });
});
