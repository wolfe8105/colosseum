-- ============================================================
-- F-26: Follow Notifications
-- Session 274
--
-- Two triggers:
--   1. notify_followers_online(p_user_id) — called client-side on
--      login. Fans out 'follow_online' notifications to all followers.
--      Respects privacy_online setting. 6-hour dedup per follower pair.
--
--   2. add_debate_to_archive rebuilt — fans out 'follow_debate'
--      notifications to all followers when a debate is archived.
--      Respects notif_follow setting. 1-per-debate dedup.
-- ============================================================

-- ── 1. notify_followers_online RPC ──────────────────────────

DROP FUNCTION IF EXISTS public.notify_followers_online(uuid);

CREATE OR REPLACE FUNCTION public.notify_followers_online(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_display_name TEXT;
  v_privacy_online BOOLEAN := true;
  v_notif_count  INTEGER := 0;
BEGIN
  -- Caller must be the user themselves (or system context)
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  -- Respect user's privacy_online setting
  SELECT COALESCE(privacy_online, true)
  INTO v_privacy_online
  FROM user_settings
  WHERE user_id = p_user_id;

  IF NOT v_privacy_online THEN
    RETURN json_build_object('success', true, 'notified', 0, 'reason', 'privacy_online off');
  END IF;

  -- Get display name
  SELECT COALESCE(display_name, username, 'Someone')
  INTO v_display_name
  FROM profiles
  WHERE id = p_user_id;

  -- Fan out to all followers who:
  --   (a) have notif_follow = true (or no settings row yet — defaults true)
  --   (b) have NOT received a follow_online notif from this user in the last 6 hours
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT
    f.follower_id,
    'follow_online',
    v_display_name || ' is online',
    'Head to the arena and challenge them.',
    jsonb_build_object('subject_id', p_user_id, 'display_name', v_display_name)
  FROM follows f
  LEFT JOIN user_settings us ON us.user_id = f.follower_id
  WHERE f.following_id = p_user_id
    AND COALESCE(us.notif_follow, true) = true
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = f.follower_id
        AND n.type = 'follow_online'
        AND (n.data->>'subject_id') = p_user_id::text
        AND n.created_at > NOW() - INTERVAL '6 hours'
    );

  GET DIAGNOSTICS v_notif_count = ROW_COUNT;

  RETURN json_build_object('success', true, 'notified', v_notif_count);
END;
$$;

-- ── 2. Rebuild add_debate_to_archive with follow fan-out ─────

DROP FUNCTION IF EXISTS public.add_debate_to_archive(uuid, text, text);

CREATE OR REPLACE FUNCTION public.add_debate_to_archive(
  p_debate_id   UUID,
  p_custom_name TEXT DEFAULT NULL,
  p_custom_desc TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_entry_id     UUID;
  v_display_name TEXT;
  v_already      BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  -- Verify user participated
  IF NOT EXISTS (
    SELECT 1 FROM arena_debates
    WHERE id = p_debate_id
      AND (debater_a = v_uid OR debater_b = v_uid)
      AND status = 'complete'
  ) THEN
    RAISE EXCEPTION 'debate_not_eligible';
  END IF;

  -- Check if already archived (idempotent)
  SELECT EXISTS (
    SELECT 1 FROM profile_debate_archive_entries
    WHERE user_id = v_uid AND debate_id = p_debate_id
  ) INTO v_already;

  INSERT INTO profile_debate_archive_entries (user_id, debate_id, custom_name, custom_desc)
  VALUES (v_uid, p_debate_id, p_custom_name, p_custom_desc)
  ON CONFLICT (user_id, debate_id) DO NOTHING
  RETURNING id INTO v_entry_id;

  -- F-26: Notify followers of new archived debate (only on first archive, not re-archive)
  IF NOT v_already AND v_entry_id IS NOT NULL THEN
    SELECT COALESCE(display_name, username, 'Someone')
    INTO v_display_name
    FROM profiles
    WHERE id = v_uid;

    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT
      f.follower_id,
      'follow_debate',
      v_display_name || ' added a debate',
      COALESCE(p_custom_name, 'New debate in their archive'),
      jsonb_build_object(
        'subject_id',  v_uid,
        'debate_id',   p_debate_id,
        'display_name', v_display_name
      )
    FROM follows f
    LEFT JOIN user_settings us ON us.user_id = f.follower_id
    WHERE f.following_id = v_uid
      AND COALESCE(us.notif_follow, true) = true;
  END IF;

  RETURN v_entry_id;
END;
$$;
