# F-23 Land Mine Additions (S253)

Three new LM entries to add to `THE-MODERATOR-LAND-MINE-MAP.md`:

---

## LM-217 — dm_eligibility backfill must run atomically with migration

**Category:** Data integrity / migration
**Feature:** F-23 DM/Chat
**Added:** S253
**Status:** Open (build-time concern)

The `dm_eligibility` table is the sole runtime gate for `send_dm`. Any gap between table creation and backfill completion = users unable to DM people they should structurally be able to DM (co-occurred in past debates, votes, watches, tips).

**Mitigation:** Migration must CREATE TABLE + backfill INSERT + trigger creation inside a single transaction. Backfill query joins `arena_debates` (participant pairs), `arena_votes` (voter × debater pairs), `debate_watches` (watcher × debater pairs), `sentiment_tips` (tipper × debater pairs). Canonical pair ordering (`LEAST(a,b), GREATEST(a,b)`) for dedup.

**Test:** Run migration on staging clone, verify eligibility row count matches expected co-occurrence count from pre-migration queries.

---

## LM-218 — DM eligibility triggers must be idempotent

**Category:** Trigger correctness
**Feature:** F-23 DM/Chat
**Added:** S253
**Status:** Open (build-time concern)

Four triggers fire on `arena_debates` / `arena_votes` / `debate_watches` / `sentiment_tips` INSERT to populate `dm_eligibility`. If any trigger throws on a duplicate pair insert (which will happen naturally — same voter voting on two debates by the same debater), the source INSERT rolls back and breaks unrelated functionality.

**Mitigation:** Every eligibility trigger must use `INSERT INTO dm_eligibility ... ON CONFLICT DO NOTHING`. No exceptions. Also required for replay-safety if the triggers are ever rebuilt on existing data.

**Test:** Vote twice on two debates by the same debater. Second vote must succeed without error. `dm_eligibility` row count must not double-insert.

---

## LM-219 — Silent-block realtime leak (CRITICAL)

**Category:** Safety / privacy / harassment
**Feature:** F-23 DM/Chat
**Added:** S253
**Status:** Open (build-time concern)
**Severity:** HIGH

F-23 uses a **silent block** model — the blocked user's `send_dm` returns success, their UI shows the message as delivered, but the blocker never receives it. This is the harassment-reduction gold standard (no retaliation, no alt-account escalation).

**Failure mode:** If `dm_messages` rows from blocked senders publish to the blocker's Supabase Realtime channel, the block is not silent at all — the blocker's thread view pops the message in real-time, the blocker reacts, the blocked user learns they were "blocked-but-not-really," and the entire design collapses. The leak is **invisible at the RPC level** — `send_dm` returns success correctly, the DB state is correct, only the realtime subscriber sees the ghost message.

**Mitigation:** Two options, pick one at build time:

1. **RLS on realtime publication** — add `ALTER PUBLICATION supabase_realtime SET (publish = 'insert')` filtered by a RLS policy on `dm_messages` that hides rows where `(sender_id, receiver_id)` exists in `dm_blocks`. Requires verifying that Supabase Realtime respects RLS on the publication (it does, as of Supabase's 2024 Realtime Authorization update).

2. **Dual-write with suppressed flag** — `send_dm` checks `dm_blocks` before INSERT, and if blocked, writes the row with `suppressed_for_receiver = true`. The realtime subscriber filters client-side. Less safe (client-side filtering is trivially bypassable with a modified client) — use option 1.

**Test (must be in the F-23 build test checklist):**

1. User A blocks user B.
2. A subscribes to realtime channel.
3. B sends DM to A via `send_dm` → returns success.
4. Wait 5 seconds.
5. **A's realtime subscription must have received ZERO events for this message.**
6. A's `get_inbox` must not include the thread.
7. B's `get_thread` must still show the message from B's side (silent = they don't know).

This test is non-negotiable and must pass before F-23 deploys to production.

---

**Renumbering note:** If the next session adds more LMs before F-23 builds, these may shift. Lock the numbers at build-brief time.
