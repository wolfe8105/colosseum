-- F-02: Match Found Accept/Decline — SQL Migration
-- Session 167-168
-- Run in Supabase SQL Editor (single execution)

-- 1. Add ready columns to arena_debates
ALTER TABLE arena_debates ADD COLUMN IF NOT EXISTS player_a_ready BOOLEAN DEFAULT NULL;
ALTER TABLE arena_debates ADD COLUMN IF NOT EXISTS player_b_ready BOOLEAN DEFAULT NULL;

-- 2. respond_to_match — player accepts or declines
CREATE OR REPLACE FUNCTION respond_to_match(p_debate_id UUID, p_accept BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row arena_debates%ROWTYPE;
  v_caller UUID := auth.uid();
BEGIN
  -- Lock the row
  SELECT * INTO v_row FROM arena_debates WHERE id = p_debate_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- Auth: caller must be player_a or player_b
  IF v_caller IS DISTINCT FROM v_row.player_a AND v_caller IS DISTINCT FROM v_row.player_b THEN
    RAISE EXCEPTION 'Not a participant in this debate';
  END IF;

  -- Set the caller's ready column
  IF v_caller = v_row.player_a THEN
    -- Idempotent: skip if already set
    IF v_row.player_a_ready IS NOT NULL THEN RETURN; END IF;
    UPDATE arena_debates SET player_a_ready = p_accept WHERE id = p_debate_id;
  ELSE
    IF v_row.player_b_ready IS NOT NULL THEN RETURN; END IF;
    UPDATE arena_debates SET player_b_ready = p_accept WHERE id = p_debate_id;
  END IF;

  -- If declining, cancel the debate
  IF NOT p_accept THEN
    UPDATE arena_debates SET status = 'cancelled' WHERE id = p_debate_id AND status = 'pending';
  END IF;
END;
$$;

-- 3. check_match_acceptance — polling RPC returns ready state
CREATE OR REPLACE FUNCTION check_match_acceptance(p_debate_id UUID)
RETURNS TABLE(player_a_ready BOOLEAN, player_b_ready BOOLEAN, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_row arena_debates%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM arena_debates WHERE id = p_debate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- Auth: caller must be player_a or player_b
  IF v_caller IS DISTINCT FROM v_row.player_a AND v_caller IS DISTINCT FROM v_row.player_b THEN
    RAISE EXCEPTION 'Not a participant in this debate';
  END IF;

  RETURN QUERY SELECT v_row.player_a_ready, v_row.player_b_ready, v_row.status::TEXT;
END;
$$;

-- 4. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION respond_to_match(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION check_match_acceptance(UUID) TO authenticated;
