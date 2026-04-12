-- ============================================================
-- F-55 REFERENCE SYSTEM OVERHAUL — Full Migration
-- Session 269 — 2026-04-12 (patched from S252 draft)
--
-- Destructive migration — arsenal_references is empty in production.
-- Run as ONE transaction in Supabase SQL Editor.
--
-- S269 patch over S252: A.10 reference_sockets updated to match
-- F-57 schema (FKs to user_modifiers + modifier_effects, CHECK
-- constraint on socket_index, correct indexes). F-57 tables
-- (user_modifiers, modifier_effects) must already be live.
--
-- Phases:
--   A: Schema (tables, indexes)
--   B: Forge / edit / delete RPCs + helper functions
--   C: Seconding, challenge, ruling, cite rewrite
--   D: Royalty payout RPC
--   E: Retire legacy RPCs
--
-- PARKED VALUE: Forging cost = 50 tokens (placeholder for Pat to adjust)
-- ============================================================


-- ############################################################
-- PHASE A: SCHEMA MIGRATION
-- ############################################################

-- A.1 — profiles.is_bot (LM-209 dependency)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false NOT NULL;


-- A.2 — Drop old arsenal_references (CASCADE kills FKs in debate_reference_loadouts,
--        reference_verifications, reference_sockets. user_modifiers.socketed_in gets
--        SET NULL — modifiers return to free inventory, no data loss since no refs exist.)
DROP TABLE IF EXISTS public.arsenal_references CASCADE;

-- A.3 — Drop old verification table (replaced by reference_seconds)
DROP TABLE IF EXISTS public.reference_verifications CASCADE;


-- A.4 — Create new arsenal_references with F-55 column set
CREATE TABLE public.arsenal_references (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_title          TEXT NOT NULL,
  source_author         TEXT NOT NULL,
  source_date           DATE NOT NULL,
  locator               TEXT NOT NULL,
  claim_text            TEXT NOT NULL,
  source_type           TEXT NOT NULL CHECK (source_type IN ('primary','academic','book','news','other')),
  category              TEXT NOT NULL CHECK (category IN ('politics','sports','entertainment','music','couples_court')),
  source_url            TEXT NULL,
  canonical_fingerprint TEXT NOT NULL,
  seconds               INTEGER NOT NULL DEFAULT 0,
  strikes               INTEGER NOT NULL DEFAULT 0,
  rarity                TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','uncommon','rare','legendary','mythic')),
  current_power         INTEGER NOT NULL DEFAULT 0,
  graduated             BOOLEAN NOT NULL DEFAULT false,
  challenge_status      TEXT NOT NULL DEFAULT 'none' CHECK (challenge_status IN ('none','disputed','heavily_disputed','frozen')),
  deleted_at            TIMESTAMPTZ NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.arsenal_references ENABLE ROW LEVEL SECURITY;

-- RLS: references are publicly readable, writes via SECURITY DEFINER only
CREATE POLICY "Arsenal references readable by all" ON public.arsenal_references
  FOR SELECT USING (true);

CREATE POLICY "Arsenal references inserted by server" ON public.arsenal_references
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Arsenal references updated by server" ON public.arsenal_references
  FOR UPDATE USING (false);

CREATE POLICY "Arsenal references deleted by server" ON public.arsenal_references
  FOR DELETE USING (false);


-- A.5 — Five required indexes (spec S155)
CREATE INDEX idx_arsenal_refs_category_rarity ON public.arsenal_references (category, rarity DESC);
CREATE INDEX idx_arsenal_refs_owner ON public.arsenal_references (user_id);
CREATE UNIQUE INDEX idx_arsenal_refs_fingerprint ON public.arsenal_references (canonical_fingerprint);
CREATE INDEX idx_arsenal_refs_strikes ON public.arsenal_references (strikes DESC);
CREATE INDEX idx_arsenal_refs_deleted_at ON public.arsenal_references (deleted_at) WHERE deleted_at IS NOT NULL;


-- A.6 — Re-add FK from debate_reference_loadouts (CASCADE killed it)
-- Clean up any orphaned rows first (should be zero since arsenal was empty)
DELETE FROM public.debate_reference_loadouts
  WHERE NOT EXISTS (
    SELECT 1 FROM public.arsenal_references ar WHERE ar.id = debate_reference_loadouts.reference_id
  );

ALTER TABLE public.debate_reference_loadouts
  ADD CONSTRAINT debate_reference_loadouts_reference_id_fkey
  FOREIGN KEY (reference_id) REFERENCES public.arsenal_references(id);


-- A.7 — Add rarity_at_cite snapshot column to loadouts (for royalty calculation)
ALTER TABLE public.debate_reference_loadouts
  ADD COLUMN IF NOT EXISTS rarity_at_cite TEXT NULL;


-- A.8 — Reference seconds junction table (replaces reference_verifications)
CREATE TABLE public.reference_seconds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id  UUID NOT NULL REFERENCES public.arsenal_references(id) ON DELETE CASCADE,
  voter_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reference_id, voter_id)
);

