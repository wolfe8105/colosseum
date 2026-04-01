-- ============================================================================
-- GUARD TRIGGER FIX: Add missing moderator + profile columns
-- Date: 2026-03-31
-- Fixes: ADV-1 (Critical) — guard_profile_update missing 7 moderator columns
--        Also syncs repo with deployed version (adds Session 75 streak columns)
--
-- WHAT THIS DOES:
--   Replaces guard_profile_update() to block direct client writes to ALL
--   protected columns, including 7 moderator columns that were never added.
--
-- COLUMNS ADDED TO GUARD:
--   is_moderator        — was unguarded, allows self-promotion to moderator
--   mod_available       — was unguarded, allows appearing in mod marketplace
--   mod_categories      — was unguarded, allows setting mod specialties
--   mod_rating          — was unguarded, allows inflating mod rating
--   mod_debates_total   — was unguarded, allows faking mod experience
--   mod_rulings_total   — was unguarded, allows faking ruling count
--   mod_approval_pct    — was unguarded, allows faking approval percentage
--   streak_freezes      — was deployed but missing from repo (Session 75)
--   login_streak        — was deployed but missing from repo (Session 75)
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file
--   3. Click Run
--   4. Verify: see test queries at bottom of file
-- ============================================================================

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
$$;

-- Trigger already exists on profiles table — CREATE OR REPLACE above
-- updates the function in-place. No need to drop/recreate the trigger.

-- ============================================================================
-- VERIFICATION QUERIES (run these after applying, then delete them)
-- ============================================================================
-- Test 1: Try to set is_moderator directly (should silently revert)
--   UPDATE profiles SET is_moderator = true WHERE id = auth.uid();
--   SELECT is_moderator FROM profiles WHERE id = auth.uid();
--   → Should still be false (or whatever it was before)
--
-- Test 2: Try to set mod_rating directly (should silently revert)
--   UPDATE profiles SET mod_rating = 99.99 WHERE id = auth.uid();
--   SELECT mod_rating FROM profiles WHERE id = auth.uid();
--   → Should still be 50.00 (or whatever it was before)
--
-- Test 3: Try to set questions_answered directly (guard_profile_columns
--          should still block this with an exception)
--   UPDATE profiles SET questions_answered = 9999 WHERE id = auth.uid();
--   → Should raise exception 'Cannot modify questions_answered directly'
--
-- Test 4: Confirm legitimate profile updates still work
--   UPDATE profiles SET display_name = 'Test Name' WHERE id = auth.uid();
--   SELECT display_name FROM profiles WHERE id = auth.uid();
--   → Should show 'Test Name'
-- ============================================================================
