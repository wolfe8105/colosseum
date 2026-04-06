-- ============================================================
-- SESSION 240: Language Preference → Deepgram Pipeline
-- Decision: debate creator's profile language = debate language
-- ============================================================

-- ============================================================
-- LAYER 1: SCHEMA
-- ============================================================

-- profiles: user sets once in Settings
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';

-- arena_debates: stamped from creator's profile at debate creation
ALTER TABLE arena_debates ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- ============================================================
-- LAYER 2: TRIGGER — auto-stamp language on debate creation
-- Covers all 10 INSERT sites (create_ai_debate, create_mod_debate x3,
-- create_private_lobby x3, join_debate_queue x3) without touching any RPC body.
-- Creator = debater_a (most paths) or moderator_id (mod-created debates).
-- ============================================================

CREATE OR REPLACE FUNCTION public.stamp_debate_language()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  v_creator_id UUID;
  v_lang TEXT;
BEGIN
  -- Determine the creator: debater_a for most paths, moderator_id for mod-created
  v_creator_id := COALESCE(NEW.debater_a, NEW.moderator_id);

  IF v_creator_id IS NOT NULL THEN
    SELECT COALESCE(p.preferred_language, 'en')
    INTO v_lang
    FROM profiles p
    WHERE p.id = v_creator_id;

    NEW.language := COALESCE(v_lang, 'en');
  ELSE
    NEW.language := 'en';
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop if exists to avoid duplicate trigger
DROP TRIGGER IF EXISTS set_debate_language ON arena_debates;

CREATE TRIGGER set_debate_language
BEFORE INSERT ON arena_debates
FOR EACH ROW
EXECUTE FUNCTION stamp_debate_language();


-- ============================================================
-- LAYER 3: update_profile — add preferred_language to allow-list
-- Per LM-013: must add to function body AND allow-list
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_profile(
  p_display_name text DEFAULT NULL::text,
  p_avatar_url text DEFAULT NULL::text,
  p_bio text DEFAULT NULL::text,
  p_username text DEFAULT NULL::text,
  p_preferred_language text DEFAULT NULL::text
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_clean_name TEXT;
  v_clean_bio TEXT;
  v_clean_url TEXT;
  v_clean_username TEXT;
  v_clean_lang TEXT;
  v_allowed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE LOG 'SECURITY|auth_failure|anonymous|update_profile|unauthenticated profile update';
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Rate limit: 20 profile updates per hour
  v_allowed := check_rate_limit(v_user_id, 'profile_update', 60, 20);
  IF NOT v_allowed THEN
    RAISE LOG 'SECURITY|rate_limit_blocked|%|update_profile|profile_update limit exceeded', v_user_id;
    RAISE EXCEPTION 'Rate limit: too many profile updates';
  END IF;

  v_clean_name := sanitize_text(p_display_name);
  v_clean_bio := sanitize_text(p_bio);
  v_clean_url := sanitize_url(p_avatar_url);
  v_clean_username := p_username;

  -- Validate language: must be 2-5 char BCP-47 tag or NULL
  IF p_preferred_language IS NOT NULL THEN
    v_clean_lang := lower(trim(p_preferred_language));
    IF v_clean_lang !~ '^[a-z]{2,5}$' THEN
      RAISE EXCEPTION 'Invalid language code';
    END IF;
  END IF;

  IF v_clean_username IS NOT NULL THEN
    IF char_length(v_clean_username) < 3 OR char_length(v_clean_username) > 20 THEN
      RAISE EXCEPTION 'Username must be 3-20 characters';
    END IF;
    IF v_clean_username !~ '^[a-zA-Z0-9_]+$' THEN
      RAISE LOG 'SECURITY|input_violation|%|update_profile|invalid username chars=%', v_user_id, v_clean_username;
      RAISE EXCEPTION 'Username: alphanumeric + underscores only';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_clean_username AND id != v_user_id) THEN
      RAISE EXCEPTION 'Username already taken';
    END IF;
  END IF;

  IF v_clean_name IS NOT NULL AND char_length(v_clean_name) > 50 THEN
    RAISE EXCEPTION 'Display name max 50 characters';
  END IF;
  IF v_clean_bio IS NOT NULL AND char_length(v_clean_bio) > 500 THEN
    RAISE EXCEPTION 'Bio max 500 characters';
  END IF;

  UPDATE public.profiles SET
    username = COALESCE(v_clean_username, username),
    display_name = COALESCE(v_clean_name, display_name),
    avatar_url = COALESCE(v_clean_url, avatar_url),
    bio = COALESCE(v_clean_bio, bio),
    preferred_language = COALESCE(v_clean_lang, preferred_language),
    updated_at = now()
  WHERE id = v_user_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'profile_updated',
    p_user_id    := v_user_id,
    p_debate_id  := NULL,
    p_category   := NULL,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'changed_name', p_display_name IS NOT NULL,
      'changed_bio', p_bio IS NOT NULL,
      'changed_avatar', p_avatar_url IS NOT NULL,
      'changed_username', p_username IS NOT NULL,
      'changed_language', p_preferred_language IS NOT NULL
    )
  );

  RETURN json_build_object('success', true);
