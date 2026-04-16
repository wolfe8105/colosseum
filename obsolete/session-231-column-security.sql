-- ============================================================================
-- SESSION 231: P2-9 — Column-Level Security on profiles table
-- Date: 2026-04-04
--
-- VULNERABILITY: RLS policy profiles_select_public uses USING(true), exposing
--   token_balance, is_minor, trust_score, stripe_customer_id,
--   stripe_subscription_id, date_of_birth, deleted_at to ANY authenticated user
--   querying ANY row via .from('profiles').select('*').
--
-- FIX:
--   1. Create get_own_profile() RPC — SECURITY DEFINER, returns ALL columns
--      for current user only. Replaces client-side select('*').
--   2. REVOKE table-level SELECT from authenticated/anon.
--   3. GRANT column-level SELECT on non-sensitive columns only.
--
-- AFFECTED CLIENT FILES (uploaded separately):
--   src/auth.ts     — _loadProfile() now calls get_own_profile() RPC
--   src/async.ts    — hot_takes join no longer requests token_balance
--
-- SAFE BECAUSE:
--   - profiles_public VIEW only selects non-sensitive columns → unaffected
--   - get_public_profile() RPC is SECURITY DEFINER → bypasses column grants
--   - get_leaderboard() RPC is SECURITY DEFINER → bypasses column grants
--   - newsletter.ts uses service_role key → bypasses everything
--   - api/profile.js queries profiles_public view → unaffected
--   - profile-depth.ts only selects questions_answered → in GRANT list
--
-- HOW TO RUN:
--   1. Deploy client changes FIRST (auth.ts, async.ts) so no client
--      code references revoked columns via raw table queries.
--   2. Open Supabase Dashboard → SQL Editor
--   3. Paste this entire file
--   4. Click Run
--   5. Verify with test queries at bottom
-- ============================================================================

-- ============================================================================
-- STEP 1: Create get_own_profile() RPC
-- Returns ALL columns for the currently authenticated user.
-- SECURITY DEFINER bypasses column-level grants.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_own_profile()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Ensure authenticated users can call this function
GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_own_profile() FROM anon;

-- ============================================================================
-- STEP 2: REVOKE table-level SELECT
-- Must happen BEFORE column-level GRANT (PG ignores column REVOKE
-- when table-level GRANT exists).
-- ============================================================================

REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

-- ============================================================================
-- STEP 3: GRANT column-level SELECT on non-sensitive columns
--
-- SENSITIVE (not granted):
--   token_balance, is_minor, trust_score,
--   stripe_customer_id, stripe_subscription_id,
--   date_of_birth, deleted_at
--
-- If a column exists in production but is missing from this list,
-- queries referencing it will error (fail closed, not open).
-- Fix: add the column to the GRANT below.
-- ============================================================================

GRANT SELECT (
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
  questions_answered,
  is_moderator,
  mod_available,
  mod_categories,
  mod_rating,
  mod_debates_total,
  mod_rulings_total,
  mod_approval_pct,
  streak_freezes,
  login_streak,
  best_login_streak,
  last_login_date,
  created_at,
  updated_at
) ON public.profiles TO authenticated;

GRANT SELECT (
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
  questions_answered,
  is_moderator,
  mod_available,
  mod_categories,
  mod_rating,
  mod_debates_total,
  mod_rulings_total,
  mod_approval_pct,
  streak_freezes,
  login_streak,
  best_login_streak,
  last_login_date,
  created_at,
  updated_at
) ON public.profiles TO anon;

-- ============================================================================
-- VERIFICATION QUERIES
-- Run after applying. Delete when confirmed.
-- ============================================================================

-- Test 1: get_own_profile returns full data including sensitive columns
--   SELECT get_own_profile();
--   → Should return JSON with token_balance, is_minor, trust_score, etc.

-- Test 2: Direct select of sensitive column FAILS
--   SELECT token_balance FROM profiles WHERE id = auth.uid();
--   → Should error: permission denied for table profiles

-- Test 3: Direct select of safe column WORKS
--   SELECT username, elo_rating FROM profiles WHERE id = auth.uid();
--   → Should return data

-- Test 4: select(*) FAILS (because some columns are revoked)
--   SELECT * FROM profiles LIMIT 1;
--   → Should error: permission denied for table profiles

-- Test 5: profiles_public view still works
--   SELECT * FROM profiles_public LIMIT 1;
--   → Should return data (view only selects granted columns)

-- Test 6: get_public_profile still works
--   SELECT get_public_profile('<any-user-uuid>');
--   → Should return JSON (SECURITY DEFINER bypasses grants)
