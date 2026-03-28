/**
 * THE MODERATOR — Scoring Module (TypeScript)
 *
 * Runtime module (replaces moderator-scoring.js).
 * Voting + predictions — all server-side via safeRpc.
 *
 * Migration: Session 127 (Phase 3). ES imports: Session 140.
 */

import { safeRpc, getIsPlaceholderMode } from './auth.ts';
import type { SafeRpcResult } from './auth.ts';
import { UUID_RE } from './config.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface CastVoteParams {
  debateId: string;
  votedFor: string;
  round?: number | null;
}

export interface CastVoteResult {
  success: boolean;
  vote_count_a: number;
  vote_count_b: number;
  your_vote: string;
}

export interface PlacePredictionParams {
  debateId: string;
  predictedWinnerId: string;
  amount: number;
}

export interface PlacePredictionResult {
  success: boolean;
  amount: number;
  new_balance: number;
}

// ============================================================
// UUID VALIDATION
// ============================================================

/** Validate UUID format before use in PostgREST .or() filter (Session 17 bug fix) */
export function validateUUID(id: string): string {
  if (!id || !UUID_RE.test(id)) throw new Error('Invalid user ID format');
  return id;
}

// ============================================================
// HELPERS
// ============================================================

function isPlaceholder(): boolean {
  return getIsPlaceholderMode();
}

// ============================================================
// VOTING (server-side only)
// ============================================================

export async function castVote(
  debateId: string,
  votedFor: string,
  round: number | null = null
): Promise<CastVoteResult> {
  if (isPlaceholder()) {
    return { success: true, vote_count_a: 5, vote_count_b: 3, your_vote: votedFor };
  }

  const { data, error } = await safeRpc<CastVoteResult>('cast_vote', {
    p_debate_id: debateId,
    p_voted_for: votedFor,
    p_round: round,
  });

  if (error) throw new Error(error.message);
  return data as CastVoteResult;
}

// ============================================================
// PREDICTIONS
// ============================================================

export async function placePrediction(
  debateId: string,
  predictedWinnerId: string,
  amount: number
): Promise<PlacePredictionResult> {
  if (isPlaceholder()) {
    return { success: true, amount, new_balance: 50 - amount };
  }

  const { data, error } = await safeRpc<PlacePredictionResult>('place_prediction', {
    p_debate_id: debateId,
    p_predicted_winner: predictedWinnerId,
    p_amount: amount,
  });

  if (error) throw new Error(error.message);
  return data as PlacePredictionResult;
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

const scoring = {
  castVote,
  placePrediction,
} as const;

export default scoring;
