/**
 * THE MODERATOR — Async Actions: React
 */

import { state } from './async.state.ts';
import { loadHotTakes } from './async.render.ts';
import { safeRpc, getSupabaseClient, getIsPlaceholderMode, requireAuth } from './auth.ts';
import { claimReaction } from './tokens.ts';
import { nudge } from './nudge.ts';
import type { ReactResult } from './async.types.ts';

export async function react(takeId: string): Promise<void> {
  if (!requireAuth('react to hot takes')) return;
  if (state.reactingIds.has(takeId)) return;
  const take = state.hotTakes.find(t => t.id === takeId);
  if (!take) return;

  state.reactingIds.add(takeId);
  take.userReacted = !take.userReacted;
  take.reactions += take.userReacted ? 1 : -1;
  loadHotTakes(state.currentFilter);

  if (getSupabaseClient() && !getIsPlaceholderMode()) {
    try {
      const { data, error } = await safeRpc<ReactResult>('react_hot_take', {
        p_hot_take_id: takeId, p_reaction_type: 'fire',
      });
      if (error) {
        console.error('react_hot_take error:', error);
        take.userReacted = !take.userReacted;
        take.reactions += take.userReacted ? 1 : -1;
        loadHotTakes(state.currentFilter);
      } else if (data) {
        take.reactions = (data as ReactResult).reaction_count;
        take.userReacted = (data as ReactResult).reacted;
        loadHotTakes(state.currentFilter);
        if ((data as ReactResult).reacted) {
          nudge('first_vote', '\uD83D\uDDF3\uFE0F Vote cast. Your voice shapes the verdict.');
          claimReaction(takeId);
        }
      }
    } catch { /* handled */ }
  }

  state.reactingIds.delete(takeId);
}
