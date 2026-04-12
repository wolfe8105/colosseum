/**
 * THE MODERATOR — Async Module: Data Fetching
 *
 * fetchTakes, fetchPredictions, fetchStandaloneQuestions.
 * These functions mutate state directly.
 */

import { state } from './async.state.ts';
import { _timeAgo } from './async.utils.ts';
import type { StandaloneQuestion } from './async.types.ts';
import { FEATURES } from './config.ts';
import {
  safeRpc,
  getCurrentUser,
  getSupabaseClient,
  getIsPlaceholderMode,
} from './auth.ts';

export async function fetchTakes(section?: string): Promise<void> {
  if (!FEATURES.hotTakes) return;
  const sb = getSupabaseClient();
  if (!sb || getIsPlaceholderMode()) return;
  try {
    let query = (
      sb as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            order: (
              col: string,
              opts: { ascending: boolean }
            ) => {
              limit: (n: number) => {
                eq: (col: string, val: string) => unknown;
              } & Promise<{ data: unknown[] | null; error: unknown }>;
            };
          };
        };
      }
    )
      .from('hot_takes')
      .select(
        'id, content, section, created_at, user_id, reaction_count, challenge_count, profiles(username, display_name, elo_rating)'
      )
      .order('created_at', { ascending: false })
      .limit(30);

    if (section && section !== 'all') {
      query = query.eq('section', section) as typeof query;
    }

    const { data, error } = await (query as unknown as Promise<{
      data: unknown[] | null;
      error: unknown;
    }>);
    if (error) throw error;

    if (data && data.length > 0) {
      state.hotTakes = (data as Record<string, unknown>[]).map((t) => {
        const profiles = t['profiles'] as Record<string, unknown> | null;
        return {
          id: t['id'] as string,
          user_id: t['user_id'] as string,
          username: (profiles?.['username'] as string) || '',
          user: ((profiles?.['username'] as string) || 'ANON').toUpperCase(),
          elo: (profiles?.['elo_rating'] as number) || 1200,
          tokens: 0,
          text: t['content'] as string,
          section: t['section'] as string,
          reactions: (t['reaction_count'] as number) || 0,
          challenges: (t['challenge_count'] as number) || 0,
          time: _timeAgo(t['created_at'] as string),
          userReacted: false,
        };
      });

      // Load reactions for current user
      const userId = getCurrentUser()?.id;
      if (userId) {
        try {
          const reactionSb = sb as unknown as {
            from: (table: string) => {
              select: (cols: string) => {
                eq: (col: string, val: string) => {
                  in: (
                    col: string,
                    vals: string[]
                  ) => Promise<{ data: Array<{ hot_take_id: string }> | null }>;
                };
              };
            };
          };
          const { data: reacts } = await reactionSb
            .from('hot_take_reactions')
            .select('hot_take_id')
            .eq('user_id', userId)
            .in(
              'hot_take_id',
              state.hotTakes.map((t) => t.id)
            );
          if (reacts) {
            const reactedIds = new Set(reacts.map((r) => r.hot_take_id));
            state.hotTakes.forEach((t) => {
              t.userReacted = reactedIds.has(t.id);
            });
          }
        } catch {
          /* non-critical */
        }
      }
    }
  } catch (e) {
    console.error('fetchTakes error:', e);
  }
}

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
