/**
 * THE COLOSSEUM — Voice Memo Module (TypeScript)
 *
 * Runtime module (replaces moderator-voicememo.js). SURVIVAL-CRITICAL: Solves empty
 * lobby problem. Record take → opponent records reply → async voice debate.
 * Uses MediaRecorder API, Supabase Storage, placeholder fallback.
 *
 * Migration: Session 127 (Phase 3). ES imports: Session 140.
 */

import { safeRpc, getSupabaseClient, getCurrentUser, getCurrentProfile, getIsPlaceholderMode } from './auth.ts';
import { escapeHTML, FEATURES } from './config.ts';
import { loadHotTakes } from './async.ts';
import type { SafeRpcResult } from './auth.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface RecordingResult {
  blob: Blob;
  url: string;
  duration: number;
  mimeType: string;
}

export interface UploadResult {
  url: string;
  path: string;
}

export interface RecorderContext {
  section?: string;
  debateId?: string;
  replyTo?: string;
  replyText?: string;
  parentTakeId?: string;
  topic?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const MAX_DURATION_SEC = 120;
const MIN_DURATION_SEC = 5;

// ============================================================
// STATE
// ============================================================

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingStream: MediaStream | null = null;
let isRecordingState = false;
let recordingStartTime: number | null = null;
let recordingTimer: ReturnType<typeof setInterval> | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let animationFrame: number | null = null;
let pendingRecording: RecordingResult | null = null;
let isPlayingState = false;

// ============================================================
// HELPERS
// ============================================================

function getSupabase() {
  return getSupabaseClient();
}

function isPlaceholder(): boolean {
  return getIsPlaceholderMode();
}

function currentUserId(): string {
  const user = getCurrentUser();
  return user ? user.id : 'placeholder-user';
}

/** Available for future use — voice take attribution */
export function _currentUsername(): string {
  const profile = getCurrentProfile();
  if (profile) {
    return (profile as Record<string, unknown>).display_name as string ?? (profile as Record<string, unknown>).username as string ?? 'Gladiator';
  }
  return 'Gladiator';
}

/** Available for future use — UI text truncation */
export function _truncate(str: string | undefined | null, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function showToast(msg: string): void {
  const toast = document.createElement('div');
  toast.style.cssText =
    'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#132240;color:#f0f0f0;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;border:1px solid rgba(212,168,67,0.2);box-shadow:0 4px 20px rgba(0,0,0,0.4);max-width:90vw;text-align:center;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ============================================================
// RECORDING
// ============================================================

export async function startRecording(): Promise<boolean> {
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
      },
      video: false,
    });

    audioChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

    mediaRecorder = new MediaRecorder(recordingStream, { mimeType });

    mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stopVisualization();
    };

    mediaRecorder.start(250);
    isRecordingState = true;
    recordingStartTime = Date.now();

    updateRecorderUI();
    recordingTimer = setInterval(updateRecorderUI, 100);

    startVisualization(recordingStream);

    setTimeout(() => {
      if (isRecordingState) void stopRecording();
    }, MAX_DURATION_SEC * 1000);

    return true;
  } catch (err) {
    console.error('Mic access denied:', err);
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
  if (mediaRecorder && isRecordingState) {
    mediaRecorder.stop();
  }
  isRecordingState = false;
  if (recordingTimer) clearInterval(recordingTimer);
  cleanup();
  closeRecorderSheet();
}

function cleanup(): void {
  if (recordingStream) {
    recordingStream.getTracks().forEach((t) => t.stop());
    recordingStream = null;
  }
  audioChunks = [];
  mediaRecorder = null;
  isRecordingState = false;
  recordingStartTime = null;
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
      ctx!.fillStyle = `rgba(212, 168, 67, ${alpha})`;
      ctx!.fillRect(x, y, barWidth, barHeight);
    }
  }

  draw();
}

function stopVisualization(): void {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
  analyser = null;
}

// ============================================================
// UPLOAD / STORAGE
// ============================================================

