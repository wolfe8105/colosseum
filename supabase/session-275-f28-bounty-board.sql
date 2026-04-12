-- ============================================================
-- F-28: Bounty Board
-- Session 275 | April 12, 2026
--
-- Rivals-only token bounties on opponents.
-- Posting gate: graduated by profile_depth_pct.
-- Duration fee: 1 token/day (on top of bounty amount).
-- Cancel: 85% refund. Natural expiry: 0% refund.
-- Pre-debate claim: 5% attempt fee, locked on selection.
-- Payout on hunter win: face value - 5% platform cut.
-- Gold dot: any user with ≥1 open bounty on them.
-- Mod is blind. Ranked debates only.
-- ============================================================


-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS bounties (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount         NUMERIC     NOT NULL CHECK (amount > 0),
  duration_days  INT         NOT NULL CHECK (duration_days BETWEEN 1 AND 365),
  duration_fee   NUMERIC     NOT NULL GENERATED ALWAYS AS (duration_days::NUMERIC) STORED,
  status         TEXT        NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open','claimed','expired','cancelled')),
  expires_at     TIMESTAMPTZ NOT NULL,
  cancelled_at   TIMESTAMPTZ,
  claimed_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bounties_poster   ON bounties(poster_id);
CREATE INDEX IF NOT EXISTS idx_bounties_target   ON bounties(target_id);
CREATE INDEX IF NOT EXISTS idx_bounties_status   ON bounties(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_bounties_expires  ON bounties(expires_at) WHERE status = 'open';

ALTER TABLE bounties ENABLE ROW LEVEL SECURITY;

-- Poster can read their own outgoing bounties.
-- Target can read incoming bounties on them.
-- No direct writes — all via SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS "bounties_poster_read" ON bounties;
CREATE POLICY "bounties_poster_read"
  ON bounties FOR SELECT TO authenticated
  USING (poster_id = auth.uid() OR target_id = auth.uid());


-- ============================================================
-- bounty_attempts
-- One row per pre-debate claim selection.
-- A bounty can be attempted multiple times (one per debate)
-- until it is successfully claimed or expires.
-- ============================================================

CREATE TABLE IF NOT EXISTS bounty_attempts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id    UUID        NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
  hunter_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  debate_id    UUID        NOT NULL REFERENCES arena_debates(id) ON DELETE CASCADE,
  attempt_fee  NUMERIC     NOT NULL CHECK (attempt_fee >= 0),
  outcome      TEXT        CHECK (outcome IN ('won', 'lost')),
  payout       NUMERIC,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (debate_id, hunter_id)   -- one attempt per debate per hunter
);

CREATE INDEX IF NOT EXISTS idx_bounty_attempts_bounty  ON bounty_attempts(bounty_id);
CREATE INDEX IF NOT EXISTS idx_bounty_attempts_hunter  ON bounty_attempts(hunter_id);
CREATE INDEX IF NOT EXISTS idx_bounty_attempts_debate  ON bounty_attempts(debate_id);

ALTER TABLE bounty_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bounty_attempts_hunter_read" ON bounty_attempts;
CREATE POLICY "bounty_attempts_hunter_read"
  ON bounty_attempts FOR SELECT TO authenticated
  USING (hunter_id = auth.uid());


-- ============================================================
-- HELPER: _bounty_slot_limit
-- Returns how many open bounty slots the user is allowed
-- based on profile_depth_pct.
-- 25% → 1, 35% → 2, 45% → 3, 55% → 4, 65% → 5, 75% → 6
-- ============================================================

CREATE OR REPLACE FUNCTION _bounty_slot_limit(p_depth INT)
RETURNS INT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_depth >= 75 THEN 6
    WHEN p_depth >= 65 THEN 5
    WHEN p_depth >= 55 THEN 4
    WHEN p_depth >= 45 THEN 3
    WHEN p_depth >= 35 THEN 2
    WHEN p_depth >= 25 THEN 1
    ELSE 0
  END;
$$;


-- ============================================================
-- HELPER: _expire_stale_bounties
-- Marks open bounties past expires_at as 'expired'.
-- Tokens already burned at post time — no refund on expiry.
-- Called at the start of every read RPC.
-- ============================================================

CREATE OR REPLACE FUNCTION _expire_stale_bounties()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE bounties
  SET status = 'expired'
  WHERE status = 'open'
    AND expires_at < now();
END;
$$;


-- ============================================================
-- RPC: post_bounty
-- Posts a bounty on a rival. Escrows amount + duration_fee.
-- ============================================================

CREATE OR REPLACE FUNCTION post_bounty(
  p_target_id    UUID,
  p_amount       NUMERIC,
  p_duration_days INT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_poster_id    UUID := auth.uid();
  v_depth        INT;
  v_slot_limit   INT;
  v_open_count   INT;
  v_balance      NUMERIC;
  v_total_cost   NUMERIC;
  v_rival_exists BOOLEAN;
  v_bounty_id    UUID;
BEGIN
  -- Basic validation
  IF p_target_id IS NULL OR p_target_id = v_poster_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid target');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero');
  END IF;

  IF p_duration_days IS NULL OR p_duration_days < 1 OR p_duration_days > 365 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Duration must be 1–365 days');
  END IF;

  -- Expire stale bounties so slot count is accurate
  PERFORM _expire_stale_bounties();

  -- Load poster profile
  SELECT profile_depth_pct, token_balance
  INTO v_depth, v_balance
  FROM profiles
  WHERE id = v_poster_id;

  IF v_depth IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Check posting gate
  v_slot_limit := _bounty_slot_limit(v_depth);
  IF v_slot_limit = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You need at least 25% profile depth to post bounties');
  END IF;

  -- Count poster's open bounties
  SELECT COUNT(*) INTO v_open_count
  FROM bounties
  WHERE poster_id = v_poster_id AND status = 'open';

  IF v_open_count >= v_slot_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('You have reached your bounty slot limit (%s open). Complete your profile to unlock more.', v_slot_limit)
    );
  END IF;

  -- Target must be on poster's rivals list (one-sided OK — pending or active)
  SELECT EXISTS (
    SELECT 1 FROM rivals
    WHERE user_id = v_poster_id
      AND rival_id = p_target_id
      AND status IN ('pending', 'active')
  ) INTO v_rival_exists;

  IF NOT v_rival_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only bounty users on your rivals list');
  END IF;

  -- Check sufficient balance
  v_total_cost := p_amount + p_duration_days::NUMERIC;
  IF v_balance < v_total_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Insufficient tokens. Need %s (bounty: %s + duration fee: %s)', v_total_cost, p_amount, p_duration_days)
    );
  END IF;

  -- Deduct tokens
  UPDATE profiles
  SET token_balance = token_balance - v_total_cost
  WHERE id = v_poster_id;

  -- Insert bounty
  INSERT INTO bounties (poster_id, target_id, amount, duration_days, status, expires_at)
  VALUES (
    v_poster_id,
    p_target_id,
    p_amount,
    p_duration_days,
    'open',
    now() + (p_duration_days || ' days')::INTERVAL
  )
  RETURNING id INTO v_bounty_id;

  RETURN jsonb_build_object('success', true, 'bounty_id', v_bounty_id);
