-- ============================================================
-- THE MODERATOR — LIVE DEBATE FEED TABLE
-- Session 178 — March 26, 2026
--
-- WHAT THIS DOES:
-- 1. Creates debate_feed_events table (permanent B2B archive)
-- 2. Adds indexes for live queries and B2B aggregation
-- 3. Sets RLS: public SELECT, INSERT blocked (SECURITY DEFINER only)
-- 4. Creates broadcast trigger (realtime.broadcast_changes)
-- 5. Creates RLS policy on realtime.messages for Broadcast Authorization
-- 6. Creates insert_feed_event RPC with role validation + log_event
-- 7. Creates get_feed_events backfill RPC for reconnect gap-fill
--
-- DEPENDS ON:
--   - arena_debates table (moderator-arena-schema.sql)
--   - debate_references table (moderator-references-migration.sql)
--   - profiles table (moderator-schema-production.sql)
--   - log_event() function (moderator-analytics-migration.sql)
--
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE)
-- ============================================================


-- ████████████████████████████████████████████████████████████
-- PART 1: TABLE
-- ████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS public.debate_feed_events (
  id BIGSERIAL PRIMARY KEY,
  debate_id UUID NOT NULL REFERENCES arena_debates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),             -- NULL for system events (round_divider)
  event_type TEXT NOT NULL CHECK (event_type IN (
    'speech',               -- debater speaks or types
    'reference_cite',       -- debater cites a reference
    'reference_challenge',  -- debater challenges opponent's reference
    'point_award',          -- moderator scores a comment (1-5)
    'mod_ruling',           -- moderator rules on a reference challenge
    'round_divider',        -- system marks round boundary
    'sentiment_vote',       -- spectator casts sentiment vote
    'power_up'              -- debater activates a power-up
  )),

  -- Structured columns for B2B aggregation (no JSON path extraction needed)
  round INT CHECK (round BETWEEN 0 AND 10),          -- 0 = pre-debate events
  side TEXT CHECK (side IS NULL OR side IN ('a', 'b', 'mod')),  -- who generated it
  content TEXT,                                        -- speech text, ruling text, power-up name
  score INT,                                           -- point_award value (1-5), NULL otherwise
  reference_id UUID REFERENCES debate_references(id),  -- for cite/challenge/ruling events

  -- Flexible payload for anything not covered above
  metadata JSONB DEFAULT '{}',

  -- Server-assigned timestamp only. Clients never set this.
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Comment for documentation
COMMENT ON TABLE public.debate_feed_events IS
  'Append-only feed for live moderated debates. Every event in the unified feed '
  'gets one row. Permanent archive for B2B analytics and debate replay. '
  'Real-time delivery via Broadcast trigger, not Postgres Changes.';


-- ████████████████████████████████████████████████████████████
-- PART 2: INDEXES
-- ████████████████████████████████████████████████████████████

-- Primary query: all events for a debate, ordered by time (live feed + replay)
CREATE INDEX IF NOT EXISTS idx_feed_events_debate
  ON public.debate_feed_events (debate_id, created_at ASC);

-- Backfill on reconnect: events after a timestamp for a specific debate
-- Same index as above covers this (debate_id + created_at range scan)

-- B2B aggregation: filter by event type across all debates
CREATE INDEX IF NOT EXISTS idx_feed_events_type
  ON public.debate_feed_events (event_type, created_at DESC);

-- B2B aggregation: events by user (debater performance analysis)
CREATE INDEX IF NOT EXISTS idx_feed_events_user
  ON public.debate_feed_events (user_id, event_type) WHERE user_id IS NOT NULL;

-- Moderator scoring queries: point_award events only
CREATE INDEX IF NOT EXISTS idx_feed_events_scoring
  ON public.debate_feed_events (debate_id, side, score)
  WHERE event_type = 'point_award';


-- ████████████████████████████████████████████████████████████
-- PART 3: RLS
-- ████████████████████████████████████████████████████████████

ALTER TABLE public.debate_feed_events ENABLE ROW LEVEL SECURITY;

-- SELECT: public. Debates are public events. Spectators, debaters, moderators,
-- B2B queries — everyone can read. No per-user filtering needed.
DROP POLICY IF EXISTS "feed_events_select_public" ON public.debate_feed_events;
CREATE POLICY "feed_events_select_public"
  ON public.debate_feed_events
  FOR SELECT
  USING (true);

