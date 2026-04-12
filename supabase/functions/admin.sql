-- THE MODERATOR — Deployed Functions Export
-- Auto-generated from Supabase production database
-- Last updated: Session 252 (April 9, 2026) — F-55 Reference System Overhaul landed
--
-- This file is the source of truth for what RPCs are live in production.
-- Re-export after any session that modifies RPCs.

-- Domain: admin

-- Functions: 10

-- Auto-generated from supabase-deployed-functions-export.sql


CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id uuid, p_action text, p_window_minutes integer, p_max_count integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
  v_lock_key BIGINT;
BEGIN
  -- Derive a stable integer lock key from user_id + action.
  -- hashtext() is fast and built-in. Casting to bigint keeps it in
  -- pg_advisory_xact_lock's expected range.
  v_lock_key := hashtext(p_user_id::TEXT || '|' || p_action);

  -- Acquire an exclusive advisory lock for this user+action pair.
  -- Any concurrent call with the same key blocks here until we commit.
  -- Lock is automatically released when this transaction ends.
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Compute the current window boundary
  v_window_start := date_trunc('minute', now())
    - (EXTRACT(MINUTE FROM now())::integer % p_window_minutes) * interval '1 minute';

  -- Upsert counter — now safe: only one transaction runs this at a time per user+action
  INSERT INTO public.rate_limits (user_id, action, window_start, count)
  VALUES (p_user_id, p_action, v_window_start, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_current_count;

  -- Lightweight housekeeping — prune stale windows
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '24 hours';

  RETURN v_current_count <= p_max_count;
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_app_config()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
AS $function$

  SELECT jsonb_object_agg(key, value) FROM app_config;

$function$;

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_sort_by text DEFAULT 'elo'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

BEGIN
  RETURN (
    SELECT json_agg(row_to_json(r))
    FROM (
      SELECT
        id,
        username,
        display_name,
        avatar_url,
        elo_rating,
        wins,
        losses,
        current_streak,
        best_streak,
        debates_completed,
        level,
        subscription_tier,
        ROW_NUMBER() OVER (
          ORDER BY
            CASE p_sort_by
              WHEN 'elo' THEN elo_rating
              WHEN 'wins' THEN wins
              WHEN 'streak' THEN current_streak
              ELSE elo_rating
            END DESC
        ) AS rank
      FROM public.profiles
      WHERE trust_score >= 50
        AND debates_completed > 0
      ORDER BY
        CASE p_sort_by
          WHEN 'elo' THEN elo_rating
          WHEN 'wins' THEN wins
          WHEN 'streak' THEN current_streak
          ELSE elo_rating
        END DESC
      LIMIT p_limit
      OFFSET p_offset
    ) r
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.jsonb_object_keys_count(j jsonb)
 RETURNS integer
 LANGUAGE sql
AS $function$

  SELECT COUNT(*)::INTEGER FROM jsonb_object_keys(j);

$function$;

CREATE OR REPLACE FUNCTION public.log_event(p_event_type text, p_user_id uuid DEFAULT NULL::uuid, p_debate_id uuid DEFAULT NULL::uuid, p_category text DEFAULT NULL::text, p_side text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

BEGIN
  INSERT INTO public.event_log (event_type, user_id, debate_id, category, side, metadata)
  VALUES (p_event_type, p_user_id, p_debate_id, p_category, p_side, p_metadata);
  -- Fire and forget. No return value. Never block the caller.
EXCEPTION WHEN OTHERS THEN
  -- Never let analytics break the app. Swallow errors.
  RAISE WARNING 'log_event failed: % %', SQLERRM, SQLSTATE;
END;

$function$;

CREATE OR REPLACE FUNCTION public.run_daily_snapshot()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_date DATE := CURRENT_DATE;
  v_count INTEGER := 0;
BEGIN
  -- Total users
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'total_users', (SELECT COUNT(*) FROM profiles WHERE deleted_at IS NULL))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Total debates
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'total_debates', (SELECT COUNT(*) FROM arena_debates WHERE status = 'complete'))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Total auto_debate votes
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'total_auto_votes', (SELECT COALESCE(SUM(vote_count), 0) FROM auto_debates))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Total moderator rulings
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'total_mod_rulings', (SELECT COUNT(*) FROM debate_references WHERE ruling != 'pending'))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Active moderators
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'active_moderators', (SELECT COUNT(*) FROM profiles WHERE is_moderator = true AND mod_available = true))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Events today
  INSERT INTO daily_snapshots (snapshot_date, metric, value)
  VALUES (v_date, 'events_today', (SELECT COUNT(*) FROM event_log WHERE created_at::DATE = v_date))
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;
  v_count := v_count + 1;

  -- Per-category debate counts
  INSERT INTO daily_snapshots (snapshot_date, category, metric, value)
  SELECT v_date, category, 'debates_today', COUNT(*)
  FROM event_log
  WHERE event_type IN ('debate_created', 'auto_debate_created')
    AND created_at::DATE = v_date
    AND category IS NOT NULL
  GROUP BY category
  ON CONFLICT (snapshot_date, category, metric) DO UPDATE SET value = EXCLUDED.value;

  RETURN v_count;
