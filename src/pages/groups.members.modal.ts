/**
 * groups.members.modal.ts — Member Actions Modal
 *
 * Handles the MANAGE modal: open, close, promote, kick, ban.
 * DOM construction is in groups.members.modal.html.ts.
 * Extracted from groups.members.ts (Session 254 track).
 *
 * LANDMINE [LM-GROUPS-002] — _executePromote calls openGroup (orchestrator)
 * When a leader transfers leadership (newRole === 'leader'), the original code
 * called openGroup() directly. Since openGroup lives in the orchestrator,
 * this would create a members → orchestrator circular dep.
 * Fixed via setGroupOpenCallback() — orchestrator registers openGroup on init.
 *
 * LANDMINE [LM-GROUPS-003] — _executeKick/_executeBan/_executePromote call loadGroupMembers
 * via a registered callback to avoid groups.members ↔ groups.members.modal circular dep.
 * Callback registered by groups.ts orchestrator on init via setRefreshMembersCallback().
 */

import { _injectMemberActionsModal } from './groups.members.modal.html.ts';
import { currentGroupId, callerRole } from './groups.state.ts';
import { escapeHTML, showToast } from '../config.ts';
import { safeRpc } from '../auth.ts';
import { assignableRoles, roleLabel } from './groups.utils.ts';
import type { GroupMember } from './groups.types.ts';

// The member currently being managed
let _mamMember: GroupMember | null = null;

// Callback to open a group (registered by orchestrator to avoid circular dep)
let _openGroupCb: ((groupId: string) => void) | null = null;

export function setGroupOpenCallback(fn: (id: string) => void): void {
  _openGroupCb = fn;
}

// Callback to refresh members list after action (avoids modal ↔ members circular dep)
let _refreshMembers: ((id: string) => Promise<void>) | null = null;

export function setRefreshMembersCallback(fn: (id: string) => Promise<void>): void {
  _refreshMembers = fn;
}

// ── OPEN / CLOSE ──────────────────────────────────────────────────────────────

// Guard so button event listeners are only wired once
let _eventsWired = false;

export function openMemberActionsModal(member: GroupMember): void {
  _mamMember = member;

  // Build DOM on first call (safe — _injectMemberActionsModal has its own guard)
  _injectMemberActionsModal();

  // Wire button events once, after DOM exists
  if (!_eventsWired) {
    const modal = document.getElementById('member-actions-modal')!;
    document.getElementById('mam-cancel-btn')!.addEventListener('click', closeMemberActionsModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeMemberActionsModal(); });
    document.getElementById('mam-promote-btn')!.addEventListener('click', _executePromote);
    document.getElementById('mam-kick-btn')!.addEventListener('click', _executeKick);
    document.getElementById('mam-ban-btn')!.addEventListener('click', _executeBan);
    _eventsWired = true;
  }

  const esc = escapeHTML;

  document.getElementById('mam-name')!.textContent       = member.display_name || member.username || 'Member';
  document.getElementById('mam-role-label')!.textContent = 'Current role: ' + roleLabel(member.role);
  document.getElementById('mam-avatar')!.textContent     = '⚔️';
  document.getElementById('mam-error')!.style.display    = 'none';
  (document.getElementById('mam-ban-reason') as HTMLTextAreaElement).value = '';

  // Promote dropdown — hidden for elder (can only kick/ban members)
  const promoteSection = document.getElementById('mam-promote-section')!;
  const roles = assignableRoles(callerRole);
  if (roles.length > 0 && callerRole !== 'elder') {
    const sel = document.getElementById('mam-promote-select') as HTMLSelectElement;
    const opts = roles.filter(r => r !== member.role);
    sel.innerHTML = (opts.length > 0 ? opts : roles)
      .map(r => `<option value="${esc(r)}">${roleLabel(r)}${r === 'leader' ? ' (transfer leadership)' : ''}</option>`)
      .join('');
    promoteSection.style.display = 'block';
  } else {
    promoteSection.style.display = 'none';
  }

  document.getElementById('member-actions-modal')!.style.display = 'flex';
}

