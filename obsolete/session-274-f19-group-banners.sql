-- ============================================================
-- F-19: Three-Tier Group Banner Progression
-- Session 274
--
-- Tier 1 (0–25% GvG win rate): standard CSS banner (no upload needed)
-- Tier 2 (26–50%):             custom static image upload
-- Tier 3 (51%+):               custom animated upload (video/GIF, ≤10s)
--
-- Auto-unlock at threshold, permanent once crossed.
-- Run in Supabase SQL editor.
-- ============================================================

-- ── 1. Add columns to groups ─────────────────────────────────

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS gvg_wins       INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gvg_losses     INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS banner_tier    SMALLINT     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS banner_static_url   TEXT,
  ADD COLUMN IF NOT EXISTS banner_animated_url TEXT;

-- ── 2. Banner tier helper ────────────────────────────────────
-- Returns the EARNED tier (based on cumulative win %) — never decreases.
-- Called whenever a GvG challenge resolves.

CREATE OR REPLACE FUNCTION public._group_banner_tier(
  p_wins    INTEGER,
  p_losses  INTEGER
) RETURNS SMALLINT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN (p_wins + p_losses) < 3 THEN 1  -- Not enough data
    WHEN p_wins::float / NULLIF(p_wins + p_losses, 0) > 0.50 THEN 3
    WHEN p_wins::float / NULLIF(p_wins + p_losses, 0) > 0.25 THEN 2
    ELSE 1
  END::SMALLINT;
$$;

-- ── 3. Rebuild resolve_group_challenge to track wins/losses ──
-- Adds gvg_wins / gvg_losses increments + auto-upgrades banner_tier.
-- Preserves all existing Elo logic exactly.

