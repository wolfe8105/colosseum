-- ============================================================
-- THE MODERATOR — F-57 Phase 2: In-Debate Modifier Integration
-- Session 267 | April 12, 2026
--
-- SCOPE: Wire in-debate modifiers into score_debate_comment.
--
-- NEW TABLE:
--   debate_effect_state   — per-instance charge tracking for
--                           active effects in a live debate
--
-- NEW TRIGGER:
--   seed_effect_state_on_live — fires when arena_debates.status
--                               transitions to 'live'; seeds
--                               debate_effect_state from loadout
--                               + reference_sockets, marks
--                               debate_powerup_loadout.consumed
--
-- NEW HELPER:
--   _apply_in_debate_modifiers — computes AND consumes charges
--                                in one shot; returns multiplier
--                                and flat bonus
--
-- REPLACED RPC:
--   score_debate_comment — adds modifier math; scoreboard now
--                          updated by final_contribution; metadata
--                          gains base_score / in_debate_multiplier /
--                          in_debate_flat / final_contribution
--
-- Run in Supabase SQL Editor against faomczmipsccwbhpivmp.
-- No rows returned = success.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SECTION 0: WIDEN SCORE COLUMNS
-- score_a / score_b were INTEGER. F-57 modifiers can produce
-- fractional contributions (e.g. 2 × 1.25 = 2.5). Widening to
-- NUMERIC preserves exact totals. All existing integer values
-- are valid NUMERIC values — no data loss.
-- update_arena_debate(p_score_a INTEGER) still works: int
-- auto-casts to numeric on assignment.
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.arena_debates
  ALTER COLUMN score_a TYPE NUMERIC USING score_a::numeric,
  ALTER COLUMN score_b TYPE NUMERIC USING score_b::numeric;

