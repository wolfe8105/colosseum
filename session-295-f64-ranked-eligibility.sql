-- ============================================================
-- F-64: SQL-level ranked eligibility hardening
-- Session 295 | April 21, 2026
--
-- WHAT: Adds server-side 25% profile depth check inside
--       join_debate_queue() when p_ranked = true.
-- WHY:  Currently client-side advisory only via check_ranked_eligible().
--       A direct RPC call with p_ranked=true bypasses the gate.
-- RISK: Zero. Adds an early-exit RAISE before any writes.
--       Casual queue (p_ranked=false) is completely unaffected.
-- ============================================================

-- Drop all overloads first to avoid signature ambiguity
DROP FUNCTION IF EXISTS public.join_debate_queue(text, text, text, boolean);
DROP FUNCTION IF EXISTS public.join_debate_queue(text, text, text, boolean, text, integer);
DROP FUNCTION IF EXISTS public.join_debate_queue(text, text, text, boolean, text);

CREATE OR REPLACE FUNCTION public.join_debate_queue(
  p_mode text,
  p_category text DEFAULT NULL::text,
  p_topic text DEFAULT NULL::text,
  p_ranked boolean DEFAULT false,
  p_ruleset text DEFAULT 'amplified'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_uid       uuid := auth.uid();
  v_elo       int;
  v_queue_id  uuid;
  v_match     record;
  v_debate_id uuid;
  v_topic     text;
  v_ruleset   text;
  v_lang      text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- ── F-64: Server-side ranked eligibility gate ──────────────
  IF COALESCE(p_ranked, false) THEN
    IF (SELECT COALESCE(profile_depth_pct, 0) FROM profiles WHERE id = v_uid) < 25 THEN
      RAISE EXCEPTION 'Ranked requires 25%% profile completion';
    END IF;
  END IF;
  -- ───────────────────────────────────────────────────────────

  v_ruleset := CASE WHEN p_ruleset IN ('amplified', 'unplugged') THEN p_ruleset ELSE 'amplified' END;

  SELECT elo_rating INTO v_elo FROM profiles WHERE id = v_uid;

  DELETE FROM debate_queue WHERE user_id = v_uid AND status = 'waiting';

  SELECT * INTO v_match FROM debate_queue
    WHERE status = 'waiting'
      AND mode = p_mode
      AND user_id != v_uid
      AND ABS(elo_rating - COALESCE(v_elo, 1200)) < 400
      AND COALESCE(ruleset, 'amplified') = v_ruleset
      AND COALESCE(ranked, false) = COALESCE(p_ranked, false)
    ORDER BY joined_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

  IF v_match IS NOT NULL THEN
    v_topic := COALESCE(p_topic, v_match.topic, 'Open Debate');

    INSERT INTO arena_debates (
      debater_a, debater_b, mode, category, topic,
      status, total_rounds, ranked, ruleset
    )
    VALUES (
      v_match.user_id, v_uid, p_mode,
      COALESCE(p_category, v_match.category),
      v_topic, 'pending', 3,
      COALESCE(p_ranked, false), v_ruleset
    )
    RETURNING id INTO v_debate_id;

    -- Read back the language stamped by trigger
    SELECT ad.language INTO v_lang FROM arena_debates ad WHERE ad.id = v_debate_id;

    UPDATE debate_queue
      SET status = 'matched', matched_with = v_uid, debate_id = v_debate_id
      WHERE id = v_match.id;

    INSERT INTO debate_queue (
      user_id, mode, category, topic, elo_rating,
      status, matched_with, debate_id, ranked, ruleset
    )
    VALUES (
      v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200),
      'matched', v_match.user_id, v_debate_id,
      COALESCE(p_ranked, false), v_ruleset
    )
    RETURNING id INTO v_queue_id;

    PERFORM log_event(
      'queue_matched',
      v_uid,
      v_debate_id,
      COALESCE(p_category, v_match.category),
      NULL,
      jsonb_build_object(
        'mode', p_mode,
        'wait_seconds', EXTRACT(EPOCH FROM (now() - v_match.joined_at))::int,
        'elo_gap', ABS(COALESCE(v_elo, 1200) - v_match.elo_rating),
        'ruleset', v_ruleset,
        'ranked', COALESCE(p_ranked, false)
      )
    );

    RETURN json_build_object(
      'status', 'matched',
      'queue_id', v_queue_id,
      'debate_id', v_debate_id,
      'opponent_id', v_match.user_id,
      'topic', v_topic,
      'role', 'b',
      'ruleset', v_ruleset,
      'language', COALESCE(v_lang, 'en')
    );
  ELSE
    INSERT INTO debate_queue (
      user_id, mode, category, topic, elo_rating,
      ranked, ruleset
    )
    VALUES (
      v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200),
      COALESCE(p_ranked, false), v_ruleset
    )
    RETURNING id INTO v_queue_id;

    PERFORM log_event(
      'queue_joined',
      v_uid,
      NULL,
      p_category,
      NULL,
      jsonb_build_object(
        'mode', p_mode,
        'category', p_category,
        'ruleset', v_ruleset,
        'ranked', COALESCE(p_ranked, false)
      )
    );

    RETURN json_build_object('status', 'waiting', 'queue_id', v_queue_id);
  END IF;
END;

$function$;

GRANT EXECUTE ON FUNCTION public.join_debate_queue(text, text, text, boolean, text) TO authenticated;

-- ============================================================
-- VERIFICATION QUERIES (run after applying):
--
--   -- Confirm only 1 overload exists:
--   SELECT proname, pronargs FROM pg_proc WHERE proname = 'join_debate_queue';
--
--   -- Confirm the function body contains the depth check:
--   SELECT prosrc FROM pg_proc WHERE proname = 'join_debate_queue'
--     AND prosrc LIKE '%profile_depth_pct%';
-- ============================================================
