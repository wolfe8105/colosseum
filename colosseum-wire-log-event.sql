-- ████████████████████████████████████████████████████████████
-- THE COLOSSEUM — SESSION 34: WIRE log_event() INTO ALL RPCs
-- Paste order: 15th (after colosseum-analytics-migration.sql)
-- 
-- Every function is CREATE OR REPLACE — safe to re-paste.
-- log_event() swallows errors (LM-089) — analytics never breaks the app.
-- 
-- FUNCTIONS WIRED (16):
--   create_hot_take, react_hot_take, follow_user, unfollow_user,
--   place_prediction, finalize_debate, advance_round,
--   join_debate_queue, create_ai_debate, submit_debate_message,
--   vote_arena_debate, submit_reference, rule_on_reference,
--   auto_allow_expired_references, score_moderator, assign_moderator
--
-- NOT WIRED (missing from repo — need separate pass):
--   declare_rival, respond_rival (Session 23 migration, LM-031)
--
-- ████████████████████████████████████████████████████████████


-- ============================================================
-- 1. create_hot_take → hot_take_posted
-- ============================================================
CREATE OR REPLACE FUNCTION create_hot_take(
  p_content TEXT,
  p_section TEXT DEFAULT 'trending'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_take_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_content IS NULL OR char_length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Content cannot be empty';
  END IF;

  IF char_length(p_content) > 280 THEN
    RAISE EXCEPTION 'Content exceeds 280 characters';
  END IF;

  IF p_section NOT IN ('trending','politics','sports','entertainment','music','couples_court') THEN
    p_section := 'trending';
  END IF;

  INSERT INTO public.hot_takes (user_id, content, section)
  VALUES (v_user_id, trim(p_content), p_section)
  RETURNING id INTO v_take_id;

  -- Analytics
  PERFORM log_event(
    'hot_take_posted',
    v_user_id,
    NULL,           -- no debate_id
    p_section,      -- category
    NULL,           -- no side
    jsonb_build_object(
      'section', p_section,
      'word_count', array_length(string_to_array(trim(p_content), ' '), 1),
      'has_link', (trim(p_content) ~* 'https?://')
    )
  );

  RETURN json_build_object(
    'success', true,
    'id', v_take_id,
    'section', p_section
  );
END;
$$;


-- ============================================================
-- 2. react_hot_take → hot_take_reacted
-- ============================================================
CREATE OR REPLACE FUNCTION react_hot_take(
  p_hot_take_id UUID,
  p_reaction_type TEXT DEFAULT 'fire'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_exists BOOLEAN;
  v_new_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if reaction exists (toggle behavior)
  SELECT EXISTS(
    SELECT 1 FROM public.hot_take_reactions
    WHERE hot_take_id = p_hot_take_id AND user_id = v_user_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove reaction
    DELETE FROM public.hot_take_reactions
    WHERE hot_take_id = p_hot_take_id AND user_id = v_user_id;
  ELSE
    -- Add reaction
    INSERT INTO public.hot_take_reactions (hot_take_id, user_id, reaction_type)
    VALUES (p_hot_take_id, v_user_id, COALESCE(p_reaction_type, 'fire'));
  END IF;

  -- Get updated count
  SELECT COUNT(*) INTO v_new_count
  FROM public.hot_take_reactions
  WHERE hot_take_id = p_hot_take_id;

  -- Update denormalized count
  UPDATE public.hot_takes
  SET reaction_count = v_new_count
  WHERE id = p_hot_take_id;

  -- Analytics
  PERFORM log_event(
    'hot_take_reacted',
    v_user_id,
    NULL,
    NULL,
    NULL,
    jsonb_build_object(
      'action', CASE WHEN v_exists THEN 'remove' ELSE 'add' END,
      'hot_take_id', p_hot_take_id,
      'reaction_type', p_reaction_type
    )
  );

  RETURN json_build_object(
    'success', true,
    'reacted', NOT v_exists,
    'reaction_count', v_new_count
  );
END;
$$;


-- ============================================================
-- 3. follow_user → follow
-- ============================================================
CREATE OR REPLACE FUNCTION follow_user(p_target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_target_user_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  -- Verify target exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.follows (follower_id, following_id)
  VALUES (v_user_id, p_target_user_id)
  ON CONFLICT DO NOTHING;

  -- Analytics
  PERFORM log_event(
    'follow',
    v_user_id,
    NULL,
    NULL,
    NULL,
    jsonb_build_object('target_user_id', p_target_user_id)
  );

  RETURN json_build_object('success', true, 'following', p_target_user_id);
END;
$$;


-- ============================================================
-- 4. unfollow_user → unfollow
-- ============================================================
CREATE OR REPLACE FUNCTION unfollow_user(p_target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.follows
  WHERE follower_id = v_user_id AND following_id = p_target_user_id;

  -- Analytics
  PERFORM log_event(
    'unfollow',
    v_user_id,
    NULL,
    NULL,
    NULL,
    jsonb_build_object('target_user_id', p_target_user_id)
  );

  RETURN json_build_object('success', true, 'unfollowed', p_target_user_id);
END;
$$;


-- ============================================================
-- 5. place_prediction → prediction_placed
-- ============================================================
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount < 1 OR p_amount > 500 THEN
    RAISE EXCEPTION 'Prediction amount must be 1-500 tokens';
  END IF;

  -- Check debate is eligible
  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id;
  IF NOT FOUND OR v_debate.status NOT IN ('waiting', 'matched', 'live') THEN
    RAISE EXCEPTION 'Debate not accepting predictions';
  END IF;

  -- Can't predict your own debate
  IF v_user_id IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Cannot predict your own debate';
  END IF;

  -- Predicted winner must be a participant
  IF p_predicted_winner NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Invalid prediction target';
  END IF;

  -- Check and deduct balance
  SELECT token_balance INTO v_balance FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient tokens';
  END IF;

  UPDATE public.profiles
  SET token_balance = token_balance - p_amount
  WHERE id = v_user_id;

  -- Record prediction
  INSERT INTO public.predictions (debate_id, user_id, predicted_winner, amount)
  VALUES (p_debate_id, v_user_id, p_predicted_winner, p_amount)
  ON CONFLICT (debate_id, user_id) DO UPDATE
  SET predicted_winner = p_predicted_winner, amount = p_amount;

  -- Record token transaction
  INSERT INTO public.token_transactions (user_id, amount, type, description, reference_id)
  VALUES (v_user_id, -p_amount, 'prediction', 'Prediction on debate', p_debate_id);

  -- Analytics
  PERFORM log_event(
    'prediction_placed',
    v_user_id,
    p_debate_id,
    v_debate.category,
    NULL,
    jsonb_build_object(
      'tokens_wagered', p_amount,
      'predicted_winner_id', p_predicted_winner
    )
  );

  RETURN json_build_object('success', true, 'amount', p_amount, 'new_balance', v_balance - p_amount);
END;
$$;


-- ============================================================
-- 6. finalize_debate → debate_completed
-- ============================================================
CREATE OR REPLACE FUNCTION finalize_debate(p_debate_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_debate RECORD;
  v_profile_a RECORD;
  v_profile_b RECORD;
  v_votes_a INTEGER;
  v_votes_b INTEGER;
  v_winner TEXT;  -- 'a', 'b', 'draw'
  v_winner_id UUID;
  v_elo RECORD;
  v_xp_winner INTEGER := 25;
  v_xp_loser INTEGER := 10;
  v_xp_draw INTEGER := 15;
BEGIN
  -- Lock the debate row
  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status NOT IN ('voting', 'live') THEN
    RAISE EXCEPTION 'Debate cannot be finalized in current state: %', v_debate.status;
  END IF;

  -- Final vote tally
  SELECT
    COUNT(*) FILTER (WHERE voted_for = 'a'),
    COUNT(*) FILTER (WHERE voted_for = 'b')
  INTO v_votes_a, v_votes_b
  FROM public.debate_votes
  WHERE debate_id = p_debate_id;

  -- Determine winner
  IF v_votes_a > v_votes_b THEN
    v_winner := 'a';
    v_winner_id := v_debate.debater_a;
  ELSIF v_votes_b > v_votes_a THEN
    v_winner := 'b';
    v_winner_id := v_debate.debater_b;
  ELSE
    v_winner := 'draw';
    v_winner_id := NULL;
  END IF;

  -- Get current profiles
  SELECT * INTO v_profile_a FROM public.profiles WHERE id = v_debate.debater_a;
  SELECT * INTO v_profile_b FROM public.profiles WHERE id = v_debate.debater_b;

  -- Calculate Elo
  SELECT * INTO v_elo FROM calculate_elo(
    v_profile_a.elo_rating,
    v_profile_b.elo_rating,
    v_winner,
    v_profile_a.debates_completed,
    v_profile_b.debates_completed
  );

  -- Update debate record
  UPDATE public.debates SET
    status = 'completed',
    winner_id = v_winner_id,
    votes_a = v_votes_a,
    votes_b = v_votes_b,
    elo_change_a = v_elo.change_a,
    elo_change_b = v_elo.change_b,
    ended_at = now(),
    updated_at = now()
  WHERE id = p_debate_id;

  -- Update profile A
  UPDATE public.profiles SET
    elo_rating = v_elo.new_rating_a,
    debates_completed = debates_completed + 1,
    wins = wins + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
    losses = losses + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
    draws = draws + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
    current_streak = CASE
      WHEN v_winner = 'a' THEN current_streak + 1
      ELSE 0
    END,
    best_streak = CASE
      WHEN v_winner = 'a' AND current_streak + 1 > best_streak THEN current_streak + 1
      ELSE best_streak
    END,
    xp = xp + CASE
      WHEN v_winner = 'a' THEN v_xp_winner
      WHEN v_winner = 'draw' THEN v_xp_draw
      ELSE v_xp_loser
    END,
    updated_at = now()
  WHERE id = v_debate.debater_a;

  -- Update profile B
  UPDATE public.profiles SET
    elo_rating = v_elo.new_rating_b,
    debates_completed = debates_completed + 1,
    wins = wins + CASE WHEN v_winner = 'b' THEN 1 ELSE 0 END,
    losses = losses + CASE WHEN v_winner = 'a' THEN 1 ELSE 0 END,
    draws = draws + CASE WHEN v_winner = 'draw' THEN 1 ELSE 0 END,
    current_streak = CASE
      WHEN v_winner = 'b' THEN current_streak + 1
      ELSE 0
    END,
    best_streak = CASE
      WHEN v_winner = 'b' AND current_streak + 1 > best_streak THEN current_streak + 1
      ELSE best_streak
    END,
    xp = xp + CASE
      WHEN v_winner = 'b' THEN v_xp_winner
      WHEN v_winner = 'draw' THEN v_xp_draw
      ELSE v_xp_loser
    END,
    updated_at = now()
  WHERE id = v_debate.debater_b;

  -- Resolve predictions
  UPDATE public.predictions SET
    result = CASE
      WHEN predicted_winner = v_winner_id THEN 'correct'
      WHEN v_winner = 'draw' THEN 'draw'
      ELSE 'incorrect'
    END,
    payout = CASE
      WHEN predicted_winner = v_winner_id THEN ROUND(amount * 1.8)
      WHEN v_winner = 'draw' THEN amount  -- refund on draw
      ELSE 0
    END
  WHERE debate_id = p_debate_id AND result = 'pending';

  -- Pay out prediction winners
  UPDATE public.profiles p SET
    token_balance = token_balance + pred.payout
  FROM public.predictions pred
  WHERE pred.debate_id = p_debate_id
    AND pred.user_id = p.id
    AND pred.result = 'correct';

  -- Refund draws
  UPDATE public.profiles p SET
    token_balance = token_balance + pred.payout
  FROM public.predictions pred
  WHERE pred.debate_id = p_debate_id
    AND pred.user_id = p.id
    AND pred.result = 'draw';

  -- Analytics
  PERFORM log_event(
    'debate_completed',
    NULL,             -- no single user — it's a debate event
    p_debate_id,
    v_debate.category,
    v_winner,
    jsonb_build_object(
      'winner', v_winner,
      'winner_id', v_winner_id,
      'votes_a', v_votes_a,
      'votes_b', v_votes_b,
      'elo_change_a', v_elo.change_a,
      'elo_change_b', v_elo.change_b,
      'debater_a', v_debate.debater_a,
      'debater_b', v_debate.debater_b,
      'duration_seconds', EXTRACT(EPOCH FROM (now() - v_debate.created_at))::int
    )
  );

  RETURN json_build_object(
    'success', true,
    'winner', v_winner,
    'winner_id', v_winner_id,
    'votes_a', v_votes_a,
    'votes_b', v_votes_b,
    'elo_change_a', v_elo.change_a,
    'elo_change_b', v_elo.change_b,
    'new_elo_a', v_elo.new_rating_a,
    'new_elo_b', v_elo.new_rating_b
  );
END;
$$;


-- ============================================================
-- 7. advance_round → round_advanced
-- ============================================================
CREATE OR REPLACE FUNCTION advance_round(p_debate_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
BEGIN
  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id;

  IF v_debate.status != 'live' THEN
    RAISE EXCEPTION 'Debate is not live';
  END IF;
  IF v_user_id NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_debate.current_round >= v_debate.total_rounds THEN
    -- Move to voting phase
    UPDATE public.debates
    SET status = 'voting', updated_at = now()
    WHERE id = p_debate_id;

    -- Analytics
    PERFORM log_event(
      'round_advanced',
      v_user_id,
      p_debate_id,
      v_debate.category,
      NULL,
      jsonb_build_object(
        'from_round', v_debate.current_round,
        'to_round', 'voting'
      )
    );

    RETURN json_build_object('success', true, 'status', 'voting', 'round', v_debate.current_round);
  ELSE
    UPDATE public.debates
    SET current_round = current_round + 1, updated_at = now()
    WHERE id = p_debate_id;

    -- Analytics
    PERFORM log_event(
      'round_advanced',
      v_user_id,
      p_debate_id,
      v_debate.category,
      NULL,
      jsonb_build_object(
        'from_round', v_debate.current_round,
        'to_round', v_debate.current_round + 1
      )
    );

    RETURN json_build_object('success', true, 'status', 'live', 'round', v_debate.current_round + 1);
  END IF;
END;
$$;


-- ============================================================
-- 8. join_debate_queue → queue_joined + queue_matched
-- ============================================================
CREATE OR REPLACE FUNCTION join_debate_queue(
  p_mode text,
  p_category text DEFAULT NULL,
  p_topic text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_elo int;
  v_queue_id uuid;
  v_match record;
  v_debate_id uuid;
  v_topic text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT elo_rating INTO v_elo FROM profiles WHERE id = v_uid;

  -- Clear any stale waiting entries
  DELETE FROM debate_queue WHERE user_id = v_uid AND status = 'waiting';

  -- Look for a compatible opponent (FIFO, within 400 Elo)
  SELECT * INTO v_match FROM debate_queue
    WHERE status = 'waiting'
      AND mode = p_mode
      AND user_id != v_uid
      AND ABS(elo_rating - COALESCE(v_elo, 1200)) < 400
    ORDER BY joined_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

  IF v_match IS NOT NULL THEN
    -- Pick a topic (use provided or opponent's or generate placeholder)
    v_topic := COALESCE(p_topic, v_match.topic, 'Open Debate');

    -- Create the arena debate
    INSERT INTO arena_debates (debater_a, debater_b, mode, category, topic, status, total_rounds)
    VALUES (v_match.user_id, v_uid, p_mode,
            COALESCE(p_category, v_match.category),
            v_topic, 'pending', 3)
    RETURNING id INTO v_debate_id;

    -- Update opponent's queue entry
    UPDATE debate_queue
      SET status = 'matched', matched_with = v_uid, debate_id = v_debate_id
      WHERE id = v_match.id;

    -- Insert our entry as matched
    INSERT INTO debate_queue (user_id, mode, category, topic, elo_rating, status, matched_with, debate_id)
    VALUES (v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200), 'matched', v_match.user_id, v_debate_id)
    RETURNING id INTO v_queue_id;

    -- Analytics: matched
    PERFORM log_event(
      'queue_matched',
      v_uid,
      v_debate_id,
      COALESCE(p_category, v_match.category),
      NULL,
      jsonb_build_object(
        'mode', p_mode,
        'wait_seconds', EXTRACT(EPOCH FROM (now() - v_match.joined_at))::int,
        'elo_gap', ABS(COALESCE(v_elo, 1200) - v_match.elo_rating)
      )
    );

    RETURN json_build_object(
      'status', 'matched',
      'queue_id', v_queue_id,
      'debate_id', v_debate_id,
      'opponent_id', v_match.user_id,
      'topic', v_topic,
      'role', 'b'
    );
  ELSE
    -- No match — join queue
    INSERT INTO debate_queue (user_id, mode, category, topic, elo_rating)
    VALUES (v_uid, p_mode, p_category, p_topic, COALESCE(v_elo, 1200))
    RETURNING id INTO v_queue_id;

    -- Analytics: waiting
    PERFORM log_event(
      'queue_joined',
      v_uid,
      NULL,
      p_category,
      NULL,
      jsonb_build_object('mode', p_mode, 'category', p_category)
    );

    RETURN json_build_object('status', 'waiting', 'queue_id', v_queue_id);
  END IF;
END;
$$;


-- ============================================================
-- 9. create_ai_debate → ai_spar_started
-- ============================================================
CREATE OR REPLACE FUNCTION create_ai_debate(p_category text DEFAULT NULL, p_topic text DEFAULT 'Open Debate')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_debate_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO arena_debates (debater_a, debater_b, mode, category, topic, status, total_rounds)
  VALUES (v_uid, NULL, 'ai', p_category, sanitize_text(p_topic), 'live', 3)
  RETURNING id INTO v_debate_id;

  -- Analytics
  PERFORM log_event(
    'ai_spar_started',
    v_uid,
    v_debate_id,
    p_category,
    NULL,
    jsonb_build_object('topic', p_topic, 'category', p_category)
  );

  RETURN json_build_object('debate_id', v_debate_id, 'topic', p_topic, 'role', 'a');
END;
$$;


-- ============================================================
-- 10. submit_debate_message → ai_spar_message (AI only)
-- Only logs AI responses to keep volume sane.
-- Human messages are implicitly logged by round_advanced.
-- ============================================================
CREATE OR REPLACE FUNCTION submit_debate_message(
  p_debate_id uuid,
  p_round int,
  p_side text,
  p_content text,
  p_is_ai boolean DEFAULT false
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_debate record;
BEGIN
  IF v_uid IS NULL AND p_is_ai = false THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Verify debate exists and user is a participant
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN RAISE EXCEPTION 'Debate not found'; END IF;
  IF p_is_ai = false AND v_uid != v_debate.debater_a AND v_uid != v_debate.debater_b THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  INSERT INTO debate_messages (debate_id, user_id, round, side, content, is_ai)
  VALUES (p_debate_id, v_uid, p_round, p_side, sanitize_text(p_content), p_is_ai)
  RETURNING id INTO v_id;

  -- Analytics: only log AI responses (human messages tracked by round_advanced)
  IF p_is_ai THEN
    PERFORM log_event(
      'ai_spar_message',
      v_debate.debater_a,    -- the human debater
      p_debate_id,
      v_debate.category,
      p_side,
      jsonb_build_object(
        'round', p_round,
        'word_count', array_length(string_to_array(trim(p_content), ' '), 1)
      )
    );
  END IF;

  RETURN json_build_object('id', v_id, 'success', true);
END;
$$;


-- ============================================================
-- 11. vote_arena_debate → arena vote event
-- ============================================================
CREATE OR REPLACE FUNCTION vote_arena_debate(p_debate_id uuid, p_vote text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_debate record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_vote NOT IN ('a', 'b') THEN RAISE EXCEPTION 'Invalid vote'; END IF;

  INSERT INTO arena_votes (debate_id, user_id, vote) VALUES (p_debate_id, v_uid, p_vote)
  ON CONFLICT (debate_id, user_id) DO UPDATE SET vote = p_vote;

  -- Update cached counts
  UPDATE arena_debates SET
    vote_count_a = (SELECT count(*) FROM arena_votes WHERE debate_id = p_debate_id AND vote = 'a'),
    vote_count_b = (SELECT count(*) FROM arena_votes WHERE debate_id = p_debate_id AND vote = 'b')
  WHERE id = p_debate_id;

  -- Get debate for category
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;

  -- Analytics
  PERFORM log_event(
    'auto_debate_voted',
    v_uid,
    p_debate_id,
    v_debate.category,
    p_vote,
    jsonb_build_object('voted_for', p_vote, 'is_anonymous', false)
  );

  RETURN json_build_object('success', true);
END;
$$;


-- ============================================================
-- 12. submit_reference → reference_submitted
-- ============================================================
CREATE OR REPLACE FUNCTION submit_reference(
  p_debate_id UUID,
  p_content TEXT,
  p_reference_type TEXT DEFAULT 'url'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_count INTEGER;
  v_cost INTEGER;
  v_balance INTEGER;
  v_clean TEXT;
BEGIN
  -- Validate content length
  IF length(p_content) > 500 THEN
    RAISE EXCEPTION 'Reference content too long (max 500 characters)';
  END IF;
  IF length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Reference content cannot be empty';
  END IF;

  -- Sanitize: strip anything that's not a URL or plain text
  v_clean := trim(p_content);
  IF p_reference_type = 'url' THEN
    -- Only allow http:// and https:// URLs
    IF v_clean !~ '^https?://' THEN
      RAISE EXCEPTION 'URL must start with http:// or https://';
    END IF;
    -- Strip any HTML/script tags from URL
    v_clean := regexp_replace(v_clean, '<[^>]*>', '', 'g');
  ELSE
    -- Plain text: strip HTML tags
    v_clean := regexp_replace(v_clean, '<[^>]*>', '', 'g');
  END IF;

  -- Lock debate row
  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status != 'live' THEN
    RAISE EXCEPTION 'Debate is not live';
  END IF;
  IF v_user_id NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Only debaters can submit references';
  END IF;
  IF v_debate.is_paused THEN
    RAISE EXCEPTION 'Debate is already paused for evidence review';
  END IF;

  -- Count references this user submitted this round
  SELECT COUNT(*) INTO v_count
  FROM public.debate_references
  WHERE debate_id = p_debate_id
    AND submitted_by = v_user_id
    AND round_number = v_debate.current_round;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 references per round reached';
  END IF;

  -- Calculate cost: free, 5, 15, 35, 50
  v_cost := CASE v_count
    WHEN 0 THEN 0    -- 1st: free
    WHEN 1 THEN 5    -- 2nd
    WHEN 2 THEN 15   -- 3rd
    WHEN 3 THEN 35   -- 4th
    WHEN 4 THEN 50   -- 5th
  END;

  -- Check balance
  IF v_cost > 0 THEN
    SELECT token_balance INTO v_balance FROM public.profiles WHERE id = v_user_id;
    IF v_balance < v_cost THEN
      RAISE EXCEPTION 'Not enough tokens (need %, have %)', v_cost, v_balance;
    END IF;
    -- Deduct tokens
    UPDATE public.profiles SET token_balance = token_balance - v_cost WHERE id = v_user_id;
  END IF;

  -- Create reference record
  INSERT INTO public.debate_references (
    debate_id, submitted_by, round_number,
    reference_type, content, token_cost, sequence_in_round
  ) VALUES (
    p_debate_id, v_user_id, v_debate.current_round,
    p_reference_type, v_clean, v_cost, v_count + 1
  );

  -- Pause the debate
  UPDATE public.debates
  SET is_paused = true, paused_at = now(), updated_at = now()
  WHERE id = p_debate_id;

  -- Analytics
  PERFORM log_event(
    'reference_submitted',
    v_user_id,
    p_debate_id,
    v_debate.category,
    NULL,
    jsonb_build_object(
      'type', p_reference_type,
      'sequence', v_count + 1,
      'cost', v_cost,
      'round', v_debate.current_round
    )
  );

  RETURN json_build_object(
    'success', true,
    'sequence', v_count + 1,
    'cost', v_cost,
    'remaining_balance', CASE WHEN v_cost > 0
      THEN v_balance - v_cost
      ELSE (SELECT token_balance FROM public.profiles WHERE id = v_user_id)
    END
  );
END;
$$;


-- ============================================================
-- 13. rule_on_reference → reference_ruled
-- ============================================================
CREATE OR REPLACE FUNCTION rule_on_reference(
  p_reference_id UUID,
  p_ruling TEXT,        -- 'allowed' or 'denied'
  p_reason TEXT DEFAULT NULL,
  p_ruled_by_type TEXT DEFAULT 'human'  -- 'human', 'ai', 'auto'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_ref RECORD;
  v_debate RECORD;
BEGIN
  -- Validate ruling
  IF p_ruling NOT IN ('allowed', 'denied') THEN
    RAISE EXCEPTION 'Ruling must be allowed or denied';
  END IF;

  -- Lock reference row
  SELECT * INTO v_ref FROM public.debate_references WHERE id = p_reference_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;
  IF v_ref.ruling != 'pending' THEN
    RAISE EXCEPTION 'Reference already ruled on';
  END IF;

  -- Get debate
  SELECT * INTO v_debate FROM public.debates WHERE id = v_ref.debate_id;

  -- Auth check: must be the debate's moderator (or AI/auto bypass)
  IF p_ruled_by_type = 'human' THEN
    IF v_debate.moderator_id IS NULL OR v_user_id != v_debate.moderator_id THEN
      RAISE EXCEPTION 'Not the assigned moderator';
    END IF;
  END IF;

  -- Apply ruling
  UPDATE public.debate_references SET
    ruling = p_ruling,
    ruled_by = CASE WHEN p_ruled_by_type = 'human' THEN v_user_id ELSE NULL END,
    ruled_by_type = p_ruled_by_type,
    ruling_reason = CASE WHEN length(trim(COALESCE(p_reason, ''))) > 0
      THEN left(trim(p_reason), 200)  -- max 200 chars for reason
      ELSE NULL
    END,
    ruled_at = now()
  WHERE id = p_reference_id;

  -- Unpause debate
  UPDATE public.debates
  SET is_paused = false, paused_at = NULL, updated_at = now()
  WHERE id = v_ref.debate_id;

  -- Increment moderator rulings count (if human mod)
  IF p_ruled_by_type = 'human' AND v_debate.moderator_id IS NOT NULL THEN
    UPDATE public.profiles SET
      mod_rulings_total = mod_rulings_total + 1
    WHERE id = v_debate.moderator_id;
  END IF;

  -- Analytics
  PERFORM log_event(
    'reference_ruled',
    CASE WHEN p_ruled_by_type = 'human' THEN v_user_id ELSE NULL END,
    v_ref.debate_id,
    v_debate.category,
    NULL,
    jsonb_build_object(
      'ruling', p_ruling,
      'ruled_by_type', p_ruled_by_type,
      'reason', COALESCE(p_reason, ''),
      'reference_id', p_reference_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'ruling', p_ruling,
    'debate_id', v_ref.debate_id,
    'unpaused', true
  );
END;
$$;


-- ============================================================
-- 14. auto_allow_expired_references → reference_auto_allowed
-- ============================================================
CREATE OR REPLACE FUNCTION auto_allow_expired_references()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ref RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_ref IN
    SELECT dr.id AS ref_id, dr.debate_id
    FROM public.debate_references dr
    JOIN public.debates d ON d.id = dr.debate_id
    WHERE dr.ruling = 'pending'
      AND d.is_paused = true
      AND d.paused_at < now() - interval '60 seconds'
  LOOP
    UPDATE public.debate_references SET
      ruling = 'allowed',
      ruled_by_type = 'auto',
      ruling_reason = 'Auto-allowed after 60s timeout',
      ruled_at = now()
    WHERE id = v_ref.ref_id;

    UPDATE public.debates SET
      is_paused = false, paused_at = NULL, updated_at = now()
    WHERE id = v_ref.debate_id;

    -- Analytics per auto-allowed reference
    PERFORM log_event(
      'reference_auto_allowed',
      NULL,
      v_ref.debate_id,
      NULL,
      NULL,
      jsonb_build_object('reference_id', v_ref.ref_id)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'auto_allowed_count', v_count);
END;
$$;


-- ============================================================
-- 15. score_moderator → moderator_scored
-- ============================================================
CREATE OR REPLACE FUNCTION score_moderator(
  p_debate_id UUID,
  p_score INTEGER
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_role TEXT;
  v_total_score NUMERIC;
  v_total_count INTEGER;
  v_new_approval NUMERIC;
BEGIN
  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status != 'completed' THEN
    RAISE EXCEPTION 'Debate must be completed before scoring moderator';
  END IF;
  IF v_debate.moderator_id IS NULL THEN
    RAISE EXCEPTION 'No moderator assigned to this debate';
  END IF;
  IF v_user_id = v_debate.moderator_id THEN
    RAISE EXCEPTION 'Moderator cannot score themselves';
  END IF;

  -- Determine scorer role
  IF v_user_id IN (v_debate.debater_a, v_debate.debater_b) THEN
    v_role := 'debater';
    -- Debaters: 0 or 25 only
    IF p_score NOT IN (0, 25) THEN
      RAISE EXCEPTION 'Debater score must be 0 (not happy) or 25 (happy)';
    END IF;
  ELSE
    v_role := 'spectator';
    -- Spectators: 1-50
    IF p_score < 1 OR p_score > 50 THEN
      RAISE EXCEPTION 'Spectator score must be between 1 and 50';
    END IF;
  END IF;

  -- Insert score (unique constraint prevents double-scoring)
  INSERT INTO public.moderator_scores (debate_id, moderator_id, scorer_id, scorer_role, score)
  VALUES (p_debate_id, v_debate.moderator_id, v_user_id, v_role, p_score);

  -- Recalculate mod_approval_pct
  SELECT
    AVG(CASE
      WHEN scorer_role = 'debater' THEN score * 2.0        -- 0 or 25 → 0 or 50 (out of 100)
      WHEN scorer_role = 'spectator' THEN score * 2.0      -- 1-50 → 2-100
    END),
    COUNT(*)
  INTO v_total_score, v_total_count
  FROM public.moderator_scores
  WHERE moderator_id = v_debate.moderator_id;

  v_new_approval := COALESCE(v_total_score, 50.0);

  UPDATE public.profiles SET
    mod_approval_pct = ROUND(v_new_approval, 2)
  WHERE id = v_debate.moderator_id;

  -- Analytics
  PERFORM log_event(
    'moderator_scored',
    v_user_id,
    p_debate_id,
    v_debate.category,
    NULL,
    jsonb_build_object(
      'scorer_role', v_role,
      'score', p_score,
      'new_approval', ROUND(v_new_approval, 2),
      'moderator_id', v_debate.moderator_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'role', v_role,
    'score', p_score,
    'new_approval', ROUND(v_new_approval, 2)
  );
END;
$$;


-- ============================================================
-- 16. assign_moderator → moderator_assigned
-- ============================================================
CREATE OR REPLACE FUNCTION assign_moderator(
  p_debate_id UUID,
  p_moderator_id UUID DEFAULT NULL,  -- NULL = system assigns
  p_moderator_type TEXT DEFAULT 'human'
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_mod RECORD;
BEGIN
  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_user_id NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Only debaters can assign a moderator';
  END IF;
  IF v_debate.moderator_id IS NOT NULL THEN
    RAISE EXCEPTION 'Debate already has a moderator';
  END IF;

  IF p_moderator_type = 'ai' THEN
    -- AI moderator: no user ID needed
    UPDATE public.debates SET
      moderator_type = 'ai',
      updated_at = now()
    WHERE id = p_debate_id;

    -- Analytics
    PERFORM log_event(
      'moderator_assigned',
      v_user_id,
      p_debate_id,
      v_debate.category,
      NULL,
      jsonb_build_object('type', 'ai', 'moderator_id', NULL, 'rating', NULL)
    );

    RETURN json_build_object('success', true, 'moderator_type', 'ai');
  END IF;

  -- Human moderator
  IF p_moderator_id IS NOT NULL THEN
    -- Specific mod requested — check they exist and are available
    SELECT * INTO v_mod FROM public.profiles
    WHERE id = p_moderator_id AND is_moderator = true AND mod_available = true AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Moderator not found or not available';
    END IF;

    -- Can't moderate your own debate
    IF p_moderator_id IN (v_debate.debater_a, v_debate.debater_b) THEN
      RAISE EXCEPTION 'Cannot moderate a debate you are in';
    END IF;
  ELSE
    -- System assigns: pick available mod with highest rating, not in this debate
    SELECT * INTO v_mod FROM public.profiles
    WHERE is_moderator = true
      AND mod_available = true
      AND deleted_at IS NULL
      AND id NOT IN (v_debate.debater_a, COALESCE(v_debate.debater_b, '00000000-0000-0000-0000-000000000000'))
    ORDER BY mod_rating DESC, mod_debates_total DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No moderators available';
    END IF;
  END IF;

  -- Assign the moderator
  UPDATE public.debates SET
    moderator_id = v_mod.id,
    moderator_type = 'human',
    updated_at = now()
  WHERE id = p_debate_id;

  -- Increment mod's debate count
  UPDATE public.profiles SET
    mod_debates_total = mod_debates_total + 1
  WHERE id = v_mod.id;

  -- Analytics
  PERFORM log_event(
    'moderator_assigned',
    v_user_id,
    p_debate_id,
    v_debate.category,
    NULL,
    jsonb_build_object(
      'type', 'human',
      'moderator_id', v_mod.id,
      'rating', v_mod.mod_rating
    )
  );

  RETURN json_build_object(
    'success', true,
    'moderator_id', v_mod.id,
    'moderator_name', v_mod.display_name,
    'moderator_rating', v_mod.mod_rating
  );
END;
$$;


-- ████████████████████████████████████████████████████████████
-- DONE. 16 functions wired. All CREATE OR REPLACE — safe to re-paste.
-- 
-- NOT WIRED (need code from Supabase, not in repo):
--   declare_rival → rival_declared
--   respond_rival → rival_accepted
--   (These live in Session 23 migration, one of the 4 missing SQL files)
--
-- NEXT STEPS:
--   1. Paste this into Supabase SQL Editor
--   2. Verify with: SELECT event_type, count(*) FROM event_log GROUP BY 1;
--      (will be empty until actions occur)
--   3. Wire rival functions when their source is available
-- ████████████████████████████████████████████████████████████