END;
$$;


-- ============================================================
-- RPC: cancel_bounty
-- Poster cancels an open bounty. 85% refund, 15% burn.
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_bounty(p_bounty_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_poster_id UUID := auth.uid();
  v_bounty    RECORD;
  v_total_paid NUMERIC;
  v_refund    NUMERIC;
BEGIN
  SELECT id, poster_id, amount, duration_days, status
  INTO v_bounty
  FROM bounties
  WHERE id = p_bounty_id;

  IF v_bounty.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bounty not found');
  END IF;

  IF v_bounty.poster_id <> v_poster_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not your bounty');
  END IF;

  IF v_bounty.status <> 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bounty is not open');
  END IF;

  -- 85% refund of total paid (amount + duration_fee)
  v_total_paid := v_bounty.amount + v_bounty.duration_days::NUMERIC;
  v_refund     := round(v_total_paid * 0.85, 2);

  UPDATE bounties
  SET status = 'cancelled', cancelled_at = now()
  WHERE id = p_bounty_id;

  UPDATE profiles
  SET token_balance = token_balance + v_refund
  WHERE id = v_poster_id;

  RETURN jsonb_build_object('success', true, 'refund', v_refund, 'burned', v_total_paid - v_refund);
END;
$$;


-- ============================================================
-- RPC: get_my_bounties
-- Returns incoming (bounties on me) and outgoing (I posted).
-- Also refreshes expiry state before returning.
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_bounties()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_incoming JSONB;
  v_outgoing JSONB;
BEGIN
  PERFORM _expire_stale_bounties();

  -- Bounties on me (incoming)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',            b.id,
      'poster_id',     b.poster_id,
      'poster_username', p.username,
      'amount',        b.amount,
      'duration_days', b.duration_days,
      'duration_fee',  b.duration_fee,
      'status',        b.status,
      'expires_at',    b.expires_at,
      'created_at',    b.created_at
    ) ORDER BY b.created_at DESC
  ), '[]'::jsonb)
  INTO v_incoming
  FROM bounties b
  JOIN profiles p ON p.id = b.poster_id
  WHERE b.target_id = v_user_id;

  -- Bounties I posted (outgoing)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',             b.id,
      'target_id',      b.target_id,
      'target_username', p.username,
      'amount',         b.amount,
      'duration_days',  b.duration_days,
      'duration_fee',   b.duration_fee,
      'status',         b.status,
      'expires_at',     b.expires_at,
      'created_at',     b.created_at
    ) ORDER BY b.created_at DESC
  ), '[]'::jsonb)
  INTO v_outgoing
  FROM bounties b
  JOIN profiles p ON p.id = b.target_id
  WHERE b.poster_id = v_user_id;

  RETURN jsonb_build_object(
    'incoming', v_incoming,
    'outgoing', v_outgoing
  );
