/**
 * staking.rpc.ts — Staking RPC calls and odds calculation
 *
 * placeStake, getPool, settleStakes, getOdds
 * Extracted from staking.ts (Session 254 track).
 */

import { safeRpc } from './auth.ts';
import { getBalance } from './tokens.ts';
import { isDepthBlocked } from './depth-gate.ts';
import type { StakeResult, PoolData, SettleResult, Odds } from './staking.types.ts';

/** Place a stake on a debate side. */
export async function placeStake(debateId: string, side: string, amount: number | string): Promise<StakeResult> {
  // F-63: Depth gate — block sub-25% users from staking
  if (isDepthBlocked()) {
    return { success: false, error: 'Profile incomplete' };
  }

  if (!debateId || !side) {
    return { success: false, error: 'Missing required fields' };
  }

  const parsedAmount = Number.parseInt(String(amount), 10);
  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return { success: false, error: 'Amount must be a positive number' };
  }

  const bal = getBalance();
  if (bal != null && parsedAmount > bal) {
    return { success: false, error: `Insufficient balance (${bal.toLocaleString()} tokens)` };
  }

  const result = await safeRpc<StakeResult>('place_stake', {
    p_debate_id: debateId,
    p_side: side,
    p_amount: parsedAmount,
  });

  if (result.error) {
    return { success: false, error: result.error.message ?? 'Stake failed' };
  }

  return result.data ?? { success: false, error: 'No response' };
}

/** Get current pool state for a debate. */
export async function getPool(debateId: string): Promise<PoolData> {
  const emptyPool: PoolData = { exists: false, total_side_a: 0, total_side_b: 0, pool_status: 'none', user_stake: null };

  const result = await safeRpc<PoolData>('get_stake_pool', {
    p_debate_id: debateId,
  });

  if (result.error) return emptyPool;
  return result.data ?? emptyPool;
}

/** Settle stakes after debate completion. Parimutuel payout.
 *  Session 230: winner and multiplier params removed — SQL reads winner
 *  from arena_debates.winner (authoritative) and multiplier is hardcoded
 *  to 1 server-side. Client never determines payout math. */
export async function settleStakes(debateId: string): Promise<SettleResult> {
  const result = await safeRpc<SettleResult>('settle_stakes', {
    p_debate_id: debateId,
  });

  if (result.error) {
    console.error('[Staking] settle error:', result.error);
    return { success: false, error: result.error.message };
  }

  return result.data ?? { success: false, error: 'No response' };
}

/** Calculate implied odds from pool totals. */
export function getOdds(totalA: number, totalB: number): Odds {
  const total = totalA + totalB;
  if (total === 0) return { a: 50, b: 50, multiplierA: '2.00', multiplierB: '2.00' };

  const pctA = Math.round((totalA / total) * 100);
  const pctB = 100 - pctA;

  const multA = totalA > 0 ? (total / totalA).toFixed(2) : '∞';
  const multB = totalB > 0 ? (total / totalB).toFixed(2) : '∞';

  return { a: pctA, b: pctB, multiplierA: multA, multiplierB: multB };
}
