-- Session 234: AI Scorecard Persistence
-- Persists the 4-criteria AI scorecard (Logic/Evidence/Delivery/Rebuttal) so replays can display it.

-- 1. Add column
ALTER TABLE arena_debates ADD COLUMN IF NOT EXISTS ai_scorecard JSONB DEFAULT NULL;

-- 2. Save RPC — called by client after AI scoring completes
CREATE OR REPLACE FUNCTION public.save_ai_scorecard(
  p_debate_id UUID,
  p_scorecard JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_debate RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT debater_a, debater_b, status
  INTO v_debate
  FROM arena_debates
  WHERE id = p_debate_id;

  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  IF v_uid != v_debate.debater_a AND v_uid != v_debate.debater_b THEN
    RAISE EXCEPTION 'Not a participant in this debate';
  END IF;

  IF v_debate.status NOT IN ('complete', 'completed') THEN
    RAISE EXCEPTION 'Debate not complete';
  END IF;

  UPDATE arena_debates
  SET ai_scorecard = p_scorecard
  WHERE id = p_debate_id
    AND ai_scorecard IS NULL; -- Don't overwrite if already saved (idempotent)
END;
$function$;

-- 3. Updated get_arena_debate_spectator — adds ai_scorecard to return object
-- Includes session 233 additions: moderator_id, moderator_name, ruleset
CREATE OR REPLACE FUNCTION public.get_arena_debate_spectator(p_debate_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'id', ad.id,
    'topic', ad.topic,
    'mode', ad.mode,
    'status', ad.status,
    'category', ad.category,
    'current_round', ad.current_round,
    'total_rounds', ad.total_rounds,
    'winner', ad.winner,
    'score_a', ad.score_a,
    'score_b', ad.score_b,
    'spectator_count', ad.spectator_count,
    'vote_count_a', ad.vote_count_a,
    'vote_count_b', ad.vote_count_b,
    'moderator_type', ad.moderator_type,
    'moderator_id', ad.moderator_id,
    'moderator_name', COALESCE(pm.display_name, pm.username),
    'ruleset', COALESCE(ad.ruleset, 'amplified'),
    'is_ranked', ad.format,
    'created_at', ad.created_at,
    'started_at', ad.started_at,
    'ended_at', ad.ended_at,
    'debater_a_name', COALESCE(pa.display_name, pa.username, 'Side A'),
    'debater_a_elo', COALESCE(pa.elo_rating, 1200),
    'debater_a_avatar', pa.avatar_url,
    'debater_b_name', COALESCE(pb.display_name, pb.username, 'Side B'),
    'debater_b_elo', COALESCE(pb.elo_rating, 1200),
    'debater_b_avatar', pb.avatar_url,
    'ai_scorecard', ad.ai_scorecard
  ) INTO v_result
  FROM arena_debates ad
    LEFT JOIN profiles pa ON pa.id = ad.debater_a
    LEFT JOIN profiles pb ON pb.id = ad.debater_b
    LEFT JOIN profiles pm ON pm.id = ad.moderator_id
  WHERE ad.id = p_debate_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  RETURN v_result;
END;
$function$;
