/**
 * staking.types.ts — Token staking type definitions
 *
 * Extracted from staking.ts (Session 254 track).
 */

export interface StakeResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface PoolData {
  exists: boolean;
  total_side_a: number;
  total_side_b: number;
  pool_status: string;
  user_stake: UserStake | null;
}

export interface UserStake {
  side: 'a' | 'b';
  amount: number;
  [key: string]: unknown;
}

export interface Odds {
  a: number;
  b: number;
  multiplierA: string;
  multiplierB: string;
}

export interface SettleResult {
  success: boolean;
  error?: string;
  payout?: number;
  [key: string]: unknown;
}
