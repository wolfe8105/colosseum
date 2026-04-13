-- ============================================================
-- F-08: Tournament System
-- Session 278 | April 13, 2026
--
-- Singles only at launch. Single-elimination. ELO-seeded.
-- Min 8 / max 64 players, dynamic fill.
-- Highest ELO gets bye. Standard ranked debates.
-- Creator sets start time — auto-locks at that time.
-- Cancel before lock = full refund. No cancel after lock.
-- Prize: 70/20/10 of 85% winner pool. Platform 10%.
-- Mod pool 5% only when mod present (else 90/10).
-- Gate: profiles.verified_gladiator = true (F-33).
-- ============================================================


-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS tournaments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  category         TEXT        NOT NULL,
  entry_fee        NUMERIC     NOT NULL CHECK (entry_fee BETWEEN 10 AND 1000),
  status           TEXT        NOT NULL DEFAULT 'registration'
                               CHECK (status IN ('registration','locked','active','completed','cancelled')),
  starts_at        TIMESTAMPTZ NOT NULL,
  completed_at     TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  prize_pool       NUMERIC     NOT NULL DEFAULT 0 CHECK (prize_pool >= 0),
  player_count     INT         NOT NULL DEFAULT 0,
  max_players      INT         NOT NULL DEFAULT 64 CHECK (max_players BETWEEN 8 AND 64),
  winner_id        UUID        REFERENCES profiles(id),
  second_id        UUID        REFERENCES profiles(id),
  third_id         UUID        REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status     ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_starts_at  ON tournaments(starts_at) WHERE status = 'registration';
CREATE INDEX IF NOT EXISTS idx_tournaments_creator    ON tournaments(creator_id);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournaments_read" ON tournaments;
CREATE POLICY "tournaments_read"
  ON tournaments FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "tournaments_anon_read" ON tournaments;
CREATE POLICY "tournaments_anon_read"
  ON tournaments FOR SELECT TO anon
  USING (true);


-- ============================================================
-- tournament_entries: one row per registered player
-- ============================================================

