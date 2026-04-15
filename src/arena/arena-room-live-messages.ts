// arena-room-live-messages.ts — message rendering into #arena-messages
// Leaf module — no imports from other arena-room-live-* files.

import { getCurrentProfile } from '../auth.ts';
import { escapeHTML } from '../config.ts';
import { currentDebate } from './arena-state.ts';
import type { DebateRole } from './arena-types.ts';

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
