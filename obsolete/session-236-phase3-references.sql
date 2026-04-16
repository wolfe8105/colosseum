-- ============================================================
-- F-51 PHASE 3: Reference System (loadout, cite, challenge)
-- Session 236
-- 
-- Creates:
--   1. debate_reference_loadouts table
--   2. save_debate_loadout RPC
--   3. get_my_debate_loadout RPC
--   4. cite_debate_reference RPC (atomic: mark cited + stats + feed event)
--   5. file_reference_challenge RPC (atomic: limit check + Shield + feed event)
-- ============================================================


-- ============================================================
-- 1. TABLE: debate_reference_loadouts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.debate_reference_loadouts (
  id         BIGSERIAL PRIMARY KEY,
  debate_id  UUID NOT NULL REFERENCES public.arena_debates(id),
  user_id    UUID NOT NULL,
  reference_id UUID NOT NULL REFERENCES public.arsenal_references(id),
  cited      BOOLEAN DEFAULT FALSE,
  cited_at   TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(debate_id, user_id, reference_id)
);

-- Index for fast lookups: "my loadout for this debate"
CREATE INDEX IF NOT EXISTS idx_debate_ref_loadouts_debate_user
  ON public.debate_reference_loadouts(debate_id, user_id);

-- RLS: block all direct client access, SECURITY DEFINER RPCs only
ALTER TABLE public.debate_reference_loadouts ENABLE ROW LEVEL SECURITY;
-- No permissive policies = all direct access blocked for anon/authenticated


-- ============================================================
-- 2. RPC: save_debate_loadout
--    Debater selects up to 5 references before entering the room.
--    Replaces any previous selection (delete + re-insert).
-- ============================================================

