/**
 * THE MODERATOR — F-57 Modifier RPC Wrappers
 * Pure safeRpc wrappers. No DOM, no rendering, no toasts.
 */

import { safeRpc } from './auth.ts';
import type { UserInventory } from './modifiers.ts';

// LANDMINE [LM-MODS-002]: Every function casts `result.data as T` without runtime
// validation. If the RPC response shape ever drifts from the TS interface, consumers
// will crash with confusing "undefined is not a function" errors instead of clean
// "shape mismatch" errors. Candidate for Zod runtime validators in a follow-up.

/**
 * Purchase a permanent modifier (one item per call).
 * Returns modifier_id on success.
 */
export async function buyModifier(effectId: string): Promise<{
  success: boolean;
  modifier_id?: string;
  cost?: number;
  error?: string;
}> {
  const result = await safeRpc('buy_modifier', { p_effect_id: effectId });
  if (result.error) {
    return { success: false, error: result.error.message ?? String(result.error) };
  }
  return result.data as { success: boolean; modifier_id?: string; cost?: number; error?: string };
}

/**
 * Purchase power-up consumables (quantity 1–99).
 * Returns new_quantity on success.
 */
export async function buyPowerup(effectId: string, quantity = 1): Promise<{
  success: boolean;
  new_quantity?: number;
  cost?: number;
  error?: string;
}> {
  const result = await safeRpc('buy_powerup', {
    p_effect_id: effectId,
    p_quantity: quantity,
  });
  if (result.error) {
    return { success: false, error: result.error.message ?? String(result.error) };
  }
  return result.data as { success: boolean; new_quantity?: number; cost?: number; error?: string };
}

/**
 * Permanently socket a modifier into a reference.
 * socket_index is 0-based (slot 1 = index 0).
 */
export async function socketModifier(
  referenceId: string,
  socketIndex: number,
  modifierId: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await safeRpc('socket_modifier', {
    p_reference_id: referenceId,
    p_socket_index: socketIndex,
    p_modifier_id: modifierId,
  });
  if (result.error) {
    return { success: false, error: result.error.message ?? String(result.error) };
  }
  return result.data as { success: boolean; error?: string };
}

/**
 * Equip a power-up for an upcoming debate.
 * Deducts 1 from inventory immediately. Max 3 per debate.
 */
export async function equipPowerupForDebate(
  debateId: string,
  effectId: string,
): Promise<{ success: boolean; slots_used?: number; error?: string }> {
  const result = await safeRpc('equip_powerup_for_debate', {
    p_debate_id: debateId,
    p_effect_id: effectId,
  });
  if (result.error) {
    return { success: false, error: result.error.message ?? String(result.error) };
  }
  return result.data as { success: boolean; slots_used?: number; error?: string };
}

/**
 * Load the caller's full modifier inventory.
 * Pass debateId to also get equipped loadout for that debate.
 */
export async function getUserInventory(debateId?: string): Promise<UserInventory | null> {
  const result = await safeRpc('get_user_modifier_inventory', {
    p_debate_id: debateId ?? null,
  });
  if (result.error) {
    console.error('[Modifiers] inventory fetch failed:', result.error);
    return null;
  }
  return result.data as UserInventory;
}
