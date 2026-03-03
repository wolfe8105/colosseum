-- ============================================================
-- COLOSSEUM ARENA SCHEMA — Session 24
-- Matchmaking queue, text/voice debate messages, lobby feed
-- Paste order: 11th (after colosseum-fix-auto-debate-rls.sql)
-- ============================================================

-- ========== TABLES ==========

-- Matchmaking queue
CREATE TABLE IF NOT EXISTS debate_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  mode text NOT NULL CHECK (mode IN ('live', 'voicememo', 'text', 'ai')),
  category text,
  topic text,
  elo_rating int DEFAULT 1200,
  joined_at timestamptz DEFAULT now(),
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'expired')),
  matched_with uuid REFERENCES profiles(id),
  debate_id uuid
);

-- Prevent duplicate waiting entries per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_queue_one_waiting
  ON debate_queue (user_id) WHERE status = 'waiting';

-- Fast match lookups
CREATE INDEX IF NOT EXISTS idx_queue_waiting_mode
  ON debate_queue (mode, elo_rating) WHERE status = 'waiting';

-- Text / voice-memo debate rounds (stored arguments)
CREATE TABLE IF NOT EXISTS debate_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL,
  user_id uuid REFERENCES profiles(id),
  round int NOT NULL CHECK (round BETWEEN 1 AND 10),
  side text NOT NULL CHECK (side IN ('a', 'b')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  is_ai boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_debate
  ON debate_messages (debate_id, round, side);

-- Live / text / voice user-vs-user debates
CREATE TABLE IF NOT EXISTS arena_debates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debater_a uuid REFERENCES profiles(id) NOT NULL,
  debater_b uuid REFERENCES profiles(id),
  mode text NOT NULL CHECK (mode IN ('live', 'voicememo', 'text', 'ai')),
  category text,
  topic text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'round_break', 'voting', 'complete', 'cancelled')),
  current_round int DEFAULT 0,
  total_rounds int DEFAULT 3,
  winner text CHECK (winner IN ('a', 'b', 'draw', NULL)),
  score_a int DEFAULT 0,
  score_b int DEFAULT 0,
  spectator_count int DEFAULT 0,
  vote_count_a int DEFAULT 0,
  vote_count_b int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_arena_debates_status
  ON arena_debates (status, created_at DESC) WHERE status IN ('live', 'voting', 'pending');

