/**
 * THE MODERATOR — WebRTC Turn Sequence Builder
 *
 * Deterministic turn sequence builder. Pure function, no side effects.
 * Both clients compute the same sequence.
 *
 * Odd rounds start with 'a', even rounds start with 'b'.
 * Round 1: A(120s) -> pause(10s) -> B(120s) -> ad(60s)
 * Round 2: B(120s) -> pause(10s) -> A(120s) -> ad(60s)
 * ...
 * Last round: -> final_ad(30s)
 */

import { DEBATE } from './config.ts';
import type { TurnStep, DebateRole } from './webrtc.types.ts';

// ============================================================
// DURATION CONSTANTS
// ============================================================

/** Duration of each debater's turn in seconds */
export const TURN_DURATION = 120;

/** Pause between turns within a round */
export const PAUSE_DURATION = 10;

/** Ad break between rounds */
export const AD_BREAK_DURATION = 60;

/** Final ad break after last turn, before vote gate */
export const FINAL_AD_DURATION = 30;

// Legacy constants kept for backward compat with any code reading them
export const ROUND_DURATION: number = DEBATE.roundDurationSec;
export const BREAK_DURATION: number = DEBATE.breakDurationSec;
export const MAX_ROUNDS: number = DEBATE.defaultRounds;

// ============================================================
// BUILDER
// ============================================================

export function buildTurnSequence(rounds: number): TurnStep[] {
  const steps: TurnStep[] = [];

  for (let round = 1; round <= rounds; round++) {
    // Odd rounds: a first. Even rounds: b first.
    const first: DebateRole = round % 2 === 1 ? 'a' : 'b';
    const second: DebateRole = first === 'a' ? 'b' : 'a';

    // First speaker's turn
    steps.push({ phase: 'speaking', round, side: first, duration: TURN_DURATION });
    // Pause between turns
    steps.push({ phase: 'pause', round, side: null, duration: PAUSE_DURATION });
    // Second speaker's turn
    steps.push({ phase: 'speaking', round, side: second, duration: TURN_DURATION });

    // Break after round
    if (round < rounds) {
      steps.push({ phase: 'ad_break', round, side: null, duration: AD_BREAK_DURATION });
    } else {
      steps.push({ phase: 'final_ad', round, side: null, duration: FINAL_AD_DURATION });
    }
  }

  return steps;
}