END;
$$;


-- ============================================================
-- RPC: get_opponent_bounties
-- Called in pre-debate screen to populate the claim dropdown.
-- Returns all open bounties where target = p_opponent_id.
-- Ranked debates only — caller enforces this on the client.
-- ============================================================

CREATE OR REPLACE FUNCTION get_opponent_bounties(p_opponent_id UUID)
RETURNS TABLE (
  bounty_id    UUID,
  poster_id    UUID,
  amount       NUMERIC,
  duration_days INT,
  expires_at   TIMESTAMPTZ,
  attempt_fee  NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM _expire_stale_bounties();

  RETURN QUERY
  SELECT
    b.id                                AS bounty_id,
    b.poster_id,
    b.amount,
    b.duration_days,
    b.expires_at,
    round(b.amount * 0.05, 2)           AS attempt_fee  -- 5% of face value
  FROM bounties b
  WHERE b.target_id   = p_opponent_id
    AND b.status      = 'open'
  ORDER BY b.amount DESC;
END;
$$;


-- ============================================================
-- RPC: select_bounty_claim
-- Hunter locks in ONE bounty claim pre-debate.
-- Charges 5% attempt fee immediately. Non-refundable.
-- One claim per debate enforced via UNIQUE on bounty_attempts.
-- ============================================================

CREATE OR REPLACE FUNCTION select_bounty_claim(
  p_bounty_id UUID,
  p_debate_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_hunter_id  UUID := auth.uid();
  v_bounty     RECORD;
  v_debate     RECORD;
  v_attempt_fee NUMERIC;
  v_balance    NUMERIC;
  v_already    BOOLEAN;
BEGIN
  -- Load bounty
  SELECT id, target_id, amount, status
  INTO v_bounty
  FROM bounties
  WHERE id = p_bounty_id;

  IF v_bounty.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bounty not found');
  END IF;

  IF v_bounty.status <> 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bounty is no longer open');
  END IF;

  -- Load debate — must be ranked, must have hunter as a debater, target must be opponent
  SELECT id, debater_a, debater_b, ranked, status
  INTO v_debate
  FROM arena_debates
  WHERE id = p_debate_id;

  IF v_debate.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Debate not found');
  END IF;

  IF NOT COALESCE(v_debate.ranked, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bounties are only claimable in ranked debates');
  END IF;

  IF v_debate.status NOT IN ('pending', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Debate is not in progress');
  END IF;

  -- Hunter must be one of the debaters
  IF v_hunter_id NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a debater in this debate');
  END IF;

  -- Target must be the opponent
  IF v_bounty.target_id NOT IN (v_debate.debater_a, v_debate.debater_b)
  OR v_bounty.target_id = v_hunter_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bounty target is not your opponent in this debate');
  END IF;

  -- Check hunter hasn't already claimed a bounty in this debate
  SELECT EXISTS (
    SELECT 1 FROM bounty_attempts
    WHERE debate_id = p_debate_id AND hunter_id = v_hunter_id
  ) INTO v_already;

  IF v_already THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already selected a bounty for this debate');
  END IF;

  -- Charge attempt fee
  v_attempt_fee := round(v_bounty.amount * 0.05, 2);

  SELECT token_balance INTO v_balance
  FROM profiles WHERE id = v_hunter_id;

  IF v_balance < v_attempt_fee THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Insufficient tokens for attempt fee (%s)', v_attempt_fee)
    );
  END IF;

  UPDATE profiles
  SET token_balance = token_balance - v_attempt_fee
  WHERE id = v_hunter_id;

  -- Lock in the attempt
  INSERT INTO bounty_attempts (bounty_id, hunter_id, debate_id, attempt_fee)
  VALUES (p_bounty_id, v_hunter_id, p_debate_id, v_attempt_fee);

  RETURN jsonb_build_object(
    'success',      true,
    'attempt_fee',  v_attempt_fee,
    'bounty_amount', v_bounty.amount
  );
END;
$$;


-- ============================================================
-- RPC: resolve_bounty_attempt
-- Called by update_arena_debate (or equivalent resolve RPC)
-- after a ranked debate completes.
-- Pass the debate_id and winner_id (NULL = draw/null).
-- Finds any locked attempt for this debate, settles it.
--   Hunter win  → hunter gets face_value * 0.95, bounty claimed
--   Hunter loss → attempt fee already burned, bounty stays open
--   Draw/null   → no payout, attempt logged as lost, bounty stays open
-- ============================================================

CREATE OR REPLACE FUNCTION resolve_bounty_attempt(
  p_debate_id UUID,
  p_winner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_attempt  RECORD;
  v_bounty   RECORD;
  v_payout   NUMERIC;
BEGIN
  -- Find any attempt for this debate
  SELECT ba.id, ba.bounty_id, ba.hunter_id, ba.attempt_fee
  INTO v_attempt
  FROM bounty_attempts ba
  WHERE ba.debate_id = p_debate_id
    AND ba.outcome IS NULL   -- not yet settled
  LIMIT 1;

  IF v_attempt.id IS NULL THEN
    RETURN;  -- No bounty attempt in this debate
  END IF;

  SELECT id, amount, status
  INTO v_bounty
  FROM bounties
  WHERE id = v_attempt.bounty_id;

  IF v_bounty.status <> 'open' THEN
    -- Bounty already claimed/expired/cancelled since attempt was locked
    UPDATE bounty_attempts SET outcome = 'lost' WHERE id = v_attempt.id;
    RETURN;
  END IF;

  IF p_winner_id = v_attempt.hunter_id THEN
    -- Hunter won — pay out face value minus 5% platform cut
    v_payout := round(v_bounty.amount * 0.95, 2);

    UPDATE profiles
    SET token_balance = token_balance + v_payout
    WHERE id = v_attempt.hunter_id;

    UPDATE bounty_attempts
    SET outcome = 'won', payout = v_payout
    WHERE id = v_attempt.id;

    UPDATE bounties
    SET status = 'claimed', claimed_at = now()
    WHERE id = v_bounty.id;

  ELSE
    -- Hunter lost or draw — attempt fee already burned, bounty stays open
    UPDATE bounty_attempts
    SET outcome = 'lost', payout = 0
    WHERE id = v_attempt.id;
  END IF;
END;
$$;


-- ============================================================
-- TRIGGER: auto-cancel open bounties when rival is removed
-- If a poster removes a target from their rivals list while
-- a bounty is open → bounty auto-cancels, ZERO refund.
-- ============================================================

CREATE OR REPLACE FUNCTION _cancel_bounties_on_rival_remove()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Fires on DELETE of a rivals row or when status goes inactive
  UPDATE bounties
  SET status = 'cancelled', cancelled_at = now()
  WHERE poster_id = OLD.user_id
    AND target_id = OLD.rival_id
    AND status = 'open';

  RETURN OLD;
END;
$$;

-- On hard-delete of rival row
DROP TRIGGER IF EXISTS trg_bounty_cancel_rival_delete ON rivals;
CREATE TRIGGER trg_bounty_cancel_rival_delete
  AFTER DELETE ON rivals
  FOR EACH ROW
  EXECUTE FUNCTION _cancel_bounties_on_rival_remove();

-- On status change to anything other than pending/active (e.g. removed/rejected)
DROP TRIGGER IF EXISTS trg_bounty_cancel_rival_status ON rivals;
CREATE TRIGGER trg_bounty_cancel_rival_status
  AFTER UPDATE OF status ON rivals
  FOR EACH ROW
  WHEN (OLD.status IN ('pending', 'active') AND NEW.status NOT IN ('pending', 'active'))
  EXECUTE FUNCTION _cancel_bounties_on_rival_remove();


-- ============================================================
-- RPC: get_bounty_dot_user_ids
-- Returns the set of user_ids that currently have at least
-- one open bounty on them. Used to render gold dots universally.
-- Clients call this once on page load / poll every 60s.
-- ============================================================

CREATE OR REPLACE FUNCTION get_bounty_dot_user_ids()
RETURNS TABLE (user_id UUID)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM _expire_stale_bounties();

  RETURN QUERY
  SELECT DISTINCT b.target_id AS user_id
  FROM bounties b
  WHERE b.status = 'open';
END;
$$;


-- ============================================================
-- RPC: get_user_bounty_dot
-- Single-user check for inline callsites that already have
-- a specific user_id (profile pages, arena lobby, etc.).
-- Returns true if user has ≥1 open incoming bounty.
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_bounty_dot(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bounties
    WHERE target_id = p_user_id
      AND status = 'open'
      AND expires_at >= now()
  );
END;
$$;