END;
$function$;


-- ============================================================
-- LAYER 4: READ PATH — JSON-returning RPCs (CREATE OR REPLACE)
-- ============================================================

-- check_queue_status: join arena_debates to get language when matched
CREATE OR REPLACE FUNCTION public.check_queue_status()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_entry record;
  v_opponent record;
  v_queue_count int;
  v_lang text;
BEGIN
  SELECT * INTO v_entry FROM debate_queue
    WHERE user_id = auth.uid() AND status IN ('waiting', 'matched')
    ORDER BY joined_at DESC LIMIT 1;

  IF v_entry IS NULL THEN
    RETURN json_build_object('status', 'none');
  END IF;

  IF v_entry.status = 'matched' AND v_entry.matched_with IS NOT NULL THEN
    SELECT display_name, username, elo_rating INTO v_opponent
      FROM profiles WHERE id = v_entry.matched_with;
  END IF;

  -- Fetch debate language when matched
  IF v_entry.status = 'matched' AND v_entry.debate_id IS NOT NULL THEN
    SELECT ad.language INTO v_lang FROM arena_debates ad WHERE ad.id = v_entry.debate_id;
  END IF;

  -- Count others in queue with same mode/ruleset/ranked
  SELECT count(*) INTO v_queue_count FROM debate_queue
    WHERE status = 'waiting'
      AND mode = v_entry.mode
      AND COALESCE(ruleset, 'amplified') = COALESCE(v_entry.ruleset, 'amplified')
      AND COALESCE(ranked, false) = COALESCE(v_entry.ranked, false)
      AND user_id != auth.uid();

  RETURN json_build_object(
    'status', v_entry.status,
    'queue_id', v_entry.id,
    'mode', v_entry.mode,
    'debate_id', v_entry.debate_id,
    'matched_with', v_entry.matched_with,
    'opponent_name', v_opponent.display_name,
    'opponent_username', v_opponent.username,
    'opponent_elo', v_opponent.elo_rating,
    'role', 'a',
    'ruleset', COALESCE(v_entry.ruleset, 'amplified'),
    'queue_count', v_queue_count,
    'total_rounds', COALESCE(v_entry.total_rounds, 4),
    'language', COALESCE(v_lang, 'en')
  );
END;
$function$;


