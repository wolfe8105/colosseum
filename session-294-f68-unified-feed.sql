-- ============================================================
-- F-68: Unified Feed (Kill Hot Takes) — Phase 1 SQL
-- Session 294
-- ============================================================
-- arena_debates.status gains 'open' value (no CHECK constraint to alter)
-- New columns: content, reaction_count
-- New table: debate_reactions
-- New RPCs: create_debate_card, react_debate_card, accept_challenge, get_unified_feed
-- ============================================================

-- ── Step 1: Add columns to arena_debates ─────────────────────

ALTER TABLE public.arena_debates
  ADD COLUMN IF NOT EXISTS content TEXT DEFAULT NULL;

ALTER TABLE public.arena_debates
  ADD COLUMN IF NOT EXISTS reaction_count INT DEFAULT 0;

-- ── Step 2: debate_reactions table ───────────────────────────

CREATE TABLE IF NOT EXISTS public.debate_reactions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  debate_id   UUID NOT NULL REFERENCES public.arena_debates(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'fire',
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (debate_id, user_id)
);

ALTER TABLE public.debate_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debate_reactions_select" ON public.debate_reactions
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_debate_reactions_debate_id
  ON public.debate_reactions(debate_id);

CREATE INDEX IF NOT EXISTS idx_debate_reactions_user_id
  ON public.debate_reactions(user_id);

-- ── Step 3: create_debate_card() RPC ─────────────────────────

