/**
 * THE MODERATOR — Spectator Chat (Live Feed Room)
 * arena-feed-spec-chat.ts
 *
 * F-07: In-debate spectator chat panel, rendered only in the spectator view
 * of the live arena feed room. Distinct from the two debater channels.
 * Hidden from debaters and moderators entirely.
 *
 * Features:
 *  - Initial load + 5s poll for new messages
 *  - Send via send_spectator_chat RPC (rate-limit enforced server-side)
 *  - Report button → mailto: link to reports@themoderator.app
 *  - Collapsed by default, tap header to expand
 *  - Ephemeral: server deletes all messages when debate ends (S277 trigger)
 *
 * No Realtime subscription — polling is cheap enough for a side panel and
 * avoids adding another channel to the already-busy feed room.
 */

import { safeRpc, getCurrentProfile } from '../auth.ts';
import { get_spectator_chat, send_spectator_chat } from '../contracts/rpc-schemas.ts';
import { escapeHTML } from '../config.ts';

// ── Module state ──────────────────────────────────────────────────────────────
let pollInterval: ReturnType<typeof setInterval> | null = null;
let errorHideTimer: ReturnType<typeof setTimeout> | null = null;
let lastMessageTime: string | null = null;
let chatOpen = false;
let activeDebateId: string | null = null;

// ── Types ─────────────────────────────────────────────────────────────────────
interface SpecChatMessage {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  message: string;
  created_at: string;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialise the spectator chat panel inside the live feed room.
 * Creates the DOM panel, loads existing messages, and starts polling.
 * Call only from the spectator branch of enterFeedRoom.
 */
export function initSpecChat(debateId: string): void {
  activeDebateId = debateId;
  chatOpen = false;

  const panel = document.getElementById('feed-spec-chat-panel');
  if (!panel) return;

  const profile = getCurrentProfile();
  const isLoggedIn = !!profile;

  panel.innerHTML = `
    <div class="spec-chat-wrap" id="spec-chat-wrap">
      <div class="spec-chat-hdr" id="spec-chat-hdr">
        <span class="spec-chat-hdr-label">💬 SPECTATOR CHAT</span>
        <span class="spec-chat-hdr-toggle" id="spec-chat-toggle">▼</span>
      </div>
      <div class="spec-chat-body" id="spec-chat-body" style="display:none;">
        <div class="spec-chat-msgs" id="spec-chat-msgs">
          <div class="spec-chat-empty">Be the first to react...</div>
        </div>
        ${isLoggedIn ? `
        <div class="spec-chat-input-row">
          <input
            type="text"
            id="spec-chat-input"
            class="spec-chat-input"
            placeholder="Say something..."
            maxlength="280"
            autocomplete="off"
          >
          <button class="spec-chat-send-btn" id="spec-chat-send">→</button>
        </div>` : `
        <div class="spec-chat-login-prompt">
          <a href="/moderator-login.html" style="color:var(--mod-cyan);font-size:12px;">Log in to chat</a>
        </div>`}
        <div class="spec-chat-send-error" id="spec-chat-send-error" style="display:none;"></div>
      </div>
    </div>
  `;

  // Wire toggle
  document.getElementById('spec-chat-hdr')?.addEventListener('click', toggleSpecChat);

  // Wire send
  if (isLoggedIn) {
    document.getElementById('spec-chat-send')?.addEventListener('click', () => void handleSend());
    document.getElementById('spec-chat-input')?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    });
  }

  // Initial load
  void loadMessages();

  // Poll every 5s
  pollInterval = setInterval(() => void loadMessages(), 5000);
}

/** Stop polling and clear panel state. Call from cleanupFeedRoom. */
export function destroy(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (errorHideTimer) {
    clearTimeout(errorHideTimer);
    errorHideTimer = null;
  }
  lastMessageTime = null;
  activeDebateId = null;
  chatOpen = false;
}

