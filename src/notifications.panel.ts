/**
 * THE MODERATOR — Notifications Panel UI
 * createPanel, renderList, open, close, updateBadge.
 */

import { escapeHTML } from './config.ts';
import { TYPES, ECONOMY_TYPES } from './notifications.types.ts';
import type { NotificationFilter } from './notifications.types.ts';
import { notifications, unreadCount, panelOpen, setPanelOpen } from './notifications.state.ts';
import { markRead, markAllRead, timeAgo } from './notifications.actions.ts';

export function updateBadge(): void {
  const dot = document.getElementById('notif-dot');
  if (dot) dot.style.display = unreadCount > 0 ? 'block' : 'none';
}

export function renderList(filter: NotificationFilter = 'all'): void {
  const list = document.getElementById('notif-list');
  if (!list) return;

  let filtered = notifications;
  if (filter === 'economy') filtered = notifications.filter(n => ECONOMY_TYPES.has(n.type));
  else if (filter !== 'all') filtered = notifications.filter(n => n.type === filter);

  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:40px 16px;color:var(--mod-text-sub);"><div style="font-size:32px;margin-bottom:8px;">🔕</div><div style="font-size:14px;">No notifications yet</div></div>`;
    return;
  }

  list.innerHTML = filtered.map(n => {
    const typeInfo = TYPES[n.type] ?? TYPES.system;
    const unreadDot = !n.read ? '<div style="width:8px;height:8px;background:var(--mod-magenta);border-radius:50%;flex-shrink:0;"></div>' : '';
    const displayTime = n.created_at ? timeAgo(n.created_at) : (n.time ?? '');
    return `
      <div class="notif-item" data-id="${escapeHTML(n.id)}" style="display:flex;gap:12px;align-items:flex-start;padding:12px 16px;cursor:pointer;background:${n.read ? 'transparent' : 'rgba(204,41,54,0.04)'};border-bottom:1px solid var(--mod-border-subtle);">
        <div style="font-size:20px;flex-shrink:0;margin-top:2px;">${typeInfo.icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:13px;color:var(--mod-text-heading);margin-bottom:2px;">${escapeHTML(n.title)}</div>
          <div style="font-size:12px;color:var(--mod-text-sub);line-height:1.4;">${escapeHTML(n.body)}</div>
          <div style="font-size:11px;color:var(--mod-text-sub);margin-top:4px;">${escapeHTML(displayTime)}</div>
        </div>
        ${unreadDot}
      </div>`;
  }).join('');
}

export function createPanel(): void {
  if (document.getElementById('notif-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'notif-panel';
  panel.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9000;display:none;flex-direction:column;';
  panel.innerHTML = `
    <div id="notif-backdrop" style="position:absolute;inset:0;background:var(--mod-bg-overlay);"></div>
    <div id="notif-drawer" style="position:relative;z-index:1;background:var(--mod-bg-card);border-bottom-left-radius:16px;border-bottom-right-radius:16px;max-height:70vh;display:flex;flex-direction:column;transform:translateY(-100%);transition:transform 0.3s ease;box-shadow:0 8px 32px rgba(0,0,0,0.4);padding-top:env(safe-area-inset-top,0px);">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid var(--mod-border-secondary);">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px;color:var(--mod-accent);">NOTIFICATIONS</div>
        <div style="display:flex;gap:8px;">
          <button id="notif-mark-all" style="background:none;border:1px solid var(--mod-border-primary);color:var(--mod-text-sub);font-size:11px;padding:6px 10px;border-radius:6px;cursor:pointer;">Mark all read</button>
          <button id="notif-close" style="background:none;border:none;color:var(--mod-text-sub);font-size:20px;cursor:pointer;padding:4px 8px;">✕</button>
        </div>
      </div>
      <div id="notif-filters" style="display:flex;gap:6px;padding:8px 16px;overflow-x:auto;flex-shrink:0;">
        <button class="notif-filter active" data-filter="all" style="background:var(--mod-accent-muted);color:var(--mod-accent);border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">All</button>
        <button class="notif-filter" data-filter="challenge" style="background:var(--mod-bg-subtle);color:var(--mod-text-sub);border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">⚔️ Challenges</button>
        <button class="notif-filter" data-filter="result" style="background:var(--mod-bg-subtle);color:var(--mod-text-sub);border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">🏆 Results</button>
        <button class="notif-filter" data-filter="reaction" style="background:var(--mod-bg-subtle);color:var(--mod-text-sub);border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">🔥 Reactions</button>
        <button class="notif-filter" data-filter="mod_invite" style="background:var(--mod-bg-subtle);color:var(--mod-text-sub);border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">⚖️ Mod Invites</button>
        <button class="notif-filter" data-filter="economy" style="background:var(--mod-bg-subtle);color:var(--mod-text-sub);border:none;padding:6px 12px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">🪙 Economy</button>
      </div>
      <div id="notif-list" style="overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1;padding:8px 0;"></div>
    </div>`;

  document.body.appendChild(panel);

  document.getElementById('notif-backdrop')?.addEventListener('click', close_panel);
  document.getElementById('notif-close')?.addEventListener('click', close_panel);
  document.getElementById('notif-mark-all')?.addEventListener('click', markAllRead);
  document.querySelectorAll('.notif-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.notif-filter').forEach(b => {
        b.classList.remove('active');
        (b as HTMLElement).style.background = 'var(--mod-bg-subtle)';
        (b as HTMLElement).style.color = 'var(--mod-text-sub)';
      });
      btn.classList.add('active');
      (btn as HTMLElement).style.background = 'var(--mod-accent-muted)';
      (btn as HTMLElement).style.color = 'var(--mod-accent)';
      renderList((btn as HTMLElement).dataset['filter'] as NotificationFilter ?? 'all');
    });
  });
  document.getElementById('notif-list')?.addEventListener('click', (e: Event) => {
    const item = (e.target as HTMLElement).closest('.notif-item') as HTMLElement | null;
    if (item) markRead(item.dataset['id'] ?? '');
  });
}

export function open_panel(): void {
  const panel = document.getElementById('notif-panel');
  const drawer = document.getElementById('notif-drawer');
  if (!panel) return;
  renderList();
  panel.style.display = 'flex';
  requestAnimationFrame(() => { if (drawer) drawer.style.transform = 'translateY(0)'; });
  setPanelOpen(true);
}

export function close_panel(): void {
  const panel = document.getElementById('notif-panel');
  const drawer = document.getElementById('notif-drawer');
  if (!panel) return;
  if (drawer) drawer.style.transform = 'translateY(-100%)';
  setTimeout(() => { panel.style.display = 'none'; }, 300);
  setPanelOpen(false);
}