END;

$function$;

CREATE OR REPLACE FUNCTION public.sanitize_text(p_input text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$

DECLARE
  v_clean TEXT;
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;

  v_clean := p_input;

  -- Strip <script> tags and content
  v_clean := regexp_replace(v_clean, '<script[^>]*>.*?</script>', '', 'gi');

  -- Strip <iframe>, <object>, <embed>, <form>, <input> tags
  v_clean := regexp_replace(v_clean, '<(iframe|object|embed|form|input|textarea|button|select|link|meta|base|applet)[^>]*>.*?</\1>', '', 'gi');
  v_clean := regexp_replace(v_clean, '<(iframe|object|embed|form|input|textarea|button|select|link|meta|base|applet)[^>]*/?\s*>', '', 'gi');

  -- Strip all remaining HTML tags (keep text content)
  v_clean := regexp_replace(v_clean, '<[^>]+>', '', 'g');

  -- Strip javascript: and data: URI schemes
  v_clean := regexp_replace(v_clean, 'javascript\s*:', '', 'gi');
  v_clean := regexp_replace(v_clean, 'data\s*:\s*text/html', '', 'gi');
  v_clean := regexp_replace(v_clean, 'vbscript\s*:', '', 'gi');

  -- Strip on* event handlers (onerror=, onclick=, etc.)
  v_clean := regexp_replace(v_clean, '\bon\w+\s*=', '', 'gi');

  -- Encode remaining dangerous characters
  v_clean := replace(v_clean, '&', '&amp;');
  v_clean := replace(v_clean, '<', '&lt;');
  v_clean := replace(v_clean, '>', '&gt;');

  -- Trim whitespace
  v_clean := trim(v_clean);

  RETURN v_clean;
END;

$function$;

CREATE OR REPLACE FUNCTION public.sanitize_url(p_input text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$

BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;

  -- Must start with https:// or http://
  IF NOT (p_input ~* '^https?://') THEN
    RETURN NULL;  -- reject non-http URLs entirely
  END IF;

  -- Block javascript: inside URLs (encoded variants too)
  IF p_input ~* 'javascript' OR p_input ~* 'data:' OR p_input ~* 'vbscript' THEN
    RETURN NULL;
  END IF;

  -- Basic length check
  IF char_length(p_input) > 2000 THEN
    RETURN NULL;
  END IF;

  RETURN p_input;
END;

$function$;

CREATE OR REPLACE FUNCTION public.submit_report(p_reported_user_id uuid DEFAULT NULL::uuid, p_debate_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT ''::text, p_details text DEFAULT ''::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_clean_reason TEXT;
  v_clean_details TEXT;
  v_report_id UUID;
  v_allowed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_reported_user_id IS NULL AND p_debate_id IS NULL THEN
    RAISE EXCEPTION 'Must specify a user or debate to report';
  END IF;

  -- Sanitize
  v_clean_reason := sanitize_text(p_reason);
  v_clean_details := sanitize_text(p_details);

  IF char_length(v_clean_reason) < 3 THEN
    RAISE EXCEPTION 'Reason is required';
  END IF;

  IF p_reported_user_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot report yourself';
  END IF;

  -- Rate limit: 5 reports per hour
  v_allowed := check_rate_limit(v_user_id, 'report', 60, 5);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit: max 5 reports per hour';
  END IF;

  INSERT INTO public.reports (reporter_id, reported_user_id, debate_id, reason, details)
  VALUES (v_user_id, p_reported_user_id, p_debate_id, v_clean_reason, v_clean_details)
  RETURNING id INTO v_report_id;

  RETURN json_build_object('success', true, 'report_id', v_report_id);
END;

$function$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;

$function$;
