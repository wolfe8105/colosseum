/**
 * THE MODERATOR — Rivals Presence Popup (F-25)
 *
 * Queue + popup flow for rival-online alerts.
 * Takes a PopupState accessor object to avoid an import cycle back to the orchestrator.
 * Imports injectRivalsPresenceCSS from the CSS leaf module.
 */

import { injectRivalsPresenceCSS } from './rivals-presence-css.ts';

// Redeclared locally to avoid importing up to orchestrator (structural typing keeps them compatible).
interface PresencePayload {
  user_id: string;
  username: string | null;
  display_name: string | null;
}

export interface PopupState {
  queue: PresencePayload[];
  active: boolean;
}

// ============================================================
// POPUP DOM
// ============================================================

export function dismissPopup(state: PopupState): void {
  const popup = document.getElementById('rival-alert-popup');
  // LANDMINE [LM-RIVALS-004]: If popup is already gone, returns without setting
  // state.active = false. Any subsequent queueAlert call sees active === true and silently
  // queues without ever showing. Only recovery is destroy(). (catalogued M-E7)
  if (!popup) return;
  popup.classList.add('dismissing');
  // LANDMINE [LM-RIVALS-003]: setTimeout handles below are anonymous — never stored.
  // If destroy() is called while dismiss animation is in flight, these timers still fire
  // and call showNext() against torn-down state. Fix: store IDs and clear in destroy().
  // (catalogued M-E6)
  setTimeout(() => {
    popup.remove();
    state.active = false;
    if (state.queue.length > 0) {
      setTimeout(() => showNext(state), 600);
    }
  }, 300);
}

export function showNext(state: PopupState): void {
  const payload = state.queue.shift();
  if (!payload) { state.active = false; return; }

  state.active = true;
  injectRivalsPresenceCSS();

  const existing = document.getElementById('rival-alert-popup');
  if (existing) existing.remove();

  const displayName = payload.display_name ?? payload.username ?? 'YOUR RIVAL';
  // LANDMINE [LM-RIVALS-001]: safeName strips < and > but does NOT escape ", ', or &.
  // Interpolated directly into innerHTML — real XSS surface, violates CLAUDE.md escapeHTML()
  // rule. Fix: replace regex strip with escapeHTML() from config.ts. (catalogued M-E4)
  const safeName = displayName.toUpperCase().replace(/[<>]/g, '');

  const popup = document.createElement('div');
  popup.id = 'rival-alert-popup';
  popup.innerHTML = `
    <div class="rap-icon">⚔️</div>
    <div class="rap-title">RIVAL ALERT</div>
    <div class="rap-name">${safeName}</div>
    <div class="rap-sub">is online and ready to fight</div>
    <div class="rap-actions">
      <button class="rap-challenge" id="rap-challenge-btn">CHALLENGE</button>
      <button class="rap-dismiss" id="rap-dismiss-btn">LATER</button>
    </div>
  `;
  document.body.appendChild(popup);

  // Auto-dismiss after 8s
  const timer = setTimeout(() => dismissPopup(state), 8000);

  document.getElementById('rap-dismiss-btn')?.addEventListener('click', () => {
    clearTimeout(timer);
    dismissPopup(state);
  });

  document.getElementById('rap-challenge-btn')?.addEventListener('click', () => {
    clearTimeout(timer);
    dismissPopup(state);
    // Open their profile modal — challenge link (F-39) not built yet
    if (payload.user_id) {
      // LANDMINE [LM-RIVALS-006]: Dynamic import('./auth.ts') is redundant — auth.ts is
      // already statically loaded at page init. Could be added to static imports. Cosmetic.
      // (catalogued L-E1)
      import('./auth.ts').then(({ showUserProfile }) => {
        showUserProfile(payload.user_id, payload.username ?? undefined);
      }).catch((e) => console.warn('[Rivals] showUserProfile import failed:', e));
    }
  });
}

export function queueAlert(payload: PresencePayload, state: PopupState): void {
  state.queue.push(payload);
  if (!state.active) showNext(state);
}
