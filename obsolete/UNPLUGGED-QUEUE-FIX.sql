-- ============================================================
-- UNPLUGGED QUEUE FIX
-- Session 211 — March 31, 2026
--
-- Fixes 3 bugs discovered during Unplugged e2e trace:
--   1. join_debate_queue ignores p_ranked + p_ruleset — never written to DB
--   2. get_arena_feed doesn't return ranked/ruleset — feed can't split
--   3. check_queue_status doesn't return ruleset
--
-- Prerequisite: arena_debates already has ranked + ruleset columns
-- (added in prior sessions).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. ADD ranked + ruleset COLUMNS TO debate_queue
-- Needed for matchmaking: Unplugged only matches Unplugged.
-- ────────────────────────────────────────────────────────────

ALTER TABLE debate_queue ADD COLUMN IF NOT EXISTS ranked BOOLEAN DEFAULT false;
ALTER TABLE debate_queue ADD COLUMN IF NOT EXISTS ruleset TEXT DEFAULT 'amplified';


-- ────────────────────────────────────────────────────────────
-- 2. REPLACE join_debate_queue
-- Old signature: (p_mode, p_category, p_topic)
-- New signature: (p_mode, p_category, p_topic, p_ranked, p_ruleset)
--
-- Changes:
--   • Accepts p_ranked + p_ruleset
--   • Match WHERE filters by ruleset (Unplugged ↔ Unplugged only)
--   • Match WHERE filters by ranked (ranked ↔ ranked only)
--   • INSERT into debate_queue includes ranked + ruleset
--   • INSERT into arena_debates includes ranked + ruleset
--   • Return object includes ruleset
-- ────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS join_debate_queue(text, text, text);

CREATE OR REPLACE FUNCTION join_debate_queue(
  p_mode     text,
  p_category text    DEFAULT NULL,
  p_topic    text    DEFAULT NULL,
  p_ranked   boolean DEFAULT false,
  p_ruleset  text    DEFAULT 'amplified'
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_elo       int;
  v_queue_id  uuid;
  v_match     record;
  v_debate_id uuid;
  v_topic     text;
  v_ruleset   text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Sanitize ruleset
  v_ruleset := CASE WHEN p_ruleset IN ('amplified', 'unplugged') THEN p_ruleset ELSE 'amplified' END;

  SELECT elo_rating INTO v_elo FROM profiles WHERE id = v_uid;

  -- Clear any stale waiting entries
  DELETE FROM debate_queue WHERE user_id = v_uid AND status = 'waiting';

  -- Look for a compatible opponent
  -- FIFO, within 400 Elo, same mode, same ruleset, same ranked
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
    -- Pick a topic
    v_topic := COALESCE(p_topic, v_match.topic, 'Open Debate');

    -- Create the arena debate (now includes ranked + ruleset)
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

    -- Update opponent's queue entry
    UPDATE debate_queue
      SET status = 'matched', matched_with = v_uid, debate_id = v_debate_id
      WHERE id = v_match.id;

    -- Insert our entry as matched
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

    -- Analytics: matched
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
      'ruleset', v_ruleset
    );
  ELSE
    -- No match — join queue
    INSERT INTO debate_queue (
      user_id, mode, category, topic, elo_rating,
      ranked, ruleset
    )
    VALUES (
      v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200),
      COALESCE(p_ranked, false), v_ruleset
    )
    RETURNING id INTO v_queue_id;

    -- Analytics: waiting
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
$$;


-- ────────────────────────────────────────────────────────────
-- 3. REPLACE check_queue_status
-- Add ruleset to return object so polling path gets it from server.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_queue_status()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_entry record;
  v_opponent record;
  v_queue_count int;
BEGIN
  SELECT * INTO v_entry FROM debate_queue
    WHERE user_id = auth.uid() AND status IN ('waiting', 'matched')
    ORDER BY joined_at DESC LIMIT 1;

  IF v_entry IS NULL THEN
    RETURN json_build_object('status', 'none');
  END IF;

  IF v_entry.status = 'matched' AND v_entry.matched_with IS NOT NULL THEN
    SELECT display_name, username, elo_rating INTO v_opponent
      FROM profiles WHERE id = v_entry.matched_with;
  END IF;

  -- Count others in queue with same mode/ruleset/ranked
  SELECT count(*) INTO v_queue_count FROM debate_queue
    WHERE status = 'waiting'
      AND mode = v_entry.mode
      AND COALESCE(ruleset, 'amplified') = COALESCE(v_entry.ruleset, 'amplified')
      AND COALESCE(ranked, false) = COALESCE(v_entry.ranked, false)
      AND user_id != auth.uid();

  RETURN json_build_object(
    'status', v_entry.status,
    'queue_id', v_entry.id,
    'mode', v_entry.mode,
    'debate_id', v_entry.debate_id,
    'matched_with', v_entry.matched_with,
    'opponent_name', v_opponent.display_name,
    'opponent_username', v_opponent.username,
    'opponent_elo', v_opponent.elo_rating,
    'role', 'a',
    'ruleset', COALESCE(v_entry.ruleset, 'amplified'),
    'queue_count', v_queue_count
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. REPLACE get_arena_feed
-- Add ranked + ruleset to SELECT so client can split feed.
-- Uses LEFT JOIN on debater_a since F-48 made it nullable.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_arena_feed(p_limit int DEFAULT 20)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_to_json(d) ORDER BY d.created_at DESC)
    FROM (
      (
        -- Live / recent arena debates
        SELECT ad.id, ad.topic, 'arena'::text as source, ad.mode, ad.status,
               ad.current_round, ad.total_rounds,
               ad.score_a, ad.score_b,
               ad.vote_count_a, ad.vote_count_b,
               pa.display_name as debater_a_name, pa.elo_rating as elo_a,
               pb.display_name as debater_b_name, pb.elo_rating as elo_b,
               ad.ranked, ad.ruleset,
               ad.created_at
        FROM arena_debates ad
          LEFT JOIN profiles pa ON pa.id = ad.debater_a
          LEFT JOIN profiles pb ON pb.id = ad.debater_b
        WHERE ad.status IN ('live', 'voting', 'complete')
        ORDER BY ad.created_at DESC
        LIMIT p_limit / 2
      )

      UNION ALL

      (
        -- Auto-debates (Leg 3 content) — always amplified
        SELECT aud.id, aud.topic, 'auto_debate'::text as source, 'ai'::text as mode, aud.status,
               3 as current_round, 3 as total_rounds,
               aud.score_a, aud.score_b,
               (SELECT count(*)::int FROM auto_debate_votes WHERE auto_debate_id = aud.id AND voted_for = 'a') as vote_count_a,
               (SELECT count(*)::int FROM auto_debate_votes WHERE auto_debate_id = aud.id AND voted_for = 'b') as vote_count_b,
               aud.side_a_label as debater_a_name, 0 as elo_a,
               aud.side_b_label as debater_b_name, 0 as elo_b,
               false as ranked, 'amplified'::text as ruleset,
               aud.created_at
        FROM auto_debates aud
        WHERE aud.status = 'active'
        ORDER BY aud.created_at DESC
        LIMIT p_limit / 2
      )
    ) d
  ), '[]'::json);
END;
$$;