-- INSERT: blocked at RLS level. All inserts go through insert_feed_event
-- SECURITY DEFINER RPC which does role validation.
DROP POLICY IF EXISTS "feed_events_insert_server_only" ON public.debate_feed_events;
CREATE POLICY "feed_events_insert_server_only"
  ON public.debate_feed_events
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: never. Append-only table.
DROP POLICY IF EXISTS "feed_events_no_update" ON public.debate_feed_events;
CREATE POLICY "feed_events_no_update"
  ON public.debate_feed_events
  FOR UPDATE
  USING (false);

-- DELETE: never at RLS level. Only CASCADE from arena_debates deletion.
DROP POLICY IF EXISTS "feed_events_no_delete" ON public.debate_feed_events;
CREATE POLICY "feed_events_no_delete"
  ON public.debate_feed_events
  FOR DELETE
  USING (false);


-- ████████████████████████████████████████████████████████████
-- PART 4: BROADCAST TRIGGER
--
-- On every INSERT into debate_feed_events, broadcast the row to
-- the private channel 'debate:<debate_id>' via realtime.broadcast_changes.
--
-- This is the real-time delivery mechanism. The table is permanent storage.
-- realtime.messages (Supabase internal) is ephemeral — 3-day partitioned
-- retention. Our table is the archive. Broadcast is the live pipe.
-- ████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION public.broadcast_feed_event()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'debate:' || NEW.debate_id::text,   -- topic: debate:<uuid>
    TG_OP,                               -- event: INSERT
    TG_OP,                               -- operation: INSERT
    TG_TABLE_NAME,                       -- table: debate_feed_events
    TG_TABLE_SCHEMA,                     -- schema: public
    NEW,                                 -- new record
    OLD                                  -- old record (NULL for INSERT)
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Never let broadcast failure block the INSERT.
  -- Event is safely in the table. Clients backfill on reconnect.
  RAISE WARNING 'broadcast_feed_event failed: % %', SQLERRM, SQLSTATE;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS feed_event_broadcast_trigger ON public.debate_feed_events;
CREATE TRIGGER feed_event_broadcast_trigger
  AFTER INSERT ON public.debate_feed_events
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_feed_event();


-- ████████████████████████████████████████████████████████████
-- PART 5: REALTIME BROADCAST AUTHORIZATION
--
-- realtime.broadcast_changes uses private channels. Clients must
-- subscribe with { config: { private: true } }. Supabase checks
-- RLS on realtime.messages at channel join time (cached for session).
--
-- Policy: any authenticated user can receive broadcast messages.
-- This is intentionally broad — debates are public to watch.
-- If we need per-debate authorization later, add a topic check
-- using realtime.topic() against a participants/spectators table.
-- ████████████████████████████████████████████████████████████

-- SELECT = receive broadcasts
DROP POLICY IF EXISTS "authenticated_receive_broadcast" ON "realtime"."messages";
CREATE POLICY "authenticated_receive_broadcast"
  ON "realtime"."messages"
  FOR SELECT
  TO authenticated
  USING (
    realtime.messages.extension = 'broadcast'
  );

-- No INSERT policy on realtime.messages needed — clients don't send
-- broadcast messages. All events originate from the server via the
-- trigger calling realtime.broadcast_changes.


