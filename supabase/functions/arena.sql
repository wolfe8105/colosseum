-- THE MODERATOR — Deployed Functions Export
-- Auto-generated from Supabase production database
-- Last updated: Session 252 (April 9, 2026) — F-55 Reference System Overhaul landed
--
-- This file is the source of truth for what RPCs are live in production.
-- Re-export after any session that modifies RPCs.

-- Domain: arena

-- Functions: 55

-- Auto-generated from supabase-deployed-functions-export.sql


CREATE OR REPLACE FUNCTION public.activate_power_up(p_debate_id uuid, p_power_up_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id uuid := auth.uid();
  v_row debate_power_ups%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_row
    FROM debate_power_ups
   WHERE debate_id = p_debate_id
     AND user_id = v_user_id
     AND power_up_id = p_power_up_id
     AND activated_at IS NULL
   LIMIT 1;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Power-up not equipped or already activated');
  END IF;

  UPDATE debate_power_ups
     SET activated = true, activated_at = now()
   WHERE id = v_row.id;

  RETURN jsonb_build_object('success', true, 'power_up_id', p_power_up_id);
END;

$function$;

CREATE OR REPLACE FUNCTION public.advance_round(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
BEGIN
  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id;

  IF v_debate.status != 'live' THEN
    RAISE EXCEPTION 'Debate is not live';
  END IF;
  IF v_user_id NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_debate.current_round >= v_debate.total_rounds THEN
    -- Move to voting phase
    UPDATE public.debates
    SET status = 'voting', updated_at = now()
    WHERE id = p_debate_id;

    -- FIXED: named parameters (LM-188 audit)
    PERFORM log_event(
      p_event_type := 'round_advanced',
      p_user_id    := v_user_id,
      p_debate_id  := p_debate_id,
      p_category   := v_debate.category,
      p_side       := NULL,
      p_metadata   := jsonb_build_object(
        'from_round', v_debate.current_round,
        'to_round', 'voting'
      )
    );

    RETURN json_build_object('success', true, 'status', 'voting', 'round', v_debate.current_round);
  ELSE
    UPDATE public.debates
    SET current_round = current_round + 1, updated_at = now()
    WHERE id = p_debate_id;

    -- FIXED: named parameters (LM-188 audit)
    PERFORM log_event(
      p_event_type := 'round_advanced',
      p_user_id    := v_user_id,
      p_debate_id  := p_debate_id,
      p_category   := v_debate.category,
      p_side       := NULL,
      p_metadata   := jsonb_build_object(
        'from_round', v_debate.current_round,
        'to_round', v_debate.current_round + 1
      )
    );

    RETURN json_build_object('success', true, 'status', 'live', 'round', v_debate.current_round + 1);
  END IF;
END;

$function$;

CREATE OR REPLACE FUNCTION public.broadcast_feed_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  PERFORM realtime.broadcast_changes(
    'debate:' || NEW.debate_id::text,   -- topic: debate:<uuid>
    TG_OP,                               -- event: INSERT
    TG_OP,                               -- operation: INSERT
    TG_TABLE_NAME,                       -- table: debate_feed_events
    TG_TABLE_SCHEMA,                     -- schema: public
    NEW,                                 -- new record
    OLD                                  -- old record (NULL for INSERT)
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Never let broadcast failure block the INSERT.
  -- Event is safely in the table. Clients backfill on reconnect.
  RAISE WARNING 'broadcast_feed_event failed: % %', SQLERRM, SQLSTATE;
  RETURN NULL;
END;

$function$;

CREATE OR REPLACE FUNCTION public.bump_spectator_count(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  UPDATE arena_debates
    SET spectator_count = spectator_count + 1
    WHERE id = p_debate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  RETURN json_build_object('success', true);
END;

$function$;

CREATE OR REPLACE FUNCTION public.calculate_elo(rating_a integer, rating_b integer, winner text, debates_a integer DEFAULT 0, debates_b integer DEFAULT 0)
 RETURNS TABLE(new_rating_a integer, new_rating_b integer, change_a integer, change_b integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  k_a INTEGER;
  k_b INTEGER;
  expected_a NUMERIC;
  expected_b NUMERIC;
  score_a NUMERIC;
  score_b NUMERIC;
  delta_a INTEGER;
  delta_b INTEGER;
BEGIN
  -- K-factor: 40 for first 30 debates, 24 for 30-100, 16 after 100
  k_a := CASE
    WHEN debates_a < 30 THEN 40
    WHEN debates_a < 100 THEN 24
    ELSE 16
  END;
  k_b := CASE
    WHEN debates_b < 30 THEN 40
    WHEN debates_b < 100 THEN 24
    ELSE 16
  END;

  -- Expected scores
  expected_a := 1.0 / (1.0 + POWER(10.0, (rating_b - rating_a)::NUMERIC / 400.0));
  expected_b := 1.0 - expected_a;

  -- Actual scores
  IF winner = 'a' THEN
    score_a := 1.0;
    score_b := 0.0;
  ELSIF winner = 'b' THEN
    score_a := 0.0;
    score_b := 1.0;
  ELSE
    score_a := 0.5;
    score_b := 0.5;
  END IF;

  -- Calculate changes
  delta_a := ROUND(k_a * (score_a - expected_a));
  delta_b := ROUND(k_b * (score_b - expected_b));

  -- Floor at 100 Elo
  new_rating_a := GREATEST(100, rating_a + delta_a);
  new_rating_b := GREATEST(100, rating_b + delta_b);
  change_a := new_rating_a - rating_a;
  change_b := new_rating_b - rating_b;

  RETURN QUERY SELECT new_rating_a, new_rating_b, change_a, change_b;
END;

$function$;

CREATE OR REPLACE FUNCTION public.cancel_private_lobby(p_debate_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE arena_debates
  SET status = 'cancelled'
  WHERE id        = p_debate_id
    AND debater_a = v_user_id
    AND status    = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lobby not found or already started';
  END IF;
END;

$function$;

CREATE OR REPLACE FUNCTION public.cast_sentiment_vote(p_debate_id uuid, p_side text, p_round integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_existing BIGINT;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  
  -- Validate side
  IF p_side NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'invalid side';
  END IF;
  
  -- Debate must exist and be live
  SELECT id, status INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF NOT FOUND OR v_debate.status != 'live' THEN
    RAISE EXCEPTION 'debate not live';
  END IF;
  
  -- One vote per user per round
  SELECT id INTO v_existing FROM debate_feed_events
    WHERE debate_id = p_debate_id
      AND user_id = v_user_id
      AND event_type = 'sentiment_vote'
      AND round = p_round
    LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('already_voted', true);
  END IF;
  
  -- Insert sentiment vote
  INSERT INTO debate_feed_events (debate_id, user_id, event_type, round, side, content)
  VALUES (p_debate_id, v_user_id, 'sentiment_vote', p_round, p_side, 'sentiment_vote');
  
  RETURN jsonb_build_object('success', true);
END;

$function$;

CREATE OR REPLACE FUNCTION public.cast_vote(p_debate_id uuid, p_voted_for text, p_round integer DEFAULT NULL::integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_votes_a INTEGER;
  v_votes_b INTEGER;
  v_allowed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE LOG 'SECURITY|auth_failure|anonymous|cast_vote|unauthenticated vote attempt';
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_voted_for NOT IN ('a', 'b') THEN
    RAISE LOG 'SECURITY|input_violation|%|cast_vote|invalid vote value=%', v_user_id, p_voted_for;
    RAISE EXCEPTION 'Invalid vote: must be a or b';
  END IF;

  -- Rate limit: 60 votes per hour
  v_allowed := check_rate_limit(v_user_id, 'vote', 60, 60);
  IF NOT v_allowed THEN
    RAISE LOG 'SECURITY|rate_limit_blocked|%|cast_vote|vote limit exceeded', v_user_id;
    RAISE EXCEPTION 'Rate limit: too many votes. Slow down.';
  END IF;

  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status NOT IN ('live', 'voting') THEN
    RAISE EXCEPTION 'Debate is not accepting votes';
  END IF;

  IF v_user_id IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE LOG 'SECURITY|access_denied|%|cast_vote|self-vote attempt debate=%', v_user_id, p_debate_id;
    RAISE EXCEPTION 'Cannot vote in your own debate';
  END IF;

  INSERT INTO public.debate_votes (debate_id, user_id, voted_for, round_number)
  VALUES (p_debate_id, v_user_id, p_voted_for, COALESCE(p_round, v_debate.current_round))
  ON CONFLICT (debate_id, user_id, round_number) DO UPDATE
  SET voted_for = p_voted_for, voted_at = now();

  SELECT
    COUNT(*) FILTER (WHERE voted_for = 'a'),
    COUNT(*) FILTER (WHERE voted_for = 'b')
  INTO v_votes_a, v_votes_b
  FROM public.debate_votes
  WHERE debate_id = p_debate_id;

  UPDATE public.debates
  SET votes_a = v_votes_a, votes_b = v_votes_b
  WHERE id = p_debate_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'debate_voted',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := p_voted_for,
    p_metadata   := jsonb_build_object('round', COALESCE(p_round, v_debate.current_round))
  );

  RETURN json_build_object(
    'success', true,
    'votes_a', v_votes_a,
    'votes_b', v_votes_b,
    'your_vote', p_voted_for
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.check_match_acceptance(p_debate_id uuid)
 RETURNS TABLE(player_a_ready boolean, player_b_ready boolean, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
#variable_conflict use_column
DECLARE
  v_caller UUID := auth.uid();
  v_row arena_debates%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM arena_debates WHERE id = p_debate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- Auth: caller must be debater_a or debater_b
  IF v_caller IS DISTINCT FROM v_row.debater_a AND v_caller IS DISTINCT FROM v_row.debater_b THEN
    RAISE EXCEPTION 'Not a participant in this debate';
  END IF;

  player_a_ready := v_row.player_a_ready;
  player_b_ready := v_row.player_b_ready;
  status := v_row.status;
  RETURN NEXT;
END;

$function$;

CREATE OR REPLACE FUNCTION public.check_private_lobby(p_debate_id uuid)
 RETURNS TABLE(status text, opponent_id uuid, opponent_name text, opponent_elo integer, player_b_ready boolean, total_rounds integer, language text)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
#variable_conflict use_column
DECLARE
  v_user_id uuid := auth.uid();
  v_debate  arena_debates%ROWTYPE;
  v_opp_name text;
  v_opp_elo  int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_debate FROM arena_debates
  WHERE id = p_debate_id AND debater_a = v_user_id;

  IF v_debate.id IS NULL THEN
    RAISE EXCEPTION 'Lobby not found';
  END IF;

  IF v_debate.debater_b IS NULL THEN
    status := v_debate.status;
    opponent_id := NULL;
    opponent_name := NULL;
    opponent_elo := NULL;
    player_b_ready := v_debate.player_b_ready;
    total_rounds := COALESCE(v_debate.total_rounds, 4);
    language := COALESCE(v_debate.language, 'en');
    RETURN NEXT;
  ELSE
    SELECT COALESCE(p.display_name, p.username, 'Opponent'),
           COALESCE(p.elo_rating, 1200)::int
    INTO v_opp_name, v_opp_elo
    FROM profiles p WHERE p.id = v_debate.debater_b;

    status := v_debate.status;
    opponent_id := v_debate.debater_b;
    opponent_name := v_opp_name;
    opponent_elo := v_opp_elo;
    player_b_ready := v_debate.player_b_ready;
    total_rounds := COALESCE(v_debate.total_rounds, 4);
    language := COALESCE(v_debate.language, 'en');
    RETURN NEXT;
  END IF;
END;

$function$;

CREATE OR REPLACE FUNCTION public.check_queue_status()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_entry record;
  v_opponent record;
  v_queue_count int;
  v_lang text;
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

  -- Fetch debate language when matched
  IF v_entry.status = 'matched' AND v_entry.debate_id IS NOT NULL THEN
    SELECT ad.language INTO v_lang FROM arena_debates ad WHERE ad.id = v_entry.debate_id;
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
    'queue_count', v_queue_count,
    'total_rounds', COALESCE(v_entry.total_rounds, 4),
    'language', COALESCE(v_lang, 'en')
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.check_ranked_eligible()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_uid uuid := auth.uid();
  v_pct int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('eligible', false, 'profile_pct', 0, 'reason', 'not_authenticated');
  END IF;

  SELECT COALESCE(profile_depth_pct, 0) INTO v_pct FROM profiles WHERE id = v_uid;

  IF v_pct IS NULL THEN
    RETURN json_build_object('eligible', false, 'profile_pct', 0, 'reason', 'profile_not_found');
  END IF;

  IF v_pct < 25 THEN
    RETURN json_build_object('eligible', false, 'profile_pct', v_pct,
      'reason', 'profile_incomplete');
  END IF;

  RETURN json_build_object('eligible', true, 'profile_pct', v_pct, 'reason', 'ok');
END;

$function$;

CREATE OR REPLACE FUNCTION public.create_ai_debate(p_category text DEFAULT NULL::text, p_topic text DEFAULT 'Open Debate'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_uid uuid := auth.uid();
  v_debate_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO arena_debates (debater_a, debater_b, mode, category, topic, status, total_rounds)
  VALUES (v_uid, NULL, 'ai', p_category, sanitize_text(p_topic), 'pending', 3)
  RETURNING id INTO v_debate_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'ai_spar_started',
    p_user_id    := v_uid,
    p_debate_id  := v_debate_id,
    p_category   := p_category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('topic', p_topic, 'category', p_category)
  );

  RETURN json_build_object('debate_id', v_debate_id, 'topic', p_topic, 'role', 'a');
END;

$function$;

CREATE OR REPLACE FUNCTION public.create_debate(p_topic text, p_category text DEFAULT 'general'::text, p_format text DEFAULT 'standard'::text, p_opponent_id uuid DEFAULT NULL::uuid, p_side text DEFAULT 'a'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate_id UUID;
  v_clean_topic TEXT;
  v_clean_category TEXT;
  v_allowed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Sanitize
  v_clean_topic := sanitize_text(p_topic);
  v_clean_category := sanitize_text(p_category);

  IF char_length(v_clean_topic) < 3 OR char_length(v_clean_topic) > 500 THEN
    RAISE EXCEPTION 'Topic must be 3-500 characters';
  END IF;

  IF p_format NOT IN ('standard', 'crossfire', 'qa_prep') THEN
    RAISE EXCEPTION 'Invalid format';
  END IF;

  IF p_side NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'Invalid side';
  END IF;

  IF p_opponent_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot challenge yourself';
  END IF;

  -- Rate limit: 5 debate creations per hour
  v_allowed := check_rate_limit(v_user_id, 'create_debate', 60, 5);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit: max 5 debates per hour';
  END IF;

  INSERT INTO public.debates (
    topic, category, format,
    debater_a, debater_b,
    status, current_round,
    votes_a, votes_b, winner, elo_change_a, elo_change_b
  ) VALUES (
    v_clean_topic, v_clean_category, p_format,
    CASE WHEN p_side = 'a' THEN v_user_id ELSE p_opponent_id END,
    CASE WHEN p_side = 'b' THEN v_user_id ELSE p_opponent_id END,
    CASE WHEN p_opponent_id IS NOT NULL THEN 'matched' ELSE 'waiting' END,
    0, 0, 0, NULL, NULL, NULL
  )
  RETURNING id INTO v_debate_id;

  RETURN v_debate_id;
END;

$function$;

CREATE OR REPLACE FUNCTION public.create_private_lobby(p_mode text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_visibility text DEFAULT 'private'::text, p_invited_user_id uuid DEFAULT NULL::uuid, p_group_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(debate_id uuid, join_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id   uuid := auth.uid();
  v_debate_id uuid;
  v_code      text := NULL;
  v_attempts  int  := 0;
  v_candidate text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_visibility NOT IN ('private', 'group', 'code') THEN
    RAISE EXCEPTION 'Invalid visibility value';
  END IF;
  IF p_visibility = 'private' AND p_invited_user_id IS NULL THEN
    RAISE EXCEPTION 'invited_user_id required for private lobbies';
  END IF;
  IF p_visibility = 'group' THEN
    IF p_group_id IS NULL THEN
      RAISE EXCEPTION 'group_id required for group lobbies';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = p_group_id AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not a member of this group';
    END IF;
  END IF;
  IF p_visibility = 'code' THEN
    LOOP
      v_candidate := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 5));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM arena_debates ad WHERE ad.join_code = v_candidate
      );
      v_attempts := v_attempts + 1;
      IF v_attempts >= 5 THEN
        RAISE EXCEPTION 'Could not generate unique join code';
      END IF;
    END LOOP;
    v_code := v_candidate;
  END IF;
  INSERT INTO arena_debates (
    debater_a, mode, topic, category, ranked,
    status, visibility, join_code, invited_user_id, lobby_group_id,
    player_a_ready
  ) VALUES (
    v_user_id, p_mode, p_topic, p_category, p_ranked,
    'pending', p_visibility, v_code, p_invited_user_id, p_group_id,
    true
  )
  RETURNING id INTO v_debate_id;
  PERFORM log_event(
    p_event_type := 'private_lobby_created',
    p_user_id    := v_user_id,
    p_debate_id  := v_debate_id,
    p_category   := p_category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('visibility', p_visibility, 'mode', p_mode)
  );
  RETURN QUERY SELECT v_debate_id, v_code;
END;

$function$;

CREATE OR REPLACE FUNCTION public.create_private_lobby(p_mode text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_visibility text DEFAULT 'private'::text, p_invited_user_id uuid DEFAULT NULL::uuid, p_group_id uuid DEFAULT NULL::uuid, p_ruleset text DEFAULT 'amplified'::text)
 RETURNS TABLE(debate_id uuid, join_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id   uuid := auth.uid();
  v_debate_id uuid;
  v_code      text := NULL;
  v_attempts  int  := 0;
  v_candidate text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_visibility NOT IN ('private', 'group', 'code') THEN
    RAISE EXCEPTION 'Invalid visibility value';
  END IF;
  IF p_visibility = 'private' AND p_invited_user_id IS NULL THEN
    RAISE EXCEPTION 'invited_user_id required for private lobbies';
  END IF;
  IF p_visibility = 'group' THEN
    IF p_group_id IS NULL THEN
      RAISE EXCEPTION 'group_id required for group lobbies';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = p_group_id AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not a member of this group';
    END IF;
  END IF;
  IF p_visibility = 'code' THEN
    LOOP
      v_candidate := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 5));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM arena_debates ad WHERE ad.join_code = v_candidate
      );
      v_attempts := v_attempts + 1;
      IF v_attempts >= 5 THEN
        RAISE EXCEPTION 'Could not generate unique join code';
      END IF;
    END LOOP;
    v_code := v_candidate;
  END IF;
  INSERT INTO arena_debates (
    debater_a, mode, topic, category, ranked, ruleset,
    status, visibility, join_code, invited_user_id, lobby_group_id,
    player_a_ready
  ) VALUES (
    v_user_id, p_mode, p_topic, p_category, p_ranked, p_ruleset,
    'pending', p_visibility, v_code, p_invited_user_id, p_group_id,
    true
  )
  RETURNING id INTO v_debate_id;
  PERFORM log_event(
    p_event_type := 'private_lobby_created',
    p_user_id    := v_user_id,
    p_debate_id  := v_debate_id,
    p_category   := p_category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('visibility', p_visibility, 'mode', p_mode, 'ruleset', p_ruleset)
  );
  RETURN QUERY SELECT v_debate_id, v_code;
END;

$function$;

CREATE OR REPLACE FUNCTION public.create_private_lobby(p_mode text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_visibility text DEFAULT 'private'::text, p_invited_user_id uuid DEFAULT NULL::uuid, p_group_id uuid DEFAULT NULL::uuid, p_ruleset text DEFAULT 'amplified'::text, p_total_rounds integer DEFAULT 4)
 RETURNS TABLE(debate_id uuid, join_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id   uuid := auth.uid();
  v_debate_id uuid;
  v_code      text := NULL;
  v_attempts  int  := 0;
  v_candidate text;
  v_total_rounds int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_visibility NOT IN ('private', 'group', 'code') THEN
    RAISE EXCEPTION 'Invalid visibility value';
  END IF;
  IF p_visibility = 'private' AND p_invited_user_id IS NULL THEN
    RAISE EXCEPTION 'invited_user_id required for private lobbies';
  END IF;
  IF p_visibility = 'group' THEN
    IF p_group_id IS NULL THEN
      RAISE EXCEPTION 'group_id required for group lobbies';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = p_group_id AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not a member of this group';
    END IF;
  END IF;

  -- Sanitize total_rounds
  v_total_rounds := CASE WHEN p_total_rounds IN (4, 6, 8, 10) THEN p_total_rounds ELSE 4 END;

  IF p_visibility = 'code' THEN
    LOOP
      v_candidate := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 5));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM arena_debates ad WHERE ad.join_code = v_candidate
      );
      v_attempts := v_attempts + 1;
      IF v_attempts >= 5 THEN
        RAISE EXCEPTION 'Could not generate unique join code';
      END IF;
    END LOOP;
    v_code := v_candidate;
  END IF;
  INSERT INTO arena_debates (
    debater_a, mode, topic, category, ranked, ruleset,
    status, visibility, join_code, invited_user_id, lobby_group_id,
    player_a_ready, total_rounds
  ) VALUES (
    v_user_id, p_mode, p_topic, p_category, p_ranked, p_ruleset,
    'pending', p_visibility, v_code, p_invited_user_id, p_group_id,
    true, v_total_rounds
  )
  RETURNING id INTO v_debate_id;
  PERFORM log_event(
    p_event_type := 'private_lobby_created',
    p_user_id    := v_user_id,
    p_debate_id  := v_debate_id,
    p_category   := p_category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('visibility', p_visibility, 'mode', p_mode, 'ruleset', p_ruleset, 'total_rounds', v_total_rounds)
  );
  RETURN QUERY SELECT v_debate_id, v_code;
END;

$function$;

CREATE OR REPLACE FUNCTION public.equip_power_up(p_debate_id uuid, p_power_up_id text, p_slot_number integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_uid UUID;
  v_questions INTEGER;
  v_max_slots INTEGER;
  v_qty INTEGER;
  v_debate_status TEXT;
  v_tier_name TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate slot number
  IF p_slot_number < 1 OR p_slot_number > 4 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid slot (1-4)');
  END IF;

  -- Get user tier
  SELECT questions_answered INTO v_questions FROM profiles WHERE id = v_uid;
  v_questions := COALESCE(v_questions, 0);

  IF v_questions >= 100 THEN
    v_max_slots := 4; v_tier_name := 'Legend';
  ELSIF v_questions >= 75 THEN
    v_max_slots := 4; v_tier_name := 'Champion';
  ELSIF v_questions >= 50 THEN
    v_max_slots := 3; v_tier_name := 'Veteran';
  ELSIF v_questions >= 25 THEN
    v_max_slots := 2; v_tier_name := 'Gladiator';
  ELSIF v_questions >= 10 THEN
    v_max_slots := 1; v_tier_name := 'Spectator+';
  ELSE
    v_max_slots := 0; v_tier_name := 'Rookie';
  END IF;

  -- Check slot within tier allowance
  IF p_slot_number > v_max_slots THEN
    RETURN json_build_object('success', false, 'error',
      format('Your tier (%s) only has %s power-up slot(s)', v_tier_name, v_max_slots));
  END IF;

  -- Check inventory
  SELECT quantity INTO v_qty
  FROM user_power_ups
  WHERE user_id = v_uid AND power_up_id = p_power_up_id;

  IF v_qty IS NULL OR v_qty < 1 THEN
    RETURN json_build_object('success', false, 'error', 'You don''t own this power-up');
  END IF;

  -- Check debate status
  SELECT status INTO v_debate_status
  FROM arena_debates WHERE id = p_debate_id;

  IF v_debate_status IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Debate not found');
  END IF;

  IF v_debate_status NOT IN ('pending', 'lobby', 'matched') THEN
    RETURN json_build_object('success', false, 'error', 'Can only equip power-ups before debate starts');
  END IF;

  -- Deduct from inventory
  UPDATE user_power_ups
  SET quantity = quantity - 1
  WHERE user_id = v_uid AND power_up_id = p_power_up_id;

  -- Equip (upsert into slot — replaces if slot occupied)
  INSERT INTO debate_power_ups (debate_id, user_id, power_up_id, slot_number)
  VALUES (p_debate_id, v_uid, p_power_up_id, p_slot_number)
  ON CONFLICT (debate_id, user_id, slot_number)
  DO UPDATE SET power_up_id = p_power_up_id, created_at = now();

  RETURN json_build_object(
    'success', true,
    'power_up_id', p_power_up_id,
    'slot', p_slot_number,
    'remaining_quantity', v_qty - 1
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.expire_stale_queue()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  UPDATE debate_queue SET status = 'expired'
    WHERE status = 'waiting' AND joined_at < now() - interval '5 minutes';
END;

$function$;

CREATE OR REPLACE FUNCTION public.finalize_async_debate(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_winner TEXT;
BEGIN
  SELECT * INTO v_debate FROM public.async_debates
  WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_debate.status = 'completed' THEN
    RAISE EXCEPTION 'Debate already completed';
  END IF;

  -- Determine winner
  IF v_debate.votes_challenger > v_debate.votes_defender THEN
    v_winner := 'challenger';
  ELSIF v_debate.votes_defender > v_debate.votes_challenger THEN
    v_winner := 'defender';
  ELSE
    v_winner := 'draw';
  END IF;

  UPDATE public.async_debates
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_debate_id;

  RETURN json_build_object(
    'success', true,
    'winner', v_winner,
    'votes_challenger', v_debate.votes_challenger,
    'votes_defender', v_debate.votes_defender
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.finalize_debate(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_caller_role TEXT;
  v_debate RECORD;
  v_profile_a RECORD;
  v_profile_b RECORD;
  v_votes_a INTEGER;
  v_votes_b INTEGER;
  v_winner TEXT;
  v_winner_id UUID;
  v_elo RECORD;
  v_xp_winner INTEGER := 25;
  v_xp_loser INTEGER := 10;
  v_xp_draw INTEGER := 15;
BEGIN
  -- Auth check
  v_caller_role := current_setting('request.jwt.claim.role', true);
  IF v_user_id IS NULL AND v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the debate row
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- Authorization: must be a participant or service_role
  IF v_caller_role IS DISTINCT FROM 'service_role'
     AND v_user_id IS DISTINCT FROM v_debate.debater_a
     AND v_user_id IS DISTINCT FROM v_debate.debater_b THEN
    RAISE EXCEPTION 'Not a participant in this debate';
  END IF;

  IF v_debate.status NOT IN ('voting', 'live') THEN
    RAISE EXCEPTION 'Debate cannot be finalized in current state: %', v_debate.status;
  END IF;

  -- Final vote tally
  SELECT
    COUNT(*) FILTER (WHERE voted_for = 'a'),
    COUNT(*) FILTER (WHERE voted_for = 'b')
  INTO v_votes_a, v_votes_b
  FROM public.debate_votes
  WHERE debate_id = p_debate_id;

  -- Determine winner
  IF v_votes_a > v_votes_b THEN
    v_winner := 'a';
    v_winner_id := v_debate.debater_a;
  ELSIF v_votes_b > v_votes_a THEN
    v_winner := 'b';
    v_winner_id := v_debate.debater_b;
  ELSE
    v_winner := 'draw';
    v_winner_id := NULL;
  END IF;

  -- Get current profiles
  SELECT * INTO v_profile_a FROM public.profiles WHERE id = v_debate.debater_a;
  SELECT * INTO v_profile_b FROM public.profiles WHERE id = v_debate.debater_b;

  -- Calculate Elo
  SELECT * INTO v_elo FROM calculate_elo(
    v_profile_a.elo_rating,
    v_profile_b.elo_rating,
    v_winner,
    v_profile_a.debates_completed,
    v_profile_b.debates_completed
  );

  -- Update debate record
  UPDATE arena_debates SET
    status = 'completed',
    winner = v_winner,
    vote_count_a = v_votes_a,
    vote_count_b = v_votes_b,
    elo_change_a = v_elo.change_a,
    elo_change_b = v_elo.change_b,
    ended_at = now(),
    updated_at = now()
  WHERE id = p_debate_id;

  -- Update profile A
  UPDATE public.profiles SET
    elo_rating = v_elo.new_rating_a,
    debates_completed = debates_completed + 1,
    wins = wins + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
    losses = losses + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
    draws = draws + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
    current_streak = CASE
      WHEN v_winner = 'a' THEN current_streak + 1
      ELSE 0
    END,
    best_streak = CASE
      WHEN v_winner = 'a' AND current_streak + 1 > best_streak THEN current_streak + 1
      ELSE best_streak
    END,
    xp = xp + CASE
      WHEN v_winner = 'a' THEN v_xp_winner
      WHEN v_winner = 'draw' THEN v_xp_draw
      ELSE v_xp_loser
    END,
    updated_at = now()
  WHERE id = v_debate.debater_a;

  -- Update profile B
  UPDATE public.profiles SET
    elo_rating = v_elo.new_rating_b,
    debates_completed = debates_completed + 1,
    wins = wins + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
    losses = losses + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
    draws = draws + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
    current_streak = CASE
      WHEN v_winner = 'b' THEN current_streak + 1
      ELSE 0
    END,
    best_streak = CASE
      WHEN v_winner = 'b' AND current_streak + 1 > best_streak THEN current_streak + 1
      ELSE best_streak
    END,
    xp = xp + CASE
      WHEN v_winner = 'b' THEN v_xp_winner
      WHEN v_winner = 'draw' THEN v_xp_draw
      ELSE v_xp_loser
    END,
    updated_at = now()
  WHERE id = v_debate.debater_b;

  -- Resolve predictions
  UPDATE public.predictions SET
    correct = CASE
      WHEN predicted_winner = v_winner THEN true
      ELSE false
    END,
    payout = CASE
      WHEN predicted_winner = v_winner THEN ROUND(tokens_wagered * 1.8)
      WHEN v_winner = 'draw' THEN tokens_wagered
      ELSE 0
    END
  WHERE debate_id = p_debate_id AND correct IS NULL;

  -- Pay out prediction winners + refund draws
  UPDATE public.profiles p SET
    token_balance = token_balance + pred.payout
  FROM public.predictions pred
  WHERE pred.debate_id = p_debate_id
    AND pred.user_id = p.id
    AND pred.payout > 0;

  -- F-55: Pay reference royalties (after winner is recorded)
  PERFORM pay_reference_royalties(p_debate_id);

  RETURN json_build_object(
    'success', true,
    'winner', v_winner,
    'winner_id', v_winner_id,
    'votes_a', v_votes_a,
    'votes_b', v_votes_b,
    'elo_change_a', v_elo.change_a,
    'elo_change_b', v_elo.change_b,
    'new_elo_a', v_elo.new_rating_a,
    'new_elo_b', v_elo.new_rating_b
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_arena_debate_spectator(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'id', ad.id,
    'topic', ad.topic,
    'mode', ad.mode,
    'status', ad.status,
    'category', ad.category,
    'current_round', ad.current_round,
    'total_rounds', ad.total_rounds,
    'winner', ad.winner,
    'score_a', ad.score_a,
    'score_b', ad.score_b,
    'spectator_count', ad.spectator_count,
    'vote_count_a', ad.vote_count_a,
    'vote_count_b', ad.vote_count_b,
    'moderator_type', ad.moderator_type,
    'moderator_id', ad.moderator_id,
    'moderator_name', COALESCE(pm.display_name, pm.username),
    'ruleset', COALESCE(ad.ruleset, 'amplified'),
    'is_ranked', ad.format,
    'created_at', ad.created_at,
    'started_at', ad.started_at,
    'ended_at', ad.ended_at,
    'debater_a_name', COALESCE(pa.display_name, pa.username, 'Side A'),
    'debater_a_elo', COALESCE(pa.elo_rating, 1200),
    'debater_a_avatar', pa.avatar_url,
    'debater_b_name', COALESCE(pb.display_name, pb.username, 'Side B'),
    'debater_b_elo', COALESCE(pb.elo_rating, 1200),
    'debater_b_avatar', pb.avatar_url,
    'ai_scorecard', ad.ai_scorecard
  ) INTO v_result
  FROM arena_debates ad
    LEFT JOIN profiles pa ON pa.id = ad.debater_a
    LEFT JOIN profiles pb ON pb.id = ad.debater_b
    LEFT JOIN profiles pm ON pm.id = ad.moderator_id
  WHERE ad.id = p_debate_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  RETURN v_result;
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_arena_feed(p_limit integer DEFAULT 20, p_category text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_to_json(d) ORDER BY d.created_at DESC)
    FROM (
      (
        SELECT ad.id, ad.topic, 'arena'::text as source, ad.mode, ad.status,
               ad.current_round, ad.total_rounds,
               ad.score_a, ad.score_b,
               ad.vote_count_a, ad.vote_count_b,
               ad.ruleset,
               pa.display_name as debater_a_name, pa.elo_rating as elo_a,
               pb.display_name as debater_b_name, pb.elo_rating as elo_b,
               ad.created_at
        FROM arena_debates ad
          LEFT JOIN profiles pa ON pa.id = ad.debater_a
          LEFT JOIN profiles pb ON pb.id = ad.debater_b
        WHERE ad.status IN ('live', 'voting', 'complete')
          AND (p_category IS NULL OR ad.category = p_category)
        ORDER BY ad.created_at DESC
        LIMIT p_limit / 2
      )

      UNION ALL

      (
        SELECT aud.id, aud.topic, 'auto_debate'::text as source, 'ai'::text as mode, aud.status,
               3 as current_round, 3 as total_rounds,
               aud.score_a, aud.score_b,
               (SELECT count(*)::int FROM auto_debate_votes WHERE auto_debate_id = aud.id AND voted_for = 'a') as vote_count_a,
               (SELECT count(*)::int FROM auto_debate_votes WHERE auto_debate_id = aud.id AND voted_for = 'b') as vote_count_b,
               'amplified'::text as ruleset,
               aud.side_a_label as debater_a_name, 0 as elo_a,
               aud.side_b_label as debater_b_name, 0 as elo_b,
               aud.created_at
        FROM auto_debates aud
        WHERE aud.status = 'active'
        ORDER BY aud.created_at DESC
        LIMIT p_limit / 2
      )
    ) d
  ), '[]'::json);
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_arena_feed(p_limit integer DEFAULT 20)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

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

$function$;

CREATE OR REPLACE FUNCTION public.get_category_counts()
 RETURNS TABLE(section text, live_debates bigint, hot_takes bigint)
 LANGUAGE sql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

  SELECT
    s.section,
    COALESCE(d.live_count, 0) AS live_debates,
    COALESCE(h.take_count, 0) AS hot_takes
  FROM (
    VALUES
      ('politics'),
      ('sports'),
      ('entertainment'),
      ('couples'),
      ('trending'),
      ('music')
  ) AS s(section)
  LEFT JOIN (
    SELECT category AS section, COUNT(*) AS live_count
    FROM public.arena_debates
    WHERE status IN ('live', 'pending', 'lobby', 'matched')
    GROUP BY category
  ) d ON d.section = s.section
  LEFT JOIN (
    SELECT section, COUNT(*) AS take_count
    FROM public.hot_takes
    WHERE is_active = true
      AND created_at > NOW() - INTERVAL '24 hours'
    GROUP BY section
  ) h ON h.section = s.section;

$function$;

CREATE OR REPLACE FUNCTION public.get_challenge_preview(p_join_code text)
 RETURNS TABLE(debate_id uuid, topic text, category text, mode text, status text, challenger_username text, challenger_display_name text, challenger_elo integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  RETURN QUERY
  SELECT
    d.id AS debate_id,
    d.topic,
    d.category,
    d.mode,
    d.status,
    p.username AS challenger_username,
    COALESCE(p.display_name, p.username) AS challenger_display_name,
    COALESCE(p.elo_rating, 1000) AS challenger_elo,
    d.created_at
  FROM arena_debates d
  JOIN profiles p ON p.id = d.debater_a
  WHERE d.join_code = UPPER(p_join_code)
    AND d.visibility = 'code'
  LIMIT 1;
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_debate_messages(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_to_json(m) ORDER BY m.round, m.created_at)
    FROM debate_messages m WHERE m.debate_id = p_debate_id
  ), '[]'::json);
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_debate_mod_status(p_debate_id uuid)
 RETURNS TABLE(mod_status text, mod_requested_by uuid, moderator_id uuid, moderator_display_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_debate arena_debates%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_mod_name TEXT;
BEGIN
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- Caller must be one of the debaters
  IF v_user_id IS NULL OR (v_user_id != v_debate.debater_a AND v_user_id != v_debate.debater_b) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get mod display name if one is assigned
  IF v_debate.moderator_id IS NOT NULL THEN
    SELECT display_name INTO v_mod_name
    FROM profiles
    WHERE id = v_debate.moderator_id;
  END IF;

  RETURN QUERY SELECT
    v_debate.mod_status,
    v_debate.mod_requested_by,
    v_debate.moderator_id,
    COALESCE(v_mod_name, '');
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_debate_replay_data(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_power_ups json;
  v_references json;
  v_mod_scores json;
  v_debate arena_debates%ROWTYPE;
BEGIN
  -- Verify debate exists
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- Activated power-ups (only show activated ones, with user display name and side)
  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.activated_at ASC), '[]'::json)
  INTO v_power_ups
  FROM (
    SELECT
      dp.power_up_id,
      dp.user_id,
      dp.activated_at,
      pu.name AS power_up_name,
      pu.icon AS power_up_icon,
      COALESCE(p.display_name, p.username, 'Unknown') AS user_name,
      CASE
        WHEN dp.user_id = v_debate.debater_a THEN 'a'
        WHEN dp.user_id = v_debate.debater_b THEN 'b'
        ELSE 'unknown'
      END AS side
    FROM debate_power_ups dp
    JOIN power_ups pu ON pu.id = dp.power_up_id
    LEFT JOIN profiles p ON p.id = dp.user_id
    WHERE dp.debate_id = p_debate_id
      AND dp.activated = true
      AND dp.activated_at IS NOT NULL
  ) r;

  -- References with rulings
  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.created_at ASC), '[]'::json)
  INTO v_references
  FROM (
    SELECT
      dr.id,
      dr.submitter_id,
      dr.round,
      dr.url,
      dr.description,
      dr.supports_side,
      dr.ruling,
      dr.ruling_reason,
      dr.created_at,
      dr.ruled_at,
      COALESCE(p.display_name, p.username, 'Unknown') AS submitter_name,
      CASE
        WHEN dr.submitter_id = v_debate.debater_a THEN 'a'
        WHEN dr.submitter_id = v_debate.debater_b THEN 'b'
        ELSE 'unknown'
      END AS side
    FROM debate_references dr
    LEFT JOIN profiles p ON p.id = dr.submitter_id
    WHERE dr.debate_id = p_debate_id
  ) r;

  -- Post-debate moderator scores
  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.created_at ASC), '[]'::json)
  INTO v_mod_scores
  FROM (
    SELECT
      ms.scorer_id,
      ms.scorer_role,
      ms.score,
      ms.created_at,
      COALESCE(p.display_name, p.username, 'Unknown') AS scorer_name
    FROM moderator_scores ms
    LEFT JOIN profiles p ON p.id = ms.scorer_id
    WHERE ms.debate_id = p_debate_id
  ) r;

  RETURN json_build_object(
    'power_ups', v_power_ups,
    'references', v_references,
    'mod_scores', v_mod_scores
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_feed_events(p_debate_id uuid, p_after timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 500)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  IF p_limit > 1000 THEN
    p_limit := 1000;  -- hard cap
  END IF;

  RETURN COALESCE((
    SELECT json_agg(row_to_json(e) ORDER BY e.created_at ASC)
    FROM (
      SELECT
        id, debate_id, user_id, event_type, round, side,
        content, score, reference_id, metadata, created_at
      FROM public.debate_feed_events
      WHERE debate_id = p_debate_id
        AND (p_after IS NULL OR created_at > p_after)
      ORDER BY created_at ASC
      LIMIT p_limit
    ) e
  ), '[]'::json);
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_live_debates(p_category text DEFAULT NULL::text, p_limit integer DEFAULT 10)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  RETURN (
    SELECT json_agg(row_to_json(d))
    FROM (
      SELECT
        db.id,
        db.topic,
        db.category,
        db.format,
        db.current_round,
        db.total_rounds,
        db.votes_a,
        db.votes_b,
        db.started_at,
        pa.display_name AS debater_a_name,
        pa.elo_rating AS debater_a_elo,
        pb.display_name AS debater_b_name,
        pb.elo_rating AS debater_b_elo,
        (SELECT COUNT(*) FROM public.debate_votes WHERE debate_id = db.id) AS total_votes
      FROM public.debates db
      LEFT JOIN public.profiles pa ON pa.id = db.debater_a
      LEFT JOIN public.profiles pb ON pb.id = db.debater_b
      WHERE db.status = 'live'
        AND (p_category IS NULL OR db.category = p_category)
      ORDER BY db.started_at DESC
      LIMIT p_limit
    ) d
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_my_debate_loadout(p_debate_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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
        ar.source_title,
        ar.claim_text,
        ar.source_author,
        ar.source_type,
        ar.source_url,
        ar.current_power,
        ar.rarity,
        ar.seconds,
        ar.strikes,
        ar.challenge_status,
        ar.graduated
      FROM debate_reference_loadouts drl
      JOIN arsenal_references ar ON ar.id = drl.reference_id
      WHERE drl.debate_id = p_debate_id
        AND drl.user_id = v_uid
      ORDER BY ar.current_power DESC, ar.created_at DESC
    ) r
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_opponent_power_ups(p_debate_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id uuid := auth.uid();
  v_opponent_id uuid;
  v_debate arena_debates%ROWTYPE;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get the debate to find opponent
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Debate not found');
  END IF;

  -- Determine opponent
  IF v_debate.debater_a = v_user_id THEN
    v_opponent_id := v_debate.debater_b;
  ELSIF v_debate.debater_b = v_user_id THEN
    v_opponent_id := v_debate.debater_a;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'You are not in this debate');
  END IF;

  IF v_opponent_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'equipped', '[]'::jsonb);
  END IF;

  -- Get opponent's equipped power-ups for this debate
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'power_up_id', dp.power_up_id,
    'slot_number', dp.slot_number,
    'name', pu.name,
    'icon', pu.icon
  )), '[]'::jsonb)
  INTO v_result
  FROM debate_power_ups dp
  JOIN power_ups pu ON pu.id = dp.power_up_id
  WHERE dp.debate_id = p_debate_id
    AND dp.user_id = v_opponent_id;

  RETURN jsonb_build_object('success', true, 'equipped', v_result);
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_spectator_chat(p_debate_id uuid, p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, user_id uuid, display_name text, avatar_url text, message text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  RETURN QUERY
    SELECT
      sc.id,
      sc.user_id,
      COALESCE(p.display_name, p.username, 'Gladiator') AS display_name,
      p.avatar_url,
      sc.message,
      sc.created_at
    FROM spectator_chat sc
    JOIN profiles p ON p.id = sc.user_id
    WHERE sc.debate_id = p_debate_id
    ORDER BY sc.created_at ASC
    LIMIT LEAST(p_limit, 200);
END;

$function$;

CREATE OR REPLACE FUNCTION public.insert_feed_event(p_debate_id uuid, p_event_type text, p_round integer DEFAULT NULL::integer, p_side text DEFAULT NULL::text, p_content text DEFAULT NULL::text, p_score integer DEFAULT NULL::integer, p_reference_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_uid UUID := auth.uid();
  v_debate RECORD;
  v_role TEXT;
  v_event_id BIGINT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_uid = v_debate.debater_a THEN
    v_role := 'debater_a';
  ELSIF v_uid = v_debate.debater_b THEN
    v_role := 'debater_b';
  ELSIF v_uid = v_debate.moderator_id THEN
    v_role := 'moderator';
  ELSE
    v_role := 'spectator';
  END IF;

  IF p_event_type IN ('speech', 'reference_cite', 'reference_challenge', 'power_up') THEN
    IF v_role NOT IN ('debater_a', 'debater_b') THEN
      RAISE EXCEPTION 'Only debaters can insert % events', p_event_type;
    END IF;

  ELSIF p_event_type IN ('point_award', 'mod_ruling') THEN
    IF v_role != 'moderator' THEN
      RAISE EXCEPTION 'Only moderator can insert % events', p_event_type;
    END IF;

  ELSIF p_event_type = 'sentiment_vote' THEN
    NULL;

  ELSIF p_event_type = 'round_divider' THEN
    IF v_role NOT IN ('debater_a', 'debater_b', 'moderator') THEN
      RAISE EXCEPTION 'Only debate participants can insert round_divider events';
    END IF;

  ELSIF p_event_type = 'disconnect' THEN
    IF v_role NOT IN ('debater_a', 'debater_b', 'moderator') THEN
      RAISE EXCEPTION 'Only debate participants can insert disconnect events';
    END IF;

  ELSE
    RAISE EXCEPTION 'Unknown event type: %', p_event_type;
  END IF;

  IF p_event_type = 'point_award' AND (p_score IS NULL OR p_score < 1 OR p_score > 5) THEN
    RAISE EXCEPTION 'point_award score must be between 1 and 5';
  END IF;

  INSERT INTO public.debate_feed_events (
    debate_id, user_id, event_type, round, side, content, score, reference_id, metadata
  ) VALUES (
    p_debate_id, v_uid, p_event_type, p_round, p_side,
    CASE WHEN p_content IS NOT NULL THEN sanitize_text(p_content) ELSE NULL END,
    p_score, p_reference_id, p_metadata
  )
  RETURNING id INTO v_event_id;

  PERFORM log_event(
    'feed_' || p_event_type,
    v_uid,
    p_debate_id,
    v_debate.category,
    p_side,
    jsonb_build_object(
      'feed_event_id', v_event_id,
      'round', p_round,
      'score', p_score,
      'role', v_role
    ) || p_metadata
  );

  RETURN json_build_object(
    'success', true,
    'event_id', v_event_id
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.join_async_debate(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_debate FROM public.async_debates
  WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Async debate not found';
  END IF;

  IF v_debate.status != 'open' THEN
    RAISE EXCEPTION 'Debate is not open for joining';
  END IF;

  IF v_user_id = v_debate.challenger_id THEN
    RAISE EXCEPTION 'Cannot join your own debate';
  END IF;

  UPDATE public.async_debates
  SET defender_id = v_user_id,
      status = 'active',
      updated_at = now()
  WHERE id = p_debate_id;

  RETURN json_build_object(
    'success', true,
    'debate_id', p_debate_id,
    'status', 'active'
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.join_debate(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status != 'waiting' THEN
    RAISE EXCEPTION 'Debate is not waiting for opponent';
  END IF;
  IF v_user_id = v_debate.debater_a THEN
    RAISE EXCEPTION 'Cannot join your own debate';
  END IF;

  UPDATE public.debates
  SET debater_b = v_user_id,
      status = 'matched',
      updated_at = now()
  WHERE id = p_debate_id;

  RETURN json_build_object(
    'success', true,
    'debate_id', p_debate_id,
    'status', 'matched'
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.join_debate_queue(p_mode text, p_category text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_ranked boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_uid        uuid := auth.uid();
  v_elo        int;
  v_queue_id   uuid;
  v_match      record;
  v_debate_id  uuid;
  v_topic      text;
  v_elo_range  int  := CASE WHEN p_ranked THEN 300 ELSE 400 END;
  v_lang       text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT elo_rating INTO v_elo FROM profiles WHERE id = v_uid;

  -- Clear any stale waiting entries for this user
  DELETE FROM debate_queue WHERE user_id = v_uid AND status = 'waiting';

  -- Phase 1: strict match — same mode, same category (if specified), within elo range
  IF p_category IS NOT NULL THEN
    SELECT * INTO v_match FROM debate_queue
      WHERE status = 'waiting'
        AND mode = p_mode
        AND user_id != v_uid
        AND ABS(elo_rating - COALESCE(v_elo, 1200)) < v_elo_range
        AND (category = p_category OR category IS NULL)
      ORDER BY joined_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
  END IF;

  -- Phase 2: loose match — same mode, any category
  IF v_match IS NULL THEN
    SELECT * INTO v_match FROM debate_queue
      WHERE status = 'waiting'
        AND mode = p_mode
        AND user_id != v_uid
        AND ABS(elo_rating - COALESCE(v_elo, 1200)) < v_elo_range
      ORDER BY joined_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
  END IF;

  IF v_match IS NOT NULL THEN
    v_topic := COALESCE(p_topic, v_match.topic, 'Open Debate');

    INSERT INTO arena_debates (debater_a, debater_b, mode, category, topic, status, total_rounds, ranked)
    VALUES (
      v_match.user_id,
      v_uid,
      p_mode,
      COALESCE(p_category, v_match.category),
      v_topic,
      'pending',
      3,
      p_ranked
    )
    RETURNING id INTO v_debate_id;

    -- Read back the language stamped by trigger
    SELECT ad.language INTO v_lang FROM arena_debates ad WHERE ad.id = v_debate_id;

    UPDATE debate_queue
      SET status = 'matched', matched_with = v_uid, debate_id = v_debate_id
      WHERE id = v_match.id;

    INSERT INTO debate_queue (user_id, mode, category, topic, elo_rating, status, matched_with, debate_id, ranked)
    VALUES (v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200), 'matched', v_match.user_id, v_debate_id, p_ranked)
    RETURNING id INTO v_queue_id;

    PERFORM log_event(
      p_event_type := 'queue_matched',
      p_user_id    := v_uid,
      p_debate_id  := v_debate_id,
      p_category   := COALESCE(p_category, v_match.category),
      p_side       := 'b',
      p_metadata   := jsonb_build_object('mode', p_mode, 'ranked', p_ranked)
    );

    RETURN json_build_object(
      'status',      'matched',
      'queue_id',    v_queue_id,
      'debate_id',   v_debate_id,
      'opponent_id', v_match.user_id,
      'topic',       v_topic,
      'role',        'b',
      'language',    COALESCE(v_lang, 'en')
    );

  ELSE
    INSERT INTO debate_queue (user_id, mode, category, topic, elo_rating, status, ranked)
    VALUES (v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200), 'waiting', p_ranked)
    RETURNING id INTO v_queue_id;

    PERFORM log_event(
      p_event_type := 'queue_joined',
      p_user_id    := v_uid,
      p_debate_id  := NULL,
      p_category   := p_category,
      p_side       := NULL,
      p_metadata   := jsonb_build_object('mode', p_mode, 'ranked', p_ranked)
    );

    RETURN json_build_object(
      'status',   'waiting',
      'queue_id', v_queue_id
    );
  END IF;
END;

$function$;

CREATE OR REPLACE FUNCTION public.join_debate_queue(p_mode text, p_category text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_ruleset text DEFAULT 'amplified'::text, p_total_rounds integer DEFAULT 4)
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
  v_total_rounds int;
  v_lang      text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_ruleset := CASE WHEN p_ruleset IN ('amplified', 'unplugged') THEN p_ruleset ELSE 'amplified' END;
  v_total_rounds := CASE WHEN p_total_rounds IN (4, 6, 8, 10) THEN p_total_rounds ELSE 4 END;

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
      v_topic, 'pending',
      COALESCE(v_match.total_rounds, v_total_rounds),
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
      status, matched_with, debate_id, ranked, ruleset, total_rounds
    )
    VALUES (
      v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200),
      'matched', v_match.user_id, v_debate_id,
      COALESCE(p_ranked, false), v_ruleset, v_total_rounds
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
        'ranked', COALESCE(p_ranked, false),
        'total_rounds', COALESCE(v_match.total_rounds, v_total_rounds)
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
      'total_rounds', COALESCE(v_match.total_rounds, v_total_rounds),
      'language', COALESCE(v_lang, 'en')
    );
  ELSE
    INSERT INTO debate_queue (
      user_id, mode, category, topic, elo_rating,
      ranked, ruleset, total_rounds
    )
    VALUES (
      v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200),
      COALESCE(p_ranked, false), v_ruleset, v_total_rounds
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
        'ranked', COALESCE(p_ranked, false),
        'total_rounds', v_total_rounds
      )
    );

    RETURN json_build_object(
      'status', 'waiting',
      'queue_id', v_queue_id,
      'mode', p_mode,
      'queue_count', (
        SELECT count(*) FROM debate_queue
        WHERE status = 'waiting'
          AND mode = p_mode
          AND COALESCE(ruleset, 'amplified') = v_ruleset
          AND COALESCE(ranked, false) = COALESCE(p_ranked, false)
          AND user_id != v_uid
      )
    );
  END IF;
END;

$function$;

CREATE OR REPLACE FUNCTION public.join_debate_queue(p_mode text, p_category text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_ruleset text DEFAULT 'amplified'::text)
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

  -- F-64: Server-side ranked eligibility gate
  IF COALESCE(p_ranked, false) THEN
    IF (SELECT COALESCE(profile_depth_pct, 0) FROM profiles WHERE id = v_uid) < 25 THEN
      RAISE EXCEPTION 'Ranked requires 25%% profile completion';
    END IF;
  END IF;

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

CREATE OR REPLACE FUNCTION public.join_private_lobby(p_debate_id uuid DEFAULT NULL::uuid, p_join_code text DEFAULT NULL::text)
 RETURNS TABLE(debate_id uuid, status text, topic text, mode text, opponent_name text, opponent_id uuid, opponent_elo integer, ruleset text, total_rounds integer, language text)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
#variable_conflict use_column
DECLARE
  v_user_id      uuid := auth.uid();
  v_debate       arena_debates%ROWTYPE;
  v_rows_updated int;
  v_opponent_name text;
  v_opponent_elo  int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_debate_id IS NOT NULL THEN
    SELECT * INTO v_debate FROM arena_debates
    WHERE id = p_debate_id AND arena_debates.status = 'pending' AND debater_b IS NULL;
  ELSIF p_join_code IS NOT NULL THEN
    SELECT * INTO v_debate FROM arena_debates
    WHERE join_code = upper(trim(p_join_code)) AND arena_debates.status = 'pending' AND debater_b IS NULL;
  ELSE
    RAISE EXCEPTION 'Must provide debate_id or join_code';
  END IF;

  IF v_debate.id IS NULL THEN
    RAISE EXCEPTION 'Lobby not found or already taken';
  END IF;

  IF v_debate.debater_a = v_user_id THEN
    RAISE EXCEPTION 'Cannot join your own lobby';
  END IF;

  IF v_debate.visibility = 'private' AND v_debate.invited_user_id != v_user_id THEN
    RAISE EXCEPTION 'This challenge is not for you';
  END IF;

  IF v_debate.visibility = 'group' AND v_debate.lobby_group_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = v_debate.lobby_group_id AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not a member of this group';
    END IF;
  END IF;

  UPDATE arena_debates
  SET debater_b     = v_user_id,
      player_b_ready = true,
      status        = 'matched'
  WHERE id          = v_debate.id
    AND debater_b   IS NULL
    AND arena_debates.status = 'pending';

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'Lobby already taken';
  END IF;

  SELECT COALESCE(p.display_name, p.username, 'Opponent'),
         COALESCE(p.elo_rating, 1200)::int
  INTO v_opponent_name, v_opponent_elo
  FROM profiles p WHERE p.id = v_debate.debater_a;

  PERFORM log_event(
    p_event_type := 'private_lobby_joined',
    p_user_id    := v_user_id,
    p_debate_id  := v_debate.id,
    p_category   := NULL,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('visibility', v_debate.visibility)
  );

  debate_id := v_debate.id;
  status := 'matched';
  topic := v_debate.topic;
  mode := v_debate.mode;
  opponent_name := v_opponent_name;
  opponent_id := v_debate.debater_a;
  opponent_elo := v_opponent_elo;
  ruleset := COALESCE(v_debate.ruleset, 'amplified');
  total_rounds := COALESCE(v_debate.total_rounds, 4);
  language := COALESCE(v_debate.language, 'en');
  RETURN NEXT;
END;

$function$;

CREATE OR REPLACE FUNCTION public.leave_debate_queue()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  DELETE FROM debate_queue WHERE user_id = auth.uid() AND status = 'waiting';
END;

$function$;

CREATE OR REPLACE FUNCTION public.pin_feed_event(p_debate_id uuid, p_feed_event_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

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

$function$;

CREATE OR REPLACE FUNCTION public.respond_to_match(p_debate_id uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_row arena_debates%ROWTYPE;
  v_caller UUID := auth.uid();
BEGIN
  -- Lock the row
  SELECT * INTO v_row FROM arena_debates WHERE id = p_debate_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_caller IS DISTINCT FROM v_row.debater_a AND v_caller IS DISTINCT FROM v_row.debater_b THEN
    RAISE EXCEPTION 'Not a participant in this debate';
  END IF;

  -- Set the caller's ready column
  IF v_caller = v_row.debater_a THEN
    -- Idempotent: skip if already set
    IF v_row.player_a_ready IS NOT NULL THEN RETURN; END IF;
    UPDATE arena_debates SET player_a_ready = p_accept WHERE id = p_debate_id;
  ELSE
    IF v_row.player_b_ready IS NOT NULL THEN RETURN; END IF;
    UPDATE arena_debates SET player_b_ready = p_accept WHERE id = p_debate_id;
  END IF;

  -- If declining, cancel the debate
  IF NOT p_accept THEN
    UPDATE arena_debates SET status = 'cancelled' WHERE id = p_debate_id AND status = 'pending';
  END IF;
END;

$function$;

CREATE OR REPLACE FUNCTION public.save_ai_scorecard(p_debate_id uuid, p_scorecard jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_uid UUID := auth.uid();
  v_debate RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT debater_a, debater_b, status
  INTO v_debate
  FROM arena_debates
  WHERE id = p_debate_id;

  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_uid != v_debate.debater_a AND v_uid != v_debate.debater_b THEN
    RAISE EXCEPTION 'Not a participant in this debate';
  END IF;

  IF v_debate.status NOT IN ('complete', 'completed') THEN
    RAISE EXCEPTION 'Debate not complete';
  END IF;

  UPDATE arena_debates
  SET ai_scorecard = p_scorecard
  WHERE id = p_debate_id
    AND ai_scorecard IS NULL; -- Don't overwrite if already saved (idempotent)
END;

$function$;

CREATE OR REPLACE FUNCTION public.save_debate_loadout(p_debate_id uuid, p_reference_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_uid       UUID := auth.uid();
  v_debate    RECORD;
  v_ref_count INTEGER;
  v_owned     INTEGER;
  v_rid       UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_uid NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Only debaters can load references';
  END IF;

  IF v_debate.status NOT IN ('pending', 'lobby', 'matched') THEN
    RAISE EXCEPTION 'Can only load references before debate starts';
  END IF;

  v_ref_count := COALESCE(array_length(p_reference_ids, 1), 0);
  IF v_ref_count > 5 THEN
    RAISE EXCEPTION 'Maximum 5 references per debate';
  END IF;

  IF v_ref_count = 0 THEN
    DELETE FROM debate_reference_loadouts
      WHERE debate_id = p_debate_id AND user_id = v_uid;
    RETURN jsonb_build_object('success', true, 'loaded', 0);
  END IF;

  -- Verify all references: owned by caller, not deleted, not frozen
  SELECT COUNT(*) INTO v_owned
    FROM arsenal_references
    WHERE id = ANY(p_reference_ids)
      AND user_id = v_uid
      AND deleted_at IS NULL
      AND challenge_status != 'frozen';
  IF v_owned != v_ref_count THEN
    RAISE EXCEPTION 'Can only load your own active (non-deleted, non-frozen) references';
  END IF;

  DELETE FROM debate_reference_loadouts
    WHERE debate_id = p_debate_id AND user_id = v_uid;

  FOREACH v_rid IN ARRAY p_reference_ids LOOP
    INSERT INTO debate_reference_loadouts (debate_id, user_id, reference_id)
    VALUES (p_debate_id, v_uid, v_rid);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'loaded', v_ref_count);
END;

$function$;

CREATE OR REPLACE FUNCTION public.score_debate_comment(p_debate_id uuid, p_feed_event_id bigint, p_score integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_uid UUID := auth.uid();
  v_debate RECORD;
  v_target RECORD;
  v_side TEXT;
  v_new_score_a INT;
  v_new_score_b INT;
  v_value_used INT;
  v_value_limit INT;
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
  IF EXISTS (
    SELECT 1 FROM debate_feed_events
    WHERE debate_id = p_debate_id
      AND event_type = 'point_award'
      AND metadata->>'scored_event_id' = p_feed_event_id::text
  ) THEN
    RAISE EXCEPTION 'This comment has already been scored';
  END IF;

  -- ── Per-value budget enforcement (Session 235) ────────
  -- Limits per round: 5pts=2, 4pts=3, 3pts=4, 2pts=5, 1pt=6
  -- Hardcoded CASE, same pattern as submit_reference (LM-086).
  v_target_round := v_target.round;

  CASE p_score
    WHEN 5 THEN v_value_limit := 2;
    WHEN 4 THEN v_value_limit := 3;
    WHEN 3 THEN v_value_limit := 4;
    WHEN 2 THEN v_value_limit := 5;
    WHEN 1 THEN v_value_limit := 6;
  END CASE;

  SELECT COUNT(*) INTO v_value_used
    FROM debate_feed_events
    WHERE debate_id = p_debate_id
      AND event_type = 'point_award'
      AND round = v_target_round
      AND score = p_score;

  IF v_value_used >= v_value_limit THEN
    RAISE EXCEPTION 'Budget exhausted: % pt scores used %/% this round', p_score, v_value_used, v_value_limit;
  END IF;

  -- ── Atomic scoreboard increment ───────────────────────
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
  -- Fires broadcast trigger (broadcast_feed_event).
  -- Bypasses RLS because SECURITY DEFINER.
  -- NOTE: Does NOT use insert_feed_event — see LM-191.
  INSERT INTO debate_feed_events (
    debate_id, user_id, event_type, round, side, content, score,
    reference_id, metadata
  ) VALUES (
    p_debate_id,
    v_uid,
    'point_award',
    v_target_round,
    v_side,
    NULL,
    p_score,
    NULL,
    jsonb_build_object(
      'scored_event_id', p_feed_event_id,
      'score_a_after', v_new_score_a,
      'score_b_after', v_new_score_b
    )
  )
  RETURNING id INTO v_award_event_id;

  -- ── Analytics double-write ────────────────────────────
  PERFORM log_event(
    'feed_point_award'::text,
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

$function$;

CREATE OR REPLACE FUNCTION public.send_spectator_chat(p_debate_id uuid, p_message text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id uuid;
  v_display_name text;
  v_avatar_url text;
  v_last_sent timestamptz;
  v_trimmed text;
  v_debate_status text;
  v_depth_pct int;
BEGIN
  -- Auth check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- F-63: Spectator participation depth gate
  SELECT COALESCE(profile_depth_pct, 0) INTO v_depth_pct FROM profiles WHERE id = v_user_id;
  IF v_depth_pct < 25 THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_incomplete', 'profile_pct', v_depth_pct);
  END IF;

  -- Validate debate exists and is live
  SELECT status INTO v_debate_status
    FROM arena_debates
    WHERE id = p_debate_id;

  IF v_debate_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Debate not found');
  END IF;

  IF v_debate_status NOT IN ('live', 'pending', 'round_break', 'voting') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chat is closed for this debate');
  END IF;

  -- Trim and validate message
  v_trimmed := btrim(p_message);
  IF v_trimmed = '' OR char_length(v_trimmed) > 280 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message must be 1-280 characters');
  END IF;

  -- Rate limit: 1 message per 3 seconds per user per debate
  SELECT created_at INTO v_last_sent
    FROM spectator_chat
    WHERE user_id = v_user_id AND debate_id = p_debate_id
    ORDER BY created_at DESC
    LIMIT 1;

  IF v_last_sent IS NOT NULL AND v_last_sent > now() - interval '3 seconds' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slow down — wait a few seconds');
  END IF;

  -- Get user display info
  SELECT COALESCE(display_name, username, 'Gladiator'), avatar_url
    INTO v_display_name, v_avatar_url
    FROM profiles
    WHERE id = v_user_id;

  -- Insert
  INSERT INTO spectator_chat (debate_id, user_id, message)
    VALUES (p_debate_id, v_user_id, v_trimmed);

  RETURN jsonb_build_object(
    'success', true,
    'display_name', v_display_name,
    'avatar_url', v_avatar_url
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.stamp_debate_language()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

DECLARE
  v_creator_id UUID;
  v_lang TEXT;
BEGIN
  -- Determine the creator: debater_a for most paths, moderator_id for mod-created
  v_creator_id := COALESCE(NEW.debater_a, NEW.moderator_id);

  IF v_creator_id IS NOT NULL THEN
    SELECT COALESCE(p.preferred_language, 'en')
    INTO v_lang
    FROM profiles p
    WHERE p.id = v_creator_id;

    NEW.language := COALESCE(v_lang, 'en');
  ELSE
    NEW.language := 'en';
  END IF;

  RETURN NEW;
END;

$function$;

CREATE OR REPLACE FUNCTION public.start_debate(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
BEGIN
  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status != 'matched' THEN
    RAISE EXCEPTION 'Debate is not in matched state';
  END IF;
  IF v_user_id NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  UPDATE public.debates
  SET status = 'live',
      current_round = 1,
      started_at = now(),
      updated_at = now()
  WHERE id = p_debate_id;

  RETURN json_build_object('success', true, 'status', 'live');
END;

$function$;

CREATE OR REPLACE FUNCTION public.submit_async_round(p_debate_id uuid, p_content text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_rounds JSONB;
  v_round_count INTEGER;
  v_last_round JSONB;
  v_expected_speaker TEXT;
  v_new_round JSONB;
  v_clean_content TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Sanitize
  v_clean_content := sanitize_text(p_content);

  IF char_length(v_clean_content) < 10 THEN
    RAISE EXCEPTION 'Argument must be at least 10 characters';
  END IF;
  IF char_length(v_clean_content) > 5000 THEN
    RAISE EXCEPTION 'Argument must be under 5000 characters';
  END IF;

  SELECT * INTO v_debate FROM public.async_debates WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Async debate not found';
  END IF;

  IF v_debate.status != 'active' THEN
    RAISE EXCEPTION 'Debate is not active';
  END IF;

  IF v_user_id NOT IN (v_debate.challenger_id, v_debate.defender_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  v_rounds := v_debate.rounds;
  v_round_count := jsonb_array_length(v_rounds);

  IF v_round_count = 0 THEN
    v_expected_speaker := 'challenger';
  ELSE
    v_last_round := v_rounds -> (v_round_count - 1);
    IF (v_last_round ->> 'speaker') = 'challenger' THEN
      v_expected_speaker := 'defender';
    ELSE
      v_expected_speaker := 'challenger';
    END IF;
  END IF;

  IF v_expected_speaker = 'challenger' AND v_user_id != v_debate.challenger_id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;
  IF v_expected_speaker = 'defender' AND v_user_id != v_debate.defender_id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  v_new_round := json_build_object(
    'speaker', v_expected_speaker,
    'user_id', v_user_id,
    'content', v_clean_content,
    'submitted_at', now()
  )::jsonb;

  UPDATE public.async_debates
  SET rounds = v_rounds || jsonb_build_array(v_new_round),
      updated_at = now()
  WHERE id = p_debate_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    CASE WHEN v_user_id = v_debate.challenger_id THEN v_debate.defender_id ELSE v_debate.challenger_id END,
    'async_round', 'Your turn!', 'Your opponent submitted their argument',
    json_build_object('debate_id', p_debate_id, 'round', v_round_count + 1)::jsonb
  );

  IF v_round_count + 1 >= 6 THEN
    UPDATE public.async_debates SET status = 'voting', updated_at = now() WHERE id = p_debate_id;
    RETURN json_build_object('success', true, 'round', v_round_count + 1, 'status', 'voting');
  END IF;

  RETURN json_build_object('success', true, 'round', v_round_count + 1, 'status', 'active');
END;

$function$;

CREATE OR REPLACE FUNCTION public.submit_debate_message(p_debate_id uuid, p_round integer, p_side text, p_content text, p_is_ai boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_debate record;
BEGIN
  IF v_uid IS NULL AND p_is_ai = false THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Verify debate exists and user is a participant
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN RAISE EXCEPTION 'Debate not found'; END IF;
  IF p_is_ai = false AND v_uid != v_debate.debater_a AND v_uid != v_debate.debater_b THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  INSERT INTO debate_messages (debate_id, user_id, round, side, content, is_ai)
  VALUES (p_debate_id, v_uid, p_round, p_side, sanitize_text(p_content), p_is_ai)
  RETURNING id INTO v_id;

  -- Analytics: only log AI responses (human messages tracked by round_advanced)
  IF p_is_ai THEN
    -- FIXED: named parameters (LM-188 audit)
    PERFORM log_event(
      p_event_type := 'ai_spar_message',
      p_user_id    := v_debate.debater_a,
      p_debate_id  := p_debate_id,
      p_category   := v_debate.category,
      p_side       := p_side,
      p_metadata   := jsonb_build_object(
        'round', p_round,
        'word_count', array_length(string_to_array(trim(p_content), ' '), 1)
      )
    );
  END IF;

  RETURN json_build_object('id', v_id, 'success', true);
END;

$function$;

CREATE OR REPLACE FUNCTION public.update_arena_debate(p_debate_id uuid, p_status text DEFAULT NULL::text, p_current_round integer DEFAULT NULL::integer, p_winner text DEFAULT NULL::text, p_score_a integer DEFAULT NULL::integer, p_score_b integer DEFAULT NULL::integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_uid uuid := auth.uid();
  v_debate record;
  v_winner text;
  v_elo record;
  v_elo_change_a int := 0;
  v_elo_change_b int := 0;
  v_is_ranked boolean;
  v_profile_a record;
  v_profile_b record;
  v_xp_winner int := 25;
  v_xp_loser int := 10;
  v_xp_draw int := 15;
BEGIN
  -- Lock the debate row to prevent concurrent finalization
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id FOR UPDATE;
  IF v_debate IS NULL THEN RAISE EXCEPTION 'Debate not found'; END IF;
  IF v_uid != v_debate.debater_a AND v_uid != COALESCE(v_debate.debater_b, v_uid) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  -- Double-finalize guard: if already complete, return existing data
  IF v_debate.status = 'complete' AND p_status = 'complete' THEN
    RETURN json_build_object(
      'success', true,
      'already_finalized', true,
      'ranked', COALESCE(v_debate.ranked, false),
      'winner', v_debate.winner,
      'elo_change_a', COALESCE(v_debate.elo_change_a, 0),
      'elo_change_b', COALESCE(v_debate.elo_change_b, 0),
      'vote_count_a', COALESCE(v_debate.vote_count_a, 0),
      'vote_count_b', COALESCE(v_debate.vote_count_b, 0)
    );
  END IF;

  v_is_ranked := COALESCE(v_debate.ranked, false);

  -- SESSION 230 FIX (P2-2): Determine winner based on debate type
  IF p_status = 'complete' THEN
    IF v_debate.mode = 'ai' AND v_debate.debater_b IS NULL AND p_winner IS NOT NULL THEN
      -- AI sparring (solo, no opponent): accept client-scored winner.
      -- No ELO/wins/losses impact because debater_b IS NULL gates those blocks below.
      v_winner := p_winner;
    ELSIF v_debate.debater_b IS NOT NULL THEN
      -- Human PvP: ALWAYS use spectator votes. Never trust client p_winner.
      -- Previously: if p_winner IS NOT NULL, client value was used for ANY mode.
      IF v_debate.vote_count_a > v_debate.vote_count_b THEN
        v_winner := 'a';
      ELSIF v_debate.vote_count_b > v_debate.vote_count_a THEN
        v_winner := 'b';
      ELSE
        v_winner := 'draw';
      END IF;
    ELSE
      -- Fallback: no opponent, non-AI mode (shouldn't happen but be safe)
      v_winner := COALESCE(p_winner, 'draw');
    END IF;
  ELSE
    -- Non-complete status updates (e.g. 'live'): pass through
    v_winner := p_winner;
  END IF;

  -- Update the debate record
  UPDATE arena_debates SET
    status = COALESCE(p_status, status),
    current_round = COALESCE(p_current_round, current_round),
    winner = COALESCE(v_winner, winner),
    score_a = COALESCE(p_score_a, score_a),
    score_b = COALESCE(p_score_b, score_b),
    started_at = CASE WHEN p_status = 'live' AND started_at IS NULL THEN now() ELSE started_at END,
    ended_at = CASE WHEN p_status = 'complete' THEN now() ELSE ended_at END
  WHERE id = p_debate_id;

  -- Elo + profile updates for ranked debates with two human participants
  IF p_status = 'complete'
    AND v_is_ranked
    AND v_debate.debater_b IS NOT NULL
    AND v_winner IS NOT NULL
  THEN
    -- Get current profiles
    SELECT * INTO v_profile_a FROM profiles WHERE id = v_debate.debater_a;
    SELECT * INTO v_profile_b FROM profiles WHERE id = v_debate.debater_b;

    IF v_profile_a IS NOT NULL AND v_profile_b IS NOT NULL THEN
      -- Calculate Elo changes
      SELECT * INTO v_elo FROM calculate_elo(
        COALESCE(v_profile_a.elo_rating, 1200),
        COALESCE(v_profile_b.elo_rating, 1200),
        v_winner,
        COALESCE(v_profile_a.debates_completed, 0),
        COALESCE(v_profile_b.debates_completed, 0)
      );

      v_elo_change_a := v_elo.change_a;
      v_elo_change_b := v_elo.change_b;

      -- Store Elo changes on debate record
      UPDATE arena_debates SET
        elo_change_a = v_elo_change_a,
        elo_change_b = v_elo_change_b
      WHERE id = p_debate_id;

      -- Update profile A
      UPDATE profiles SET
        elo_rating = v_elo.new_rating_a,
        debates_completed = COALESCE(debates_completed, 0) + 1,
        wins = COALESCE(wins, 0) + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
        losses = COALESCE(losses, 0) + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
        draws = COALESCE(draws, 0) + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
        current_streak = CASE
          WHEN v_winner = 'a' THEN COALESCE(current_streak, 0) + 1
          ELSE 0
        END,
        best_streak = CASE
          WHEN v_winner = 'a' AND COALESCE(current_streak, 0) + 1 > COALESCE(best_streak, 0)
            THEN COALESCE(current_streak, 0) + 1
          ELSE COALESCE(best_streak, 0)
        END,
        xp = COALESCE(xp, 0) + CASE
          WHEN v_winner = 'a' THEN v_xp_winner
          WHEN v_winner = 'draw' THEN v_xp_draw
          ELSE v_xp_loser
        END
      WHERE id = v_debate.debater_a;

      -- Update profile B
      UPDATE profiles SET
        elo_rating = v_elo.new_rating_b,
        debates_completed = COALESCE(debates_completed, 0) + 1,
        wins = COALESCE(wins, 0) + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
        losses = COALESCE(losses, 0) + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
        draws = COALESCE(draws, 0) + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
        current_streak = CASE
          WHEN v_winner = 'b' THEN COALESCE(current_streak, 0) + 1
          ELSE 0
        END,
        best_streak = CASE
          WHEN v_winner = 'b' AND COALESCE(current_streak, 0) + 1 > COALESCE(best_streak, 0)
            THEN COALESCE(current_streak, 0) + 1
          ELSE COALESCE(best_streak, 0)
        END,
        xp = COALESCE(xp, 0) + CASE
          WHEN v_winner = 'b' THEN v_xp_winner
          WHEN v_winner = 'draw' THEN v_xp_draw
          ELSE v_xp_loser
        END
      WHERE id = v_debate.debater_b;
    END IF;

  ELSIF p_status = 'complete' AND v_debate.debater_b IS NOT NULL AND NOT v_is_ranked THEN
    -- Casual (non-ranked) with two humans: still update debates_completed + wins/losses
    UPDATE profiles SET
      debates_completed = COALESCE(debates_completed, 0) + 1,
      wins = COALESCE(wins, 0) + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
      losses = COALESCE(losses, 0) + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
      draws = COALESCE(draws, 0) + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
      xp = COALESCE(xp, 0) + CASE
        WHEN v_winner = 'a' THEN v_xp_winner
        WHEN v_winner = 'draw' THEN v_xp_draw
        ELSE v_xp_loser
      END
    WHERE id = v_debate.debater_a;

    UPDATE profiles SET
      debates_completed = COALESCE(debates_completed, 0) + 1,
      wins = COALESCE(wins, 0) + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
      losses = COALESCE(losses, 0) + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
      draws = COALESCE(draws, 0) + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
      xp = COALESCE(xp, 0) + CASE
        WHEN v_winner = 'b' THEN v_xp_winner
        WHEN v_winner = 'draw' THEN v_xp_draw
        ELSE v_xp_loser
      END
    WHERE id = v_debate.debater_b;
  END IF;

  RETURN json_build_object(
    'success', true,
    'ranked', v_is_ranked,
    'winner', v_winner,
    'elo_change_a', v_elo_change_a,
    'elo_change_b', v_elo_change_b,
    'vote_count_a', COALESCE(v_debate.vote_count_a, 0),
    'vote_count_b', COALESCE(v_debate.vote_count_b, 0)
  );
END;

$function$;

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

  -- F-65: Velocity detection — flag if >5 same-side votes in 10 seconds
  SELECT COUNT(*) INTO v_velocity_count
  FROM arena_votes
  WHERE debate_id = p_debate_id
    AND vote = p_vote
    AND voted_at > now() - interval '10 seconds';

  IF v_velocity_count > 5 THEN
    UPDATE arena_debates
    SET velocity_flag_count = velocity_flag_count + 1,
        velocity_flagged_at = COALESCE(velocity_flagged_at, now())
    WHERE id = p_debate_id;

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

  RETURN json_build_object('success', true);
END;

$function$;

CREATE OR REPLACE FUNCTION public.vote_async_debate(p_debate_id uuid, p_voted_for text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_voted_for NOT IN ('challenger', 'defender') THEN
    RAISE EXCEPTION 'Must vote for challenger or defender';
  END IF;

  SELECT * INTO v_debate FROM public.async_debates
  WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_debate.status NOT IN ('active', 'voting') THEN
    RAISE EXCEPTION 'Debate is not accepting votes';
  END IF;

  -- Can't vote in your own debate
  IF v_user_id IN (v_debate.challenger_id, v_debate.defender_id) THEN
    RAISE EXCEPTION 'Cannot vote in your own debate';
  END IF;

  -- Use debate_votes table with async convention
  INSERT INTO public.debate_votes (debate_id, user_id, voted_for, round_number)
  VALUES (p_debate_id, v_user_id, CASE p_voted_for WHEN 'challenger' THEN 'a' ELSE 'b' END, 0)
  ON CONFLICT (debate_id, user_id, round_number)
  DO UPDATE SET voted_for = CASE p_voted_for WHEN 'challenger' THEN 'a' ELSE 'b' END, voted_at = now();

  -- Update tallies
  UPDATE public.async_debates
  SET votes_challenger = (
        SELECT COUNT(*) FROM public.debate_votes
        WHERE debate_id = p_debate_id AND voted_for = 'a'
      ),
      votes_defender = (
        SELECT COUNT(*) FROM public.debate_votes
        WHERE debate_id = p_debate_id AND voted_for = 'b'
      ),
      updated_at = now()
  WHERE id = p_debate_id;

  RETURN json_build_object(
    'success', true,
    'voted_for', p_voted_for
  );
END;

$function$;
