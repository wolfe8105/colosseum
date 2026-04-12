/**
 * arena-feed-machine.ts — Turn-taking state machine + pause control.
 *
 * LANDMINE [LM-FEEDROOM-001] — pauseFeed/unpauseFeed misplaced in original
 * These were in the "CITE/CHALLENGE/PAUSE" section alongside reference UI,
 * but they own timer state and control the state machine. Moved here.
 * showChallengeRulingPanel moved here too — it's pause UI, not reference UI.
 * Add to THE-MODERATOR-LAND-MINE-MAP.md when session allows.
 */

import { safeRpc, getCurrentProfile } from '../auth.ts';
import { escapeHTML, showToast } from '../config.ts';
import { nudge } from '../nudge.ts';
import { getLocalStream } from '../webrtc.ts';
import { playSound } from './arena-sounds.ts';
import { endCurrentDebate } from './arena-room-end.ts';
import { startTranscription, stopTranscription } from './arena-deepgram.ts';
import type { DeepgramStatus } from './arena-deepgram.ts';
import {
  currentDebate,
  feedTurnTimer, feedPaused, feedPauseTimeLeft,
  challengeRulingTimer, activeChallengeRefId, activeChallengeId,
  set_feedTurnTimer,
  set_feedPaused, set_feedPauseTimeLeft,
  set_challengeRulingTimer,
  set_activeChallengeRefId, set_activeChallengeId,
} from './arena-state.ts';
import type { CurrentDebate, FeedTurnPhase } from './arena-types.ts';
import {
  FEED_TURN_DURATION, FEED_PAUSE_DURATION, FEED_TOTAL_ROUNDS,
  FEED_CHALLENGE_RULING_SEC,
  FEED_AD_BREAK_DURATION, FEED_FINAL_AD_BREAK_DURATION, FEED_VOTE_GATE_DURATION,
} from './arena-types.ts';
import {
  phase, round, timeLeft, budgetRound,
  votedRounds, hasVotedFinal,
  firstSpeaker, secondSpeaker,
  set_phase, set_round, set_timeLeft,
  set_hasVotedFinal,
} from './arena-feed-state.ts';
import { appendFeedEvent, addLocalSystem, writeFeedEvent } from './arena-feed-events.ts';
import {
  updateTimerDisplay, updateTurnLabel, updateRoundLabel,
  setDebaterInputEnabled, resetBudget,
  setSpectatorVotingEnabled, applySentimentUpdate,
  updateCiteButtonState, updateChallengeButtonState,
} from './arena-feed-ui.ts';
import { handleDeepgramTranscript, showInterimTranscript, clearInterimTranscript } from './arena-feed-transcript.ts';
import { updateDeepgramStatus } from './arena-feed-transcript.ts';


export function clearFeedTimer(): void {
  if (feedTurnTimer) clearInterval(feedTurnTimer);
  set_feedTurnTimer(null);
}

export function startPreRoundCountdown(debate: CurrentDebate): void {
  set_phase('pre_round');
  set_timeLeft(3);
  updateTimerDisplay();
  updateTurnLabel('Starting...');

  set_feedTurnTimer(setInterval(() => {
    set_timeLeft(timeLeft - 1);
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearFeedTimer();
      playSound('roundStart');
      // Write round divider
      void writeFeedEvent('round_divider', `Round ${round}`, null);
      addLocalSystem(`--- Round ${round} ---`);
      // Start first speaker
      const first = firstSpeaker(round);
      startSpeakerTurn(first, debate);
    }
  }, 1000));
}

export function startSpeakerTurn(speaker: 'a' | 'b', debate: CurrentDebate): void {
  set_phase(speaker === 'a' ? 'speaker_a' : 'speaker_b');
  set_timeLeft(FEED_TURN_DURATION);
  playSound('turnSwitch');

  // Phase 2: Reset scoring budget when round changes
  if (budgetRound !== round) {
    resetBudget(round);
  }

  const isMyTurn = debate.role === speaker && !debate.modView;
  const debaterAName = debate.role === 'a'
    ? (getCurrentProfile()?.display_name || 'You')
    : debate.opponentName;
  const debaterBName = debate.role === 'b'
    ? (getCurrentProfile()?.display_name || 'You')
    : debate.opponentName;
  const speakerName = speaker === 'a' ? debaterAName : debaterBName;

  updateTurnLabel(`${speakerName}'s turn`);
  updateTimerDisplay();
  updateRoundLabel();

  // Enable/disable debater input
  if (!debate.modView) {
    setDebaterInputEnabled(isMyTurn);
    const finishBtn = document.getElementById('feed-finish-turn') as HTMLButtonElement | null;
    if (finishBtn) finishBtn.disabled = !isMyTurn;
    // Show concede after round 1
    const concedeBtn = document.getElementById('feed-concede') as HTMLButtonElement | null;
    if (concedeBtn && round > 1) concedeBtn.style.display = '';
    // Phase 3: enable cite/challenge during my turn
    updateCiteButtonState();
    updateChallengeButtonState();

    // Phase 4: Start Deepgram transcription if it's my turn and mic is available
    if (isMyTurn) {
      const localStream = getLocalStream();
      if (localStream) {
        void startTranscription(
          localStream,
          debate.language ?? 'en', // Session 240: wired to debate creator's profile language
          (text: string) => void handleDeepgramTranscript(text, debate),
          (text: string) => showInterimTranscript(text),
          (status: DeepgramStatus) => updateDeepgramStatus(status),
        );
      }
    }
  }

  set_feedTurnTimer(setInterval(() => {
    // Phase 3: skip tick while paused for challenge ruling
    if (feedPaused) return;
    set_timeLeft(timeLeft - 1);
    updateTimerDisplay();

    // Warning at 15s
    const timerEl = document.getElementById('feed-timer');
    if (timerEl) timerEl.classList.toggle('warning', timeLeft <= 15);
    if (timeLeft === 15) playSound('timerWarning');

    if (timeLeft <= 0) {
      clearFeedTimer();
      onTurnEnd(speaker, debate);
    }
  }, 1000));
}

