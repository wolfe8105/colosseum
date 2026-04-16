-- ============================================================
-- F-21: Intro Music (Personal, 2 Tiers)
-- Session 274
--
-- Tier 1: 10 standard Web-Audio-synthesized tracks for all users
-- Tier 2: custom 10-sec audio upload at 35%+ profile depth
--
-- Run in Supabase SQL editor.
-- ============================================================

-- ── 1. Profiles columns ──────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS intro_music_id  TEXT NOT NULL DEFAULT 'gladiator',
  ADD COLUMN IF NOT EXISTS custom_intro_url TEXT;

-- ── 2. save_intro_music RPC ──────────────────────────────────

DROP FUNCTION IF EXISTS public.save_intro_music(text, text);

CREATE OR REPLACE FUNCTION public.save_intro_music(
  p_track_id   TEXT,
  p_custom_url TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_depth      NUMERIC;
  v_valid_ids  TEXT[] := ARRAY[
    'gladiator','thunder','scholar','phantom','phoenix',
    'colossus','viper','oracle','champion','ghost','custom'
  ];
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  IF p_track_id IS NULL OR NOT (p_track_id = ANY(v_valid_ids)) THEN
    RETURN json_build_object('error', 'Invalid track id');
  END IF;

  -- Custom upload gate: 35%+ profile depth required
  IF p_track_id = 'custom' THEN
    SELECT profile_depth_pct INTO v_depth
    FROM profiles WHERE id = v_user_id;

    IF COALESCE(v_depth, 0) < 35 THEN
      RETURN json_build_object(
        'error', 'Custom intro unlocks at 35% profile depth'
      );
    END IF;

    IF p_custom_url IS NULL OR p_custom_url = '' THEN
      RETURN json_build_object('error', 'custom_url required for custom track');
    END IF;
  END IF;

  UPDATE profiles
  SET
    intro_music_id  = p_track_id,
    custom_intro_url = CASE
      WHEN p_track_id = 'custom' THEN p_custom_url
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = v_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- ── 3. Rebuild get_public_profile with intro fields ──────────

DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile         RECORD;
  v_follow_counts   JSON;
  v_is_following    BOOLEAN := false;
BEGIN
  SELECT id, username, display_name, elo_rating, wins, losses, current_streak,
         level, debates_completed, avatar_url, bio, created_at, subscription_tier,
         verified_gladiator, intro_music_id, custom_intro_url
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id AND deleted_at IS NULL;

  IF v_profile IS NULL THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  v_follow_counts := get_follow_counts(p_user_id);

  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    v_is_following := is_following(p_user_id);
  END IF;

  RETURN json_build_object(
    'id',               v_profile.id,
    'username',         v_profile.username,
    'display_name',     v_profile.display_name,
    'elo_rating',       v_profile.elo_rating,
    'wins',             v_profile.wins,
    'losses',           v_profile.losses,
    'current_streak',   v_profile.current_streak,
    'level',            v_profile.level,
    'debates_completed',v_profile.debates_completed,
    'avatar_url',       v_profile.avatar_url,
    'bio',              v_profile.bio,
    'created_at',       v_profile.created_at,
    'subscription_tier',v_profile.subscription_tier,
    'verified_gladiator',v_profile.verified_gladiator,
    'intro_music_id',   COALESCE(v_profile.intro_music_id, 'gladiator'),
    'custom_intro_url', v_profile.custom_intro_url,
    'followers',        v_follow_counts->'followers',
    'following',        v_follow_counts->'following',
    'is_following',     v_is_following
  );
END;
$$;

-- ── 4. Storage bucket for custom uploads ─────────────────────
-- Create the intro-music bucket (private; signed URLs used for playback)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'intro-music',
  'intro-music',
  false,
  5242880,  -- 5MB max
  ARRAY['audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: owner can insert/update/delete their own file; anyone authenticated can read
DROP POLICY IF EXISTS "intro_music_owner_write"       ON storage.objects;
DROP POLICY IF EXISTS "intro_music_owner_update"      ON storage.objects;
DROP POLICY IF EXISTS "intro_music_owner_delete"      ON storage.objects;
DROP POLICY IF EXISTS "intro_music_authenticated_read" ON storage.objects;

CREATE POLICY "intro_music_owner_write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'intro-music'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "intro_music_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'intro-music'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "intro_music_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'intro-music'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "intro_music_authenticated_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'intro-music');
