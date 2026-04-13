-- ══════════════════════════════════════════════════════════════════
-- Fix: apply_end_of_debate_modifiers idempotency guard
-- ══════════════════════════════════════════════════════════════════
-- Finding H-A2 (Batch 2 audit, confirmed 2026-04-13 via SQL inspection):
--
-- The function apply_end_of_debate_modifiers has no idempotency
-- protection. It reads score_a/score_b from arena_debates, applies
-- end-of-debate effects, and writes the result back. Because both
-- PvP clients call this RPC independently at end-of-debate, every
-- modifier compounds — the second call reads the already-adjusted
-- scores as the raw values and applies its adjustments on top.
--
-- Example with point_surge (+1 to A):
--   Call 1: raw 7/5 → writes 8/5
--   Call 2: reads 8/5 as raw → writes 9/5
--
-- Also _apply_inventory_effects is called unconditionally whenever
-- there's a winner, so any tokens / items / streak bonuses granted
-- inside it are granted twice.
--
-- Affected effects: point_surge, comeback_engine, last_word, underdog,
-- counter_cite, momentum, point_siphon, pressure_cooker, point_shield,
-- plus everything inside _apply_inventory_effects.
--
-- This has been double-applying on every PvP debate since launch.
--
-- ══════════════════════════════════════════════════════════════════
-- Fix approach:
--
-- 1. Add arena_debates.modifiers_applied BOOLEAN DEFAULT FALSE.
-- 2. Wrap apply_end_of_debate_modifiers in a short-circuit: if the
--    flag is already TRUE, return a cached result built from the
--    already-stored final scores and skip all side effects.
-- 3. At the very end of the function (just before the RETURN), set
--    the flag to TRUE.
--
-- The cached-return path reads score_a/score_b as the final scores
-- (because by that point they ARE final — the first call wrote them
-- in place) and returns them with empty adjustment lists. Callers
-- that wanted the adjustment breakdown will get it from the first
-- call; the second call gets a "no-op, here are the final scores"
-- response.
--
-- ══════════════════════════════════════════════════════════════════

BEGIN;

-- Step 1: Add the idempotency flag column.
-- Existing rows (pre-fix debates) will get FALSE by default, which
-- means a re-call on an old debate would re-apply effects. That is
-- acceptable because old debates are already complete and nothing
-- in-app re-calls this RPC on a closed debate. New debates going
-- forward will be protected.

ALTER TABLE public.arena_debates
  ADD COLUMN IF NOT EXISTS modifiers_applied BOOLEAN NOT NULL DEFAULT FALSE;

-- Step 2: Backfill the flag as TRUE for any debate that is already
-- status = 'complete'. This prevents re-entering the effect loop on
-- historical debates if the client ever re-calls the RPC on them.

UPDATE public.arena_debates
   SET modifiers_applied = TRUE
 WHERE status = 'complete';

-- Step 3: Replace the function with the idempotent version.
-- The body is identical to the current function EXCEPT:
--   (a) an early-return guard right after the participant check
--   (b) a modifiers_applied = TRUE write immediately before RETURN

