-- Create auto_debates table for AI vs AI debate page
-- Applied: April 19, 2026
--
-- Table was part of original schema but dropped/never migrated.
-- The moderator-auto-debate.html page queries this table.
-- Columns derived from AutoDebateData interface in auto-debate.types.ts
-- and query patterns in auto-debate.ts / auto-debate.render.ts.
--
-- 3 seed debates also inserted (AI art, free college, remote work).

CREATE TABLE IF NOT EXISTS public.auto_debates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  description TEXT,
  side_a_label TEXT NOT NULL DEFAULT 'Side A',
  side_b_label TEXT NOT NULL DEFAULT 'Side B',
  side_a TEXT,
  side_b TEXT,
  winner TEXT CHECK (winner IN ('a', 'b')),
  score_a NUMERIC DEFAULT 0,
  score_b NUMERIC DEFAULT 0,
  margin TEXT,
  category TEXT DEFAULT 'general',
  rounds JSONB DEFAULT '[]'::jsonb,
  judge_reasoning TEXT,
  share_hook TEXT,
  votes_a INTEGER DEFAULT 0,
  votes_b INTEGER DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  yes_votes INTEGER DEFAULT 0,
  no_votes INTEGER DEFAULT 0,
  is_auto BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.auto_debates ENABLE ROW LEVEL SECURITY;

CREATE POLICY auto_debates_select_public ON public.auto_debates
  FOR SELECT TO anon, authenticated
  USING (true);

-- Grants
GRANT SELECT ON public.auto_debates TO anon;
GRANT SELECT ON public.auto_debates TO authenticated;
GRANT ALL ON public.auto_debates TO service_role;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auto_debates_created_at ON public.auto_debates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_debates_status ON public.auto_debates(status);
