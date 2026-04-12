/**
 * THE MODERATOR — WebRTC Types
 *
 * All exported types and interfaces for the WebRTC debate engine.
 * No runtime code. No imports from other webrtc files.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Channel type derived from SupabaseClient.channel() */
export type RealtimeChannel = ReturnType<SupabaseClient['channel']>;

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type DebateRole = 'a' | 'b';
export type WebRTCStatus = 'idle' | 'connecting' | 'live' | 'break' | 'ended';

export type TurnPhase = 'speaking' | 'pause' | 'ad_break' | 'final_ad';

export type WebRTCEventType =
  | 'micReady'
  | 'error'
  | 'muteChanged'
  | 'signalingReady'
  | 'presenceUpdate'
  | 'connected'
  | 'disconnected'
  | 'connectionState'
  | 'remoteStream'
  | 'roundStart'
  | 'roundEnd'
  | 'breakStart'
  | 'breakTick'
  | 'tick'
  | 'debateEnd'
  | 'joining'
  | 'left'
  | 'placeholderMode'
  // New turn-based events (Session 178)
  | 'turnStart'
  | 'turnEnd'
  | 'pauseStart'
  | 'pauseTick'
  | 'turnFrozen'
  | 'turnUnfrozen'
  // ICE restart events (Session 208, audit #14)
  | 'reconnecting'
  | 'connectionFailed';

/** One step in the deterministic turn sequence */
export interface TurnStep {
  phase: TurnPhase;
  round: number;
  side: DebateRole | null; // null for pauses/breaks
  duration: number;        // seconds
}

export interface TurnState {
  stepIndex: number;
  phase: TurnPhase | 'ended';
  round: number;
  side: DebateRole | null;
  timeLeft: number;
  isFrozen: boolean;       // true if this client cannot speak or type
}

export interface DebateState {
  debateId: string | null;
  role: DebateRole | null;
  status: WebRTCStatus;
  round: number;
  totalRounds: number;
  roundTimer: ReturnType<typeof setInterval> | null;  // kept for legacy compat, unused
  breakTimer: ReturnType<typeof setInterval> | null;  // kept for legacy compat, unused
  timeLeft: number;
  isMuted: boolean;
  // New turn-based fields (Session 178)
  turn: TurnState;
}

export interface WaveformResult {
  analyser: AnalyserNode;
  audioCtx: AudioContext;
  stop: () => void;
}

export type WebRTCEventCallback = (data: Record<string, unknown>) => void;

// ============================================================
// SIGNALING MESSAGE TYPES
// ============================================================

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate'
    | 'round-start' | 'round-end' | 'debate-end'
    // New turn-based signals (Session 178)
    | 'turn-start' | 'turn-end' | 'finish-turn';
  data: unknown;
  from: DebateRole;
}
