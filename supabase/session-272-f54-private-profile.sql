-- ============================================================
-- F-54: Private Profile Toggle
-- Session 272 | April 12, 2026
-- Adds is_private column to profiles.
-- When true: profile blocked from public view, removed from
-- leaderboards, arena feed, and search.
-- Individual debate archive links remain publicly accessible.
-- Default: false (public).
-- ============================================================

-- ============================================================
-- COLUMN
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- RPC: update_profile (patched — add p_is_private)
-- Extends the existing RPC with the new flag.
-- All other logic preserved exactly.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_profile(
  p_display_name      TEXT    DEFAULT NULL,
  p_avatar_url        TEXT    DEFAULT NULL,
  p_bio               TEXT    DEFAULT NULL,
  p_username          TEXT    DEFAULT NULL,
  p_preferred_language TEXT   DEFAULT NULL,
  p_is_private        BOOLEAN DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_clean_name   TEXT;
  v_clean_bio    TEXT;
  v_clean_url    TEXT;
  v_clean_username TEXT;
  v_clean_lang   TEXT;
  v_allowed      BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE LOG 'SECURITY|auth_failure|anonymous|update_profile|unauthenticated profile update';
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Rate limit: 20 profile updates per hour
  v_allowed := check_rate_limit(v_user_id, 'profile_update', 60, 20);
  IF NOT v_allowed THEN
    RAISE LOG 'SECURITY|rate_limit_blocked|%|update_profile|profile_update limit exceeded', v_user_id;
    RAISE EXCEPTION 'Rate limit: too many profile updates';
  END IF;

  v_clean_name     := sanitize_text(p_display_name);
  v_clean_bio      := sanitize_text(p_bio);
  v_clean_url      := sanitize_url(p_avatar_url);
  v_clean_username := p_username;

  -- Validate language: must be 2-5 char BCP-47 tag or NULL
  IF p_preferred_language IS NOT NULL THEN
    v_clean_lang := lower(trim(p_preferred_language));
    IF v_clean_lang !~ '^[a-z]{2,5}$' THEN
      RAISE EXCEPTION 'Invalid language code';
    END IF;
  END IF;

  IF v_clean_username IS NOT NULL THEN
    IF char_length(v_clean_username) < 3 OR char_length(v_clean_username) > 20 THEN
      RAISE EXCEPTION 'Username must be 3-20 characters';
    END IF;
    IF v_clean_username !~ '^[a-zA-Z0-9_]+$' THEN
      RAISE LOG 'SECURITY|input_violation|%|update_profile|invalid username chars=%', v_user_id, v_clean_username;
      RAISE EXCEPTION 'Username: alphanumeric + underscores only';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_clean_username AND id != v_user_id) THEN
      RAISE EXCEPTION 'Username already taken';
    END IF;
  END IF;

  IF v_clean_name IS NOT NULL AND char_length(v_clean_name) > 50 THEN
    RAISE EXCEPTION 'Display name max 50 characters';
  END IF;
  IF v_clean_bio IS NOT NULL AND char_length(v_clean_bio) > 500 THEN
    RAISE EXCEPTION 'Bio max 500 characters';
  END IF;

  UPDATE public.profiles SET
    username           = COALESCE(v_clean_username, username),
    display_name       = COALESCE(v_clean_name, display_name),
    avatar_url         = COALESCE(v_clean_url, avatar_url),
    bio                = COALESCE(v_clean_bio, bio),
    preferred_language = COALESCE(v_clean_lang, preferred_language),
    is_private         = COALESCE(p_is_private, is_private),
    updated_at         = now()
  WHERE id = v_user_id;

  PERFORM log_event(
    p_event_type := 'profile_updated',
    p_user_id    := v_user_id,
    p_debate_id  := NULL,
    p_category   := NULL,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'changed_name',       p_display_name IS NOT NULL,
      'changed_bio',        p_bio IS NOT NULL,
      'changed_avatar',     p_avatar_url IS NOT NULL,
      'changed_username',   p_username IS NOT NULL,
      'changed_language',   p_preferred_language IS NOT NULL,
      'changed_is_private', p_is_private IS NOT NULL
    )
  );

  RETURN json_build_object('success', true);
END;
$$;

-- ============================================================
-- RPC: get_public_profile (patched — block private profiles)
-- Returns {error: 'profile_private'} when profile is private
-- and the requester is not the owner.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile       RECORD;
  v_follow_counts JSON;
  v_is_following  BOOLEAN := false;
BEGIN
  SELECT id, username, display_name, elo_rating, wins, losses, current_streak,
         level, debates_completed, avatar_url, bio, created_at, subscription_tier,
         is_private
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id AND deleted_at IS NULL;

  IF v_profile IS NULL THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  -- Block access for private profiles (owner can always see their own)
  IF v_profile.is_private = true AND auth.uid() != p_user_id THEN
    RETURN json_build_object('error', 'profile_private');
  END IF;

  v_follow_counts := get_follow_counts(p_user_id);

  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    v_is_following := is_following(p_user_id);
  END IF;

  RETURN json_build_object(
    'id',               v_profile.id,
    'username',         v_profile.username,
    'display_name',     v_profile.display_name,
    'elo_rating',       v_profile.elo_rating,
    'wins',             v_profile.wins,
    'losses',           v_profile.losses,
    'current_streak',   v_profile.current_streak,
    'level',            v_profile.level,
    'debates_completed', v_profile.debates_completed,
    'avatar_url',       v_profile.avatar_url,
    'bio',              v_profile.bio,
    'created_at',       v_profile.created_at,
    'subscription_tier', v_profile.subscription_tier,
    'followers',        v_follow_counts->'followers',
    'following',        v_follow_counts->'following',
    'is_following',     v_is_following,
    'is_private',       v_profile.is_private
  );
