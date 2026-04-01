BEGIN;

-- ============================================================
-- ROUND COUNT PICKER MIGRATION
-- RTC-BUG-2: Wire total_rounds through all debate creation flows
-- Session 217
-- ============================================================
-- 
-- CHANGES:
--   1. arena_debates.total_rounds DEFAULT 3 → 4
--   2. debate_queue gets total_rounds column
--   3. join_debate_queue — add p_total_rounds, store on queue + debate rows
--   4. check_queue_status — return total_rounds in JSON
--   5. create_private_lobby — add p_total_rounds, pass to INSERT
--   6. check_private_lobby — return total_rounds
--   7. join_private_lobby — return total_rounds
--   8. create_mod_debate — add p_total_rounds, pass to INSERT
--   9. check_mod_debate — return total_rounds
--  10. join_mod_debate — return total_rounds
--
-- SAFE DEPLOY: All new params have DEFAULT 4. Old client calls
-- without p_total_rounds continue to work. Old overloads (without
-- p_ruleset) are NOT touched — they hit the column DEFAULT.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Change arena_debates default
-- ────────────────────────────────────────────────────────────
ALTER TABLE arena_debates ALTER COLUMN total_rounds SET DEFAULT 4;


-- ────────────────────────────────────────────────────────────
-- 2. Add total_rounds to debate_queue
-- ────────────────────────────────────────────────────────────
ALTER TABLE debate_queue ADD COLUMN IF NOT EXISTS total_rounds INT DEFAULT 4;


-- ────────────────────────────────────────────────────────────
-- 3. join_debate_queue (with-ruleset overload)
--
-- Base: UNPLUGGED-QUEUE-FIX.sql (deployed production version)
-- Change: add p_total_rounds, store in queue row, use
--         first-in-queue player's total_rounds for debate row
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION join_debate_queue(
  p_mode          text,
  p_category      text    DEFAULT NULL,
  p_topic         text    DEFAULT NULL,
  p_ranked        boolean DEFAULT false,
  p_ruleset       text    DEFAULT 'amplified',
  p_total_rounds  int     DEFAULT 4
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_elo       int;
  v_queue_id  uuid;
  v_match     record;
  v_debate_id uuid;
  v_topic     text;
  v_ruleset   text;
  v_total_rounds int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Sanitize ruleset
  v_ruleset := CASE WHEN p_ruleset IN ('amplified', 'unplugged') THEN p_ruleset ELSE 'amplified' END;

  -- Sanitize total_rounds (must be one of the allowed values)
  v_total_rounds := CASE WHEN p_total_rounds IN (4, 6, 8, 10) THEN p_total_rounds ELSE 4 END;

  SELECT elo_rating INTO v_elo FROM profiles WHERE id = v_uid;

  -- Clear any stale waiting entries
  DELETE FROM debate_queue WHERE user_id = v_uid AND status = 'waiting';

  -- Look for a compatible opponent
  -- FIFO, within 400 Elo, same mode, same ruleset, same ranked
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
    -- Pick a topic
    v_topic := COALESCE(p_topic, v_match.topic, 'Open Debate');

    -- Create the arena debate — first-in-queue player's total_rounds wins
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

    -- Update opponent's queue entry
    UPDATE debate_queue
      SET status = 'matched', matched_with = v_uid, debate_id = v_debate_id
      WHERE id = v_match.id;

    -- Insert our entry as matched
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

    -- Analytics: matched
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
      'total_rounds', COALESCE(v_match.total_rounds, v_total_rounds)
    );
  ELSE
    -- No match — join queue
    INSERT INTO debate_queue (
      user_id, mode, category, topic, elo_rating,
      ranked, ruleset, total_rounds
    )
    VALUES (
      v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200),
      COALESCE(p_ranked, false), v_ruleset, v_total_rounds
    )
    RETURNING id INTO v_queue_id;

    -- Analytics: waiting
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
$$;


