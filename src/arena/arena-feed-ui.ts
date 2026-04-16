/**
 * arena-feed-ui.ts — Pure DOM helper/display functions for the feed room.
 *
 * These functions update elements and have no timer logic.
 * They read from arena-feed-state.ts and arena-state.ts but never set timers.
 */

import { formatTimer } from './arena-core.utils.ts';
import {
  currentDebate,
  feedPaused,
  loadedRefs,
  opponentCitedRefs,
  challengesRemaining,
} from './arena-state.ts';
import {
  FEED_TOTAL_ROUNDS,
  FEED_SCORE_BUDGET,
} from './arena-types-feed-room.ts';
import {
  phase, round, timeLeft,
  scoreUsed, budgetRound,
  sentimentA, sentimentB,
  pendingSentimentA, pendingSentimentB,
  set_budgetRound,
  set_sentimentA, set_sentimentB,
  set_pendingSentimentA, set_pendingSentimentB,
} from './arena-feed-state.ts';


export function updateTimerDisplay(): void {
  const timerEl = document.getElementById('feed-timer');
  if (timerEl) timerEl.textContent = formatTimer(Math.max(0, timeLeft));
}

export function updateTurnLabel(text: string): void {
  const el = document.getElementById('feed-turn-label');
  if (el) el.textContent = text;
}

export function updateRoundLabel(): void {
  const el = document.getElementById('feed-round-label');
  if (el) el.textContent = `ROUND ${round}/${FEED_TOTAL_ROUNDS}`;
}

export function setDebaterInputEnabled(enabled: boolean): void {
  const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement | null;
  const sendBtn = document.getElementById('feed-debater-send-btn') as HTMLButtonElement | null;
  const finishBtn = document.getElementById('feed-finish-turn') as HTMLButtonElement | null;

  if (input) {
    input.disabled = !enabled;
    input.placeholder = enabled ? 'Type your argument...' : 'Waiting for opponent...';
    input.classList.toggle('feed-input-frozen', !enabled);
  }
  if (sendBtn) sendBtn.disabled = !enabled || !(input && input.value.trim().length > 0);
  if (finishBtn) finishBtn.disabled = !enabled;
}

/** Update budget badge text + disabled state on each score button */
export function updateBudgetDisplay(): void {
  for (let pts = 1; pts <= 5; pts++) {
    const limit = FEED_SCORE_BUDGET[pts] ?? 0;
    const used = scoreUsed[pts] ?? 0;
    const remaining = Math.max(0, limit - used);
    // Update badge
    const badge = document.querySelector(`.feed-score-badge[data-badge="${pts}"]`);
    if (badge) badge.textContent = String(remaining);
    // Disable button if exhausted
    const btn = document.querySelector(`.feed-score-btn[data-pts="${pts}"]`) as HTMLButtonElement | null;
    if (btn) btn.disabled = remaining <= 0;
  }
}

/** Reset budget counters for a new round */
export function resetBudget(newRound: number): void {
  set_budgetRound(newRound);
  for (let pts = 1; pts <= 5; pts++) {
    scoreUsed[pts] = 0;
  }
  updateBudgetDisplay();
}

export function setSpectatorVotingEnabled(_enabled: boolean): void {
  // F-58: Tip strip is always active during live debates.
  // The tier gate (Unranked check in cast_sentiment_tip) is the only lock —
  // not the round timer. Called by arena-feed-machine at ad-break start/end;
  // intentionally leave tip buttons untouched here.
}

export function updateSentimentGauge(): void {
  const total = sentimentA + sentimentB;
  const pctA = total > 0 ? Math.round((sentimentA / total) * 100) : 50;
  const pctB = total > 0 ? 100 - pctA : 50;
  const fillA = document.getElementById('feed-sentiment-a');
  const fillB = document.getElementById('feed-sentiment-b');
  if (fillA) fillA.style.width = pctA + '%';
  if (fillB) fillB.style.width = pctB + '%';
}

export function applySentimentUpdate(): void {
  set_sentimentA(sentimentA + pendingSentimentA);
  set_sentimentB(sentimentB + pendingSentimentB);
  set_pendingSentimentA(0);
  set_pendingSentimentB(0);
  updateSentimentGauge();
}

export function updateCiteButtonState(): void {
  const btn = document.getElementById('feed-cite-btn') as HTMLButtonElement | null;
  if (!btn) return;
  const debate = currentDebate;
  const isMyTurn = debate && !debate.modView && (
    (phase === 'speaker_a' && debate.role === 'a') ||
    (phase === 'speaker_b' && debate.role === 'b')
  );
  const uncited = loadedRefs.filter((r) => !r.cited);
  btn.disabled = !isMyTurn || uncited.length === 0 || feedPaused;
  if (uncited.length === 0 && loadedRefs.length > 0) {
    btn.textContent = '\uD83D\uDCC4 ALL CITED';
  }
}

export function updateChallengeButtonState(): void {
  const btn = document.getElementById('feed-challenge-btn') as HTMLButtonElement | null;
  if (!btn) return;
  const debate = currentDebate;
  const isMyTurn = debate && !debate.modView && (
    (phase === 'speaker_a' && debate.role === 'a') ||
    (phase === 'speaker_b' && debate.role === 'b')
  );
  const challengeable = opponentCitedRefs.filter((r) => !r.already_challenged);
  btn.disabled = !isMyTurn || challengeable.length === 0 || challengesRemaining <= 0 || feedPaused;
  btn.textContent = `\u2694\uFE0F CHALLENGE (${challengesRemaining})`;
}