-- join_debate_queue overload 1 (4 params)
CREATE OR REPLACE FUNCTION public.join_debate_queue(p_mode text, p_category text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_ranked boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_uid        uuid := auth.uid();
  v_elo        int;
  v_queue_id   uuid;
  v_match      record;
  v_debate_id  uuid;
  v_topic      text;
  v_elo_range  int  := CASE WHEN p_ranked THEN 300 ELSE 400 END;
  v_lang       text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT elo_rating INTO v_elo FROM profiles WHERE id = v_uid;

  -- Clear any stale waiting entries for this user
  DELETE FROM debate_queue WHERE user_id = v_uid AND status = 'waiting';

  -- Phase 1: strict match — same mode, same category (if specified), within elo range
  IF p_category IS NOT NULL THEN
    SELECT * INTO v_match FROM debate_queue
      WHERE status = 'waiting'
        AND mode = p_mode
        AND user_id != v_uid
        AND ABS(elo_rating - COALESCE(v_elo, 1200)) < v_elo_range
        AND (category = p_category OR category IS NULL)
      ORDER BY joined_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
  END IF;

  -- Phase 2: loose match — same mode, any category
  IF v_match IS NULL THEN
    SELECT * INTO v_match FROM debate_queue
      WHERE status = 'waiting'
        AND mode = p_mode
        AND user_id != v_uid
        AND ABS(elo_rating - COALESCE(v_elo, 1200)) < v_elo_range
      ORDER BY joined_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
  END IF;

  IF v_match IS NOT NULL THEN
    v_topic := COALESCE(p_topic, v_match.topic, 'Open Debate');

    INSERT INTO arena_debates (debater_a, debater_b, mode, category, topic, status, total_rounds, ranked)
    VALUES (
      v_match.user_id,
      v_uid,
      p_mode,
      COALESCE(p_category, v_match.category),
      v_topic,
      'pending',
      3,
      p_ranked
    )
    RETURNING id INTO v_debate_id;

    -- Read back the language stamped by trigger
    SELECT ad.language INTO v_lang FROM arena_debates ad WHERE ad.id = v_debate_id;

    UPDATE debate_queue
      SET status = 'matched', matched_with = v_uid, debate_id = v_debate_id
      WHERE id = v_match.id;

    INSERT INTO debate_queue (user_id, mode, category, topic, elo_rating, status, matched_with, debate_id, ranked)
    VALUES (v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200), 'matched', v_match.user_id, v_debate_id, p_ranked)
    RETURNING id INTO v_queue_id;

    PERFORM log_event(
      p_event_type := 'queue_matched',
      p_user_id    := v_uid,
      p_debate_id  := v_debate_id,
      p_category   := COALESCE(p_category, v_match.category),
      p_side       := 'b',
      p_metadata   := jsonb_build_object('mode', p_mode, 'ranked', p_ranked)
    );

    RETURN json_build_object(
      'status',      'matched',
      'queue_id',    v_queue_id,
      'debate_id',   v_debate_id,
      'opponent_id', v_match.user_id,
      'topic',       v_topic,
      'role',        'b',
      'language',    COALESCE(v_lang, 'en')
    );

  ELSE
    INSERT INTO debate_queue (user_id, mode, category, topic, elo_rating, status, ranked)
    VALUES (v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200), 'waiting', p_ranked)
    RETURNING id INTO v_queue_id;

    PERFORM log_event(
      p_event_type := 'queue_joined',
      p_user_id    := v_uid,
      p_debate_id  := NULL,
      p_category   := p_category,
      p_side       := NULL,
      p_metadata   := jsonb_build_object('mode', p_mode, 'ranked', p_ranked)
    );

    RETURN json_build_object(
      'status',   'waiting',
      'queue_id', v_queue_id
    );
  END IF;
END;
$function$;


