-- ============================================================
-- THE MODERATOR — F-57 Phase 4: Remaining Implementable Effects
-- Session 267 | April 12, 2026
--
-- Completes F-57's implementable surface. 16 new effects wired.
--
-- RPCs REPLACED (full rewrites):
--
--   _apply_in_debate_modifiers   — adds p_feed_event_id + p_debater_side
--                                   params; 8 new cite-triggered +
--                                   round-conditional cases added
--
--   score_debate_comment         — passes 2 new args to helper; otherwise
--                                   unchanged
--
--   apply_end_of_debate_modifiers — mic_drop + closer added to own-score
--                                    loops; needs per-side last-award vars
--
--   update_arena_debate          — elo_shield, elo_amplifier, xp_boost,
--                                   trophy_hunter, streak_saver wired into
--                                   ranked Elo/XP/streak update block
--
-- NEW EFFECTS:
--   In-debate own:      citation_bonus, loadout_lock, weaponize,
--                       mythic_echo, bait, backfire
--   In-debate debuff:   static
--   In-debate counter:  counter_cite_idb
--   End-of-debate:      mic_drop, closer
--   Elo/XP/streak:      elo_shield, elo_amplifier, xp_boost,
--                       trophy_hunter, streak_saver
--
-- DEFERRED (architectural blockers):
--   pressure, momentum, point_shield — need separate infrastructure
--   token_* effects     — need claimDebate RPC changes
--   tip_* effects       — need settle_sentiment_tips changes
--   mirror, burn_notice, parasite, chain_reaction — inventory manipulation
--
-- Run in Supabase SQL Editor against faomczmipsccwbhpivmp.
-- No rows returned = success.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SECTION 1: _apply_in_debate_modifiers (FULL REPLACEMENT)
-- Adds p_feed_event_id + p_debater_side for cite queries.
-- Uses DEFAULT NULL so old callers still work; score_debate_comment
-- passes them explicitly (Section 2 below).
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
  p_opponent_elo     INTEGER,
  p_feed_event_id    BIGINT  DEFAULT NULL,  -- NEW: current speech event id
  p_debater_side     TEXT    DEFAULT NULL   -- NEW: 'a' or 'b'
)
RETURNS TABLE(out_multiplier NUMERIC, out_flat NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$

DECLARE
  v_multiplier        NUMERIC := 1.0;
  v_flat              NUMERIC := 0.0;
  v_score_diff        INTEGER := p_score_debater - p_score_opponent;
  v_last_side         TEXT    := NULL;
  v_eff               RECORD;
  v_streak_row_id     UUID    := NULL;
  -- Cite-event helpers (computed once, reused across multiple effects)
  v_last_own_speech   BIGINT  := 0;   -- id of last speech from debater before current
  v_last_own_award    BIGINT  := 0;   -- id of last point_award for debater
  v_cite_rarity       TEXT    := NULL; -- rarity of cite between last speech and current
  v_has_cite_this_turn BOOLEAN := FALSE;
BEGIN

  -- ── Pre-compute cite helpers when feed_event_id is available ─
  IF p_feed_event_id IS NOT NULL AND p_debater_side IS NOT NULL THEN

    SELECT COALESCE(MAX(id), 0) INTO v_last_own_speech
    FROM public.debate_feed_events
    WHERE debate_id = p_debate_id
      AND event_type = 'speech'
      AND side = p_debater_side
      AND id < p_feed_event_id;

    SELECT COALESCE(MAX(id), 0) INTO v_last_own_award
    FROM public.debate_feed_events
    WHERE debate_id = p_debate_id
      AND event_type = 'point_award'
      AND side = p_debater_side;

    -- Rarity of most recent own cite between last speech and current speech
    SELECT (dfe.metadata->>'rarity') INTO v_cite_rarity
    FROM public.debate_feed_events dfe
    WHERE dfe.debate_id = p_debate_id
      AND dfe.event_type = 'reference_cite'
      AND dfe.side = p_debater_side
      AND dfe.id > v_last_own_speech
      AND dfe.id < p_feed_event_id
    ORDER BY dfe.id DESC
    LIMIT 1;

    v_has_cite_this_turn := (v_cite_rarity IS NOT NULL);

  END IF;

  -- ── Last scored side (for spite) ─────────────────────────
  SELECT dfe.side INTO v_last_side
  FROM public.debate_feed_events dfe
  WHERE dfe.debate_id = p_debate_id
    AND dfe.event_type = 'point_award'
  ORDER BY dfe.id DESC
  LIMIT 1;

  -- ────────────────────────────────────────────────────────
  -- SELF EFFECTS
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

      -- ── Group A: round-scoped ───────────────────────────
      WHEN 'rally' THEN
        v_multiplier := v_multiplier + 0.5;

      WHEN 'finisher' THEN
        IF p_round = 4 THEN v_multiplier := v_multiplier + 1.0; END IF;

      WHEN 'opening_gambit' THEN
        IF p_round = 1 THEN v_multiplier := v_multiplier + 1.0; END IF;

      WHEN 'banner' THEN
        v_flat := v_flat + 0.5;

      WHEN 'underdog_surge' THEN
        IF p_debater_elo < p_opponent_elo THEN v_flat := v_flat + 1.0; END IF;

      -- ── Streak ─────────────────────────────────────────
      WHEN 'streak' THEN
        v_streak_row_id := v_eff.id;
        v_flat := v_flat + v_eff.streak_value;

      -- ── Spite ──────────────────────────────────────────
      WHEN 'spite' THEN
        IF v_last_side IS NOT NULL AND p_debater_side IS NOT NULL
           AND v_last_side != p_debater_side
        THEN
          v_multiplier := v_multiplier + 0.5;
        END IF;

      -- ── Group B: charge-based self ──────────────────────
      WHEN 'amplify' THEN
        v_multiplier := v_multiplier + 1.0;
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'surge' THEN
        v_multiplier := v_multiplier + 0.5;
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'echo' THEN
        v_multiplier := v_multiplier + 0.25;
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'boost' THEN
        v_flat := v_flat + 2.0;
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'double_tap' THEN
        v_flat := v_flat + 1.0;
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'comeback' THEN
        IF v_score_diff <= -5 THEN
          v_multiplier := v_multiplier + 1.0;
          UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;
        END IF;

      WHEN 'overload' THEN
        IF p_base_score >= 3 THEN
          v_multiplier := v_multiplier + 2.0;
          UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;
        END IF;

      -- ── Cite-triggered (new Phase 4) ────────────────────

      WHEN 'citation_bonus' THEN
        -- +3 flat if this scored comment was accompanied by a cite
        IF v_has_cite_this_turn THEN
          v_flat := v_flat + 3.0;
          UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;
        END IF;

      WHEN 'weaponize' THEN
        -- Next cite's comment ×2 (same detection as citation_bonus)
        IF v_has_cite_this_turn THEN
          v_multiplier := v_multiplier + 1.0;
          UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;
        END IF;

      WHEN 'mythic_echo' THEN
        -- Citing a Mythic ref ×1.5 on that comment
        IF v_cite_rarity = 'mythic' THEN
          v_multiplier := v_multiplier + 0.5;
          UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;
        END IF;

      WHEN 'loadout_lock' THEN
        -- After first cite, all following scores +1 flat
        -- Fires if debater has cited at least once before this event
        IF p_feed_event_id IS NOT NULL AND p_debater_side IS NOT NULL THEN
          IF EXISTS (
            SELECT 1 FROM public.debate_feed_events
            WHERE debate_id = p_debate_id
              AND event_type = 'reference_cite'
              AND side = p_debater_side
              AND id < p_feed_event_id
          ) THEN
            v_flat := v_flat + 1.0;
            -- loadout_lock is unlimited (NULL charges) — no decrement
          END IF;
        END IF;

      WHEN 'counter_cite_idb' THEN
        -- When opponent cites, your next score +2 flat
        -- Fires if opponent cited since this debater's last award
        IF p_feed_event_id IS NOT NULL AND p_debater_side IS NOT NULL THEN
          IF EXISTS (
            SELECT 1 FROM public.debate_feed_events
            WHERE debate_id = p_debate_id
              AND event_type = 'reference_cite'
              AND side != p_debater_side
              AND id > v_last_own_award
              AND id < p_feed_event_id
          ) THEN
            v_flat := v_flat + 2.0;
            UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;
          END IF;
        END IF;

      WHEN 'bait' THEN
        -- If opponent challenges one of your refs, next score ×2.5
        IF p_debater_side IS NOT NULL THEN
          IF EXISTS (
            SELECT 1 FROM public.debate_feed_events dfe_ch
            WHERE dfe_ch.debate_id = p_debate_id
              AND dfe_ch.event_type = 'reference_challenge'
              AND dfe_ch.side != p_debater_side  -- opponent filed the challenge
              AND dfe_ch.reference_id IN (
                SELECT reference_id FROM public.debate_feed_events
                WHERE debate_id = p_debate_id
                  AND event_type = 'reference_cite'
                  AND side = p_debater_side
              )
          ) THEN
            v_multiplier := v_multiplier + 1.5;  -- ×2.5
            UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;
          END IF;
        END IF;

      WHEN 'backfire' THEN
        -- If opponent cites a challenged reference, you +3 inline
        IF p_debater_side IS NOT NULL AND p_feed_event_id IS NOT NULL THEN
          IF EXISTS (
            SELECT 1 FROM public.debate_feed_events dfe
            JOIN public.arsenal_references ar ON ar.id = dfe.reference_id
            WHERE dfe.debate_id = p_debate_id
              AND dfe.event_type = 'reference_cite'
              AND dfe.side != p_debater_side
              AND dfe.id < p_feed_event_id
              AND ar.challenge_status != 'none'
          ) THEN
            v_flat := v_flat + 3.0;
            UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;
          END IF;
        END IF;

      ELSE NULL;

    END CASE;
  END LOOP;

  -- ── Update streak state ──────────────────────────────────
  IF v_streak_row_id IS NOT NULL THEN
    UPDATE public.debate_effect_state
    SET streak_value = streak_value + 0.5
    WHERE id = v_streak_row_id;
  END IF;

  UPDATE public.debate_effect_state
  SET streak_value = 0
  WHERE debate_id = p_debate_id
    AND user_id   = p_opponent_uid
    AND effect_id = 'streak';

  -- ────────────────────────────────────────────────────────
  -- OPPONENT DEBUFF EFFECTS
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
        v_multiplier := v_multiplier - 0.5;
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'drain' THEN
        v_multiplier := v_multiplier - 1.0;
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'choke' THEN
        v_flat := v_flat - 1.0;
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'interrupt' THEN
        v_multiplier := v_multiplier - 1.0;
        UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;

      WHEN 'static' THEN
        -- Opponent's FIRST score this round ×0.5
        -- "This debater is being scored" = opponent_uid equipped this against debater_uid
        -- Fire only if this is the first point_award for debater_uid's side this round
        IF p_debater_side IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1 FROM public.debate_feed_events
            WHERE debate_id = p_debate_id
              AND event_type = 'point_award'
              AND side = p_debater_side
              AND round = p_round
          ) THEN
            v_multiplier := v_multiplier - 0.5;  -- ×0.5
            UPDATE public.debate_effect_state SET charges_remaining = charges_remaining - 1 WHERE id = v_eff.id;
          END IF;
        END IF;

      ELSE NULL;

    END CASE;
  END LOOP;

  out_multiplier := v_multiplier;
  out_flat       := v_flat;
  RETURN NEXT;
