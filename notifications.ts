/**
 * THE MODERATOR — Notifications Module (TypeScript)
 *
 * Runtime module — replaces moderator-notifications.js when Vite build is active.
 * Depends on: config.ts, auth.ts
 *
 * Migration: Session 127 (Phase 3), Session 138 (cutover — ES imports, zero globalThis reads)
 */

import { safeRpc, getCurrentUser, getIsPlaceholderMode, getSupabaseClient, ready } from './auth.ts';
import { escapeHTML } from './config.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type NotificationType =
  | 'challenge'
  | 'debate_start'
  | 'result'
  | 'rank_up'
  | 'follow'
  | 'reaction'
  | 'system'
  | 'stake_won'
  | 'stake_lost'
  | 'power_up'
  | 'tier_up';

export interface NotificationTypeInfo {
  readonly icon: string;
  readonly label: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Placeholder notifications use `time` string; real ones use `created_at` ISO timestamp */
  time?: string;
  created_at?: string;
  read: boolean;
  user_id?: string;
}

export type NotificationFilter = 'all' | 'challenge' | 'result' | 'reaction' | 'economy';

// ============================================================
// CONSTANTS
// ============================================================

export const TYPES: Readonly<Record<NotificationType, NotificationTypeInfo>> = {
  challenge: { icon: '⚔️', label: 'Challenge' },
  debate_start: { icon: '🔴', label: 'Debate Starting' },
  result: { icon: '🏆', label: 'Result' },
  rank_up: { icon: '📈', label: 'Rank Up' },
  follow: { icon: '👤', label: 'New Follower' },
  reaction: { icon: '🔥', label: 'Reaction' },
  system: { icon: '📢', label: 'System' },
  stake_won: { icon: '🪙', label: 'Stake Won' },
  stake_lost: { icon: '💸', label: 'Stake Lost' },
  power_up: { icon: '⚡', label: 'Power-Up' },
  tier_up: { icon: '🏅', label: 'Tier Up' },
} as const;

/** Economy filter matches these notification types (Session 120) */
export const ECONOMY_TYPES: ReadonlySet<NotificationType> = new Set([
  'stake_won',
  'stake_lost',
  'power_up',
  'tier_up',
]);

// ============================================================
// STATE
// ============================================================

let notifications: Notification[] = [];
let unreadCount = 0;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let panelOpen = false;

export function getUnreadCount(): number { return unreadCount; }


// ============================================================
// TIME FORMATTING
// ============================================================

export function timeAgo(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return diffMin + 'm ago';
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return diffDay + 'd ago';
    return Math.floor(diffDay / 30) + 'mo ago';
  } catch {
    return '';
  }
}

// ============================================================
// PLACEHOLDER DATA
// ============================================================

function getPlaceholderNotifs(): Notification[] {
  return [
    { id: '1', type: 'challenge', title: 'IRONMIND challenged you', body: '"LeBron is NOT the GOAT" — accept?', time: '2m ago', read: false },
    { id: '2', type: 'reaction', title: '🔥 Your hot take is on fire', body: '247 reactions on "NBA play-in is the best thing..."', time: '15m ago', read: false },
    { id: '3', type: 'result', title: 'Debate result: YOU WON', body: 'vs FACTCHECKER — ELO +18 (now 1,218)', time: '1h ago', read: false },
    { id: '4', type: 'stake_won', title: '🪙 Stake Won!', body: 'You won 45 tokens on "Is crypto dead?"', time: '3h ago', read: false },
    { id: '5', type: 'tier_up', title: '🏅 Tier Up!', body: 'You reached Spectator+! New perks unlocked.', time: '4h ago', read: false },
    { id: '6', type: 'follow', title: 'SHARPSHOOTER followed you', body: 'ELO 1,654 — 42 wins', time: '5h ago', read: true },
    { id: '7', type: 'system', title: 'Welcome to The Moderator', body: 'Post a hot take, watch a debate, or start one.', time: '1d ago', read: true },
  ];
}

// ============================================================
// PANEL UI
// ============================================================

