-- THE MODERATOR — Deployed Functions Export
-- Auto-generated from Supabase production database
-- Last updated: Session 252 (April 9, 2026) — F-55 Reference System Overhaul landed
--
-- This file is the source of truth for what RPCs are live in production.
-- Re-export after any session that modifies RPCs.

-- Domain: groups

-- Functions: 17

-- Auto-generated from supabase-deployed-functions-export.sql


CREATE OR REPLACE FUNCTION public.ban_group_member(p_group_id uuid, p_user_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
  v_target_role text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller_id = p_user_id THEN
    RAISE EXCEPTION 'Cannot ban yourself';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_caller_id;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  SELECT role INTO v_target_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  IF v_target_role IS NOT NULL THEN
    -- Target is a current member: rank check applies
    IF public.group_role_rank(v_caller_role) <= public.group_role_rank(v_target_role) THEN
      RAISE EXCEPTION 'Insufficient permissions: cannot ban a member of equal or higher rank';
    END IF;

    DELETE FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id;

    UPDATE public.groups
    SET member_count = GREATEST(0, member_count - 1), updated_at = now()
    WHERE id = p_group_id;
  ELSE
    -- Target is not a member: only leader/co_leader can pre-emptively ban
    IF public.group_role_rank(v_caller_role) < 3 THEN
      RAISE EXCEPTION 'Insufficient permissions';
    END IF;
  END IF;

  INSERT INTO public.group_bans (group_id, user_id, banned_by, reason)
  VALUES (p_group_id, p_user_id, v_caller_id, p_reason)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN json_build_object('success', true);
END;

$function$;

CREATE OR REPLACE FUNCTION public.create_group(p_name text, p_description text DEFAULT NULL::text, p_category text DEFAULT 'general'::text, p_is_public boolean DEFAULT true, p_avatar_emoji text DEFAULT '⚔️'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id  uuid := auth.uid();
  v_slug     text;
  v_group_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_name IS NULL OR char_length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'Group name must be at least 2 characters';
  END IF;

  v_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || substring(gen_random_uuid()::text, 1, 6);

  IF p_category NOT IN ('general','politics','sports','entertainment','music','couples_court') THEN
    p_category := 'general';
  END IF;

  INSERT INTO public.groups (name, slug, description, category, owner_id, is_public, avatar_emoji)
  VALUES (trim(p_name), v_slug, trim(p_description), p_category, v_user_id, p_is_public, p_avatar_emoji)
  RETURNING id INTO v_group_id;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'leader');

  PERFORM log_event(
    p_event_type := 'group_created',
    p_metadata   := jsonb_build_object(
      'group_id',  v_group_id,
      'category',  p_category,
      'is_public', p_is_public
    )
  );

  RETURN json_build_object('success', true, 'group_id', v_group_id, 'slug', v_slug);
END;

$function$;

CREATE OR REPLACE FUNCTION public.create_group_challenge(p_challenger_group_id uuid, p_defender_group_id uuid, p_topic text, p_category text DEFAULT 'miscellaneous'::text, p_format text DEFAULT '1v1'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID;
  v_is_member BOOLEAN;
  v_pending_count INT;
  v_challenge_id UUID;
BEGIN
  -- Auth check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Can't challenge your own group
  IF p_challenger_group_id = p_defender_group_id THEN
    RETURN json_build_object('error', 'Cannot challenge your own group');
  END IF;

  -- Validate topic length
  IF length(trim(p_topic)) < 5 OR length(trim(p_topic)) > 200 THEN
    RETURN json_build_object('error', 'Topic must be 5-200 characters');
  END IF;

  -- Validate format
  IF p_format NOT IN ('1v1', '3v3', '5v5') THEN
    RETURN json_build_object('error', 'Invalid format');
  END IF;

  -- Must be member of challenger group
  SELECT EXISTS(
    SELECT 1 FROM group_members
    WHERE group_id = p_challenger_group_id AND user_id = v_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN json_build_object('error', 'You must be a member of the challenging group');
  END IF;

  -- Verify defender group exists
  IF NOT EXISTS(SELECT 1 FROM groups WHERE id = p_defender_group_id) THEN
    RETURN json_build_object('error', 'Opponent group not found');
  END IF;

  -- Rate limit: max 3 pending challenges per challenger group
  SELECT COUNT(*) INTO v_pending_count
  FROM group_challenges
  WHERE challenger_group_id = p_challenger_group_id
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_pending_count >= 3 THEN
    RETURN json_build_object('error', 'Your group already has 3 pending challenges');
  END IF;

  -- Check for duplicate active challenge between these two groups
  IF EXISTS(
    SELECT 1 FROM group_challenges
    WHERE status IN ('pending', 'accepted', 'live')
      AND (
        (challenger_group_id = p_challenger_group_id AND defender_group_id = p_defender_group_id)
        OR
        (challenger_group_id = p_defender_group_id AND defender_group_id = p_challenger_group_id)
      )
  ) THEN
    RETURN json_build_object('error', 'An active challenge already exists between these groups');
  END IF;

  -- Create challenge
  INSERT INTO group_challenges (
    challenger_group_id, defender_group_id, created_by,
    topic, category, format
  ) VALUES (
    p_challenger_group_id, p_defender_group_id, v_user_id,
    trim(p_topic), p_category, p_format
  ) RETURNING id INTO v_challenge_id;

  RETURN json_build_object('challenge_id', v_challenge_id);
END;

$function$;

CREATE OR REPLACE FUNCTION public.discover_groups(p_limit integer DEFAULT 20, p_category text DEFAULT NULL::text, p_search text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT
      g.id,
      g.name,
      g.slug,
      g.description,
      g.category,
      g.member_count,
      g.elo_rating,
      g.avatar_emoji,
      g.created_at
    FROM public.groups g
    WHERE g.is_public = true
      AND (p_category IS NULL OR g.category = p_category)
      AND (p_search IS NULL OR g.name ILIKE '%' || p_search || '%' OR g.description ILIKE '%' || p_search || '%')
    ORDER BY g.member_count DESC, g.elo_rating DESC
    LIMIT p_limit
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_group_challenges(p_group_id uuid, p_status text DEFAULT NULL::text, p_limit integer DEFAULT 20)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_result JSON;
BEGIN
  -- Clamp limit
  IF p_limit > 50 THEN p_limit := 50; END IF;
  IF p_limit < 1 THEN p_limit := 1; END IF;

  SELECT json_agg(row_to_json(c)) INTO v_result
  FROM (
    SELECT
      gc.id,
      gc.challenger_group_id,
      gc.defender_group_id,
      gc.topic,
      gc.category,
      gc.format,
      gc.status,
      gc.winner_group_id,
      gc.created_at,
      gc.expires_at,
      gc.responded_at,
      gc.completed_at,
      -- Challenger group info
      cg.name AS challenger_name,
      cg.avatar_emoji AS challenger_emoji,
      COALESCE(cg.group_elo, 1200) AS challenger_elo,
      -- Defender group info
      dg.name AS defender_name,
      dg.avatar_emoji AS defender_emoji,
      COALESCE(dg.group_elo, 1200) AS defender_elo,
      -- Creator info
      p.username AS created_by_username
    FROM group_challenges gc
    JOIN groups cg ON cg.id = gc.challenger_group_id
    JOIN groups dg ON dg.id = gc.defender_group_id
    JOIN profiles p ON p.id = gc.created_by
    WHERE (gc.challenger_group_id = p_group_id OR gc.defender_group_id = p_group_id)
      AND (p_status IS NULL OR gc.status = p_status)
    ORDER BY
      CASE gc.status
        WHEN 'pending' THEN 1
        WHEN 'accepted' THEN 2
        WHEN 'live' THEN 3
        ELSE 4
      END,
      gc.created_at DESC
    LIMIT p_limit
  ) c;

  RETURN COALESCE(v_result, '[]'::JSON);
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_group_details(p_group_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_group public.groups;
  v_is_member BOOLEAN := false;
  v_my_role TEXT;
BEGIN
  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT role INTO v_my_role
    FROM public.group_members
    WHERE group_id = p_group_id AND user_id = v_user_id;
    v_is_member := v_my_role IS NOT NULL;
  END IF;

  -- Private groups: only members can see details
  IF v_group.is_public = false AND NOT v_is_member THEN
    RAISE EXCEPTION 'This group is private';
  END IF;

  RETURN json_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'slug', v_group.slug,
    'description', v_group.description,
    'category', v_group.category,
    'owner_id', v_group.owner_id,
    'member_count', v_group.member_count,
    'elo_rating', v_group.elo_rating,
    'is_public', v_group.is_public,
    'avatar_emoji', v_group.avatar_emoji,
    'created_at', v_group.created_at,
    'is_member', v_is_member,
    'my_role', v_my_role
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_group_leaderboard(p_limit integer DEFAULT 20, p_category text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT
      g.id,
      g.name,
      g.slug,
      g.description,
      g.category,
      g.member_count,
      g.elo_rating,
      g.avatar_emoji,
      p.username AS owner_username,
      ROW_NUMBER() OVER (ORDER BY g.elo_rating DESC) AS rank
    FROM public.groups g
    JOIN public.profiles_public p ON p.id = g.owner_id
    WHERE g.is_public = true
      AND (p_category IS NULL OR g.category = p_category)
    ORDER BY g.elo_rating DESC
    LIMIT p_limit
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_group_members(p_group_id uuid, p_limit integer DEFAULT 50)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_is_public BOOLEAN;
  v_is_member BOOLEAN := false;
  v_result JSON;
BEGIN
  -- Check if group exists and get privacy setting
  SELECT is_public INTO v_is_public FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  -- For private groups, verify caller is a member
  IF v_is_public = false THEN
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'This group is private';
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM public.group_members
      WHERE group_id = p_group_id AND user_id = v_user_id
    ) INTO v_is_member;

    IF NOT v_is_member THEN
      RAISE EXCEPTION 'This group is private';
    END IF;
  END IF;

  SELECT json_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT
      gm.user_id,
      gm.role,
      gm.joined_at,
      p.username,
      p.display_name,
      p.avatar_url,
      p.elo_rating,
      p.wins,
      p.losses,
      p.level
    FROM public.group_members gm
    JOIN public.profiles_public p ON p.id = gm.user_id
    WHERE gm.group_id = p_group_id
    ORDER BY
      CASE gm.role
        WHEN 'leader'    THEN 0
        WHEN 'co_leader' THEN 1
        WHEN 'elder'     THEN 2
        WHEN 'member'    THEN 3
        ELSE 4
      END,
      p.elo_rating DESC
    LIMIT p_limit
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_my_groups()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_result JSON;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT
      g.id,
      g.name,
      g.slug,
      g.description,
      g.category,
      g.member_count,
      g.elo_rating,
      g.avatar_emoji,
      gm.role,
      gm.joined_at
    FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = v_user_id
    ORDER BY gm.joined_at DESC
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;

$function$;

CREATE OR REPLACE FUNCTION public.group_role_rank(p_role text)
 RETURNS integer
 LANGUAGE sql
AS $function$

  SELECT CASE p_role
    WHEN 'leader'    THEN 4
    WHEN 'co_leader' THEN 3
    WHEN 'elder'     THEN 2
    WHEN 'member'    THEN 1
    ELSE 0
  END;

$function$;

CREATE OR REPLACE FUNCTION public.join_group(p_group_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

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

$function$;

CREATE OR REPLACE FUNCTION public.kick_group_member(p_group_id uuid, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
  v_target_role text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller_id = p_user_id THEN
    RAISE EXCEPTION 'Use leave_group to leave a group';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_caller_id;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  SELECT role INTO v_target_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user is not a member of this group';
  END IF;

  IF public.group_role_rank(v_caller_role) <= public.group_role_rank(v_target_role) THEN
    RAISE EXCEPTION 'Insufficient permissions: cannot kick a member of equal or higher rank';
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  UPDATE public.groups
  SET member_count = GREATEST(0, member_count - 1), updated_at = now()
  WHERE id = p_group_id;

  RETURN json_build_object('success', true);
END;

$function$;

CREATE OR REPLACE FUNCTION public.leave_group(p_group_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id     uuid := auth.uid();
  v_caller_role text;
  v_next_user   uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  IF v_caller_role = 'leader' THEN
    -- Find most senior remaining member (highest rank, earliest joined_at)
    SELECT user_id INTO v_next_user
    FROM public.group_members
    WHERE group_id = p_group_id AND user_id != v_user_id
    ORDER BY public.group_role_rank(role) DESC, joined_at ASC
    LIMIT 1;

    IF v_next_user IS NULL THEN
      -- No remaining members — dissolve the group
      DELETE FROM public.groups WHERE id = p_group_id;
      RETURN json_build_object('success', true, 'dissolved', true);
    END IF;

    UPDATE public.group_members SET role = 'leader'
    WHERE group_id = p_group_id AND user_id = v_next_user;

    UPDATE public.groups SET owner_id = v_next_user, updated_at = now()
    WHERE id = p_group_id;
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  UPDATE public.groups
  SET member_count = GREATEST(0, member_count - 1), updated_at = now()
  WHERE id = p_group_id;

  RETURN json_build_object('success', true, 'dissolved', false);
END;

$function$;

CREATE OR REPLACE FUNCTION public.promote_group_member(p_group_id uuid, p_user_id uuid, p_new_role text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
  v_target_role text;
  v_caller_rank integer;
  v_target_rank integer;
  v_new_rank    integer;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_new_role NOT IN ('leader', 'co_leader', 'elder', 'member') THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;

  IF v_caller_id = p_user_id THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_caller_id;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  SELECT role INTO v_target_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user is not a member of this group';
  END IF;

  v_caller_rank := public.group_role_rank(v_caller_role);
  v_target_rank := public.group_role_rank(v_target_role);
  v_new_rank    := public.group_role_rank(p_new_role);

  -- Leadership transfer: only leader can do it
  IF p_new_role = 'leader' THEN
    IF v_caller_role != 'leader' THEN
      RAISE EXCEPTION 'Only the leader can transfer leadership';
    END IF;

    UPDATE public.group_members SET role = 'member'
    WHERE group_id = p_group_id AND user_id = v_caller_id;

    UPDATE public.group_members SET role = 'leader'
    WHERE group_id = p_group_id AND user_id = p_user_id;

    UPDATE public.groups SET owner_id = p_user_id
    WHERE id = p_group_id;

    RETURN json_build_object('success', true, 'transferred', true);
  END IF;

  -- All other changes: caller rank must be strictly greater than both
  -- the target's current rank and the new rank being assigned
  IF v_caller_rank <= v_target_rank THEN
    RAISE EXCEPTION 'Insufficient permissions: cannot manage a member of equal or higher rank';
  END IF;

  IF v_caller_rank <= v_new_rank THEN
    RAISE EXCEPTION 'Insufficient permissions: cannot assign a role equal to or higher than your own';
  END IF;

  UPDATE public.group_members SET role = p_new_role
  WHERE group_id = p_group_id AND user_id = p_user_id;

  RETURN json_build_object('success', true, 'new_role', p_new_role);
END;

$function$;

CREATE OR REPLACE FUNCTION public.resolve_group_challenge(p_challenge_id uuid, p_winner_group_id uuid, p_debate_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

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

$function$;

CREATE OR REPLACE FUNCTION public.respond_to_group_challenge(p_challenge_id uuid, p_action text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID;
  v_challenge RECORD;
  v_caller_role text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  IF p_action NOT IN ('accept', 'decline') THEN
    RETURN json_build_object('error', 'Action must be accept or decline');
  END IF;

  SELECT * INTO v_challenge
  FROM group_challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Challenge not found');
  END IF;

  IF v_challenge.status != 'pending' THEN
    RETURN json_build_object('error', 'Challenge is no longer pending');
  END IF;

  IF v_challenge.expires_at < NOW() THEN
    UPDATE group_challenges SET status = 'expired' WHERE id = p_challenge_id;
    RETURN json_build_object('error', 'Challenge has expired');
  END IF;

  -- Must be leader or co_leader of defender group
  SELECT role INTO v_caller_role
  FROM group_members
  WHERE group_id = v_challenge.defender_group_id AND user_id = v_user_id;

  IF v_caller_role IS NULL OR group_role_rank(v_caller_role) < 3 THEN
    RETURN json_build_object('error', 'Only leaders or co-leaders can accept or decline challenges');
  END IF;

  UPDATE group_challenges
  SET status = CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'declined' END,
      responded_at = NOW()
  WHERE id = p_challenge_id;

  RETURN json_build_object('success', true, 'status', CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'declined' END);
END;

$function$;

CREATE OR REPLACE FUNCTION public.unban_group_member(p_group_id uuid, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_caller_id;

  IF public.group_role_rank(v_caller_role) < 3 THEN
    RAISE EXCEPTION 'Insufficient permissions: only co-leaders and above can unban';
  END IF;

  DELETE FROM public.group_bans
  WHERE group_id = p_group_id AND user_id = p_user_id;

  RETURN json_build_object('success', true);
END;

$function$;
