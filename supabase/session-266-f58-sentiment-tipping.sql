-- ============================================================
-- F-58: Sentiment Tipping — Session 266
-- Project: faomczmipsccwbhpivmp
-- Run order: top to bottom, one block at a time.
-- ============================================================

-- ============================================================
-- 1. debate_watches table
-- ============================================================
CREATE TABLE IF NOT EXISTS debate_watches (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debate_id   UUID NOT NULL REFERENCES arena_debates(id) ON DELETE CASCADE,
  watched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, debate_id)
);

CREATE INDEX IF NOT EXISTS idx_debate_watches_user   ON debate_watches(user_id);
CREATE INDEX IF NOT EXISTS idx_debate_watches_debate ON debate_watches(debate_id);

ALTER TABLE debate_watches ENABLE ROW LEVEL SECURITY;

-- Service-role-only: all client access is through SECURITY DEFINER RPCs
CREATE POLICY "debate_watches_service_only" ON debate_watches
  FOR ALL USING (false) WITH CHECK (false);

-- ============================================================
-- 2. sentiment_tips table
-- ============================================================
CREATE TABLE IF NOT EXISTS sentiment_tips (
  id            BIGSERIAL PRIMARY KEY,
  debate_id     UUID NOT NULL REFERENCES arena_debates(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  side          TEXT NOT NULL CHECK (side IN ('a', 'b')),
  amount        INT  NOT NULL CHECK (amount >= 2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  refund_amount INT,
  settled_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sentiment_tips_debate     ON sentiment_tips(debate_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_tips_user       ON sentiment_tips(user_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_tips_unsettled  ON sentiment_tips(debate_id) WHERE settled_at IS NULL;

ALTER TABLE sentiment_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sentiment_tips_service_only" ON sentiment_tips
  FOR ALL USING (false) WITH CHECK (false);

-- ============================================================
-- 3. arena_debates — add sentiment totals
-- ============================================================
ALTER TABLE arena_debates
  ADD COLUMN IF NOT EXISTS sentiment_total_a BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sentiment_total_b BIGINT NOT NULL DEFAULT 0;

-- Cap constraints (1 billion per side)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_sentiment_total_a' AND conrelid = 'arena_debates'::regclass
  ) THEN
    ALTER TABLE arena_debates
      ADD CONSTRAINT chk_sentiment_total_a CHECK (sentiment_total_a <= 1000000000),
      ADD CONSTRAINT chk_sentiment_total_b CHECK (sentiment_total_b <= 1000000000);
  END IF;
END;
$$;

-- ============================================================
-- 4. RPC: log_debate_watch
--    Fire-and-forget. Excludes debaters and guests.
-- ============================================================
CREATE OR REPLACE FUNCTION log_debate_watch(p_debate_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_debate  arena_debates%ROWTYPE;
BEGIN
  -- Guest check
  IF v_uid IS NULL THEN RETURN; END IF;

  -- Get debate
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Exclude debaters
  IF v_debate.debater_a = v_uid OR v_debate.debater_b = v_uid THEN RETURN; END IF;

  INSERT INTO debate_watches(user_id, debate_id)
  VALUES (v_uid, p_debate_id)
  ON CONFLICT DO NOTHING;
END;
$$;

-- ============================================================
-- 5. RPC: get_user_watch_tier
--    Returns {tier, count} for the calling user.
--    Tiers: Unranked(0) | Observer(1-4) | Fan(5-14) | Analyst(15-49) | Insider(50+)
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_watch_tier()
RETURNS TABLE(tier TEXT, watch_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_count BIGINT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT 'Unranked'::TEXT, 0::BIGINT;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_count FROM debate_watches WHERE user_id = v_uid;

  RETURN QUERY SELECT
    CASE
      WHEN v_count = 0                     THEN 'Unranked'
      WHEN v_count BETWEEN 1  AND 4        THEN 'Observer'
      WHEN v_count BETWEEN 5  AND 14       THEN 'Fan'
      WHEN v_count BETWEEN 15 AND 49       THEN 'Analyst'
      ELSE                                      'Insider'
    END::TEXT,
    v_count;
END;
$$;

-- ============================================================
-- 6. RPC: cast_sentiment_tip
--    Auth check, side/amount validation, watch-tier gate,
--    atomic token debit, tip insert, totals update, feed event.
-- ============================================================
CREATE OR REPLACE FUNCTION cast_sentiment_tip(
  p_debate_id UUID,
  p_side      TEXT,
  p_amount    INT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_debate      arena_debates%ROWTYPE;
  v_watch_count BIGINT;
  v_tier        TEXT;
  v_balance     INT;
  v_new_total_a BIGINT;
  v_new_total_b BIGINT;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Validate side
  IF p_side NOT IN ('a', 'b') THEN
    RETURN jsonb_build_object('error', 'invalid_side');
  END IF;

  -- Validate amount
  IF p_amount < 2 THEN
    RETURN jsonb_build_object('error', 'amount_too_low');
  END IF;

  -- Get debate with row lock
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'debate_not_found');
  END IF;

  -- Must be live
  IF v_debate.status != 'live' THEN
    RETURN jsonb_build_object('error', 'debate_not_live');
  END IF;

  -- Human-vs-human only (no AI sparring)
  IF v_debate.mode = 'ai' THEN
    RETURN jsonb_build_object('error', 'ai_debate_not_eligible');
  END IF;

  -- Cap check (1B per side)
  IF p_side = 'a' AND (v_debate.sentiment_total_a + p_amount) > 1000000000 THEN
    RETURN jsonb_build_object('error', 'cap_exceeded');
  END IF;
  IF p_side = 'b' AND (v_debate.sentiment_total_b + p_amount) > 1000000000 THEN
    RETURN jsonb_build_object('error', 'cap_exceeded');
  END IF;

  -- Derive watch tier
  SELECT COUNT(*) INTO v_watch_count FROM debate_watches WHERE user_id = v_uid;
  IF v_watch_count = 0 THEN
    v_tier := 'Unranked';
  ELSIF v_watch_count BETWEEN 1 AND 4 THEN
    v_tier := 'Observer';
  ELSIF v_watch_count BETWEEN 5 AND 14 THEN
    v_tier := 'Fan';
  ELSIF v_watch_count BETWEEN 15 AND 49 THEN
    v_tier := 'Analyst';
  ELSE
    v_tier := 'Insider';
  END IF;

  -- Reject Unranked
  IF v_tier = 'Unranked' THEN
    RETURN jsonb_build_object('error', 'unranked_blocked', 'tier', v_tier, 'watch_count', v_watch_count);
  END IF;

  -- Atomic token debit (CHECK constraint token_balance >= 0 guards underflow)
  UPDATE profiles
  SET    token_balance = token_balance - p_amount
  WHERE  id = v_uid
    AND  token_balance >= p_amount
  RETURNING token_balance INTO v_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'insufficient_tokens');
  END IF;

  -- Insert tip row
  INSERT INTO sentiment_tips(debate_id, user_id, side, amount)
  VALUES (p_debate_id, v_uid, p_side, p_amount);

  -- Update arena_debates totals
  IF p_side = 'a' THEN
    UPDATE arena_debates
    SET    sentiment_total_a = sentiment_total_a + p_amount
    WHERE  id = p_debate_id
    RETURNING sentiment_total_a, sentiment_total_b
    INTO   v_new_total_a, v_new_total_b;
  ELSE
    UPDATE arena_debates
    SET    sentiment_total_b = sentiment_total_b + p_amount
    WHERE  id = p_debate_id
    RETURNING sentiment_total_a, sentiment_total_b
    INTO   v_new_total_a, v_new_total_b;
  END IF;

  -- Emit sentiment_tip feed event (broadcasts to room via trigger on debate_feed_events)
  PERFORM insert_feed_event(
    p_debate_id   := p_debate_id,
    p_event_type  := 'sentiment_tip',
    p_round       := NULL,
    p_side        := p_side,
    p_content     := p_amount || ' tokens → ' || upper(p_side),
    p_score       := NULL,
    p_reference_id := NULL,
    p_metadata    := jsonb_build_object('amount', p_amount, 'tier', v_tier)
  );

  RETURN jsonb_build_object(
    'success',     true,
    'new_total_a', v_new_total_a,
    'new_total_b', v_new_total_b,
    'new_balance', v_balance
  );
END;
$$;

-- ============================================================
-- 7. RPC: settle_sentiment_tips
--    Called from post-debate flow alongside settle_stakes.
--    Winner side: FLOOR(amount * 0.5) refund. Loser/draw: 0.
--    Idempotent via settled_at IS NULL.
-- ============================================================
CREATE OR REPLACE FUNCTION settle_sentiment_tips(p_debate_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debate arena_debates%ROWTYPE;
  v_tip    RECORD;
  v_refund INT;
BEGIN
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF NOT FOUND THEN RETURN; END IF;

  FOR v_tip IN
    SELECT * FROM sentiment_tips
    WHERE debate_id = p_debate_id
      AND settled_at IS NULL
    FOR UPDATE
  LOOP
    -- 50% refund on winning side, 0 on loser or draw
    IF v_debate.winner IS NOT NULL AND v_tip.side = v_debate.winner THEN
      v_refund := FLOOR(v_tip.amount * 0.5);
    ELSE
      v_refund := 0;
    END IF;

    IF v_refund > 0 THEN
      UPDATE profiles
      SET    token_balance = token_balance + v_refund
      WHERE  id = v_tip.user_id;
    END IF;

    UPDATE sentiment_tips
    SET    refund_amount = v_refund,
           settled_at   = now()
    WHERE  id = v_tip.id;
  END LOOP;
END;
$$;

-- ============================================================
-- 8. DROP cast_sentiment_vote
--    Confirmed live in production (S250 investigation).
--    Signature: (p_debate_id uuid, p_side text, p_round integer)
-- ============================================================
DROP FUNCTION IF EXISTS cast_sentiment_vote(UUID, TEXT, INTEGER);

-- ============================================================
-- 9. F-23 eligibility triggers — sentiment_tips + debate_watches
--    Pattern: ON CONFLICT DO NOTHING (matches arena_debates/arena_votes triggers)
-- ============================================================

-- sentiment_tips trigger
CREATE OR REPLACE FUNCTION fn_sentiment_tips_eligibility()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Tip user ↔ debater_a
  INSERT INTO dm_eligibility(user_a, user_b)
  SELECT LEAST(NEW.user_id, d.debater_a), GREATEST(NEW.user_id, d.debater_a)
  FROM   arena_debates d
  WHERE  d.id = NEW.debate_id
    AND  d.debater_a IS NOT NULL
    AND  NEW.user_id != d.debater_a
  ON CONFLICT DO NOTHING;

  -- Tip user ↔ debater_b
  INSERT INTO dm_eligibility(user_a, user_b)
  SELECT LEAST(NEW.user_id, d.debater_b), GREATEST(NEW.user_id, d.debater_b)
  FROM   arena_debates d
  WHERE  d.id = NEW.debate_id
    AND  d.debater_b IS NOT NULL
    AND  NEW.user_id != d.debater_b
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sentiment_tips_eligibility ON sentiment_tips;
CREATE TRIGGER trg_sentiment_tips_eligibility
  AFTER INSERT ON sentiment_tips
  FOR EACH ROW EXECUTE FUNCTION fn_sentiment_tips_eligibility();

-- debate_watches trigger
CREATE OR REPLACE FUNCTION fn_debate_watches_eligibility()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Watch user ↔ debater_a
  INSERT INTO dm_eligibility(user_a, user_b)
  SELECT LEAST(NEW.user_id, d.debater_a), GREATEST(NEW.user_id, d.debater_a)
  FROM   arena_debates d
  WHERE  d.id = NEW.debate_id
    AND  d.debater_a IS NOT NULL
    AND  NEW.user_id != d.debater_a
  ON CONFLICT DO NOTHING;

  -- Watch user ↔ debater_b
  INSERT INTO dm_eligibility(user_a, user_b)
  SELECT LEAST(NEW.user_id, d.debater_b), GREATEST(NEW.user_id, d.debater_b)
  FROM   arena_debates d
  WHERE  d.id = NEW.debate_id
    AND  d.debater_b IS NOT NULL
    AND  NEW.user_id != d.debater_b
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_debate_watches_eligibility ON debate_watches;
CREATE TRIGGER trg_debate_watches_eligibility
  AFTER INSERT ON debate_watches
  FOR EACH ROW EXECUTE FUNCTION fn_debate_watches_eligibility();
