-- SESSION 277 — F-05: Inline Point Awards in Replay Viewer
--
-- SCOPE: Extend get_debate_replay_data with two new buckets:
--   point_awards  — debate_feed_events WHERE event_type = 'point_award'
--                   metadata already carries base_score / in_debate_multiplier /
--                   in_debate_flat / final_contribution / scored_event_id from S267.
--   speech_events — debate_feed_events WHERE event_type = 'speech'
--                   For F-51 live moderated debates, all dialogue lives in
--                   debate_feed_events, not debate_messages. The replay viewer
--                   previously showed nothing for these debates. speech_events
--                   gives the client the content it needs, keyed by the same IDs
--                   that point_awards reference via scored_event_id.
--
-- BACKWARD COMPATIBLE: Old fields (power_ups, references, mod_scores) unchanged.
-- Old debates with no feed events get empty arrays for both new buckets.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_debate_replay_data(p_debate_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$

DECLARE
  v_power_ups     json;
  v_references    json;
  v_mod_scores    json;
  v_point_awards  json;
  v_speech_events json;
  v_debate        arena_debates%ROWTYPE;
BEGIN
  -- Verify debate exists
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- Activated power-ups (only show activated ones, with user display name and side)
  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.activated_at ASC), '[]'::json)
  INTO v_power_ups
  FROM (
    SELECT
      dp.power_up_id,
      dp.user_id,
      dp.activated_at,
      pu.name AS power_up_name,
      pu.icon AS power_up_icon,
      COALESCE(p.display_name, p.username, 'Unknown') AS user_name,
      CASE
        WHEN dp.user_id = v_debate.debater_a THEN 'a'
        WHEN dp.user_id = v_debate.debater_b THEN 'b'
        ELSE 'unknown'
      END AS side
    FROM debate_power_ups dp
    JOIN power_ups pu ON pu.id = dp.power_up_id
    LEFT JOIN profiles p ON p.id = dp.user_id
    WHERE dp.debate_id = p_debate_id
      AND dp.activated = true
      AND dp.activated_at IS NOT NULL
  ) r;

  -- References with rulings
  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.created_at ASC), '[]'::json)
  INTO v_references
  FROM (
    SELECT
      dr.id,
      dr.submitter_id,
      dr.round,
      dr.url,
      dr.description,
      dr.supports_side,
      dr.ruling,
      dr.ruling_reason,
      dr.created_at,
      dr.ruled_at,
      COALESCE(p.display_name, p.username, 'Unknown') AS submitter_name,
      CASE
        WHEN dr.submitter_id = v_debate.debater_a THEN 'a'
        WHEN dr.submitter_id = v_debate.debater_b THEN 'b'
        ELSE 'unknown'
      END AS side
    FROM debate_references dr
    LEFT JOIN profiles p ON p.id = dr.submitter_id
    WHERE dr.debate_id = p_debate_id
  ) r;

  -- Post-debate moderator scores
  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.created_at ASC), '[]'::json)
  INTO v_mod_scores
  FROM (
    SELECT
      ms.scorer_id,
      ms.scorer_role,
      ms.score,
      ms.created_at,
      COALESCE(p.display_name, p.username, 'Unknown') AS scorer_name
    FROM moderator_scores ms
    LEFT JOIN profiles p ON p.id = ms.scorer_id
    WHERE ms.debate_id = p_debate_id
  ) r;

  -- F-05: Point awards from F-51 scored feed events.
  -- metadata carries scored_event_id → links to the speech event that was scored.
  -- base_score / in_debate_multiplier / in_debate_flat / final_contribution
  -- all live in metadata (written by score_debate_comment, S267).
  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.created_at ASC), '[]'::json)
  INTO v_point_awards
  FROM (
    SELECT
      e.id::text         AS id,
      e.created_at,
      e.round,
      e.side,
      e.score            AS base_score,
      e.metadata
    FROM debate_feed_events e
    WHERE e.debate_id = p_debate_id
      AND e.event_type = 'point_award'
  ) r;

  -- F-05: Speech events from F-51 live moderated debates.
  -- For these debates dialogue lives in debate_feed_events (type='speech'),
  -- not debate_messages. Return them so the replay viewer can display the
  -- transcript and attach point awards inline via scored_event_id matching.
  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.created_at ASC), '[]'::json)
  INTO v_speech_events
  FROM (
    SELECT
      e.id::text         AS id,
      e.created_at,
      e.round,
      e.side,
      e.content,
      e.user_id::text    AS user_id,
      COALESCE(p.display_name, p.username, 'Debater') AS debater_name
    FROM debate_feed_events e
    LEFT JOIN profiles p ON p.id = e.user_id
    WHERE e.debate_id = p_debate_id
      AND e.event_type = 'speech'
  ) r;

  RETURN json_build_object(
    'power_ups',     v_power_ups,
    'references',    v_references,
    'mod_scores',    v_mod_scores,
    'point_awards',  v_point_awards,
    'speech_events', v_speech_events
  );
END;

$function$;

-- ────────────────────────────────────────────────────────────
-- DONE
-- Expected: no rows returned (CREATE OR REPLACE, no data changes).
--
-- Replaced: get_debate_replay_data — now returns 5 buckets:
--   power_ups, references, mod_scores (unchanged)
--   point_awards (new — from debate_feed_events type=point_award)
--   speech_events (new — from debate_feed_events type=speech)
--
-- SESSION: 277 (F-05 Replay Point Awards)
-- ────────────────────────────────────────────────────────────
