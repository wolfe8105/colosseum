/**
 * THE MODERATOR — Async Module: Rendering
 *
 * loadHotTakes, renderPredictions, wager picker, and all card renderers.
 * Delegation wiring is injected from the orchestrator via _registerWiring().
 */

import { state } from './async.state.ts';
import type {
  HotTake,
  Prediction,
  StandaloneQuestion,
  CategoryFilter,
} from './async.types.ts';
import { escapeHTML, FEATURES } from './config.ts';
import { vgBadge } from './badge.ts';
import { bountyDot } from './bounties.ts';
import { getCurrentUser, getCurrentProfile } from './auth.ts';

const esc = escapeHTML;

// ============================================================
// WIRING CALLBACKS (set by orchestrator)
// ============================================================

type WireFn = (container: HTMLElement) => void;
let _wireTakes: WireFn | undefined;
let _wirePredictions: WireFn | undefined;

export function _registerWiring(takes: WireFn, predictions: WireFn): void {
  _wireTakes = takes;
  _wirePredictions = predictions;
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
  const catLabel = (t.section || 'general').toUpperCase();
  const truncate = t.text.length > 150;

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

// ============================================================
// PREDICTIONS — RENDER
// ============================================================

export function renderPredictions(container: HTMLElement): void {
  if (!container) return;
  if (!FEATURES.predictionsUI) return;

  if (!state.wiredContainers.has(container)) {
    _wirePredictions?.(container);
    state.wiredContainers.add(container);
  }

  const hasDebatePreds = state.predictions.length > 0;
  const hasStandalone = state.standaloneQuestions.length > 0;

  if (!hasDebatePreds && !hasStandalone) {
    container.innerHTML = `
      <div style="text-align:center;padding:20px;">
        <div style="color:#6a7a90; /* TODO: needs CSS var token */font-size:13px;margin-bottom:12px;">No active predictions yet.</div>
        <button data-action="create-prediction" style="padding:10px 20px;border-radius:20px;border:1px solid var(--mod-accent-border);background:var(--mod-accent-muted);color:var(--mod-accent);font-family:var(--mod-font-ui);font-size:13px;font-weight:600;letter-spacing:1px;cursor:pointer;">➕ CREATE PREDICTION</button>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 0 8px;">
      <div style="font-family:var(--mod-font-display);font-size:14px;letter-spacing:2px;color:var(--mod-accent);">🔮 PREDICTIONS</div>
      <button data-action="create-prediction" style="padding:5px 12px;border-radius:14px;border:1px solid var(--mod-accent-border);background:var(--mod-accent-muted);color:var(--mod-accent);font-size:11px;font-weight:600;letter-spacing:1px;cursor:pointer;">➕ CREATE</button>
    </div>
    ${state.predictions.map((p) => _renderPredictionCard(p)).join('')}
    ${state.standaloneQuestions.map((q) => _renderStandaloneCard(q)).join('')}`;
}

function _renderPredictionCard(p: Prediction): string {
  const safeTopic = esc(p.topic);
  const safeP1 = esc(p.p1);
  const safeP2 = esc(p.p2);
  const safeDebateId = esc(p.debate_id);
  const isLive = p.status === 'live' || p.status === 'in_progress';

  return `
    <div style="background:#132240; /* TODO: needs CSS var token */border:1px solid var(--mod-accent-muted);border-radius:12px;padding:14px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        ${isLive ? '<span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--mod-magenta);font-weight:600;letter-spacing:1px;"><span style="width:6px;height:6px;background:var(--mod-magenta);border-radius:50%;animation:livePulse 1.5s ease-in-out infinite;"></span>LIVE</span>' : '<span style="font-size:11px;color:var(--mod-accent);letter-spacing:1px;">UPCOMING</span>'}
        <span style="font-size:11px;color:#6a7a90; /* TODO: needs CSS var token */">${Number(p.total)} predictions</span>
      </div>
      <div style="font-family:var(--mod-font-display);font-size:14px;color:var(--mod-text-heading);margin-bottom:12px;line-height:1.3;">${safeTopic}</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button data-action="predict" data-id="${safeDebateId}" data-pick="a" style="
          flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:none;
          background:${p.user_pick === 'a' ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
          border:1px solid ${p.user_pick === 'a' ? 'var(--mod-accent-border)' : 'var(--mod-border-secondary)'};
        ">
          <div style="font-weight:700;font-size:13px;color:var(--mod-text-heading);">${safeP1}</div>
          <div style="font-size:11px;color:#6a7a90; /* TODO: needs CSS var token */">ELO ${Number(p.p1_elo)}</div>
        </button>
        <div style="display:flex;align-items:center;font-family:var(--mod-font-display);font-size:12px;color:var(--mod-magenta);letter-spacing:1px;">VS</div>
        <button data-action="predict" data-id="${safeDebateId}" data-pick="b" style="
          flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:none;
          background:${p.user_pick === 'b' ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
          border:1px solid ${p.user_pick === 'b' ? 'var(--mod-accent-border)' : 'var(--mod-border-secondary)'};
        ">
          <div style="font-weight:700;font-size:13px;color:var(--mod-text-heading);">${safeP2}</div>
          <div style="font-size:11px;color:#6a7a90; /* TODO: needs CSS var token */">ELO ${Number(p.p2_elo)}</div>
        </button>
      </div>
      <div style="position:relative;height:24px;background:var(--mod-bg-subtle);border-radius:12px;overflow:hidden;border:1px solid var(--mod-border-secondary);">
        <div style="position:absolute;left:0;top:0;height:100%;width:${Number(p.pct_a)}%;background:linear-gradient(90deg,var(--mod-accent-border),var(--mod-accent-muted));border-radius:12px 0 0 12px;transition:width 0.5s ease;"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font-size:11px;font-weight:700;">
          <span style="color:var(--mod-accent);">${Number(p.pct_a)}%</span>
          <span style="color:var(--mod-text-sub);">${Number(p.pct_b)}%</span>
        </div>
      </div>
    </div>`;
}

function _renderStandaloneCard(q: StandaloneQuestion): string {
  const safeTopic = esc(q.topic);
  const safeA = esc(q.side_a_label);
  const safeB = esc(q.side_b_label);
  const safeId = esc(q.id);
  const total =
    Number(q.total_picks) || Number(q.picks_a) + Number(q.picks_b) || 0;
  const pctA = total > 0 ? Math.round((Number(q.picks_a) / total) * 100) : 50;
  const pctB = total > 0 ? 100 - pctA : 50;
  const creator = esc(
    q.creator_display_name ?? q.creator_username ?? 'Anonymous'
  );
  const userPick = q._userPick ?? null;

  return `
    <div style="background:#132240; /* TODO: needs CSS var token */border:1px solid var(--mod-accent-muted);border-radius:12px;padding:14px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:11px;color:var(--mod-accent);letter-spacing:1px;">COMMUNITY</span>
        <span style="font-size:11px;color:#6a7a90; /* TODO: needs CSS var token */">${Number(total)} picks · by ${creator}</span>
      </div>
      <div style="font-family:var(--mod-font-display);font-size:14px;color:var(--mod-text-heading);margin-bottom:12px;line-height:1.3;">${safeTopic}</div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button data-action="standalone-pick" data-id="${safeId}" data-pick="a" style="
          flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:none;
          background:${userPick === 'a' ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
          border:1px solid ${userPick === 'a' ? 'var(--mod-accent-border)' : 'var(--mod-border-secondary)'};
        ">
          <div style="font-weight:700;font-size:13px;color:var(--mod-text-heading);">${safeA}</div>
        </button>
        <div style="display:flex;align-items:center;font-family:var(--mod-font-display);font-size:12px;color:var(--mod-magenta);letter-spacing:1px;">VS</div>
        <button data-action="standalone-pick" data-id="${safeId}" data-pick="b" style="
          flex:1;padding:10px 8px;border-radius:10px;cursor:pointer;text-align:center;border:none;
          background:${userPick === 'b' ? 'var(--mod-accent-muted)' : 'var(--mod-bg-subtle)'};
          border:1px solid ${userPick === 'b' ? 'var(--mod-accent-border)' : 'var(--mod-border-secondary)'};
        ">
          <div style="font-weight:700;font-size:13px;color:var(--mod-text-heading);">${safeB}</div>
        </button>
      </div>
      <div style="position:relative;height:24px;background:var(--mod-bg-subtle);border-radius:12px;overflow:hidden;border:1px solid var(--mod-border-secondary);">
        <div style="position:absolute;left:0;top:0;height:100%;width:${pctA}%;background:linear-gradient(90deg,var(--mod-accent-border),var(--mod-accent-muted));border-radius:12px 0 0 12px;transition:width 0.5s ease;"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font-size:11px;font-weight:700;">
          <span style="color:var(--mod-accent);">${Number(pctA)}%</span>
          <span style="color:var(--mod-text-sub);">${Number(pctB)}%</span>
        </div>
      </div>
    </div>`;
}

// ============================================================
// WAGER PICKER
// ============================================================

let _activeWagerDebateId: string | null = null;

export function _showWagerPicker(debateId: string, side: string): void {
  // Remove any existing picker first
  _hideWagerPicker();

  const balance = getCurrentProfile()?.token_balance || 0;
  const pred = state.predictions.find((p) => p.debate_id === debateId);
  if (!pred) return;

  const sideLabel = side === 'a' ? esc(pred.p1) : esc(pred.p2);
  const safeDebateId = esc(debateId);
  const safeSide = side === 'a' ? 'a' : 'b';

  const quickAmounts = [10, 25, 50, 100, 250].filter(a => a <= Math.min(500, balance));

  const pickerHtml = `
    <div id="wager-picker" style="background:var(--mod-bg-card);border:1px solid var(--mod-accent-border);border-radius:10px;padding:14px;margin-top:8px;animation:fadeIn 0.15s ease-out;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-family:var(--mod-font-display);font-size:13px;color:var(--mod-accent);letter-spacing:1px;">WAGER ON ${esc(sideLabel.toUpperCase())}</div>
        <div style="font-size:11px;color:var(--mod-text-sub);">Balance: ${Number(balance)} tokens</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;">
        <input type="number" id="wager-amount-input" min="1" max="${Math.min(500, balance)}" placeholder="1–${Math.min(500, balance)}" style="flex:1;padding:8px 10px;background:var(--mod-bg-base);border:1px solid var(--mod-border-primary);border-radius:6px;color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;outline:none;-moz-appearance:textfield;" />
        ${quickAmounts.map(a => `<button data-action="wager-quick" data-amount="${a}" style="padding:6px 10px;background:var(--mod-bg-subtle);border:1px solid var(--mod-border-secondary);border-radius:6px;color:var(--mod-text-body);font-size:12px;font-family:var(--mod-font-ui);cursor:pointer;">${a}</button>`).join('')}
      </div>
      <div style="display:flex;gap:8px;">
        <button data-action="wager-confirm" data-id="${safeDebateId}" data-pick="${safeSide}" disabled style="flex:1;padding:10px;background:var(--mod-bar-accent);background-image:var(--mod-gloss);border:none;border-radius:8px;color:var(--mod-text-on-accent);font-family:var(--mod-font-ui);font-size:14px;font-weight:600;letter-spacing:1px;cursor:pointer;opacity:0.5;transition:all 0.2s;">CONFIRM WAGER</button>
        <button data-action="wager-cancel" style="padding:10px 16px;background:var(--mod-bg-subtle);border:1px solid var(--mod-border-secondary);border-radius:8px;color:var(--mod-text-sub);font-family:var(--mod-font-ui);font-size:13px;cursor:pointer;">✕</button>
      </div>
      ${balance < 1 ? '<div style="font-size:12px;color:var(--mod-accent);margin-top:8px;">You need at least 1 token to predict.</div>' : ''}
    </div>`;

  // Find the prediction card and append the picker
  const card = document.querySelector(`[data-action="predict"][data-id="${safeDebateId}"]`)?.closest('div[style*="background:#132240"]') as HTMLElement | null;
  if (!card) return;

  // Remove existing picker from any other card
  _activeWagerDebateId = debateId;

  const pickerEl = document.createElement('div');
  pickerEl.id = 'wager-picker-wrapper';
  pickerEl.innerHTML = pickerHtml;
  card.appendChild(pickerEl);

  // Focus the input
  const input = card.querySelector('#wager-amount-input') as HTMLInputElement | null;
  if (input) input.focus();
}

export function _hideWagerPicker(): void {
  _activeWagerDebateId = null;
  const existing = document.getElementById('wager-picker-wrapper');
  if (existing) existing.remove();
}