-- join_debate_queue overload 2 (5 params)
CREATE OR REPLACE FUNCTION public.join_debate_queue(p_mode text, p_category text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_ruleset text DEFAULT 'amplified'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_uid       uuid := auth.uid();
  v_elo       int;
  v_queue_id  uuid;
  v_match     record;
  v_debate_id uuid;
  v_topic     text;
  v_ruleset   text;
  v_lang      text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_ruleset := CASE WHEN p_ruleset IN ('amplified', 'unplugged') THEN p_ruleset ELSE 'amplified' END;

  SELECT elo_rating INTO v_elo FROM profiles WHERE id = v_uid;

  DELETE FROM debate_queue WHERE user_id = v_uid AND status = 'waiting';

  SELECT * INTO v_match FROM debate_queue
    WHERE status = 'waiting'
      AND mode = p_mode
      AND user_id != v_uid
      AND ABS(elo_rating - COALESCE(v_elo, 1200)) < 400
      AND COALESCE(ruleset, 'amplified') = v_ruleset
      AND COALESCE(ranked, false) = COALESCE(p_ranked, false)
    ORDER BY joined_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

  IF v_match IS NOT NULL THEN
    v_topic := COALESCE(p_topic, v_match.topic, 'Open Debate');

    INSERT INTO arena_debates (
      debater_a, debater_b, mode, category, topic,
      status, total_rounds, ranked, ruleset
    )
    VALUES (
      v_match.user_id, v_uid, p_mode,
      COALESCE(p_category, v_match.category),
      v_topic, 'pending', 3,
      COALESCE(p_ranked, false), v_ruleset
    )
    RETURNING id INTO v_debate_id;

    -- Read back the language stamped by trigger
    SELECT ad.language INTO v_lang FROM arena_debates ad WHERE ad.id = v_debate_id;

    UPDATE debate_queue
      SET status = 'matched', matched_with = v_uid, debate_id = v_debate_id
      WHERE id = v_match.id;

    INSERT INTO debate_queue (
      user_id, mode, category, topic, elo_rating,
      status, matched_with, debate_id, ranked, ruleset
    )
    VALUES (
      v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200),
      'matched', v_match.user_id, v_debate_id,
      COALESCE(p_ranked, false), v_ruleset
    )
    RETURNING id INTO v_queue_id;

    PERFORM log_event(
      'queue_matched',
      v_uid,
      v_debate_id,
      COALESCE(p_category, v_match.category),
      NULL,
      jsonb_build_object(
        'mode', p_mode,
        'wait_seconds', EXTRACT(EPOCH FROM (now() - v_match.joined_at))::int,
        'elo_gap', ABS(COALESCE(v_elo, 1200) - v_match.elo_rating),
        'ruleset', v_ruleset,
        'ranked', COALESCE(p_ranked, false)
      )
    );

    RETURN json_build_object(
      'status', 'matched',
      'queue_id', v_queue_id,
      'debate_id', v_debate_id,
      'opponent_id', v_match.user_id,
      'topic', v_topic,
      'role', 'b',
      'ruleset', v_ruleset,
      'language', COALESCE(v_lang, 'en')
    );
  ELSE
    INSERT INTO debate_queue (
      user_id, mode, category, topic, elo_rating,
      ranked, ruleset
    )
    VALUES (
      v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200),
      COALESCE(p_ranked, false), v_ruleset
    )
    RETURNING id INTO v_queue_id;

    PERFORM log_event(
      'queue_joined',
      v_uid,
      NULL,
      p_category,
      NULL,
      jsonb_build_object(
        'mode', p_mode,
        'category', p_category,
        'ruleset', v_ruleset,
        'ranked', COALESCE(p_ranked, false)
      )
    );

    RETURN json_build_object('status', 'waiting', 'queue_id', v_queue_id);
  END IF;
END;
$function$;


