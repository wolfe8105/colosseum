/**
 * groups.members.ts — Groups: member list renderer
 *
 * loadGroupMembers — fetches and renders the members list.
 * Modal code extracted to groups.members.modal.ts (Session 254 track).
 *
 * Part of groups decomposition (7+ files):
 *   groups.types.ts, groups.state.ts, groups.utils.ts,
 *   groups.feed.ts, groups.members.ts, groups.members.modal.ts,
 *   groups.challenges.ts, groups.ts
 */

import { currentUser, currentGroupId, callerRole } from './groups.state.ts';
import { escapeHTML } from '../config.ts';
import { safeRpc } from '../auth.ts';
import { clientRoleRank, renderEmpty } from './groups.utils.ts';
import { openMemberActionsModal } from './groups.members.modal.ts';
import type { GroupMember } from './groups.types.ts';

// Re-export setGroupOpenCallback so orchestrator import in groups.ts still works
export { setGroupOpenCallback, setRefreshMembersCallback } from './groups.members.modal.ts';
export { _injectMemberActionsModal } from './groups.members.modal.html.ts';

// ── MEMBERS LIST ──────────────────────────────────────────────────────────────

export async function loadGroupMembers(groupId: string): Promise<void> {
  const esc = escapeHTML;
  try {
    const { data, error } = await safeRpc('get_group_members', { p_group_id: groupId, p_limit: 50 });
    if (error) throw error;
    const members: GroupMember[] = typeof data === 'string' ? JSON.parse(data) : data;

    if (!members || members.length === 0) {
      document.getElementById('detail-members-list')!.innerHTML = renderEmpty('👥', 'No members yet', '');
      return;
    }

    const callerRank = clientRoleRank(callerRole);

    document.getElementById('detail-members-list')!.innerHTML = members.map(m => {
      const name       = m.display_name || m.username || 'Gladiator';
      const role       = m.role || 'member';
      const targetRank = clientRoleRank(role);
      // Caller can act only if they strictly outrank the target AND are authenticated
      const canAct     = !!currentUser && callerRank < targetRank;

      const roleBadge = role !== 'member'
        ? `<span class="my-role-badge ${esc(role)}">${esc(role.toUpperCase())}</span>`
        : '';

      const actionHtml = canAct ? `
        <div class="member-actions" style="display:flex;gap:6px;margin-top:8px;">
          <button
            class="member-action-btn"
            data-action="open-modal"
            data-user-id="${esc(m.user_id)}"
            data-username="${esc(m.username || '')}"
            data-display-name="${esc(name)}"
            data-role="${esc(role)}"
            style="background:var(--mod-accent-muted);color:var(--mod-accent);
                   border:1px solid var(--mod-accent-border);border-radius:6px;
                   padding:5px 12px;font-family:var(--mod-font-ui);
                   font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;">
            MANAGE
          </button>
        </div>` : '';

      const profileAttr = m.username ? `data-username="${esc(m.username)}"` : '';

      return `<div class="member-row" ${profileAttr} style="cursor:${m.username ? 'pointer' : 'default'};">
        <div class="member-avatar">
          ${m.avatar_url ? `<img src="${esc(m.avatar_url)}" alt="">` : '⚔️'}
        </div>
        <div class="member-info" style="flex:1;min-width:0;">
          <div class="member-name">${esc(name)}</div>
          <div class="member-elo">ELO ${Number.parseInt(String(m.elo_rating), 10) || 1000} · ${Number.parseInt(String(m.wins), 10) || 0}W ${Number.parseInt(String(m.losses), 10) || 0}L</div>
          ${actionHtml}
        </div>
        <div class="member-role">${roleBadge}</div>
      </div>`;
    }).join('');

    // Single delegated listener: button click opens modal, row click navigates to profile
    document.getElementById('detail-members-list')!.addEventListener('click', (e) => {
      const actionBtn = (e.target as HTMLElement).closest('[data-action="open-modal"]') as HTMLElement | null;
      if (actionBtn) {
        e.stopPropagation();
        openMemberActionsModal({
          user_id:      actionBtn.dataset.userId,
          username:     actionBtn.dataset.username,
          display_name: actionBtn.dataset.displayName,
          role:         actionBtn.dataset.role,
        } as GroupMember);
        return;
      }
      const row = (e.target as HTMLElement).closest('[data-username]') as HTMLElement | null;
      if (row?.dataset.username) {
        window.location.href = '/u/' + encodeURIComponent(row.dataset.username);
      }
    });

  } catch {
    document.getElementById('detail-members-list')!.innerHTML = renderEmpty('⚠️', 'Could not load members', '');
  }
}
