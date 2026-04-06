/**
 * arena-sounds.ts — Phase 5: Sound effects + haptics for live debate feed
 *
 * All sounds synthesized via Web Audio API — no audio files to load/host.
 * Each sound is under 1.5 seconds per spec §15.
 * Haptics: vibration on points awarded and reference drops only.
 * Master toggle: reads audio_sfx from localStorage('moderator_settings').
 */

// ============================================================
// AUDIO CONTEXT (lazy init)
// ============================================================

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      console.warn('[Sounds] Web Audio API not available');
      return null;
    }
  }
  // Resume if suspended (browsers require user gesture)
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// ============================================================
// SETTINGS CHECK
// ============================================================

function sfxEnabled(): boolean {
  try {
    const raw = localStorage.getItem('moderator_settings') || '{}';
    const s = JSON.parse(raw);
    // audio_sfx defaults to true if not explicitly false
    return s.audio_sfx !== false;
  } catch {
    return true;
  }
}

// ============================================================
// CORE HELPERS
// ============================================================

function osc(ctx: AudioContext, type: OscillatorType, freq: number, start: number, end: number, gain: number): void {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + end);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + end + 0.05);
}

function noise(ctx: AudioContext, start: number, duration: number, gain: number): void {
  const bufSize = Math.floor(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  src.connect(g);
  g.connect(ctx.destination);
  src.start(ctx.currentTime + start);
  src.stop(ctx.currentTime + start + duration + 0.05);
}

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
  osc(ctx, 'sine', 880, 0, 0.08, 0.2);    // A5
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
  osc(ctx, 'sine', 523, 0, 0.2, 0.2);      // C5
  osc(ctx, 'sine', 659, 0.12, 0.3, 0.2);    // E5
  osc(ctx, 'sine', 784, 0.24, 0.45, 0.2);   // G5
  osc(ctx, 'sine', 1047, 0.36, 0.7, 0.25);  // C6
  osc(ctx, 'triangle', 1047, 0.36, 0.8, 0.1); // shimmer
}

// ============================================================
// PUBLIC API
// ============================================================

const SOUNDS: Record<string, (ctx: AudioContext) => void> = {
  roundStart: sndRoundStart,
  turnSwitch: sndTurnSwitch,
  pointsAwarded: sndPointsAwarded,
  referenceDrop: sndReferenceDrop,
  challenge: sndChallenge,
  timerWarning: sndTimerWarning,
  debateEnd: sndDebateEnd,
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
  if (navigator.vibrate) {
    navigator.vibrate(ms);
  }
}
