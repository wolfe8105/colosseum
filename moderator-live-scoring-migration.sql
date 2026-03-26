-- ============================================================
-- THE MODERATOR — LIVE MODERATOR SCORING
-- Session 178 — March 26, 2026
--
-- WHAT THIS DOES:
-- 1. Adds scoring_budget_per_round column to arena_debates (nullable, parked)
-- 2. Creates score_debate_comment RPC (moderator live-scores a speech event)
-- 3. Creates pin_feed_event RPC (moderator pins a comment for later scoring)
--
-- DEPENDS ON:
--   - arena_debates table (moderator-arena-schema.sql)
--   - debate_feed_events table (moderator-feed-table-migration.sql)
--   - insert_feed_event() function (moderator-feed-table-migration.sql)
--   - log_event() function (moderator-analytics-migration.sql)
--   - sanitize_text() function (moderator-move3-sanitize-ratelimit.sql)
--
-- DOES NOT TOUCH:
--   - score_moderator RPC (post-debate moderator rating — separate system)
--   - moderator_scores table (post-debate moderator rating — separate system)
--
-- Safe to re-run (uses CREATE OR REPLACE, ALTER IF NOT EXISTS)
-- ============================================================


-- ████████████████████████████████████████████████████████████
-- PART 1: SCHEMA — scoring_budget_per_round
--
-- NULL = budget not enforced (parked per spec Section 20).
-- When set to an integer, score_debate_comment enforces the cap.
-- Example: SET scoring_budget_per_round = 5 means the moderator
-- can award points to at most 5 comments per round.
-- ████████████████████████████████████████████████████████████

ALTER TABLE arena_debates
  ADD COLUMN IF NOT EXISTS scoring_budget_per_round INT DEFAULT NULL;

COMMENT ON COLUMN arena_debates.scoring_budget_per_round IS
  'Max point_award events per round for the moderator. NULL = no limit (parked). '
  'Set when token economy is designed. Enforced by score_debate_comment RPC.';


