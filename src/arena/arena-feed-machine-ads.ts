/**
 * arena-feed-machine-ads.ts — Phase 5: commercial break + final ad break + vote gate.
 * Statically imports startPreRoundCountdown from arena-feed-machine-turns.ts (one-way static).
 * The reverse direction (turns → ads) is via dynamic import to break the cycle.
 */

import { safeRpc } from '../auth.ts';
import { escapeHTML } from '../config.ts';
import { nudge } from '../nudge.ts';
import { playSound } from './arena-sounds.ts';
import { endCurrentDebate } from './arena-room-end.ts';
import {
  currentDebate,
  set_feedTurnTimer,
} from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import {
  FEED_AD_BREAK_DURATION, FEED_FINAL_AD_BREAK_DURATION, FEED_VOTE_GATE_DURATION,
} from './arena-types-feed-room.ts';
import {
  round, timeLeft, votedRounds, hasVotedFinal,
  set_phase, set_round, set_timeLeft,
  set_hasVotedFinal,
} from './arena-feed-state.ts';
import { addLocalSystem } from './arena-feed-events.ts';
import {
  updateTimerDisplay, updateTurnLabel, updateRoundLabel,
  setDebaterInputEnabled,
  applySentimentUpdate,
} from './arena-feed-ui.ts';
import { clearFeedTimer, startPreRoundCountdown } from './arena-feed-machine-turns.ts';

export function startAdBreak(debate: CurrentDebate): void {
  set_phase('ad_break');
  set_timeLeft(FEED_AD_BREAK_DURATION);

  if (!debate.modView) setDebaterInputEnabled(false);

  updateTurnLabel('COMMERCIAL BREAK');
  updateTimerDisplay();

  const overlay = showAdOverlay(FEED_AD_BREAK_DURATION);

  // LANDMINE [LM-MACHINE-004]: startAdBreak and startFinalAdBreak share ~80% of their code
  // (setDebaterInputEnabled, showAdOverlay, spectator voting enable, setInterval body).
  // Candidate for extraction to a shared runAdCountdown(durationSec, onComplete) helper in a follow-up refactor.
  set_feedTurnTimer(setInterval(() => {
    set_timeLeft(timeLeft - 1);
    updateTimerDisplay();
    const countdownEl = overlay?.querySelector('.feed-ad-countdown');
    if (countdownEl) countdownEl.textContent = `Next round in ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearFeedTimer();
      overlay?.remove();
      applySentimentUpdate();
      // Advance to next round (round_divider written by startPreRoundCountdown)
      set_round(round + 1);
      updateRoundLabel();
      startPreRoundCountdown(debate);
    }
  }, 1000));
}

export function startFinalAdBreak(debate: CurrentDebate): void {
  set_phase('final_ad_break');
  set_timeLeft(FEED_FINAL_AD_BREAK_DURATION);

  if (!debate.modView) setDebaterInputEnabled(false);

  updateTurnLabel('FINAL BREAK');
  updateTimerDisplay();

  const overlay = showAdOverlay(FEED_FINAL_AD_BREAK_DURATION);

  set_feedTurnTimer(setInterval(() => {
    set_timeLeft(timeLeft - 1);
    updateTimerDisplay();
    const countdownEl = overlay?.querySelector('.feed-ad-countdown');
    if (countdownEl) countdownEl.textContent = `Results in ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearFeedTimer();
      overlay?.remove();
      applySentimentUpdate();

      // Vote gate for spectators, straight to finish for debaters/mod
      if (debate.spectatorView && !hasVotedFinal) {
        showVoteGate(debate);
      } else {
        set_phase('finished');
        playSound('debateEnd');
        addLocalSystem('Debate complete!');
        nudge('feed_debate_end', '\u2696\uFE0F The debate has concluded.');
        setTimeout(() => void endCurrentDebate(), 2000);
      }
    }
  }, 1000));
}

/**
 * Show ad overlay covering the feed. Mod clients skip this.
 * Returns the overlay element (or null for mod) so the caller can remove it.
 */
