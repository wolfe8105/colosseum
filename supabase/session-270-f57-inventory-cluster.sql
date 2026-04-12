-- ============================================================
-- THE MODERATOR — F-57 Deferred Effects: Inventory Cluster
-- Session 270 | April 12, 2026
--
-- 4 effects implemented (opponent inventory manipulation):
--
--   mirror         — copy a random modifier from the opponent's
--                    highest-rarity reference into your inventory
--   burn_notice    — destroy one randomly-chosen modifier from
--                    any of the opponent's references (removes
--                    socket + deletes the modifier item)
--   parasite       — steal one modifier from the opponent:
--                    prefers their free (unsocketed) inventory;
--                    falls back to a socketed modifier, pulling
--                    it off their reference and into yours
--   chain_reaction — one of your own socketed modifiers from
--                    this debate regenerates as a free power-up
--                    (+1 quantity in user_powerups)
--
-- All effects are end_of_debate, fire only on a clear win
-- (no draw / null), and are no-ops if the prerequisite
-- inventory state doesn't exist (e.g. opponent has no refs).
--
-- SCHEMA CHANGE:
--   acquisition_type CHECK expanded to include 'mirror_copy',
--   'parasite_steal', 'chain_regen'.
--
-- DEFERRED AFTER THIS SESSION (5 effects):
--   pressure, momentum              — need round-end trigger
--   streak_saver (token earn path)  — minor gap
--   token_drain (library path)      — minor gap
--   + 1 misc                        — minor gap
--
-- Run in Supabase SQL Editor against faomczmipsccwbhpivmp.
-- No rows returned = success.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- SECTION 1: SCHEMA — expand acquisition_type CHECK
--
-- user_modifiers originally allows: purchase, drop, reward.
-- Add three new values for inventory-effect acquisitions.
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.user_modifiers
  DROP CONSTRAINT IF EXISTS user_modifiers_acquisition_type_check;

ALTER TABLE public.user_modifiers
  ADD CONSTRAINT user_modifiers_acquisition_type_check
  CHECK (acquisition_type IN (
    'purchase',
    'drop',
    'reward',
    'mirror_copy',    -- copied from opponent via mirror effect
    'parasite_steal', -- stolen from opponent via parasite effect
    'chain_regen'     -- regenerated as power-up (not a modifier row, kept for symmetry)
  ));


