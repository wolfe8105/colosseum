// arena-room-live-audio.ts — live audio mode: WebRTC event wiring, joinDebate, mute toggle

import { joinDebate, on as onWebRTC, toggleMute, createWaveform, getLocalStream } from '../webrtc.ts';
import { currentDebate } from './arena-state.ts';
import { formatTimer } from './arena-core.ts';
import { endCurrentDebate } from './arena-room-end.ts';
import { addSystemMessage } from './arena-room-live-messages.ts';
import { advanceRound } from './arena-room-live-poll.ts';

export async function initLiveAudio(): Promise<void> {
  // LANDMINE [LM-LIVE-002]: Every call to initLiveAudio adds new onWebRTC handlers with NO
  // deregistration of previous handlers. Re-entry (reconnect, back-nav) causes debateEnd to
  // fire multiple times → endCurrentDebate runs multiple times. Memory leak + behavioral bug.
  // Fix requires a destroy() guard or a module-level "already initialized" flag.
  const debate = currentDebate!;

  onWebRTC('micReady', () => {
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
  });

  onWebRTC('connected', () => {
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = '\uD83D\uDFE2 Connected \u2014 debate is live!';
  });

  onWebRTC('disconnected', (data: unknown) => {
    const { recovering } = data as { state: string; recovering?: boolean };
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) {
      statusEl.textContent = recovering
        ? '\uD83D\uDFE1 Connection interrupted \u2014 reconnecting...'
        : '\uD83D\uDD34 Connection lost';
    }
  });

  // Session 208: ICE restart feedback (audit #14)
  onWebRTC('reconnecting', (data: unknown) => {
    const { attempt, max } = data as { attempt: number; max: number };
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = `\uD83D\uDFE1 Reconnecting (${attempt}/${max})...`;
  });

  onWebRTC('connectionFailed', () => {
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = '\uD83D\uDD34 Connection failed \u2014 audio unavailable';
  });

  onWebRTC('muteChanged', (data: unknown) => {
    const { muted } = data as { muted: boolean };
    const btn = document.getElementById('arena-mic-btn');
    if (btn) {
      btn.classList.toggle('muted', muted);
      btn.textContent = muted ? '\uD83D\uDD07' : '\uD83C\uDF99\uFE0F';
    }
    const statusEl = document.getElementById('arena-audio-status');
    if (statusEl) statusEl.textContent = muted ? 'Muted' : 'Unmuted \u2014 speaking';
  });

  onWebRTC('tick', (data: unknown) => {
    const { timeLeft } = data as { timeLeft: number };
    const timerEl = document.getElementById('arena-room-timer');
    if (timerEl) {
      timerEl.textContent = formatTimer(timeLeft);
      timerEl.classList.toggle('warning', timeLeft <= 15);
    }
  });

  onWebRTC('debateEnd', () => { void endCurrentDebate(); });

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
