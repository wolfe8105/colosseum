-- ============================================================
-- F-37: Granular Notification Preferences
-- Session 274
--
-- Adds 2 new notification toggle columns to user_settings:
--   notif_rivals   — rival online alerts (F-25 popup delivery)
--   notif_economy  — stake results, power-ups, tier upgrades
--
-- Rebuilds save_user_settings to include new params.
-- ============================================================

-- ── 1. New columns ───────────────────────────────────────────

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notif_rivals  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_economy BOOLEAN NOT NULL DEFAULT true;

-- ── 2. Rebuild save_user_settings ───────────────────────────

DROP FUNCTION IF EXISTS public.save_user_settings(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean);

CREATE OR REPLACE FUNCTION public.save_user_settings(
  p_notif_challenge  boolean DEFAULT true,
  p_notif_debate     boolean DEFAULT true,
  p_notif_follow     boolean DEFAULT true,
  p_notif_reactions  boolean DEFAULT true,
  p_notif_rivals     boolean DEFAULT true,
  p_notif_economy    boolean DEFAULT true,
  p_audio_sfx        boolean DEFAULT true,
  p_audio_mute       boolean DEFAULT false,
  p_privacy_public   boolean DEFAULT true,
  p_privacy_online   boolean DEFAULT true,
  p_privacy_challenges boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  INSERT INTO user_settings (
    user_id, notif_challenge, notif_debate, notif_follow, notif_reactions,
    notif_rivals, notif_economy,
    audio_sfx, audio_mute,
    privacy_public, privacy_online, privacy_challenges
  ) VALUES (
    v_uid, p_notif_challenge, p_notif_debate, p_notif_follow, p_notif_reactions,
    p_notif_rivals, p_notif_economy,
    p_audio_sfx, p_audio_mute,
    p_privacy_public, p_privacy_online, p_privacy_challenges
  )
  ON CONFLICT (user_id) DO UPDATE SET
    notif_challenge   = EXCLUDED.notif_challenge,
    notif_debate      = EXCLUDED.notif_debate,
    notif_follow      = EXCLUDED.notif_follow,
    notif_reactions   = EXCLUDED.notif_reactions,
    notif_rivals      = EXCLUDED.notif_rivals,
    notif_economy     = EXCLUDED.notif_economy,
    audio_sfx         = EXCLUDED.audio_sfx,
    audio_mute        = EXCLUDED.audio_mute,
    privacy_public    = EXCLUDED.privacy_public,
    privacy_online    = EXCLUDED.privacy_online,
    privacy_challenges = EXCLUDED.privacy_challenges;

  RETURN json_build_object('success', true);
END;
$$;
