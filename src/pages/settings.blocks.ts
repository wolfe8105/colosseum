/**
 * THE MODERATOR — Settings: Blocked Users
 *
 * Loads and renders the blocked users list in Settings.
 * Wires UNBLOCK buttons.
 */

import { safeRpc } from '../auth.ts';
import { showToast, escapeHTML } from '../config.ts';

interface BlockedUser {
  id: string;
  username: string;
  display_name: string;
}

export async function loadBlockedUsers(): Promise<void> {
  const section = document.getElementById('blocked-users-section');
  const listEl = document.getElementById('blocked-users-list');
  if (!section || !listEl) return;

  try {
    const { data, error } = await safeRpc<BlockedUser[]>('get_blocked_users', {});
    if (error) throw error;

    const users = (data as BlockedUser[] | null) ?? [];

    if (users.length === 0) {
      listEl.innerHTML = `<div style="font-size:13px;color:var(--mod-text-muted);padding:12px 0;">No blocked users.</div>`;
      return;
    }

    listEl.innerHTML = users.map(u => {
      const name = escapeHTML((u.display_name || u.username || 'Unknown').toUpperCase());
      const handle = u.username ? `@${escapeHTML(u.username)}` : '';
      return `
        <div class="blocked-user-row" data-user-id="${escapeHTML(u.id)}" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--mod-border-subtle);">
          <div>
            <div style="font-family:var(--mod-font-ui);font-size:14px;color:var(--mod-text-heading);">${name}</div>
            ${handle ? `<div style="font-size:12px;color:var(--mod-text-muted);margin-top:2px;">${handle}</div>` : ''}
          </div>
          <button class="unblock-btn settings-btn" data-user-id="${escapeHTML(u.id)}" data-user-name="${name}" style="padding:8px 16px;font-size:12px;">UNBLOCK</button>
        </div>`;
    }).join('');

    // Wire unblock buttons
    listEl.querySelectorAll<HTMLButtonElement>('.unblock-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId!;
        const userName = btn.dataset.userName || 'user';
        btn.disabled = true;
        btn.textContent = '⏳';
        const { error: unblockErr } = await safeRpc('unblock_user', { p_blocked_id: userId });
        if (!unblockErr) {
          const row = btn.closest('.blocked-user-row');
          row?.remove();
          showToast(`${userName} unblocked`);
          if (!listEl.querySelector('.blocked-user-row')) {
            listEl.innerHTML = `<div style="font-size:13px;color:var(--mod-text-muted);padding:12px 0;">No blocked users.</div>`;
          }
        } else {
          btn.disabled = false;
          btn.textContent = 'UNBLOCK';
          showToast('Could not unblock — try again');
        }
      });
    });

  } catch {
    listEl.innerHTML = `<div style="font-size:13px;color:var(--mod-text-muted);padding:12px 0;">Could not load blocked users.</div>`;
  }
}