function showAdOverlay(durationSec: number): HTMLElement | null {
  const debate = currentDebate;
  if (debate?.modView) return null;

  document.getElementById('feed-ad-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'feed-ad-overlay';
  overlay.className = 'feed-ad-overlay';
  // LANDMINE [LM-MACHINE-003]: Hardcoded AdSense publisher ID (ca-pub-1800696416995461) and slot (8647716209).
  // Should be parameterized via config.
  overlay.innerHTML = `
    <div class="feed-ad-inner">
      <div class="feed-ad-label">COMMERCIAL BREAK</div>
      <div class="feed-ad-countdown">Resuming in ${durationSec}s</div>
      <div class="feed-ad-slot" id="feed-ad-slot">
        <!-- AdSense unit -->
        <ins class="adsbygoogle feed-ad-unit"
             style="display:block"
             data-ad-client="ca-pub-1800696416995461"
             data-ad-slot="8647716209"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      </div>
    </div>
  `;

  const feedRoom = document.querySelector('.feed-room');
  if (feedRoom) feedRoom.appendChild(overlay);

  // Trigger AdSense to fill the slot
  try {
    (window as unknown as Record<string, unknown[]>).adsbygoogle =
      (window as unknown as Record<string, unknown[]>).adsbygoogle || [];
    ((window as unknown as Record<string, unknown[]>).adsbygoogle).push({});
  } catch { /* AdSense not loaded — ad slot stays empty, debate continues */ }

  return overlay;
}

function showVoteGate(debate: CurrentDebate): void {
  set_phase('vote_gate');
  set_timeLeft(FEED_VOTE_GATE_DURATION);
  updateTurnLabel('VOTE TO SEE RESULTS');
  updateTimerDisplay();

  document.getElementById('feed-ad-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'feed-vote-gate';
  overlay.className = 'feed-vote-gate';
  overlay.innerHTML = `
    <div class="feed-vote-gate-inner">
      <div class="feed-vote-gate-title">CAST YOUR FINAL VOTE</div>
      <div class="feed-vote-gate-sub">Vote to see the final score and sentiment</div>
      <div class="feed-vote-gate-row">
        <button class="feed-vote-btn feed-vote-a" id="feed-gate-a">${escapeHTML(debate.debaterAName || 'Side A')}</button>
        <button class="feed-vote-btn feed-vote-b" id="feed-gate-b">${escapeHTML(debate.debaterBName || 'Side B')}</button>
      </div>
      <div class="feed-vote-gate-timer" id="feed-gate-timer">Results in ${timeLeft}s</div>
    </div>
  `;

  const feedRoom = document.querySelector('.feed-room');
  if (feedRoom) feedRoom.appendChild(overlay);

  let resolved = false;
  const resolveGate = async (side?: 'a' | 'b') => {
    if (resolved) return;
    resolved = true;
    set_hasVotedFinal(true);
    clearFeedTimer();

    if (side) {
      try {
        await safeRpc('vote_arena_debate', { p_debate_id: debate.id, p_vote: side });
      } catch (e) {
        console.warn('[FeedRoom] vote_arena_debate failed:', e);
      }
    }

    overlay.remove();
    set_phase('finished');
    playSound('debateEnd');
    addLocalSystem('Debate complete!');
    nudge('feed_debate_end', '\u2696\uFE0F The debate has concluded.');
    setTimeout(() => void endCurrentDebate(), 2000);
  };

  overlay.querySelector('#feed-gate-a')?.addEventListener('click', () => void resolveGate('a'));
  overlay.querySelector('#feed-gate-b')?.addEventListener('click', () => void resolveGate('b'));

  set_feedTurnTimer(setInterval(() => {
    set_timeLeft(timeLeft - 1);
    updateTimerDisplay();
    const timerEl = document.getElementById('feed-gate-timer');
    if (timerEl) timerEl.textContent = `Results in ${timeLeft}s`;
    if (timeLeft <= 0) {
      void resolveGate();
    }
  }, 1000));
}
