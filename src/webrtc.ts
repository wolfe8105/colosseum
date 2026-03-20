/**
 * THE COLOSSEUM — WebRTC Module (TypeScript)
 *
 * Runtime module (replaces colosseum-webrtc.js). Live audio debate engine.
 * Uses Supabase Realtime channels for signaling (no separate server).
 *
 * Migration: Session 127 (Phase 3). ES imports: Session 140.
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
  | 'placeholderMode';

export interface DebateState {
  debateId: string | null;
  role: DebateRole | null;
  status: WebRTCStatus;
  round: number;
  totalRounds: number;
  roundTimer: ReturnType<typeof setInterval> | null;
  breakTimer: ReturnType<typeof setInterval> | null;
  timeLeft: number;
  isMuted: boolean;
}

export interface WaveformResult {
  analyser: AnalyserNode;
  audioCtx: AudioContext;
}

export type WebRTCEventCallback = (data: Record<string, unknown>) => void;

// ============================================================
// SIGNALING MESSAGE TYPES
// ============================================================

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'round-start' | 'round-end' | 'debate-end';
  data: unknown;
  from: DebateRole;
}

// ============================================================
// CONSTANTS
// ============================================================

const ICE_SERVERS: Array<{ urls: string }> = [...CONFIG_ICE_SERVERS];

const ROUND_DURATION: number = DEBATE.roundDurationSec;

const BREAK_DURATION: number = DEBATE.breakDurationSec;

const MAX_ROUNDS: number = DEBATE.defaultRounds;

// ============================================================
// STATE
// ============================================================

let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let signalingChannel: RealtimeChannel | null = null;

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
    void handleSignalingMessage(payload['payload'] as SignalingMessage);
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
    case 'round-start':
      startRoundTimer((msg.data as { round: number }).round);
      break;
    case 'round-end':
      endRound();
      break;
    case 'debate-end':
      endDebate();
      break;
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
      fire('connected', {});
    } else if (state === 'disconnected' || state === 'failed') {
      fire('disconnected', { state });
    }
  };

  return peerConnection;
}

async function createOffer(): Promise<void> {
  if (!peerConnection) createPeerConnection();

  const offer = await peerConnection!.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: false,
  });
  await peerConnection!.setLocalDescription(offer);
  sendSignal('offer', offer);
}

async function handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
  if (!peerConnection) createPeerConnection();

  await peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection!.createAnswer();
  await peerConnection!.setLocalDescription(answer);
  sendSignal('answer', answer);
}

async function handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
  if (!peerConnection) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
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
// ROUND MANAGEMENT
// ============================================================

function startRoundTimer(round: number): void {
  debateState.round = round;
  debateState.timeLeft = ROUND_DURATION;
  debateState.status = 'live';

  fire('roundStart', { round, timeLeft: ROUND_DURATION });

  if (debateState.roundTimer) clearInterval(debateState.roundTimer);
  debateState.roundTimer = setInterval(() => {
    debateState.timeLeft--;
    fire('tick', { timeLeft: debateState.timeLeft, round });

    if (debateState.timeLeft <= 0) {
      if (debateState.roundTimer) clearInterval(debateState.roundTimer);

      if (round >= debateState.totalRounds) {
        sendSignal('debate-end', {});
        endDebate();
      } else {
        sendSignal('round-end', { round });
        startBreak(round);
      }
    }
  }, 1000);
}

function startBreak(afterRound: number): void {
  debateState.status = 'break';
  debateState.timeLeft = BREAK_DURATION;

  fire('breakStart', { afterRound, timeLeft: BREAK_DURATION });

  if (debateState.breakTimer) clearInterval(debateState.breakTimer);
  debateState.breakTimer = setInterval(() => {
    debateState.timeLeft--;
    fire('breakTick', { timeLeft: debateState.timeLeft });

    if (debateState.timeLeft <= 0) {
      if (debateState.breakTimer) clearInterval(debateState.breakTimer);
      const nextRound = afterRound + 1;
      sendSignal('round-start', { round: nextRound });
      startRoundTimer(nextRound);
    }
  }, 1000);
}

function endRound(): void {
  if (debateState.roundTimer) clearInterval(debateState.roundTimer);
  fire('roundEnd', { round: debateState.round });
}

function endDebate(): void {
  debateState.status = 'ended';
  if (debateState.roundTimer) clearInterval(debateState.roundTimer);
  if (debateState.breakTimer) clearInterval(debateState.breakTimer);
  fire('debateEnd', { debateId: debateState.debateId });
}

// ============================================================
// MAIN API: JOIN / START / LEAVE
// ============================================================

export async function joinDebate(debateId: string, role: DebateRole): Promise<void> {
  debateState.debateId = debateId;
  debateState.role = role;
  debateState.status = 'connecting';
  debateState.totalRounds = MAX_ROUNDS;

  if (isPlaceholder()) {
    fire('placeholderMode', {
      message: 'WebRTC running in placeholder mode. Connect Supabase to go live.',
    });
    return;
  }

  await requestMic();
  setupSignaling(debateId);
  fire('joining', { debateId, role });
}

export async function startLive(): Promise<void> {
  if (debateState.role === 'a') {
    sendSignal('round-start', { round: 1 });
    startRoundTimer(1);
  }
}

export function leaveDebate(): void {
  if (debateState.roundTimer) clearInterval(debateState.roundTimer);
  if (debateState.breakTimer) clearInterval(debateState.breakTimer);

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
  };

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

  function draw(): void {
    requestAnimationFrame(draw);
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
  return { analyser, audioCtx };
}

// ============================================================
// STATE ACCESSORS
// ============================================================

export function getState(): Readonly<DebateState> {
  return { ...debateState };
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

// ============================================================
// DEFAULT EXPORT
// ============================================================

const webrtc = {
  joinDebate,
  startLive,
  leaveDebate,
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
} as const;

export default webrtc;
