-- ============================================================================
-- RLS POLICY SURVIVORS FIX: Drop dangerous client-side write policies
-- Date: 2026-03-31
-- Fixes: ADV-3 (Critical) — arena_votes direct INSERT allows self-voting
--        ADV-8 (Critical) — async_debates INSERT/UPDATE allows forging wins
--        ADV-9 (Medium)   — hot_takes DELETE bypasses RPC logging
--
-- ALSO: Creates async_debates_select_public, which the hardened migration
--       (moderator-rls-hardened.sql line 238) intended to create but never
--       deployed. All async_debates reads currently go through SECURITY
--       DEFINER RPCs so the app works without it, but it should exist.
--
-- WHY THESE POLICIES SURVIVED:
--   arena_votes_insert     — hardened file never touched arena_votes at all
--   Authenticated users create async — hardened file only dropped the SELECT policy
--   Participants update async        — same, INSERT/UPDATE never dropped
--   Users delete own takes           — hardened file dropped "Users manage own hot takes"
--                                      but the actual policy name is "Users delete own takes"
--
-- AFTER THIS: All writes to these tables go through SECURITY DEFINER RPCs only.
--   arena_votes   → cast_vote() RPC (has anti-self-voting check)
--   async_debates → create_debate(), submit_async_round(), vote_async_debate(), etc.
--   hot_takes     → create_hot_take() RPC (has rate limiting + sanitization)
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file
--   3. Click Run
--   4. Run verification query at bottom
-- ============================================================================

-- === ADV-3: Drop arena_votes direct INSERT ===
-- This policy lets any authenticated user insert votes with only
-- auth.uid() = user_id check. Debaters can vote for themselves.
-- The cast_vote() RPC properly blocks self-voting.
DROP POLICY IF EXISTS "arena_votes_insert" ON public.arena_votes;

-- === ADV-8: Drop async_debates direct INSERT ===
-- This policy lets any authenticated user create async debate rows directly.
DROP POLICY IF EXISTS "Authenticated users create async" ON public.async_debates;

-- === ADV-8: Drop async_debates direct UPDATE ===
-- This policy lets debate participants update vote counts and status directly.
-- Attack: UPDATE async_debates SET votes_challenger = 999, status = 'completed'
DROP POLICY IF EXISTS "Participants update async" ON public.async_debates;

-- === ADV-9: Drop hot_takes direct DELETE ===
-- This policy lets users delete their own takes bypassing RPC logging.
DROP POLICY IF EXISTS "Users delete own takes" ON public.hot_takes;

-- === Add missing SELECT policy for async_debates ===
-- The hardened migration intended this (line 238) but it was never deployed.
-- Without it, direct table reads fail. RPCs still work (SECURITY DEFINER
-- bypasses RLS), but the policy should exist for consistency.
DROP POLICY IF EXISTS "async_debates_select_public" ON public.async_debates;
CREATE POLICY "async_debates_select_public"
  ON public.async_debates FOR SELECT
  USING (true);


-- ============================================================================
-- VERIFICATION: Run this after applying
-- ============================================================================
-- Should return only SELECT policies for arena_votes and async_debates,
-- and only SELECT for hot_takes. No INSERT, UPDATE, or DELETE.

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('arena_votes', 'async_debates', 'hot_takes')
ORDER BY tablename, policyname;

-- Expected result:
--   arena_votes  | arena_votes_select           | SELECT
--   async_debates| async_debates_select_public   | SELECT
--   hot_takes    | hot_takes_select_public        | SELECT
-- ============================================================================
