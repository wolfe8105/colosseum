/**
 * THE MODERATOR — Reference Arsenal Debate RPCs
 *
 * Debate-context reference RPCs (in-match).
 * F-51 Phase 3 + F-55 updates.
 */

import { safeRpc } from './auth.ts';
import type { LoadoutRef, CiteResult2, ChallengeResult2 } from './reference-arsenal.types.ts';

/** Save pre-debate reference loadout (max 5) */
export async function saveDebateLoadout(debateId: string, referenceIds: string[]): Promise<void> {
  const { error } = await safeRpc<{ success: boolean }>('save_debate_loadout', {
    p_debate_id: debateId,
    p_reference_ids: referenceIds,
  });
  if (error) throw new Error(error.message || 'Failed to save loadout');
}

/** Get my loaded references for a debate */
export async function getMyDebateLoadout(debateId: string): Promise<LoadoutRef[]> {
  const { data, error } = await safeRpc<LoadoutRef[]>('get_my_debate_loadout', {
    p_debate_id: debateId,
  });
  if (error) throw new Error(error.message || 'Failed to get loadout');
  return (data || []) as LoadoutRef[];
}

/** Cite a reference during a live debate (atomic: mark + stats + feed event) */
export async function citeDebateReference(
  debateId: string, referenceId: string, round: number, side: string,
): Promise<CiteResult2> {
  const { data, error } = await safeRpc<CiteResult2>('cite_debate_reference', {
    p_debate_id: debateId,
    p_reference_id: referenceId,
    p_round: round,
    p_side: side,
  });
  if (error) throw new Error(error.message || 'Failed to cite reference');
  if (!data) throw new Error('cite_debate_reference returned no data');
  return data as CiteResult2;
}

/** File a reference challenge (atomic: limit + Shield check + feed event) */
export async function fileReferenceChallenge(
  debateId: string, referenceId: string, round: number, side: string,
): Promise<ChallengeResult2> {
  const { data, error } = await safeRpc<ChallengeResult2>('file_reference_challenge', {
    p_debate_id: debateId,
    p_reference_id: referenceId,
    p_round: round,
    p_side: side,
  });
  if (error) throw new Error(error.message || 'Failed to file challenge');
  if (!data) throw new Error('file_reference_challenge returned no data');
  return data as ChallengeResult2;
}
