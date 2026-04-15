/**
 * THE MODERATOR — Power-Up RPC Functions
 * buy, equip, activate, getMyPowerUps, getOpponentPowerUps.
 */

import { safeRpc } from './auth.ts';
import { getBalance } from './tokens.ts';
import type { PowerUpResult, MyPowerUpsResult, EquippedItem } from './powerups.types.ts';

export async function buy(powerUpId: string, quantity = 1, cost?: number): Promise<PowerUpResult> {
  if (cost != null) {
    const bal = getBalance();
    if (bal != null && cost > bal) return { success: false, error: `Insufficient balance (${bal.toLocaleString()} tokens)` };
  }
  const result = await safeRpc<PowerUpResult>('buy_power_up', { p_power_up_id: powerUpId, p_quantity: quantity });
  if (result.error) return { success: false, error: (result.error as { message?: string }).message ?? 'Purchase failed' };
  return result.data ?? { success: false, error: 'No response' };
}

export async function equip(debateId: string, powerUpId: string, slotNumber: number): Promise<PowerUpResult> {
  const result = await safeRpc<PowerUpResult>('equip_power_up', { p_debate_id: debateId, p_power_up_id: powerUpId, p_slot_number: slotNumber });
  if (result.error) return { success: false, error: (result.error as { message?: string }).message ?? 'Equip failed' };
  return result.data ?? { success: false, error: 'No response' };
}

export async function activate(debateId: string, powerUpId: string): Promise<PowerUpResult> {
  const result = await safeRpc<PowerUpResult>('activate_power_up', { p_debate_id: debateId, p_power_up_id: powerUpId });
  if (result.error) return { success: false, error: (result.error as { message?: string }).message ?? 'Activation failed' };
  return result.data ?? { success: false, error: 'No response' };
}

export async function getMyPowerUps(debateId: string | null = null): Promise<MyPowerUpsResult> {
  const empty: MyPowerUpsResult = { success: false, inventory: [], equipped: [], questions_answered: 0 };
  const params: Record<string, unknown> = {};
  if (debateId) params.p_debate_id = debateId;
  const result = await safeRpc<MyPowerUpsResult>('get_my_power_ups', params);
  if (result.error) return empty;
  return result.data ?? empty;
}

export async function getOpponentPowerUps(debateId: string): Promise<{ success: boolean; equipped: EquippedItem[] }> {
  const result = await safeRpc<{ success: boolean; equipped: EquippedItem[] }>('get_opponent_power_ups', { p_debate_id: debateId });
  if (result.error) return { success: false, equipped: [] };
  return result.data ?? { success: false, equipped: [] };
}
