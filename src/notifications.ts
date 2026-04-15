/**
 * THE MODERATOR — Notifications Module
 *
 * Refactored: types, state, panel, actions sub-modules.
 */

import { safeRpc, getCurrentUser, getIsPlaceholderMode, getSupabaseClient, ready } from './auth.ts';
import { FEATURES } from './config.ts';
import {
  notifications, unreadCount, pollInterval, panelOpen,
  setNotifications, setPollInterval, computeUnreadCount, getPlaceholderNotifs,
} from './notifications.state.ts';
import { createPanel, open_panel, close_panel, updateBadge, renderList } from './notifications.panel.ts';
import type { Notification } from './notifications.types.ts';

export type { NotificationType, Notification, NotificationFilter } from './notifications.types.ts';
export { TYPES, ECONOMY_TYPES } from './notifications.types.ts';
export { timeAgo } from './notifications.actions.ts';
export { open_panel as open, close_panel as close };
export { markRead, markAllRead } from './notifications.actions.ts';

async function fetchNotifications(): Promise<void> {
  const client = getSupabaseClient();
  const user = getCurrentUser();
  if (!client || getIsPlaceholderMode() || !user) return;
  try {
    const { data, error } = await client
      .from('notifications').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    setNotifications((data as Notification[] | null) ?? []);
    computeUnreadCount();
    updateBadge();
    if (panelOpen) renderList();
  } catch (e) { console.error('Notifications fetch error:', e); }
}

function startPolling(): void {
  if (pollInterval) clearInterval(pollInterval);
  setPollInterval(setInterval(fetchNotifications, 30_000));
  void fetchNotifications();
}

export function destroy(): void {
  if (pollInterval) { clearInterval(pollInterval); setPollInterval(null); }
  setNotifications([]); computeUnreadCount(); updateBadge();
}

export function init(): void {
  if (!FEATURES.notifications) return;
  createPanel();
  const btn = document.getElementById('notif-btn');
  if (btn) btn.addEventListener('click', () => { if (panelOpen) close_panel(); else open_panel(); });

  if (getIsPlaceholderMode()) {
    setNotifications(getPlaceholderNotifs());
    computeUnreadCount();
    updateBadge();
  } else {
    startPolling();
  }
}

const notificationsModule = { init, open: open_panel, close: close_panel, markRead: (id: string) => { import('./notifications.actions.ts').then(m => m.markRead(id)); }, markAllRead: () => { import('./notifications.actions.ts').then(m => m.markAllRead()); }, destroy } as const;
export default notificationsModule;
(window as any).ColosseumNotifications = notificationsModule;

ready.then(() => init()).catch(() => init());
