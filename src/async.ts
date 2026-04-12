/**
 * THE MODERATOR — Async Module: Orchestrator (TypeScript)
 *
 * Thin orchestrator that wires delegation, re-exports the public API,
 * and handles init/destroy lifecycle.
 *
 * Sub-modules:
 *   async.types.ts   — interfaces, type aliases
 *   async.state.ts   — shared mutable state object
 *   async.utils.ts   — _timeAgo, _enterArenaWithTopic
 *   async.fetch.ts   — fetchTakes, fetchPredictions, fetchStandaloneQuestions
 *   async.render.ts  — loadHotTakes, renderPredictions, wager picker
 *   async.actions.ts — react, challenge, postTake, placePrediction, etc.
 *   async.rivals.ts  — renderRivals, refreshRivals
 *
 * Depends on: config.ts, auth.ts, share.ts, tokens.ts
 */

// ============================================================
// IMPORTS — sub-modules
// ============================================================

import { state } from './async.state.ts';
import { PLACEHOLDER_TAKES, PLACEHOLDER_PREDICTIONS } from './async.state.ts';
import {
  loadHotTakes,
  renderPredictions,
  _showWagerPicker,
  _hideWagerPicker,
  _registerWiring,
} from './async.render.ts';
import {
  react,
  challenge,
  postTake,
  _submitChallenge,
  placePrediction,
  pickStandaloneQuestion,
  openCreatePredictionForm,
} from './async.actions.ts';
import {
  fetchTakes,
  fetchPredictions,
  fetchStandaloneQuestions,
} from './async.fetch.ts';
import {
  renderRivals,
  refreshRivals,
  _registerRivalWiring,
} from './async.rivals.ts';

// ============================================================
// IMPORTS — external dependencies
// ============================================================

import { showToast, FEATURES } from './config.ts';
import {
  getCurrentProfile,
  requireAuth,
  showUserProfile,
  respondRival,
  toggleModerator,
  ready,
} from './auth.ts';
import { shareTake } from './share.ts';
import { getBalance } from './tokens.ts';

// ============================================================
// RE-EXPORT — types (type-only)
// ============================================================

export type {
  HotTake,
  Prediction,
  StandaloneQuestion,
  RivalEntry,
  ReactResult,
  CreateHotTakeResult,
  CategoryFilter,
} from './async.types.ts';

// ============================================================
// RE-EXPORT — functions from sub-modules
// ============================================================

export {
  fetchTakes,
  fetchPredictions,
  fetchStandaloneQuestions,
} from './async.fetch.ts';

export {
  loadHotTakes,
  renderPredictions,
} from './async.render.ts';

export {
  react,
  challenge,
  _submitChallenge,
  postTake,
  placePrediction,
  pickStandaloneQuestion,
  openCreatePredictionForm,
} from './async.actions.ts';

export {
  renderRivals,
  refreshRivals,
} from './async.rivals.ts';

// ============================================================
// DELEGATION WIRING
// ============================================================

function _wireTakeDelegation(container: HTMLElement): void {
  container.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest(
      '[data-action]'
    ) as HTMLElement | null;
    if (!btn) return;
    const action = btn.dataset['action'];
    if (action === 'react') react(btn.dataset['id'] ?? '');
    else if (action === 'challenge') challenge(btn.dataset['id'] ?? '');
    else if (action === 'share')
      shareTake(btn.dataset['id'] ?? '', btn.dataset['text'] ?? '');
    else if (action === 'become-mod') {
      void toggleModerator(true).then((result) => {
        if (!result.error) {
          showToast('🧑‍⚖️ You are now a Moderator!', 'success');
          loadHotTakes(state.currentFilter);
        }
      });
    } else if (action === 'mod-signup') {
      window.location.href = 'moderator-plinko.html';
    } else if (action === 'expand') {
      const card = btn.closest('.mod-card');
      if (!card) return;
      const textEl = card.querySelector(
        '[data-action="expand"]'
      ) as HTMLElement | null;
      if (textEl) {
        textEl.style.display = '';
        textEl.style.webkitLineClamp = 'unset';
        textEl.style.overflow = 'visible';
      }
      const moreEl = card.querySelectorAll('[data-action="expand"]')[1] as
        | HTMLElement
        | undefined;
      if (moreEl && moreEl.textContent?.includes('tap')) moreEl.remove();
    } else if (action === 'profile') {
      if (btn.dataset['username'])
        window.location.href =
          '/u/' + encodeURIComponent(btn.dataset['username']);
      else showUserProfile(btn.dataset['userId'] ?? '');
    }
  });
}

