-- ============================================================
-- THE COLOSSEUM — Reference/Evidence System Migration
-- Session 33 — March 4, 2026
-- 
-- Adds: debate_references table, moderator columns on debates,
--       moderator stats on profiles, submit/rule RPCs
-- 
-- Paste into Supabase SQL Editor → Run
-- Run AFTER colosseum-schema-production.sql and colosseum-ring3-functions.sql
-- ============================================================


-- ========================
-- 1. ADD MODERATOR COLUMNS TO DEBATES
-- ========================
ALTER TABLE arena_debates
  ADD COLUMN IF NOT EXISTS moderator_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS moderator_type TEXT DEFAULT 'none' CHECK (moderator_type IN ('none','ai','human')),
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_debates_moderator ON arena_debates(moderator_id) WHERE moderator_id IS NOT NULL;


-- ========================
-- 2. ADD MODERATOR STATS TO PROFILES
-- Guard trigger (LM-001) protects these — update via SECURITY DEFINER only
-- ========================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mod_rating NUMERIC(5,2) DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS mod_debates_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mod_rulings_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mod_approval_pct NUMERIC(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS is_moderator BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_available BOOLEAN DEFAULT false;


-- ========================
-- 3. UPDATE GUARD TRIGGER — add new protected columns
-- Must drop and recreate to include mod columns
-- ========================
CREATE OR REPLACE FUNCTION guard_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('role') NOT IN ('postgres', 'service_role') THEN
    NEW.elo_rating := OLD.elo_rating;
    NEW.wins := OLD.wins;
    NEW.losses := OLD.losses;
    NEW.draws := OLD.draws;
    NEW.current_streak := OLD.current_streak;
    NEW.best_streak := OLD.best_streak;
    NEW.debates_completed := OLD.debates_completed;
    NEW.level := OLD.level;
    NEW.xp := OLD.xp;
    NEW.token_balance := OLD.token_balance;
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.trust_score := OLD.trust_score;
    NEW.profile_depth_pct := OLD.profile_depth_pct;
    NEW.is_minor := OLD.is_minor;
    NEW.created_at := OLD.created_at;
    -- New moderator protected columns
    NEW.mod_rating := OLD.mod_rating;
    NEW.mod_debates_total := OLD.mod_debates_total;
    NEW.mod_rulings_total := OLD.mod_rulings_total;
    NEW.mod_approval_pct := OLD.mod_approval_pct;
  END IF;
  RETURN NEW;
END;
$$;


-- ========================
-- 4. DEBATE REFERENCES TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.debate_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES arena_debates(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id),
  round_number INTEGER NOT NULL,

  -- Content
  reference_type TEXT NOT NULL DEFAULT 'url' CHECK (reference_type IN ('url','text')),
  content TEXT NOT NULL,  -- URL or pasted text, max 500 chars enforced in function

  -- Ruling
  ruling TEXT DEFAULT 'pending' CHECK (ruling IN ('pending','allowed','denied')),
  ruled_by UUID REFERENCES public.profiles(id),  -- NULL = AI or auto-allowed
  ruled_by_type TEXT DEFAULT 'pending' CHECK (ruled_by_type IN ('pending','ai','human','auto')),
  ruling_reason TEXT,  -- one-line reason from moderator

  -- Cost
  token_cost INTEGER NOT NULL DEFAULT 0,
  sequence_in_round INTEGER NOT NULL DEFAULT 1,  -- 1st, 2nd, 3rd etc. this round

  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT now(),
  ruled_at TIMESTAMPTZ,

  -- Constraints
  CHECK (sequence_in_round BETWEEN 1 AND 5)
);

CREATE INDEX idx_references_debate ON public.debate_references(debate_id, round_number);
CREATE INDEX idx_references_pending ON public.debate_references(ruling) WHERE ruling = 'pending';

ALTER TABLE public.debate_references ENABLE ROW LEVEL SECURITY;

-- Debaters + moderator + spectators can read references for their debate
CREATE POLICY "References readable by participants" ON public.debate_references
  FOR SELECT USING (true);  -- references are public (part of the debate record)

-- Only server functions can INSERT/UPDATE (SECURITY DEFINER)
CREATE POLICY "References inserted by server" ON public.debate_references
  FOR INSERT WITH CHECK (false);  -- blocked at RLS, done via SECURITY DEFINER

CREATE POLICY "References updated by server" ON public.debate_references
  FOR UPDATE USING (false);  -- blocked at RLS, done via SECURITY DEFINER


