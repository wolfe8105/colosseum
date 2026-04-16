/**
 * THE MODERATOR — Auth Follows (follow/unfollow, followers/following lists, counts)
 */

import { getSupabaseClient, getIsPlaceholderMode, isUUID } from './auth.core.ts';
import { safeRpc } from './auth.rpc.ts';
import type { AuthResult, FollowRow } from './auth.types.ts';

export async function followUser(targetUserId: string): Promise<AuthResult> {
  if (!isUUID(targetUserId)) return { success: false, error: 'Invalid user ID' };
  if (getIsPlaceholderMode()) return { success: true };

  try {
    const { error } = await safeRpc('follow_user', { p_target_user_id: targetUserId });
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function unfollowUser(targetUserId: string): Promise<AuthResult> {
  if (!isUUID(targetUserId)) return { success: false, error: 'Invalid user ID' };
  if (getIsPlaceholderMode()) return { success: true };

  try {
    const { error } = await safeRpc('unfollow_user', { p_target_user_id: targetUserId });
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getFollowers(userId: string): Promise<AuthResult<FollowRow[]>> {
  if (getIsPlaceholderMode()) return { success: true, data: [], count: 0 };
  try {
    const { data, count, error } = await getSupabaseClient()!
      .from('follows')
      .select('follower_id, profiles!follows_follower_id_fkey(username, display_name, elo_rating)', { count: 'exact' })
      .eq('following_id', userId);
    if (error) throw error;
    return { success: true, data: data as FollowRow[], count: count ?? 0 };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: [], count: 0 };
  }
}

export async function getFollowing(userId: string): Promise<AuthResult<FollowRow[]>> {
  if (getIsPlaceholderMode()) return { success: true, data: [], count: 0 };
  try {
    const { data, count, error } = await getSupabaseClient()!
      .from('follows')
      .select('following_id, profiles!follows_following_id_fkey(username, display_name, elo_rating)', { count: 'exact' })
      .eq('follower_id', userId);
    if (error) throw error;
    return { success: true, data: data as FollowRow[], count: count ?? 0 };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: [], count: 0 };
  }
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  if (getIsPlaceholderMode()) return { followers: 0, following: 0 };
  try {
    const { data, error } = await safeRpc<{ followers: number; following: number }>('get_follow_counts', { p_user_id: userId });
    if (error) throw error;
    return data ?? { followers: 0, following: 0 };
  } catch (e) {
    console.error('getFollowCounts error:', e);
    return { followers: 0, following: 0 };
  }
}