-- ████████████████████████████████████████████████████████████
-- PART 6: INSERT RPC
--
-- Single entry point for all feed events. Role validation ensures:
--   - Debaters can insert: speech, reference_cite, reference_challenge, power_up
--   - Moderator can insert: point_award, mod_ruling
--   - Spectators can insert: sentiment_vote
--   - Any participant (debater or mod) can insert: round_divider
--
-- Also fires log_event() for the analytics pipeline (double-write).
-- ████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION insert_feed_event(
  p_debate_id UUID,
  p_event_type TEXT,
  p_round INT DEFAULT NULL,
  p_side TEXT DEFAULT NULL,
  p_content TEXT DEFAULT NULL,
  p_score INT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_debate RECORD;
  v_role TEXT;  -- 'debater_a', 'debater_b', 'moderator', 'spectator'
  v_event_id BIGINT;
BEGIN
  -- Auth check
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Load debate and determine caller's role
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_uid = v_debate.debater_a THEN
    v_role := 'debater_a';
  ELSIF v_uid = v_debate.debater_b THEN
    v_role := 'debater_b';
  ELSIF v_uid = v_debate.moderator_id THEN
    v_role := 'moderator';
  ELSE
    v_role := 'spectator';
  END IF;

  -- Role validation per event type
  IF p_event_type IN ('speech', 'reference_cite', 'reference_challenge', 'power_up') THEN
    IF v_role NOT IN ('debater_a', 'debater_b') THEN
      RAISE EXCEPTION 'Only debaters can insert % events', p_event_type;
    END IF;

  ELSIF p_event_type IN ('point_award', 'mod_ruling') THEN
    IF v_role != 'moderator' THEN
      RAISE EXCEPTION 'Only moderator can insert % events', p_event_type;
    END IF;

  ELSIF p_event_type = 'sentiment_vote' THEN
    -- All authenticated users can submit sentiment votes
    -- (spec Section 4.3: spectator overlay has Vote A / Vote B buttons)
    NULL;

  ELSIF p_event_type = 'round_divider' THEN
    IF v_role NOT IN ('debater_a', 'debater_b', 'moderator') THEN
      RAISE EXCEPTION 'Only debate participants can insert round_divider events';
    END IF;

  ELSE
    RAISE EXCEPTION 'Unknown event type: %', p_event_type;
  END IF;

  -- Validate score range for point_award
  IF p_event_type = 'point_award' AND (p_score IS NULL OR p_score < 1 OR p_score > 5) THEN
    RAISE EXCEPTION 'point_award score must be between 1 and 5';
  END IF;

  -- INSERT (bypasses RLS because SECURITY DEFINER)
  INSERT INTO public.debate_feed_events (
    debate_id, user_id, event_type, round, side, content, score, reference_id, metadata
  ) VALUES (
    p_debate_id, v_uid, p_event_type, p_round, p_side,
    CASE WHEN p_content IS NOT NULL THEN sanitize_text(p_content) ELSE NULL END,
    p_score, p_reference_id, p_metadata
  )
  RETURNING id INTO v_event_id;

  -- Double-write to event_log for analytics pipeline
  PERFORM log_event(
    'feed_' || p_event_type,        -- e.g. 'feed_speech', 'feed_point_award'
    v_uid,
    p_debate_id,
    v_debate.category,
    p_side,
    jsonb_build_object(
      'feed_event_id', v_event_id,
      'round', p_round,
      'score', p_score,
      'role', v_role
    ) || p_metadata
  );

  RETURN json_build_object(
    'success', true,
    'id', v_event_id,
    'created_at', now()
  );
END;
$$;


-- ████████████████████████████████████████████████████████████
-- PART 7: BACKFILL RPC
--
-- Called by clients on reconnect to fetch events missed during
-- WebSocket disconnection. Client tracks timestamp of last received
-- event and passes it here.
--
-- Also used for initial feed load when a spectator joins mid-debate,
-- and for full replay of archived debates.
-- ████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION get_feed_events(
  p_debate_id UUID,
  p_after TIMESTAMPTZ DEFAULT NULL,   -- NULL = get all events (replay/initial load)
  p_limit INT DEFAULT 500             -- safety cap
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_limit > 1000 THEN
    p_limit := 1000;  -- hard cap
  END IF;

  RETURN COALESCE((
    SELECT json_agg(row_to_json(e) ORDER BY e.created_at ASC)
    FROM (
      SELECT
        id, debate_id, user_id, event_type, round, side,
        content, score, reference_id, metadata, created_at
      FROM public.debate_feed_events
      WHERE debate_id = p_debate_id
        AND (p_after IS NULL OR created_at > p_after)
      ORDER BY created_at ASC
      LIMIT p_limit
    ) e
  ), '[]'::json);
END;
$$;


-- ████████████████████████████████████████████████████████████
-- DONE
--
-- WHAT TO DO AFTER RUNNING THIS:
--
-- 1. In Supabase Dashboard → Realtime → Settings:
--    Disable "Allow public access" to enforce private channels.
--
-- 2. Client-side subscription pattern:
--
--    await supabase.realtime.setAuth();
--    const channel = supabase
--      .channel(`debate:${debateId}`, { config: { private: true } })
--      .on('broadcast', { event: 'INSERT' }, (payload) => {
--        // payload.new contains the debate_feed_events row
--        addToFeed(payload.new);
--      })
--      .subscribe();
--
-- 3. Client-side reconnect backfill:
--
--    // Track last event timestamp
--    let lastEventTime = null;
--    // On each event: lastEventTime = event.created_at;
--    // On reconnect:
--    const { data } = await supabase.rpc('get_feed_events', {
--      p_debate_id: debateId,
--      p_after: lastEventTime
--    });
--    // Merge into feed, dedupe by id
--
-- 4. Client-side worker mode for stable connections:
--
--    const supabase = createClient(url, key, {
--      realtime: { worker: true }
--    });
--
-- EXISTING CODE UNTOUCHED:
--   - debate_messages table: still used by AI Sparring
--   - send_debate_message RPC: still used by AI Sparring
--   - get_debate_messages RPC: still used by spectate page for AI debates
--   - event_log table: still the internal analytics sink
--   - log_event() function: called inside insert_feed_event (double-write)
-- ████████████████████████████████████████████████████████████
