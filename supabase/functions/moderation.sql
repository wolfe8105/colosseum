-- THE MODERATOR — Deployed Functions Export
-- Auto-generated from Supabase production database
-- Last updated: Session 252 (April 9, 2026) — F-55 Reference System Overhaul landed
--
-- This file is the source of truth for what RPCs are live in production.
-- Re-export after any session that modifies RPCs.

-- Domain: moderation

-- Functions: 22

-- Auto-generated from supabase-deployed-functions-export.sql


CREATE OR REPLACE FUNCTION public.assign_moderator(p_debate_id uuid, p_moderator_id uuid DEFAULT NULL::uuid, p_moderator_type text DEFAULT 'human'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_mod RECORD;
BEGIN
  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_user_id NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Only debaters can assign a moderator';
  END IF;
  IF v_debate.moderator_id IS NOT NULL THEN
    RAISE EXCEPTION 'Debate already has a moderator';
  END IF;

  IF p_moderator_type = 'ai' THEN
    -- AI moderator: no user ID needed
    UPDATE public.debates SET
      moderator_type = 'ai',
      updated_at = now()
    WHERE id = p_debate_id;

    -- FIXED: named parameters (LM-188 audit)
    PERFORM log_event(
      p_event_type := 'moderator_assigned',
      p_user_id    := v_user_id,
      p_debate_id  := p_debate_id,
      p_category   := v_debate.category,
      p_side       := NULL,
      p_metadata   := jsonb_build_object('type', 'ai', 'moderator_id', NULL, 'rating', NULL)
    );

    RETURN json_build_object('success', true, 'moderator_type', 'ai');
  END IF;

  -- Human moderator
  IF p_moderator_id IS NOT NULL THEN
    SELECT * INTO v_mod FROM public.profiles
    WHERE id = p_moderator_id AND is_moderator = true AND mod_available = true AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Moderator not found or not available';
    END IF;

    IF p_moderator_id IN (v_debate.debater_a, v_debate.debater_b) THEN
      RAISE EXCEPTION 'Cannot moderate a debate you are in';
    END IF;
  ELSE
    SELECT * INTO v_mod FROM public.profiles
    WHERE is_moderator = true
      AND mod_available = true
      AND deleted_at IS NULL
      AND id NOT IN (v_debate.debater_a, COALESCE(v_debate.debater_b, '00000000-0000-0000-0000-000000000000'))
    ORDER BY mod_rating DESC, mod_debates_total DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No moderators available';
    END IF;
  END IF;

  UPDATE public.debates SET
    moderator_id = v_mod.id,
    moderator_type = 'human',
    updated_at = now()
  WHERE id = p_debate_id;

  UPDATE public.profiles SET
    mod_debates_total = mod_debates_total + 1
  WHERE id = v_mod.id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'moderator_assigned',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'type', 'human',
      'moderator_id', v_mod.id,
      'rating', v_mod.mod_rating
    )
  );

  RETURN json_build_object(
    'success', true,
    'moderator_id', v_mod.id,
    'moderator_name', v_mod.display_name,
    'moderator_rating', v_mod.mod_rating
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.assign_moderator(p_debate_id uuid, p_moderator_type text, p_moderator_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_mod RECORD;
BEGIN
  SELECT * INTO v_debate FROM public.arena_debates WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_user_id NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Only debaters can assign a moderator';
  END IF;
  IF v_debate.moderator_id IS NOT NULL THEN
    RAISE EXCEPTION 'Debate already has a moderator';
  END IF;

  IF p_moderator_type = 'ai' THEN
    UPDATE public.arena_debates SET
      moderator_type = 'ai',
      updated_at = now()
    WHERE id = p_debate_id;

    PERFORM log_event(
      p_event_type := 'moderator_assigned',
      p_user_id    := v_user_id,
      p_debate_id  := p_debate_id,
      p_category   := v_debate.category,
      p_side       := NULL,
      p_metadata   := jsonb_build_object('type', 'ai', 'moderator_id', NULL, 'rating', NULL)
    );

    RETURN json_build_object('success', true, 'moderator_type', 'ai');
  END IF;

  -- Human moderator
  IF p_moderator_id IS NOT NULL THEN
    SELECT * INTO v_mod FROM public.profiles
    WHERE id = p_moderator_id AND is_moderator = true AND mod_available = true AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Moderator not found or not available';
    END IF;

    IF p_moderator_id IN (v_debate.debater_a, v_debate.debater_b) THEN
      RAISE EXCEPTION 'Cannot moderate a debate you are in';
    END IF;
  ELSE
    SELECT * INTO v_mod FROM public.profiles
    WHERE is_moderator = true
      AND mod_available = true
      AND deleted_at IS NULL
      AND id NOT IN (v_debate.debater_a, COALESCE(v_debate.debater_b, '00000000-0000-0000-0000-000000000000'))
    ORDER BY mod_rating DESC, mod_debates_total DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No moderators available';
    END IF;
  END IF;

  UPDATE public.arena_debates SET
    moderator_id = v_mod.id,
    moderator_type = 'human',
    updated_at = now()
  WHERE id = p_debate_id;

  UPDATE public.profiles SET
    mod_debates_total = mod_debates_total + 1
  WHERE id = v_mod.id;

  PERFORM log_event(
    p_event_type := 'moderator_assigned',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'type', 'human',
      'moderator_id', v_mod.id,
      'rating', v_mod.mod_rating
    )
  );

  RETURN json_build_object(
    'success', true,
    'moderator_id', v_mod.id,
    'moderator_name', v_mod.display_name,
    'moderator_rating', v_mod.mod_rating
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.browse_mod_queue()
 RETURNS TABLE(debate_id uuid, topic text, category text, mode text, created_at timestamp with time zone, debater_a_name text, debater_b_name text, mod_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_mod_categories TEXT[];
BEGIN
  SELECT p.mod_categories INTO v_mod_categories
  FROM public.profiles p
  WHERE p.id = v_user_id AND p.is_moderator = true AND p.mod_available = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not an available moderator';
  END IF;

  RETURN QUERY
  SELECT
    ad.id AS debate_id,
    ad.topic,
    ad.category,
    ad.mode,
    ad.created_at,
    pa.display_name AS debater_a_name,
    pb.display_name AS debater_b_name,
    ad.mod_status
  FROM public.arena_debates ad
  LEFT JOIN public.profiles pa ON pa.id = ad.debater_a
  LEFT JOIN public.profiles pb ON pb.id = ad.debater_b
  WHERE ad.mod_status = 'waiting'
    AND ad.status IN ('pending', 'lobby', 'matched', 'live')
    AND (
      array_length(v_mod_categories, 1) IS NULL
      OR ad.category = ANY(v_mod_categories)
    )
    AND ad.debater_a != v_user_id
    AND (ad.debater_b IS NULL OR ad.debater_b != v_user_id)
  ORDER BY ad.created_at ASC;
END;

$function$;

CREATE OR REPLACE FUNCTION public.cancel_mod_debate(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_uid    UUID := auth.uid();
  v_debate RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT ad.*
  INTO v_debate
  FROM arena_debates ad
  WHERE ad.id = p_debate_id
  FOR NO KEY UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_uid != v_debate.moderator_id THEN
    RAISE EXCEPTION 'Not the debate moderator';
  END IF;

  IF v_debate.status != 'lobby' THEN
    RAISE EXCEPTION 'Cannot cancel — debate already started';
  END IF;

  UPDATE arena_debates
  SET status = 'cancelled'
  WHERE id = p_debate_id;

  RETURN json_build_object('success', true);
END;

$function$;

CREATE OR REPLACE FUNCTION public.check_mod_cooldown(p_moderator_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_today_start TIMESTAMPTZ;
  v_dropouts_today INT;
  v_last_dropout RECORD;
  v_cooldown_expires TIMESTAMPTZ;
  v_in_cooldown BOOLEAN;
BEGIN
  -- ── Count today's dropouts ────────────────────────────
  v_today_start := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

  SELECT COUNT(*) INTO v_dropouts_today
    FROM mod_dropout_log
    WHERE moderator_id = p_moderator_id
      AND created_at >= v_today_start;

  -- No dropouts today → no cooldown
  IF v_dropouts_today = 0 THEN
    RETURN json_build_object(
      'in_cooldown', false,
      'dropouts_today', 0,
      'cooldown_expires_at', NULL,
      'next_offense_cooldown_minutes', get_mod_cooldown_minutes(1)
    );
  END IF;

  -- ── Get the most recent dropout ───────────────────────
  SELECT * INTO v_last_dropout
    FROM mod_dropout_log
    WHERE moderator_id = p_moderator_id
      AND created_at >= v_today_start
    ORDER BY created_at DESC
    LIMIT 1;

  -- Cooldown expires at: dropout time + cooldown duration
  v_cooldown_expires := v_last_dropout.created_at
    + (v_last_dropout.cooldown_minutes || ' minutes')::interval;

  v_in_cooldown := (now() < v_cooldown_expires);

  RETURN json_build_object(
    'in_cooldown', v_in_cooldown,
    'dropouts_today', v_dropouts_today,
    'cooldown_expires_at', CASE WHEN v_in_cooldown THEN v_cooldown_expires ELSE NULL END,
    'cooldown_remaining_seconds', CASE
      WHEN v_in_cooldown THEN EXTRACT(EPOCH FROM (v_cooldown_expires - now()))::int
      ELSE 0
    END,
    'next_offense_cooldown_minutes', get_mod_cooldown_minutes(v_dropouts_today + 1)
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.check_mod_debate(p_debate_id uuid)
 RETURNS TABLE(status text, debater_a_id uuid, debater_a_name text, debater_b_id uuid, debater_b_name text, topic text, ruleset text, total_rounds integer, language text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_uid    UUID := auth.uid();
  v_debate RECORD;
  v_pa     RECORD;
  v_pb     RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT ad.*
  INTO v_debate
  FROM arena_debates ad
  WHERE ad.id = p_debate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_uid != v_debate.moderator_id
     AND v_uid IS DISTINCT FROM v_debate.debater_a
     AND v_uid IS DISTINCT FROM v_debate.debater_b
  THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_debate.debater_a IS NOT NULL THEN
    SELECT p.display_name INTO v_pa FROM profiles p WHERE p.id = v_debate.debater_a;
  END IF;

  IF v_debate.debater_b IS NOT NULL THEN
    SELECT p.display_name INTO v_pb FROM profiles p WHERE p.id = v_debate.debater_b;
  END IF;

  status         := v_debate.status;
  debater_a_id   := v_debate.debater_a;
  debater_a_name := v_pa.display_name;
  debater_b_id   := v_debate.debater_b;
  debater_b_name := v_pb.display_name;
  topic          := v_debate.topic;
  ruleset        := v_debate.ruleset;
  total_rounds   := COALESCE(v_debate.total_rounds, 4);
  language       := COALESCE(v_debate.language, 'en');

  RETURN NEXT;
END;

$function$;

CREATE OR REPLACE FUNCTION public.create_mod_debate(p_mode text DEFAULT 'text'::text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_ruleset text DEFAULT 'amplified'::text)
 RETURNS TABLE(debate_id uuid, join_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_uid        UUID := auth.uid();
  v_profile    RECORD;
  v_debate_id  UUID;
  v_join_code  TEXT;
  v_attempts   INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.is_moderator INTO v_profile
  FROM profiles p WHERE p.id = v_uid;

  IF NOT FOUND OR v_profile.is_moderator IS NOT TRUE THEN
    RAISE EXCEPTION 'Not a moderator';
  END IF;

  IF p_ruleset NOT IN ('amplified', 'unplugged') THEN
    p_ruleset := 'amplified';
  END IF;

  IF p_mode NOT IN ('text', 'live', 'voicememo') THEN
    p_mode := 'text';
  END IF;

  LOOP
    v_join_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM arena_debates ad
      WHERE ad.join_code = v_join_code
        AND ad.status IN ('lobby', 'matched', 'live')
    );
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique join code';
    END IF;
  END LOOP;

  INSERT INTO arena_debates (
    debater_a, debater_b, moderator_id, mode, topic, category,
    ranked, ruleset, status, mod_status, visibility, join_code, total_rounds
  ) VALUES (
    NULL, NULL, v_uid, p_mode, p_topic, p_category,
    p_ranked, p_ruleset, 'lobby', 'claimed', 'code', v_join_code, 3
  )
  RETURNING id INTO v_debate_id;

  debate_id := v_debate_id;
  join_code := v_join_code;
  RETURN NEXT;
END;

$function$;

CREATE OR REPLACE FUNCTION public.create_mod_debate(p_mode text DEFAULT 'text'::text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_ruleset text DEFAULT 'amplified'::text, p_total_rounds integer DEFAULT 4)
 RETURNS TABLE(debate_id uuid, join_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_uid        UUID := auth.uid();
  v_profile    RECORD;
  v_debate_id  UUID;
  v_join_code  TEXT;
  v_attempts   INT := 0;
  v_total_rounds INT;
BEGIN
  -- Guard: must be authenticated
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Guard: must be a moderator
  SELECT p.is_moderator INTO v_profile
  FROM profiles p WHERE p.id = v_uid;

  IF NOT FOUND OR v_profile.is_moderator IS NOT TRUE THEN
    RAISE EXCEPTION 'Not a moderator';
  END IF;

  -- Guard: valid ruleset
  IF p_ruleset NOT IN ('amplified', 'unplugged') THEN
    p_ruleset := 'amplified';
  END IF;

  -- Guard: valid mode
  IF p_mode NOT IN ('text', 'live', 'voicememo') THEN
    p_mode := 'text';
  END IF;

  -- Sanitize total_rounds
  v_total_rounds := CASE WHEN p_total_rounds IN (4, 6, 8, 10) THEN p_total_rounds ELSE 4 END;

  -- Generate unique 6-char join code (retry on collision)
  LOOP
    v_join_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM arena_debates ad
      WHERE ad.join_code = v_join_code
        AND ad.status IN ('lobby', 'matched', 'live')
    );
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique join code';
    END IF;
  END LOOP;

  -- Insert debate row
  INSERT INTO arena_debates (
    debater_a,
    debater_b,
    moderator_id,
    mode,
    topic,
    category,
    ranked,
    ruleset,
    status,
    mod_status,
    visibility,
    join_code,
    total_rounds
  ) VALUES (
    NULL,
    NULL,
    v_uid,
    p_mode,
    p_topic,
    p_category,
    p_ranked,
    p_ruleset,
    'lobby',
    'claimed',
    'code',
    v_join_code,
    v_total_rounds
  )
  RETURNING id INTO v_debate_id;

  -- Return
  debate_id := v_debate_id;
  join_code := v_join_code;
  RETURN NEXT;
END;

$function$;

CREATE OR REPLACE FUNCTION public.create_mod_debate(p_mode text, p_topic text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_ranked boolean DEFAULT false)
 RETURNS TABLE(debate_id uuid, join_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id  UUID := auth.uid();
  v_is_mod   BOOLEAN;
  v_code     TEXT;
  v_debate_id UUID;
  v_attempts INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT is_moderator INTO v_is_mod FROM profiles WHERE id = v_user_id;
  IF NOT COALESCE(v_is_mod, FALSE) THEN
    RAISE EXCEPTION 'Not a moderator';
  END IF;

  -- Generate unique 6-char alphanumeric join code
  LOOP
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM arena_debates
      WHERE arena_debates.join_code = v_code
        AND status NOT IN ('complete', 'cancelled')
    );
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique join code';
    END IF;
  END LOOP;

  INSERT INTO arena_debates (
    debater_a,
    debater_b,
    mode,
    category,
    topic,
    status,
    total_rounds,
    ranked,
    moderator_id,
    mod_status,
    visibility,
    join_code
  ) VALUES (
    NULL,                 -- debater slots empty until players join
    NULL,
    p_mode,
    p_category,
    COALESCE(p_topic, 'Open Debate'),
    'lobby',
    3,
    COALESCE(p_ranked, FALSE),
    v_user_id,            -- mod is set from creation
    'claimed',
    'mod_created',
    v_code
  )
  RETURNING id INTO v_debate_id;

  RETURN QUERY SELECT v_debate_id, v_code;
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_available_moderators(p_exclude_ids uuid[] DEFAULT ARRAY[]::uuid[])
 RETURNS TABLE(id uuid, display_name text, username text, mod_rating numeric, mod_debates_total integer, mod_approval_pct numeric, avatar_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.username,
    p.mod_rating,
    p.mod_debates_total,
    p.mod_approval_pct,
    p.avatar_url
  FROM public.profiles p
  WHERE p.is_moderator = true
    AND p.mod_available = true
    AND p.deleted_at IS NULL
    AND p.id != ALL(p_exclude_ids)
  ORDER BY p.mod_rating DESC, p.mod_debates_total DESC
  LIMIT 20;
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_mod_cooldown_minutes(p_offense_number integer)
 RETURNS integer
 LANGUAGE sql
AS $function$

  SELECT CASE
    WHEN p_offense_number <= 1 THEN 10
    WHEN p_offense_number = 2 THEN 60
    ELSE 1440
  END;

$function$;

CREATE OR REPLACE FUNCTION public.get_mod_profile(p_moderator_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_mod RECORD;
BEGIN
  SELECT
    id,
    display_name,
    username,
    avatar_url,
    mod_rating,
    mod_approval_pct,
    mod_debates_total,
    mod_categories,
    mod_available,
    created_at
  INTO v_mod
  FROM public.profiles
  WHERE id = p_moderator_id
    AND is_moderator = true
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Moderator not found';
  END IF;

  RETURN json_build_object(
    'id',                v_mod.id,
    'display_name',      v_mod.display_name,
    'username',          v_mod.username,
    'avatar_url',        v_mod.avatar_url,
    'mod_rating',        v_mod.mod_rating,
    'mod_approval_pct',  v_mod.mod_approval_pct,
    'mod_debates_total', v_mod.mod_debates_total,
    'mod_categories',    v_mod.mod_categories,
    'mod_available',     v_mod.mod_available,
    'member_since',      v_mod.created_at
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.join_mod_debate(p_join_code text)
 RETURNS TABLE(debate_id uuid, role text, status text, topic text, mode text, ranked boolean, moderator_name text, opponent_name text, opponent_id uuid, opponent_elo integer, ruleset text, total_rounds integer, language text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_uid     UUID := auth.uid();
  v_debate  RECORD;
  v_role    TEXT;
  v_mod     RECORD;
  v_opp     RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT ad.*
  INTO v_debate
  FROM arena_debates ad
  WHERE ad.join_code = upper(trim(p_join_code))
    AND ad.status = 'lobby'
  FOR NO KEY UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Code not found or debate already started';
  END IF;

  IF v_uid = v_debate.moderator_id THEN
    RAISE EXCEPTION 'Moderator cannot join as debater';
  END IF;

  IF v_uid = v_debate.debater_a OR v_uid = v_debate.debater_b THEN
    RAISE EXCEPTION 'Already joined this debate';
  END IF;

  IF v_debate.debater_a IS NULL THEN
    UPDATE arena_debates
    SET debater_a = v_uid
    WHERE id = v_debate.id;
    v_role := 'a';
  ELSIF v_debate.debater_b IS NULL THEN
    UPDATE arena_debates
    SET debater_b = v_uid,
        status = 'matched'
    WHERE id = v_debate.id;
    v_role := 'b';
  ELSE
    RAISE EXCEPTION 'Debate is full';
  END IF;

  SELECT p.display_name INTO v_mod
  FROM profiles p WHERE p.id = v_debate.moderator_id;

  debate_id      := v_debate.id;
  role           := v_role;
  topic          := v_debate.topic;
  mode           := v_debate.mode;
  ranked         := v_debate.ranked;
  ruleset        := v_debate.ruleset;
  moderator_name := v_mod.display_name;
  total_rounds   := COALESCE(v_debate.total_rounds, 4);
  language       := COALESCE(v_debate.language, 'en');

  IF v_role = 'b' THEN
    status := 'matched';
    SELECT p.display_name, p.id, p.elo_rating::INT
    INTO v_opp
    FROM profiles p WHERE p.id = v_debate.debater_a;

    opponent_name := v_opp.display_name;
    opponent_id   := v_opp.id;
    opponent_elo  := v_opp.elo_rating;
  ELSE
    status        := 'lobby';
    opponent_name := NULL;
    opponent_id   := NULL;
    opponent_elo  := NULL;
  END IF;

  RETURN NEXT;
END;

$function$;

CREATE OR REPLACE FUNCTION public.mod_null_debate(p_debate_id uuid, p_reason text DEFAULT 'null'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_uid UUID := auth.uid();
  v_debate RECORD;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Load debate
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id FOR UPDATE;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- Idempotency: already cancelled or complete
  IF v_debate.status IN ('cancelled', 'complete') THEN
    RETURN json_build_object('success', true, 'already_processed', true);
  END IF;

  -- Caller must be the moderator of this debate
  IF v_uid != v_debate.moderator_id THEN
    RAISE EXCEPTION 'Only the moderator can null this debate';
  END IF;

  -- Debate must be in progress
  IF v_debate.status NOT IN ('live', 'round_break') THEN
    RAISE EXCEPTION 'Debate is not in progress';
  END IF;

  -- Validate reason
  IF p_reason NOT IN ('eject_a', 'eject_b', 'null') THEN
    RAISE EXCEPTION 'Invalid reason: must be eject_a, eject_b, or null';
  END IF;

  -- Null the debate
  UPDATE arena_debates
    SET status = 'cancelled',
        ended_at = now(),
        winner = NULL
    WHERE id = p_debate_id;

  RETURN json_build_object(
    'success', true,
    'reason', p_reason
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.record_mod_dropout(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_uid UUID := auth.uid();
  v_debate RECORD;
  v_mod_id UUID;
  v_dropouts_today INT;
  v_offense INT;
  v_cooldown INT;
  v_today_start TIMESTAMPTZ;
  v_total_score NUMERIC;
  v_total_count INT;
  v_new_approval NUMERIC;
BEGIN
  -- ── Auth ──────────────────────────────────────────────
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ── Load debate ───────────────────────────────────────
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- ── Idempotency: already cancelled ────────────────────
  -- Both debaters may call simultaneously. First one processes,
  -- second one returns success without re-processing.
  IF v_debate.status = 'cancelled' THEN
    RETURN json_build_object('success', true, 'already_processed', true);
  END IF;

  -- ── Caller must be a debater in this debate ───────────
  IF v_uid != v_debate.debater_a AND v_uid != v_debate.debater_b THEN
    RAISE EXCEPTION 'Only debaters can report a moderator dropout';
  END IF;

  -- ── Debate must be in progress ────────────────────────
  IF v_debate.status NOT IN ('live', 'round_break') THEN
    RAISE EXCEPTION 'Debate is not in progress';
  END IF;

  -- ── Debate must have a human moderator ────────────────
  -- No penalty for AI-moderated or unmoderated debates.
  IF v_debate.moderator_id IS NULL THEN
    RAISE EXCEPTION 'Debate has no moderator';
  END IF;
  IF v_debate.moderator_type != 'human' THEN
    RAISE EXCEPTION 'Dropout penalties only apply to human moderators';
  END IF;

  v_mod_id := v_debate.moderator_id;

  -- ── Null the debate ───────────────────────────────────
  -- Nobody gets a win or loss. Everyone returns to lobby.
  UPDATE arena_debates
    SET status = 'cancelled',
        ended_at = now(),
        winner = NULL
    WHERE id = p_debate_id;

  -- ── Count today's dropouts (UTC midnight reset) ───────
  v_today_start := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

  SELECT COUNT(*) INTO v_dropouts_today
    FROM mod_dropout_log
    WHERE moderator_id = v_mod_id
      AND created_at >= v_today_start;

  -- This dropout is the next offense
  v_offense := v_dropouts_today + 1;
  v_cooldown := get_mod_cooldown_minutes(v_offense);

  -- ── Log the dropout ───────────────────────────────────
  -- Bypasses RLS because SECURITY DEFINER runs as postgres.
  INSERT INTO mod_dropout_log (moderator_id, debate_id, cooldown_minutes, offense_number)
  VALUES (v_mod_id, p_debate_id, v_cooldown, v_offense);

  -- ── Impact mod_approval_pct ───────────────────────────
  -- Insert a synthetic 0-score as if the reporting debater gave
  -- the moderator a 0 (worst possible). Uses the same
  -- moderator_scores table so the running average stays consistent
  -- with normal post-debate scoring.
  --
  -- Debater score of 0 → 0 * 2.0 = 0/100 in the approval formula.
  -- ON CONFLICT: if both debaters call, only one row inserted.
  INSERT INTO moderator_scores (debate_id, moderator_id, scorer_id, scorer_role, score)
  VALUES (p_debate_id, v_mod_id, v_uid, 'debater', 0)
  ON CONFLICT (debate_id, scorer_id) DO NOTHING;

  -- Recalculate mod_approval_pct (same formula as score_moderator)
  SELECT
    AVG(CASE
      WHEN scorer_role = 'debater' THEN score * 2.0
      WHEN scorer_role = 'spectator' THEN score * 2.0
    END),
    COUNT(*)
  INTO v_total_score, v_total_count
  FROM moderator_scores
  WHERE moderator_id = v_mod_id;

  v_new_approval := COALESCE(v_total_score, 0.0);

  -- SECURITY DEFINER runs as postgres → bypasses guard_profile_columns trigger.
  UPDATE profiles SET
    mod_approval_pct = ROUND(v_new_approval, 2)
  WHERE id = v_mod_id;

  -- ── Analytics ─────────────────────────────────────────
  PERFORM log_event(
    'moderator_dropout',
    v_mod_id,
    p_debate_id,
    v_debate.category,
    NULL,
    jsonb_build_object(
      'offense_number', v_offense,
      'cooldown_minutes', v_cooldown,
      'reported_by', v_uid,
      'new_approval', ROUND(v_new_approval, 2),
      'dropouts_today', v_offense
    )
  );

  RETURN json_build_object(
    'success', true,
    'moderator_id', v_mod_id,
    'offense_number', v_offense,
    'cooldown_minutes', v_cooldown,
    'cooldown_expires_at', (now() + (v_cooldown || ' minutes')::interval),
    'new_approval', ROUND(v_new_approval, 2)
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.request_mod_for_debate(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_debate FROM public.arena_debates
  WHERE id = p_debate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_user_id NOT IN (v_debate.debater_a, COALESCE(v_debate.debater_b, '00000000-0000-0000-0000-000000000000')) THEN
    RAISE EXCEPTION 'Only debaters can request a moderator';
  END IF;

  IF v_debate.mod_status != 'none' THEN
    RETURN json_build_object('success', true, 'mod_status', v_debate.mod_status);
  END IF;

  UPDATE public.arena_debates
  SET mod_status = 'waiting', updated_at = now()
  WHERE id = p_debate_id;

  PERFORM log_event(
    p_event_type := 'mod_requested',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('requested_by', v_user_id)
  );

  RETURN json_build_object('success', true, 'mod_status', 'waiting');
END;

$function$;

CREATE OR REPLACE FUNCTION public.request_to_moderate(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_mod RECORD;
BEGIN
  -- Verify caller is an available moderator
  SELECT * INTO v_mod FROM public.profiles
  WHERE id = v_user_id
    AND is_moderator = true
    AND mod_available = true
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not an available moderator';
  END IF;

  -- Lock and read the debate row
  SELECT * INTO v_debate FROM public.arena_debates
  WHERE id = p_debate_id
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not available — already claimed by another moderator';
  END IF;

  IF v_debate.mod_status != 'waiting' THEN
    RAISE EXCEPTION 'Debate is not waiting for a moderator';
  END IF;

  IF v_user_id IN (v_debate.debater_a, COALESCE(v_debate.debater_b, '00000000-0000-0000-0000-000000000000')) THEN
    RAISE EXCEPTION 'Cannot moderate a debate you are in';
  END IF;

  -- Claim the request slot
  UPDATE public.arena_debates SET
    mod_status = 'requested',
    mod_requested_by = v_user_id,
    updated_at = now()
  WHERE id = p_debate_id;

  PERFORM log_event(
    p_event_type := 'mod_request_sent',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('moderator_id', v_user_id, 'moderator_name', v_mod.display_name)
  );

  RETURN json_build_object(
    'success', true,
    'debate_id', p_debate_id,
    'moderator_name', v_mod.display_name
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.respond_to_mod_request(p_debate_id uuid, p_accept boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
BEGIN
  SELECT * INTO v_debate FROM public.arena_debates
  WHERE id = p_debate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_user_id NOT IN (v_debate.debater_a, COALESCE(v_debate.debater_b, '00000000-0000-0000-0000-000000000000')) THEN
    RAISE EXCEPTION 'Only debaters can respond to a mod request';
  END IF;

  IF v_debate.mod_status != 'requested' THEN
    RAISE EXCEPTION 'No pending mod request on this debate';
  END IF;

  IF v_debate.mod_requested_by IS NULL THEN
    RAISE EXCEPTION 'Mod request has no moderator assigned';
  END IF;

  IF p_accept THEN
    UPDATE public.arena_debates SET
      mod_status    = 'claimed',
      moderator_id  = v_debate.mod_requested_by,
      moderator_type = 'human',
      updated_at    = now()
    WHERE id = p_debate_id;

    UPDATE public.profiles SET
      mod_debates_total = mod_debates_total + 1
    WHERE id = v_debate.mod_requested_by;

    PERFORM log_event(
      p_event_type := 'mod_request_accepted',
      p_user_id    := v_user_id,
      p_debate_id  := p_debate_id,
      p_category   := v_debate.category,
      p_side       := NULL,
      p_metadata   := jsonb_build_object('moderator_id', v_debate.mod_requested_by)
    );

    RETURN json_build_object(
      'success',       true,
      'accepted',      true,
      'moderator_id',  v_debate.mod_requested_by
    );
  ELSE
    -- Decline or timeout — reset to waiting
    UPDATE public.arena_debates SET
      mod_status       = 'waiting',
      mod_requested_by = NULL,
      updated_at       = now()
    WHERE id = p_debate_id;

    PERFORM log_event(
      p_event_type := 'mod_request_declined',
      p_user_id    := v_user_id,
      p_debate_id  := p_debate_id,
      p_category   := v_debate.category,
      p_side       := NULL,
      p_metadata   := jsonb_build_object('moderator_id', v_debate.mod_requested_by)
    );

    RETURN json_build_object(
      'success',  true,
      'accepted', false
    );
  END IF;
END;

$function$;

CREATE OR REPLACE FUNCTION public.score_moderator(p_debate_id uuid, p_score integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_role TEXT;
  v_total_score NUMERIC;
  v_total_count INTEGER;
  v_new_approval NUMERIC;
BEGIN
  SELECT * INTO v_debate FROM public.arena_debates WHERE id = p_debate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status != 'completed' THEN
    RAISE EXCEPTION 'Debate must be completed before scoring moderator';
  END IF;
  IF v_debate.moderator_id IS NULL THEN
    RAISE EXCEPTION 'No moderator assigned to this debate';
  END IF;
  IF v_user_id = v_debate.moderator_id THEN
    RAISE EXCEPTION 'Moderator cannot score themselves';
  END IF;

  IF v_user_id IN (v_debate.debater_a, v_debate.debater_b) THEN
    v_role := 'debater';
    IF p_score NOT IN (0, 25) THEN
      RAISE EXCEPTION 'Debater score must be 0 (not happy) or 25 (happy)';
    END IF;
  ELSE
    v_role := 'spectator';
    IF p_score < 1 OR p_score > 50 THEN
      RAISE EXCEPTION 'Spectator score must be between 1 and 50';
    END IF;
  END IF;

  INSERT INTO public.moderator_scores (debate_id, moderator_id, scorer_id, scorer_role, score)
  VALUES (p_debate_id, v_debate.moderator_id, v_user_id, v_role, p_score);

  SELECT
    AVG(CASE
      WHEN scorer_role = 'debater' THEN score * 2.0
      WHEN scorer_role = 'spectator' THEN score * 2.0
    END),
    COUNT(*)
  INTO v_total_score, v_total_count
  FROM public.moderator_scores
  WHERE moderator_id = v_debate.moderator_id;

  v_new_approval := COALESCE(v_total_score, 50.0);

  UPDATE public.profiles SET
    mod_approval_pct = ROUND(v_new_approval, 2)
  WHERE id = v_debate.moderator_id;

  PERFORM log_event(
    p_event_type := 'moderator_scored',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'scorer_role', v_role,
      'score', p_score,
      'new_approval', ROUND(v_new_approval, 2),
      'moderator_id', v_debate.moderator_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'role', v_role,
    'score', p_score,
    'new_approval', ROUND(v_new_approval, 2)
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.toggle_mod_available(p_available boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_is_mod BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT is_moderator INTO v_is_mod FROM public.profiles WHERE id = v_user_id;
  IF NOT v_is_mod THEN
    RAISE EXCEPTION 'Not a moderator';
  END IF;

  UPDATE public.profiles SET
    mod_available = p_available,
    updated_at = now()
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'mod_available', p_available);
END;

$function$;

CREATE OR REPLACE FUNCTION public.toggle_moderator_status(p_enabled boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles SET
    is_moderator = p_enabled,
    mod_available = CASE WHEN p_enabled THEN mod_available ELSE false END,
    updated_at = now()
  WHERE id = v_user_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := CASE WHEN p_enabled THEN 'moderator_opted_in' ELSE 'moderator_opted_out' END,
    p_user_id    := v_user_id,
    p_metadata   := jsonb_build_object('enabled', p_enabled)
  );

  RETURN json_build_object('success', true, 'is_moderator', p_enabled);
END;

$function$;

CREATE OR REPLACE FUNCTION public.update_mod_categories(p_categories text[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  UPDATE public.profiles SET
    mod_categories = p_categories,
    updated_at = now()
  WHERE id = v_user_id
    AND is_moderator = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a moderator';
  END IF;

  RETURN json_build_object('success', true, 'categories', p_categories);
END;

$function$;
