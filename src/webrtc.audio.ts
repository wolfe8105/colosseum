/**
 * THE MODERATOR — WebRTC Audio
 *
 * Everything microphone and audio. Knows about state.localStream
 * and state.debateState.
 */

import { state, fire } from './webrtc.state.ts';
import type { WaveformResult } from './webrtc.types.ts';

// ============================================================
// MICROPHONE
// ============================================================

export async function requestMic(): Promise<MediaStream> {
  try {
    state.localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
      },
      video: false,
    });
    fire('micReady', { stream: state.localStream });
    return state.localStream;
  } catch (err) {
    fire('error', { type: 'mic', message: 'Microphone access denied. Check browser permissions.' });
    throw err;
  }
}

export function toggleMute(): boolean {
  if (!state.localStream) return false;
  const track = state.localStream.getAudioTracks()[0];
  if (track) {
    track.enabled = !track.enabled;
    state.debateState.isMuted = !track.enabled;
    fire('muteChanged', { muted: state.debateState.isMuted });
  }
  return state.debateState.isMuted;
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

export function enforceMute(): void {
  if (!state.localStream) return;
  const track = state.localStream.getAudioTracks()[0];
  if (track) {
    track.enabled = false;
    state.debateState.isMuted = true;
    fire('muteChanged', { muted: true });
    fire('turnFrozen', { role: state.debateState.role });
  }
}

export function enforceUnmute(): void {
  if (!state.localStream) return;
  const track = state.localStream.getAudioTracks()[0];
  if (track) {
    track.enabled = true;
    state.debateState.isMuted = false;
    fire('muteChanged', { muted: false });
    fire('turnUnfrozen', { role: state.debateState.role });
  }
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
  state.activeWaveform = {
    analyser,
    audioCtx,
    stop: () => cancelAnimationFrame(rafHandle),
  };
  return state.activeWaveform;
}
