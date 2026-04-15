/**
 * THE MODERATOR — Voice Memo Recording + Visualization
 * startRecording, stopRecording, cancelRecording, cleanup, updateRecorderUI,
 * startVisualization, stopVisualization.
 */

import { showToast } from './config.ts';

// RecordingResult defined locally to avoid circular dep with voicememo.ts
export interface RecordingResult {
  blob: Blob;
  url: string;
  duration: number;
  mimeType: string;
}

const MAX_DURATION_SEC = 120;
const MIN_DURATION_SEC = 5;

// Recording state
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingStream: MediaStream | null = null;
export let isRecordingState = false;
let recordingStartTime: number | null = null;
let recordingTimer: ReturnType<typeof setInterval> | null = null;

// Visualization state
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let animationFrame: number | null = null;

// ============================================================
// RECORDING
// ============================================================

export async function startRecording(): Promise<boolean> {
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 },
      video: false,
    });

    audioChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';

    mediaRecorder = new MediaRecorder(recordingStream, { mimeType });
    mediaRecorder.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => { stopVisualization(); };
    mediaRecorder.start(250);

    isRecordingState = true;
    recordingStartTime = Date.now();
    updateRecorderUI();
    recordingTimer = setInterval(updateRecorderUI, 100);

    setTimeout(() => { if (isRecordingState) void stopRecording(); }, MAX_DURATION_SEC * 1000);
    startVisualization(recordingStream);
    return true;
  } catch (err) {
    console.error('startRecording error:', err);
    if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; }
    cleanup();
    showToast('🎤 Microphone access denied. Check browser permissions.');
    return false;
  }
}

export function stopRecording(): Promise<RecordingResult | null> {
  if (!mediaRecorder || !isRecordingState) return Promise.resolve(null);

  return new Promise((resolve) => {
    mediaRecorder!.onstop = () => {
      stopVisualization();
      const elapsed = (Date.now() - (recordingStartTime ?? 0)) / 1000;

      if (elapsed < MIN_DURATION_SEC) {
        showToast(`⚠️ Too short — record at least ${MIN_DURATION_SEC} seconds`);
        cleanup();
        resolve(null);
        return;
      }

      const mimeType = mediaRecorder!.mimeType;
      const blob = new Blob(audioChunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const duration = Math.round(elapsed);
      cleanup();
      resolve({ blob, url, duration, mimeType });
    };

    mediaRecorder!.stop();
    isRecordingState = false;
    if (recordingTimer) clearInterval(recordingTimer);
  });
}

export function cancelRecording(): void {
  if (mediaRecorder && isRecordingState) mediaRecorder.stop();
  isRecordingState = false;
  if (recordingTimer) clearInterval(recordingTimer);
  cleanup();
  // Inline sheet close to avoid circular dep with voicememo.sheet.ts
  document.getElementById('vm-recorder-sheet')?.remove();
}

export function cleanupPendingRecording(pendingUrl: string | null): void {
  if (pendingUrl) URL.revokeObjectURL(pendingUrl);
  if (isRecordingState) cancelRecording();
  // Inline fallback URL revocation to avoid circular dep
  // (callers should use revokeAllFallbackURLs from voicememo.upload.ts directly if needed)
}

function cleanup(): void {
  if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; }
  if (recordingStream) { recordingStream.getTracks().forEach(t => t.stop()); recordingStream = null; }
  audioChunks = [];
  mediaRecorder = null;
  isRecordingState = false;
  recordingStartTime = null;
}

function updateRecorderUI(): void {
  if (!recordingStartTime) return;
  const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
  const min = Math.floor(elapsed / 60);
  const sec = String(elapsed % 60).padStart(2, '0');
  const remaining = MAX_DURATION_SEC - elapsed;
  const timerEl = document.getElementById('vm-timer');
  if (timerEl) {
    timerEl.textContent = `${min}:${sec}`;
    timerEl.classList.remove('idle');
    if (remaining <= 10) timerEl.style.color = 'var(--mod-magenta)';
  }
}

// ============================================================
// VISUALIZATION
// ============================================================

function startVisualization(stream: MediaStream): void {
  audioContext = new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>)['webkitAudioContext'])();
  const source = audioContext.createMediaStreamSource(stream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 128;
  source.connect(analyser);

  const canvas = document.getElementById('vm-waveform') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  const currentAnalyser = analyser;

  function draw(): void {
    if (!isRecordingState) return;
    animationFrame = requestAnimationFrame(draw);
    currentAnalyser.getByteFrequencyData(dataArray);

    const w = canvas!.width;
    const h = canvas!.height;
    ctx!.clearRect(0, 0, w, h);

    const barCount = 32;
    const barWidth = w / barCount - 2;
    const step = Math.floor(bufferLength / barCount);

    for (let i = 0; i < barCount; i++) {
      const val = (dataArray[i * step] ?? 0) / 255;
      const barHeight = Math.max(2, val * h);
      const x = i * (barWidth + 2);
      const y = (h - barHeight) / 2;
      const alpha = 0.4 + val * 0.6;
      // LANDMINE [LM-VM-003]: Hardcodes rgba(212, 168, 67) — no CSS var token equivalent exists yet.
      ctx!.fillStyle = `rgba(212, 168, 67, ${alpha})`;
      ctx!.fillRect(x, y, barWidth, barHeight);
    }
  }
  draw();
}

function stopVisualization(): void {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (audioContext) { audioContext.close().catch(e => console.warn('[VoiceMemo] audioContext close failed:', e)); audioContext = null; }
  analyser = null;
}