-- join_debate_queue overload 3 (6 params)
CREATE OR REPLACE FUNCTION public.join_debate_queue(p_mode text, p_category text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_ranked boolean DEFAULT false, p_ruleset text DEFAULT 'amplified'::text, p_total_rounds integer DEFAULT 4)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_uid       uuid := auth.uid();
  v_elo       int;
  v_queue_id  uuid;
  v_match     record;
  v_debate_id uuid;
  v_topic     text;
  v_ruleset   text;
  v_total_rounds int;
  v_lang      text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_ruleset := CASE WHEN p_ruleset IN ('amplified', 'unplugged') THEN p_ruleset ELSE 'amplified' END;
  v_total_rounds := CASE WHEN p_total_rounds IN (4, 6, 8, 10) THEN p_total_rounds ELSE 4 END;

  SELECT elo_rating INTO v_elo FROM profiles WHERE id = v_uid;

  DELETE FROM debate_queue WHERE user_id = v_uid AND status = 'waiting';

  SELECT * INTO v_match FROM debate_queue
    WHERE status = 'waiting'
      AND mode = p_mode
      AND user_id != v_uid
      AND ABS(elo_rating - COALESCE(v_elo, 1200)) < 400
      AND COALESCE(ruleset, 'amplified') = v_ruleset
      AND COALESCE(ranked, false) = COALESCE(p_ranked, false)
    ORDER BY joined_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

  IF v_match IS NOT NULL THEN
    v_topic := COALESCE(p_topic, v_match.topic, 'Open Debate');

    INSERT INTO arena_debates (
      debater_a, debater_b, mode, category, topic,
      status, total_rounds, ranked, ruleset
    )
    VALUES (
      v_match.user_id, v_uid, p_mode,
      COALESCE(p_category, v_match.category),
      v_topic, 'pending',
      COALESCE(v_match.total_rounds, v_total_rounds),
      COALESCE(p_ranked, false), v_ruleset
    )
    RETURNING id INTO v_debate_id;

    -- Read back the language stamped by trigger
    SELECT ad.language INTO v_lang FROM arena_debates ad WHERE ad.id = v_debate_id;

    UPDATE debate_queue
      SET status = 'matched', matched_with = v_uid, debate_id = v_debate_id
      WHERE id = v_match.id;

    INSERT INTO debate_queue (
      user_id, mode, category, topic, elo_rating,
      status, matched_with, debate_id, ranked, ruleset, total_rounds
    )
    VALUES (
      v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200),
      'matched', v_match.user_id, v_debate_id,
      COALESCE(p_ranked, false), v_ruleset, v_total_rounds
    )
    RETURNING id INTO v_queue_id;

    PERFORM log_event(
      'queue_matched',
      v_uid,
      v_debate_id,
      COALESCE(p_category, v_match.category),
      NULL,
      jsonb_build_object(
        'mode', p_mode,
        'wait_seconds', EXTRACT(EPOCH FROM (now() - v_match.joined_at))::int,
        'elo_gap', ABS(COALESCE(v_elo, 1200) - v_match.elo_rating),
        'ruleset', v_ruleset,
        'ranked', COALESCE(p_ranked, false),
        'total_rounds', COALESCE(v_match.total_rounds, v_total_rounds)
      )
    );

    RETURN json_build_object(
      'status', 'matched',
      'queue_id', v_queue_id,
      'debate_id', v_debate_id,
      'opponent_id', v_match.user_id,
      'topic', v_topic,
      'role', 'b',
      'ruleset', v_ruleset,
      'total_rounds', COALESCE(v_match.total_rounds, v_total_rounds),
      'language', COALESCE(v_lang, 'en')
    );
  ELSE
    INSERT INTO debate_queue (
      user_id, mode, category, topic, elo_rating,
      ranked, ruleset, total_rounds
    )
    VALUES (
      v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200),
      COALESCE(p_ranked, false), v_ruleset, v_total_rounds
    )
    RETURNING id INTO v_queue_id;

    PERFORM log_event(
      'queue_joined',
      v_uid,
      NULL,
      p_category,
      NULL,
      jsonb_build_object(
        'mode', p_mode,
        'category', p_category,
        'ruleset', v_ruleset,
        'ranked', COALESCE(p_ranked, false),
        'total_rounds', v_total_rounds
      )
    );

    RETURN json_build_object(
      'status', 'waiting',
      'queue_id', v_queue_id,
      'mode', p_mode,
      'queue_count', (
        SELECT count(*) FROM debate_queue
        WHERE status = 'waiting'
          AND mode = p_mode
          AND COALESCE(ruleset, 'amplified') = v_ruleset
          AND COALESCE(ranked, false) = COALESCE(p_ranked, false)
          AND user_id != v_uid
      )
    );
  END IF;
END;
$function$;


-- ============================================================
-- LAYER 5: READ PATH — RETURNS TABLE RPCs (must DROP + CREATE)
-- Adding 'language' column to return signature
-- ============================================================

-- 5A: check_mod_debate
DROP FUNCTION IF EXISTS public.check_mod_debate(uuid);

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


-- 5B: check_private_lobby
DROP FUNCTION IF EXISTS public.check_private_lobby(uuid);

