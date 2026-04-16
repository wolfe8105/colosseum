/**
 * THE MODERATOR — Groups: utility / render helpers
 *
 * Part of groups decomposition (7 files):
 *   groups.types.ts, groups.state.ts, groups.utils.ts,
 *   groups.feed.ts, groups.members.ts, groups.challenges.ts, groups.ts
 */

/**
 * LANDMINE [LM-GROUPS-001] — renderGroupList callback pattern
 * Original groups.ts had renderGroupList wire click listeners that called openGroup()
 * directly, creating a utils → orchestrator circular dependency.
 * Fixed by passing onGroupClick as a callback parameter.
 * All callers (loadDiscover, loadMyGroups, loadLeaderboard) pass openGroup as the callback.
 * Add to THE-MODERATOR-LAND-MINE-MAP.md when session allows.
 */

import type { GroupListItem } from './groups.types.ts';
import { escapeHTML } from '../config.ts';
import { CATEGORY_LABELS } from './groups.state.ts';

// ── ROLE HELPERS ──────────────────────────────────────────────────────────────
// Mirrors group_role_rank() SQL function. Lower number = higher authority.
export function clientRoleRank(role: string | null): number {
  switch (role) {
    case 'leader':    return 1;
    case 'co_leader': return 2;
    case 'elder':     return 3;
    case 'member':    return 4;
    default:          return 99; // non-member
  }
}

// Roles a caller can assign via promote_group_member.
// Server enforces the full matrix — this just drives the dropdown UI.
export function assignableRoles(role: string): string[] {
  switch (role) {
    case 'leader':    return ['leader', 'co_leader', 'elder', 'member'];
    case 'co_leader': return ['elder', 'member'];
    default:          return [];
  }
}

export function roleLabel(role: string): string {
  switch (role) {
    case 'leader':    return 'Leader';
    case 'co_leader': return 'Co-Leader';
    case 'elder':     return 'Elder';
    case 'member':    return 'Member';
    default:          return role;
  }
}

// ── RENDER HELPERS ────────────────────────────────────────────────────────────
export function renderEmpty(icon: string, title: string, sub: string) {
  return `<div class="empty-state">
    <div class="empty-icon">${escapeHTML(icon)}</div>
    <div class="empty-title">${escapeHTML(title)}</div>
    ${sub ? `<div class="empty-sub">${escapeHTML(sub)}</div>` : ''}
  </div>`;
}

export function renderGroupList(
  containerId: string,
  groups: GroupListItem[],
  showRole = false,
  showRank = false,
  onGroupClick: (groupId: string) => void
): void {
  const el = document.getElementById(containerId);
  if (groups.length === 0) {
    el.innerHTML = renderEmpty('👥', 'No groups here yet', 'Be the first to create one');
    return;
  }
  const esc = escapeHTML;
  el.innerHTML = groups.map((g, i) => {
    const catLabel = CATEGORY_LABELS[g.category] || esc(g.category || 'General');
    const roleHtml = (showRole && g.role)
      ? `<span class="my-role-badge ${esc(g.role)}">${esc(g.role.toUpperCase())}</span>`
      : '';
    return `<div class="group-card" data-group-id="${esc(g.id)}">
      <div class="group-emoji">${esc(g.avatar_emoji || '⚔️')}</div>
      <div class="group-info">
        <div class="group-name">${esc(g.name)}</div>
        ${g.description ? `<div class="group-desc">${esc(g.description)}</div>` : ''}
        <div class="group-meta">
          <span class="meta-pill cat">${catLabel}</span>
          <span class="meta-pill members">👥 ${Number.parseInt(String(g.member_count), 10) || 0}</span>
          ${roleHtml}
        </div>
      </div>
      <div class="group-elo">
        ${showRank ? `<div class="elo-label">#${Number.parseInt(String(g.rank), 10) || (i + 1)}</div>` : ''}
        <div class="elo-num">${Number.parseInt(String(g.elo_rating), 10) || 1000}</div>
        <div class="elo-label">ELO</div>
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.group-card[data-group-id]').forEach(card => {
    card.addEventListener('click', () => {
      onGroupClick((card as HTMLElement).dataset.groupId);
    });
  });
}
