-- ============================================================
-- F-68 Phase 5: Retire hot take RPCs + drop tables
-- Session 294
-- ============================================================
-- Run in Supabase SQL Editor after verifying unified feed works.
-- Order: RPCs first (they reference the tables), then tables.
-- ============================================================

-- ── Step 1: Drop hot take RPCs ───────────────────────────────

-- create_hot_take has 1 overload
DROP FUNCTION IF EXISTS public.create_hot_take(text, text);

-- create_voice_take has 1 overload
DROP FUNCTION IF EXISTS public.create_voice_take(text, text, text, integer, uuid, text);

-- react_hot_take has 1 overload
DROP FUNCTION IF EXISTS public.react_hot_take(uuid, text);

-- create_challenge has 1 overload
DROP FUNCTION IF EXISTS public.create_challenge(uuid, text, text);

-- update_reaction_count trigger function (on hot_take_reactions)
DROP FUNCTION IF EXISTS public.update_reaction_count();

-- ── Step 2: Drop triggers on hot_takes ───────────────────────

-- search_index trigger on hot_takes (if exists)
DROP TRIGGER IF EXISTS trg_search_index_hot_take ON public.hot_takes;
DROP FUNCTION IF EXISTS public.update_search_index_hot_take();

-- ── Step 3: Drop tables ──────────────────────────────────────

-- hot_take_reactions first (references hot_takes)
DROP TABLE IF EXISTS public.hot_take_reactions CASCADE;

-- hot_takes table (only 6 rows in production)
DROP TABLE IF EXISTS public.hot_takes CASCADE;

-- async_debates table (legacy challenge system, references hot_takes)
DROP TABLE IF EXISTS public.async_debates CASCADE;

-- ── Step 4: Verification ─────────────────────────────────────
-- Run these after the drops to confirm:
--   SELECT COUNT(*) FROM pg_proc WHERE proname = 'create_hot_take';     -- should be 0
--   SELECT COUNT(*) FROM pg_proc WHERE proname = 'react_hot_take';      -- should be 0
--   SELECT COUNT(*) FROM pg_proc WHERE proname = 'create_challenge';    -- should be 0
--   SELECT COUNT(*) FROM pg_tables WHERE tablename = 'hot_takes';       -- should be 0
--   SELECT COUNT(*) FROM pg_tables WHERE tablename = 'hot_take_reactions';  -- should be 0
