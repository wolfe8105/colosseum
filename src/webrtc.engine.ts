/**
 * THE MODERATOR — WebRTC Turn Engine
 *
 * Walks the turn sequence, manages the timer, enforces mute on transitions,
 * fires all turn/round/break events.
 *
 * Turn-based rewrite: Session 178. One speaker at a time, Web Worker timer,
 * Date.now() drift-free countdown, enforced muting of non-speaking side.
 */

import { state, signals, fire } from './webrtc.state.ts';
import { startWorkerTimer, stopWorkerTimer } from './webrtc.timer.ts';
import { enforceMute, enforceUnmute } from './webrtc.audio.ts';
import type { DebateRole } from './webrtc.types.ts';

// ============================================================
// TURN ENGINE — replaces round management (Session 178)
//
// The sequence is deterministic. Both clients compute the same
// turnSequence array. The engine walks through steps one by one.
//
// Timer authority: the speaking side's timer expiring is the
// canonical end of a turn. They send 'turn-end'. The other side
// runs a local timer as fallback (if signal is lost, local timer
// controls local UI).
// ============================================================

/** Handle timer worker messages */
function handleTimerMessage(e: MessageEvent): void {
  const { remaining, expired } = e.data as { remaining?: number; expired?: boolean };

  if (remaining !== undefined) {
    state.debateState.timeLeft = remaining;
    state.debateState.turn.timeLeft = remaining;

    const step = state.turnSequence[state.debateState.turn.stepIndex];
    if (!step) return;

    // Fire appropriate tick event based on phase
    switch (step.phase) {
      case 'speaking':
        fire('tick', { timeLeft: remaining, round: step.round, side: step.side });
        break;
      case 'pause':
        fire('pauseTick', {
          timeLeft: remaining,
          round: step.round,
          nextSide: getNextSpeaker(state.debateState.turn.stepIndex),
        });
        break;
      case 'ad_break':
      case 'final_ad':
        fire('breakTick', { timeLeft: remaining });
        break;
    }
  }

  if (expired) {
    onStepExpired();
  }
}

/** Get the next speaking side after a pause */
function getNextSpeaker(currentStepIndex: number): DebateRole | null {
  for (let i = currentStepIndex + 1; i < state.turnSequence.length; i++) {
    if (state.turnSequence[i]!.phase === 'speaking') {
      return state.turnSequence[i]!.side;
    }
  }
  return null;
}

/** Begin a specific step in the turn sequence */
export function beginStep(stepIndex: number): void {
  if (stepIndex >= state.turnSequence.length) {
    endDebate();
    return;
  }

  const step = state.turnSequence[stepIndex]!;

  // Update state
  state.debateState.turn.stepIndex = stepIndex;
  state.debateState.turn.phase = step.phase;
  state.debateState.turn.round = step.round;
  state.debateState.turn.side = step.side;
  state.debateState.turn.timeLeft = step.duration;
  state.debateState.round = step.round;
  state.debateState.timeLeft = step.duration;

  // Determine if this client is frozen
  const myRole = state.debateState.role;
  if (step.phase === 'speaking' && step.side === myRole) {
    // My turn to speak
    state.debateState.turn.isFrozen = false;
    enforceUnmute();
  } else {
    // Not my turn, or it's a pause/break
    state.debateState.turn.isFrozen = true;
    enforceMute();
  }

  // Update status
  if (step.phase === 'speaking') {
    state.debateState.status = 'live';
  } else {
    state.debateState.status = 'break';
  }

  // Fire events
  switch (step.phase) {
    case 'speaking':
      fire('turnStart', {
        round: step.round,
        side: step.side,
        timeLeft: step.duration,
        isFrozen: state.debateState.turn.isFrozen,
      });
      // Backward compat: fire roundStart at the first turn of each round
      if (isFirstTurnOfRound(stepIndex)) {
        fire('roundStart', { round: step.round, timeLeft: step.duration });
      }
      break;

    case 'pause':
      fire('pauseStart', {
        round: step.round,
        nextSide: getNextSpeaker(stepIndex),
        timeLeft: step.duration,
      });
      break;

    case 'ad_break':
      // Backward compat: fire roundEnd then breakStart
      fire('roundEnd', { round: step.round });
      fire('breakStart', { afterRound: step.round, timeLeft: step.duration });
      break;

    case 'final_ad':
      fire('roundEnd', { round: step.round });
      fire('breakStart', { afterRound: step.round, timeLeft: step.duration, isFinal: true });
      break;
  }

  // Start the timer
  startWorkerTimer(step.duration, handleTimerMessage);
}

/** Check if this step is the first speaking turn of a new round */
function isFirstTurnOfRound(stepIndex: number): boolean {
  if (stepIndex === 0) return true;
  const current = state.turnSequence[stepIndex]!;
  const prev = state.turnSequence[stepIndex - 1];
  if (!prev) return true;
  return current.phase === 'speaking' && current.round !== prev.round;
}

// CRITICAL ORDER (W3C confirmed race): enforceMute() MUST fire before turnEnd event.
// Audio track disables synchronously. If turnEnd fires first, the speaking side's
// UI can briefly re-enable audio before mute lands. Mute first, always.

/** Called when the timer for the current step expires */
function onStepExpired(): void {
  const step = state.turnSequence[state.debateState.turn.stepIndex];
  if (!step) return;

  if (step.phase === 'speaking') {
    // CRITICAL ORDER: mute first, then fire event, then signal
    enforceMute();

    fire('turnEnd', { round: step.round, side: step.side });

    // Speaking side is timer authority — signal the other client
    if (step.side === state.debateState.role) {
      signals.sendSignal?.('turn-end', { round: step.round, side: step.side });
    }
  }

  advanceStep();
}

/** Move to the next step in the sequence */
export function advanceStep(): void {
  stopWorkerTimer();
  const nextIndex = state.debateState.turn.stepIndex + 1;
  beginStep(nextIndex);
}

/** Debater presses "Finish Turn" — ends their own turn early */
export function finishTurn(): void {
  const step = state.turnSequence[state.debateState.turn.stepIndex];
  if (!step) return;

  // Can only finish during a speaking phase that is MY turn
  if (step.phase !== 'speaking') return;
  if (step.side !== state.debateState.role) return;

  // CRITICAL ORDER: mute first
  enforceMute();

  fire('turnEnd', { round: step.round, side: step.side, early: true });

  // Signal the other client
  signals.sendSignal?.('finish-turn', { round: step.round, side: step.side });

  // Advance to next step (pause, then other speaker's turn)
  advanceStep();
}

export function endDebate(): void {
  stopWorkerTimer();
  state.debateState.status = 'ended';
  state.debateState.turn.phase = 'ended';
  state.debateState.turn.isFrozen = true;
  enforceMute();
  fire('debateEnd', { debateId: state.debateState.debateId });
}
