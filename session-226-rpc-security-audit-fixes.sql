-- ============================================================
-- SESSION 226: RPC SECURITY AUDIT FIXES
-- Date: April 2, 2026
-- Source: ECON-BUG-1 audit findings
--
-- 9 fixes + 1 schema constraint. Run in Supabase SQL Editor.
-- Each fix is independent — safe to run as one batch.
-- ============================================================


-- ============================================================
-- PRE-STEP: Drop functions whose return types may have changed.
-- CREATE OR REPLACE cannot change return types — must drop first.
-- ============================================================

DROP FUNCTION IF EXISTS credit_tokens(uuid, integer, text);
DROP FUNCTION IF EXISTS debit_tokens(uuid, integer, text);
DROP FUNCTION IF EXISTS finalize_debate(uuid);
DROP FUNCTION IF EXISTS claim_daily_tokens();
DROP FUNCTION IF EXISTS earn_tokens(text, uuid);
DROP FUNCTION IF EXISTS purchase_cosmetic(uuid);
DROP FUNCTION IF EXISTS place_prediction(uuid, uuid, integer);
DROP FUNCTION IF EXISTS vote_arena_debate(uuid, text);


-- ============================================================
-- FIX 0: SCHEMA — token_balance cannot go negative
-- Defense-in-depth. Catches any race condition or negative-amount
-- bug across ALL functions, present and future.
-- ============================================================

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS token_balance_non_negative;

ALTER TABLE public.profiles
  ADD CONSTRAINT token_balance_non_negative CHECK (token_balance >= 0);


-- ============================================================
-- FIX 1: credit_tokens — reject p_amount <= 0
-- Was: no validation on p_amount. Negative amount = stealth debit.
-- Now: rejects <= 0.
-- ============================================================

CREATE OR REPLACE FUNCTION credit_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'purchase'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ============================================================
-- FIX 2: debit_tokens — CRITICAL
-- Was: no auth check. Any user can debit any other user.
--      Negative p_amount = free tokens.
-- Now: caller must be the target user or service_role.
--      Rejects p_amount <= 0.
-- ============================================================

CREATE OR REPLACE FUNCTION debit_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'spend'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ============================================================
-- FIX 3: finalize_debate — restrict to participants or service_role
-- Was: any authenticated user can finalize any debate.
-- Now: must be debater_a, debater_b, or service_role.
-- ============================================================

CREATE OR REPLACE FUNCTION finalize_debate(p_debate_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ============================================================
-- FIX 4: claim_daily_tokens — prevent double-claim race condition
-- Was: SELECT then UPDATE with no row lock. Two simultaneous
--      calls could both pass the "already claimed?" check.
-- Now: FOR UPDATE on profile row serializes concurrent calls.
-- ============================================================

CREATE OR REPLACE FUNCTION claim_daily_tokens()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ============================================================
-- FIX 5: earn_tokens — prevent daily cap race + duplicate claims
-- Was: no row lock on daily cap check. No duplicate check on
--      reference_id, so client can call earn_tokens('debate_win',
--      same_debate_id) repeatedly up to the daily cap.
-- Now: FOR UPDATE on profile row + duplicate reference_id check.
-- ============================================================

CREATE OR REPLACE FUNCTION earn_tokens(
  p_reason TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ============================================================
-- FIX 6: purchase_cosmetic — prevent balance race condition
-- Was: SELECT profile then check balance then UPDATE. Two
--      simultaneous purchases could both pass the balance check.
-- Now: FOR UPDATE on profile row.
-- ============================================================

CREATE OR REPLACE FUNCTION purchase_cosmetic(p_cosmetic_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ============================================================
-- FIX 7: place_prediction — refund old wager on prediction update
-- Was: ON CONFLICT DO UPDATE overwrites prediction but charges
--      full new amount without refunding the old wager. User
--      loses tokens on every prediction change.
-- Now: checks for existing prediction, refunds old amount,
--      then charges new amount (or just the delta).
-- ============================================================

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
  v_allowed BOOLEAN;
  v_existing RECORD;
  v_net_charge INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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

  IF p_predicted_winner NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Invalid prediction target';
  END IF;

  -- Lock balance
  SELECT token_balance INTO v_balance FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- FIX: check for existing prediction and calculate net charge
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
$$;


-- ============================================================
-- FIX 8: vote_arena_debate — block debaters from voting in own debate
-- Was: any authenticated user can vote, including participants.
-- Now: checks caller is not debater_a or debater_b.
-- ============================================================

CREATE OR REPLACE FUNCTION vote_arena_debate(p_debate_id uuid, p_vote text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;
