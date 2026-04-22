-- F-70: Social Media Links in Profile
-- Run this migration against Supabase SQL Editor

-- 1. Add columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_twitter    TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS social_instagram  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS social_tiktok     TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS social_youtube    TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS social_snapchat   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS social_bluesky    TEXT DEFAULT NULL;

-- 2. Replace update_profile to accept social fields
CREATE OR REPLACE FUNCTION public.update_profile(
  p_display_name text DEFAULT NULL::text,
  p_avatar_url text DEFAULT NULL::text,
  p_bio text DEFAULT NULL::text,
  p_username text DEFAULT NULL::text,
  p_preferred_language text DEFAULT NULL::text,
  p_social_twitter text DEFAULT NULL::text,
  p_social_instagram text DEFAULT NULL::text,
  p_social_tiktok text DEFAULT NULL::text,
  p_social_youtube text DEFAULT NULL::text,
  p_social_snapchat text DEFAULT NULL::text,
  p_social_bluesky text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_clean_name TEXT;
  v_clean_bio TEXT;
  v_clean_url TEXT;
  v_clean_username TEXT;
  v_clean_lang TEXT;
  v_allowed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE LOG 'SECURITY|auth_failure|anonymous|update_profile|unauthenticated profile update';
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Rate limit: 20 profile updates per hour
  v_allowed := check_rate_limit(v_user_id, 'profile_update', 60, 20);
  IF NOT v_allowed THEN
    RAISE LOG 'SECURITY|rate_limit_blocked|%|update_profile|profile_update limit exceeded', v_user_id;
    RAISE EXCEPTION 'Rate limit: too many profile updates';
  END IF;

  v_clean_name := sanitize_text(p_display_name);
  v_clean_bio := sanitize_text(p_bio);
  v_clean_url := sanitize_url(p_avatar_url);
  v_clean_username := p_username;

  -- Validate language: must be 2-5 char BCP-47 tag or NULL
  IF p_preferred_language IS NOT NULL THEN
    v_clean_lang := lower(trim(p_preferred_language));
    IF v_clean_lang !~ '^[a-z]{2,5}$' THEN
      RAISE EXCEPTION 'Invalid language code';
    END IF;
  END IF;

  IF v_clean_username IS NOT NULL THEN
    IF char_length(v_clean_username) < 3 OR char_length(v_clean_username) > 20 THEN
      RAISE EXCEPTION 'Username must be 3-20 characters';
    END IF;
    IF v_clean_username !~ '^[a-zA-Z0-9_]+$' THEN
      RAISE LOG 'SECURITY|input_violation|%|update_profile|invalid username chars=%', v_user_id, v_clean_username;
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

  -- Sanitize social handles: strip @ prefix, trim, max 60 chars
  UPDATE public.profiles SET
    username = COALESCE(v_clean_username, username),
    display_name = COALESCE(v_clean_name, display_name),
    avatar_url = COALESCE(v_clean_url, avatar_url),
    bio = COALESCE(v_clean_bio, bio),
    preferred_language = COALESCE(v_clean_lang, preferred_language),
    social_twitter   = COALESCE(left(trim(leading '@' from trim(p_social_twitter)), 60),   social_twitter),
    social_instagram = COALESCE(left(trim(leading '@' from trim(p_social_instagram)), 60), social_instagram),
    social_tiktok    = COALESCE(left(trim(leading '@' from trim(p_social_tiktok)), 60),    social_tiktok),
    social_youtube   = COALESCE(left(trim(p_social_youtube), 60),                          social_youtube),
    social_snapchat  = COALESCE(left(trim(leading '@' from trim(p_social_snapchat)), 60),  social_snapchat),
    social_bluesky   = COALESCE(left(trim(leading '@' from trim(p_social_bluesky)), 60),   social_bluesky),
    updated_at = now()
  WHERE id = v_user_id;

  PERFORM log_event(
    p_event_type := 'profile_updated',
    p_user_id    := v_user_id,
    p_debate_id  := NULL,
    p_category   := NULL,
    p_side       := NULL,
    p_metadata   := jsonb_build_object(
      'changed_name', p_display_name IS NOT NULL,
      'changed_bio', p_bio IS NOT NULL,
      'changed_avatar', p_avatar_url IS NOT NULL,
      'changed_username', p_username IS NOT NULL,
      'changed_language', p_preferred_language IS NOT NULL,
      'changed_socials', (p_social_twitter IS NOT NULL OR p_social_instagram IS NOT NULL OR p_social_tiktok IS NOT NULL OR p_social_youtube IS NOT NULL OR p_social_snapchat IS NOT NULL OR p_social_bluesky IS NOT NULL)
    )
  );

  RETURN json_build_object('success', true);
END;

$function$;

-- 3. Update get_public_profile to return social fields
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_profile RECORD;
  v_follow_counts JSON;
  v_is_following BOOLEAN := false;
BEGIN
  SELECT id, username, display_name, elo_rating, wins, losses, current_streak,
         level, debates_completed, avatar_url, bio, created_at, subscription_tier,
         social_twitter, social_instagram, social_tiktok, social_youtube, social_snapchat, social_bluesky,
         is_private, verified_gladiator, intro_music_id, custom_intro_url
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
    'id', v_profile.id,
    'username', v_profile.username,
    'display_name', v_profile.display_name,
    'elo_rating', v_profile.elo_rating,
    'wins', v_profile.wins,
    'losses', v_profile.losses,
    'current_streak', v_profile.current_streak,
    'level', v_profile.level,
    'debates_completed', v_profile.debates_completed,
    'avatar_url', v_profile.avatar_url,
    'bio', v_profile.bio,
    'created_at', v_profile.created_at,
    'subscription_tier', v_profile.subscription_tier,
    'followers', v_follow_counts->'followers',
    'following', v_follow_counts->'following',
    'is_following', v_is_following,
    'social_twitter', v_profile.social_twitter,
    'social_instagram', v_profile.social_instagram,
    'social_tiktok', v_profile.social_tiktok,
    'social_youtube', v_profile.social_youtube,
    'social_snapchat', v_profile.social_snapchat,
    'social_bluesky', v_profile.social_bluesky,
    'is_private', v_profile.is_private,
    'verified_gladiator', v_profile.verified_gladiator,
    'intro_music_id', v_profile.intro_music_id,
    'custom_intro_url', v_profile.custom_intro_url
  );
END;

$function$;

-- 4. Drop the old 4-param overload (it conflicts with the new signature)
-- The 5-param version above replaces both old versions.
-- If the old 4-param overload exists, drop it:
DROP FUNCTION IF EXISTS public.update_profile(text, text, text, text);

-- Done. NOTIFY pgrst to pick up the new function signatures.
NOTIFY pgrst, 'reload schema';
