/**
 * THE MODERATOR — Groups Page Controller (TypeScript)
 *
 * Extracted from moderator-groups.html inline script.
 * Groups: discover, my groups, rankings, detail view, hot takes,
 * GvG challenges (Session 116), group hot take composer (Session 105).
 *
 * Migration: Session 128 (Phase 4), Session 139 (ES imports, 3 window globals removed)
 * F-14 / F-15 client: Session 181 — role-aware member actions (promote/kick/ban modal)
 * NOTE: Mechanical extraction. Type annotations at key boundaries.
 */
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { ready, getCurrentUser, getSupabaseClient, safeRpc } from '../auth.ts';
import { escapeHTML, showToast } from '../config.ts';

/** Group row as returned by discover / my-groups / leaderboard RPCs */
interface GroupListItem {
  id: string;
  name: string;
  avatar_emoji?: string | null;
  description?: string | null;
  category?: string;
  member_count?: number | string;
  elo_rating?: number | string;
  role?: string | null;
  rank?: number | string | null;
  is_member?: boolean;
  my_role?: string | null;
}

/** Member row as returned by get_group_members RPC */
interface GroupMember {
  user_id: string;
  role: string;
  joined_at?: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  elo_rating?: number | string;
  wins?: number | string;
  losses?: number | string;
  level?: number | string;
}

// ── STATE ─────────────────────────────────────────────────────────────────────
let sb: SupabaseClient | null = null;
let currentUser: User | null = null;
let activeTab = 'discover';
let activeDetailTab = 'hot-takes';
let activeCategory: string | null = null;
let selectedEmoji = '⚔️';
let currentGroupId: string | null = null;
let isMember = false;
let callerRole: string | null = null; // F-14: caller's role in currently open group

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  politics: '🏛️ Politics',
  sports: '🏆 Sports',
  entertainment: '🎬 Entertainment',
  music: '🎵 Music',
  couples_court: '💔 Couples Court'
};

// ── ROLE HELPERS ──────────────────────────────────────────────────────────────
// Mirrors group_role_rank() SQL function. Lower number = higher authority.
function clientRoleRank(role: string | null): number {
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
function assignableRoles(role: string): string[] {
  switch (role) {
    case 'leader':    return ['leader', 'co_leader', 'elder', 'member'];
    case 'co_leader': return ['elder', 'member'];
    default:          return [];
  }
}

function roleLabel(role: string): string {
  switch (role) {
    case 'leader':    return 'Leader';
    case 'co_leader': return 'Co-Leader';
    case 'elder':     return 'Elder';
    case 'member':    return 'Member';
    default:          return role;
  }
}

// ── INIT ───────────────────────────────────────────────────────────────────────
ready.then(() => {
  sb = getSupabaseClient();
  currentUser = getCurrentUser();
  _injectMemberActionsModal();
  loadDiscover();
});

// ── TAB SWITCHING ─────────────────────────────────────────────────────────────
function switchTab(tab: string) {
  activeTab = tab;
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
  activeDetailTab = tab;
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
  activeCategory = cat;
  loadDiscover();
}

// ── LOAD: DISCOVER ────────────────────────────────────────────────────────────
async function loadDiscover() {
  document.getElementById('discover-list').innerHTML = '<div class="loading-state">Loading groups…</div>';
  try {
    const { data, error } = await safeRpc('discover_groups', { p_limit: 30, p_category: activeCategory });
    if (error) throw error;
    const groups = typeof data === 'string' ? JSON.parse(data) : data;
    renderGroupList('discover-list', groups || []);
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
    renderGroupList('mine-list', groups, true);
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
    renderGroupList('leaderboard-list', groups || [], false, true);
  } catch (e) {
    document.getElementById('leaderboard-list').innerHTML = renderEmpty('⚠️', 'Could not load rankings', '');
  }
}

// ── RENDER: GROUP LIST ────────────────────────────────────────────────────────
function renderGroupList(containerId: string, groups: GroupListItem[], showRole = false, showRank = false) {
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
          <span class="meta-pill members">👥 ${parseInt(String(g.member_count), 10) || 0}</span>
          ${roleHtml}
        </div>
      </div>
      <div class="group-elo">
        ${showRank ? `<div class="elo-label">#${parseInt(String(g.rank), 10) || (i + 1)}</div>` : ''}
        <div class="elo-num">${parseInt(String(g.elo_rating), 10) || 1000}</div>
        <div class="elo-label">ELO</div>
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.group-card[data-group-id]').forEach(card => {
    card.addEventListener('click', () => {
      openGroup((card as HTMLElement).dataset.groupId);
    });
  });
}

