-- THE MODERATOR — Deployed Functions Export
-- Auto-generated from Supabase production database
-- Last updated: Session 252 (April 9, 2026) — F-55 Reference System Overhaul landed
--
-- This file is the source of truth for what RPCs are live in production.
-- Re-export after any session that modifies RPCs.

-- Domain: auth

-- Functions: 33

-- Auto-generated from supabase-deployed-functions-export.sql


CREATE OR REPLACE FUNCTION public.auto_grant_depth_cosmetics()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.check_achievements()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.claim_daily_login()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.claim_milestone(p_milestone_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.declare_rival(p_target_id uuid, p_message text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.equip_cosmetic(p_cosmetic_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.follow_user(p_target_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.get_cosmetic_catalog()
 RETURNS TABLE(cosmetic_id uuid, name text, category text, tier integer, unlock_type text, token_cost integer, depth_threshold numeric, unlock_condition text, asset_url text, sort_order integer, owned boolean, equipped boolean, acquired_via text, metadata jsonb)
 LANGUAGE sql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.get_follow_counts(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  RETURN json_build_object(
    'followers', (SELECT count(*) FROM follows WHERE following_id = p_user_id),
    'following', (SELECT count(*) FROM follows WHERE follower_id = p_user_id)
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_my_cosmetics()
 RETURNS TABLE(cosmetic_id uuid, name text, category text, tier integer, unlock_type text, token_cost integer, depth_threshold numeric, unlock_condition text, asset_url text, sort_order integer, acquired_via text, equipped boolean, metadata jsonb, acquired_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.get_my_milestones()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.get_my_rivals()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.get_own_profile()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.get_public_cosmetics(p_user_id uuid)
 RETURNS TABLE(cosmetic_id uuid, name text, category text, tier integer, asset_url text, acquired_via text, metadata jsonb, acquired_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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
 SECURITY DEFINER
SET search_path = public, pg_catalog
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
SET search_path = public, pg_catalog
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
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.is_following(p_target_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  RETURN EXISTS (
    SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = p_target_id
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.purchase_cosmetic(p_cosmetic_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.respond_rival(p_rival_id uuid, p_accept boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.save_profile_depth(p_section_id text, p_answers jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.search_users_by_username(p_query text)
 RETURNS TABLE(id uuid, username text, display_name text, elo_rating integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.set_profile_dob(p_dob date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.soft_delete_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.unequip_cosmetic(p_cosmetic_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.update_profile(p_display_name text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text, p_bio text DEFAULT NULL::text, p_username text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.update_profile(p_display_name text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text, p_bio text DEFAULT NULL::text, p_username text DEFAULT NULL::text, p_preferred_language text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.update_settings(p_notif_challenges boolean DEFAULT NULL::boolean, p_notif_results boolean DEFAULT NULL::boolean, p_notif_reactions boolean DEFAULT NULL::boolean, p_notif_follows boolean DEFAULT NULL::boolean, p_privacy_public_profile boolean DEFAULT NULL::boolean, p_privacy_debate_history boolean DEFAULT NULL::boolean, p_privacy_allow_challenges boolean DEFAULT NULL::boolean, p_audio_auto_mute boolean DEFAULT NULL::boolean, p_audio_effects boolean DEFAULT NULL::boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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
