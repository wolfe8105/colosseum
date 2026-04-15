// arena-room-live-input.ts — input controls dispatcher for text/ai, live, and voicememo modes

import type { DebateMode } from './arena-types.ts';
import { TEXT_MAX_CHARS } from './arena-constants.ts';
import { wireVoiceMemoControls } from './arena-room-voicememo.ts';
import { submitTextArgument } from './arena-room-live-poll.ts';
import { toggleLiveMute } from './arena-room-live-audio.ts';

export function renderInputControls(mode: DebateMode): void {
  const inputArea = document.getElementById('arena-input-area');
  if (!inputArea) return;

  switch (mode) {
    case 'text':
    case 'ai':
      inputArea.innerHTML = `
        <div class="arena-text-row">
          <textarea class="arena-text-input" id="arena-text-input" placeholder="Type your argument..." maxlength="${TEXT_MAX_CHARS}" rows="2"></textarea>
          <button class="arena-send-btn" id="arena-send-btn" disabled>\u2192</button>
        </div>
        <div class="arena-char-count"><span id="arena-char-count">0</span> / ${TEXT_MAX_CHARS}</div>
      `;
      {
        const input = document.getElementById('arena-text-input') as HTMLTextAreaElement | null;
        const sendBtn = document.getElementById('arena-send-btn') as HTMLButtonElement | null;
        const charCount = document.getElementById('arena-char-count');
        input?.addEventListener('input', () => {
          const len = input.value.length;
          if (charCount) charCount.textContent = String(len);
          if (sendBtn) sendBtn.disabled = len === 0;
          // Auto-resize
          input.style.height = 'auto';
          input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });
        sendBtn?.addEventListener('click', () => void submitTextArgument());
        // Enter key to submit (shift+enter for newline)
        input?.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submitTextArgument(); }
        });
      }
      break;

    case 'live':
      inputArea.innerHTML = `
        <canvas class="arena-waveform" id="arena-waveform" width="300" height="40"></canvas>
        <div class="arena-audio-controls">
          <button class="arena-mic-btn" id="arena-mic-btn">\uD83C\uDF99\uFE0F</button>
        </div>
        <div class="arena-audio-status" id="arena-audio-status">Connecting audio...</div>
      `;
      document.getElementById('arena-mic-btn')?.addEventListener('click', toggleLiveMute);
      break;

    case 'voicememo':
      inputArea.innerHTML = `
        <div class="arena-vm-controls">
          <div class="arena-vm-status" id="arena-vm-status">Tap to record your argument</div>
          <div class="arena-vm-timer arena-hidden" id="arena-vm-timer">0:00</div>
          <button class="arena-record-btn" id="arena-record-btn">\u23FA</button>
          <div style="display:flex;gap:10px;margin-top:8px;">
            <button class="arena-card-btn arena-hidden" id="arena-vm-cancel">RETAKE</button>
            <button class="arena-card-btn arena-hidden" id="arena-vm-send" style="border-color:var(--mod-accent-border);color:var(--mod-accent);">SEND</button>
          </div>
        </div>
      `;
      wireVoiceMemoControls();
      break;
  }
}