CREATE OR REPLACE FUNCTION public.create_debate_card(
  p_content TEXT,
  p_category TEXT DEFAULT 'trending',
  p_link_url TEXT DEFAULT NULL,
  p_link_preview JSONB DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate_id UUID;
  v_allowed BOOLEAN;
  v_clean_content TEXT;
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RAISE LOG 'SECURITY|auth_failure|anonymous|create_debate_card|unauthenticated call';
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Sanitize
  v_clean_content := sanitize_text(p_content);

  IF v_clean_content IS NULL OR char_length(trim(v_clean_content)) = 0 THEN
    RAISE EXCEPTION 'Content cannot be empty';
  END IF;
  IF char_length(v_clean_content) > 280 THEN
    RAISE LOG 'SECURITY|input_violation|%|create_debate_card|oversized content len=%', v_user_id, char_length(v_clean_content);
    RAISE EXCEPTION 'Content exceeds 280 characters';
  END IF;

  -- Category validation: known slugs or valid group UUID
  IF p_category NOT IN ('trending','politics','sports','entertainment','music','couples_court') THEN
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = p_category::uuid) THEN
        p_category := 'trending';
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      p_category := 'trending';
    END;
  END IF;

  -- Rate limit: 10 per hour
  v_allowed := check_rate_limit(v_user_id, 'debate_card', 60, 10);
  IF NOT v_allowed THEN
    RAISE LOG 'SECURITY|rate_limit_blocked|%|create_debate_card|limit exceeded', v_user_id;
    RAISE EXCEPTION 'Rate limit: max 10 posts per hour';
  END IF;

  -- Insert as open debate card
  INSERT INTO public.arena_debates (
    debater_a,
    topic,
    content,
    category,
    status,
    mode,
    link_url,
    link_preview,
    total_rounds,
    ranked
  ) VALUES (
    v_user_id,
    LEFT(v_clean_content, 80),   -- topic = truncated content
    v_clean_content,             -- full content
    p_category,
    'open',
    'live',                      -- default mode, overridable on accept
    p_link_url,
    p_link_preview,
    4,
    false
  )
  RETURNING id INTO v_debate_id;

  -- Log event
  PERFORM log_event(
    p_event_type := 'debate_card_posted',
    p_user_id    := v_user_id,
    p_debate_id  := v_debate_id,
    p_category   := p_category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'content_length', char_length(v_clean_content),
      'has_link', (p_link_url IS NOT NULL)
    )
  );

  RETURN json_build_object(
    'success', true,
    'id', v_debate_id,
    'category', p_category
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_debate_card(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ── Step 4: react_debate_card() RPC — toggle ─────────────────

CREATE OR REPLACE FUNCTION public.react_debate_card(
  p_debate_id UUID,
  p_reaction_type TEXT DEFAULT 'fire'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_exists BOOLEAN;
  v_new_count INT;
  v_card_author UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Look up card author
  SELECT debater_a INTO v_card_author
  FROM public.arena_debates
  WHERE id = p_debate_id;

  IF v_card_author IS NULL THEN
    RAISE EXCEPTION 'Debate card not found';
  END IF;

  -- Check if reaction exists (toggle behavior per LM-065)
  SELECT EXISTS(
    SELECT 1 FROM public.debate_reactions
    WHERE debate_id = p_debate_id AND user_id = v_user_id
  ) INTO v_exists;

  -- Block self-react on ADD only (allow REMOVE)
  IF NOT v_exists AND v_card_author = v_user_id THEN
    RAISE EXCEPTION 'Cannot react to your own post';
  END IF;

  IF v_exists THEN
    DELETE FROM public.debate_reactions
    WHERE debate_id = p_debate_id AND user_id = v_user_id;
  ELSE
    INSERT INTO public.debate_reactions (debate_id, user_id, reaction_type)
    VALUES (p_debate_id, v_user_id, COALESCE(p_reaction_type, 'fire'));
  END IF;

  -- Update denormalized count
  SELECT COUNT(*) INTO v_new_count
  FROM public.debate_reactions
  WHERE debate_id = p_debate_id;

  UPDATE public.arena_debates
  SET reaction_count = v_new_count
  WHERE id = p_debate_id;

  -- Log event
  PERFORM log_event(
    p_event_type := 'debate_card_reacted',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := NULL,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'action', CASE WHEN v_exists THEN 'remove' ELSE 'add' END,
      'reaction_type', p_reaction_type
    )
  );

  RETURN json_build_object(
    'success', true,
    'reacted', NOT v_exists,
    'reaction_count', v_new_count
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.react_debate_card(UUID, TEXT) TO authenticated;

-- ── Step 5: accept_challenge() RPC ───────────────────────────

CREATE OR REPLACE FUNCTION public.accept_challenge(
  p_debate_id UUID,
  p_counter_argument TEXT DEFAULT NULL,
  p_mode TEXT DEFAULT 'live',
  p_ruleset TEXT DEFAULT 'amplified',
  p_total_rounds INT DEFAULT 4
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_clean_arg TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock and fetch the card
  SELECT id, debater_a, status, category
  INTO v_debate
  FROM public.arena_debates
  WHERE id = p_debate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate card not found';
  END IF;

  IF v_debate.status != 'open' THEN
    RAISE EXCEPTION 'This card is no longer open for challenges';
  END IF;

  -- Can't challenge yourself
  IF v_debate.debater_a = v_user_id THEN
    RAISE EXCEPTION 'Cannot challenge your own post';
  END IF;

  -- Sanitize counter-argument if provided
  IF p_counter_argument IS NOT NULL AND char_length(trim(p_counter_argument)) > 0 THEN
    v_clean_arg := sanitize_text(p_counter_argument);
    IF char_length(v_clean_arg) > 500 THEN
      RAISE EXCEPTION 'Counter-argument must be under 500 characters';
    END IF;
  END IF;

  -- Validate mode
  IF p_mode NOT IN ('live', 'text', 'voicememo') THEN
    p_mode := 'live';
  END IF;

  -- Validate ruleset
  IF p_ruleset NOT IN ('amplified', 'unplugged') THEN
    p_ruleset := 'amplified';
  END IF;

  -- Validate rounds
  IF p_total_rounds NOT IN (2, 3, 4, 5) THEN
    p_total_rounds := 4;
  END IF;

  -- Transition: open → pending, fill debater_b
  UPDATE public.arena_debates
  SET debater_b = v_user_id,
      status = 'pending',
      mode = p_mode,
      ruleset = p_ruleset,
      total_rounds = p_total_rounds
  WHERE id = p_debate_id;

  -- Log event
  PERFORM log_event(
    p_event_type := 'challenge_accepted',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := 'b',
    p_metadata   := jsonb_build_object(
      'challenger_id', v_user_id,
      'original_poster', v_debate.debater_a,
      'mode', p_mode,
      'counter_argument_length', COALESCE(char_length(v_clean_arg), 0)
    )
  );

  RETURN json_build_object(
    'success', true,
    'debate_id', p_debate_id,
    'status', 'pending'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.accept_challenge(UUID, TEXT, TEXT, TEXT, INT) TO authenticated;

-- ── Step 6: get_unified_feed() RPC ───────────────────────────

CREATE OR REPLACE FUNCTION public.get_unified_feed(
  p_limit INT DEFAULT 100,
  p_category TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_to_json(d) ORDER BY d.created_at DESC)
    FROM (
      SELECT
        ad.id,
        ad.topic,
        ad.content,
        ad.category,
        ad.status,
        ad.mode,
        ad.ruleset,
        ad.current_round,
        ad.total_rounds,
        ad.score_a,
        ad.score_b,
        ad.vote_count_a,
        ad.vote_count_b,
        ad.reaction_count,
        ad.link_url,
        ad.link_preview,
        ad.ranked,
        ad.created_at,
        ad.debater_a,
        ad.debater_b,
        pa.username AS debater_a_username,
        pa.display_name AS debater_a_name,
        pa.elo_rating AS elo_a,
        pa.verified_gladiator AS verified_a,
        pb.username AS debater_b_username,
        pb.display_name AS debater_b_name,
        pb.elo_rating AS elo_b,
        pb.verified_gladiator AS verified_b
      FROM public.arena_debates ad
        LEFT JOIN public.profiles pa ON pa.id = ad.debater_a
        LEFT JOIN public.profiles pb ON pb.id = ad.debater_b
      WHERE ad.status IN ('open', 'pending', 'live', 'round_break', 'voting', 'complete')
        AND (p_category IS NULL OR ad.category = p_category)
        AND (p_status IS NULL OR ad.status = p_status)
      ORDER BY ad.created_at DESC
      LIMIT p_limit
    ) d
  ), '[]'::json);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_unified_feed(INT, TEXT, TEXT) TO anon, authenticated;

-- ── Step 7: search_index trigger for open debate cards ───────
-- Mirrors the existing trigger on hot_takes for search_all()

CREATE OR REPLACE FUNCTION public.update_search_index_debate_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
  IF NEW.status = 'open' AND NEW.content IS NOT NULL THEN
    INSERT INTO public.search_index (entity_type, entity_id, display_label, search_text, engagement_score)
    VALUES (
      'debate',
      NEW.id,
      LEFT(NEW.content, 80),
      NEW.content,
      0
    )
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET
      display_label = EXCLUDED.display_label,
      search_text = EXCLUDED.search_text,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

-- Fire on INSERT (new open cards) and UPDATE (status changes)
DROP TRIGGER IF EXISTS trg_search_index_debate_card ON public.arena_debates;
CREATE TRIGGER trg_search_index_debate_card
  AFTER INSERT OR UPDATE ON public.arena_debates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_search_index_debate_card();

-- ── Step 8: DM eligibility trigger for open cards ────────────
-- When an open card gets challenged (open → pending), create DM eligibility
-- between debater_a and debater_b. Uses ON CONFLICT DO NOTHING per LM-218.

CREATE OR REPLACE FUNCTION public.update_dm_eligibility_challenge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
  -- Only fire when status changes from 'open' to something else and debater_b is now set
  IF OLD.status = 'open' AND NEW.status != 'open'
     AND NEW.debater_a IS NOT NULL AND NEW.debater_b IS NOT NULL THEN
    INSERT INTO public.dm_eligibility (user_a, user_b)
    VALUES (
      LEAST(NEW.debater_a, NEW.debater_b),
      GREATEST(NEW.debater_a, NEW.debater_b)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_dm_eligibility_challenge ON public.arena_debates;
CREATE TRIGGER trg_dm_eligibility_challenge
  AFTER UPDATE ON public.arena_debates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dm_eligibility_challenge();

-- ── Done ─────────────────────────────────────────────────────
-- Post-migration checks:
--   SELECT COUNT(*) FROM arena_debates WHERE status = 'open';  -- should be 0 (no migration of existing hot_takes yet)
--   SELECT COUNT(*) FROM debate_reactions;  -- should be 0
--   SELECT * FROM pg_proc WHERE proname = 'create_debate_card';  -- should return 1 row
--   SELECT * FROM pg_proc WHERE proname = 'react_debate_card';   -- should return 1 row
--   SELECT * FROM pg_proc WHERE proname = 'accept_challenge';    -- should return 1 row
--   SELECT * FROM pg_proc WHERE proname = 'get_unified_feed';    -- should return 1 row
