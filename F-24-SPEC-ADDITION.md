## F-24 Search (Users, Debates, Groups)

**Not yet specced anywhere.** Punch list row was "User search, topic search, filtered lobby" — fully walked S253. Discovery surface for the three main entity types in the app. Greenfield build, no existing search infrastructure in the codebase.

**Core model — one materialized index, one query.** A dedicated `search_index` table contains one row per searchable entity (user, debate, group) with a concatenated `search_text` column and a denormalized `engagement_score`. A single `pg_trgm` GIN index powers every search query. **Fuzzy matching via trigrams** gives typo tolerance out of the box (`jhon` finds `john`) with no Elasticsearch / no custom similarity library / no vector embeddings. Results are ranked by `similarity(search_text, query) * engagement_boost` with recency as a tiebreaker. One query path handles global search and every contextual inline search bar in the app.

**Entity types at launch:** users, debates, groups. **Deferred:** references (future marketplace surface), hot takes (ephemeral, low-value).

**Entry points.** Two patterns, both backed by the same RPC:

1. **Global top-nav search** — search icon in the top nav opens a full-screen search page with a single input, empty state showing trending/popular content, live results as the user types.
2. **Contextual inline search bars** — embedded in existing pickers (DM new-message picker calls with `p_types := ARRAY['users']`, lobby calls with `['debates']`, groups page calls with `['groups']`). Same RPC, different type filter.

**Query behavior.**

- **Minimum 2 characters**, **300ms debounce** before firing. 1-char searches return too much noise.
- **Top 10 per entity type** returned, max 30 rows per global query. No pagination — discovery surface, not a browse surface.
- **Client-side in-memory cache** of recent queries (60s TTL, cleared on page reload). Catches the "type pol, delete l, retype l" pattern free of charge.

**Ranking — engagement-boosted.** Each `search_index` row stores a denormalized `engagement_score`:

- **Users:** debate count (primary), wins (secondary), recency tiebreaker
- **Debates:** vote count (primary), stake volume (secondary), recency tiebreaker
- **Groups:** member count (primary), debate count (secondary), recency tiebreaker

Engagement score is **refreshed nightly via a cron RPC** (`refresh_search_engagement`), not live-trigger. Staleness of a few hours is invisible to users, and live-trigger refresh on every vote / stake / tip / watch would cascade unacceptable write load. New entities get `engagement_score = 0` on insert and are picked up on the next refresh.

**Empty state = trending.** When the search input is blank, the global search page renders the top N entities across all three types by `engagement_score DESC`. Single query against `search_index`. Zero new infrastructure. This is the "I opened search but don't know what to search for" surface — top users, hot debates, populated groups.

**Result rows.** Name + entity-type icon + one-line context:

- **User:** `@username` + Elo rating + W/L record
- **Debate:** topic + category icon + date + vote count
- **Group:** name + member count + category icon

Tap → direct navigation to the target (user profile / debate detail / group page). No modal preview step.

**Query state persists within session.** Navigating away from search and returning shows the last query + results still intact. State is in-memory only — cleared on page reload / logout. Matches native app expectations.

**No-results state.** Flat message: "No results for '<query>'". No "did you mean" suggestions (tuning pitfalls outweigh value). No trending fallback content (misleading when user searched something specific).

**Privacy — per-user search opt-out.** New column on `profiles`:

```sql
ALTER TABLE profiles ADD COLUMN searchable BOOLEAN DEFAULT true NOT NULL;
```

Settings toggle: "Hide me from search results." When `false`, the user is filtered out of all `search_all` calls with `p_types := ['users']`. They still appear in leaderboards, their debates still show in debate search, their DMs still work via the F-23 eligibility gate — **search is the only surface affected**. This is NOT a full private-profile feature — that's a separate future build with cross-app surface area. F-24 just promises to respect the `searchable` flag.

Deleted users are **hard-excluded** from `search_index` (trigger on `profiles.deleted_at`). Their authored debates and groups stay indexed with the creator label frozen to `[deleted user]`, matching the F-23 deleted-user pattern.

