/**
 * THE MODERATOR — Reference Arsenal RPCs
 *
 * Core arsenal management RPC wrappers (out-of-match).
 * forge / edit / delete / second / cite / challenge.
 */

import { safeRpc } from './auth.ts';
import type {
  ForgeParams,
  ForgeResult,
  EditResult,
  SecondResult,
  ChallengeResult,
  ReferenceCategory,
  ArsenalReference,
  TrendingReference,
} from './reference-arsenal.types.ts';

export interface LibraryFilters {
  search?: string;
  category?: string;
  rarity?: string;
  sourceType?: string;
  graduated?: boolean;
  challengeStatus?: string;
  sort?: 'power' | 'strikes' | 'seconds' | 'newest' | 'oldest' | 'alpha';
}

// ============================================================
// RPC 1: FORGE REFERENCE
// ============================================================

export async function forgeReference(params: ForgeParams): Promise<ForgeResult> {
  const { data, error } = await safeRpc<ForgeResult>('forge_reference', {
    p_source_title: params.source_title.trim(),
    p_source_author: params.source_author.trim(),
    p_source_date: params.source_date,
    p_locator: params.locator.trim(),
    p_claim_text: params.claim_text.trim(),
    p_source_type: params.source_type,
    p_category: params.category,
    p_source_url: params.source_url?.trim() || null,
  });

  if (error) throw new Error(error.message || 'Failed to forge reference');
  return data as ForgeResult;
}

// ============================================================
// RPC 2: EDIT REFERENCE
// ============================================================

export async function editReference(
  referenceId: string,
  params: Omit<ForgeParams, 'source_type' | 'source_url'>,
): Promise<EditResult> {
  const { data, error } = await safeRpc<EditResult>('edit_reference', {
    p_ref_id: referenceId,
    p_source_title: params.source_title.trim(),
    p_source_author: params.source_author.trim(),
    p_source_date: params.source_date,
    p_locator: params.locator.trim(),
    p_claim_text: params.claim_text.trim(),
    p_category: params.category,
  });

  if (error) throw new Error(error.message || 'Failed to edit reference');
  return data as EditResult;
}

// ============================================================
// RPC 3: DELETE REFERENCE
// ============================================================

export async function deleteReference(referenceId: string): Promise<void> {
  const { error } = await safeRpc<{ action: string }>('delete_reference', {
    p_ref_id: referenceId,
  });

  if (error) throw new Error(error.message || 'Failed to delete reference');
}

// ============================================================
// RPC 4: SECOND REFERENCE (replaces verify)
// ============================================================

export async function secondReference(referenceId: string): Promise<SecondResult> {
  const { data, error } = await safeRpc<SecondResult>('second_reference', {
    p_ref_id: referenceId,
  });

  if (error) throw new Error(error.message || 'Failed to second reference');
  return data as SecondResult;
}

// ============================================================
// RPC 5: CITE REFERENCE (kept — backward compat, no-op in F-55)
// ============================================================

export async function citeReference(
  referenceId: string,
  debateId: string,
  _outcome: 'win' | 'loss' | null = null,
): Promise<{ action: string }> {
  const { data, error } = await safeRpc<{ action: string }>('cite_reference', {
    p_reference_id: referenceId,
    p_debate_id: debateId,
    p_outcome: _outcome,
  });

  if (error) throw new Error(error.message || 'Failed to cite reference');
  return data as { action: string };
}

// ============================================================
// RPC 6: CHALLENGE REFERENCE
// ============================================================

export async function challengeReference(
  referenceId: string,
  grounds: string,
  contextDebateId: string | null = null,
): Promise<ChallengeResult> {
  const { data, error } = await safeRpc<ChallengeResult>('challenge_reference', {
    p_ref_id: referenceId,
    p_grounds: grounds,
    p_context_debate_id: contextDebateId,
  });

  if (error) throw new Error(error.message || 'Failed to process challenge');
  return data as ChallengeResult;
}

// ============================================================
// RPC 7: GET TRENDING REFERENCES
// ============================================================

export async function getTrendingReferences(): Promise<TrendingReference[]> {
  const { data, error } = await safeRpc<TrendingReference[]>('get_trending_references', {});
  if (error) return [];
  return (data || []) as TrendingReference[];
}

// ============================================================
// RPC 8: GET LIBRARY WITH FILTERS
// ============================================================

export async function getLibrary(filters: LibraryFilters = {}): Promise<ArsenalReference[]> {
  const params: Record<string, unknown> = {};
  if (filters.search)          params['p_search']           = filters.search;
  if (filters.category)        params['p_category']         = filters.category;
  if (filters.rarity)          params['p_rarity']           = filters.rarity;
  if (filters.sourceType)      params['p_source_type']      = filters.sourceType;
  if (filters.graduated != null) params['p_graduated']      = filters.graduated;
  if (filters.challengeStatus) params['p_challenge_status'] = filters.challengeStatus;
  if (filters.sort)            params['p_sort']             = filters.sort;

  const { data, error } = await safeRpc<ArsenalReference[]>('get_reference_library', params);
  if (error) throw new Error(error.message || 'Failed to load library');
  return (data || []) as ArsenalReference[];
}