DROP FUNCTION IF EXISTS public.resolve_group_challenge(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.resolve_group_challenge(
  p_challenge_id   uuid,
  p_winner_group_id uuid,
  p_debate_id      uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid            uuid := auth.uid();
  v_caller_role    text;
  v_challenge      RECORD;
  v_debate         RECORD;
  v_winner_group   uuid;
  v_loser_group_id uuid;
  v_winner_elo     int;
  v_loser_elo      int;
  v_k              int := 32;
  v_expected       float;
  v_delta          int;
  v_a_group        uuid;
  v_b_group        uuid;
  v_w_wins         int;
  v_w_losses       int;
  v_l_wins         int;
  v_l_losses       int;
  v_w_new_tier     SMALLINT;
  v_l_new_tier     SMALLINT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_challenge FROM group_challenges
  WHERE id = p_challenge_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Challenge not found');
  END IF;
  IF v_challenge.status = 'completed' THEN
    RETURN json_build_object('error', 'Challenge already resolved');
  END IF;
  IF v_challenge.status NOT IN ('accepted', 'live') THEN
    RETURN json_build_object('error', 'Challenge must be accepted or live to resolve');
  END IF;

  SELECT role INTO v_caller_role
  FROM group_members
  WHERE user_id = v_uid
    AND group_id IN (v_challenge.challenger_group_id, v_challenge.defender_group_id)
  ORDER BY group_role_rank(role) DESC LIMIT 1;

  IF v_caller_role IS NULL OR group_role_rank(v_caller_role) < 3 THEN
    RAISE EXCEPTION 'Only leaders or co-leaders of a participating group can resolve challenges';
  END IF;

  -- Determine winner from debate result if available
  v_winner_group := NULL;
  IF p_debate_id IS NOT NULL THEN
    SELECT * INTO v_debate FROM arena_debates WHERE id = p_debate_id;
    IF v_debate IS NOT NULL AND v_debate.winner IN ('a', 'b') THEN
      SELECT group_id INTO v_a_group
      FROM group_members
      WHERE user_id = v_debate.debater_a
        AND group_id IN (v_challenge.challenger_group_id, v_challenge.defender_group_id)
      LIMIT 1;
      SELECT group_id INTO v_b_group
      FROM group_members
      WHERE user_id = v_debate.debater_b
        AND group_id IN (v_challenge.challenger_group_id, v_challenge.defender_group_id)
      LIMIT 1;
      IF v_debate.winner = 'a' AND v_a_group IS NOT NULL THEN
        v_winner_group := v_a_group;
      ELSIF v_debate.winner = 'b' AND v_b_group IS NOT NULL THEN
        v_winner_group := v_b_group;
      END IF;
    END IF;
  END IF;

  IF v_winner_group IS NULL THEN v_winner_group := p_winner_group_id; END IF;

  IF v_winner_group != v_challenge.challenger_group_id
     AND v_winner_group != v_challenge.defender_group_id THEN
    RETURN json_build_object('error', 'Winner must be one of the challenge groups');
  END IF;

  IF v_winner_group = v_challenge.challenger_group_id THEN
    v_loser_group_id := v_challenge.defender_group_id;
  ELSE
    v_loser_group_id := v_challenge.challenger_group_id;
  END IF;

  -- Elo update (unchanged)
  SELECT COALESCE(group_elo, 1200) INTO v_winner_elo FROM groups WHERE id = v_winner_group;
  SELECT COALESCE(group_elo, 1200) INTO v_loser_elo  FROM groups WHERE id = v_loser_group_id;
  v_expected := 1.0 / (1.0 + POWER(10, (v_loser_elo - v_winner_elo)::FLOAT / 400));
  v_delta := ROUND(v_k * (1 - v_expected));
  IF v_delta < 1 THEN v_delta := 1; END IF;

  UPDATE groups SET group_elo = COALESCE(group_elo, 1200) + v_delta WHERE id = v_winner_group;
  UPDATE groups SET group_elo = GREATEST(COALESCE(group_elo, 1200) - v_delta, 100) WHERE id = v_loser_group_id;

  -- F-19: Increment wins/losses and auto-upgrade banner tier (never downgrades)
  UPDATE groups
  SET gvg_wins = gvg_wins + 1
  WHERE id = v_winner_group
  RETURNING gvg_wins, gvg_losses INTO v_w_wins, v_w_losses;

  UPDATE groups
  SET gvg_losses = gvg_losses + 1
  WHERE id = v_loser_group_id
  RETURNING gvg_wins, gvg_losses INTO v_l_wins, v_l_losses;

  -- Auto-upgrade banner_tier (permanent — use GREATEST so it never decreases)
  v_w_new_tier := _group_banner_tier(v_w_wins, v_w_losses);
  v_l_new_tier := _group_banner_tier(v_l_wins, v_l_losses);

  UPDATE groups SET banner_tier = GREATEST(banner_tier, v_w_new_tier) WHERE id = v_winner_group;
  UPDATE groups SET banner_tier = GREATEST(banner_tier, v_l_new_tier) WHERE id = v_loser_group_id;

  -- Mark challenge complete
  UPDATE group_challenges
  SET status = 'completed',
      winner_group_id = v_winner_group,
      debate_id = COALESCE(p_debate_id, debate_id),
      completed_at = NOW()
  WHERE id = p_challenge_id;

  RETURN json_build_object(
    'success', true,
    'winner_group_id', v_winner_group,
    'winner_elo_change', v_delta,
    'loser_elo_change', -v_delta
  );
END;
$$;

-- ── 4. save_group_banner RPC ─────────────────────────────────
-- Leader/co-leader only. Tier-gated upload.

DROP FUNCTION IF EXISTS public.save_group_banner(uuid, text, text);

CREATE OR REPLACE FUNCTION public.save_group_banner(
  p_group_id          uuid,
  p_static_url        text DEFAULT NULL,
  p_animated_url      text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_role       text;
  v_tier       SMALLINT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Must be leader or co_leader
  SELECT role INTO v_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = v_uid;

  IF v_role IS NULL OR group_role_rank(v_role) < 3 THEN
    RETURN json_build_object('error', 'Only group leaders can update the banner');
  END IF;

  -- Get current earned tier
  SELECT banner_tier INTO v_tier FROM groups WHERE id = p_group_id;

  -- Tier gate: static upload needs tier 2+, animated needs tier 3
  IF p_static_url IS NOT NULL AND v_tier < 2 THEN
    RETURN json_build_object(
      'error', 'Custom static banner unlocks at 26% GvG win rate (Tier 2)'
    );
  END IF;

  IF p_animated_url IS NOT NULL AND v_tier < 3 THEN
    RETURN json_build_object(
      'error', 'Animated banner unlocks at 51% GvG win rate (Tier 3)'
    );
  END IF;

  UPDATE groups
  SET
    banner_static_url   = COALESCE(p_static_url,   banner_static_url),
    banner_animated_url = COALESCE(p_animated_url, banner_animated_url),
    updated_at          = NOW()
  WHERE id = p_group_id;

  RETURN json_build_object('success', true, 'tier', v_tier);
END;
$$;

-- ── 5. Rebuild get_group_details with banner fields ──────────

DROP FUNCTION IF EXISTS public.get_group_details(uuid);

CREATE OR REPLACE FUNCTION public.get_group_details(p_group_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_group        public.groups;
  v_is_member    BOOLEAN := false;
  v_my_role      TEXT;
BEGIN
  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group not found'; END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT role INTO v_my_role
    FROM public.group_members
    WHERE group_id = p_group_id AND user_id = v_user_id;
    v_is_member := v_my_role IS NOT NULL;
  END IF;

  IF v_group.is_public = false AND NOT v_is_member THEN
    RAISE EXCEPTION 'This group is private';
  END IF;

  RETURN json_build_object(
    'id',                  v_group.id,
    'name',                v_group.name,
    'slug',                v_group.slug,
    'description',         v_group.description,
    'category',            v_group.category,
    'owner_id',            v_group.owner_id,
    'member_count',        v_group.member_count,
    'elo_rating',          v_group.elo_rating,
    'is_public',           v_group.is_public,
    'avatar_emoji',        v_group.avatar_emoji,
    'created_at',          v_group.created_at,
    'join_mode',           v_group.join_mode,
    'entry_requirements',  v_group.entry_requirements,
    'audition_config',     v_group.audition_config,
    'is_member',           v_is_member,
    'my_role',             v_my_role,
    'gvg_wins',            v_group.gvg_wins,
    'gvg_losses',          v_group.gvg_losses,
    'banner_tier',         v_group.banner_tier,
    'banner_static_url',   v_group.banner_static_url,
    'banner_animated_url', v_group.banner_animated_url
  );
END;
$$;

-- ── 6. Storage bucket for group banner uploads ───────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'group-banners',
  'group-banners',
  false,
  10485760,  -- 10MB max (animated video needs more headroom than intro music)
  ARRAY[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/ogg'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "group_banner_leader_write"  ON storage.objects;
DROP POLICY IF EXISTS "group_banner_leader_update" ON storage.objects;
DROP POLICY IF EXISTS "group_banner_leader_delete" ON storage.objects;
DROP POLICY IF EXISTS "group_banner_authed_read"   ON storage.objects;

CREATE POLICY "group_banner_leader_write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'group-banners');

CREATE POLICY "group_banner_leader_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'group-banners');

CREATE POLICY "group_banner_leader_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'group-banners');

CREATE POLICY "group_banner_authed_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'group-banners');