END;
$$;

-- ============================================================
-- RPC: get_leaderboard (patched — exclude private profiles)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_sort_by TEXT    DEFAULT 'elo',
  p_limit   INTEGER DEFAULT 50,
  p_offset  INTEGER DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(r))
    FROM (
      SELECT
        id,
        username,
        display_name,
        avatar_url,
        elo_rating,
        wins,
        losses,
        current_streak,
        best_streak,
        debates_completed,
        level,
        subscription_tier,
        ROW_NUMBER() OVER (
          ORDER BY
            CASE p_sort_by
              WHEN 'elo'    THEN elo_rating
              WHEN 'wins'   THEN wins
              WHEN 'streak' THEN current_streak
              ELSE elo_rating
            END DESC
        ) AS rank
      FROM public.profiles
      WHERE trust_score >= 50
        AND debates_completed > 0
        AND is_private = false
      ORDER BY
        CASE p_sort_by
          WHEN 'elo'    THEN elo_rating
          WHEN 'wins'   THEN wins
          WHEN 'streak' THEN current_streak
          ELSE elo_rating
        END DESC
      LIMIT p_limit
      OFFSET p_offset
    ) r
  );
END;
$$;

-- ============================================================
-- RPC: get_arena_feed (patched — exclude debates by private users)
-- Both debaters must be public for the debate to appear in the feed.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_arena_feed(
  p_limit    INTEGER DEFAULT 20,
  p_category TEXT    DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_to_json(d) ORDER BY d.created_at DESC)
    FROM (
      SELECT ad.id, ad.topic, 'arena'::text AS source, ad.mode, ad.status,
             ad.current_round, ad.total_rounds,
             ad.score_a, ad.score_b,
             ad.vote_count_a, ad.vote_count_b,
             ad.ruleset,
             pa.display_name AS debater_a_name, pa.elo_rating AS elo_a,
             pb.display_name AS debater_b_name, pb.elo_rating AS elo_b,
             ad.created_at
      FROM arena_debates ad
        LEFT JOIN profiles pa ON pa.id = ad.debater_a
        LEFT JOIN profiles pb ON pb.id = ad.debater_b
      WHERE ad.status IN ('live', 'voting', 'complete')
        AND (p_category IS NULL OR ad.category = p_category)
        AND (pa.is_private IS NULL OR pa.is_private = false)
        AND (pb.is_private IS NULL OR pb.is_private = false)
      ORDER BY ad.created_at DESC
      LIMIT p_limit
    ) d
  ), '[]'::json);
END;
$$;

-- ============================================================
-- search_all privacy patch
-- If search_all exists (F-24), patch it to exclude private profiles
-- from user search results. Uses DO block to skip gracefully if
-- the function doesn't exist.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'search_all'
  ) THEN
    -- Rebuild search_all with is_private filter on user results
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.search_all(
        p_query TEXT,
        p_types TEXT[]  DEFAULT ARRAY['users','debates','groups'],
        p_limit INTEGER DEFAULT 10
      )
      RETURNS JSONB
      LANGUAGE plpgsql SECURITY DEFINER AS $inner$
      DECLARE
        v_user_id UUID := auth.uid();
        v_results JSONB := '[]'::JSONB;
        v_users   JSONB := '[]'::JSONB;
        v_debates JSONB := '[]'::JSONB;
        v_groups  JSONB := '[]'::JSONB;
      BEGIN
        -- Rate limit
        IF v_user_id IS NULL AND 'users' = ANY(p_types) THEN
          p_types := array_remove(p_types, 'users');
        END IF;

        IF 'users' = ANY(p_types) THEN
          SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]')
          INTO v_users
          FROM (
            SELECT si.entity_id AS id, si.display_label AS name,
                   'user'::TEXT AS type, si.engagement_score,
                   similarity(si.search_text, p_query) AS score
            FROM search_index si
            JOIN profiles pr ON pr.id = si.entity_id
            WHERE si.entity_type = 'user'
              AND si.search_text % p_query
              AND pr.searchable = true
              AND pr.is_private = false
              AND NOT EXISTS (
                SELECT 1 FROM dm_blocks
                WHERE (blocker_id = v_user_id AND blocked_id = si.entity_id)
                   OR (blocker_id = si.entity_id AND blocked_id = v_user_id)
              )
            ORDER BY score DESC, si.engagement_score DESC
            LIMIT p_limit
          ) r;
        END IF;

        IF 'debates' = ANY(p_types) THEN
          SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]')
          INTO v_debates
          FROM (
            SELECT si.entity_id AS id, si.display_label AS name,
                   'debate'::TEXT AS type, si.engagement_score,
                   similarity(si.search_text, p_query) AS score
            FROM search_index si
            WHERE si.entity_type = 'debate'
              AND si.search_text % p_query
            ORDER BY score DESC, si.engagement_score DESC
            LIMIT p_limit
          ) r;
        END IF;

        IF 'groups' = ANY(p_types) THEN
          SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]')
          INTO v_groups
          FROM (
            SELECT si.entity_id AS id, si.display_label AS name,
                   'group'::TEXT AS type, si.engagement_score,
                   similarity(si.search_text, p_query) AS score
            FROM search_index si
            WHERE si.entity_type = 'group'
              AND si.search_text % p_query
            ORDER BY score DESC, si.engagement_score DESC
            LIMIT p_limit
          ) r;
        END IF;

        RETURN jsonb_build_object(
          'users',   v_users,
          'debates', v_debates,
          'groups',  v_groups
        );
      END;
      $inner$
    $func$;
  END IF;
END;
$$;