export function finishCurrentTurn(): void {
  const debate = currentDebate;
  if (!debate) return;

  const speaker = phase === 'speaker_a' ? 'a' : phase === 'speaker_b' ? 'b' : null;
  if (!speaker) return;
  if (debate.role !== speaker || debate.modView) return; // only active speaker can finish

  clearFeedTimer();
  addLocalSystem('You finished your turn early.');
  onTurnEnd(speaker, debate);
}

export function onTurnEnd(speaker: 'a' | 'b', debate: CurrentDebate): void {
  // Disable debater input
  if (!debate.modView) setDebaterInputEnabled(false);

  // Phase 4: Stop Deepgram transcription + clear interim display
  stopTranscription();
  clearInterimTranscript();

  const first = firstSpeaker(round);
  const second = secondSpeaker(round);

  if (speaker === first) {
    // First speaker done → 10s pause → second speaker
    startPause(speaker === 'a' ? 'pause_ab' : 'pause_ba', debate);
  } else {
    // Second speaker done → round is over → ad break
    if (round >= FEED_TOTAL_ROUNDS) {
      // Phase 5: Final ad break before vote gate
      startFinalAdBreak(debate);
    } else {
      // Phase 5: Ad break between rounds
      startAdBreak(debate);
    }
  }
}

export function startPause(pausePhase: FeedTurnPhase, debate: CurrentDebate, newRound = false): void {
  set_phase(pausePhase);
  set_timeLeft(FEED_PAUSE_DURATION);

  const debaterAName = debate.role === 'a'
    ? (getCurrentProfile()?.display_name || 'You')
    : debate.opponentName;
  const debaterBName = debate.role === 'b'
    ? (getCurrentProfile()?.display_name || 'You')
    : debate.opponentName;

  // Figure out who speaks next
  let nextSpeakerSide: 'a' | 'b';
  if (newRound) {
    nextSpeakerSide = firstSpeaker(round);
    playSound('roundStart');
    void writeFeedEvent('round_divider', `Round ${round}`, null);
    addLocalSystem(`--- Round ${round} ---`);
  } else {
    nextSpeakerSide = secondSpeaker(round);
  }
  const nextName = nextSpeakerSide === 'a' ? debaterAName : debaterBName;

  updateTurnLabel(`${nextName}'s turn in...`);
  updateTimerDisplay();

  set_feedTurnTimer(setInterval(() => {
    set_timeLeft(timeLeft - 1);
    updateTimerDisplay();
    updateTurnLabel(`${nextName}'s turn in ${timeLeft}s`);

    if (timeLeft <= 0) {
      clearFeedTimer();
      startSpeakerTurn(nextSpeakerSide, debate);
    }
  }, 1000));
}

// ============================================================
// PHASE 5: AD BREAKS + SPECTATOR VOTING
// ============================================================

export function startAdBreak(debate: CurrentDebate): void {
  set_phase('ad_break');
  set_timeLeft(FEED_AD_BREAK_DURATION);

  if (!debate.modView) setDebaterInputEnabled(false);

  updateTurnLabel('COMMERCIAL BREAK');
  updateTimerDisplay();

  const overlay = showAdOverlay(FEED_AD_BREAK_DURATION);

  // Enable spectator voting during ad break
  if (debate.spectatorView && !votedRounds.has(round)) {
    setSpectatorVotingEnabled(true);
  }

  set_feedTurnTimer(setInterval(() => {
    set_timeLeft(timeLeft - 1);
    updateTimerDisplay();
    const countdownEl = overlay?.querySelector('.feed-ad-countdown');
    if (countdownEl) countdownEl.textContent = `Next round in ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearFeedTimer();
      overlay?.remove();
      setSpectatorVotingEnabled(false);
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

  // Enable spectator voting during final ad break
  if (debate.spectatorView && !votedRounds.has(round)) {
    setSpectatorVotingEnabled(true);
  }

  set_feedTurnTimer(setInterval(() => {
    set_timeLeft(timeLeft - 1);
    updateTimerDisplay();
    const countdownEl = overlay?.querySelector('.feed-ad-countdown');
    if (countdownEl) countdownEl.textContent = `Results in ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearFeedTimer();
      overlay?.remove();
      setSpectatorVotingEnabled(false);
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
  overlay.innerHTML = `
    <div class="feed-ad-inner">
      <div class="feed-ad-label">COMMERCIAL BREAK</div>
      <div class="feed-ad-countdown">Resuming in ${durationSec}s</div>
      <div class="feed-ad-slot" id="feed-ad-slot">
        <!-- Replace PUBLISHER_ID with ca-pub-XXXXXXXXXXXXXXXX and AD_UNIT_ID with your slot ID -->
        <ins class="adsbygoogle feed-ad-unit"
             style="display:block"
             data-ad-client="ca-pub-1800696416995461"
             data-ad-slot="REPLACE_WITH_AD_UNIT_ID"
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

// ============================================================
// PAUSE / UNPAUSE — moved from CITE/CHALLENGE/PAUSE section
// (see LANDMINE [LM-FEEDROOM-001] comment at file top)
// ============================================================

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
