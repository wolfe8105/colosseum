-- THE MODERATOR — Deployed Functions Export
-- Auto-generated from Supabase production database
-- Last updated: Session 252 (April 9, 2026) — F-55 Reference System Overhaul landed
--
-- This file is the source of truth for what RPCs are live in production.
-- Re-export after any session that modifies RPCs.

-- Domain: references

-- Functions: 20

-- Auto-generated from supabase-deployed-functions-export.sql


CREATE OR REPLACE FUNCTION public._canonical_fingerprint(p_title text, p_author text, p_date date, p_locator text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$

DECLARE
  v_t TEXT;
  v_a TEXT;
  v_l TEXT;
BEGIN
  -- Lowercase, strip non-alphanumeric except spaces, collapse whitespace, trim
  v_t := trim(regexp_replace(regexp_replace(lower(trim(p_title)), '[^a-z0-9 ]', '', 'g'), ' +', ' ', 'g'));
  v_a := trim(regexp_replace(regexp_replace(lower(trim(p_author)), '[^a-z0-9 ]', '', 'g'), ' +', ' ', 'g'));
  v_l := trim(regexp_replace(regexp_replace(lower(trim(p_locator)), '[^a-z0-9. ]', '', 'g'), ' +', ' ', 'g'));

  RETURN v_t || '|' || v_a || '|' || p_date::TEXT || '|' || v_l;
END;

$function$;

CREATE OR REPLACE FUNCTION public._recompute_reference_rarity_and_power(p_ref_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_ref       RECORD;
  v_composite INTEGER;
  v_new_rarity TEXT;
  v_ceiling   INTEGER;
  v_power     INTEGER;
  v_graduated BOOLEAN;
BEGIN
  SELECT * INTO v_ref FROM arsenal_references WHERE id = p_ref_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  -- Graduation latch: once true, stays true (one-way, never recomputed down)
  v_graduated := v_ref.graduated;
  IF NOT v_graduated AND v_ref.strikes >= 25 THEN
    v_graduated := true;
  END IF;

  -- Composite score = (seconds x 2) + strikes
  v_composite := (v_ref.seconds * 2) + v_ref.strikes;

  -- Rarity thresholds: Common 0-9, Uncommon 10-29, Rare 30-74, Legendary 75-199, Mythic 200+
  -- Mythic requires graduated = true
  IF v_graduated AND v_composite >= 200 THEN
    v_new_rarity := 'mythic';
  ELSIF v_composite >= 75 THEN
    v_new_rarity := 'legendary';
  ELSIF v_composite >= 30 THEN
    v_new_rarity := 'rare';
  ELSIF v_composite >= 10 THEN
    v_new_rarity := 'uncommon';
  ELSE
    v_new_rarity := 'common';
  END IF;

  -- Power ceiling by source_type: primary 5, academic 4, book 3, news 1, other 1
  CASE v_ref.source_type
    WHEN 'primary'  THEN v_ceiling := 5;
    WHEN 'academic' THEN v_ceiling := 4;
    WHEN 'book'     THEN v_ceiling := 3;
    WHEN 'news'     THEN v_ceiling := 1;
    WHEN 'other'    THEN v_ceiling := 1;
    ELSE v_ceiling := 1;
  END CASE;

  -- Power = min(ceiling, floor(seconds / 3)) + graduation_bonus
  v_power := LEAST(v_ceiling, FLOOR(v_ref.seconds / 3.0)::INTEGER);
  IF v_graduated THEN
    v_power := v_power + 1;
  END IF;

  UPDATE arsenal_references
  SET rarity        = v_new_rarity,
      current_power = v_power,
      graduated     = v_graduated
  WHERE id = p_ref_id;
END;

$function$;

CREATE OR REPLACE FUNCTION public._source_type_ceiling(p_source_type text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$

BEGIN
  CASE p_source_type
    WHEN 'peer-reviewed' THEN RETURN 5;
    WHEN 'data'          THEN RETURN 4;
    WHEN 'expert'        THEN RETURN 4;
    WHEN 'government'    THEN RETURN 3;
    WHEN 'news'          THEN RETURN 1;
    WHEN 'other'         THEN RETURN 1;
    ELSE RETURN 1;
  END CASE;
END;

$function$;

CREATE OR REPLACE FUNCTION public.challenge_reference(p_reference_id uuid, p_debate_id uuid, p_ruling text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id        uuid;
  v_ref            record;
  v_point_penalty  numeric := 10;
  v_new_points     numeric;
  v_new_power      integer;
BEGIN
  -- Auth check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate ruling
  IF p_ruling NOT IN ('upheld', 'rejected') THEN
    RAISE EXCEPTION 'Ruling must be upheld or rejected';
  END IF;

  -- Get the reference
  SELECT * INTO v_ref
    FROM public.arsenal_references
    WHERE id = p_reference_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;

  IF p_ruling = 'upheld' THEN
    -- Reference survives the challenge
    UPDATE public.arsenal_references
      SET challenge_count = challenge_count + 1,
          challenge_wins  = challenge_wins + 1
      WHERE id = p_reference_id;

    RETURN jsonb_build_object(
      'ruling', 'upheld',
      'challenge_wins', v_ref.challenge_wins + 1,
      'challenge_count', v_ref.challenge_count + 1,
      'message', 'Reference upheld by moderator'
    );

  ELSE
    -- Reference rejected: deduct verification points
    v_new_points := GREATEST(v_ref.verification_points - v_point_penalty, 0);
    v_new_power  := _calc_reference_power(v_ref.source_type, v_ref.power_ceiling, v_new_points);

    IF v_new_power > v_ref.power_ceiling THEN
      v_new_power := v_ref.power_ceiling;
    END IF;

    UPDATE public.arsenal_references
      SET challenge_count    = challenge_count + 1,
          challenge_losses   = challenge_losses + 1,
          verification_points = v_new_points,
          current_power       = v_new_power
      WHERE id = p_reference_id;

    -- Log the penalty
    PERFORM public.log_event(
      p_event_type := 'reference_challenge_lost',
      p_user_id    := v_ref.user_id,
      p_metadata   := jsonb_build_object(
        'reference_id', p_reference_id,
        'debate_id', p_debate_id,
        'points_deducted', v_point_penalty,
        'new_points', v_new_points,
        'old_power', v_ref.current_power,
        'new_power', v_new_power
      )
    );

    RETURN jsonb_build_object(
      'ruling', 'rejected',
      'challenge_losses', v_ref.challenge_losses + 1,
      'challenge_count', v_ref.challenge_count + 1,
      'points_deducted', v_point_penalty,
      'new_points', v_new_points,
      'new_power', v_new_power,
      'message', 'Reference rejected — verification points deducted'
    );
  END IF;
END;

$function$;

CREATE OR REPLACE FUNCTION public.challenge_reference(p_ref_id uuid, p_grounds text, p_context_debate_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id       UUID := auth.uid();
  v_ref           RECORD;
  v_escrow        INTEGER;
  v_debit         JSON;
  v_challenge_id  UUID;
  v_debate        RECORD;
  v_shield_row    RECORD;
  v_event_id      BIGINT;
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Load reference
  SELECT * INTO v_ref FROM arsenal_references WHERE id = p_ref_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;

  -- Cannot challenge own reference
  IF v_ref.user_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot challenge your own reference';
  END IF;

  -- Cannot challenge deleted or frozen refs
  IF v_ref.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot challenge a deleted reference';
  END IF;
  IF v_ref.challenge_status = 'frozen' THEN
    RAISE EXCEPTION 'Reference is already frozen';
  END IF;

  -- Check for existing pending challenge by this user on this ref
  IF EXISTS (
    SELECT 1 FROM reference_challenges
    WHERE reference_id = p_ref_id
      AND challenger_id = v_user_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a pending challenge on this reference';
  END IF;

  -- Escrow: in-debate = 10 tokens, out-of-debate = 25 tokens
  IF p_context_debate_id IS NOT NULL THEN
    v_escrow := 10;
  ELSE
    v_escrow := 25;
  END IF;

  -- Debit escrow
  v_debit := debit_tokens(v_user_id, v_escrow, 'challenge_reference_escrow');
  IF NOT (v_debit->>'success')::BOOLEAN THEN
    RAISE EXCEPTION 'Insufficient tokens for challenge escrow (need %)', v_escrow;
  END IF;

  -- If in-debate, check Shield power-up on opponent
  IF p_context_debate_id IS NOT NULL THEN
    SELECT * INTO v_debate FROM arena_debates WHERE id = p_context_debate_id;

    IF v_debate IS NOT NULL AND v_debate.status = 'live' THEN
      SELECT * INTO v_shield_row
        FROM debate_power_ups
        WHERE debate_id = p_context_debate_id
          AND user_id = v_ref.user_id
          AND power_up_id = 'shield'
          AND activated = false
        LIMIT 1
        FOR UPDATE;

      IF v_shield_row IS NOT NULL THEN
        -- Shield absorbs the challenge — refund escrow
        UPDATE profiles
        SET token_balance = token_balance + v_escrow
        WHERE id = v_user_id;

        INSERT INTO token_transactions (user_id, amount, type, source, balance_after)
        VALUES (v_user_id, v_escrow, 'refund', 'challenge_shield_block',
                (SELECT token_balance FROM profiles WHERE id = v_user_id));

        -- Activate shield
        UPDATE debate_power_ups
        SET activated = true, activated_at = now()
        WHERE id = v_shield_row.id;

        -- Insert shield block feed event
        INSERT INTO debate_feed_events (
          debate_id, user_id, event_type, round, side, content,
          reference_id, metadata
        ) VALUES (
          p_context_debate_id, v_ref.user_id, 'power_up', 0,
          CASE WHEN v_ref.user_id = v_debate.debater_a THEN 'a' ELSE 'b' END,
          'SHIELD BLOCKED! Reference is protected.',
          p_ref_id,
          jsonb_build_object(
            'power_up_id', 'shield',
            'blocked_challenger', v_user_id,
            'claim', v_ref.claim_text
          )
        )
        RETURNING id INTO v_event_id;

        RETURN jsonb_build_object(
          'action', 'shield_blocked',
          'event_id', v_event_id,
          'message', 'Shield absorbed the challenge. Escrow refunded.'
        );
      END IF;
    END IF;
  END IF;

  -- No Shield or out-of-debate — file the challenge
  INSERT INTO reference_challenges (
    reference_id, challenger_id, debate_id, grounds, escrow_amount, status
  ) VALUES (
    p_ref_id, v_user_id, p_context_debate_id, p_grounds, v_escrow, 'pending'
  )
  RETURNING id INTO v_challenge_id;

  -- If in-debate, insert feed event
  IF p_context_debate_id IS NOT NULL AND v_debate IS NOT NULL THEN
    INSERT INTO debate_feed_events (
      debate_id, user_id, event_type, round, side, content,
      reference_id, metadata
    ) VALUES (
      p_context_debate_id, v_user_id, 'reference_challenge', 0,
      CASE WHEN v_user_id = v_debate.debater_a THEN 'a' ELSE 'b' END,
      sanitize_text(v_ref.claim_text),
      p_ref_id,
      jsonb_build_object(
        'challenge_id', v_challenge_id,
        'challenged_user', v_ref.user_id,
        'grounds', p_grounds,
        'source_type', v_ref.source_type
      )
    );
  END IF;

  -- Analytics
  PERFORM log_event(
    p_event_type := 'reference_challenged',
    p_user_id := v_user_id,
    p_debate_id := p_context_debate_id,
    p_metadata := jsonb_build_object(
      'challenge_id', v_challenge_id,
      'reference_id', p_ref_id,
      'escrow', v_escrow,
      'in_debate', p_context_debate_id IS NOT NULL
    )
  );

  RETURN jsonb_build_object(
    'action', 'challenged',
    'challenge_id', v_challenge_id,
    'escrow_amount', v_escrow
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.cite_debate_reference(p_debate_id uuid, p_reference_id uuid, p_round integer, p_side text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_uid           UUID := auth.uid();
  v_debate        RECORD;
  v_loadout       RECORD;
  v_ref           RECORD;
  v_event_id      BIGINT;
  v_is_bot_a      BOOLEAN;
  v_is_bot_b      BOOLEAN;
  v_cites_this_round INTEGER;
  v_cite_cost     INTEGER;
  v_debit         JSON;
BEGIN
  -- Auth
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate side
  IF p_side NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'Side must be a or b';
  END IF;

  -- Load debate
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status != 'live' THEN
    RAISE EXCEPTION 'Debate is not live';
  END IF;

  -- Caller must be the debater matching p_side
  IF (p_side = 'a' AND v_uid != v_debate.debater_a)
  OR (p_side = 'b' AND v_uid != v_debate.debater_b) THEN
    RAISE EXCEPTION 'Side does not match your role';
  END IF;

  -- Bot-pair check (LM-207): if either debater is a bot, reject cite
  SELECT is_bot INTO v_is_bot_a FROM profiles WHERE id = v_debate.debater_a;
  SELECT is_bot INTO v_is_bot_b FROM profiles WHERE id = v_debate.debater_b;
  IF COALESCE(v_is_bot_a, false) OR COALESCE(v_is_bot_b, false) THEN
    RAISE EXCEPTION 'Bot accounts cannot cite references';
  END IF;

  -- Load arsenal reference
  SELECT * INTO v_ref FROM arsenal_references WHERE id = p_reference_id;
  IF v_ref IS NULL THEN
    RAISE EXCEPTION 'Arsenal reference not found';
  END IF;

  -- Deleted ref check
  IF v_ref.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot cite a deleted reference';
  END IF;

  -- Frozen ref check
  IF v_ref.challenge_status = 'frozen' THEN
    RAISE EXCEPTION 'Cannot cite a frozen reference';
  END IF;

  -- Check loadout: reference must be loaded and not yet cited
  SELECT * INTO v_loadout
    FROM debate_reference_loadouts
    WHERE debate_id = p_debate_id
      AND user_id = v_uid
      AND reference_id = p_reference_id
    FOR UPDATE;

  IF v_loadout IS NULL THEN
    RAISE EXCEPTION 'Reference not in your loadout for this debate';
  END IF;
  IF v_loadout.cited THEN
    RAISE EXCEPTION 'Reference already cited (one and done)';
  END IF;

  -- Per-round cite cost escalation: 1st free, 2nd 5t, 3rd 15t, 4th 35t, 5th 50t, cap 5/round
  SELECT COUNT(*) INTO v_cites_this_round
    FROM debate_feed_events
    WHERE debate_id = p_debate_id
      AND user_id = v_uid
      AND event_type = 'reference_cite'
      AND round = p_round;

  IF v_cites_this_round >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 citations per round reached';
  END IF;

  -- Cost schedule
  CASE v_cites_this_round
    WHEN 0 THEN v_cite_cost := 0;   -- 1st free
    WHEN 1 THEN v_cite_cost := 5;
    WHEN 2 THEN v_cite_cost := 15;
    WHEN 3 THEN v_cite_cost := 35;
    WHEN 4 THEN v_cite_cost := 50;
    ELSE v_cite_cost := 50;
  END CASE;

  -- Debit cite cost (burns to platform, not routed to forger)
  IF v_cite_cost > 0 THEN
    v_debit := debit_tokens(v_uid, v_cite_cost, 'cite_reference_round');
    IF NOT (v_debit->>'success')::BOOLEAN THEN
      RAISE EXCEPTION 'Insufficient tokens for citation (need %)', v_cite_cost;
    END IF;
  END IF;

  -- Mark cited + snapshot rarity at cite time
  UPDATE debate_reference_loadouts
  SET cited = true,
      cited_at = now(),
      rarity_at_cite = v_ref.rarity
  WHERE id = v_loadout.id;

  -- Update strikes on arsenal reference
  UPDATE arsenal_references
  SET strikes = strikes + 1
  WHERE id = p_reference_id;

  -- Recompute rarity and power
  PERFORM _recompute_reference_rarity_and_power(p_reference_id);

  -- Insert feed event
  INSERT INTO debate_feed_events (
    debate_id, user_id, event_type, round, side, content,
    reference_id, metadata
  ) VALUES (
    p_debate_id, v_uid, 'reference_cite', p_round, p_side,
    sanitize_text(v_ref.claim_text),
    p_reference_id,
    jsonb_build_object(
      'source_url', v_ref.source_url,
      'source_title', v_ref.source_title,
      'source_author', v_ref.source_author,
      'source_type', v_ref.source_type,
      'current_power', v_ref.current_power,
      'rarity', v_ref.rarity,
      'cite_cost', v_cite_cost
    )
  )
  RETURNING id INTO v_event_id;

  -- Analytics
  PERFORM log_event(
    p_event_type := 'feed_reference_cite',
    p_user_id := v_uid,
    p_debate_id := p_debate_id,
    p_category := v_debate.category,
    p_side := p_side,
    p_metadata := jsonb_build_object(
      'feed_event_id', v_event_id,
      'round', p_round,
      'reference_id', p_reference_id,
      'source_type', v_ref.source_type,
      'cite_cost', v_cite_cost
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'claim', v_ref.claim_text,
    'reference_id', p_reference_id
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.cite_reference(p_reference_id uuid, p_debate_id uuid, p_outcome text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- In F-55 the outcome tracking (win/loss per ref) is replaced by royalties.
  -- This function is kept as a no-op for backward compatibility.
  RETURN jsonb_build_object('action', 'acknowledged');
END;

$function$;

CREATE OR REPLACE FUNCTION public.delete_reference(p_ref_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id       UUID := auth.uid();
  v_ref           RECORD;
  v_delete_count  INTEGER;
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Load reference
  SELECT * INTO v_ref FROM arsenal_references WHERE id = p_ref_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;

  -- Ownership check
  IF v_ref.user_id != v_user_id THEN
    RAISE EXCEPTION 'You can only delete your own references';
  END IF;

  -- Already deleted?
  IF v_ref.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Reference is already deleted';
  END IF;

  -- Rate limit: max 7 deletes per 24h
  SELECT COUNT(*) INTO v_delete_count
    FROM arsenal_references
    WHERE user_id = v_user_id
      AND deleted_at IS NOT NULL
      AND deleted_at > now() - INTERVAL '24 hours';

  IF v_delete_count >= 7 THEN
    RAISE EXCEPTION 'Delete rate limit reached (max 7 per 24 hours)';
  END IF;

  -- Soft-delete the reference
  UPDATE arsenal_references
  SET deleted_at = now()
  WHERE id = p_ref_id;

  -- Burn socketed modifiers (soft-delete doesn't cascade, so explicit delete)
  DELETE FROM reference_sockets WHERE reference_id = p_ref_id;

  -- Do NOT cascade-delete debate_references — historical pointers preserved for replay integrity

  RETURN jsonb_build_object('action', 'deleted');
END;

$function$;

CREATE OR REPLACE FUNCTION public.edit_reference(p_reference_id uuid, p_claim text DEFAULT NULL::text, p_url text DEFAULT NULL::text, p_author text DEFAULT NULL::text, p_publication_year integer DEFAULT NULL::integer, p_source_type text DEFAULT NULL::text, p_category text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id   uuid;
  v_ref       record;
  v_domain    text;
  v_ceiling   integer;
  v_valid_sources text[] := ARRAY['peer-reviewed','data','expert','government','news','other'];
  v_valid_cats    text[] := ARRAY['politics','sports','tech','science','entertainment','business','health','general'];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_ref
    FROM public.arsenal_references
    WHERE id = p_reference_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;

  IF v_ref.user_id != v_user_id THEN
    RAISE EXCEPTION 'Not your reference';
  END IF;

  IF v_ref.verification_points > 0 THEN
    RAISE EXCEPTION 'Cannot edit a verified reference';
  END IF;

  IF p_source_type IS NOT NULL AND p_source_type != '' THEN
    IF NOT (p_source_type = ANY(v_valid_sources)) THEN
      RAISE EXCEPTION 'Invalid source type: %', p_source_type;
    END IF;
    v_ceiling := CASE p_source_type
      WHEN 'peer-reviewed' THEN 5
      WHEN 'data'          THEN 4
      WHEN 'expert'        THEN 4
      WHEN 'government'    THEN 3
      WHEN 'news'          THEN 1
      WHEN 'other'         THEN 1
    END;
  END IF;

  IF p_category IS NOT NULL AND p_category != '' THEN
    IF NOT (p_category = ANY(v_valid_cats)) THEN
      RAISE EXCEPTION 'Invalid category: %', p_category;
    END IF;
  END IF;

  IF p_url IS NOT NULL AND p_url != '' THEN
    IF NOT (p_url ~* '^https?://') THEN
      RAISE EXCEPTION 'URL must start with http:// or https://';
    END IF;
    p_url := sanitize_url(p_url);
    v_domain := regexp_replace(
      regexp_replace(p_url, '^https?://(www\.)?', ''),
      '/.*$', ''
    );
  END IF;

  IF p_claim IS NOT NULL AND p_claim != '' THEN
    IF length(trim(p_claim)) < 5 THEN
      RAISE EXCEPTION 'Claim must be at least 5 characters';
    END IF;
    IF length(trim(p_claim)) > 120 THEN
      RAISE EXCEPTION 'Claim must be 120 characters or fewer';
    END IF;
    p_claim := sanitize_text(p_claim);
  END IF;

  IF p_author IS NOT NULL AND p_author != '' THEN
    IF length(trim(p_author)) < 2 THEN
      RAISE EXCEPTION 'Author must be at least 2 characters';
    END IF;
    p_author := sanitize_text(p_author);
  END IF;

  UPDATE public.arsenal_references SET
    claim            = COALESCE(NULLIF(p_claim, ''),            claim),
    url              = COALESCE(NULLIF(p_url, ''),              url),
    domain           = COALESCE(v_domain,                       domain),
    author           = COALESCE(NULLIF(p_author, ''),           author),
    publication_year = COALESCE(p_publication_year,              publication_year),
    source_type      = COALESCE(NULLIF(p_source_type, ''),      source_type),
    power_ceiling    = COALESCE(v_ceiling,                      power_ceiling),
    category         = COALESCE(NULLIF(p_category, ''),         category)
  WHERE id = p_reference_id;

  -- FIXED: named parameters to resolve type ambiguity
  PERFORM log_event(p_event_type := 'reference_edited', p_metadata := jsonb_build_object('reference_id', p_reference_id));

  RETURN jsonb_build_object('success', true, 'reference_id', p_reference_id);
END;

$function$;

CREATE OR REPLACE FUNCTION public.edit_reference(p_ref_id uuid, p_source_title text, p_source_author text, p_source_date date, p_locator text, p_claim_text text, p_category text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id     UUID := auth.uid();
  v_ref         RECORD;
  v_fingerprint TEXT;
  v_collision   RECORD;
  v_cost        INTEGER := 10;
  v_debit       JSON;
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Load reference
  SELECT * INTO v_ref FROM arsenal_references WHERE id = p_ref_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;

  -- Ownership check
  IF v_ref.user_id != v_user_id THEN
    RAISE EXCEPTION 'You can only edit your own references';
  END IF;

  -- Cannot edit deleted refs
  IF v_ref.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot edit a deleted reference';
  END IF;

  -- Category whitelist (LM-208)
  IF p_category NOT IN ('politics','sports','entertainment','music','couples_court') THEN
    RAISE EXCEPTION 'Invalid category: %', p_category;
  END IF;

  -- Field validation
  IF length(trim(p_source_title)) < 2 THEN
    RAISE EXCEPTION 'Source title must be at least 2 characters';
  END IF;
  IF length(trim(p_source_author)) < 2 THEN
    RAISE EXCEPTION 'Source author must be at least 2 characters';
  END IF;
  IF length(trim(p_locator)) < 1 THEN
    RAISE EXCEPTION 'Locator must not be empty';
  END IF;
  IF length(trim(p_claim_text)) < 5 THEN
    RAISE EXCEPTION 'Claim text must be at least 5 characters';
  END IF;

  -- Recompute fingerprint (source_type excluded — locked at creation, LM-206)
  v_fingerprint := _canonical_fingerprint(p_source_title, p_source_author, p_source_date, p_locator);

  -- Check collision against OTHER refs (exclude self)
  SELECT id, user_id, source_title INTO v_collision
    FROM arsenal_references
    WHERE canonical_fingerprint = v_fingerprint
      AND id != p_ref_id
    LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'action', 'collision',
      'existing_ref_id', v_collision.id,
      'existing_owner', v_collision.user_id,
      'existing_name', v_collision.source_title
    );
  END IF;

  -- Debit edit fee
  v_debit := debit_tokens(v_user_id, v_cost, 'edit_reference');
  IF NOT (v_debit->>'success')::BOOLEAN THEN
    RAISE EXCEPTION 'Insufficient tokens to edit (need %)', v_cost;
  END IF;

  -- Update editable fields. challenge_status preserved (Disputed badges survive edits per spec S133).
  UPDATE arsenal_references
  SET source_title          = trim(p_source_title),
      source_author         = trim(p_source_author),
      source_date           = p_source_date,
      locator               = trim(p_locator),
      claim_text            = trim(p_claim_text),
      category              = p_category,
      canonical_fingerprint = v_fingerprint
  WHERE id = p_ref_id;

  RETURN jsonb_build_object('action', 'edited');
END;

$function$;

CREATE OR REPLACE FUNCTION public.file_reference_challenge(p_debate_id uuid, p_reference_id uuid, p_round integer, p_side text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_result JSONB;
BEGIN
  -- Delegate to the new unified challenge_reference RPC
  v_result := challenge_reference(
    p_ref_id := p_reference_id,
    p_grounds := 'In-debate challenge (round ' || p_round || ')',
    p_context_debate_id := p_debate_id
  );

  -- Translate response format for backward compatibility
  IF v_result->>'action' = 'shield_blocked' THEN
    RETURN jsonb_build_object(
      'blocked', true,
      'event_id', v_result->'event_id',
      'message', 'Shield absorbed the challenge'
    );
  ELSE
    RETURN jsonb_build_object(
      'blocked', false,
      'event_id', 0,
      'challenges_remaining', 3,
      'challenge_id', v_result->>'challenge_id'
    );
  END IF;
END;

$function$;

CREATE OR REPLACE FUNCTION public.forge_reference(p_claim text, p_url text, p_author text, p_publication_year integer, p_source_type text, p_category text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id  uuid;
  v_domain   text;
  v_ceiling  integer;
  v_ref_id   uuid;
BEGIN
  -- Auth check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate source_type
  IF p_source_type NOT IN ('peer-reviewed','data','expert','government','news','other') THEN
    RAISE EXCEPTION 'Invalid source_type: %', p_source_type;
  END IF;

  -- Validate category
  IF p_category NOT IN ('politics','sports','tech','science','entertainment','business','health','general') THEN
    RAISE EXCEPTION 'Invalid category: %', p_category;
  END IF;

  -- Validate URL format
  IF p_url !~ '^https?://' THEN
    RAISE EXCEPTION 'URL must start with http:// or https://';
  END IF;

  -- Extract domain from URL
  v_domain := regexp_replace(
    regexp_replace(p_url, '^https?://(www\.)?', ''),
    '/.*$', ''
  );

  -- Get ceiling from source type
  v_ceiling := _source_type_ceiling(p_source_type);

  -- Insert
  INSERT INTO public.arsenal_references (
    user_id, claim, url, domain, author, publication_year,
    source_type, power_ceiling, category
  ) VALUES (
    v_user_id,
    trim(p_claim),
    trim(p_url),
    v_domain,
    trim(p_author),
    p_publication_year,
    p_source_type,
    v_ceiling,
    p_category
  )
  RETURNING id INTO v_ref_id;

  -- Log event
  PERFORM public.log_event(
    p_event_type := 'reference_forged',
    p_user_id    := v_user_id,
    p_metadata   := jsonb_build_object(
      'reference_id', v_ref_id,
      'source_type', p_source_type,
      'category', p_category,
      'power_ceiling', v_ceiling
    )
  );

  RETURN v_ref_id;
END;

$function$;

CREATE OR REPLACE FUNCTION public.forge_reference(p_source_title text, p_source_author text, p_source_date date, p_locator text, p_claim_text text, p_source_type text, p_category text, p_source_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id     UUID := auth.uid();
  v_fingerprint TEXT;
  v_existing    RECORD;
  v_cost        INTEGER := 50;  -- PARKED VALUE: forging cost placeholder
  v_debit       JSON;
  v_ref_id      UUID;
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Source type validation
  IF p_source_type NOT IN ('primary','academic','book','news','other') THEN
    RAISE EXCEPTION 'Invalid source_type: %', p_source_type;
  END IF;

  -- Category whitelist (LM-208: 'general' blocked from forge)
  IF p_category NOT IN ('politics','sports','entertainment','music','couples_court') THEN
    RAISE EXCEPTION 'Invalid category: %. general is not allowed for references.', p_category;
  END IF;

  -- Field validation
  IF length(trim(p_source_title)) < 2 THEN
    RAISE EXCEPTION 'Source title must be at least 2 characters';
  END IF;
  IF length(trim(p_source_author)) < 2 THEN
    RAISE EXCEPTION 'Source author must be at least 2 characters';
  END IF;
  IF length(trim(p_locator)) < 1 THEN
    RAISE EXCEPTION 'Locator must not be empty';
  END IF;
  IF length(trim(p_claim_text)) < 5 THEN
    RAISE EXCEPTION 'Claim text must be at least 5 characters';
  END IF;

  -- Compute fingerprint
  v_fingerprint := _canonical_fingerprint(p_source_title, p_source_author, p_source_date, p_locator);

  -- Check for existing fingerprint collision
  SELECT id, user_id, source_title INTO v_existing
    FROM arsenal_references
    WHERE canonical_fingerprint = v_fingerprint
    LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'action', 'collision',
      'existing_ref_id', v_existing.id,
      'existing_owner', v_existing.user_id,
      'existing_name', v_existing.source_title
    );
  END IF;

  -- Debit forging cost
  v_debit := debit_tokens(v_user_id, v_cost, 'forge_reference');
  IF NOT (v_debit->>'success')::BOOLEAN THEN
    RAISE EXCEPTION 'Insufficient tokens to forge (need %)', v_cost;
  END IF;

  -- Insert new reference
  INSERT INTO arsenal_references (
    user_id, source_title, source_author, source_date, locator,
    claim_text, source_type, category, source_url, canonical_fingerprint,
    seconds, strikes, rarity, current_power, graduated, challenge_status
  ) VALUES (
    v_user_id, trim(p_source_title), trim(p_source_author), p_source_date, trim(p_locator),
    trim(p_claim_text), p_source_type, p_category, p_source_url,
    v_fingerprint, 0, 0, 'common', 0, false, 'none'
  )
  RETURNING id INTO v_ref_id;

  -- Analytics
  PERFORM log_event(
    p_event_type := 'reference_forged',
    p_user_id := v_user_id,
    p_category := p_category,
    p_metadata := jsonb_build_object(
      'ref_id', v_ref_id,
      'source_type', p_source_type,
      'cost', v_cost
    )
  );

  RETURN jsonb_build_object('action', 'forged', 'ref_id', v_ref_id);
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_debate_references(p_debate_id uuid)
 RETURNS TABLE(id uuid, debate_id uuid, submitter_id uuid, round integer, url text, description text, supports_side text, ruling text, ruling_reason text, ruled_by uuid, created_at timestamp with time zone, ruled_at timestamp with time zone, submitter_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.debate_id,
    r.submitter_id,
    r.round,
    r.url,
    r.description,
    r.supports_side,
    r.ruling,
    r.ruling_reason,
    r.ruled_by,
    r.created_at,
    r.ruled_at,
    p.display_name AS submitter_name
  FROM public.debate_references r
  LEFT JOIN public.profiles p ON p.id = r.submitter_id
  WHERE r.debate_id = p_debate_id
  ORDER BY r.created_at ASC;
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_my_arsenal()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
    FROM (
      SELECT id, user_id, source_title, source_author, source_date, locator,
             claim_text, source_type, category, source_url, seconds, strikes,
             rarity, current_power, graduated, challenge_status, created_at
      FROM arsenal_references
      WHERE user_id = v_user_id
        AND deleted_at IS NULL
      ORDER BY current_power DESC, created_at DESC
    ) r
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.get_reference_library(p_category text DEFAULT NULL::text, p_rarity text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
    FROM (
      SELECT ar.id, ar.user_id, ar.source_title, ar.source_author, ar.source_date,
             ar.locator, ar.claim_text, ar.source_type, ar.category, ar.source_url,
             ar.seconds, ar.strikes, ar.rarity, ar.current_power, ar.graduated,
             ar.challenge_status, ar.created_at,
             p.username AS owner_username
      FROM arsenal_references ar
      JOIN profiles p ON p.id = ar.user_id
      WHERE ar.deleted_at IS NULL
        AND (p_category IS NULL OR ar.category = p_category)
        AND (p_rarity IS NULL OR ar.rarity = p_rarity)
      ORDER BY ar.current_power DESC, ar.strikes DESC, ar.created_at DESC
      LIMIT 200
    ) r
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.rule_on_reference(p_reference_id uuid, p_ruling text, p_reason text DEFAULT NULL::text, p_ruled_by_type text DEFAULT 'human'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

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
      THEN left(trim(p_reason), 200)
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

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'reference_ruled',
    p_user_id    := CASE WHEN p_ruled_by_type = 'human' THEN v_user_id ELSE NULL END,
    p_debate_id  := v_ref.debate_id,
    p_category   := v_debate.category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
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

$function$;

CREATE OR REPLACE FUNCTION public.rule_on_reference(p_challenge_id uuid, p_ruling text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id     UUID := auth.uid();
  v_challenge   RECORD;
  v_ref         RECORD;
  v_new_seconds INTEGER;
  v_new_status  TEXT;
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ruling validation
  IF p_ruling NOT IN ('upheld', 'denied') THEN
    RAISE EXCEPTION 'Ruling must be upheld or denied';
  END IF;

  -- Load challenge
  SELECT * INTO v_challenge FROM reference_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;
  IF v_challenge.status != 'pending' THEN
    RAISE EXCEPTION 'Challenge already ruled on';
  END IF;

  -- Load reference
  SELECT * INTO v_ref FROM arsenal_references WHERE id = v_challenge.reference_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;

  IF p_ruling = 'upheld' THEN
    -- Challenger wins — ref is at fault
    -- Refund challenger escrow
    UPDATE profiles
    SET token_balance = token_balance + v_challenge.escrow_amount
    WHERE id = v_challenge.challenger_id;

    INSERT INTO token_transactions (user_id, amount, type, source, balance_after)
    VALUES (v_challenge.challenger_id, v_challenge.escrow_amount, 'refund', 'challenge_upheld',
            (SELECT token_balance FROM profiles WHERE id = v_challenge.challenger_id));

    -- Apply graduated penalty based on current challenge_status
    CASE v_ref.challenge_status
      WHEN 'none' THEN
        -- 1st upheld: -5 seconds, status → 'disputed'
        v_new_seconds := GREATEST(v_ref.seconds - 5, 0);
        v_new_status := 'disputed';
      WHEN 'disputed' THEN
        -- 2nd upheld: -5 seconds, status → 'heavily_disputed'
        v_new_seconds := GREATEST(v_ref.seconds - 5, 0);
        v_new_status := 'heavily_disputed';
      WHEN 'heavily_disputed' THEN
        -- 3rd upheld: status → 'frozen' (no more seconds deduction)
        v_new_seconds := v_ref.seconds;
        v_new_status := 'frozen';
      ELSE
        -- Already frozen — shouldn't happen but defend
        v_new_seconds := v_ref.seconds;
        v_new_status := v_ref.challenge_status;
    END CASE;

    UPDATE arsenal_references
    SET seconds = v_new_seconds,
        challenge_status = v_new_status
    WHERE id = v_challenge.reference_id;

    -- Recompute rarity and power after seconds adjustment
    PERFORM _recompute_reference_rarity_and_power(v_challenge.reference_id);

  ELSE
    -- Ruling = 'denied' — burn challenger escrow (already debited, no refund)
    -- No ref penalty
    v_new_status := v_ref.challenge_status;
  END IF;

  -- Update challenge record
  UPDATE reference_challenges
  SET status = p_ruling,
      ruled_at = now()
  WHERE id = p_challenge_id;

  -- Analytics
  PERFORM log_event(
    p_event_type := 'reference_ruling',
    p_user_id := v_user_id,
    p_debate_id := v_challenge.debate_id,
    p_metadata := jsonb_build_object(
      'challenge_id', p_challenge_id,
      'reference_id', v_challenge.reference_id,
      'ruling', p_ruling,
      'new_challenge_status', v_new_status
    )
  );

  RETURN jsonb_build_object(
    'action', 'ruled',
    'ruling', p_ruling,
    'new_challenge_status', v_new_status
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.second_reference(p_ref_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id       UUID := auth.uid();
  v_ref           RECORD;
  v_profile_depth INTEGER;
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Profile depth gate: must be >= 25%
  SELECT profile_depth_pct INTO v_profile_depth
    FROM profiles WHERE id = v_user_id;
  IF v_profile_depth IS NULL OR v_profile_depth < 25 THEN
    RAISE EXCEPTION 'Profile must be at least 25%% complete to second references';
  END IF;

  -- Load reference
  SELECT * INTO v_ref FROM arsenal_references WHERE id = p_ref_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;

  -- Cannot second deleted refs
  IF v_ref.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot second a deleted reference';
  END IF;

  -- Self-seconding hard block
  IF v_ref.user_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot second your own reference';
  END IF;

  -- Check for existing seconding (unique constraint also catches this)
  IF EXISTS (
    SELECT 1 FROM reference_seconds
    WHERE reference_id = p_ref_id AND voter_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Already seconded this reference';
  END IF;

  -- Insert seconding record
  INSERT INTO reference_seconds (reference_id, voter_id)
  VALUES (p_ref_id, v_user_id);

  -- Increment seconds counter
  UPDATE arsenal_references
  SET seconds = seconds + 1
  WHERE id = p_ref_id;

  -- Recompute rarity and power
  PERFORM _recompute_reference_rarity_and_power(p_ref_id);

  -- Re-read for response
  SELECT seconds, strikes, rarity, current_power, graduated
  INTO v_ref
  FROM arsenal_references WHERE id = p_ref_id;

  RETURN jsonb_build_object(
    'action', 'seconded',
    'seconds', v_ref.seconds,
    'strikes', v_ref.strikes,
    'rarity', v_ref.rarity,
    'current_power', v_ref.current_power
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.submit_reference(p_debate_id uuid, p_content text, p_reference_type text DEFAULT 'url'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_debate RECORD;
  v_count INTEGER;
  v_cost INTEGER;
  v_balance INTEGER;
  v_clean TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE LOG 'SECURITY|auth_failure|anonymous|submit_reference|unauthenticated reference submit';
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF length(p_content) > 500 THEN
    RAISE EXCEPTION 'Reference content too long (max 500 characters)';
  END IF;
  IF length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Reference content cannot be empty';
  END IF;

  v_clean := trim(p_content);
  IF p_reference_type = 'url' THEN
    IF v_clean !~ '^https?://' THEN
      RAISE EXCEPTION 'URL must start with http:// or https://';
    END IF;
    v_clean := regexp_replace(v_clean, '<[^>]*>', '', 'g');
  ELSE
    v_clean := regexp_replace(v_clean, '<[^>]*>', '', 'g');
  END IF;

  SELECT * INTO v_debate FROM public.debates WHERE id = p_debate_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_debate.status != 'live' THEN
    RAISE EXCEPTION 'Debate is not live';
  END IF;
  IF v_user_id NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE LOG 'SECURITY|access_denied|%|submit_reference|non-debater submitting evidence debate=%', v_user_id, p_debate_id;
    RAISE EXCEPTION 'Only debaters can submit references';
  END IF;
  IF v_debate.is_paused THEN
    RAISE EXCEPTION 'Debate is already paused for evidence review';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.debate_references
  WHERE debate_id = p_debate_id
    AND submitted_by = v_user_id
    AND round_number = v_debate.current_round;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 references per round reached';
  END IF;

  v_cost := CASE v_count
    WHEN 0 THEN 0
    WHEN 1 THEN 5
    WHEN 2 THEN 15
    WHEN 3 THEN 35
    WHEN 4 THEN 50
  END;

  IF v_cost > 0 THEN
    SELECT token_balance INTO v_balance FROM public.profiles WHERE id = v_user_id;
    IF v_balance < v_cost THEN
      RAISE EXCEPTION 'Not enough tokens (need %, have %)', v_cost, v_balance;
    END IF;
    UPDATE public.profiles SET token_balance = token_balance - v_cost WHERE id = v_user_id;
  END IF;

  INSERT INTO public.debate_references (
    debate_id, submitted_by, round_number,
    reference_type, content, token_cost, sequence_in_round
  ) VALUES (
    p_debate_id, v_user_id, v_debate.current_round,
    p_reference_type, v_clean, v_cost, v_count + 1
  );

  UPDATE public.debates
  SET is_paused = true, paused_at = now(), updated_at = now()
  WHERE id = p_debate_id;

  -- FIXED: named parameters (LM-188 audit)
  PERFORM log_event(
    p_event_type := 'reference_submitted',
    p_user_id    := v_user_id,
    p_debate_id  := p_debate_id,
    p_category   := v_debate.category,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
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

$function$;
