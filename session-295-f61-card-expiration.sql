-- ============================================================
-- F-61: Debate card expiration + creator cancel
-- Session 295 | April 21, 2026
--
-- WHAT: 30-min auto-expire on unmatched open cards via pg_cron.
--       Creator cancel on own open cards. matched_at timestamp
--       set when accept_challenge fires.
-- WHY:  Stale open cards clutter the feed. Creators have no way
--       to retract a posted opinion.
-- RISK: Low. Only touches status='open' cards. Live/pending
--       debates are not affected.
-- ============================================================


-- ── 1. New column: matched_at ────────────────────────────────

ALTER TABLE arena_debates
  ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN arena_debates.matched_at IS 'F-61: Set when accept_challenge transitions open → pending';


-- ── 2. Update accept_challenge to set matched_at ─────────────

CREATE OR REPLACE FUNCTION public.accept_challenge(
  p_debate_id UUID,
  p_counter_argument TEXT DEFAULT NULL,
  p_mode TEXT DEFAULT 'live',
  p_ruleset TEXT DEFAULT 'amplified',
  p_total_rounds INT DEFAULT 4
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_clean_arg TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock and fetch the card
  SELECT id, debater_a, status, category
  INTO v_debate
  FROM public.arena_debates
  WHERE id = p_debate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate card not found';
  END IF;

  IF v_debate.status != 'open' THEN
    RAISE EXCEPTION 'This card is no longer open for challenges';
  END IF;

  -- Can't challenge yourself
  IF v_debate.debater_a = v_user_id THEN
    RAISE EXCEPTION 'Cannot challenge your own post';
  END IF;

  -- Sanitize counter-argument if provided
  IF p_counter_argument IS NOT NULL AND char_length(trim(p_counter_argument)) > 0 THEN
    v_clean_arg := sanitize_text(p_counter_argument);
    IF char_length(v_clean_arg) > 500 THEN
      RAISE EXCEPTION 'Counter-argument must be under 500 characters';
    END IF;
  END IF;

  -- Validate mode
  IF p_mode NOT IN ('live', 'text', 'voicememo') THEN
    p_mode := 'live';
  END IF;

  -- Validate ruleset
  IF p_ruleset NOT IN ('amplified', 'unplugged') THEN
    p_ruleset := 'amplified';
  END IF;

  -- Validate rounds
  IF p_total_rounds NOT IN (2, 3, 4, 5) THEN
    p_total_rounds := 4;
  END IF;

  -- Transition: open → pending, fill debater_b, stamp matched_at (F-61)
  UPDATE public.arena_debates
  SET debater_b = v_user_id,
      status = 'pending',
      mode = p_mode,
      ruleset = p_ruleset,
      total_rounds = p_total_rounds,
      matched_at = now()
  WHERE id = p_debate_id;

  -- Log event
  PERFORM log_event(
    p_event_type := 'challenge_accepted',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := 'b',
    p_metadata   := jsonb_build_object(
      'challenger_id', v_user_id,
      'original_poster', v_debate.debater_a,
      'mode', p_mode,
      'counter_argument_length', COALESCE(char_length(v_clean_arg), 0)
    )
  );

  RETURN json_build_object(
    'success', true,
    'debate_id', p_debate_id,
    'status', 'pending'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.accept_challenge(UUID, TEXT, TEXT, TEXT, INT) TO authenticated;


-- ── 3. cancel_debate_card() — creator cancels own open card ──

CREATE OR REPLACE FUNCTION public.cancel_debate_card(p_debate_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_debate RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock and fetch
  SELECT id, debater_a, status
  INTO v_debate
  FROM arena_debates
  WHERE id = p_debate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Card not found');
  END IF;

  -- Must be the creator
  IF v_debate.debater_a != v_uid THEN
    RETURN json_build_object('success', false, 'error', 'Only the creator can cancel');
  END IF;

  -- Must be open (not yet matched)
  IF v_debate.status != 'open' THEN
    RETURN json_build_object('success', false, 'error', 'Card is no longer open');
  END IF;

  -- Cancel it
  UPDATE arena_debates
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_debate_id;

  -- Remove from search index
  DELETE FROM search_index WHERE debate_id = p_debate_id;

  -- Log
  PERFORM log_event(
    p_event_type := 'debate_card_cancelled',
    p_user_id    := v_uid,
    p_debate_id  := p_debate_id,
    p_category   := NULL,
    p_side       := NULL,
    p_metadata   := jsonb_build_object('reason', 'creator_cancel')
  );

  RETURN json_build_object('success', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cancel_debate_card(UUID) TO authenticated;


-- ── 4. expire_stale_debate_cards() — pg_cron callable ────────

CREATE OR REPLACE FUNCTION public.expire_stale_debate_cards()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_expired_count INT;
BEGIN
  -- Expire open cards older than 30 minutes
  WITH expired AS (
    UPDATE arena_debates
    SET status = 'expired'
    WHERE status = 'open'
      AND created_at < now() - interval '30 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired_count FROM expired;

  -- Clean search index for expired cards
  DELETE FROM search_index
  WHERE entity_type = 'debate'
    AND entity_id IN (
      SELECT id FROM arena_debates WHERE status = 'expired'
    );

  RETURN json_build_object(
    'success', true,
    'expired_count', v_expired_count
  );
END;
$function$;

-- Grant to service role only (pg_cron runs as service role)
REVOKE EXECUTE ON FUNCTION public.expire_stale_debate_cards() FROM public;
REVOKE EXECUTE ON FUNCTION public.expire_stale_debate_cards() FROM authenticated;


-- ── 5. pg_cron job — run every 5 minutes ─────────────────────
-- NOTE: pg_cron must be enabled in Supabase Dashboard > Database > Extensions
-- Run this AFTER enabling the extension:

-- SELECT cron.schedule(
--   'expire-stale-debate-cards',
--   '*/5 * * * *',
--   $$SELECT expire_stale_debate_cards()$$
-- );

-- To verify: SELECT * FROM cron.job;
-- To remove: SELECT cron.unschedule('expire-stale-debate-cards');


-- ── 6. Exclude expired/cancelled from unified feed ───────────
-- Update get_unified_feed to exclude these statuses.
-- The existing RPC likely already filters by status — verify with:
--   SELECT prosrc FROM pg_proc WHERE proname = 'get_unified_feed';
-- If it does WHERE status IN ('open','pending','live','voting','complete'),
-- expired and cancelled are already excluded. If not, add the filter.


-- ============================================================
-- VERIFICATION QUERIES (run after applying):
--
--   -- Confirm matched_at column exists:
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name = 'arena_debates' AND column_name = 'matched_at';
--
--   -- Confirm cancel_debate_card exists:
--   SELECT proname FROM pg_proc WHERE proname = 'cancel_debate_card';
--
--   -- Confirm expire function exists:
--   SELECT proname FROM pg_proc WHERE proname = 'expire_stale_debate_cards';
--
--   -- Test expire (should return 0 if no stale cards):
--   SELECT expire_stale_debate_cards();
-- ============================================================
