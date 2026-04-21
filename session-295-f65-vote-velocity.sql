-- ============================================================
-- F-65: Vote velocity detection (invisible fraud)
-- Session 295 | April 21, 2026
--
-- WHAT: Server-side invisible velocity analysis on spectator
--       votes. Flags debates where >5 votes for the same side
--       land within 10 seconds. Zero user friction — votes still
--       go through, debate gets flagged for review.
-- WHY:  Bot farms or coordinated vote manipulation can tilt
--       debate outcomes. This detects suspicious bursts without
--       blocking legitimate users.
-- RISK: Zero friction. Worst case: a popular debate gets flagged
--       and reviewed manually. No votes are discarded.
-- ============================================================


-- ── 1. New columns on arena_debates ──────────────────────────

ALTER TABLE arena_debates
  ADD COLUMN IF NOT EXISTS velocity_flagged_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE arena_debates
  ADD COLUMN IF NOT EXISTS velocity_flag_count INT DEFAULT 0;

COMMENT ON COLUMN arena_debates.velocity_flagged_at IS 'F-65: First velocity flag timestamp';
COMMENT ON COLUMN arena_debates.velocity_flag_count IS 'F-65: Number of times velocity threshold was hit';


-- ── 2. Add voted_at column to arena_votes if missing ─────────
-- Needed for time-window velocity queries

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arena_votes' AND column_name = 'voted_at'
  ) THEN
    ALTER TABLE arena_votes ADD COLUMN voted_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;


-- ── 3. Index for velocity lookups ────────────────────────────

CREATE INDEX IF NOT EXISTS idx_arena_votes_velocity
  ON arena_votes (debate_id, vote, voted_at DESC);


-- ── 4. Updated vote_arena_debate with velocity detection ─────

CREATE OR REPLACE FUNCTION public.vote_arena_debate(p_debate_id uuid, p_vote text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_uid uuid := auth.uid();
  v_debate RECORD;
  v_velocity_count INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_vote NOT IN ('a', 'b') THEN RAISE EXCEPTION 'Invalid vote'; END IF;

  -- Block participants from voting in their own debate
  SELECT debater_a, debater_b INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Debate not found'; END IF;
  IF v_uid IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Cannot vote in your own debate';
  END IF;

  -- Insert/update vote (voted_at always refreshed)
  INSERT INTO arena_votes (debate_id, user_id, vote, voted_at)
  VALUES (p_debate_id, v_uid, p_vote, now())
  ON CONFLICT (debate_id, user_id) DO UPDATE SET vote = p_vote, voted_at = now();

  -- Update cached counts
  UPDATE arena_debates SET
    vote_count_a = (SELECT count(*) FROM arena_votes WHERE debate_id = p_debate_id AND vote = 'a'),
    vote_count_b = (SELECT count(*) FROM arena_votes WHERE debate_id = p_debate_id AND vote = 'b')
  WHERE id = p_debate_id;

  -- ── F-65: Velocity detection ──────────────────────────────
  -- Count same-side votes in the last 10 seconds
  SELECT COUNT(*) INTO v_velocity_count
  FROM arena_votes
  WHERE debate_id = p_debate_id
    AND vote = p_vote
    AND voted_at > now() - interval '10 seconds';

  -- Threshold: >5 same-side votes in 10 seconds = suspicious
  IF v_velocity_count > 5 THEN
    -- Flag the debate (increment counter, set first-flag timestamp)
    UPDATE arena_debates
    SET velocity_flag_count = velocity_flag_count + 1,
        velocity_flagged_at = COALESCE(velocity_flagged_at, now())
    WHERE id = p_debate_id;

    -- Log security event
    PERFORM log_event(
      p_event_type := 'vote_velocity_flag',
      p_user_id    := v_uid,
      p_debate_id  := p_debate_id,
      p_category   := NULL,
      p_side       := p_vote,
      p_metadata   := jsonb_build_object(
        'velocity_count', v_velocity_count,
        'window_seconds', 10,
        'threshold', 5,
        'flag_number', (SELECT velocity_flag_count FROM arena_debates WHERE id = p_debate_id)
      )
    );
  END IF;
  -- ──────────────────────────────────────────────────────────

  RETURN json_build_object('success', true);
END;

$function$;


-- ── 5. Admin query: find flagged debates ─────────────────────
-- Not an RPC — just a query for manual review.
--
--   SELECT id, topic, velocity_flag_count, velocity_flagged_at,
--          vote_count_a, vote_count_b, status
--   FROM arena_debates
--   WHERE velocity_flagged_at IS NOT NULL
--   ORDER BY velocity_flagged_at DESC;


-- ============================================================
-- VERIFICATION QUERIES (run after applying):
--
--   -- Confirm new columns exist:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'arena_debates'
--       AND column_name IN ('velocity_flagged_at', 'velocity_flag_count');
--
--   -- Confirm voted_at column on arena_votes:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'arena_votes' AND column_name = 'voted_at';
--
--   -- Confirm velocity index:
--   SELECT indexname FROM pg_indexes
--     WHERE tablename = 'arena_votes' AND indexname = 'idx_arena_votes_velocity';
--
--   -- Confirm function has velocity check:
--   SELECT prosrc FROM pg_proc WHERE proname = 'vote_arena_debate'
--     AND prosrc LIKE '%velocity%';
-- ============================================================
