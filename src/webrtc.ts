/**
 * THE MODERATOR — WebRTC Module (TypeScript)
 *
 * Runtime module (replaces moderator-webrtc.js). Live audio debate engine.
 * Uses Supabase Realtime channels for signaling (no separate server).
 *
 * Migration: Session 127 (Phase 3). ES imports: Session 140.
 * Turn-based rewrite: Session 178. One speaker at a time, Web Worker timer,
 * Date.now() drift-free countdown, enforced muting of non-speaking side.
 */

import { getSupabaseClient, getCurrentUser } from './auth.ts';
import { ICE_SERVERS as CONFIG_ICE_SERVERS, DEBATE } from './config.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Channel type derived from SupabaseClient.channel() */
type RealtimeChannel = ReturnType<SupabaseClient['channel']>;

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

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate'
    | 'round-start' | 'round-end' | 'debate-end'
    // New turn-based signals (Session 178)
    | 'turn-start' | 'turn-end' | 'finish-turn';
  data: unknown;
  from: DebateRole;
}

// ============================================================
// CONSTANTS
// ============================================================

const ICE_SERVERS: Array<{ urls: string }> = [...CONFIG_ICE_SERVERS];

/** Duration of each debater's turn in seconds */
const TURN_DURATION = 120;

/** Pause between turns within a round */
const PAUSE_DURATION = 10;

/** Ad break between rounds */
const AD_BREAK_DURATION = 60;

/** Final ad break after last turn, before vote gate */
const FINAL_AD_DURATION = 30;

// Legacy constants kept for backward compat with any code reading them
const ROUND_DURATION: number = DEBATE.roundDurationSec;
const BREAK_DURATION: number = DEBATE.breakDurationSec;
const MAX_ROUNDS: number = DEBATE.defaultRounds;

// ============================================================
// TURN SEQUENCE — built once, read-only
//
// Deterministic: both clients compute the same sequence.
// Odd rounds start with 'a', even rounds start with 'b'.
//
// Round 1: A(120s) → pause(10s) → B(120s) → ad(60s)
// Round 2: B(120s) → pause(10s) → A(120s) → ad(60s)
// Round 3: A(120s) → pause(10s) → B(120s) → ad(60s)
// Round 4: B(120s) → pause(10s) → A(120s) → final_ad(30s)
// ============================================================