// ── Internal ──────────────────────────────────────────────────────────────────

function toggleSpecChat(): void {
  chatOpen = !chatOpen;
  const body = document.getElementById('spec-chat-body');
  const toggle = document.getElementById('spec-chat-toggle');
  if (body) body.style.display = chatOpen ? 'flex' : 'none';
  if (toggle) toggle.textContent = chatOpen ? '▲' : '▼';
  if (chatOpen) scrollToBottom();
}

async function loadMessages(): Promise<void> {
  if (!activeDebateId) return;
  try {
    const { data, error } = await safeRpc('get_spectator_chat', {
      p_debate_id: activeDebateId,
      p_limit: 100,
    }, get_spectator_chat);
    if (error || !data) return;
    const msgs = (data as SpecChatMessage[]);
    if (!msgs.length) return;

    // Find the actual maximum created_at across all rows — do not trust array
    // position, since server sort order is not guaranteed and two messages can
    // share a 1-second-resolution timestamp.
    const maxTime = msgs.reduce(
      (acc, m) => (m.created_at > acc ? m.created_at : acc),
      msgs[0].created_at,
    );
    if (maxTime === lastMessageTime) return; // nothing new
    lastMessageTime = maxTime;

    // Sort ascending so display order is correct regardless of server sort.
    const sorted = [...msgs].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
    renderMessages(sorted);
  } catch {
    // non-fatal
  }
}

function renderMessages(msgs: SpecChatMessage[]): void {
  const container = document.getElementById('spec-chat-msgs');
  if (!container) return;

  if (!msgs.length) {
    container.innerHTML = '<div class="spec-chat-empty">Be the first to react...</div>';
    return;
  }

  const profile = getCurrentProfile();
  const myId = profile?.id;

  container.innerHTML = msgs.map((m) => {
    const isMine = m.user_id === myId;
    return `
      <div class="spec-chat-msg ${isMine ? 'mine' : ''}">
        <span class="spec-chat-msg-name">${escapeHTML(m.display_name)}</span>
        <span class="spec-chat-msg-text">${escapeHTML(m.message)}</span>
        <button
          class="spec-chat-report-btn"
          title="Report message"
          data-msg-id="${escapeHTML(m.id)}"
          data-msg-content="${escapeHTML(m.message)}"
        >⚑</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll<HTMLButtonElement>('.spec-chat-report-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.msgId ?? '';
      const content = btn.dataset.msgContent ?? '';
      window.location.href = `mailto:reports@themoderator.app?subject=Spectator+Chat+Report&body=Message+ID:+${encodeURIComponent(id)}%0AContent:+${encodeURIComponent(content)}`;
    });
  });

  scrollToBottom();
}

async function handleSend(): Promise<void> {
  if (!activeDebateId) return;

  const input = document.getElementById('spec-chat-input') as HTMLInputElement | null;
  const errorEl = document.getElementById('spec-chat-send-error');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const sendBtn = document.getElementById('spec-chat-send') as HTMLButtonElement | null;
  if (sendBtn) sendBtn.disabled = true;

  try {
    const { data, error } = await safeRpc('send_spectator_chat', {
      p_debate_id: activeDebateId,
      p_message: text,
    }, send_spectator_chat);

    if (error || !data || !(data as { success: boolean }).success) {
      const msg = (data as { error?: string })?.error || 'Could not send';
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
        if (errorHideTimer) clearTimeout(errorHideTimer);
        errorHideTimer = setTimeout(() => { errorHideTimer = null; errorEl.style.display = 'none'; }, 3000);
      }
    } else {
      input.value = '';
      if (errorEl) errorEl.style.display = 'none';
      // Immediate reload so the sender sees their own message
      await loadMessages();
    }
  } catch {
    // non-fatal
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
  }
}

function scrollToBottom(): void {
  const container = document.getElementById('spec-chat-msgs');
  if (container) container.scrollTop = container.scrollHeight;
}
