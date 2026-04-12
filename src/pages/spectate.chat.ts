/**
 * THE MODERATOR — Spectator View Chat
 *
 * Spectator chat rendering, send, UI wiring, and polling.
 */

import { safeRpc, getCurrentProfile, getCurrentUser } from '../auth.ts';
import { state } from './spectate.state.ts';
import { escHtml, timeAgo } from './spectate.utils.ts';
import type { SpectateDebate, SpectatorChatMessage } from './spectate.types.ts';

export function renderChatMessages(msgs: SpectatorChatMessage[]): string {
  let html = '';
  for (const m of msgs) {
    html += '<div class="sc-msg">';
    html += '<span class="sc-msg-name">' + escHtml(m.display_name) + '</span>';
    html += '<span class="sc-msg-text">' + escHtml(m.message) + '</span>';
    html += '<span class="sc-msg-time">' + timeAgo(m.created_at) + '</span>';
    html += '</div>';
  }
  return html;
}

export function refreshChatUI(): void {
  const container = document.getElementById('spec-chat-messages');
  const countEl = document.getElementById('chat-count');
  if (!container) return;

  if (state.chatMessages.length === 0) {
    container.innerHTML = '<div class="spec-chat-empty">No messages yet. Be the first to react!</div>';
  } else {
    container.innerHTML = renderChatMessages(state.chatMessages);
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }
  if (countEl) countEl.textContent = state.chatMessages.length > 0 ? '(' + state.chatMessages.length + ')' : '';
}

export function wireChatUI(d: SpectateDebate): void {
  const header = document.getElementById('spec-chat-header');
  if (header) {
    header.addEventListener('click', () => {
      state.chatOpen = !state.chatOpen;
      const body = document.getElementById('spec-chat-body');
      const toggle = document.getElementById('chat-toggle');
      if (body) body.classList.toggle('open', state.chatOpen);
      if (toggle) toggle.classList.toggle('open', state.chatOpen);
    });
  }

  if (!state.isLoggedIn) return;

  const input = document.getElementById('chat-input') as HTMLInputElement | null;
  const sendBtn = document.getElementById('chat-send') as HTMLButtonElement | null;
  if (!input || !sendBtn) return;

  let sending = false;

  async function sendChat() {
    if (sending) return;
    const msg = input!.value.trim();
    if (!msg || msg.length > 280) return;

    sending = true;
    sendBtn!.disabled = true;
    input!.value = '';

    try {
      const { data, error } = await safeRpc('send_spectator_chat', {
        p_debate_id: state.debateId,
        p_message: msg
      });

      if (error) {
        console.warn('[Spectate] Chat send error:', error.message);
        input!.value = msg;
      } else if (data && data.success === false) {
        console.warn('[Spectate] Chat rejected:', data.error);
        input!.placeholder = data.error || 'Error';
        setTimeout(() => { input!.placeholder = 'Say something...'; }, 2000);
        if (data.error && !data.error.includes('Slow down')) {
          input!.value = msg;
        }
      } else {
        // Optimistic append
        const displayName = data?.display_name || getCurrentProfile()?.display_name || 'You';
        state.chatMessages.push({
          display_name: displayName,
          message: msg,
          created_at: new Date().toISOString(),
          user_id: getCurrentUser()?.id || null
        });
        refreshChatUI();
      }
    } catch (err) {
      console.warn('[Spectate] Chat error:', err);
      input!.value = msg;
    }

    sending = false;
    sendBtn!.disabled = false;
    input!.focus();
  }

  sendBtn.addEventListener('click', sendChat);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });
}

export function startChatPolling(): void {
  if (state.chatPollTimer) clearInterval(state.chatPollTimer);
  state.chatPollTimer = setInterval(async () => {
    try {
      const { data: freshChat } = await safeRpc('get_spectator_chat', { p_debate_id: state.debateId, p_limit: 100 });
      if (!freshChat || freshChat.length === 0) return;
      const newMessages = state.lastChatMessageAt
        ? freshChat.filter((m: SpectatorChatMessage) => m.created_at! > state.lastChatMessageAt!)
        : freshChat;
      if (newMessages.length === 0) return;
      state.chatMessages.push(...newMessages);
      state.lastChatMessageAt = state.chatMessages[state.chatMessages.length - 1].created_at;
      refreshChatUI();
    } catch (e) {
      // Silent fail on chat poll
    }
  }, 6000);
}