function buildTurnSequence(rounds: number): TurnStep[] {
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

let turnSequence: TurnStep[] = buildTurnSequence(MAX_ROUNDS);

// ============================================================
// WEB WORKER TIMER (inline Blob — no external file, no npm dep)
//
// Runs in a separate thread. Not throttled in background tabs.
// Uses Date.now() as source of truth — no cumulative drift.
// Posts {remaining} every second, {expired: true} when done.
// ============================================================

const TIMER_WORKER_CODE = `
let startedAt = 0;
let duration = 0;
let intervalId = null;

self.onmessage = function(e) {
  if (e.data.command === 'start') {
    startedAt = e.data.startedAt;
    duration = e.data.duration;
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(tick, 1000);
    tick();
  } else if (e.data.command === 'stop') {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }
};

function tick() {
  var elapsed = (Date.now() - startedAt) / 1000;
  var remaining = Math.max(0, Math.ceil(duration - elapsed));
  self.postMessage({ remaining: remaining });
  if (remaining <= 0) {
    clearInterval(intervalId);
    intervalId = null;
    self.postMessage({ expired: true });
  }
}
`;

let timerWorker: Worker | null = null;

function createTimerWorker(): Worker {
  const blob = new Blob([TIMER_WORKER_CODE], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  // Clean up blob URL after worker starts (worker keeps the code)
  URL.revokeObjectURL(url);
  return worker;
}

function startWorkerTimer(durationSec: number): void {
  if (!timerWorker) {
    timerWorker = createTimerWorker();
    timerWorker.onmessage = handleTimerMessage;
  }
  timerWorker.postMessage({
    command: 'start',
    startedAt: Date.now(),
    duration: durationSec,
  });
}

function stopWorkerTimer(): void {
  if (timerWorker) {
    timerWorker.postMessage({ command: 'stop' });
  }
}

function terminateWorkerTimer(): void {
  if (timerWorker) {
    timerWorker.terminate();
    timerWorker = null;
  }
}

// ============================================================
// STATE
// ============================================================

let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let signalingChannel: RealtimeChannel | null = null;
let activeWaveform: WaveformResult | null = null;

// Session 208: ICE restart state (audit #14)
const MAX_ICE_RESTART_ATTEMPTS = 3;
let iceRestartAttempts = 0;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

const DEFAULT_TURN_STATE: TurnState = {
  stepIndex: -1,
  phase: 'ended',
  round: 0,
  side: null,
  timeLeft: 0,
  isFrozen: true,
};

let debateState: DebateState = {
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

const callbacks: Record<string, WebRTCEventCallback[]> = {};

// ============================================================
// HELPERS
// ============================================================

function getSupabase(): SupabaseClient | null {
  return getSupabaseClient();
}

function isPlaceholder(): boolean {
  return !getSupabase();
}

// ============================================================
// EVENT SYSTEM
// ============================================================

export function on(event: WebRTCEventType, fn: WebRTCEventCallback): void {
  if (!callbacks[event]) callbacks[event] = [];
  callbacks[event]!.push(fn);
}

export function off(event: WebRTCEventType, fn: WebRTCEventCallback): void {
  if (!callbacks[event]) return;
  callbacks[event] = callbacks[event]!.filter((f) => f !== fn);
}

function fire(event: string, data: Record<string, unknown>): void {
  (callbacks[event] ?? []).forEach((fn) => {
    try {
      fn(data);
    } catch (e) {
      console.error('Event handler error:', e);
    }
  });
}

// ============================================================
// MICROPHONE
// ============================================================

export async function requestMic(): Promise<MediaStream> {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
      },
      video: false,
    });
    fire('micReady', { stream: localStream });
    return localStream;
  } catch (err) {
    fire('error', { type: 'mic', message: 'Microphone access denied. Check browser permissions.' });
    throw err;
  }
}

export function toggleMute(): boolean {
  if (!localStream) return false;
  const track = localStream.getAudioTracks()[0];
  if (track) {
    track.enabled = !track.enabled;
    debateState.isMuted = !track.enabled;
    fire('muteChanged', { muted: debateState.isMuted });
  }
  return debateState.isMuted;
}

export function getAudioLevel(stream: MediaStream): () => number {
  const ctx = new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>)['webkitAudioContext'])();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  return () => {
    analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((a, b) => a + b, 0);
    return sum / (dataArray.length * 255);
  };
}

// ============================================================
// MUTE ENFORCEMENT
//
// Mute the local mic when it's not this client's turn to speak.
// track.enabled = false sends silence (Opus ~40kbps).
// Remote peer is NOT notified by WebRTC — signaling handles that.
//
// CRITICAL ORDER: mute FIRST, then fire turnEnd event.
// Prevents audio leak during transition (W3C confirmed race).
// ============================================================

function enforceMute(): void {
  if (!localStream) return;
  const track = localStream.getAudioTracks()[0];
  if (track) {
    track.enabled = false;
    debateState.isMuted = true;
    fire('muteChanged', { muted: true });
    fire('turnFrozen', { role: debateState.role });
  }
}

function enforceUnmute(): void {
  if (!localStream) return;
  const track = localStream.getAudioTracks()[0];
  if (track) {
    track.enabled = true;
    debateState.isMuted = false;
    fire('muteChanged', { muted: false });
    fire('turnUnfrozen', { role: debateState.role });
  }
}

// ============================================================
// SIGNALING VIA SUPABASE REALTIME
// ============================================================