ALTER TABLE public.reference_seconds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reference seconds readable by all" ON public.reference_seconds
  FOR SELECT USING (true);

CREATE POLICY "Reference seconds inserted by server" ON public.reference_seconds
  FOR INSERT WITH CHECK (false);


-- A.9 — Reference challenges table (for escrow + ruling workflow)
CREATE TABLE public.reference_challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id    UUID NOT NULL REFERENCES public.arsenal_references(id),
  challenger_id   UUID NOT NULL REFERENCES public.profiles(id),
  debate_id       UUID REFERENCES public.arena_debates(id),
  grounds         TEXT NOT NULL,
  escrow_amount   INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','upheld','denied')),
  ruled_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ref_challenges_reference ON public.reference_challenges (reference_id);
CREATE INDEX idx_ref_challenges_pending ON public.reference_challenges (status) WHERE status = 'pending';

ALTER TABLE public.reference_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reference challenges readable by all" ON public.reference_challenges
  FOR SELECT USING (true);

CREATE POLICY "Reference challenges inserted by server" ON public.reference_challenges
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Reference challenges updated by server" ON public.reference_challenges
  FOR UPDATE USING (false);


-- A.10 — Reference sockets (F-57 compatible schema)
-- S269 patch: FKs to user_modifiers + modifier_effects added to match
-- F-57 Phase 1 deployment. F-57 CASCADE already dropped the old table;
-- this recreates it with the correct constraints.
CREATE TABLE public.reference_sockets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id    UUID NOT NULL REFERENCES public.arsenal_references(id) ON DELETE CASCADE,
  socket_index    INTEGER NOT NULL CHECK (socket_index BETWEEN 0 AND 4),  -- 0-based, max 5 sockets
  modifier_id     UUID NOT NULL REFERENCES public.user_modifiers(id),     -- back-ref for audit
  effect_id       TEXT NOT NULL REFERENCES public.modifier_effects(id),   -- denorm for fast reads
  socketed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reference_id, socket_index)
);

CREATE INDEX idx_reference_sockets_ref ON public.reference_sockets(reference_id);
CREATE INDEX idx_reference_sockets_mod ON public.reference_sockets(modifier_id);

COMMENT ON TABLE public.reference_sockets IS
  'Permanent socket assignments on arsenal_references. Never deleted — socketing is final.';

ALTER TABLE public.reference_sockets ENABLE ROW LEVEL SECURITY;

-- Leasers can see socket contents (F-55 leaser visibility rule)
CREATE POLICY "reference_sockets_public_select" ON public.reference_sockets
  FOR SELECT USING (true);

-- All writes via SECURITY DEFINER socket_modifier RPC (F-57)
CREATE POLICY "reference_sockets_server_insert" ON public.reference_sockets
  FOR INSERT WITH CHECK (false);

CREATE POLICY "reference_sockets_server_delete" ON public.reference_sockets
  FOR DELETE USING (false);


-- A.11 — Reference royalty log (B2B granularity — one row per cite)
CREATE TABLE public.reference_royalty_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forger_user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  citer_user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference_id      UUID NOT NULL REFERENCES public.arsenal_references(id) ON DELETE CASCADE,
  debate_id         UUID NOT NULL REFERENCES public.arena_debates(id) ON DELETE CASCADE,
  reference_name    TEXT NOT NULL,
  rarity_at_cite    TEXT NOT NULL,
  base_royalty      NUMERIC(6,2) NOT NULL,
  win_bonus_applied BOOLEAN NOT NULL DEFAULT false,
  citer_won_debate  BOOLEAN NOT NULL,
  final_payout      NUMERIC(6,2) NOT NULL,
  paid_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_royalty_log_forger ON public.reference_royalty_log (forger_user_id, paid_at DESC);

