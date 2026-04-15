// arena-room-live.ts — input controls, text/live mode, messaging
// Part of the arena.ts monolith split

import { safeRpc, getCurrentProfile } from '../auth.ts';
import { escapeHTML } from '../config.ts';
import { joinDebate, leaveDebate, on as onWebRTC, toggleMute, createWaveform, getLocalStream } from '../webrtc.ts';
import { nudge } from '../nudge.ts';
import {
  currentDebate, opponentPollTimer, opponentPollElapsed, roundTimer,
  roundTimeLeft, screenEl,
  set_opponentPollTimer, set_opponentPollElapsed, set_roundTimer,
  set_roundTimeLeft,
} from './arena-state.ts';
import type { DebateMode, DebateRole, CurrentDebate } from './arena-types.ts';
import { TEXT_MAX_CHARS, OPPONENT_POLL_MS, OPPONENT_POLL_TIMEOUT_SEC, ROUND_DURATION } from './arena-constants.ts';
import { isPlaceholder, formatTimer } from './arena-core.ts';
import { handleAIResponse, generateSimulatedResponse } from './arena-room-ai.ts';
import { endCurrentDebate } from './arena-room-end.ts';
import { wireVoiceMemoControls } from './arena-room-voicememo.ts';

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

// ============================================================
// TEXT / AI MODE
// ============================================================

export function stopOpponentPoll(): void {
  if (opponentPollTimer) { clearInterval(opponentPollTimer); set_opponentPollTimer(null); }
  set_opponentPollElapsed(0);
}

export function startOpponentPoll(debateId: string, myRole: DebateRole, round: number): void {
  stopOpponentPoll();

  set_opponentPollTimer(setInterval(async () => {
    set_opponentPollElapsed(opponentPollElapsed + OPPONENT_POLL_MS / 1000);

    if (opponentPollElapsed >= OPPONENT_POLL_TIMEOUT_SEC) {
      stopOpponentPoll();
      addSystemMessage('Opponent hasn\'t responded. You can continue waiting or leave the debate.');
      const inp = document.getElementById('arena-text-input') as HTMLTextAreaElement | null;
      if (inp) inp.disabled = false;
      const rec = document.getElementById('arena-record-btn') as HTMLButtonElement | null;
      if (rec) rec.disabled = false;
      return;
    }

    try {
      const { data, error } = await safeRpc<unknown>('get_debate_messages', { p_debate_id: debateId });
      if (error || !data) return;

      const msgs = (Array.isArray(data) ? data : []) as Array<{ side: string; round: number; content: string; is_ai: boolean }>;
      const oppMsg = msgs.find(m => m.side !== myRole && m.round === round);
      if (!oppMsg) return;

      stopOpponentPoll();
      const oppSide: DebateRole = myRole === 'a' ? 'b' : 'a';
      addMessage(oppSide, oppMsg.content, round, oppMsg.is_ai ?? false);

      // Re-enable input for next round (text or voicememo)
      const inp = document.getElementById('arena-text-input') as HTMLTextAreaElement | null;
      if (inp) inp.disabled = false;
      const rec = document.getElementById('arena-record-btn') as HTMLButtonElement | null;
      if (rec) rec.disabled = false;

      advanceRound();
    } catch { /* retry next tick */ }
  }, OPPONENT_POLL_MS));
}

export async function submitTextArgument(): Promise<void> {
  const input = document.getElementById('arena-text-input') as HTMLTextAreaElement | null;
  if (!input || !input.value.trim()) return;

  const text = input.value.trim();
  input.value = '';
  input.style.height = 'auto';
  const charCountEl = document.getElementById('arena-char-count');
  if (charCountEl) charCountEl.textContent = '0';
  const sendBtnEl = document.getElementById('arena-send-btn') as HTMLButtonElement | null;
  if (sendBtnEl) sendBtnEl.disabled = true;

  const debate = currentDebate!;
  const side = debate.role;
  addMessage(side, text, debate.round, false);

  if (!isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
    try {
      await safeRpc('submit_debate_message', {
        p_debate_id: debate.id,
        p_round: debate.round,
        p_side: side,
        p_content: text,
      });
    } catch { /* warned */ }
  }

  if (debate.mode === 'ai') {
    await handleAIResponse(debate, text);
  } else {
    // Human-vs-human: disable input, poll for opponent's message
    input.disabled = true;
    addSystemMessage('Waiting for opponent\'s response...');
    if (isPlaceholder() || debate.id.startsWith('placeholder-')) {
      setTimeout(() => {
        const oppSide: DebateRole = side === 'a' ? 'b' : 'a';
        addMessage(oppSide, generateSimulatedResponse(debate.round), debate.round, false);
        input.disabled = false;
        advanceRound();
      }, 2000 + Math.random() * 3000);
    } else {
      startOpponentPoll(debate.id, side, debate.round);
    }
  }
}

