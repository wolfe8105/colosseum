-- ============================================================
-- THE MODERATOR — F-57 Deferred Effects: Round-End Cluster
-- Session 270 | April 12, 2026
--
-- 2 effects implemented:
--
--   pressure   (in_debate / opponent_debuff / legendary)
--              At round end: if the opponent scored 0 pts this
--              round AND the debater has pressure active, the
--              opponent loses 2 pts from their running total
--              (floored at 0). Fires per-round via the new
--              close_debate_round RPC.
--
--   momentum   (end_of_debate / point / rare)
--              At end of debate: award +0.5 pts per round in
--              the debater's longest consecutive streak of
--              rounds where they were leading on the cumulative
--              scoreboard. Requires debate_round_scores history.
--
-- NEW INFRASTRUCTURE:
--   debate_round_scores — snapshot of cumulative score_a/b at
--                         end of each round (UNIQUE per debate+round).
--   close_debate_round  — called by client at round boundary:
--                         snapshots scores, applies pressure.
--
-- UPDATED:
--   apply_end_of_debate_modifiers — adds momentum to EOD loop.
--
-- After this session: 56 of 59 F-57 effects live.
-- Remaining (3): streak_saver (token path), token_drain (library
-- path), + 1 misc.
--
-- Run in Supabase SQL Editor against faomczmipsccwbhpivmp.
-- No rows returned = success.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- SECTION 1: TABLE — debate_round_scores
--
-- One row per round per debate. Captures cumulative score_a/b
-- at the moment close_debate_round fires. Used by:
--   - momentum: determine who led each round at round-close
--   - future analytics / replay enrichment
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.debate_round_scores (
  id          BIGSERIAL PRIMARY KEY,
  debate_id   UUID    NOT NULL REFERENCES public.arena_debates(id) ON DELETE CASCADE,
  round       INT     NOT NULL CHECK (round >= 1),
  score_a     NUMERIC NOT NULL DEFAULT 0,
  score_b     NUMERIC NOT NULL DEFAULT 0,
  locked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (debate_id, round)
);

CREATE INDEX IF NOT EXISTS idx_drs_debate ON public.debate_round_scores(debate_id);

COMMENT ON TABLE public.debate_round_scores IS
  'Per-round cumulative score snapshot. Written by close_debate_round at each '
  'round boundary. UNIQUE(debate_id, round) is the idempotency guard — first '
  'write wins, subsequent calls for the same round are no-ops.';

ALTER TABLE public.debate_round_scores ENABLE ROW LEVEL SECURITY;

-- Moderator / debater can read (for replay enrichment)
CREATE POLICY "drs_select_participants"
  ON public.debate_round_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.arena_debates ad
      WHERE ad.id = debate_id
        AND auth.uid() IN (ad.debater_a, ad.debater_b, ad.moderator_id)
    )
  );

-- Writes are SECURITY DEFINER only (via close_debate_round RPC)
-- No direct INSERT/UPDATE/DELETE policies.


