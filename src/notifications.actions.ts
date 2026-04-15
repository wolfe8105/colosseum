/**
 * THE MODERATOR — Notification Actions
 * timeAgo, markRead, markAllRead.
 */

import { safeRpc, getIsPlaceholderMode, getSupabaseClient } from './auth.ts';
import { markOneRead, markAllAsRead } from './notifications.state.ts';
import { updateBadge, renderList } from './notifications.panel.ts';

export function timeAgo(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return diffMin + 'm ago';
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return diffDay + 'd ago';
    return Math.floor(diffDay / 30) + 'mo ago';
  } catch { return ''; }
}

export function markRead(id: string): void {
  if (markOneRead(id)) {
    updateBadge();
    renderList();
    if (getSupabaseClient() && !getIsPlaceholderMode()) {
      safeRpc('mark_notifications_read', { p_notification_ids: [id] })
        .then(({ error }) => { if (error) console.error('mark_notifications_read error:', error); });
    }
  }
}

export function markAllRead(): void {
  markAllAsRead();
  updateBadge();
  renderList();
  if (getSupabaseClient() && !getIsPlaceholderMode()) {
    safeRpc('mark_notifications_read', { p_notification_ids: null })
      .then(({ error }) => { if (error) console.error('mark_notifications_read (all) error:', error); });
  }
}
