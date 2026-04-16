-- ████████████████████████████████████████████████████████████
-- THE COLOSSEUM — SESSION 34b: WIRE log_event() INTO RIVAL RPCs
-- Paste after colosseum-wire-log-event.sql (15th migration)
-- ████████████████████████████████████████████████████████████


-- ============================================================
-- 17. declare_rival → rival_declared
-- ============================================================
CREATE OR REPLACE FUNCTION declare_rival(
  p_target_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing RECORD;
  v_result RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  IF v_user_id = p_target_id THEN
    RETURN json_build_object('error', 'Cannot rival yourself');
  END IF;

  -- Check if rivalry already exists in either direction
  SELECT * INTO v_existing FROM rivals
    WHERE (challenger_id = v_user_id AND target_id = p_target_id)
       OR (challenger_id = p_target_id AND target_id = v_user_id)
    LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('error', 'Rivalry already exists', 'status', v_existing.status);
  END IF;

  -- Check max 5 active rivalries
  IF (SELECT count(*) FROM rivals WHERE (challenger_id = v_user_id OR target_id = v_user_id) AND status IN ('pending', 'accepted')) >= 5 THEN
    RETURN json_build_object('error', 'Max 5 active rivalries');
  END IF;

  INSERT INTO rivals (challenger_id, target_id, challenger_message)
  VALUES (v_user_id, p_target_id, p_message)
  RETURNING * INTO v_result;

  -- Analytics
  PERFORM log_event(
    'rival_declared',
    v_user_id,
    NULL,
    NULL,
    NULL,
    jsonb_build_object('target_user_id', p_target_id)
  );

  RETURN json_build_object('success', true, 'id', v_result.id, 'status', v_result.status);
END;
$$;


-- ============================================================
-- 18. respond_rival → rival_accepted (or declined)
-- ============================================================
CREATE OR REPLACE FUNCTION respond_rival(
  p_rival_id UUID,
  p_accept BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_rival RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO v_rival FROM rivals WHERE id = p_rival_id AND target_id = v_user_id AND status = 'pending';

  IF v_rival IS NULL THEN
    RETURN json_build_object('error', 'Rival request not found');
  END IF;

  IF p_accept THEN
    UPDATE rivals SET status = 'accepted', accepted_at = now() WHERE id = p_rival_id;

    -- Analytics
    PERFORM log_event(
      'rival_accepted',
      v_user_id,
      NULL,
      NULL,
      NULL,
      jsonb_build_object('target_user_id', v_rival.challenger_id)
    );

    RETURN json_build_object('success', true, 'status', 'accepted');
  ELSE
    UPDATE rivals SET status = 'declined' WHERE id = p_rival_id;
    RETURN json_build_object('success', true, 'status', 'declined');
  END IF;
END;
$$;


-- ████████████████████████████████████████████████████████████
-- DONE. 18/18 functions now wired to log_event().
-- Full event coverage across all RPCs in the codebase.
-- ████████████████████████████████████████████████████████████
