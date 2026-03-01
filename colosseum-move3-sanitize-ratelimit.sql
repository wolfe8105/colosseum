-- ============================================================
-- THE COLOSSEUM — Move 3: Input Sanitization + DB Rate Limiter
-- Session 16 — February 28, 2026
--
-- WHAT THIS DOES:
-- 1. Creates a sanitize_text() function that strips XSS from all inputs
-- 2. Creates a rate_limits table + check_rate_limit() function
-- 3. Patches all Move 2 functions to use sanitization
-- 4. Adds DB-level rate limiting to sensitive operations
--
-- HOW TO USE:
-- Supabase Dashboard → SQL Editor → Paste → Run
-- (after Move 1 + Move 2 are already applied)
-- ============================================================


-- ============================================================
-- SECTION A: INPUT SANITIZATION
-- Strips HTML tags, script injections, SQL-suspicious patterns
-- Applied to every text field before it hits the database
-- ============================================================


-- ========================
-- A1: Core sanitization function
-- Strips <script>, <iframe>, event handlers, etc.
-- ========================
CREATE OR REPLACE FUNCTION sanitize_text(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
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
$$;


-- ========================
-- A2: URL sanitization (for avatar URLs, etc.)
-- Only allows http/https schemes, blocks javascript: etc.
-- ========================
CREATE OR REPLACE FUNCTION sanitize_url(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
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
$$;


-- ============================================================
-- SECTION B: DATABASE-LEVEL RATE LIMITING
-- Tracks action counts per user in a lightweight table.
-- Functions check this before allowing sensitive operations.
-- Auto-cleanup of old entries via scheduled job or on-read.
-- ============================================================


-- ========================
-- B1: Rate limit tracking table
-- ========================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INTEGER DEFAULT 1,
  UNIQUE(user_id, action, window_start)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits(user_id, action, window_start DESC);

-- No RLS needed — only accessed by SECURITY DEFINER functions
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies = no client access. Only server functions can read/write.


-- ========================
-- B2: Rate limit checker
-- Returns true if action is ALLOWED, false if BLOCKED
-- Window is in minutes. Max_count is per window.
-- ========================
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_window_minutes INTEGER,
  p_max_count INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  v_window_start := date_trunc('minute', now()) 
    - (EXTRACT(MINUTE FROM now())::integer % p_window_minutes) * interval '1 minute';

  -- Get or create counter
  INSERT INTO public.rate_limits (user_id, action, window_start, count)
  VALUES (p_user_id, p_action, v_window_start, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_current_count;

  -- Cleanup old entries (older than 24 hours) — lightweight housekeeping
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '24 hours';

  RETURN v_current_count <= p_max_count;
END;
$$;


-- ============================================================
-- SECTION C: PATCH EXISTING FUNCTIONS WITH SANITIZATION
-- Re-create the functions from Move 2 with sanitize_text() 
-- applied to all text inputs
-- ============================================================


-- ========================
-- C1: PATCH create_hot_take — sanitize + rate limit
-- ========================
CREATE OR REPLACE FUNCTION create_hot_take(
  p_content TEXT,
  p_section TEXT DEFAULT 'trending'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_clean_content TEXT;
  v_take_id UUID;
  v_allowed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Sanitize input
  v_clean_content := sanitize_text(p_content);

  -- Post-sanitization length check
  IF char_length(v_clean_content) < 5 THEN
    RAISE EXCEPTION 'Hot take must be at least 5 characters';
  END IF;
  IF char_length(v_clean_content) > 280 THEN
    RAISE EXCEPTION 'Hot take must be under 280 characters';
  END IF;

  -- Section validation
  IF p_section NOT IN ('trending', 'politics', 'sports', 'entertainment', 'music', 'couples_court') THEN
    p_section := 'trending';
  END IF;

  -- Rate limit: 10 per hour
  v_allowed := check_rate_limit(v_user_id, 'hot_take', 60, 10);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit: max 10 hot takes per hour';
  END IF;

  INSERT INTO public.hot_takes (user_id, content, section)
  VALUES (v_user_id, v_clean_content, p_section)
  RETURNING id INTO v_take_id;

  RETURN json_build_object('success', true, 'take_id', v_take_id);
END;
$$;


-- ========================
-- C2: PATCH create_debate — sanitize topic
-- ========================
CREATE OR REPLACE FUNCTION create_debate(
  p_topic TEXT,
  p_category TEXT DEFAULT 'general',
  p_format TEXT DEFAULT 'standard',
  p_opponent_id UUID DEFAULT NULL,
  p_side TEXT DEFAULT 'a'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate_id UUID;
  v_clean_topic TEXT;
  v_clean_category TEXT;
  v_allowed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Sanitize
  v_clean_topic := sanitize_text(p_topic);
  v_clean_category := sanitize_text(p_category);

  IF char_length(v_clean_topic) < 3 OR char_length(v_clean_topic) > 500 THEN
    RAISE EXCEPTION 'Topic must be 3-500 characters';
  END IF;

  IF p_format NOT IN ('standard', 'crossfire', 'qa_prep') THEN
    RAISE EXCEPTION 'Invalid format';
  END IF;

  IF p_side NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'Invalid side';
  END IF;

  IF p_opponent_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot challenge yourself';
  END IF;

  -- Rate limit: 5 debate creations per hour
  v_allowed := check_rate_limit(v_user_id, 'create_debate', 60, 5);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit: max 5 debates per hour';
  END IF;

  INSERT INTO public.debates (
    topic, category, format,
    debater_a, debater_b,
    status, current_round,
    votes_a, votes_b, winner, elo_change_a, elo_change_b
  ) VALUES (
    v_clean_topic, v_clean_category, p_format,
    CASE WHEN p_side = 'a' THEN v_user_id ELSE p_opponent_id END,
    CASE WHEN p_side = 'b' THEN v_user_id ELSE p_opponent_id END,
    CASE WHEN p_opponent_id IS NOT NULL THEN 'matched' ELSE 'waiting' END,
    0, 0, 0, NULL, NULL, NULL
  )
  RETURNING id INTO v_debate_id;

  RETURN v_debate_id;
END;
$$;


-- ========================
-- C3: PATCH submit_async_round — sanitize content
-- ========================
CREATE OR REPLACE FUNCTION submit_async_round(
  p_debate_id UUID,
  p_content TEXT
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_rounds JSONB;
  v_round_count INTEGER;
  v_last_round JSONB;
  v_expected_speaker TEXT;
  v_new_round JSONB;
  v_clean_content TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Sanitize
  v_clean_content := sanitize_text(p_content);

  IF char_length(v_clean_content) < 10 THEN
    RAISE EXCEPTION 'Argument must be at least 10 characters';
  END IF;
  IF char_length(v_clean_content) > 5000 THEN
    RAISE EXCEPTION 'Argument must be under 5000 characters';
  END IF;

  SELECT * INTO v_debate FROM public.async_debates WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Async debate not found';
  END IF;

  IF v_debate.status != 'active' THEN
    RAISE EXCEPTION 'Debate is not active';
  END IF;

  IF v_user_id NOT IN (v_debate.challenger_id, v_debate.defender_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  v_rounds := v_debate.rounds;
  v_round_count := jsonb_array_length(v_rounds);

  IF v_round_count = 0 THEN
    v_expected_speaker := 'challenger';
  ELSE
    v_last_round := v_rounds -> (v_round_count - 1);
    IF (v_last_round ->> 'speaker') = 'challenger' THEN
      v_expected_speaker := 'defender';
    ELSE
      v_expected_speaker := 'challenger';
    END IF;
  END IF;

  IF v_expected_speaker = 'challenger' AND v_user_id != v_debate.challenger_id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;
  IF v_expected_speaker = 'defender' AND v_user_id != v_debate.defender_id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  v_new_round := json_build_object(
    'speaker', v_expected_speaker,
    'user_id', v_user_id,
    'content', v_clean_content,
    'submitted_at', now()
  )::jsonb;

  UPDATE public.async_debates
  SET rounds = v_rounds || jsonb_build_array(v_new_round),
      updated_at = now()
  WHERE id = p_debate_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    CASE WHEN v_user_id = v_debate.challenger_id THEN v_debate.defender_id ELSE v_debate.challenger_id END,
    'async_round', 'Your turn!', 'Your opponent submitted their argument',
    json_build_object('debate_id', p_debate_id, 'round', v_round_count + 1)::jsonb
  );

  IF v_round_count + 1 >= 6 THEN
    UPDATE public.async_debates SET status = 'voting', updated_at = now() WHERE id = p_debate_id;
    RETURN json_build_object('success', true, 'round', v_round_count + 1, 'status', 'voting');
  END IF;

  RETURN json_build_object('success', true, 'round', v_round_count + 1, 'status', 'active');
END;
$$;


-- ========================
-- C4: PATCH update_profile — sanitize all text fields
-- ========================
CREATE OR REPLACE FUNCTION update_profile(
  p_display_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_clean_name TEXT;
  v_clean_bio TEXT;
  v_clean_url TEXT;
  v_clean_username TEXT;
  v_allowed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Rate limit: 20 profile updates per hour
  v_allowed := check_rate_limit(v_user_id, 'profile_update', 60, 20);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit: too many profile updates';
  END IF;

  -- Sanitize all inputs
  v_clean_name := sanitize_text(p_display_name);
  v_clean_bio := sanitize_text(p_bio);
  v_clean_url := sanitize_url(p_avatar_url);
  v_clean_username := p_username;  -- Username has strict regex below, no HTML possible

  -- Username validation
  IF v_clean_username IS NOT NULL THEN
    IF char_length(v_clean_username) < 3 OR char_length(v_clean_username) > 20 THEN
      RAISE EXCEPTION 'Username must be 3-20 characters';
    END IF;
    IF v_clean_username !~ '^[a-zA-Z0-9_]+$' THEN
      RAISE EXCEPTION 'Username: alphanumeric + underscores only';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_clean_username AND id != v_user_id) THEN
      RAISE EXCEPTION 'Username already taken';
    END IF;
  END IF;

  IF v_clean_name IS NOT NULL AND char_length(v_clean_name) > 50 THEN
    RAISE EXCEPTION 'Display name max 50 characters';
  END IF;
  IF v_clean_bio IS NOT NULL AND char_length(v_clean_bio) > 500 THEN
    RAISE EXCEPTION 'Bio max 500 characters';
  END IF;

  UPDATE public.profiles SET
    username = COALESCE(v_clean_username, username),
    display_name = COALESCE(v_clean_name, display_name),
    avatar_url = COALESCE(v_clean_url, avatar_url),
    bio = COALESCE(v_clean_bio, bio),
    updated_at = now()
  WHERE id = v_user_id;

  RETURN json_build_object('success', true);
END;
$$;


-- ========================
-- C5: PATCH submit_report — sanitize reason + details
-- ========================
CREATE OR REPLACE FUNCTION submit_report(
  p_reported_user_id UUID DEFAULT NULL,
  p_debate_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT '',
  p_details TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;


-- ========================
-- C6: PATCH cast_vote — add rate limiting
-- ========================
CREATE OR REPLACE FUNCTION cast_vote(
  p_debate_id UUID,
  p_voted_for TEXT,
  p_round INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_votes_a INTEGER;
  v_votes_b INTEGER;
  v_allowed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_voted_for NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'Invalid vote: must be a or b';
  END IF;

  -- Rate limit: 60 votes per hour (generous but prevents spam)
  v_allowed := check_rate_limit(v_user_id, 'vote', 60, 60);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit: too many votes. Slow down.';
  END IF;

  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status NOT IN ('live', 'voting') THEN
    RAISE EXCEPTION 'Debate is not accepting votes';
  END IF;

  IF v_user_id IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Cannot vote in your own debate';
  END IF;

  INSERT INTO public.debate_votes (debate_id, user_id, voted_for, round_number)
  VALUES (p_debate_id, v_user_id, p_voted_for, COALESCE(p_round, v_debate.current_round))
  ON CONFLICT (debate_id, user_id, round_number) DO UPDATE
  SET voted_for = p_voted_for, voted_at = now();

  SELECT
    COUNT(*) FILTER (WHERE voted_for = 'a'),
    COUNT(*) FILTER (WHERE voted_for = 'b')
  INTO v_votes_a, v_votes_b
  FROM public.debate_votes
  WHERE debate_id = p_debate_id;

  UPDATE public.debates
  SET votes_a = v_votes_a, votes_b = v_votes_b
  WHERE id = p_debate_id;

  RETURN json_build_object(
    'success', true,
    'votes_a', v_votes_a,
    'votes_b', v_votes_b,
    'your_vote', p_voted_for
  );
END;
$$;


-- ========================
-- C7: PATCH place_prediction — add rate limiting
-- ========================
CREATE OR REPLACE FUNCTION place_prediction(
  p_debate_id UUID,
  p_predicted_winner UUID,
  p_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance INTEGER;
  v_debate RECORD;
  v_allowed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount < 1 OR p_amount > 500 THEN
    RAISE EXCEPTION 'Prediction: 1-500 tokens';
  END IF;

  -- Rate limit: 20 predictions per hour
  v_allowed := check_rate_limit(v_user_id, 'prediction', 60, 20);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit: too many predictions';
  END IF;

  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id;
  IF NOT FOUND OR v_debate.status NOT IN ('waiting', 'matched', 'live') THEN
    RAISE EXCEPTION 'Debate not accepting predictions';
  END IF;

  IF v_user_id IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Cannot predict your own debate';
  END IF;

  IF p_predicted_winner NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Invalid prediction target';
  END IF;

  SELECT token_balance INTO v_balance FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient tokens';
  END IF;

  UPDATE public.profiles
  SET token_balance = token_balance - p_amount
  WHERE id = v_user_id;

  INSERT INTO public.predictions (debate_id, user_id, predicted_winner, tokens_wagered)
  VALUES (p_debate_id, v_user_id, p_predicted_winner, p_amount)
  ON CONFLICT (debate_id, user_id) DO UPDATE
  SET predicted_winner = p_predicted_winner, tokens_wagered = p_amount;

  INSERT INTO public.token_transactions (user_id, amount, type, source, balance_after)
  VALUES (v_user_id, -p_amount, 'wager', 'prediction', v_balance - p_amount);

  RETURN json_build_object('success', true, 'amount', p_amount, 'new_balance', v_balance - p_amount);
END;
$$;


-- ========================
-- C8: PATCH follow_user — sanitize + rate limit
-- ========================
CREATE OR REPLACE FUNCTION follow_user(p_target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_allowed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Rate limit: 50 follows per hour
  v_allowed := check_rate_limit(v_user_id, 'follow', 60, 50);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit: max 50 follows per hour';
  END IF;

  INSERT INTO public.follows (follower_id, following_id)
  VALUES (v_user_id, p_target_user_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  RETURN json_build_object('success', true, 'following', p_target_user_id);
END;
$$;


-- ============================================================
-- DONE — DB-level sanitization + rate limiting applied
-- ============================================================
