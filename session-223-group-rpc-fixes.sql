-- SESSION 223: GRP-BUG-1 — Group RPC security fixes
-- Run in Supabase SQL Editor
--
-- Fix 1: resolve_group_challenge — CRITICAL
--   Was: no auth, no role check, client picks winner, any user manipulates group Elo
--   Now: auth required, must be leader/co_leader of a participating group,
--        reads winner from linked debate when available (ignores client param)
--
-- Fix 2: update_group_elo — CRITICAL
--   Was: no auth, takes arbitrary user_id + delta, any user manipulates any group Elo
--   Now: dropped entirely. Never called from any client or server code.
--        resolve_group_challenge already calculates Elo inline.
--
-- Fix 3: join_group — HIGH
--   Was: no is_public check, any user joins private groups by UUID
--   Now: blocks join on private groups (is_public = false)


-- ============================================================
-- FIX 1: resolve_group_challenge
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolve_group_challenge(
  p_challenge_id uuid,
  p_winner_group_id uuid,
  p_debate_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
BEGIN
  -- Auth check
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch challenge (lock row to prevent concurrent resolution)
  SELECT * INTO v_challenge
  FROM group_challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Challenge not found');
  END IF;

  IF v_challenge.status = 'completed' THEN
    RETURN json_build_object('error', 'Challenge already resolved');
  END IF;

  IF v_challenge.status != 'accepted' AND v_challenge.status != 'live' THEN
    RETURN json_build_object('error', 'Challenge must be accepted or live to resolve');
  END IF;

  -- Caller must be leader or co_leader of one of the two groups
  SELECT role INTO v_caller_role
  FROM group_members
  WHERE user_id = v_uid
    AND group_id IN (v_challenge.challenger_group_id, v_challenge.defender_group_id)
  ORDER BY group_role_rank(role) DESC
  LIMIT 1;

  IF v_caller_role IS NULL OR group_role_rank(v_caller_role) < 3 THEN
    RAISE EXCEPTION 'Only leaders or co-leaders of a participating group can resolve challenges';
  END IF;

  -- Determine winner: prefer server-side from debate result
  v_winner_group := NULL;

  IF p_debate_id IS NOT NULL THEN
    SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;

    IF v_debate IS NOT NULL AND v_debate.winner IS NOT NULL AND v_debate.winner IN ('a', 'b') THEN
      -- Map debate sides to groups via group_members
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
      -- If mapping fails (debater not in either group), fall through to p_winner_group_id
    END IF;
  END IF;

  -- Fall back to client-provided winner (now role-gated)
  IF v_winner_group IS NULL THEN
    v_winner_group := p_winner_group_id;
  END IF;

  -- Validate winner is one of the two groups
  IF v_winner_group != v_challenge.challenger_group_id
     AND v_winner_group != v_challenge.defender_group_id THEN
    RETURN json_build_object('error', 'Winner must be one of the challenge groups');
  END IF;

  -- Determine loser
  IF v_winner_group = v_challenge.challenger_group_id THEN
    v_loser_group_id := v_challenge.defender_group_id;
  ELSE
    v_loser_group_id := v_challenge.challenger_group_id;
  END IF;

  -- Get current Elo ratings (default 1200 if NULL)
  SELECT COALESCE(group_elo, 1200) INTO v_winner_elo FROM groups WHERE id = v_winner_group;
  SELECT COALESCE(group_elo, 1200) INTO v_loser_elo  FROM groups WHERE id = v_loser_group_id;

  -- Elo calculation
  v_expected := 1.0 / (1.0 + POWER(10, (v_loser_elo - v_winner_elo)::FLOAT / 400));
  v_delta := ROUND(v_k * (1 - v_expected));
  IF v_delta < 1 THEN v_delta := 1; END IF;

  -- Update group Elo
  UPDATE groups SET group_elo = COALESCE(group_elo, 1200) + v_delta WHERE id = v_winner_group;
  UPDATE groups SET group_elo = GREATEST(COALESCE(group_elo, 1200) - v_delta, 100) WHERE id = v_loser_group_id;

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


-- ============================================================
-- FIX 2: Drop update_group_elo
-- ============================================================
-- Never called from any client or server code.
-- Wide open: no auth, takes arbitrary user_id + delta.
-- resolve_group_challenge already does its own Elo calc.

DROP FUNCTION IF EXISTS public.update_group_elo(uuid, integer);


-- ============================================================
-- FIX 3: join_group — block private groups
-- ============================================================

CREATE OR REPLACE FUNCTION public.join_group(p_group_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_group   public.groups;
  v_banned  boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  -- Block joining private groups directly
  IF v_group.is_public = false THEN
    RAISE EXCEPTION 'This group is private. You need an invitation to join.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.group_bans
    WHERE group_id = p_group_id AND user_id = v_user_id
  ) INTO v_banned;

  IF v_banned THEN
    RAISE EXCEPTION 'You are banned from this group';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (p_group_id, v_user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  IF FOUND THEN
    UPDATE public.groups
    SET member_count = member_count + 1, updated_at = now()
    WHERE id = p_group_id;
  END IF;

  PERFORM log_event(
    p_event_type := 'group_joined',
    p_metadata   := jsonb_build_object(
      'group_id', p_group_id,
      'category', v_group.category
    )
  );

  RETURN json_build_object('success', true);
END;
$$;
