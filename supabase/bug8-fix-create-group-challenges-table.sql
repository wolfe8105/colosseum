-- BUG 8 FIX: group_challenges table does not exist.
-- RPCs create_group_challenge, get_group_challenges, respond_to_group_challenge,
-- and resolve_group_challenge all reference this table but it was never created.
--
-- Columns derived from all 4 RPCs in supabase/functions/groups.sql.

CREATE TABLE IF NOT EXISTS public.group_challenges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  defender_group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic               TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'miscellaneous',
  format              TEXT NOT NULL DEFAULT '1v1',
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','accepted','declined','expired','live','completed')),
  winner_group_id     UUID REFERENCES public.groups(id),
  debate_id           UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  responded_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ
);

-- Index for the two main query patterns: "challenges involving this group" and "pending challenges"
CREATE INDEX IF NOT EXISTS idx_group_challenges_challenger ON public.group_challenges(challenger_group_id);
CREATE INDEX IF NOT EXISTS idx_group_challenges_defender   ON public.group_challenges(defender_group_id);
CREATE INDEX IF NOT EXISTS idx_group_challenges_status     ON public.group_challenges(status) WHERE status IN ('pending','accepted','live');

-- RLS: allow authenticated users to read challenges for groups they belong to
ALTER TABLE public.group_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view challenges for their groups"
  ON public.group_challenges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
        AND (gm.group_id = challenger_group_id OR gm.group_id = defender_group_id)
    )
  );

-- All mutations go through SECURITY DEFINER RPCs — no direct insert/update/delete policies needed.
