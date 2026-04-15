/**
 * THE MODERATOR — Voice Memo Sheet
 * openRecorderSheet, closeRecorderSheet, toggleRecord, retake, send.
 */

import { showToast } from './config.ts';
import { safeRpc, getIsPlaceholderMode } from './auth.ts';
import { loadHotTakes } from './async.ts';
import { startRecording, stopRecording, isRecordingState, RecordingResult } from './voicememo.record.ts';
import type { RecorderContext } from './voicememo.ts';

// LANDMINE [LM-VM-001]: openRecorderSheet is a stub. The actual recorder sheet
// HTML/CSS lives in a legacy moderator-voicememo.js file, not in this TypeScript
// module. This typed mirror provides function signatures for compile-time checking only.

let pendingRecording: RecordingResult | null = null;

export function openRecorderSheet(_context: RecorderContext = {}): void {
  // Full implementation in moderator-voicememo.js
  void _context;
}

export function closeRecorderSheet(): void {
  const sheet = document.getElementById('vm-recorder-sheet');
  if (sheet) sheet.remove();
}

export async function toggleRecord(): Promise<void> {
  if (!isRecordingState) {
    await startRecording();
  } else {
    const result = await stopRecording();
    if (result) pendingRecording = result;
  }
}

export function retake(): void {
  pendingRecording = null;
  resetPlayingState();

  const audioEl = document.getElementById('vm-audio-preview') as HTMLAudioElement | null;
  if (audioEl) { audioEl.pause(); audioEl.src = ''; }

  document.getElementById('vm-preview')?.classList.remove('visible');
  document.getElementById('vm-send-btn')?.classList.remove('visible');

  const timer = document.getElementById('vm-timer');
  if (timer) { timer.textContent = '0:00'; timer.classList.add('idle'); }

  const hint = document.getElementById('vm-hint');
  if (hint) hint.textContent = `Tap to record your take (120s max)`;
}

export async function send(): Promise<void> {
  if (!pendingRecording) return;

  const sheet = document.getElementById('vm-recorder-sheet');
  const context = ((sheet as unknown as Record<string, unknown> | null)?._context as RecorderContext | undefined) ?? {};

  showToast('📤 Sending voice take...');

  const { url, path } = await uploadVoiceMemo(pendingRecording.blob, context.debateId ?? null);

  if (!getIsPlaceholderMode()) {
    const { error } = await safeRpc('create_voice_take', {
      p_section: context.section ?? 'trending',
      p_voice_memo_url: url,
      p_voice_memo_path: path,
      p_voice_memo_duration: pendingRecording.duration,
      p_parent_id: context.parentTakeId ?? null,
      p_content: '🎤 Voice Take',
    });
    if (error) {
      console.error('create_voice_take error:', error);
      if (pendingRecording?.url) URL.revokeObjectURL(pendingRecording.url);
      pendingRecording = null;
      showToast('⚠️ Failed to post voice take. Try again.');
      return;
    }
  }

  if (pendingRecording?.url) URL.revokeObjectURL(pendingRecording.url);
  pendingRecording = null;
  closeRecorderSheet();
  showToast('🎤 Voice take posted!');
  loadHotTakes(context.section ?? 'all');
}
