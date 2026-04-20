-- ============================================================
-- THE MODERATOR — Direct Messages Foundation
-- Session 281: RPCs for DM system (adapted to existing schema)
--
-- Existing tables: dm_threads (participant_a/b, last_message_at),
--   dm_messages (content, deleted_at, read_at), dm_blocks, dm_eligibility
--
-- Applied via Supabase migration: session_281_dm_rpcs_v2
-- ============================================================

-- Added column:
--   ALTER TABLE public.dm_threads ADD COLUMN IF NOT EXISTS last_message TEXT;

-- RPCs created/replaced:
--   get_dm_threads()           — inbox with unread counts
--   get_dm_messages(thread_id) — paginated messages, auto mark-read
--   send_dm(recipient, body)   — eligibility + block checks, thread upsert
--   block_dm_user(user_id)     — silent block
--   unblock_dm_user(user_id)   — remove block
--   get_dm_unread_count()      — badge count

-- NOTE: RPCs return 'body' (aliased from 'content') to match TypeScript types.
-- The DB column is 'content', the RPC output key is 'body'.
