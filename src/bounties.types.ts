/**
 * THE MODERATOR — Bounty Types
 */

import type { AuthResult } from './auth.types.ts';
export type { AuthResult };

export interface BountyRow {
  id: string;
  poster_id?: string;
  poster_username?: string;
  target_id?: string;
  target_username?: string;
  amount: number;
  duration_days: number;
  duration_fee: number;
  status: 'open' | 'claimed' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
}

export interface OpponentBounty {
  bounty_id: string;
  poster_id: string;
  amount: number;
  duration_days: number;
  expires_at: string;
  attempt_fee: number;
}

export interface MyBountiesResult {
  incoming: BountyRow[];
  outgoing: BountyRow[];
}

export interface PostBountyResult extends AuthResult {
  bounty_id?: string;
}

export interface SelectClaimResult extends AuthResult {
  attempt_fee?: number;
  bounty_amount?: number;
}
