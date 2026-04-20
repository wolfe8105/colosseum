-- ============================================================
-- THE MODERATOR — Direct Messages Foundation
-- Session 281: Tables, RLS, RPCs for DM system
--
-- Depends on: dm_eligibility table (Session 266)
-- ============================================================

-- ── 1. dm_threads ──────────────────────────────────────────
-- One row per conversation between two users.
-- user_a < user_b (canonical ordering, matches dm_eligibility).

CREATE TABLE IF NOT EXISTS public.dm_threads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message  TEXT,
  last_at       TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_a, user_b),
  CHECK (user_a < user_b)
);

ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own threads"
  ON public.dm_threads FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- No direct INSERT/UPDATE/DELETE — all writes go through RPCs.
CREATE POLICY "No direct writes"
  ON public.dm_threads FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_dm_threads_user_a ON public.dm_threads(user_a);
CREATE INDEX IF NOT EXISTS idx_dm_threads_user_b ON public.dm_threads(user_b);
CREATE INDEX IF NOT EXISTS idx_dm_threads_last_at ON public.dm_threads(last_at DESC);

-- ── 2. dm_messages ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dm_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ DEFAULT now(),
  read_at     TIMESTAMPTZ
);

ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see messages in own threads"
  ON public.dm_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_threads t
      WHERE t.id = dm_messages.thread_id
        AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
    )
  );

CREATE POLICY "No direct message writes"
  ON public.dm_messages FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_dm_messages_thread ON public.dm_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_messages_unread ON public.dm_messages(thread_id, read_at) WHERE read_at IS NULL;

-- ── 3. dm_blocks ───────────────────────────────────────────
-- Separate from the app-wide block system — DM-specific silent blocks.

CREATE TABLE IF NOT EXISTS public.dm_blocks (
  blocker_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

ALTER TABLE public.dm_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own blocks"
  ON public.dm_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "No direct block writes"
  ON public.dm_blocks FOR ALL
  USING (false)
  WITH CHECK (false);

-- ── 4. RPC: get_dm_threads ─────────────────────────────────
-- Returns the user's inbox: threads with last message preview + other user info.

CREATE OR REPLACE FUNCTION public.get_dm_threads()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY last_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'thread_id',    t.id,
      'other_user_id', CASE WHEN t.user_a = v_uid THEN t.user_b ELSE t.user_a END,
      'other_username', p.username,
      'other_display_name', p.display_name,
      'last_message', t.last_message,
      'last_at',      t.last_at,
      'unread_count', (
        SELECT COUNT(*) FROM dm_messages m
        WHERE m.thread_id = t.id
          AND m.sender_id != v_uid
          AND m.read_at IS NULL
      )
    ) AS row_data,
    t.last_at
    FROM dm_threads t
    JOIN profiles p ON p.id = CASE WHEN t.user_a = v_uid THEN t.user_b ELSE t.user_a END
    WHERE (t.user_a = v_uid OR t.user_b = v_uid)
      AND NOT EXISTS (
        SELECT 1 FROM dm_blocks b
        WHERE b.blocker_id = v_uid
          AND b.blocked_id = CASE WHEN t.user_a = v_uid THEN t.user_b ELSE t.user_a END
      )
  ) sub;

  RETURN jsonb_build_object('threads', v_result);
END;
$$;

-- ── 5. RPC: get_dm_messages ────────────────────────────────
-- Returns messages for a thread (paginated, newest first).