function setupSignaling(debateId: string): void {
  const supabase = getSupabase();
  if (!supabase) return;

  const channelName = 'debate-' + debateId;

  signalingChannel = supabase.channel(channelName, {
    config: { presence: { key: getCurrentUser()?.id || 'anon' } },
  });

  signalingChannel.on('broadcast', { event: 'signal' }, (payload: Record<string, unknown>) => {
    const raw = payload['payload'];
    if (!raw || typeof raw !== 'object') return;
    const msg = raw as Record<string, unknown>;
    if (typeof msg['type'] !== 'string' || typeof msg['from'] !== 'string') return;
    void handleSignalingMessage(msg as unknown as SignalingMessage);
  });

  signalingChannel.on('presence', { event: 'sync' }, () => {
    const state = signalingChannel!.presenceState();
    const count = Object.keys(state).length;
    fire('presenceUpdate', { count, state });

    if (count >= 2 && debateState.status === 'connecting') {
      if (debateState.role === 'a') {
        void createOffer();
      }
    }
  });

  signalingChannel.subscribe(async (status: string) => {
    if (status === 'SUBSCRIBED') {
      await signalingChannel!.track({ role: debateState.role });
      fire('signalingReady', { channel: channelName });
    }
  });
}

function sendSignal(type: string, data: unknown): void {
  if (!signalingChannel) return;
  signalingChannel.send({
    type: 'broadcast',
    event: 'signal',
    payload: { type, data, from: debateState.role },
  });
}

async function handleSignalingMessage(msg: SignalingMessage): Promise<void> {
  if (msg.from === debateState.role) return;

  switch (msg.type) {
    case 'offer':
      await handleOffer(msg.data as RTCSessionDescriptionInit);
      break;
    case 'answer':
      await handleAnswer(msg.data as RTCSessionDescriptionInit);
      break;
    case 'ice-candidate':
      await handleIceCandidate(msg.data as RTCIceCandidateInit);
      break;
    // Legacy round signals — still handled for backward compat
    case 'round-start':
      // If received from old client, treat as turn-start for round 1
      if (debateState.turn.stepIndex < 0) {
        beginStep(0);
      }
      break;
    case 'round-end':
      break; // handled by turn system now
    case 'debate-end':
      endDebate();
      break;
    // New turn-based signals (Session 178)
    case 'turn-start': {
      const d = msg.data as { stepIndex: number };
      // Sync to the same step as the other client
      if (d.stepIndex !== debateState.turn.stepIndex) {
        beginStep(d.stepIndex);
      }
      break;
    }
    case 'turn-end': {
      // Other side's turn ended (timer expired or finish-turn).
      // Advance to next step.
      advanceStep();
      break;
    }
    case 'finish-turn': {
      // Other debater pressed Finish Turn — advance immediately.
      advanceStep();
      break;
    }
  }
}

// ============================================================
// WEBRTC PEER CONNECTION
// ============================================================

function createPeerConnection(): RTCPeerConnection {
  peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection!.addTrack(track, localStream!);
    });
  }

  peerConnection.ontrack = (event) => {
    remoteStream = event.streams[0] ?? null;
    fire('remoteStream', { stream: remoteStream });
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignal('ice-candidate', event.candidate.toJSON());
    }
  };

  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection!.connectionState;
    fire('connectionState', { state });

    if (state === 'connected') {
      debateState.status = 'live';
      iceRestartAttempts = 0;
      if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null; }
      fire('connected', {});
    } else if (state === 'disconnected') {
      // Transient — wait 3s before attempting restart (connection may recover)
      fire('disconnected', { state, recovering: true });
      if (disconnectTimer) clearTimeout(disconnectTimer);
      disconnectTimer = setTimeout(() => {
        disconnectTimer = null;
        if (peerConnection?.connectionState === 'disconnected' || peerConnection?.connectionState === 'failed') {
          attemptIceRestart();
        }
      }, 3000);
    } else if (state === 'failed') {
      // Permanent failure — restart immediately
      if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null; }
      attemptIceRestart();
    }
  };

  return peerConnection;
}

// Session 208: ICE restart on connection failure (audit #14)
async function attemptIceRestart(): Promise<void> {
  iceRestartAttempts++;

  if (iceRestartAttempts > MAX_ICE_RESTART_ATTEMPTS) {
    console.warn(`[WebRTC] ICE restart failed after ${MAX_ICE_RESTART_ATTEMPTS} attempts`);
    fire('connectionFailed', { attempts: MAX_ICE_RESTART_ATTEMPTS });
    return;
  }

  console.log(`[WebRTC] ICE restart attempt ${iceRestartAttempts}/${MAX_ICE_RESTART_ATTEMPTS}`);
  fire('reconnecting', { attempt: iceRestartAttempts, max: MAX_ICE_RESTART_ATTEMPTS });

  // Only role 'a' (the offerer) initiates ICE restart.
  // Role 'b' waits — they'll receive the re-offer via signaling
  // and handleOffer() will renegotiate automatically.
  if (debateState.role === 'a' && peerConnection) {
    try {
      peerConnection.restartIce();
      const offer = await peerConnection.createOffer({ iceRestart: true });
      await peerConnection.setLocalDescription(offer);
      sendSignal('offer', offer);
    } catch (err) {
      console.warn('[WebRTC] ICE restart offer error:', err);
    }
  }
}

