-- =============================================================================
-- F-33: Verified Gladiator Badge
-- Session 273 | April 2026
-- =============================================================================
-- Adds verified_gladiator BOOLEAN to profiles.
-- Auto-granted when profile_depth_pct reaches 60. Never revoked.
-- Retroactive: anyone already at >= 60% gets it immediately.
-- get_leaderboard and get_public_profile updated to expose the field.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Column
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_gladiator BOOLEAN NOT NULL DEFAULT false;

-- ----------------------------------------------------------------------------
-- 2. Retroactive grant — anyone already at >= 60%
-- ----------------------------------------------------------------------------

UPDATE public.profiles
SET verified_gladiator = true
WHERE profile_depth_pct >= 60
  AND verified_gladiator = false;

-- ----------------------------------------------------------------------------
-- 3. Trigger — auto-grant on depth update, never revoke
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._trg_grant_verified_gladiator()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only grant, never revoke
  IF NEW.profile_depth_pct >= 60 AND NEW.verified_gladiator = false THEN
    NEW.verified_gladiator := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_verified_gladiator ON public.profiles;
CREATE TRIGGER trg_grant_verified_gladiator
  BEFORE UPDATE OF profile_depth_pct ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public._trg_grant_verified_gladiator();

-- ----------------------------------------------------------------------------
-- 4. get_leaderboard — add verified_gladiator to SELECT
-- ----------------------------------------------------------------------------

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
        verified_gladiator,
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

-- ----------------------------------------------------------------------------
-- 5. get_public_profile — add verified_gladiator to return
-- ----------------------------------------------------------------------------
-- Note: get_public_profile is defined elsewhere (auth layer). This patches it
-- by rebuilding with the additional field. Matches the existing function
-- signature — only adds verified_gladiator to the SELECT list.
-- If the function body differs in production, merge manually.

CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id UUID)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_viewer UUID := auth.uid();
  v_result json;
BEGIN
  -- Block private profiles for non-owners
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
      AND is_private = true
      AND p_user_id IS DISTINCT FROM v_viewer
  ) THEN
    RETURN json_build_object('error', 'profile_private');
  END IF;

  SELECT row_to_json(r) INTO v_result
  FROM (
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.bio,
      p.elo_rating,
      p.wins,
      p.losses,
      p.current_streak,
      p.level,
      p.debates_completed,
      p.subscription_tier,
      p.created_at,
      p.verified_gladiator,
      (SELECT COUNT(*) FROM follows WHERE following_id = p.id) AS followers,
      (SELECT COUNT(*) FROM follows WHERE follower_id  = p.id) AS following,
      EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = v_viewer AND following_id = p.id
      ) AS is_following
    FROM profiles p
    WHERE p.id = p_user_id
  ) r;

  RETURN v_result;
END;
$$;
