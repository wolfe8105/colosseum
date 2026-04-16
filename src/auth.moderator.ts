/**
 * THE MODERATOR — Auth Moderator Functions
 *
 * toggleModerator, toggleModAvailable, updateModCategories mutate currentProfile
 * directly via getCurrentProfile() (same object reference — see LM-AUTH-001).
 */

import { getIsPlaceholderMode, getCurrentUser, getCurrentProfile, isUUID, _notify } from './auth.core.ts';
import { safeRpc } from './auth.rpc.ts';
import type { AuthResult, ModeratorInfo, DebateReference } from './auth.types.ts';

export async function toggleModerator(enabled: boolean): Promise<AuthResult> {
  const currentProfile = getCurrentProfile();
  const currentUser = getCurrentUser();
  if (getIsPlaceholderMode()) {
    if (currentProfile) {
      currentProfile.is_moderator = enabled;
      if (!enabled) currentProfile.mod_available = false;
    }
    _notify(currentUser, currentProfile);
    return { success: true };
  }
  try {
    const { data, error } = await safeRpc('toggle_moderator_status', { p_enabled: enabled });
    if (error) throw error;
    if (currentProfile) {
      currentProfile.is_moderator = enabled;
      if (!enabled) currentProfile.mod_available = false;
    }
    _notify(currentUser, currentProfile);
    return (data as AuthResult) ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function toggleModAvailable(available: boolean): Promise<AuthResult> {
  const currentProfile = getCurrentProfile();
  const currentUser = getCurrentUser();
  if (getIsPlaceholderMode()) {
    if (currentProfile) currentProfile.mod_available = available;
    _notify(currentUser, currentProfile);
    return { success: true };
  }
  try {
    const { data, error } = await safeRpc('toggle_mod_available', { p_available: available });
    if (error) throw error;
    if (currentProfile) currentProfile.mod_available = available;
    _notify(currentUser, currentProfile);
    return (data as AuthResult) ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateModCategories(categories: string[]): Promise<AuthResult> {
  const currentProfile = getCurrentProfile();
  const currentUser = getCurrentUser();
  if (getIsPlaceholderMode()) {
    if (currentProfile) (currentProfile as Record<string, unknown>).mod_categories = categories;
    _notify(currentUser, currentProfile);
    return { success: true };
  }
  try {
    const { data, error } = await safeRpc('update_mod_categories', { p_categories: categories });
    if (error) throw error;
    if (currentProfile) (currentProfile as Record<string, unknown>).mod_categories = categories;
    _notify(currentUser, currentProfile);
    return (data as AuthResult) ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function submitReference(
  debateId: string,
  url: string | null,
  description: string | null,
  _supportsSide?: string
): Promise<AuthResult & { reference_id?: string }> {
  if (getIsPlaceholderMode()) return { success: true, reference_id: 'placeholder-ref-' + Date.now() };
  // SESSION 134: Validate URL protocol to prevent stored XSS via javascript:/data: URLs
  if (url && !/^https?:\/\//i.test(url)) {
    return { success: false, error: 'Invalid URL — must start with http:// or https://' };
  }
  try {
    const { data, error } = await safeRpc('submit_reference', {
      p_debate_id: debateId,
      p_content: url ?? null,
      p_reference_type: description ?? null,
    });
    if (error) throw error;
    return (data as AuthResult & { reference_id?: string }) ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function ruleOnReference(
  referenceId: string,
  ruling: string,
  reason: string | null,
  ruledByType?: string
): Promise<AuthResult> {
  if (getIsPlaceholderMode()) return { success: true };
  try {
    const { data, error } = await safeRpc('rule_on_reference', {
      p_reference_id: referenceId,
      p_ruling: ruling,
      p_reason: reason ?? null,
      p_ruled_by_type: ruledByType ?? 'human',
    });
    if (error) throw error;
    return (data as AuthResult) ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function scoreModerator(debateId: string, score: number): Promise<AuthResult> {
  if (getIsPlaceholderMode()) return { success: true };
  try {
    const { data, error } = await safeRpc('score_moderator', {
      p_debate_id: debateId,
      p_score: score,
    });
    if (error) throw error;
    return (data as AuthResult) ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function assignModerator(
  debateId: string,
  moderatorId: string | null,
  moderatorType?: string
): Promise<AuthResult & { moderator_type?: string }> {
  if (moderatorId && !isUUID(moderatorId)) return { success: false, error: 'Invalid moderator ID' };
  if (getIsPlaceholderMode()) return { success: true, moderator_type: moderatorType ?? 'ai' };
  try {
    const { data, error } = await safeRpc('assign_moderator', {
      p_debate_id: debateId,
      p_moderator_id: moderatorId ?? null,
      p_moderator_type: moderatorType ?? 'human',
    });
    if (error) throw error;
    return (data as AuthResult & { moderator_type?: string }) ?? { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getAvailableModerators(excludeIds?: string[]): Promise<ModeratorInfo[]> {
  if (getIsPlaceholderMode()) return [
    { id: 'mod-1', display_name: 'FairJudge', mod_rating: 82, mod_debates_total: 15, mod_approval_pct: 78 },
    { id: 'mod-2', display_name: 'NeutralMod', mod_rating: 71, mod_debates_total: 8, mod_approval_pct: 65 },
  ];
  try {
    const { data, error } = await safeRpc<ModeratorInfo[]>('get_available_moderators', {
      p_exclude_ids: excludeIds ?? [],
    });
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error('getAvailableModerators error:', e);
    return [];
  }
}

export async function getDebateReferences(debateId: string): Promise<DebateReference[]> {
  if (getIsPlaceholderMode()) return [];
  try {
    const { data, error } = await safeRpc<DebateReference[]>('get_debate_references', {
      p_debate_id: debateId,
    });
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error('getDebateReferences error:', e);
    return [];
  }
}