-- ========================
-- 5. MODERATOR SCORE TABLE (post-debate scoring)
-- Debaters: 25 pts each (happy/not). Fans: 1-50 average.
-- ========================
CREATE TABLE IF NOT EXISTS public.moderator_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES arena_debates(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL REFERENCES public.profiles(id),
  scorer_id UUID NOT NULL REFERENCES public.profiles(id),
  scorer_role TEXT NOT NULL CHECK (scorer_role IN ('debater','spectator')),

  -- Debater: 25 = happy, 0 = not happy. Spectator: 1-50 scale.
  score INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now(),

  -- One score per person per debate
  UNIQUE(debate_id, scorer_id)
);

CREATE INDEX idx_mod_scores_debate ON public.moderator_scores(debate_id);
CREATE INDEX idx_mod_scores_mod ON public.moderator_scores(moderator_id);

ALTER TABLE public.moderator_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mod scores readable" ON public.moderator_scores
  FOR SELECT USING (true);

CREATE POLICY "Participants score moderator" ON public.moderator_scores
  FOR INSERT WITH CHECK (auth.uid() = scorer_id);


-- ========================
-- 6. SUBMIT REFERENCE — called by debater mid-round
-- Pauses debate, deducts tokens, creates pending reference
-- Cost: 1st free, 2nd 5, 3rd 15, 4th 35, 5th 50
-- ========================
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
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id FOR UPDATE;

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
  UPDATE arena_debates
  SET is_paused = true, paused_at = now(), updated_at = now()
  WHERE id = p_debate_id;

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


-- ========================
-- 7. RULE ON REFERENCE — called by moderator (human or AI)
-- Unpauses debate after ruling
-- ========================
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
  SELECT * INTO v_debate FROM arena_debates WHERE id = v_ref.debate_id;

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
  UPDATE arena_debates
  SET is_paused = false, paused_at = NULL, updated_at = now()
  WHERE id = v_ref.debate_id;

  -- Increment moderator rulings count (if human mod)
  IF p_ruled_by_type = 'human' AND v_debate.moderator_id IS NOT NULL THEN
    UPDATE public.profiles SET
      mod_rulings_total = mod_rulings_total + 1
    WHERE id = v_debate.moderator_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'ruling', p_ruling,
    'debate_id', v_ref.debate_id,
    'unpaused', true
  );
END;
$$;


-- ========================
-- 8. AUTO-ALLOW REFERENCE — called by client after 60s timeout
-- Service role only (client triggers via Edge Function or scheduled)
-- ========================
CREATE OR REPLACE FUNCTION auto_allow_expired_references()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER := 0;
  v_ref RECORD;
BEGIN
  -- Find all pending references older than 60 seconds
  FOR v_ref IN
    SELECT dr.id, dr.debate_id
    FROM public.debate_references dr
    JOIN arena_debates d ON d.id = dr.debate_id
    WHERE dr.ruling = 'pending'
      AND d.is_paused = true
      AND dr.submitted_at < now() - interval '60 seconds'
  LOOP
    -- Auto-allow
    UPDATE public.debate_references SET
      ruling = 'allowed',
      ruled_by_type = 'auto',
      ruling_reason = 'Auto-allowed (moderator timeout)',
      ruled_at = now()
    WHERE id = v_ref.id;

    -- Unpause debate
    UPDATE arena_debates
    SET is_paused = false, paused_at = NULL, updated_at = now()
    WHERE id = v_ref.debate_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;


-- ========================
-- 9. SCORE MODERATOR — called post-debate by debaters + spectators
-- Debaters: 0 or 25. Spectators: 1-50.
-- Updates mod_approval_pct as running average.
-- ========================
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
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;

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
  -- Formula: (sum of debater scores + average of spectator scores) per debate, averaged across all debates
  -- Simplified: running average of all individual scores normalized to 0-100
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

  RETURN json_build_object(
    'success', true,
    'role', v_role,
    'score', p_score,
    'new_approval', ROUND(v_new_approval, 2)
  );
END;
$$;


-- ========================
-- 10. ASSIGN MODERATOR — debater requests a mod for their debate
-- ========================
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
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id FOR UPDATE;

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
    UPDATE arena_debates SET
      moderator_type = 'ai',
      updated_at = now()
    WHERE id = p_debate_id;

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

  UPDATE arena_debates SET
    moderator_id = v_mod.id,
    moderator_type = 'human',
    updated_at = now()
  WHERE id = p_debate_id;

  RETURN json_build_object(
    'success', true,
    'moderator_type', 'human',
    'moderator_id', v_mod.id,
    'moderator_name', v_mod.display_name,
    'moderator_rating', v_mod.mod_rating
  );
END;
$$;
