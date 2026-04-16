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
 *   async.wiring.ts  — _wireTakeDelegation, _wirePredictionDelegation, _wireRivalDelegation
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
  _hideWagerPicker,
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
} from './async.rivals.ts';

// Side-effect import — registers delegation wiring at module load time
import './async.wiring.ts';

// ============================================================
// IMPORTS — external dependencies
// ============================================================

import { FEATURES } from './config.ts';
import { ready } from './auth.ts';

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
    <div style="background:#132240; /* TODO: needs CSS var token */ border:1px solid var(--mod-accent-muted);border-radius:12px;padding:14px;margin-bottom:16px;">
      <textarea id="hot-take-input" placeholder="Drop a hot take..." style="
        width:100%;background:var(--mod-bg-card);border:1px solid var(--mod-border-secondary);border-radius:10px;
        color:var(--mod-text-heading);padding:12px;font-size:14px;resize:none;height:60px;
        font-family:var(--mod-font-ui);margin-bottom:8px;box-sizing:border-box;
      " maxlength="280"></textarea>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div id="take-char-count" style="font-size:11px;color:#6a7a90; /* TODO: needs CSS var token */">0 / 280</div>
        <button data-action="post-take" style="
          background:var(--mod-magenta);color:var(--mod-text-on-accent);border:none;border-radius:8px;
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
