/**
 * THE COLOSSEUM — Scoring Module (TypeScript)
 *
 * Typed mirror of colosseum-scoring.js. During migration (Phases 1-3),
 * the original .js file runs in production. This .ts file provides
 * compile-time type safety for all new TypeScript modules.
 *
 * Source of truth for runtime: colosseum-scoring.js (until Phase 4 cutover)
 * Source of truth for types: this file
 *
 * Migration: Session 127 (Phase 3)
 */

import type { SafeRpcResult } from './auth.ts';

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate UUID format before use in PostgREST .or() filter (Session 17 bug fix) */
export function validateUUID(id: string): string {
  if (!id || !UUID_RE.test(id)) throw new Error('Invalid user ID format');
  return id;
}

// ============================================================
// HELPERS
// ============================================================

declare const ColosseumAuth: {
  supabase: unknown | null;
  safeRpc: <T = unknown>(rpcName: string, params?: Record<string, unknown>) => Promise<SafeRpcResult<T>>;
};

function getClient(): unknown | null {
  if (typeof ColosseumAuth !== 'undefined' && ColosseumAuth.supabase) {
    return ColosseumAuth.supabase;
  }
  return null;
}

function isPlaceholder(): boolean {
  return !getClient();
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

  const { data, error } = await ColosseumAuth.safeRpc<CastVoteResult>('cast_vote', {
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

  const { data, error } = await ColosseumAuth.safeRpc<PlacePredictionResult>('place_prediction', {
    p_debate_id: debateId,
    p_predicted_winner: predictedWinnerId,
    p_amount: amount,
  });

  if (error) throw new Error(error.message);
  return data as PlacePredictionResult;
}

// ============================================================
// WINDOW GLOBAL BRIDGE (removed in Phase 4)
// ============================================================

export const ColosseumScoring = {
  castVote,
  placePrediction,
} as const;
