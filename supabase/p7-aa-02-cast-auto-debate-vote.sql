-- P7-AA-02: Rebuild cast_auto_debate_vote RPC (dropped in S249)
-- Creates votes tracking table + SECURITY DEFINER RPC for persisting votes
-- Supports both authenticated (user_id dedup) and anonymous (fingerprint dedup) voting

CREATE TABLE IF NOT EXISTS auto_debate_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES auto_debates(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  fingerprint text,
  side text NOT NULL CHECK (side IN ('a', 'b')),
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (debate_id, user_id),
  UNIQUE (debate_id, fingerprint)
);

ALTER TABLE auto_debate_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auto_debate_votes_select_own" ON auto_debate_votes
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_auto_debate_votes_debate_user ON auto_debate_votes(debate_id, user_id);
CREATE INDEX IF NOT EXISTS idx_auto_debate_votes_debate_fp ON auto_debate_votes(debate_id, fingerprint);

CREATE OR REPLACE FUNCTION cast_auto_debate_vote(
  p_debate_id uuid,
  p_side text,
  p_fingerprint text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_debate auto_debates;
  v_existing_id uuid;
BEGIN
  -- Validate side
  IF p_side NOT IN ('a', 'b') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_side');
  END IF;

  -- Check debate exists and is active
  SELECT * INTO v_debate FROM auto_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'debate_not_found');
  END IF;

  -- Check for duplicate vote by user_id (if logged in)
  IF v_uid IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM auto_debate_votes
      WHERE debate_id = p_debate_id AND user_id = v_uid;
    IF v_existing_id IS NOT NULL THEN
      RETURN json_build_object(
        'success', false, 'error', 'already_voted',
        'votes_a', v_debate.votes_a, 'votes_b', v_debate.votes_b,
        'vote_count', v_debate.vote_count
      );
    END IF;
  END IF;

  -- Check for duplicate vote by fingerprint (anonymous or extra dedup)
  IF p_fingerprint IS NOT NULL AND p_fingerprint != '' THEN
    SELECT id INTO v_existing_id FROM auto_debate_votes
      WHERE debate_id = p_debate_id AND fingerprint = p_fingerprint;
    IF v_existing_id IS NOT NULL THEN
      RETURN json_build_object(
        'success', false, 'error', 'already_voted',
        'votes_a', v_debate.votes_a, 'votes_b', v_debate.votes_b,
        'vote_count', v_debate.vote_count
      );
    END IF;
  END IF;

  -- Insert vote record
  INSERT INTO auto_debate_votes (debate_id, user_id, fingerprint, side)
  VALUES (p_debate_id, v_uid, NULLIF(p_fingerprint, ''), p_side);

  -- Increment counters on auto_debates
  UPDATE auto_debates SET
    votes_a = votes_a + CASE WHEN p_side = 'a' THEN 1 ELSE 0 END,
    votes_b = votes_b + CASE WHEN p_side = 'b' THEN 1 ELSE 0 END,
    vote_count = vote_count + 1,
    updated_at = now()
  WHERE id = p_debate_id
  RETURNING votes_a, votes_b, vote_count INTO
    v_debate.votes_a, v_debate.votes_b, v_debate.vote_count;

  RETURN json_build_object(
    'success', true,
    'votes_a', v_debate.votes_a,
    'votes_b', v_debate.votes_b,
    'vote_count', v_debate.vote_count
  );
END;
$$;
