/**
 * THE MODERATOR — Async Module: Rendering (barrel)
 *
 * F-68: Hot take rendering removed. Only predictions + wager picker remain.
 */

import { _setWirePredictions, renderPredictions } from './async.render.predictions.ts';
import { _showWagerPicker, _hideWagerPicker } from './async.render.wager.ts';

export type WireFn = (container: HTMLElement) => void;

export function _registerWiring(_takes: WireFn, predictions: WireFn): void {
  _setWirePredictions(predictions);
}

export { renderPredictions };
export { _showWagerPicker, _hideWagerPicker };
