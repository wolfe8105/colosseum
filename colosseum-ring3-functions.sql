-- ============================================================
-- THE COLOSSEUM — Ring 3: Platform Data Integrity
-- Items: 14.1.2.1, 14.1.2.2, 14.3.4
-- Paste into Supabase SQL Editor AFTER colosseum-schema-production.sql
-- ============================================================

-- ========================
-- ELO CALCULATION (pure function)
-- K-factor scales by experience: new players shift faster
-- ========================
CREATE OR REPLACE FUNCTION calculate_elo(
  rating_a INTEGER,
  rating_b INTEGER,
  winner TEXT,  -- 'a', 'b', or 'draw'
  debates_a INTEGER DEFAULT 0,
  debates_b INTEGER DEFAULT 0
)
RETURNS TABLE(new_rating_a INTEGER, new_rating_b INTEGER, change_a INTEGER, change_b INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ========================
-- CAST VOTE (server-side, one vote per user per round)
-- Returns the updated vote totals
-- ========================
CREATE OR REPLACE FUNCTION cast_vote(
  p_debate_id UUID,
  p_voted_for TEXT,  -- 'a' or 'b'
  p_round INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_votes_a INTEGER;
  v_votes_b INTEGER;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate vote
  IF p_voted_for NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'Invalid vote: must be a or b';
  END IF;

  -- Get debate and verify it's active
  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status NOT IN ('live', 'voting') THEN
    RAISE EXCEPTION 'Debate is not accepting votes';
  END IF;

  -- Can't vote in your own debate
  IF v_user_id IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Cannot vote in your own debate';
  END IF;

  -- Insert vote (unique constraint prevents duplicates per round)
  INSERT INTO public.debate_votes (debate_id, user_id, voted_for, round_number)
  VALUES (p_debate_id, v_user_id, p_voted_for, COALESCE(p_round, v_debate.current_round))
  ON CONFLICT (debate_id, user_id, round_number) DO UPDATE
  SET voted_for = p_voted_for, voted_at = now();

  -- Tally votes for current state
  SELECT
    COUNT(*) FILTER (WHERE voted_for = 'a'),
    COUNT(*) FILTER (WHERE voted_for = 'b')
  INTO v_votes_a, v_votes_b
  FROM public.debate_votes
  WHERE debate_id = p_debate_id;

  -- Update debate totals
  UPDATE public.debates
  SET votes_a = v_votes_a, votes_b = v_votes_b
  WHERE id = p_debate_id;

  RETURN json_build_object(
    'success', true,
    'votes_a', v_votes_a,
    'votes_b', v_votes_b,
    'your_vote', p_voted_for
  );
END;
$$;


-- ========================
-- CREATE DEBATE (server-side)
-- ========================
CREATE OR REPLACE FUNCTION create_debate(
  p_topic TEXT,
  p_category TEXT DEFAULT 'general',
  p_format TEXT DEFAULT 'standard',
  p_opponent_id UUID DEFAULT NULL,
  p_side TEXT DEFAULT 'a'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.debates (
    topic, category, format,
    debater_a, debater_b,
    status, current_round
  ) VALUES (
    p_topic, p_category, p_format,
    CASE WHEN p_side = 'a' THEN v_user_id ELSE p_opponent_id END,
    CASE WHEN p_side = 'b' THEN v_user_id ELSE p_opponent_id END,
    CASE WHEN p_opponent_id IS NOT NULL THEN 'matched' ELSE 'waiting' END,
    0
  )
  RETURNING id INTO v_debate_id;

  RETURN v_debate_id;
END;
$$;


-- ========================
-- JOIN DEBATE (match into a waiting debate)
-- ========================
CREATE OR REPLACE FUNCTION join_debate(p_debate_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ========================
-- START DEBATE (transition from matched to live)
-- ========================
CREATE OR REPLACE FUNCTION start_debate(p_debate_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ========================
-- ADVANCE ROUND
-- ========================
CREATE OR REPLACE FUNCTION advance_round(p_debate_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
BEGIN
  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id;

  IF v_debate.status != 'live' THEN
    RAISE EXCEPTION 'Debate is not live';
  END IF;
  IF v_user_id NOT IN (v_debate.debater_a, v_debate.debater_b, v_debate.moderator_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_debate.current_round >= v_debate.total_rounds THEN
    -- Move to voting phase
    UPDATE public.debates
    SET status = 'voting', updated_at = now()
    WHERE id = p_debate_id;

    RETURN json_build_object('success', true, 'status', 'voting', 'round', v_debate.current_round);
  ELSE
    UPDATE public.debates
    SET current_round = current_round + 1, updated_at = now()
    WHERE id = p_debate_id;

    RETURN json_build_object('success', true, 'status', 'live', 'round', v_debate.current_round + 1);
  END IF;
END;
$$;


-- ========================
-- FINALIZE DEBATE
-- Counts votes, determines winner, calculates Elo, updates profiles
-- This is the big one — all integrity logic in one transaction
-- ========================
CREATE OR REPLACE FUNCTION finalize_debate(p_debate_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
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
  -- Lock the debate row
  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
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
  UPDATE public.debates SET
    status = 'completed',
    winner_id = v_winner_id,
    votes_a = v_votes_a,
    votes_b = v_votes_b,
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
    result = CASE
      WHEN predicted_winner = v_winner_id THEN 'correct'
      WHEN v_winner = 'draw' THEN 'draw'
      ELSE 'incorrect'
    END,
    payout = CASE
      WHEN predicted_winner = v_winner_id THEN ROUND(amount * 1.8)
      WHEN v_winner = 'draw' THEN amount  -- refund on draw
      ELSE 0
    END
  WHERE debate_id = p_debate_id AND result = 'pending';

  -- Pay out prediction winners
  UPDATE public.profiles p SET
    token_balance = token_balance + pred.payout
  FROM public.predictions pred
  WHERE pred.debate_id = p_debate_id
    AND pred.user_id = p.id
    AND pred.result = 'correct';

  -- Refund draws
  UPDATE public.profiles p SET
    token_balance = token_balance + pred.payout
  FROM public.predictions pred
  WHERE pred.debate_id = p_debate_id
    AND pred.user_id = p.id
    AND pred.result = 'draw';

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
$$;


-- ========================
-- PLACE PREDICTION (token wager on debate outcome)
-- ========================
CREATE OR REPLACE FUNCTION place_prediction(
  p_debate_id UUID,
  p_predicted_winner UUID,
  p_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance INTEGER;
  v_debate RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount < 1 OR p_amount > 500 THEN
    RAISE EXCEPTION 'Prediction amount must be 1-500 tokens';
  END IF;

  -- Check debate is eligible
  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id;
  IF NOT FOUND OR v_debate.status NOT IN ('waiting', 'matched', 'live') THEN
    RAISE EXCEPTION 'Debate not accepting predictions';
  END IF;

  -- Can't predict your own debate
  IF v_user_id IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Cannot predict your own debate';
  END IF;

  -- Predicted winner must be a participant
  IF p_predicted_winner NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Invalid prediction target';
  END IF;

  -- Check and deduct balance
  SELECT token_balance INTO v_balance FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient tokens';
  END IF;

  UPDATE public.profiles
  SET token_balance = token_balance - p_amount
  WHERE id = v_user_id;

  -- Record prediction
  INSERT INTO public.predictions (debate_id, user_id, predicted_winner, amount)
  VALUES (p_debate_id, v_user_id, p_predicted_winner, p_amount)
  ON CONFLICT (debate_id, user_id) DO UPDATE
  SET predicted_winner = p_predicted_winner, amount = p_amount;

  -- Record token transaction
  INSERT INTO public.token_transactions (user_id, amount, type, description, reference_id)
  VALUES (v_user_id, -p_amount, 'prediction', 'Prediction on debate', p_debate_id);

  RETURN json_build_object('success', true, 'amount', p_amount, 'new_balance', v_balance - p_amount);
END;
$$;


-- ========================
-- GET LIVE DEBATES (for home screen)
-- ========================
CREATE OR REPLACE FUNCTION get_live_debates(p_category TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 10)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ========================
-- GET LEADERBOARD (server-side, indexed)
-- ========================
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_sort_by TEXT DEFAULT 'elo',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
      WHERE account_standing = 'good'
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
$$;


-- ========================
-- CREDIT TOKENS (called by Stripe webhook)
-- Atomically adds tokens and logs transaction
-- ========================
CREATE OR REPLACE FUNCTION credit_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'purchase'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Update balance atomically
  UPDATE profiles
  SET token_balance = token_balance + p_amount,
      updated_at = now()
  WHERE id = p_user_id
  RETURNING token_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Log transaction
  INSERT INTO token_transactions (user_id, amount, type, source, balance_after)
  VALUES (p_user_id, p_amount, 'purchase', p_reason, v_new_balance);

  RETURN json_build_object(
    'success', true,
    'credited', p_amount,
    'new_balance', v_new_balance
  );
END;
$$;


-- ========================
-- DEBIT TOKENS (for spending: predictions, cosmetics, etc.)
-- ========================
CREATE OR REPLACE FUNCTION debit_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'spend'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Check balance
  SELECT token_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient tokens', 'balance', v_current_balance);
  END IF;

  -- Debit atomically
  UPDATE profiles
  SET token_balance = token_balance - p_amount,
      updated_at = now()
  WHERE id = p_user_id AND token_balance >= p_amount
  RETURNING token_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Race condition — retry');
  END IF;

  -- Log transaction
  INSERT INTO token_transactions (user_id, amount, type, source, balance_after)
  VALUES (p_user_id, -p_amount, 'spend', p_reason, v_new_balance);

  RETURN json_build_object(
    'success', true,
    'debited', p_amount,
    'new_balance', v_new_balance
  );
END;
$$;