-- ████████████████████████████████████████████████████████████
-- PART 2: score_debate_comment RPC
--
-- Flow:
--   1. Moderator taps a speech comment in the feed
--   2. Inline 1-2-3-4-5 button row appears
--   3. Moderator taps a number
--   4. Client calls this RPC
--   5. RPC validates: caller is moderator, debate is live/round_break,
--      target is a speech event, not already scored, budget not exhausted
--   6. Atomically: inserts point_award into debate_feed_events (fires
--      broadcast trigger), increments score_a or score_b on arena_debates
--   7. Returns new totals so client can optimistically update scoreboard
--
-- The point_award event metadata includes:
--   scored_event_id — which speech event was scored
--   score_a_after   — running total for side A after this award
--   score_b_after   — running total for side B after this award
--
-- Clients read scoreboard state directly from point_award events.
-- No separate scoreboard query needed. On reconnect backfill,
-- the last point_award event's metadata has current totals.
-- ████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION score_debate_comment(
  p_debate_id UUID,
  p_feed_event_id BIGINT,    -- the speech event being scored
  p_score INT                 -- 1 through 5
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_debate RECORD;
  v_target RECORD;
  v_side TEXT;
  v_new_score_a INT;
  v_new_score_b INT;
  v_budget_used INT;
  v_target_round INT;
  v_award_event_id BIGINT;
BEGIN
  -- ── Auth ──────────────────────────────────────────────
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ── Load debate ───────────────────────────────────────
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- ── Caller must be this debate's moderator ────────────
  IF v_uid != v_debate.moderator_id THEN
    RAISE EXCEPTION 'Only the moderator can score comments';
  END IF;

  -- ── Debate must be in progress ────────────────────────
  IF v_debate.status NOT IN ('live', 'round_break') THEN
    RAISE EXCEPTION 'Debate must be live or in round break to score';
  END IF;

  -- ── Score range ───────────────────────────────────────
  IF p_score < 1 OR p_score > 5 THEN
    RAISE EXCEPTION 'Score must be between 1 and 5';
  END IF;

  -- ── Load target feed event ────────────────────────────
  SELECT * INTO v_target
    FROM debate_feed_events
    WHERE id = p_feed_event_id AND debate_id = p_debate_id;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Feed event not found in this debate';
  END IF;

  -- ── Target must be a speech event ─────────────────────
  IF v_target.event_type != 'speech' THEN
    RAISE EXCEPTION 'Can only score speech events';
  END IF;

  -- ── Determine which side gets the points ──────────────
  v_side := v_target.side;
  IF v_side NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'Speech event has invalid side';
  END IF;

  -- ── Double-scoring prevention ─────────────────────────
  -- Check if a point_award already exists for this speech event.
  IF EXISTS (
    SELECT 1 FROM debate_feed_events
    WHERE debate_id = p_debate_id
      AND event_type = 'point_award'
      AND metadata->>'scored_event_id' = p_feed_event_id::text
  ) THEN
    RAISE EXCEPTION 'This comment has already been scored';
  END IF;

  -- ── Budget enforcement (if budget is set) ─────────────
  v_target_round := v_target.round;

  IF v_debate.scoring_budget_per_round IS NOT NULL THEN
    SELECT COUNT(*) INTO v_budget_used
      FROM debate_feed_events
      WHERE debate_id = p_debate_id
        AND event_type = 'point_award'
        AND round = v_target_round;

    IF v_budget_used >= v_debate.scoring_budget_per_round THEN
      RAISE EXCEPTION 'Scoring budget exhausted for round %', v_target_round;
    END IF;
  END IF;

  -- ── Atomic scoreboard increment ───────────────────────
  -- SET score_x = score_x + p_score is atomic under READ COMMITTED.
  -- Single moderator per debate = no row contention.
  IF v_side = 'a' THEN
    UPDATE arena_debates
      SET score_a = score_a + p_score
      WHERE id = p_debate_id
      RETURNING score_a, score_b INTO v_new_score_a, v_new_score_b;
  ELSE
    UPDATE arena_debates
      SET score_b = score_b + p_score
      WHERE id = p_debate_id
      RETURNING score_a, score_b INTO v_new_score_a, v_new_score_b;
  END IF;

  -- ── Insert point_award event into feed ────────────────
  -- This fires the broadcast trigger (broadcast_feed_event)
  -- which pushes to all clients on debate:<debate_id>.
  -- Bypasses RLS because SECURITY DEFINER.
  INSERT INTO debate_feed_events (
    debate_id, user_id, event_type, round, side, content, score,
    reference_id, metadata
  ) VALUES (
    p_debate_id,
    v_uid,
    'point_award',
    v_target_round,
    v_side,
    NULL,                                    -- no text content for scoring
    p_score,
    NULL,
    jsonb_build_object(
      'scored_event_id', p_feed_event_id,    -- links to the speech event
      'score_a_after', v_new_score_a,        -- running total side A
      'score_b_after', v_new_score_b         -- running total side B
    )
  )
  RETURNING id INTO v_award_event_id;

  -- ── Analytics double-write ────────────────────────────
  PERFORM log_event(
    'feed_point_award',
    v_uid,
    p_debate_id,
    v_debate.category,
    v_side,
    jsonb_build_object(
      'feed_event_id', v_award_event_id,
      'scored_event_id', p_feed_event_id,
      'score', p_score,
      'round', v_target_round,
      'score_a_after', v_new_score_a,
      'score_b_after', v_new_score_b
    )
  );

  RETURN json_build_object(
    'success', true,
    'id', v_award_event_id,
    'score', p_score,
    'side', v_side,
    'round', v_target_round,
    'score_a', v_new_score_a,
    'score_b', v_new_score_b
  );
END;
$$;


-- ████████████████████████████████████████████████████████████
-- PART 3: pin_feed_event RPC
--
-- Moderator-only toggle. Sets metadata.pinned = true/false
-- on a speech event. Pinned comments appear in the moderator's
-- scoring queue during ad breaks (spec Section 6.2).
--
-- Pinning is INVISIBLE to everyone except the moderator
-- (spec: "Prevents debaters from changing behavior").
-- The broadcast trigger is AFTER INSERT only — it does NOT fire
-- on this UPDATE. The moderator's client gets the pin state
-- from the RPC response. No other clients see pin changes.
-- This is correct per spec: pinning is moderator-private.
--
-- Exception to append-only: this is the ONLY UPDATE allowed
-- on debate_feed_events. Controlled via SECURITY DEFINER
-- bypassing the USING(false) UPDATE RLS policy.
-- ████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION pin_feed_event(
  p_debate_id UUID,
  p_feed_event_id BIGINT
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_debate RECORD;
  v_target RECORD;
  v_currently_pinned BOOLEAN;
  v_new_pinned BOOLEAN;
BEGIN
  -- ── Auth ──────────────────────────────────────────────
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ── Load debate ───────────────────────────────────────
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- ── Caller must be moderator ──────────────────────────
  IF v_uid != v_debate.moderator_id THEN
    RAISE EXCEPTION 'Only the moderator can pin comments';
  END IF;

  -- ── Debate must be in progress ────────────────────────
  IF v_debate.status NOT IN ('live', 'round_break') THEN
    RAISE EXCEPTION 'Can only pin during active debate';
  END IF;

  -- ── Load target event ─────────────────────────────────
  SELECT * INTO v_target
    FROM debate_feed_events
    WHERE id = p_feed_event_id AND debate_id = p_debate_id;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Feed event not found in this debate';
  END IF;

  -- ── Target must be a speech event ─────────────────────
  IF v_target.event_type != 'speech' THEN
    RAISE EXCEPTION 'Can only pin speech events';
  END IF;

  -- ── Toggle pin state ──────────────────────────────────
  v_currently_pinned := COALESCE((v_target.metadata->>'pinned')::boolean, false);
  v_new_pinned := NOT v_currently_pinned;

  -- jsonb_set adds or replaces the 'pinned' key in metadata.
  -- create_missing = true (4th arg) ensures key is created on first pin.
  UPDATE debate_feed_events
    SET metadata = jsonb_set(metadata, '{pinned}', to_jsonb(v_new_pinned), true)
    WHERE id = p_feed_event_id AND debate_id = p_debate_id;

  RETURN json_build_object(
    'success', true,
    'feed_event_id', p_feed_event_id,
    'pinned', v_new_pinned
  );
END;
$$;


-- ████████████████████████████████████████████████████████████
-- PART 4: INDEX for double-scoring check
--
-- The double-scoring EXISTS query filters on:
--   debate_id + event_type='point_award' + metadata->>'scored_event_id'
--
-- idx_feed_events_debate (debate_id, created_at) covers the first filter.
-- For the metadata JSONB lookup, a partial GIN index on point_award
-- events makes the EXISTS check efficient even at scale.
-- ████████████████████████████████████████████████████████████

CREATE INDEX IF NOT EXISTS idx_feed_events_scored_ref
  ON debate_feed_events ((metadata->>'scored_event_id'))
  WHERE event_type = 'point_award';


-- ████████████████████████████████████████████████████████████
-- DONE
--
-- EXISTING CODE STATUS:
--   score_moderator RPC      — UNTOUCHED (post-debate mod rating, System B)
--   moderator_scores table   — UNTOUCHED (post-debate mod rating, System B)
--   update_arena_debate RPC  — UNTOUCHED (still sets score_a/score_b via
--                              COALESCE for backward compat with AI sparring)
--   insert_feed_event RPC    — UNTOUCHED (score_debate_comment writes
--                              directly to debate_feed_events, not via
--                              insert_feed_event, because it needs the
--                              atomic increment + metadata in one transaction)
--
-- CLIENT-SIDE USAGE:
--
--   // Moderator taps a comment (speech event id=42), gives it a 4
--   const { data } = await supabase.rpc('score_debate_comment', {
--     p_debate_id: debateId,
--     p_feed_event_id: 42,
--     p_score: 4
--   });
--   // data = { success, id, score, side, round, score_a, score_b }
--   // score_a and score_b are the new running totals
--
--   // Moderator pins a comment for later scoring
--   const { data } = await supabase.rpc('pin_feed_event', {
--     p_debate_id: debateId,
--     p_feed_event_id: 42
--   });
--   // data = { success, feed_event_id, pinned: true/false }
--
--   // Client reads scoreboard from point_award broadcast events:
--   channel.on('broadcast', { event: 'INSERT' }, (payload) => {
--     const row = payload.new;
--     if (row.event_type === 'point_award') {
--       updateScoreboard(
--         row.metadata.score_a_after,
--         row.metadata.score_b_after
--       );
--       playFireworksAnimation(row.side, row.score);
--     }
--   });
--
-- LAND MINE:
--   score_debate_comment writes DIRECTLY to debate_feed_events
--   (not via insert_feed_event RPC) because it needs the atomic
--   UPDATE ... RETURNING on arena_debates in the same transaction
--   to get score_a_after/score_b_after for the metadata. The
--   broadcast trigger still fires on the INSERT. The log_event
--   double-write is done explicitly. If insert_feed_event ever
--   adds new logic (rate limiting, etc), score_debate_comment
--   must be updated separately.
-- ████████████████████████████████████████████████████████████