function createPanel(): void {
  if (document.getElementById('notif-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'notif-panel';
  panel.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;z-index:9000;
    display:none;flex-direction:column;
  `;
  panel.innerHTML = `
    <div id="notif-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.5);"></div>
    <div id="notif-drawer" style="
      position:relative;z-index:1;background:#132240;
      border-bottom-left-radius:16px;border-bottom-right-radius:16px;
      max-height:70vh;display:flex;flex-direction:column;
      transform:translateY(-100%);transition:transform 0.3s ease;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);
      padding-top:env(safe-area-inset-top,0px);
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px;color:#d4a843;">NOTIFICATIONS</div>
        <div style="display:flex;gap:8px;">
          <button id="notif-mark-all" style="background:none;border:1px solid rgba(255,255,255,0.1);color:#a0a8b8;font-size:11px;padding:6px 10px;border-radius:6px;cursor:pointer;">Mark all read</button>
          <button id="notif-close" style="background:none;border:none;color:#a0a8b8;font-size:20px;cursor:pointer;padding:4px 8px;">✕</button>
        </div>
      </div>
      <div id="notif-filters" style="display:flex;gap:6px;padding:8px 16px;overflow-x:auto;flex-shrink:0;">
        <button class="notif-filter active" data-filter="all" style="background:rgba(212,168,67,0.15);color:#d4a843;border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">All</button>
        <button class="notif-filter" data-filter="challenge" style="background:rgba(255,255,255,0.05);color:#a0a8b8;border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">⚔️ Challenges</button>
        <button class="notif-filter" data-filter="result" style="background:rgba(255,255,255,0.05);color:#a0a8b8;border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">🏆 Results</button>
        <button class="notif-filter" data-filter="reaction" style="background:rgba(255,255,255,0.05);color:#a0a8b8;border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">🔥 Reactions</button>
        <button class="notif-filter" data-filter="economy" style="background:rgba(255,255,255,0.05);color:#a0a8b8;border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">🪙 Economy</button>
      </div>
      <div id="notif-list" style="overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1;padding:8px 0;"></div>
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById('notif-backdrop')?.addEventListener('click', close);
  document.getElementById('notif-close')?.addEventListener('click', close);
  document.getElementById('notif-mark-all')?.addEventListener('click', markAllRead);

  document.querySelectorAll('.notif-filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.notif-filter').forEach((b) => {
        b.classList.remove('active');
        (b as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
        (b as HTMLElement).style.color = '#a0a8b8';
      });
      btn.classList.add('active');
      (btn as HTMLElement).style.background = 'rgba(212,168,67,0.15)';
      (btn as HTMLElement).style.color = '#d4a843';
      renderList((btn as HTMLElement).dataset['filter'] as NotificationFilter ?? 'all');
    });
  });

  // Delegated click handler for notification items — wired once here,
  // not re-added on every renderList() call.
  document.getElementById('notif-list')?.addEventListener('click', (e: Event) => {
    const item = (e.target as HTMLElement).closest('.notif-item') as HTMLElement | null;
    if (item) markRead(item.dataset['id'] ?? '');
  });
}

function renderList(filter: NotificationFilter = 'all'): void {
  const list = document.getElementById('notif-list');
  if (!list) return;

  let filtered: Notification[];
  if (filter === 'all') {
    filtered = notifications;
  } else if (filter === 'economy') {
    filtered = notifications.filter((n) => ECONOMY_TYPES.has(n.type));
  } else {
    filtered = notifications.filter((n) => n.type === filter);
  }

  if (filtered.length === 0) {
    list.innerHTML = `
      <div style="text-align:center;padding:40px 16px;color:#a0a8b8;">
        <div style="font-size:32px;margin-bottom:8px;">🔕</div>
        <div style="font-size:14px;">No notifications yet</div>
      </div>`;
    return;
  }

  list.innerHTML = filtered
    .map((n) => {
      const typeInfo = TYPES[n.type] ?? TYPES.system;
      const unreadDot = !n.read
        ? '<div style="width:8px;height:8px;background:#cc2936;border-radius:50%;flex-shrink:0;"></div>'
        : '';
      const displayTime = n.created_at ? timeAgo(n.created_at) : (n.time ?? '');
      return `
      <div class="notif-item" data-id="${escapeHTML(n.id)}" style="
        display:flex;gap:12px;align-items:flex-start;padding:12px 16px;cursor:pointer;
        background:${n.read ? 'transparent' : 'rgba(204,41,54,0.04)'};
        border-bottom:1px solid rgba(255,255,255,0.03);
      ">
        <div style="font-size:20px;flex-shrink:0;margin-top:2px;">${typeInfo.icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:13px;color:#f0f0f0;margin-bottom:2px;">${escapeHTML(n.title)}</div>
          <div style="font-size:12px;color:#a0a8b8;line-height:1.4;">${escapeHTML(n.body)}</div>
          <div style="font-size:11px;color:#6a7a90;margin-top:4px;">${escapeHTML(displayTime)}</div>
        </div>
        ${unreadDot}
      </div>`;
    })
    .join('');
}