function renderEmpty(icon: string, title: string, sub: string) {
  return `<div class="empty-state">
    <div class="empty-icon">${icon}</div>
    <div class="empty-title">${title}</div>
    ${sub ? `<div class="empty-sub">${sub}</div>` : ''}
  </div>`;
}

// ── OPEN GROUP DETAIL ─────────────────────────────────────────────────────────
async function openGroup(groupId: string) {
  currentGroupId = groupId;
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

    isMember   = g.is_member;
    callerRole = g.my_role ?? null; // F-14: must be set before loadGroupMembers renders action buttons

    updateJoinBtn(g);
    document.getElementById('gvg-challenge-btn').style.display = isMember ? 'block' : 'none';
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

// ── HOT TAKES FOR GROUP ───────────────────────────────────────────────────────
async function loadGroupHotTakes(groupId: string) {
  try {
    const { data, error } = await sb
      .from('hot_takes')
      .select('id, content, user_id, reaction_count, created_at, profiles_public(username, display_name)')
      .eq('section', groupId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;

    const esc = escapeHTML;
    let composerHtml = '';
    if (currentUser) {
      composerHtml = `<div style="background:rgba(19,34,64,0.6);border:1px solid var(--mod-accent-muted);border-radius:10px;padding:12px;margin-bottom:14px;">
        <textarea id="group-take-input" placeholder="Drop a hot take in this group…" maxlength="280" style="
          width:100%;min-height:52px;resize:vertical;background:var(--mod-bg-subtle);
          border:1px solid var(--mod-border-primary);border-radius:8px;color:var(--mod-text-heading);
          font-family:'Source Sans 3',sans-serif;font-size:14px;padding:10px 12px;line-height:1.4;
        "></textarea>
        <div style="display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:8px;">
          <span style="font-size:11px;color:var(--mod-text-sub);" id="group-take-count">0/280</span>
          <button id="group-take-post" style="
            background:var(--mod-magenta);color:#fff;border:none;border-radius:8px;
            padding:8px 20px;font-family:'Bebas Neue',sans-serif;font-size:14px;
            letter-spacing:1px;cursor:pointer;
          ">POST</button>
        </div>
      </div>`;
    }

    if (!data || data.length === 0) {
      document.getElementById('detail-hot-takes').innerHTML = composerHtml + renderEmpty('💬', 'No hot takes yet', currentUser ? 'Be the first to post' : 'Join and post the first one');
      _wireGroupTakeComposer(groupId);
      return;
    }

    const takesHtml = data.map(t => {
      const author = (t.profiles_public as any)?.username || (t.profiles_public as any)?.display_name || 'Unknown';
      return `<div class="group-take">
        <div class="take-author">${esc(author)}</div>
        <div class="take-content">${esc(t.content)}</div>
      </div>`;
    }).join('');

    document.getElementById('detail-hot-takes').innerHTML = composerHtml + takesHtml;
    _wireGroupTakeComposer(groupId);
  } catch (e) {
    document.getElementById('detail-hot-takes').innerHTML = renderEmpty('⚠️', 'Could not load hot takes', '');
  }
}

function _wireGroupTakeComposer(groupId: string) {
  const input   = document.getElementById('group-take-input') as HTMLTextAreaElement | null;
  const btn     = document.getElementById('group-take-post') as HTMLButtonElement | null;
  const counter = document.getElementById('group-take-count');
  if (!input || !btn) return;
  input.addEventListener('input', () => { counter.textContent = input.value.length + '/280'; });
  btn.addEventListener('click', () => postGroupHotTake(groupId));
}

async function postGroupHotTake(groupId: string) {
  const input = document.getElementById('group-take-input') as HTMLTextAreaElement | null;
  if (!input) return;
  const text = input.value.trim();
  if (!text) {
    input.style.borderColor = 'var(--mod-magenta)';
    setTimeout(() => { input.style.borderColor = 'var(--mod-border-primary)'; }, 1500);
    return;
  }
  if (!currentUser) {
    window.location.href = 'moderator-plinko.html?returnTo=' + encodeURIComponent(window.location.pathname + '?group=' + groupId);
    return;
  }
  const btn = document.getElementById('group-take-post') as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  try {
    const { error } = await safeRpc('create_hot_take', { p_content: text, p_section: groupId });
    if (error) {
      showToast('Post failed — try again', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'POST'; }
      return;
    }
    input.value = '';
    document.getElementById('group-take-count').textContent = '0/280';
    showToast('🔥 Hot take posted', 'success');
    loadGroupHotTakes(groupId);
  } catch (e) {
    showToast('Post failed — try again', 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'POST'; }
}

// ── MEMBERS LIST ──────────────────────────────────────────────────────────────
async function loadGroupMembers(groupId: string) {
  const esc = escapeHTML;
  try {
    const { data, error } = await safeRpc('get_group_members', { p_group_id: groupId, p_limit: 50 });
    if (error) throw error;
    const members: GroupMember[] = typeof data === 'string' ? JSON.parse(data) : data;

    if (!members || members.length === 0) {
      document.getElementById('detail-members-list').innerHTML = renderEmpty('👥', 'No members yet', '');
      return;
    }

    const callerRank = clientRoleRank(callerRole);

    document.getElementById('detail-members-list').innerHTML = members.map(m => {
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
          <div class="member-elo">ELO ${parseInt(String(m.elo_rating), 10) || 1000} · ${parseInt(String(m.wins), 10) || 0}W ${parseInt(String(m.losses), 10) || 0}L</div>
          ${actionHtml}
        </div>
        <div class="member-role">${roleBadge}</div>
      </div>`;
    }).join('');

    // Single delegated listener: button click opens modal, row click navigates to profile
    document.getElementById('detail-members-list').addEventListener('click', (e) => {
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

  } catch (e) {
    document.getElementById('detail-members-list').innerHTML = renderEmpty('⚠️', 'Could not load members', '');
  }
}

// ── MEMBER ACTIONS MODAL ──────────────────────────────────────────────────────
// Injected once on init. Reused for every MANAGE button click.
function _injectMemberActionsModal() {
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
          color:#ffa500;
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
  document.getElementById('mam-cancel-btn').addEventListener('click', closeMemberActionsModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeMemberActionsModal(); });
  document.getElementById('mam-promote-btn').addEventListener('click', _executePromote);
  document.getElementById('mam-kick-btn').addEventListener('click', _executeKick);
  document.getElementById('mam-ban-btn').addEventListener('click', _executeBan);
}

// The member currently being managed
let _mamMember: GroupMember | null = null;

function openMemberActionsModal(member: GroupMember) {
  _mamMember = member;
  const esc  = escapeHTML;

  document.getElementById('mam-name').textContent       = member.display_name || member.username || 'Member';
  document.getElementById('mam-role-label').textContent = 'Current role: ' + roleLabel(member.role);
  document.getElementById('mam-avatar').textContent     = '⚔️';
  document.getElementById('mam-error').style.display    = 'none';
  (document.getElementById('mam-ban-reason') as HTMLTextAreaElement).value = '';

  // Promote dropdown — hidden for elder (can only kick/ban members)
  const promoteSection = document.getElementById('mam-promote-section');
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

  document.getElementById('member-actions-modal').style.display = 'flex';
}

function closeMemberActionsModal() {
  document.getElementById('member-actions-modal').style.display = 'none';
  _mamMember = null;
}

function _setMamError(msg: string) {
  const el = document.getElementById('mam-error');
  el.textContent   = msg;
  el.style.display = 'block';
}

function _setBtnLoading(btnId: string, loading: boolean, label: string) {
  const btn = document.getElementById(btnId) as HTMLButtonElement;
  btn.disabled    = loading;
  btn.textContent = loading ? '…' : label;
}

async function _executePromote() {
  if (!_mamMember || !currentGroupId) return;
  const sel     = document.getElementById('mam-promote-select') as HTMLSelectElement;
  const newRole = sel.value;
  if (!newRole) return;
  document.getElementById('mam-error').style.display = 'none';
  _setBtnLoading('mam-promote-btn', true, 'SET ROLE');
  try {
    const { data, error } = await safeRpc('promote_group_member', {
      p_group_id: currentGroupId,
      p_user_id:  _mamMember.user_id,
      p_new_role: newRole,
    });
    if (error) { _setMamError(error.message || 'Promote failed'); return; }
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (result?.error) { _setMamError(result.error); return; }
    closeMemberActionsModal();
    showToast(`✅ Role updated to ${roleLabel(newRole)}`, 'success');
    // If caller transferred their leadership, reload entire group detail to refresh callerRole
    if (newRole === 'leader') {
      openGroup(currentGroupId);
    } else {
      loadGroupMembers(currentGroupId);
    }
  } catch (e) {
    _setMamError('Something went wrong');
  } finally {
    _setBtnLoading('mam-promote-btn', false, 'SET ROLE');
  }
}

async function _executeKick() {
  if (!_mamMember || !currentGroupId) return;
  const name = _mamMember.display_name || _mamMember.username || 'this member';
  if (!confirm(`Kick ${name} from the group?`)) return;
  document.getElementById('mam-error').style.display = 'none';
  _setBtnLoading('mam-kick-btn', true, '⚡ KICK MEMBER');
  try {
    const { data, error } = await safeRpc('kick_group_member', {
      p_group_id: currentGroupId,
      p_user_id:  _mamMember.user_id,
    });
    if (error) { _setMamError(error.message || 'Kick failed'); return; }
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (result?.error) { _setMamError(result.error); return; }
    closeMemberActionsModal();
    showToast(`⚡ ${name} kicked`, 'success');
    loadGroupMembers(currentGroupId);
  } catch (e) {
    _setMamError('Something went wrong');
  } finally {
    _setBtnLoading('mam-kick-btn', false, '⚡ KICK MEMBER');
  }
}

async function _executeBan() {
  if (!_mamMember || !currentGroupId) return;
  const reason = (document.getElementById('mam-ban-reason') as HTMLTextAreaElement).value.trim() || null;
  const name   = _mamMember.display_name || _mamMember.username || 'this member';
  document.getElementById('mam-error').style.display = 'none';
  _setBtnLoading('mam-ban-btn', true, '🚫 BAN MEMBER');
  try {
    const { data, error } = await safeRpc('ban_group_member', {
      p_group_id: currentGroupId,
      p_user_id:  _mamMember.user_id,
      p_reason:   reason,
    });
    if (error) { _setMamError(error.message || 'Ban failed'); return; }
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (result?.error) { _setMamError(result.error); return; }
    closeMemberActionsModal();
    showToast(`🚫 ${name} banned`, 'success');
    loadGroupMembers(currentGroupId);
  } catch (e) {
    _setMamError('Something went wrong');
  } finally {
    _setBtnLoading('mam-ban-btn', false, '🚫 BAN MEMBER');
  }
}

// ── GVG CHALLENGE SYSTEM (E212/E215) ─────────────────────────────────────────
let selectedOpponentGroup: { id: string; name: string; emoji: string; elo: number } | null = null;
let selectedGvGFormat = '1v1';

function openGvGModal() {
  if (!currentUser) {
    window.location.href = 'moderator-plinko.html?returnTo=' + encodeURIComponent(window.location.pathname + '?group=' + currentGroupId);
    return;
  }
  selectedOpponentGroup = null;
  selectedGvGFormat     = '1v1';
  document.getElementById('gvg-modal').classList.add('open');
  document.getElementById('gvg-opponent-search').value       = '';
  document.getElementById('gvg-opponent-results').innerHTML  = '';
  document.getElementById('gvg-selected-opponent').style.display = 'none';
  (document.getElementById('gvg-topic') as HTMLInputElement).value = '';
  document.getElementById('gvg-error').style.display = 'none';
  document.querySelectorAll('.gvg-format-pill').forEach(p => p.classList.remove('active'));
  document.querySelector('.gvg-format-pill[data-format="1v1"]').classList.add('active');
}

function closeGvGModal() {
  document.getElementById('gvg-modal').classList.remove('open');
}

(function wireGvGControls() {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.gvg-format-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        selectedGvGFormat = (pill as HTMLElement).dataset.format;
        document.querySelectorAll('.gvg-format-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });
    const searchInput = document.getElementById('gvg-opponent-search') as HTMLInputElement | null;
    if (searchInput) {
      let timer: ReturnType<typeof setTimeout>;
      searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => searchGroupsForChallenge(searchInput.value.trim()), 350);
      });
    }
  });
})();

async function searchGroupsForChallenge(query: string) {
  const container = document.getElementById('gvg-opponent-results');
  if (!container) return;
  if (query.length < 2) { container.innerHTML = ''; return; }
  try {
    const esc = escapeHTML;
    const { data, error } = await sb
      .from('groups')
      .select('id, name, avatar_emoji, group_elo, member_count')
      .ilike('name', '%' + query + '%')
      .neq('id', currentGroupId)
      .order('member_count', { ascending: false })
      .limit(6);
    if (error) throw error;
    if (!data || data.length === 0) {
      container.innerHTML = '<div style="color:var(--white-dim);opacity:0.5;font-size:13px;padding:8px;">No groups found</div>';
      return;
    }
    container.innerHTML = data.map(g => `
      <div class="gvg-opponent-option"
        data-gid="${esc(g.id)}"
        data-gname="${esc(g.name)}"
        data-gemoji="${esc(g.avatar_emoji || '⚔️')}"
        data-gelo="${parseInt(String(g.group_elo || 1200))}">
        <span style="font-size:20px;">${esc(g.avatar_emoji || '⚔️')}</span>
        <div style="flex:1;">
          <div style="color:var(--white);font-size:13px;font-weight:700;">${esc(g.name)}</div>
          <div style="color:var(--white-dim);font-size:11px;">${parseInt(String(g.member_count || 0))} members · Elo ${parseInt(String(g.group_elo || 1200))}</div>
        </div>
      </div>
    `).join('');
    container.querySelectorAll('.gvg-opponent-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const el = opt as HTMLElement;
        selectedOpponentGroup = {
          id:    el.dataset.gid,
          name:  el.dataset.gname,
          emoji: el.dataset.gemoji,
          elo:   parseInt(el.dataset.gelo),
        };
        const sel  = document.getElementById('gvg-selected-opponent');
        const esc2 = escapeHTML;
        sel.innerHTML = `<div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:20px;">${esc2(selectedOpponentGroup.emoji)}</span>
          <div style="flex:1;">
            <div style="color:var(--white);font-size:14px;font-weight:700;">${esc2(selectedOpponentGroup.name)}</div>
            <div style="color:var(--white-dim);font-size:11px;">Elo ${selectedOpponentGroup.elo}</div>
          </div>
          <button data-action="clear-gvg-opponent" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;">✕</button>
        </div>`;
        sel.style.display = 'block';
        container.innerHTML = '';
        (document.getElementById('gvg-opponent-search') as HTMLInputElement).value = '';
      });
    });
  } catch (e) {
    container.innerHTML = '<div style="color:var(--red);font-size:13px;padding:8px;">Search failed</div>';
  }
}

function clearGvGOpponent() {
  selectedOpponentGroup = null;
  document.getElementById('gvg-selected-opponent').style.display = 'none';
}

async function submitGroupChallenge() {
  const errEl = document.getElementById('gvg-error');
  const btn   = document.getElementById('gvg-submit-btn') as HTMLButtonElement;
  if (!selectedOpponentGroup) {
    errEl.textContent   = 'Select an opponent group';
    errEl.style.display = 'block';
    return;
  }
  const topic = (document.getElementById('gvg-topic') as HTMLInputElement).value.trim();
  if (topic.length < 5) {
    errEl.textContent   = 'Topic must be at least 5 characters';
    errEl.style.display = 'block';
    return;
  }
  btn.disabled    = true;
  btn.textContent = 'SENDING…';
  errEl.style.display = 'none';
  try {
    const { data, error } = await safeRpc('create_group_challenge', {
      p_challenger_group_id: currentGroupId,
      p_defender_group_id:   selectedOpponentGroup.id,
      p_topic:               topic,
      p_category:            (document.getElementById('gvg-category') as HTMLSelectElement).value,
      p_format:              selectedGvGFormat,
    });
    if (error) {
      errEl.textContent   = error.message || 'RPC failed';
      errEl.style.display = 'block';
      btn.disabled        = false;
      btn.textContent     = 'SEND CHALLENGE ⚔️';
      return;
    }
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (result?.error) {
      errEl.textContent   = result.error;
      errEl.style.display = 'block';
      btn.disabled        = false;
      btn.textContent     = 'SEND CHALLENGE ⚔️';
      return;
    }
    closeGvGModal();
    loadGroupChallenges(currentGroupId);
    showToast('⚔️ Challenge sent!', 'success');
  } catch (e) {
    errEl.textContent   = 'Something went wrong';
    errEl.style.display = 'block';
  }
  btn.disabled    = false;
  btn.textContent = 'SEND CHALLENGE ⚔️';
}

async function loadGroupChallenges(groupId: string) {
  const container = document.getElementById('detail-challenges');
  if (!container) return;
  try {
    const { data, error } = await safeRpc('get_group_challenges', { p_group_id: groupId, p_limit: 10 });
    if (error) throw error;
    const challenges = typeof data === 'string' ? JSON.parse(data) : data;
    if (!challenges || challenges.length === 0) {
      container.innerHTML = renderEmpty('⚔️', 'No challenges yet', isMember ? 'Challenge another group to get started' : 'Join this group to send challenges');
      return;
    }
    const esc = escapeHTML;
    container.innerHTML = challenges.map(c => {
      const isDefender = c.defender_group_id === groupId;
      const oppName    = isDefender ? c.challenger_name  : c.defender_name;
      const oppEmoji   = isDefender ? c.challenger_emoji : c.defender_emoji;
      const oppElo     = isDefender ? c.challenger_elo   : c.defender_elo;
      let badge = '', actionHtml = '';
      switch (c.status) {
        case 'pending':
          badge = '<span class="meta-pill" style="background:var(--mod-accent-muted);color:var(--gold);border:none;">PENDING</span>';
          if (isDefender && currentUser) {
            const cid = String(c.id);
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cid)) {
              actionHtml = `<div style="display:flex;gap:6px;margin-top:8px;">
                <button data-challenge-id="${esc(cid)}" data-action="accept" class="gvg-respond-btn" style="flex:1;background:rgba(46,204,113,0.15);color:var(--success);border:1px solid rgba(46,204,113,0.3);border-radius:6px;padding:6px;font-family:var(--font-body);font-size:12px;font-weight:700;letter-spacing:1px;cursor:pointer;">ACCEPT</button>
                <button data-challenge-id="${esc(cid)}" data-action="decline" class="gvg-respond-btn" style="flex:1;background:var(--mod-accent-muted);color:var(--red);border:1px solid rgba(193,39,45,0.3);border-radius:6px;padding:6px;font-family:var(--font-body);font-size:12px;font-weight:700;letter-spacing:1px;cursor:pointer;">DECLINE</button>
              </div>`;
            }
          }
          break;
        case 'accepted':
          badge = '<span class="meta-pill" style="background:rgba(46,204,113,0.15);color:var(--success);border:none;">ACCEPTED</span>';
          break;
        case 'completed':
          badge = c.winner_group_id === groupId
            ? '<span class="meta-pill" style="background:var(--mod-accent-muted);color:var(--gold);border:none;">WON ✨</span>'
            : '<span class="meta-pill" style="background:var(--mod-accent-muted);color:var(--red);border:none;">LOST</span>'; break;
        case 'declined':
          badge = '<span class="meta-pill" style="background:var(--mod-bg-subtle);color:var(--white-dim);border:none;">DECLINED</span>'; break;
        case 'expired':
          badge = '<span class="meta-pill" style="background:var(--mod-bg-subtle);color:var(--white-dim);border:none;">EXPIRED</span>'; break;
      }
      return `<div class="challenge-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:18px;">${esc(oppEmoji || '⚔️')}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;color:var(--white);">${isDefender ? 'Challenged by' : 'vs'} ${esc(oppName)}</div>
            <div style="font-size:11px;color:var(--white-dim);">Elo ${parseInt(oppElo)} · ${esc(c.format)}</div>
          </div>
          ${badge}
        </div>
        <div style="font-size:13px;color:var(--white-dim);line-height:1.3;">${esc(c.topic)}</div>
        ${actionHtml}
      </div>`;
    }).join('');

    container.querySelectorAll('.gvg-respond-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        respondToChallenge((btn as HTMLElement).dataset.challengeId, (btn as HTMLElement).dataset.action);
      });
    });
  } catch (e) {
    container.innerHTML = renderEmpty('⚠️', 'Could not load challenges', '');
  }
}

async function respondToChallenge(challengeId: string, action: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challengeId)) return;
  try {
    const { data, error } = await safeRpc('respond_to_group_challenge', {
      p_challenge_id: challengeId,
      p_action:       action,
    });
    if (error) { showToast('⚠️ ' + (error.message || 'Failed'), 'error'); return; }
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (result?.error) { showToast('⚠️ ' + result.error, 'error'); return; }
    loadGroupChallenges(currentGroupId);
    showToast(action === 'accept' ? '⚔️ Challenge accepted!' : 'Challenge declined', 'success');
  } catch (e) {
    showToast('⚠️ Something went wrong', 'error');
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
      isMember   = false;
      callerRole = null;
      btn.textContent = 'JOIN GROUP';
      btn.className   = 'join-btn join';
      document.getElementById('gvg-challenge-btn').style.display = 'none';
      document.getElementById('detail-members').textContent =
        String(parseInt(document.getElementById('detail-members').textContent) - 1);
    } else {
      const { error } = await safeRpc('join_group', { p_group_id: currentGroupId });
      if (error) throw error;
      isMember   = true;
      callerRole = 'member';
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
  currentGroupId = null;
  callerRole     = null;
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
  selectedEmoji = el.dataset.emoji;
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
