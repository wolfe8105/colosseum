/**
 * arena-feed-machine-pause.ts — Challenge-in-progress pause state, mod ruling panel UI, auto-accept timer.
 *
 * LANDMINE [LM-FEEDROOM-001] — pauseFeed/unpauseFeed/showChallengeRulingPanel misplaced in original
 * These were in the "CITE/CHALLENGE/PAUSE" section alongside reference UI,
 * but they own timer state and control the state machine. Moved out during the feed-machine split.
 * Add to THE-MODERATOR-LAND-MINE-MAP.md when session allows.
 */

import { safeRpc } from '../auth.ts';
import { showToast } from '../config.ts';
import {
  currentDebate,
  feedPauseTimeLeft,
  challengeRulingTimer, activeChallengeRefId, activeChallengeId,
  set_feedPaused, set_feedPauseTimeLeft,
  set_challengeRulingTimer,
  set_activeChallengeRefId, set_activeChallengeId,
} from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import { FEED_CHALLENGE_RULING_SEC } from './arena-types-feed-room.ts';
import {
  phase, round, timeLeft,
  set_timeLeft,
} from './arena-feed-state.ts';
import {
  updateTimerDisplay, updateTurnLabel,
  setDebaterInputEnabled,
  updateCiteButtonState, updateChallengeButtonState,
} from './arena-feed-ui.ts';

export function pauseFeed(debate: CurrentDebate): void {
  set_feedPaused(true);
  set_feedPauseTimeLeft(timeLeft);

  // Disable all inputs
  setDebaterInputEnabled(false);
  const finishBtn = document.getElementById('feed-finish-turn') as HTMLButtonElement | null;
  if (finishBtn) finishBtn.disabled = true;
  updateCiteButtonState();
  updateChallengeButtonState();

  // Show pause overlay
  updateTurnLabel('\u2694\uFE0F CHALLENGE IN PROGRESS');

  // If moderator, show ruling panel + start auto-accept timer
  if (debate.modView) {
    showChallengeRulingPanel(debate);

    // Start 60s auto-accept countdown (mod client only — prevents duplicate inserts)
    let countdown = FEED_CHALLENGE_RULING_SEC;
    const timerEl = document.getElementById('feed-timer');

    if (challengeRulingTimer) clearInterval(challengeRulingTimer);
    set_challengeRulingTimer(setInterval(() => {
      countdown--;
      if (timerEl) timerEl.textContent = `\u2694\uFE0F ${countdown}s`;
      if (countdown <= 0) {
        if (challengeRulingTimer) clearInterval(challengeRulingTimer);
        set_challengeRulingTimer(null);
        // Auto-accept: insert mod_ruling + update arsenal stats
        const refId = activeChallengeRefId;
        safeRpc('insert_feed_event', {
          p_debate_id: debate.id,
          p_event_type: 'mod_ruling',
          p_round: round,
          p_side: 'mod',
          p_content: 'Auto-accepted (moderator timeout)',
          p_reference_id: refId,
          p_metadata: { ruling: 'upheld' },
        }).then(() => {
          // F-55: rule_on_reference with stored challenge_id
          if (activeChallengeId) {
            return safeRpc('rule_on_reference', {
              p_challenge_id: activeChallengeId,
              p_ruling: 'upheld',
            });
          }
        }).catch((e: unknown) => console.warn('[Arena] Auto-accept ruling failed:', e));
        // LANDMINE [LM-MACHINE-001]: calls unpauseFeed() directly AND inserts a mod_ruling event which
        // triggers unpause again via the Realtime subscription. Potential double-unpause — one local,
        // one remote. FIX AFTER REFACTOR: (1) move unpauseFeed() inside the .then() so it fires after
        // RPCs resolve, (2) make unpauseFeed() idempotent (guard with feedPaused check) so double-call
        // from Realtime subscription is harmless. Do not touch until feed machine refactor is complete.
        unpauseFeed();
      }
    }, 1000));
  }
}

export function unpauseFeed(): void {
  set_feedPaused(false);

  // Clear ruling timer
  if (challengeRulingTimer) clearInterval(challengeRulingTimer);
  set_challengeRulingTimer(null);
  set_activeChallengeRefId(null);
  set_activeChallengeId(null);

  // Remove ruling panel if present
  document.getElementById('feed-challenge-overlay')?.remove();

  // Restore timer display
  set_timeLeft(feedPauseTimeLeft);
  set_feedPauseTimeLeft(0);
  updateTimerDisplay();

  // Re-enable controls based on current turn
  const debate = currentDebate;
  if (debate && !debate.modView) {
    const isMyTurn = (
      (phase === 'speaker_a' && debate.role === 'a') ||
      (phase === 'speaker_b' && debate.role === 'b')
    );
    setDebaterInputEnabled(isMyTurn);
    const finishBtn = document.getElementById('feed-finish-turn') as HTMLButtonElement | null;
    if (finishBtn) finishBtn.disabled = !isMyTurn;
    updateCiteButtonState();
    updateChallengeButtonState();
  }

  updateTurnLabel(phase === 'speaker_a' ? 'Side A\'s turn' : phase === 'speaker_b' ? 'Side B\'s turn' : '');
}

function showChallengeRulingPanel(debate: CurrentDebate): void {
  document.getElementById('feed-challenge-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'feed-challenge-overlay';
  overlay.id = 'feed-challenge-overlay';
  overlay.innerHTML = `
    <div class="feed-ruling-panel">
      <div class="feed-ruling-title">\u2696\uFE0F RULING NEEDED</div>
      <div class="feed-ruling-sub">A reference has been challenged. Accept or reject.</div>
      <textarea class="feed-ruling-reason" id="feed-ruling-reason" placeholder="Reason (optional, max 100 words)" maxlength="500" rows="2"></textarea>
      <div class="feed-ruling-btns">
        <button class="feed-ruling-accept" id="feed-ruling-accept">\u2705 ACCEPT (Upheld)</button>
        <button class="feed-ruling-reject" id="feed-ruling-reject">\u274C REJECT</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let busy = false;
  const handleRuling = async (ruling: 'upheld' | 'rejected') => {
    if (busy) return;
    busy = true;
    const reason = (document.getElementById('feed-ruling-reason') as HTMLTextAreaElement | null)?.value?.trim() || '';
    const label = ruling === 'upheld' ? 'UPHELD' : 'REJECTED';
    try {
      await safeRpc('insert_feed_event', {
        p_debate_id: debate.id,
        p_event_type: 'mod_ruling',
        p_round: round,
        p_side: 'mod',
        p_content: `${label}${reason ? ': ' + reason : ''}`,
        p_reference_id: activeChallengeRefId,
        p_metadata: { ruling },
      });
      // F-55: rule_on_reference with stored challenge_id
      if (activeChallengeId) {
        safeRpc('rule_on_reference', {
          p_challenge_id: activeChallengeId,
          p_ruling: ruling,
        }).catch((e) => console.warn('[Arena] rule_on_reference failed:', e));
      }
    } catch (e) {
      showToast('Ruling failed: ' + (e instanceof Error ? e.message : 'unknown'), 'error');
      busy = false;
      return;
    }
    overlay.remove();
    // unpause is triggered by the mod_ruling event received via Realtime
  };

  overlay.querySelector('#feed-ruling-accept')?.addEventListener('click', () => void handleRuling('upheld'));
  overlay.querySelector('#feed-ruling-reject')?.addEventListener('click', () => void handleRuling('rejected'));
}