CREATE OR REPLACE FUNCTION public.apply_end_of_debate_modifiers(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_uid               UUID := auth.uid();
  v_debate            RECORD;
  v_raw_a             NUMERIC;
  v_raw_b             NUMERIC;
  v_adj_a             NUMERIC := 0;
  v_adj_b             NUMERIC := 0;
  v_adj_list_a        JSONB   := '[]'::jsonb;
  v_adj_list_b        JSONB   := '[]'::jsonb;
  v_elo_a             INT;
  v_elo_b             INT;
  v_cite_a            INT;
  v_cite_b            INT;
  v_spoke_final_a     BOOLEAN;
  v_spoke_final_b     BOOLEAN;
  v_total_rounds      INT;
  v_eff               RECORD;
  v_delta             NUMERIC;
  v_final_a           NUMERIC;
  v_final_b           NUMERIC;
  v_shield_a_consumed BOOLEAN := FALSE;
  v_shield_b_consumed BOOLEAN := FALSE;
  v_a_has_shield      BOOLEAN := FALSE;
  v_b_has_shield      BOOLEAN := FALSE;
  v_inventory_effects JSONB   := '[]'::jsonb;
  v_winner_id         UUID;
  v_loser_id          UUID;
  v_rnd               RECORD;
  v_streak_a          INT := 0;
  v_max_streak_a      INT := 0;
  v_streak_b          INT := 0;
  v_max_streak_b      INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the row so concurrent callers serialize on the flag check.
  SELECT * INTO v_debate FROM public.arena_debates
    WHERE id = p_debate_id
    FOR UPDATE;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_uid NOT IN (
    v_debate.debater_a,
    COALESCE(v_debate.debater_b,    '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(v_debate.moderator_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Not a participant in this debate';
  END IF;

  -- ── IDEMPOTENCY GUARD (H-A2 fix) ─────────────────────────
  -- If modifiers have already been applied, return the stored
  -- final scores with empty adjustment lists and skip all side
  -- effects. The first caller got the full breakdown; subsequent
  -- callers just learn that it's already done.
  IF COALESCE(v_debate.modifiers_applied, FALSE) THEN
    RETURN json_build_object(
      'already_applied', true,
      'debater_a', json_build_object(
        'raw_score',   COALESCE(v_debate.score_a, 0),
        'adjustments', '[]'::jsonb,
        'final_score', COALESCE(v_debate.score_a, 0)
      ),
      'debater_b', json_build_object(
        'raw_score',   COALESCE(v_debate.score_b, 0),
        'adjustments', '[]'::jsonb,
        'final_score', COALESCE(v_debate.score_b, 0)
      ),
      'inventory_effects', '[]'::jsonb
    );
  END IF;

  v_raw_a        := COALESCE(v_debate.score_a, 0);
  v_raw_b        := COALESCE(v_debate.score_b, 0);
  v_total_rounds := COALESCE(v_debate.total_rounds, 4);

  SELECT COALESCE(elo_rating, 1200) INTO v_elo_a FROM public.profiles WHERE id = v_debate.debater_a;
  SELECT COALESCE(elo_rating, 1200) INTO v_elo_b FROM public.profiles WHERE id = v_debate.debater_b;

  SELECT COUNT(*) INTO v_cite_a FROM public.debate_feed_events
  WHERE debate_id = p_debate_id AND event_type = 'reference_cite' AND side = 'a';
  SELECT COUNT(*) INTO v_cite_b FROM public.debate_feed_events
  WHERE debate_id = p_debate_id AND event_type = 'reference_cite' AND side = 'b';

  SELECT EXISTS (SELECT 1 FROM public.debate_feed_events
    WHERE debate_id = p_debate_id AND event_type = 'speech'
      AND side = 'a' AND round = v_total_rounds) INTO v_spoke_final_a;
  SELECT EXISTS (SELECT 1 FROM public.debate_feed_events
    WHERE debate_id = p_debate_id AND event_type = 'speech'
      AND side = 'b' AND round = v_total_rounds) INTO v_spoke_final_b;

  -- ── momentum: compute longest consecutive leading streak ──
  FOR v_rnd IN
    SELECT score_a, score_b
    FROM   debate_round_scores
    WHERE  debate_id = p_debate_id
    ORDER  BY round ASC
  LOOP
    IF v_rnd.score_a > v_rnd.score_b THEN
      v_streak_a    := v_streak_a + 1;
      v_max_streak_a := GREATEST(v_max_streak_a, v_streak_a);
      v_streak_b    := 0;
    ELSIF v_rnd.score_b > v_rnd.score_a THEN
      v_streak_b    := v_streak_b + 1;
      v_max_streak_b := GREATEST(v_max_streak_b, v_streak_b);
      v_streak_a    := 0;
    ELSE
      v_streak_a := 0;
      v_streak_b := 0;
    END IF;
  END LOOP;

  -- ── point_shield pre-check ────────────────────────────────
  v_a_has_shield := _has_eod_effect(p_debate_id, v_debate.debater_a, 'point_shield');
  v_b_has_shield := _has_eod_effect(p_debate_id, v_debate.debater_b, 'point_shield');

  -- ══════════════════════════════════════════════════════════
  -- DEBATER A: own-score effects
  -- ══════════════════════════════════════════════════════════
  FOR v_eff IN
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.debate_powerup_loadout dpl
    JOIN public.modifier_effects me ON me.id = dpl.effect_id
    WHERE dpl.debate_id = p_debate_id AND dpl.user_id = v_debate.debater_a
      AND me.timing = 'end_of_debate' AND me.category != 'opponent_debuff'
    UNION ALL
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.reference_sockets rs
    JOIN public.user_modifiers um  ON um.id  = rs.modifier_id
    JOIN public.modifier_effects me ON me.id = rs.effect_id
    WHERE um.user_id = v_debate.debater_a
      AND me.timing = 'end_of_debate' AND me.category != 'opponent_debuff'
  LOOP
    v_delta := 0;
    CASE v_eff.effect_id
      WHEN 'point_surge'      THEN v_delta := 1;
      WHEN 'comeback_engine'  THEN IF v_raw_a < v_raw_b - 4 THEN v_delta := 2; END IF;
      WHEN 'last_word'        THEN IF v_spoke_final_a THEN v_delta := 3; END IF;
      WHEN 'underdog'         THEN IF v_elo_a < v_elo_b THEN v_delta := v_total_rounds * 1; END IF;
      WHEN 'counter_cite'     THEN v_delta := v_cite_b;
      WHEN 'momentum'         THEN v_delta := v_max_streak_a * 0.5;
      ELSE NULL;
    END CASE;
    IF v_delta != 0 THEN
      v_adj_a      := v_adj_a + v_delta;
      v_adj_list_a := v_adj_list_a || jsonb_build_object('effect_id', v_eff.effect_id, 'effect_name', v_eff.effect_name, 'delta', v_delta);
    END IF;
  END LOOP;

  -- ══════════════════════════════════════════════════════════
  -- DEBATER B: own-score effects
  -- ══════════════════════════════════════════════════════════
  FOR v_eff IN
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.debate_powerup_loadout dpl
    JOIN public.modifier_effects me ON me.id = dpl.effect_id
    WHERE dpl.debate_id = p_debate_id AND dpl.user_id = v_debate.debater_b
      AND me.timing = 'end_of_debate' AND me.category != 'opponent_debuff'
    UNION ALL
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.reference_sockets rs
    JOIN public.user_modifiers um  ON um.id  = rs.modifier_id
    JOIN public.modifier_effects me ON me.id = rs.effect_id
    WHERE um.user_id = v_debate.debater_b
      AND me.timing = 'end_of_debate' AND me.category != 'opponent_debuff'
  LOOP
    v_delta := 0;
    CASE v_eff.effect_id
      WHEN 'point_surge'      THEN v_delta := 1;
      WHEN 'comeback_engine'  THEN IF v_raw_b < v_raw_a - 4 THEN v_delta := 2; END IF;
      WHEN 'last_word'        THEN IF v_spoke_final_b THEN v_delta := 3; END IF;
      WHEN 'underdog'         THEN IF v_elo_b < v_elo_a THEN v_delta := v_total_rounds * 1; END IF;
      WHEN 'counter_cite'     THEN v_delta := v_cite_a;
      WHEN 'momentum'         THEN v_delta := v_max_streak_b * 0.5;
      ELSE NULL;
    END CASE;
    IF v_delta != 0 THEN
      v_adj_b      := v_adj_b + v_delta;
      v_adj_list_b := v_adj_list_b || jsonb_build_object('effect_id', v_eff.effect_id, 'effect_name', v_eff.effect_name, 'delta', v_delta);
    END IF;
  END LOOP;

  -- ══════════════════════════════════════════════════════════
  -- B's debuffs applied to A (with point_shield check on A)
  -- ══════════════════════════════════════════════════════════
  FOR v_eff IN
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.debate_powerup_loadout dpl
    JOIN public.modifier_effects me ON me.id = dpl.effect_id
    WHERE dpl.debate_id = p_debate_id AND dpl.user_id = v_debate.debater_b
      AND me.timing = 'end_of_debate' AND me.category = 'opponent_debuff'
    UNION ALL
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.reference_sockets rs
    JOIN public.user_modifiers um  ON um.id  = rs.modifier_id
    JOIN public.modifier_effects me ON me.id = rs.effect_id
    WHERE um.user_id = v_debate.debater_b
      AND me.timing = 'end_of_debate' AND me.category = 'opponent_debuff'
  LOOP
    IF v_a_has_shield AND NOT v_shield_a_consumed THEN
      v_shield_a_consumed := TRUE;
      v_adj_list_a := v_adj_list_a || jsonb_build_object(
        'effect_id', 'point_shield', 'effect_name', 'Point Shield',
        'delta', 0, 'source', 'shield_blocked', 'blocked', v_eff.effect_id
      );
      CONTINUE;
    END IF;
    v_delta := 0;
    CASE v_eff.effect_id
      WHEN 'point_siphon'    THEN v_delta := -1;
      WHEN 'pressure_cooker' THEN IF v_cite_a = 0 THEN v_delta := -1; END IF;
      ELSE NULL;
    END CASE;
    IF v_delta != 0 THEN
      v_adj_a      := v_adj_a + v_delta;
      v_adj_list_a := v_adj_list_a || jsonb_build_object('effect_id', v_eff.effect_id, 'effect_name', v_eff.effect_name, 'delta', v_delta, 'source', 'opponent');
    END IF;
  END LOOP;

  -- ══════════════════════════════════════════════════════════
  -- A's debuffs applied to B (with point_shield check on B)
  -- ══════════════════════════════════════════════════════════
  FOR v_eff IN
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.debate_powerup_loadout dpl
    JOIN public.modifier_effects me ON me.id = dpl.effect_id
    WHERE dpl.debate_id = p_debate_id AND dpl.user_id = v_debate.debater_a
      AND me.timing = 'end_of_debate' AND me.category = 'opponent_debuff'
    UNION ALL
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.reference_sockets rs
    JOIN public.user_modifiers um  ON um.id  = rs.modifier_id
    JOIN public.modifier_effects me ON me.id = rs.effect_id
    WHERE um.user_id = v_debate.debater_a
      AND me.timing = 'end_of_debate' AND me.category = 'opponent_debuff'
  LOOP
    IF v_b_has_shield AND NOT v_shield_b_consumed THEN
      v_shield_b_consumed := TRUE;
      v_adj_list_b := v_adj_list_b || jsonb_build_object(
        'effect_id', 'point_shield', 'effect_name', 'Point Shield',
        'delta', 0, 'source', 'shield_blocked', 'blocked', v_eff.effect_id
      );
      CONTINUE;
    END IF;
    v_delta := 0;
    CASE v_eff.effect_id
      WHEN 'point_siphon'    THEN v_delta := -1;
      WHEN 'pressure_cooker' THEN IF v_cite_b = 0 THEN v_delta := -1; END IF;
      ELSE NULL;
    END CASE;
    IF v_delta != 0 THEN
      v_adj_b      := v_adj_b + v_delta;
      v_adj_list_b := v_adj_list_b || jsonb_build_object('effect_id', v_eff.effect_id, 'effect_name', v_eff.effect_name, 'delta', v_delta, 'source', 'opponent');
    END IF;
  END LOOP;

  -- ── Apply score adjustments ───────────────────────────────
  v_final_a := GREATEST(0, v_raw_a + v_adj_a);
  v_final_b := GREATEST(0, v_raw_b + v_adj_b);

  UPDATE public.arena_debates
  SET score_a = v_final_a,
      score_b = v_final_b,
      modifiers_applied = TRUE  -- H-A2 fix: set flag in the same UPDATE
  WHERE id = p_debate_id;

  -- ── Inventory effects (S270 inventory cluster) ───────────
  IF v_final_a > v_final_b AND v_debate.debater_b IS NOT NULL THEN
    v_winner_id := v_debate.debater_a;
    v_loser_id  := v_debate.debater_b;
  ELSIF v_final_b > v_final_a AND v_debate.debater_b IS NOT NULL THEN
    v_winner_id := v_debate.debater_b;
    v_loser_id  := v_debate.debater_a;
  END IF;

  IF v_winner_id IS NOT NULL THEN
    v_inventory_effects := _apply_inventory_effects(p_debate_id, v_winner_id, v_loser_id);
  END IF;

  RETURN json_build_object(
    'debater_a', json_build_object(
      'raw_score',   v_raw_a,
      'adjustments', v_adj_list_a,
      'final_score', v_final_a
    ),
    'debater_b', json_build_object(
      'raw_score',   v_raw_b,
      'adjustments', v_adj_list_b,
      'final_score', v_final_b
    ),
    'inventory_effects', v_inventory_effects
  );
END;
$function$;

COMMIT;

-- ══════════════════════════════════════════════════════════════════
-- Verification: run these after the migration applies.
-- ══════════════════════════════════════════════════════════════════
--
-- 1. Confirm the column exists:
--      SELECT column_name, data_type, column_default
--        FROM information_schema.columns
--       WHERE table_name = 'arena_debates' AND column_name = 'modifiers_applied';
--
-- 2. Confirm the flag was backfilled for completed debates:
--      SELECT status, modifiers_applied, COUNT(*)
--        FROM public.arena_debates
--       GROUP BY 1, 2;
--
-- 3. Confirm the new function body contains the guard:
--      SELECT pg_get_functiondef('public.apply_end_of_debate_modifiers(uuid)'::regprocedure)
--             LIKE '%already_applied%' AS has_guard;
--      -- Expect: has_guard = TRUE
--
-- 4. Smoke test (optional): on a test debate with an equipped
--    end-of-debate modifier, call the RPC twice and confirm the
--    second call returns already_applied=true with empty adjustment
--    arrays and the stored scores do not change between calls.
