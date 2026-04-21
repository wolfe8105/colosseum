-- ============================================================
-- F-63: Spectator participation gate (25% depth)
-- Session 295 | April 21, 2026
--
-- WHAT: Adds server-side profile_depth_pct >= 25 check to three
--       spectator-action RPCs: cast_sentiment_tip, place_stake,
--       send_spectator_chat.
-- WHY:  Sub-25% depth users can currently tip, stake, and chat
--       by calling RPCs directly, bypassing any client gate.
--       Closes dataset poisoning vector.
-- RISK: Zero for existing active users (anyone who tips/stakes
--       already has significant profile depth). New low-depth
--       users get a clear error + client-side prompt to complete
--       their profile.
-- ============================================================


-- ── 1. cast_sentiment_tip — add depth gate after auth ────────

CREATE OR REPLACE FUNCTION public.cast_sentiment_tip(
  p_debate_id UUID,
  p_side      TEXT,
  p_amount    INT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid            UUID := auth.uid();
  v_debate         arena_debates%ROWTYPE;
  v_watch_count    BIGINT;
  v_tier           TEXT;
  v_balance        INT;
  v_new_total_a    BIGINT;
  v_new_total_b    BIGINT;
  v_gauge_delta    INT;
  v_debater_this_side UUID;
  v_has_cp         BOOLEAN := FALSE;
  v_depth_pct      INT;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- ── F-63: Spectator participation depth gate ──────────────
  SELECT COALESCE(profile_depth_pct, 0) INTO v_depth_pct FROM profiles WHERE id = v_uid;
  IF v_depth_pct < 25 THEN
    RETURN jsonb_build_object('error', 'profile_incomplete', 'profile_pct', v_depth_pct);
  END IF;
  -- ──────────────────────────────────────────────────────────

  -- Validate side
  IF p_side NOT IN ('a', 'b') THEN
    RETURN jsonb_build_object('error', 'invalid_side');
  END IF;

  -- Validate amount
  IF p_amount < 2 THEN
    RETURN jsonb_build_object('error', 'amount_too_low');
  END IF;

  -- Get debate with row lock
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'debate_not_found');
  END IF;

  -- Must be live
  IF v_debate.status != 'live' THEN
    RETURN jsonb_build_object('error', 'debate_not_live');
  END IF;

  -- Human-vs-human only (no AI sparring)
  IF v_debate.mode = 'ai' THEN
    RETURN jsonb_build_object('error', 'ai_debate_not_eligible');
  END IF;

  -- Cap check (1B per side)
  IF p_side = 'a' AND (v_debate.sentiment_total_a + p_amount) > 1000000000 THEN
    RETURN jsonb_build_object('error', 'cap_exceeded');
  END IF;
  IF p_side = 'b' AND (v_debate.sentiment_total_b + p_amount) > 1000000000 THEN
    RETURN jsonb_build_object('error', 'cap_exceeded');
  END IF;

  -- Derive watch tier
  SELECT COUNT(*) INTO v_watch_count FROM debate_watches WHERE user_id = v_uid;
  IF v_watch_count = 0 THEN
    v_tier := 'Unranked';
  ELSIF v_watch_count BETWEEN 1 AND 4 THEN
    v_tier := 'Observer';
  ELSIF v_watch_count BETWEEN 5 AND 14 THEN
    v_tier := 'Fan';
  ELSIF v_watch_count BETWEEN 15 AND 49 THEN
    v_tier := 'Analyst';
  ELSE
    v_tier := 'Insider';
  END IF;

  -- Reject Unranked
  IF v_tier = 'Unranked' THEN
    RETURN jsonb_build_object('error', 'unranked_blocked', 'tier', v_tier, 'watch_count', v_watch_count);
  END IF;

  -- Atomic token debit
  UPDATE profiles
  SET    token_balance = token_balance - p_amount
  WHERE  id = v_uid
    AND  token_balance >= p_amount
  RETURNING token_balance INTO v_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'insufficient_tokens');
  END IF;

  -- Insert tip row (amount = original cost, unchanged)
  INSERT INTO sentiment_tips(debate_id, user_id, side, amount)
  VALUES (p_debate_id, v_uid, p_side, p_amount);

  -- ── F-57 crowd_pleaser: 1.5× gauge move for this side ──
  v_debater_this_side := CASE p_side WHEN 'a' THEN v_debate.debater_a ELSE v_debate.debater_b END;
  v_has_cp := _has_eod_effect(p_debate_id, v_debater_this_side, 'crowd_pleaser');
  v_gauge_delta := CASE WHEN v_has_cp THEN CEIL(p_amount * 1.5)::INT ELSE p_amount END;

  -- Update arena_debates totals (gauge uses v_gauge_delta)
  IF p_side = 'a' THEN
    UPDATE arena_debates
    SET    sentiment_total_a = sentiment_total_a + v_gauge_delta
    WHERE  id = p_debate_id
    RETURNING sentiment_total_a, sentiment_total_b
    INTO   v_new_total_a, v_new_total_b;
  ELSE
    UPDATE arena_debates
    SET    sentiment_total_b = sentiment_total_b + v_gauge_delta
    WHERE  id = p_debate_id
    RETURNING sentiment_total_a, sentiment_total_b
    INTO   v_new_total_a, v_new_total_b;
  END IF;

  -- Feed event
  PERFORM insert_feed_event(
    p_debate_id   := p_debate_id,
    p_event_type  := 'sentiment_tip',
    p_round       := NULL,
    p_side        := p_side,
    p_content     := p_amount || ' tokens → ' || upper(p_side),
    p_score       := NULL,
    p_reference_id := NULL,
    p_metadata    := jsonb_build_object(
      'amount',         p_amount,
      'gauge_delta',    v_gauge_delta,
      'crowd_pleaser',  v_has_cp,
      'tier',           v_tier
    )
  );

  RETURN jsonb_build_object(
    'success',     true,
    'new_total_a', v_new_total_a,
    'new_total_b', v_new_total_b,
    'new_balance', v_balance
  );
