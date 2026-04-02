-- SESSION 227: Fix place_prediction type mismatch
-- Problem: S226 changed p_predicted_winner to UUID, but table column is TEXT ('a'/'b'),
--          finalize_debate uses TEXT, and client sends TEXT. Every prediction silently fails.
-- Fix: Revert param to TEXT, validate against ('a','b'), keep all S226 security fixes.

-- Drop the UUID-typed version
DROP FUNCTION IF EXISTS place_prediction(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION place_prediction(
  p_debate_id UUID,
  p_predicted_winner TEXT,
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
$$;
