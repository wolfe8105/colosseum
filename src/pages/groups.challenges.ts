/**
 * THE MODERATOR — Groups: GvG challenge system (E212/E215)
 *
 * Part of groups decomposition (7 files):
 *   groups.types.ts, groups.state.ts, groups.utils.ts,
 *   groups.feed.ts, groups.members.ts, groups.challenges.ts, groups.ts
 */
import { sb, currentUser, currentGroupId, isMember } from './groups.state.ts';
import { escapeHTML, showToast } from '../config.ts';
import { safeRpc } from '../auth.ts';
import { renderEmpty } from './groups.utils.ts';

// ── LOCAL STATE ───────────────────────────────────────────────────────────────
let selectedOpponentGroup: { id: string; name: string; emoji: string; elo: number } | null = null;
let selectedGvGFormat = '1v1';

// ── GVG MODAL ─────────────────────────────────────────────────────────────────
export function openGvGModal() {
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

export function closeGvGModal() {
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

export async function searchGroupsForChallenge(query: string) {
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
        data-gelo="${Number.parseInt(String(g.group_elo || 1200))}">
        <span style="font-size:20px;">${esc(g.avatar_emoji || '⚔️')}</span>
        <div style="flex:1;">
          <div style="color:var(--white);font-size:13px;font-weight:700;">${esc(g.name)}</div>
          <div style="color:var(--white-dim);font-size:11px;">${Number.parseInt(String(g.member_count || 0))} members · Elo ${Number.parseInt(String(g.group_elo || 1200))}</div>
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
          elo:   Number.parseInt(el.dataset.gelo),
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

export function clearGvGOpponent() {
  selectedOpponentGroup = null;
  document.getElementById('gvg-selected-opponent').style.display = 'none';
}

export async function submitGroupChallenge() {
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

export async function loadGroupChallenges(groupId: string) {
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
            <div style="font-size:11px;color:var(--white-dim);">Elo ${Number.parseInt(oppElo)} · ${esc(c.format)}</div>
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

export async function respondToChallenge(challengeId: string, action: string) {
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
