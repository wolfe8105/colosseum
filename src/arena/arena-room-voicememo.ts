// arena-room-voicememo.ts — voice memo recording & sending
// Part of the arena.ts monolith split

import { safeRpc } from '../auth.ts';
import { startRecording, stopRecording, retake as vmRetake, send as vmSend } from '../voicememo.ts';
import {
  currentDebate, vmRecording, vmTimer, vmSeconds,
  set_vmRecording, set_vmTimer, set_vmSeconds,
} from './arena-state.ts';
import type { DebateRole } from './arena-types.ts';
import { isPlaceholder, formatTimer } from './arena-core.ts';
import { addMessage, addSystemMessage, startOpponentPoll, advanceRound } from './arena-room-live.ts';

export function wireVoiceMemoControls(): void {
  document.getElementById('arena-record-btn')?.addEventListener('click', () => {
    if (!vmRecording) void startVoiceMemoRecording();
    else stopVoiceMemoRecording();
  });
  document.getElementById('arena-vm-cancel')?.addEventListener('click', () => {
    vmRetake();
    resetVoiceMemoUI();
  });
  document.getElementById('arena-vm-send')?.addEventListener('click', () => { void sendVoiceMemo(); });
}

export async function startVoiceMemoRecording(): Promise<void> {
  set_vmRecording(true);
  set_vmSeconds(0);
  const recordBtn = document.getElementById('arena-record-btn');
  const statusEl = document.getElementById('arena-vm-status');
  const timerEl = document.getElementById('arena-vm-timer');

  recordBtn?.classList.add('recording');
  if (recordBtn) recordBtn.textContent = '\u23F9';
  if (statusEl) statusEl.textContent = 'Recording...';
  timerEl?.classList.remove('arena-hidden');

  set_vmTimer(setInterval(() => {
    set_vmSeconds(vmSeconds + 1);
    if (timerEl) timerEl.textContent = formatTimer(vmSeconds);
    if (vmSeconds >= 120) stopVoiceMemoRecording();
  }, 1000));
  try {
    await startRecording();
  } catch {
    if (statusEl) statusEl.textContent = 'Mic access denied';
    resetVoiceMemoUI();
  }
}

export function stopVoiceMemoRecording(): void {
  set_vmRecording(false);
  if (vmTimer) clearInterval(vmTimer);

  const recordBtn = document.getElementById('arena-record-btn');
  const statusEl = document.getElementById('arena-vm-status');
  const cancelBtn = document.getElementById('arena-vm-cancel');
  const sendBtn = document.getElementById('arena-vm-send');

  recordBtn?.classList.remove('recording');
  if (recordBtn) recordBtn.textContent = '\u23FA';
  if (statusEl) statusEl.textContent = `Recorded ${formatTimer(vmSeconds)} \u2014 send or retake`;
  cancelBtn?.classList.remove('arena-hidden');
  sendBtn?.classList.remove('arena-hidden');

  void stopRecording();
}

export function resetVoiceMemoUI(): void {
  set_vmRecording(false);
  set_vmSeconds(0);
  if (vmTimer) clearInterval(vmTimer);

  const recordBtn = document.getElementById('arena-record-btn');
  const statusEl = document.getElementById('arena-vm-status');
  const timerEl = document.getElementById('arena-vm-timer');
  const cancelBtn = document.getElementById('arena-vm-cancel');
  const sendBtn = document.getElementById('arena-vm-send');

  recordBtn?.classList.remove('recording');
  if (recordBtn) recordBtn.textContent = '\u23FA';
  if (statusEl) statusEl.textContent = 'Tap to record your argument';
  timerEl?.classList.add('arena-hidden');
  cancelBtn?.classList.add('arena-hidden');
  sendBtn?.classList.add('arena-hidden');
}

let _sendingMemo = false;

export async function sendVoiceMemo(): Promise<void> {
  if (_sendingMemo) return;
  _sendingMemo = true;
  const sendBtn = document.getElementById('arena-vm-send') as HTMLButtonElement | null;
  if (sendBtn) sendBtn.disabled = true;
  try {
  const debate = currentDebate!;
  const side = debate.role;
  const memoLabel = `\uD83C\uDF99 Voice memo (${formatTimer(vmSeconds)})`;

  addMessage(side, memoLabel, debate.round, false);
  resetVoiceMemoUI();
  await vmSend();

  // Save to debate_messages so opponent polling finds it
  if (!isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
    try {
      await safeRpc('submit_debate_message', {
        p_debate_id: debate.id,
        p_round: debate.round,
        p_side: side,
        p_content: memoLabel,
      });
    } catch { /* warned */ }
  }

  addSystemMessage('Voice memo sent \u2014 waiting for opponent...');

  // Disable record button during wait
  const recordBtn = document.getElementById('arena-record-btn') as HTMLButtonElement | null;
  if (recordBtn) recordBtn.disabled = true;

  if (isPlaceholder() || debate.id.startsWith('placeholder-')) {
    setTimeout(() => {
      const oppSide: DebateRole = side === 'a' ? 'b' : 'a';
      addMessage(oppSide, '\uD83C\uDF99 Voice memo (0:47)', debate.round, false);
      if (recordBtn) recordBtn.disabled = false;
      advanceRound();
    }, 3000 + Math.random() * 4000);
  } else {
    startOpponentPoll(debate.id, side, debate.round);
  }
  } finally { _sendingMemo = false; }
}
