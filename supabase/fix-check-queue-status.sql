-- Fix: check_queue_status — record "v_opponent" is not assigned yet
-- When user is in queue but NOT matched (status='waiting'), the original
-- function used a record type for opponent data. Accessing fields on an
-- uninitialized record throws: "record is not assigned yet".
-- Fix: use individual scalar variables that default to NULL.

CREATE OR REPLACE FUNCTION check_queue_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry record;
  v_opponent_name text;
  v_opponent_username text;
  v_opponent_elo int;
  v_queue_count int;
  v_lang text;
BEGIN
  SELECT * INTO v_entry FROM debate_queue
    WHERE user_id = auth.uid() AND status IN ('waiting', 'matched')
    ORDER BY joined_at DESC LIMIT 1;

  IF v_entry IS NULL THEN
    RETURN json_build_object('status', 'none');
  END IF;

  IF v_entry.status = 'matched' AND v_entry.matched_with IS NOT NULL THEN
    SELECT display_name, username, elo_rating
      INTO v_opponent_name, v_opponent_username, v_opponent_elo
      FROM profiles WHERE id = v_entry.matched_with;
  END IF;

  -- Fetch debate language when matched
  IF v_entry.status = 'matched' AND v_entry.debate_id IS NOT NULL THEN
    SELECT ad.language INTO v_lang FROM arena_debates ad WHERE ad.id = v_entry.debate_id;
  END IF;

  -- Count others in queue with same mode/ruleset/ranked
  SELECT count(*) INTO v_queue_count FROM debate_queue
    WHERE status = 'waiting'
      AND mode = v_entry.mode
      AND COALESCE(ruleset, 'amplified') = COALESCE(v_entry.ruleset, 'amplified')
      AND COALESCE(ranked, false) = COALESCE(v_entry.ranked, false)
      AND user_id != auth.uid();

  RETURN json_build_object(
    'status', v_entry.status,
    'queue_id', v_entry.id,
    'mode', v_entry.mode,
    'debate_id', v_entry.debate_id,
    'matched_with', v_entry.matched_with,
    'opponent_name', v_opponent_name,
    'opponent_username', v_opponent_username,
    'opponent_elo', v_opponent_elo,
    'role', 'a',
    'ruleset', COALESCE(v_entry.ruleset, 'amplified'),
    'queue_count', v_queue_count,
    'total_rounds', COALESCE(v_entry.total_rounds, 4),
    'language', COALESCE(v_lang, 'en')
  );
END;
$$;