-- ────────────────────────────────────────────────────────────
-- SECTION 1: debate_effect_state TABLE
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.debate_effect_state (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id         UUID    NOT NULL REFERENCES public.arena_debates(id)   ON DELETE CASCADE,
  user_id           UUID    NOT NULL REFERENCES public.profiles(id)        ON DELETE CASCADE,
  effect_id         TEXT    NOT NULL REFERENCES public.modifier_effects(id),
  source            TEXT    NOT NULL CHECK (source IN ('powerup','socket')),
  -- NULL  = unlimited (Group A always-active + streak)
  -- > 0   = charges remaining
  -- 0     = spent (row kept for audit)
  charges_remaining INTEGER,
  -- Used exclusively by the 'streak' effect
  streak_value      NUMERIC NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_debate_effect_state_active ON public.debate_effect_state
  (debate_id, user_id)
  WHERE charges_remaining IS NULL OR charges_remaining > 0;

COMMENT ON TABLE public.debate_effect_state IS
  'Live per-instance charge state for in-debate modifier effects. Seeded on status->live.';

ALTER TABLE public.debate_effect_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debate_effect_state_owner_select" ON public.debate_effect_state
  FOR SELECT USING (auth.uid() = user_id);
-- All writes via SECURITY DEFINER functions only

-- ────────────────────────────────────────────────────────────
-- SECTION 2: INITIAL CHARGES HELPER
-- Returns the starting charge count for a given effect_id.
-- NULL = unlimited (Group A + streak).
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._effect_initial_charges(p_effect_id TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE STRICT
AS $$
  SELECT CASE p_effect_id
    -- Group A: always-active while condition holds
    WHEN 'rally'         THEN NULL
    WHEN 'finisher'      THEN NULL
    WHEN 'opening_gambit'THEN NULL
    WHEN 'banner'        THEN NULL
    WHEN 'underdog_surge'THEN NULL
    -- Special counter
    WHEN 'streak'        THEN NULL
    WHEN 'spite'         THEN NULL  -- unlimited but conditional on last-scorer
    -- Multi-charge effects
    WHEN 'echo'          THEN 2
    WHEN 'double_tap'    THEN 3
    WHEN 'choke'         THEN 2
    WHEN 'comeback'      THEN 2
    -- Everything else: 1 charge
    ELSE 1
  END;
$$;

-- ────────────────────────────────────────────────────────────
-- SECTION 3: TRIGGER — SEED STATE ON status → 'live'
-- Inserts one row per active in-debate effect per debater.
-- Sources: debate_powerup_loadout + reference_sockets.
-- Also marks debate_powerup_loadout.consumed = TRUE.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._seed_debate_effect_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  -- Only fire on the specific transition pending/lobby/matched → live
  IF NEW.status != 'live' OR OLD.status = 'live' THEN
    RETURN NEW;
  END IF;

  -- ── Seed from power-up loadout (both debaters) ──────────
  INSERT INTO public.debate_effect_state
    (debate_id, user_id, effect_id, source, charges_remaining)
  SELECT
    NEW.id,
    dpl.user_id,
    dpl.effect_id,
    'powerup',
    public._effect_initial_charges(dpl.effect_id)
  FROM public.debate_powerup_loadout dpl
  JOIN public.modifier_effects me ON me.id = dpl.effect_id
  WHERE dpl.debate_id = NEW.id
    AND me.timing = 'in_debate'
    AND dpl.consumed = FALSE;

  -- ── Seed from reference sockets (both debaters' owned refs) ─
  INSERT INTO public.debate_effect_state
    (debate_id, user_id, effect_id, source, charges_remaining)
  SELECT
    NEW.id,
    ar.user_id,
    rs.effect_id,
    'socket',
    public._effect_initial_charges(rs.effect_id)
  FROM public.reference_sockets rs
  JOIN public.arsenal_references ar ON ar.id = rs.reference_id
  JOIN public.modifier_effects me   ON me.id = rs.effect_id
  WHERE ar.user_id IN (NEW.debater_a, NEW.debater_b)
    AND me.timing = 'in_debate';

  -- ── Mark loadout consumed ────────────────────────────────
  UPDATE public.debate_powerup_loadout
  SET consumed = TRUE
  WHERE debate_id = NEW.id;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS seed_effect_state_on_live ON public.arena_debates;
CREATE TRIGGER seed_effect_state_on_live
  AFTER UPDATE OF status ON public.arena_debates
  FOR EACH ROW
  EXECUTE FUNCTION public._seed_debate_effect_state();

-- ────────────────────────────────────────────────────────────
-- SECTION 4: _apply_in_debate_modifiers
--
-- Computes combined multiplier + flat bonus for a comment being
-- scored, then immediately consumes / updates charge state.
-- Called inside score_debate_comment (same transaction).
--
-- p_score_debater / p_score_opponent are the CURRENT totals
-- before this award (used for comeback/underdog conditions).
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._apply_in_debate_modifiers(
  p_debate_id        UUID,
  p_debater_uid      UUID,
  p_opponent_uid     UUID,
  p_round            INTEGER,
  p_base_score       INTEGER,
  p_score_debater    INTEGER,
  p_score_opponent   INTEGER,
  p_debater_elo      INTEGER,
  p_opponent_elo     INTEGER
)
RETURNS TABLE(out_multiplier NUMERIC, out_flat NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$

DECLARE
  v_multiplier      NUMERIC := 1.0;
  v_flat            NUMERIC := 0.0;
  v_score_diff      INTEGER := p_score_debater - p_score_opponent;
  v_last_side       TEXT    := NULL;
  v_eff             RECORD;
  v_streak_row_id   UUID    := NULL;
  v_new_streak      NUMERIC := 0;
BEGIN

  -- ── Determine last scored side (for spite) ───────────────
  SELECT dfe.side INTO v_last_side
  FROM public.debate_feed_events dfe
  WHERE dfe.debate_id = p_debate_id
    AND dfe.event_type = 'point_award'
  ORDER BY dfe.id DESC
  LIMIT 1;

  -- ────────────────────────────────────────────────────────
  -- SELF EFFECTS (debater's own effects)
  -- ────────────────────────────────────────────────────────

  FOR v_eff IN
    SELECT des.*
    FROM public.debate_effect_state des
    JOIN public.modifier_effects me ON me.id = des.effect_id
    WHERE des.debate_id = p_debate_id
      AND des.user_id   = p_debater_uid
      AND me.category  != 'opponent_debuff'
      AND (des.charges_remaining IS NULL OR des.charges_remaining > 0)
    ORDER BY des.created_at
  LOOP

    CASE v_eff.effect_id

      -- ── Group A: round-scoped, always-active ─────────────
      WHEN 'rally' THEN
        v_multiplier := v_multiplier + 0.5;    -- ×1.5

      WHEN 'finisher' THEN
        IF p_round = 4 THEN
          v_multiplier := v_multiplier + 1.0;  -- ×2
        END IF;

      WHEN 'opening_gambit' THEN
        IF p_round = 1 THEN
          v_multiplier := v_multiplier + 1.0;  -- ×2
        END IF;

      WHEN 'banner' THEN
        v_flat := v_flat + 0.5;

      WHEN 'underdog_surge' THEN
        IF p_debater_elo < p_opponent_elo THEN
          v_flat := v_flat + 1.0;
        END IF;

      -- ── streak: accumulates +0.5 per consecutive score ───
      WHEN 'streak' THEN
        v_streak_row_id := v_eff.id;
        v_flat := v_flat + v_eff.streak_value;
        -- Will update streak_value AFTER determining side logic below

      -- ── spite: ×1.5 if last award was opponent's side ────
      WHEN 'spite' THEN
        IF v_last_side IS NOT NULL AND v_last_side != (
          -- figure out which side this debater is
          SELECT CASE WHEN d.debater_a = p_debater_uid THEN 'a' ELSE 'b' END
          FROM public.arena_debates d WHERE d.id = p_debate_id
        ) THEN
          v_multiplier := v_multiplier + 0.5;  -- ×1.5
        END IF;
        -- spite is unlimited — no charge decrement

      -- ── Group B: charge-based self effects ───────────────
      WHEN 'amplify' THEN
        v_multiplier := v_multiplier + 1.0;    -- ×2
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'surge' THEN
        v_multiplier := v_multiplier + 0.5;    -- ×1.5
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'echo' THEN
        v_multiplier := v_multiplier + 0.25;   -- ×1.25
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'boost' THEN
        v_flat := v_flat + 2.0;
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'double_tap' THEN
        v_flat := v_flat + 1.0;
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'comeback' THEN
        IF v_score_diff <= -5 THEN
          v_multiplier := v_multiplier + 1.0;  -- ×2
          UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;
        END IF;

      WHEN 'overload' THEN
        IF p_base_score >= 3 THEN
          v_multiplier := v_multiplier + 2.0;  -- ×3
          UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;
        END IF;

      ELSE NULL; -- cite-triggered + deferred effects: no-op for now

    END CASE;
  END LOOP;

  -- ── Update streak state ──────────────────────────────────
  -- If streak effect is active: increment streak_value for next time.
  -- (This comment IS being scored, so streak continues.)
  IF v_streak_row_id IS NOT NULL THEN
    UPDATE public.debate_effect_state
    SET streak_value = streak_value + 0.5
    WHERE id = v_streak_row_id;
  END IF;

  -- Reset ANY streak effects for the opponent (their streak breaks
  -- when this debater gets scored).
  UPDATE public.debate_effect_state
  SET streak_value = 0
  WHERE debate_id = p_debate_id
    AND user_id   = p_opponent_uid
    AND effect_id = 'streak';

  -- ────────────────────────────────────────────────────────
  -- OPPONENT DEBUFF EFFECTS (opponent equipped, target debater)
  -- ────────────────────────────────────────────────────────

  FOR v_eff IN
    SELECT des.*
    FROM public.debate_effect_state des
    JOIN public.modifier_effects me ON me.id = des.effect_id
    WHERE des.debate_id = p_debate_id
      AND des.user_id   = p_opponent_uid
      AND me.category   = 'opponent_debuff'
      AND (des.charges_remaining IS NULL OR des.charges_remaining > 0)
    ORDER BY des.created_at
  LOOP

    CASE v_eff.effect_id

      WHEN 'dampen' THEN
        v_multiplier := v_multiplier - 0.5;    -- ×0.5
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'drain' THEN
        v_multiplier := v_multiplier - 1.0;    -- ×0 (floors at 0 in caller)
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'choke' THEN
        v_flat := v_flat - 1.0;
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'interrupt' THEN
        v_multiplier := v_multiplier - 1.0;    -- ×0 (floors at 0)
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      ELSE NULL;

    END CASE;
  END LOOP;

  out_multiplier := v_multiplier;
  out_flat       := v_flat;
  RETURN NEXT;
END;
$fn$;

-- ────────────────────────────────────────────────────────────
-- SECTION 5: score_debate_comment — FULL REPLACEMENT
--
-- Changes vs original:
--   + Resolve debater/opponent user IDs and Elos
--   + Call _apply_in_debate_modifiers → v_multiplier, v_flat
--   + Compute v_final (floored at 0, rounded to 2dp)
--   + Scoreboard UPDATE uses v_final, not p_score
--   + point_award metadata adds base_score, in_debate_multiplier,
--     in_debate_flat, final_contribution
--   + RETURN adds base_score, in_debate_multiplier,
--     in_debate_flat, final_contribution
--
-- Everything else (auth, budget, dedup, analytics) unchanged.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.score_debate_comment(
  p_debate_id      UUID,
  p_feed_event_id  BIGINT,
  p_score          INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$

DECLARE
  v_uid               UUID := auth.uid();
  v_debate            RECORD;
  v_target            RECORD;
  v_side              TEXT;
  v_new_score_a       NUMERIC;   -- Changed to NUMERIC (final_contribution may be decimal)
  v_new_score_b       NUMERIC;
  v_value_used        INT;
  v_value_limit       INT;
  v_target_round      INT;
  v_award_event_id    BIGINT;
  -- Modifier additions
  v_debater_uid       UUID;
  v_opponent_uid      UUID;
  v_debater_elo       INT;
  v_opponent_elo      INT;
  v_score_debater     INT;
  v_score_opponent    INT;
  v_multiplier        NUMERIC;
  v_flat              NUMERIC;
  v_final             NUMERIC;
BEGIN

  -- ── Auth ──────────────────────────────────────────────────
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ── Load debate ───────────────────────────────────────────
  SELECT * INTO v_debate FROM public.arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- ── Caller must be this debate's moderator ────────────────
  IF v_uid != v_debate.moderator_id THEN
    RAISE EXCEPTION 'Only the moderator can score comments';
  END IF;

  -- ── Debate must be in progress ────────────────────────────
  IF v_debate.status NOT IN ('live', 'round_break') THEN
    RAISE EXCEPTION 'Debate must be live or in round break to score';
  END IF;

  -- ── Score range ───────────────────────────────────────────
  IF p_score < 1 OR p_score > 5 THEN
    RAISE EXCEPTION 'Score must be between 1 and 5';
  END IF;

  -- ── Load target feed event ────────────────────────────────
  SELECT * INTO v_target
  FROM public.debate_feed_events
  WHERE id = p_feed_event_id AND debate_id = p_debate_id;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Feed event not found in this debate';
  END IF;

  -- ── Target must be a speech event ─────────────────────────
  IF v_target.event_type != 'speech' THEN
    RAISE EXCEPTION 'Can only score speech events';
  END IF;

  -- ── Determine which side gets the points ──────────────────
  v_side := v_target.side;
  IF v_side NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'Speech event has invalid side';
  END IF;

  -- ── Double-scoring prevention ─────────────────────────────
  IF EXISTS (
    SELECT 1 FROM public.debate_feed_events
    WHERE debate_id = p_debate_id
      AND event_type = 'point_award'
      AND metadata->>'scored_event_id' = p_feed_event_id::text
  ) THEN
    RAISE EXCEPTION 'This comment has already been scored';
  END IF;

  -- ── Per-value budget enforcement ──────────────────────────
  v_target_round := v_target.round;

  CASE p_score
    WHEN 5 THEN v_value_limit := 2;
    WHEN 4 THEN v_value_limit := 3;
    WHEN 3 THEN v_value_limit := 4;
    WHEN 2 THEN v_value_limit := 5;
    WHEN 1 THEN v_value_limit := 6;
  END CASE;

  SELECT COUNT(*) INTO v_value_used
  FROM public.debate_feed_events
  WHERE debate_id = p_debate_id
    AND event_type = 'point_award'
    AND round = v_target_round
    AND score = p_score;

  IF v_value_used >= v_value_limit THEN
    RAISE EXCEPTION 'Budget exhausted: % pt scores used %/% this round',
      p_score, v_value_used, v_value_limit;
  END IF;

  -- ── Resolve debater / opponent UIDs + Elo ─────────────────
  IF v_side = 'a' THEN
    v_debater_uid  := v_debate.debater_a;
    v_opponent_uid := v_debate.debater_b;
    v_score_debater  := COALESCE(v_debate.score_a, 0);
    v_score_opponent := COALESCE(v_debate.score_b, 0);
  ELSE
    v_debater_uid  := v_debate.debater_b;
    v_opponent_uid := v_debate.debater_a;
    v_score_debater  := COALESCE(v_debate.score_b, 0);
    v_score_opponent := COALESCE(v_debate.score_a, 0);
  END IF;

  SELECT COALESCE(elo_rating, 1200) INTO v_debater_elo
  FROM public.profiles WHERE id = v_debater_uid;
  SELECT COALESCE(elo_rating, 1200) INTO v_opponent_elo
  FROM public.profiles WHERE id = v_opponent_uid;

  -- ── Apply in-debate modifiers ──────────────────────────────
  -- If no effect state rows exist (no F-57 effects equipped),
  -- the helper returns multiplier=1.0, flat=0 — correct fallback.
  SELECT out_multiplier, out_flat
  INTO v_multiplier, v_flat
  FROM public._apply_in_debate_modifiers(
    p_debate_id,
    v_debater_uid,
    v_opponent_uid,
    v_target_round,
    p_score,
    v_score_debater,
    v_score_opponent,
    v_debater_elo,
    v_opponent_elo
  );

  -- Fallback if no rows returned (no active effects)
  IF v_multiplier IS NULL THEN v_multiplier := 1.0; END IF;
  IF v_flat       IS NULL THEN v_flat       := 0.0; END IF;

  -- ── Compute final contribution (floor 0, round to 2dp) ────
  v_final := GREATEST(0, ROUND((p_score * v_multiplier + v_flat)::numeric, 2));

  -- ── Atomic scoreboard increment ───────────────────────────
  -- Score columns store running totals as NUMERIC to support
  -- fractional contributions from modifiers.
  IF v_side = 'a' THEN
    UPDATE public.arena_debates
    SET score_a = COALESCE(score_a, 0) + v_final
    WHERE id = p_debate_id
    RETURNING score_a, score_b INTO v_new_score_a, v_new_score_b;
  ELSE
    UPDATE public.arena_debates
    SET score_b = COALESCE(score_b, 0) + v_final
    WHERE id = p_debate_id
    RETURNING score_a, score_b INTO v_new_score_a, v_new_score_b;
  END IF;

  -- ── Insert point_award feed event ─────────────────────────
  -- debate_feed_events.score stores base_score (integer, 1-5)
  -- for budget tracking. final_contribution lives in metadata.
  INSERT INTO public.debate_feed_events (
    debate_id, user_id, event_type, round, side, content, score,
    reference_id, metadata
  ) VALUES (
    p_debate_id,
    v_uid,
    'point_award',
    v_target_round,
    v_side,
    NULL,
    p_score,   -- base score in the column (budget tracking)
    NULL,
    jsonb_build_object(
      'scored_event_id',       p_feed_event_id,
      'score_a_after',         v_new_score_a,
      'score_b_after',         v_new_score_b,
      'base_score',            p_score,
      'in_debate_multiplier',  v_multiplier,
      'in_debate_flat',        v_flat,
      'final_contribution',    v_final
    )
  )
  RETURNING id INTO v_award_event_id;

  -- ── Analytics double-write ────────────────────────────────
  PERFORM public.log_event(
    'feed_point_award'::text,
    v_uid,
    p_debate_id,
    v_debate.category,
    v_side,
    jsonb_build_object(
      'feed_event_id',         v_award_event_id,
      'scored_event_id',       p_feed_event_id,
      'base_score',            p_score,
      'in_debate_multiplier',  v_multiplier,
      'in_debate_flat',        v_flat,
      'final_contribution',    v_final,
      'round',                 v_target_round,
      'score_a_after',         v_new_score_a,
      'score_b_after',         v_new_score_b
    )
  );

  RETURN json_build_object(
    'success',                true,
    'id',                     v_award_event_id,
    'side',                   v_side,
    'round',                  v_target_round,
    'base_score',             p_score,
    'in_debate_multiplier',   v_multiplier,
    'in_debate_flat',         v_flat,
    'final_contribution',     v_final,
    'score_a',                v_new_score_a,
    'score_b',                v_new_score_b
  );

END;
$function$;

-- ────────────────────────────────────────────────────────────
-- DONE
-- Expected: no rows returned.
--
-- New:     debate_effect_state table
--          _effect_initial_charges() IMMUTABLE helper
--          _seed_debate_effect_state() trigger function
--          seed_effect_state_on_live trigger on arena_debates
--          _apply_in_debate_modifiers() compute+consume helper
--
-- Replaced: score_debate_comment — now applies in-debate modifier
--           math; scoreboard incremented by final_contribution;
--           metadata contains full scoring chain for B2B.
--
-- NOTE: score_a/score_b on arena_debates have been widened
-- to NUMERIC (Section 0 above). The existing INTEGER column
-- type is now NUMERIC — fractional contributions are preserved.
-- ────────────────────────────────────────────────────────────
