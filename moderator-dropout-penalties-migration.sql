-- ============================================================
-- THE MODERATOR — MODERATOR DROPOUT PENALTIES
-- Session 178 — March 26, 2026
--
-- WHAT THIS DOES:
-- 1. Creates mod_dropout_log table (append-only, one row per dropout)
-- 2. Creates get_mod_cooldown_minutes helper (tier lookup)
-- 3. Creates record_mod_dropout RPC (nulls debate, logs penalty, impacts approval)
-- 4. Creates check_mod_cooldown RPC (checks if moderator is in cooldown)
--
-- DEPENDS ON:
--   - arena_debates table (moderator-arena-schema.sql)
--   - profiles table with mod columns (moderator-references-migration.sql)
--   - moderator_scores table (moderator-references-migration.sql)
--   - log_event() function (moderator-analytics-migration.sql)
--   - guard_profile_columns trigger (moderator-references-migration.sql)
--     NOTE: SECURITY DEFINER runs as postgres, bypasses the guard.
--
-- DOES NOT TOUCH:
--   - score_moderator RPC (post-debate rating — separate system)
--   - browse_mod_queue / request_to_moderate RPCs
--     (integrate check_mod_cooldown into those later if desired)
--
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE)
-- ============================================================


-- ████████████████████████████████████████████████████████████
-- PART 1: TABLE — mod_dropout_log
--
-- Append-only. One row per moderator dropout.
-- "Resets daily" per spec = COUNT rows where created_at >= today's
-- UTC midnight. No cron. No columns to reset.
-- ████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS public.mod_dropout_log (
  id BIGSERIAL PRIMARY KEY,
  moderator_id UUID NOT NULL REFERENCES profiles(id),
  debate_id UUID NOT NULL REFERENCES arena_debates(id) ON DELETE CASCADE,
  cooldown_minutes INT NOT NULL,     -- cooldown applied for this dropout
  offense_number INT NOT NULL,       -- which offense today (1, 2, or 3+)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.mod_dropout_log IS
  'Append-only log of moderator dropouts. Escalating cooldowns per spec Section 12.3. '
  '1st = 10min, 2nd = 1hr, 3rd+ = 24hr. Resets daily (UTC midnight). Never deleted/updated.';

CREATE INDEX IF NOT EXISTS idx_mod_dropout_moderator
  ON public.mod_dropout_log (moderator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mod_dropout_debate
  ON public.mod_dropout_log (debate_id);

-- RLS: anyone can read (moderators see their history). Writes only via SECURITY DEFINER.
ALTER TABLE public.mod_dropout_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mod_dropout_read" ON public.mod_dropout_log;
CREATE POLICY "mod_dropout_read"
  ON public.mod_dropout_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "mod_dropout_no_insert" ON public.mod_dropout_log;
CREATE POLICY "mod_dropout_no_insert"
  ON public.mod_dropout_log FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "mod_dropout_no_update" ON public.mod_dropout_log;
CREATE POLICY "mod_dropout_no_update"
  ON public.mod_dropout_log FOR UPDATE USING (false);

DROP POLICY IF EXISTS "mod_dropout_no_delete" ON public.mod_dropout_log;
CREATE POLICY "mod_dropout_no_delete"
  ON public.mod_dropout_log FOR DELETE USING (false);


-- ████████████████████████████████████████████████████████████
-- PART 2: HELPER — get_mod_cooldown_minutes
--
-- Spec Section 12.3:
--   1st dropout same day → 10 minutes
--   2nd dropout same day → 60 minutes (1 hour)
--   3rd+ dropout same day → 1440 minutes (24 hours)
-- ████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION get_mod_cooldown_minutes(p_offense_number INT)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_offense_number <= 1 THEN 10
    WHEN p_offense_number = 2 THEN 60
    ELSE 1440
  END;
$$;


-- ████████████████████████████████████████████████████████████
-- PART 3: record_mod_dropout RPC
--
-- Called by a debater when the moderator leaves a live debate.
-- Detection: Supabase Realtime presence update shows moderator
-- gone from the signaling channel.
--
-- Flow:
--   1. Validate caller is a debater, debate live, has human moderator
--   2. Idempotency: if debate already cancelled, return success
--   3. Null the debate (status → cancelled, winner → NULL)
--   4. Count today's dropouts for this moderator (UTC midnight)
--   5. Insert dropout log row
--   6. Insert synthetic 0-score into moderator_scores (impacts approval)
--   7. Recalculate mod_approval_pct (same formula as score_moderator)
--   8. Analytics double-write
--
-- Both debaters may call simultaneously. Step 2 ensures only one
-- processes the dropout. Under READ COMMITTED, the UPDATE to
-- 'cancelled' is atomic — the second caller sees the new status.
--
-- ONLY fires for human-moderated live debates.
-- AI sparring and unmoderated debates do NOT trigger penalties.
-- (LoL's LeaverBuster pattern: penalties only for matchmade games.)
-- ████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION record_mod_dropout(
  p_debate_id UUID
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ████████████████████████████████████████████████████████████
-- PART 4: check_mod_cooldown RPC
--
-- Called before a moderator accepts a debate.
-- Returns whether they're in cooldown and when it expires.
--
-- "Resets daily" = count rows where created_at >= today's UTC midnight.
-- If the most recent dropout + its cooldown_minutes > now(), they're
-- still in cooldown.
-- ████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION check_mod_cooldown(
  p_moderator_id UUID
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ████████████████████████████████████████████████████████████
-- DONE
--
-- CLIENT-SIDE USAGE:
--
--   // Debater detects moderator left (presence update)
--   const { data } = await supabase.rpc('record_mod_dropout', {
--     p_debate_id: debateId
--   });
--   // data = {
--   //   success: true,
--   //   moderator_id: '...',
--   //   offense_number: 1,
--   //   cooldown_minutes: 10,
--   //   cooldown_expires_at: '2026-03-26T21:10:00Z',
--   //   new_approval: 42.50
--   // }
--   // OR if both debaters called:
--   // data = { success: true, already_processed: true }
--
--   // Before moderator accepts a new debate
--   const { data } = await supabase.rpc('check_mod_cooldown', {
--     p_moderator_id: moderatorId
--   });
--   // data = {
--   //   in_cooldown: true,
--   //   dropouts_today: 2,
--   //   cooldown_expires_at: '2026-03-26T22:00:00Z',
--   //   cooldown_remaining_seconds: 1847,
--   //   next_offense_cooldown_minutes: 1440
--   // }
--   if (data.in_cooldown) {
--     showMessage(`Cooldown active. Try again in ${data.cooldown_remaining_seconds}s`);
--   }
--
-- INTEGRATION NOTES:
--
--   record_mod_dropout ONLY fires for human-moderated live debates.
--   AI sparring and unmoderated debates are excluded (moderator_type check).
--
--   check_mod_cooldown should be called:
--     1. Client-side before showing "Accept" on browse_mod_queue results
--     2. Optionally inside request_to_moderate RPC as a guard
--        (not done here — add later if desired)
--
--   guard_profile_columns trigger does NOT block the mod_approval_pct
--   UPDATE because SECURITY DEFINER runs as postgres, which is in the
--   trigger's exception list: current_setting('role') NOT IN ('postgres', 'service_role')
--
-- LAND MINE:
--   The synthetic 0-score in moderator_scores uses the REPORTING debater's
--   ID as scorer_id. If the other debater also calls (idempotent path),
--   they do NOT insert a second score (ON CONFLICT DO NOTHING). This means
--   only one 0-score per dropout, not two. If you want BOTH debaters to
--   register disapproval, remove the ON CONFLICT and handle the duplicate
--   case differently.
-- ████████████████████████████████████████████████████████████
