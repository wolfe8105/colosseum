-- ============================================================
-- THE MODERATOR — F-57 Final Effects: Minor Gap Closure
-- Session 270 | April 12, 2026
--
-- 3 effects completed (minor path gaps + 1 missing effect):
--
--   streak_saver (token earn path)
--              claim_debate_tokens now awards a streak bonus:
--              +1 token per 3 active streak, capped at +5.
--              streak_saver's Elo path was already live (S267).
--              Because streak_saver preserves current_streak in
--              the DB on loss, the token bonus fires correctly
--              for a loss too — no extra check needed.
--
--   token_drain (library path)
--              rule_on_reference previously only drained on
--              in-debate denied challenges (debate_id NOT NULL).
--              Extended to also fire on out-of-debate (library)
--              denied challenges by checking the ref owner's
--              free (unsocketed) user_modifiers inventory
--              directly, since there is no debate loadout to
--              query when debate_id IS NULL.
--
--   insurance  (end_of_debate / survival / legendary)
--              "On loss, modifiers socketed into this ref
--              survive intact." A reference with insurance
--              socketed is immune to burn_notice (destruction)
--              and parasite (theft of socketed modifier) in
--              _apply_inventory_effects. Loses only apply to
--              the bearer (not the winner), so insurance is
--              relevant only when its owner loses.
--
-- After this session: 59 of 59 F-57 effects live. DONE.
--
-- Run in Supabase SQL Editor against faomczmipsccwbhpivmp.
-- No rows returned = success.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- SECTION 1: streak_saver token path — claim_debate_tokens
--
-- Adds a streak bonus at the end of the earnings calculation:
--   FLOOR(current_streak / 3), capped at +5 tokens.
-- Bracket examples: streak 3 = +1, 6 = +2, 15 = +5 (max).
--
-- streak_saver works naturally here: if the debater lost but
-- had streak_saver equipped, update_arena_debate preserved
-- their current_streak before this RPC is called, so the
-- bonus fires at the preserved value instead of 0.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_debate_tokens(p_debate_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id         UUID;
  v_already_claimed BOOLEAN;
  v_base_tokens     INTEGER := 5;
  v_win_bonus       INTEGER := 0;
  v_upset_bonus     INTEGER := 0;
  v_streak_bonus    INTEGER := 0;
  v_total_tokens    INTEGER;
  v_new_balance     INTEGER;
  v_is_winner       BOOLEAN := false;
  v_arena_debate    RECORD;
  v_elo_gap         INTEGER;
  v_current_streak  INTEGER := 0;
  -- F-57 effect flags
  v_has_boost       BOOLEAN := false;
  v_has_multiplier  BOOLEAN := false;
  v_cited_any_ref   BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.token_earn_log
    WHERE user_id   = v_user_id
      AND earn_type = 'debate_complete'
      AND reference_id = p_debate_id
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN json_build_object('success', false, 'error', 'Already claimed');
  END IF;

  SELECT * INTO v_arena_debate FROM public.arena_debates WHERE id = p_debate_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Debate not found');
  END IF;

  IF v_arena_debate.status != 'complete' THEN
    RETURN json_build_object('success', false, 'error', 'Debate not completed');
  END IF;

  IF v_user_id NOT IN (v_arena_debate.debater_a, v_arena_debate.debater_b) THEN
    RETURN json_build_object('success', false, 'error', 'Not a participant');
  END IF;

  -- Winner determination
  IF (v_arena_debate.winner = 'a' AND v_user_id = v_arena_debate.debater_a)
  OR (v_arena_debate.winner = 'b' AND v_user_id = v_arena_debate.debater_b) THEN
    v_is_winner  := true;
    v_win_bonus  := 5;
    IF v_user_id = v_arena_debate.debater_a AND v_arena_debate.elo_change_a IS NOT NULL THEN
      v_elo_gap := ABS(v_arena_debate.elo_change_a);
    ELSIF v_user_id = v_arena_debate.debater_b AND v_arena_debate.elo_change_b IS NOT NULL THEN
      v_elo_gap := ABS(v_arena_debate.elo_change_b);
    END IF;
    IF v_elo_gap >= 25 THEN
      v_upset_bonus := 10;
    ELSIF v_elo_gap >= 18 THEN
      v_upset_bonus := 5;
    ELSIF v_elo_gap >= 12 THEN
      v_upset_bonus := 3;
    END IF;
  END IF;

  v_total_tokens := v_base_tokens + v_win_bonus + v_upset_bonus;

  -- ── F-57 token effects ──────────────────────────────────
  IF v_is_winner THEN
    v_has_boost := _has_eod_effect(p_debate_id, v_user_id, 'token_boost');
    IF v_has_boost THEN
      SELECT EXISTS (
        SELECT 1 FROM public.debate_reference_loadouts
        WHERE debate_id = p_debate_id
          AND user_id   = v_user_id
          AND cited     = true
      ) INTO v_cited_any_ref;
      IF v_cited_any_ref THEN
        v_total_tokens := v_total_tokens + CEIL(v_total_tokens * 0.1)::INT;
      END IF;
    END IF;
  END IF;

  v_has_multiplier := _has_eod_effect(p_debate_id, v_user_id, 'token_multiplier');
  IF v_has_multiplier THEN
    v_total_tokens := v_total_tokens * 2;
  END IF;

  -- ── F-57 streak_saver token path: streak bonus ─────────
  -- Read current_streak AFTER update_arena_debate has already
  -- run and potentially preserved it via streak_saver.
  SELECT COALESCE(current_streak, 0) INTO v_current_streak
  FROM public.profiles WHERE id = v_user_id;

  v_streak_bonus := LEAST(FLOOR(v_current_streak / 3)::INT, 5);
  v_total_tokens := v_total_tokens + v_streak_bonus;

  -- ── Credit tokens ────────────────────────────────────────
  UPDATE public.profiles
  SET    token_balance = token_balance + v_total_tokens,
         updated_at   = now()
  WHERE  id = v_user_id
  RETURNING token_balance INTO v_new_balance;

  INSERT INTO public.token_transactions (user_id, amount, type, source, balance_after)
  VALUES (
    v_user_id,
    v_total_tokens,
    'earn',
    'debate_' || CASE WHEN v_is_winner THEN 'win' ELSE 'complete' END,
    v_new_balance
  );

  INSERT INTO public.token_earn_log (user_id, earn_type, reference_id, amount)
  VALUES (v_user_id, 'debate_complete', p_debate_id, v_total_tokens);

  RETURN json_build_object(
    'success',               true,
    'tokens_earned',         v_total_tokens,
    'new_balance',           v_new_balance,
    'is_winner',             v_is_winner,
    'token_boost_applied',   v_has_boost AND v_cited_any_ref,
    'multiplier_applied',    v_has_multiplier,
    'streak_bonus',          v_streak_bonus,
    'streak_at_claim',       v_current_streak
  );
END;
$function$;


-- ────────────────────────────────────────────────────────────
-- SECTION 2: token_drain library path — rule_on_reference
--
-- Extends the existing denied-challenge handler to cover
-- out-of-debate (library) challenges: when debate_id IS NULL,
-- check if the ref owner has an UNSOCKETED token_drain
-- modifier in their free inventory. If so, drain 8% of the
-- challenger's balance (same math as in-debate path).
--
-- Unsocketed-only: socketed modifiers are reference-bound
-- tools, not general inventory — using them for library
-- challenges would be a design mismatch.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rule_on_reference(
  p_challenge_id UUID,
  p_ruling       TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id            UUID := auth.uid();
  v_challenge          RECORD;
  v_ref                RECORD;
  v_new_seconds        INTEGER;
  v_new_status         TEXT;
  v_drain_amount       INTEGER := 0;
  v_challenger_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_ruling NOT IN ('upheld', 'denied') THEN
    RAISE EXCEPTION 'Ruling must be upheld or denied';
  END IF;

  SELECT * INTO v_challenge FROM reference_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;
  IF v_challenge.status != 'pending' THEN
    RAISE EXCEPTION 'Challenge already ruled on';
  END IF;

  SELECT * INTO v_ref FROM arsenal_references WHERE id = v_challenge.reference_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;

  IF p_ruling = 'upheld' THEN
    UPDATE profiles
    SET token_balance = token_balance + v_challenge.escrow_amount
    WHERE id = v_challenge.challenger_id;

    INSERT INTO token_transactions (user_id, amount, type, source, balance_after)
    VALUES (v_challenge.challenger_id, v_challenge.escrow_amount, 'refund', 'challenge_upheld',
            (SELECT token_balance FROM profiles WHERE id = v_challenge.challenger_id));

    CASE v_ref.challenge_status
      WHEN 'none' THEN
        v_new_seconds := GREATEST(v_ref.seconds - 5, 0);
        v_new_status  := 'disputed';
      WHEN 'disputed' THEN
        v_new_seconds := GREATEST(v_ref.seconds - 5, 0);
        v_new_status  := 'heavily_disputed';
      WHEN 'heavily_disputed' THEN
        v_new_seconds := v_ref.seconds;
        v_new_status  := 'frozen';
      ELSE
        v_new_seconds := v_ref.seconds;
        v_new_status  := v_ref.challenge_status;
    END CASE;

    UPDATE arsenal_references
    SET seconds          = v_new_seconds,
        challenge_status = v_new_status
    WHERE id = v_challenge.reference_id;

    PERFORM _recompute_reference_rarity_and_power(v_challenge.reference_id);

  ELSE -- denied
    v_new_status := v_ref.challenge_status;

    -- ── F-57 token_drain: in-debate path (debate_id NOT NULL) ──
    IF v_challenge.debate_id IS NOT NULL
       AND _has_eod_effect(v_challenge.debate_id, v_ref.user_id, 'token_drain')
    THEN
      SELECT token_balance INTO v_challenger_balance
      FROM profiles WHERE id = v_challenge.challenger_id;

      v_drain_amount := FLOOR(COALESCE(v_challenger_balance, 0) * 0.08)::INT;

      IF v_drain_amount > 0 THEN
        UPDATE profiles
        SET token_balance = GREATEST(0, token_balance - v_drain_amount)
        WHERE id = v_challenge.challenger_id;

        INSERT INTO token_transactions (user_id, amount, type, source, balance_after)
        VALUES (
          v_challenge.challenger_id,
          -v_drain_amount,
          'debit',
          'token_drain_effect',
          (SELECT token_balance FROM profiles WHERE id = v_challenge.challenger_id)
        );
      END IF;

    -- ── F-57 token_drain: library path (debate_id IS NULL) ──
    -- Check ref owner's free (unsocketed) inventory directly.
    ELSIF v_challenge.debate_id IS NULL
       AND EXISTS (
         SELECT 1 FROM user_modifiers
         WHERE user_id     = v_ref.user_id
           AND effect_id   = 'token_drain'
           AND socketed_in IS NULL
         LIMIT 1
       )
    THEN
      SELECT token_balance INTO v_challenger_balance
      FROM profiles WHERE id = v_challenge.challenger_id;

      v_drain_amount := FLOOR(COALESCE(v_challenger_balance, 0) * 0.08)::INT;

      IF v_drain_amount > 0 THEN
        UPDATE profiles
        SET token_balance = GREATEST(0, token_balance - v_drain_amount)
        WHERE id = v_challenge.challenger_id;

        INSERT INTO token_transactions (user_id, amount, type, source, balance_after)
        VALUES (
          v_challenge.challenger_id,
          -v_drain_amount,
          'debit',
          'token_drain_library',
          (SELECT token_balance FROM profiles WHERE id = v_challenge.challenger_id)
        );
      END IF;
    END IF;

  END IF;

  UPDATE reference_challenges
  SET status   = p_ruling,
      ruled_at = now()
  WHERE id = p_challenge_id;

  PERFORM log_event(
    p_event_type := 'reference_ruling',
    p_user_id    := v_user_id,
    p_debate_id  := v_challenge.debate_id,
    p_metadata   := jsonb_build_object(
      'challenge_id',         p_challenge_id,
      'reference_id',         v_challenge.reference_id,
      'ruling',               p_ruling,
      'new_challenge_status', v_new_status,
      'drain_applied',        v_drain_amount > 0,
      'drain_amount',         v_drain_amount
    )
  );

  RETURN jsonb_build_object(
    'action',               'ruled',
    'ruling',               p_ruling,
    'new_challenge_status', v_new_status,
    'drain_amount',         v_drain_amount
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- SECTION 3: insurance — _apply_inventory_effects
--
-- "On loss, modifiers socketed into this ref survive intact."
-- A reference with insurance socketed is immune to:
--   - burn_notice: the ref is skipped when selecting a target
--   - parasite (socketed fallback): refs with insurance are
--     excluded from the pool of stealable socketed sources
--
-- insurance only protects the OWNER when they LOSE. Since
-- _apply_inventory_effects runs for the WINNER's effects
-- against the LOSER's inventory, insurance is checked on the
-- loser's refs before picking a burn/steal target.
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
  v_events      JSONB := '[]'::jsonb;
  v_ref_id      UUID;
  v_modifier_id UUID;
  v_effect_id   TEXT;
  v_socket_row  RECORD;
  v_mod_row     RECORD;
  v_new_mod_id  UUID;
  v_qty         INT;
BEGIN

  -- ══════════════════════════════════════════════════════════
  -- EFFECT: mirror
  -- Copies a random modifier from the opponent's highest-
  -- rarity loaded reference. Insurance does NOT protect mirror
  -- (it's a copy, not a destruction/theft — original untouched).
  -- ══════════════════════════════════════════════════════════
  IF _has_eod_effect(p_debate_id, p_winner_id, 'mirror') THEN

    SELECT ar.id INTO v_ref_id
    FROM   debate_reference_loadouts drl
    JOIN   arsenal_references ar ON ar.id = drl.reference_id
    WHERE  drl.debate_id = p_debate_id
      AND  drl.user_id   = p_loser_id
    ORDER  BY _rarity_ordinal(ar.rarity) DESC, RANDOM()
    LIMIT  1;

    IF v_ref_id IS NOT NULL THEN
      SELECT rs.effect_id, rs.modifier_id
      INTO   v_effect_id, v_modifier_id
      FROM   reference_sockets rs
      WHERE  rs.reference_id = v_ref_id
      ORDER  BY RANDOM()
      LIMIT  1;

      IF v_effect_id IS NOT NULL THEN
        INSERT INTO user_modifiers (user_id, effect_id, acquisition_type)
        VALUES (p_winner_id, v_effect_id, 'mirror_copy')
        RETURNING id INTO v_new_mod_id;

        v_events := v_events || jsonb_build_object(
          'effect',           'mirror',
          'copied_effect_id', v_effect_id,
          'from_ref_id',      v_ref_id,
          'new_modifier_id',  v_new_mod_id
        );
      END IF;
    END IF;

  END IF; -- mirror


  -- ══════════════════════════════════════════════════════════
  -- EFFECT: burn_notice
  -- Destroys a random socketed modifier from opponent's refs.
  -- INSURANCE: refs with insurance socketed are excluded from
  -- the candidate pool — they "survive intact."
  -- ══════════════════════════════════════════════════════════
  IF _has_eod_effect(p_debate_id, p_winner_id, 'burn_notice') THEN

    SELECT rs.id       AS socket_id,
           rs.modifier_id,
           rs.effect_id,
           rs.reference_id
    INTO   v_socket_row
    FROM   reference_sockets rs
    JOIN   debate_reference_loadouts drl ON drl.reference_id = rs.reference_id
    WHERE  drl.debate_id = p_debate_id
      AND  drl.user_id   = p_loser_id
      -- Exclude refs that have insurance socketed (any slot)
      AND  NOT EXISTS (
        SELECT 1 FROM reference_sockets ins
        WHERE  ins.reference_id = rs.reference_id
          AND  ins.effect_id    = 'insurance'
      )
    ORDER  BY RANDOM()
    LIMIT  1;

    IF v_socket_row.modifier_id IS NOT NULL THEN
      DELETE FROM reference_sockets WHERE id = v_socket_row.socket_id;
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
  -- Steals a modifier from opponent. Free inventory preferred;
  -- falls back to socketed.
  -- INSURANCE: applies to socketed fallback path only — refs
  -- with insurance are excluded from the socketed steal pool.
  -- Free-inventory modifiers have no ref to insure.
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
      UPDATE user_modifiers
      SET    user_id          = p_winner_id,
             acquisition_type = 'parasite_steal'
      WHERE  id = v_mod_row.id;

      v_events := v_events || jsonb_build_object(
        'effect',           'parasite',
        'stolen_effect_id', v_mod_row.effect_id,
        'source',           'free_inventory',
        'modifier_id',      v_mod_row.id
      );

    ELSE
      -- Fall back to socketed — exclude insured refs
      SELECT rs.id       AS socket_id,
             rs.modifier_id,
             rs.effect_id,
             rs.reference_id
      INTO   v_socket_row
      FROM   reference_sockets rs
      JOIN   debate_reference_loadouts drl ON drl.reference_id = rs.reference_id
      WHERE  drl.debate_id = p_debate_id
        AND  drl.user_id   = p_loser_id
        -- Exclude refs with insurance
        AND  NOT EXISTS (
          SELECT 1 FROM reference_sockets ins
          WHERE  ins.reference_id = rs.reference_id
            AND  ins.effect_id    = 'insurance'
        )
      ORDER  BY RANDOM()
      LIMIT  1;

      IF v_socket_row.modifier_id IS NOT NULL THEN
        DELETE FROM reference_sockets WHERE id = v_socket_row.socket_id;

        UPDATE user_modifiers
        SET    user_id          = p_winner_id,
               socketed_in      = NULL,
               acquisition_type = 'parasite_steal'
        WHERE  id = v_socket_row.modifier_id;

        v_events := v_events || jsonb_build_object(
          'effect',           'parasite',
          'stolen_effect_id', v_socket_row.effect_id,
          'source',           'socketed',
          'from_ref_id',      v_socket_row.reference_id,
          'modifier_id',      v_socket_row.modifier_id
        );
      END IF;
    END IF;

  END IF; -- parasite


  -- ══════════════════════════════════════════════════════════
  -- EFFECT: chain_reaction
  -- Grants winner +1 power-up of one of their own socketed
  -- modifier effects from this debate. Insurance does not
  -- apply (chain_reaction acts on the winner's own inventory).
  -- ══════════════════════════════════════════════════════════
  IF _has_eod_effect(p_debate_id, p_winner_id, 'chain_reaction') THEN

    SELECT rs.effect_id
    INTO   v_effect_id
    FROM   reference_sockets rs
    JOIN   debate_reference_loadouts drl ON drl.reference_id = rs.reference_id
    WHERE  drl.debate_id = p_debate_id
      AND  drl.user_id   = p_winner_id
    ORDER  BY RANDOM()
    LIMIT  1;

    IF v_effect_id IS NOT NULL THEN
      INSERT INTO user_powerups (user_id, effect_id, quantity)
      VALUES (p_winner_id, v_effect_id, 1)
      ON CONFLICT (user_id, effect_id)
      DO UPDATE SET quantity = user_powerups.quantity + 1
      RETURNING quantity INTO v_qty;

      v_events := v_events || jsonb_build_object(
        'effect',             'chain_reaction',
        'regenerated_effect', v_effect_id,
        'new_powerup_qty',    v_qty
      );
    END IF;

  END IF; -- chain_reaction

  RETURN v_events;
END;
$$;


-- ============================================================
-- END OF F-57 FINAL EFFECTS
-- 3 effects completed:
--   streak_saver (token earn path) — streak bonus in claim_debate_tokens
--   token_drain (library path)     — unsocketed inventory check in rule_on_reference
--   insurance                      — burn_notice + parasite exclusion in _apply_inventory_effects
--
-- F-57 is now COMPLETE. 59 of 59 effects live.
-- ============================================================
