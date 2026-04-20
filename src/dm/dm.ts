/**
 * THE MODERATOR — DM Module
 * Session 281: Main entry point for Direct Messages.
 * Renders inbox screen, handles thread navigation, message sending, realtime.
 */

import { ready, getCurrentUser, getSupabaseClient } from '../auth.ts';
import { showToast } from '../config.ts';
import { fetchThreads, fetchMessages, sendMessage, fetchUnreadCount } from './dm.fetch.ts';
import { renderInbox, renderThread } from './dm.render.ts';
import {
  threads, activeThreadId, activeMessages,
  setActiveThreadId, setActiveMessages,
} from './dm.state.ts';
import type { DMMessage } from './dm.types.ts';

let realtimeChannel: unknown = null;

export async function renderDMScreen(): Promise<void> {
  const container = document.getElementById('screen-dm');
  if (!container) return;

  if (activeThreadId) {
    // Find the thread to get the other user's name
    const thread = threads.find(t => t.thread_id === activeThreadId);
    const otherName = thread?.other_display_name || thread?.other_username || 'User';
    container.innerHTML = renderThread(otherName);
    wireThreadEvents(container);
    scrollToBottom();
  } else {
    container.innerHTML = `
      <div style="text-align:center;padding:16px 0 12px;">
        <div style="font-family:var(--mod-font-display);font-size:24px;letter-spacing:3px;color:var(--mod-accent);font-weight:700;">💬 MESSAGES</div>
        <div style="color:var(--mod-text-sub);font-size:13px;">Your conversations.</div>
      </div>
      <div id="dm-inbox-list">
        ${renderInbox()}
      </div>
    `;
    wireInboxEvents(container);
  }
}

function wireInboxEvents(container: HTMLElement): void {
  container.querySelectorAll('.dm-thread-row').forEach(row => {
    row.addEventListener('click', async () => {
      const threadId = (row as HTMLElement).dataset.threadId;
      if (!threadId) return;
      setActiveThreadId(threadId);
      await fetchMessages(threadId);
      await renderDMScreen();
      subscribeToThread(threadId);
    });
  });
}

function wireThreadEvents(container: HTMLElement): void {
  // Back button
  document.getElementById('dm-back-btn')?.addEventListener('click', async () => {
    unsubscribeFromThread();
    setActiveThreadId(null);
    setActiveMessages([]);
    await fetchThreads(); // Refresh inbox
    await renderDMScreen();
  });

  // Send button
  const sendBtn = document.getElementById('dm-send-btn');
  const input = document.getElementById('dm-input') as HTMLInputElement | null;

  const doSend = async () => {
    if (!input || !activeThreadId) return;
    const body = input.value.trim();
    if (!body) return;

    const thread = threads.find(t => t.thread_id === activeThreadId);
    if (!thread) return;

    input.value = '';
    input.disabled = true;

    const result = await sendMessage(thread.other_user_id, body);
    input.disabled = false;

    if (result.error) {
      showToast(
        result.error === 'not_eligible' ? 'You need to interact with this user first (debate, spectate, or tip).'
        : result.error === 'blocked' ? 'This conversation is no longer available.'
        : 'Message failed to send. Try again.',
        'error'
      );
      input.value = body; // Restore on failure
      return;
    }

    // Add message optimistically
    const myId = getCurrentUser()?.id;
    if (myId) {
      const newMsg: DMMessage = {
        id: result.message_id ?? crypto.randomUUID(),
        sender_id: myId,
        body,
        created_at: new Date().toISOString(),
        read_at: null,
      };
      activeMessages.unshift(newMsg); // unshift because array is newest-first
      await renderDMScreen();
      input.focus();
    }
  };

  sendBtn?.addEventListener('click', doSend);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void doSend();
    }
  });

  input?.focus();
}

function scrollToBottom(): void {
  setTimeout(() => {
    const container = document.getElementById('dm-messages-container');
    if (container) container.scrollTop = container.scrollHeight;
  }, 50);
}

// ── Realtime ──

function subscribeToThread(threadId: string): void {
  unsubscribeFromThread();
  const sb = getSupabaseClient();
  if (!sb) return;

  const myId = getCurrentUser()?.id;
  if (!myId) return;

  try {
    const channel = sb.channel(`dm:${threadId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `thread_id=eq.${threadId}` },
        (payload: { new: Record<string, unknown> }) => {
          const msg = payload.new as unknown as DMMessage;
          // Only add if it's from the other person (our own messages are added optimistically)
          if (msg.sender_id !== myId) {
            activeMessages.unshift(msg);
            void renderDMScreen();
          }
        }
      )
      .subscribe();
    realtimeChannel = channel;
  } catch (e) {
    console.error('[DM] Realtime subscribe failed:', e);
  }
}

function unsubscribeFromThread(): void {
  if (realtimeChannel) {
    const sb = getSupabaseClient();
    if (sb) {
      try { sb.removeChannel(realtimeChannel as ReturnType<typeof sb.channel>); } catch { /* noop */ }
    }
    realtimeChannel = null;
  }
}

// ── Init ──

function updateDMBadge(): void {
  const dot = document.getElementById('dm-dot');
  if (!dot) return;
  void fetchUnreadCount().then(count => {
    dot.style.display = count > 0 ? 'block' : 'none';
  });
}

export function init(): void {
  const screen = document.getElementById('screen-dm');
  if (!screen) return;

  // Update badge on load
  updateDMBadge();

  const observer = new MutationObserver(() => {
    if (screen.classList.contains('active') && screen.children.length === 0) {
      observer.disconnect();
      void fetchThreads().then(() => renderDMScreen());
    }
  });
  observer.observe(screen, { attributes: true, attributeFilter: ['class'] });
}

ready.then(() => init());

export const ModeratorDM = { renderDMScreen, fetchThreads, fetchUnreadCount } as const;
