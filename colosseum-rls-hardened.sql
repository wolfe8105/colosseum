-- ============================================================
-- THE COLOSSEUM — Move 1: RLS Hardening
-- Session 17 — March 1, 2026
--
-- WHAT THIS DOES:
-- 1. Drops ALL existing RLS policies (35 total)
-- 2. Creates hardened replacements: read-only for clients
-- 3. All writes go through SECURITY DEFINER functions (Move 2 + Ring 3)
-- 4. Adds guard trigger on profiles (blocks client from changing protected cols)
-- 5. Creates profiles_public and profiles_private views
--
-- PASTE ORDER:
--   1. colosseum-schema-production.sql  (already done)
--   2. colosseum-ring3-functions.sql     (already done)
--   3. colosseum-ring3-move2.sql         (do this first!)
--   4. colosseum-move3-sanitize-ratelimit.sql (do this second!)
--   5. THIS FILE (colosseum-rls-hardened.sql) — LAST
--
-- Safe to re-run (uses DROP IF EXISTS + CREATE pattern)
-- ============================================================


-- ============================================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ============================================================

-- profiles
DROP POLICY IF EXISTS "Public profiles readable" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;

-- user_settings
DROP POLICY IF EXISTS "Users read own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users update own settings" ON public.user_settings;

-- profile_depth_answers
DROP POLICY IF EXISTS "Users manage own depth" ON public.profile_depth_answers;

-- cosmetics
DROP POLICY IF EXISTS "Cosmetics public read" ON public.cosmetics;

-- user_cosmetics
DROP POLICY IF EXISTS "Users read own cosmetics" ON public.user_cosmetics;
DROP POLICY IF EXISTS "Users manage own cosmetics" ON public.user_cosmetics;

-- achievements
DROP POLICY IF EXISTS "Achievements public read" ON public.achievements;

-- user_achievements
DROP POLICY IF EXISTS "Users read own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Public achievement display" ON public.user_achievements;

-- follows
DROP POLICY IF EXISTS "Follows public read" ON public.follows;
DROP POLICY IF EXISTS "Users manage own follows" ON public.follows;

-- notifications
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;

-- debates
DROP POLICY IF EXISTS "Debates public read" ON public.debates;
DROP POLICY IF EXISTS "Authenticated users create debates" ON public.debates;
DROP POLICY IF EXISTS "Debaters update own debates" ON public.debates;

-- debate_votes
DROP POLICY IF EXISTS "Votes public read" ON public.debate_votes;
DROP POLICY IF EXISTS "Authenticated users vote" ON public.debate_votes;

-- predictions
DROP POLICY IF EXISTS "Predictions public read" ON public.predictions;
DROP POLICY IF EXISTS "Users create own predictions" ON public.predictions;

-- reports
DROP POLICY IF EXISTS "Users create reports" ON public.reports;
DROP POLICY IF EXISTS "Users read own reports" ON public.reports;

-- token_transactions
DROP POLICY IF EXISTS "Users read own transactions" ON public.token_transactions;

-- payments
DROP POLICY IF EXISTS "Users read own payments" ON public.payments;

-- async_debates
DROP POLICY IF EXISTS "Async debates public read" ON public.async_debates;

-- hot_takes
DROP POLICY IF EXISTS "Hot takes public read" ON public.hot_takes;
DROP POLICY IF EXISTS "Users create hot takes" ON public.hot_takes;
DROP POLICY IF EXISTS "Users manage own hot takes" ON public.hot_takes;

-- hot_take_reactions
DROP POLICY IF EXISTS "Reactions public read" ON public.hot_take_reactions;
DROP POLICY IF EXISTS "Users manage own reactions" ON public.hot_take_reactions;

-- rate_limits (if Move 3 already ran)
DROP POLICY IF EXISTS "rate_limits_service_only" ON public.rate_limits;


-- ============================================================
-- STEP 2: CREATE HARDENED POLICIES
-- Pattern: SELECT for clients, all writes through functions
-- ============================================================

-- ---- PROFILES ----
-- Anyone can read basic profile info (for leaderboards, opponents)
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

-- Only the trigger (handle_new_user) and SECURITY DEFINER functions can write.
-- This INSERT policy allows Supabase auth trigger to create initial profile.
CREATE POLICY "profiles_insert_trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE only own profile, but guard trigger below blocks protected columns
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ---- USER_SETTINGS ----
CREATE POLICY "settings_select_own"
  ON public.user_settings FOR SELECT
  USING (user_id = auth.uid());

-- Allow insert (first-time settings creation via update_settings function)
CREATE POLICY "settings_insert_own"
  ON public.user_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow update own (function handles validation)
CREATE POLICY "settings_update_own"
  ON public.user_settings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ---- PROFILE_DEPTH_ANSWERS ----
CREATE POLICY "depth_select_own"
  ON public.profile_depth_answers FOR SELECT
  USING (user_id = auth.uid());

-- No direct insert/update — goes through save_profile_depth() function
-- But the function is SECURITY DEFINER so it bypasses RLS


-- ---- COSMETICS (reference table) ----
CREATE POLICY "cosmetics_select_public"
  ON public.cosmetics FOR SELECT
  USING (true);