CREATE OR REPLACE FUNCTION public.get_dm_messages(
  p_thread_id UUID,
  p_limit     INT DEFAULT 50,
  p_before    TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Verify user belongs to thread
  IF NOT EXISTS (
    SELECT 1 FROM dm_threads WHERE id = p_thread_id AND (user_a = v_uid OR user_b = v_uid)
  ) THEN
    RETURN jsonb_build_object('error', 'not_authorized');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',         m.id,
    'sender_id',  m.sender_id,
    'body',       m.body,
    'created_at', m.created_at,
    'read_at',    m.read_at
  ) ORDER BY m.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM dm_messages m
  WHERE m.thread_id = p_thread_id
    AND (p_before IS NULL OR m.created_at < p_before)
  LIMIT p_limit;

  -- Mark messages as read
  UPDATE dm_messages
  SET read_at = now()
  WHERE thread_id = p_thread_id
    AND sender_id != v_uid
    AND read_at IS NULL;

  RETURN jsonb_build_object('messages', v_result);
END;
$$;

-- ── 6. RPC: send_dm ───────────────────────────────────────
-- Sends a message. Creates thread if needed. Checks eligibility + blocks.

CREATE OR REPLACE FUNCTION public.send_dm(
  p_recipient_id UUID,
  p_body         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_user_a    UUID;
  v_user_b    UUID;
  v_thread_id UUID;
  v_msg_id    UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  IF p_recipient_id = v_uid THEN
    RETURN jsonb_build_object('error', 'cannot_message_self');
  END IF;

  IF p_body IS NULL OR char_length(trim(p_body)) < 1 OR char_length(p_body) > 2000 THEN
    RETURN jsonb_build_object('error', 'invalid_message');
  END IF;

  -- Canonical ordering
  v_user_a := LEAST(v_uid, p_recipient_id);
  v_user_b := GREATEST(v_uid, p_recipient_id);

  -- Check blocks (either direction)
  IF EXISTS (
    SELECT 1 FROM dm_blocks
    WHERE (blocker_id = v_uid AND blocked_id = p_recipient_id)
       OR (blocker_id = p_recipient_id AND blocked_id = v_uid)
  ) THEN
    RETURN jsonb_build_object('error', 'blocked');
  END IF;

  -- Check DM eligibility
  IF NOT EXISTS (
    SELECT 1 FROM dm_eligibility WHERE user_a = v_user_a AND user_b = v_user_b
  ) THEN
    RETURN jsonb_build_object('error', 'not_eligible');
  END IF;

  -- Get or create thread
  SELECT id INTO v_thread_id
  FROM dm_threads WHERE user_a = v_user_a AND user_b = v_user_b;

  IF v_thread_id IS NULL THEN
    INSERT INTO dm_threads (user_a, user_b, last_message, last_at)
    VALUES (v_user_a, v_user_b, left(trim(p_body), 100), now())
    RETURNING id INTO v_thread_id;
  ELSE
    UPDATE dm_threads
    SET last_message = left(trim(p_body), 100), last_at = now()
    WHERE id = v_thread_id;
  END IF;

  -- Insert message
  INSERT INTO dm_messages (thread_id, sender_id, body)
  VALUES (v_thread_id, v_uid, trim(p_body))
  RETURNING id INTO v_msg_id;

  RETURN jsonb_build_object('ok', true, 'thread_id', v_thread_id, 'message_id', v_msg_id);
END;
$$;

-- ── 7. RPC: block_dm_user ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.block_dm_user(p_blocked_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  INSERT INTO dm_blocks (blocker_id, blocked_id)
  VALUES (v_uid, p_blocked_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── 8. RPC: unblock_dm_user ────────────────────────────────

CREATE OR REPLACE FUNCTION public.unblock_dm_user(p_blocked_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  DELETE FROM dm_blocks WHERE blocker_id = v_uid AND blocked_id = p_blocked_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── 9. RPC: get_dm_unread_count ────────────────────────────
-- Quick count for notification badge.

CREATE OR REPLACE FUNCTION public.get_dm_unread_count()
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM dm_messages m
  JOIN dm_threads t ON t.id = m.thread_id
  WHERE (t.user_a = auth.uid() OR t.user_b = auth.uid())
    AND m.sender_id != auth.uid()
    AND m.read_at IS NULL;
$$;

-- ── 10. Enable realtime for dm_messages ────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
