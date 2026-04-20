/**
 * THE MODERATOR — DM Render
 * Session 281: Renders inbox thread list and active conversation.
 */

import { escapeHTML } from '../config.ts';
import { getCurrentUser } from '../auth.ts';
import {
  threads, activeThreadId, activeMessages,
  isLoadingThreads, isLoadingMessages,
} from './dm.state.ts';

const escHtml = escapeHTML;

export function renderInbox(): string {
  if (isLoadingThreads) return renderShimmer();
  if (threads.length === 0) {
    return `
      <div style="text-align:center;padding:60px 20px;color:var(--mod-text-muted);">
        <div style="font-size:40px;margin-bottom:12px;">💬</div>
        <div style="font-size:15px;font-weight:600;color:var(--mod-text-heading);margin-bottom:4px;">No messages yet</div>
        <div style="font-size:13px;">Debate, spectate, or tip to unlock DMs with other users.</div>
      </div>
    `;
  }

  return threads.map(t => {
    const name = escHtml(t.other_display_name || t.other_username || 'User');
    const initial = (t.other_display_name || t.other_username || '?')[0].toUpperCase();
    const preview = t.last_message ? escHtml(t.last_message.substring(0, 60)) : 'No messages';
    const ago = formatTimeAgo(new Date(t.last_at));
    const unread = t.unread_count > 0;
    return `
      <div class="dm-thread-row" data-thread-id="${escHtml(t.thread_id)}" data-other-id="${escHtml(t.other_user_id)}" data-other-name="${escHtml(t.other_display_name || t.other_username || 'User')}" style="
        display:flex;align-items:center;gap:12px;padding:14px 12px;cursor:pointer;
        border-bottom:1px solid var(--mod-border-subtle);
        background:${unread ? 'var(--mod-accent-muted)' : 'transparent'};
      ">
        <div style="
          width:44px;height:44px;border-radius:50%;background:var(--mod-bg-card);
          border:2px solid ${unread ? 'var(--mod-accent)' : 'var(--mod-border-primary)'};
          display:flex;align-items:center;justify-content:center;
          font-weight:700;color:var(--mod-text-heading);font-size:16px;flex-shrink:0;
        ">${escHtml(initial)}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-weight:${unread ? '800' : '600'};font-size:14px;color:var(--mod-text-heading);">${name}</span>
            <span style="font-size:11px;color:var(--mod-text-muted);flex-shrink:0;">${ago}</span>
          </div>
          <div style="font-size:12px;color:${unread ? 'var(--mod-text-primary)' : 'var(--mod-text-muted)'};
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;
            font-weight:${unread ? '600' : '400'};
          ">${preview}</div>
        </div>
        ${unread ? `<div style="
          width:8px;height:8px;border-radius:50%;background:var(--mod-accent);flex-shrink:0;
        "></div>` : ''}
      </div>
    `;
  }).join('');
}

export function renderThread(otherName: string): string {
  const myId = getCurrentUser()?.id;

  let messagesHtml: string;
  if (isLoadingMessages) {
    messagesHtml = `<div style="text-align:center;color:var(--mod-text-muted);padding:40px;">Loading...</div>`;
  } else if (activeMessages.length === 0) {
    messagesHtml = `<div style="text-align:center;color:var(--mod-text-muted);padding:40px;font-size:13px;">No messages yet. Say hi!</div>`;
  } else {
    // Messages come newest-first from API, reverse for display
    const ordered = [...activeMessages].reverse();
    messagesHtml = ordered.map(m => {
      const isMine = m.sender_id === myId;
      return `
        <div style="display:flex;justify-content:${isMine ? 'flex-end' : 'flex-start'};margin-bottom:6px;">
          <div style="
            max-width:75%;padding:10px 14px;border-radius:16px;
            background:${isMine ? 'var(--mod-accent)' : 'var(--mod-bg-card)'};
            color:${isMine ? '#fff' : 'var(--mod-text-primary)'};
            font-size:14px;line-height:1.4;word-break:break-word;
            border:${isMine ? 'none' : '1px solid var(--mod-border-primary)'};
          ">${escHtml(m.body)}</div>
        </div>
      `;
    }).join('');
  }

  return `
    <div style="display:flex;flex-direction:column;height:100%;">
      <div style="
        display:flex;align-items:center;gap:12px;padding:12px;
        border-bottom:1px solid var(--mod-border-subtle);flex-shrink:0;
      ">
        <button id="dm-back-btn" style="
          background:none;border:none;font-size:20px;cursor:pointer;
          color:var(--mod-text-heading);padding:4px 8px;
        ">←</button>
        <div style="font-weight:700;font-size:15px;color:var(--mod-text-heading);">${escHtml(otherName)}</div>
      </div>
      <div id="dm-messages-container" style="flex:1;overflow-y:auto;padding:12px;">
        ${messagesHtml}
      </div>
      <div style="
        display:flex;gap:8px;padding:12px;border-top:1px solid var(--mod-border-subtle);
        flex-shrink:0;padding-bottom:calc(12px + var(--safe-bottom));
      ">
        <input id="dm-input" type="text" placeholder="Type a message..." autocomplete="off" maxlength="2000" style="
          flex:1;padding:10px 14px;border-radius:var(--mod-radius-pill);
          border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);
          color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;
          outline:none;min-height:40px;
        ">
        <button id="dm-send-btn" style="
          padding:10px 16px;border-radius:var(--mod-radius-pill);border:none;
          background:var(--mod-accent);color:#fff;font-family:var(--mod-font-ui);
          font-size:14px;font-weight:700;cursor:pointer;flex-shrink:0;
        ">Send</button>
      </div>
    </div>
  `;
}

function renderShimmer(): string {
  let rows = '';
  for (let i = 0; i < 5; i++) {
    rows += `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 12px;border-bottom:1px solid var(--mod-border-subtle);">
        <div class="colo-shimmer" style="width:44px;height:44px;border-radius:50%;flex-shrink:0;"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
          <div class="colo-shimmer" style="width:${50 + i * 8}%;height:14px;border-radius:4px;"></div>
          <div class="colo-shimmer" style="width:${65 + i * 3}%;height:10px;border-radius:4px;"></div>
        </div>
      </div>`;
  }
  return rows;
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
