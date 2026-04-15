/**
 * THE MODERATOR — Groups: hot takes feed
 *
 * Part of groups decomposition (7 files):
 *   groups.types.ts, groups.state.ts, groups.utils.ts,
 *   groups.feed.ts, groups.members.ts, groups.challenges.ts, groups.ts
 */
import { sb, currentUser } from './groups.state.ts';
import { escapeHTML, showToast } from '../config.ts';
import { safeRpc } from '../auth.ts';
import { renderEmpty } from './groups.utils.ts';

// ── HOT TAKES FOR GROUP ───────────────────────────────────────────────────────
export async function loadGroupHotTakes(groupId: string) {
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
            background:var(--mod-magenta);color:var(--mod-text-on-accent);border:none;border-radius:8px;
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

export async function postGroupHotTake(groupId: string) {
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
