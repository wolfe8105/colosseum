# F-24 Land Mine Additions (S253)

Four new LM entries to add to `THE-MODERATOR-LAND-MINE-MAP.md`. Numbered continuing from F-23's LM-217/218/219.

---

## LM-220 — search_index backfill must run atomically with trigger creation

**Category:** Data integrity / migration
**Feature:** F-24 Search
**Added:** S253
**Status:** Open (build-time concern)

The `search_index` table is the sole source of truth for `search_all`. Any gap between table creation and backfill completion means new entities are missing from search results until the next nightly `refresh_search_engagement()` run — potentially 24 hours of invisible users, debates, and groups.

**Mitigation:** Migration must CREATE TABLE + CREATE INDEXES + backfill INSERT + CREATE TRIGGERS inside a single transaction. Backfill query unions three selects: `profiles WHERE deleted_at IS NULL AND searchable = true`, `arena_debates WHERE status = 'complete'`, `groups`. Uses `ON CONFLICT DO NOTHING` on the (entity_type, entity_id) unique constraint.

**Test:** Run migration on staging clone. Row count in `search_index` must equal expected entity count from pre-migration queries. Global search must return results for entities created pre-migration without waiting for cron.

---

## LM-221 — refresh_search_engagement must be idempotent and concurrent-safe

**Category:** Cron correctness
**Feature:** F-24 Search
**Added:** S253
**Status:** Open (build-time concern)

The `refresh_search_engagement()` cron rebuilds engagement scores across all three entity types. Failure modes:

- **Overlapping runs** — if a scheduled run takes longer than expected and the next scheduled run fires before it completes, two concurrent invocations update the same rows.
- **Manual trigger + scheduled run** — Pat manually runs the RPC for testing while the cron also fires.
- **Partial failure** — the function crashes partway through, leaving some entities with fresh scores and others with stale.

**Mitigation:** Function must use `INSERT ... ON CONFLICT (entity_type, entity_id) DO UPDATE SET engagement_score = EXCLUDED.engagement_score` pattern — no read-then-write races, no ordering dependencies between rows. Wrap in a single transaction so partial failure rolls back cleanly. No advisory locks needed if the update pattern is idempotent — concurrent runs just compute the same values and last-writer-wins.

**Test:** Run `refresh_search_engagement()` twice in parallel from two sessions. Both must complete without error. Final scores must match expected values. Run against a row mid-update (kill one session mid-run) — row must be either old-value or new-value, never corrupt.

---

## LM-222 — soft-deleted user trigger must update user row AND authored entity rows atomically

**Category:** Trigger correctness / data integrity
**Feature:** F-24 Search
**Added:** S253
**Status:** Open (build-time concern)

When a user soft-deletes (`profiles.deleted_at` set), two things must happen in the `search_index`:

1. The user's own row (entity_type = 'user') is removed from the index.
2. Any debates they authored and groups they own must have their `display_label` frozen to `[deleted user]` (the debate/group itself stays searchable, but the creator's name is replaced).

**Failure mode:** Partial completion leaves ghost data. If (1) succeeds but (2) fails, searching for the deleted user by name returns no results but their debates still show their old username. If (2) succeeds but (1) fails, the user is still searchable but their content shows `[deleted user]`. Both states are bugs.

**Mitigation:** Single trigger function wrapping both operations in the same transaction. Explicit test in the F-24 build checklist: soft-delete a test user who owns debates and groups, verify both operations completed in the same transaction. Use `AFTER UPDATE` trigger on `profiles` filtered by `OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL`.

**Test:** Create test user, forge a debate they own, create a group they own. Soft-delete the user. Search for their username → returns empty. Search for the debate topic → returns the debate with `[deleted user]` as creator label. Search for the group name → returns the group with `[deleted user]` as owner label. All three changes reflected in same transaction (check via `pg_stat_xact_user_tables` or transaction log).

---

## LM-223 — bidirectional block hide must apply to every entity type in the p_types filter

**Category:** Safety / privacy / forward-compat
**Feature:** F-24 Search
**Added:** S253
**Status:** Open (build-time concern)

F-24 launches with bidirectional block hide on user search only (`entity_type = 'user'`), because F-23 blocks are user-only. Groups and debates aren't currently block-ownable.

**Failure mode (forward-looking):** When full-user-block lands as a future feature, blocking a user should also hide their authored debates and groups from the blocker's search results. If the `NOT EXISTS (dm_blocks ...)` clause in `search_all` is hard-coded to only check user rows, future expansion either silently fails (blocked user's content still surfaces) or requires rewriting the RPC.

**Mitigation:** Write the block-hide clause as a generalized subquery that checks whether the `search_index.entity_id` or its `owner_id` field intersects with the caller's `dm_blocks` set, not as a type-specific clause. Document in the RPC comment that the clause is intended to apply to all future entity types whose block ownership is established via `dm_blocks` or a successor blocks table.

Alternative: add an `owner_id` column to `search_index` (nullable for types that don't have a single owner) so the clause can check `search_index.owner_id NOT IN (caller's blocked set) AND caller NOT IN (search_index.owner_id's blocked set)` uniformly.

**Test:** At build time, write the clause generically. At post-F-23 verification, block a user and confirm none of their debates or groups appear in the blocker's search results (even though F-23 only blocks DM surface — this is F-24's stricter behavior for search specifically). Re-verify when full-user-block ships later — no RPC changes required.

---

**Renumbering note:** F-23 contributed LM-217/218/219. F-24 contributes LM-220/221/222/223. If the next session adds more LMs before either feature builds, numbers may shift. Lock at build-brief time.
