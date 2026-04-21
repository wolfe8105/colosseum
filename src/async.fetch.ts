/**
 * THE MODERATOR — Async Module: Data Fetching
 *
 * F-68: fetchTakes removed. Only fetchPredictions + fetchStandaloneQuestions remain.
 */

import { state } from './async.state.ts';
import type { StandaloneQuestion } from './async.types.ts';
import { FEATURES } from './config.ts';
import {
  safeRpc,
  getSupabaseClient,
  getIsPlaceholderMode,
} from './auth.ts';

export async function fetchPredictions(): Promise<void> {
  if (!FEATURES.predictions) return;
  const sb = getSupabaseClient();
  if (!sb || getIsPlaceholderMode()) return;
  try {
    const { data, error } = await safeRpc<Record<string, unknown>[]>(
      'get_hot_predictions',
      { p_limit: 10 }
    );
    if (error) throw error;
    if (data && (data as Record<string, unknown>[]).length > 0) {
      state.predictions = (data as Record<string, unknown>[]).map((d) => ({
        debate_id: d['debate_id'] as string,
        topic: d['topic'] as string,
        p1:
          (d['p1_username'] as string) ||
          (d['p1_display_name'] as string) ||
          'Side A',
        p2:
          (d['p2_username'] as string) ||
          (d['p2_display_name'] as string) ||
          'Side B',
        p1_elo: (d['p1_elo'] as number) || 1200,
        p2_elo: (d['p2_elo'] as number) || 1200,
        total: (d['prediction_count'] as number) || 0,
        pct_a:
          (d['prediction_count'] as number) > 0
            ? Math.round(
                ((d['picks_a'] as number) /
                  (d['prediction_count'] as number)) *
                  100
              )
            : 50,
        pct_b:
          (d['prediction_count'] as number) > 0
            ? Math.round(
                ((d['picks_b'] as number) /
                  (d['prediction_count'] as number)) *
                  100
              )
            : 50,
        user_pick: null,
        status: d['status'] as string,
      }));
    }
  } catch (e) {
    console.error('fetchPredictions error:', e);
  }
}

export async function fetchStandaloneQuestions(
  category?: string
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb || getIsPlaceholderMode()) return;
  try {
    const { data, error } = await safeRpc<StandaloneQuestion[]>(
      'get_prediction_questions',
      {
        p_limit: 20,
        p_category: category || null,
      }
    );
    if (error) throw error;
    if (data && Array.isArray(data) && data.length > 0) {
      state.standaloneQuestions = data as StandaloneQuestion[];
    }
  } catch (e) {
    console.error('fetchStandaloneQuestions error:', e);
  }
}
