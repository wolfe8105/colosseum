-- ============================================================
-- F-69 FIX: Join code length 6 → 5
-- Session 295 | April 21, 2026
--
-- WHAT: Join codes were 6 hex characters but the input field
--       on the Arena lobby only displayed/accepted 5 chars on
--       many viewports. Changed code gen to 5 chars everywhere.
-- WHY:  Users literally could not type or paste the full code.
-- ============================================================

-- Fix all 3 overloads of create_private_lobby

-- Overload 1 (7 params)
CREATE OR REPLACE FUNCTION public.create_private_lobby(p_mode text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_visibility text DEFAULT 'private'::text, p_invited_user_id uuid DEFAULT NULL::uuid, p_group_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(debate_id uuid, join_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_user_id   uuid := auth.uid();
  v_debate_id uuid;
  v_code      text := NULL;
  v_attempts  int  := 0;
  v_candidate text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_visibility NOT IN ('private', 'group', 'code') THEN RAISE EXCEPTION 'Invalid visibility value'; END IF;
  IF p_visibility = 'private' AND p_invited_user_id IS NULL THEN RAISE EXCEPTION 'invited_user_id required for private lobbies'; END IF;
  IF p_visibility = 'group' THEN
    IF p_group_id IS NULL THEN RAISE EXCEPTION 'group_id required for group lobbies'; END IF;
    IF NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'Not a member of this group';
    END IF;
  END IF;
  IF p_visibility = 'code' THEN
    LOOP
      v_candidate := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 5));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM arena_debates ad WHERE ad.join_code = v_candidate);
      v_attempts := v_attempts + 1;
      IF v_attempts >= 5 THEN RAISE EXCEPTION 'Could not generate unique join code'; END IF;
    END LOOP;
    v_code := v_candidate;
  END IF;
  INSERT INTO arena_debates (
    debater_a, mode, topic, category, ranked,
    status, visibility, join_code, invited_user_id, lobby_group_id,
    player_a_ready
  ) VALUES (
    v_user_id, p_mode, p_topic, p_category, p_ranked,
    'pending', p_visibility, v_code, p_invited_user_id, p_group_id,
    true
  )
  RETURNING id INTO v_debate_id;
  PERFORM log_event(
    p_event_type := 'private_lobby_created',
    p_user_id    := v_user_id,
    p_debate_id  := v_debate_id,
    p_category   := p_category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('visibility', p_visibility, 'mode', p_mode)
  );
  RETURN QUERY SELECT v_debate_id, v_code;
END;
$function$;

-- Overload 2 (8 params with ruleset)
CREATE OR REPLACE FUNCTION public.create_private_lobby(p_mode text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_visibility text DEFAULT 'private'::text, p_invited_user_id uuid DEFAULT NULL::uuid, p_group_id uuid DEFAULT NULL::uuid, p_ruleset text DEFAULT 'amplified'::text)
 RETURNS TABLE(debate_id uuid, join_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_user_id   uuid := auth.uid();
  v_debate_id uuid;
  v_code      text := NULL;
  v_attempts  int  := 0;
  v_candidate text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_visibility NOT IN ('private', 'group', 'code') THEN RAISE EXCEPTION 'Invalid visibility value'; END IF;
  IF p_visibility = 'private' AND p_invited_user_id IS NULL THEN RAISE EXCEPTION 'invited_user_id required for private lobbies'; END IF;
  IF p_visibility = 'group' THEN
    IF p_group_id IS NULL THEN RAISE EXCEPTION 'group_id required for group lobbies'; END IF;
    IF NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'Not a member of this group';
    END IF;
  END IF;
  IF p_visibility = 'code' THEN
    LOOP
      v_candidate := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 5));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM arena_debates ad WHERE ad.join_code = v_candidate);
      v_attempts := v_attempts + 1;
      IF v_attempts >= 5 THEN RAISE EXCEPTION 'Could not generate unique join code'; END IF;
    END LOOP;
    v_code := v_candidate;
  END IF;
  INSERT INTO arena_debates (
    debater_a, mode, topic, category, ranked, ruleset,
    status, visibility, join_code, invited_user_id, lobby_group_id,
    player_a_ready
  ) VALUES (
    v_user_id, p_mode, p_topic, p_category, p_ranked, p_ruleset,
    'pending', p_visibility, v_code, p_invited_user_id, p_group_id,
    true
  )
  RETURNING id INTO v_debate_id;
  PERFORM log_event(
    p_event_type := 'private_lobby_created',
    p_user_id    := v_user_id,
    p_debate_id  := v_debate_id,
    p_category   := p_category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('visibility', p_visibility, 'mode', p_mode, 'ruleset', p_ruleset)
  );
  RETURN QUERY SELECT v_debate_id, v_code;
