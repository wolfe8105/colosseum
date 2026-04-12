-- ============================================================
-- THE MODERATOR — F-27 Reference Library: The Armory
-- Session 270 | April 12, 2026
--
-- 3 SQL changes:
--
--   get_reference_library  — extended with search, source_type,
--                            graduated, challenge_status, sort
--   get_my_arsenal         — extended with sockets[] per ref
--                            for socket dot visualization
--   get_trending_references — new RPC, top 5 most-cited refs
--                            in the last 7 days
--
-- Run in Supabase SQL Editor against faomczmipsccwbhpivmp.
-- No rows returned = success.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. get_reference_library — extended filters + sort
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_reference_library(
  p_category         TEXT    DEFAULT NULL,
  p_rarity           TEXT    DEFAULT NULL,
  p_search           TEXT    DEFAULT NULL,
  p_source_type      TEXT    DEFAULT NULL,
  p_graduated        BOOLEAN DEFAULT NULL,
  p_challenge_status TEXT    DEFAULT NULL,
  p_sort             TEXT    DEFAULT 'power'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
    FROM (
      SELECT ar.id, ar.user_id, ar.source_title, ar.source_author, ar.source_date,
             ar.locator, ar.claim_text, ar.source_type, ar.category, ar.source_url,
             ar.seconds, ar.strikes, ar.rarity, ar.current_power, ar.graduated,
             ar.challenge_status, ar.created_at,
             p.username AS owner_username
      FROM   arsenal_references ar
      JOIN   profiles p ON p.id = ar.user_id
      WHERE  ar.deleted_at IS NULL
        AND (p_category         IS NULL OR ar.category         = p_category)
        AND (p_rarity           IS NULL OR ar.rarity           = p_rarity)
        AND (p_source_type      IS NULL OR ar.source_type      = p_source_type)
        AND (p_graduated        IS NULL OR ar.graduated        = p_graduated)
        AND (p_challenge_status IS NULL OR ar.challenge_status = p_challenge_status)
        AND (p_search IS NULL OR (
              ar.claim_text    ILIKE '%' || p_search || '%'
           OR ar.source_title  ILIKE '%' || p_search || '%'
           OR ar.source_author ILIKE '%' || p_search || '%'
           OR p.username       ILIKE '%' || p_search || '%'
        ))
      ORDER BY
        CASE WHEN p_sort = 'power'   THEN ar.current_power END DESC NULLS LAST,
        CASE WHEN p_sort = 'strikes' THEN ar.strikes       END DESC NULLS LAST,
        CASE WHEN p_sort = 'seconds' THEN ar.seconds       END DESC NULLS LAST,
        CASE WHEN p_sort = 'newest'  THEN EXTRACT(EPOCH FROM ar.created_at) END DESC NULLS LAST,
        CASE WHEN p_sort = 'oldest'  THEN EXTRACT(EPOCH FROM ar.created_at) END ASC  NULLS LAST,
        CASE WHEN p_sort = 'alpha'   THEN ar.source_title  END ASC  NULLS LAST,
        ar.current_power DESC
      LIMIT 200
    ) r
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 2. get_my_arsenal — add sockets[] per reference
--    Each ref now includes a `sockets` JSONB array:
--    [{socket_index, effect_id}, ...] sorted by socket_index.
--    Empty array if no sockets. Client uses this to render
--    filled/empty socket dots on My Arsenal cards.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_arsenal()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
    FROM (
      SELECT ar.id, ar.user_id, ar.source_title, ar.source_author, ar.source_date,
             ar.locator, ar.claim_text, ar.source_type, ar.category, ar.source_url,
             ar.seconds, ar.strikes, ar.rarity, ar.current_power, ar.graduated,
             ar.challenge_status, ar.created_at,
             -- Socket data for F-57 visualization
             COALESCE(
               (SELECT jsonb_agg(
                         jsonb_build_object(
                           'socket_index', rs.socket_index,
                           'effect_id',    rs.effect_id
                         )
                         ORDER BY rs.socket_index
                       )
                FROM reference_sockets rs
                WHERE rs.reference_id = ar.id),
               '[]'::jsonb
             ) AS sockets
      FROM arsenal_references ar
      WHERE ar.user_id    = v_user_id
        AND ar.deleted_at IS NULL
      ORDER BY ar.current_power DESC, ar.created_at DESC
    ) r
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 3. get_trending_references — top 5 most-cited in 7 days
--    Counts reference_cite events from debate_feed_events
--    in the last 7 days. Returns the full ref row plus
--    owner_username and cite_count for the shelf display.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_trending_references()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
    FROM (
      SELECT ar.id, ar.user_id, ar.source_title, ar.source_author,
             ar.claim_text, ar.rarity, ar.current_power, ar.seconds,
             ar.strikes, ar.category, ar.graduated, ar.challenge_status,
             ar.created_at, ar.source_type,
             p.username AS owner_username,
             COUNT(dfe.id)::INT AS cite_count
      FROM   arsenal_references ar
      JOIN   profiles p ON p.id = ar.user_id
      JOIN   debate_feed_events dfe
               ON  dfe.reference_id = ar.id
               AND dfe.event_type   = 'reference_cite'
               AND dfe.created_at  >= now() - INTERVAL '7 days'
      WHERE  ar.deleted_at IS NULL
      GROUP  BY ar.id, p.username
      ORDER  BY cite_count DESC, ar.current_power DESC
      LIMIT  5
    ) r
  );
END;
$$;


-- ============================================================
-- END F-27 SQL
-- ============================================================