export function closeMemberActionsModal(): void {
  document.getElementById('member-actions-modal')!.style.display = 'none';
  _mamMember = null;
}

// ── PRIVATE HELPERS ───────────────────────────────────────────────────────────

function _setMamError(msg: string): void {
  const el = document.getElementById('mam-error')!;
  el.textContent   = msg;
  el.style.display = 'block';
}

function _setBtnLoading(btnId: string, loading: boolean, label: string): void {
  const btn = document.getElementById(btnId) as HTMLButtonElement;
  btn.disabled    = loading;
  btn.textContent = loading ? '…' : label;
}

async function _executePromote(): Promise<void> {
  if (!_mamMember || !currentGroupId) return;
  const sel     = document.getElementById('mam-promote-select') as HTMLSelectElement;
  const newRole = sel.value;
  if (!newRole) return;
  document.getElementById('mam-error')!.style.display = 'none';
  _setBtnLoading('mam-promote-btn', true, 'SET ROLE');
  try {
    const { data, error } = await safeRpc('promote_group_member', {
      p_group_id: currentGroupId,
      p_user_id:  _mamMember.user_id,
      p_new_role: newRole,
    });
    if (error) { _setMamError((error as { message?: string }).message || 'Promote failed'); return; }
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (result?.error) { _setMamError(result.error); return; }
    closeMemberActionsModal();
    showToast(`✅ Role updated to ${roleLabel(newRole)}`, 'success');
    // If caller transferred their leadership, reload entire group detail to refresh callerRole
    if (newRole === 'leader') {
      if (_openGroupCb) _openGroupCb(currentGroupId);
    } else {
      void _refreshMembers?.(currentGroupId);
    }
  } catch {
    _setMamError('Something went wrong');
  } finally {
    _setBtnLoading('mam-promote-btn', false, 'SET ROLE');
  }
}

async function _executeKick(): Promise<void> {
  if (!_mamMember || !currentGroupId) return;
  const name = _mamMember.display_name || _mamMember.username || 'this member';
  if (!confirm(`Kick ${name} from the group?`)) return;
  document.getElementById('mam-error')!.style.display = 'none';
  _setBtnLoading('mam-kick-btn', true, '⚡ KICK MEMBER');
  try {
    const { data, error } = await safeRpc('kick_group_member', {
      p_group_id: currentGroupId,
      p_user_id:  _mamMember.user_id,
    });
    if (error) { _setMamError((error as { message?: string }).message || 'Kick failed'); return; }
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (result?.error) { _setMamError(result.error); return; }
    closeMemberActionsModal();
    showToast(`⚡ ${name} kicked`, 'success');
    void _refreshMembers?.(currentGroupId);
  } catch {
    _setMamError('Something went wrong');
  } finally {
    _setBtnLoading('mam-kick-btn', false, '⚡ KICK MEMBER');
  }
}

async function _executeBan(): Promise<void> {
  if (!_mamMember || !currentGroupId) return;
  const reason = (document.getElementById('mam-ban-reason') as HTMLTextAreaElement).value.trim() || null;
  const name   = _mamMember.display_name || _mamMember.username || 'this member';
  document.getElementById('mam-error')!.style.display = 'none';
  _setBtnLoading('mam-ban-btn', true, '🚫 BAN MEMBER');
  try {
    const { data, error } = await safeRpc('ban_group_member', {
      p_group_id: currentGroupId,
      p_user_id:  _mamMember.user_id,
      p_reason:   reason,
    });
    if (error) { _setMamError((error as { message?: string }).message || 'Ban failed'); return; }
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (result?.error) { _setMamError(result.error); return; }
    closeMemberActionsModal();
    showToast(`🚫 ${name} banned`, 'success');
    void _refreshMembers?.(currentGroupId);
  } catch {
    _setMamError('Something went wrong');
  } finally {
    _setBtnLoading('mam-ban-btn', false, '🚫 BAN MEMBER');
  }
}
