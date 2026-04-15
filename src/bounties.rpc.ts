/**
 * THE MODERATOR — Bounty RPC Wrappers
 * postBounty, cancelBounty, getMyBounties, getOpponentBounties,
 * selectBountyClaim, bountySlotLimit.
 */

import { safeRpc, getIsPlaceholderMode } from './auth.ts';
import type { AuthResult } from './auth.types.ts';
import type { PostBountyResult, MyBountiesResult, OpponentBounty, SelectClaimResult } from './bounties.types.ts';

export async function postBounty(targetId: string, amount: number, durationDays: number): Promise<PostBountyResult> {
  if (getIsPlaceholderMode()) return { success: true, bounty_id: 'placeholder' };
  try {
    const { data, error } = await safeRpc<PostBountyResult>('post_bounty', {
      p_target_id: targetId, p_amount: amount, p_duration_days: durationDays,
    });
    if (error) throw error;
    return data ?? { success: true };
  } catch (e) { return { success: false, error: (e as Error).message }; }
}

export async function cancelBounty(bountyId: string): Promise<AuthResult & { refund?: number; burned?: number }> {
  if (getIsPlaceholderMode()) return { success: true };
  try {
    const { data, error } = await safeRpc<AuthResult & { refund?: number; burned?: number }>('cancel_bounty', { p_bounty_id: bountyId });
    if (error) throw error;
    return data ?? { success: true };
  } catch (e) { return { success: false, error: (e as Error).message }; }
}

export async function getMyBounties(): Promise<MyBountiesResult> {
  if (getIsPlaceholderMode()) return { incoming: [], outgoing: [] };
  try {
    const { data, error } = await safeRpc<MyBountiesResult>('get_my_bounties');
    if (error) throw error;
    return data ?? { incoming: [], outgoing: [] };
  } catch (e) { console.error('[Bounties] getMyBounties error:', e); return { incoming: [], outgoing: [] }; }
}

export async function getOpponentBounties(opponentId: string): Promise<OpponentBounty[]> {
  if (getIsPlaceholderMode()) return [];
  try {
    const { data, error } = await safeRpc<OpponentBounty[]>('get_opponent_bounties', { p_opponent_id: opponentId });
    if (error) throw error;
    return data ?? [];
  } catch (e) { console.warn('[Bounties] getOpponentBounties error:', e); return []; }
}

export async function selectBountyClaim(bountyId: string, debateId: string): Promise<SelectClaimResult> {
  if (getIsPlaceholderMode()) return { success: true };
  try {
    const { data, error } = await safeRpc<SelectClaimResult>('select_bounty_claim', {
      p_bounty_id: bountyId, p_debate_id: debateId,
    });
    if (error) throw error;
    return data ?? { success: true };
  } catch (e) { return { success: false, error: (e as Error).message }; }
}

export function bountySlotLimit(depthPct: number): number {
  if (depthPct >= 75) return 6;
  if (depthPct >= 65) return 5;
  if (depthPct >= 55) return 4;
  if (depthPct >= 45) return 3;
  if (depthPct >= 35) return 2;
  if (depthPct >= 25) return 1;
  return 0;
}