-- ────────────────────────────────────────────────────────────
-- SECTION 2: HELPER — _apply_inventory_effects
--
-- Called from apply_end_of_debate_modifiers after scores are
-- finalised and a winner is determined.
--
-- Returns a JSONB array of {effect, ...detail} objects
-- describing what fired, for the after-effects client display.
-- Returns '[]' if no effects fired or no clear winner.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._apply_inventory_effects(
  p_debate_id UUID,
  p_winner_id UUID,
  p_loser_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_events       JSONB := '[]'::jsonb;

  -- shared scratch
  v_ref_id       UUID;
  v_modifier_id  UUID;
  v_effect_id    TEXT;
  v_socket_row   RECORD;
  v_mod_row      RECORD;
  v_new_mod_id   UUID;
  v_qty          INT;
BEGIN

  -- ══════════════════════════════════════════════════════════
  -- EFFECT: mirror
  -- Copy a random modifier from the opponent's highest-rarity
  -- loaded reference into the winner's free inventory.
  -- ══════════════════════════════════════════════════════════
  IF _has_eod_effect(p_debate_id, p_winner_id, 'mirror') THEN

    -- Find opponent's best ref (highest rarity, break ties randomly)
    SELECT ar.id INTO v_ref_id
    FROM   debate_reference_loadouts drl
    JOIN   arsenal_references ar ON ar.id = drl.reference_id
    WHERE  drl.debate_id = p_debate_id
      AND  drl.user_id   = p_loser_id
    ORDER  BY _rarity_ordinal(ar.rarity) DESC, RANDOM()
    LIMIT  1;

    IF v_ref_id IS NOT NULL THEN
      -- Pick a random socketed modifier on that ref
      SELECT rs.effect_id, rs.modifier_id
      INTO   v_effect_id, v_modifier_id
      FROM   reference_sockets rs
      WHERE  rs.reference_id = v_ref_id
      ORDER  BY RANDOM()
      LIMIT  1;

      IF v_effect_id IS NOT NULL THEN
        -- Insert a copy into winner's free inventory
        INSERT INTO user_modifiers (user_id, effect_id, acquisition_type)
        VALUES (p_winner_id, v_effect_id, 'mirror_copy')
        RETURNING id INTO v_new_mod_id;

        v_events := v_events || jsonb_build_object(
          'effect',          'mirror',
          'copied_effect_id', v_effect_id,
          'from_ref_id',     v_ref_id,
          'new_modifier_id', v_new_mod_id
        );
      END IF;
    END IF;

  END IF; -- mirror


  -- ══════════════════════════════════════════════════════════
  -- EFFECT: burn_notice
  -- Destroy one randomly-chosen modifier from any of the
  -- opponent's loaded references. Removes the socket row AND
  -- deletes the modifier item entirely.
  -- ══════════════════════════════════════════════════════════
  IF _has_eod_effect(p_debate_id, p_winner_id, 'burn_notice') THEN

    -- Find a random socketed modifier across all opponent's debate refs
    SELECT rs.id       AS socket_id,
           rs.modifier_id,
           rs.effect_id,
           rs.reference_id
    INTO   v_socket_row
    FROM   reference_sockets rs
    JOIN   debate_reference_loadouts drl ON drl.reference_id = rs.reference_id
    WHERE  drl.debate_id = p_debate_id
      AND  drl.user_id   = p_loser_id
    ORDER  BY RANDOM()
    LIMIT  1;

    IF v_socket_row.modifier_id IS NOT NULL THEN
      -- 1. Remove the socket slot (FK modifier_id → user_modifiers)
      DELETE FROM reference_sockets WHERE id = v_socket_row.socket_id;

      -- 2. Clear socketed_in so FK doesn't block deletion, then delete
      UPDATE user_modifiers SET socketed_in = NULL WHERE id = v_socket_row.modifier_id;
      DELETE FROM user_modifiers             WHERE id = v_socket_row.modifier_id;

      v_events := v_events || jsonb_build_object(
        'effect',           'burn_notice',
        'burned_effect_id', v_socket_row.effect_id,
        'from_ref_id',      v_socket_row.reference_id
      );
    END IF;

  END IF; -- burn_notice


  -- ══════════════════════════════════════════════════════════
  -- EFFECT: parasite
  -- Steal one modifier from the opponent into the winner's
  -- free inventory. Preference order:
  --   1. Unsocketed modifier (free inventory) — less disruptive
  --      to opponent's refs but still a genuine theft
  --   2. Socketed modifier (if no free ones exist) — removes it
  --      from the opponent's reference socket
  -- ══════════════════════════════════════════════════════════
  IF _has_eod_effect(p_debate_id, p_winner_id, 'parasite') THEN

    -- Try free (unsocketed) inventory first
    SELECT id, effect_id
    INTO   v_mod_row
    FROM   user_modifiers
    WHERE  user_id     = p_loser_id
      AND  socketed_in IS NULL
    ORDER  BY RANDOM()
    LIMIT  1;

    IF v_mod_row.id IS NOT NULL THEN
      -- Transfer ownership; stays in free inventory
      UPDATE user_modifiers
      SET    user_id          = p_winner_id,
             acquisition_type = 'parasite_steal'
      WHERE  id = v_mod_row.id;

      v_events := v_events || jsonb_build_object(
        'effect',          'parasite',
        'stolen_effect_id', v_mod_row.effect_id,
        'source',          'free_inventory',
        'modifier_id',     v_mod_row.id
      );

    ELSE
      -- Fall back: steal a socketed modifier from opponent's loaded refs
      SELECT rs.id       AS socket_id,
             rs.modifier_id,
             rs.effect_id,
             rs.reference_id
      INTO   v_socket_row
      FROM   reference_sockets rs
      JOIN   debate_reference_loadouts drl ON drl.reference_id = rs.reference_id
      WHERE  drl.debate_id = p_debate_id
        AND  drl.user_id   = p_loser_id
      ORDER  BY RANDOM()
      LIMIT  1;

      IF v_socket_row.modifier_id IS NOT NULL THEN
        -- Remove from socket
        DELETE FROM reference_sockets WHERE id = v_socket_row.socket_id;

        -- Transfer ownership and move to free inventory
        UPDATE user_modifiers
        SET    user_id          = p_winner_id,
               socketed_in      = NULL,
               acquisition_type = 'parasite_steal'
        WHERE  id = v_socket_row.modifier_id;

        v_events := v_events || jsonb_build_object(
          'effect',          'parasite',
          'stolen_effect_id', v_socket_row.effect_id,
          'source',          'socketed',
          'from_ref_id',     v_socket_row.reference_id,
          'modifier_id',     v_socket_row.modifier_id
        );
      END IF;
    END IF;

  END IF; -- parasite


  -- ══════════════════════════════════════════════════════════
  -- EFFECT: chain_reaction
  -- One of the winner's own socketed modifiers (from their
  -- loaded references in this debate) regenerates as a free
  -- power-up — +1 quantity in user_powerups for that effect.
  -- The original modifier is untouched; you're getting a
  -- consumable copy of one effect you're already running.
  -- ══════════════════════════════════════════════════════════
  IF _has_eod_effect(p_debate_id, p_winner_id, 'chain_reaction') THEN

    -- Find a random socketed modifier from winner's own loaded refs
    SELECT rs.effect_id
    INTO   v_effect_id
    FROM   reference_sockets rs
    JOIN   debate_reference_loadouts drl ON drl.reference_id = rs.reference_id
    WHERE  drl.debate_id = p_debate_id
      AND  drl.user_id   = p_winner_id
    ORDER  BY RANDOM()
    LIMIT  1;

    IF v_effect_id IS NOT NULL THEN
      -- Grant +1 power-up of that effect (or create the row if new)
      INSERT INTO user_powerups (user_id, effect_id, quantity)
      VALUES (p_winner_id, v_effect_id, 1)
      ON CONFLICT (user_id, effect_id)
      DO UPDATE SET quantity = user_powerups.quantity + 1
      RETURNING quantity INTO v_qty;

      v_events := v_events || jsonb_build_object(
        'effect',            'chain_reaction',
        'regenerated_effect', v_effect_id,
        'new_powerup_qty',   v_qty
      );
    END IF;

  END IF; -- chain_reaction

  RETURN v_events;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- SECTION 3: apply_end_of_debate_modifiers — extended
