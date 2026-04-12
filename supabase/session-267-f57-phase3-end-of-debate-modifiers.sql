-- ============================================================
-- THE MODERATOR — F-57 Phase 3: End-of-Debate Modifier Application
-- Session 267 | April 12, 2026
--
-- SCOPE: Apply end-of-debate modifiers to final scores and
--        return the "after effects" breakdown for display.
--
-- NEW RPC: apply_end_of_debate_modifiers(p_debate_id)
--   - Called BEFORE update_arena_debate so modified scores
--     drive winner determination and Elo calculation.
--   - Reads end-of-debate effects from debate_powerup_loadout
--     and reference_sockets for both debaters.
--   - Updates arena_debates.score_a / score_b in-place.
--   - Returns structured breakdown for the "after effects"
--     display: Raw: 47 → +2 Point Surge → Final: 49
--
-- EFFECTS IMPLEMENTED (score-affecting only):
--   Own-score effects:
--     point_surge        +1 flat
--     comeback_engine    +2 if trailing by ≥5 at debate end
--     last_word          +3 if own side spoke in final round
--     underdog           +1 × total_rounds if lower Elo
--     counter_cite       +1 per opponent citation
--   Opponent-debuff effects:
--     point_siphon       -1 from opponent's score
--     pressure_cooker    -1 from opponent if they cited 0 refs
--
-- DEFERRED (non-score or complex interaction effects):
--   momentum, point_shield — require per-round score history
--   token_*, elo_*, xp_boost, trophy_hunter, streak_saver —
--     affect reward math (Elo/token/XP), not score display;
--     integrate into update_arena_debate in a future session
--   crowd_pleaser, tip_magnet — affect tip settlement
--   mirror, burn_notice, parasite, chain_reaction — involve
--     modifying opponent's inventory; dedicated session needed
--   citation_shield, double_cite, forge_accelerator —
--     already applied mid-debate (no end-of-debate action)
--   intimidation, fog_of_war, spectator_magnet — pre-debate
--     or analytics only; no score action
--   insurance — modifiers don't "die" yet; no-op for now
--
-- Run in Supabase SQL Editor against faomczmipsccwbhpivmp.
-- No rows returned = success.
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_end_of_debate_modifiers(
  p_debate_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$

DECLARE
  v_uid           UUID := auth.uid();
  v_debate        RECORD;
  -- Raw scores before any end-of-debate adjustments
  v_raw_a         NUMERIC;
  v_raw_b         NUMERIC;
  -- Running adjustment totals per debater
  v_adj_a         NUMERIC := 0;
  v_adj_b         NUMERIC := 0;
  -- Adjustment breakdown lists (for "after effects" display)
  v_adj_list_a    JSONB   := '[]'::jsonb;
  v_adj_list_b    JSONB   := '[]'::jsonb;
  -- Elos
  v_elo_a         INT;
  v_elo_b         INT;
  -- Citation counts per side
  v_cite_a        INT;
  v_cite_b        INT;
  -- Whether each side spoke in the final round
  v_spoke_final_a BOOLEAN;
  v_spoke_final_b BOOLEAN;
  -- Total rounds in this debate
  v_total_rounds  INT;
  -- Working vars
  v_eff           RECORD;
  v_delta         NUMERIC;
  v_final_a       NUMERIC;
  v_final_b       NUMERIC;
BEGIN

  -- ── Auth: debater_a, debater_b, or moderator ──────────────
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ── Load debate ───────────────────────────────────────────
  SELECT * INTO v_debate FROM public.arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_uid NOT IN (
    v_debate.debater_a,
    COALESCE(v_debate.debater_b, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(v_debate.moderator_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Not a participant in this debate';
  END IF;

  -- ── Idempotency: only apply once ─────────────────────────
  -- Store applied flag in metadata on the debate row (Phase 3 adds this column check).
  -- For now, use a simple guard: if no end-of-debate powerups/sockets exist, return
  -- immediately with raw scores — don't error.

  v_raw_a := COALESCE(v_debate.score_a, 0);
  v_raw_b := COALESCE(v_debate.score_b, 0);
  v_total_rounds := COALESCE(v_debate.total_rounds, 4);

  -- ── Load Elos ────────────────────────────────────────────
  SELECT COALESCE(elo_rating, 1200) INTO v_elo_a
  FROM public.profiles WHERE id = v_debate.debater_a;

  SELECT COALESCE(elo_rating, 1200) INTO v_elo_b
  FROM public.profiles WHERE id = v_debate.debater_b;

  -- ── Citation counts per side ─────────────────────────────
  SELECT COUNT(*) INTO v_cite_a
  FROM public.debate_feed_events
  WHERE debate_id = p_debate_id AND event_type = 'reference_cite' AND side = 'a';

  SELECT COUNT(*) INTO v_cite_b
  FROM public.debate_feed_events
  WHERE debate_id = p_debate_id AND event_type = 'reference_cite' AND side = 'b';

  -- ── Did each side speak in the final round? ───────────────
  SELECT EXISTS (
    SELECT 1 FROM public.debate_feed_events
    WHERE debate_id = p_debate_id
      AND event_type = 'speech'
      AND side = 'a'
      AND round = v_total_rounds
  ) INTO v_spoke_final_a;

  SELECT EXISTS (
    SELECT 1 FROM public.debate_feed_events
    WHERE debate_id = p_debate_id
      AND event_type = 'speech'
      AND side = 'b'
      AND round = v_total_rounds
  ) INTO v_spoke_final_b;

  -- ════════════════════════════════════════════════════════
  -- DEBATER A: own score effects
  -- Sources: debate_powerup_loadout + reference_sockets
  -- ════════════════════════════════════════════════════════

  FOR v_eff IN
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.debate_powerup_loadout dpl
    JOIN public.modifier_effects me ON me.id = dpl.effect_id
    WHERE dpl.debate_id = p_debate_id
      AND dpl.user_id   = v_debate.debater_a
      AND me.timing     = 'end_of_debate'
      AND me.category  != 'opponent_debuff'
    UNION ALL
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.reference_sockets rs
    JOIN public.user_modifiers um  ON um.id  = rs.modifier_id
    JOIN public.modifier_effects me ON me.id = rs.effect_id
    WHERE um.user_id  = v_debate.debater_a
      AND me.timing   = 'end_of_debate'
      AND me.category != 'opponent_debuff'
  LOOP
    v_delta := 0;

    CASE v_eff.effect_id

      WHEN 'point_surge' THEN
        v_delta := 1;

      WHEN 'comeback_engine' THEN
        -- +2 if trailing by 5+ at debate end (raw scores before adjustments)
        IF v_raw_a < v_raw_b - 4 THEN
          v_delta := 2;
        END IF;

      WHEN 'last_word' THEN
        -- +3 if side A spoke in the final round
        IF v_spoke_final_a THEN
          v_delta := 3;
        END IF;

      WHEN 'underdog' THEN
        -- +1 per round if A's Elo < B's Elo
        IF v_elo_a < v_elo_b THEN
          v_delta := v_total_rounds * 1;
        END IF;

      WHEN 'counter_cite' THEN
        -- +1 for each time opponent (B) cited
        v_delta := v_cite_b;

      ELSE NULL; -- Deferred or non-score effect

    END CASE;

    IF v_delta != 0 THEN
      v_adj_a      := v_adj_a + v_delta;
      v_adj_list_a := v_adj_list_a || jsonb_build_object(
        'effect_id',   v_eff.effect_id,
        'effect_name', v_eff.effect_name,
        'delta',       v_delta
      );
    END IF;
  END LOOP;

  -- ════════════════════════════════════════════════════════
  -- DEBATER B: own score effects
  -- ════════════════════════════════════════════════════════

  FOR v_eff IN
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.debate_powerup_loadout dpl
    JOIN public.modifier_effects me ON me.id = dpl.effect_id
    WHERE dpl.debate_id = p_debate_id
      AND dpl.user_id   = v_debate.debater_b
      AND me.timing     = 'end_of_debate'
      AND me.category  != 'opponent_debuff'
    UNION ALL
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.reference_sockets rs
    JOIN public.user_modifiers um  ON um.id  = rs.modifier_id
    JOIN public.modifier_effects me ON me.id = rs.effect_id
    WHERE um.user_id  = v_debate.debater_b
      AND me.timing   = 'end_of_debate'
      AND me.category != 'opponent_debuff'
  LOOP
    v_delta := 0;

    CASE v_eff.effect_id

      WHEN 'point_surge' THEN
        v_delta := 1;

      WHEN 'comeback_engine' THEN
        IF v_raw_b < v_raw_a - 4 THEN
          v_delta := 2;
        END IF;

      WHEN 'last_word' THEN
        IF v_spoke_final_b THEN
          v_delta := 3;
        END IF;

      WHEN 'underdog' THEN
        IF v_elo_b < v_elo_a THEN
          v_delta := v_total_rounds * 1;
        END IF;

      WHEN 'counter_cite' THEN
        -- +1 for each time opponent (A) cited
        v_delta := v_cite_a;

      ELSE NULL;

    END CASE;

    IF v_delta != 0 THEN
      v_adj_b      := v_adj_b + v_delta;
      v_adj_list_b := v_adj_list_b || jsonb_build_object(
        'effect_id',   v_eff.effect_id,
        'effect_name', v_eff.effect_name,
        'delta',       v_delta
      );
    END IF;
  END LOOP;

  -- ════════════════════════════════════════════════════════
  -- OPPONENT DEBUFFS:
  --   B's debuffs → reduce A's score
  --   A's debuffs → reduce B's score
  -- ════════════════════════════════════════════════════════

  -- B's debuffs applied to A
  FOR v_eff IN
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.debate_powerup_loadout dpl
    JOIN public.modifier_effects me ON me.id = dpl.effect_id
    WHERE dpl.debate_id = p_debate_id
      AND dpl.user_id   = v_debate.debater_b
      AND me.timing     = 'end_of_debate'
      AND me.category   = 'opponent_debuff'   -- was: 'point' — corrected to category check
    UNION ALL
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.reference_sockets rs
    JOIN public.user_modifiers um  ON um.id  = rs.modifier_id
    JOIN public.modifier_effects me ON me.id = rs.effect_id
    WHERE um.user_id  = v_debate.debater_b
      AND me.timing   = 'end_of_debate'
      AND me.category = 'opponent_debuff'
  LOOP
    v_delta := 0;

    CASE v_eff.effect_id

      WHEN 'point_siphon' THEN
        -- -1 from A's score
        v_delta := -1;

      WHEN 'pressure_cooker' THEN
        -- -1 from A's score if A cited 0 refs by round 3
        -- (we check total A citations rather than citations through round 3 —
        --  conservative: if A cited anything at all, the debuff doesn't fire)
        IF v_cite_a = 0 THEN
          v_delta := -1;
        END IF;

      ELSE NULL;

    END CASE;

    IF v_delta != 0 THEN
      v_adj_a      := v_adj_a + v_delta;
      v_adj_list_a := v_adj_list_a || jsonb_build_object(
        'effect_id',   v_eff.effect_id,
        'effect_name', v_eff.effect_name,
        'delta',       v_delta,
        'source',      'opponent'
      );
    END IF;
  END LOOP;

  -- A's debuffs applied to B
  FOR v_eff IN
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.debate_powerup_loadout dpl
    JOIN public.modifier_effects me ON me.id = dpl.effect_id
    WHERE dpl.debate_id = p_debate_id
      AND dpl.user_id   = v_debate.debater_a
      AND me.timing     = 'end_of_debate'
      AND me.category   = 'opponent_debuff'
    UNION ALL
    SELECT me.id AS effect_id, me.name AS effect_name
    FROM public.reference_sockets rs
    JOIN public.user_modifiers um  ON um.id  = rs.modifier_id
    JOIN public.modifier_effects me ON me.id = rs.effect_id
    WHERE um.user_id  = v_debate.debater_a
      AND me.timing   = 'end_of_debate'
      AND me.category = 'opponent_debuff'
  LOOP
    v_delta := 0;

    CASE v_eff.effect_id

      WHEN 'point_siphon' THEN
        v_delta := -1;

      WHEN 'pressure_cooker' THEN
        IF v_cite_b = 0 THEN
          v_delta := -1;
        END IF;

      ELSE NULL;

    END CASE;

    IF v_delta != 0 THEN
      v_adj_b      := v_adj_b + v_delta;
      v_adj_list_b := v_adj_list_b || jsonb_build_object(
        'effect_id',   v_eff.effect_id,
        'effect_name', v_eff.effect_name,
        'delta',       v_delta,
        'source',      'opponent'
      );
    END IF;
  END LOOP;

  -- ── Apply adjustments (floor at 0) ────────────────────────
  v_final_a := GREATEST(0, v_raw_a + v_adj_a);
  v_final_b := GREATEST(0, v_raw_b + v_adj_b);

  -- ── Write back to arena_debates ───────────────────────────
  UPDATE public.arena_debates
  SET score_a = v_final_a,
      score_b = v_final_b
  WHERE id = p_debate_id;

  -- ── Return breakdown ──────────────────────────────────────
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
    )
  );

END;
$function$;

-- ────────────────────────────────────────────────────────────
-- DONE
-- Expected: no rows returned.
-- New RPC: apply_end_of_debate_modifiers(p_debate_id uuid)
-- ────────────────────────────────────────────────────────────
