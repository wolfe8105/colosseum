/**
 * THE MODERATOR — Groups Page Controller (TypeScript) — ORCHESTRATOR
 *
 * Decomposed into 7 files:
 *   groups.types.ts    — GroupListItem, GroupMember interfaces
 *   groups.state.ts    — module-level state variables + setters
 *   groups.utils.ts    — role helpers, renderEmpty, renderGroupList
 *   groups.feed.ts     — group hot takes feed + composer
 *   groups.members.ts  — member list + member actions modal
 *   groups.challenges.ts — GvG challenge system
 *   groups.ts          — THIS FILE: orchestrator, tab/nav, event delegation
 *
 * Extracted from moderator-groups.html inline script.
 * Groups: discover, my groups, rankings, detail view, hot takes,
 * GvG challenges (Session 116), group hot take composer (Session 105).
 *
 * Migration: Session 128 (Phase 4), Session 139 (ES imports, 3 window globals removed)
 * F-14 / F-15 client: Session 181 — role-aware member actions (promote/kick/ban modal)
 * Decomposition: Session 192 — 1,128 lines → 7 files
 */
import type { GroupListItem } from './groups.types.ts';
import {
  activeTab, activeDetailTab, activeCategory, selectedEmoji,
  currentGroupId, isMember, callerRole, currentUser,
  setSb, setCurrentUser, setActiveTab, setActiveDetailTab,
  setActiveCategory, setSelectedEmoji, setCurrentGroupId,
  setIsMember, setCallerRole,
} from './groups.state.ts';
import { renderEmpty, renderGroupList } from './groups.utils.ts';
import { loadGroupHotTakes } from './groups.feed.ts';
import {
  loadGroupMembers, _injectMemberActionsModal,
  openMemberActionsModal, closeMemberActionsModal,
  setGroupOpenCallback,
} from './groups.members.ts';
import {
  openGvGModal, closeGvGModal, loadGroupChallenges,
  searchGroupsForChallenge, clearGvGOpponent, submitGroupChallenge,
} from './groups.challenges.ts';
import { ready, getCurrentUser, getSupabaseClient, safeRpc } from '../auth.ts';
import { escapeHTML, showToast } from '../config.ts';

// ── INIT ───────────────────────────────────────────────────────────────────────
ready.then(() => {
  setSb(getSupabaseClient());
  setCurrentUser(getCurrentUser());
  _injectMemberActionsModal();
  setGroupOpenCallback(openGroup);
  loadDiscover();
});

// ── TAB SWITCHING ─────────────────────────────────────────────────────────────
function switchTab(tab: string) {
  setActiveTab(tab);
  document.querySelectorAll('#lobby-tabs .tab-btn').forEach((b, i) => {
    b.classList.toggle('active', ['discover','mine','leaderboard'][i] === tab);
  });
  document.getElementById('tab-discover').style.display     = tab === 'discover'    ? 'block' : 'none';
  document.getElementById('tab-mine').style.display         = tab === 'mine'        ? 'block' : 'none';
  document.getElementById('tab-leaderboard').style.display  = tab === 'leaderboard' ? 'block' : 'none';
  if (tab === 'mine' && currentUser)  loadMyGroups();
  if (tab === 'mine' && !currentUser) {
    document.getElementById('mine-list').innerHTML = renderEmpty('🔒', 'Sign in to see your groups', '');
  }
  if (tab === 'leaderboard') loadLeaderboard();
}

function switchDetailTab(tab: string) {
  setActiveDetailTab(tab);
  document.querySelectorAll('#detail-tabs .tab-btn').forEach((b, i) => {
    b.classList.toggle('active', ['hot-takes','challenges','members'][i] === tab);
  });
  document.getElementById('detail-hot-takes').style.display     = tab === 'hot-takes'  ? 'block' : 'none';
  document.getElementById('detail-challenges').style.display    = tab === 'challenges' ? 'block' : 'none';
  document.getElementById('detail-members-list').style.display  = tab === 'members'    ? 'block' : 'none';
}

// ── CATEGORY FILTER ───────────────────────────────────────────────────────────
function filterCategory(cat: string | null, el: HTMLElement) {
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  setActiveCategory(cat);
  loadDiscover();
}

// ── LOAD: DISCOVER ────────────────────────────────────────────────────────────
async function loadDiscover() {
  document.getElementById('discover-list').innerHTML = '<div class="loading-state">Loading groups…</div>';
  try {
    const { data, error } = await safeRpc('discover_groups', { p_limit: 30, p_category: activeCategory });
    if (error) throw error;
    const groups = typeof data === 'string' ? JSON.parse(data) : data;
    renderGroupList('discover-list', groups || [], false, false, openGroup);
  } catch (e) {
    document.getElementById('discover-list').innerHTML = renderEmpty('⚠️', 'Could not load groups', 'Try again in a moment');
  }
}