ALTER TABLE public.reference_royalty_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Royalty log readable by forger" ON public.reference_royalty_log
  FOR SELECT USING (forger_user_id = auth.uid() OR citer_user_id = auth.uid());

CREATE POLICY "Royalty log inserted by server" ON public.reference_royalty_log
  FOR INSERT WITH CHECK (false);


-- ############################################################
-- PHASE B: HELPER FUNCTIONS + FORGE / EDIT / DELETE RPCs
-- ############################################################

-- B.1 — Canonical fingerprint helper
-- Lowercase, collapse whitespace, strip punctuation, concat with delimiters.
-- Returns TEXT, not a hash. Collisions are exact string matches.
CREATE OR REPLACE FUNCTION public._canonical_fingerprint(
  p_title TEXT, p_author TEXT, p_date DATE, p_locator TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
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
$$;


-- B.2 — Rarity + power recompute helper
-- Called after every seconding, strike, and challenge ruling.
CREATE OR REPLACE FUNCTION public._recompute_reference_rarity_and_power(p_ref_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;


-- B.3 — FORGE REFERENCE (rewrite)
-- PARKED VALUE: Forging cost = 50 tokens (placeholder — Pat to adjust)
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
$$;


-- B.4 — EDIT REFERENCE (rewrite)
-- 10-token fee. source_type locked at creation (LM-206). Fingerprint recompute.
CREATE OR REPLACE FUNCTION public.edit_reference(
  p_ref_id        UUID,
  p_source_title  TEXT,
  p_source_author TEXT,
  p_source_date   DATE,
  p_locator       TEXT,
  p_claim_text    TEXT,
  p_category      TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;


-- B.5 — DELETE REFERENCE (new)
-- Soft-delete. Rate limit: max 7 per 24h. Burns socketed modifiers.
CREATE OR REPLACE FUNCTION public.delete_reference(p_ref_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;


-- B.6 — GET MY ARSENAL (new/rewrite)
CREATE OR REPLACE FUNCTION public.get_my_arsenal()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;


-- B.7 — GET REFERENCE LIBRARY (rewrite — new columns, filter support)
CREATE OR REPLACE FUNCTION public.get_reference_library(
  p_category TEXT DEFAULT NULL,
  p_rarity   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;


-- ############################################################
-- PHASE C: SECONDING + CHALLENGE/RULE-ON + CITE REWRITE
-- ############################################################

-- C.1 — SECOND REFERENCE (replaces verify_reference)
-- Profile depth 25% gate. Self-seconding blocked. One per user per ref.
CREATE OR REPLACE FUNCTION public.second_reference(p_ref_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;


-- C.2 — CITE DEBATE REFERENCE (rewrite)
-- Bot-pair check (LM-207), deleted/frozen ref checks, per-round cite cost
-- escalation, strikes update, rarity snapshot, recompute.
CREATE OR REPLACE FUNCTION public.cite_debate_reference(
  p_debate_id    UUID,
  p_reference_id UUID,
  p_round        INTEGER,
  p_side         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;


-- C.3 — CHALLENGE REFERENCE (rewrite — escrow, grounds, Shield check)
CREATE OR REPLACE FUNCTION public.challenge_reference(
  p_ref_id           UUID,
  p_grounds          TEXT,
  p_context_debate_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;


-- C.4 — RULE ON REFERENCE (rewrite — graduated penalties, rarity recompute)
CREATE OR REPLACE FUNCTION public.rule_on_reference(
  p_challenge_id UUID,
  p_ruling       TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;


-- C.5 — GET MY DEBATE LOADOUT (rewrite — new columns)
CREATE OR REPLACE FUNCTION public.get_my_debate_loadout(p_debate_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
    FROM (
      SELECT
        drl.reference_id,
        drl.cited,
        drl.cited_at,
        ar.source_title,
        ar.claim_text,
        ar.source_author,
        ar.source_type,
        ar.source_url,
        ar.current_power,
        ar.rarity,
        ar.seconds,
        ar.strikes,
        ar.challenge_status,
        ar.graduated
      FROM debate_reference_loadouts drl
      JOIN arsenal_references ar ON ar.id = drl.reference_id
      WHERE drl.debate_id = p_debate_id
        AND drl.user_id = v_uid
      ORDER BY ar.current_power DESC, ar.created_at DESC
    ) r
  );
END;
$$;


-- C.6 — SAVE DEBATE LOADOUT (update — add deleted/frozen checks)
CREATE OR REPLACE FUNCTION public.save_debate_loadout(
  p_debate_id    UUID,
  p_reference_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_debate    RECORD;
  v_ref_count INTEGER;
  v_owned     INTEGER;
  v_rid       UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;
  IF v_uid NOT IN (v_debate.debater_a, v_debate.debater_b) THEN
    RAISE EXCEPTION 'Only debaters can load references';
  END IF;

  IF v_debate.status NOT IN ('pending', 'lobby', 'matched') THEN
    RAISE EXCEPTION 'Can only load references before debate starts';
  END IF;

  v_ref_count := COALESCE(array_length(p_reference_ids, 1), 0);
  IF v_ref_count > 5 THEN
    RAISE EXCEPTION 'Maximum 5 references per debate';
  END IF;

  IF v_ref_count = 0 THEN
    DELETE FROM debate_reference_loadouts
      WHERE debate_id = p_debate_id AND user_id = v_uid;
    RETURN jsonb_build_object('success', true, 'loaded', 0);
  END IF;

  -- Verify all references: owned by caller, not deleted, not frozen
  SELECT COUNT(*) INTO v_owned
    FROM arsenal_references
    WHERE id = ANY(p_reference_ids)
      AND user_id = v_uid
      AND deleted_at IS NULL
      AND challenge_status != 'frozen';
  IF v_owned != v_ref_count THEN
    RAISE EXCEPTION 'Can only load your own active (non-deleted, non-frozen) references';
  END IF;

  DELETE FROM debate_reference_loadouts
    WHERE debate_id = p_debate_id AND user_id = v_uid;

  FOREACH v_rid IN ARRAY p_reference_ids LOOP
    INSERT INTO debate_reference_loadouts (debate_id, user_id, reference_id)
    VALUES (p_debate_id, v_uid, v_rid);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'loaded', v_ref_count);
END;
$$;


-- C.7 — FILE REFERENCE CHALLENGE (rewrite — delegates to challenge_reference)
-- Kept for backward compatibility with arena-feed-room.ts call.
-- Translates old params to new challenge_reference signature.
CREATE OR REPLACE FUNCTION public.file_reference_challenge(
  p_debate_id    UUID,
  p_reference_id UUID,
  p_round        INTEGER,
  p_side         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;


-- C.8 — CITE REFERENCE (kept — minimal adapter for owner self-cite path)
-- In F-55, win/loss tracking is replaced by the royalty system.
-- This function is kept for backward compat but now just returns success.
CREATE OR REPLACE FUNCTION public.cite_reference(
  p_reference_id UUID,
  p_debate_id    UUID,
  p_outcome      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- In F-55 the outcome tracking (win/loss per ref) is replaced by royalties.
  -- This function is kept as a no-op for backward compatibility.
  RETURN jsonb_build_object('action', 'acknowledged');
END;
$$;


-- ############################################################
-- PHASE D: ROYALTY PAYOUT
-- ############################################################

-- D.1 — PAY REFERENCE ROYALTIES (called at match-end)
-- One log row per cite (B2B granularity), one UPDATE per forger (batched).
CREATE OR REPLACE FUNCTION public.pay_reference_royalties(p_debate_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_debate        RECORD;
  v_winner_id     UUID;
  v_cite          RECORD;
  v_base_rate     NUMERIC(6,2);
  v_status_mult   NUMERIC(6,2);
  v_win_mult      NUMERIC(6,2);
  v_amount        NUMERIC(6,2);
  v_total_by_forger JSONB := '{}'::JSONB;
  v_forger_id     UUID;
  v_forger_total  NUMERIC(6,2);
  v_paid_count    INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  -- Load debate
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
  IF v_debate IS NULL THEN
    RETURN jsonb_build_object('action', 'error', 'message', 'Debate not found');
  END IF;

  -- Skip null/abandoned/tech_failure debates — zero royalties
  IF v_debate.status IN ('nulled', 'abandoned', 'tech_failure') THEN
    RETURN jsonb_build_object(
      'action', 'skipped',
      'reason', 'Debate status is ' || v_debate.status
    );
  END IF;

  -- Determine winner
  IF v_debate.winner = 'a' THEN
    v_winner_id := v_debate.debater_a;
  ELSIF v_debate.winner = 'b' THEN
    v_winner_id := v_debate.debater_b;
  ELSE
    v_winner_id := NULL; -- draw
  END IF;

  -- Iterate through all cited references in this debate
  FOR v_cite IN
    SELECT
      drl.reference_id,
      drl.user_id AS citer_user_id,
      drl.rarity_at_cite,
      ar.user_id AS forger_user_id,
      ar.source_title AS ref_name,
      ar.challenge_status,
      ar.deleted_at
    FROM debate_reference_loadouts drl
    JOIN arsenal_references ar ON ar.id = drl.reference_id
    WHERE drl.debate_id = p_debate_id
      AND drl.cited = true
  LOOP
    -- Skip self-cites (no royalty if forger = citer)
    IF v_cite.forger_user_id = v_cite.citer_user_id THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Skip deleted-ref royalties (tokens burn to platform)
    IF v_cite.deleted_at IS NOT NULL THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Base royalty from tiered schedule by rarity at cite time
    CASE COALESCE(v_cite.rarity_at_cite, 'common')
      WHEN 'common'    THEN v_base_rate := 0.1;
      WHEN 'uncommon'  THEN v_base_rate := 0.25;
      WHEN 'rare'      THEN v_base_rate := 0.5;
      WHEN 'legendary' THEN v_base_rate := 1.0;
      WHEN 'mythic'    THEN v_base_rate := 2.0;
      ELSE v_base_rate := 0.1;
    END CASE;

    -- Disputed modifiers
    CASE v_cite.challenge_status
      WHEN 'disputed'         THEN v_status_mult := 0.75;
      WHEN 'heavily_disputed' THEN v_status_mult := 0.25;
      WHEN 'frozen'           THEN v_status_mult := 0.0;
      ELSE v_status_mult := 1.0;
    END CASE;

    -- Win bonus x2 if citer won
    IF v_winner_id IS NOT NULL AND v_cite.citer_user_id = v_winner_id THEN
      v_win_mult := 2.0;
    ELSE
      v_win_mult := 1.0;
    END IF;

    -- Calculate and round UP to nearest 0.1
    v_amount := v_base_rate * v_status_mult * v_win_mult;
    v_amount := CEILING(v_amount * 10) / 10.0;

    -- Skip zero payouts (e.g., frozen refs)
    IF v_amount <= 0 THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Insert per-cite log row (B2B granularity)
    INSERT INTO reference_royalty_log (
      forger_user_id, citer_user_id, reference_id, debate_id,
      reference_name, rarity_at_cite, base_royalty,
      win_bonus_applied, citer_won_debate, final_payout
    ) VALUES (
      v_cite.forger_user_id, v_cite.citer_user_id, v_cite.reference_id, p_debate_id,
      v_cite.ref_name, COALESCE(v_cite.rarity_at_cite, 'common'), v_base_rate,
      (v_win_mult > 1.0), (v_winner_id IS NOT NULL AND v_cite.citer_user_id = v_winner_id),
      v_amount
    );

    -- Accumulate per-forger total for batched UPDATE
    IF v_total_by_forger ? v_cite.forger_user_id::TEXT THEN
      v_total_by_forger := jsonb_set(
        v_total_by_forger,
        ARRAY[v_cite.forger_user_id::TEXT],
        to_jsonb((v_total_by_forger->>v_cite.forger_user_id::TEXT)::NUMERIC + v_amount)
      );
    ELSE
      v_total_by_forger := jsonb_set(
        v_total_by_forger,
        ARRAY[v_cite.forger_user_id::TEXT],
        to_jsonb(v_amount)
      );
    END IF;

    v_paid_count := v_paid_count + 1;
  END LOOP;

  -- Batched payout: one UPDATE per forger
  FOR v_forger_id, v_forger_total IN
    SELECT key::UUID, value::NUMERIC(6,2)
    FROM jsonb_each_text(v_total_by_forger)
  LOOP
    -- Credit tokens (round to integer for token_balance)
    UPDATE profiles
    SET token_balance = token_balance + CEIL(v_forger_total)::INTEGER
    WHERE id = v_forger_id;

    -- Log transaction
    INSERT INTO token_transactions (user_id, amount, type, source, balance_after)
    VALUES (v_forger_id, CEIL(v_forger_total)::INTEGER, 'earn', 'reference_royalty',
            (SELECT token_balance FROM profiles WHERE id = v_forger_id));
  END LOOP;

  -- Analytics
  PERFORM log_event(
    p_event_type := 'reference_royalties_paid',
    p_debate_id := p_debate_id,
    p_metadata := jsonb_build_object(
      'paid_count', v_paid_count,
      'skipped_count', v_skipped_count,
      'forger_count', jsonb_object_keys_count(v_total_by_forger)
    )
  );

  RETURN jsonb_build_object(
    'action', 'paid',
    'cites_paid', v_paid_count,
    'cites_skipped', v_skipped_count
  );
END;
$$;

-- Helper: count keys in a JSONB object (used by pay_reference_royalties analytics)
CREATE OR REPLACE FUNCTION public.jsonb_object_keys_count(j JSONB)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM jsonb_object_keys(j);
$$;


-- D.2 — Wire royalty payout into finalize_debate
-- Add PERFORM pay_reference_royalties(p_debate_id) after winner is recorded
-- but before the client displays the final score screen.
CREATE OR REPLACE FUNCTION public.finalize_debate(p_debate_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_caller_role TEXT;
  v_debate RECORD;
  v_profile_a RECORD;
  v_profile_b RECORD;
  v_votes_a INTEGER;
  v_votes_b INTEGER;
  v_winner TEXT;
  v_winner_id UUID;
  v_elo RECORD;
  v_xp_winner INTEGER := 25;
  v_xp_loser INTEGER := 10;
  v_xp_draw INTEGER := 15;
BEGIN
  -- Auth check
  v_caller_role := current_setting('request.jwt.claim.role', true);
  IF v_user_id IS NULL AND v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the debate row
  SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debate not found';
  END IF;

  -- Authorization: must be a participant or service_role
  IF v_caller_role IS DISTINCT FROM 'service_role'
     AND v_user_id IS DISTINCT FROM v_debate.debater_a
     AND v_user_id IS DISTINCT FROM v_debate.debater_b THEN
    RAISE EXCEPTION 'Not a participant in this debate';
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
  UPDATE arena_debates SET
    status = 'completed',
    winner = v_winner,
    vote_count_a = v_votes_a,
    vote_count_b = v_votes_b,
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
    correct = CASE
      WHEN predicted_winner = v_winner THEN true
      ELSE false
    END,
    payout = CASE
      WHEN predicted_winner = v_winner THEN ROUND(tokens_wagered * 1.8)
      WHEN v_winner = 'draw' THEN tokens_wagered
      ELSE 0
    END
  WHERE debate_id = p_debate_id AND correct IS NULL;

  -- Pay out prediction winners + refund draws
  UPDATE public.profiles p SET
    token_balance = token_balance + pred.payout
  FROM public.predictions pred
  WHERE pred.debate_id = p_debate_id
    AND pred.user_id = p.id
    AND pred.payout > 0;

  -- F-55: Pay reference royalties (after winner is recorded)
  PERFORM pay_reference_royalties(p_debate_id);

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
$function$;


-- ############################################################
-- PHASE E: RETIRE DEAD LEGACY RPCs
-- ############################################################

-- Drop submit_reference (old raw-URL-drop path — retired per spec)
DROP FUNCTION IF EXISTS public.submit_reference(UUID, UUID, INTEGER, TEXT, TEXT);

-- Drop verify_reference (replaced by second_reference)
DROP FUNCTION IF EXISTS public.verify_reference(UUID);

-- Drop _calc_reference_power (replaced by _recompute_reference_rarity_and_power)
DROP FUNCTION IF EXISTS public._calc_reference_power(TEXT, INTEGER, NUMERIC);

-- Drop auto_allow_expired_references (legacy expiration logic — dead code)
DROP FUNCTION IF EXISTS public.auto_allow_expired_references();


-- ============================================================
-- END OF F-55 MIGRATION
-- ============================================================
