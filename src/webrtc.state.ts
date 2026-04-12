/**
 * THE MODERATOR — WebRTC State Container
 *
 * All mutable module-level state, constants, event bus, and helpers.
 */

// LM-WEBRTC-001: All mutable module vars live in this object.
// ES module imports are read-only bindings — direct let exports
// cannot be reassigned from other files. All sibling files do
// state.foo = x, never import { foo } and reassign.

import { getSupabaseClient } from './auth.ts';
import { ICE_SERVERS as CONFIG_ICE_SERVERS } from './config.ts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DebateState,
  TurnState,
  TurnStep,
  WaveformResult,
  WebRTCEventCallback,
  RealtimeChannel,
} from './webrtc.types.ts';

// ============================================================
// CONSTANTS
// ============================================================

export const MAX_ICE_RESTART_ATTEMPTS = 3;
export const SETUP_TIMEOUT_MS = 30_000;
export const FALLBACK_ICE_SERVERS: RTCIceServer[] = [...CONFIG_ICE_SERVERS];

export const DEFAULT_TURN_STATE: TurnState = {
  stepIndex: -1,
  phase: 'ended',
  round: 0,
  side: null,
  timeLeft: 0,
  isFrozen: true,
};

export const DEFAULT_DEBATE_STATE: DebateState = {
  debateId: null,
  role: null,
  status: 'idle',
  round: 0,
  totalRounds: 0,
  roundTimer: null,
  breakTimer: null,
  timeLeft: 0,
  isMuted: false,
  turn: { ...DEFAULT_TURN_STATE },
};

// ============================================================
// STATE CONTAINER
// ============================================================

export const state = {
  peerConnection: null as RTCPeerConnection | null,
  localStream: null as MediaStream | null,
  remoteStream: null as MediaStream | null,
  signalingChannel: null as RealtimeChannel | null,
  activeWaveform: null as WaveformResult | null,
  timerWorker: null as Worker | null,
  fetchedIceServers: null as RTCIceServer[] | null,
  turnFetchPromise: null as Promise<RTCIceServer[] | null> | null,
  iceRestartAttempts: 0,
  disconnectTimer: null as ReturnType<typeof setTimeout> | null,
  setupTimer: null as ReturnType<typeof setTimeout> | null,
  debateState: { ...DEFAULT_DEBATE_STATE, turn: { ...DEFAULT_TURN_STATE } } as DebateState,
  turnSequence: [] as TurnStep[],
  callbacks: {} as Record<string, WebRTCEventCallback[]>,
};

// Late-bound signal function ref — avoids circular dep between signaling and engine
export const signals = {
  sendSignal: null as ((type: string, data: unknown) => void) | null,
};

// ============================================================
// EVENT BUS
// ============================================================

export function on(event: string, fn: WebRTCEventCallback): void {
  if (!state.callbacks[event]) state.callbacks[event] = [];
  state.callbacks[event]!.push(fn);
}

export function off(event: string, fn: WebRTCEventCallback): void {
  if (!state.callbacks[event]) return;
  state.callbacks[event] = state.callbacks[event]!.filter((f) => f !== fn);
}

export function fire(event: string, data: Record<string, unknown>): void {
  (state.callbacks[event] ?? []).forEach((fn) => {
    try {
      fn(data);
    } catch (e) {
      console.error('Event handler error:', e);
    }
  });
}

// ============================================================
// HELPERS
// ============================================================

export function getSupabase(): SupabaseClient | null {
  return getSupabaseClient();
}

export function isPlaceholder(): boolean {
  return !getSupabase();
}
