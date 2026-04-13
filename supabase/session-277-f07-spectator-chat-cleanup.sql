-- SESSION 277 — F-07: Spectator Chat Ephemeral Cleanup
--
-- SCOPE: Spectator chat is live-only per the F-07 spec.
-- Messages are erased when a debate transitions to a terminal status
-- (complete, null, nulled, abandoned). This keeps the spectator_chat
-- table lean and prevents stale chat from appearing in the replay viewer.
--
-- Implementation: AFTER UPDATE trigger on arena_debates.
-- Fires only when status actually changes to a terminal value.
-- Safe to run: no new tables, no data migration.
-- ────────────────────────────────────────────────────────────

-- Trigger function: deletes spectator_chat rows for the finished debate
CREATE OR REPLACE FUNCTION public._trg_erase_spectator_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only act on genuine status transitions into terminal states
  IF NEW.status IN ('complete', 'completed', 'null', 'nulled', 'abandoned')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    DELETE FROM public.spectator_chat WHERE debate_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Attach to arena_debates AFTER UPDATE
DROP TRIGGER IF EXISTS erase_spectator_chat_on_end ON public.arena_debates;

CREATE TRIGGER erase_spectator_chat_on_end
  AFTER UPDATE OF status ON public.arena_debates
  FOR EACH ROW
  EXECUTE FUNCTION public._trg_erase_spectator_chat();

-- ────────────────────────────────────────────────────────────
-- DONE
-- Expected: no rows returned.
--
-- New: _trg_erase_spectator_chat() trigger function
--      erase_spectator_chat_on_end trigger on arena_debates
--
-- SESSION: 277 (F-07 Spectator Features)
-- ────────────────────────────────────────────────────────────
