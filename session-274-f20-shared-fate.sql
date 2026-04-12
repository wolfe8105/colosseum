-- ============================================================
-- F-20: Shared Fate Mechanic
-- Session 274
--
-- Formula: floor(avg_questions_answered / 100 × win_pct × 80)
-- Anchor:  25 avg Q's × 50% win rate = 10% bonus
-- Max:     80% (100 Q's × 100% wins)
-- Permanent: once reached, never decreases (GREATEST pattern)
--
-- Applied as a passive multiplier on ALL debate token earnings
-- for every member of a qualifying group.
-- ============================================================

-- ── 1. Add shared_fate_pct to groups ────────────────────────

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS shared_fate_pct SMALLINT NOT NULL DEFAULT 0;

-- ── 2. _calc_shared_fate helper ──────────────────────────────
-- Returns the current shared fate % for a group based on live data.
-- Does NOT check the permanent-lock rule — caller applies GREATEST.

CREATE OR REPLACE FUNCTION public._calc_shared_fate(p_group_id uuid)
RETURNS SMALLINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_questions NUMERIC;
  v_wins          INTEGER;
  v_losses        INTEGER;
  v_win_pct       NUMERIC;
  v_fate          SMALLINT;
BEGIN
  -- Average questions_answered across all current members
  SELECT COALESCE(AVG(p.questions_answered), 0)
  INTO v_avg_questions
  FROM group_members gm
  JOIN profiles p ON p.id = gm.user_id
  WHERE gm.group_id = p_group_id;

  SELECT gvg_wins, gvg_losses
  INTO v_wins, v_losses
  FROM groups
  WHERE id = p_group_id;

  v_wins   := COALESCE(v_wins, 0);
  v_losses := COALESCE(v_losses, 0);

  -- Need at least 3 GvG debates for fate to kick in
  IF (v_wins + v_losses) < 3 THEN
    RETURN 0;
  END IF;

  v_win_pct := v_wins::NUMERIC / NULLIF(v_wins + v_losses, 0);

  -- Formula: floor(avg_questions / 100 × win_pct × 80), cap 80
  v_fate := LEAST(
    FLOOR(v_avg_questions / 100.0 * v_win_pct * 80.0)::SMALLINT,
    80
  );

  RETURN GREATEST(v_fate, 0);
END;
$$;

-- ── 3. refresh_shared_fate RPC ───────────────────────────────
-- Recalculates and permanently locks in highest fate reached.
-- Call after GvG resolution or any significant member profile update.

CREATE OR REPLACE FUNCTION public.refresh_shared_fate(p_group_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_pct  SMALLINT;
  v_final    SMALLINT;
BEGIN
  v_new_pct := _calc_shared_fate(p_group_id);

  UPDATE groups
  SET shared_fate_pct = GREATEST(shared_fate_pct, v_new_pct)
  WHERE id = p_group_id
  RETURNING shared_fate_pct INTO v_final;

  RETURN json_build_object('success', true, 'shared_fate_pct', v_final);
END;
$$;

-- ── 4. Rebuild resolve_group_challenge ───────────────────────
-- Adds refresh_shared_fate calls for both groups after each GvG.
-- Preserves all existing Elo + banner_tier logic exactly.

DROP FUNCTION IF EXISTS public.resolve_group_challenge(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.resolve_group_challenge(
  p_challenge_id    uuid,
  p_winner_group_id uuid,
  p_debate_id       uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid            uuid := auth.uid();
  v_caller_role    text;
  v_challenge      RECORD;
  v_debate         RECORD;
  v_winner_group   uuid;
  v_loser_group_id uuid;
  v_winner_elo     int;
  v_loser_elo      int;
  v_k              int := 32;
  v_expected       float;
  v_delta          int;
  v_a_group        uuid;
  v_b_group        uuid;
  v_w_wins         int;
  v_w_losses       int;
  v_l_wins         int;
  v_l_losses       int;
  v_w_new_tier     SMALLINT;
  v_l_new_tier     SMALLINT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_challenge FROM group_challenges
  WHERE id = p_challenge_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Challenge not found');
  END IF;
  IF v_challenge.status = 'completed' THEN
    RETURN json_build_object('error', 'Challenge already resolved');
  END IF;
  IF v_challenge.status NOT IN ('accepted', 'live') THEN
    RETURN json_build_object('error', 'Challenge must be accepted or live to resolve');
  END IF;

  SELECT role INTO v_caller_role
  FROM group_members
  WHERE user_id = v_uid
    AND group_id IN (v_challenge.challenger_group_id, v_challenge.defender_group_id)
  ORDER BY group_role_rank(role) DESC LIMIT 1;

  IF v_caller_role IS NULL OR group_role_rank(v_caller_role) < 3 THEN
    RAISE EXCEPTION 'Only leaders or co-leaders of a participating group can resolve challenges';
  END IF;

  v_winner_group := NULL;
  IF p_debate_id IS NOT NULL THEN
    SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
    IF v_debate IS NOT NULL AND v_debate.winner IN ('a', 'b') THEN
      SELECT group_id INTO v_a_group
      FROM group_members
      WHERE user_id = v_debate.debater_a
        AND group_id IN (v_challenge.challenger_group_id, v_challenge.defender_group_id)
      LIMIT 1;
      SELECT group_id INTO v_b_group
      FROM group_members
      WHERE user_id = v_debate.debater_b
        AND group_id IN (v_challenge.challenger_group_id, v_challenge.defender_group_id)
      LIMIT 1;
      IF v_debate.winner = 'a' AND v_a_group IS NOT NULL THEN
        v_winner_group := v_a_group;
      ELSIF v_debate.winner = 'b' AND v_b_group IS NOT NULL THEN
        v_winner_group := v_b_group;
      END IF;
    END IF;
  END IF;

  IF v_winner_group IS NULL THEN v_winner_group := p_winner_group_id; END IF;

  IF v_winner_group != v_challenge.challenger_group_id
     AND v_winner_group != v_challenge.defender_group_id THEN
    RETURN json_build_object('error', 'Winner must be one of the challenge groups');
  END IF;

  IF v_winner_group = v_challenge.challenger_group_id THEN
    v_loser_group_id := v_challenge.defender_group_id;
  ELSE
    v_loser_group_id := v_challenge.challenger_group_id;
  END IF;

  -- Elo update
  SELECT COALESCE(group_elo, 1200) INTO v_winner_elo FROM groups WHERE id = v_winner_group;
  SELECT COALESCE(group_elo, 1200) INTO v_loser_elo  FROM groups WHERE id = v_loser_group_id;
  v_expected := 1.0 / (1.0 + POWER(10, (v_loser_elo - v_winner_elo)::FLOAT / 400));
  v_delta := ROUND(v_k * (1 - v_expected));
  IF v_delta < 1 THEN v_delta := 1; END IF;

  UPDATE groups SET group_elo = COALESCE(group_elo, 1200) + v_delta WHERE id = v_winner_group;
  UPDATE groups SET group_elo = GREATEST(COALESCE(group_elo, 1200) - v_delta, 100) WHERE id = v_loser_group_id;

  -- F-19: Track wins/losses + auto-upgrade banner_tier
  UPDATE groups SET gvg_wins = gvg_wins + 1
  WHERE id = v_winner_group
  RETURNING gvg_wins, gvg_losses INTO v_w_wins, v_w_losses;

  UPDATE groups SET gvg_losses = gvg_losses + 1
  WHERE id = v_loser_group_id
  RETURNING gvg_wins, gvg_losses INTO v_l_wins, v_l_losses;

  v_w_new_tier := _group_banner_tier(v_w_wins, v_w_losses);
  v_l_new_tier := _group_banner_tier(v_l_wins, v_l_losses);

  UPDATE groups SET banner_tier = GREATEST(banner_tier, v_w_new_tier) WHERE id = v_winner_group;
  UPDATE groups SET banner_tier = GREATEST(banner_tier, v_l_new_tier) WHERE id = v_loser_group_id;

  -- F-20: Refresh shared fate for both groups
  PERFORM refresh_shared_fate(v_winner_group);
  PERFORM refresh_shared_fate(v_loser_group_id);

  -- Mark challenge complete
  UPDATE group_challenges
  SET status = 'completed',
      winner_group_id = v_winner_group,
      debate_id = COALESCE(p_debate_id, debate_id),
      completed_at = NOW()
  WHERE id = p_challenge_id;

  RETURN json_build_object(
    'success', true,
    'winner_group_id', v_winner_group,
    'winner_elo_change', v_delta,
    'loser_elo_change', -v_delta
  );
END;
$$;

-- ── 5. Rebuild claim_debate_tokens with shared fate bonus ────

DROP FUNCTION IF EXISTS public.claim_debate_tokens(uuid);

CREATE OR REPLACE FUNCTION public.claim_debate_tokens(p_debate_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id        UUID;
  v_already_claimed BOOLEAN;
  v_base_tokens    INTEGER := 5;
  v_win_bonus      INTEGER := 0;
  v_upset_bonus    INTEGER := 0;
  v_fate_bonus     INTEGER := 0;
  v_fate_pct       SMALLINT := 0;
  v_total_tokens   INTEGER;
  v_new_balance    INTEGER;
  v_is_winner      BOOLEAN := false;
  v_source_table   TEXT;
  v_leg_debate     RECORD;
  v_elo_gap        INTEGER;
  v_arena_debate   RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.token_earn_log
    WHERE user_id = v_user_id
      AND earn_type = 'debate_complete'
      AND reference_id = p_debate_id
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN json_build_object('success', false, 'error', 'Already claimed');
  END IF;

  -- Try arena_debates first
  SELECT * INTO v_arena_debate FROM public.arena_debates WHERE id = p_debate_id;

  IF FOUND THEN
    v_source_table := 'arena_debates';

    IF v_arena_debate.status != 'complete' THEN
      RETURN json_build_object('success', false, 'error', 'Debate not completed');
    END IF;

    IF v_user_id NOT IN (v_arena_debate.debater_a, v_arena_debate.debater_b) THEN
      RETURN json_build_object('success', false, 'error', 'Not a participant');
    END IF;

    IF (v_arena_debate.winner = 'a' AND v_user_id = v_arena_debate.debater_a)
       OR (v_arena_debate.winner = 'b' AND v_user_id = v_arena_debate.debater_b) THEN
      v_is_winner := true;
      v_win_bonus := 5;
    END IF;

  ELSE
    SELECT * INTO v_leg_debate FROM public.debates WHERE id = p_debate_id;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Debate not found');
    END IF;

    v_source_table := 'debates';

    IF v_leg_debate.status != 'completed' THEN
      RETURN json_build_object('success', false, 'error', 'Debate not completed');
    END IF;

    IF v_user_id NOT IN (v_leg_debate.debater_a, v_leg_debate.debater_b) THEN
      RETURN json_build_object('success', false, 'error', 'Not a participant');
    END IF;

    IF v_leg_debate.winner_id = v_user_id THEN
      v_is_winner := true;
      v_win_bonus := 5;

      IF v_user_id = v_leg_debate.debater_a AND v_leg_debate.elo_change_a IS NOT NULL THEN
        v_elo_gap := ABS(v_leg_debate.elo_change_a);
      ELSIF v_user_id = v_leg_debate.debater_b AND v_leg_debate.elo_change_b IS NOT NULL THEN
        v_elo_gap := ABS(v_leg_debate.elo_change_b);
      END IF;

      IF v_elo_gap IS NOT NULL AND v_elo_gap >= 25 THEN
        v_upset_bonus := 10;
      ELSIF v_elo_gap IS NOT NULL AND v_elo_gap >= 18 THEN
        v_upset_bonus := 5;
      ELSIF v_elo_gap IS NOT NULL AND v_elo_gap >= 12 THEN
        v_upset_bonus := 3;
      END IF;
    END IF;
  END IF;

  -- F-20: Shared fate bonus — best pct across all user's groups
  SELECT COALESCE(MAX(g.shared_fate_pct), 0)
  INTO v_fate_pct
  FROM group_members gm
  JOIN groups g ON g.id = gm.group_id
  WHERE gm.user_id = v_user_id
    AND g.shared_fate_pct > 0;

  IF v_fate_pct > 0 THEN
    v_fate_bonus := ROUND(
      (v_base_tokens + v_win_bonus + v_upset_bonus) * v_fate_pct::NUMERIC / 100.0
    );
  END IF;

  v_total_tokens := v_base_tokens + v_win_bonus + v_upset_bonus + v_fate_bonus;

  UPDATE public.profiles SET
    token_balance = token_balance + v_total_tokens,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING token_balance INTO v_new_balance;

  INSERT INTO public.token_transactions (user_id, amount, type, source, balance_after)
  VALUES (v_user_id, v_total_tokens, 'earn',
    'debate_' || CASE WHEN v_is_winner THEN 'win' ELSE 'complete' END,
    v_new_balance);

  INSERT INTO public.token_earn_log (user_id, earn_type, reference_id, tokens_earned, earned_date)
  VALUES (v_user_id, 'debate_complete', p_debate_id, v_total_tokens, CURRENT_DATE);

  PERFORM log_event(
    p_event_type := 'token_earn',
    p_user_id    := v_user_id,
    p_metadata   := jsonb_build_object(
      'type',         'debate_complete',
      'debate_id',    p_debate_id,
      'source_table', v_source_table,
      'tokens',       v_total_tokens,
      'win_bonus',    v_win_bonus,
      'upset_bonus',  v_upset_bonus,
      'fate_bonus',   v_fate_bonus,
      'fate_pct',     v_fate_pct,
      'is_winner',    v_is_winner
    )
  );

  RETURN json_build_object(
    'success',      true,
    'tokens_earned', v_total_tokens,
    'base',         v_base_tokens,
    'win_bonus',    v_win_bonus,
    'upset_bonus',  v_upset_bonus,
    'fate_bonus',   v_fate_bonus,
    'fate_pct',     v_fate_pct,
    'is_winner',    v_is_winner,
    'new_balance',  v_new_balance
  );
END;
$$;

-- ── 6. Rebuild get_group_details with shared_fate_pct ────────

DROP FUNCTION IF EXISTS public.get_group_details(uuid);

CREATE OR REPLACE FUNCTION public.get_group_details(p_group_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_group        public.groups;
  v_is_member    BOOLEAN := false;
  v_my_role      TEXT;
BEGIN
  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group not found'; END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT role INTO v_my_role
    FROM public.group_members
    WHERE group_id = p_group_id AND user_id = v_user_id;
    v_is_member := v_my_role IS NOT NULL;
  END IF;

  IF v_group.is_public = false AND NOT v_is_member THEN
    RAISE EXCEPTION 'This group is private';
  END IF;

  RETURN json_build_object(
    'id',                  v_group.id,
    'name',                v_group.name,
    'slug',                v_group.slug,
    'description',         v_group.description,
    'category',            v_group.category,
    'owner_id',            v_group.owner_id,
    'member_count',        v_group.member_count,
    'elo_rating',          v_group.elo_rating,
    'is_public',           v_group.is_public,
    'avatar_emoji',        v_group.avatar_emoji,
    'created_at',          v_group.created_at,
    'join_mode',           v_group.join_mode,
    'entry_requirements',  v_group.entry_requirements,
    'audition_config',     v_group.audition_config,
    'is_member',           v_is_member,
    'my_role',             v_my_role,
    'gvg_wins',            v_group.gvg_wins,
    'gvg_losses',          v_group.gvg_losses,
    'banner_tier',         v_group.banner_tier,
    'banner_static_url',   v_group.banner_static_url,
    'banner_animated_url', v_group.banner_animated_url,
    'shared_fate_pct',     v_group.shared_fate_pct
  );
END;
$$;
