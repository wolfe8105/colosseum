-- ============================================================
-- THE MODERATOR — F-57 Deferred Effects: Token + Tip + Shield
-- Session 269 | April 12, 2026
--
-- 6 effects implemented (from the 15-effect deferred backlog):
--
--   Token cluster (end-of-debate, hooks into claim_debate_tokens
--   and rule_on_reference):
--     token_multiplier  — 2× all token earnings this debate
--     token_boost       — +10% tokens on win if cited ≥1 ref
--     token_drain       — −8% challenger tokens when their
--                         in-debate challenge is denied
--
--   Tip cluster (hooks into cast_sentiment_tip and
--   settle_sentiment_tips):
--     crowd_pleaser     — tipping debater's side moves gauge 1.5×
--     tip_magnet        — winning debater gets 15% of their side's
--                         total tip pool as a bonus on settlement
--
--   Momentum cluster — partial:
--     point_shield      — absorbs 1 incoming opponent score debuff
--                         in apply_end_of_debate_modifiers
--
-- STILL DEFERRED (9 effects):
--   pressure, momentum      — need round-end trigger / per-round
--                             score history
--   mirror, burn_notice,    — opponent inventory manipulation;
--   parasite, chain_reaction  dedicated session needed
--   + 3 unaccounted (total 59 − 44 shipped − 6 this session = 9)
--
-- Run in Supabase SQL Editor against faomczmipsccwbhpivmp.
-- No rows returned = success.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- SECTION 1: HELPER — _has_eod_effect
--
-- Returns TRUE if a user has a specific end-of-debate effect
-- active for a given debate, via either powerup loadout OR
-- a socketed modifier on one of their loaded references.
-- Used by all token / tip / shield hooks below.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._has_eod_effect(
  p_debate_id UUID,
  p_user_id   UUID,
  p_effect_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check powerup loadout (one-shot consumables equipped pre-debate)
  IF EXISTS (
    SELECT 1 FROM debate_powerup_loadout
    WHERE debate_id = p_debate_id
      AND user_id   = p_user_id
      AND effect_id = p_effect_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check socketed modifiers on refs the user loaded for this debate
  IF EXISTS (
    SELECT 1
    FROM   reference_sockets rs
    JOIN   arsenal_references ar ON ar.id = rs.reference_id
    JOIN   debate_reference_loadouts drl ON drl.reference_id = ar.id
    WHERE  ar.user_id         = p_user_id
      AND  rs.effect_id       = p_effect_id
      AND  drl.debate_id      = p_debate_id
      AND  drl.user_id        = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- SECTION 2: crowd_pleaser — cast_sentiment_tip
--
-- When a tip is cast for side X and the debater on side X has
-- crowd_pleaser active, the gauge increment is 1.5× the tip
-- amount (purely visual — the tip COST and REFUND are unchanged,
-- keeping settlement math clean).
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cast_sentiment_tip(
  p_debate_id UUID,
  p_side      TEXT,
  p_amount    INT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid            UUID := auth.uid();
  v_debate         arena_debates%ROWTYPE;
  v_watch_count    BIGINT;
  v_tier           TEXT;
  v_balance        INT;
  v_new_total_a    BIGINT;
  v_new_total_b    BIGINT;
  v_gauge_delta    INT;   -- amount credited to the gauge (may be 1.5× with crowd_pleaser)
  v_debater_this_side UUID;
  v_has_cp         BOOLEAN := FALSE;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Validate side
  IF p_side NOT IN ('a', 'b') THEN
    RETURN jsonb_build_object('error', 'invalid_side');
  END IF;

  -- Validate amount
  IF p_amount < 2 THEN
    RETURN jsonb_build_object('error', 'amount_too_low');
  END IF;

  -- Get debate with row lock
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'debate_not_found');
  END IF;

  -- Must be live
  IF v_debate.status != 'live' THEN
    RETURN jsonb_build_object('error', 'debate_not_live');
  END IF;

  -- Human-vs-human only (no AI sparring)
  IF v_debate.mode = 'ai' THEN
    RETURN jsonb_build_object('error', 'ai_debate_not_eligible');
  END IF;

  -- Cap check (1B per side)
  IF p_side = 'a' AND (v_debate.sentiment_total_a + p_amount) > 1000000000 THEN
    RETURN jsonb_build_object('error', 'cap_exceeded');
  END IF;
  IF p_side = 'b' AND (v_debate.sentiment_total_b + p_amount) > 1000000000 THEN
    RETURN jsonb_build_object('error', 'cap_exceeded');
  END IF;

  -- Derive watch tier
  SELECT COUNT(*) INTO v_watch_count FROM debate_watches WHERE user_id = v_uid;
  IF v_watch_count = 0 THEN
    v_tier := 'Unranked';
  ELSIF v_watch_count BETWEEN 1 AND 4 THEN
    v_tier := 'Observer';
  ELSIF v_watch_count BETWEEN 5 AND 14 THEN
    v_tier := 'Fan';
  ELSIF v_watch_count BETWEEN 15 AND 49 THEN
    v_tier := 'Analyst';
  ELSE
    v_tier := 'Insider';
  END IF;

  -- Reject Unranked
  IF v_tier = 'Unranked' THEN
    RETURN jsonb_build_object('error', 'unranked_blocked', 'tier', v_tier, 'watch_count', v_watch_count);
  END IF;

  -- Atomic token debit
  UPDATE profiles
  SET    token_balance = token_balance - p_amount
  WHERE  id = v_uid
    AND  token_balance >= p_amount
  RETURNING token_balance INTO v_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'insufficient_tokens');
  END IF;

  -- Insert tip row (amount = original cost, unchanged)
  INSERT INTO sentiment_tips(debate_id, user_id, side, amount)
  VALUES (p_debate_id, v_uid, p_side, p_amount);

  -- ── F-57 crowd_pleaser: 1.5× gauge move for this side ──
  v_debater_this_side := CASE p_side WHEN 'a' THEN v_debate.debater_a ELSE v_debate.debater_b END;
  v_has_cp := _has_eod_effect(p_debate_id, v_debater_this_side, 'crowd_pleaser');
  v_gauge_delta := CASE WHEN v_has_cp THEN CEIL(p_amount * 1.5)::INT ELSE p_amount END;

  -- Update arena_debates totals (gauge uses v_gauge_delta)
  IF p_side = 'a' THEN
    UPDATE arena_debates
    SET    sentiment_total_a = sentiment_total_a + v_gauge_delta
    WHERE  id = p_debate_id
    RETURNING sentiment_total_a, sentiment_total_b
    INTO   v_new_total_a, v_new_total_b;
  ELSE
    UPDATE arena_debates
    SET    sentiment_total_b = sentiment_total_b + v_gauge_delta
    WHERE  id = p_debate_id
    RETURNING sentiment_total_a, sentiment_total_b
    INTO   v_new_total_a, v_new_total_b;
  END IF;

  -- Feed event
  PERFORM insert_feed_event(
    p_debate_id   := p_debate_id,
    p_event_type  := 'sentiment_tip',
    p_round       := NULL,
    p_side        := p_side,
    p_content     := p_amount || ' tokens → ' || upper(p_side),
    p_score       := NULL,
    p_reference_id := NULL,
    p_metadata    := jsonb_build_object(
      'amount',         p_amount,
      'gauge_delta',    v_gauge_delta,
      'crowd_pleaser',  v_has_cp,
      'tier',           v_tier
    )
  );

  RETURN jsonb_build_object(
    'success',     true,
    'new_total_a', v_new_total_a,
    'new_total_b', v_new_total_b,
    'new_balance', v_balance
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- SECTION 3: tip_magnet — settle_sentiment_tips
--
-- After normal 50% tipper refunds are settled, if the winning
-- debater has tip_magnet active they receive an additional
-- bonus of 15% of the TOTAL winning-side tip pool directly
-- credited to their token_balance.
-- (Draw or null debates: no bonus, consistent with no tipper
--  refunds on draws.)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.settle_sentiment_tips(p_debate_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debate         arena_debates%ROWTYPE;
  v_tip            RECORD;
  v_refund         INT;
  v_winner_id      UUID;
  v_total_win_side BIGINT;
  v_magnet_bonus   INT;
BEGIN
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- ── Normal settlement: 50% refund to winning-side tippers ──
  FOR v_tip IN
    SELECT * FROM sentiment_tips
    WHERE debate_id = p_debate_id
      AND settled_at IS NULL
    FOR UPDATE
  LOOP
    IF v_debate.winner IS NOT NULL AND v_tip.side = v_debate.winner THEN
      v_refund := FLOOR(v_tip.amount * 0.5);
    ELSE
      v_refund := 0;
    END IF;

    IF v_refund > 0 THEN
      UPDATE profiles
      SET    token_balance = token_balance + v_refund
      WHERE  id = v_tip.user_id;
    END IF;

    UPDATE sentiment_tips
    SET    refund_amount = v_refund,
           settled_at   = now()
    WHERE  id = v_tip.id;
  END LOOP;

  -- ── F-57 tip_magnet: winning debater gets 15% of total pool ──
  -- Only fires if winner is determined (not draw) AND the winning
  -- debater has tip_magnet equipped for this debate.
  IF v_debate.winner IN ('a', 'b') THEN
    v_winner_id := CASE v_debate.winner
      WHEN 'a' THEN v_debate.debater_a
      WHEN 'b' THEN v_debate.debater_b
    END;

    IF _has_eod_effect(p_debate_id, v_winner_id, 'tip_magnet') THEN
      -- Sum ALL tips on the winning side (already settled above)
      SELECT COALESCE(SUM(amount), 0) INTO v_total_win_side
      FROM sentiment_tips
      WHERE debate_id = p_debate_id
        AND side = v_debate.winner;

      v_magnet_bonus := CEIL(v_total_win_side * 0.15)::INT;

      IF v_magnet_bonus > 0 THEN
        UPDATE profiles
        SET    token_balance = token_balance + v_magnet_bonus
        WHERE  id = v_winner_id;

        -- Log the bonus transaction
        INSERT INTO token_transactions (user_id, amount, type, source, balance_after)
        SELECT v_winner_id, v_magnet_bonus, 'earn', 'tip_magnet_bonus',
               token_balance
        FROM   profiles WHERE id = v_winner_id;
      END IF;
    END IF;
  END IF;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- SECTION 4: token_multiplier + token_boost — claim_debate_tokens
--
-- Rewrites claim_debate_tokens to apply two F-57 token effects
-- after computing the base earn amount:
--
--   token_boost      +10% if winner AND cited ≥1 ref
--   token_multiplier 2× all token earnings (Mythic, stacks on top)
--
-- (token_drain is handled separately in rule_on_reference —
--  it fires on denied challenges, not on token claims.)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_debate_tokens(p_debate_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id        UUID;
  v_already_claimed BOOLEAN;
  v_base_tokens    INTEGER := 5;
  v_win_bonus      INTEGER := 0;
  v_upset_bonus    INTEGER := 0;
  v_total_tokens   INTEGER;
  v_new_balance    INTEGER;
  v_is_winner      BOOLEAN := false;
  -- Arena debates fields
  v_arena_debate   RECORD;
  v_elo_gap        INTEGER;
  -- F-57 effect flags
  v_has_boost      BOOLEAN := false;
  v_has_multiplier BOOLEAN := false;
  v_cited_any_ref  BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Dedup guard
  SELECT EXISTS(
    SELECT 1 FROM public.token_earn_log
    WHERE user_id  = v_user_id
      AND earn_type = 'debate_complete'
      AND reference_id = p_debate_id
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN json_build_object('success', false, 'error', 'Already claimed');
  END IF;

  -- Load debate
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
    -- Upset bonus: use Elo change stored on debate row
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
  -- token_boost: +10% on win if cited at least one reference
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

  -- token_multiplier: 2× all earnings (Mythic — stacks on top of boost)
  v_has_multiplier := _has_eod_effect(p_debate_id, v_user_id, 'token_multiplier');
  IF v_has_multiplier THEN
    v_total_tokens := v_total_tokens * 2;
  END IF;

  -- ── Credit tokens ────────────────────────────────────────
  UPDATE public.profiles
  SET    token_balance = token_balance + v_total_tokens,
         updated_at   = now()
  WHERE  id = v_user_id
  RETURNING token_balance INTO v_new_balance;

  -- Log transaction
  INSERT INTO public.token_transactions (user_id, amount, type, source, balance_after)
  VALUES (
    v_user_id,
    v_total_tokens,
    'earn',
    'debate_' || CASE WHEN v_is_winner THEN 'win' ELSE 'complete' END,
    v_new_balance
  );

  -- Dedup log
  INSERT INTO public.token_earn_log (user_id, earn_type, reference_id, amount)
  VALUES (v_user_id, 'debate_complete', p_debate_id, v_total_tokens);

  RETURN json_build_object(
    'success',             true,
    'tokens_earned',       v_total_tokens,
    'new_balance',         v_new_balance,
    'is_winner',           v_is_winner,
    'token_boost_applied', v_has_boost AND v_cited_any_ref,
    'multiplier_applied',  v_has_multiplier
  );
END;
$function$;


-- ────────────────────────────────────────────────────────────
-- SECTION 5: token_drain — rule_on_reference
--
-- When a challenge is DENIED (challenger was wrong), if the
-- reference owner has token_drain active, the challenger loses
-- an additional 8% of their current token_balance on top of
-- the burned escrow. Applies only to in-debate challenges
-- (p_context_debate_id IS NOT NULL).
-- Out-of-debate library challenges: no drain (no debate context
-- to check for the effect).
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
  v_user_id      UUID := auth.uid();
  v_challenge    RECORD;
  v_ref          RECORD;
  v_new_seconds  INTEGER;
  v_new_status   TEXT;
  v_drain_amount INTEGER := 0;
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
    -- Refund challenger escrow
    UPDATE profiles
    SET token_balance = token_balance + v_challenge.escrow_amount
    WHERE id = v_challenge.challenger_id;

    INSERT INTO token_transactions (user_id, amount, type, source, balance_after)
    VALUES (v_challenge.challenger_id, v_challenge.escrow_amount, 'refund', 'challenge_upheld',
            (SELECT token_balance FROM profiles WHERE id = v_challenge.challenger_id));

    -- Graduated penalty
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

  ELSE
    -- Ruling = 'denied': escrow already burned, no refund
    v_new_status := v_ref.challenge_status;

    -- ── F-57 token_drain: −8% of challenger's balance ──────
    -- Only for in-debate challenges where there's a debate context.
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
      'challenge_id',       p_challenge_id,
      'reference_id',       v_challenge.reference_id,
      'ruling',             p_ruling,
      'new_challenge_status', v_new_status,
      'drain_applied',      v_drain_amount > 0,
      'drain_amount',       v_drain_amount
    )
  );

  RETURN jsonb_build_object(
    'action',             'ruled',
    'ruling',             p_ruling,
    'new_challenge_status', v_new_status,
    'drain_amount',       v_drain_amount
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- SECTION 6: point_shield — apply_end_of_debate_modifiers
--
-- Adds point_shield support to the existing end-of-debate
-- modifier function. A debater with point_shield absorbs the
-- first incoming opponent score debuff — that debuff is skipped
-- and the shield is consumed. Subsequent debuffs land normally.
--
-- Implementation: extend the CASE switch in the two opponent-
-- debuff loops (B→A and A→B) with shield-consumed tracking.
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
  -- F-57 point_shield: track whether each side's shield has absorbed a hit
  v_shield_a_consumed BOOLEAN := FALSE;
  v_shield_b_consumed BOOLEAN := FALSE;
  v_a_has_shield      BOOLEAN := FALSE;
  v_b_has_shield      BOOLEAN := FALSE;
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
    COALESCE(v_debate.debater_b,   '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(v_debate.moderator_id,'00000000-0000-0000-0000-000000000000'::uuid)
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

  -- ════════════════════════════════════════════════════════
  -- DEBATER A: own-score effects
  -- ════════════════════════════════════════════════════════
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

  -- ════════════════════════════════════════════════════════
  -- DEBATER B: own-score effects
  -- ════════════════════════════════════════════════════════
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

  -- ════════════════════════════════════════════════════════
  -- B's debuffs applied to A (with point_shield check on A)
  -- ════════════════════════════════════════════════════════
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
    -- ── point_shield: A absorbs the first incoming debuff ──
    IF v_a_has_shield AND NOT v_shield_a_consumed THEN
      v_shield_a_consumed := TRUE;
      v_adj_list_a := v_adj_list_a || jsonb_build_object(
        'effect_id',   'point_shield',
        'effect_name', 'Point Shield',
        'delta',       0,
        'source',      'shield_blocked',
        'blocked',     v_eff.effect_id
      );
      CONTINUE; -- skip this debuff
    END IF;

    v_delta := 0;
    CASE v_eff.effect_id
      WHEN 'point_siphon'   THEN v_delta := -1;
      WHEN 'pressure_cooker' THEN IF v_cite_a = 0 THEN v_delta := -1; END IF;
      ELSE NULL;
    END CASE;
    IF v_delta != 0 THEN
      v_adj_a      := v_adj_a + v_delta;
      v_adj_list_a := v_adj_list_a || jsonb_build_object('effect_id', v_eff.effect_id, 'effect_name', v_eff.effect_name, 'delta', v_delta, 'source', 'opponent');
    END IF;
  END LOOP;

  -- ════════════════════════════════════════════════════════
  -- A's debuffs applied to B (with point_shield check on B)
  -- ════════════════════════════════════════════════════════
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
    -- ── point_shield: B absorbs the first incoming debuff ──
    IF v_b_has_shield AND NOT v_shield_b_consumed THEN
      v_shield_b_consumed := TRUE;
      v_adj_list_b := v_adj_list_b || jsonb_build_object(
        'effect_id',   'point_shield',
        'effect_name', 'Point Shield',
        'delta',       0,
        'source',      'shield_blocked',
        'blocked',     v_eff.effect_id
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

  -- ── Apply adjustments (floor at 0) ──────────────────────
  v_final_a := GREATEST(0, v_raw_a + v_adj_a);
  v_final_b := GREATEST(0, v_raw_b + v_adj_b);

  UPDATE public.arena_debates
  SET score_a = v_final_a,
      score_b = v_final_b
  WHERE id = p_debate_id;

  RETURN json_build_object(
    'debater_a', json_build_object('raw_score', v_raw_a, 'adjustments', v_adj_list_a, 'final_score', v_final_a),
    'debater_b', json_build_object('raw_score', v_raw_b, 'adjustments', v_adj_list_b, 'final_score', v_final_b)
  );
END;
$function$;


-- ============================================================
-- END OF F-57 DEFERRED EFFECTS — TOKEN + TIP + SHIELD
-- 6 effects implemented:
--   token_multiplier, token_boost, token_drain,
--   crowd_pleaser, tip_magnet, point_shield
-- ============================================================