export function advanceRound(): void {
  const debate = currentDebate!;
  if (debate.round >= debate.totalRounds) {
    setTimeout(() => void endCurrentDebate(), 1500);
    return;
  }

  // F-57 round-end cluster: snapshot scores + apply pressure before advancing.
  // Fire-and-forget — non-fatal if it fails. ON CONFLICT DO NOTHING on the
  // server means only the first caller (of potentially two debaters) does work.
  const completedRound = debate.round;
  if (!debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-') && debate.mode !== 'ai') {
    void safeRpc('close_debate_round', {
      p_debate_id: debate.id,
      p_round:     completedRound,
    }).then(({ data }) => {
      if (!data) return;
      const result = data as { pressure_on_a?: boolean; pressure_on_b?: boolean; score_a?: number; score_b?: number };
      const myRole = debate.role;
      const pressureHitMe =
        (myRole === 'a' && result.pressure_on_a) ||
        (myRole === 'b' && result.pressure_on_b);
      if (pressureHitMe) {
        addSystemMessage('🗜️ Pressure — you scored 0 this round: −2 pts');
      }
    }).catch(() => { /* non-fatal */ });
  }

  debate.round++;
  nudge('round_end', '\uD83D\uDD14 Round complete. Stay sharp.');
  addSystemMessage(`Round ${debate.round} of ${debate.totalRounds} \u2014 Your turn.`);

  const roundLabel = document.getElementById('arena-round-label');
  if (roundLabel) roundLabel.textContent = `ROUND ${debate.round}/${debate.totalRounds}`;

  if (debate.mode === 'live') startLiveRoundTimer();
}

// ============================================================
// LIVE AUDIO MODE
// ============================================================

export function startLiveRoundTimer(): void {
  set_roundTimeLeft(ROUND_DURATION);
  if (roundTimer) clearInterval(roundTimer);
  const timerEl = document.getElementById('arena-room-timer');

  set_roundTimer(setInterval(() => {
    set_roundTimeLeft(roundTimeLeft - 1);
    if (timerEl) {
      timerEl.textContent = formatTimer(roundTimeLeft);
      timerEl.classList.toggle('warning', roundTimeLeft <= 15);
    }
    if (roundTimeLeft <= 0) {
      if (roundTimer) clearInterval(roundTimer);
      addSystemMessage("\u23F1\uFE0F Time's up for this round!");
      advanceRound();
    }
  }, 1000));
}

export async function initLiveAudio(): Promise<void> {
  const debate = currentDebate!;

  onWebRTC('micReady', () => {
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
        ? '\uD83D\uDFE1 Connection interrupted — reconnecting...'
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

// ============================================================
// MESSAGE RENDERING
// ============================================================

export function addMessage(side: DebateRole, text: string, round: number, isAI: boolean): void {
  const messages = document.getElementById('arena-messages');
  if (!messages) return;

  const debate = currentDebate;
  if (debate?.messages) {
    debate.messages.push({
      role: side === debate.role ? 'user' : 'assistant',
      text,
      round,
    });
  }

  const profile = getCurrentProfile();
  const isMe = side === debate?.role;
  const name = isAI ? '\uD83E\uDD16 AI' : isMe ? (profile?.display_name ?? 'You') : (debate?.opponentName ?? 'Opponent');

  const msg = document.createElement('div');
  msg.className = `arena-msg side-${side} arena-fade-in`;
  msg.innerHTML = `
    <div class="msg-label">${escapeHTML(name)}</div>
    <div>${escapeHTML(text)}</div>
    <div class="msg-round">Round ${round}</div>
  `;
  messages.appendChild(msg);
  messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
}

export function addSystemMessage(text: string): void {
  const messages = document.getElementById('arena-messages');
  if (!messages) return;
  const msg = document.createElement('div');
  msg.className = 'arena-msg system arena-fade-in';
  msg.textContent = text;
  messages.appendChild(msg);
  messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
}
