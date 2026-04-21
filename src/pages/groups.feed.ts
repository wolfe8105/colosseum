/**
 * THE MODERATOR — Groups: unified debate feed
 *
 * Part of groups decomposition (7 files):
 *   groups.types.ts, groups.state.ts, groups.utils.ts,
 *   groups.feed.ts, groups.members.ts, groups.challenges.ts, groups.ts
 *
 * F-68: Uses get_unified_feed with group ID as category.
 * Shows all card states (open, live, voting, complete).
 */
import { currentUser } from './groups.state.ts';
import { escapeHTML, showToast } from '../config.ts';
import { safeRpc } from '../auth.ts';
import { create_debate_card } from '../contracts/rpc-schemas.ts';
import { renderEmpty } from './groups.utils.ts';
import { renderFeedCard, renderFeedEmpty } from '../feed-card.ts';
import type { UnifiedFeedCard } from '../feed-card.ts';

// ── GROUP FEED ──────────────────────────────────────────────────────────────
export async function loadGroupFeed(groupId: string) {
  const container = document.getElementById('detail-hot-takes');
  if (!container) return;

  try {
    const { data, error } = await safeRpc<UnifiedFeedCard[]>('get_unified_feed', {
      p_limit: 50,
      p_category: groupId,
    });
    if (error) throw error;

    let composerHtml = '';
    if (currentUser) {
      composerHtml = `<div style="background:rgba(19,34,64,0.6);border:1px solid var(--mod-accent-muted);border-radius:10px;padding:12px;margin-bottom:14px;">
        <textarea id="group-take-input" placeholder="Let your opinion be heard..." maxlength="280" style="
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

    if (!data || (data as UnifiedFeedCard[]).length === 0) {
      container.innerHTML = composerHtml + renderEmpty('💬', 'No posts yet', currentUser ? 'Be the first to post' : 'Join and post the first one');
      _wireGroupComposer(groupId);
      return;
    }

    const cardsHtml = (data as UnifiedFeedCard[]).map(c => renderFeedCard(c)).join('');
    container.innerHTML = composerHtml + cardsHtml;
    _wireGroupComposer(groupId);
  } catch (e) {
    container.innerHTML = renderEmpty('⚠️', 'Could not load feed', '');
  }
}

// Keep old name as alias for backward compat (groups.ts imports this name)
export const loadGroupHotTakes = loadGroupFeed;

function _wireGroupComposer(groupId: string) {
  const input   = document.getElementById('group-take-input') as HTMLTextAreaElement | null;
  const btn     = document.getElementById('group-take-post') as HTMLButtonElement | null;
  const counter = document.getElementById('group-take-count');
  if (!input || !btn) return;
  input.addEventListener('input', () => { if (counter) counter.textContent = input.value.length + '/280'; });
  btn.addEventListener('click', () => postGroupCard(groupId));
}

export async function postGroupCard(groupId: string) {
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
    const { error } = await safeRpc('create_debate_card', { p_content: text, p_category: groupId }, create_debate_card);
    if (error) {
      showToast('Post failed — try again', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'POST'; }
      return;
    }
    input.value = '';
    document.getElementById('group-take-count')!.textContent = '0/280';
    showToast('🔥 Posted', 'success');
    loadGroupFeed(groupId);
  } catch (e) {
    showToast('Connection lost — try again', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'POST'; }
  }
  if (btn) { btn.disabled = false; btn.textContent = 'POST'; }
}