CREATE OR REPLACE FUNCTION public.save_debate_loadout(
  p_debate_id    UUID,
  p_reference_ids UUID[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid       UUID := auth.uid();
  v_debate    RECORD;
  v_ref_count INTEGER;
  v_owned     INTEGER;
  v_rid       UUID;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate debate exists and caller is a debater
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_uid NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Only debaters can load references';
  END IF;

  -- Debate must not be live yet (loadout is pre-debate)
  IF v_debate.status NOT IN ('pending', 'lobby', 'matched') THEN
    RAISE EXCEPTION 'Can only load references before debate starts';
  END IF;

  -- Max 5
  v_ref_count := COALESCE(array_length(p_reference_ids, 1), 0);
  IF v_ref_count > 5 THEN
    RAISE EXCEPTION 'Maximum 5 references per debate';
  END IF;

  -- Empty array = clear loadout
  IF v_ref_count = 0 THEN
    DELETE FROM debate_reference_loadouts
      WHERE debate_id = p_debate_id AND user_id = v_uid;
    RETURN jsonb_build_object('success', true, 'loaded', 0);
  END IF;

  -- Verify all references belong to the caller
  SELECT COUNT(*) INTO v_owned
    FROM arsenal_references
    WHERE id = ANY(p_reference_ids) AND user_id = v_uid;
  IF v_owned != v_ref_count THEN
    RAISE EXCEPTION 'Can only load your own references';
  END IF;

  -- Replace: delete old, insert new
  DELETE FROM debate_reference_loadouts
    WHERE debate_id = p_debate_id AND user_id = v_uid;

  FOREACH v_rid IN ARRAY p_reference_ids LOOP
    INSERT INTO debate_reference_loadouts (debate_id, user_id, reference_id)
    VALUES (p_debate_id, v_uid, v_rid);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'loaded', v_ref_count);
END;
$function$;


-- ============================================================
-- 3. RPC: get_my_debate_loadout
--    Returns caller's loaded references for a debate, joined
--    with arsenal_references for display data.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_debate_loadout(p_debate_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
    FROM (
      SELECT
        drl.reference_id,
        drl.cited,
        drl.cited_at,
        ar.claim,
        ar.url,
        ar.domain,
        ar.author,
        ar.source_type,
        ar.current_power,
        ar.power_ceiling,
        ar.rarity,
        ar.verification_points,
        ar.citation_count,
        ar.win_count,
        ar.loss_count
      FROM debate_reference_loadouts drl
      JOIN arsenal_references ar ON ar.id = drl.reference_id
      WHERE drl.debate_id = p_debate_id
        AND drl.user_id = v_uid
      ORDER BY ar.current_power DESC, ar.created_at DESC
    ) r
  );
END;
$function$;


-- ============================================================
-- 4. RPC: cite_debate_reference
--    Atomic: marks cited in loadout, updates arsenal stats,
--    inserts reference_cite feed event. No pause. Instant.
--    WARNING (LM-191): Writes directly to debate_feed_events,
--    bypassing insert_feed_event. Any new validation added to
--    insert_feed_event must be manually replicated here.
-- ============================================================

CREATE OR REPLACE FUNCTION public.cite_debate_reference(
  p_debate_id    UUID,
  p_reference_id UUID,
  p_round        INTEGER,
  p_side         TEXT    -- 'a' or 'b'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid      UUID := auth.uid();
  v_debate   RECORD;
  v_loadout  RECORD;
  v_ref      RECORD;
  v_event_id BIGINT;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate side
  IF p_side NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'Side must be a or b';
  END IF;

  -- Load debate
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status != 'live' THEN
    RAISE EXCEPTION 'Debate is not live';
  END IF;

  -- Caller must be the debater matching p_side
  IF (p_side = 'a' AND v_uid != v_debate.debater_a)
  OR (p_side = 'b' AND v_uid != v_debate.debater_b) THEN
    RAISE EXCEPTION 'Side does not match your role';
  END IF;

  -- Check loadout: reference must be loaded and not yet cited
  SELECT * INTO v_loadout
    FROM debate_reference_loadouts
    WHERE debate_id = p_debate_id
      AND user_id = v_uid
      AND reference_id = p_reference_id
    FOR UPDATE;

  IF v_loadout IS NULL THEN
    RAISE EXCEPTION 'Reference not in your loadout for this debate';
  END IF;
  IF v_loadout.cited THEN
    RAISE EXCEPTION 'Reference already cited (one and done)';
  END IF;

  -- Get arsenal reference for claim text
  SELECT * INTO v_ref FROM arsenal_references WHERE id = p_reference_id;
  IF v_ref IS NULL THEN
    RAISE EXCEPTION 'Arsenal reference not found';
  END IF;

  -- Mark cited
  UPDATE debate_reference_loadouts
    SET cited = true, cited_at = now()
    WHERE id = v_loadout.id;

  -- Update arsenal stats (citation_count)
  UPDATE arsenal_references
    SET citation_count = citation_count + 1
    WHERE id = p_reference_id;

  -- Insert feed event
  INSERT INTO debate_feed_events (
    debate_id, user_id, event_type, round, side, content,
    reference_id, metadata
  ) VALUES (
    p_debate_id, v_uid, 'reference_cite', p_round, p_side,
    sanitize_text(v_ref.claim),
    p_reference_id,
    jsonb_build_object(
      'url', v_ref.url,
      'domain', v_ref.domain,
      'source_type', v_ref.source_type,
      'current_power', v_ref.current_power,
      'rarity', v_ref.rarity
    )
  )
  RETURNING id INTO v_event_id;

  -- Analytics double-write
  PERFORM log_event(
    'feed_reference_cite', v_uid, p_debate_id,
    v_debate.category, p_side,
    jsonb_build_object(
      'feed_event_id', v_event_id,
      'round', p_round,
      'reference_id', p_reference_id,
      'source_type', v_ref.source_type
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'claim', v_ref.claim,
    'reference_id', p_reference_id
  );
END;
$function$;


-- ============================================================
-- 5. RPC: file_reference_challenge
--    Atomic: checks challenge limit (FEED_TOTAL_ROUNDS - 1 = 3),
--    checks opponent Shield, inserts feed event.
--    Returns {blocked: true} if Shield absorbed it,
--    or {blocked: false, event_id} if challenge filed.
--    WARNING (LM-191): Writes directly to debate_feed_events,
--    bypassing insert_feed_event. Any new validation added to
--    insert_feed_event must be manually replicated here.
-- ============================================================

CREATE OR REPLACE FUNCTION public.file_reference_challenge(
  p_debate_id    UUID,
  p_reference_id UUID,  -- the arsenal reference being challenged
  p_round        INTEGER,
  p_side         TEXT    -- challenger's side ('a' or 'b')
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid             UUID := auth.uid();
  v_debate          RECORD;
  v_ref             RECORD;
  v_ref_owner       UUID;
  v_challenge_count INTEGER;
  v_max_challenges  INTEGER := 3;  -- FEED_TOTAL_ROUNDS (4) - 1
  v_shield_row      RECORD;
  v_event_id        BIGINT;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate side
  IF p_side NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'Side must be a or b';
  END IF;

  -- Load debate
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status != 'live' THEN
    RAISE EXCEPTION 'Debate is not live';
  END IF;

  -- Caller must be the debater matching p_side
  IF (p_side = 'a' AND v_uid != v_debate.debater_a)
  OR (p_side = 'b' AND v_uid != v_debate.debater_b) THEN
    RAISE EXCEPTION 'Side does not match your role';
  END IF;

  -- The challenged reference must belong to the OPPONENT
  SELECT * INTO v_ref FROM arsenal_references WHERE id = p_reference_id;
  IF v_ref IS NULL THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;
  v_ref_owner := v_ref.user_id;

  -- Verify the opponent owns this reference
  IF p_side = 'a' AND v_ref_owner != v_debate.debater_b THEN
    RAISE EXCEPTION 'Can only challenge opponent references';
  END IF;
  IF p_side = 'b' AND v_ref_owner != v_debate.debater_a THEN
    RAISE EXCEPTION 'Can only challenge opponent references';
  END IF;

  -- Verify this reference was actually cited in this debate
  IF NOT EXISTS (
    SELECT 1 FROM debate_feed_events
    WHERE debate_id = p_debate_id
      AND event_type = 'reference_cite'
      AND reference_id = p_reference_id
  ) THEN
    RAISE EXCEPTION 'Reference has not been cited in this debate';
  END IF;

  -- Prevent double-challenging the same reference
  IF EXISTS (
    SELECT 1 FROM debate_feed_events
    WHERE debate_id = p_debate_id
      AND event_type = 'reference_challenge'
      AND reference_id = p_reference_id
  ) THEN
    RAISE EXCEPTION 'This reference has already been challenged';
  END IF;

  -- Check challenge limit: max (FEED_TOTAL_ROUNDS - 1) per debater per debate
  SELECT COUNT(*) INTO v_challenge_count
    FROM debate_feed_events
    WHERE debate_id = p_debate_id
      AND user_id = v_uid
      AND event_type = 'reference_challenge';

  IF v_challenge_count >= v_max_challenges THEN
    RAISE EXCEPTION 'No challenges remaining (% of % used)', v_challenge_count, v_max_challenges;
  END IF;

  -- Check opponent Shield: equipped but not yet activated
  SELECT * INTO v_shield_row
    FROM debate_power_ups
    WHERE debate_id = p_debate_id
      AND user_id = v_ref_owner
      AND power_up_id = 'shield'
      AND activated = false
    LIMIT 1
    FOR UPDATE;

  IF v_shield_row IS NOT NULL THEN
    -- Shield absorbs the challenge
    UPDATE debate_power_ups
      SET activated = true, activated_at = now()
      WHERE id = v_shield_row.id;

    -- Insert Shield block feed event (visible to everyone)
    INSERT INTO debate_feed_events (
      debate_id, user_id, event_type, round, side, content,
      reference_id, metadata
    ) VALUES (
      p_debate_id, v_ref_owner, 'power_up', p_round,
      CASE WHEN v_ref_owner = v_debate.debater_a THEN 'a' ELSE 'b' END,
      'SHIELD BLOCKED! Reference is protected.',
      p_reference_id,
      jsonb_build_object(
        'power_up_id', 'shield',
        'blocked_challenger', v_uid,
        'claim', v_ref.claim
      )
    )
    RETURNING id INTO v_event_id;

    PERFORM log_event(
      'feed_shield_block', v_ref_owner, p_debate_id,
      v_debate.category, p_side,
      jsonb_build_object(
        'feed_event_id', v_event_id,
        'round', p_round,
        'reference_id', p_reference_id,
        'challenger', v_uid
      )
    );

    RETURN jsonb_build_object(
      'blocked', true,
      'event_id', v_event_id,
      'message', 'Shield absorbed the challenge'
    );
  END IF;

  -- No Shield — file the challenge
  INSERT INTO debate_feed_events (
    debate_id, user_id, event_type, round, side, content,
    reference_id, metadata
  ) VALUES (
    p_debate_id, v_uid, 'reference_challenge', p_round, p_side,
    sanitize_text(v_ref.claim),
    p_reference_id,
    jsonb_build_object(
      'challenged_user', v_ref_owner,
      'url', v_ref.url,
      'domain', v_ref.domain,
      'source_type', v_ref.source_type
    )
  )
  RETURNING id INTO v_event_id;

  PERFORM log_event(
    'feed_reference_challenge', v_uid, p_debate_id,
    v_debate.category, p_side,
    jsonb_build_object(
      'feed_event_id', v_event_id,
      'round', p_round,
      'reference_id', p_reference_id,
      'challenged_user', v_ref_owner,
      'challenges_used', v_challenge_count + 1,
      'challenges_max', v_max_challenges
    )
  );

  RETURN jsonb_build_object(
    'blocked', false,
    'event_id', v_event_id,
    'challenges_remaining', v_max_challenges - v_challenge_count - 1
  );
END;
$function$;