-- ────────────────────────────────────────────────────────────
-- 4. check_queue_status — add total_rounds to return JSON
--
-- Base: UNPLUGGED-QUEUE-FIX.sql line 176
-- Change: add 'total_rounds' to json_build_object
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_queue_status()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_entry record;
  v_opponent record;
  v_queue_count int;
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
    'total_rounds', COALESCE(v_entry.total_rounds, 4)
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. create_private_lobby (with-ruleset overload)
--
-- Base: supabase-deployed-functions-export.sql line 1634
-- Change: add p_total_rounds, pass to INSERT
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_private_lobby(
  p_mode            text,
  p_topic           text    DEFAULT NULL::text,
  p_category        text    DEFAULT NULL::text,
  p_ranked          boolean DEFAULT false,
  p_visibility      text    DEFAULT 'private'::text,
  p_invited_user_id uuid    DEFAULT NULL::uuid,
  p_group_id        uuid    DEFAULT NULL::uuid,
  p_ruleset         text    DEFAULT 'amplified'::text,
  p_total_rounds    int     DEFAULT 4
)
RETURNS TABLE(debate_id uuid, join_code text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id   uuid := auth.uid();
  v_debate_id uuid;
  v_code      text := NULL;
  v_attempts  int  := 0;
  v_candidate text;
  v_total_rounds int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_visibility NOT IN ('private', 'group', 'code') THEN
    RAISE EXCEPTION 'Invalid visibility value';
  END IF;
  IF p_visibility = 'private' AND p_invited_user_id IS NULL THEN
    RAISE EXCEPTION 'invited_user_id required for private lobbies';
  END IF;
  IF p_visibility = 'group' THEN
    IF p_group_id IS NULL THEN
      RAISE EXCEPTION 'group_id required for group lobbies';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = p_group_id AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not a member of this group';
    END IF;
  END IF;

  -- Sanitize total_rounds
  v_total_rounds := CASE WHEN p_total_rounds IN (4, 6, 8, 10) THEN p_total_rounds ELSE 4 END;

  IF p_visibility = 'code' THEN
    LOOP
      v_candidate := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 6));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM arena_debates ad WHERE ad.join_code = v_candidate
      );
      v_attempts := v_attempts + 1;
      IF v_attempts >= 5 THEN
        RAISE EXCEPTION 'Could not generate unique join code';
      END IF;
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


-- ────────────────────────────────────────────────────────────
-- 6. check_private_lobby — add total_rounds to return
--
-- Base: supabase-deployed-functions-export.sql line 690
-- Change: add total_rounds to RETURNS TABLE + RETURN QUERY
-- NOTE: DROP required — RETURNS TABLE shape changed (added total_rounds)
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.check_private_lobby(uuid);
CREATE OR REPLACE FUNCTION public.check_private_lobby(p_debate_id uuid)
RETURNS TABLE(status text, opponent_id uuid, opponent_name text, opponent_elo integer, player_b_ready boolean, total_rounds integer)
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
      COALESCE(v_debate.total_rounds, 4);
  ELSE
    RETURN QUERY
    SELECT
      v_debate.status,
      v_debate.debater_b,
      COALESCE(p.display_name, p.username, 'Opponent')::text,
      COALESCE(p.elo_rating, 1200)::int,
      v_debate.player_b_ready,
      COALESCE(v_debate.total_rounds, 4)
    FROM profiles p WHERE p.id = v_debate.debater_b;
  END IF;
END;
$function$;


-- ────────────────────────────────────────────────────────────
-- 7. join_private_lobby — add total_rounds to return
--
-- Base: supabase-deployed-functions-export.sql line 3554
-- Change: add ruleset + total_rounds to RETURNS TABLE + RETURN QUERY
-- NOTE: DROP required — RETURNS TABLE shape changed (added ruleset, total_rounds)
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.join_private_lobby(uuid, text);
CREATE OR REPLACE FUNCTION public.join_private_lobby(p_debate_id uuid DEFAULT NULL::uuid, p_join_code text DEFAULT NULL::text)
RETURNS TABLE(debate_id uuid, status text, topic text, mode text, opponent_name text, opponent_id uuid, opponent_elo integer, ruleset text, total_rounds integer)
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

  -- Atomic claim — second concurrent joiner gets zero rows and fails
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
    COALESCE(v_debate.total_rounds, 4);