CREATE TABLE IF NOT EXISTS tournament_entries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  elo_at_entry    INT         NOT NULL DEFAULT 1000,
  seed            INT,                             -- assigned at bracket lock
  entry_fee_paid  NUMERIC     NOT NULL DEFAULT 0,
  refunded        BOOLEAN     NOT NULL DEFAULT false,
  eliminated_at   TIMESTAMPTZ,
  final_placement INT,                             -- 1/2/3/null
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament ON tournament_entries(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_user       ON tournament_entries(user_id);

ALTER TABLE tournament_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournament_entries_read" ON tournament_entries;
CREATE POLICY "tournament_entries_read"
  ON tournament_entries FOR SELECT TO authenticated
  USING (true);


-- ============================================================
-- tournament_matches: bracket pairings
-- ============================================================

CREATE TABLE IF NOT EXISTS tournament_matches (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round           INT         NOT NULL,            -- 1 = first round, increases each round
  match_slot      INT         NOT NULL,            -- position within the round
  player_a_id     UUID        REFERENCES profiles(id),
  player_b_id     UUID        REFERENCES profiles(id),
  debate_id       UUID        REFERENCES arena_debates(id),
  winner_id       UUID        REFERENCES profiles(id),
  is_bye          BOOLEAN     NOT NULL DEFAULT false,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','active','completed','forfeited')),
  forfeit_at      TIMESTAMPTZ,                     -- auto-forfeit deadline (debate start + 10 min)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, round, match_slot)
);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_debate     ON tournament_matches(debate_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_players    ON tournament_matches(player_a_id, player_b_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_status     ON tournament_matches(status) WHERE status = 'pending';

ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournament_matches_read" ON tournament_matches;
CREATE POLICY "tournament_matches_read"
  ON tournament_matches FOR SELECT TO authenticated
  USING (true);


-- ============================================================
-- 2. arena_debates — add tournament_match_id FK
-- ============================================================

ALTER TABLE arena_debates
  ADD COLUMN IF NOT EXISTS tournament_match_id UUID REFERENCES tournament_matches(id);

CREATE INDEX IF NOT EXISTS idx_arena_debates_tournament_match
  ON arena_debates(tournament_match_id) WHERE tournament_match_id IS NOT NULL;


-- ============================================================
-- 3. RPCs
-- ============================================================

-- ============================================================
-- create_tournament
-- Gate: verified_gladiator = true
-- Deducts no tokens at creation — entry fees deducted on join
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_tournament(
  p_title       TEXT,
  p_category    TEXT,
  p_entry_fee   NUMERIC,
  p_starts_at   TIMESTAMPTZ,
  p_max_players INT DEFAULT 64
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_vg      BOOLEAN;
  v_id      UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT verified_gladiator INTO v_vg FROM profiles WHERE id = v_user_id;
  IF NOT v_vg THEN
    RETURN jsonb_build_object('error', 'Verified Gladiator badge required');
  END IF;

  IF p_entry_fee < 10 OR p_entry_fee > 1000 THEN
    RETURN jsonb_build_object('error', 'Entry fee must be between 10 and 1000 tokens');
  END IF;

  IF p_max_players < 8 OR p_max_players > 64 THEN
    RETURN jsonb_build_object('error', 'Max players must be between 8 and 64');
  END IF;

  IF p_starts_at <= now() + interval '10 minutes' THEN
    RETURN jsonb_build_object('error', 'Start time must be at least 10 minutes from now');
  END IF;

  INSERT INTO tournaments (creator_id, title, category, entry_fee, starts_at, max_players)
  VALUES (v_user_id, p_title, p_category, p_entry_fee, p_starts_at, p_max_players)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('tournament_id', v_id, 'success', true);
END;
$$;


-- ============================================================
-- join_tournament
-- Deducts entry fee, adds entry row, updates prize pool
-- ============================================================

CREATE OR REPLACE FUNCTION public.join_tournament(
  p_tournament_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_t          tournaments%ROWTYPE;
  v_balance    NUMERIC;
  v_elo        INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO v_t FROM tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Tournament not found');
  END IF;
  IF v_t.status != 'registration' THEN
    RETURN jsonb_build_object('error', 'Registration is closed');
  END IF;
  IF v_t.starts_at <= now() THEN
    RETURN jsonb_build_object('error', 'Tournament has already started');
  END IF;
  IF v_t.player_count >= v_t.max_players THEN
    RETURN jsonb_build_object('error', 'Tournament is full');
  END IF;

  -- Check not already entered
  IF EXISTS (SELECT 1 FROM tournament_entries WHERE tournament_id = p_tournament_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('error', 'Already entered');
  END IF;

  -- Deduct entry fee
  SELECT token_balance INTO v_balance FROM profiles WHERE id = v_user_id FOR UPDATE;
  IF v_balance < v_t.entry_fee THEN
    RETURN jsonb_build_object('error', 'Insufficient tokens');
  END IF;

  SELECT COALESCE(elo_score, 1000) INTO v_elo FROM profiles WHERE id = v_user_id;

  UPDATE profiles SET token_balance = token_balance - v_t.entry_fee WHERE id = v_user_id;

  INSERT INTO tournament_entries (tournament_id, user_id, elo_at_entry, entry_fee_paid)
  VALUES (p_tournament_id, v_user_id, v_elo, v_t.entry_fee);

  UPDATE tournaments
  SET prize_pool = prize_pool + v_t.entry_fee,
      player_count = player_count + 1
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object('success', true, 'prize_pool', v_t.prize_pool + v_t.entry_fee);
END;
$$;


-- ============================================================
-- cancel_tournament
-- Only before lock. Full refund to all entrants.
-- ============================================================

CREATE OR REPLACE FUNCTION public.cancel_tournament(
  p_tournament_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_t       tournaments%ROWTYPE;
  v_entry   tournament_entries%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO v_t FROM tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Not found'); END IF;
  IF v_t.creator_id != v_user_id THEN
    RETURN jsonb_build_object('error', 'Only creator can cancel');
  END IF;
  IF v_t.status NOT IN ('registration') THEN
    RETURN jsonb_build_object('error', 'Cannot cancel after bracket locks');
  END IF;

  -- Refund all entrants
  FOR v_entry IN
    SELECT * FROM tournament_entries
    WHERE tournament_id = p_tournament_id AND refunded = false
  LOOP
    UPDATE profiles
    SET token_balance = token_balance + v_entry.entry_fee_paid
    WHERE id = v_entry.user_id;

    UPDATE tournament_entries SET refunded = true
    WHERE id = v_entry.id;
  END LOOP;

  UPDATE tournaments
  SET status = 'cancelled', cancelled_at = now(), prize_pool = 0
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- ============================================================
-- lock_tournament_bracket
-- Called by cron or manually at starts_at.
-- If < 8 players: cancel + full refund.
-- Generates bracket with ELO seeding + bye assignment.
-- ============================================================

CREATE OR REPLACE FUNCTION public.lock_tournament_bracket(
  p_tournament_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_t           tournaments%ROWTYPE;
  v_entries     tournament_entries[];
  v_entry       tournament_entries%ROWTYPE;
  v_count       INT;
  v_round_size  INT;
  v_byes        INT;
  v_seed        INT := 1;
  v_slot        INT;
  v_match_round INT := 1;
  v_a_id        UUID;
  v_b_id        UUID;
  v_seeded      UUID[];
BEGIN
  SELECT * INTO v_t FROM tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Not found'); END IF;
  IF v_t.status != 'registration' THEN
    RETURN jsonb_build_object('error', 'Already locked');
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM tournament_entries WHERE tournament_id = p_tournament_id;

  -- Below minimum — cancel and refund
  IF v_count < 8 THEN
    FOR v_entry IN
      SELECT * FROM tournament_entries WHERE tournament_id = p_tournament_id AND refunded = false
    LOOP
      UPDATE profiles SET token_balance = token_balance + v_entry.entry_fee_paid WHERE id = v_entry.user_id;
      UPDATE tournament_entries SET refunded = true WHERE id = v_entry.id;
    END LOOP;
    UPDATE tournaments SET status = 'cancelled', cancelled_at = now(), prize_pool = 0 WHERE id = p_tournament_id;
    RETURN jsonb_build_object('cancelled', true, 'reason', 'Insufficient players');
  END IF;

  -- Assign seeds by ELO descending (highest ELO = seed 1 = gets bye)
  FOR v_entry IN
    SELECT * FROM tournament_entries
    WHERE tournament_id = p_tournament_id
    ORDER BY elo_at_entry DESC
  LOOP
    UPDATE tournament_entries SET seed = v_seed WHERE id = v_entry.id;
    v_seed := v_seed + 1;
  END LOOP;

  -- Calculate bracket size (next power of 2 >= player count)
  v_round_size := 8;
  WHILE v_round_size < v_count LOOP
    v_round_size := v_round_size * 2;
  END LOOP;
  v_byes := v_round_size - v_count;

  -- Build seeded player array ordered by seed
  SELECT ARRAY(
    SELECT user_id FROM tournament_entries
    WHERE tournament_id = p_tournament_id
    ORDER BY seed ASC
  ) INTO v_seeded;

  -- Generate round 1 matches
  -- Top seeds get byes first. Pairing: seed 1 vs seed N, seed 2 vs seed N-1...
  v_slot := 1;
  FOR i IN 1..v_round_size/2 LOOP
    v_a_id := v_seeded[i];
    v_b_id := v_seeded[v_round_size + 1 - i];

    IF v_b_id IS NULL THEN
      -- Bye match — player a advances automatically
      INSERT INTO tournament_matches (tournament_id, round, match_slot, player_a_id, is_bye, status, winner_id)
      VALUES (p_tournament_id, 1, v_slot, v_a_id, true, 'completed', v_a_id);
    ELSE
      INSERT INTO tournament_matches (tournament_id, round, match_slot, player_a_id, player_b_id, status)
      VALUES (p_tournament_id, 1, v_slot, v_a_id, v_b_id, 'pending');
    END IF;

    v_slot := v_slot + 1;
  END LOOP;

  -- Lock the tournament
  UPDATE tournaments SET status = 'locked' WHERE id = p_tournament_id;

  RETURN jsonb_build_object('success', true, 'player_count', v_count, 'bracket_size', v_round_size, 'byes', v_byes);
END;
$$;


-- ============================================================
-- resolve_tournament_match
-- Called from arena-room-end.ts after a tournament debate ends.
-- Advances winner, generates next round if all matches done.
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolve_tournament_match(
  p_tournament_match_id UUID,
  p_winner_id           UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_match       tournament_matches%ROWTYPE;
  v_t           tournaments%ROWTYPE;
  v_round_done  BOOLEAN;
  v_next_round  INT;
  v_winners     UUID[];
  v_i           INT;
  v_slot        INT := 1;
  v_total_rounds INT;
BEGIN
  SELECT * INTO v_match FROM tournament_matches WHERE id = p_tournament_match_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Match not found'); END IF;
  IF v_match.status = 'completed' THEN RETURN jsonb_build_object('error', 'Already resolved'); END IF;

  SELECT * INTO v_t FROM tournaments WHERE id = v_match.tournament_id FOR UPDATE;

  -- Mark match complete
  UPDATE tournament_matches
  SET status = 'completed', winner_id = p_winner_id
  WHERE id = p_tournament_match_id;

  -- Mark loser eliminated
  UPDATE tournament_entries
  SET eliminated_at = now()
  WHERE tournament_id = v_match.tournament_id
    AND user_id = CASE WHEN p_winner_id = v_match.player_a_id
                       THEN v_match.player_b_id
                       ELSE v_match.player_a_id END;

  -- Check if all matches in this round are done
  SELECT NOT EXISTS (
    SELECT 1 FROM tournament_matches
    WHERE tournament_id = v_match.tournament_id
      AND round = v_match.round
      AND status NOT IN ('completed', 'forfeited')
  ) INTO v_round_done;

  IF NOT v_round_done THEN
    RETURN jsonb_build_object('success', true, 'round_complete', false);
  END IF;

  -- Collect round winners in slot order
  SELECT ARRAY(
    SELECT winner_id FROM tournament_matches
    WHERE tournament_id = v_match.tournament_id AND round = v_match.round
    ORDER BY match_slot ASC
  ) INTO v_winners;

  -- Final round — only 1 winner
  IF array_length(v_winners, 1) = 1 THEN
    -- Set 2nd and 3rd from the losing finalists and semis
    UPDATE tournaments
    SET status = 'completed',
        completed_at = now(),
        winner_id = v_winners[1]
    WHERE id = v_match.tournament_id;

    -- Record placements
    UPDATE tournament_entries SET final_placement = 1
    WHERE tournament_id = v_match.tournament_id AND user_id = v_winners[1];

    -- Pay out prizes
    PERFORM _settle_tournament_prizes(v_match.tournament_id);

    RETURN jsonb_build_object('success', true, 'tournament_complete', true);
  END IF;

  -- Generate next round pairings
  v_next_round := v_match.round + 1;
  v_slot := 1;
  v_i := 1;
  WHILE v_i <= array_length(v_winners, 1) LOOP
    INSERT INTO tournament_matches (tournament_id, round, match_slot, player_a_id, player_b_id, status)
    VALUES (v_match.tournament_id, v_next_round, v_slot, v_winners[v_i], v_winners[v_i + 1], 'pending');
    v_i := v_i + 2;
    v_slot := v_slot + 1;
  END LOOP;

  UPDATE tournaments SET status = 'active' WHERE id = v_match.tournament_id;

  RETURN jsonb_build_object('success', true, 'round_complete', true, 'next_round', v_next_round);
END;
$$;


-- ============================================================
-- _settle_tournament_prizes (internal helper)
-- 70/20/10 of 85% winner pool. Platform 10%.
-- Mod pool (5%) only if moderator present — else 90/10.
-- ============================================================

CREATE OR REPLACE FUNCTION public._settle_tournament_prizes(
  p_tournament_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_t           tournaments%ROWTYPE;
  v_pool        NUMERIC;
  v_winner_pool NUMERIC;
  v_first       NUMERIC;
  v_second      NUMERIC;
  v_third       NUMERIC;
  v_2nd_id      UUID;
  v_3rd_id      UUID;
BEGIN
  SELECT * INTO v_t FROM tournaments WHERE id = p_tournament_id;

  v_pool := v_t.prize_pool;

  -- No mod in standard ranked — 90% to winners, 10% platform (kept in pool)
  v_winner_pool := v_pool * 0.90;

  v_first  := ROUND(v_winner_pool * 0.70);
  v_second := ROUND(v_winner_pool * 0.20);
  v_third  := ROUND(v_winner_pool * 0.10);

  -- Get 2nd and 3rd from semifinal losers (highest seeds among eliminated)
  SELECT user_id INTO v_2nd_id
  FROM tournament_entries
  WHERE tournament_id = p_tournament_id
    AND eliminated_at IS NOT NULL
    AND user_id != v_t.winner_id
  ORDER BY seed ASC
  LIMIT 1;

  SELECT user_id INTO v_3rd_id
  FROM tournament_entries
  WHERE tournament_id = p_tournament_id
    AND eliminated_at IS NOT NULL
    AND user_id NOT IN (v_t.winner_id, COALESCE(v_2nd_id, gen_random_uuid()))
  ORDER BY seed ASC
  LIMIT 1;

  -- Pay out
  IF v_t.winner_id IS NOT NULL THEN
    UPDATE profiles SET token_balance = token_balance + v_first WHERE id = v_t.winner_id;
    UPDATE tournament_entries SET final_placement = 1 WHERE tournament_id = p_tournament_id AND user_id = v_t.winner_id;
  END IF;
  IF v_2nd_id IS NOT NULL THEN
    UPDATE profiles SET token_balance = token_balance + v_second WHERE id = v_2nd_id;
    UPDATE tournaments SET second_id = v_2nd_id WHERE id = p_tournament_id;
    UPDATE tournament_entries SET final_placement = 2 WHERE tournament_id = p_tournament_id AND user_id = v_2nd_id;
  END IF;
  IF v_3rd_id IS NOT NULL THEN
    UPDATE profiles SET token_balance = token_balance + v_third WHERE id = v_3rd_id;
    UPDATE tournaments SET third_id = v_3rd_id WHERE id = p_tournament_id;
    UPDATE tournament_entries SET final_placement = 3 WHERE tournament_id = p_tournament_id AND user_id = v_3rd_id;
  END IF;
END;
$$;


-- ============================================================
-- get_active_tournaments
-- Returns open tournaments for the feed/discovery view
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_active_tournaments(
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  title         TEXT,
  category      TEXT,
  entry_fee     NUMERIC,
  prize_pool    NUMERIC,
  player_count  INT,
  max_players   INT,
  starts_at     TIMESTAMPTZ,
  status        TEXT,
  is_entered    BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.category,
    t.entry_fee,
    t.prize_pool,
    t.player_count,
    t.max_players,
    t.starts_at,
    t.status,
    EXISTS (
      SELECT 1 FROM tournament_entries te
      WHERE te.tournament_id = t.id AND te.user_id = auth.uid()
    ) AS is_entered
  FROM tournaments t
  WHERE t.status IN ('registration', 'locked', 'active')
    AND (p_category IS NULL OR t.category = p_category)
  ORDER BY t.starts_at ASC;
END;
$$;


-- ============================================================
-- get_my_tournament_match
-- Returns the pending match for the current user, if any.
-- Used to trigger the gold dot notification.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_tournament_match()
RETURNS TABLE (
  match_id        UUID,
  tournament_id   UUID,
  tournament_title TEXT,
  round           INT,
  opponent_id     UUID,
  opponent_name   TEXT,
  prize_pool      NUMERIC,
  forfeit_at      TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    tm.id             AS match_id,
    tm.tournament_id,
    t.title           AS tournament_title,
    tm.round,
    CASE WHEN tm.player_a_id = auth.uid() THEN tm.player_b_id ELSE tm.player_a_id END AS opponent_id,
    p.username        AS opponent_name,
    t.prize_pool,
    tm.forfeit_at
  FROM tournament_matches tm
  JOIN tournaments t ON t.id = tm.tournament_id
  JOIN profiles p ON p.id = CASE WHEN tm.player_a_id = auth.uid() THEN tm.player_b_id ELSE tm.player_a_id END
  WHERE tm.status = 'pending'
    AND (tm.player_a_id = auth.uid() OR tm.player_b_id = auth.uid())
  LIMIT 1;
END;
$$;


-- ============================================================
-- get_tournament_bracket
-- Returns all matches for a tournament for bracket display
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_tournament_bracket(
  p_tournament_id UUID
)
RETURNS TABLE (
  match_id     UUID,
  round        INT,
  match_slot   INT,
  player_a_id  UUID,
  player_a_name TEXT,
  player_b_id  UUID,
  player_b_name TEXT,
  winner_id    UUID,
  is_bye       BOOLEAN,
  status       TEXT,
  debate_id    UUID
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    tm.id           AS match_id,
    tm.round,
    tm.match_slot,
    tm.player_a_id,
    pa.username     AS player_a_name,
    tm.player_b_id,
    pb.username     AS player_b_name,
    tm.winner_id,
    tm.is_bye,
    tm.status,
    tm.debate_id
  FROM tournament_matches tm
  LEFT JOIN profiles pa ON pa.id = tm.player_a_id
  LEFT JOIN profiles pb ON pb.id = tm.player_b_id
  WHERE tm.tournament_id = p_tournament_id
  ORDER BY tm.round ASC, tm.match_slot ASC;
END;
$$;