--
-- Adds inventory-effect execution as a final phase after score
-- adjustments. The winner is derived from the adjusted final
-- scores (v_final_a vs v_final_b) because this function runs
-- before update_arena_debate sets v_debate.winner.
--
-- Return shape gains:
--   inventory_effects: [] — array of {effect, ...} objects
--                          from _apply_inventory_effects
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
  -- F-57 point_shield
  v_shield_a_consumed BOOLEAN := FALSE;
  v_shield_b_consumed BOOLEAN := FALSE;
  v_a_has_shield      BOOLEAN := FALSE;
  v_b_has_shield      BOOLEAN := FALSE;
  -- F-57 inventory effects (S270)
  v_inventory_effects JSONB   := '[]'::jsonb;
  v_winner_id         UUID;
  v_loser_id          UUID;
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

  -- ── F-57 point_shield: pre-check both sides ─────────────
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

  -- ── Apply score adjustments (floor at 0) ─────────────────
  v_final_a := GREATEST(0, v_raw_a + v_adj_a);
  v_final_b := GREATEST(0, v_raw_b + v_adj_b);

  UPDATE public.arena_debates
  SET score_a = v_final_a,
      score_b = v_final_b
  WHERE id = p_debate_id;

  -- ══════════════════════════════════════════════════════════
  -- F-57 INVENTORY EFFECTS (S270)
  -- Run after scores are final. Determine winner from adjusted
  -- scores; draw / null-debate → skip (no inventory effects).
  -- ══════════════════════════════════════════════════════════
  IF v_final_a > v_final_b AND v_debate.debater_b IS NOT NULL THEN
    v_winner_id := v_debate.debater_a;
    v_loser_id  := v_debate.debater_b;
  ELSIF v_final_b > v_final_a AND v_debate.debater_b IS NOT NULL THEN
    v_winner_id := v_debate.debater_b;
    v_loser_id  := v_debate.debater_a;
  END IF;

  IF v_winner_id IS NOT NULL THEN
    v_inventory_effects := _apply_inventory_effects(
      p_debate_id,
      v_winner_id,
      v_loser_id
    );
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
-- END OF F-57 INVENTORY CLUSTER
-- 4 effects implemented: mirror, burn_notice, parasite, chain_reaction
-- 54 of 59 F-57 effects now live.
-- Remaining (5): pressure, momentum, streak_saver (token path),
--                token_drain (library path), + 1 misc.
-- ============================================================
