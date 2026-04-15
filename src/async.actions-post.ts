/**
 * THE MODERATOR — Async Actions: Post Take
 *
 * LANDMINE [LM-ACT-003]: postTake reads the composer textarea by DOM ID.
 * If multiple composers exist on the page, all share the same ID and the
 * wrong composer's content may be submitted.
 */

import { state } from './async.state.ts';
import { loadHotTakes } from './async.render.ts';
import { showToast, FEATURES } from './config.ts';
import { safeRpc, getCurrentUser, getCurrentProfile, getSupabaseClient, getIsPlaceholderMode, requireAuth } from './auth.ts';
import { claimHotTake } from './tokens.ts';
import type { HotTake, CreateHotTakeResult } from './async.types.ts';

export async function postTake(): Promise<void> {
  if (!FEATURES.hotTakes) return;
  if (!requireAuth('post hot takes')) return;
  if (state.postingInFlight) return;
  state.postingInFlight = true;
  try {
    const input = document.getElementById('hot-take-input') as HTMLTextAreaElement | null;
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const profile = getCurrentProfile();
    const section = state.currentFilter === 'all' ? 'trending' : state.currentFilter;
    const newTake: HotTake = {
      id: 't_' + Date.now(),
      user_id: getCurrentUser()?.id ?? '',
      user: (profile?.username ?? 'YOU').toUpperCase(),
      elo: profile?.elo_rating ?? 1200,
      text, section, reactions: 0, challenges: 0, time: 'now', userReacted: false,
    };

    const snapshot = [...state.hotTakes];
    state.hotTakes.unshift(newTake);
    input.value = '';
    loadHotTakes(state.currentFilter);

    if (getSupabaseClient() && !getIsPlaceholderMode()) {
      try {
        const { data, error } = await safeRpc<CreateHotTakeResult>('create_hot_take', {
          p_content: text, p_section: section,
        });
        if (error) {
          console.error('create_hot_take error:', error);
          state.hotTakes = snapshot;
          loadHotTakes(state.currentFilter);
          showToast('Post failed — try again', 'error');
        } else if (data && (data as CreateHotTakeResult).id) {
          newTake.id = (data as CreateHotTakeResult).id;
          claimHotTake((data as CreateHotTakeResult).id);
        }
      } catch {
        state.hotTakes = snapshot;
        loadHotTakes(state.currentFilter);
        showToast('Post failed — try again', 'error');
      }
    }
  } finally { state.postingInFlight = false; }
}
