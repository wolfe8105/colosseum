-- THE MODERATOR — Deployed Functions Export
-- Auto-generated from Supabase production database
-- Last updated: Session 252 (April 9, 2026) — F-55 Reference System Overhaul landed
--
-- This file is the source of truth for what RPCs are live in production.
-- Re-export after any session that modifies RPCs.

-- Domain: predictions

-- Functions: 9

-- Auto-generated from supabase-deployed-functions-export.sql


CREATE OR REPLACE FUNCTION public.create_prediction_question(p_topic text, p_side_a_label text DEFAULT 'Yes'::text, p_side_b_label text DEFAULT 'No'::text, p_category text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.get_debate_predictions(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.get_hot_predictions(p_limit integer DEFAULT 10)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.get_prediction_questions(p_limit integer DEFAULT 20, p_category text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.get_stake_pool(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.pick_prediction(p_question_id uuid, p_pick text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.place_prediction(p_debate_id uuid, p_predicted_winner text, p_amount integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.settle_stakes(p_debate_id uuid, p_winner text, p_multiplier numeric DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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