**Bidirectional block hide.** When user A has blocked user B (via F-23 `dm_blocks`), neither A nor B sees the other in search results. Single `NOT EXISTS (SELECT 1 FROM dm_blocks WHERE (blocker, blocked) IN ((caller, result), (result, caller)))` clause on the `search_all` RPC. Applies to user search only at launch (groups and debates aren't block-ownable). Does NOT retroactively affect leaderboards, debate feeds, spectator lists, or any other surface — **search only**. The rest of the app still shows blocked users normally.

**Rate limiting.**

- **Authed users:** 60 searches per minute per `auth.uid()`. Well above any legitimate typing cadence; kills scraping vectors.
- **Unauthed users:** 20 searches per minute per IP. Unauth users can only search `debates` and `groups` — **user search is authed-only** to prevent user-database enumeration by scrapers.

Rate limits enforced inside the RPC via token-bucket check. 429-equivalent error returned on cap breach.

**No profanity / slur filtering on search queries.** Filtering search input (what users type to find content) is different from filtering content output (what gets published). Search is a lens, not a megaphone — a user typing a slur either finds nothing (content doesn't exist) or finds content that should be handled at the report/moderation layer, not search. Wordlist filtering on queries creates false positives (Scunthorpe problem, name collisions, unicode workarounds) with no safety benefit.

**Database schema.**

```sql
-- Required extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- New column on profiles
ALTER TABLE profiles ADD COLUMN searchable BOOLEAN DEFAULT true NOT NULL;

-- New materialized index table
CREATE TABLE search_index (
  id                BIGSERIAL PRIMARY KEY,
  entity_type       TEXT NOT NULL CHECK (entity_type IN ('user','debate','group')),
  entity_id         UUID NOT NULL,
  search_text       TEXT NOT NULL,
  display_label     TEXT NOT NULL,
  context_line      TEXT,           -- "@john · ELO 1847 · 23W/12L" etc.
  engagement_score  INTEGER NOT NULL DEFAULT 0,
  category          TEXT,           -- for debates/groups
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

-- Trigram GIN index on search_text
CREATE INDEX idx_search_index_trgm ON search_index USING gin (search_text gin_trgm_ops);

-- Engagement ranking index
CREATE INDEX idx_search_index_engagement ON search_index(entity_type, engagement_score DESC);

-- Entity lookup index
CREATE INDEX idx_search_index_entity ON search_index(entity_type, entity_id);
```

RLS: service-role only, access exclusively via RPC.

**Triggers — populate search_index.**

- `trg_profiles_to_search_index` on `profiles` INSERT/UPDATE/DELETE — inserts/updates/removes user row in `search_index`. Respects `searchable` flag (excluded when false) and `deleted_at` (excluded when set).
- `trg_arena_debates_to_search_index` on `arena_debates` INSERT/UPDATE/DELETE — inserts/updates/removes debate row. Only for completed debates (`status = 'complete'`) to avoid indexing in-flight debates.
- `trg_groups_to_search_index` on `groups` INSERT/UPDATE/DELETE — inserts/updates/removes group row.

All triggers use `INSERT ... ON CONFLICT (entity_type, entity_id) DO UPDATE` for idempotency.

**Cron: `refresh_search_engagement()`.** Nightly RPC (scheduled via Supabase cron or triggered manually by Pat). Walks the three source tables, computes the engagement score per entity, updates `search_index.engagement_score`. Idempotent and safe to run concurrently. Takes seconds on launch-scale data.

**RPC surface — 3 new RPCs.**

- `search_all(p_query TEXT, p_types TEXT[], p_limit INT DEFAULT 10)` — unified search. Applies rate limit check, trigram similarity query against `search_index` filtered by `p_types` and rank-ordered by `similarity * engagement_boost`. Excludes caller's blocked users (bidirectional). Respects `searchable` flag on users. Returns up to `p_limit` rows per entity type in `p_types`. Unauth callers can only pass `p_types := ['debate','group']` — `'user'` in unauth list returns an empty user slice.
- `get_trending(p_types TEXT[], p_limit INT DEFAULT 10)` — empty-state feed. Returns top entities by `engagement_score DESC` per requested type. No query needed. Used by the global search empty state.
- `refresh_search_engagement()` — cron function, admin-only. Rebuilds engagement scores from source tables.

Admin tools are **out of scope for v1**. Pat queries Supabase SQL Editor directly for admin lookups. Build admin RPCs later when moderation volume justifies it.

**Client surface.**

- `src/search.ts` — new file, global search page (input + empty-state trending feed + live results + no-results state).
- `src/nav.ts` — top-nav search icon + route wiring for `/search`.
- `src/dm-inbox.ts` — new-message picker uses `search_all` with `p_types := ['users']` (F-23 integration point).
- `src/arena/arena-lobby.ts` — inline debate search bar uses `search_all` with `p_types := ['debates']`.
- `src/pages/groups.ts` — inline group search bar uses `search_all` with `p_types := ['groups']`.

**Build dependencies.** **F-23 must ship first.** The bidirectional block-hide clause references `dm_blocks`, which is introduced in F-23. Shipping F-24 before F-23 would either require a stub `dm_blocks` table or a no-op block-hide that gets retrofitted later — the latter is the exact pattern that leaves security holes in production. Build order: **F-23 → F-24**.

No dependency on F-57 / F-58 / F-59. F-58's `debate_watches` could feed a richer engagement signal post-launch via a one-line cron query addition — not required for v1.

**Build size estimate.** Smaller than F-23. 1 new table + 1 new column + 3 RPCs + 3 triggers + 1 cron function + 1 new client file + 4 edited client files + backfill. Fits cleanly in one Claude Code session with a dedicated build brief.

**Land Mines to track at build time.**

- **LM-220** — `search_index` backfill must run atomically with trigger creation. Any gap = new entities missing from search until next nightly refresh. Backfill in the same transaction as table/trigger creation.
- **LM-221** — `refresh_search_engagement()` must be idempotent and concurrent-safe. Accidental double-run (cron overlap, manual trigger) must be correctness-only, not corruption. Use `INSERT ... ON CONFLICT` pattern, no read-then-write races.
- **LM-222** — Soft-deleted user trigger must update BOTH the user's `search_index` row (delete) AND any entity rows (debates, groups) they authored (freeze `display_label` to `[deleted user]`) in a single transaction. Partial completion = ghost data in search.
- **LM-223** — Bidirectional block hide in `search_all` must apply to every entity type in the `p_types` filter, not just `'user'`. Future-proof against blocking being extended to other entity types. Single clause, applied once per query.

**Test checklist.**

1. Extension installed: `SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'` returns a row.
2. `search_index` table exists with expected columns.
3. Backfill populated: row count matches existing users + completed debates + groups.
4. Trigram index functional: `EXPLAIN` on a similarity query shows index scan.
5. User search with exact match: returns the user.
6. User search with 1-char typo: returns the user via fuzzy match.
7. Debate search by topic keyword: returns matching debates.
8. Group search by name: returns matching groups.
9. Global search mixing all types: returns balanced results per type.
10. Engagement ranking: higher-engagement entity appears above lower-engagement match.
11. Empty query via `get_trending`: returns trending feed.
12. 2-char minimum: 1-char query rejected or returns empty.
13. `searchable = false`: user excluded from search results.
14. Re-enable `searchable`: user reappears on next query.
15. Deleted user: excluded from search; their debates still appear with `[deleted user]` label.
16. New user inserted: trigger adds to `search_index` within same transaction.
17. User display_name update: trigger updates `search_index.search_text` within same transaction.
18. Block (F-23): A blocks B, search from A does not return B.
19. **Bidirectional hide**: search from B does not return A either.
20. Rate limit authed: 61st search in 60s rejected.
21. Rate limit unauth: 21st search in 60s from same IP rejected.
22. Unauth user-search rejection: `search_all('test', ARRAY['user'])` from unauth returns empty user slice.
23. Cron refresh: `refresh_search_engagement()` updates scores without errors.
24. Double cron run: two concurrent invocations complete without corruption.

**Status.** Fully specced S253. No parked items. Ready to build after F-23 ships.
