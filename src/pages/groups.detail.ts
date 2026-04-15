/**
 * THE MODERATOR — Groups Detail View
 * openGroup, updateJoinBtn, toggleMembership.
 */

import { safeRpc } from '../auth.ts';
import { renderGroupBanner } from './group-banner.ts';
import { loadGroupHotTakes } from './groups.feed.ts';
import { loadGroupMembers } from './groups.members.ts';
import { loadGroupChallenges } from './groups.challenges.ts';
import { loadPendingAuditions } from './groups.auditions.ts';
import {
  currentUser, currentGroupId, isMember, callerRole,
  setCurrentGroupId, setIsMember, setCallerRole,
} from './groups.state.ts';
import { switchDetailTab } from './groups.nav.ts';
import type { GroupDetail } from './groups.types.ts';

export let currentGroupData: GroupDetail | null = null;

export async function openGroup(groupId: string): Promise<void> {
  setCurrentGroupId(groupId);
  (document.getElementById('view-lobby') as HTMLElement).style.display  = 'none';
  (document.getElementById('view-detail') as HTMLElement).style.display = 'flex';

  (document.getElementById('detail-name') as HTMLElement).textContent    = 'Loading…';
  (document.getElementById('detail-emoji') as HTMLElement).textContent   = '⚔️';
  (document.getElementById('detail-desc') as HTMLElement).textContent    = '';
  (document.getElementById('detail-members') as HTMLElement).textContent = '—';
  (document.getElementById('detail-elo') as HTMLElement).textContent     = '—';
  (document.getElementById('detail-hot-takes') as HTMLElement).innerHTML     = '<div class="loading-state">Loading hot takes…</div>';
  (document.getElementById('detail-challenges') as HTMLElement).innerHTML    = '<div class="loading-state">Loading challenges…</div>';
  (document.getElementById('detail-members-list') as HTMLElement).innerHTML  = '<div class="loading-state">Loading members…</div>';
  (document.getElementById('gvg-challenge-btn') as HTMLElement).style.display = 'none';
  switchDetailTab('hot-takes');

  try {
    const { data, error } = await safeRpc('get_group_details', { p_group_id: groupId });
    if (error) throw error;
    const g = typeof data === 'string' ? JSON.parse(data) : data;

    (document.getElementById('detail-top-name') as HTMLElement).textContent = g.name.toUpperCase();
    (document.getElementById('detail-emoji') as HTMLElement).textContent    = g.avatar_emoji || '⚔️';
    (document.getElementById('detail-name') as HTMLElement).textContent     = g.name;
    (document.getElementById('detail-desc') as HTMLElement).textContent     = g.description || '';
    (document.getElementById('detail-members') as HTMLElement).textContent  = g.member_count;
    (document.getElementById('detail-elo') as HTMLElement).textContent      = g.elo_rating;

    const bannerEl = document.getElementById('detail-banner');
    if (bannerEl) renderGroupBanner(bannerEl, g as GroupDetail, g.my_role === 'leader' || g.my_role === 'co_leader');

    const fateEl = document.getElementById('detail-fate');
    if (fateEl) {
      const pct = (g as GroupDetail).shared_fate_pct ?? 0;
      fateEl.textContent = pct > 0 ? `+${pct}%` : '—';
      fateEl.style.color = pct > 0 ? 'var(--mod-accent)' : '';
    }

    setIsMember(g.is_member);
    setCallerRole(g.my_role ?? null);
    currentGroupData = g as GroupDetail;

    updateJoinBtn(g as GroupDetail);
    (document.getElementById('gvg-challenge-btn') as HTMLElement).style.display = g.is_member ? 'block' : 'none';

    const gearBtn = document.getElementById('detail-gear-btn');
    if (gearBtn) gearBtn.style.display = g.my_role === 'leader' ? 'flex' : 'none';

    const audTab = document.getElementById('detail-auditions-tab');
    if (audTab) audTab.style.display = (g as GroupDetail).join_mode === 'audition' ? 'inline-block' : 'none';
  } catch {
    (document.getElementById('detail-name') as HTMLElement).textContent = 'Error loading group';
  }

  loadGroupHotTakes(groupId);
  loadGroupChallenges(groupId);
  loadGroupMembers(groupId);
}

export function updateJoinBtn(g: GroupDetail): void {
  const btn = document.getElementById('join-btn') as HTMLButtonElement;
  if (!currentUser) {
    btn.textContent = 'SIGN IN TO JOIN'; btn.className = 'join-btn join';
    btn.style.display = 'block'; btn.disabled = false; return;
  }
  if (g.is_member) {
    btn.textContent   = g.my_role === 'leader' ? 'YOU OWN THIS GROUP' : 'LEAVE GROUP';
    btn.className     = 'join-btn leave';
    btn.disabled      = g.my_role === 'leader';
    btn.style.display = 'block'; return;
  }
  const mode = g.join_mode ?? 'open';
  if (mode === 'invite_only') { btn.style.display = 'none'; return; }
  btn.style.display = 'block'; btn.disabled = false; btn.className = 'join-btn join';
  btn.textContent   = mode === 'audition' ? 'REQUEST AUDITION' : 'JOIN GROUP';
}

export async function toggleMembership(): Promise<void> {
  if (!currentUser) {
    window.location.href = 'moderator-plinko.html?returnTo=' + encodeURIComponent(window.location.pathname + '?group=' + currentGroupId);
    return;
  }
  const btn = document.getElementById('join-btn') as HTMLButtonElement;
  btn.disabled = true;
  try {
    if (isMember) {
      const { error } = await safeRpc('leave_group', { p_group_id: currentGroupId });
      if (error) throw error;
      setIsMember(false); setCallerRole(null);
      btn.textContent = 'JOIN GROUP'; btn.className = 'join-btn join';
      (document.getElementById('gvg-challenge-btn') as HTMLElement).style.display = 'none';
      const mc = document.getElementById('detail-members')!;
      mc.textContent = String(parseInt(mc.textContent!) - 1);
    } else {
      const { error } = await safeRpc('join_group', { p_group_id: currentGroupId });
      if (error) throw error;
      setIsMember(true); setCallerRole('member');
      btn.textContent = 'LEAVE GROUP'; btn.className = 'join-btn leave';
      (document.getElementById('gvg-challenge-btn') as HTMLElement).style.display = 'block';
      const mc = document.getElementById('detail-members')!;
      mc.textContent = String(parseInt(mc.textContent!) + 1);
    }
    loadGroupMembers(currentGroupId!);
  } catch (e) {
    alert((e as Error).message || 'Something went wrong');
  } finally {
    btn.disabled = false;
  }
}
