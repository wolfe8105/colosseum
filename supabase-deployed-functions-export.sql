-- ============================================================================
-- SUPABASE FUNCTION EXPORT: Functions deployed but missing from version control
-- Generated: 2026-03-31
-- Source: pg_get_functiondef() dump from production Supabase
-- 
-- PURPOSE: This file captures the 91 functions that existed only in deployed
-- Supabase with no version control. This is a point-in-time snapshot.
-- All future changes to these functions MUST be made in this file first,
-- then deployed to Supabase — not the other way around.
--
-- CATEGORIES:
--   Token/Staking: claim_daily_login, claim_action_tokens, claim_debate_tokens,
--                  claim_milestone, get_my_milestones, get_my_token_summary,
--                  place_stake, settle_stakes, get_stake_pool
--   Profile/Settings: save_user_settings, increment_questions_answered,
--                     set_profile_dob, soft_delete_account, toggle_moderator_status,
--                     toggle_mod_available, update_mod_categories
--   Groups (14): discover_groups, get_my_groups, get_group_leaderboard,
--                get_group_details, get_group_members, create_group, join_group,
--                leave_group, create_group_challenge, respond_to_group_challenge,
--                get_group_challenges, promote_group_member, kick_group_member,
--                ban_group_member
--   Landing: cast_landing_vote, get_landing_votes, get_landing_vote_counts
--   References: challenge_reference, cite_reference, edit_reference,
--               forge_reference, get_debate_references, get_reference_library,
--               verify_reference
--   Challenges: create_challenge, get_challenge_preview, get_pending_challenges
--   Cosmetics/Power-ups: get_cosmetic_catalog, get_my_cosmetics, get_public_cosmetics,
--                        grant_cosmetic, auto_grant_depth_cosmetics, activate_power_up,
--                        buy_power_up, equip_power_up, get_my_power_ups,
--                        get_my_arsenal, get_opponent_power_ups
--   Spectators: bump_spectator_count, get_arena_debate_spectator,
--               get_spectator_chat, send_spectator_chat
--   Moderator: browse_mod_queue, get_available_moderators, get_debate_mod_status,
--              get_mod_profile, request_mod_for_debate, request_to_moderate,
--              respond_to_mod_request
--   Social: get_follow_counts, get_my_rivals, get_public_profile, is_following,
--           search_users_by_username
--   Predictions: get_debate_predictions, get_hot_predictions,
--                get_prediction_questions, create_prediction_question, pick_prediction
--   Private Lobbies: create_private_lobby, check_private_lobby, join_private_lobby,
--                    cancel_private_lobby
--   Auto Debates: cast_auto_debate_vote, view_auto_debate
--   Config: get_app_config, get_category_counts
--   Internal helpers: _calc_reference_power, _notify_user, _source_type_ceiling,
--                     group_role_rank, check_ranked_eligible
-- ============================================================================


-- --------------------------------------------------------
-- _calc_reference_power
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- _notify_user
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public._notify_user(p_user_id uuid, p_type text, p_title text, p_body text DEFAULT NULL::text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data);
END;
$function$
;


