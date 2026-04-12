/**
 * THE MODERATOR — WebRTC Module (TypeScript) — Orchestrator
 *
 * Public API surface. Wires everything together. The only file consumers import from.
 *
 * Migration: Session 127 (Phase 3). ES imports: Session 140.
 * Turn-based rewrite: Session 178. One speaker at a time, Web Worker timer,
 * Date.now() drift-free countdown, enforced muting of non-speaking side.
 */

import { onChange } from './auth.ts';
import { state, on, off, fire, isPlaceholder, DEFAULT_TURN_STATE } from './webrtc.state.ts';
import { stopWorkerTimer, terminateWorkerTimer } from './webrtc.timer.ts';
import { buildTurnSequence, MAX_ROUNDS } from './webrtc.turn.ts';
import { requestMic, toggleMute, getAudioLevel, createWaveform, enforceMute } from './webrtc.audio.ts';
import { setupSignaling, sendSignal } from './webrtc.signaling.ts';
import { beginStep, finishTurn, endDebate } from './webrtc.engine.ts';
import type { DebateRole, DebateState, TurnStep } from './webrtc.types.ts';

// Re-export types for consumers
export type { DebateRole, WebRTCStatus, TurnPhase, WebRTCEventType, TurnStep, TurnState, DebateState, WaveformResult, WebRTCEventCallback } from './webrtc.types.ts';

// ============================================================
// INIT — build initial turn sequence
// ============================================================

state.turnSequence = buildTurnSequence(MAX_ROUNDS);
state.debateState.totalRounds = MAX_ROUNDS;

// ============================================================
// MAIN API: JOIN / START / LEAVE
// ============================================================

export async function joinDebate(debateId: string, role: DebateRole, totalRounds?: number): Promise<void> {
  const rounds = totalRounds ?? MAX_ROUNDS;
  state.turnSequence = buildTurnSequence(rounds);
  state.debateState.debateId = debateId;
  state.debateState.role = role;
  state.debateState.status = 'connecting';
  state.debateState.totalRounds = rounds;
  state.debateState.turn = { ...DEFAULT_TURN_STATE };

  if (isPlaceholder()) {
    fire('placeholderMode', {
      message: 'WebRTC running in placeholder mode. Connect Supabase to go live.',
    });
    return;
  }

  await requestMic();
  // Start muted — nobody speaks until startLive()
  enforceMute();
  await setupSignaling(debateId);
  fire('joining', { debateId, role });
}

export async function startLive(): Promise<void> {
  // Side 'a' initiates the turn sequence
  if (state.debateState.role === 'a') {
    sendSignal('turn-start', { stepIndex: 0 });
    beginStep(0);
  }
}

export function leaveDebate(): void {
  stopWorkerTimer();
  terminateWorkerTimer();

  // Session 208: Reset ICE restart state (audit #14)
  state.iceRestartAttempts = 0;
  if (state.disconnectTimer) { clearTimeout(state.disconnectTimer); state.disconnectTimer = null; }

  // Session 222: RTC-BUG-3 — clear setup timeout
  if (state.setupTimer) { clearTimeout(state.setupTimer); state.setupTimer = null; }

  if (state.peerConnection) {
    state.peerConnection.close();
    state.peerConnection = null;
  }

  if (state.localStream) {
    state.localStream.getTracks().forEach((t) => t.stop());
    state.localStream = null;
  }
  state.remoteStream = null;

  if (state.signalingChannel) {
    state.signalingChannel.unsubscribe();
    state.signalingChannel = null;
  }

  if (state.activeWaveform) {
    state.activeWaveform.stop();
    state.activeWaveform.audioCtx.close().catch((e) => console.warn('[WebRTC] audioCtx close failed:', e));
    state.activeWaveform = null;
  }

  state.debateState = {
    debateId: null,
    role: null,
    status: 'idle',
    round: 0,
    totalRounds: MAX_ROUNDS,
    roundTimer: null,
    breakTimer: null,
    timeLeft: 0,
    isMuted: false,
    turn: { ...DEFAULT_TURN_STATE },
  };
  state.turnSequence = buildTurnSequence(MAX_ROUNDS);

  fire('left', {});
}

// ============================================================
// STATE ACCESSORS
// ============================================================

export function getState(): Readonly<DebateState> {
  return { ...state.debateState, turn: { ...state.debateState.turn } };
}

export function getLocalStream(): MediaStream | null {
  return state.localStream;
}

export function getRemoteStream(): MediaStream | null {
  return state.remoteStream;
}

export function isConnected(): boolean {
  return state.peerConnection?.connectionState === 'connected';
}

export function getTurnSequence(): readonly TurnStep[] {
  return state.turnSequence;
}

// ============================================================
// RE-EXPORTS for public API
// ============================================================

export { on, off, requestMic, toggleMute, getAudioLevel, createWaveform, finishTurn };

// ============================================================
// DEFAULT EXPORT
// ============================================================

const webrtc = {
  joinDebate,
  startLive,
  leaveDebate,
  finishTurn,
  requestMic,
  toggleMute,
  getAudioLevel,
  createWaveform,
  on,
  off,
  get state() { return getState(); },
  get localStream() { return getLocalStream(); },
  get remoteStream() { return getRemoteStream(); },
  get isConnected() { return isConnected(); },
  get turnSequence() { return getTurnSequence(); },
} as const;

export default webrtc;

window.addEventListener('beforeunload', leaveDebate);

// Session 224: Logout cleanup — stop mic + close peer connection when user logs out.
// beforeunload is unreliable on mobile Safari; onChange fires reliably on all platforms.
onChange((user) => { if (!user) leaveDebate(); });
