-- ============================================================
-- THE MODERATOR — H-08: Fix 3 public-scoped RLS policies
-- Session 270 | April 12, 2026
--
-- Three policies identified from diagnostic:
--
--   1. mod_dropout_log / mod_dropout_read — SELECT USING (true)
--      Anyone including anon bots can read all mod dropout data.
--      Fix: restrict to authenticated + narrow to only show rows
--      where the caller is the moderator or a debate participant.
--
--   2. debate_effect_state / debate_effect_state_owner_select
--      SELECT USING (auth.uid() = user_id) — safe in practice
--      (anon gets NULL, returns nothing) but should be explicit.
--      Fix: add TO authenticated.
--
--   3. debate_powerup_loadout / debate_powerup_loadout_owner_select
--      Same pattern as #2.
--      Fix: add TO authenticated.
--
-- Run in Supabase SQL Editor against faomczmipsccwbhpivmp.
-- No rows returned = success.
-- ============================================================


-- ── 1. mod_dropout_log — restrict to authenticated ───────────

DROP POLICY IF EXISTS "mod_dropout_read" ON public.mod_dropout_log;

CREATE POLICY "mod_dropout_read"
  ON public.mod_dropout_log
  FOR SELECT
  TO authenticated
  USING (
    -- Moderator can see their own dropout log
    auth.uid() = moderator_id
    OR
    -- Debaters in that debate can see it (for UI accountability)
    EXISTS (
      SELECT 1 FROM public.arena_debates ad
      WHERE ad.id = mod_dropout_log.debate_id
        AND auth.uid() IN (ad.debater_a, ad.debater_b)
    )
  );


-- ── 2. debate_effect_state — add TO authenticated ────────────

DROP POLICY IF EXISTS "debate_effect_state_owner_select" ON public.debate_effect_state;

CREATE POLICY "debate_effect_state_owner_select"
  ON public.debate_effect_state
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);


-- ── 3. debate_powerup_loadout — add TO authenticated ─────────

DROP POLICY IF EXISTS "debate_powerup_loadout_owner_select" ON public.debate_powerup_loadout;

CREATE POLICY "debate_powerup_loadout_owner_select"
  ON public.debate_powerup_loadout
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);


-- ============================================================
-- END H-08
-- H-08 can now be marked ✅ in the punch list.
-- ============================================================
