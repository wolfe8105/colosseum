/**
 * arena-sounds-core.ts — Shared Web Audio API primitives
 *
 * Used by arena-sounds.ts (battle SFX) and arena-intro-music.ts (intro music).
 * No external imports — only window/AudioContext types.
 */

// ============================================================
// AUDIO CONTEXT (lazy init)
// ============================================================

let _ctx: AudioContext | null = null;

export function getCtx(): AudioContext | null {
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

export function sfxEnabled(): boolean {
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

export function osc(ctx: AudioContext, type: OscillatorType, freq: number, start: number, end: number, gain: number): void {
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

export function noise(ctx: AudioContext, start: number, duration: number, gain: number): void {
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