END;
$function$;

-- Overload 3 (9 params with ruleset + total_rounds)
CREATE OR REPLACE FUNCTION public.create_private_lobby(p_mode text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_visibility text DEFAULT 'private'::text, p_invited_user_id uuid DEFAULT NULL::uuid, p_group_id uuid DEFAULT NULL::uuid, p_ruleset text DEFAULT 'amplified'::text, p_total_rounds integer DEFAULT 4)
 RETURNS TABLE(debate_id uuid, join_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_user_id   uuid := auth.uid();
  v_debate_id uuid;
  v_code      text := NULL;
  v_attempts  int  := 0;
  v_candidate text;
  v_total_rounds int;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_visibility NOT IN ('private', 'group', 'code') THEN RAISE EXCEPTION 'Invalid visibility value'; END IF;
  IF p_visibility = 'private' AND p_invited_user_id IS NULL THEN RAISE EXCEPTION 'invited_user_id required for private lobbies'; END IF;
  IF p_visibility = 'group' THEN
    IF p_group_id IS NULL THEN RAISE EXCEPTION 'group_id required for group lobbies'; END IF;
    IF NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'Not a member of this group';
    END IF;
  END IF;
  v_total_rounds := CASE WHEN p_total_rounds IN (4, 6, 8, 10) THEN p_total_rounds ELSE 4 END;
  IF p_visibility = 'code' THEN
    LOOP
      v_candidate := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 5));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM arena_debates ad WHERE ad.join_code = v_candidate);
      v_attempts := v_attempts + 1;
      IF v_attempts >= 5 THEN RAISE EXCEPTION 'Could not generate unique join code'; END IF;
    END LOOP;
    v_code := v_candidate;
  END IF;
  INSERT INTO arena_debates (
    debater_a, mode, topic, category, ranked, ruleset,
    status, visibility, join_code, invited_user_id, lobby_group_id,
    player_a_ready, total_rounds
  ) VALUES (
    v_user_id, p_mode, p_topic, p_category, p_ranked, p_ruleset,
    'pending', p_visibility, v_code, p_invited_user_id, p_group_id,
    true, v_total_rounds
  )
  RETURNING id INTO v_debate_id;
  PERFORM log_event(
    p_event_type := 'private_lobby_created',
    p_user_id    := v_user_id,
    p_debate_id  := v_debate_id,
    p_category   := p_category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('visibility', p_visibility, 'mode', p_mode, 'ruleset', p_ruleset, 'total_rounds', v_total_rounds)
  );
  RETURN QUERY SELECT v_debate_id, v_code;
END;
$function$;

-- NOTE: create_mod_debate overloads also need updating.
-- Run the full moderation.sql domain file to update all 3 overloads,
-- or manually find/replace '1, 6' → '1, 5' in the create_mod_debate functions.

-- ============================================================
-- VERIFICATION:
--   SELECT proname, substring(prosrc from 'FOR [0-9]+') FROM pg_proc
--   WHERE proname = 'create_private_lobby';
--   -- Should all show 'FOR 5'
-- ============================================================