async function createOffer(): Promise<void> {
  try {
    if (!peerConnection) createPeerConnection();
    const offer = await peerConnection!.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
    await peerConnection!.setLocalDescription(offer);
    sendSignal('offer', offer);
  } catch (err) {
    console.warn('[WebRTC] createOffer error:', err);
  }
}

async function handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
  try {
    if (!peerConnection) createPeerConnection();
    await peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection!.createAnswer();
    await peerConnection!.setLocalDescription(answer);
    sendSignal('answer', answer);
  } catch (err) {
    console.warn('[WebRTC] handleOffer error:', err);
  }
}

async function handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
  try {
    if (!peerConnection) return;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  } catch (err) {
    console.warn('[WebRTC] handleAnswer error:', err);
  }
}

async function handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
  if (!peerConnection) return;
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.warn('ICE candidate error:', err);
  }
}

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
    debateState.timeLeft = remaining;
    debateState.turn.timeLeft = remaining;

    const step = turnSequence[debateState.turn.stepIndex];
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
          nextSide: getNextSpeaker(debateState.turn.stepIndex),
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
  for (let i = currentStepIndex + 1; i < turnSequence.length; i++) {
    if (turnSequence[i]!.phase === 'speaking') {
      return turnSequence[i]!.side;
    }
  }
  return null;
}