-- --------------------------------------------------------
-- _source_type_ceiling
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- activate_power_up
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- auto_grant_depth_cosmetics
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_grant_depth_cosmetics()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- ban_group_member
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- browse_mod_queue
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- bump_spectator_count
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- buy_power_up
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.buy_power_up(p_power_up_id text, p_quantity integer DEFAULT 1)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- cancel_private_lobby
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- cast_auto_debate_vote
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cast_auto_debate_vote(p_debate_id uuid, p_fingerprint text, p_voted_for text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- cast_landing_vote
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cast_landing_vote(p_topic text, p_side text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- cast_landing_vote
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- challenge_reference
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.challenge_reference(p_reference_id uuid, p_debate_id uuid, p_ruling text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- check_private_lobby
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_private_lobby(p_debate_id uuid)
 RETURNS TABLE(status text, opponent_id uuid, opponent_name text, opponent_elo integer, player_b_ready boolean, total_rounds integer)
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
      COALESCE(v_debate.total_rounds, 4);
  ELSE
    RETURN QUERY
    SELECT
      v_debate.status,
      v_debate.debater_b,
      COALESCE(p.display_name, p.username, 'Opponent')::text,
      COALESCE(p.elo_rating, 1200)::int,
      v_debate.player_b_ready,
      COALESCE(v_debate.total_rounds, 4)
    FROM profiles p WHERE p.id = v_debate.debater_b;
  END IF;
END;
$function$
;


-- --------------------------------------------------------
-- check_ranked_eligible
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- cite_reference
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cite_reference(p_reference_id uuid, p_debate_id uuid, p_outcome text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- claim_action_tokens
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- claim_daily_login
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- claim_debate_tokens
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- claim_milestone
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- create_challenge
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- create_group
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- create_group_challenge
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_group_challenge(p_challenger_group_id uuid, p_defender_group_id uuid, p_topic text, p_category text DEFAULT 'miscellaneous'::text, p_format text DEFAULT '1v1'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- create_prediction_question
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- create_private_lobby
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_private_lobby(p_mode text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_visibility text DEFAULT 'private'::text, p_invited_user_id uuid DEFAULT NULL::uuid, p_group_id uuid DEFAULT NULL::uuid, p_ruleset text DEFAULT 'amplified'::text, p_total_rounds int DEFAULT 4)
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
$function$
;


-- --------------------------------------------------------
-- create_private_lobby
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- discover_groups
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- edit_reference
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- equip_power_up
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.equip_power_up(p_debate_id uuid, p_power_up_id text, p_slot_number integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- forge_reference
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.forge_reference(p_claim text, p_url text, p_author text, p_publication_year integer, p_source_type text, p_category text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- get_app_config
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_app_config()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT jsonb_object_agg(key, value) FROM app_config;
$function$
;


-- --------------------------------------------------------
-- get_arena_debate_spectator
-- --------------------------------------------------------
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
    'is_ranked', ad.format,
    'created_at', ad.created_at,
    'started_at', ad.started_at,
    'ended_at', ad.ended_at,
    'debater_a_name', COALESCE(pa.display_name, pa.username, 'Side A'),
    'debater_a_elo', COALESCE(pa.elo_rating, 1200),
    'debater_a_avatar', pa.avatar_url,
    'debater_b_name', COALESCE(pb.display_name, pb.username, 'Side B'),
    'debater_b_elo', COALESCE(pb.elo_rating, 1200),
    'debater_b_avatar', pb.avatar_url
  ) INTO v_result
  FROM arena_debates ad
    LEFT JOIN profiles pa ON pa.id = ad.debater_a
    LEFT JOIN profiles pb ON pb.id = ad.debater_b
  WHERE ad.id = p_debate_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  RETURN v_result;
END;
$function$
;


-- --------------------------------------------------------
-- get_available_moderators
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_category_counts
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_category_counts()
 RETURNS TABLE(section text, live_debates bigint, hot_takes bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
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
$function$
;


-- --------------------------------------------------------
-- get_challenge_preview
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_challenge_preview(p_join_code text)
 RETURNS TABLE(debate_id uuid, topic text, category text, mode text, status text, challenger_username text, challenger_display_name text, challenger_elo integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- get_cosmetic_catalog
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cosmetic_catalog()
 RETURNS TABLE(cosmetic_id uuid, name text, category text, tier integer, unlock_type text, token_cost integer, depth_threshold numeric, unlock_condition text, asset_url text, sort_order integer, owned boolean, equipped boolean, acquired_via text, metadata jsonb)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- get_debate_mod_status
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_debate_predictions
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_debate_predictions(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
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
$function$
;


-- --------------------------------------------------------
-- get_debate_references
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_follow_counts
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_follow_counts(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN json_build_object(
    'followers', (SELECT count(*) FROM follows WHERE following_id = p_user_id),
    'following', (SELECT count(*) FROM follows WHERE follower_id = p_user_id)
  );
END;
$function$
;


-- --------------------------------------------------------
-- get_group_challenges
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_group_challenges(p_group_id uuid, p_status text DEFAULT NULL::text, p_limit integer DEFAULT 20)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- get_group_details
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_group_leaderboard
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_group_members
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_group_members(p_group_id uuid, p_limit integer DEFAULT 50)
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
$function$
;


-- --------------------------------------------------------
-- get_hot_predictions
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_landing_vote_counts
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_landing_votes
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_landing_votes(p_topics text[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- get_mod_profile
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_my_arsenal
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_arsenal()
 RETURNS SETOF arsenal_references
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- get_my_cosmetics
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_cosmetics()
 RETURNS TABLE(cosmetic_id uuid, name text, category text, tier integer, unlock_type text, token_cost integer, depth_threshold numeric, unlock_condition text, asset_url text, sort_order integer, acquired_via text, equipped boolean, metadata jsonb, acquired_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- get_my_groups
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_my_milestones
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_my_power_ups
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_power_ups(p_debate_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- get_my_rivals
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_my_token_summary
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_opponent_power_ups
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_pending_challenges
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_prediction_questions
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- get_public_cosmetics
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_cosmetics(p_user_id uuid)
 RETURNS TABLE(cosmetic_id uuid, name text, category text, tier integer, asset_url text, acquired_via text, metadata jsonb, acquired_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- get_public_profile
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
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
$function$
;


-- --------------------------------------------------------
-- get_reference_library
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_reference_library()
 RETURNS SETOF arsenal_references
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- get_spectator_chat
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_spectator_chat(p_debate_id uuid, p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, user_id uuid, display_name text, avatar_url text, message text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- get_stake_pool
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_stake_pool(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- grant_cosmetic
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_cosmetic(p_user_id uuid, p_cosmetic_id uuid, p_acquired_via text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item     cosmetic_items%ROWTYPE;
  v_existing UUID;
BEGIN
  SELECT * INTO v_item FROM cosmetic_items WHERE id = p_cosmetic_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'item_not_found');
  END IF;

  SELECT id INTO v_existing
    FROM user_cosmetics
   WHERE user_id = p_user_id AND cosmetic_id = p_cosmetic_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'already_owned', true);
  END IF;

  INSERT INTO user_cosmetics (user_id, cosmetic_id, acquired_via)
  VALUES (p_user_id, p_cosmetic_id, p_acquired_via);

  RETURN jsonb_build_object(
    'success',       true,
    'already_owned', false,
    'item_name',     v_item.name,
    'category',      v_item.category
  );
END;
$function$
;


-- --------------------------------------------------------
-- group_role_rank
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- increment_questions_answered
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_questions_answered(p_count integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- is_following
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_following(p_target_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = p_target_id
  );
END;
$function$
;


-- --------------------------------------------------------
-- join_group
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- join_private_lobby
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_private_lobby(p_debate_id uuid DEFAULT NULL::uuid, p_join_code text DEFAULT NULL::text)
 RETURNS TABLE(debate_id uuid, status text, topic text, mode text, opponent_name text, opponent_id uuid, opponent_elo integer, ruleset text, total_rounds integer)
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

  -- Atomic claim — second concurrent joiner gets zero rows and fails
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
    COALESCE(v_debate.total_rounds, 4);
END;
$function$
;


-- --------------------------------------------------------
-- kick_group_member
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- leave_group
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- pick_prediction
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- place_stake
-- --------------------------------------------------------
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

  -- 4. Get user tier info
  SELECT questions_answered, token_balance
  INTO v_questions, v_balance
  FROM profiles
  WHERE id = v_uid;

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

  -- 8. Check token balance
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

  -- 12. Deduct tokens
  UPDATE profiles
  SET token_balance = token_balance - p_amount
  WHERE id = v_uid;

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
    'new_balance', v_balance - p_amount,
    'tier', v_tier_name,
    'stake_cap', v_stake_cap
  );
END;
$function$
;


-- --------------------------------------------------------
-- promote_group_member
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- request_mod_for_debate
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- request_to_moderate
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- resolve_group_challenge
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_group_challenge(p_challenge_id uuid, p_winner_group_id uuid, p_debate_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_challenge RECORD;
  v_loser_group_id UUID;
  v_winner_elo INT;
  v_loser_elo INT;
  v_k INT := 32;
  v_expected FLOAT;
  v_delta INT;
BEGIN
  -- Fetch challenge
  SELECT * INTO v_challenge
  FROM group_challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Challenge not found');
  END IF;

  IF v_challenge.status != 'accepted' AND v_challenge.status != 'live' THEN
    RETURN json_build_object('error', 'Challenge must be accepted or live to resolve');
  END IF;

  -- Validate winner is one of the two groups
  IF p_winner_group_id != v_challenge.challenger_group_id
     AND p_winner_group_id != v_challenge.defender_group_id THEN
    RETURN json_build_object('error', 'Winner must be one of the challenge groups');
  END IF;

  -- Determine loser
  IF p_winner_group_id = v_challenge.challenger_group_id THEN
    v_loser_group_id := v_challenge.defender_group_id;
  ELSE
    v_loser_group_id := v_challenge.challenger_group_id;
  END IF;

  -- Get current Elo ratings (default 1200 if NULL)
  SELECT COALESCE(group_elo, 1200) INTO v_winner_elo FROM groups WHERE id = p_winner_group_id;
  SELECT COALESCE(group_elo, 1200) INTO v_loser_elo  FROM groups WHERE id = v_loser_group_id;

  -- Elo calculation
  v_expected := 1.0 / (1.0 + POWER(10, (v_loser_elo - v_winner_elo)::FLOAT / 400));
  v_delta := ROUND(v_k * (1 - v_expected));
  IF v_delta < 1 THEN v_delta := 1; END IF;

  -- Update group Elo
  UPDATE groups SET group_elo = COALESCE(group_elo, 1200) + v_delta WHERE id = p_winner_group_id;
  UPDATE groups SET group_elo = GREATEST(COALESCE(group_elo, 1200) - v_delta, 100) WHERE id = v_loser_group_id;

  -- Mark challenge complete
  UPDATE group_challenges
  SET status = 'completed',
      winner_group_id = p_winner_group_id,
      debate_id = p_debate_id,
      completed_at = NOW()
  WHERE id = p_challenge_id;

  RETURN json_build_object(
    'success', true,
    'winner_elo_change', v_delta,
    'loser_elo_change', -v_delta
  );
END;
$function$
;


-- --------------------------------------------------------
-- respond_to_group_challenge
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_to_group_challenge(p_challenge_id uuid, p_action text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_challenge RECORD;
  v_is_member BOOLEAN;
BEGIN
  -- Auth check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Validate action
  IF p_action NOT IN ('accept', 'decline') THEN
    RETURN json_build_object('error', 'Action must be accept or decline');
  END IF;

  -- Fetch challenge
  SELECT * INTO v_challenge
  FROM group_challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Challenge not found');
  END IF;

  -- Must be pending and not expired
  IF v_challenge.status != 'pending' THEN
    RETURN json_build_object('error', 'Challenge is no longer pending');
  END IF;

  IF v_challenge.expires_at < NOW() THEN
    -- Auto-expire
    UPDATE group_challenges SET status = 'expired' WHERE id = p_challenge_id;
    RETURN json_build_object('error', 'Challenge has expired');
  END IF;

  -- Must be member of defender group
  SELECT EXISTS(
    SELECT 1 FROM group_members
    WHERE group_id = v_challenge.defender_group_id AND user_id = v_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN json_build_object('error', 'You must be a member of the defending group');
  END IF;

  -- Apply action
  UPDATE group_challenges
  SET status = CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'declined' END,
      responded_at = NOW()
  WHERE id = p_challenge_id;

  RETURN json_build_object('success', true, 'status', CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'declined' END);
END;
$function$
;


-- --------------------------------------------------------
-- respond_to_mod_request
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- save_user_settings
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_user_settings(p_notif_challenge boolean DEFAULT true, p_notif_debate boolean DEFAULT true, p_notif_follow boolean DEFAULT true, p_notif_reactions boolean DEFAULT true, p_audio_sfx boolean DEFAULT true, p_audio_mute boolean DEFAULT false, p_privacy_public boolean DEFAULT true, p_privacy_online boolean DEFAULT true, p_privacy_challenges boolean DEFAULT true)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- search_users_by_username
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- send_spectator_chat
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_spectator_chat(p_debate_id uuid, p_message text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- set_profile_dob
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_profile_dob(p_dob date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- settle_stakes
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_stakes(p_debate_id uuid, p_winner text, p_multiplier numeric DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_pool stake_pools%ROWTYPE;
  v_stake stakes%ROWTYPE;
  v_total numeric;
  v_winning_total numeric;
  v_payout numeric := 0;
  v_effective_multiplier numeric := GREATEST(p_multiplier, 1);
  v_topic text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_pool FROM stake_pools WHERE debate_id = p_debate_id;
  IF v_pool IS NULL THEN
    RETURN jsonb_build_object('success', true, 'payout', 0, 'message', 'No stake pool');
  END IF;

  IF v_pool.status = 'settled' THEN
    RETURN jsonb_build_object('success', true, 'payout', 0, 'message', 'Already settled');
  END IF;

  SELECT * INTO v_stake FROM stakes WHERE debate_id = p_debate_id AND user_id = v_user_id;
  IF v_stake IS NULL THEN
    UPDATE stake_pools SET status = 'settled', settled_at = now(), winner = p_winner WHERE id = v_pool.id;
    RETURN jsonb_build_object('success', true, 'payout', 0, 'message', 'No stake placed');
  END IF;

  v_total := v_pool.total_side_a + v_pool.total_side_b;
  v_winning_total := CASE WHEN p_winner = 'a' THEN v_pool.total_side_a ELSE v_pool.total_side_b END;

  IF v_stake.side = p_winner AND v_winning_total > 0 THEN
    v_payout := FLOOR((v_stake.amount::numeric / v_winning_total) * v_total);
    v_payout := FLOOR(v_payout * v_effective_multiplier);
  ELSE
    v_payout := -v_stake.amount;
  END IF;

  IF v_payout > 0 THEN
    UPDATE profiles SET token_balance = token_balance + (v_payout - v_stake.amount) WHERE id = v_user_id;
  END IF;

  UPDATE stakes SET payout = v_payout, settled_at = now() WHERE id = v_stake.id;
  UPDATE stake_pools SET status = 'settled', settled_at = now(), winner = p_winner WHERE id = v_pool.id;

  -- SESSION 120: Notify staker of result
  SELECT topic INTO v_topic FROM arena_debates WHERE id = p_debate_id;
  v_topic := COALESCE(LEFT(v_topic, 80), 'a debate');

  IF v_payout > 0 THEN
    PERFORM _notify_user(
      v_user_id,
      'stake_won',
      '🪙 Stake Won!',
      format('You won %s tokens on "%s"', v_payout, v_topic),
      jsonb_build_object('debate_id', p_debate_id, 'payout', v_payout)
    );
  ELSIF v_payout < 0 THEN
    PERFORM _notify_user(
      v_user_id,
      'stake_lost',
      '💸 Stake Lost',
      format('You lost %s tokens on "%s"', ABS(v_payout), v_topic),
      jsonb_build_object('debate_id', p_debate_id, 'payout', v_payout)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'payout', v_payout);
END;
$function$
;


-- --------------------------------------------------------
-- soft_delete_account
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.soft_delete_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- toggle_mod_available
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- toggle_moderator_status
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- unban_group_member
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- update_group_elo
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_group_elo(p_user_id uuid, p_delta integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_group_id UUID;
BEGIN
  -- Find the user's primary group (the one they joined first)
  SELECT group_id INTO v_group_id
  FROM public.group_members
  WHERE user_id = p_user_id
  ORDER BY joined_at ASC
  LIMIT 1;

  IF v_group_id IS NOT NULL THEN
    UPDATE public.groups
    SET elo_rating = GREATEST(0, elo_rating + p_delta),
        updated_at = now()
    WHERE id = v_group_id;
  END IF;
END;
$function$
;


-- --------------------------------------------------------
-- update_mod_categories
-- --------------------------------------------------------
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
$function$
;


-- --------------------------------------------------------
-- verify_reference
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_reference(p_reference_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;


-- --------------------------------------------------------
-- view_auto_debate
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.view_auto_debate(p_debate_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE auto_debates SET view_count = view_count + 1 WHERE id = p_debate_id;
END;
$function$
;

