-- THE MODERATOR — Deployed Functions Export
-- Auto-generated from Supabase production database
-- Last updated: Session 250 (April 9, 2026)
--
-- This file is the source of truth for what RPCs are live in production.
-- Re-export after any session that modifies RPCs.

CREATE OR REPLACE FUNCTION public._calc_reference_power(p_source_type text, p_ceiling integer, p_points numeric)
 RETURNS integer
 LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  -- Peer-reviewed: ceiling 5, thresholds 20/60/150/300/500
  IF p_source_type = 'peer-reviewed' THEN
    IF p_points >= 500 THEN RETURN 5;
    ELSIF p_points >= 300 THEN RETURN 4;
    ELSIF p_points >= 150 THEN RETURN 3;
    ELSIF p_points >= 60  THEN RETURN 2;
    ELSIF p_points >= 20  THEN RETURN 1;
    ELSE RETURN 0;
    END IF;
  END IF;

  -- Data / Expert: ceiling 4, thresholds 15/50/120/250
  IF p_source_type IN ('data', 'expert') THEN
    IF p_points >= 250 THEN RETURN 4;
    ELSIF p_points >= 120 THEN RETURN 3;
    ELSIF p_points >= 50  THEN RETURN 2;
    ELSIF p_points >= 15  THEN RETURN 1;
    ELSE RETURN 0;
    END IF;
  END IF;

  -- Government: ceiling 3, thresholds 10/40/100
  IF p_source_type = 'government' THEN
    IF p_points >= 100 THEN RETURN 3;
    ELSIF p_points >= 40  THEN RETURN 2;
    ELSIF p_points >= 10  THEN RETURN 1;
    ELSE RETURN 0;
    END IF;
  END IF;

  -- News / Other: ceiling 1, threshold 5
  IF p_source_type IN ('news', 'other') THEN
    IF p_points >= 5 THEN RETURN 1;
    ELSE RETURN 0;
    END IF;
  END IF;

  RETURN 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public._notify_user(p_user_id uuid, p_type text, p_title text, p_body text DEFAULT NULL::text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data);
END;
$function$;

