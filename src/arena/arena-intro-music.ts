/**
 * arena-intro-music.ts — F-21: Synthesized intro music for debater entrance screen
 *
 * 10 synthesized tracks (~4s each). No audio files — Web Audio only.
 * Custom track: plays via <audio> element from signed URL.
 */

import { getCtx, sfxEnabled, osc, noise } from './arena-sounds-core.ts';

// ============================================================
// TRACK METADATA
// ============================================================

/** Track metadata shown in the picker UI */
export interface IntroTrack {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly description: string;
}

export const INTRO_TRACKS: readonly IntroTrack[] = [
  { id: 'gladiator', label: 'Gladiator',  icon: '⚔️',  description: 'Triumphant fanfare' },
  { id: 'thunder',   label: 'Thunder',    icon: '⚡',  description: 'Heavy drums & power' },
  { id: 'scholar',   label: 'Scholar',    icon: '📚',  description: 'Classical ascending' },
  { id: 'phantom',   label: 'Phantom',    icon: '👻',  description: 'Dark minor descent' },
  { id: 'phoenix',   label: 'Phoenix',    icon: '🔥',  description: 'Sweeping rise' },
  { id: 'colossus',  label: 'Colossus',   icon: '🏛️',  description: 'Deep & unstoppable' },
  { id: 'viper',     label: 'Viper',      icon: '🐍',  description: 'Rapid tense stabs' },
  { id: 'oracle',    label: 'Oracle',     icon: '🔮',  description: 'Mysterious pads' },
  { id: 'champion',  label: 'Champion',   icon: '🏆',  description: 'Victory march' },
  { id: 'ghost',     label: 'Ghost',      icon: '🌫️',  description: 'Minimal & eerie' },
] as const;

// ============================================================
// TRACK SYNTHESIZERS
// ============================================================

function introGladiator(ctx: AudioContext): void {
  // Triumphant C major fanfare
  const notes = [523, 659, 784, 1047, 784, 1047, 1319];
  const times = [0, 0.15, 0.3, 0.5, 0.75, 0.9, 1.1];
  notes.forEach((f, i) => osc(ctx, 'triangle', f, times[i]!, times[i]! + 0.35, 0.22));
  osc(ctx, 'sine', 261, 0, 1.6, 0.12); // bass root
  noise(ctx, 0, 0.06, 0.18);
  noise(ctx, 0.5, 0.06, 0.15);
  noise(ctx, 1.1, 0.1, 0.2);
}

function introThunder(ctx: AudioContext): void {
  // Heavy drum pattern + low power chord
  const hits = [0, 0.4, 0.6, 0.8, 1.0, 1.2, 1.5];
  hits.forEach((t, i) => {
    noise(ctx, t, 0.15, i % 2 === 0 ? 0.4 : 0.2);
    osc(ctx, 'sine', 55 + (i % 3) * 20, t, t + 0.18, 0.3);
  });
  osc(ctx, 'sawtooth', 110, 0, 1.8, 0.08);
}

function introScholar(ctx: AudioContext): void {
  // Bach-ish ascending motif in C major
  const melody = [392, 440, 494, 523, 587, 659, 698, 784];
  melody.forEach((f, i) => osc(ctx, 'sine', f, i * 0.18, i * 0.18 + 0.28, 0.18));
  // harmony
  const harmony = [261, 330, 392, 440];
  harmony.forEach((f, i) => osc(ctx, 'sine', f, i * 0.36, i * 0.36 + 0.5, 0.08));
}

function introPhantom(ctx: AudioContext): void {
  // Dark descending minor — A minor
  const notes = [880, 831, 784, 740, 698, 659, 587, 523];
  notes.forEach((f, i) => osc(ctx, 'sawtooth', f, i * 0.2, i * 0.2 + 0.35, 0.12));
  osc(ctx, 'sine', 110, 0, 2.0, 0.15);
  noise(ctx, 0, 2.0, 0.04); // eerie hiss
}

function introPhoenix(ctx: AudioContext): void {
  // Sweeping rise — sine glide + shimmer
  const g = ctx.createGain();
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(220, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 1.8);
  g.gain.setValueAtTime(0.01, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.6);
  g.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 1.9);
  o.connect(g); g.connect(ctx.destination);
  o.start(ctx.currentTime); o.stop(ctx.currentTime + 2.0);
  // burst notes at top
  [1047, 1319, 1568].forEach((f, i) =>
    osc(ctx, 'triangle', f, 1.4 + i * 0.12, 1.4 + i * 0.12 + 0.3, 0.2)
  );
  noise(ctx, 1.4, 0.3, 0.2);
}