// ── LOAD: MY GROUPS ───────────────────────────────────────────────────────────
async function loadMyGroups() {
  document.getElementById('mine-list').innerHTML = '<div class="loading-state">Loading…</div>';
  try {
    const { data, error } = await safeRpc('get_my_groups');
    if (error) throw error;
    const groups = typeof data === 'string' ? JSON.parse(data) : data;
    if (!groups || groups.length === 0) {
      document.getElementById('mine-list').innerHTML = renderEmpty('👥', "You haven't joined any groups yet", 'Discover groups or create your own');
      return;
    }
    renderGroupList('mine-list', groups, true, false, openGroup);
  } catch (e) {
    document.getElementById('mine-list').innerHTML = renderEmpty('⚠️', 'Could not load groups', '');
  }
}

// ── LOAD: LEADERBOARD ─────────────────────────────────────────────────────────
async function loadLeaderboard() {
  document.getElementById('leaderboard-list').innerHTML = '<div class="loading-state">Loading rankings…</div>';
  try {
    const { data, error } = await safeRpc('get_group_leaderboard', { p_limit: 20 });
    if (error) throw error;
    const groups = typeof data === 'string' ? JSON.parse(data) : data;
    renderGroupList('leaderboard-list', groups || [], false, true, openGroup);
  } catch (e) {
    document.getElementById('leaderboard-list').innerHTML = renderEmpty('⚠️', 'Could not load rankings', '');
  }
}

// ── OPEN GROUP DETAIL ─────────────────────────────────────────────────────────
async function openGroup(groupId: string) {
  setCurrentGroupId(groupId);
  document.getElementById('view-lobby').style.display  = 'none';
  document.getElementById('view-detail').style.display = 'flex';

  // Reset
  document.getElementById('detail-name').textContent    = 'Loading…';
  document.getElementById('detail-emoji').textContent   = '⚔️';
  document.getElementById('detail-desc').textContent    = '';
  document.getElementById('detail-members').textContent = '—';
  document.getElementById('detail-elo').textContent     = '—';
  document.getElementById('detail-hot-takes').innerHTML     = '<div class="loading-state">Loading hot takes…</div>';
  document.getElementById('detail-challenges').innerHTML    = '<div class="loading-state">Loading challenges…</div>';
  document.getElementById('detail-members-list').innerHTML  = '<div class="loading-state">Loading members…</div>';
  document.getElementById('gvg-challenge-btn').style.display = 'none';
  switchDetailTab('hot-takes');

  try {
    const { data, error } = await safeRpc('get_group_details', { p_group_id: groupId });
    if (error) throw error;
    const g = typeof data === 'string' ? JSON.parse(data) : data;

    document.getElementById('detail-top-name').textContent = g.name.toUpperCase();
    document.getElementById('detail-emoji').textContent    = g.avatar_emoji || '⚔️';
    document.getElementById('detail-name').textContent     = g.name;
    document.getElementById('detail-desc').textContent     = g.description || '';
    document.getElementById('detail-members').textContent  = g.member_count;
    document.getElementById('detail-elo').textContent      = g.elo_rating;

    setIsMember(g.is_member);
    setCallerRole(g.my_role ?? null); // F-14: must be set before loadGroupMembers renders action buttons

    updateJoinBtn(g);
    document.getElementById('gvg-challenge-btn').style.display = g.is_member ? 'block' : 'none';
  } catch (e) {
    document.getElementById('detail-name').textContent = 'Error loading group';
  }

  loadGroupHotTakes(groupId);
  loadGroupChallenges(groupId);
  loadGroupMembers(groupId);
}

function updateJoinBtn(g: GroupListItem) {
  const btn = document.getElementById('join-btn') as HTMLButtonElement;
  if (!currentUser) {
    btn.textContent = 'SIGN IN TO JOIN';
    btn.className   = 'join-btn join';
    return;
  }
  if (g.is_member) {
    // F-14 fix: was 'owner', now 'leader'
    btn.textContent = g.my_role === 'leader' ? 'YOU OWN THIS GROUP' : 'LEAVE GROUP';
    btn.className   = 'join-btn leave';
    btn.disabled    = g.my_role === 'leader';
  } else {
    btn.textContent = 'JOIN GROUP';
    btn.className   = 'join-btn join';
    btn.disabled    = false;
  }
}

