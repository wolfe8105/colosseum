/**
 * THE MODERATOR — Power-Up System (TypeScript)
 *
 * Refactored: split into types, rpc, shop, loadout, activation, overlays sub-modules.
 *
 * Migration: Session 126 (Phase 2). Window bridge: Session 140.
 */

export type { PowerUpId, PowerUpCatalogEntry, PowerUpResult, InventoryItem, EquippedItem, MyPowerUpsResult, ActivationCallbacks } from './powerups.types.ts';
export { CATALOG } from './powerups.types.ts';
export { buy, equip, activate, getMyPowerUps, getOpponentPowerUps } from './powerups.rpc.ts';
export { renderShop } from './powerups.shop.ts';
export { renderLoadout, wireLoadout } from './powerups.loadout.ts';
export { renderActivationBar, wireActivationBar } from './powerups.activation.ts';
export { renderSilenceOverlay, renderRevealPopup, renderShieldIndicator, removeShieldIndicator, hasMultiplier } from './powerups.overlays.ts';

import { CATALOG } from './powerups.types.ts';
import { buy, equip, activate, getMyPowerUps, getOpponentPowerUps } from './powerups.rpc.ts';
import { renderShop } from './powerups.shop.ts';
import { renderLoadout, wireLoadout } from './powerups.loadout.ts';
import { renderActivationBar, wireActivationBar } from './powerups.activation.ts';
import { renderSilenceOverlay, renderRevealPopup, renderShieldIndicator, removeShieldIndicator, hasMultiplier } from './powerups.overlays.ts';

const powerups = {
  CATALOG, buy, equip, activate, getMyPowerUps, getOpponentPowerUps,
  renderShop, renderLoadout, wireLoadout, renderActivationBar, wireActivationBar,
  renderSilenceOverlay, renderRevealPopup, renderShieldIndicator, removeShieldIndicator, hasMultiplier,
} as const;

export default powerups;
