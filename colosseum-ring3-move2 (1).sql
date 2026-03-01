-- ============================================================
-- THE COLOSSEUM — Move 2: Server-Side Validation Functions
-- Session 17 — March 1, 2026
--
-- 20 SECURITY DEFINER functions across 10 sections.
-- All client writes go through these. Direct .from() INSERT/UPDATE
-- will be blocked by Move 1 RLS policies.
--
-- PASTE ORDER:
--   1. colosseum-schema-production.sql  (already done)
--   2. colosseum-ring3-functions.sql     (already done)
--   3. THIS FILE (colosseum-ring3-move2.sql)
--   4. colosseum-move3-sanitize-ratelimit.sql (patches these with sanitization)
--
-- Move 3 will overwrite: create_hot_take, submit_async_round,
--   update_profile, submit_report, follow_user
--   (plus Ring 3's cast_vote, create_debate, place_prediction)
-- ============================================================


-- ============================================================
-- SECTION 1: HOT TAKES (Item 14.8.1)
-- ============================================================

-- 1a. Create Hot Take (base version — Move 3 patches with sanitize_text)
CREATE OR REPLACE FUNCTION create_hot_take(
  p_content TEXT,
  p_section TEXT DEFAULT 'trending'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_take_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_content IS NULL OR char_length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Content cannot be empty';
  END IF;

  IF char_length(p_content) > 280 THEN
    RAISE EXCEPTION 'Content exceeds 280 characters';
  END IF;

  IF p_section NOT IN ('trending','politics','sports','entertainment','music','couples_court') THEN
    p_section := 'trending';
  END IF;

  INSERT INTO public.hot_takes (user_id, content, section)
  VALUES (v_user_id, trim(p_content), p_section)
  RETURNING id INTO v_take_id;

  RETURN json_build_object(
    'success', true,
    'id', v_take_id,
    'section', p_section
  );
END;
$$;


-- 1b. React to Hot Take (toggle — insert or delete)
CREATE OR REPLACE FUNCTION react_hot_take(
  p_hot_take_id UUID,
  p_reaction_type TEXT DEFAULT 'fire'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_exists BOOLEAN;
  v_new_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if reaction exists (toggle behavior)
  SELECT EXISTS(
    SELECT 1 FROM public.hot_take_reactions
    WHERE hot_take_id = p_hot_take_id AND user_id = v_user_id
  ) INTO v_exists;

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

  RETURN json_build_object(
    'success', true,
    'reacted', NOT v_exists,
    'reaction_count', v_new_count
  );
END;
$$;


-- ============================================================
-- SECTION 2: ASYNC DEBATES (Item 14.3.3)
-- ============================================================

-- 2a. Join Async Debate
CREATE OR REPLACE FUNCTION join_async_debate(p_debate_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- 2b. Submit Async Round (base version — Move 3 patches with sanitize_text)
CREATE OR REPLACE FUNCTION submit_async_round(
  p_debate_id UUID,
  p_content TEXT
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_rounds JSONB;
  v_round_num INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_content IS NULL OR char_length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Content cannot be empty';
  END IF;

  SELECT * INTO v_debate FROM public.async_debates
  WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_debate.status != 'active' THEN
    RAISE EXCEPTION 'Debate is not active';
  END IF;

  IF v_user_id NOT IN (v_debate.challenger_id, v_debate.defender_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  v_rounds := COALESCE(v_debate.rounds, '[]'::JSONB);
  v_round_num := jsonb_array_length(v_rounds) + 1;

  v_rounds := v_rounds || jsonb_build_object(
    'round', v_round_num,
    'user_id', v_user_id,
    'content', trim(p_content),
    'submitted_at', now()
  );

  UPDATE public.async_debates
  SET rounds = v_rounds,
      updated_at = now()
  WHERE id = p_debate_id;

  RETURN json_build_object(
    'success', true,
    'round', v_round_num
  );
END;
$$;


-- 2c. Vote on Async Debate
CREATE OR REPLACE FUNCTION vote_async_debate(
  p_debate_id UUID,
  p_voted_for TEXT  -- 'challenger' or 'defender'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- 2d. Finalize Async Debate
CREATE OR REPLACE FUNCTION finalize_async_debate(p_debate_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ============================================================
-- SECTION 3: TOKEN EARNING (Item 14.2.4)
-- ============================================================

-- 3a. Claim Daily Tokens
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

  -- Get tier and last claim
  SELECT subscription_tier INTO v_tier
  FROM public.profiles WHERE id = v_user_id;

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


-- 3b. Earn Tokens (controlled reasons + daily caps)
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
-- SECTION 4: ACHIEVEMENTS (Item 14.3.4)
-- ============================================================

CREATE OR REPLACE FUNCTION check_achievements()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ============================================================
-- SECTION 5: REPORTS (Item 14.3.9)
-- ============================================================

-- Base version — Move 3 patches with sanitize_text + rate limit
CREATE OR REPLACE FUNCTION submit_report(
  p_reported_user_id UUID DEFAULT NULL,
  p_debate_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT '',
  p_details TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_report_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_reason IS NULL OR char_length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Reason is required';
  END IF;

  IF p_reported_user_id IS NULL AND p_debate_id IS NULL THEN
    RAISE EXCEPTION 'Must report a user or debate';
  END IF;

  -- Can't report yourself
  IF p_reported_user_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot report yourself';
  END IF;

  INSERT INTO public.reports (reporter_id, reported_user_id, debate_id, reason, details)
  VALUES (v_user_id, p_reported_user_id, p_debate_id, trim(p_reason), trim(COALESCE(p_details, '')))
  RETURNING id INTO v_report_id;

  RETURN json_build_object(
    'success', true,
    'report_id', v_report_id
  );
END;
$$;


-- ============================================================
-- SECTION 6: PROFILE (Items 14.4.4, 14.4.4.10)
-- ============================================================

-- 6a. Update Profile (base version — Move 3 patches with sanitize_text)
CREATE OR REPLACE FUNCTION update_profile(
  p_display_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate username if changing
  IF p_username IS NOT NULL THEN
    IF char_length(p_username) < 3 OR char_length(p_username) > 20 THEN
      RAISE EXCEPTION 'Username must be 3-20 characters';
    END IF;
    IF p_username !~ '^[a-zA-Z0-9_]+$' THEN
      RAISE EXCEPTION 'Username: letters, numbers, underscores only';
    END IF;
  END IF;

  -- Validate bio length
  IF p_bio IS NOT NULL AND char_length(p_bio) > 500 THEN
    RAISE EXCEPTION 'Bio cannot exceed 500 characters';
  END IF;

  -- Only update provided fields (NULL = no change)
  UPDATE public.profiles
  SET display_name = COALESCE(p_display_name, display_name),
      avatar_url = COALESCE(p_avatar_url, avatar_url),
      bio = COALESCE(p_bio, bio),
      username = COALESCE(p_username, username),
      updated_at = now()
  WHERE id = v_user_id;

  RETURN json_build_object('success', true);
END;
$$;


-- 6b. Save Profile Depth answers + calculate completion %
CREATE OR REPLACE FUNCTION save_profile_depth(
  p_section_id TEXT,
  p_answers JSONB
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current JSONB;
  v_merged JSONB;
  v_total_sections INTEGER := 12;
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
$$;


-- ============================================================
-- SECTION 7: COSMETICS (Items 14.2.5, 14.10.6)
-- ============================================================

-- 7a. Purchase Cosmetic (validates tier, level, balance)
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

  -- Get profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;

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


-- 7b. Equip Cosmetic (unequips same type first)
CREATE OR REPLACE FUNCTION equip_cosmetic(p_cosmetic_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_cosmetic_type TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.user_cosmetics
    WHERE user_id = v_user_id AND cosmetic_id = p_cosmetic_id
  ) THEN
    RAISE EXCEPTION 'Cosmetic not owned';
  END IF;

  -- Get type (border, badge, effect) so we can unequip same type
  SELECT c.type INTO v_cosmetic_type
  FROM public.cosmetics c
  WHERE c.id = p_cosmetic_id;

  -- Unequip all of same type
  UPDATE public.user_cosmetics uc
  SET equipped = false
  FROM public.cosmetics c
  WHERE uc.cosmetic_id = c.id
    AND uc.user_id = v_user_id
    AND c.type = v_cosmetic_type;

  -- Equip this one
  UPDATE public.user_cosmetics
  SET equipped = true
  WHERE user_id = v_user_id AND cosmetic_id = p_cosmetic_id;

  RETURN json_build_object('success', true, 'equipped', p_cosmetic_id);
END;
$$;


-- 7c. Unequip Cosmetic
CREATE OR REPLACE FUNCTION unequip_cosmetic(p_cosmetic_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ============================================================
-- SECTION 8: NOTIFICATIONS (Item 14.5.2)
-- ============================================================

-- 8a. Mark Notifications Read (bulk)
CREATE OR REPLACE FUNCTION mark_notifications_read(p_notification_ids UUID[] DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- 8b. Cleanup old notifications (90+ days)
CREATE OR REPLACE FUNCTION cleanup_notifications()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ============================================================
-- SECTION 9: SETTINGS (Item 14.4.5)
-- ============================================================

CREATE OR REPLACE FUNCTION update_settings(
  p_notif_challenges BOOLEAN DEFAULT NULL,
  p_notif_results BOOLEAN DEFAULT NULL,
  p_notif_reactions BOOLEAN DEFAULT NULL,
  p_notif_follows BOOLEAN DEFAULT NULL,
  p_privacy_public_profile BOOLEAN DEFAULT NULL,
  p_privacy_debate_history BOOLEAN DEFAULT NULL,
  p_privacy_allow_challenges BOOLEAN DEFAULT NULL,
  p_audio_auto_mute BOOLEAN DEFAULT NULL,
  p_audio_effects BOOLEAN DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ============================================================
-- SECTION 10: SOCIAL (Item 14.5.1)
-- ============================================================

-- 10a. Follow User (base version — Move 3 patches with rate limit)
CREATE OR REPLACE FUNCTION follow_user(p_target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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

  RETURN json_build_object('success', true, 'following', p_target_user_id);
END;
$$;


-- 10b. Unfollow User
CREATE OR REPLACE FUNCTION unfollow_user(p_target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.follows
  WHERE follower_id = v_user_id AND following_id = p_target_user_id;

  RETURN json_build_object('success', true, 'unfollowed', p_target_user_id);
END;
$$;


-- ============================================================
-- SECTION 11: VOICE TAKES (Item 14.3.3.2)
-- Requires colosseum-migration-voicememo.sql columns on hot_takes
-- ============================================================

CREATE OR REPLACE FUNCTION create_voice_take(
  p_section TEXT DEFAULT 'trending',
  p_voice_memo_url TEXT DEFAULT NULL,
  p_voice_memo_path TEXT DEFAULT NULL,
  p_voice_memo_duration INTEGER DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL,
  p_content TEXT DEFAULT '🎤 Voice Take'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ============================================================
-- DONE — 22 functions across 11 sections
-- Next: paste colosseum-move3-sanitize-ratelimit.sql to add
-- sanitization + rate limiting to the functions that need it
-- ============================================================
