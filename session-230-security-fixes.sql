-- ============================================================
-- SESSION 230 — SECURITY FIXES (Batch 1)
-- Comprehensive Code Audit Round 2
--
-- P2-1: settle_stakes trusted client-supplied p_multiplier (CRITICAL)
--        Fix: Ignore p_multiplier, hardcode to 1. Parameter kept
--        for backward compat (client still sends it until cleaned up).
--
-- P2-2: update_arena_debate trusted client-supplied p_winner
--        for ALL debate types including human PvP (HIGH)
--        Fix: Only accept p_winner when mode = 'ai' AND debater_b IS NULL.
--        Human PvP always uses spectator votes.
--
-- P2-7: react_hot_take allowed self-reactions (MEDIUM)
--        Fix: Block reacting to own hot take. Only applies to ADD,
--        not REMOVE (user should always be able to un-react).
--
-- RUN IN: Supabase SQL Editor
-- AFTER:  Client-side cleanup in Batch 2 (remove dead params from JS)
-- ============================================================


-- ============================================================
-- P2-1: SETTLE_STAKES — Ignore client multiplier
-- ============================================================
-- Keeping p_multiplier in signature for backward compat.
-- Client still sends hasMulti ? 2 : 1 — harmless, gets ignored.
-- When client is cleaned up (Batch 2), this param becomes dead weight.
-- Future: if 2x power-up is a real feature, look up from user_power_ups table.

CREATE OR REPLACE FUNCTION public.settle_stakes(p_debate_id uuid, p_winner text, p_multiplier numeric DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_pool stake_pools%ROWTYPE;
  v_debate RECORD;
  v_db_winner text;
  v_total numeric;
  v_winning_total numeric;
  -- SESSION 230 FIX (P2-1): p_multiplier is IGNORED. Hardcoded to 1.
  -- Previously: v_effective_multiplier numeric := GREATEST(COALESCE(p_multiplier, 1), 1);
  -- An attacker could pass p_multiplier: 999999 for infinite token payout.
  v_effective_multiplier numeric := 1;
  v_stake RECORD;
  v_payout numeric;
  v_caller_payout numeric := 0;
  v_topic text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 1. Lock the pool row to prevent concurrent settlement
  SELECT * INTO v_pool
  FROM stake_pools
  WHERE debate_id = p_debate_id
  FOR UPDATE;

  IF v_pool IS NULL THEN
    RETURN jsonb_build_object('success', true, 'payout', 0, 'message', 'No stake pool');
  END IF;

  -- 2. If already settled, return caller's existing payout
  IF v_pool.status = 'settled' THEN
    SELECT COALESCE(s.payout, 0) INTO v_caller_payout
    FROM stakes s
    WHERE s.debate_id = p_debate_id AND s.user_id = v_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'payout', COALESCE(v_caller_payout, 0),
      'message', 'Already settled'
    );
  END IF;

  -- 3. Read authoritative winner from arena_debates (NOT from client param)
  SELECT status, winner, topic
  INTO v_debate
  FROM arena_debates
  WHERE id = p_debate_id;

  IF v_debate IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Debate not found');
  END IF;

  IF v_debate.status != 'complete' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Debate not yet complete');
  END IF;

  v_db_winner := v_debate.winner;
  IF v_db_winner IS NULL OR v_db_winner NOT IN ('a', 'b', 'draw') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No winner determined yet');
  END IF;

  v_topic := COALESCE(LEFT(v_debate.topic, 80), 'a debate');

  -- 4. Calculate pool totals
  v_total := v_pool.total_side_a + v_pool.total_side_b;
  IF v_db_winner = 'draw' THEN
    v_winning_total := 0;  -- draws refund everyone
  ELSE
    v_winning_total := CASE WHEN v_db_winner = 'a' THEN v_pool.total_side_a ELSE v_pool.total_side_b END;
  END IF;

  -- 5. Loop through ALL stakes and settle each one
  FOR v_stake IN
    SELECT * FROM stakes
    WHERE debate_id = p_debate_id AND (settled_at IS NULL OR payout IS NULL)
    FOR UPDATE
  LOOP
    IF v_db_winner = 'draw' THEN
      -- Draw: refund original stake
      v_payout := v_stake.amount;
      UPDATE profiles SET token_balance = token_balance + v_stake.amount WHERE id = v_stake.user_id;
    ELSIF v_stake.side = v_db_winner AND v_winning_total > 0 THEN
      -- Winner: parimutuel payout (multiplier is always 1 now)
      v_payout := FLOOR((v_stake.amount::numeric / v_winning_total) * v_total);
      v_payout := FLOOR(v_payout * v_effective_multiplier);
      -- Credit net gain (payout minus original stake which was already deducted)
      UPDATE profiles SET token_balance = token_balance + (v_payout - v_stake.amount) WHERE id = v_stake.user_id;
    ELSE
      -- Loser: stake already deducted, record negative payout
      v_payout := -v_stake.amount;
    END IF;

    -- Mark stake as settled
    UPDATE stakes SET payout = v_payout, settled_at = now() WHERE id = v_stake.id;

    -- Track caller's payout for return value
    IF v_stake.user_id = v_user_id THEN
      v_caller_payout := v_payout;
    END IF;

    -- Notify staker
    IF v_payout > 0 THEN
      PERFORM _notify_user(
        v_stake.user_id,
        'stake_won',
        '🪙 Stake Won!',
        format('You won %s tokens on "%s"', v_payout, v_topic),
        jsonb_build_object('debate_id', p_debate_id, 'payout', v_payout)
      );
    ELSIF v_payout < 0 THEN
      PERFORM _notify_user(
        v_stake.user_id,
        'stake_lost',
        '💸 Stake Lost',
        format('You lost %s tokens on "%s"', ABS(v_payout), v_topic),
        jsonb_build_object('debate_id', p_debate_id, 'payout', v_payout)
      );
    END IF;
  END LOOP;

  -- 6. Mark pool as settled with DB-authoritative winner
  UPDATE stake_pools
  SET status = 'settled', settled_at = now(), winner = v_db_winner
  WHERE id = v_pool.id;

  RETURN jsonb_build_object('success', true, 'payout', v_caller_payout);