-- ────────────────────────────────────────────────────────────
-- SECTION 2: RPC — close_debate_round
--
-- Called by the client at the end of each round, before the
-- round counter advances. Handles two jobs:
--
--   1. Snapshot: INSERT INTO debate_round_scores the current
--      cumulative scores. ON CONFLICT DO NOTHING makes repeat
--      calls from both debaters idempotent — first write wins.
--
--   2. Pressure: For each debater that has pressure active,
--      check if the opponent earned zero point_award events in
--      this round. If so, deduct 2 from the opponent's running
--      score (floored at 0). Pressure only fires on the initial
--      snapshot (skipped if row already existed).
--
-- Returns:
--   { snapshot_written: bool, score_a: numeric, score_b: numeric,
--     pressure_on_a: bool, pressure_on_b: bool }
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.close_debate_round(
  p_debate_id UUID,
  p_round     INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           UUID := auth.uid();
  v_debate        arena_debates%ROWTYPE;
  v_inserted      BOOLEAN := FALSE;
  v_score_a_pre   NUMERIC;
  v_score_b_pre   NUMERIC;
  v_a_scored      BOOLEAN;
  v_b_scored      BOOLEAN;
  v_pressure_on_a BOOLEAN := FALSE;  -- pressure applied TO debater A (by B's effect)
  v_pressure_on_b BOOLEAN := FALSE;  -- pressure applied TO debater B (by A's effect)
  v_final_a       NUMERIC;
  v_final_b       NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  IF p_round < 1 THEN
    RETURN jsonb_build_object('error', 'invalid_round');
  END IF;

  -- Lock debate row for update (scores may change below)
  SELECT * INTO v_debate
  FROM arena_debates
  WHERE id = p_debate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'debate_not_found');
  END IF;

  -- Caller must be a participant
  IF v_uid NOT IN (
    v_debate.debater_a,
    COALESCE(v_debate.debater_b,    '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(v_debate.moderator_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RETURN jsonb_build_object('error', 'not_a_participant');
  END IF;

  v_score_a_pre := COALESCE(v_debate.score_a, 0);
  v_score_b_pre := COALESCE(v_debate.score_b, 0);

  -- ── 1. Snapshot (idempotent) ─────────────────────────────
  INSERT INTO debate_round_scores (debate_id, round, score_a, score_b)
  VALUES (p_debate_id, p_round, v_score_a_pre, v_score_b_pre)
  ON CONFLICT (debate_id, round) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  -- v_inserted = 1 means the row was newly written (not a dup)

  v_final_a := v_score_a_pre;
  v_final_b := v_score_b_pre;

  -- ── 2. Pressure (only on first write, not on dup calls) ──
  IF v_inserted THEN

    -- Did each side score at least one point_award this round?
    SELECT EXISTS (
      SELECT 1 FROM debate_feed_events
      WHERE debate_id = p_debate_id
        AND round      = p_round
        AND event_type = 'point_award'
        AND side       = 'a'
    ) INTO v_a_scored;

    SELECT EXISTS (
      SELECT 1 FROM debate_feed_events
      WHERE debate_id = p_debate_id
        AND round      = p_round
        AND event_type = 'point_award'
        AND side       = 'b'
    ) INTO v_b_scored;

    -- Debater A has pressure → apply to B if B scored 0 this round
    IF NOT v_b_scored
       AND _has_eod_effect(p_debate_id, v_debate.debater_a, 'pressure')
    THEN
      v_final_b      := GREATEST(0, v_final_b - 2);
      v_pressure_on_b := TRUE;

      UPDATE arena_debates
      SET score_b = v_final_b
      WHERE id = p_debate_id;

      -- Feed event so the score change is visible in the live feed
      PERFORM insert_feed_event(
        p_debate_id   := p_debate_id,
        p_event_type  := 'point_award',
        p_round       := p_round,
        p_side        := 'b',
        p_content     := NULL,
        p_score       := NULL,
        p_reference_id := NULL,
        p_metadata    := jsonb_build_object(
          'effect',          'pressure',
          'delta',           -2,
          'score_a_after',   v_final_a,
          'score_b_after',   v_final_b,
          'base_score',      0,
          'in_debate_multiplier', 1,
          'in_debate_flat',  0,
          'final_contribution', -2
        )
      );
    END IF;

    -- Debater B has pressure → apply to A if A scored 0 this round
    IF NOT v_a_scored
       AND _has_eod_effect(p_debate_id, v_debate.debater_b, 'pressure')
    THEN
      v_final_a      := GREATEST(0, v_final_a - 2);
      v_pressure_on_a := TRUE;

      UPDATE arena_debates
      SET score_a = v_final_a
      WHERE id = p_debate_id;

      PERFORM insert_feed_event(
        p_debate_id   := p_debate_id,
        p_event_type  := 'point_award',
        p_round       := p_round,
        p_side        := 'a',
        p_content     := NULL,
        p_score       := NULL,
        p_reference_id := NULL,
        p_metadata    := jsonb_build_object(
          'effect',          'pressure',
          'delta',           -2,
          'score_a_after',   v_final_a,
          'score_b_after',   v_final_b,
          'base_score',      0,
          'in_debate_multiplier', 1,
          'in_debate_flat',  0,
          'final_contribution', -2
        )
      );
    END IF;

  END IF; -- v_inserted (first write only)

  RETURN jsonb_build_object(
    'snapshot_written', v_inserted,
    'round',            p_round,
    'score_a',          v_final_a,
    'score_b',          v_final_b,
    'pressure_on_a',    v_pressure_on_a,
    'pressure_on_b',    v_pressure_on_b
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- SECTION 3: apply_end_of_debate_modifiers — add momentum
--
-- momentum: +0.5 pts per round in the debater's longest
-- consecutive streak of rounds where they held the cumulative
-- score lead at round close (per debate_round_scores).
--
-- Tie = no lead for either side. Streak resets on a tie or
-- a round where the opponent led.
--
-- Example: rounds 1,2,3 led by A → streak 3 → +1.5 pts.
-- Example: rounds 1,3 led by A, round 2 led by B → streak 1
--          (max run of 1) → +0.5 pts.
--
-- Implementation: extend the existing own-score CASE switch
-- for both debater_a and debater_b loops, then re-declare the
-- full function with the extension.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.apply_end_of_debate_modifiers(
  p_debate_id UUID
)
RETURNS JSON
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
  -- point_shield
  v_shield_a_consumed BOOLEAN := FALSE;
  v_shield_b_consumed BOOLEAN := FALSE;
  v_a_has_shield      BOOLEAN := FALSE;
  v_b_has_shield      BOOLEAN := FALSE;
  -- inventory effects (S270)
  v_inventory_effects JSONB   := '[]'::jsonb;
  v_winner_id         UUID;
  v_loser_id          UUID;
  -- momentum (S270)
  v_rnd               RECORD;
  v_streak_a          INT := 0;
  v_max_streak_a      INT := 0;
  v_streak_b          INT := 0;
  v_max_streak_b      INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_debate FROM public.arena_debates WHERE id = p_debate_id;
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
  -- Walk rounds in order; track streak and max for each side.
  FOR v_rnd IN
    SELECT score_a, score_b
    FROM   debate_round_scores
    WHERE  debate_id = p_debate_id
    ORDER  BY round ASC
  LOOP
    IF v_rnd.score_a > v_rnd.score_b THEN
      -- A leading this round
      v_streak_a    := v_streak_a + 1;
      v_max_streak_a := GREATEST(v_max_streak_a, v_streak_a);
      v_streak_b    := 0;
    ELSIF v_rnd.score_b > v_rnd.score_a THEN
      -- B leading this round
      v_streak_b    := v_streak_b + 1;
      v_max_streak_b := GREATEST(v_max_streak_b, v_streak_b);
      v_streak_a    := 0;
    ELSE
      -- Tie — resets both streaks
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
      -- F-57 momentum (S270): +0.5 per round in longest consecutive leading streak
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
      -- F-57 momentum (S270)
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
      score_b = v_final_b
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


-- ============================================================
-- END OF F-57 ROUND-END CLUSTER
-- 2 effects implemented: pressure, momentum
-- 56 of 59 F-57 effects now live.
-- Remaining (3): streak_saver (token path), token_drain (library
-- path), + 1 misc (minor gaps).
-- ============================================================
