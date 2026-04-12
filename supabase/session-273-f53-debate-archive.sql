-- =============================================================================
-- F-53: Profile Debate Archive
-- Session 273 | April 2026
-- =============================================================================
-- Creates profile_debate_archive_entries — user-curated list of debates shown
-- on their profile page. One row per (user, debate) pair. Users can add/remove
-- any of their own completed debates, add a custom name/description per entry,
-- and hide individual losses. Public by default, respects is_private toggle.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_debate_archive_entries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debate_id       UUID        NOT NULL REFERENCES public.arena_debates(id) ON DELETE CASCADE,
  custom_name     TEXT        CHECK (char_length(custom_name) <= 80),
  custom_desc     TEXT        CHECK (char_length(custom_desc) <= 200),
  hide_from_public BOOLEAN    NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, debate_id)
);

CREATE INDEX IF NOT EXISTS idx_pdae_user_id    ON public.profile_debate_archive_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_pdae_debate_id  ON public.profile_debate_archive_entries(debate_id);

-- ----------------------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.profile_debate_archive_entries ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
DROP POLICY IF EXISTS pdae_owner_all ON public.profile_debate_archive_entries;
CREATE POLICY pdae_owner_all ON public.profile_debate_archive_entries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read: entry not hidden, and profile not private
DROP POLICY IF EXISTS pdae_public_read ON public.profile_debate_archive_entries;
CREATE POLICY pdae_public_read ON public.profile_debate_archive_entries
  FOR SELECT
  USING (
    hide_from_public = false
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_id
        AND (p.is_private IS NULL OR p.is_private = false)
    )
  );