END;
$function$;


-- ============================================================
-- P2-2: UPDATE_ARENA_DEBATE — Server-side winner for human PvP
-- ============================================================
-- Previously: if p_winner IS NOT NULL, it was trusted regardless of mode.
-- An attacker could call update_arena_debate with p_winner:'a' for any
-- debate type — including human PvP — and get ELO, wins, XP credited.
--
-- Fix: Only trust p_winner when debate mode = 'ai' AND debater_b IS NULL.
-- For human PvP (debater_b IS NOT NULL), always use spectator votes.

CREATE OR REPLACE FUNCTION public.update_arena_debate(p_debate_id uuid, p_status text DEFAULT NULL::text, p_current_round integer DEFAULT NULL::integer, p_winner text DEFAULT NULL::text, p_score_a integer DEFAULT NULL::integer, p_score_b integer DEFAULT NULL::integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_debate record;
  v_winner text;
  v_elo record;
  v_elo_change_a int := 0;
  v_elo_change_b int := 0;
  v_is_ranked boolean;
  v_profile_a record;
  v_profile_b record;
  v_xp_winner int := 25;
  v_xp_loser int := 10;
  v_xp_draw int := 15;
BEGIN
  -- Lock the debate row to prevent concurrent finalization
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id FOR UPDATE;
  IF v_debate IS NULL THEN RAISE EXCEPTION 'Debate not found'; END IF;
  IF v_uid != v_debate.debater_a AND v_uid != COALESCE(v_debate.debater_b, v_uid) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  -- Double-finalize guard: if already complete, return existing data
  IF v_debate.status = 'complete' AND p_status = 'complete' THEN
    RETURN json_build_object(
      'success', true,
      'already_finalized', true,
      'ranked', COALESCE(v_debate.ranked, false),
      'winner', v_debate.winner,
      'elo_change_a', COALESCE(v_debate.elo_change_a, 0),
      'elo_change_b', COALESCE(v_debate.elo_change_b, 0),
      'vote_count_a', COALESCE(v_debate.vote_count_a, 0),
      'vote_count_b', COALESCE(v_debate.vote_count_b, 0)
    );
  END IF;

  v_is_ranked := COALESCE(v_debate.ranked, false);

  -- SESSION 230 FIX (P2-2): Determine winner based on debate type
  IF p_status = 'complete' THEN
    IF v_debate.mode = 'ai' AND v_debate.debater_b IS NULL AND p_winner IS NOT NULL THEN
      -- AI sparring (solo, no opponent): accept client-scored winner.
      -- No ELO/wins/losses impact because debater_b IS NULL gates those blocks below.
      v_winner := p_winner;
    ELSIF v_debate.debater_b IS NOT NULL THEN
      -- Human PvP: ALWAYS use spectator votes. Never trust client p_winner.
      -- Previously: if p_winner IS NOT NULL, client value was used for ANY mode.
      IF v_debate.vote_count_a > v_debate.vote_count_b THEN
        v_winner := 'a';
      ELSIF v_debate.vote_count_b > v_debate.vote_count_a THEN
        v_winner := 'b';
      ELSE
        v_winner := 'draw';
      END IF;
    ELSE
      -- Fallback: no opponent, non-AI mode (shouldn't happen but be safe)
      v_winner := COALESCE(p_winner, 'draw');
    END IF;
  ELSE
    -- Non-complete status updates (e.g. 'live'): pass through
    v_winner := p_winner;
  END IF;

  -- Update the debate record
  UPDATE arena_debates SET
    status = COALESCE(p_status, status),
    current_round = COALESCE(p_current_round, current_round),
    winner = COALESCE(v_winner, winner),
    score_a = COALESCE(p_score_a, score_a),
    score_b = COALESCE(p_score_b, score_b),
    started_at = CASE WHEN p_status = 'live' AND started_at IS NULL THEN now() ELSE started_at END,
    ended_at = CASE WHEN p_status = 'complete' THEN now() ELSE ended_at END
  WHERE id = p_debate_id;

  -- Elo + profile updates for ranked debates with two human participants
  IF p_status = 'complete'
    AND v_is_ranked
    AND v_debate.debater_b IS NOT NULL
    AND v_winner IS NOT NULL
  THEN
    -- Get current profiles
    SELECT * INTO v_profile_a FROM profiles WHERE id = v_debate.debater_a;
    SELECT * INTO v_profile_b FROM profiles WHERE id = v_debate.debater_b;

    IF v_profile_a IS NOT NULL AND v_profile_b IS NOT NULL THEN
      -- Calculate Elo changes
      SELECT * INTO v_elo FROM calculate_elo(
        COALESCE(v_profile_a.elo_rating, 1200),
        COALESCE(v_profile_b.elo_rating, 1200),
        v_winner,
        COALESCE(v_profile_a.debates_completed, 0),
        COALESCE(v_profile_b.debates_completed, 0)
      );

      v_elo_change_a := v_elo.change_a;
      v_elo_change_b := v_elo.change_b;

      -- Store Elo changes on debate record
      UPDATE arena_debates SET
        elo_change_a = v_elo_change_a,
        elo_change_b = v_elo_change_b
      WHERE id = p_debate_id;

      -- Update profile A
      UPDATE profiles SET
        elo_rating = v_elo.new_rating_a,
        debates_completed = COALESCE(debates_completed, 0) + 1,
        wins = COALESCE(wins, 0) + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
        losses = COALESCE(losses, 0) + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
        draws = COALESCE(draws, 0) + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
        current_streak = CASE
          WHEN v_winner = 'a' THEN COALESCE(current_streak, 0) + 1
          ELSE 0
        END,
        best_streak = CASE
          WHEN v_winner = 'a' AND COALESCE(current_streak, 0) + 1 > COALESCE(best_streak, 0)
            THEN COALESCE(current_streak, 0) + 1
          ELSE COALESCE(best_streak, 0)
        END,
        xp = COALESCE(xp, 0) + CASE
          WHEN v_winner = 'a' THEN v_xp_winner
          WHEN v_winner = 'draw' THEN v_xp_draw
          ELSE v_xp_loser
        END
      WHERE id = v_debate.debater_a;

      -- Update profile B
      UPDATE profiles SET
        elo_rating = v_elo.new_rating_b,
        debates_completed = COALESCE(debates_completed, 0) + 1,
        wins = COALESCE(wins, 0) + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
        losses = COALESCE(losses, 0) + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
        draws = COALESCE(draws, 0) + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
        current_streak = CASE
          WHEN v_winner = 'b' THEN COALESCE(current_streak, 0) + 1
          ELSE 0
        END,
        best_streak = CASE
          WHEN v_winner = 'b' AND COALESCE(current_streak, 0) + 1 > COALESCE(best_streak, 0)
            THEN COALESCE(current_streak, 0) + 1
          ELSE COALESCE(best_streak, 0)
        END,
        xp = COALESCE(xp, 0) + CASE
          WHEN v_winner = 'b' THEN v_xp_winner
          WHEN v_winner = 'draw' THEN v_xp_draw
          ELSE v_xp_loser
        END
      WHERE id = v_debate.debater_b;
    END IF;

  ELSIF p_status = 'complete' AND v_debate.debater_b IS NOT NULL AND NOT v_is_ranked THEN
    -- Casual (non-ranked) with two humans: still update debates_completed + wins/losses
    UPDATE profiles SET
      debates_completed = COALESCE(debates_completed, 0) + 1,
      wins = COALESCE(wins, 0) + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
      losses = COALESCE(losses, 0) + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
      draws = COALESCE(draws, 0) + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
      xp = COALESCE(xp, 0) + CASE
        WHEN v_winner = 'a' THEN v_xp_winner
        WHEN v_winner = 'draw' THEN v_xp_draw
        ELSE v_xp_loser
      END
    WHERE id = v_debate.debater_a;

    UPDATE profiles SET
      debates_completed = COALESCE(debates_completed, 0) + 1,
      wins = COALESCE(wins, 0) + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
      losses = COALESCE(losses, 0) + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
      draws = COALESCE(draws, 0) + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
      xp = COALESCE(xp, 0) + CASE
        WHEN v_winner = 'b' THEN v_xp_winner
        WHEN v_winner = 'draw' THEN v_xp_draw
        ELSE v_xp_loser
      END
    WHERE id = v_debate.debater_b;
  END IF;

  RETURN json_build_object(
    'success', true,
    'ranked', v_is_ranked,
    'winner', v_winner,
    'elo_change_a', v_elo_change_a,
    'elo_change_b', v_elo_change_b,
    'vote_count_a', COALESCE(v_debate.vote_count_a, 0),
    'vote_count_b', COALESCE(v_debate.vote_count_b, 0)
  );
END;
$function$;


-- ============================================================
-- P2-7: REACT_HOT_TAKE — Block self-reactions
-- ============================================================
-- Previously: no check for hot take author. User could react to own
-- hot take, inflating reaction_count and earning tokens via claimReaction.
-- Max damage: 5 tokens/day (daily cap on reaction claims).
--
-- Fix: Look up hot take author. Block ADD (not REMOVE — user should
-- always be able to un-react if they somehow got a self-reaction in).

CREATE OR REPLACE FUNCTION public.react_hot_take(p_hot_take_id uuid, p_reaction_type text DEFAULT 'fire'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_exists BOOLEAN;
  v_new_count INTEGER;
  v_take_author UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- SESSION 230 FIX (P2-7): Look up hot take author
  SELECT user_id INTO v_take_author
  FROM public.hot_takes
  WHERE id = p_hot_take_id;

  IF v_take_author IS NULL THEN
    RAISE EXCEPTION 'Hot take not found';
  END IF;

  -- Check if reaction exists (toggle behavior)
  SELECT EXISTS(
    SELECT 1 FROM public.hot_take_reactions
    WHERE hot_take_id = p_hot_take_id AND user_id = v_user_id
  ) INTO v_exists;

  -- Block self-react on ADD only (allow REMOVE so existing self-reactions can be undone)
  IF NOT v_exists AND v_take_author = v_user_id THEN
    RAISE EXCEPTION 'Cannot react to your own hot take';
  END IF;

  IF v_exists THEN
    -- Remove reaction
    DELETE FROM public.hot_take_reactions
    WHERE hot_take_id = p_hot_take_id AND user_id = v_user_id;
  ELSE
    -- Add reaction
    INSERT INTO public.hot_take_reactions (hot_take_id, user_id, reaction_type)
    VALUES (p_hot_take_id, v_user_id, COALESCE(p_reaction_type, 'fire'));
  END IF;

  -- Get updated count
  SELECT COUNT(*) INTO v_new_count
  FROM public.hot_take_reactions
  WHERE hot_take_id = p_hot_take_id;

  -- Update denormalized count
  UPDATE public.hot_takes
  SET reaction_count = v_new_count
  WHERE id = p_hot_take_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'hot_take_reacted',
    p_user_id    := v_user_id,
    p_debate_id  := NULL,
    p_category   := NULL,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'action', CASE WHEN v_exists THEN 'remove' ELSE 'add' END,
      'hot_take_id', p_hot_take_id,
      'reaction_type', p_reaction_type
    )
  );

  RETURN json_build_object(
    'success', true,
    'reacted', NOT v_exists,
    'reaction_count', v_new_count
  );
END;
$function$;
