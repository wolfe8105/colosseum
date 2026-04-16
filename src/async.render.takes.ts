/**
 * THE MODERATOR — Async Module: Hot Takes Rendering
 *
 * loadHotTakes + card renderers for takes and the moderator recruitment card.
 * Wire callback injected by the barrel via _setWireTakes().
 */

import { state } from './async.state.ts';
import type { HotTake, CategoryFilter } from './async.types.ts';
import { escapeHTML } from './config.ts';
import { vgBadge } from './badge.ts';
import { bountyDot } from './bounties.ts';
import { getCurrentUser, getCurrentProfile } from './auth.ts';

const esc = escapeHTML;

// ============================================================
// WIRING CALLBACK (set by barrel orchestrator)
// ============================================================

export type WireFn = (container: HTMLElement) => void;
let _wireTakes: WireFn | undefined;

export function _setWireTakes(fn: WireFn): void {
  _wireTakes = fn;
}

// ============================================================
// HOT TAKES — LOAD + RENDER
// ============================================================

export function loadHotTakes(category: CategoryFilter = 'all'): void {
  state.currentFilter = category;
  const container = document.getElementById('hot-takes-feed');
  if (!container) return;

  if (!state.wiredContainers.has(container)) {
    _wireTakes?.(container);
    state.wiredContainers.add(container);
  }

  const takes =
    category === 'all'
      ? state.hotTakes
      : state.hotTakes.filter((t) => t.section === category);

  if (takes.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 16px;color:var(--mod-text-sub);">
        <div style="font-size:36px;margin-bottom:8px;">🤫</div>
        <div style="font-size:14px;">No takes here yet. Be the first.</div>
      </div>`;
    return;
  }

  const rendered = takes.map((t) => _renderTake(t));

  // Inject moderator recruitment card at position 2 (after 2nd take)
  const user = getCurrentUser();
  const profile = getCurrentProfile();
  if (!profile?.is_moderator && rendered.length >= 2) {
    rendered.splice(2, 0, _renderModeratorCard(!user));
  }

  container.innerHTML = rendered.join('');
}

function _renderTake(t: HotTake): string {
  const userClickable = t.user_id && t.user_id !== getCurrentUser()?.id;
  const safeUser = esc(t.user);
  const safeInitial = esc((t.user || '?')[0] ?? '');
  const safeText = esc(t.text);
  const safeId = esc(t.id);
  const safeUserId = esc(t.user_id);
  const safeUsername = esc(t.username ?? '');
  const profileAttr = userClickable
    ? `data-action="profile" data-user-id="${safeUserId}" data-username="${safeUsername}" style="cursor:pointer;"`
    : '';

  return `
    <div class="hot-take-card" data-id="${safeId}" style="
      background:#132240; /* TODO: needs CSS var token */border:1px solid var(--mod-border-secondary);border-radius:12px;
      padding:14px;margin-bottom:10px;
    ">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div ${profileAttr} style="width:32px;height:32px;border-radius:50%;background:var(--mod-bg-card);border:2px solid var(--mod-accent);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--mod-accent);${userClickable ? 'cursor:pointer;' : ''}">
          ${safeInitial}
        </div>
        <div>
          <span ${profileAttr} style="font-weight:700;font-size:13px;color:var(--mod-text-heading);${userClickable ? 'cursor:pointer;' : ''}">${safeUser}${vgBadge(t.verified_gladiator)}${bountyDot(t.user_id)}</span>
        </div>
        <div style="margin-left:auto;font-size:11px;color:#6a7a90; /* TODO: needs CSS var token */">${esc(t.time)}</div>
      </div>
      <div data-action="expand" data-id="${safeId}" style="font-size:14px;line-height:1.5;color:var(--mod-text-heading);margin-bottom:12px;cursor:pointer;${t.text.length > 150 ? 'display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;' : ''}">${safeText}</div>${t.text.length > 150 ? '<div data-action="expand" data-id="' + safeId + '" style="font-size:12px;color:var(--mod-accent);cursor:pointer;margin-top:-8px;margin-bottom:12px;">tap to read more</div>' : ''}
      <div style="display:flex;align-items:center;gap:12px;">
        <button data-action="react" data-id="${safeId}" style="
          display:flex;align-items:center;gap:4px;background:${t.userReacted ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
          border:1px solid ${t.userReacted ? 'rgba(204,41,54,0.3)' : 'var(--mod-border-secondary)'};
          color:${t.userReacted ? 'var(--mod-magenta)' : 'var(--mod-text-sub)'};
          padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;
        ">🔥 ${Number(t.reactions)}</button>
        <button data-action="challenge" data-id="${safeId}" style="
          display:flex;align-items:center;gap:4px;
          background:rgba(204,41,54,0.1);border:1px solid rgba(204,41,54,0.3);
          color:var(--mod-magenta);padding:6px 12px;border-radius:20px;
          font-size:12px;font-weight:700;cursor:pointer;
        ">⚔️ BET. (${Number(t.challenges)})</button>
        <button data-action="share" data-id="${safeId}" data-text="${esc(t.text)}" style="
          display:flex;align-items:center;gap:4px;
          background:var(--mod-bg-subtle);border:1px solid var(--mod-border-secondary);
          color:var(--mod-text-sub);padding:6px 12px;border-radius:20px;
          font-size:12px;cursor:pointer;
        ">↗ Share</button>
      </div>
    </div>`;
}

function _renderModeratorCard(isGuest = false): string {
  const btnLabel = isGuest ? 'SIGN UP TO MODERATE' : 'BECOME A MODERATOR';
  const btnAction = isGuest ? 'mod-signup' : 'become-mod';
  return `
    <div class="hot-take-card" style="
      background:#132240; /* TODO: needs CSS var token */border:1px solid var(--mod-cyan);border-left:3px solid var(--mod-cyan);
      border-radius:12px;padding:14px;margin-bottom:10px;
    ">
      <div style="font-family:var(--mod-font-display);font-size:15px;color:var(--mod-cyan);letter-spacing:1px;margin-bottom:6px;">MODERATORS WANTED</div>
      <div style="font-size:13px;color:var(--mod-text-heading);margin-bottom:12px;line-height:1.5;">Judge debates, earn tokens, build your reputation.</div>
      <button data-action="${btnAction}" style="
        display:flex;align-items:center;gap:4px;
        background:rgba(0,224,255,0.08);border:1px solid var(--mod-cyan);
        color:var(--mod-cyan);padding:8px 16px;border-radius:20px;
        font-size:12px;font-weight:700;cursor:pointer;
      ">🧑‍⚖️ ${btnLabel}</button>
    </div>`;
}