END;
$fn$;

-- ────────────────────────────────────────────────────────────
-- SECTION 2: score_debate_comment (MINIMAL UPDATE)
-- Only change: pass p_feed_event_id and v_side to the helper.
-- Full body reproduced for correctness.
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
  v_new_score_a       NUMERIC;
  v_new_score_b       NUMERIC;
  v_value_used        INT;
  v_value_limit       INT;
  v_target_round      INT;
  v_award_event_id    BIGINT;
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

  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_debate FROM public.arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN RAISE EXCEPTION 'Debate not found'; END IF;
  IF v_uid != v_debate.moderator_id THEN RAISE EXCEPTION 'Only the moderator can score comments'; END IF;
  IF v_debate.status NOT IN ('live', 'round_break') THEN RAISE EXCEPTION 'Debate must be live or in round break to score'; END IF;
  IF p_score < 1 OR p_score > 5 THEN RAISE EXCEPTION 'Score must be between 1 and 5'; END IF;

  SELECT * INTO v_target FROM public.debate_feed_events
  WHERE id = p_feed_event_id AND debate_id = p_debate_id;
  IF v_target IS NULL THEN RAISE EXCEPTION 'Feed event not found in this debate'; END IF;
  IF v_target.event_type != 'speech' THEN RAISE EXCEPTION 'Can only score speech events'; END IF;

  v_side := v_target.side;
  IF v_side NOT IN ('a', 'b') THEN RAISE EXCEPTION 'Speech event has invalid side'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.debate_feed_events
    WHERE debate_id = p_debate_id
      AND event_type = 'point_award'
      AND metadata->>'scored_event_id' = p_feed_event_id::text
  ) THEN RAISE EXCEPTION 'This comment has already been scored'; END IF;

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
  WHERE debate_id = p_debate_id AND event_type = 'point_award'
    AND round = v_target_round AND score = p_score;

  IF v_value_used >= v_value_limit THEN
    RAISE EXCEPTION 'Budget exhausted: % pt scores used %/% this round', p_score, v_value_used, v_value_limit;
  END IF;

  IF v_side = 'a' THEN
    v_debater_uid    := v_debate.debater_a;
    v_opponent_uid   := v_debate.debater_b;
    v_score_debater  := COALESCE(v_debate.score_a, 0);
    v_score_opponent := COALESCE(v_debate.score_b, 0);
  ELSE
    v_debater_uid    := v_debate.debater_b;
    v_opponent_uid   := v_debate.debater_a;
    v_score_debater  := COALESCE(v_debate.score_b, 0);
    v_score_opponent := COALESCE(v_debate.score_a, 0);
  END IF;

  SELECT COALESCE(elo_rating, 1200) INTO v_debater_elo  FROM public.profiles WHERE id = v_debater_uid;
  SELECT COALESCE(elo_rating, 1200) INTO v_opponent_elo FROM public.profiles WHERE id = v_opponent_uid;

  -- Pass p_feed_event_id and v_side so cite-triggered effects can query feed history
  SELECT out_multiplier, out_flat INTO v_multiplier, v_flat
  FROM public._apply_in_debate_modifiers(
    p_debate_id, v_debater_uid, v_opponent_uid,
    v_target_round, p_score,
    v_score_debater, v_score_opponent,
    v_debater_elo, v_opponent_elo,
    p_feed_event_id,  -- NEW
    v_side            -- NEW
  );

  IF v_multiplier IS NULL THEN v_multiplier := 1.0; END IF;
  IF v_flat       IS NULL THEN v_flat       := 0.0; END IF;

  v_final := GREATEST(0, ROUND((p_score * v_multiplier + v_flat)::numeric, 2));

  IF v_side = 'a' THEN
    UPDATE public.arena_debates SET score_a = COALESCE(score_a, 0) + v_final WHERE id = p_debate_id
    RETURNING score_a, score_b INTO v_new_score_a, v_new_score_b;
  ELSE
    UPDATE public.arena_debates SET score_b = COALESCE(score_b, 0) + v_final WHERE id = p_debate_id
    RETURNING score_a, score_b INTO v_new_score_a, v_new_score_b;
  END IF;

  INSERT INTO public.debate_feed_events (
    debate_id, user_id, event_type, round, side, content, score, reference_id, metadata
  ) VALUES (
    p_debate_id, v_uid, 'point_award', v_target_round, v_side, NULL, p_score, NULL,
    jsonb_build_object(
      'scored_event_id',      p_feed_event_id,
      'score_a_after',        v_new_score_a,
      'score_b_after',        v_new_score_b,
      'base_score',           p_score,
      'in_debate_multiplier', v_multiplier,
      'in_debate_flat',       v_flat,
      'final_contribution',   v_final
    )
  ) RETURNING id INTO v_award_event_id;

  PERFORM public.log_event(
    'feed_point_award'::text, v_uid, p_debate_id, v_debate.category, v_side,
    jsonb_build_object(
      'feed_event_id', v_award_event_id, 'scored_event_id', p_feed_event_id,
      'base_score', p_score, 'in_debate_multiplier', v_multiplier,
      'in_debate_flat', v_flat, 'final_contribution', v_final,
      'round', v_target_round, 'score_a_after', v_new_score_a, 'score_b_after', v_new_score_b
    )
  );

  RETURN json_build_object(
    'success', true, 'id', v_award_event_id, 'side', v_side, 'round', v_target_round,
    'base_score', p_score, 'in_debate_multiplier', v_multiplier,
    'in_debate_flat', v_flat, 'final_contribution', v_final,
    'score_a', v_new_score_a, 'score_b', v_new_score_b
  );

