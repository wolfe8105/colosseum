/**
 * THE MODERATOR — Async Module: Rendering (barrel)
 *
 * Thin orchestrator. Owns _registerWiring() which distributes wiring
 * callbacks into the takes and predictions sub-modules.
 *
 * LANDMINE [LM-ASYNCRENDER-001]: Split map placed _registerWiring in
 * async.render.takes.ts alongside _wireTakes/_wirePredictions. That would
 * require takes.ts to import _setWirePredictions from predictions.ts —
 * a sibling import violating the dependency rules. Moved _registerWiring
 * to the barrel instead; each sub-module owns its own wire var + setter.
 */

import type { WireFn } from './async.render.takes.ts';
import { _setWireTakes, loadHotTakes } from './async.render.takes.ts';
import { _setWirePredictions, renderPredictions } from './async.render.predictions.ts';
import { _showWagerPicker, _hideWagerPicker } from './async.render.wager.ts';

export function _registerWiring(takes: WireFn, predictions: WireFn): void {
  _setWireTakes(takes);
  _setWirePredictions(predictions);
}

export { loadHotTakes };
export { renderPredictions };
export { _showWagerPicker, _hideWagerPicker };
