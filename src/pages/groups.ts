/**
 * THE MODERATOR — Groups Page Controller (TypeScript)
 *
 * Extracted from moderator-groups.html inline script.
 * Groups: discover, my groups, rankings, detail view, hot takes,
 * GvG challenges (Session 116), group hot take composer (Session 105).
 *
 * Migration: Session 128 (Phase 4), Session 139 (ES imports, 3 window globals removed)
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

// ── STATE ───────────────────────────────────────────────────────────────────
let sb: SupabaseClient | null = null;
let currentUser: User | null = null;
let activeTab = 'discover';
let activeDetailTab = 'hot-takes';
let activeCategory: string | null = null;
let selectedEmoji = '⚔️';
let currentGroupId: string | null = null;
let isMember = false;

const CATEGORY_LABELS = {
  general: 'General',
  politics: '🏛️ Politics',
  sports: '🏆 Sports',
  entertainment: '🎬 Entertainment',
  music: '🎵 Music',
  couples_court: '💔 Couples Court'
};

// ── INIT ─────────────────────────────────────────────────────────────────────
ready.then(() => {
  sb = getSupabaseClient();
  currentUser = getCurrentUser();
  loadDiscover();
});

// ── TAB SWITCHING ─────────────────────────────────────────────────────────────
function switchTab(tab: string) {
  activeTab = tab;
  document.querySelectorAll('#lobby-tabs .tab-btn').forEach((b, i) => {
    b.classList.toggle('active', ['discover','mine','leaderboard'][i] === tab);
  });
  document.getElementById('tab-discover').style.display = tab === 'discover' ? 'block' : 'none';
  document.getElementById('tab-mine').style.display = tab === 'mine' ? 'block' : 'none';
  document.getElementById('tab-leaderboard').style.display = tab === 'leaderboard' ? 'block' : 'none';
  if (tab === 'mine' && currentUser) loadMyGroups();
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
  document.getElementById('detail-hot-takes').style.display = tab === 'hot-takes' ? 'block' : 'none';
  document.getElementById('detail-challenges').style.display = tab === 'challenges' ? 'block' : 'none';
  document.getElementById('detail-members-list').style.display = tab === 'members' ? 'block' : 'none';
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
    const { data, error } = await sb.rpc('discover_groups', { p_limit: 30, p_category: activeCategory });
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
    const { data, error } = await sb.rpc('get_my_groups');
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
    const { data, error } = await sb.rpc('get_group_leaderboard', { p_limit: 20 });
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
          <span class="meta-pill members">👥 ${parseInt(g.member_count, 10) || 0}</span>
          ${roleHtml}
        </div>
      </div>
      <div class="group-elo">
        ${showRank ? `<div class="elo-label">#${parseInt(g.rank, 10) || (i + 1)}</div>` : ''}
        <div class="elo-num">${parseInt(g.elo_rating, 10) || 1000}</div>
        <div class="elo-label">ELO</div>
      </div>
    </div>`;
  }).join('');

  // Event delegation for group cards
  el.querySelectorAll('.group-card[data-group-id]').forEach(card => {
    card.addEventListener('click', () => {
      openGroup(card.dataset.groupId);
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
  document.getElementById('view-lobby').style.display = 'none';
  document.getElementById('view-detail').style.display = 'flex';

  // Reset
  document.getElementById('detail-name').textContent = 'Loading…';
  document.getElementById('detail-emoji').textContent = '⚔️';
  document.getElementById('detail-desc').textContent = '';
  document.getElementById('detail-members').textContent = '—';
  document.getElementById('detail-elo').textContent = '—';
  document.getElementById('detail-hot-takes').innerHTML = '<div class="loading-state">Loading hot takes…</div>';
  document.getElementById('detail-challenges').innerHTML = '<div class="loading-state">Loading challenges…</div>';
  document.getElementById('detail-members-list').innerHTML = '<div class="loading-state">Loading members…</div>';
  document.getElementById('gvg-challenge-btn').style.display = 'none';
  switchDetailTab('hot-takes');

  // Load group details
  try {
    const { data, error } = await sb.rpc('get_group_details', { p_group_id: groupId });
    if (error) throw error;
    const g = typeof data === 'string' ? JSON.parse(data) : data;
    document.getElementById('detail-top-name').textContent = g.name.toUpperCase();
    document.getElementById('detail-emoji').textContent = g.avatar_emoji || '⚔️';
    document.getElementById('detail-name').textContent = g.name;
    document.getElementById('detail-desc').textContent = g.description || '';
    document.getElementById('detail-members').textContent = g.member_count;
    document.getElementById('detail-elo').textContent = g.elo_rating;
    isMember = g.is_member;
    updateJoinBtn(g);
    // E212: Show GvG button only for members
    document.getElementById('gvg-challenge-btn').style.display = isMember ? 'block' : 'none';
  } catch (e) {
    document.getElementById('detail-name').textContent = 'Error loading group';
  }

  // Load hot takes for this group (section = group_id)
  loadGroupHotTakes(groupId);
  // Load GvG challenges
  loadGroupChallenges(groupId);
  // Load members
  loadGroupMembers(groupId);
}

function updateJoinBtn(g: GroupListItem) {
  const btn = document.getElementById('join-btn');
  if (!currentUser) {
    btn.textContent = 'SIGN IN TO JOIN';
    btn.className = 'join-btn join';
    return;
  }
  if (g.is_member) {
    btn.textContent = g.my_role === 'owner' ? 'YOU OWN THIS GROUP' : 'LEAVE GROUP';
    btn.className = g.my_role === 'owner' ? 'join-btn leave' : 'join-btn leave';
    if (g.my_role === 'owner') btn.disabled = true;
  } else {
    btn.textContent = 'JOIN GROUP';
    btn.className = 'join-btn join';
    btn.disabled = false;
  }
}

// ── HOT TAKES FOR GROUP ───────────────────────────────────────────────────────
async function loadGroupHotTakes(groupId: string) {
  try {
    // Group hot takes use section = group_id (see SQL header comment)
    const { data, error } = await sb
      .from('hot_takes')
      .select('id, content, user_id, reaction_count, created_at, profiles_public(username, display_name)')
      .eq('section', groupId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;

    // E211: Compose UI — auth-gated, only shown for logged-in users
    const esc = escapeHTML;
    let composerHtml = '';
    if (currentUser) {
      composerHtml = `<div style="background:rgba(19,34,64,0.6);border:1px solid rgba(212,168,67,0.15);border-radius:10px;padding:12px;margin-bottom:14px;">
        <textarea id="group-take-input" placeholder="Drop a hot take in this group…" maxlength="280" style="
          width:100%;min-height:52px;resize:vertical;background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f0f0f0;
          font-family:'Source Sans 3',sans-serif;font-size:14px;padding:10px 12px;line-height:1.4;
        "></textarea>
        <div style="display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:8px;">
          <span style="font-size:11px;color:rgba(160,168,184,0.6);" id="group-take-count">0/280</span>
          <button id="group-take-post" style="
            background:#cc2936;color:#fff;border:none;border-radius:8px;
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
      const author = t.profiles_public?.username || t.profiles_public?.display_name || 'Unknown';
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

// E211: Wire group hot take composer events
function _wireGroupTakeComposer(groupId: string) {
  const input = document.getElementById('group-take-input');
  const btn = document.getElementById('group-take-post');
  const counter = document.getElementById('group-take-count');
  if (!input || !btn) return;
  input.addEventListener('input', () => {
    counter.textContent = input.value.length + '/280';
  });
  btn.addEventListener('click', () => postGroupHotTake(groupId));
}

// E211: Post a hot take scoped to a group
async function postGroupHotTake(groupId: string) {
  const input = document.getElementById('group-take-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) {
    input.style.borderColor = '#cc2936';
    setTimeout(() => { input.style.borderColor = 'rgba(255,255,255,0.1)'; }, 1500);
    return;
  }
  if (!currentUser) {
    window.location.href = 'moderator-plinko.html?returnTo=' + encodeURIComponent(window.location.pathname + '?group=' + groupId);
    return;
  }
  const btn = document.getElementById('group-take-post');
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  try {
    const { data, error } = await sb.rpc('create_hot_take', { p_content: text, p_section: groupId });
    if (error) {
      console.error('create_hot_take (group) error:', error);
      showToast('Post failed — try again', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'POST'; }
      return;
    }
    // Success — reload hot takes to show the new one
    input.value = '';
    document.getElementById('group-take-count').textContent = '0/280';
    showToast('🔥 Hot take posted', 'success');
    loadGroupHotTakes(groupId);
  } catch (e) {
    console.error('create_hot_take (group) exception:', e);
    showToast('Post failed — try again', 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'POST'; }
}

// ── MEMBERS LIST ──────────────────────────────────────────────────────────────
async function loadGroupMembers(groupId: string) {
  const esc = escapeHTML;
  try {
    const { data, error } = await sb.rpc('get_group_members', { p_group_id: groupId, p_limit: 50 });
    if (error) throw error;
    const members = typeof data === 'string' ? JSON.parse(data) : data;
    if (!members || members.length === 0) {
      document.getElementById('detail-members-list').innerHTML = renderEmpty('👥', 'No members yet', '');
      return;
    }
    document.getElementById('detail-members-list').innerHTML = members.map(m => {
      const name = m.display_name || m.username || 'Gladiator';
      const role = m.role || 'member';
      const roleBadge = role !== 'member'
        ? `<span class="my-role-badge ${esc(role)}">${esc(role.toUpperCase())}</span>`
        : '';
      const memberUsername = m.username || '';
      const clickAttr = memberUsername ? `data-username="${esc(memberUsername)}" style="cursor:pointer;"` : '';
      return `<div class="member-row" ${clickAttr}>
        <div class="member-avatar">
          ${m.avatar_url ? `<img src="${esc(m.avatar_url)}" alt="">` : '⚔️'}
        </div>
        <div class="member-info">
          <div class="member-name">${esc(name)}</div>
          <div class="member-elo">ELO ${parseInt(m.elo_rating, 10) || 1000} · ${parseInt(m.wins, 10) || 0}W ${parseInt(m.losses, 10) || 0}L</div>
        </div>
        <div class="member-role">${roleBadge}</div>
      </div>`;
    }).join('');

    // Wire profile navigation via delegation
    document.getElementById('detail-members-list').addEventListener('click', (e) => {
      const row = e.target.closest('[data-username]');
      if (row && row.dataset.username) {
        window.location.href = '/u/' + encodeURIComponent(row.dataset.username);
      }
    });
  } catch (e) {
    document.getElementById('detail-members-list').innerHTML = renderEmpty('⚠️', 'Could not load members', '');
  }
}

// ── GVG CHALLENGE SYSTEM (E212/E215) ─────────────────────────────────────────
let selectedOpponentGroup = null;
let selectedGvGFormat = '1v1';

function openGvGModal() {
  if (!currentUser) {
    window.location.href = 'moderator-plinko.html?returnTo=' + encodeURIComponent(window.location.pathname + '?group=' + currentGroupId);
    return;
  }
  selectedOpponentGroup = null;
  selectedGvGFormat = '1v1';
  document.getElementById('gvg-modal').classList.add('open');
  document.getElementById('gvg-opponent-search').value = '';
  document.getElementById('gvg-opponent-results').innerHTML = '';
  document.getElementById('gvg-selected-opponent').style.display = 'none';
  document.getElementById('gvg-topic').value = '';
  document.getElementById('gvg-error').style.display = 'none';
  // Reset format pills
  document.querySelectorAll('.gvg-format-pill').forEach(p => p.classList.remove('active'));
  document.querySelector('.gvg-format-pill[data-format="1v1"]').classList.add('active');
}

function closeGvGModal() {
  document.getElementById('gvg-modal').classList.remove('open');
}

// Opponent search with debounce
(function wireGvGControls() {
  document.addEventListener('DOMContentLoaded', () => {
    // Format pills
    document.querySelectorAll('.gvg-format-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        selectedGvGFormat = pill.dataset.format;
        document.querySelectorAll('.gvg-format-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });

    // Opponent search debounce
    const searchInput = document.getElementById('gvg-opponent-search');
    if (searchInput) {
      let timer;
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
      <div class="gvg-opponent-option" data-gid="${esc(g.id)}" data-gname="${esc(g.name)}" data-gemoji="${esc(g.avatar_emoji || '⚔️')}" data-gelo="${parseInt(g.group_elo || 1200)}">
        <span style="font-size:20px;">${esc(g.avatar_emoji || '⚔️')}</span>
        <div style="flex:1;">
          <div style="color:var(--white);font-size:13px;font-weight:700;">${esc(g.name)}</div>
          <div style="color:var(--white-dim);font-size:11px;">${parseInt(g.member_count || 0)} members · Elo ${parseInt(g.group_elo || 1200)}</div>
        </div>
      </div>
    `).join('');
    container.querySelectorAll('.gvg-opponent-option').forEach(opt => {
      opt.addEventListener('click', () => {
        selectedOpponentGroup = {
          id: opt.dataset.gid,
          name: opt.dataset.gname,
          emoji: opt.dataset.gemoji,
          elo: parseInt(opt.dataset.gelo)
        };
        const sel = document.getElementById('gvg-selected-opponent');
        const esc2 = escapeHTML;
        sel.innerHTML = `<div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:20px;">${esc2(selectedOpponentGroup.emoji)}</span>
          <div style="flex:1;">
            <div style="color:var(--white);font-size:14px;font-weight:700;">${esc2(selectedOpponentGroup.name)}</div>
            <div style="color:var(--white-dim);font-size:11px;">Elo ${selectedOpponentGroup.elo}</div>
          </div>
          <button onclick="clearGvGOpponent()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;">✕</button>
        </div>`;
        sel.style.display = 'block';
        container.innerHTML = '';
        document.getElementById('gvg-opponent-search').value = '';
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
  const btn = document.getElementById('gvg-submit-btn');
  if (!selectedOpponentGroup) {
    errEl.textContent = 'Select an opponent group';
    errEl.style.display = 'block';
    return;
  }
  const topic = document.getElementById('gvg-topic').value.trim();
  if (topic.length < 5) {
    errEl.textContent = 'Topic must be at least 5 characters';
    errEl.style.display = 'block';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'SENDING…';
  errEl.style.display = 'none';
  try {
    const { data, error } = await safeRpc('create_group_challenge', {
      p_challenger_group_id: currentGroupId,
      p_defender_group_id: selectedOpponentGroup.id,
      p_topic: topic,
      p_category: document.getElementById('gvg-category').value,
      p_format: selectedGvGFormat
    });
    if (error) {
      errEl.textContent = error.message || 'RPC failed';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'SEND CHALLENGE ⚔️';
      return;
    }
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (result && result.error) {
      errEl.textContent = result.error;
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'SEND CHALLENGE ⚔️';
      return;
    }
    // Success
    closeGvGModal();
    loadGroupChallenges(currentGroupId);
    showToast('⚔️ Challenge sent!', 'success');
  } catch (e) {
    errEl.textContent = 'Something went wrong';
    errEl.style.display = 'block';
  }
  btn.disabled = false;
  btn.textContent = 'SEND CHALLENGE ⚔️';
}

async function loadGroupChallenges(groupId: string) {
  const container = document.getElementById('detail-challenges');
  if (!container) return;
  try {
    const { data, error } = await sb.rpc('get_group_challenges', { p_group_id: groupId, p_limit: 10 });
    if (error) throw error;
    const challenges = typeof data === 'string' ? JSON.parse(data) : data;
    if (!challenges || challenges.length === 0) {
      container.innerHTML = renderEmpty('⚔️', 'No challenges yet', isMember ? 'Challenge another group to get started' : 'Join this group to send challenges');
      return;
    }
    const esc = escapeHTML;
    container.innerHTML = challenges.map(c => {
      const isDefender = c.defender_group_id === groupId;
      const oppName = isDefender ? c.challenger_name : c.defender_name;
      const oppEmoji = isDefender ? c.challenger_emoji : c.defender_emoji;
      const oppElo = isDefender ? c.challenger_elo : c.defender_elo;
      let badge = '', actionHtml = '';
      switch (c.status) {
        case 'pending':
          badge = '<span class="meta-pill" style="background:rgba(212,168,67,0.15);color:var(--gold);border:none;">PENDING</span>';
          if (isDefender && currentUser) {
            // UUID regex validation on challenge ID
            const cid = String(c.id);
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cid)) {
              actionHtml = `<div style="display:flex;gap:6px;margin-top:8px;">
                <button data-challenge-id="${esc(cid)}" data-action="accept" class="gvg-respond-btn" style="flex:1;background:rgba(46,204,113,0.15);color:var(--success);border:1px solid rgba(46,204,113,0.3);border-radius:6px;padding:6px;font-family:var(--font-body);font-size:12px;font-weight:700;letter-spacing:1px;cursor:pointer;">ACCEPT</button>
                <button data-challenge-id="${esc(cid)}" data-action="decline" class="gvg-respond-btn" style="flex:1;background:rgba(193,39,45,0.15);color:var(--red);border:1px solid rgba(193,39,45,0.3);border-radius:6px;padding:6px;font-family:var(--font-body);font-size:12px;font-weight:700;letter-spacing:1px;cursor:pointer;">DECLINE</button>
              </div>`;
            }
          }
          break;
        case 'accepted':
          badge = '<span class="meta-pill" style="background:rgba(46,204,113,0.15);color:var(--success);border:none;">ACCEPTED</span>';
          break;
        case 'completed':
          badge = c.winner_group_id === groupId
            ? '<span class="meta-pill" style="background:rgba(212,168,67,0.15);color:var(--gold);border:none;">WON ✨</span>'
            : '<span class="meta-pill" style="background:rgba(193,39,45,0.15);color:var(--red);border:none;">LOST</span>';
          break;
        case 'declined':
          badge = '<span class="meta-pill" style="background:rgba(255,255,255,0.06);color:var(--white-dim);border:none;">DECLINED</span>';
          break;
        case 'expired':
          badge = '<span class="meta-pill" style="background:rgba(255,255,255,0.06);color:var(--white-dim);border:none;">EXPIRED</span>';
          break;
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

    // Wire accept/decline buttons via delegation
    container.querySelectorAll('.gvg-respond-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        respondToChallenge(btn.dataset.challengeId, btn.dataset.action);
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
      p_action: action
    });
    if (error) { showToast('⚠️ ' + (error.message || 'Failed'), 'error'); return; }
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (result && result.error) { showToast('⚠️ ' + result.error, 'error'); return; }
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
  const btn = document.getElementById('join-btn');
  btn.disabled = true;
  try {
    if (isMember) {
      const { error } = await sb.rpc('leave_group', { p_group_id: currentGroupId });
      if (error) throw error;
      isMember = false;
      btn.textContent = 'JOIN GROUP';
      btn.className = 'join-btn join';
      document.getElementById('gvg-challenge-btn').style.display = 'none';
      document.getElementById('detail-members').textContent = (parseInt(document.getElementById('detail-members').textContent) - 1).toString();
    } else {
      const { error } = await sb.rpc('join_group', { p_group_id: currentGroupId });
      if (error) throw error;
      isMember = true;
      btn.textContent = 'LEAVE GROUP';
      btn.className = 'join-btn leave';
      document.getElementById('gvg-challenge-btn').style.display = 'block';
      document.getElementById('detail-members').textContent = (parseInt(document.getElementById('detail-members').textContent) + 1).toString();
    }
  } catch (e) {
    alert(e.message || 'Something went wrong');
  } finally {
    btn.disabled = false;
  }
}

// ── SHOW LOBBY ────────────────────────────────────────────────────────────────
function showLobby() {
  currentGroupId = null;
  document.getElementById('view-detail').style.display = 'none';
  document.getElementById('view-lobby').style.display = 'block';
}

// ── CREATE MODAL ──────────────────────────────────────────────────────────────
function openCreateModal() {
  if (!currentUser) {
    window.location.href = 'moderator-plinko.html';
    return;
  }
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
  const name = document.getElementById('group-name').value.trim();
  if (!name || name.length < 2) { alert('Group name must be at least 2 characters'); return; }
  const btn = document.getElementById('create-submit-btn');
  btn.disabled = true;
  btn.textContent = 'CREATING…';
  try {
    const { data, error } = await sb.rpc('create_group', {
      p_name: name,
      p_description: document.getElementById('group-desc-input').value.trim() || null,
      p_category: document.getElementById('group-category').value,
      p_is_public: true,
      p_avatar_emoji: selectedEmoji
    });
    if (error) throw error;
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    closeCreateModal();
    document.getElementById('group-name').value = '';
    document.getElementById('group-desc-input').value = '';
    // Open the newly created group
    if (result.group_id) openGroup(result.group_id);
  } catch (e) {
    alert(e.message || 'Could not create group');
  } finally {
    btn.disabled = false;
    btn.textContent = 'CREATE GROUP';
  }
}

// ── URL PARAM: open group directly ───────────────────────────────────────────
const urlGroup = new URLSearchParams(window.location.search).get('group');
if (urlGroup && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlGroup)) {
  ready.then(() => openGroup(urlGroup));
}

// ── WINDOW EXPOSURE ───────────────────────────────────────────────────────────
// Module-scoped functions are invisible to inline onclick handlers in the HTML.
// These assignments make them reachable. C4 fix — Session 179.
declare global {
  interface Window {
    switchTab: (tab: string) => void;
    switchDetailTab: (tab: string) => void;
    filterCategory: (cat: string | null, el: HTMLElement) => void;
    openCreateModal: () => void;
    closeCreateModal: () => void;
    handleModalBackdrop: (e: Event) => void;
    selectEmoji: (el: HTMLElement) => void;
    submitCreateGroup: () => Promise<void>;
    showLobby: () => void;
    toggleMembership: () => Promise<void>;
    openGvGModal: () => void;
    closeGvGModal: () => void;
    clearGvGOpponent: () => void;
    submitGroupChallenge: () => Promise<void>;
  }
}

window.switchTab = switchTab;
window.switchDetailTab = switchDetailTab;
window.filterCategory = filterCategory;
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.handleModalBackdrop = handleModalBackdrop;
window.selectEmoji = selectEmoji;
window.submitCreateGroup = submitCreateGroup;
window.showLobby = showLobby;
window.toggleMembership = toggleMembership;
window.openGvGModal = openGvGModal;
window.closeGvGModal = closeGvGModal;
window.clearGvGOpponent = clearGvGOpponent;
window.submitGroupChallenge = submitGroupChallenge;