-- Spectator votes on arena debates
CREATE TABLE IF NOT EXISTS arena_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid REFERENCES arena_debates(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vote text NOT NULL CHECK (vote IN ('a', 'b')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(debate_id, user_id)
);

-- ========== RLS ==========

ALTER TABLE debate_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_votes ENABLE ROW LEVEL SECURITY;

-- Queue: users manage own entries only
CREATE POLICY queue_select ON debate_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY queue_insert ON debate_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY queue_delete ON debate_queue FOR DELETE USING (auth.uid() = user_id);

-- Messages: public read (debates are spectatable), own-user insert via RPC
CREATE POLICY messages_select ON debate_messages FOR SELECT USING (true);

-- Arena debates: public read, insert/update via RPC only
CREATE POLICY arena_debates_select ON arena_debates FOR SELECT USING (true);

-- Votes: public read, own-user insert
CREATE POLICY arena_votes_select ON arena_votes FOR SELECT USING (true);
CREATE POLICY arena_votes_insert ON arena_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========== SECURITY DEFINER FUNCTIONS ==========

-- Join the matchmaking queue. Returns match immediately if opponent waiting.
CREATE OR REPLACE FUNCTION join_debate_queue(
  p_mode text,
  p_category text DEFAULT NULL,
  p_topic text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_elo int;
  v_queue_id uuid;
  v_match record;
  v_debate_id uuid;
  v_topic text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT elo_rating INTO v_elo FROM profiles WHERE id = v_uid;

  -- Clear any stale waiting entries
  DELETE FROM debate_queue WHERE user_id = v_uid AND status = 'waiting';

  -- Look for a compatible opponent (FIFO, within 400 Elo)
  SELECT * INTO v_match FROM debate_queue
    WHERE status = 'waiting'
      AND mode = p_mode
      AND user_id != v_uid
      AND ABS(elo_rating - COALESCE(v_elo, 1200)) < 400
    ORDER BY joined_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

  IF v_match IS NOT NULL THEN
    -- Pick a topic (use provided or opponent's or generate placeholder)
    v_topic := COALESCE(p_topic, v_match.topic, 'Open Debate');

    -- Create the arena debate
    INSERT INTO arena_debates (debater_a, debater_b, mode, category, topic, status, total_rounds)
    VALUES (v_match.user_id, v_uid, p_mode,
            COALESCE(p_category, v_match.category),
            v_topic, 'pending', 3)
    RETURNING id INTO v_debate_id;

    -- Update opponent's queue entry
    UPDATE debate_queue
      SET status = 'matched', matched_with = v_uid, debate_id = v_debate_id
      WHERE id = v_match.id;

    -- Insert our entry as matched
    INSERT INTO debate_queue (user_id, mode, category, topic, elo_rating, status, matched_with, debate_id)
    VALUES (v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200), 'matched', v_match.user_id, v_debate_id)
    RETURNING id INTO v_queue_id;

    RETURN json_build_object(
      'status', 'matched',
      'queue_id', v_queue_id,
      'debate_id', v_debate_id,
      'opponent_id', v_match.user_id,
      'topic', v_topic,
      'role', 'b'
    );
  ELSE
    -- No match — join queue
    INSERT INTO debate_queue (user_id, mode, category, topic, elo_rating)
    VALUES (v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200))
    RETURNING id INTO v_queue_id;

    RETURN json_build_object('status', 'waiting', 'queue_id', v_queue_id);
  END IF;
END;
$$;

-- Leave the queue
CREATE OR REPLACE FUNCTION leave_debate_queue()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM debate_queue WHERE user_id = auth.uid() AND status = 'waiting';
END;
$$;

-- Poll queue status (check if matched)
CREATE OR REPLACE FUNCTION check_queue_status()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_entry record;
  v_opponent record;
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

  RETURN json_build_object(
    'status', v_entry.status,
    'queue_id', v_entry.id,
    'mode', v_entry.mode,
    'debate_id', v_entry.debate_id,
    'matched_with', v_entry.matched_with,
    'opponent_name', v_opponent.display_name,
    'opponent_username', v_opponent.username,
    'opponent_elo', v_opponent.elo_rating,
    'role', 'a'
  );
END;
$$;

-- Create an AI sparring debate (instant, no queue)
CREATE OR REPLACE FUNCTION create_ai_debate(p_category text DEFAULT NULL, p_topic text DEFAULT 'Open Debate')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_debate_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO arena_debates (debater_a, debater_b, mode, category, topic, status, total_rounds)
  VALUES (v_uid, NULL, 'ai', p_category, sanitize_text(p_topic), 'live', 3)
  RETURNING id INTO v_debate_id;

  RETURN json_build_object('debate_id', v_debate_id, 'topic', p_topic, 'role', 'a');
END;
$$;

-- Submit a debate message (text round or voice-memo transcript)
CREATE OR REPLACE FUNCTION submit_debate_message(
  p_debate_id uuid,
  p_round int,
  p_side text,
  p_content text,
  p_is_ai boolean DEFAULT false
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_debate record;
BEGIN
  IF v_uid IS NULL AND p_is_ai = false THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Verify debate exists and user is a participant
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN RAISE EXCEPTION 'Debate not found'; END IF;
  IF p_is_ai = false AND v_uid != v_debate.debater_a AND v_uid != v_debate.debater_b THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  INSERT INTO debate_messages (debate_id, user_id, round, side, content, is_ai)
  VALUES (p_debate_id, v_uid, p_round, p_side, sanitize_text(p_content), p_is_ai)
  RETURNING id INTO v_id;

  RETURN json_build_object('id', v_id, 'success', true);
END;
$$;

-- Get messages for a debate
CREATE OR REPLACE FUNCTION get_debate_messages(p_debate_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_to_json(m) ORDER BY m.round, m.created_at)
    FROM debate_messages m WHERE m.debate_id = p_debate_id
  ), '[]'::json);