function introColossus(ctx: AudioContext): void {
  // Massive low impacts
  const impacts = [0, 0.55, 0.9, 1.3];
  impacts.forEach((t) => {
    osc(ctx, 'sine', 55, t, t + 0.4, 0.35);
    osc(ctx, 'sine', 82, t + 0.02, t + 0.35, 0.2);
    noise(ctx, t, 0.12, 0.35);
  });
  osc(ctx, 'sawtooth', 110, 0, 1.8, 0.06);
}

function introViper(ctx: AudioContext): void {
  // Rapid staccato tension — chromatic jabs
  const pattern = [659, 622, 659, 587, 659, 554, 659, 523];
  const interval = 0.16;
  pattern.forEach((f, i) =>
    osc(ctx, 'square', f, i * interval, i * interval + 0.1, 0.14)
  );
  // tail rattle
  for (let i = 0; i < 6; i++) noise(ctx, 1.4 + i * 0.06, 0.04, 0.15);
}

function introOracle(ctx: AudioContext): void {
  // Sustained mystical pads — perfect 5ths
  [[196, 293, 392], [220, 330, 440]].forEach(([a, b, c], i) => {
    const t = i * 0.9;
    osc(ctx, 'sine', a!, t, t + 1.4, 0.12);
    osc(ctx, 'sine', b!, t + 0.1, t + 1.3, 0.1);
    osc(ctx, 'sine', c!, t + 0.2, t + 1.2, 0.08);
  });
  noise(ctx, 0, 1.8, 0.03);
}

function introChampion(ctx: AudioContext): void {
  // Military march rhythm + bugle call
  const snare = [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5];
  snare.forEach((t, i) => noise(ctx, t, 0.06, i % 2 === 0 ? 0.2 : 0.1));
  // bugle motif (G major)
  const bugle = [392, 523, 659, 784, 659, 784, 1047];
  const bTimes = [0.1, 0.3, 0.5, 0.7, 1.0, 1.2, 1.5];
  bugle.forEach((f, i) => osc(ctx, 'triangle', f, bTimes[i]!, bTimes[i]! + 0.28, 0.2));
}

function introGhost(ctx: AudioContext): void {
  // Sparse eerie pulses
  [0, 0.7, 1.2, 1.6].forEach((t, i) => {
    osc(ctx, 'sine', 220 + i * 30, t, t + 0.6, 0.08);
    osc(ctx, 'sine', 440 + i * 15, t + 0.1, t + 0.5, 0.04);
  });
  noise(ctx, 0, 1.8, 0.025);
  // single high ping at end
  osc(ctx, 'sine', 2093, 1.5, 1.9, 0.06);
}

const INTRO_SYNTHS: Record<string, (ctx: AudioContext) => void> = {
  gladiator: introGladiator,
  thunder:   introThunder,
  scholar:   introScholar,
  phantom:   introPhantom,
  phoenix:   introPhoenix,
  colossus:  introColossus,
  viper:     introViper,
  oracle:    introOracle,
  champion:  introChampion,
  ghost:     introGhost,
};

// ============================================================
// PUBLIC API
// ============================================================

let _introAudioEl: HTMLAudioElement | null = null;

/**
 * Play a debater's intro music. Called on match found screen.
 * trackId='custom' + customUrl → fetch signed URL and play via <audio>.
 * Any standard trackId → synthesize immediately.
 */
export function playIntroMusic(trackId: string, customUrl?: string | null): void {
  if (!sfxEnabled()) return;
  // Stop any playing custom audio
  if (_introAudioEl) { _introAudioEl.pause(); _introAudioEl = null; }

  if (trackId === 'custom' && customUrl) {
    const audio = new Audio(customUrl);
    audio.volume = 0.7;
    _introAudioEl = audio;
    audio.play().catch(() => { /* autoplay blocked — silent */ });
    return;
  }

  const fn = INTRO_SYNTHS[trackId] ?? INTRO_SYNTHS['gladiator']!;
  const ctx = getCtx();
  if (!ctx) return;
  fn(ctx);
}

/** Stop custom intro audio (e.g. when debate room loads) */
export function stopIntroMusic(): void {
  if (_introAudioEl) { _introAudioEl.pause(); _introAudioEl = null; }
}
