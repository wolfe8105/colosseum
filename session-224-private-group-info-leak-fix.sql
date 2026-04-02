-- Session 224: Fix private group info leaks
-- get_group_details and get_group_members return full data for private groups
-- to non-members (and even unauthenticated users for get_group_members).

-- --------------------------------------------------------
-- get_group_details — block non-members from private group details
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_group_details(p_group_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- --------------------------------------------------------
-- get_group_members — add auth + block non-members from private groups
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_group_members(p_group_id uuid, p_limit integer DEFAULT 50)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