-- ----------------------------------------------------------------------------
-- 3. RPC: get_my_debate_archive
-- Returns all entries for the current user (including hidden ones).
-- Joins arena_debates for full row data, plus opponent profile.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_debate_archive()
RETURNS TABLE (
  entry_id          UUID,
  debate_id         UUID,
  custom_name       TEXT,
  custom_desc       TEXT,
  hide_from_public  BOOLEAN,
  entry_created_at  TIMESTAMPTZ,
  topic             TEXT,
  category          TEXT,
  debate_created_at TIMESTAMPTZ,
  opponent_id       UUID,
  opponent_name     TEXT,
  opponent_username TEXT,
  my_side           TEXT,
  winner            TEXT,
  my_score          NUMERIC,
  opp_score         NUMERIC,
  is_win            BOOLEAN,
  debate_mode       TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  RETURN QUERY
  SELECT
    e.id                                            AS entry_id,
    d.id                                            AS debate_id,
    e.custom_name                                   AS custom_name,
    e.custom_desc                                   AS custom_desc,
    e.hide_from_public                              AS hide_from_public,
    e.created_at                                    AS entry_created_at,
    d.topic                                         AS topic,
    d.category                                      AS category,
    d.created_at                                    AS debate_created_at,
    CASE WHEN d.debater_a = v_uid THEN d.debater_b ELSE d.debater_a END AS opponent_id,
    CASE WHEN d.debater_a = v_uid
      THEN opp_b.display_name ELSE opp_a.display_name END               AS opponent_name,
    CASE WHEN d.debater_a = v_uid
      THEN opp_b.username ELSE opp_a.username END                       AS opponent_username,
    CASE WHEN d.debater_a = v_uid THEN 'a' ELSE 'b' END                 AS my_side,
    d.winner                                                             AS winner,
    CASE WHEN d.debater_a = v_uid THEN d.score_a ELSE d.score_b END     AS my_score,
    CASE WHEN d.debater_a = v_uid THEN d.score_b ELSE d.score_a END     AS opp_score,
    CASE
      WHEN d.winner = 'a' AND d.debater_a = v_uid THEN true
      WHEN d.winner = 'b' AND d.debater_b = v_uid THEN true
      ELSE false
    END                                                                  AS is_win,
    d.mode                                                               AS debate_mode
  FROM profile_debate_archive_entries e
  JOIN arena_debates d ON d.id = e.debate_id
  LEFT JOIN profiles opp_a ON opp_a.id = d.debater_a
  LEFT JOIN profiles opp_b ON opp_b.id = d.debater_b
  WHERE e.user_id = v_uid
  ORDER BY d.created_at DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. RPC: get_public_debate_archive
-- Returns visible entries for any user (hides hidden rows + respects is_private).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_debate_archive(p_user_id UUID)
RETURNS TABLE (
  entry_id          UUID,
  debate_id         UUID,
  custom_name       TEXT,
  custom_desc       TEXT,
  entry_created_at  TIMESTAMPTZ,
  topic             TEXT,
  category          TEXT,
  debate_created_at TIMESTAMPTZ,
  opponent_id       UUID,
  opponent_name     TEXT,
  opponent_username TEXT,
  my_side           TEXT,
  winner            TEXT,
  my_score          NUMERIC,
  opp_score         NUMERIC,
  is_win            BOOLEAN,
  debate_mode       TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Block if profile is private
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND is_private = true) THEN
    RAISE EXCEPTION 'profile_private';
  END IF;

  RETURN QUERY
  SELECT
    e.id                                                AS entry_id,
    d.id                                                AS debate_id,
    e.custom_name                                       AS custom_name,
    e.custom_desc                                       AS custom_desc,
    e.created_at                                        AS entry_created_at,
    d.topic                                             AS topic,
    d.category                                          AS category,
    d.created_at                                        AS debate_created_at,
    CASE WHEN d.debater_a = p_user_id THEN d.debater_b ELSE d.debater_a END AS opponent_id,
    CASE WHEN d.debater_a = p_user_id
      THEN opp_b.display_name ELSE opp_a.display_name END                   AS opponent_name,
    CASE WHEN d.debater_a = p_user_id
      THEN opp_b.username ELSE opp_a.username END                           AS opponent_username,
    CASE WHEN d.debater_a = p_user_id THEN 'a' ELSE 'b' END                AS my_side,
    d.winner                                                                 AS winner,
    CASE WHEN d.debater_a = p_user_id THEN d.score_a ELSE d.score_b END     AS my_score,
    CASE WHEN d.debater_a = p_user_id THEN d.score_b ELSE d.score_a END     AS opp_score,
    CASE
      WHEN d.winner = 'a' AND d.debater_a = p_user_id THEN true
      WHEN d.winner = 'b' AND d.debater_b = p_user_id THEN true
      ELSE false
    END                                                                      AS is_win,
    d.mode                                                                   AS debate_mode
  FROM profile_debate_archive_entries e
  JOIN arena_debates d ON d.id = e.debate_id
  LEFT JOIN profiles opp_a ON opp_a.id = d.debater_a
  LEFT JOIN profiles opp_b ON opp_b.id = d.debater_b
  WHERE e.user_id = p_user_id
    AND e.hide_from_public = false
  ORDER BY d.created_at DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC: get_my_recent_debates_for_archive
-- Returns completed debates the user participated in that are NOT yet in their
-- archive — used to populate the "Add a debate" picker.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_recent_debates_for_archive(p_limit INT DEFAULT 30)
RETURNS TABLE (
  debate_id         UUID,
  topic             TEXT,
  category          TEXT,
  debate_created_at TIMESTAMPTZ,
  opponent_name     TEXT,
  opponent_username TEXT,
  my_score          NUMERIC,
  opp_score         NUMERIC,
  is_win            BOOLEAN,
  debate_mode       TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  RETURN QUERY
  SELECT
    d.id                                            AS debate_id,
    d.topic                                         AS topic,
    d.category                                      AS category,
    d.created_at                                    AS debate_created_at,
    CASE WHEN d.debater_a = v_uid
      THEN opp_b.display_name ELSE opp_a.display_name END AS opponent_name,
    CASE WHEN d.debater_a = v_uid
      THEN opp_b.username ELSE opp_a.username END         AS opponent_username,
    CASE WHEN d.debater_a = v_uid THEN d.score_a ELSE d.score_b END AS my_score,
    CASE WHEN d.debater_a = v_uid THEN d.score_b ELSE d.score_a END AS opp_score,
    CASE
      WHEN d.winner = 'a' AND d.debater_a = v_uid THEN true
      WHEN d.winner = 'b' AND d.debater_b = v_uid THEN true
      ELSE false
    END                                                             AS is_win,
    d.mode                                                          AS debate_mode
  FROM arena_debates d
  LEFT JOIN profiles opp_a ON opp_a.id = d.debater_a
  LEFT JOIN profiles opp_b ON opp_b.id = d.debater_b
  WHERE (d.debater_a = v_uid OR d.debater_b = v_uid)
    AND d.status = 'complete'
    AND d.id NOT IN (
      SELECT e.debate_id FROM profile_debate_archive_entries e WHERE e.user_id = v_uid
    )
  ORDER BY d.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. RPC: add_debate_to_archive
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.add_debate_to_archive(
  p_debate_id   UUID,
  p_custom_name TEXT DEFAULT NULL,
  p_custom_desc TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_entry_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  -- Verify user participated in this debate
  IF NOT EXISTS (
    SELECT 1 FROM arena_debates
    WHERE id = p_debate_id AND (debater_a = v_uid OR debater_b = v_uid)
      AND status = 'complete'
  ) THEN
    RAISE EXCEPTION 'debate_not_eligible';
  END IF;

  INSERT INTO profile_debate_archive_entries (user_id, debate_id, custom_name, custom_desc)
  VALUES (v_uid, p_debate_id, p_custom_name, p_custom_desc)
  ON CONFLICT (user_id, debate_id) DO NOTHING
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. RPC: update_archive_entry
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_archive_entry(
  p_entry_id       UUID,
  p_custom_name    TEXT    DEFAULT NULL,
  p_custom_desc    TEXT    DEFAULT NULL,
  p_hide_from_public BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  UPDATE profile_debate_archive_entries
  SET
    custom_name     = COALESCE(p_custom_name,     custom_name),
    custom_desc     = COALESCE(p_custom_desc,     custom_desc),
    hide_from_public = COALESCE(p_hide_from_public, hide_from_public)
  WHERE id = p_entry_id AND user_id = v_uid;

  RETURN FOUND;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. RPC: remove_from_archive
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.remove_from_archive(p_entry_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  DELETE FROM profile_debate_archive_entries
  WHERE id = p_entry_id AND user_id = v_uid;

  RETURN FOUND;
END;
$$;