CREATE OR REPLACE FUNCTION public.check_private_lobby(p_debate_id uuid)
 RETURNS TABLE(status text, opponent_id uuid, opponent_name text, opponent_elo integer, player_b_ready boolean, total_rounds integer, language text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_debate  arena_debates%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_debate FROM arena_debates
  WHERE id = p_debate_id AND debater_a = v_user_id;

  IF v_debate.id IS NULL THEN
    RAISE EXCEPTION 'Lobby not found';
  END IF;

  IF v_debate.debater_b IS NULL THEN
    RETURN QUERY SELECT
      v_debate.status,
      NULL::uuid,
      NULL::text,
      NULL::int,
      v_debate.player_b_ready,
      COALESCE(v_debate.total_rounds, 4),
      COALESCE(v_debate.language, 'en');
  ELSE
    RETURN QUERY
    SELECT
      v_debate.status,
      v_debate.debater_b,
      COALESCE(p.display_name, p.username, 'Opponent')::text,
      COALESCE(p.elo_rating, 1200)::int,
      v_debate.player_b_ready,
      COALESCE(v_debate.total_rounds, 4),
      COALESCE(v_debate.language, 'en')
    FROM profiles p WHERE p.id = v_debate.debater_b;
  END IF;
END;
$function$;


-- 5C: join_mod_debate
DROP FUNCTION IF EXISTS public.join_mod_debate(text);

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


-- 5D: join_private_lobby
DROP FUNCTION IF EXISTS public.join_private_lobby(uuid, text);

CREATE OR REPLACE FUNCTION public.join_private_lobby(p_debate_id uuid DEFAULT NULL::uuid, p_join_code text DEFAULT NULL::text)
 RETURNS TABLE(debate_id uuid, status text, topic text, mode text, opponent_name text, opponent_id uuid, opponent_elo integer, ruleset text, total_rounds integer, language text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id      uuid := auth.uid();
  v_debate       arena_debates%ROWTYPE;
  v_rows_updated int;
  v_opponent_name text;
  v_opponent_elo  int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_debate_id IS NOT NULL THEN
    SELECT * INTO v_debate FROM arena_debates
    WHERE id = p_debate_id AND status = 'pending' AND debater_b IS NULL;
  ELSIF p_join_code IS NOT NULL THEN
    SELECT * INTO v_debate FROM arena_debates
    WHERE join_code = upper(trim(p_join_code)) AND status = 'pending' AND debater_b IS NULL;
  ELSE
    RAISE EXCEPTION 'Must provide debate_id or join_code';
  END IF;

  IF v_debate.id IS NULL THEN
    RAISE EXCEPTION 'Lobby not found or already taken';
  END IF;

  IF v_debate.debater_a = v_user_id THEN
    RAISE EXCEPTION 'Cannot join your own lobby';
  END IF;

  IF v_debate.visibility = 'private' AND v_debate.invited_user_id != v_user_id THEN
    RAISE EXCEPTION 'This challenge is not for you';
  END IF;

  IF v_debate.visibility = 'group' AND v_debate.lobby_group_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = v_debate.lobby_group_id AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not a member of this group';
    END IF;
  END IF;

  UPDATE arena_debates
  SET debater_b     = v_user_id,
      player_b_ready = true,
      status        = 'matched'
  WHERE id          = v_debate.id
    AND debater_b   IS NULL
    AND status      = 'pending';

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'Lobby already taken';
  END IF;

  SELECT COALESCE(p.display_name, p.username, 'Opponent'),
         COALESCE(p.elo_rating, 1200)::int
  INTO v_opponent_name, v_opponent_elo
  FROM profiles p WHERE p.id = v_debate.debater_a;

  PERFORM log_event(
    p_event_type := 'private_lobby_joined',
    p_user_id    := v_user_id,
    p_debate_id  := v_debate.id,
    p_metadata   := jsonb_build_object('visibility', v_debate.visibility)
  );

  RETURN QUERY SELECT
    v_debate.id,
    'matched'::text,
    v_debate.topic,
    v_debate.mode,
    v_opponent_name,
    v_debate.debater_a,
    v_opponent_elo,
    COALESCE(v_debate.ruleset, 'amplified')::text,
    COALESCE(v_debate.total_rounds, 4),
    COALESCE(v_debate.language, 'en');
END;
$function$;