/** Begin a specific step in the turn sequence */
function beginStep(stepIndex: number): void {
  if (stepIndex >= turnSequence.length) {
    endDebate();
    return;
  }

  const step = turnSequence[stepIndex]!;

  // Update state
  debateState.turn.stepIndex = stepIndex;
  debateState.turn.phase = step.phase;
  debateState.turn.round = step.round;
  debateState.turn.side = step.side;
  debateState.turn.timeLeft = step.duration;
  debateState.round = step.round;
  debateState.timeLeft = step.duration;

  // Determine if this client is frozen
  const myRole = debateState.role;
  if (step.phase === 'speaking' && step.side === myRole) {
    // My turn to speak
    debateState.turn.isFrozen = false;
    enforceUnmute();
  } else {
    // Not my turn, or it's a pause/break
    debateState.turn.isFrozen = true;
    enforceMute();
  }

  // Update status
  if (step.phase === 'speaking') {
    debateState.status = 'live';
  } else {
    debateState.status = 'break';
  }

  // Fire events
  switch (step.phase) {
    case 'speaking':
      fire('turnStart', {
        round: step.round,
        side: step.side,
        timeLeft: step.duration,
        isFrozen: debateState.turn.isFrozen,
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
  startWorkerTimer(step.duration);
}

/** Check if this step is the first speaking turn of a new round */
function isFirstTurnOfRound(stepIndex: number): boolean {
  if (stepIndex === 0) return true;
  const current = turnSequence[stepIndex]!;
  const prev = turnSequence[stepIndex - 1];
  if (!prev) return true;
  return current.phase === 'speaking' && current.round !== prev.round;
}

/** Called when the timer for the current step expires */
function onStepExpired(): void {
  const step = turnSequence[debateState.turn.stepIndex];
  if (!step) return;

  if (step.phase === 'speaking') {
    // CRITICAL ORDER: mute first, then fire event, then signal
    enforceMute();

    fire('turnEnd', { round: step.round, side: step.side });

    // Speaking side is timer authority — signal the other client
    if (step.side === debateState.role) {
      sendSignal('turn-end', { round: step.round, side: step.side });
    }
  }

  advanceStep();
}

/** Move to the next step in the sequence */
function advanceStep(): void {
  stopWorkerTimer();
  const nextIndex = debateState.turn.stepIndex + 1;
  beginStep(nextIndex);
}

/** Debater presses "Finish Turn" — ends their own turn early */
export function finishTurn(): void {
  const step = turnSequence[debateState.turn.stepIndex];
  if (!step) return;

  // Can only finish during a speaking phase that is MY turn
  if (step.phase !== 'speaking') return;
  if (step.side !== debateState.role) return;

  // CRITICAL ORDER: mute first
  enforceMute();

  fire('turnEnd', { round: step.round, side: step.side, early: true });

  // Signal the other client
  sendSignal('finish-turn', { round: step.round, side: step.side });

  // Advance to next step (pause, then other speaker's turn)
  advanceStep();
}

function endDebate(): void {
  stopWorkerTimer();
  debateState.status = 'ended';
  debateState.turn.phase = 'ended';
  debateState.turn.isFrozen = true;
  enforceMute();
  fire('debateEnd', { debateId: debateState.debateId });
}

// ============================================================
// MAIN API: JOIN / START / LEAVE
// ============================================================

export async function joinDebate(debateId: string, role: DebateRole, totalRounds?: number): Promise<void> {
  const rounds = totalRounds ?? MAX_ROUNDS;
  turnSequence = buildTurnSequence(rounds);
  debateState.debateId = debateId;
  debateState.role = role;
  debateState.status = 'connecting';
  debateState.totalRounds = rounds;
  debateState.turn = { ...DEFAULT_TURN_STATE };

  if (isPlaceholder()) {
    fire('placeholderMode', {
      message: 'WebRTC running in placeholder mode. Connect Supabase to go live.',
    });
    return;
  }

  await requestMic();
  // Start muted — nobody speaks until startLive()
  enforceMute();
  setupSignaling(debateId);
  fire('joining', { debateId, role });
}

export async function startLive(): Promise<void> {
  // Side 'a' initiates the turn sequence
  if (debateState.role === 'a') {
    sendSignal('turn-start', { stepIndex: 0 });
    beginStep(0);
  }
}

export function leaveDebate(): void {
  stopWorkerTimer();
  terminateWorkerTimer();

  // Session 208: Reset ICE restart state (audit #14)
  iceRestartAttempts = 0;
  if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null; }

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  remoteStream = null;

  if (signalingChannel) {
    signalingChannel.unsubscribe();
    signalingChannel = null;
  }

  if (activeWaveform) {
    activeWaveform.stop();
    activeWaveform.audioCtx.close().catch(() => { /* already closed */ });
    activeWaveform = null;
  }

  debateState = {
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
  turnSequence = buildTurnSequence(MAX_ROUNDS);

  fire('left', {});
}

// ============================================================
// AUDIO VISUALIZATION
// ============================================================

export function createWaveform(stream: MediaStream, canvasElement: HTMLCanvasElement): WaveformResult {
  const ctx = canvasElement.getContext('2d')!;
  const audioCtx = new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>)['webkitAudioContext'])();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  let rafHandle: number;

  function draw(): void {
    rafHandle = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    const w = canvasElement.width;
    const h = canvasElement.height;
    ctx.clearRect(0, 0, w, h);

    const barWidth = (w / bufferLength) * 2;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const val = (dataArray[i] ?? 0) / 255;
      const barHeight = val * h;
      const gold = `rgba(212, 168, 67, ${0.4 + val * 0.6})`;
      ctx.fillStyle = gold;
      ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
      x += barWidth;
    }
  }

  draw();
  activeWaveform = {
    analyser,
    audioCtx,
    stop: () => cancelAnimationFrame(rafHandle),
  };
  return activeWaveform;
}

// ============================================================
// STATE ACCESSORS
// ============================================================

export function getState(): Readonly<DebateState> {
  return { ...debateState, turn: { ...debateState.turn } };
}

export function getLocalStream(): MediaStream | null {
  return localStream;
}

export function getRemoteStream(): MediaStream | null {
  return remoteStream;
}

export function isConnected(): boolean {
  return peerConnection?.connectionState === 'connected';
}

export function getTurnSequence(): readonly TurnStep[] {
  return turnSequence;
}

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
