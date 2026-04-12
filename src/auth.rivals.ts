/**
 * THE MODERATOR — Auth Rivals (declare, respond, list)
 */

import { getIsPlaceholderMode, safeRpc, isUUID } from './auth.core.ts';
import type { AuthResult, RivalData } from './auth.types.ts';

export async function declareRival(targetId: string, message?: string): Promise<AuthResult & { error?: string }> {
  if (!isUUID(targetId)) return { success: false, error: 'Invalid user ID' };
  if (getIsPlaceholderMode()) return { success: true };
  try {
    const { data, error } = await safeRpc<AuthResult>('declare_rival', {
      p_target_id: targetId,
      p_message: message ?? null,
    });
    if (error) throw error;
    return data ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function respondRival(rivalId: string, accept: boolean): Promise<AuthResult> {
  if (getIsPlaceholderMode()) return { success: true };
  try {
    const { data, error } = await safeRpc<AuthResult>('respond_rival', {
      p_rival_id: rivalId,
      p_accept: accept,
    });
    if (error) throw error;
    return data ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getMyRivals(): Promise<RivalData[]> {
  if (getIsPlaceholderMode()) return [];
  try {
    const { data, error } = await safeRpc<RivalData[]>('get_my_rivals');
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error('getMyRivals error:', e);
    return [];
  }
}
