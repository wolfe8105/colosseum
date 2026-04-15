/**
 * THE MODERATOR — F-57 Modifier UX Handlers
 * Thin wrappers that call the RPC layer and fire toast feedback.
 */

import { showToast } from './config.ts';
import { buyModifier, buyPowerup, equipPowerupForDebate } from './modifiers-rpc.ts';

/**
 * Buy flow helper — handles confirm + toast feedback.
 * Used by the F-10 shop UI once built.
 */
export async function handleBuyModifier(effectId: string, effectName: string): Promise<boolean> {
  const res = await buyModifier(effectId);
  if (res.success) {
    showToast(`${effectName} modifier added to inventory`, 'success');
    return true;
  }
  showToast(res.error ?? 'Purchase failed', 'error');
  return false;
}

export async function handleBuyPowerup(
  effectId: string,
  effectName: string,
  quantity = 1,
): Promise<boolean> {
  const res = await buyPowerup(effectId, quantity);
  if (res.success) {
    showToast(`${effectName} ×${quantity} added to inventory`, 'success');
    return true;
  }
  showToast(res.error ?? 'Purchase failed', 'error');
  return false;
}

export async function handleEquip(
  debateId: string,
  effectId: string,
  effectName: string,
): Promise<boolean> {
  const res = await equipPowerupForDebate(debateId, effectId);
  if (res.success) {
    showToast(`${effectName} equipped (slot ${res.slots_used}/3)`, 'success');
    return true;
  }
  showToast(res.error ?? 'Equip failed', 'error');
  return false;
}