// ============================================================
// OPEN / CLOSE
// ============================================================

export function open(): void {
  const panel = document.getElementById('notif-panel');
  const drawer = document.getElementById('notif-drawer');
  if (!panel) return;

  renderList();
  panel.style.display = 'flex';
  requestAnimationFrame(() => {
    if (drawer) drawer.style.transform = 'translateY(0)';
  });
  panelOpen = true;
}

export function close(): void {
  const panel = document.getElementById('notif-panel');
  const drawer = document.getElementById('notif-drawer');
  if (!panel) return;

  if (drawer) drawer.style.transform = 'translateY(-100%)';
  setTimeout(() => {
    panel.style.display = 'none';
  }, 300);
  panelOpen = false;
}

// ============================================================
// ACTIONS
// ============================================================

export function markRead(id: string): void {
  const n = notifications.find((n) => n.id === id);
  if (n && !n.read) {
    n.read = true;
    unreadCount = Math.max(0, unreadCount - 1);
    updateBadge();
    renderList();

    if (getSupabaseClient() && !getIsPlaceholderMode()) {
      safeRpc('mark_notifications_read', {
        p_notification_ids: [id],
      }).then(({ error }) => {
        if (error) console.error('mark_notifications_read error:', error);
      });
    }
  }
}

export function markAllRead(): void {
  notifications.forEach((n) => {
    n.read = true;
  });
  unreadCount = 0;
  updateBadge();
  renderList();

  if (getSupabaseClient() && !getIsPlaceholderMode()) {
    safeRpc('mark_notifications_read', {
      p_notification_ids: null,
    }).then(({ error }) => {
      if (error) console.error('mark_notifications_read (all) error:', error);
    });
  }
}

// ============================================================
// BADGE
// ============================================================

function updateBadge(): void {
  const dot = document.getElementById('notif-dot');
  if (dot) dot.style.display = unreadCount > 0 ? 'block' : 'none';
}

// ============================================================
// POLLING
// ============================================================

function startPolling(): void {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(fetchNotifications, 30_000);
  void fetchNotifications();
}

/** BUG 3 FIX: Expose destroy() to stop polling on logout / teardown */
export function destroy(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  notifications = [];
  unreadCount = 0;
  panelOpen = false;
  updateBadge();
}

async function fetchNotifications(): Promise<void> {
  const client = getSupabaseClient();
  const user = getCurrentUser();
  if (!client || getIsPlaceholderMode() || !user) {
    return;
  }

  try {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    notifications = (data as Notification[] | null) ?? [];
    unreadCount = notifications.filter((n) => !n.read).length;
    updateBadge();
    if (panelOpen) renderList();
  } catch (e) {
    console.error('Notifications fetch error:', e);
  }
}

// ============================================================
// BELL BUTTON
// ============================================================

function bindBellButton(): void {
  const btn = document.getElementById('notif-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      if (panelOpen) close();
      else open();
    });
  }
}

// ============================================================
// INIT
// ============================================================

export function init(): void {
  createPanel();
  bindBellButton();

  if (getIsPlaceholderMode()) {
    notifications = getPlaceholderNotifs();
    unreadCount = notifications.filter((n) => !n.read).length;
    updateBadge();
  } else {
    startPolling();
  }
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

const notificationsModule = {
  init,
  open,
  close,
  markRead,
  markAllRead,
  destroy,
} as const;

export default notificationsModule;

// ============================================================

// ============================================================
// AUTO-INIT (matches .js IIFE — waits for auth ready)
// ============================================================

ready.then(() => init()).catch(() => init());
