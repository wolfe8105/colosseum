-- ============================================================
-- F-48: MOD-INITIATED DEBATE
-- Session 210 — March 31, 2026
--
-- Prerequisite: arena_debates must already have these columns
-- (from prior sessions):
--   ranked BOOLEAN DEFAULT false
--   ruleset TEXT DEFAULT 'amplified' CHECK (ruleset IN ('amplified','unplugged'))
--   visibility TEXT
--   join_code TEXT
--   moderator_id UUID REFERENCES profiles(id)
--   mod_status TEXT DEFAULT 'none'
--   mod_requested_by UUID
--
-- This migration:
--   1. ALTER debater_a to allow NULL (mod creates before debaters join)
--   2. create_mod_debate — mod creates debate, gets join code
--   3. join_mod_debate — debater joins via code, fills first empty slot
--   4. check_mod_debate — poll for slot status
--   5. cancel_mod_debate — mod cancels before match
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ALLOW NULL debater_a
-- Currently NOT NULL. F-48 inserts with both debaters NULL.
-- ────────────────────────────────────────────────────────────

ALTER TABLE arena_debates ALTER COLUMN debater_a DROP NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 2. create_mod_debate
--
-- Caller must be is_moderator = true.
-- Inserts arena_debates row with debater_a = NULL, debater_b = NULL,
-- moderator_id = caller, mod_status = 'claimed', visibility = 'code'.
-- Generates 6-char uppercase join code.
-- Returns debate_id + join_code.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_mod_debate(
  p_mode      TEXT DEFAULT 'text',
  p_topic     TEXT DEFAULT NULL,
  p_category  TEXT DEFAULT NULL,
  p_ranked    BOOLEAN DEFAULT false,
  p_ruleset   TEXT DEFAULT 'amplified'
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
    NULL,           -- no debater_a yet
    NULL,           -- no debater_b yet
    v_uid,          -- moderator is the creator
    p_mode,
    p_topic,
    p_category,
    p_ranked,
    p_ruleset,
    'lobby',
    'claimed',      -- mod is already attached
    'code',
    v_join_code,
    3
  )
  RETURNING id INTO v_debate_id;

  -- Return
  debate_id := v_debate_id;
  join_code := v_join_code;
  RETURN NEXT;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 3. join_mod_debate
--
-- Debater enters a join code. Fills first empty slot (debater_a
-- if NULL, else debater_b). When debater_b is filled, status
-- becomes 'matched'.
--
-- Returns role, status, topic, mode, ranked, ruleset,
-- moderator_name, opponent info (if matched).
--
-- Guards:
--   - Code must exist and debate must be in 'lobby' status
--   - Caller cannot be the moderator (they observe, not debate)
--   - Caller cannot already be in a slot
--   - Both slots cannot already be filled
-- ────────────────────────────────────────────────────────────

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
  ruleset        TEXT
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
    -- First joiner → debater_a
    UPDATE arena_debates
    SET debater_a = v_uid
    WHERE id = v_debate.id;

    v_role := 'a';

  ELSIF v_debate.debater_b IS NULL THEN
    -- Second joiner → debater_b, status → matched
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

  -- If this was the second joiner, return opponent info
  IF v_role = 'b' THEN
    status := 'matched';
    -- Opponent is debater_a
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

-- ────────────────────────────────────────────────────────────
-- 4. check_mod_debate
--
-- Polled by mod and first-join debater to see slot status.
-- Returns status + debater names.
-- Caller must be moderator_id or one of the debaters.
-- ────────────────────────────────────────────────────────────

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
  ruleset        TEXT
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

  RETURN NEXT;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 5. cancel_mod_debate
--
-- Moderator cancels their created debate.
-- Only works if status = 'lobby' (not yet matched).
-- Sets status = 'cancelled'.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cancel_mod_debate(
  p_debate_id UUID
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
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

  -- Guard: only the moderator who created it
  IF v_uid != v_debate.moderator_id THEN
    RAISE EXCEPTION 'Not the debate moderator';
  END IF;

  -- Guard: can only cancel while in lobby
  IF v_debate.status != 'lobby' THEN
    RAISE EXCEPTION 'Cannot cancel — debate already started';
  END IF;

  UPDATE arena_debates
  SET status = 'cancelled'
  WHERE id = p_debate_id;

  RETURN json_build_object('success', true);
END;
$$;
