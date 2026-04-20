-- THE MODERATOR — Deployed Functions Export
-- Auto-generated from Supabase production database
-- Last updated: Session 252 (April 9, 2026) — F-55 Reference System Overhaul landed
--
-- This file is the source of truth for what RPCs are live in production.
-- Re-export after any session that modifies RPCs.

-- Domain: notifications

-- Functions: 4

-- Auto-generated from supabase-deployed-functions-export.sql


CREATE OR REPLACE FUNCTION public._notify_user(p_user_id uuid, p_type text, p_title text, p_body text DEFAULT NULL::text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data);
END;

$function$;

CREATE OR REPLACE FUNCTION public.cleanup_notifications()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_deleted INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.notifications
  WHERE user_id = v_user_id
    AND created_at < now() - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'deleted', v_deleted
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_user_id UUID := auth.uid();
  v_updated INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_notification_ids IS NULL THEN
    -- Mark ALL as read
    UPDATE public.notifications
    SET read = true
    WHERE user_id = v_user_id AND read = false;
  ELSE
    -- Mark specific IDs as read
    UPDATE public.notifications
    SET read = true
    WHERE user_id = v_user_id
      AND id = ANY(p_notification_ids)
      AND read = false;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'marked_read', v_updated
  );
END;

$function$;

CREATE OR REPLACE FUNCTION public.notify_new_follower()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$

DECLARE
  v_follower_name TEXT;
BEGIN
  SELECT display_name INTO v_follower_name FROM public.profiles WHERE id = NEW.follower_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.following_id,
    'follow',
    COALESCE(v_follower_name, 'Someone') || ' followed you',
    'You have a new follower!',
    json_build_object('follower_id', NEW.follower_id)::jsonb
  );

  RETURN NEW;
END;

$function$;
