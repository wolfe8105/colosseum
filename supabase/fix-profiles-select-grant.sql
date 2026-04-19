-- Fix: profiles table missing SELECT grant for anon/authenticated
-- Applied: April 19, 2026
--
-- Root cause: RLS policy "profiles_select_public" existed for anon+authenticated
-- but the table-level GRANT SELECT was missing for both roles.
-- Only postgres and service_role had SELECT.
-- This caused "permission denied for table profiles" (42501) on any
-- query that joined to profiles (e.g. hot_takes with profiles(username,...)).
--
-- The fetchTakes error on every index.html page load was caused by this.

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO authenticated;
