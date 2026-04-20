-- BUG 9 FIX: create_hot_take and create_voice_take silently reject group UUIDs
-- passed as p_section, falling back to 'trending'. Group posts succeed but don't
-- appear in the group feed because the feed queries by group UUID.
--
-- Fix: validate p_section as either a known section name OR a valid UUID (group ID).
-- If it's a UUID, verify it exists in the groups table.

CREATE OR REPLACE FUNCTION public.create_hot_take(p_content text, p_section text DEFAULT 'trending'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_take_id UUID;
  v_allowed BOOLEAN;
  v_clean_content TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE LOG 'SECURITY|auth_failure|anonymous|create_hot_take|unauthenticated call';
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Sanitize
  v_clean_content := sanitize_text(p_content);

  IF v_clean_content IS NULL OR char_length(trim(v_clean_content)) = 0 THEN
    RAISE EXCEPTION 'Content cannot be empty';
  END IF;
  IF char_length(v_clean_content) > 280 THEN
    RAISE LOG 'SECURITY|input_violation|%|create_hot_take|oversized content len=%', v_user_id, char_length(v_clean_content);
    RAISE EXCEPTION 'Content exceeds 280 characters';
  END IF;

  -- BUG 9 FIX: Accept known sections OR valid group UUIDs
  IF p_section NOT IN ('trending','politics','sports','entertainment','music','couples_court') THEN
    -- Check if p_section is a valid UUID pointing to an existing group
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = p_section::uuid) THEN
        p_section := 'trending';
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      -- p_section is not a valid UUID format, fall back
      p_section := 'trending';
    END;
  END IF;

  -- Rate limit: 10 per hour
  v_allowed := check_rate_limit(v_user_id, 'hot_take', 60, 10);
  IF NOT v_allowed THEN
    RAISE LOG 'SECURITY|rate_limit_blocked|%|create_hot_take|hot_take limit exceeded', v_user_id;
    RAISE EXCEPTION 'Rate limit: max 10 hot takes per hour';
  END IF;

  INSERT INTO public.hot_takes (user_id, content, section)
  VALUES (v_user_id, trim(v_clean_content), p_section)
  RETURNING id INTO v_take_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'hot_take_posted',
    p_user_id    := v_user_id,
    p_debate_id  := NULL,
    p_category   := p_section,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'section', p_section,
      'word_count', array_length(string_to_array(trim(v_clean_content), ' '), 1),
      'has_link', (trim(v_clean_content) ~* 'https?://')
    )
  );

  RETURN json_build_object(
    'success', true,
    'id', v_take_id,
    'section', p_section
  );
END;

$function$;


-- Same fix for create_voice_take
CREATE OR REPLACE FUNCTION public.create_voice_take(p_section text DEFAULT 'trending'::text, p_voice_memo_url text DEFAULT NULL::text, p_voice_memo_path text DEFAULT NULL::text, p_voice_memo_duration integer DEFAULT NULL::integer, p_parent_id uuid DEFAULT NULL::uuid, p_content text DEFAULT '🎤 Voice Take'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_take_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_voice_memo_url IS NULL THEN
    RAISE EXCEPTION 'Voice memo URL is required';
  END IF;

  -- BUG 9 FIX: Accept known sections OR valid group UUIDs
  IF p_section NOT IN ('trending','politics','sports','entertainment','music','couples_court') THEN
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = p_section::uuid) THEN
        p_section := 'trending';
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      p_section := 'trending';
    END;
  END IF;

  INSERT INTO public.hot_takes (
    user_id, content, section,
    voice_memo_url, voice_memo_path, voice_memo_duration, parent_id
  )
  VALUES (
    v_user_id, COALESCE(p_content, '🎤 Voice Take'), p_section,
    p_voice_memo_url, p_voice_memo_path, p_voice_memo_duration, p_parent_id
  )
  RETURNING id INTO v_take_id;

  RETURN json_build_object(
    'success', true,
    'id', v_take_id,
    'section', p_section
  );
END;

$function$;
