// arena-room-live-audio.ts — live audio mode: WebRTC event wiring, joinDebate, mute toggle

import { joinDebate, on as onWebRTC, off as offWebRTC, toggleMute, createWaveform, getLocalStream } from '../webrtc.ts';
import type { WebRTCEventCallback } from '../webrtc.ts';
import { currentDebate } from './arena-state.ts';
import { formatTimer } from './arena-core.ts';
import { endCurrentDebate } from './arena-room-end.ts';
import { addSystemMessage } from './arena-room-live-messages.ts';
import { advanceRound } from './arena-room-live-poll.ts';

// ── Module-level handler refs for deregistration ──────────────────────────────
let _micReadyHandler:       WebRTCEventCallback | null = null;
let _connectedHandler:      WebRTCEventCallback | null = null;
let _disconnectedHandler:   WebRTCEventCallback | null = null;
let _reconnectingHandler:   WebRTCEventCallback | null = null;
let _connectionFailedHandler: WebRTCEventCallback | null = null;
let _muteChangedHandler:    WebRTCEventCallback | null = null;
let _tickHandler:           WebRTCEventCallback | null = null;
let _debateEndHandler:      WebRTCEventCallback | null = null;

/** Deregister all WebRTC handlers registered by initLiveAudio. */
export function destroyLiveAudio(): void {
  if (_micReadyHandler)         { offWebRTC('micReady',         _micReadyHandler);         _micReadyHandler = null; }
  if (_connectedHandler)        { offWebRTC('connected',        _connectedHandler);        _connectedHandler = null; }
  if (_disconnectedHandler)     { offWebRTC('disconnected',     _disconnectedHandler);     _disconnectedHandler = null; }
  if (_reconnectingHandler)     { offWebRTC('reconnecting',     _reconnectingHandler);     _reconnectingHandler = null; }
  if (_connectionFailedHandler) { offWebRTC('connectionFailed', _connectionFailedHandler); _connectionFailedHandler = null; }
  if (_muteChangedHandler)      { offWebRTC('muteChanged',      _muteChangedHandler);      _muteChangedHandler = null; }
  if (_tickHandler)             { offWebRTC('tick',             _tickHandler);             _tickHandler = null; }
  if (_debateEndHandler)        { offWebRTC('debateEnd',        _debateEndHandler);        _debateEndHandler = null; }
}

export async function initLiveAudio(): Promise<void> {
  destroyLiveAudio(); // deregister any stale handlers from a previous call
  const debate = currentDebate!;

  _micReadyHandler = () => {
    // LANDMINE [LM-LIVE-005]: Global getElementById lookups inside callbacks. If the arena
    // room is rendered twice in the same DOM, handlers target whichever element has the ID
    // first. Same family as L-I5 in AUDIT-FINDINGS.md.
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = 'Microphone ready';
    const canvas = document.getElementById('arena-waveform') as HTMLCanvasElement | null;
    const localStream = getLocalStream();
    if (canvas && localStream) {
      createWaveform(localStream, canvas);
    }
  };
  onWebRTC('micReady', _micReadyHandler);

  _connectedHandler = () => {
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = '\uD83D\uDFE2 Connected \u2014 debate is live!';
  };
  onWebRTC('connected', _connectedHandler);

  _disconnectedHandler = (data: unknown) => {
    const { recovering } = data as { state: string; recovering?: boolean };
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) {
      statusEl.textContent = recovering
        ? '\uD83D\uDFE1 Connection interrupted \u2014 reconnecting...'
        : '\uD83D\uDD34 Connection lost';
    }
  };
  onWebRTC('disconnected', _disconnectedHandler);

  // Session 208: ICE restart feedback (audit #14)
  _reconnectingHandler = (data: unknown) => {
    const { attempt, max } = data as { attempt: number; max: number };
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = `\uD83D\uDFE1 Reconnecting (${attempt}/${max})...`;
  };
  onWebRTC('reconnecting', _reconnectingHandler);

  _connectionFailedHandler = () => {
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = '\uD83D\uDD34 Connection failed \u2014 audio unavailable';
  };
  onWebRTC('connectionFailed', _connectionFailedHandler);

  _muteChangedHandler = (data: unknown) => {
    const { muted } = data as { muted: boolean };
    const btn = document.getElementById('arena-mic-btn');
    if (btn) {
      btn.classList.toggle('muted', muted);
      btn.textContent = muted ? '\uD83D\uDD07' : '\uD83C\uDF99\uFE0F';
    }
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = muted ? 'Muted' : 'Unmuted \u2014 speaking';
  };
  onWebRTC('muteChanged', _muteChangedHandler);

  _tickHandler = (data: unknown) => {
    const { timeLeft } = data as { timeLeft: number };
    const timerEl = document.getElementById('arena-room-timer');
    if (timerEl) {
      timerEl.textContent = formatTimer(timeLeft);
      timerEl.classList.toggle('warning', timeLeft <= 15);
    }
  };
  onWebRTC('tick', _tickHandler);

  _debateEndHandler = () => { void endCurrentDebate(); };
  onWebRTC('debateEnd', _debateEndHandler);

  try {
    await joinDebate(debate.id, debate.role, debate.totalRounds);
  } catch {
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = 'Mic access blocked. Check your browser settings.';
  }
}

export function toggleLiveMute(): void {
  toggleMute();
}
