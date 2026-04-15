/**
 * arena-feed-machine-turns.ts — Turn-taking state machine core.
 * Starts rounds, runs speaker timers, handles transitions (speaker A → pause → speaker B → next round or ad break).
 */

import { getCurrentProfile } from '../auth.ts';
import { getLocalStream } from '../webrtc.ts';
import { playSound } from './arena-sounds.ts';
import { startTranscription, stopTranscription } from './arena-deepgram.ts';
import type { DeepgramStatus } from './arena-deepgram.ts';
import {
  currentDebate,
  feedTurnTimer, feedPaused,
  set_feedTurnTimer,
} from './arena-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import type { FeedTurnPhase } from './arena-types-feed-room.ts';
import {
  FEED_TURN_DURATION, FEED_PAUSE_DURATION, FEED_TOTAL_ROUNDS,
} from './arena-types-feed-room.ts';
import {
  phase, round, timeLeft, budgetRound,
  firstSpeaker, secondSpeaker,
  set_phase, set_timeLeft,
} from './arena-feed-state.ts';
import { addLocalSystem, writeFeedEvent } from './arena-feed-events.ts';
import {
  updateTimerDisplay, updateTurnLabel, updateRoundLabel,
  setDebaterInputEnabled, resetBudget,
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
  // LANDMINE [LM-MACHINE-002]: this debater A/B name computation is duplicated in startPause below (~line 155).
  // Extract a getDebaterNames(debate) helper in a follow-up refactor.
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

  if (speaker === first) {
    // First speaker done → 10s pause → second speaker
    startPause(speaker === 'a' ? 'pause_ab' : 'pause_ba', debate);
  } else {
    // Second speaker done → round is over → ad break
    // LANDMINE [LM-MACHINE-005]: onTurnEnd → startAdBreak/startFinalAdBreak now has a microtask async gap
    // because ads.ts is loaded via dynamic import to break the turns↔ads circular dependency.
    // Sync work above (setDebaterInputEnabled, stopTranscription, clearInterimTranscript) still runs first.
    if (round >= FEED_TOTAL_ROUNDS) {
      // Phase 5: Final ad break before vote gate
      void import('./arena-feed-machine-ads.ts').then(m => m.startFinalAdBreak(debate));
    } else {
      // Phase 5: Ad break between rounds
      void import('./arena-feed-machine-ads.ts').then(m => m.startAdBreak(debate));
    }
  }
}

export function startPause(pausePhase: FeedTurnPhase, debate: CurrentDebate, newRound = false): void {
  set_phase(pausePhase);
  set_timeLeft(FEED_PAUSE_DURATION);

  // LANDMINE [LM-MACHINE-002]: duplicates name computation in startSpeakerTurn above.
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