CREATE OR REPLACE FUNCTION public._source_type_ceiling(p_source_type text)
 RETURNS integer
 LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  CASE p_source_type
    WHEN 'peer-reviewed' THEN RETURN 5;
    WHEN 'data'          THEN RETURN 4;
    WHEN 'expert'        THEN RETURN 4;
    WHEN 'government'    THEN RETURN 3;
    WHEN 'news'          THEN RETURN 1;
    WHEN 'other'         THEN RETURN 1;
    ELSE RETURN 1;
  END CASE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.activate_power_up(p_debate_id uuid, p_power_up_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.assign_moderator(p_debate_id uuid, p_moderator_id uuid DEFAULT NULL::uuid, p_moderator_type text DEFAULT 'human'::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_mod RECORD;
BEGIN
  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_user_id NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Only debaters can assign a moderator';
  END IF;
  IF v_debate.moderator_id IS NOT NULL THEN
    RAISE EXCEPTION 'Debate already has a moderator';
  END IF;

  IF p_moderator_type = 'ai' THEN
    -- AI moderator: no user ID needed
    UPDATE public.debates SET
      moderator_type = 'ai',
      updated_at = now()
    WHERE id = p_debate_id;

    -- FIXED: named parameters (LM-188 audit)
    PERFORM log_event(
      p_event_type := 'moderator_assigned',
      p_user_id    := v_user_id,
      p_debate_id  := p_debate_id,
      p_category   := v_debate.category,
      p_side       := NULL,
      p_metadata   := jsonb_build_object('type', 'ai', 'moderator_id', NULL, 'rating', NULL)
    );

    RETURN json_build_object('success', true, 'moderator_type', 'ai');
  END IF;

  -- Human moderator
  IF p_moderator_id IS NOT NULL THEN
    SELECT * INTO v_mod FROM public.profiles
    WHERE id = p_moderator_id AND is_moderator = true AND mod_available = true AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Moderator not found or not available';
    END IF;

    IF p_moderator_id IN (v_debate.debater_a, v_debate.debater_b) THEN
      RAISE EXCEPTION 'Cannot moderate a debate you are in';
    END IF;
  ELSE
    SELECT * INTO v_mod FROM public.profiles
    WHERE is_moderator = true
      AND mod_available = true
      AND deleted_at IS NULL
      AND id NOT IN (v_debate.debater_a, COALESCE(v_debate.debater_b, '00000000-0000-0000-0000-000000000000'))
    ORDER BY mod_rating DESC, mod_debates_total DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No moderators available';
    END IF;
  END IF;

  UPDATE public.debates SET
    moderator_id = v_mod.id,
    moderator_type = 'human',
    updated_at = now()
  WHERE id = p_debate_id;

  UPDATE public.profiles SET
    mod_debates_total = mod_debates_total + 1
  WHERE id = v_mod.id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'moderator_assigned',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'type', 'human',
      'moderator_id', v_mod.id,
      'rating', v_mod.mod_rating
    )
  );

  RETURN json_build_object(
    'success', true,
    'moderator_id', v_mod.id,
    'moderator_name', v_mod.display_name,
    'moderator_rating', v_mod.mod_rating
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_moderator(p_debate_id uuid, p_moderator_type text, p_moderator_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_mod RECORD;
BEGIN
  SELECT * INTO v_debate FROM public.arena_debates WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_user_id NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Only debaters can assign a moderator';
  END IF;
  IF v_debate.moderator_id IS NOT NULL THEN
    RAISE EXCEPTION 'Debate already has a moderator';
  END IF;

  IF p_moderator_type = 'ai' THEN
    UPDATE public.arena_debates SET
      moderator_type = 'ai',
      updated_at = now()
    WHERE id = p_debate_id;

    PERFORM log_event(
      p_event_type := 'moderator_assigned',
      p_user_id    := v_user_id,
      p_debate_id  := p_debate_id,
      p_category   := v_debate.category,
      p_side       := NULL,
      p_metadata   := jsonb_build_object('type', 'ai', 'moderator_id', NULL, 'rating', NULL)
    );

    RETURN json_build_object('success', true, 'moderator_type', 'ai');
  END IF;

  -- Human moderator
  IF p_moderator_id IS NOT NULL THEN
    SELECT * INTO v_mod FROM public.profiles
    WHERE id = p_moderator_id AND is_moderator = true AND mod_available = true AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Moderator not found or not available';
    END IF;

    IF p_moderator_id IN (v_debate.debater_a, v_debate.debater_b) THEN
      RAISE EXCEPTION 'Cannot moderate a debate you are in';
    END IF;
  ELSE
    SELECT * INTO v_mod FROM public.profiles
    WHERE is_moderator = true
      AND mod_available = true
      AND deleted_at IS NULL
      AND id NOT IN (v_debate.debater_a, COALESCE(v_debate.debater_b, '00000000-0000-0000-0000-000000000000'))
    ORDER BY mod_rating DESC, mod_debates_total DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No moderators available';
    END IF;
  END IF;

  UPDATE public.arena_debates SET
    moderator_id = v_mod.id,
    moderator_type = 'human',
    updated_at = now()
  WHERE id = p_debate_id;

  UPDATE public.profiles SET
    mod_debates_total = mod_debates_total + 1
  WHERE id = v_mod.id;

  PERFORM log_event(
    p_event_type := 'moderator_assigned',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'type', 'human',
      'moderator_id', v_mod.id,
      'rating', v_mod.mod_rating
    )
  );

  RETURN json_build_object(
    'success', true,
    'moderator_id', v_mod.id,
    'moderator_name', v_mod.display_name,
    'moderator_rating', v_mod.mod_rating
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_allow_expired_references()
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_ref RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_ref IN
    SELECT dr.id AS ref_id, dr.debate_id
    FROM public.debate_references dr
    JOIN public.debates d ON d.id = dr.debate_id
    WHERE dr.ruling = 'pending'
      AND d.is_paused = true
      AND d.paused_at < now() - interval '60 seconds'
  LOOP
    UPDATE public.debate_references SET
      ruling = 'allowed',
      ruled_by_type = 'auto',
      ruling_reason = 'Auto-allowed after 60s timeout',
      ruled_at = now()
    WHERE id = v_ref.ref_id;

    UPDATE public.debates SET
      is_paused = false, paused_at = NULL, updated_at = now()
    WHERE id = v_ref.debate_id;

    -- FIXED: named parameters (LM-188 audit)
    PERFORM log_event(
      p_event_type := 'reference_auto_allowed',
      p_user_id    := NULL,
      p_debate_id  := v_ref.debate_id,
      p_category   := NULL,
      p_side       := NULL,
      p_metadata   := jsonb_build_object('reference_id', v_ref.ref_id)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'auto_allowed_count', v_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_grant_depth_cosmetics()
 RETURNS trigger
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_old_depth NUMERIC := OLD.questions_answered / 100.0;
  v_new_depth NUMERIC := NEW.questions_answered / 100.0;
  v_item      RECORD;
BEGIN
  -- Nothing to do if questions_answered didn't move
  IF NEW.questions_answered = OLD.questions_answered THEN
    RETURN NEW;
  END IF;

  -- Find all depth-gated items newly crossed by this update.
  -- OLD depth excluded (already granted), NEW depth included.
  FOR v_item IN
    SELECT id, name, category
      FROM cosmetic_items
     WHERE unlock_type = 'depth'
       AND depth_threshold >  v_old_depth
       AND depth_threshold <= v_new_depth
  LOOP
    INSERT INTO user_cosmetics (user_id, cosmetic_id, acquired_via)
    VALUES (NEW.id, v_item.id, 'depth_unlock')
    ON CONFLICT (user_id, cosmetic_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ban_group_member(p_group_id uuid, p_user_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
  v_target_role text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller_id = p_user_id THEN
    RAISE EXCEPTION 'Cannot ban yourself';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_caller_id;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  SELECT role INTO v_target_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  IF v_target_role IS NOT NULL THEN
    -- Target is a current member: rank check applies
    IF public.group_role_rank(v_caller_role) <= public.group_role_rank(v_target_role) THEN
      RAISE EXCEPTION 'Insufficient permissions: cannot ban a member of equal or higher rank';
    END IF;

    DELETE FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id;

    UPDATE public.groups
    SET member_count = GREATEST(0, member_count - 1), updated_at = now()
    WHERE id = p_group_id;
  ELSE
    -- Target is not a member: only leader/co_leader can pre-emptively ban
    IF public.group_role_rank(v_caller_role) < 3 THEN
      RAISE EXCEPTION 'Insufficient permissions';
    END IF;
  END IF;

  INSERT INTO public.group_bans (group_id, user_id, banned_by, reason)
  VALUES (p_group_id, p_user_id, v_caller_id, p_reason)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.broadcast_feed_event()
 RETURNS trigger
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.browse_mod_queue()
 RETURNS TABLE(debate_id uuid, topic text, category text, mode text, created_at timestamp with time zone, debater_a_name text, debater_b_name text, mod_status text)
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_mod_categories TEXT[];
BEGIN
  SELECT p.mod_categories INTO v_mod_categories
  FROM public.profiles p
  WHERE p.id = v_user_id AND p.is_moderator = true AND p.mod_available = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not an available moderator';
  END IF;

  RETURN QUERY
  SELECT
    ad.id AS debate_id,
    ad.topic,
    ad.category,
    ad.mode,
    ad.created_at,
    pa.display_name AS debater_a_name,
    pb.display_name AS debater_b_name,
    ad.mod_status
  FROM public.arena_debates ad
  LEFT JOIN public.profiles pa ON pa.id = ad.debater_a
  LEFT JOIN public.profiles pb ON pb.id = ad.debater_b
  WHERE ad.mod_status = 'waiting'
    AND ad.status IN ('pending', 'lobby', 'matched', 'live')
    AND (
      array_length(v_mod_categories, 1) IS NULL
      OR ad.category = ANY(v_mod_categories)
    )
    AND ad.debater_a != v_user_id
    AND (ad.debater_b IS NULL OR ad.debater_b != v_user_id)
  ORDER BY ad.created_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bump_spectator_count(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.buy_power_up(p_power_up_id text, p_quantity integer DEFAULT 1)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid UUID;
  v_balance INTEGER;
  v_cost INTEGER;
  v_total_cost INTEGER;
  v_new_qty INTEGER;
  v_questions INTEGER;
  v_min_questions INTEGER;
  v_power_up_name TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_quantity < 1 OR p_quantity > 10 THEN
    RETURN json_build_object('success', false, 'error', 'Quantity must be 1-10');
  END IF;

  -- Tier gate: which tier unlocks this power-up?
  CASE p_power_up_id
    WHEN 'multiplier_2x' THEN v_min_questions := 25;  v_power_up_name := '2x Multiplier';
    WHEN 'silence'       THEN v_min_questions := 50;  v_power_up_name := 'Silence';
    WHEN 'shield'        THEN v_min_questions := 75;  v_power_up_name := 'Shield';
    WHEN 'reveal'        THEN v_min_questions := 100; v_power_up_name := 'Reveal';
    ELSE
      RETURN json_build_object('success', false, 'error', 'Unknown power-up');
  END CASE;

  -- Get user profile
  SELECT questions_answered, token_balance
  INTO v_questions, v_balance
  FROM profiles WHERE id = v_uid;

  v_questions := COALESCE(v_questions, 0);

  IF v_questions < v_min_questions THEN
    RETURN json_build_object('success', false, 'error',
      format('Answer %s profile questions to unlock this power-up (you have %s)', v_min_questions, v_questions));
  END IF;

  -- Get power-up cost
  SELECT cost INTO v_cost FROM power_ups WHERE id = p_power_up_id;
  IF v_cost IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Power-up not found');
  END IF;

  v_total_cost := v_cost * p_quantity;

  -- Check balance
  IF v_balance IS NULL OR v_balance < v_total_cost THEN
    RETURN json_build_object('success', false, 'error',
      format('Not enough tokens (need %s, have %s)', v_total_cost, COALESCE(v_balance, 0)));
  END IF;

  -- Deduct tokens
  UPDATE profiles SET token_balance = token_balance - v_total_cost WHERE id = v_uid;

  -- Add to inventory (upsert)
  INSERT INTO user_power_ups (user_id, power_up_id, quantity)
  VALUES (v_uid, p_power_up_id, p_quantity)
  ON CONFLICT (user_id, power_up_id)
  DO UPDATE SET quantity = user_power_ups.quantity + p_quantity
  RETURNING quantity INTO v_new_qty;

  -- SESSION 120: Notify user of purchase
  PERFORM _notify_user(
    v_uid,
    'power_up',
    '⚡ Power-Up Acquired',
    format('%s x%s purchased for %s tokens', v_power_up_name, p_quantity, v_total_cost),
    jsonb_build_object('power_up_id', p_power_up_id, 'quantity', p_quantity, 'cost', v_total_cost)
  );

  RETURN json_build_object(
    'success', true,
    'power_up_id', p_power_up_id,
    'quantity_bought', p_quantity,
    'new_quantity', v_new_qty,
    'tokens_spent', v_total_cost,
    'new_balance', v_balance - v_total_cost
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_elo(rating_a integer, rating_b integer, winner text, debates_a integer DEFAULT 0, debates_b integer DEFAULT 0)
 RETURNS TABLE(new_rating_a integer, new_rating_b integer, change_a integer, change_b integer)
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.cancel_mod_debate(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid    UUID := auth.uid();
  v_debate RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT ad.*
  INTO v_debate
  FROM arena_debates ad
  WHERE ad.id = p_debate_id
  FOR NO KEY UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_uid != v_debate.moderator_id THEN
    RAISE EXCEPTION 'Not the debate moderator';
  END IF;

  IF v_debate.status != 'lobby' THEN
    RAISE EXCEPTION 'Cannot cancel — debate already started';
  END IF;

  UPDATE arena_debates
  SET status = 'cancelled'
  WHERE id = p_debate_id;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_private_lobby(p_debate_id uuid)
 RETURNS void
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.cast_auto_debate_vote(p_debate_id uuid, p_fingerprint text, p_voted_for text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_existing UUID;
  v_result JSONB;
BEGIN
  -- Validate side
  IF p_voted_for NOT IN ('a', 'b') THEN
    RETURN jsonb_build_object('error', 'Invalid vote. Must be a or b.');
  END IF;

  -- Check for existing vote
  SELECT id INTO v_existing
  FROM auto_debate_votes
  WHERE auto_debate_id = p_debate_id AND voter_fingerprint = p_fingerprint;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Already voted on this debate.');
  END IF;

  -- Insert vote
  INSERT INTO auto_debate_votes (auto_debate_id, voter_fingerprint, user_id, voted_for)
  VALUES (p_debate_id, p_fingerprint, p_user_id, p_voted_for);

  -- Update counts on auto_debates
  IF p_voted_for = 'a' THEN
    UPDATE auto_debates
    SET votes_a = votes_a + 1, vote_count = vote_count + 1
    WHERE id = p_debate_id;
  ELSE
    UPDATE auto_debates
    SET votes_b = votes_b + 1, vote_count = vote_count + 1
    WHERE id = p_debate_id;
  END IF;

  -- Return updated counts
  SELECT jsonb_build_object(
    'success', true,
    'votes_a', ad.votes_a,
    'votes_b', ad.votes_b,
    'vote_count', ad.vote_count
  ) INTO v_result
  FROM auto_debates ad WHERE ad.id = p_debate_id;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cast_landing_vote(p_topic_slug text, p_side text, p_fingerprint text)
 RETURNS void
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO landing_votes (topic_slug, side, fingerprint)
  VALUES (p_topic_slug, p_side, p_fingerprint)
  ON CONFLICT (topic_slug, fingerprint) DO UPDATE SET side = EXCLUDED.side;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cast_landing_vote(p_topic text, p_side text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
BEGIN
  IF p_side NOT IN ('yes', 'no') THEN
    RAISE EXCEPTION 'Invalid side: %', p_side;
  END IF;

  INSERT INTO landing_vote_counts (topic_slug, yes_votes, no_votes, updated_at)
  VALUES (
    p_topic,
    CASE WHEN p_side = 'yes' THEN 1 ELSE 0 END,
    CASE WHEN p_side = 'no' THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (topic_slug) DO UPDATE SET
    yes_votes = landing_vote_counts.yes_votes + CASE WHEN p_side = 'yes' THEN 1 ELSE 0 END,
    no_votes = landing_vote_counts.no_votes + CASE WHEN p_side = 'no' THEN 1 ELSE 0 END,
    updated_at = now();

  SELECT json_build_object(
    'topic_slug', lvc.topic_slug,
    'yes_votes', lvc.yes_votes,
    'no_votes', lvc.no_votes
  ) INTO result
  FROM landing_vote_counts lvc
  WHERE lvc.topic_slug = p_topic;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cast_sentiment_vote(p_debate_id uuid, p_side text, p_round integer)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.challenge_reference(p_reference_id uuid, p_debate_id uuid, p_ruling text)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id        uuid;
  v_ref            record;
  v_point_penalty  numeric := 10;
  v_new_points     numeric;
  v_new_power      integer;
BEGIN
  -- Auth check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate ruling
  IF p_ruling NOT IN ('upheld', 'rejected') THEN
    RAISE EXCEPTION 'Ruling must be upheld or rejected';
  END IF;

  -- Get the reference
  SELECT * INTO v_ref
    FROM public.arsenal_references
    WHERE id = p_reference_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;

  IF p_ruling = 'upheld' THEN
    -- Reference survives the challenge
    UPDATE public.arsenal_references
      SET challenge_count = challenge_count + 1,
          challenge_wins  = challenge_wins + 1
      WHERE id = p_reference_id;

    RETURN jsonb_build_object(
      'ruling', 'upheld',
      'challenge_wins', v_ref.challenge_wins + 1,
      'challenge_count', v_ref.challenge_count + 1,
      'message', 'Reference upheld by moderator'
    );

  ELSE
    -- Reference rejected: deduct verification points
    v_new_points := GREATEST(v_ref.verification_points - v_point_penalty, 0);
    v_new_power  := _calc_reference_power(v_ref.source_type, v_ref.power_ceiling, v_new_points);

    IF v_new_power > v_ref.power_ceiling THEN
      v_new_power := v_ref.power_ceiling;
    END IF;

    UPDATE public.arsenal_references
      SET challenge_count    = challenge_count + 1,
          challenge_losses   = challenge_losses + 1,
          verification_points = v_new_points,
          current_power       = v_new_power
      WHERE id = p_reference_id;

    -- Log the penalty
    PERFORM public.log_event(
      p_event_type := 'reference_challenge_lost',
      p_user_id    := v_ref.user_id,
      p_metadata   := jsonb_build_object(
        'reference_id', p_reference_id,
        'debate_id', p_debate_id,
        'points_deducted', v_point_penalty,
        'new_points', v_new_points,
        'old_power', v_ref.current_power,
        'new_power', v_new_power
      )
    );

    RETURN jsonb_build_object(
      'ruling', 'rejected',
      'challenge_losses', v_ref.challenge_losses + 1,
      'challenge_count', v_ref.challenge_count + 1,
      'points_deducted', v_point_penalty,
      'new_points', v_new_points,
      'new_power', v_new_power,
      'message', 'Reference rejected — verification points deducted'
    );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_achievements()
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile RECORD;
  v_achievement RECORD;
  v_granted INTEGER := 0;
  v_met BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;

  -- Loop through all achievements not yet earned
  FOR v_achievement IN
    SELECT a.* FROM public.achievements a
    WHERE a.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.user_achievements ua
        WHERE ua.achievement_id = a.id AND ua.user_id = v_user_id
      )
  LOOP
    v_met := false;

    -- Check each requirement type
    CASE v_achievement.requirement_type
      WHEN 'wins' THEN
        v_met := v_profile.wins >= v_achievement.requirement_value;
      WHEN 'debates' THEN
        v_met := v_profile.debates_completed >= v_achievement.requirement_value;
      WHEN 'streak' THEN
        v_met := v_profile.best_streak >= v_achievement.requirement_value;
      WHEN 'elo' THEN
        v_met := v_profile.elo_rating >= v_achievement.requirement_value;
      WHEN 'level' THEN
        v_met := v_profile.level >= v_achievement.requirement_value;
      WHEN 'xp' THEN
        v_met := v_profile.xp >= v_achievement.requirement_value;
      WHEN 'profile_depth' THEN
        v_met := v_profile.profile_depth_pct >= v_achievement.requirement_value;
      WHEN 'tokens_earned' THEN
        v_met := v_profile.token_balance >= v_achievement.requirement_value;
      ELSE
        v_met := false;
    END CASE;

    IF v_met THEN
      -- Grant achievement
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (v_user_id, v_achievement.id)
      ON CONFLICT DO NOTHING;

      -- Grant token reward if any
      IF v_achievement.reward_tokens > 0 THEN
        UPDATE public.profiles
        SET token_balance = token_balance + v_achievement.reward_tokens,
            updated_at = now()
        WHERE id = v_user_id;
      END IF;

      -- Grant cosmetic reward if any
      IF v_achievement.reward_cosmetic_id IS NOT NULL THEN
        INSERT INTO public.user_cosmetics (user_id, cosmetic_id)
        VALUES (v_user_id, v_achievement.reward_cosmetic_id)
        ON CONFLICT DO NOTHING;
      END IF;

      v_granted := v_granted + 1;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'achievements_granted', v_granted
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_match_acceptance(p_debate_id uuid)
 RETURNS TABLE(player_a_ready boolean, player_b_ready boolean, status text)
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_row arena_debates%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM arena_debates WHERE id = p_debate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- Auth: caller must be player_a or player_b
  IF v_caller IS DISTINCT FROM v_row.player_a AND v_caller IS DISTINCT FROM v_row.player_b THEN
    RAISE EXCEPTION 'Not a participant in this debate';
  END IF;

  RETURN QUERY SELECT v_row.player_a_ready, v_row.player_b_ready, v_row.status::TEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_mod_cooldown(p_moderator_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_today_start TIMESTAMPTZ;
  v_dropouts_today INT;
  v_last_dropout RECORD;
  v_cooldown_expires TIMESTAMPTZ;
  v_in_cooldown BOOLEAN;
BEGIN
  -- ── Count today's dropouts ────────────────────────────
  v_today_start := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

  SELECT COUNT(*) INTO v_dropouts_today
    FROM mod_dropout_log
    WHERE moderator_id = p_moderator_id
      AND created_at >= v_today_start;

  -- No dropouts today → no cooldown
  IF v_dropouts_today = 0 THEN
    RETURN json_build_object(
      'in_cooldown', false,
      'dropouts_today', 0,
      'cooldown_expires_at', NULL,
      'next_offense_cooldown_minutes', get_mod_cooldown_minutes(1)
    );
  END IF;

  -- ── Get the most recent dropout ───────────────────────
  SELECT * INTO v_last_dropout
    FROM mod_dropout_log
    WHERE moderator_id = p_moderator_id
      AND created_at >= v_today_start
    ORDER BY created_at DESC
    LIMIT 1;

  -- Cooldown expires at: dropout time + cooldown duration
  v_cooldown_expires := v_last_dropout.created_at
    + (v_last_dropout.cooldown_minutes || ' minutes')::interval;

  v_in_cooldown := (now() < v_cooldown_expires);

  RETURN json_build_object(
    'in_cooldown', v_in_cooldown,
    'dropouts_today', v_dropouts_today,
    'cooldown_expires_at', CASE WHEN v_in_cooldown THEN v_cooldown_expires ELSE NULL END,
    'cooldown_remaining_seconds', CASE
      WHEN v_in_cooldown THEN EXTRACT(EPOCH FROM (v_cooldown_expires - now()))::int
      ELSE 0
    END,
    'next_offense_cooldown_minutes', get_mod_cooldown_minutes(v_dropouts_today + 1)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_mod_debate(p_debate_id uuid)
 RETURNS TABLE(status text, debater_a_id uuid, debater_a_name text, debater_b_id uuid, debater_b_name text, topic text, ruleset text, total_rounds integer, language text)
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid    UUID := auth.uid();
  v_debate RECORD;
  v_pa     RECORD;
  v_pb     RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT ad.*
  INTO v_debate
  FROM arena_debates ad
  WHERE ad.id = p_debate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_uid != v_debate.moderator_id
     AND v_uid IS DISTINCT FROM v_debate.debater_a
     AND v_uid IS DISTINCT FROM v_debate.debater_b
  THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_debate.debater_a IS NOT NULL THEN
    SELECT p.display_name INTO v_pa FROM profiles p WHERE p.id = v_debate.debater_a;
  END IF;

  IF v_debate.debater_b IS NOT NULL THEN
    SELECT p.display_name INTO v_pb FROM profiles p WHERE p.id = v_debate.debater_b;
  END IF;

  status         := v_debate.status;
  debater_a_id   := v_debate.debater_a;
  debater_a_name := v_pa.display_name;
  debater_b_id   := v_debate.debater_b;
  debater_b_name := v_pb.display_name;
  topic          := v_debate.topic;
  ruleset        := v_debate.ruleset;
  total_rounds   := COALESCE(v_debate.total_rounds, 4);
  language       := COALESCE(v_debate.language, 'en');

  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_private_lobby(p_debate_id uuid)
 RETURNS TABLE(status text, opponent_id uuid, opponent_name text, opponent_elo integer, player_b_ready boolean, total_rounds integer, language text)
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_debate  arena_debates%ROWTYPE;
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
    RETURN QUERY SELECT
      v_debate.status,
      NULL::uuid,
      NULL::text,
      NULL::int,
      v_debate.player_b_ready,
      COALESCE(v_debate.total_rounds, 4),
      COALESCE(v_debate.language, 'en');
  ELSE
    RETURN QUERY
    SELECT
      v_debate.status,
      v_debate.debater_b,
      COALESCE(p.display_name, p.username, 'Opponent')::text,
      COALESCE(p.elo_rating, 1200)::int,
      v_debate.player_b_ready,
      COALESCE(v_debate.total_rounds, 4),
      COALESCE(v_debate.language, 'en')
    FROM profiles p WHERE p.id = v_debate.debater_b;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_queue_status()
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id uuid, p_action text, p_window_minutes integer, p_max_count integer)
 RETURNS boolean
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
  v_lock_key BIGINT;
BEGIN
  -- Derive a stable integer lock key from user_id + action.
  -- hashtext() is fast and built-in. Casting to bigint keeps it in
  -- pg_advisory_xact_lock's expected range.
  v_lock_key := hashtext(p_user_id::TEXT || '|' || p_action);

  -- Acquire an exclusive advisory lock for this user+action pair.
  -- Any concurrent call with the same key blocks here until we commit.
  -- Lock is automatically released when this transaction ends.
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Compute the current window boundary
  v_window_start := date_trunc('minute', now())
    - (EXTRACT(MINUTE FROM now())::integer % p_window_minutes) * interval '1 minute';

  -- Upsert counter — now safe: only one transaction runs this at a time per user+action
  INSERT INTO public.rate_limits (user_id, action, window_start, count)
  VALUES (p_user_id, p_action, v_window_start, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_current_count;

  -- Lightweight housekeeping — prune stale windows
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '24 hours';

  RETURN v_current_count <= p_max_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cite_debate_reference(p_debate_id uuid, p_reference_id uuid, p_round integer, p_side text)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.cite_reference(p_reference_id uuid, p_debate_id uuid, p_outcome text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id   uuid;
  v_ref       record;
  v_xp_award  integer := 0;
  v_base_xp   integer := 10;
BEGIN
  -- Auth check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the reference
  SELECT * INTO v_ref
    FROM public.arsenal_references
    WHERE id = p_reference_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;

  -- Must be the owner to cite their own reference
  IF v_ref.user_id != v_user_id THEN
    RAISE EXCEPTION 'Can only cite your own references';
  END IF;

  IF p_outcome IS NULL THEN
    -- Initial citation: increment count
    UPDATE public.arsenal_references
      SET citation_count = citation_count + 1
      WHERE id = p_reference_id;

    RETURN jsonb_build_object(
      'action', 'cited',
      'citation_count', v_ref.citation_count + 1
    );

  ELSIF p_outcome = 'win' THEN
    -- Debate won: increment win_count, award XP
    v_xp_award := v_base_xp * GREATEST(v_ref.current_power, 1);

    UPDATE public.arsenal_references
      SET win_count = win_count + 1,
          xp        = xp + v_xp_award
      WHERE id = p_reference_id;

    RETURN jsonb_build_object(
      'action', 'win_recorded',
      'win_count', v_ref.win_count + 1,
      'xp_awarded', v_xp_award,
      'total_xp', v_ref.xp + v_xp_award
    );

  ELSIF p_outcome = 'loss' THEN
    -- Debate lost: increment loss_count, no XP
    UPDATE public.arsenal_references
      SET loss_count = loss_count + 1
      WHERE id = p_reference_id;

    RETURN jsonb_build_object(
      'action', 'loss_recorded',
      'loss_count', v_ref.loss_count + 1
    );

  ELSE
    RAISE EXCEPTION 'Invalid outcome: must be NULL, win, or loss';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_action_tokens(p_action text, p_reference_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_today DATE := CURRENT_DATE;
  v_tokens INTEGER;
  v_daily_cap INTEGER;
  v_today_count INTEGER;
  v_valid BOOLEAN := false;
  v_new_balance INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  CASE p_action
    WHEN 'hot_take' THEN v_tokens := 3; v_daily_cap := 3;
    WHEN 'vote' THEN v_tokens := 1; v_daily_cap := 5;
    WHEN 'reaction' THEN v_tokens := 1; v_daily_cap := 5;
    WHEN 'ai_sparring' THEN v_tokens := 3; v_daily_cap := 3;
    WHEN 'prediction' THEN v_tokens := 2; v_daily_cap := 5;
    ELSE RETURN json_build_object('success', false, 'error', 'Unknown action: ' || p_action);
  END CASE;

  SELECT COUNT(*) INTO v_today_count
  FROM public.token_earn_log
  WHERE user_id = v_user_id AND earn_type = p_action AND earned_date = v_today;

  IF v_today_count >= v_daily_cap THEN
    RETURN json_build_object('success', false, 'error', 'Daily cap reached', 'cap', v_daily_cap);
  END IF;

  IF p_reference_id IS NOT NULL THEN
    IF EXISTS(
      SELECT 1 FROM public.token_earn_log
      WHERE user_id = v_user_id AND earn_type = p_action AND reference_id = p_reference_id
    ) THEN
      RETURN json_build_object('success', false, 'error', 'Already claimed for this item');
    END IF;
  END IF;

  CASE p_action
    WHEN 'hot_take' THEN
      SELECT EXISTS(
        SELECT 1 FROM public.hot_takes
        WHERE id = p_reference_id AND user_id = v_user_id
      ) INTO v_valid;
    WHEN 'vote' THEN
      SELECT EXISTS(
        SELECT 1 FROM public.debate_votes
        WHERE debate_id = p_reference_id AND user_id = v_user_id
        UNION ALL
        SELECT 1 FROM public.arena_votes
        WHERE debate_id = p_reference_id AND user_id = v_user_id
      ) INTO v_valid;
    WHEN 'reaction' THEN
      SELECT EXISTS(
        SELECT 1 FROM public.hot_take_reactions
        WHERE hot_take_id = p_reference_id AND user_id = v_user_id
      ) INTO v_valid;
    WHEN 'ai_sparring' THEN
      SELECT EXISTS(
        SELECT 1 FROM public.arena_debates
        WHERE id = p_reference_id
          AND (debater_a = v_user_id OR debater_b = v_user_id)
          AND status = 'complete'
          AND mode = 'ai'
      ) INTO v_valid;
    WHEN 'prediction' THEN
      SELECT EXISTS(
        SELECT 1 FROM public.prediction_picks
        WHERE question_id = p_reference_id AND user_id = v_user_id
      ) INTO v_valid;
    ELSE
      v_valid := false;
  END CASE;

  IF NOT v_valid THEN
    RETURN json_build_object('success', false, 'error', 'Action not verified');
  END IF;

  UPDATE public.profiles SET
    token_balance = token_balance + v_tokens,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING token_balance INTO v_new_balance;

  INSERT INTO public.token_transactions (user_id, amount, type, source, balance_after)
  VALUES (v_user_id, v_tokens, 'earn', p_action, v_new_balance);

  INSERT INTO public.token_earn_log (user_id, earn_type, reference_id, tokens_earned, earned_date)
  VALUES (v_user_id, p_action, p_reference_id, v_tokens, v_today);

  PERFORM log_event(
    p_event_type := 'token_earn',
    p_user_id := v_user_id,
    p_metadata := jsonb_build_object(
      'type', p_action,
      'reference_id', p_reference_id,
      'tokens', v_tokens
    )
  );

  RETURN json_build_object(
    'success', true,
    'tokens_earned', v_tokens,
    'action', p_action,
    'daily_count', v_today_count + 1,
    'daily_cap', v_daily_cap,
    'new_balance', v_new_balance
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_daily_login()
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_last_login DATE;
  v_current_streak INT;
  v_best_streak INT;
  v_base_tokens INT := 5;
  v_streak_bonus INT := 0;
  v_total_tokens INT;
  v_new_balance INT;
  v_today DATE := CURRENT_DATE;
  v_freeze_used BOOLEAN := false;
  v_freezes INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Already claimed today? (FIXED: earn_type not action, earned_date not reference_id)
  IF EXISTS (
    SELECT 1 FROM token_earn_log
    WHERE user_id = v_user_id
      AND earn_type = 'daily_login'
      AND earned_date = v_today
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already claimed today');
  END IF;

  -- Get current profile state
  SELECT last_login_date, login_streak, best_login_streak, streak_freezes
  INTO v_last_login, v_current_streak, v_best_streak, v_freezes
  FROM profiles WHERE id = v_user_id;

  v_current_streak := COALESCE(v_current_streak, 0);
  v_best_streak := COALESCE(v_best_streak, 0);
  v_freezes := COALESCE(v_freezes, 0);

  -- Streak logic
  IF v_last_login IS NULL THEN
    v_current_streak := 1;
  ELSIF v_last_login = v_today - 1 THEN
    v_current_streak := v_current_streak + 1;
  ELSIF v_last_login = v_today THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already claimed today');
  ELSIF v_last_login = v_today - 2 AND v_freezes > 0 THEN
    v_freezes := v_freezes - 1;
    v_current_streak := v_current_streak + 1;
    v_freeze_used := true;
  ELSE
    v_current_streak := 1;
  END IF;

  IF v_current_streak > v_best_streak THEN
    v_best_streak := v_current_streak;
  END IF;

  -- Streak bonus: +1 per day of streak, capped at 10
  v_streak_bonus := LEAST(v_current_streak - 1, 10);
  v_total_tokens := v_base_tokens + v_streak_bonus;

  -- Log the earn (FIXED: earn_type not action, reference_id NULL)
  INSERT INTO token_earn_log (user_id, earn_type, reference_id, tokens_earned, earned_date)
  VALUES (v_user_id, 'daily_login', NULL, v_total_tokens, v_today);

  -- Update profile
  UPDATE profiles SET
    token_balance = token_balance + v_total_tokens,
    login_streak = v_current_streak,
    best_login_streak = v_best_streak,
    last_login_date = v_today,
    streak_freezes = v_freezes
  WHERE id = v_user_id;

  SELECT token_balance INTO v_new_balance FROM profiles WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'tokens_earned', v_total_tokens,
    'streak_bonus', v_streak_bonus,
    'login_streak', v_current_streak,
    'best_login_streak', v_best_streak,
    'new_balance', COALESCE(v_new_balance, 0),
    'freeze_used', v_freeze_used,
    'streak_freezes', v_freezes
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_daily_tokens()
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_tier TEXT;
  v_amount INTEGER;
  v_last_claim TIMESTAMPTZ;
  v_new_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- FIX: lock profile row to prevent double-claim race
  SELECT subscription_tier INTO v_tier
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- Check if already claimed today
  SELECT MAX(created_at) INTO v_last_claim
  FROM public.token_transactions
  WHERE user_id = v_user_id AND type = 'daily_claim'
    AND created_at > CURRENT_DATE::TIMESTAMPTZ;

  IF v_last_claim IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Already claimed today');
  END IF;

  -- Amount by tier
  v_amount := CASE v_tier
    WHEN 'creator' THEN 30
    WHEN 'champion' THEN 25
    WHEN 'contender' THEN 15
    ELSE 10  -- free
  END;

  -- Credit tokens
  UPDATE public.profiles
  SET token_balance = token_balance + v_amount,
      updated_at = now()
  WHERE id = v_user_id
  RETURNING token_balance INTO v_new_balance;

  -- Log transaction
  INSERT INTO public.token_transactions (user_id, amount, type, source, balance_after)
  VALUES (v_user_id, v_amount, 'daily_claim', 'Daily login reward', v_new_balance);

  RETURN json_build_object(
    'success', true,
    'amount', v_amount,
    'new_balance', v_new_balance
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_debate_tokens(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_already_claimed BOOLEAN;
  v_base_tokens INTEGER := 5;
  v_win_bonus INTEGER := 0;
  v_upset_bonus INTEGER := 0;
  v_total_tokens INTEGER;
  v_new_balance INTEGER;
  v_is_winner BOOLEAN := false;
  v_source_table TEXT;
  -- Legacy debates fields
  v_leg_debate RECORD;
  v_elo_gap INTEGER;
  -- Arena debates fields
  v_arena_debate RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check dedup first (fast path)
  SELECT EXISTS(
    SELECT 1 FROM public.token_earn_log
    WHERE user_id = v_user_id AND earn_type = 'debate_complete' AND reference_id = p_debate_id
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN json_build_object('success', false, 'error', 'Already claimed');
  END IF;

  -- Try arena_debates first (this is where active debates live)
  SELECT * INTO v_arena_debate FROM public.arena_debates WHERE id = p_debate_id;

  IF FOUND THEN
    v_source_table := 'arena_debates';

    -- Must be completed
    IF v_arena_debate.status != 'complete' THEN
      RETURN json_build_object('success', false, 'error', 'Debate not completed');
    END IF;

    -- Must be a participant
    IF v_user_id NOT IN (v_arena_debate.debater_a, v_arena_debate.debater_b) THEN
      RETURN json_build_object('success', false, 'error', 'Not a participant');
    END IF;

    -- Check winner — arena_debates stores winner as 'a'/'b'/'draw' text
    IF (v_arena_debate.winner = 'a' AND v_user_id = v_arena_debate.debater_a)
       OR (v_arena_debate.winner = 'b' AND v_user_id = v_arena_debate.debater_b) THEN
      v_is_winner := true;
      v_win_bonus := 5;
      -- No upset bonus for arena debates (no Elo data on this table)
    END IF;

  ELSE
    -- Try legacy debates table
    SELECT * INTO v_leg_debate FROM public.debates WHERE id = p_debate_id;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Debate not found');
    END IF;

    v_source_table := 'debates';

    IF v_leg_debate.status != 'completed' THEN
      RETURN json_build_object('success', false, 'error', 'Debate not completed');
    END IF;

    IF v_user_id NOT IN (v_leg_debate.debater_a, v_leg_debate.debater_b) THEN
      RETURN json_build_object('success', false, 'error', 'Not a participant');
    END IF;

    -- Legacy debates have winner_id as UUID
    IF v_leg_debate.winner_id = v_user_id THEN
      v_is_winner := true;
      v_win_bonus := 5;

      -- Upset bonus from Elo change
      IF v_user_id = v_leg_debate.debater_a AND v_leg_debate.elo_change_a IS NOT NULL THEN
        v_elo_gap := ABS(v_leg_debate.elo_change_a);
      ELSIF v_user_id = v_leg_debate.debater_b AND v_leg_debate.elo_change_b IS NOT NULL THEN
        v_elo_gap := ABS(v_leg_debate.elo_change_b);
      END IF;

      IF v_elo_gap IS NOT NULL AND v_elo_gap >= 25 THEN
        v_upset_bonus := 10;
      ELSIF v_elo_gap IS NOT NULL AND v_elo_gap >= 18 THEN
        v_upset_bonus := 5;
      ELSIF v_elo_gap IS NOT NULL AND v_elo_gap >= 12 THEN
        v_upset_bonus := 3;
      END IF;
    END IF;
  END IF;

  v_total_tokens := v_base_tokens + v_win_bonus + v_upset_bonus;

  -- Credit tokens
  UPDATE public.profiles SET
    token_balance = token_balance + v_total_tokens,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING token_balance INTO v_new_balance;

  -- Log to token_transactions
  INSERT INTO public.token_transactions (user_id, amount, type, source, balance_after)
  VALUES (v_user_id, v_total_tokens, 'earn',
    'debate_' || CASE WHEN v_is_winner THEN 'win' ELSE 'complete' END,
    v_new_balance);

  -- Log to earn dedup table
  INSERT INTO public.token_earn_log (user_id, earn_type, reference_id, tokens_earned, earned_date)
  VALUES (v_user_id, 'debate_complete', p_debate_id, v_total_tokens, CURRENT_DATE);

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'token_earn',
    p_user_id    := v_user_id,
    p_metadata   := jsonb_build_object(
      'type', 'debate_complete',
      'debate_id', p_debate_id,
      'source_table', v_source_table,
      'tokens', v_total_tokens,
      'win_bonus', v_win_bonus,
      'upset_bonus', v_upset_bonus,
      'is_winner', v_is_winner
    )
  );

  RETURN json_build_object(
    'success', true,
    'tokens_earned', v_total_tokens,
    'base', v_base_tokens,
    'win_bonus', v_win_bonus,
    'upset_bonus', v_upset_bonus,
    'is_winner', v_is_winner,
    'new_balance', v_new_balance
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_milestone(p_milestone_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_tokens INT;
  v_label TEXT;
  v_new_balance INT;
  v_freeze_reward INT := 0;
  v_earn_type TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Define milestones and their rewards
  SELECT tokens, label INTO v_tokens, v_label FROM (VALUES
    ('first_hot_take',     25,  'First Hot Take'),
    ('first_debate',       50,  'First Debate'),
    ('first_vote',         10,  'First Vote'),
    ('first_reaction',      5,  'First Reaction'),
    ('first_ai_sparring',  15,  'First AI Sparring'),
    ('first_prediction',   10,  'First Prediction'),
    ('profile_3_sections', 30,  '3 Profile Sections'),
    ('profile_6_sections', 75,  '6 Profile Sections'),
    ('profile_12_sections',150, 'All 12 Sections'),
    ('verified_gladiator', 100, 'Verified Gladiator'),
    ('streak_7',            0,  '7-Day Streak'),
    ('streak_30',           0,  '30-Day Streak'),
    ('streak_100',          0,  '100-Day Streak')
  ) AS m(key, tokens, label)
  WHERE m.key = p_milestone_key;

  IF v_tokens IS NULL AND v_label IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unknown milestone');
  END IF;

  -- Streak milestones award freezes instead of tokens
  IF p_milestone_key = 'streak_7' THEN
    v_freeze_reward := 1;
  ELSIF p_milestone_key = 'streak_30' THEN
    v_freeze_reward := 3;
  ELSIF p_milestone_key = 'streak_100' THEN
    v_freeze_reward := 5;
  END IF;

  -- Build earn_type key
  v_earn_type := 'milestone:' || p_milestone_key;

  -- Dedup check — already claimed?
  IF EXISTS (
    SELECT 1 FROM token_earn_log
    WHERE user_id = v_user_id
      AND earn_type = v_earn_type
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already claimed');
  END IF;

  -- Insert earn log (reference_id is NULL — milestone key is in earn_type)
  INSERT INTO token_earn_log (user_id, earn_type, reference_id, tokens_earned)
  VALUES (v_user_id, v_earn_type, NULL, COALESCE(v_tokens, 0));

  -- Credit tokens (if any)
  IF v_tokens > 0 THEN
    UPDATE profiles
    SET token_balance = token_balance + v_tokens
    WHERE id = v_user_id;
  END IF;

  -- Credit streak freezes (if any)
  IF v_freeze_reward > 0 THEN
    UPDATE profiles
    SET streak_freezes = streak_freezes + v_freeze_reward
    WHERE id = v_user_id;
  END IF;

  -- Get new balance
  SELECT token_balance INTO v_new_balance
  FROM profiles WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'milestone', p_milestone_key,
    'label', v_label,
    'tokens_earned', COALESCE(v_tokens, 0),
    'freezes_earned', v_freeze_reward,
    'new_balance', COALESCE(v_new_balance, 0)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_section_reward(p_section_id text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_power_up_id TEXT;
  v_power_up_name TEXT;
  v_new_qty INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Section → power-up mapping (5 of each type across 20 sections)
  CASE p_section_id
    WHEN 'basics'        THEN v_power_up_id := 'reveal';        v_power_up_name := 'Reveal';
    WHEN 'politics'      THEN v_power_up_id := 'multiplier_2x'; v_power_up_name := '2x Multiplier';
    WHEN 'sports'        THEN v_power_up_id := 'silence';       v_power_up_name := 'Silence';
    WHEN 'entertainment' THEN v_power_up_id := 'shield';        v_power_up_name := 'Shield';
    WHEN 'debate_style'  THEN v_power_up_id := 'silence';       v_power_up_name := 'Silence';
    WHEN 'opinions'      THEN v_power_up_id := 'reveal';        v_power_up_name := 'Reveal';
    WHEN 'values'        THEN v_power_up_id := 'multiplier_2x'; v_power_up_name := '2x Multiplier';
    WHEN 'media'         THEN v_power_up_id := 'silence';       v_power_up_name := 'Silence';
    WHEN 'lifestyle'     THEN v_power_up_id := 'shield';        v_power_up_name := 'Shield';
    WHEN 'competition'   THEN v_power_up_id := 'shield';        v_power_up_name := 'Shield';
    WHEN 'social'        THEN v_power_up_id := 'reveal';        v_power_up_name := 'Reveal';
    WHEN 'identity'      THEN v_power_up_id := 'multiplier_2x'; v_power_up_name := '2x Multiplier';
    WHEN 'money'         THEN v_power_up_id := 'silence';       v_power_up_name := 'Silence';
    WHEN 'health'        THEN v_power_up_id := 'shield';        v_power_up_name := 'Shield';
    WHEN 'technology'    THEN v_power_up_id := 'reveal';        v_power_up_name := 'Reveal';
    WHEN 'food'          THEN v_power_up_id := 'reveal';        v_power_up_name := 'Reveal';
    WHEN 'shopping'      THEN v_power_up_id := 'multiplier_2x'; v_power_up_name := '2x Multiplier';
    WHEN 'trust'         THEN v_power_up_id := 'silence';       v_power_up_name := 'Silence';
    WHEN 'wheels'        THEN v_power_up_id := 'shield';        v_power_up_name := 'Shield';
    WHEN 'persuasion'    THEN v_power_up_id := 'multiplier_2x'; v_power_up_name := '2x Multiplier';
    ELSE
      RETURN json_build_object('success', false, 'error', 'Unknown section');
  END CASE;

  -- Duplicate check
  IF EXISTS (
    SELECT 1 FROM profile_depth_rewards
    WHERE user_id = v_uid AND section_id = p_section_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already claimed');
  END IF;

  -- Record claim
  INSERT INTO profile_depth_rewards (user_id, section_id, power_up_id)
  VALUES (v_uid, p_section_id, v_power_up_id);

  -- Grant power-up (upsert into inventory)
  INSERT INTO user_power_ups (user_id, power_up_id, quantity)
  VALUES (v_uid, v_power_up_id, 1)
  ON CONFLICT (user_id, power_up_id)
  DO UPDATE SET quantity = user_power_ups.quantity + 1
  RETURNING quantity INTO v_new_qty;

  RETURN json_build_object(
    'success', true,
    'power_up_id', v_power_up_id,
    'power_up_name', v_power_up_name,
    'new_quantity', v_new_qty
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_notifications()
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_deleted INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.notifications
  WHERE user_id = v_user_id
    AND created_at < now() - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'deleted', v_deleted
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_ai_debate(p_category text DEFAULT NULL::text, p_topic text DEFAULT 'Open Debate'::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.create_challenge(p_hot_take_id uuid, p_counter_argument text, p_topic text DEFAULT ''::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_take RECORD;
  v_clean_arg TEXT;
  v_clean_topic TEXT;
  v_debate_id UUID;
  v_allowed BOOLEAN;
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate counter-argument
  IF p_counter_argument IS NULL OR char_length(trim(p_counter_argument)) = 0 THEN
    RAISE EXCEPTION 'Counter-argument cannot be empty';
  END IF;

  -- Sanitize inputs
  v_clean_arg := sanitize_text(p_counter_argument);
  v_clean_topic := CASE
    WHEN p_topic IS NOT NULL AND char_length(trim(p_topic)) > 0
    THEN sanitize_text(p_topic)
    ELSE 'Challenge'
  END;

  -- Post-sanitization length check
  IF char_length(v_clean_arg) < 5 THEN
    RAISE EXCEPTION 'Counter-argument must be at least 5 characters';
  END IF;
  IF char_length(v_clean_arg) > 500 THEN
    RAISE EXCEPTION 'Counter-argument must be under 500 characters';
  END IF;

  -- Verify the hot take exists and get the defender (original poster)
  SELECT id, user_id, content, section
  INTO v_take
  FROM public.hot_takes
  WHERE id = p_hot_take_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hot take not found';
  END IF;

  -- Can't challenge your own take
  IF v_take.user_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot challenge your own hot take';
  END IF;

  -- Rate limit: 5 challenges per hour
  v_allowed := check_rate_limit(v_user_id, 'challenge', 60, 5);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit: max 5 challenges per hour';
  END IF;

  -- Create the async debate
  INSERT INTO public.async_debates (
    hot_take_id,
    topic,
    category,
    challenger_id,
    defender_id,
    status,
    rounds
  ) VALUES (
    p_hot_take_id,
    v_clean_topic,
    COALESCE(v_take.section, 'general'),
    v_user_id,
    v_take.user_id,
    'open',
    jsonb_build_array(
      jsonb_build_object(
        'round', 1,
        'user_id', v_user_id,
        'content', v_clean_arg,
        'created_at', now()
      )
    )
  )
  RETURNING id INTO v_debate_id;

  -- Increment denormalized challenge_count on the hot take
  UPDATE public.hot_takes
  SET challenge_count = challenge_count + 1
  WHERE id = p_hot_take_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'challenge_created',
    p_user_id    := v_user_id,
    p_debate_id  := v_debate_id,
    p_category   := COALESCE(v_take.section, 'general'),
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'hot_take_id', p_hot_take_id,
      'defender_id', v_take.user_id,
      'arg_length', char_length(v_clean_arg)
    )
  );

  RETURN json_build_object(
    'success', true,
    'debate_id', v_debate_id,
    'status', 'open'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_debate(p_topic text, p_category text DEFAULT 'general'::text, p_format text DEFAULT 'standard'::text, p_opponent_id uuid DEFAULT NULL::uuid, p_side text DEFAULT 'a'::text)
 RETURNS uuid
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.create_group(p_name text, p_description text DEFAULT NULL::text, p_category text DEFAULT 'general'::text, p_is_public boolean DEFAULT true, p_avatar_emoji text DEFAULT '⚔️'::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id  uuid := auth.uid();
  v_slug     text;
  v_group_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_name IS NULL OR char_length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'Group name must be at least 2 characters';
  END IF;

  v_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || substring(gen_random_uuid()::text, 1, 6);

  IF p_category NOT IN ('general','politics','sports','entertainment','music','couples_court') THEN
    p_category := 'general';
  END IF;

  INSERT INTO public.groups (name, slug, description, category, owner_id, is_public, avatar_emoji)
  VALUES (trim(p_name), v_slug, trim(p_description), p_category, v_user_id, p_is_public, p_avatar_emoji)
  RETURNING id INTO v_group_id;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'leader');

  PERFORM log_event(
    p_event_type := 'group_created',
    p_metadata   := jsonb_build_object(
      'group_id',  v_group_id,
      'category',  p_category,
      'is_public', p_is_public
    )
  );

  RETURN json_build_object('success', true, 'group_id', v_group_id, 'slug', v_slug);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_group_challenge(p_challenger_group_id uuid, p_defender_group_id uuid, p_topic text, p_category text DEFAULT 'miscellaneous'::text, p_format text DEFAULT '1v1'::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_is_member BOOLEAN;
  v_pending_count INT;
  v_challenge_id UUID;
BEGIN
  -- Auth check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Can't challenge your own group
  IF p_challenger_group_id = p_defender_group_id THEN
    RETURN json_build_object('error', 'Cannot challenge your own group');
  END IF;

  -- Validate topic length
  IF length(trim(p_topic)) < 5 OR length(trim(p_topic)) > 200 THEN
    RETURN json_build_object('error', 'Topic must be 5-200 characters');
  END IF;

  -- Validate format
  IF p_format NOT IN ('1v1', '3v3', '5v5') THEN
    RETURN json_build_object('error', 'Invalid format');
  END IF;

  -- Must be member of challenger group
  SELECT EXISTS(
    SELECT 1 FROM group_members
    WHERE group_id = p_challenger_group_id AND user_id = v_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN json_build_object('error', 'You must be a member of the challenging group');
  END IF;

  -- Verify defender group exists
  IF NOT EXISTS(SELECT 1 FROM groups WHERE id = p_defender_group_id) THEN
    RETURN json_build_object('error', 'Opponent group not found');
  END IF;

  -- Rate limit: max 3 pending challenges per challenger group
  SELECT COUNT(*) INTO v_pending_count
  FROM group_challenges
  WHERE challenger_group_id = p_challenger_group_id
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_pending_count >= 3 THEN
    RETURN json_build_object('error', 'Your group already has 3 pending challenges');
  END IF;

  -- Check for duplicate active challenge between these two groups
  IF EXISTS(
    SELECT 1 FROM group_challenges
    WHERE status IN ('pending', 'accepted', 'live')
      AND (
        (challenger_group_id = p_challenger_group_id AND defender_group_id = p_defender_group_id)
        OR
        (challenger_group_id = p_defender_group_id AND defender_group_id = p_challenger_group_id)
      )
  ) THEN
    RETURN json_build_object('error', 'An active challenge already exists between these groups');
  END IF;

  -- Create challenge
  INSERT INTO group_challenges (
    challenger_group_id, defender_group_id, created_by,
    topic, category, format
  ) VALUES (
    p_challenger_group_id, p_defender_group_id, v_user_id,
    trim(p_topic), p_category, p_format
  ) RETURNING id INTO v_challenge_id;

  RETURN json_build_object('challenge_id', v_challenge_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_hot_take(p_content text, p_section text DEFAULT 'trending'::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_take_id UUID;
  v_allowed BOOLEAN;
  v_clean_content TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE LOG 'SECURITY|auth_failure|anonymous|create_hot_take|unauthenticated call';
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Sanitize
  v_clean_content := sanitize_text(p_content);

  IF v_clean_content IS NULL OR char_length(trim(v_clean_content)) = 0 THEN
    RAISE EXCEPTION 'Content cannot be empty';
  END IF;
  IF char_length(v_clean_content) > 280 THEN
    RAISE LOG 'SECURITY|input_violation|%|create_hot_take|oversized content len=%', v_user_id, char_length(v_clean_content);
    RAISE EXCEPTION 'Content exceeds 280 characters';
  END IF;

  IF p_section NOT IN ('trending','politics','sports','entertainment','music','couples_court') THEN
    p_section := 'trending';
  END IF;

  -- Rate limit: 10 per hour
  v_allowed := check_rate_limit(v_user_id, 'hot_take', 60, 10);
  IF NOT v_allowed THEN
    RAISE LOG 'SECURITY|rate_limit_blocked|%|create_hot_take|hot_take limit exceeded', v_user_id;
    RAISE EXCEPTION 'Rate limit: max 10 hot takes per hour';
  END IF;

  INSERT INTO public.hot_takes (user_id, content, section)
  VALUES (v_user_id, trim(v_clean_content), p_section)
  RETURNING id INTO v_take_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'hot_take_posted',
    p_user_id    := v_user_id,
    p_debate_id  := NULL,
    p_category   := p_section,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'section', p_section,
      'word_count', array_length(string_to_array(trim(v_clean_content), ' '), 1),
      'has_link', (trim(v_clean_content) ~* 'https?://')
    )
  );

  RETURN json_build_object(
    'success', true,
    'id', v_take_id,
    'section', p_section
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_mod_debate(p_mode text DEFAULT 'text'::text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_ruleset text DEFAULT 'amplified'::text, p_total_rounds integer DEFAULT 4)
 RETURNS TABLE(debate_id uuid, join_code text)
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid        UUID := auth.uid();
  v_profile    RECORD;
  v_debate_id  UUID;
  v_join_code  TEXT;
  v_attempts   INT := 0;
  v_total_rounds INT;
BEGIN
  -- Guard: must be authenticated
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Guard: must be a moderator
  SELECT p.is_moderator INTO v_profile
  FROM profiles p WHERE p.id = v_uid;

  IF NOT FOUND OR v_profile.is_moderator IS NOT TRUE THEN
    RAISE EXCEPTION 'Not a moderator';
  END IF;

  -- Guard: valid ruleset
  IF p_ruleset NOT IN ('amplified', 'unplugged') THEN
    p_ruleset := 'amplified';
  END IF;

  -- Guard: valid mode
  IF p_mode NOT IN ('text', 'live', 'voicememo') THEN
    p_mode := 'text';
  END IF;

  -- Sanitize total_rounds
  v_total_rounds := CASE WHEN p_total_rounds IN (4, 6, 8, 10) THEN p_total_rounds ELSE 4 END;

  -- Generate unique 6-char join code (retry on collision)
  LOOP
    v_join_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM arena_debates ad
      WHERE ad.join_code = v_join_code
        AND ad.status IN ('lobby', 'matched', 'live')
    );
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique join code';
    END IF;
  END LOOP;

  -- Insert debate row
  INSERT INTO arena_debates (
    debater_a,
    debater_b,
    moderator_id,
    mode,
    topic,
    category,
    ranked,
    ruleset,
    status,
    mod_status,
    visibility,
    join_code,
    total_rounds
  ) VALUES (
    NULL,
    NULL,
    v_uid,
    p_mode,
    p_topic,
    p_category,
    p_ranked,
    p_ruleset,
    'lobby',
    'claimed',
    'code',
    v_join_code,
    v_total_rounds
  )
  RETURNING id INTO v_debate_id;

  -- Return
  debate_id := v_debate_id;
  join_code := v_join_code;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_mod_debate(p_mode text DEFAULT 'text'::text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_ruleset text DEFAULT 'amplified'::text)
 RETURNS TABLE(debate_id uuid, join_code text)
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid        UUID := auth.uid();
  v_profile    RECORD;
  v_debate_id  UUID;
  v_join_code  TEXT;
  v_attempts   INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.is_moderator INTO v_profile
  FROM profiles p WHERE p.id = v_uid;

  IF NOT FOUND OR v_profile.is_moderator IS NOT TRUE THEN
    RAISE EXCEPTION 'Not a moderator';
  END IF;

  IF p_ruleset NOT IN ('amplified', 'unplugged') THEN
    p_ruleset := 'amplified';
  END IF;

  IF p_mode NOT IN ('text', 'live', 'voicememo') THEN
    p_mode := 'text';
  END IF;

  LOOP
    v_join_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM arena_debates ad
      WHERE ad.join_code = v_join_code
        AND ad.status IN ('lobby', 'matched', 'live')
    );
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique join code';
    END IF;
  END LOOP;

  INSERT INTO arena_debates (
    debater_a, debater_b, moderator_id, mode, topic, category,
    ranked, ruleset, status, mod_status, visibility, join_code, total_rounds
  ) VALUES (
    NULL, NULL, v_uid, p_mode, p_topic, p_category,
    p_ranked, p_ruleset, 'lobby', 'claimed', 'code', v_join_code, 3
  )
  RETURNING id INTO v_debate_id;

  debate_id := v_debate_id;
  join_code := v_join_code;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_mod_debate(p_mode text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false)
 RETURNS TABLE(debate_id uuid, join_code text)
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id  UUID := auth.uid();
  v_is_mod   BOOLEAN;
  v_code     TEXT;
  v_debate_id UUID;
  v_attempts INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT is_moderator INTO v_is_mod FROM profiles WHERE id = v_user_id;
  IF NOT COALESCE(v_is_mod, FALSE) THEN
    RAISE EXCEPTION 'Not a moderator';
  END IF;

  -- Generate unique 6-char alphanumeric join code
  LOOP
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM arena_debates
      WHERE arena_debates.join_code = v_code
        AND status NOT IN ('complete', 'cancelled')
    );
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique join code';
    END IF;
  END LOOP;

  INSERT INTO arena_debates (
    debater_a,
    debater_b,
    mode,
    category,
    topic,
    status,
    total_rounds,
    ranked,
    moderator_id,
    mod_status,
    visibility,
    join_code
  ) VALUES (
    NULL,                 -- debater slots empty until players join
    NULL,
    p_mode,
    p_category,
    COALESCE(p_topic, 'Open Debate'),
    'lobby',
    3,
    COALESCE(p_ranked, FALSE),
    v_user_id,            -- mod is set from creation
    'claimed',
    'mod_created',
    v_code
  )
  RETURNING id INTO v_debate_id;

  RETURN QUERY SELECT v_debate_id, v_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_prediction_question(p_topic text, p_side_a_label text DEFAULT 'Yes'::text, p_side_b_label text DEFAULT 'No'::text, p_category text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_clean_topic TEXT;
  v_clean_a TEXT;
  v_clean_b TEXT;
  v_clean_cat TEXT;
  v_allowed BOOLEAN;
  v_question_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Rate limit: 10 prediction questions per hour
  v_allowed := check_rate_limit(v_user_id, 'prediction_create', 60, 10);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit: too many prediction questions';
  END IF;

  -- Sanitize inputs
  v_clean_topic := sanitize_text(p_topic);
  v_clean_a := sanitize_text(p_side_a_label);
  v_clean_b := sanitize_text(p_side_b_label);
  v_clean_cat := sanitize_text(p_category);

  -- Validate lengths
  IF v_clean_topic IS NULL OR char_length(v_clean_topic) < 10 THEN
    RAISE EXCEPTION 'Topic must be at least 10 characters';
  END IF;
  IF char_length(v_clean_topic) > 200 THEN
    RAISE EXCEPTION 'Topic max 200 characters';
  END IF;
  IF v_clean_a IS NULL OR char_length(v_clean_a) < 1 OR char_length(v_clean_a) > 50 THEN
    RAISE EXCEPTION 'Side A label: 1-50 characters';
  END IF;
  IF v_clean_b IS NULL OR char_length(v_clean_b) < 1 OR char_length(v_clean_b) > 50 THEN
    RAISE EXCEPTION 'Side B label: 1-50 characters';
  END IF;

  INSERT INTO public.prediction_questions (creator_id, topic, side_a_label, side_b_label, category)
  VALUES (v_user_id, v_clean_topic, v_clean_a, v_clean_b, v_clean_cat)
  RETURNING id INTO v_question_id;

  RETURN json_build_object('success', true, 'question_id', v_question_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_private_lobby(p_mode text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_visibility text DEFAULT 'private'::text, p_invited_user_id uuid DEFAULT NULL::uuid, p_group_id uuid DEFAULT NULL::uuid, p_ruleset text DEFAULT 'amplified'::text, p_total_rounds integer DEFAULT 4)
 RETURNS TABLE(debate_id uuid, join_code text)
 LANGUAGE plpgsql
SECURITY DEFINER
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
      v_candidate := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 6));
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

CREATE OR REPLACE FUNCTION public.create_private_lobby(p_mode text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_visibility text DEFAULT 'private'::text, p_invited_user_id uuid DEFAULT NULL::uuid, p_group_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(debate_id uuid, join_code text)
 LANGUAGE plpgsql
SECURITY DEFINER
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
      v_candidate := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 6));
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
      v_candidate := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 6));
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

CREATE OR REPLACE FUNCTION public.create_voice_take(p_section text DEFAULT 'trending'::text, p_voice_memo_url text DEFAULT NULL::text, p_voice_memo_path text DEFAULT NULL::text, p_voice_memo_duration integer DEFAULT NULL::integer, p_parent_id uuid DEFAULT NULL::uuid, p_content text DEFAULT '🎤 Voice Take'::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_take_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_voice_memo_url IS NULL THEN
    RAISE EXCEPTION 'Voice memo URL is required';
  END IF;

  IF p_section NOT IN ('trending','politics','sports','entertainment','music','couples_court') THEN
    p_section := 'trending';
  END IF;

  INSERT INTO public.hot_takes (
    user_id, content, section,
    voice_memo_url, voice_memo_path, voice_memo_duration, parent_id
  )
  VALUES (
    v_user_id, COALESCE(p_content, '🎤 Voice Take'), p_section,
    p_voice_memo_url, p_voice_memo_path, p_voice_memo_duration, p_parent_id
  )
  RETURNING id INTO v_take_id;

  RETURN json_build_object(
    'success', true,
    'id', v_take_id,
    'section', p_section
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.credit_tokens(p_user_id uuid, p_amount integer, p_reason text DEFAULT 'purchase'::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_new_balance INTEGER;
  v_caller TEXT;
BEGIN
  -- Only service_role (webhook) can call this
  v_caller := current_setting('request.jwt.claim.role', true);
  IF v_caller IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'credit_tokens: service_role only';
  END IF;

  -- FIX: reject non-positive amounts
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'credit_tokens: amount must be positive';
  END IF;

  UPDATE public.profiles
  SET token_balance = token_balance + p_amount,
      updated_at = now()
  WHERE id = p_user_id
  RETURNING token_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  INSERT INTO public.token_transactions (user_id, amount, type, source, balance_after)
  VALUES (p_user_id, p_amount, 'purchase', p_reason, v_new_balance);

  RETURN json_build_object(
    'success', true,
    'credited', p_amount,
    'new_balance', v_new_balance
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.debit_tokens(p_user_id uuid, p_amount integer, p_reason text DEFAULT 'spend'::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_role TEXT;
  v_new_balance INTEGER;
BEGIN
  -- FIX: auth check — must be self or service_role
  v_caller_role := current_setting('request.jwt.claim.role', true);
  IF v_caller_id IS NULL AND v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_caller_id IS DISTINCT FROM p_user_id AND v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Cannot debit another user';
  END IF;

  -- FIX: reject non-positive amounts
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'debit_tokens: amount must be positive';
  END IF;

  -- Debit atomically (WHERE clause prevents negative balance)
  UPDATE public.profiles
  SET token_balance = token_balance - p_amount,
      updated_at = now()
  WHERE id = p_user_id AND token_balance >= p_amount
  RETURNING token_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient tokens or user not found');
  END IF;

  -- Log transaction
  INSERT INTO public.token_transactions (user_id, amount, type, source, balance_after)
  VALUES (p_user_id, -p_amount, 'spend', p_reason, v_new_balance);

  RETURN json_build_object(
    'success', true,
    'debited', p_amount,
    'new_balance', v_new_balance
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.declare_rival(p_target_id uuid, p_message text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing RECORD;
  v_result RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  IF v_user_id = p_target_id THEN
    RETURN json_build_object('error', 'Cannot rival yourself');
  END IF;

  -- Check if rivalry already exists in either direction
  SELECT * INTO v_existing FROM rivals
    WHERE (challenger_id = v_user_id AND target_id = p_target_id)
       OR (challenger_id = p_target_id AND target_id = v_user_id)
    LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('error', 'Rivalry already exists', 'status', v_existing.status);
  END IF;

  -- Check max 5 active rivalries
  IF (SELECT count(*) FROM rivals WHERE (challenger_id = v_user_id OR target_id = v_user_id) AND status IN ('pending', 'accepted')) >= 5 THEN
    RETURN json_build_object('error', 'Max 5 active rivalries');
  END IF;

  INSERT INTO rivals (challenger_id, target_id, challenger_message)
  VALUES (v_user_id, p_target_id, p_message)
  RETURNING * INTO v_result;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'rival_declared',
    p_user_id    := v_user_id,
    p_debate_id  := NULL,
    p_category   := NULL,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('target_user_id', p_target_id)
  );

  RETURN json_build_object('success', true, 'id', v_result.id, 'status', v_result.status);
END;
$function$;

CREATE OR REPLACE FUNCTION public.discover_groups(p_limit integer DEFAULT 20, p_category text DEFAULT NULL::text, p_search text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT
      g.id,
      g.name,
      g.slug,
      g.description,
      g.category,
      g.member_count,
      g.elo_rating,
      g.avatar_emoji,
      g.created_at
    FROM public.groups g
    WHERE g.is_public = true
      AND (p_category IS NULL OR g.category = p_category)
      AND (p_search IS NULL OR g.name ILIKE '%' || p_search || '%' OR g.description ILIKE '%' || p_search || '%')
    ORDER BY g.member_count DESC, g.elo_rating DESC
    LIMIT p_limit
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.earn_tokens(p_reason text, p_reference_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_amount INTEGER;
  v_daily_earned INTEGER;
  v_daily_cap INTEGER := 100;
  v_new_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only allowed reasons with fixed amounts
  v_amount := CASE p_reason
    WHEN 'debate_win' THEN 5
    WHEN 'debate_complete' THEN 2
    WHEN 'first_debate' THEN 10
    WHEN 'streak_3' THEN 5
    WHEN 'streak_5' THEN 10
    WHEN 'streak_10' THEN 25
    WHEN 'referral' THEN 10
    WHEN 'mod_work' THEN 2
    WHEN 'profile_section' THEN 3
    ELSE NULL
  END;

  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'Invalid earn reason: %', p_reason;
  END IF;

  -- FIX: duplicate reference_id check — prevent repeated claims for same event
  IF p_reference_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.token_transactions
      WHERE user_id = v_user_id AND source = p_reason AND reference_id = p_reference_id
    ) THEN
      RETURN json_build_object('success', false, 'error', 'Already claimed for this event');
    END IF;
  END IF;

  -- FIX: lock profile row for atomic daily cap check
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- Check daily cap
  SELECT COALESCE(SUM(amount), 0) INTO v_daily_earned
  FROM public.token_transactions
  WHERE user_id = v_user_id
    AND amount > 0
    AND type NOT IN ('purchase', 'daily_claim')
    AND created_at > CURRENT_DATE::TIMESTAMPTZ;

  IF v_daily_earned + v_amount > v_daily_cap THEN
    RETURN json_build_object('success', false, 'error', 'Daily earn cap reached');
  END IF;

  -- Credit
  UPDATE public.profiles
  SET token_balance = token_balance + v_amount,
      updated_at = now()
  WHERE id = v_user_id
  RETURNING token_balance INTO v_new_balance;

  -- Log
  INSERT INTO public.token_transactions (user_id, amount, type, source, balance_after, reference_id)
  VALUES (v_user_id, v_amount, 'earn', p_reason, v_new_balance, p_reference_id);

  RETURN json_build_object(
    'success', true,
    'amount', v_amount,
    'reason', p_reason,
    'new_balance', v_new_balance
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.edit_reference(p_reference_id uuid, p_claim text DEFAULT NULL::text, p_url text DEFAULT NULL::text, p_author text DEFAULT NULL::text, p_publication_year integer DEFAULT NULL::integer, p_source_type text DEFAULT NULL::text, p_category text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id   uuid;
  v_ref       record;
  v_domain    text;
  v_ceiling   integer;
  v_valid_sources text[] := ARRAY['peer-reviewed','data','expert','government','news','other'];
  v_valid_cats    text[] := ARRAY['politics','sports','tech','science','entertainment','business','health','general'];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_ref
    FROM public.arsenal_references
    WHERE id = p_reference_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;

  IF v_ref.user_id != v_user_id THEN
    RAISE EXCEPTION 'Not your reference';
  END IF;

  IF v_ref.verification_points > 0 THEN
    RAISE EXCEPTION 'Cannot edit a verified reference';
  END IF;

  IF p_source_type IS NOT NULL AND p_source_type != '' THEN
    IF NOT (p_source_type = ANY(v_valid_sources)) THEN
      RAISE EXCEPTION 'Invalid source type: %', p_source_type;
    END IF;
    v_ceiling := CASE p_source_type
      WHEN 'peer-reviewed' THEN 5
      WHEN 'data'          THEN 4
      WHEN 'expert'        THEN 4
      WHEN 'government'    THEN 3
      WHEN 'news'          THEN 1
      WHEN 'other'         THEN 1
    END;
  END IF;

  IF p_category IS NOT NULL AND p_category != '' THEN
    IF NOT (p_category = ANY(v_valid_cats)) THEN
      RAISE EXCEPTION 'Invalid category: %', p_category;
    END IF;
  END IF;

  IF p_url IS NOT NULL AND p_url != '' THEN
    IF NOT (p_url ~* '^https?://') THEN
      RAISE EXCEPTION 'URL must start with http:// or https://';
    END IF;
    p_url := sanitize_url(p_url);
    v_domain := regexp_replace(
      regexp_replace(p_url, '^https?://(www\.)?', ''),
      '/.*$', ''
    );
  END IF;

  IF p_claim IS NOT NULL AND p_claim != '' THEN
    IF length(trim(p_claim)) < 5 THEN
      RAISE EXCEPTION 'Claim must be at least 5 characters';
    END IF;
    IF length(trim(p_claim)) > 120 THEN
      RAISE EXCEPTION 'Claim must be 120 characters or fewer';
    END IF;
    p_claim := sanitize_text(p_claim);
  END IF;

  IF p_author IS NOT NULL AND p_author != '' THEN
    IF length(trim(p_author)) < 2 THEN
      RAISE EXCEPTION 'Author must be at least 2 characters';
    END IF;
    p_author := sanitize_text(p_author);
  END IF;

  UPDATE public.arsenal_references SET
    claim            = COALESCE(NULLIF(p_claim, ''),            claim),
    url              = COALESCE(NULLIF(p_url, ''),              url),
    domain           = COALESCE(v_domain,                       domain),
    author           = COALESCE(NULLIF(p_author, ''),           author),
    publication_year = COALESCE(p_publication_year,              publication_year),
    source_type      = COALESCE(NULLIF(p_source_type, ''),      source_type),
    power_ceiling    = COALESCE(v_ceiling,                      power_ceiling),
    category         = COALESCE(NULLIF(p_category, ''),         category)
  WHERE id = p_reference_id;

  -- FIXED: named parameters to resolve type ambiguity
  PERFORM log_event(p_event_type := 'reference_edited', p_metadata := jsonb_build_object('reference_id', p_reference_id));

  RETURN jsonb_build_object('success', true, 'reference_id', p_reference_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.equip_cosmetic(p_cosmetic_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_item    cosmetic_items%ROWTYPE;
  v_owned   UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_item FROM cosmetic_items WHERE id = p_cosmetic_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'item_not_found');
  END IF;

  IF v_item.category = 'badge' THEN
    RETURN jsonb_build_object('success', false, 'error', 'badges_not_equippable');
  END IF;

  IF v_item.unlock_type = 'free' THEN
    INSERT INTO user_cosmetics (user_id, cosmetic_id, acquired_via)
    VALUES (v_user_id, p_cosmetic_id, 'auto_unlock')
    ON CONFLICT (user_id, cosmetic_id) DO NOTHING;
  ELSE
    SELECT id INTO v_owned
      FROM user_cosmetics
     WHERE user_id = v_user_id AND cosmetic_id = p_cosmetic_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'not_owned');
    END IF;
  END IF;

  -- Unequip everything else in this category
  UPDATE user_cosmetics
     SET equipped = false
   WHERE user_id = v_user_id
     AND equipped = true
     AND cosmetic_id IN (
       SELECT id FROM cosmetic_items WHERE category = v_item.category
     );

  -- Equip this item
  UPDATE user_cosmetics
     SET equipped = true
   WHERE user_id = v_user_id AND cosmetic_id = p_cosmetic_id;

  RETURN jsonb_build_object(
    'success',   true,
    'item_name', v_item.name,
    'category',  v_item.category
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.equip_power_up(p_debate_id uuid, p_power_up_id text, p_slot_number integer)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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
AS $function$
BEGIN
  UPDATE debate_queue SET status = 'expired'
    WHERE status = 'waiting' AND joined_at < now() - interval '5 minutes';
END;
$function$;

CREATE OR REPLACE FUNCTION public.file_reference_challenge(p_debate_id uuid, p_reference_id uuid, p_round integer, p_side text)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.finalize_async_debate(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_caller_role TEXT;
  v_debate RECORD;
  v_profile_a RECORD;
  v_profile_b RECORD;
  v_votes_a INTEGER;
  v_votes_b INTEGER;
  v_winner TEXT;  -- 'a', 'b', 'draw'
  v_winner_id UUID;
  v_elo RECORD;
  v_xp_winner INTEGER := 25;
  v_xp_loser INTEGER := 10;
  v_xp_draw INTEGER := 15;
BEGIN
  -- FIX: auth check
  v_caller_role := current_setting('request.jwt.claim.role', true);
  IF v_user_id IS NULL AND v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the debate row
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- FIX: authorization — must be a participant or service_role
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

  -- Resolve predictions (correct = boolean, tokens_wagered = amount)
  -- predicted_winner is TEXT ('a' or 'b'), v_winner is TEXT ('a', 'b', 'draw')
  UPDATE public.predictions SET
    correct = CASE
      WHEN predicted_winner = v_winner THEN true
      ELSE false
    END,
    payout = CASE
      WHEN predicted_winner = v_winner THEN ROUND(tokens_wagered * 1.8)
      WHEN v_winner = 'draw' THEN tokens_wagered  -- refund on draw
      ELSE 0
    END
  WHERE debate_id = p_debate_id AND correct IS NULL;

  -- Pay out winners + refund draws (anyone with payout > 0)
  UPDATE public.profiles p SET
    token_balance = token_balance + pred.payout
  FROM public.predictions pred
  WHERE pred.debate_id = p_debate_id
    AND pred.user_id = p.id
    AND pred.payout > 0;

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

CREATE OR REPLACE FUNCTION public.follow_user(p_target_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_target_user_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  -- Verify target exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.follows (follower_id, following_id)
  VALUES (v_user_id, p_target_user_id)
  ON CONFLICT DO NOTHING;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'follow',
    p_user_id    := v_user_id,
    p_debate_id  := NULL,
    p_category   := NULL,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('target_user_id', p_target_user_id)
  );

  RETURN json_build_object('success', true, 'following', p_target_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.forge_reference(p_claim text, p_url text, p_author text, p_publication_year integer, p_source_type text, p_category text)
 RETURNS uuid
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id  uuid;
  v_domain   text;
  v_ceiling  integer;
  v_ref_id   uuid;
BEGIN
  -- Auth check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate source_type
  IF p_source_type NOT IN ('peer-reviewed','data','expert','government','news','other') THEN
    RAISE EXCEPTION 'Invalid source_type: %', p_source_type;
  END IF;

  -- Validate category
  IF p_category NOT IN ('politics','sports','tech','science','entertainment','business','health','general') THEN
    RAISE EXCEPTION 'Invalid category: %', p_category;
  END IF;

  -- Validate URL format
  IF p_url !~ '^https?://' THEN
    RAISE EXCEPTION 'URL must start with http:// or https://';
  END IF;

  -- Extract domain from URL
  v_domain := regexp_replace(
    regexp_replace(p_url, '^https?://(www\.)?', ''),
    '/.*$', ''
  );

  -- Get ceiling from source type
  v_ceiling := _source_type_ceiling(p_source_type);

  -- Insert
  INSERT INTO public.arsenal_references (
    user_id, claim, url, domain, author, publication_year,
    source_type, power_ceiling, category
  ) VALUES (
    v_user_id,
    trim(p_claim),
    trim(p_url),
    v_domain,
    trim(p_author),
    p_publication_year,
    p_source_type,
    v_ceiling,
    p_category
  )
  RETURNING id INTO v_ref_id;

  -- Log event
  PERFORM public.log_event(
    p_event_type := 'reference_forged',
    p_user_id    := v_user_id,
    p_metadata   := jsonb_build_object(
      'reference_id', v_ref_id,
      'source_type', p_source_type,
      'category', p_category,
      'power_ceiling', v_ceiling
    )
  );

  RETURN v_ref_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_app_config()
 RETURNS jsonb
 LANGUAGE sql
STABLE
SECURITY DEFINER
AS $function$
  SELECT jsonb_object_agg(key, value) FROM app_config;
$function$;

CREATE OR REPLACE FUNCTION public.get_arena_debate_spectator(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_arena_feed(p_limit integer DEFAULT 20)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_arena_feed(p_limit integer DEFAULT 20, p_category text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_available_moderators(p_exclude_ids uuid[] DEFAULT ARRAY[]::uuid[])
 RETURNS TABLE(id uuid, display_name text, username text, mod_rating numeric, mod_debates_total integer, mod_approval_pct numeric, avatar_url text)
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.username,
    p.mod_rating,
    p.mod_debates_total,
    p.mod_approval_pct,
    p.avatar_url
  FROM public.profiles p
  WHERE p.is_moderator = true
    AND p.mod_available = true
    AND p.deleted_at IS NULL
    AND p.id != ALL(p_exclude_ids)
  ORDER BY p.mod_rating DESC, p.mod_debates_total DESC
  LIMIT 20;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_category_counts()
 RETURNS TABLE(section text, live_debates bigint, hot_takes bigint)
 LANGUAGE sql
STABLE
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_cosmetic_catalog()
 RETURNS TABLE(cosmetic_id uuid, name text, category text, tier integer, unlock_type text, token_cost integer, depth_threshold numeric, unlock_condition text, asset_url text, sort_order integer, owned boolean, equipped boolean, acquired_via text, metadata jsonb)
 LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT
    ci.id,
    ci.name,
    ci.category,
    ci.tier,
    ci.unlock_type,
    ci.token_cost,
    ci.depth_threshold,
    ci.unlock_condition,
    ci.asset_url,
    ci.sort_order,
    (uc.user_id IS NOT NULL)     AS owned,
    COALESCE(uc.equipped, false) AS equipped,
    uc.acquired_via,
    uc.metadata
  FROM cosmetic_items ci
  LEFT JOIN user_cosmetics uc
    ON uc.cosmetic_id = ci.id
   AND uc.user_id = auth.uid()
  ORDER BY ci.category, ci.sort_order;
$function$;

CREATE OR REPLACE FUNCTION public.get_debate_messages(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_debate_predictions(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $function$
DECLARE
  v_total INT;
  v_side_a INT;
  v_side_b INT;
  v_user_pick TEXT := NULL;
BEGIN
  SELECT count(*) INTO v_total FROM predictions WHERE debate_id = p_debate_id;
  SELECT count(*) INTO v_side_a FROM predictions WHERE debate_id = p_debate_id AND predicted_winner = 'a';
  v_side_b := v_total - v_side_a;

  IF auth.uid() IS NOT NULL THEN
    SELECT predicted_winner INTO v_user_pick FROM predictions
      WHERE debate_id = p_debate_id AND user_id = auth.uid();
  END IF;

  RETURN json_build_object(
    'total', v_total,
    'side_a', v_side_a,
    'side_b', v_side_b,
    'pct_a', CASE WHEN v_total > 0 THEN round((v_side_a::numeric / v_total) * 100) ELSE 50 END,
    'pct_b', CASE WHEN v_total > 0 THEN round((v_side_b::numeric / v_total) * 100) ELSE 50 END,
    'user_pick', v_user_pick
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_debate_references(p_debate_id uuid)
 RETURNS TABLE(id uuid, debate_id uuid, submitter_id uuid, round integer, url text, description text, supports_side text, ruling text, ruling_reason text, ruled_by uuid, created_at timestamp with time zone, ruled_at timestamp with time zone, submitter_name text)
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.debate_id,
    r.submitter_id,
    r.round,
    r.url,
    r.description,
    r.supports_side,
    r.ruling,
    r.ruling_reason,
    r.ruled_by,
    r.created_at,
    r.ruled_at,
    p.display_name AS submitter_name
  FROM public.debate_references r
  LEFT JOIN public.profiles p ON p.id = r.submitter_id
  WHERE r.debate_id = p_debate_id
  ORDER BY r.created_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_debate_replay_data(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_follow_counts(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $function$
BEGIN
  RETURN json_build_object(
    'followers', (SELECT count(*) FROM follows WHERE following_id = p_user_id),
    'following', (SELECT count(*) FROM follows WHERE follower_id = p_user_id)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_group_challenges(p_group_id uuid, p_status text DEFAULT NULL::text, p_limit integer DEFAULT 20)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result JSON;
BEGIN
  -- Clamp limit
  IF p_limit > 50 THEN p_limit := 50; END IF;
  IF p_limit < 1 THEN p_limit := 1; END IF;

  SELECT json_agg(row_to_json(c)) INTO v_result
  FROM (
    SELECT
      gc.id,
      gc.challenger_group_id,
      gc.defender_group_id,
      gc.topic,
      gc.category,
      gc.format,
      gc.status,
      gc.winner_group_id,
      gc.created_at,
      gc.expires_at,
      gc.responded_at,
      gc.completed_at,
      -- Challenger group info
      cg.name AS challenger_name,
      cg.avatar_emoji AS challenger_emoji,
      COALESCE(cg.group_elo, 1200) AS challenger_elo,
      -- Defender group info
      dg.name AS defender_name,
      dg.avatar_emoji AS defender_emoji,
      COALESCE(dg.group_elo, 1200) AS defender_elo,
      -- Creator info
      p.username AS created_by_username
    FROM group_challenges gc
    JOIN groups cg ON cg.id = gc.challenger_group_id
    JOIN groups dg ON dg.id = gc.defender_group_id
    JOIN profiles p ON p.id = gc.created_by
    WHERE (gc.challenger_group_id = p_group_id OR gc.defender_group_id = p_group_id)
      AND (p_status IS NULL OR gc.status = p_status)
    ORDER BY
      CASE gc.status
        WHEN 'pending' THEN 1
        WHEN 'accepted' THEN 2
        WHEN 'live' THEN 3
        ELSE 4
      END,
      gc.created_at DESC
    LIMIT p_limit
  ) c;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_group_details(p_group_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_group public.groups;
  v_is_member BOOLEAN := false;
  v_my_role TEXT;
BEGIN
  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT role INTO v_my_role
    FROM public.group_members
    WHERE group_id = p_group_id AND user_id = v_user_id;
    v_is_member := v_my_role IS NOT NULL;
  END IF;

  -- Private groups: only members can see details
  IF v_group.is_public = false AND NOT v_is_member THEN
    RAISE EXCEPTION 'This group is private';
  END IF;

  RETURN json_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'slug', v_group.slug,
    'description', v_group.description,
    'category', v_group.category,
    'owner_id', v_group.owner_id,
    'member_count', v_group.member_count,
    'elo_rating', v_group.elo_rating,
    'is_public', v_group.is_public,
    'avatar_emoji', v_group.avatar_emoji,
    'created_at', v_group.created_at,
    'is_member', v_is_member,
    'my_role', v_my_role
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_group_leaderboard(p_limit integer DEFAULT 20, p_category text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT
      g.id,
      g.name,
      g.slug,
      g.description,
      g.category,
      g.member_count,
      g.elo_rating,
      g.avatar_emoji,
      p.username AS owner_username,
      ROW_NUMBER() OVER (ORDER BY g.elo_rating DESC) AS rank
    FROM public.groups g
    JOIN public.profiles_public p ON p.id = g.owner_id
    WHERE g.is_public = true
      AND (p_category IS NULL OR g.category = p_category)
    ORDER BY g.elo_rating DESC
    LIMIT p_limit
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_group_members(p_group_id uuid, p_limit integer DEFAULT 50)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_public BOOLEAN;
  v_is_member BOOLEAN := false;
  v_result JSON;
BEGIN
  -- Check if group exists and get privacy setting
  SELECT is_public INTO v_is_public FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  -- For private groups, verify caller is a member
  IF v_is_public = false THEN
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'This group is private';
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM public.group_members
      WHERE group_id = p_group_id AND user_id = v_user_id
    ) INTO v_is_member;

    IF NOT v_is_member THEN
      RAISE EXCEPTION 'This group is private';
    END IF;
  END IF;

  SELECT json_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT
      gm.user_id,
      gm.role,
      gm.joined_at,
      p.username,
      p.display_name,
      p.avatar_url,
      p.elo_rating,
      p.wins,
      p.losses,
      p.level
    FROM public.group_members gm
    JOIN public.profiles_public p ON p.id = gm.user_id
    WHERE gm.group_id = p_group_id
    ORDER BY
      CASE gm.role
        WHEN 'leader'    THEN 0
        WHEN 'co_leader' THEN 1
        WHEN 'elder'     THEN 2
        WHEN 'member'    THEN 3
        ELSE 4
      END,
      p.elo_rating DESC
    LIMIT p_limit
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_hot_predictions(p_limit integer DEFAULT 10)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_to_json(r))
    FROM (
      SELECT
        d.id as debate_id,
        d.topic,
        d.category,
        d.status,
        d.votes_a,
        d.votes_b,
        pa.display_name as debater_a_name,
        pa.elo_rating as elo_a,
        pb.display_name as debater_b_name,
        pb.elo_rating as elo_b,
        count(p.id)::int as prediction_count,
        sum(p.tokens_wagered)::int as total_wagered,
        count(*) FILTER (WHERE p.predicted_winner = 'a')::int as predictions_a,
        count(*) FILTER (WHERE p.predicted_winner = 'b')::int as predictions_b,
        d.started_at,
        d.created_at
      FROM debates d
        LEFT JOIN profiles pa ON pa.id = d.debater_a
        LEFT JOIN profiles pb ON pb.id = d.debater_b
        LEFT JOIN predictions p ON p.debate_id = d.id
      WHERE d.status IN ('waiting', 'matched', 'live', 'voting')
      GROUP BY d.id, d.topic, d.category, d.status, d.votes_a, d.votes_b,
               pa.display_name, pa.elo_rating, pb.display_name, pb.elo_rating,
               d.started_at, d.created_at
      ORDER BY count(p.id) DESC, d.created_at DESC
      LIMIT p_limit
    ) r
  ), '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_landing_vote_counts(p_topic_slug text)
 RETURNS TABLE(yes_count bigint, no_count bigint)
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE side = 'yes') AS yes_count,
    COUNT(*) FILTER (WHERE side = 'no') AS no_count
  FROM landing_votes
  WHERE topic_slug = p_topic_slug;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_landing_votes(p_topics text[])
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_object_agg(
    lvc.topic_slug,
    json_build_object('yes_votes', lvc.yes_votes, 'no_votes', lvc.no_votes)
  ) INTO result
  FROM landing_vote_counts lvc
  WHERE lvc.topic_slug = ANY(p_topics);

  RETURN COALESCE(result, '{}'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_sort_by text DEFAULT 'elo'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
              WHEN 'elo' THEN elo_rating
              WHEN 'wins' THEN wins
              WHEN 'streak' THEN current_streak
              ELSE elo_rating
            END DESC
        ) AS rank
      FROM public.profiles
      WHERE trust_score >= 50
        AND debates_completed > 0
      ORDER BY
        CASE p_sort_by
          WHEN 'elo' THEN elo_rating
          WHEN 'wins' THEN wins
          WHEN 'streak' THEN current_streak
          ELSE elo_rating
        END DESC
      LIMIT p_limit
      OFFSET p_offset
    ) r
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_live_debates(p_category text DEFAULT NULL::text, p_limit integer DEFAULT 10)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_mod_cooldown_minutes(p_offense_number integer)
 RETURNS integer
 LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE
    WHEN p_offense_number <= 1 THEN 10
    WHEN p_offense_number = 2 THEN 60
    ELSE 1440
  END;
$function$;

CREATE OR REPLACE FUNCTION public.get_mod_profile(p_moderator_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_mod RECORD;
BEGIN
  SELECT
    id,
    display_name,
    username,
    avatar_url,
    mod_rating,
    mod_approval_pct,
    mod_debates_total,
    mod_categories,
    mod_available,
    created_at
  INTO v_mod
  FROM public.profiles
  WHERE id = p_moderator_id
    AND is_moderator = true
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Moderator not found';
  END IF;

  RETURN json_build_object(
    'id',                v_mod.id,
    'display_name',      v_mod.display_name,
    'username',          v_mod.username,
    'avatar_url',        v_mod.avatar_url,
    'mod_rating',        v_mod.mod_rating,
    'mod_approval_pct',  v_mod.mod_approval_pct,
    'mod_debates_total', v_mod.mod_debates_total,
    'mod_categories',    v_mod.mod_categories,
    'mod_available',     v_mod.mod_available,
    'member_since',      v_mod.created_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_arsenal()
 RETURNS SETOF arsenal_references
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.arsenal_references
    WHERE user_id = v_user_id
    ORDER BY current_power DESC, created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_cosmetics()
 RETURNS TABLE(cosmetic_id uuid, name text, category text, tier integer, unlock_type text, token_cost integer, depth_threshold numeric, unlock_condition text, asset_url text, sort_order integer, acquired_via text, equipped boolean, metadata jsonb, acquired_at timestamp with time zone)
 LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT
    ci.id,
    ci.name,
    ci.category,
    ci.tier,
    ci.unlock_type,
    ci.token_cost,
    ci.depth_threshold,
    ci.unlock_condition,
    ci.asset_url,
    ci.sort_order,
    uc.acquired_via,
    uc.equipped,
    uc.metadata,
    uc.acquired_at
  FROM user_cosmetics uc
  JOIN cosmetic_items ci ON ci.id = uc.cosmetic_id
  WHERE uc.user_id = auth.uid()
  ORDER BY ci.category, ci.sort_order;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_debate_loadout(p_debate_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_my_groups()
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSON;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT
      g.id,
      g.name,
      g.slug,
      g.description,
      g.category,
      g.member_count,
      g.elo_rating,
      g.avatar_emoji,
      gm.role,
      gm.joined_at
    FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = v_user_id
    ORDER BY gm.joined_at DESC
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_milestones()
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_claimed TEXT[];
  v_freezes INT;
  v_streak INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get all claimed milestone keys (strip 'milestone:' prefix)
  SELECT ARRAY_AGG(REPLACE(earn_type, 'milestone:', '')) INTO v_claimed
  FROM token_earn_log
  WHERE user_id = v_user_id AND earn_type LIKE 'milestone:%';

  -- Get current freeze count and streak
  SELECT streak_freezes, login_streak INTO v_freezes, v_streak
  FROM profiles WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'claimed', COALESCE(v_claimed, ARRAY[]::TEXT[]),
    'streak_freezes', COALESCE(v_freezes, 0),
    'login_streak', COALESCE(v_streak, 0)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_power_ups(p_debate_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid UUID;
  v_inventory JSON;
  v_equipped JSON;
  v_questions INTEGER;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get questions for tier info
  SELECT questions_answered INTO v_questions FROM profiles WHERE id = v_uid;

  -- Get inventory with power-up details
  SELECT json_agg(row_to_json(r)) INTO v_inventory
  FROM (
    SELECT up.power_up_id, p.name, p.icon, p.description, p.cost, p.effect_type, up.quantity
    FROM user_power_ups up
    JOIN power_ups p ON p.id = up.power_up_id
    WHERE up.user_id = v_uid AND up.quantity > 0
    ORDER BY p.cost
  ) r;

  -- Get equipped for this debate (if provided)
  IF p_debate_id IS NOT NULL THEN
    SELECT json_agg(row_to_json(r)) INTO v_equipped
    FROM (
      SELECT dp.slot_number, dp.power_up_id, p.name, p.icon, dp.activated
      FROM debate_power_ups dp
      JOIN power_ups p ON p.id = dp.power_up_id
      WHERE dp.debate_id = p_debate_id AND dp.user_id = v_uid
      ORDER BY dp.slot_number
    ) r;
  END IF;

  RETURN json_build_object(
    'success', true,
    'inventory', COALESCE(v_inventory, '[]'::json),
    'equipped', COALESCE(v_equipped, '[]'::json),
    'questions_answered', COALESCE(v_questions, 0)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_rivals()
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '[]'::JSON;
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(r)), '[]'::JSON)
    FROM (
      SELECT
        rv.id,
        rv.status,
        rv.challenger_message,
        rv.created_at,
        CASE WHEN rv.challenger_id = v_user_id THEN rv.target_id ELSE rv.challenger_id END AS rival_id,
        CASE WHEN rv.challenger_id = v_user_id THEN 'sent' ELSE 'received' END AS direction,
        p.username AS rival_username,
        p.display_name AS rival_display_name,
        p.elo_rating AS rival_elo,
        p.wins AS rival_wins,
        p.losses AS rival_losses
      FROM rivals rv
      JOIN profiles p ON p.id = CASE WHEN rv.challenger_id = v_user_id THEN rv.target_id ELSE rv.challenger_id END
      WHERE (rv.challenger_id = v_user_id OR rv.target_id = v_user_id)
        AND rv.status IN ('pending', 'accepted')
      ORDER BY rv.created_at DESC
    ) r
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_token_summary()
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_today_earnings INTEGER;
  v_today_log JSON;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Today's total earnings
  SELECT COALESCE(SUM(tokens_earned), 0) INTO v_today_earnings
  FROM public.token_earn_log
  WHERE user_id = v_user_id AND earned_date = CURRENT_DATE;

  -- Today's earn breakdown
  SELECT json_agg(row_to_json(t)) INTO v_today_log
  FROM (
    SELECT earn_type, SUM(tokens_earned) as tokens, COUNT(*) as count
    FROM public.token_earn_log
    WHERE user_id = v_user_id AND earned_date = CURRENT_DATE
    GROUP BY earn_type
  ) t;

  RETURN json_build_object(
    'success', true,
    'token_balance', v_profile.token_balance,
    'login_streak', COALESCE(v_profile.login_streak, 0),
    'best_login_streak', COALESCE(v_profile.best_login_streak, 0),
    'last_login_date', v_profile.last_login_date,
    'today_earned', v_today_earnings,
    'today_breakdown', COALESCE(v_today_log, '[]'::json)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_opponent_power_ups(p_debate_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_own_profile()
 RETURNS json
 LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_row profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM profiles
  WHERE id = v_uid;

  IF v_row IS NULL THEN
    RETURN NULL;
  END IF;

  -- Return full row as JSON. Using row_to_json so any future columns
  -- added to profiles are automatically included.
  RETURN row_to_json(v_row);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_pending_challenges()
 RETURNS TABLE(debate_id uuid, mode text, topic text, ranked boolean, challenger_name text, challenger_id uuid, challenger_elo integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    ad.id,
    ad.mode,
    ad.topic,
    ad.ranked,
    COALESCE(p.display_name, p.username, 'Unknown')::text,
    ad.debater_a,
    COALESCE(p.elo_rating, 1200)::int,
    ad.created_at
  FROM arena_debates ad
  JOIN profiles p ON p.id = ad.debater_a
  WHERE ad.invited_user_id = v_user_id
    AND ad.status          = 'pending'
    AND ad.visibility      = 'private'
  ORDER BY ad.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_prediction_questions(p_limit integer DEFAULT 20, p_category text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(q))
  INTO v_result
  FROM (
    SELECT
      pq.id,
      pq.topic,
      pq.side_a_label,
      pq.side_b_label,
      pq.category,
      pq.status,
      pq.picks_a,
      pq.picks_b,
      (pq.picks_a + pq.picks_b) AS total_picks,
      pq.created_at,
      p.username AS creator_username,
      p.display_name AS creator_display_name
    FROM public.prediction_questions pq
    JOIN public.profiles p ON p.id = pq.creator_id
    WHERE pq.status = 'open'
      AND (p_category IS NULL OR pq.category = p_category)
    ORDER BY (pq.picks_a + pq.picks_b) DESC, pq.created_at DESC
    LIMIT LEAST(p_limit, 50)
  ) q;

  RETURN COALESCE(v_result, '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_cosmetics(p_user_id uuid)
 RETURNS TABLE(cosmetic_id uuid, name text, category text, tier integer, asset_url text, acquired_via text, metadata jsonb, acquired_at timestamp with time zone)
 LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT
    ci.id,
    ci.name,
    ci.category,
    ci.tier,
    ci.asset_url,
    uc.acquired_via,
    uc.metadata,
    uc.acquired_at
  FROM user_cosmetics uc
  JOIN cosmetic_items ci ON ci.id = uc.cosmetic_id
  WHERE uc.user_id = p_user_id
    AND (
      ci.category = 'badge'
      OR uc.equipped = true
    )
  ORDER BY ci.category, ci.sort_order;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $function$
DECLARE
  v_profile RECORD;
  v_follow_counts JSON;
  v_is_following BOOLEAN := false;
BEGIN
  SELECT id, username, display_name, elo_rating, wins, losses, current_streak,
         level, debates_completed, avatar_url, bio, created_at, subscription_tier
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id AND deleted_at IS NULL;

  IF v_profile IS NULL THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  v_follow_counts := get_follow_counts(p_user_id);

  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    v_is_following := is_following(p_user_id);
  END IF;

  RETURN json_build_object(
    'id', v_profile.id,
    'username', v_profile.username,
    'display_name', v_profile.display_name,
    'elo_rating', v_profile.elo_rating,
    'wins', v_profile.wins,
    'losses', v_profile.losses,
    'current_streak', v_profile.current_streak,
    'level', v_profile.level,
    'debates_completed', v_profile.debates_completed,
    'avatar_url', v_profile.avatar_url,
    'bio', v_profile.bio,
    'created_at', v_profile.created_at,
    'subscription_tier', v_profile.subscription_tier,
    'followers', v_follow_counts->'followers',
    'following', v_follow_counts->'following',
    'is_following', v_is_following
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_reference_library()
 RETURNS SETOF arsenal_references
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.arsenal_references
    ORDER BY current_power DESC, created_at DESC
    LIMIT 100;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_spectator_chat(p_debate_id uuid, p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, user_id uuid, display_name text, avatar_url text, message text, created_at timestamp with time zone)
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_stake_pool(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_pool RECORD;
  v_uid UUID;
  v_user_stake RECORD;
BEGIN
  v_uid := auth.uid();

  -- Get pool data
  SELECT total_side_a, total_side_b, status, settled_winner
  INTO v_pool
  FROM stake_pools
  WHERE debate_id = p_debate_id;

  -- Get user's own stake if exists
  IF v_uid IS NOT NULL THEN
    SELECT side, amount, status, payout
    INTO v_user_stake
    FROM stakes
    WHERE debate_id = p_debate_id AND user_id = v_uid;
  END IF;

  RETURN json_build_object(
    'exists', v_pool IS NOT NULL,
    'total_side_a', COALESCE(v_pool.total_side_a, 0),
    'total_side_b', COALESCE(v_pool.total_side_b, 0),
    'pool_status', COALESCE(v_pool.status, 'none'),
    'winner', v_pool.settled_winner,
    'user_stake', CASE
      WHEN v_user_stake IS NOT NULL THEN json_build_object(
        'side', v_user_stake.side,
        'amount', v_user_stake.amount,
        'status', v_user_stake.status,
        'payout', v_user_stake.payout
      )
      ELSE NULL
    END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.group_role_rank(p_role text)
 RETURNS integer
 LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE p_role
    WHEN 'leader'    THEN 4
    WHEN 'co_leader' THEN 3
    WHEN 'elder'     THEN 2
    WHEN 'member'    THEN 1
    ELSE 0
  END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_profile_columns()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Allow bypass from SECURITY DEFINER RPCs that set this flag
  IF current_setting('app.bypass_column_guard', true) IS NOT DISTINCT FROM 'on' THEN
    RETURN NEW;
  END IF;

  -- Block direct client writes to protected columns
  IF NEW.level IS DISTINCT FROM OLD.level THEN
    RAISE EXCEPTION 'Cannot modify level directly';
  END IF;

  IF NEW.xp IS DISTINCT FROM OLD.xp THEN
    RAISE EXCEPTION 'Cannot modify xp directly';
  END IF;

  IF NEW.streak_freezes IS DISTINCT FROM OLD.streak_freezes THEN
    RAISE EXCEPTION 'Cannot modify streak_freezes directly';
  END IF;

  IF NEW.questions_answered IS DISTINCT FROM OLD.questions_answered THEN
    RAISE EXCEPTION 'Cannot modify questions_answered directly';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_profile_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If called from a SECURITY DEFINER function, allow everything
  -- (SECURITY DEFINER functions run as the function owner, not the user)
  IF current_setting('role', true) = 'postgres' OR
     current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block changes to protected columns (revert to OLD values)
  -- === Original protected columns ===
  NEW.elo_rating := OLD.elo_rating;
  NEW.wins := OLD.wins;
  NEW.losses := OLD.losses;
  NEW.draws := OLD.draws;
  NEW.current_streak := OLD.current_streak;
  NEW.best_streak := OLD.best_streak;
  NEW.debates_completed := OLD.debates_completed;
  NEW.level := OLD.level;
  NEW.xp := OLD.xp;
  NEW.token_balance := OLD.token_balance;
  NEW.subscription_tier := OLD.subscription_tier;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  NEW.trust_score := OLD.trust_score;
  NEW.profile_depth_pct := OLD.profile_depth_pct;
  NEW.is_minor := OLD.is_minor;
  NEW.created_at := OLD.created_at;

  -- === Session 75: Streak/token protection ===
  NEW.streak_freezes := OLD.streak_freezes;
  NEW.login_streak := OLD.login_streak;

  -- === Session 214: Moderator column protection (fixes ADV-1) ===
  NEW.is_moderator := OLD.is_moderator;
  NEW.mod_available := OLD.mod_available;
  NEW.mod_categories := OLD.mod_categories;
  NEW.mod_rating := OLD.mod_rating;
  NEW.mod_debates_total := OLD.mod_debates_total;
  NEW.mod_rulings_total := OLD.mod_rulings_total;
  NEW.mod_approval_pct := OLD.mod_approval_pct;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, date_of_birth, is_minor)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'user_' || left(new.id::text, 8)),
    COALESCE(new.raw_user_meta_data->>'display_name', 'Gladiator'),
    (new.raw_user_meta_data->>'date_of_birth')::date,
    CASE WHEN (new.raw_user_meta_data->>'date_of_birth') IS NOT NULL
      THEN (now() - (new.raw_user_meta_data->>'date_of_birth')::date) < interval '18 years'
      ELSE false
    END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id) VALUES (new.id) ON CONFLICT DO NOTHING;

  -- Strip DOB from metadata so it never appears in JWTs
  IF new.raw_user_meta_data ? 'date_of_birth' THEN
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data - 'date_of_birth'
    WHERE id = new.id;
  END IF;

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_questions_answered(p_count integer)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_old_total integer;
  v_new_total integer;
  v_tier_name text;
  v_thresholds integer[] := ARRAY[10, 25, 50, 75, 100];
  v_tier_names text[] := ARRAY['Spectator+', 'Contender', 'Gladiator', 'Champion', 'Legend'];
  i integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  IF p_count IS NULL OR p_count < 1 OR p_count > 50 THEN
    RETURN json_build_object('ok', false, 'error', 'Invalid count');
  END IF;

  -- Get old total before increment
  SELECT questions_answered INTO v_old_total FROM profiles WHERE id = v_user_id;
  v_old_total := COALESCE(v_old_total, 0);

  -- SESSION 120: Set bypass flag so guard_profile_columns trigger allows the write
  PERFORM set_config('app.bypass_column_guard', 'on', true);

  -- Increment and return new total
  UPDATE profiles
  SET questions_answered = questions_answered + p_count
  WHERE id = v_user_id
  RETURNING questions_answered INTO v_new_total;

  IF v_new_total IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Profile not found');
  END IF;

  -- SESSION 120: Check if any tier threshold was crossed
  FOR i IN 1..array_length(v_thresholds, 1) LOOP
    IF v_old_total < v_thresholds[i] AND v_new_total >= v_thresholds[i] THEN
      v_tier_name := v_tier_names[i];
    END IF;
  END LOOP;

  IF v_tier_name IS NOT NULL THEN
    PERFORM _notify_user(
      v_user_id,
      'tier_up',
      '🏅 Tier Up!',
      format('You reached %s! New perks unlocked.', v_tier_name),
      jsonb_build_object('tier', v_tier_name, 'questions_answered', v_new_total)
    );
  END IF;

  RETURN json_build_object('ok', true, 'questions_answered', v_new_total);
END;
$function$;

CREATE OR REPLACE FUNCTION public.insert_feed_event(p_debate_id uuid, p_event_type text, p_round integer DEFAULT NULL::integer, p_side text DEFAULT NULL::text, p_content text DEFAULT NULL::text, p_score integer DEFAULT NULL::integer, p_reference_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.is_following(p_target_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = p_target_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.join_async_debate(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.join_debate_queue(p_mode text, p_category text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_ruleset text DEFAULT 'amplified'::text, p_total_rounds integer DEFAULT 4)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.join_debate_queue(p_mode text, p_category text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_ranked boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.join_group(p_group_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_group   public.groups;
  v_banned  boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  -- Block joining private groups directly
  IF v_group.is_public = false THEN
    RAISE EXCEPTION 'This group is private. You need an invitation to join.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.group_bans
    WHERE group_id = p_group_id AND user_id = v_user_id
  ) INTO v_banned;

  IF v_banned THEN
    RAISE EXCEPTION 'You are banned from this group';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (p_group_id, v_user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  IF FOUND THEN
    UPDATE public.groups
    SET member_count = member_count + 1, updated_at = now()
    WHERE id = p_group_id;
  END IF;

  PERFORM log_event(
    p_event_type := 'group_joined',
    p_metadata   := jsonb_build_object(
      'group_id', p_group_id,
      'category', v_group.category
    )
  );

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.join_mod_debate(p_join_code text)
 RETURNS TABLE(debate_id uuid, role text, status text, topic text, mode text, ranked boolean, moderator_name text, opponent_name text, opponent_id uuid, opponent_elo integer, ruleset text, total_rounds integer, language text)
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid     UUID := auth.uid();
  v_debate  RECORD;
  v_role    TEXT;
  v_mod     RECORD;
  v_opp     RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT ad.*
  INTO v_debate
  FROM arena_debates ad
  WHERE ad.join_code = upper(trim(p_join_code))
    AND ad.status = 'lobby'
  FOR NO KEY UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Code not found or debate already started';
  END IF;

  IF v_uid = v_debate.moderator_id THEN
    RAISE EXCEPTION 'Moderator cannot join as debater';
  END IF;

  IF v_uid = v_debate.debater_a OR v_uid = v_debate.debater_b THEN
    RAISE EXCEPTION 'Already joined this debate';
  END IF;

  IF v_debate.debater_a IS NULL THEN
    UPDATE arena_debates
    SET debater_a = v_uid
    WHERE id = v_debate.id;
    v_role := 'a';
  ELSIF v_debate.debater_b IS NULL THEN
    UPDATE arena_debates
    SET debater_b = v_uid,
        status = 'matched'
    WHERE id = v_debate.id;
    v_role := 'b';
  ELSE
    RAISE EXCEPTION 'Debate is full';
  END IF;

  SELECT p.display_name INTO v_mod
  FROM profiles p WHERE p.id = v_debate.moderator_id;

  debate_id      := v_debate.id;
  role           := v_role;
  topic          := v_debate.topic;
  mode           := v_debate.mode;
  ranked         := v_debate.ranked;
  ruleset        := v_debate.ruleset;
  moderator_name := v_mod.display_name;
  total_rounds   := COALESCE(v_debate.total_rounds, 4);
  language       := COALESCE(v_debate.language, 'en');

  IF v_role = 'b' THEN
    status := 'matched';
    SELECT p.display_name, p.id, p.elo_rating::INT
    INTO v_opp
    FROM profiles p WHERE p.id = v_debate.debater_a;

    opponent_name := v_opp.display_name;
    opponent_id   := v_opp.id;
    opponent_elo  := v_opp.elo_rating;
  ELSE
    status        := 'lobby';
    opponent_name := NULL;
    opponent_id   := NULL;
    opponent_elo  := NULL;
  END IF;

  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.join_private_lobby(p_debate_id uuid DEFAULT NULL::uuid, p_join_code text DEFAULT NULL::text)
 RETURNS TABLE(debate_id uuid, status text, topic text, mode text, opponent_name text, opponent_id uuid, opponent_elo integer, ruleset text, total_rounds integer, language text)
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    WHERE id = p_debate_id AND status = 'pending' AND debater_b IS NULL;
  ELSIF p_join_code IS NOT NULL THEN
    SELECT * INTO v_debate FROM arena_debates
    WHERE join_code = upper(trim(p_join_code)) AND status = 'pending' AND debater_b IS NULL;
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
    AND status      = 'pending';

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
    p_metadata   := jsonb_build_object('visibility', v_debate.visibility)
  );

  RETURN QUERY SELECT
    v_debate.id,
    'matched'::text,
    v_debate.topic,
    v_debate.mode,
    v_opponent_name,
    v_debate.debater_a,
    v_opponent_elo,
    COALESCE(v_debate.ruleset, 'amplified')::text,
    COALESCE(v_debate.total_rounds, 4),
    COALESCE(v_debate.language, 'en');
END;
$function$;

CREATE OR REPLACE FUNCTION public.kick_group_member(p_group_id uuid, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
  v_target_role text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller_id = p_user_id THEN
    RAISE EXCEPTION 'Use leave_group to leave a group';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_caller_id;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  SELECT role INTO v_target_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user is not a member of this group';
  END IF;

  IF public.group_role_rank(v_caller_role) <= public.group_role_rank(v_target_role) THEN
    RAISE EXCEPTION 'Insufficient permissions: cannot kick a member of equal or higher rank';
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  UPDATE public.groups
  SET member_count = GREATEST(0, member_count - 1), updated_at = now()
  WHERE id = p_group_id;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.leave_debate_queue()
 RETURNS void
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM debate_queue WHERE user_id = auth.uid() AND status = 'waiting';
END;
$function$;

CREATE OR REPLACE FUNCTION public.leave_group(p_group_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id     uuid := auth.uid();
  v_caller_role text;
  v_next_user   uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  IF v_caller_role = 'leader' THEN
    -- Find most senior remaining member (highest rank, earliest joined_at)
    SELECT user_id INTO v_next_user
    FROM public.group_members
    WHERE group_id = p_group_id AND user_id != v_user_id
    ORDER BY public.group_role_rank(role) DESC, joined_at ASC
    LIMIT 1;

    IF v_next_user IS NULL THEN
      -- No remaining members — dissolve the group
      DELETE FROM public.groups WHERE id = p_group_id;
      RETURN json_build_object('success', true, 'dissolved', true);
    END IF;

    UPDATE public.group_members SET role = 'leader'
    WHERE group_id = p_group_id AND user_id = v_next_user;

    UPDATE public.groups SET owner_id = v_next_user, updated_at = now()
    WHERE id = p_group_id;
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  UPDATE public.groups
  SET member_count = GREATEST(0, member_count - 1), updated_at = now()
  WHERE id = p_group_id;

  RETURN json_build_object('success', true, 'dissolved', false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_event(p_event_type text, p_user_id uuid DEFAULT NULL::uuid, p_debate_id uuid DEFAULT NULL::uuid, p_category text DEFAULT NULL::text, p_side text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.event_log (event_type, user_id, debate_id, category, side, metadata)
  VALUES (p_event_type, p_user_id, p_debate_id, p_category, p_side, p_metadata);
  -- Fire and forget. No return value. Never block the caller.
EXCEPTION WHEN OTHERS THEN
  -- Never let analytics break the app. Swallow errors.
  RAISE WARNING 'log_event failed: % %', SQLERRM, SQLSTATE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_updated INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_notification_ids IS NULL THEN
    -- Mark ALL as read
    UPDATE public.notifications
    SET read = true
    WHERE user_id = v_user_id AND read = false;
  ELSE
    -- Mark specific IDs as read
    UPDATE public.notifications
    SET read = true
    WHERE user_id = v_user_id
      AND id = ANY(p_notification_ids)
      AND read = false;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'marked_read', v_updated
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.mod_null_debate(p_debate_id uuid, p_reason text DEFAULT 'null'::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_debate RECORD;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Load debate
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id FOR UPDATE;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- Idempotency: already cancelled or complete
  IF v_debate.status IN ('cancelled', 'complete') THEN
    RETURN json_build_object('success', true, 'already_processed', true);
  END IF;

  -- Caller must be the moderator of this debate
  IF v_uid != v_debate.moderator_id THEN
    RAISE EXCEPTION 'Only the moderator can null this debate';
  END IF;

  -- Debate must be in progress
  IF v_debate.status NOT IN ('live', 'round_break') THEN
    RAISE EXCEPTION 'Debate is not in progress';
  END IF;

  -- Validate reason
  IF p_reason NOT IN ('eject_a', 'eject_b', 'null') THEN
    RAISE EXCEPTION 'Invalid reason: must be eject_a, eject_b, or null';
  END IF;

  -- Null the debate
  UPDATE arena_debates
    SET status = 'cancelled',
        ended_at = now(),
        winner = NULL
    WHERE id = p_debate_id;

  RETURN json_build_object(
    'success', true,
    'reason', p_reason
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_follower()
 RETURNS trigger
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_follower_name TEXT;
BEGIN
  SELECT display_name INTO v_follower_name FROM public.profiles WHERE id = NEW.follower_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.following_id,
    'follow',
    COALESCE(v_follower_name, 'Someone') || ' followed you',
    'You have a new follower!',
    json_build_object('follower_id', NEW.follower_id)::jsonb
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pick_prediction(p_question_id uuid, p_pick text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_question RECORD;
  v_allowed BOOLEAN;
  v_existing TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_pick NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'Pick must be a or b';
  END IF;

  -- Rate limit: 30 picks per hour
  v_allowed := check_rate_limit(v_user_id, 'prediction_pick', 60, 30);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit: too many prediction picks';
  END IF;

  -- Check question exists and is open
  SELECT * INTO v_question FROM public.prediction_questions WHERE id = p_question_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prediction question not found';
  END IF;
  IF v_question.status != 'open' THEN
    RAISE EXCEPTION 'Prediction is closed';
  END IF;

  -- Check if already picked
  SELECT pick INTO v_existing FROM public.prediction_picks
    WHERE question_id = p_question_id AND user_id = v_user_id;

  IF v_existing IS NOT NULL THEN
    IF v_existing = p_pick THEN
      RETURN json_build_object('success', true, 'message', 'Already picked this side');
    END IF;
    -- Switching sides: update pick, adjust counts
    UPDATE public.prediction_picks SET pick = p_pick WHERE question_id = p_question_id AND user_id = v_user_id;
    IF p_pick = 'a' THEN
      UPDATE public.prediction_questions SET picks_a = picks_a + 1, picks_b = GREATEST(0, picks_b - 1) WHERE id = p_question_id;
    ELSE
      UPDATE public.prediction_questions SET picks_b = picks_b + 1, picks_a = GREATEST(0, picks_a - 1) WHERE id = p_question_id;
    END IF;
  ELSE
    -- New pick
    INSERT INTO public.prediction_picks (question_id, user_id, pick)
    VALUES (p_question_id, v_user_id, p_pick);
    IF p_pick = 'a' THEN
      UPDATE public.prediction_questions SET picks_a = picks_a + 1 WHERE id = p_question_id;
    ELSE
      UPDATE public.prediction_questions SET picks_b = picks_b + 1 WHERE id = p_question_id;
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'pick', p_pick);
END;
$function$;

CREATE OR REPLACE FUNCTION public.pin_feed_event(p_debate_id uuid, p_feed_event_id bigint)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.place_prediction(p_debate_id uuid, p_predicted_winner text, p_amount integer)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance INTEGER;
  v_debate RECORD;
  v_allowed BOOLEAN;
  v_existing RECORD;
  v_net_charge INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate side: must be 'a' or 'b' (matches predictions table CHECK constraint)
  IF p_predicted_winner NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'Invalid prediction target';
  END IF;

  IF p_amount < 1 OR p_amount > 500 THEN
    RAISE EXCEPTION 'Prediction: 1-500 tokens';
  END IF;

  -- Rate limit: 20 predictions per hour
  v_allowed := check_rate_limit(v_user_id, 'prediction', 60, 20);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit: too many predictions';
  END IF;

  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF NOT FOUND OR v_debate.status NOT IN ('waiting', 'matched', 'live') THEN
    RAISE EXCEPTION 'Debate not accepting predictions';
  END IF;

  IF v_user_id IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Cannot predict your own debate';
  END IF;

  -- Lock balance
  SELECT token_balance INTO v_balance FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- Check for existing prediction and calculate net charge
  SELECT * INTO v_existing FROM public.predictions
  WHERE debate_id = p_debate_id AND user_id = v_user_id;

  IF FOUND THEN
    -- Updating existing prediction: only charge the difference
    v_net_charge := p_amount - v_existing.tokens_wagered;
  ELSE
    v_net_charge := p_amount;
  END IF;

  -- Only check balance if we need to charge more
  IF v_net_charge > 0 AND v_balance < v_net_charge THEN
    RAISE EXCEPTION 'Insufficient tokens';
  END IF;

  -- Adjust balance (positive = charge more, negative = partial refund)
  IF v_net_charge != 0 THEN
    UPDATE public.profiles
    SET token_balance = token_balance - v_net_charge
    WHERE id = v_user_id;
  END IF;

  -- Upsert prediction
  INSERT INTO public.predictions (debate_id, user_id, predicted_winner, tokens_wagered)
  VALUES (p_debate_id, v_user_id, p_predicted_winner, p_amount)
  ON CONFLICT (debate_id, user_id) DO UPDATE
  SET predicted_winner = p_predicted_winner, tokens_wagered = p_amount;

  -- Log the net transaction
  IF v_net_charge != 0 THEN
    INSERT INTO public.token_transactions (user_id, amount, type, source, balance_after)
    VALUES (v_user_id, -v_net_charge, 'wager', 'prediction', v_balance - v_net_charge);
  END IF;

  RETURN json_build_object('success', true, 'amount', p_amount, 'net_charge', v_net_charge, 'new_balance', v_balance - v_net_charge);
END;
$function$;

CREATE OR REPLACE FUNCTION public.place_stake(p_debate_id uuid, p_side text, p_amount integer)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid UUID;
  v_questions INTEGER;
  v_stake_cap INTEGER;
  v_balance INTEGER;
  v_new_balance INTEGER;
  v_debate_status TEXT;
  v_existing_stake UUID;
  v_pool_id UUID;
  v_tier_name TEXT;
BEGIN
  -- 1. Auth check
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 2. Validate side
  IF p_side NOT IN ('a', 'b') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid side (must be a or b)');
  END IF;

  -- 3. Validate amount
  IF p_amount < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Stake must be at least 1 token');
  END IF;

  -- 4. Get user tier info — FOR UPDATE locks the row to serialize concurrent stake calls
  SELECT questions_answered, token_balance
  INTO v_questions, v_balance
  FROM profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF v_questions IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- 5. Calculate tier cap (ALIGNED with colosseum-tiers.js + plan doc)
  v_questions := COALESCE(v_questions, 0);
  IF v_questions >= 100 THEN
    v_stake_cap := 999999; v_tier_name := 'Legend';
  ELSIF v_questions >= 75 THEN
    v_stake_cap := 100; v_tier_name := 'Champion';
  ELSIF v_questions >= 50 THEN
    v_stake_cap := 50; v_tier_name := 'Gladiator';
  ELSIF v_questions >= 25 THEN
    v_stake_cap := 25; v_tier_name := 'Contender';
  ELSIF v_questions >= 10 THEN
    v_stake_cap := 5; v_tier_name := 'Spectator+';
  ELSE
    v_stake_cap := 0; v_tier_name := 'Unranked';
  END IF;

  -- 6. Check staking is unlocked
  IF v_stake_cap = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Answer at least 10 profile questions to unlock staking');
  END IF;

  -- 7. Check amount within cap
  IF p_amount > v_stake_cap THEN
    RETURN json_build_object('success', false, 'error',
      format('Your tier (%s) caps stakes at %s tokens', v_tier_name, v_stake_cap));
  END IF;

  -- 8. Check balance (early fail before touching other tables)
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Not enough tokens');
  END IF;

  -- 9. Check debate exists and is stakeable
  SELECT status INTO v_debate_status
  FROM arena_debates
  WHERE id = p_debate_id;

  IF v_debate_status IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Debate not found');
  END IF;

  IF v_debate_status NOT IN ('pending', 'lobby', 'matched') THEN
    RETURN json_build_object('success', false, 'error', 'Staking is closed for this debate');
  END IF;

  -- 10. Check no existing stake
  SELECT id INTO v_existing_stake
  FROM stakes
  WHERE debate_id = p_debate_id AND user_id = v_uid;

  IF v_existing_stake IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You already have a stake on this debate');
  END IF;

  -- 11. Create or get stake pool
  INSERT INTO stake_pools (debate_id)
  VALUES (p_debate_id)
  ON CONFLICT (debate_id) DO NOTHING;

  SELECT id INTO v_pool_id
  FROM stake_pools
  WHERE debate_id = p_debate_id AND status = 'open';

  IF v_pool_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Staking pool is closed');
  END IF;

  -- 12. ATOMIC deduct tokens — WHERE clause guarantees balance can't go negative.
  --     Row is already locked by FOR UPDATE above, but the WHERE is defense-in-depth.
  UPDATE profiles
  SET token_balance = token_balance - p_amount
  WHERE id = v_uid AND token_balance >= p_amount
  RETURNING token_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not enough tokens');
  END IF;

  -- 13. Record stake
  INSERT INTO stakes (debate_id, user_id, side, amount)
  VALUES (p_debate_id, v_uid, p_side, p_amount);

  -- 14. Update pool totals
  IF p_side = 'a' THEN
    UPDATE stake_pools SET total_side_a = total_side_a + p_amount WHERE id = v_pool_id;
  ELSE
    UPDATE stake_pools SET total_side_b = total_side_b + p_amount WHERE id = v_pool_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'amount', p_amount,
    'side', p_side,
    'new_balance', v_new_balance,
    'tier', v_tier_name,
    'stake_cap', v_stake_cap
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.promote_group_member(p_group_id uuid, p_user_id uuid, p_new_role text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
  v_target_role text;
  v_caller_rank integer;
  v_target_rank integer;
  v_new_rank    integer;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_new_role NOT IN ('leader', 'co_leader', 'elder', 'member') THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;

  IF v_caller_id = p_user_id THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_caller_id;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  SELECT role INTO v_target_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user is not a member of this group';
  END IF;

  v_caller_rank := public.group_role_rank(v_caller_role);
  v_target_rank := public.group_role_rank(v_target_role);
  v_new_rank    := public.group_role_rank(p_new_role);

  -- Leadership transfer: only leader can do it
  IF p_new_role = 'leader' THEN
    IF v_caller_role != 'leader' THEN
      RAISE EXCEPTION 'Only the leader can transfer leadership';
    END IF;

    UPDATE public.group_members SET role = 'member'
    WHERE group_id = p_group_id AND user_id = v_caller_id;

    UPDATE public.group_members SET role = 'leader'
    WHERE group_id = p_group_id AND user_id = p_user_id;

    UPDATE public.groups SET owner_id = p_user_id
    WHERE id = p_group_id;

    RETURN json_build_object('success', true, 'transferred', true);
  END IF;

  -- All other changes: caller rank must be strictly greater than both
  -- the target's current rank and the new rank being assigned
  IF v_caller_rank <= v_target_rank THEN
    RAISE EXCEPTION 'Insufficient permissions: cannot manage a member of equal or higher rank';
  END IF;

  IF v_caller_rank <= v_new_rank THEN
    RAISE EXCEPTION 'Insufficient permissions: cannot assign a role equal to or higher than your own';
  END IF;

  UPDATE public.group_members SET role = p_new_role
  WHERE group_id = p_group_id AND user_id = p_user_id;

  RETURN json_build_object('success', true, 'new_role', p_new_role);
END;
$function$;

CREATE OR REPLACE FUNCTION public.purchase_cosmetic(p_cosmetic_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile RECORD;
  v_cosmetic RECORD;
  v_new_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get cosmetic
  SELECT * INTO v_cosmetic FROM public.cosmetics WHERE id = p_cosmetic_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cosmetic not found';
  END IF;

  -- Check if already owned
  IF EXISTS (SELECT 1 FROM public.user_cosmetics WHERE user_id = v_user_id AND cosmetic_id = p_cosmetic_id) THEN
    RAISE EXCEPTION 'Already owned';
  END IF;

  -- FIX: lock profile row to prevent balance race
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- Check tier requirement
  IF v_cosmetic.required_tier != 'free' THEN
    IF v_profile.subscription_tier = 'free' THEN
      RAISE EXCEPTION 'Requires subscription tier: %', v_cosmetic.required_tier;
    END IF;
  END IF;

  -- Check level requirement
  IF v_profile.level < v_cosmetic.required_level THEN
    RAISE EXCEPTION 'Requires level %', v_cosmetic.required_level;
  END IF;

  -- Check balance
  IF v_profile.token_balance < v_cosmetic.price_tokens THEN
    RAISE EXCEPTION 'Insufficient tokens (need %, have %)', v_cosmetic.price_tokens, v_profile.token_balance;
  END IF;

  -- Deduct tokens
  UPDATE public.profiles
  SET token_balance = token_balance - v_cosmetic.price_tokens,
      updated_at = now()
  WHERE id = v_user_id
  RETURNING token_balance INTO v_new_balance;

  -- Grant cosmetic
  INSERT INTO public.user_cosmetics (user_id, cosmetic_id)
  VALUES (v_user_id, p_cosmetic_id);

  -- Log transaction
  INSERT INTO public.token_transactions (user_id, amount, type, source, balance_after)
  VALUES (v_user_id, -v_cosmetic.price_tokens, 'spend', 'Cosmetic: ' || v_cosmetic.name, v_new_balance);

  RETURN json_build_object(
    'success', true,
    'cosmetic', v_cosmetic.name,
    'new_balance', v_new_balance
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.purge_old_stripe_events()
 RETURNS void
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM stripe_processed_events
  WHERE processed_at < NOW() - INTERVAL '7 days';
END;
$function$;

CREATE OR REPLACE FUNCTION public.react_hot_take(p_hot_take_id uuid, p_reaction_type text DEFAULT 'fire'::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_exists BOOLEAN;
  v_new_count INTEGER;
  v_take_author UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- SESSION 230 FIX (P2-7): Look up hot take author
  SELECT user_id INTO v_take_author
  FROM public.hot_takes
  WHERE id = p_hot_take_id;

  IF v_take_author IS NULL THEN
    RAISE EXCEPTION 'Hot take not found';
  END IF;

  -- Check if reaction exists (toggle behavior)
  SELECT EXISTS(
    SELECT 1 FROM public.hot_take_reactions
    WHERE hot_take_id = p_hot_take_id AND user_id = v_user_id
  ) INTO v_exists;

  -- Block self-react on ADD only (allow REMOVE so existing self-reactions can be undone)
  IF NOT v_exists AND v_take_author = v_user_id THEN
    RAISE EXCEPTION 'Cannot react to your own hot take';
  END IF;

  IF v_exists THEN
    -- Remove reaction
    DELETE FROM public.hot_take_reactions
    WHERE hot_take_id = p_hot_take_id AND user_id = v_user_id;
  ELSE
    -- Add reaction
    INSERT INTO public.hot_take_reactions (hot_take_id, user_id, reaction_type)
    VALUES (p_hot_take_id, v_user_id, COALESCE(p_reaction_type, 'fire'));
  END IF;

  -- Get updated count
  SELECT COUNT(*) INTO v_new_count
  FROM public.hot_take_reactions
  WHERE hot_take_id = p_hot_take_id;

  -- Update denormalized count
  UPDATE public.hot_takes
  SET reaction_count = v_new_count
  WHERE id = p_hot_take_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'hot_take_reacted',
    p_user_id    := v_user_id,
    p_debate_id  := NULL,
    p_category   := NULL,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'action', CASE WHEN v_exists THEN 'remove' ELSE 'add' END,
      'hot_take_id', p_hot_take_id,
      'reaction_type', p_reaction_type
    )
  );

  RETURN json_build_object(
    'success', true,
    'reacted', NOT v_exists,
    'reaction_count', v_new_count
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_mod_dropout(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_debate RECORD;
  v_mod_id UUID;
  v_dropouts_today INT;
  v_offense INT;
  v_cooldown INT;
  v_today_start TIMESTAMPTZ;
  v_total_score NUMERIC;
  v_total_count INT;
  v_new_approval NUMERIC;
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

  -- ── Idempotency: already cancelled ────────────────────
  -- Both debaters may call simultaneously. First one processes,
  -- second one returns success without re-processing.
  IF v_debate.status = 'cancelled' THEN
    RETURN json_build_object('success', true, 'already_processed', true);
  END IF;

  -- ── Caller must be a debater in this debate ───────────
  IF v_uid != v_debate.debater_a AND v_uid != v_debate.debater_b THEN
    RAISE EXCEPTION 'Only debaters can report a moderator dropout';
  END IF;

  -- ── Debate must be in progress ────────────────────────
  IF v_debate.status NOT IN ('live', 'round_break') THEN
    RAISE EXCEPTION 'Debate is not in progress';
  END IF;

  -- ── Debate must have a human moderator ────────────────
  -- No penalty for AI-moderated or unmoderated debates.
  IF v_debate.moderator_id IS NULL THEN
    RAISE EXCEPTION 'Debate has no moderator';
  END IF;
  IF v_debate.moderator_type != 'human' THEN
    RAISE EXCEPTION 'Dropout penalties only apply to human moderators';
  END IF;

  v_mod_id := v_debate.moderator_id;

  -- ── Null the debate ───────────────────────────────────
  -- Nobody gets a win or loss. Everyone returns to lobby.
  UPDATE arena_debates
    SET status = 'cancelled',
        ended_at = now(),
        winner = NULL
    WHERE id = p_debate_id;

  -- ── Count today's dropouts (UTC midnight reset) ───────
  v_today_start := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

  SELECT COUNT(*) INTO v_dropouts_today
    FROM mod_dropout_log
    WHERE moderator_id = v_mod_id
      AND created_at >= v_today_start;

  -- This dropout is the next offense
  v_offense := v_dropouts_today + 1;
  v_cooldown := get_mod_cooldown_minutes(v_offense);

  -- ── Log the dropout ───────────────────────────────────
  -- Bypasses RLS because SECURITY DEFINER runs as postgres.
  INSERT INTO mod_dropout_log (moderator_id, debate_id, cooldown_minutes, offense_number)
  VALUES (v_mod_id, p_debate_id, v_cooldown, v_offense);

  -- ── Impact mod_approval_pct ───────────────────────────
  -- Insert a synthetic 0-score as if the reporting debater gave
  -- the moderator a 0 (worst possible). Uses the same
  -- moderator_scores table so the running average stays consistent
  -- with normal post-debate scoring.
  --
  -- Debater score of 0 → 0 * 2.0 = 0/100 in the approval formula.
  -- ON CONFLICT: if both debaters call, only one row inserted.
  INSERT INTO moderator_scores (debate_id, moderator_id, scorer_id, scorer_role, score)
  VALUES (p_debate_id, v_mod_id, v_uid, 'debater', 0)
  ON CONFLICT (debate_id, scorer_id) DO NOTHING;

  -- Recalculate mod_approval_pct (same formula as score_moderator)
  SELECT
    AVG(CASE
      WHEN scorer_role = 'debater' THEN score * 2.0
      WHEN scorer_role = 'spectator' THEN score * 2.0
    END),
    COUNT(*)
  INTO v_total_score, v_total_count
  FROM moderator_scores
  WHERE moderator_id = v_mod_id;

  v_new_approval := COALESCE(v_total_score, 0.0);

  -- SECURITY DEFINER runs as postgres → bypasses guard_profile_columns trigger.
  UPDATE profiles SET
    mod_approval_pct = ROUND(v_new_approval, 2)
  WHERE id = v_mod_id;

  -- ── Analytics ─────────────────────────────────────────
  PERFORM log_event(
    'moderator_dropout',
    v_mod_id,
    p_debate_id,
    v_debate.category,
    NULL,
    jsonb_build_object(
      'offense_number', v_offense,
      'cooldown_minutes', v_cooldown,
      'reported_by', v_uid,
      'new_approval', ROUND(v_new_approval, 2),
      'dropouts_today', v_offense
    )
  );

  RETURN json_build_object(
    'success', true,
    'moderator_id', v_mod_id,
    'offense_number', v_offense,
    'cooldown_minutes', v_cooldown,
    'cooldown_expires_at', (now() + (v_cooldown || ' minutes')::interval),
    'new_approval', ROUND(v_new_approval, 2)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.request_mod_for_debate(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_debate FROM public.arena_debates
  WHERE id = p_debate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_user_id NOT IN (v_debate.debater_a, COALESCE(v_debate.debater_b, '00000000-0000-0000-0000-000000000000')) THEN
    RAISE EXCEPTION 'Only debaters can request a moderator';
  END IF;

  IF v_debate.mod_status != 'none' THEN
    RETURN json_build_object('success', true, 'mod_status', v_debate.mod_status);
  END IF;

  UPDATE public.arena_debates
  SET mod_status = 'waiting', updated_at = now()
  WHERE id = p_debate_id;

  PERFORM log_event(
    p_event_type := 'mod_requested',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('requested_by', v_user_id)
  );

  RETURN json_build_object('success', true, 'mod_status', 'waiting');
END;
$function$;

CREATE OR REPLACE FUNCTION public.request_to_moderate(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_mod RECORD;
BEGIN
  -- Verify caller is an available moderator
  SELECT * INTO v_mod FROM public.profiles
  WHERE id = v_user_id
    AND is_moderator = true
    AND mod_available = true
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not an available moderator';
  END IF;

  -- Lock and read the debate row
  SELECT * INTO v_debate FROM public.arena_debates
  WHERE id = p_debate_id
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not available — already claimed by another moderator';
  END IF;

  IF v_debate.mod_status != 'waiting' THEN
    RAISE EXCEPTION 'Debate is not waiting for a moderator';
  END IF;

  IF v_user_id IN (v_debate.debater_a, COALESCE(v_debate.debater_b, '00000000-0000-0000-0000-000000000000')) THEN
    RAISE EXCEPTION 'Cannot moderate a debate you are in';
  END IF;

  -- Claim the request slot
  UPDATE public.arena_debates SET
    mod_status = 'requested',
    mod_requested_by = v_user_id,
    updated_at = now()
  WHERE id = p_debate_id;

  PERFORM log_event(
    p_event_type := 'mod_request_sent',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('moderator_id', v_user_id, 'moderator_name', v_mod.display_name)
  );

  RETURN json_build_object(
    'success', true,
    'debate_id', p_debate_id,
    'moderator_name', v_mod.display_name
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_group_challenge(p_challenge_id uuid, p_winner_group_id uuid, p_debate_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid            uuid := auth.uid();
  v_caller_role    text;
  v_challenge      RECORD;
  v_debate         RECORD;
  v_winner_group   uuid;
  v_loser_group_id uuid;
  v_winner_elo     int;
  v_loser_elo      int;
  v_k              int := 32;
  v_expected       float;
  v_delta          int;
  v_a_group        uuid;
  v_b_group        uuid;
BEGIN
  -- Auth check
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch challenge (lock row to prevent concurrent resolution)
  SELECT * INTO v_challenge
  FROM group_challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Challenge not found');
  END IF;

  IF v_challenge.status = 'completed' THEN
    RETURN json_build_object('error', 'Challenge already resolved');
  END IF;

  IF v_challenge.status != 'accepted' AND v_challenge.status != 'live' THEN
    RETURN json_build_object('error', 'Challenge must be accepted or live to resolve');
  END IF;

  -- Caller must be leader or co_leader of one of the two groups
  SELECT role INTO v_caller_role
  FROM group_members
  WHERE user_id = v_uid
    AND group_id IN (v_challenge.challenger_group_id, v_challenge.defender_group_id)
  ORDER BY group_role_rank(role) DESC
  LIMIT 1;

  IF v_caller_role IS NULL OR group_role_rank(v_caller_role) < 3 THEN
    RAISE EXCEPTION 'Only leaders or co-leaders of a participating group can resolve challenges';
  END IF;

  -- Determine winner: prefer server-side from debate result
  v_winner_group := NULL;

  IF p_debate_id IS NOT NULL THEN
    SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;

    IF v_debate IS NOT NULL AND v_debate.winner IS NOT NULL AND v_debate.winner IN ('a', 'b') THEN
      -- Map debate sides to groups via group_members
      SELECT group_id INTO v_a_group
      FROM group_members
      WHERE user_id = v_debate.debater_a
        AND group_id IN (v_challenge.challenger_group_id, v_challenge.defender_group_id)
      LIMIT 1;

      SELECT group_id INTO v_b_group
      FROM group_members
      WHERE user_id = v_debate.debater_b
        AND group_id IN (v_challenge.challenger_group_id, v_challenge.defender_group_id)
      LIMIT 1;

      IF v_debate.winner = 'a' AND v_a_group IS NOT NULL THEN
        v_winner_group := v_a_group;
      ELSIF v_debate.winner = 'b' AND v_b_group IS NOT NULL THEN
        v_winner_group := v_b_group;
      END IF;
      -- If mapping fails (debater not in either group), fall through to p_winner_group_id
    END IF;
  END IF;

  -- Fall back to client-provided winner (now role-gated)
  IF v_winner_group IS NULL THEN
    v_winner_group := p_winner_group_id;
  END IF;

  -- Validate winner is one of the two groups
  IF v_winner_group != v_challenge.challenger_group_id
     AND v_winner_group != v_challenge.defender_group_id THEN
    RETURN json_build_object('error', 'Winner must be one of the challenge groups');
  END IF;

  -- Determine loser
  IF v_winner_group = v_challenge.challenger_group_id THEN
    v_loser_group_id := v_challenge.defender_group_id;
  ELSE
    v_loser_group_id := v_challenge.challenger_group_id;
  END IF;

  -- Get current Elo ratings (default 1200 if NULL)
  SELECT COALESCE(group_elo, 1200) INTO v_winner_elo FROM groups WHERE id = v_winner_group;
  SELECT COALESCE(group_elo, 1200) INTO v_loser_elo  FROM groups WHERE id = v_loser_group_id;

  -- Elo calculation
  v_expected := 1.0 / (1.0 + POWER(10, (v_loser_elo - v_winner_elo)::FLOAT / 400));
  v_delta := ROUND(v_k * (1 - v_expected));
  IF v_delta < 1 THEN v_delta := 1; END IF;

  -- Update group Elo
  UPDATE groups SET group_elo = COALESCE(group_elo, 1200) + v_delta WHERE id = v_winner_group;
  UPDATE groups SET group_elo = GREATEST(COALESCE(group_elo, 1200) - v_delta, 100) WHERE id = v_loser_group_id;

  -- Mark challenge complete
  UPDATE group_challenges
  SET status = 'completed',
      winner_group_id = v_winner_group,
      debate_id = COALESCE(p_debate_id, debate_id),
      completed_at = NOW()
  WHERE id = p_challenge_id;

  RETURN json_build_object(
    'success', true,
    'winner_group_id', v_winner_group,
    'winner_elo_change', v_delta,
    'loser_elo_change', -v_delta
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.respond_rival(p_rival_id uuid, p_accept boolean)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_rival RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO v_rival FROM rivals WHERE id = p_rival_id AND target_id = v_user_id AND status = 'pending';

  IF v_rival IS NULL THEN
    RETURN json_build_object('error', 'Rival request not found');
  END IF;

  IF p_accept THEN
    UPDATE rivals SET status = 'accepted', accepted_at = now() WHERE id = p_rival_id;

    -- FIXED: named parameters (LM-188 audit)
    PERFORM log_event(
      p_event_type := 'rival_accepted',
      p_user_id    := v_user_id,
      p_debate_id  := NULL,
      p_category   := NULL,
      p_side       := NULL,
      p_metadata   := jsonb_build_object('target_user_id', v_rival.challenger_id)
    );

    RETURN json_build_object('success', true, 'status', 'accepted');
  ELSE
    UPDATE rivals SET status = 'declined' WHERE id = p_rival_id;
    RETURN json_build_object('success', true, 'status', 'declined');
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.respond_to_group_challenge(p_challenge_id uuid, p_action text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_challenge RECORD;
  v_caller_role text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  IF p_action NOT IN ('accept', 'decline') THEN
    RETURN json_build_object('error', 'Action must be accept or decline');
  END IF;

  SELECT * INTO v_challenge
  FROM group_challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Challenge not found');
  END IF;

  IF v_challenge.status != 'pending' THEN
    RETURN json_build_object('error', 'Challenge is no longer pending');
  END IF;

  IF v_challenge.expires_at < NOW() THEN
    UPDATE group_challenges SET status = 'expired' WHERE id = p_challenge_id;
    RETURN json_build_object('error', 'Challenge has expired');
  END IF;

  -- Must be leader or co_leader of defender group
  SELECT role INTO v_caller_role
  FROM group_members
  WHERE group_id = v_challenge.defender_group_id AND user_id = v_user_id;

  IF v_caller_role IS NULL OR group_role_rank(v_caller_role) < 3 THEN
    RETURN json_build_object('error', 'Only leaders or co-leaders can accept or decline challenges');
  END IF;

  UPDATE group_challenges
  SET status = CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'declined' END,
      responded_at = NOW()
  WHERE id = p_challenge_id;

  RETURN json_build_object('success', true, 'status', CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'declined' END);
END;
$function$;

CREATE OR REPLACE FUNCTION public.respond_to_match(p_debate_id uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Auth: caller must be player_a or player_b
  IF v_caller IS DISTINCT FROM v_row.player_a AND v_caller IS DISTINCT FROM v_row.player_b THEN
    RAISE EXCEPTION 'Not a participant in this debate';
  END IF;

  -- Set the caller's ready column
  IF v_caller = v_row.player_a THEN
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

CREATE OR REPLACE FUNCTION public.respond_to_mod_request(p_debate_id uuid, p_accept boolean)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
BEGIN
  SELECT * INTO v_debate FROM public.arena_debates
  WHERE id = p_debate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_user_id NOT IN (v_debate.debater_a, COALESCE(v_debate.debater_b, '00000000-0000-0000-0000-000000000000')) THEN
    RAISE EXCEPTION 'Only debaters can respond to a mod request';
  END IF;

  IF v_debate.mod_status != 'requested' THEN
    RAISE EXCEPTION 'No pending mod request on this debate';
  END IF;

  IF v_debate.mod_requested_by IS NULL THEN
    RAISE EXCEPTION 'Mod request has no moderator assigned';
  END IF;

  IF p_accept THEN
    UPDATE public.arena_debates SET
      mod_status    = 'claimed',
      moderator_id  = v_debate.mod_requested_by,
      moderator_type = 'human',
      updated_at    = now()
    WHERE id = p_debate_id;

    UPDATE public.profiles SET
      mod_debates_total = mod_debates_total + 1
    WHERE id = v_debate.mod_requested_by;

    PERFORM log_event(
      p_event_type := 'mod_request_accepted',
      p_user_id    := v_user_id,
      p_debate_id  := p_debate_id,
      p_category   := v_debate.category,
      p_side       := NULL,
      p_metadata   := jsonb_build_object('moderator_id', v_debate.mod_requested_by)
    );

    RETURN json_build_object(
      'success',       true,
      'accepted',      true,
      'moderator_id',  v_debate.mod_requested_by
    );
  ELSE
    -- Decline or timeout — reset to waiting
    UPDATE public.arena_debates SET
      mod_status       = 'waiting',
      mod_requested_by = NULL,
      updated_at       = now()
    WHERE id = p_debate_id;

    PERFORM log_event(
      p_event_type := 'mod_request_declined',
      p_user_id    := v_user_id,
      p_debate_id  := p_debate_id,
      p_category   := v_debate.category,
      p_side       := NULL,
      p_metadata   := jsonb_build_object('moderator_id', v_debate.mod_requested_by)
    );

    RETURN json_build_object(
      'success',  true,
      'accepted', false
    );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rule_on_reference(p_reference_id uuid, p_ruling text, p_reason text DEFAULT NULL::text, p_ruled_by_type text DEFAULT 'human'::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_ref RECORD;
  v_debate RECORD;
BEGIN
  -- Validate ruling
  IF p_ruling NOT IN ('allowed', 'denied') THEN
    RAISE EXCEPTION 'Ruling must be allowed or denied';
  END IF;

  -- Lock reference row
  SELECT * INTO v_ref FROM public.debate_references WHERE id = p_reference_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;
  IF v_ref.ruling != 'pending' THEN
    RAISE EXCEPTION 'Reference already ruled on';
  END IF;

  -- Get debate
  SELECT * INTO v_debate FROM public.debates WHERE id = v_ref.debate_id;

  -- Auth check: must be the debate's moderator (or AI/auto bypass)
  IF p_ruled_by_type = 'human' THEN
    IF v_debate.moderator_id IS NULL OR v_user_id != v_debate.moderator_id THEN
      RAISE EXCEPTION 'Not the assigned moderator';
    END IF;
  END IF;

  -- Apply ruling
  UPDATE public.debate_references SET
    ruling = p_ruling,
    ruled_by = CASE WHEN p_ruled_by_type = 'human' THEN v_user_id ELSE NULL END,
    ruled_by_type = p_ruled_by_type,
    ruling_reason = CASE WHEN length(trim(COALESCE(p_reason, ''))) > 0
      THEN left(trim(p_reason), 200)
      ELSE NULL
    END,
    ruled_at = now()
  WHERE id = p_reference_id;

  -- Unpause debate
  UPDATE public.debates
  SET is_paused = false, paused_at = NULL, updated_at = now()
  WHERE id = v_ref.debate_id;

  -- Increment moderator rulings count (if human mod)
  IF p_ruled_by_type = 'human' AND v_debate.moderator_id IS NOT NULL THEN
    UPDATE public.profiles SET
      mod_rulings_total = mod_rulings_total + 1
    WHERE id = v_debate.moderator_id;
  END IF;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'reference_ruled',
    p_user_id    := CASE WHEN p_ruled_by_type = 'human' THEN v_user_id ELSE NULL END,
    p_debate_id  := v_ref.debate_id,
    p_category   := v_debate.category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'ruling', p_ruling,
      'ruled_by_type', p_ruled_by_type,
      'reason', COALESCE(p_reason, ''),
      'reference_id', p_reference_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'ruling', p_ruling,
    'debate_id', v_ref.debate_id,
    'unpaused', true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.run_daily_snapshot()
 RETURNS integer
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_date DATE := CURRENT_DATE;
  v_count INTEGER := 0;
BEGIN
  -- Total users
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'total_users', (SELECT COUNT(*) FROM profiles WHERE deleted_at IS NULL))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Total debates
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'total_debates', (SELECT COUNT(*) FROM arena_debates WHERE status = 'complete'))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Total auto_debate votes
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'total_auto_votes', (SELECT COALESCE(SUM(vote_count), 0) FROM auto_debates))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Total moderator rulings
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'total_mod_rulings', (SELECT COUNT(*) FROM debate_references WHERE ruling != 'pending'))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Active moderators
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'active_moderators', (SELECT COUNT(*) FROM profiles WHERE is_moderator = true AND mod_available = true))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Events today
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'events_today', (SELECT COUNT(*) FROM event_log WHERE created_at::DATE = v_date))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Per-category debate counts
  INSERT INTO daily_snapshots (snapshot_date, category, metric, value)
  SELECT v_date, category, 'debates_today', COUNT(*)
  FROM event_log
  WHERE event_type IN ('debate_created', 'auto_debate_created')
    AND created_at::DATE = v_date
    AND category IS NOT NULL
  GROUP BY category
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sanitize_text(p_input text)
 RETURNS text
 LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v_clean TEXT;
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;

  v_clean := p_input;

  -- Strip <script> tags and content
  v_clean := regexp_replace(v_clean, '<script[^>]*>.*?</script>', '', 'gi');

  -- Strip <iframe>, <object>, <embed>, <form>, <input> tags
  v_clean := regexp_replace(v_clean, '<(iframe|object|embed|form|input|textarea|button|select|link|meta|base|applet)[^>]*>.*?</\1>', '', 'gi');
  v_clean := regexp_replace(v_clean, '<(iframe|object|embed|form|input|textarea|button|select|link|meta|base|applet)[^>]*/?\s*>', '', 'gi');

  -- Strip all remaining HTML tags (keep text content)
  v_clean := regexp_replace(v_clean, '<[^>]+>', '', 'g');

  -- Strip javascript: and data: URI schemes
  v_clean := regexp_replace(v_clean, 'javascript\s*:', '', 'gi');
  v_clean := regexp_replace(v_clean, 'data\s*:\s*text/html', '', 'gi');
  v_clean := regexp_replace(v_clean, 'vbscript\s*:', '', 'gi');

  -- Strip on* event handlers (onerror=, onclick=, etc.)
  v_clean := regexp_replace(v_clean, '\bon\w+\s*=', '', 'gi');

  -- Encode remaining dangerous characters
  v_clean := replace(v_clean, '&', '&amp;');
  v_clean := replace(v_clean, '<', '&lt;');
  v_clean := replace(v_clean, '>', '&gt;');

  -- Trim whitespace
  v_clean := trim(v_clean);

  RETURN v_clean;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sanitize_url(p_input text)
 RETURNS text
 LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;

  -- Must start with https:// or http://
  IF NOT (p_input ~* '^https?://') THEN
    RETURN NULL;  -- reject non-http URLs entirely
  END IF;

  -- Block javascript: inside URLs (encoded variants too)
  IF p_input ~* 'javascript' OR p_input ~* 'data:' OR p_input ~* 'vbscript' THEN
    RETURN NULL;
  END IF;

  -- Basic length check
  IF char_length(p_input) > 2000 THEN
    RETURN NULL;
  END IF;

  RETURN p_input;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_ai_scorecard(p_debate_id uuid, p_scorecard jsonb)
 RETURNS void
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.save_profile_depth(p_section_id text, p_answers jsonb)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_current JSONB;
  v_merged JSONB;
  v_total_sections INTEGER := 20;
  v_completed INTEGER;
  v_pct INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get current answers or empty
  SELECT COALESCE(answers, '{}'::JSONB) INTO v_current
  FROM public.profile_depth_answers
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    v_current := '{}'::JSONB;
  END IF;

  -- Merge new answers under section key
  v_merged := v_current || jsonb_build_object(p_section_id, p_answers);

  -- Upsert
  INSERT INTO public.profile_depth_answers (user_id, answers, updated_at)
  VALUES (v_user_id, v_merged, now())
  ON CONFLICT (user_id)
  DO UPDATE SET answers = v_merged, updated_at = now();

  -- Calculate completion %
  v_completed := (SELECT COUNT(DISTINCT key) FROM jsonb_each(v_merged));
  v_pct := LEAST(100, ROUND(v_completed::NUMERIC / v_total_sections * 100));

  -- Update profile depth percentage
  UPDATE public.profiles
  SET profile_depth_pct = v_pct,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'section', p_section_id,
    'completion_pct', v_pct,
    'sections_completed', v_completed
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_user_settings(p_notif_challenge boolean DEFAULT true, p_notif_debate boolean DEFAULT true, p_notif_follow boolean DEFAULT true, p_notif_reactions boolean DEFAULT true, p_audio_sfx boolean DEFAULT true, p_audio_mute boolean DEFAULT false, p_privacy_public boolean DEFAULT true, p_privacy_online boolean DEFAULT true, p_privacy_challenges boolean DEFAULT true)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  -- Must be logged in
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Upsert: insert if no row, update if exists
  INSERT INTO user_settings (
    user_id,
    notif_challenge,
    notif_debate,
    notif_follow,
    notif_reactions,
    audio_sfx,
    audio_mute,
    privacy_public,
    privacy_online,
    privacy_challenges
  ) VALUES (
    v_uid,
    p_notif_challenge,
    p_notif_debate,
    p_notif_follow,
    p_notif_reactions,
    p_audio_sfx,
    p_audio_mute,
    p_privacy_public,
    p_privacy_online,
    p_privacy_challenges
  )
  ON CONFLICT (user_id) DO UPDATE SET
    notif_challenge   = EXCLUDED.notif_challenge,
    notif_debate      = EXCLUDED.notif_debate,
    notif_follow      = EXCLUDED.notif_follow,
    notif_reactions   = EXCLUDED.notif_reactions,
    audio_sfx         = EXCLUDED.audio_sfx,
    audio_mute        = EXCLUDED.audio_mute,
    privacy_public    = EXCLUDED.privacy_public,
    privacy_online    = EXCLUDED.privacy_online,
    privacy_challenges = EXCLUDED.privacy_challenges;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.score_debate_comment(p_debate_id uuid, p_feed_event_id bigint, p_score integer)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.score_moderator(p_debate_id uuid, p_score integer)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_role TEXT;
  v_total_score NUMERIC;
  v_total_count INTEGER;
  v_new_approval NUMERIC;
BEGIN
  SELECT * INTO v_debate FROM public.arena_debates WHERE id = p_debate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status != 'completed' THEN
    RAISE EXCEPTION 'Debate must be completed before scoring moderator';
  END IF;
  IF v_debate.moderator_id IS NULL THEN
    RAISE EXCEPTION 'No moderator assigned to this debate';
  END IF;
  IF v_user_id = v_debate.moderator_id THEN
    RAISE EXCEPTION 'Moderator cannot score themselves';
  END IF;

  IF v_user_id IN (v_debate.debater_a, v_debate.debater_b) THEN
    v_role := 'debater';
    IF p_score NOT IN (0, 25) THEN
      RAISE EXCEPTION 'Debater score must be 0 (not happy) or 25 (happy)';
    END IF;
  ELSE
    v_role := 'spectator';
    IF p_score < 1 OR p_score > 50 THEN
      RAISE EXCEPTION 'Spectator score must be between 1 and 50';
    END IF;
  END IF;

  INSERT INTO public.moderator_scores (debate_id, moderator_id, scorer_id, scorer_role, score)
  VALUES (p_debate_id, v_debate.moderator_id, v_user_id, v_role, p_score);

  SELECT
    AVG(CASE
      WHEN scorer_role = 'debater' THEN score * 2.0
      WHEN scorer_role = 'spectator' THEN score * 2.0
    END),
    COUNT(*)
  INTO v_total_score, v_total_count
  FROM public.moderator_scores
  WHERE moderator_id = v_debate.moderator_id;

  v_new_approval := COALESCE(v_total_score, 50.0);

  UPDATE public.profiles SET
    mod_approval_pct = ROUND(v_new_approval, 2)
  WHERE id = v_debate.moderator_id;

  PERFORM log_event(
    p_event_type := 'moderator_scored',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'scorer_role', v_role,
      'score', p_score,
      'new_approval', ROUND(v_new_approval, 2),
      'moderator_id', v_debate.moderator_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'role', v_role,
    'score', p_score,
    'new_approval', ROUND(v_new_approval, 2)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_users_by_username(p_query text)
 RETURNS TABLE(id uuid, username text, display_name text, elo_rating integer)
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.id, p.username, p.display_name, COALESCE(p.elo_rating, 1200)::int
  FROM profiles p
  WHERE p.username ILIKE p_query || '%'
    AND p.id != auth.uid()
  ORDER BY p.username
  LIMIT 10;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_spectator_chat(p_debate_id uuid, p_message text)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_display_name text;
  v_avatar_url text;
  v_last_sent timestamptz;
  v_trimmed text;
  v_debate_status text;
BEGIN
  -- Auth check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
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

CREATE OR REPLACE FUNCTION public.set_profile_dob(p_dob date)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_existing DATE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT date_of_birth INTO v_existing FROM profiles WHERE id = v_uid;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Date of birth already set');
  END IF;

  UPDATE profiles
  SET date_of_birth = p_dob,
      is_minor = (now() - p_dob) < interval '18 years'
  WHERE id = v_uid;

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.settle_stakes(p_debate_id uuid, p_winner text, p_multiplier numeric DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_pool stake_pools%ROWTYPE;
  v_debate RECORD;
  v_db_winner text;
  v_total numeric;
  v_winning_total numeric;
  -- SESSION 230 FIX (P2-1): p_multiplier is IGNORED. Hardcoded to 1.
  -- Previously: v_effective_multiplier numeric := GREATEST(COALESCE(p_multiplier, 1), 1);
  -- An attacker could pass p_multiplier: 999999 for infinite token payout.
  v_effective_multiplier numeric := 1;
  v_stake RECORD;
  v_payout numeric;
  v_caller_payout numeric := 0;
  v_topic text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 1. Lock the pool row to prevent concurrent settlement
  SELECT * INTO v_pool
  FROM stake_pools
  WHERE debate_id = p_debate_id
  FOR UPDATE;

  IF v_pool IS NULL THEN
    RETURN jsonb_build_object('success', true, 'payout', 0, 'message', 'No stake pool');
  END IF;

  -- 2. If already settled, return caller's existing payout
  IF v_pool.status = 'settled' THEN
    SELECT COALESCE(s.payout, 0) INTO v_caller_payout
    FROM stakes s
    WHERE s.debate_id = p_debate_id AND s.user_id = v_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'payout', COALESCE(v_caller_payout, 0),
      'message', 'Already settled'
    );
  END IF;

  -- 3. Read authoritative winner from arena_debates (NOT from client param)
  SELECT status, winner, topic
  INTO v_debate
  FROM arena_debates
  WHERE id = p_debate_id;

  IF v_debate IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Debate not found');
  END IF;

  IF v_debate.status != 'complete' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Debate not yet complete');
  END IF;

  v_db_winner := v_debate.winner;
  IF v_db_winner IS NULL OR v_db_winner NOT IN ('a', 'b', 'draw') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No winner determined yet');
  END IF;

  v_topic := COALESCE(LEFT(v_debate.topic, 80), 'a debate');

  -- 4. Calculate pool totals
  v_total := v_pool.total_side_a + v_pool.total_side_b;
  IF v_db_winner = 'draw' THEN
    v_winning_total := 0;  -- draws refund everyone
  ELSE
    v_winning_total := CASE WHEN v_db_winner = 'a' THEN v_pool.total_side_a ELSE v_pool.total_side_b END;
  END IF;

  -- 5. Loop through ALL stakes and settle each one
  FOR v_stake IN
    SELECT * FROM stakes
    WHERE debate_id = p_debate_id AND (settled_at IS NULL OR payout IS NULL)
    FOR UPDATE
  LOOP
    IF v_db_winner = 'draw' THEN
      -- Draw: refund original stake
      v_payout := v_stake.amount;
      UPDATE profiles SET token_balance = token_balance + v_stake.amount WHERE id = v_stake.user_id;
    ELSIF v_stake.side = v_db_winner AND v_winning_total > 0 THEN
      -- Winner: parimutuel payout (multiplier is always 1 now)
      v_payout := FLOOR((v_stake.amount::numeric / v_winning_total) * v_total);
      v_payout := FLOOR(v_payout * v_effective_multiplier);
      -- Credit net gain (payout minus original stake which was already deducted)
      UPDATE profiles SET token_balance = token_balance + (v_payout - v_stake.amount) WHERE id = v_stake.user_id;
    ELSE
      -- Loser: stake already deducted, record negative payout
      v_payout := -v_stake.amount;
    END IF;

    -- Mark stake as settled
    UPDATE stakes SET payout = v_payout, settled_at = now() WHERE id = v_stake.id;

    -- Track caller's payout for return value
    IF v_stake.user_id = v_user_id THEN
      v_caller_payout := v_payout;
    END IF;

    -- Notify staker
    IF v_payout > 0 THEN
      PERFORM _notify_user(
        v_stake.user_id,
        'stake_won',
        '🪙 Stake Won!',
        format('You won %s tokens on "%s"', v_payout, v_topic),
        jsonb_build_object('debate_id', p_debate_id, 'payout', v_payout)
      );
    ELSIF v_payout < 0 THEN
      PERFORM _notify_user(
        v_stake.user_id,
        'stake_lost',
        '💸 Stake Lost',
        format('You lost %s tokens on "%s"', ABS(v_payout), v_topic),
        jsonb_build_object('debate_id', p_debate_id, 'payout', v_payout)
      );
    END IF;
  END LOOP;

  -- 6. Mark pool as settled with DB-authoritative winner
  UPDATE stake_pools
  SET status = 'settled', settled_at = now(), winner = v_db_winner
  WHERE id = v_pool.id;

  RETURN jsonb_build_object('success', true, 'payout', v_caller_payout);
END;
$function$;

CREATE OR REPLACE FUNCTION public.soft_delete_account()
 RETURNS void
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE profiles
  SET deleted_at = now(),
      username = 'deleted_' || substr(gen_random_uuid()::text, 1, 8),
      display_name = 'Deleted User',
      avatar_url = NULL,
      bio = ''
  WHERE id = auth.uid()
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found or already deleted';
  END IF;
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

CREATE OR REPLACE FUNCTION public.submit_reference(p_debate_id uuid, p_content text, p_reference_type text DEFAULT 'url'::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_count INTEGER;
  v_cost INTEGER;
  v_balance INTEGER;
  v_clean TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE LOG 'SECURITY|auth_failure|anonymous|submit_reference|unauthenticated reference submit';
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF length(p_content) > 500 THEN
    RAISE EXCEPTION 'Reference content too long (max 500 characters)';
  END IF;
  IF length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Reference content cannot be empty';
  END IF;

  v_clean := trim(p_content);
  IF p_reference_type = 'url' THEN
    IF v_clean !~ '^https?://' THEN
      RAISE EXCEPTION 'URL must start with http:// or https://';
    END IF;
    v_clean := regexp_replace(v_clean, '<[^>]*>', '', 'g');
  ELSE
    v_clean := regexp_replace(v_clean, '<[^>]*>', '', 'g');
  END IF;

  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status != 'live' THEN
    RAISE EXCEPTION 'Debate is not live';
  END IF;
  IF v_user_id NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE LOG 'SECURITY|access_denied|%|submit_reference|non-debater submitting evidence debate=%', v_user_id, p_debate_id;
    RAISE EXCEPTION 'Only debaters can submit references';
  END IF;
  IF v_debate.is_paused THEN
    RAISE EXCEPTION 'Debate is already paused for evidence review';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.debate_references
  WHERE debate_id = p_debate_id
    AND submitted_by = v_user_id
    AND round_number = v_debate.current_round;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 references per round reached';
  END IF;

  v_cost := CASE v_count
    WHEN 0 THEN 0
    WHEN 1 THEN 5
    WHEN 2 THEN 15
    WHEN 3 THEN 35
    WHEN 4 THEN 50
  END;

  IF v_cost > 0 THEN
    SELECT token_balance INTO v_balance FROM public.profiles WHERE id = v_user_id;
    IF v_balance < v_cost THEN
      RAISE EXCEPTION 'Not enough tokens (need %, have %)', v_cost, v_balance;
    END IF;
    UPDATE public.profiles SET token_balance = token_balance - v_cost WHERE id = v_user_id;
  END IF;

  INSERT INTO public.debate_references (
    debate_id, submitted_by, round_number,
    reference_type, content, token_cost, sequence_in_round
  ) VALUES (
    p_debate_id, v_user_id, v_debate.current_round,
    p_reference_type, v_clean, v_cost, v_count + 1
  );

  UPDATE public.debates
  SET is_paused = true, paused_at = now(), updated_at = now()
  WHERE id = p_debate_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'reference_submitted',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'type', p_reference_type,
      'sequence', v_count + 1,
      'cost', v_cost,
      'round', v_debate.current_round
    )
  );

  RETURN json_build_object(
    'success', true,
    'sequence', v_count + 1,
    'cost', v_cost,
    'remaining_balance', CASE WHEN v_cost > 0
      THEN v_balance - v_cost
      ELSE (SELECT token_balance FROM public.profiles WHERE id = v_user_id)
    END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_report(p_reported_user_id uuid DEFAULT NULL::uuid, p_debate_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT ''::text, p_details text DEFAULT ''::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_clean_reason TEXT;
  v_clean_details TEXT;
  v_report_id UUID;
  v_allowed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_reported_user_id IS NULL AND p_debate_id IS NULL THEN
    RAISE EXCEPTION 'Must specify a user or debate to report';
  END IF;

  -- Sanitize
  v_clean_reason := sanitize_text(p_reason);
  v_clean_details := sanitize_text(p_details);

  IF char_length(v_clean_reason) < 3 THEN
    RAISE EXCEPTION 'Reason is required';
  END IF;

  IF p_reported_user_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot report yourself';
  END IF;

  -- Rate limit: 5 reports per hour
  v_allowed := check_rate_limit(v_user_id, 'report', 60, 5);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit: max 5 reports per hour';
  END IF;

  INSERT INTO public.reports (reporter_id, reported_user_id, debate_id, reason, details)
  VALUES (v_user_id, p_reported_user_id, p_debate_id, v_clean_reason, v_clean_details)
  RETURNING id INTO v_report_id;

  RETURN json_build_object('success', true, 'report_id', v_report_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_mod_available(p_available boolean)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_mod BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT is_moderator INTO v_is_mod FROM public.profiles WHERE id = v_user_id;
  IF NOT v_is_mod THEN
    RAISE EXCEPTION 'Not a moderator';
  END IF;

  UPDATE public.profiles SET
    mod_available = p_available,
    updated_at = now()
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'mod_available', p_available);
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_moderator_status(p_enabled boolean)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles SET
    is_moderator = p_enabled,
    mod_available = CASE WHEN p_enabled THEN mod_available ELSE false END,
    updated_at = now()
  WHERE id = v_user_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := CASE WHEN p_enabled THEN 'moderator_opted_in' ELSE 'moderator_opted_out' END,
    p_user_id    := v_user_id,
    p_metadata   := jsonb_build_object('enabled', p_enabled)
  );

  RETURN json_build_object('success', true, 'is_moderator', p_enabled);
END;
$function$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unban_group_member(p_group_id uuid, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_caller_id;

  IF public.group_role_rank(v_caller_role) < 3 THEN
    RAISE EXCEPTION 'Insufficient permissions: only co-leaders and above can unban';
  END IF;

  DELETE FROM public.group_bans
  WHERE group_id = p_group_id AND user_id = p_user_id;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.unequip_cosmetic(p_cosmetic_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_cosmetics
  SET equipped = false
  WHERE user_id = v_user_id AND cosmetic_id = p_cosmetic_id;

  RETURN json_build_object('success', true, 'unequipped', p_cosmetic_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.unfollow_user(p_target_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.follows
  WHERE follower_id = v_user_id AND following_id = p_target_user_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'unfollow',
    p_user_id    := v_user_id,
    p_debate_id  := NULL,
    p_category   := NULL,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('target_user_id', p_target_user_id)
  );

  RETURN json_build_object('success', true, 'unfollowed', p_target_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_arena_debate(p_debate_id uuid, p_status text DEFAULT NULL::text, p_current_round integer DEFAULT NULL::integer, p_winner text DEFAULT NULL::text, p_score_a integer DEFAULT NULL::integer, p_score_b integer DEFAULT NULL::integer)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.update_mod_categories(p_categories text[])
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  UPDATE public.profiles SET
    mod_categories = p_categories,
    updated_at = now()
  WHERE id = v_user_id
    AND is_moderator = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a moderator';
  END IF;

  RETURN json_build_object('success', true, 'categories', p_categories);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_profile(p_display_name text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text, p_bio text DEFAULT NULL::text, p_username text DEFAULT NULL::text, p_preferred_language text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_clean_name TEXT;
  v_clean_bio TEXT;
  v_clean_url TEXT;
  v_clean_username TEXT;
  v_clean_lang TEXT;
  v_allowed BOOLEAN;
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

  v_clean_name := sanitize_text(p_display_name);
  v_clean_bio := sanitize_text(p_bio);
  v_clean_url := sanitize_url(p_avatar_url);
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
    username = COALESCE(v_clean_username, username),
    display_name = COALESCE(v_clean_name, display_name),
    avatar_url = COALESCE(v_clean_url, avatar_url),
    bio = COALESCE(v_clean_bio, bio),
    preferred_language = COALESCE(v_clean_lang, preferred_language),
    updated_at = now()
  WHERE id = v_user_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'profile_updated',
    p_user_id    := v_user_id,
    p_debate_id  := NULL,
    p_category   := NULL,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'changed_name', p_display_name IS NOT NULL,
      'changed_bio', p_bio IS NOT NULL,
      'changed_avatar', p_avatar_url IS NOT NULL,
      'changed_username', p_username IS NOT NULL,
      'changed_language', p_preferred_language IS NOT NULL
    )
  );

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_profile(p_display_name text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text, p_bio text DEFAULT NULL::text, p_username text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_clean_name TEXT;
  v_clean_bio TEXT;
  v_clean_url TEXT;
  v_clean_username TEXT;
  v_allowed BOOLEAN;
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

  v_clean_name := sanitize_text(p_display_name);
  v_clean_bio := sanitize_text(p_bio);
  v_clean_url := sanitize_url(p_avatar_url);
  v_clean_username := p_username;

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
    username = COALESCE(v_clean_username, username),
    display_name = COALESCE(v_clean_name, display_name),
    avatar_url = COALESCE(v_clean_url, avatar_url),
    bio = COALESCE(v_clean_bio, bio),
    updated_at = now()
  WHERE id = v_user_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'profile_updated',
    p_user_id    := v_user_id,
    p_debate_id  := NULL,
    p_category   := NULL,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'changed_name', p_display_name IS NOT NULL,
      'changed_bio', p_bio IS NOT NULL,
      'changed_avatar', p_avatar_url IS NOT NULL,
      'changed_username', p_username IS NOT NULL
    )
  );

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_reaction_count()
 RETURNS trigger
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.hot_takes SET reaction_count = reaction_count + 1 WHERE id = NEW.hot_take_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.hot_takes SET reaction_count = GREATEST(0, reaction_count - 1) WHERE id = OLD.hot_take_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_settings(p_notif_challenges boolean DEFAULT NULL::boolean, p_notif_results boolean DEFAULT NULL::boolean, p_notif_reactions boolean DEFAULT NULL::boolean, p_notif_follows boolean DEFAULT NULL::boolean, p_privacy_public_profile boolean DEFAULT NULL::boolean, p_privacy_debate_history boolean DEFAULT NULL::boolean, p_privacy_allow_challenges boolean DEFAULT NULL::boolean, p_audio_auto_mute boolean DEFAULT NULL::boolean, p_audio_effects boolean DEFAULT NULL::boolean)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_settings (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_settings
  SET notif_challenges = COALESCE(p_notif_challenges, notif_challenges),
      notif_results = COALESCE(p_notif_results, notif_results),
      notif_reactions = COALESCE(p_notif_reactions, notif_reactions),
      notif_follows = COALESCE(p_notif_follows, notif_follows),
      privacy_public_profile = COALESCE(p_privacy_public_profile, privacy_public_profile),
      privacy_debate_history = COALESCE(p_privacy_debate_history, privacy_debate_history),
      privacy_allow_challenges = COALESCE(p_privacy_allow_challenges, privacy_allow_challenges),
      audio_auto_mute = COALESCE(p_audio_auto_mute, audio_auto_mute),
      audio_effects = COALESCE(p_audio_effects, audio_effects),
      updated_at = now()
  WHERE user_id = v_user_id;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_reference(p_reference_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_voter_id      uuid;
  v_ref           record;
  v_voter_type    text;
  v_vote_value    numeric;
  v_is_clan       boolean := false;
  v_is_rival      boolean := false;
  v_new_points    numeric;
  v_new_power     integer;
BEGIN
  -- Auth check
  v_voter_id := auth.uid();
  IF v_voter_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the reference
  SELECT * INTO v_ref
    FROM public.arsenal_references
    WHERE id = p_reference_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;

  -- Cannot verify your own reference
  IF v_ref.user_id = v_voter_id THEN
    RAISE EXCEPTION 'Cannot verify your own reference';
  END IF;

  -- Check if voter already voted (unique constraint will also catch this)
  IF EXISTS (
    SELECT 1 FROM public.reference_verifications
    WHERE reference_id = p_reference_id AND voter_id = v_voter_id
  ) THEN
    RAISE EXCEPTION 'Already verified this reference';
  END IF;

  -- Determine voter_type:
  -- 1. Check if voter and ref owner share a group (clan = 0.5)
  v_is_clan := EXISTS (
    SELECT 1
    FROM public.group_members gm1
    JOIN public.group_members gm2
      ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = v_voter_id
      AND gm2.user_id = v_ref.user_id
  );

  -- 2. Check if voter is a rival of ref owner (rival = 2.0)
  v_is_rival := EXISTS (
    SELECT 1
    FROM public.rivals
    WHERE (challenger_id = v_voter_id AND target_id = v_ref.user_id)
       OR (challenger_id = v_ref.user_id AND target_id = v_voter_id)
  );

  -- Priority: rival > clan > outside
  -- A rival who is also in your clan still counts as rival (strongest signal wins)
  IF v_is_rival THEN
    v_voter_type := 'rival';
    v_vote_value := 2.0;
  ELSIF v_is_clan THEN
    v_voter_type := 'clan';
    v_vote_value := 0.5;
  ELSE
    v_voter_type := 'outside';
    v_vote_value := 1.0;
  END IF;

  -- Insert vote
  INSERT INTO public.reference_verifications (
    reference_id, voter_id, voter_type, vote_value
  ) VALUES (
    p_reference_id, v_voter_id, v_voter_type, v_vote_value
  );

  -- Update verification_points and recalculate power
  v_new_points := v_ref.verification_points + v_vote_value;
  v_new_power  := _calc_reference_power(v_ref.source_type, v_ref.power_ceiling, v_new_points);

  -- Cap power at ceiling
  IF v_new_power > v_ref.power_ceiling THEN
    v_new_power := v_ref.power_ceiling;
  END IF;

  UPDATE public.arsenal_references
    SET verification_points = v_new_points,
        current_power       = v_new_power
    WHERE id = p_reference_id;

  RETURN jsonb_build_object(
    'voter_type', v_voter_type,
    'vote_value', v_vote_value,
    'new_points', v_new_points,
    'new_power', v_new_power,
    'power_ceiling', v_ref.power_ceiling
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.view_auto_debate(p_debate_id uuid)
 RETURNS void
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE auto_debates SET view_count = view_count + 1 WHERE id = p_debate_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vote_arena_debate(p_debate_id uuid, p_vote text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_debate RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_vote NOT IN ('a', 'b') THEN RAISE EXCEPTION 'Invalid vote'; END IF;

  -- FIX: block participants from voting in their own debate
  SELECT debater_a, debater_b INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Debate not found'; END IF;
  IF v_uid IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Cannot vote in your own debate';
  END IF;

  INSERT INTO arena_votes (debate_id, user_id, vote) VALUES (p_debate_id, v_uid, p_vote)
  ON CONFLICT (debate_id, user_id) DO UPDATE SET vote = p_vote;

  -- Update cached counts
  UPDATE arena_debates SET
    vote_count_a = (SELECT count(*) FROM arena_votes WHERE debate_id = p_debate_id AND vote = 'a'),
    vote_count_b = (SELECT count(*) FROM arena_votes WHERE debate_id = p_debate_id AND vote = 'b')
  WHERE id = p_debate_id;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.vote_async_debate(p_debate_id uuid, p_voted_for text)
 RETURNS json
 LANGUAGE plpgsql
SECURITY DEFINER
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