END;
$$;

-- Update arena debate status
CREATE OR REPLACE FUNCTION update_arena_debate(
  p_debate_id uuid,
  p_status text DEFAULT NULL,
  p_current_round int DEFAULT NULL,
  p_winner text DEFAULT NULL,
  p_score_a int DEFAULT NULL,
  p_score_b int DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_debate record;
BEGIN
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN RAISE EXCEPTION 'Debate not found'; END IF;
  IF v_uid != v_debate.debater_a AND v_uid != v_debate.debater_b THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  UPDATE arena_debates SET
    status = COALESCE(p_status, status),
    current_round = COALESCE(p_current_round, current_round),
    winner = COALESCE(p_winner, winner),
    score_a = COALESCE(p_score_a, score_a),
    score_b = COALESCE(p_score_b, score_b),
    started_at = CASE WHEN p_status = 'live' AND started_at IS NULL THEN now() ELSE started_at END,
    ended_at = CASE WHEN p_status = 'complete' THEN now() ELSE ended_at END
  WHERE id = p_debate_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Cast a spectator vote on an arena debate
CREATE OR REPLACE FUNCTION vote_arena_debate(p_debate_id uuid, p_vote text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_vote NOT IN ('a', 'b') THEN RAISE EXCEPTION 'Invalid vote'; END IF;

  INSERT INTO arena_votes (debate_id, user_id, vote) VALUES (p_debate_id, v_uid, p_vote)
  ON CONFLICT (debate_id, user_id) DO UPDATE SET vote = p_vote;

  -- Update cached counts
  UPDATE arena_debates SET
    vote_count_a = (SELECT count(*) FROM arena_votes WHERE debate_id = p_debate_id AND vote = 'a'),
    vote_count_b = (SELECT count(*) FROM arena_votes WHERE debate_id = p_debate_id AND vote = 'b')
  WHERE id = p_debate_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Arena lobby feed: auto-debates + live arena debates
CREATE OR REPLACE FUNCTION get_arena_feed(p_limit int DEFAULT 20)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_to_json(d) ORDER BY d.created_at DESC)
    FROM (
      (
        -- Live / recent arena debates
        SELECT ad.id, ad.topic, 'arena'::text as source, ad.mode, ad.status,
               ad.current_round, ad.total_rounds,
               ad.score_a, ad.score_b,
               ad.vote_count_a, ad.vote_count_b,
               pa.display_name as debater_a_name, pa.elo_rating as elo_a,
               pb.display_name as debater_b_name, pb.elo_rating as elo_b,
               ad.created_at
        FROM arena_debates ad
          LEFT JOIN profiles pa ON pa.id = ad.debater_a
          LEFT JOIN profiles pb ON pb.id = ad.debater_b
        WHERE ad.status IN ('live', 'voting', 'complete')
        ORDER BY ad.created_at DESC
        LIMIT p_limit / 2
      )

      UNION ALL

      (
        -- Auto-debates (Leg 3 content)
        SELECT aud.id, aud.topic, 'auto_debate'::text as source, 'ai'::text as mode, aud.status,
               3 as current_round, 3 as total_rounds,
               aud.score_a, aud.score_b,
               (SELECT count(*)::int FROM auto_debate_votes WHERE auto_debate_id = aud.id AND voted_for = 'a') as vote_count_a,
               (SELECT count(*)::int FROM auto_debate_votes WHERE auto_debate_id = aud.id AND voted_for = 'b') as vote_count_b,
               aud.side_a_label as debater_a_name, 0 as elo_a,
               aud.side_b_label as debater_b_name, 0 as elo_b,
               aud.created_at
        FROM auto_debates aud
        WHERE aud.status = 'active'
        ORDER BY aud.created_at DESC
        LIMIT p_limit / 2
      )
    ) d
  ), '[]'::json);
END;
$$;

-- Expire stale queue entries (older than 5 minutes)
CREATE OR REPLACE FUNCTION expire_stale_queue()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE debate_queue SET status = 'expired'
    WHERE status = 'waiting' AND joined_at < now() - interval '5 minutes';
END;
$$;
