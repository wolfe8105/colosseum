-- ============================================================
-- PROF-BUG-3 FIX: Rename user_settings columns
-- Session 216 — March 31, 2026
--
-- Problem: user_settings table columns use original naming convention
-- (notif_challenges, notif_results, audio_effects, etc.) but the
-- deployed save_user_settings RPC and client code both use a different
-- convention (notif_challenge, notif_debate, audio_sfx, etc.).
-- Result: every save_user_settings call has been silently failing.
-- The client read path (SELECT * from user_settings) also maps to
-- the RPC-style names, so DB values were never loaded either.
--
-- Fix: Rename 8 columns to match the RPC + client convention.
-- notif_reactions already matches — no change needed.
-- ============================================================

ALTER TABLE public.user_settings RENAME COLUMN notif_challenges TO notif_challenge;
ALTER TABLE public.user_settings RENAME COLUMN notif_results TO notif_debate;
ALTER TABLE public.user_settings RENAME COLUMN notif_follows TO notif_follow;
ALTER TABLE public.user_settings RENAME COLUMN audio_effects TO audio_sfx;
ALTER TABLE public.user_settings RENAME COLUMN audio_auto_mute TO audio_mute;
ALTER TABLE public.user_settings RENAME COLUMN privacy_public_profile TO privacy_public;
ALTER TABLE public.user_settings RENAME COLUMN privacy_debate_history TO privacy_online;
ALTER TABLE public.user_settings RENAME COLUMN privacy_allow_challenges TO privacy_challenges;