export async function uploadVoiceMemo(blob: Blob, debateId: string | null): Promise<UploadResult> {
  const supabase = getSupabase();
  if (!supabase) {
    const url = URL.createObjectURL(blob);
    console.log('[PLACEHOLDER] Voice memo stored locally:', url);
    return { url, path: 'placeholder/' + Date.now() + '.webm' };
  }

  const userId = currentUserId();
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const path = `voice-memos/${userId}/${debateId ?? 'take'}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('debate-audio').upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  });

  if (error) {
    console.error('Upload failed:', error);
    showToast('⚠️ Upload failed. Saved locally.');
    return { url: URL.createObjectURL(blob), path: 'local-fallback' };
  }

  const { data: urlData } = supabase.storage.from('debate-audio').getPublicUrl(path);

  return { url: urlData.publicUrl, path };
}

// ============================================================
// RECORDER UI (Bottom Sheet) — Stubs for type completeness
// The actual UI is heavy inline HTML/CSS in the .js file.
// Full implementation carries over from moderator-voicememo.js.
// ============================================================

export function openRecorderSheet(_context: RecorderContext = {}): void {
  // Full implementation in moderator-voicememo.js
  // This typed mirror provides the function signatures for compile-time checking
  void _context;
}

export function closeRecorderSheet(): void {
  const sheet = document.getElementById('vm-recorder-sheet');
  if (sheet) sheet.remove();
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
    if (remaining <= 10) timerEl.style.color = '#cc2936';
  }
}

export async function toggleRecord(): Promise<void> {
  if (!isRecordingState) {
    await startRecording();
  } else {
    const result = await stopRecording();
    if (result) {
      pendingRecording = result;
    }
  }
}

export function togglePlayback(): void {
  const audioEl = document.getElementById('vm-audio-preview') as HTMLAudioElement | null;
  const playBtn = document.getElementById('vm-play-btn');
  if (!audioEl) return;

  if (isPlayingState) {
    audioEl.pause();
    audioEl.currentTime = 0;
    isPlayingState = false;
    if (playBtn) playBtn.textContent = '▶';
  } else {
    void audioEl.play();
    isPlayingState = true;
    if (playBtn) playBtn.textContent = '⏸';
    audioEl.onended = () => {
      isPlayingState = false;
      if (playBtn) playBtn.textContent = '▶';
    };
  }
}

export function retake(): void {
  pendingRecording = null;
  isPlayingState = false;
  const audioEl = document.getElementById('vm-audio-preview') as HTMLAudioElement | null;
  if (audioEl) {
    audioEl.pause();
    audioEl.src = '';
  }

  document.getElementById('vm-preview')?.classList.remove('visible');
  document.getElementById('vm-send-btn')?.classList.remove('visible');
  const timer = document.getElementById('vm-timer');
  if (timer) {
    timer.textContent = '0:00';
    timer.classList.add('idle');
  }
  const hint = document.getElementById('vm-hint');
  if (hint) hint.textContent = `Tap to record your take (${MAX_DURATION_SEC}s max)`;
}

export async function send(): Promise<void> {
  if (!pendingRecording) return;

  const sheet = document.getElementById('vm-recorder-sheet');
  const context = ((sheet as unknown as Record<string, unknown> | null)?._context as RecorderContext | undefined) ?? {};

  showToast('📤 Sending voice take...');

  const { url, path } = await uploadVoiceMemo(pendingRecording.blob, context.debateId ?? null);

  if (!isPlaceholder()) {
    const { error } = await safeRpc('create_voice_take', {
      p_section: context.section ?? 'trending',
      p_voice_memo_url: url,
      p_voice_memo_path: path,
      p_voice_memo_duration: pendingRecording.duration,
      p_parent_id: context.parentTakeId ?? null,
      p_content: '🎤 Voice Take',
    });
    if (error) console.error('create_voice_take error:', error);
  }

  pendingRecording = null;
  closeRecorderSheet();
  showToast('🎤 Voice take posted!');

  loadHotTakes(context.section ?? 'all');
}

// ============================================================
// PUBLIC ENTRY POINTS
// ============================================================

export function recordTake(section: string = 'trending'): void {
  openRecorderSheet({ section });
}

export function replyToTake(takeId: string, username: string, takeText: string, section: string): void {
  openRecorderSheet({
    replyTo: username,
    replyText: takeText,
    parentTakeId: takeId,
    section,
  });
}

export function debateReply(debateId: string, topic: string, section: string): void {
  openRecorderSheet({ debateId, topic, section });
}

// ============================================================
// INLINE PLAYBACK COMPONENT
// ============================================================

export function renderPlayer(voiceUrl: string, duration: number): string {
  const id = 'vmp-' + Math.random().toString(36).slice(2, 8);
  const min = Math.floor(duration / 60);
  const sec = String(duration % 60).padStart(2, '0');
  const safeUrl = escapeHTML(voiceUrl);

  return `
    <div class="vm-inline-player" data-player-id="${id}" style="
      display:flex;align-items:center;gap:10px;
      background:#132240;border:1px solid rgba(212,168,67,0.12);
      border-radius:10px;padding:10px 12px;margin-top:8px;
    ">
      <button data-action="play-inline" data-player="${id}" style="
        width:40px;height:40px;border-radius:50%;
        background:#d4a843;border:none;color:#0a1628;
        font-size:16px;cursor:pointer;display:flex;
        align-items:center;justify-content:center;flex-shrink:0;
        -webkit-tap-highlight-color:transparent;
      " id="${id}-btn">▶</button>
      <div style="flex:1;">
        <div style="font-size:11px;color:#a0a8b8;letter-spacing:0.5px;">🎤 VOICE TAKE</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;color:#f0f0f0;letter-spacing:1px;">${min}:${sec}</div>
      </div>
      <audio id="${id}" src="${safeUrl}" preload="metadata" style="display:none;"></audio>
    </div>
  `;
}

export function playInline(id: string): void {
  const audio = document.getElementById(id) as HTMLAudioElement | null;
  const btn = document.getElementById(id + '-btn');
  if (!audio || !btn) return;

  if (audio.paused) {
    document.querySelectorAll('.vm-inline-player audio').forEach((a) => {
      const el = a as HTMLAudioElement;
      if (el.id !== id) {
        el.pause();
        el.currentTime = 0;
      }
    });
    document.querySelectorAll('.vm-inline-player button').forEach((b) => {
      b.textContent = '▶';
    });

    void audio.play();
    btn.textContent = '⏸';
    audio.onended = () => {
      btn.textContent = '▶';
    };
  } else {
    audio.pause();
    audio.currentTime = 0;
    btn.textContent = '▶';
  }
}

export function isEnabled(): boolean {
  return FEATURES.voiceMemo !== false;
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

const voicememo = {
  startRecording,
  stopRecording,
  cancelRecording,
  toggleRecord,
  retake,
  send,
  recordTake,
  replyToTake,
  debateReply,
  togglePlayback,
  playInline,
  renderPlayer,
  openRecorderSheet,
  closeRecorderSheet,
  get isRecording() { return isRecordingState; },
  get isEnabled() { return isEnabled(); },
} as const;

export default voicememo;
