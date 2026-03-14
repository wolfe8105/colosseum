-- Session 102: Verify guard_profile_columns trigger is up to date
-- Run in Supabase SQL Editor
--
-- Step 1: Check what's currently deployed
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'guard_profile_columns';
-- If this returns nothing, check for the older function name:
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'guard_profile_update';

-- Step 2: If the deployed version is missing mod columns, run this to update:
-- (Only run if Step 1 shows the function lacks mod_rating etc.)
/*
CREATE OR REPLACE FUNCTION guard_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('role', true) NOT IN ('postgres', 'service_role') THEN
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
    NEW.mod_rating := OLD.mod_rating;
    NEW.mod_debates_total := OLD.mod_debates_total;
    NEW.mod_rulings_total := OLD.mod_rulings_total;
    NEW.mod_approval_pct := OLD.mod_approval_pct;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger points to the right function
DROP TRIGGER IF EXISTS guard_profile_columns ON public.profiles;
CREATE TRIGGER guard_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION guard_profile_columns();
*/