END;
$function$;

-- ────────────────────────────────────────────────────────────
-- SECTION 3: apply_end_of_debate_modifiers (FULL REPLACEMENT)
-- Adds mic_drop + closer to own-score loops.
-- ────────────────────────────────────────────────────────────

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
  v_raw_a         NUMERIC;
  v_raw_b         NUMERIC;
  v_adj_a         NUMERIC := 0;
  v_adj_b         NUMERIC := 0;
  v_adj_list_a    JSONB   := '[]'::jsonb;
  v_adj_list_b    JSONB   := '[]'::jsonb;
  v_elo_a         INT;
  v_elo_b         INT;
  v_cite_a        INT;
  v_cite_b        INT;
  v_spoke_final_a BOOLEAN;
  v_spoke_final_b BOOLEAN;
  v_total_rounds  INT;
  v_eff           RECORD;
  v_delta         NUMERIC;
  v_final_a       NUMERIC;
  v_final_b       NUMERIC;
  -- mic_drop / closer helpers
  v_last_award_a  RECORD;
  v_last_award_b  RECORD;
BEGIN

  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_debate FROM public.arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN RAISE EXCEPTION 'Debate not found'; END IF;

  IF v_uid NOT IN (
    v_debate.debater_a,
    COALESCE(v_debate.debater_b, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(v_debate.moderator_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN RAISE EXCEPTION 'Not a participant in this debate'; END IF;

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
    WHERE debate_id = p_debate_id AND event_type = 'speech' AND side = 'a' AND round = v_total_rounds)
  INTO v_spoke_final_a;
  SELECT EXISTS (SELECT 1 FROM public.debate_feed_events
    WHERE debate_id = p_debate_id AND event_type = 'speech' AND side = 'b' AND round = v_total_rounds)
  INTO v_spoke_final_b;

  -- Pre-fetch last point_award for each side (for mic_drop + closer)
  SELECT COALESCE((metadata->>'base_score')::numeric, score::numeric) AS base,
         COALESCE((metadata->>'final_contribution')::numeric, score::numeric) AS contrib
  INTO v_last_award_a
  FROM public.debate_feed_events
  WHERE debate_id = p_debate_id AND event_type = 'point_award' AND side = 'a'
  ORDER BY id DESC LIMIT 1;

  SELECT COALESCE((metadata->>'base_score')::numeric, score::numeric) AS base,
         COALESCE((metadata->>'final_contribution')::numeric, score::numeric) AS contrib
  INTO v_last_award_b
  FROM public.debate_feed_events
  WHERE debate_id = p_debate_id AND event_type = 'point_award' AND side = 'b'
  ORDER BY id DESC LIMIT 1;

  -- ── Debater A own-score effects ───────────────────────────

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
      WHEN 'underdog'         THEN IF v_elo_a < v_elo_b THEN v_delta := v_total_rounds; END IF;
      WHEN 'counter_cite'     THEN v_delta := v_cite_b;
      WHEN 'mic_drop' THEN
        -- Last scored comment ×3: extra = base × 2 (base already in total)
        IF v_last_award_a IS NOT NULL THEN
          v_delta := v_last_award_a.base * 2;
        END IF;
      WHEN 'closer' THEN
        -- Last scored comment +5 flat
        IF v_last_award_a IS NOT NULL THEN v_delta := 5; END IF;
      ELSE NULL;
    END CASE;
    IF v_delta != 0 THEN
      v_adj_a      := v_adj_a + v_delta;
      v_adj_list_a := v_adj_list_a || jsonb_build_object('effect_id', v_eff.effect_id, 'effect_name', v_eff.effect_name, 'delta', v_delta);
    END IF;
  END LOOP;

  -- ── Debater B own-score effects ───────────────────────────

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
      WHEN 'underdog'         THEN IF v_elo_b < v_elo_a THEN v_delta := v_total_rounds; END IF;
      WHEN 'counter_cite'     THEN v_delta := v_cite_a;
      WHEN 'mic_drop' THEN
        IF v_last_award_b IS NOT NULL THEN v_delta := v_last_award_b.base * 2; END IF;
      WHEN 'closer' THEN
        IF v_last_award_b IS NOT NULL THEN v_delta := 5; END IF;
      ELSE NULL;
    END CASE;
    IF v_delta != 0 THEN
      v_adj_b      := v_adj_b + v_delta;
      v_adj_list_b := v_adj_list_b || jsonb_build_object('effect_id', v_eff.effect_id, 'effect_name', v_eff.effect_name, 'delta', v_delta);
    END IF;
  END LOOP;

  -- ── B's debuffs → A's score ───────────────────────────────

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
    v_delta := 0;
    CASE v_eff.effect_id
      WHEN 'point_siphon'     THEN v_delta := -1;
      WHEN 'pressure_cooker'  THEN IF v_cite_a = 0 THEN v_delta := -1; END IF;
      ELSE NULL;
    END CASE;
    IF v_delta != 0 THEN
      v_adj_a      := v_adj_a + v_delta;
      v_adj_list_a := v_adj_list_a || jsonb_build_object('effect_id', v_eff.effect_id, 'effect_name', v_eff.effect_name, 'delta', v_delta, 'source', 'opponent');
    END IF;
  END LOOP;

  -- ── A's debuffs → B's score ───────────────────────────────

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
    v_delta := 0;
    CASE v_eff.effect_id
      WHEN 'point_siphon'     THEN v_delta := -1;
      WHEN 'pressure_cooker'  THEN IF v_cite_b = 0 THEN v_delta := -1; END IF;
      ELSE NULL;
    END CASE;
    IF v_delta != 0 THEN
      v_adj_b      := v_adj_b + v_delta;
      v_adj_list_b := v_adj_list_b || jsonb_build_object('effect_id', v_eff.effect_id, 'effect_name', v_eff.effect_name, 'delta', v_delta, 'source', 'opponent');
    END IF;
  END LOOP;

  v_final_a := GREATEST(0, v_raw_a + v_adj_a);
  v_final_b := GREATEST(0, v_raw_b + v_adj_b);

  UPDATE public.arena_debates SET score_a = v_final_a, score_b = v_final_b WHERE id = p_debate_id;

  RETURN json_build_object(
    'debater_a', json_build_object('raw_score', v_raw_a, 'adjustments', v_adj_list_a, 'final_score', v_final_a),
    'debater_b', json_build_object('raw_score', v_raw_b, 'adjustments', v_adj_list_b, 'final_score', v_final_b)
  );
END;
$function$;

-- ────────────────────────────────────────────────────────────
-- SECTION 4: update_arena_debate (FULL REPLACEMENT)
-- Adds elo_shield, elo_amplifier, xp_boost, trophy_hunter,
-- streak_saver into the ranked Elo/XP/streak block.
-- All other logic unchanged.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_arena_debate(
  p_debate_id      UUID,
  p_status         TEXT    DEFAULT NULL,
  p_current_round  INTEGER DEFAULT NULL,
  p_winner         TEXT    DEFAULT NULL,
  p_score_a        INTEGER DEFAULT NULL,
  p_score_b        INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$

DECLARE
  v_uid          UUID := auth.uid();
  v_debate       RECORD;
  v_winner       TEXT;
  v_elo          RECORD;
  v_elo_change_a INT  := 0;
  v_elo_change_b INT  := 0;
  v_is_ranked    BOOLEAN;
  v_profile_a    RECORD;
  v_profile_b    RECORD;
  v_xp_winner    INT  := 25;
  v_xp_loser     INT  := 10;
  v_xp_draw      INT  := 15;
  -- Per-debater XP (allows independent xp_boost)
  v_xp_a         INT;
  v_xp_b         INT;
  -- F-57 modifier flags
  v_elo_shield_a    BOOLEAN := FALSE;
  v_elo_shield_b    BOOLEAN := FALSE;
  v_elo_amp_a       BOOLEAN := FALSE;
  v_elo_amp_b       BOOLEAN := FALSE;
  v_xp_boost_a      BOOLEAN := FALSE;
  v_xp_boost_b      BOOLEAN := FALSE;
  v_trophy_a        BOOLEAN := FALSE;
  v_trophy_b        BOOLEAN := FALSE;
  v_streak_save_a   BOOLEAN := FALSE;
  v_streak_save_b   BOOLEAN := FALSE;
  -- New Elo ratings after adjustment
  v_new_elo_a    INT;
  v_new_elo_b    INT;
BEGIN

  SELECT * INTO v_debate FROM public.arena_debates WHERE id = p_debate_id FOR UPDATE;
  IF v_debate IS NULL THEN RAISE EXCEPTION 'Debate not found'; END IF;
  IF v_uid != v_debate.debater_a AND v_uid != COALESCE(v_debate.debater_b, v_uid) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  IF v_debate.status = 'complete' AND p_status = 'complete' THEN
    RETURN json_build_object(
      'success', true, 'already_finalized', true,
      'ranked', COALESCE(v_debate.ranked, false),
      'winner', v_debate.winner,
      'elo_change_a', COALESCE(v_debate.elo_change_a, 0),
      'elo_change_b', COALESCE(v_debate.elo_change_b, 0),
      'vote_count_a', COALESCE(v_debate.vote_count_a, 0),
      'vote_count_b', COALESCE(v_debate.vote_count_b, 0)
    );
  END IF;

  v_is_ranked := COALESCE(v_debate.ranked, false);

  IF p_status = 'complete' THEN
    IF v_debate.mode = 'ai' AND v_debate.debater_b IS NULL AND p_winner IS NOT NULL THEN
      v_winner := p_winner;
    ELSIF v_debate.debater_b IS NOT NULL THEN
      IF v_debate.vote_count_a > v_debate.vote_count_b THEN v_winner := 'a';
      ELSIF v_debate.vote_count_b > v_debate.vote_count_a THEN v_winner := 'b';
      ELSE v_winner := 'draw';
      END IF;
    ELSE
      v_winner := COALESCE(p_winner, 'draw');
    END IF;
  ELSE
    v_winner := p_winner;
  END IF;

  UPDATE public.arena_debates SET
    status        = COALESCE(p_status, status),
    current_round = COALESCE(p_current_round, current_round),
    winner        = COALESCE(v_winner, winner),
    score_a       = COALESCE(p_score_a, score_a),
    score_b       = COALESCE(p_score_b, score_b),
    started_at    = CASE WHEN p_status = 'live' AND started_at IS NULL THEN now() ELSE started_at END,
    ended_at      = CASE WHEN p_status = 'complete' THEN now() ELSE ended_at END
  WHERE id = p_debate_id;

  IF p_status = 'complete' AND v_is_ranked AND v_debate.debater_b IS NOT NULL AND v_winner IS NOT NULL THEN

    SELECT * INTO v_profile_a FROM public.profiles WHERE id = v_debate.debater_a;
    SELECT * INTO v_profile_b FROM public.profiles WHERE id = v_debate.debater_b;

    IF v_profile_a IS NOT NULL AND v_profile_b IS NOT NULL THEN

      -- ── F-57: Check modifier flags ─────────────────────
      -- Helper: effect is equipped if in loadout OR socketed on any owned ref

      SELECT TRUE INTO v_elo_shield_a FROM public.debate_powerup_loadout
      WHERE debate_id = p_debate_id AND user_id = v_debate.debater_a AND effect_id = 'elo_shield' LIMIT 1;
      IF NOT FOUND THEN
        SELECT TRUE INTO v_elo_shield_a FROM public.reference_sockets rs
        JOIN public.user_modifiers um ON um.id = rs.modifier_id
        WHERE um.user_id = v_debate.debater_a AND rs.effect_id = 'elo_shield' LIMIT 1;
      END IF;

      SELECT TRUE INTO v_elo_shield_b FROM public.debate_powerup_loadout
      WHERE debate_id = p_debate_id AND user_id = v_debate.debater_b AND effect_id = 'elo_shield' LIMIT 1;
      IF NOT FOUND THEN
        SELECT TRUE INTO v_elo_shield_b FROM public.reference_sockets rs
        JOIN public.user_modifiers um ON um.id = rs.modifier_id
        WHERE um.user_id = v_debate.debater_b AND rs.effect_id = 'elo_shield' LIMIT 1;
      END IF;

      SELECT TRUE INTO v_elo_amp_a FROM public.debate_powerup_loadout
      WHERE debate_id = p_debate_id AND user_id = v_debate.debater_a AND effect_id = 'elo_amplifier' LIMIT 1;
      IF NOT FOUND THEN
        SELECT TRUE INTO v_elo_amp_a FROM public.reference_sockets rs
        JOIN public.user_modifiers um ON um.id = rs.modifier_id
        WHERE um.user_id = v_debate.debater_a AND rs.effect_id = 'elo_amplifier' LIMIT 1;
      END IF;

      SELECT TRUE INTO v_elo_amp_b FROM public.debate_powerup_loadout
      WHERE debate_id = p_debate_id AND user_id = v_debate.debater_b AND effect_id = 'elo_amplifier' LIMIT 1;
      IF NOT FOUND THEN
        SELECT TRUE INTO v_elo_amp_b FROM public.reference_sockets rs
        JOIN public.user_modifiers um ON um.id = rs.modifier_id
        WHERE um.user_id = v_debate.debater_b AND rs.effect_id = 'elo_amplifier' LIMIT 1;
      END IF;

      SELECT TRUE INTO v_xp_boost_a FROM public.debate_powerup_loadout
      WHERE debate_id = p_debate_id AND user_id = v_debate.debater_a AND effect_id = 'xp_boost' LIMIT 1;
      IF NOT FOUND THEN
        SELECT TRUE INTO v_xp_boost_a FROM public.reference_sockets rs
        JOIN public.user_modifiers um ON um.id = rs.modifier_id
        WHERE um.user_id = v_debate.debater_a AND rs.effect_id = 'xp_boost' LIMIT 1;
      END IF;

      SELECT TRUE INTO v_xp_boost_b FROM public.debate_powerup_loadout
      WHERE debate_id = p_debate_id AND user_id = v_debate.debater_b AND effect_id = 'xp_boost' LIMIT 1;
      IF NOT FOUND THEN
        SELECT TRUE INTO v_xp_boost_b FROM public.reference_sockets rs
        JOIN public.user_modifiers um ON um.id = rs.modifier_id
        WHERE um.user_id = v_debate.debater_b AND rs.effect_id = 'xp_boost' LIMIT 1;
      END IF;

      -- trophy_hunter: debater beat an opponent with 200+ higher Elo
      IF COALESCE(v_profile_b.elo_rating, 1200) - COALESCE(v_profile_a.elo_rating, 1200) >= 200 THEN
        SELECT TRUE INTO v_trophy_a FROM public.debate_powerup_loadout
        WHERE debate_id = p_debate_id AND user_id = v_debate.debater_a AND effect_id = 'trophy_hunter' LIMIT 1;
        IF NOT FOUND THEN
          SELECT TRUE INTO v_trophy_a FROM public.reference_sockets rs
          JOIN public.user_modifiers um ON um.id = rs.modifier_id
          WHERE um.user_id = v_debate.debater_a AND rs.effect_id = 'trophy_hunter' LIMIT 1;
        END IF;
      END IF;

      IF COALESCE(v_profile_a.elo_rating, 1200) - COALESCE(v_profile_b.elo_rating, 1200) >= 200 THEN
        SELECT TRUE INTO v_trophy_b FROM public.debate_powerup_loadout
        WHERE debate_id = p_debate_id AND user_id = v_debate.debater_b AND effect_id = 'trophy_hunter' LIMIT 1;
        IF NOT FOUND THEN
          SELECT TRUE INTO v_trophy_b FROM public.reference_sockets rs
          JOIN public.user_modifiers um ON um.id = rs.modifier_id
          WHERE um.user_id = v_debate.debater_b AND rs.effect_id = 'trophy_hunter' LIMIT 1;
        END IF;
      END IF;

      SELECT TRUE INTO v_streak_save_a FROM public.debate_powerup_loadout
      WHERE debate_id = p_debate_id AND user_id = v_debate.debater_a AND effect_id = 'streak_saver' LIMIT 1;
      IF NOT FOUND THEN
        SELECT TRUE INTO v_streak_save_a FROM public.reference_sockets rs
        JOIN public.user_modifiers um ON um.id = rs.modifier_id
        WHERE um.user_id = v_debate.debater_a AND rs.effect_id = 'streak_saver' LIMIT 1;
      END IF;

      SELECT TRUE INTO v_streak_save_b FROM public.debate_powerup_loadout
      WHERE debate_id = p_debate_id AND user_id = v_debate.debater_b AND effect_id = 'streak_saver' LIMIT 1;
      IF NOT FOUND THEN
        SELECT TRUE INTO v_streak_save_b FROM public.reference_sockets rs
        JOIN public.user_modifiers um ON um.id = rs.modifier_id
        WHERE um.user_id = v_debate.debater_b AND rs.effect_id = 'streak_saver' LIMIT 1;
      END IF;

      -- ── Base Elo calculation ────────────────────────────
      SELECT * INTO v_elo FROM public.calculate_elo(
        COALESCE(v_profile_a.elo_rating, 1200),
        COALESCE(v_profile_b.elo_rating, 1200),
        v_winner,
        COALESCE(v_profile_a.debates_completed, 0),
        COALESCE(v_profile_b.debates_completed, 0)
      );

      v_elo_change_a := v_elo.change_a;
      v_elo_change_b := v_elo.change_b;

      -- ── Apply Elo modifiers ─────────────────────────────

      -- elo_shield: -25% Elo loss (applies only to negative changes)
      IF COALESCE(v_elo_shield_a, FALSE) AND v_elo_change_a < 0 THEN
        v_elo_change_a := ROUND(v_elo_change_a * 0.75);
      END IF;
      IF COALESCE(v_elo_shield_b, FALSE) AND v_elo_change_b < 0 THEN
        v_elo_change_b := ROUND(v_elo_change_b * 0.75);
      END IF;

      -- elo_amplifier: +15% Elo gain (applies only to positive changes)
      IF COALESCE(v_elo_amp_a, FALSE) AND v_elo_change_a > 0 THEN
        v_elo_change_a := ROUND(v_elo_change_a * 1.15);
      END IF;
      IF COALESCE(v_elo_amp_b, FALSE) AND v_elo_change_b > 0 THEN
        v_elo_change_b := ROUND(v_elo_change_b * 1.15);
      END IF;

      -- trophy_hunter: double Elo gain for the upset winner
      IF COALESCE(v_trophy_a, FALSE) AND v_winner = 'a' AND v_elo_change_a > 0 THEN
        v_elo_change_a := v_elo_change_a * 2;
      END IF;
      IF COALESCE(v_trophy_b, FALSE) AND v_winner = 'b' AND v_elo_change_b > 0 THEN
        v_elo_change_b := v_elo_change_b * 2;
      END IF;

      v_new_elo_a := COALESCE(v_profile_a.elo_rating, 1200) + v_elo_change_a;
      v_new_elo_b := COALESCE(v_profile_b.elo_rating, 1200) + v_elo_change_b;

      -- ── Compute per-debater XP ──────────────────────────
      v_xp_a := CASE
        WHEN v_winner = 'a' THEN v_xp_winner
        WHEN v_winner = 'draw' THEN v_xp_draw
        ELSE v_xp_loser
      END;
      v_xp_b := CASE
        WHEN v_winner = 'b' THEN v_xp_winner
        WHEN v_winner = 'draw' THEN v_xp_draw
        ELSE v_xp_loser
      END;

      -- xp_boost: +20% XP
      IF COALESCE(v_xp_boost_a, FALSE) THEN v_xp_a := ROUND(v_xp_a * 1.2); END IF;
      IF COALESCE(v_xp_boost_b, FALSE) THEN v_xp_b := ROUND(v_xp_b * 1.2); END IF;

      -- trophy_hunter: double XP for upset winner
      IF COALESCE(v_trophy_a, FALSE) AND v_winner = 'a' THEN v_xp_a := v_xp_a * 2; END IF;
      IF COALESCE(v_trophy_b, FALSE) AND v_winner = 'b' THEN v_xp_b := v_xp_b * 2; END IF;

      UPDATE public.arena_debates SET elo_change_a = v_elo_change_a, elo_change_b = v_elo_change_b
      WHERE id = p_debate_id;

      -- ── Update Profile A ────────────────────────────────
      UPDATE public.profiles SET
        elo_rating        = v_new_elo_a,
        debates_completed = COALESCE(debates_completed, 0) + 1,
        wins   = COALESCE(wins, 0)   + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
        losses = COALESCE(losses, 0) + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
        draws  = COALESCE(draws, 0)  + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
        current_streak = CASE
          WHEN v_winner = 'a'
            THEN COALESCE(current_streak, 0) + 1
          WHEN v_winner = 'draw'
            THEN COALESCE(current_streak, 0)  -- draws keep streak
          ELSE
            -- Loss: reset unless streak_saver is equipped
            CASE WHEN COALESCE(v_streak_save_a, FALSE) THEN COALESCE(current_streak, 0) ELSE 0 END
        END,
        best_streak = CASE
          WHEN v_winner = 'a' AND COALESCE(current_streak, 0) + 1 > COALESCE(best_streak, 0)
            THEN COALESCE(current_streak, 0) + 1
          ELSE COALESCE(best_streak, 0)
        END,
        xp = COALESCE(xp, 0) + v_xp_a
      WHERE id = v_debate.debater_a;

      -- ── Update Profile B ────────────────────────────────
      UPDATE public.profiles SET
        elo_rating        = v_new_elo_b,
        debates_completed = COALESCE(debates_completed, 0) + 1,
        wins   = COALESCE(wins, 0)   + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
        losses = COALESCE(losses, 0) + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
        draws  = COALESCE(draws, 0)  + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
        current_streak = CASE
          WHEN v_winner = 'b'
            THEN COALESCE(current_streak, 0) + 1
          WHEN v_winner = 'draw'
            THEN COALESCE(current_streak, 0)
          ELSE
            CASE WHEN COALESCE(v_streak_save_b, FALSE) THEN COALESCE(current_streak, 0) ELSE 0 END
        END,
        best_streak = CASE
          WHEN v_winner = 'b' AND COALESCE(current_streak, 0) + 1 > COALESCE(best_streak, 0)
            THEN COALESCE(current_streak, 0) + 1
          ELSE COALESCE(best_streak, 0)
        END,
        xp = COALESCE(xp, 0) + v_xp_b
      WHERE id = v_debate.debater_b;

    END IF;

  ELSIF p_status = 'complete' AND v_debate.debater_b IS NOT NULL AND NOT v_is_ranked THEN
    -- Casual: still update debates_completed + wins/losses/draws + XP
    -- XP boost applies even in casual
    SELECT * INTO v_profile_a FROM public.profiles WHERE id = v_debate.debater_a;
    SELECT * INTO v_profile_b FROM public.profiles WHERE id = v_debate.debater_b;

    v_xp_a := CASE WHEN v_winner = 'a' THEN v_xp_winner WHEN v_winner = 'draw' THEN v_xp_draw ELSE v_xp_loser END;
    v_xp_b := CASE WHEN v_winner = 'b' THEN v_xp_winner WHEN v_winner = 'draw' THEN v_xp_draw ELSE v_xp_loser END;

    -- Check xp_boost for casual
    IF EXISTS (SELECT 1 FROM public.debate_powerup_loadout WHERE debate_id = p_debate_id AND user_id = v_debate.debater_a AND effect_id = 'xp_boost') OR
       EXISTS (SELECT 1 FROM public.reference_sockets rs JOIN public.user_modifiers um ON um.id = rs.modifier_id WHERE um.user_id = v_debate.debater_a AND rs.effect_id = 'xp_boost') THEN
      v_xp_a := ROUND(v_xp_a * 1.2);
    END IF;
    IF EXISTS (SELECT 1 FROM public.debate_powerup_loadout WHERE debate_id = p_debate_id AND user_id = v_debate.debater_b AND effect_id = 'xp_boost') OR
       EXISTS (SELECT 1 FROM public.reference_sockets rs JOIN public.user_modifiers um ON um.id = rs.modifier_id WHERE um.user_id = v_debate.debater_b AND rs.effect_id = 'xp_boost') THEN
      v_xp_b := ROUND(v_xp_b * 1.2);
    END IF;

    UPDATE public.profiles SET
      debates_completed = COALESCE(debates_completed, 0) + 1,
      wins   = COALESCE(wins, 0)   + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
      losses = COALESCE(losses, 0) + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
      draws  = COALESCE(draws, 0)  + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
      xp     = COALESCE(xp, 0) + v_xp_a
    WHERE id = v_debate.debater_a;

    UPDATE public.profiles SET
      debates_completed = COALESCE(debates_completed, 0) + 1,
      wins   = COALESCE(wins, 0)   + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
      losses = COALESCE(losses, 0) + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
      draws  = COALESCE(draws, 0)  + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
      xp     = COALESCE(xp, 0) + v_xp_b
    WHERE id = v_debate.debater_b;

  END IF;

  RETURN json_build_object(
    'success', true,
    'ranked',       v_is_ranked,
    'winner',       v_winner,
    'elo_change_a', v_elo_change_a,
    'elo_change_b', v_elo_change_b,
    'vote_count_a', COALESCE(v_debate.vote_count_a, 0),
    'vote_count_b', COALESCE(v_debate.vote_count_b, 0)
  );

END;
$function$;

-- ────────────────────────────────────────────────────────────
-- DONE
-- Expected: no rows returned.
--
-- Replaced RPCs (4):
--   _apply_in_debate_modifiers   — 8 new effect cases + 2 new params
--   score_debate_comment         — passes feed_event_id + side to helper
--   apply_end_of_debate_modifiers — mic_drop + closer added
--   update_arena_debate          — F-57 Elo/XP/streak modifier integration
--
-- F-57 DEFERRED (architectural blockers — future sessions):
--   pressure, momentum, point_shield
--   token_multiplier, token_boost, token_drain
--   tip_magnet, crowd_pleaser
--   mirror, burn_notice, parasite, chain_reaction
-- ────────────────────────────────────────────────────────────
