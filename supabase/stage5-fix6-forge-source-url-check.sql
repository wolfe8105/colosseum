-- Stage 5 Fix 6: Add source_url HTTP(S) validation to forge_reference
-- Adds a guard so that malformed source_url values (missing scheme) are
-- rejected at the database layer, consistent with the client-side sanitizeUrl()
-- check already in place.
--
-- Apply via: Supabase SQL Editor or supabase db push
-- Safe to re-apply (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.forge_reference(
  p_source_title  TEXT,
  p_source_author TEXT,
  p_source_date   DATE,
  p_locator       TEXT,
  p_claim_text    TEXT,
  p_source_type   TEXT,
  p_category      TEXT,
  p_source_url    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_fingerprint TEXT;
  v_existing    RECORD;
  v_cost        INTEGER := 50;
  v_debit       JSON;
  v_ref_id      UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_source_type NOT IN ('primary','academic','book','news','other') THEN
    RAISE EXCEPTION 'Invalid source_type: %', p_source_type;
  END IF;

  IF p_category NOT IN ('politics','sports','entertainment','music','couples_court') THEN
    RAISE EXCEPTION 'Invalid category: %. general is not allowed for references.', p_category;
  END IF;

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

  -- source_url must be HTTP(S) if provided
  IF p_source_url IS NOT NULL AND p_source_url NOT LIKE 'http://%' AND p_source_url NOT LIKE 'https://%' THEN
    RAISE EXCEPTION 'source_url must start with http:// or https://';
  END IF;

  v_fingerprint := _canonical_fingerprint(p_source_title, p_source_author, p_source_date, p_locator);

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

  v_debit := debit_tokens(v_user_id, v_cost, 'forge_reference');
  IF NOT (v_debit->>'success')::BOOLEAN THEN
    RAISE EXCEPTION 'Insufficient tokens to forge (need %)', v_cost;
  END IF;

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

  PERFORM log_event(
    p_event_type := 'reference_forged',
    p_user_id := v_user_id,
    p_category := p_category,
    p_metadata := jsonb_build_object('ref_id', v_ref_id, 'source_type', p_source_type)
  );

  RETURN jsonb_build_object('action', 'created', 'ref_id', v_ref_id);
END;
$$;