function _wirePredictionDelegation(container: HTMLElement): void {
  container.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest(
      '[data-action]'
    ) as HTMLElement | null;
    if (!btn) return;
    const action = btn.dataset['action'];
    if (action === 'predict') {
      if (!requireAuth('place predictions')) return;
      _showWagerPicker(btn.dataset['id'] ?? '', btn.dataset['pick'] ?? '');
    } else if (action === 'wager-quick') {
      const input = container.querySelector('#wager-amount-input') as HTMLInputElement | null;
      if (input) {
        input.value = btn.dataset['amount'] ?? '';
        input.dispatchEvent(new Event('input'));
      }
    } else if (action === 'wager-confirm') {
      const input = container.querySelector('#wager-amount-input') as HTMLInputElement | null;
      const amount = input ? parseInt(input.value, 10) : 0;
      const debateId = btn.dataset['id'] ?? '';
      const pick = btn.dataset['pick'] ?? '';
      if (amount >= 1 && amount <= 500 && debateId && pick) {
        const bal = getBalance();
        if (bal != null && amount > bal) {
          showToast(`Insufficient balance (${bal.toLocaleString()} tokens)`, 'error');
          return;
        }
        void placePrediction(debateId, pick, amount);
      }
    } else if (action === 'wager-cancel') {
      _hideWagerPicker();
    } else if (action === 'standalone-pick') {
      void pickStandaloneQuestion(
        btn.dataset['id'] ?? '',
        btn.dataset['pick'] ?? ''
      );
    } else if (action === 'create-prediction') {
      openCreatePredictionForm();
    }
  });

  container.addEventListener('input', (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.id !== 'wager-amount-input') return;
    const amount = parseInt(input.value, 10);
    const confirmBtn = container.querySelector('[data-action="wager-confirm"]') as HTMLButtonElement | null;
    if (!confirmBtn) return;
    const balance = getCurrentProfile()?.token_balance || 0;
    const valid = amount >= 1 && amount <= 500 && amount <= balance;
    confirmBtn.disabled = !valid;
    confirmBtn.style.opacity = valid ? '1' : '0.5';
  });
}

function _wireRivalDelegation(container: HTMLElement): void {
  container.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest(
      '[data-action]'
    ) as HTMLElement | null;
    if (!btn) return;
    if (btn.dataset['action'] === 'profile') {
      if (btn.dataset['username'])
        window.location.href =
          '/u/' + encodeURIComponent(btn.dataset['username']);
      else showUserProfile(btn.dataset['userId'] ?? '');
    } else if (btn.dataset['action'] === 'accept-rival') {
      respondRival(btn.dataset['id'] ?? '', true).then(() =>
        void refreshRivals()
      );
    }
  });
}

// Register wiring callbacks with render/rivals modules
_registerWiring(_wireTakeDelegation, _wirePredictionDelegation);
_registerRivalWiring(_wireRivalDelegation);

// ============================================================
// INIT
// ============================================================

export function init(): void {
  if (!FEATURES.asyncDebates) return;
  state.hotTakes = [...PLACEHOLDER_TAKES.all!];
  state.predictions = [...PLACEHOLDER_PREDICTIONS];
}

// ============================================================
// COMPOSER
// ============================================================

export function getComposerHTML(): string {
  return `
    <div style="background:#132240;border:1px solid var(--mod-accent-muted);border-radius:12px;padding:14px;margin-bottom:16px;">
      <textarea id="hot-take-input" placeholder="Drop a hot take..." style="
        width:100%;background:var(--mod-bg-card);border:1px solid var(--mod-border-secondary);border-radius:10px;
        color:var(--mod-text-heading);padding:12px;font-size:14px;resize:none;height:60px;
        font-family:var(--mod-font-ui);margin-bottom:8px;box-sizing:border-box;
      " maxlength="280"></textarea>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div id="take-char-count" style="font-size:11px;color:#6a7a90;">0 / 280</div>
        <button data-action="post-take" style="
          background:var(--mod-magenta);color:#fff;border:none;border-radius:8px;
          padding:8px 20px;font-family:var(--mod-font-display);font-size:14px;
          letter-spacing:1px;cursor:pointer;
        ">POST</button>
      </div>
    </div>`;
}

// ============================================================
// MODERATOR ASYNC FACADE
// ============================================================

export const ModeratorAsync = {
  loadHotTakes,
  fetchTakes,
  fetchPredictions,
  fetchStandaloneQuestions,
  renderPredictions,
  placePrediction,
  renderRivals,
  refreshRivals,
  react,
  challenge,
  postTake,
  getComposerHTML,
  _submitChallenge,
  get predictions() {
    return state.predictions;
  },
} as const;

// ============================================================
// DOCUMENT-LEVEL DELEGATION — post-take button
// Named reference so destroy() can remove it cleanly.
// ============================================================

const _onDocClick = (e: Event): void => {
  const btn = (e.target as HTMLElement).closest('[data-action="post-take"]');
  if (btn) void postTake();
};

document.addEventListener('click', _onDocClick);

// ============================================================
// DESTROY — call on page teardown / hot-nav away
// ============================================================

export function destroy(): void {
  document.removeEventListener('click', _onDocClick);
  _hideWagerPicker();
  state.hotTakes = [];
  state.predictions = [];
  state.standaloneQuestions = [];
  state.currentFilter = 'all';
  state.pendingChallengeId = null;
  state.reactingIds.clear();
  state.postingInFlight = false;
  state.challengeInFlight = false;
  state.predictingInFlight.clear();
}

// ============================================================
// AUTO-INIT
// ============================================================

ready.then(() => init());
