-- ============================================================
-- THE MODERATOR — H-08: Fix public-scoped RLS policies
-- Session 270 | April 12, 2026
--
-- STEP 1: Run this SELECT first to identify the offending policies.
-- It finds all RLS policies on public schema tables where the
-- roles array includes 'public' (meaning they apply to all
-- users including unauthenticated anon).
--
-- SELECT policies with USING (true) on non-sensitive tables are
-- intentional (guest read access). The ones to fix are:
--   - Any INSERT/UPDATE/DELETE with public scope
--   - Any SELECT with public scope on sensitive tables
--     (profiles, token balances, private data, etc.)
--
-- STEP 2: The fixes below replace the identified policies with
-- authenticated-scope equivalents.
--
-- Run the diagnostic SELECT first. If you see policies that
-- aren't covered by the fixes below, add them manually.
-- ============================================================

-- ── STEP 1: DIAGNOSTIC — run this first ──────────────────────
-- (comment out before running the fixes)

SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND roles::text LIKE '%public%'
ORDER BY tablename, cmd;


-- ── STEP 2: FIXES ─────────────────────────────────────────────
-- Comment out the SELECT above and uncomment the fixes below
-- after reviewing the diagnostic output.
--
-- Based on historical security audit notes, the 3 likely
-- candidates are overly-permissive write policies on
-- hot_takes, arena_votes, or reactions tables from early
-- sessions (pre-S215 audit). The pattern below covers the
-- most common cases found in Supabase-generated defaults.
--
-- Uncomment and run after reviewing diagnostic output:

/*

-- Fix 1: Drop public-scoped INSERT on hot_takes if it exists
-- (should be authenticated only — anon users can read but not post)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hot_takes'
      AND cmd = 'INSERT'
      AND roles::text LIKE '%public%'
  ) THEN
    EXECUTE (
      SELECT 'DROP POLICY ' || quote_ident(policyname) || ' ON public.hot_takes'
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'hot_takes'
        AND cmd = 'INSERT' AND roles::text LIKE '%public%'
      LIMIT 1
    );
    CREATE POLICY "hot_takes_insert_authenticated"
      ON public.hot_takes FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE 'Fixed hot_takes INSERT policy';
  ELSE
    RAISE NOTICE 'hot_takes INSERT: no public-scoped policy found';
  END IF;
END $$;

-- Fix 2: Drop public-scoped INSERT on arena_votes if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'arena_votes'
      AND cmd = 'INSERT'
      AND roles::text LIKE '%public%'
  ) THEN
    EXECUTE (
      SELECT 'DROP POLICY ' || quote_ident(policyname) || ' ON public.arena_votes'
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'arena_votes'
        AND cmd = 'INSERT' AND roles::text LIKE '%public%'
      LIMIT 1
    );
    CREATE POLICY "arena_votes_insert_authenticated"
      ON public.arena_votes FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE 'Fixed arena_votes INSERT policy';
  ELSE
    RAISE NOTICE 'arena_votes INSERT: no public-scoped policy found';
  END IF;
END $$;

-- Fix 3: Generic catch-all for any remaining non-SELECT public policies
-- (safe to run — only touches INSERT/UPDATE/DELETE, not SELECT)
DO $$
DECLARE
  r RECORD;
  drop_sql TEXT;
BEGIN
  FOR r IN
    SELECT tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND roles::text LIKE '%public%'
      AND cmd != 'SELECT'  -- leave SELECT alone (intentional guest reads)
  LOOP
    RAISE NOTICE 'Found public-scoped % policy "%" on % — dropping',
      r.cmd, r.policyname, r.tablename;
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

*/
