/**
 * groups.members.modal.ts — Member Actions Modal
 *
 * Handles the MANAGE modal: inject, open, close, promote, kick, ban.
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

// ── MODAL INJECTION ───────────────────────────────────────────────────────────

export function _injectMemberActionsModal(): void {
  if (document.getElementById('member-actions-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'member-actions-modal';
  modal.style.cssText = [
    'display:none',
    'position:fixed',
    'inset:0',
    'z-index:1000',
    'background:rgba(0,0,0,0.75)',
    'backdrop-filter:blur(4px)',
    'align-items:center',
    'justify-content:center',
  ].join(';');

  modal.innerHTML = `
    <div style="
      background:rgba(13,22,40,0.98);
      border:1px solid var(--mod-accent-border);
      border-radius:14px;
      padding:24px;
      width:min(360px,90vw);
      font-family:var(--mod-font-ui);
    ">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <div id="mam-avatar" style="font-size:28px;">⚔️</div>
        <div>
          <div id="mam-name" style="color:var(--mod-text-heading);font-size:17px;font-weight:700;line-height:1.2;"></div>
          <div id="mam-role-label" style="color:var(--mod-text-sub);font-size:13px;margin-top:2px;"></div>
        </div>
      </div>

      <div id="mam-promote-section" style="margin-bottom:16px;">
        <div style="color:var(--mod-text-sub);font-size:11px;letter-spacing:1px;margin-bottom:8px;">CHANGE ROLE</div>
        <div style="display:flex;gap:8px;">
          <select id="mam-promote-select" style="
            flex:1;
            background:var(--mod-bg-subtle);
            border:1px solid var(--mod-border-primary);
            border-radius:8px;
            color:var(--mod-text-heading);
            font-family:var(--mod-font-ui);
            font-size:14px;
            padding:8px 10px;
            cursor:pointer;
          "></select>
          <button id="mam-promote-btn" style="
            background:var(--mod-accent-muted);
            color:var(--mod-accent);
            border:1px solid var(--mod-accent-border);
            border-radius:8px;
            padding:8px 16px;
            font-family:var(--mod-font-ui);
            font-size:14px;
            letter-spacing:1px;
            cursor:pointer;
            white-space:nowrap;
          ">SET ROLE</button>
        </div>
      </div>

      <div style="border-top:1px solid var(--mod-border-secondary);margin:16px 0;"></div>

      <div id="mam-kick-section" style="margin-bottom:12px;">
        <button id="mam-kick-btn" style="
          width:100%;
          background:rgba(255,165,0,0.1);
          color:#ffa500; /* TODO: needs CSS var token */
          border:1px solid rgba(255,165,0,0.3);
          border-radius:8px;
          padding:10px;
          font-family:var(--mod-font-ui);
          font-size:15px;
          letter-spacing:1px;
          cursor:pointer;
        ">⚡ KICK MEMBER</button>
      </div>

      <div id="mam-ban-section" style="margin-bottom:20px;">
        <div style="color:var(--mod-text-sub);font-size:11px;letter-spacing:1px;margin-bottom:6px;">BAN REASON (optional)</div>
        <textarea id="mam-ban-reason" maxlength="280" placeholder="Reason for ban…" style="
          width:100%;
          min-height:56px;
          resize:vertical;
          background:var(--mod-bg-subtle);
          border:1px solid var(--mod-border-primary);
          border-radius:8px;
          color:var(--mod-text-heading);
          font-family:var(--mod-font-ui);
          font-size:13px;
          padding:8px 10px;
          line-height:1.4;
          margin-bottom:8px;
          box-sizing:border-box;
        "></textarea>
        <button id="mam-ban-btn" style="
          width:100%;
          background:var(--mod-accent-muted);
          color:var(--mod-magenta);
          border:1px solid var(--mod-accent-border);
          border-radius:8px;
          padding:10px;
          font-family:var(--mod-font-ui);
          font-size:15px;
          letter-spacing:1px;
          cursor:pointer;
        ">🚫 BAN MEMBER</button>
      </div>

      <div id="mam-error" style="display:none;color:var(--mod-magenta);font-size:13px;margin-bottom:12px;"></div>

      <button id="mam-cancel-btn" style="
        width:100%;
        background:var(--mod-bg-subtle);
        color:var(--mod-text-sub);
        border:1px solid var(--mod-border-primary);
        border-radius:8px;
        padding:10px;
        font-family:var(--mod-font-ui);
        font-size:14px;
        letter-spacing:1px;
        cursor:pointer;
      ">CANCEL</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Wire all modal button events once here — no window exposure needed
  document.getElementById('mam-cancel-btn')!.addEventListener('click', closeMemberActionsModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeMemberActionsModal(); });
  document.getElementById('mam-promote-btn')!.addEventListener('click', _executePromote);
  document.getElementById('mam-kick-btn')!.addEventListener('click', _executeKick);
  document.getElementById('mam-ban-btn')!.addEventListener('click', _executeBan);
}

// ── OPEN / CLOSE ──────────────────────────────────────────────────────────────

export function openMemberActionsModal(member: GroupMember): void {
  _mamMember = member;
  const esc  = escapeHTML;

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
