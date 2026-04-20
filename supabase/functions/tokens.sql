-- THE MODERATOR — Deployed Functions Export
-- Auto-generated from Supabase production database
-- Last updated: Session 252 (April 9, 2026) — F-55 Reference System Overhaul landed
--
-- This file is the source of truth for what RPCs are live in production.
-- Re-export after any session that modifies RPCs.

-- Domain: tokens

-- Functions: 11

-- Auto-generated from supabase-deployed-functions-export.sql


CREATE OR REPLACE FUNCTION public.buy_power_up(p_power_up_id text, p_quantity integer DEFAULT 1)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.claim_action_tokens(p_action text, p_reference_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.claim_daily_tokens()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.credit_tokens(p_user_id uuid, p_amount integer, p_reason text DEFAULT 'purchase'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.earn_tokens(p_reason text, p_reference_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.get_my_power_ups(p_debate_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.get_my_token_summary()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.pay_reference_royalties(p_debate_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_debate        RECORD;
  v_winner_id     UUID;
  v_cite          RECORD;
  v_base_rate     NUMERIC(6,2);
  v_status_mult   NUMERIC(6,2);
  v_win_mult      NUMERIC(6,2);
  v_amount        NUMERIC(6,2);
  v_total_by_forger JSONB := '{}'::JSONB;
  v_forger_id     UUID;
  v_forger_total  NUMERIC(6,2);
  v_paid_count    INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  -- Load debate
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RETURN jsonb_build_object('action', 'error', 'message', 'Debate not found');
  END IF;

  -- Skip null/abandoned/tech_failure debates — zero royalties
  IF v_debate.status IN ('nulled', 'abandoned', 'tech_failure') THEN
    RETURN jsonb_build_object(
      'action', 'skipped',
      'reason', 'Debate status is ' || v_debate.status
    );
  END IF;

  -- Determine winner
  IF v_debate.winner = 'a' THEN
    v_winner_id := v_debate.debater_a;
  ELSIF v_debate.winner = 'b' THEN
    v_winner_id := v_debate.debater_b;
  ELSE
    v_winner_id := NULL; -- draw
  END IF;

  -- Iterate through all cited references in this debate
  FOR v_cite IN
    SELECT
      drl.reference_id,
      drl.user_id AS citer_user_id,
      drl.rarity_at_cite,
      ar.user_id AS forger_user_id,
      ar.source_title AS ref_name,
      ar.challenge_status,
      ar.deleted_at
    FROM debate_reference_loadouts drl
    JOIN arsenal_references ar ON ar.id = drl.reference_id
    WHERE drl.debate_id = p_debate_id
      AND drl.cited = true
  LOOP
    -- Skip self-cites (no royalty if forger = citer)
    IF v_cite.forger_user_id = v_cite.citer_user_id THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Skip deleted-ref royalties (tokens burn to platform)
    IF v_cite.deleted_at IS NOT NULL THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Base royalty from tiered schedule by rarity at cite time
    CASE COALESCE(v_cite.rarity_at_cite, 'common')
      WHEN 'common'    THEN v_base_rate := 0.1;
      WHEN 'uncommon'  THEN v_base_rate := 0.25;
      WHEN 'rare'      THEN v_base_rate := 0.5;
      WHEN 'legendary' THEN v_base_rate := 1.0;
      WHEN 'mythic'    THEN v_base_rate := 2.0;
      ELSE v_base_rate := 0.1;
    END CASE;

    -- Disputed modifiers
    CASE v_cite.challenge_status
      WHEN 'disputed'         THEN v_status_mult := 0.75;
      WHEN 'heavily_disputed' THEN v_status_mult := 0.25;
      WHEN 'frozen'           THEN v_status_mult := 0.0;
      ELSE v_status_mult := 1.0;
    END CASE;

    -- Win bonus x2 if citer won
    IF v_winner_id IS NOT NULL AND v_cite.citer_user_id = v_winner_id THEN
      v_win_mult := 2.0;
    ELSE
      v_win_mult := 1.0;
    END IF;

    -- Calculate and round UP to nearest 0.1
    v_amount := v_base_rate * v_status_mult * v_win_mult;
    v_amount := CEILING(v_amount * 10) / 10.0;

    -- Skip zero payouts (e.g., frozen refs)
    IF v_amount <= 0 THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Insert per-cite log row (B2B granularity)
    INSERT INTO reference_royalty_log (
      forger_user_id, citer_user_id, reference_id, debate_id,
      reference_name, rarity_at_cite, base_royalty,
      win_bonus_applied, citer_won_debate, final_payout
    ) VALUES (
      v_cite.forger_user_id, v_cite.citer_user_id, v_cite.reference_id, p_debate_id,
      v_cite.ref_name, COALESCE(v_cite.rarity_at_cite, 'common'), v_base_rate,
      (v_win_mult > 1.0), (v_winner_id IS NOT NULL AND v_cite.citer_user_id = v_winner_id),
      v_amount
    );

    -- Accumulate per-forger total for batched UPDATE
    IF v_total_by_forger ? v_cite.forger_user_id::TEXT THEN
      v_total_by_forger := jsonb_set(
        v_total_by_forger,
        ARRAY[v_cite.forger_user_id::TEXT],
        to_jsonb((v_total_by_forger->>v_cite.forger_user_id::TEXT)::NUMERIC + v_amount)
      );
    ELSE
      v_total_by_forger := jsonb_set(
        v_total_by_forger,
        ARRAY[v_cite.forger_user_id::TEXT],
        to_jsonb(v_amount)
      );
    END IF;

    v_paid_count := v_paid_count + 1;
  END LOOP;

  -- Batched payout: one UPDATE per forger
  FOR v_forger_id, v_forger_total IN
    SELECT key::UUID, value::NUMERIC(6,2)
    FROM jsonb_each_text(v_total_by_forger)
  LOOP
    -- Credit tokens (round to integer for token_balance)
    UPDATE profiles
    SET token_balance = token_balance + CEIL(v_forger_total)::INTEGER
    WHERE id = v_forger_id;

    -- Log transaction
    INSERT INTO token_transactions (user_id, amount, type, source, balance_after)
    VALUES (v_forger_id, CEIL(v_forger_total)::INTEGER, 'earn', 'reference_royalty',
            (SELECT token_balance FROM profiles WHERE id = v_forger_id));
  END LOOP;

  -- Analytics
  PERFORM log_event(
    p_event_type := 'reference_royalties_paid',
    p_debate_id := p_debate_id,
    p_metadata := jsonb_build_object(
      'paid_count', v_paid_count,
      'skipped_count', v_skipped_count,
      'forger_count', jsonb_object_keys_count(v_total_by_forger)
    )
  );

  RETURN jsonb_build_object(
    'action', 'paid',
    'cites_paid', v_paid_count,
    'cites_skipped', v_skipped_count
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.purge_old_stripe_events()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  DELETE FROM stripe_processed_events
  WHERE processed_at < NOW() - INTERVAL '7 days';
END;

$function$;
