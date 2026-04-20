-- THE MODERATOR — Deployed Functions Export
-- Auto-generated from Supabase production database
-- Last updated: Session 252 (April 9, 2026) — F-55 Reference System Overhaul landed
--
-- This file is the source of truth for what RPCs are live in production.
-- Re-export after any session that modifies RPCs.

-- Domain: hot-takes

-- Functions: 10

-- Auto-generated from supabase-deployed-functions-export.sql


CREATE OR REPLACE FUNCTION public.cast_landing_vote(p_topic_slug text, p_side text, p_fingerprint text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  INSERT INTO landing_votes (topic_slug, side, fingerprint)
  VALUES (p_topic_slug, p_side, p_fingerprint)
  ON CONFLICT (topic_slug, fingerprint) DO UPDATE SET side = EXCLUDED.side;
END;

$function$;

CREATE OR REPLACE FUNCTION public.cast_landing_vote(p_topic text, p_side text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  result JSON;
BEGIN
  IF p_side NOT IN ('yes', 'no') THEN
    RAISE EXCEPTION 'Invalid side: %', p_side;
  END IF;

  INSERT INTO landing_vote_counts (topic_slug, yes_votes, no_votes, updated_at)
  VALUES (
    p_topic,
    CASE WHEN p_side = 'yes' THEN 1 ELSE 0 END,
    CASE WHEN p_side = 'no' THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (topic_slug) DO UPDATE SET
    yes_votes = landing_vote_counts.yes_votes + CASE WHEN p_side = 'yes' THEN 1 ELSE 0 END,
    no_votes = landing_vote_counts.no_votes + CASE WHEN p_side = 'no' THEN 1 ELSE 0 END,
    updated_at = now();

  SELECT json_build_object(
    'topic_slug', lvc.topic_slug,
    'yes_votes', lvc.yes_votes,
    'no_votes', lvc.no_votes
  ) INTO result
  FROM landing_vote_counts lvc
  WHERE lvc.topic_slug = p_topic;

  RETURN result;
END;

$function$;

CREATE OR REPLACE FUNCTION public.create_challenge(p_hot_take_id uuid, p_counter_argument text, p_topic text DEFAULT ''::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_take RECORD;
  v_clean_arg TEXT;
  v_clean_topic TEXT;
  v_debate_id UUID;
  v_allowed BOOLEAN;
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate counter-argument
  IF p_counter_argument IS NULL OR char_length(trim(p_counter_argument)) = 0 THEN
    RAISE EXCEPTION 'Counter-argument cannot be empty';
  END IF;

  -- Sanitize inputs
  v_clean_arg := sanitize_text(p_counter_argument);
  v_clean_topic := CASE
    WHEN p_topic IS NOT NULL AND char_length(trim(p_topic)) > 0
    THEN sanitize_text(p_topic)
    ELSE 'Challenge'
  END;

  -- Post-sanitization length check
  IF char_length(v_clean_arg) < 5 THEN
    RAISE EXCEPTION 'Counter-argument must be at least 5 characters';
  END IF;
  IF char_length(v_clean_arg) > 500 THEN
    RAISE EXCEPTION 'Counter-argument must be under 500 characters';
  END IF;

  -- Verify the hot take exists and get the defender (original poster)
  SELECT id, user_id, content, section
  INTO v_take
  FROM public.hot_takes
  WHERE id = p_hot_take_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hot take not found';
  END IF;

  -- Can't challenge your own take
  IF v_take.user_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot challenge your own hot take';
  END IF;

  -- Rate limit: 5 challenges per hour
  v_allowed := check_rate_limit(v_user_id, 'challenge', 60, 5);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit: max 5 challenges per hour';
  END IF;

  -- Create the async debate
  INSERT INTO public.async_debates (
    hot_take_id,
    topic,
    category,
    challenger_id,
    defender_id,
    status,
    rounds
  ) VALUES (
    p_hot_take_id,
    v_clean_topic,
    COALESCE(v_take.section, 'general'),
    v_user_id,
    v_take.user_id,
    'open',
    jsonb_build_array(
      jsonb_build_object(
        'round', 1,
        'user_id', v_user_id,
        'content', v_clean_arg,
        'created_at', now()
      )
    )
  )
  RETURNING id INTO v_debate_id;

  -- Increment denormalized challenge_count on the hot take
  UPDATE public.hot_takes
  SET challenge_count = challenge_count + 1
  WHERE id = p_hot_take_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'challenge_created',
    p_user_id    := v_user_id,
    p_debate_id  := v_debate_id,
    p_category   := COALESCE(v_take.section, 'general'),
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'hot_take_id', p_hot_take_id,
      'defender_id', v_take.user_id,
      'arg_length', char_length(v_clean_arg)
    )
  );

  RETURN json_build_object(
    'success', true,
    'debate_id', v_debate_id,
    'status', 'open'
  );
END;

$function$;

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

  IF p_section NOT IN ('trending','politics','sports','entertainment','music','couples_court') THEN
    -- BUG 9 FIX: Accept valid group UUIDs as section
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = p_section::uuid) THEN
        p_section := 'trending';
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      p_section := 'trending';
    END;
  END IF;
  v_allowed := check_rate_limit(v_user_id, 'hot_take', 60, 10);
  IF NOT v_allowed THEN
    RAISE LOG 'SECURITY|rate_limit_blocked|%|create_hot_take|hot_take limit exceeded', v_user_id;
    RAISE EXCEPTION 'Rate limit: max 10 hot takes per hour';
  END IF;

  -- Rate limit: 10 per hour
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

  IF p_section NOT IN ('trending','politics','sports','entertainment','music','couples_court') THEN
    p_section := 'trending';
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

CREATE OR REPLACE FUNCTION public.get_landing_vote_counts(p_topic_slug text)
 RETURNS TABLE(yes_count bigint, no_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE side = 'yes') AS yes_count,
    COUNT(*) FILTER (WHERE side = 'no') AS no_count
  FROM landing_votes
  WHERE topic_slug = p_topic_slug;
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_landing_votes(p_topics text[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  result JSON;
BEGIN
  SELECT json_object_agg(
    lvc.topic_slug,
    json_build_object('yes_votes', lvc.yes_votes, 'no_votes', lvc.no_votes)
  ) INTO result
  FROM landing_vote_counts lvc
  WHERE lvc.topic_slug = ANY(p_topics);

  RETURN COALESCE(result, '{}'::json);
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_pending_challenges()
 RETURNS TABLE(debate_id uuid, mode text, topic text, ranked boolean, challenger_name text, challenger_id uuid, challenger_elo integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    ad.id,
    ad.mode,
    ad.topic,
    ad.ranked,
    COALESCE(p.display_name, p.username, 'Unknown')::text,
    ad.debater_a,
    COALESCE(p.elo_rating, 1200)::int,
    ad.created_at
  FROM arena_debates ad
  JOIN profiles p ON p.id = ad.debater_a
  WHERE ad.invited_user_id = v_user_id
    AND ad.status          = 'pending'
    AND ad.visibility      = 'private'
  ORDER BY ad.created_at DESC;
END;

$function$;

CREATE OR REPLACE FUNCTION public.react_hot_take(p_hot_take_id uuid, p_reaction_type text DEFAULT 'fire'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
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

CREATE OR REPLACE FUNCTION public.update_reaction_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.hot_takes SET reaction_count = reaction_count + 1 WHERE id = NEW.hot_take_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.hot_takes SET reaction_count = GREATEST(0, reaction_count - 1) WHERE id = OLD.hot_take_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;

$function$;