-- No INSERT/UPDATE/DELETE for clients


-- ---- USER_COSMETICS ----
CREATE POLICY "user_cosmetics_select_own"
  ON public.user_cosmetics FOR SELECT
  USING (user_id = auth.uid());
-- No direct INSERT/UPDATE — goes through purchase_cosmetic, equip_cosmetic, etc.


-- ---- ACHIEVEMENTS (reference table) ----
CREATE POLICY "achievements_select_public"
  ON public.achievements FOR SELECT
  USING (true);


-- ---- USER_ACHIEVEMENTS ----
CREATE POLICY "user_achievements_select_own"
  ON public.user_achievements FOR SELECT
  USING (user_id = auth.uid());

-- Public display of achievements for other users' profiles
CREATE POLICY "user_achievements_select_public"
  ON public.user_achievements FOR SELECT
  USING (true);
-- No direct INSERT — goes through check_achievements() function


-- ---- FOLLOWS ----
CREATE POLICY "follows_select_public"
  ON public.follows FOR SELECT
  USING (true);
-- No direct INSERT/DELETE — goes through follow_user, unfollow_user functions


-- ---- NOTIFICATIONS ----
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());
-- No direct UPDATE/DELETE — goes through mark_notifications_read, cleanup_notifications


-- ---- DEBATES ----
CREATE POLICY "debates_select_public"
  ON public.debates FOR SELECT
  USING (true);
-- No direct INSERT/UPDATE — goes through create_debate, join_debate, start_debate, etc.


-- ---- DEBATE_VOTES ----
CREATE POLICY "debate_votes_select_public"
  ON public.debate_votes FOR SELECT
  USING (true);
-- No direct INSERT — goes through cast_vote() function


-- ---- PREDICTIONS ----
CREATE POLICY "predictions_select_public"
  ON public.predictions FOR SELECT
  USING (true);
-- No direct INSERT — goes through place_prediction() function


-- ---- REPORTS ----
CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  USING (reporter_id = auth.uid());
-- No direct INSERT — goes through submit_report() function


-- ---- TOKEN_TRANSACTIONS ----
CREATE POLICY "transactions_select_own"
  ON public.token_transactions FOR SELECT
  USING (user_id = auth.uid());
-- No INSERT/UPDATE from clients ever


-- ---- PAYMENTS ----
CREATE POLICY "payments_select_own"
  ON public.payments FOR SELECT
  USING (user_id = auth.uid());
-- No INSERT/UPDATE from clients — Stripe webhook only


-- ---- ASYNC_DEBATES ----
CREATE POLICY "async_debates_select_public"
  ON public.async_debates FOR SELECT
  USING (true);
-- No direct INSERT/UPDATE — goes through async debate functions


-- ---- HOT_TAKES ----
CREATE POLICY "hot_takes_select_public"
  ON public.hot_takes FOR SELECT
  USING (true);
-- No direct INSERT — goes through create_hot_take() function


-- ---- HOT_TAKE_REACTIONS ----
CREATE POLICY "reactions_select_public"
  ON public.hot_take_reactions FOR SELECT
  USING (true);
-- No direct INSERT/DELETE — goes through react_hot_take() function


-- ---- RATE_LIMITS (if table exists from Move 3) ----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limits' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "rate_limits_no_client_access" ON public.rate_limits FOR SELECT USING (false)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- STEP 3: PROFILE UPDATE GUARD TRIGGER
-- Prevents clients from changing protected columns via direct UPDATE.
-- Even though UPDATE is allowed (for display_name/bio/avatar), this
-- trigger ensures elo, tokens, wins, tier, stripe IDs can't be touched.
-- ============================================================

CREATE OR REPLACE FUNCTION guard_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  -- If called from a SECURITY DEFINER function, allow everything
  -- (SECURITY DEFINER functions run as the function owner, not the user)
  IF current_setting('role', true) = 'postgres' OR
     current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block changes to protected columns (revert to OLD values)
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

  RETURN NEW;
END;
$$;

-- Drop existing trigger if re-running
DROP TRIGGER IF EXISTS guard_profile_columns ON public.profiles;

CREATE TRIGGER guard_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION guard_profile_update();


-- ============================================================
-- STEP 4: VIEWS — Safe data access
-- ============================================================

-- Public view: safe columns for leaderboards, opponent cards, search
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  id,
  username,
  display_name,
  avatar_url,
  bio,
  elo_rating,
  wins,
  losses,
  draws,
  current_streak,
  best_streak,
  debates_completed,
  level,
  xp,
  subscription_tier,
  profile_depth_pct,
  created_at
FROM public.profiles
WHERE deleted_at IS NULL;

-- Private view: all columns, own user only
CREATE OR REPLACE VIEW public.profiles_private AS
SELECT *
FROM public.profiles
WHERE id = auth.uid();


-- ============================================================
-- STEP 5: LOCK credit_tokens TO service_role ONLY
-- (Already defined in Ring 3, but re-create with service_role check)
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
-- DONE
-- All 35 old policies dropped, hardened replacements created.
-- Profile guard trigger active. Views created.
-- credit_tokens locked to service_role.
-- ============================================================
