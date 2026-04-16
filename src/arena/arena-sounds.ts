/**
 * arena-sounds.ts — Battle SFX + haptics orchestrator
 *
 * Thin entry point for arena sound effects. Primitives live in arena-sounds-core.ts;
 * intro music lives in arena-intro-music.ts. This file owns the 7 battle SFX
 * synthesizers and the public playSound / vibrate API.
 */

import { getCtx, sfxEnabled, osc, noise } from './arena-sounds-core.ts';

// ============================================================
// 7 SOUNDS (spec §15)
// ============================================================

/** 1. Round start — ascending two-tone bell */
function sndRoundStart(ctx: AudioContext): void {
  osc(ctx, 'sine', 523, 0, 0.15, 0.25);      // C5
  osc(ctx, 'sine', 659, 0.08, 0.25, 0.25);    // E5
  osc(ctx, 'triangle', 1047, 0.05, 0.3, 0.1); // C6 shimmer
}

/** 2. Turn switch — quick distinct blip */
function sndTurnSwitch(ctx: AudioContext): void {
  osc(ctx, 'sine', 880, 0, 0.08, 0.2);      // A5
  osc(ctx, 'sine', 1047, 0.04, 0.12, 0.15); // C6
}

/** 3. Points awarded — metallic cha-ching */
function sndPointsAwarded(ctx: AudioContext): void {
  osc(ctx, 'triangle', 1047, 0, 0.12, 0.2);   // C6
  osc(ctx, 'triangle', 1319, 0.06, 0.18, 0.2); // E6
  osc(ctx, 'triangle', 1568, 0.1, 0.3, 0.15);  // G6
  noise(ctx, 0, 0.05, 0.15); // metallic attack
}

/** 4. Reference dropped — deep thud + high ping */
function sndReferenceDrop(ctx: AudioContext): void {
  osc(ctx, 'sine', 131, 0, 0.2, 0.3);      // C3 thud
  osc(ctx, 'sine', 2093, 0.1, 0.35, 0.12); // C7 ping
  noise(ctx, 0, 0.04, 0.2); // impact
}

/** 5. Reference challenge — warning descending tones */
function sndChallenge(ctx: AudioContext): void {
  osc(ctx, 'square', 659, 0, 0.12, 0.12);   // E5
  osc(ctx, 'square', 523, 0.1, 0.25, 0.12); // C5
  osc(ctx, 'square', 440, 0.2, 0.35, 0.1);  // A4
}

/** 6. Timer warning (15s) — subtle tick */
function sndTimerWarning(ctx: AudioContext): void {
  noise(ctx, 0, 0.03, 0.1);
  osc(ctx, 'sine', 1000, 0, 0.04, 0.08);
}

/** 7. Debate end / winner — ascending celebration arpeggio */
function sndDebateEnd(ctx: AudioContext): void {
  osc(ctx, 'sine', 523, 0, 0.2, 0.2);        // C5
  osc(ctx, 'sine', 659, 0.12, 0.3, 0.2);     // E5
  osc(ctx, 'sine', 784, 0.24, 0.45, 0.2);    // G5
  osc(ctx, 'sine', 1047, 0.36, 0.7, 0.25);   // C6
  osc(ctx, 'triangle', 1047, 0.36, 0.8, 0.1); // shimmer
}

// ============================================================
// PUBLIC API
// ============================================================

const SOUNDS: Record<string, (ctx: AudioContext) => void> = {
  roundStart:    sndRoundStart,
  turnSwitch:    sndTurnSwitch,
  pointsAwarded: sndPointsAwarded,
  referenceDrop: sndReferenceDrop,
  challenge:     sndChallenge,
  timerWarning:  sndTimerWarning,
  debateEnd:     sndDebateEnd,
};

export type SoundName = keyof typeof SOUNDS;

export function playSound(name: SoundName): void {
  if (!sfxEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const fn = SOUNDS[name];
  if (fn) fn(ctx);
}

/** Vibrate for haptic feedback. Only on points + reference drops. */
export function vibrate(ms: number = 50): void {
  if (!sfxEnabled()) return;
  if (navigator.vibrate) navigator.vibrate(ms);
}

// ============================================================
// INTRO MUSIC RE-EXPORTS (arena-intro-music.ts)
// ============================================================

export type { IntroTrack } from './arena-intro-music.ts';
export { INTRO_TRACKS, playIntroMusic, stopIntroMusic } from './arena-intro-music.ts';
