/**
 * THE MODERATOR — Async Module: Orchestrator (TypeScript)
 *
 * F-68: Hot takes removed. Predictions + rivals remain.
 * This module will be further decomposed when predictions and rivals
 * get their own top-level modules.
 *
 * Sub-modules:
 *   async.types.ts      — interfaces, type aliases
 *   async.state.ts      — shared mutable state object
 *   async.utils.ts      — _timeAgo, _enterArenaWithTopic
 *   async.fetch.ts      — fetchPredictions, fetchStandaloneQuestions
 *   async.render.ts     — renderPredictions, wager picker
 *   async.actions.ts    — placePrediction, etc.
 *   async.rivals.ts     — renderRivals, refreshRivals
 *
 * Depends on: config.ts, auth.ts
 */

// ============================================================
// IMPORTS — sub-modules
// ============================================================

import { state } from './async.state.ts';
import { PLACEHOLDER_PREDICTIONS } from './async.state.ts';
import {
  renderPredictions,
  _hideWagerPicker,
} from './async.render.ts';
import {
  placePrediction,
  pickStandaloneQuestion,
  openCreatePredictionForm,
} from './async.actions.ts';
import {
  fetchPredictions,
  fetchStandaloneQuestions,
} from './async.fetch.ts';
import {
  renderRivals,
  refreshRivals,
} from './async.rivals.ts';

// ============================================================
// IMPORTS — external dependencies
// ============================================================

import { FEATURES } from './config.ts';
import { ready } from './auth.ts';

// ============================================================
// RE-EXPORT — types (type-only)
// ============================================================

export type {
  Prediction,
  StandaloneQuestion,
  RivalEntry,
} from './async.types.ts';

// ============================================================
// RE-EXPORT — functions from sub-modules
// ============================================================

export {
  fetchPredictions,
  fetchStandaloneQuestions,
} from './async.fetch.ts';

export {
  renderPredictions,
} from './async.render.ts';

export {
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
  state.predictions = [...PLACEHOLDER_PREDICTIONS];
}

// ============================================================
// MODERATOR ASYNC FACADE
// ============================================================

export const ModeratorAsync = {
  fetchPredictions,
  fetchStandaloneQuestions,
  renderPredictions,
  placePrediction,
  renderRivals,
  refreshRivals,
  get predictions() {
    return state.predictions;
  },
} as const;

// ============================================================
// DESTROY — call on page teardown / hot-nav away
// ============================================================

export function destroy(): void {
  _hideWagerPicker();
  state.predictions = [];
  state.standaloneQuestions = [];
  state.predictingInFlight.clear();
}

// ============================================================
// AUTO-INIT
// ============================================================

ready.then(() => init());
