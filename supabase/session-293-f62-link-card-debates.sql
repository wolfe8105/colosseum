-- F-62: Link Card Debates (Reddit-style OG preview)
-- Session 293 | April 21, 2026
-- Applied to production: faomczmipsccwbhpivmp

-- 1. Add link columns to arena_debates
ALTER TABLE arena_debates ADD COLUMN IF NOT EXISTS link_url TEXT DEFAULT NULL;
ALTER TABLE arena_debates ADD COLUMN IF NOT EXISTS link_preview JSONB DEFAULT NULL;

-- 2. Add link columns to debate_queue (carries through matching)
ALTER TABLE debate_queue ADD COLUMN IF NOT EXISTS link_url TEXT DEFAULT NULL;
ALTER TABLE debate_queue ADD COLUMN IF NOT EXISTS link_preview JSONB DEFAULT NULL;

-- 3. Updated join_debate_queue with p_link_url + p_link_preview params
-- (see supabase/functions/arena.sql for full function body)

-- 4. Updated get_arena_feed to return link_url + link_preview
-- Also cleaned up: removed dead auto_debates UNION, added p_category filter