// ── JOIN / LEAVE ──────────────────────────────────────────────────────────────
async function toggleMembership() {
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
      setIsMember(false);
      setCallerRole(null);
      btn.textContent = 'JOIN GROUP';
      btn.className   = 'join-btn join';
      document.getElementById('gvg-challenge-btn').style.display = 'none';
      document.getElementById('detail-members').textContent =
        String(parseInt(document.getElementById('detail-members').textContent) - 1);
    } else {
      const { error } = await safeRpc('join_group', { p_group_id: currentGroupId });
      if (error) throw error;
      setIsMember(true);
      setCallerRole('member');
      btn.textContent = 'LEAVE GROUP';
      btn.className   = 'join-btn leave';
      document.getElementById('gvg-challenge-btn').style.display = 'block';
      document.getElementById('detail-members').textContent =
        String(parseInt(document.getElementById('detail-members').textContent) + 1);
    }
    loadGroupMembers(currentGroupId); // re-render with updated callerRole
  } catch (e) {
    alert((e as Error).message || 'Something went wrong');
  } finally {
    btn.disabled = false;
  }
}

// ── SHOW LOBBY ────────────────────────────────────────────────────────────────
function showLobby() {
  setCurrentGroupId(null);
  setCallerRole(null);
  document.getElementById('view-detail').style.display = 'none';
  document.getElementById('view-lobby').style.display  = 'block';
}

// ── CREATE MODAL ──────────────────────────────────────────────────────────────
function openCreateModal() {
  if (!currentUser) { window.location.href = 'moderator-plinko.html'; return; }
  document.getElementById('create-modal').classList.add('open');
}
function closeCreateModal() {
  document.getElementById('create-modal').classList.remove('open');
}
function handleModalBackdrop(e: Event) {
  if (e.target === document.getElementById('create-modal')) closeCreateModal();
}
function selectEmoji(el: HTMLElement) {
  document.querySelectorAll('.emoji-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  setSelectedEmoji(el.dataset.emoji);
}
async function submitCreateGroup() {
  const name = (document.getElementById('group-name') as HTMLInputElement).value.trim();
  if (!name || name.length < 2) { alert('Group name must be at least 2 characters'); return; }
  const btn = document.getElementById('create-submit-btn') as HTMLButtonElement;
  btn.disabled    = true;
  btn.textContent = 'CREATING…';
  try {
    const { data, error } = await safeRpc('create_group', {
      p_name:         name,
      p_description:  (document.getElementById('group-desc-input') as HTMLInputElement).value.trim() || null,
      p_category:     (document.getElementById('group-category') as HTMLSelectElement).value,
      p_is_public:    true,
      p_avatar_emoji: selectedEmoji,
    });
    if (error) throw error;
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    closeCreateModal();
    (document.getElementById('group-name') as HTMLInputElement).value      = '';
    (document.getElementById('group-desc-input') as HTMLInputElement).value = '';
    if (result.group_id) openGroup(result.group_id);
  } catch (e) {
    alert((e as Error).message || 'Could not create group');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'CREATE GROUP';
  }
}

// ── URL PARAM: open group directly ───────────────────────────────────────────
const urlGroup = new URLSearchParams(window.location.search).get('group');
if (urlGroup && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlGroup)) {
  ready.then(() => openGroup(urlGroup));
}

// ── EVENT DELEGATION (replaces inline onclick handlers in HTML) ───────────────
document.addEventListener('click', (e) => {
  const actionEl = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
  if (!actionEl) return;

  switch (actionEl.dataset.action) {
    case 'go-home':
      window.location.href = 'index.html';
      break;
    case 'open-create-modal':
      openCreateModal();
      break;
    case 'switch-tab':
      switchTab(actionEl.dataset.tab!);
      break;
    case 'filter-category':
      filterCategory(actionEl.dataset.category || null, actionEl);
      break;
    case 'show-lobby':
      showLobby();
      break;
    case 'toggle-membership':
      toggleMembership();
      break;
    case 'open-gvg-modal':
      openGvGModal();
      break;
    case 'switch-detail-tab':
      switchDetailTab(actionEl.dataset.tab!);
      break;
    case 'create-modal-backdrop':
      if (e.target === actionEl) closeCreateModal();
      break;
    case 'select-emoji':
      selectEmoji(actionEl);
      break;
    case 'submit-create-group':
      submitCreateGroup();
      break;
    case 'gvg-modal-backdrop':
      if (e.target === actionEl) closeGvGModal();
      break;
    case 'close-gvg-modal':
      closeGvGModal();
      break;
    case 'submit-gvg-challenge':
      submitGroupChallenge();
      break;
    case 'clear-gvg-opponent':
      clearGvGOpponent();
      break;
  }
});