END;
$$;


-- ── 2. send_spectator_chat — add depth gate after auth ───────

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

  -- ── F-63: Spectator participation depth gate ──────────────
  SELECT COALESCE(profile_depth_pct, 0) INTO v_depth_pct FROM profiles WHERE id = v_user_id;
  IF v_depth_pct < 25 THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_incomplete', 'profile_pct', v_depth_pct);
  END IF;
  -- ──────────────────────────────────────────────────────────

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


-- ── 3. place_stake — add depth gate after auth ───────────────

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
  v_depth_pct INTEGER;
BEGIN
  -- 1. Auth check
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- ── F-63: Spectator participation depth gate ──────────────
  SELECT COALESCE(profile_depth_pct, 0) INTO v_depth_pct FROM profiles WHERE id = v_uid;
  IF v_depth_pct < 25 THEN
    RETURN json_build_object('success', false, 'error', 'profile_incomplete', 'profile_pct', v_depth_pct);
  END IF;
  -- ──────────────────────────────────────────────────────────

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

  IF v_debate_status NOT IN ('pending', 'live') THEN
    RETURN json_build_object('success', false, 'error', 'Staking closed for this debate');
  END IF;

  -- 10. Check for existing stake (one stake per user per debate)
  SELECT id INTO v_existing_stake
  FROM stakes
  WHERE debate_id = p_debate_id AND user_id = v_uid;

  IF v_existing_stake IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Already staked on this debate');
  END IF;

  -- 11. Ensure pool exists (upsert)
  INSERT INTO stake_pools (debate_id)
  VALUES (p_debate_id)
  ON CONFLICT (debate_id) DO NOTHING
  RETURNING id INTO v_pool_id;

  IF v_pool_id IS NULL THEN
    SELECT id INTO v_pool_id FROM stake_pools WHERE debate_id = p_debate_id;
  END IF;

  -- 12. Debit tokens
  UPDATE profiles
  SET token_balance = token_balance - p_amount
  WHERE id = v_uid
    AND token_balance >= p_amount
  RETURNING token_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Not enough tokens (concurrent debit)');
  END IF;

  -- 13. Insert stake
  INSERT INTO stakes (pool_id, debate_id, user_id, side, amount)
  VALUES (v_pool_id, p_debate_id, v_uid, p_side, p_amount);

  -- 14. Update pool totals
  IF p_side = 'a' THEN
    UPDATE stake_pools SET total_side_a = total_side_a + p_amount WHERE id = v_pool_id;
  ELSE
    UPDATE stake_pools SET total_side_b = total_side_b + p_amount WHERE id = v_pool_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'amount', p_amount,
    'side', p_side,
    'tier', v_tier_name
  );
END;

$function$;


-- ============================================================
-- VERIFICATION QUERIES (run after applying):
--
--   -- Confirm depth gate in cast_sentiment_tip:
--   SELECT prosrc FROM pg_proc WHERE proname = 'cast_sentiment_tip'
--     AND prosrc LIKE '%profile_incomplete%';
--
--   -- Confirm depth gate in send_spectator_chat:
--   SELECT prosrc FROM pg_proc WHERE proname = 'send_spectator_chat'
--     AND prosrc LIKE '%profile_incomplete%';
--
--   -- Confirm depth gate in place_stake:
--   SELECT prosrc FROM pg_proc WHERE proname = 'place_stake'
--     AND prosrc LIKE '%profile_incomplete%';
-- ============================================================