END;
$function$;


-- ────────────────────────────────────────────────────────────
-- 8. create_mod_debate — add p_total_rounds
--
-- Base: F48-MOD-INITIATED-DEBATE.sql line 40
-- Change: add p_total_rounds param, pass to INSERT
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_mod_debate(
  p_mode          TEXT DEFAULT 'text',
  p_topic         TEXT DEFAULT NULL,
  p_category      TEXT DEFAULT NULL,
  p_ranked        BOOLEAN DEFAULT false,
  p_ruleset       TEXT DEFAULT 'amplified',
  p_total_rounds  INT DEFAULT 4
)
RETURNS TABLE(debate_id UUID, join_code TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
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
$$;


-- ────────────────────────────────────────────────────────────
-- 9. check_mod_debate — add total_rounds to return
--
-- Base: F48-MOD-INITIATED-DEBATE.sql line 267
-- Change: add total_rounds to RETURNS TABLE + return body
-- NOTE: DROP required — RETURNS TABLE shape changed (added total_rounds)
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS check_mod_debate(uuid);
CREATE OR REPLACE FUNCTION check_mod_debate(
  p_debate_id UUID
)
RETURNS TABLE(
  status         TEXT,
  debater_a_id   UUID,
  debater_a_name TEXT,
  debater_b_id   UUID,
  debater_b_name TEXT,
  topic          TEXT,
  ruleset        TEXT,
  total_rounds   INT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
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

  -- Guard: caller must be mod or debater
  IF v_uid != v_debate.moderator_id
     AND v_uid IS DISTINCT FROM v_debate.debater_a
     AND v_uid IS DISTINCT FROM v_debate.debater_b
  THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get names (may be NULL if slot empty)
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

  RETURN NEXT;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 10. join_mod_debate — add total_rounds to return
--
-- Base: F48-MOD-INITIATED-DEBATE.sql line 150
-- Change: add total_rounds to RETURNS TABLE + return body
-- NOTE: DROP required — RETURNS TABLE shape changed (added total_rounds)
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS join_mod_debate(text);
CREATE OR REPLACE FUNCTION join_mod_debate(
  p_join_code TEXT
)
RETURNS TABLE(
  debate_id      UUID,
  role           TEXT,
  status         TEXT,
  topic          TEXT,
  mode           TEXT,
  ranked         BOOLEAN,
  moderator_name TEXT,
  opponent_name  TEXT,
  opponent_id    UUID,
  opponent_elo   INT,
  ruleset        TEXT,
  total_rounds   INT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_debate  RECORD;
  v_role    TEXT;
  v_mod     RECORD;
  v_opp     RECORD;
BEGIN
  -- Guard: authenticated
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find debate by join code — lock row to prevent race
  SELECT ad.*
  INTO v_debate
  FROM arena_debates ad
  WHERE ad.join_code = upper(trim(p_join_code))
    AND ad.status = 'lobby'
  FOR NO KEY UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Code not found or debate already started';
  END IF;

  -- Guard: caller is not the moderator
  IF v_uid = v_debate.moderator_id THEN
    RAISE EXCEPTION 'Moderator cannot join as debater';
  END IF;

  -- Guard: caller not already in a slot
  IF v_uid = v_debate.debater_a OR v_uid = v_debate.debater_b THEN
    RAISE EXCEPTION 'Already joined this debate';
  END IF;

  -- Fill first empty slot
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

  -- Get moderator name
  SELECT p.display_name INTO v_mod
  FROM profiles p WHERE p.id = v_debate.moderator_id;

  -- Build return row
  debate_id      := v_debate.id;
  role           := v_role;
  topic          := v_debate.topic;
  mode           := v_debate.mode;
  ranked         := v_debate.ranked;
  ruleset        := v_debate.ruleset;
  moderator_name := v_mod.display_name;
  total_rounds   := COALESCE(v_debate.total_rounds, 4);

  -- If this was the second joiner, return opponent info
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
$$;

COMMIT;
