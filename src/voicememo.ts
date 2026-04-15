/**
 * THE MODERATOR — Voice Memo Module (TypeScript)
 *
 * Runtime module. SURVIVAL-CRITICAL: Solves empty lobby problem.
 * Record take → opponent records reply → async voice debate.
 *
 * Migration: Session 127 (Phase 3). ES imports: Session 140.
 * Refactored: split into 4 sub-modules (record, upload, player, sheet).
 */

import { FEATURES } from './config.ts';
import { startRecording, stopRecording, cancelRecording, cleanupPendingRecording, isRecordingState } from './voicememo.record.ts';
import type { RecordingResult } from './voicememo.record.ts';
import { uploadVoiceMemo, revokeAllFallbackURLs } from './voicememo.upload.ts';
import { renderPlayer, playInline, togglePlayback } from './voicememo.player.ts';
import { openRecorderSheet, closeRecorderSheet, toggleRecord, retake, send } from './voicememo.sheet.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type { RecordingResult };

export interface RecorderContext {
  section?: string;
  debateId?: string;
  replyTo?: string;
  replyText?: string;
  parentTakeId?: string;
  topic?: string;
}

// Re-export everything callers need so they don't have to change their imports
export { startRecording, stopRecording, cancelRecording, cleanupPendingRecording };
export { retake, send };
export { uploadVoiceMemo, revokeAllFallbackURLs };
export { renderPlayer, playInline, togglePlayback };
export { openRecorderSheet, closeRecorderSheet, toggleRecord };

// ============================================================
// PUBLIC ENTRY POINTS
// ============================================================

export function recordTake(section: string = 'trending'): void {
  openRecorderSheet({ section });
}

export function replyToTake(takeId: string, username: string, takeText: string, section: string): void {
  openRecorderSheet({ replyTo: username, replyText: takeText, parentTakeId: takeId, section });
}

export function debateReply(debateId: string, topic: string, section: string): void {
  openRecorderSheet({ debateId, topic, section });
}

// LANDMINE [LM-VM-002]: _currentUsername and _truncate are dead exports — "Available
// for future use" per original source. Neither is called anywhere in the codebase.
export function _currentUsername(): string { return 'Gladiator'; }
export function _truncate(str: string | undefined | null, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
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
  cleanupPendingRecording: (url: string | null) => cleanupPendingRecording(url),
  toggleRecord,
  retake,
  send,
  recordTake,
  replyToTake,
  debateReply,
  togglePlayback,
  playInline,
  renderPlayer,
  uploadVoiceMemo,
  revokeAllFallbackURLs,
  openRecorderSheet,
  closeRecorderSheet,
  get isRecording() { return isRecordingState; },
  get isEnabled() { return isEnabled(); },
} as const;

export default voicememo;
