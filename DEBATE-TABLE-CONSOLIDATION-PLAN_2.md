# DEBATE TABLE CONSOLIDATION PLAN

## Mission

Eliminate the dual debate table architecture. Consolidate `debates` (legacy) into `arena_debates` (active). Update every RPC, query, FK, and RLS policy. Drop the legacy table. One table when done.

**Do NOT touch `async_debates` or `auto_debates` — those are separate systems and out of scope.**

---

## Current State: Three Debate Tables

### `arena_debates` (KEEP — this is the canonical table)
- **File:** `colosseum-arena-schema.sql` L47-65
- **Columns:** id, debater_a, debater_b, mode (live/voicememo/text/ai), category, topic, status (pending/live/round_break/voting/complete/cancelled), current_round, total_rounds (default 3), winner (text: 'a'/'b'/'draw'), score_a, score_b, spectator_count, vote_count_a, vote_count_b, created_at, started_at, ended_at
- **FK dependents:** `arena_votes.debate_id`
- **RLS:** `arena_debates_select` (public read), writes via RPC only
- **RPCs that touch it:** join_debate_queue, create_ai_debate, submit_debate_message, vote_arena_debate, get_arena_feed

### `debates` (LEGACY — being eliminated)
- **File:** `colosseum-schema-production.sql` L237-265
- **Columns:** id, topic, category, format (standard/crossfire/qa_prep), debater_a, debater_b, winner (UUID ref to profiles), status (waiting/matched/live/voting/completed/canceled), current_round, total_rounds (default 5), votes_a, votes_b, elo_change_a, elo_change_b, spectator_count, recording_url, transcript (JSONB), started_at, ended_at, created_at
- **Added columns** (from `colosseum-references-migration.sql` L16-22): moderator_id, moderator_type, is_paused, paused_at
- **FK dependents:**
  - `debate_votes.debate_id → debates(id)` (schema-production L287)
  - `predictions.debate_id → debates(id)` (schema-production L311)
  - `reports.debate_id → debates(id)` nullable (schema-production L337)
  - `debate_references.debate_id → debates(id)` (references-migration L80)
  - `moderator_scores.debate_id → debates(id)` (references-migration L129)
- **RLS policies:**
  - `colosseum-rls-hardened.sql` L62-64: drops old policies, L197-198: creates `debates_select_public`
  - `colosseum-schema-production.sql` L272-278: original 3 policies
- **RPCs that touch it:**
  - `finalize_debate` (wire-log L295) — reads + updates `public.debates`
  - `advance_round` (wire-log L480) — reads + updates `public.debates`
  - `place_prediction` (wire-log L219) — reads `public.debates`
  - `submit_reference` (wire-log L760) — reads + updates `public.debates`
  - `rule_on_reference` (wire-log L888) — reads + updates `public.debates`
  - `auto_allow_expired_references` (wire-log L977) — joins + updates `public.debates`
  - `score_moderator` (wire-log L1024) — reads `public.debates`
  - `assign_moderator` (wire-log L1117) — reads + updates `public.debates`
  - `create_debate` (move3 ~L274) — inserts into `public.debates`
  - `cast_vote` (move3 ~L542) — reads `public.debates`
  - `advance_async_round` (move3 ~L326) — reads `public.async_debates` (NOT in scope, but shares file)
- **Direct client queries (CASTLE DEFENSE VIOLATIONS):**
  - `colosseum-scoring.js` L195: `getDebate()` → `.from('debates')` with profile joins
  - `colosseum-scoring.js` L215: `getMyDebates()` → `.from('debates')` with `.or()` filter

### `async_debates` (OUT OF SCOPE — do not touch)
- **File:** `colosseum-schema-production.sql` L405-419
- Separate system for hot-take-spawned async debates. Leave it alone.

---

## Schema Differences Between `debates` and `arena_debates`

| Feature | `debates` (legacy) | `arena_debates` (active) |
|---|---|---|
| Format/Mode | `format` TEXT (standard/crossfire/qa_prep) | `mode` TEXT (live/voicememo/text/ai) |
| Status values | waiting/matched/live/voting/completed/canceled | pending/live/round_break/voting/complete/cancelled |
| Winner type | UUID (references profiles) | TEXT ('a'/'b'/'draw') |
| Default rounds | 5 | 3 |
| Vote columns | votes_a, votes_b | vote_count_a, vote_count_b |
| Elo tracking | elo_change_a, elo_change_b | (none) |
| Recording | recording_url TEXT | (none) |
| Transcript | transcript JSONB | (none) |
| Scores | (none) | score_a, score_b |
| Moderator | moderator_id, moderator_type, is_paused, paused_at | (none) |

---

## Execution Steps (in order)

### STEP 1: Expand `arena_debates` schema

Add every column from `debates` that `arena_debates` doesn't already have. Run this SQL in Supabase SQL Editor:

```sql
ALTER TABLE arena_debates
  ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'standard' CHECK (format IN ('standard','crossfire','qa_prep')),
  ADD COLUMN IF NOT EXISTS elo_change_a INTEGER,
  ADD COLUMN IF NOT EXISTS elo_change_b INTEGER,
  ADD COLUMN IF NOT EXISTS recording_url TEXT,
  ADD COLUMN IF NOT EXISTS transcript JSONB,
  ADD COLUMN IF NOT EXISTS moderator_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS moderator_type TEXT DEFAULT 'none' CHECK (moderator_type IN ('none','ai','human')),
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- Expand status CHECK to include legacy values
ALTER TABLE arena_debates DROP CONSTRAINT IF EXISTS arena_debates_status_check;
ALTER TABLE arena_debates ADD CONSTRAINT arena_debates_status_check
  CHECK (status IN ('pending', 'live', 'round_break', 'voting', 'complete', 'cancelled', 'waiting', 'matched', 'completed', 'canceled'));

-- Expand mode CHECK to include legacy format values
ALTER TABLE arena_debates DROP CONSTRAINT IF EXISTS arena_debates_mode_check;
ALTER TABLE arena_debates ADD CONSTRAINT arena_debates_mode_check
  CHECK (mode IN ('live', 'voicememo', 'text', 'ai', 'standard', 'crossfire', 'qa_prep'));

-- Add legacy-style indexes
CREATE INDEX IF NOT EXISTS idx_arena_debates_moderator ON arena_debates(moderator_id) WHERE moderator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_arena_debates_debater_a ON arena_debates(debater_a);
CREATE INDEX IF NOT EXISTS idx_arena_debates_debater_b ON arena_debates(debater_b);
```

**NOTE on winner column:** `arena_debates.winner` is TEXT ('a'/'b'/'draw'). Legacy `debates.winner` is UUID. All RPCs that currently write to `debates.winner` must be updated to write 'a'/'b'/'draw' text instead of a UUID. Check every `finalize_debate` and vote-resolution path.

### STEP 2: Migrate data from `debates` into `arena_debates`

```sql
INSERT INTO arena_debates (
  id, debater_a, debater_b, mode, category, topic, status,
  current_round, total_rounds, winner, spectator_count,
  vote_count_a, vote_count_b, created_at, started_at, ended_at,
  format, elo_change_a, elo_change_b, recording_url, transcript,
  moderator_id, moderator_type, is_paused, paused_at,
  score_a, score_b
)
SELECT
  id, debater_a, debater_b,
  COALESCE(format, 'standard') as mode,
  category, topic, status,
  current_round, total_rounds,
  -- Convert UUID winner to text 'a'/'b'/'draw'
  CASE
    WHEN winner = debater_a THEN 'a'
    WHEN winner = debater_b THEN 'b'
    WHEN winner IS NULL THEN NULL
    ELSE 'draw'
  END as winner,
  spectator_count,
  votes_a as vote_count_a,
  votes_b as vote_count_b,
  created_at, started_at, ended_at,
  format, elo_change_a, elo_change_b, recording_url, transcript,
  moderator_id, moderator_type, is_paused, paused_at,
  0 as score_a, 0 as score_b
FROM debates
ON CONFLICT (id) DO NOTHING;
```

**Verify:** `SELECT count(*) FROM debates;` should match new rows added to `arena_debates`.

### STEP 3: Re-point all FK dependencies

For each table that FKs to `debates(id)`, drop the old FK and add a new one to `arena_debates(id)`:

```sql
-- debate_votes
ALTER TABLE debate_votes DROP CONSTRAINT IF EXISTS debate_votes_debate_id_fkey;
ALTER TABLE debate_votes ADD CONSTRAINT debate_votes_debate_id_fkey
  FOREIGN KEY (debate_id) REFERENCES arena_debates(id) ON DELETE CASCADE;

-- predictions
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_debate_id_fkey;
ALTER TABLE predictions ADD CONSTRAINT predictions_debate_id_fkey
  FOREIGN KEY (debate_id) REFERENCES arena_debates(id) ON DELETE CASCADE;

-- reports (nullable FK)
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_debate_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_debate_id_fkey
  FOREIGN KEY (debate_id) REFERENCES arena_debates(id) ON DELETE CASCADE;

-- debate_references
ALTER TABLE debate_references DROP CONSTRAINT IF EXISTS debate_references_debate_id_fkey;
ALTER TABLE debate_references ADD CONSTRAINT debate_references_debate_id_fkey
  FOREIGN KEY (debate_id) REFERENCES arena_debates(id) ON DELETE CASCADE;

-- moderator_scores
ALTER TABLE moderator_scores DROP CONSTRAINT IF EXISTS moderator_scores_debate_id_fkey;
ALTER TABLE moderator_scores ADD CONSTRAINT moderator_scores_debate_id_fkey
  FOREIGN KEY (debate_id) REFERENCES arena_debates(id) ON DELETE CASCADE;
```

**Important:** The actual constraint names may differ from what's above. Before running, check actual names:
```sql
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE confrelid = 'debates'::regclass;
```
Use the real constraint names in the DROP statements.

### STEP 4: Update all SQL RPCs — `colosseum-wire-log-event.sql`

Every `public.debates` reference in this file must become `arena_debates`. Here are the exact functions and line numbers:

| Function | Lines | What it does with `debates` |
|---|---|---|
| `place_prediction` | L239 | SELECT * INTO v_debate FROM public.debates |
| `finalize_debate` | L312, L355 | SELECT FOR UPDATE, then UPDATE debates SET winner, votes, elo, status |
| `advance_round` | L487, L498, L517 | SELECT, UPDATE current_round, UPDATE status |
| `submit_reference` | L798, L853 | SELECT FOR UPDATE, UPDATE spectator data |
| `rule_on_reference` | L916, L938 | SELECT, UPDATE |
| `auto_allow_expired_references` | L987, L999 | JOIN debates, UPDATE debates |
| `score_moderator` | L1038 | SELECT |
| `assign_moderator` | L1129, L1143, L1191 | SELECT FOR UPDATE, UPDATE moderator columns |

**For each function:**
1. Replace `public.debates` → `arena_debates`
2. Check the `v_debate` record type — it was `public.debates%ROWTYPE`. Change to `arena_debates%ROWTYPE`.
3. **CRITICAL:** `finalize_debate` writes `winner` as a UUID. This must change to write 'a'/'b'/'draw' text instead. Find the line that does `UPDATE public.debates SET winner = [some UUID]` and rewrite it.
4. Check column name differences: `votes_a` → `vote_count_a`, `votes_b` → `vote_count_b` everywhere in these functions.
5. The `format` column references can stay since we added `format` to `arena_debates`.

### STEP 5: Update SQL RPCs — `colosseum-move3-sanitize-ratelimit.sql`

| Function | Lines | What it does |
|---|---|---|
| `create_debate` | ~L274 | INSERT INTO public.debates |
| `cast_vote` | ~L542 | SELECT * INTO v_debate FROM public.debates |
| (unnamed vote update) | ~L566 | UPDATE public.debates |

**Same treatment:** Replace `public.debates` → `arena_debates`. Fix column names (votes_a → vote_count_a, etc.). Fix winner UUID → text conversion.

### STEP 6: Update SQL RPCs — `colosseum-arena-schema.sql`

The `get_arena_feed` function (L332) already queries `arena_debates`. No change needed there.

But verify the CREATE TABLE statement for `arena_debates` at L47 matches the expanded schema from Step 1. Update the file to include the new columns so the schema file stays accurate as documentation.

### STEP 7: Update `colosseum-analytics-migration.sql`

- L358: `JOIN public.debates d ON d.id = dr.debate_id` → `JOIN arena_debates d ON d.id = dr.debate_id`
- L500: `FROM public.arena_debates ad` (already correct)
- L715: `FROM arena_debates` (already correct)
- L745: Check if any other `debates` references exist in views/functions

### STEP 8: Update `colosseum-references-migration.sql`

- L16-22: The `ALTER TABLE public.debates ADD COLUMN` statements are now irrelevant (columns added to arena_debates in Step 1). Either remove these lines or update them to target `arena_debates`.
- L80: `debate_references` FK declaration — update to reference `arena_debates(id)` (already handled by Step 3 at runtime, but fix the schema file for documentation accuracy).
- L129: `moderator_scores` FK declaration — same treatment.

### STEP 9: Update `colosseum-rls-hardened.sql`

- L62-64: The `DROP POLICY` statements for `public.debates` — remove these entirely.
- L197-198: The `CREATE POLICY debates_select_public ON public.debates` — remove or redirect to `arena_debates`. Since `arena_debates` already has `arena_debates_select` policy for public read, this is redundant. Just delete it.
- L294: `NEW.debates_completed := OLD.debates_completed;` — this is in the `guard_profile_columns` trigger, refers to a COLUMN name not a table. **Leave it alone.**
- L337: Same — `debates_completed` is a column on `profiles`. **Leave it alone.**

### STEP 10: Update `colosseum-schema-production.sql`

- L237-280: The entire `CREATE TABLE debates` block + its indexes + RLS policies — comment out or delete. This table no longer exists.
- L272-278: The 3 RLS policies on `debates` — delete.
- L287: `debate_votes.debate_id REFERENCES public.debates(id)` — change to `REFERENCES arena_debates(id)`.
- L311: `predictions.debate_id REFERENCES public.debates(id)` — same.
- L337: `reports.debate_id REFERENCES public.debates(id)` — same.

### STEP 11: Fix client-side castle defense violations — `colosseum-scoring.js`

**L195 — `getDebate()` function:**
```javascript
// BEFORE (direct table query — castle defense violation)
const { data, error } = await getClient()
  .from('debates')
  .select('*, debater_a_profile:profiles!debates_debater_a_fkey(*), debater_b_profile:profiles!debates_debater_b_fkey(*)')
  .eq('id', debateId)
  .single();

// AFTER — either:
// Option A: Change table name to arena_debates + fix FK alias names
const { data, error } = await getClient()
  .from('arena_debates')
  .select('*, debater_a_profile:profiles!arena_debates_debater_a_fkey(*), debater_b_profile:profiles!arena_debates_debater_b_fkey(*)')
  .eq('id', debateId)
  .single();

// Option B (preferred): Create an RPC and use safeRpc — true castle defense
// This requires creating a new get_debate_by_id(p_debate_id UUID) RPC
```

**L215 — `getMyDebates()` function:**
```javascript
// BEFORE
const { data, error } = await getClient()
  .from('debates')
  .select('*')
  .or(`debater_a.eq.${safeId},debater_b.eq.${safeId}`)
  .order('created_at', { ascending: false })
  .limit(limit);

// AFTER — change table name
const { data, error } = await getClient()
  .from('arena_debates')
  .select('*')
  .or(`debater_a.eq.${safeId},debater_b.eq.${safeId}`)
  .order('created_at', { ascending: false })
  .limit(limit);
```

**Note:** The PostgREST FK alias `profiles!debates_debater_a_fkey` will break after the table rename. The actual FK constraint name in Supabase needs to be checked. Run:
```sql
SELECT conname FROM pg_constraint WHERE conrelid = 'arena_debates'::regclass AND contype = 'f';
```
Use whatever constraint names come back for the `.select()` join aliases.

### STEP 12: Drop the legacy table

After all the above is committed, deployed, and verified working:

```sql
-- Final kill
DROP POLICY IF EXISTS "debates_select_public" ON public.debates;
DROP POLICY IF EXISTS "Debates public read" ON public.debates;
DROP POLICY IF EXISTS "Authenticated users create debates" ON public.debates;
DROP POLICY IF EXISTS "Debaters update own debates" ON public.debates;
DROP TABLE IF EXISTS public.debates CASCADE;
```

**WARNING:** `CASCADE` will also drop any remaining FKs, views, or triggers that reference this table. By this point there should be none, but verify first:
```sql
SELECT conname, conrelid::regclass FROM pg_constraint WHERE confrelid = 'debates'::regclass;
```
If this returns 0 rows, you're safe to DROP.

---

## Files Modified (Summary)

| File | Changes |
|---|---|
| `colosseum-wire-log-event.sql` | 16 lines: all `public.debates` → `arena_debates` + column renames + winner type fix |
| `colosseum-move3-sanitize-ratelimit.sql` | ~6 lines: `public.debates` → `arena_debates` + column renames |
| `colosseum-scoring.js` | 2 direct queries: change `.from('debates')` → `.from('arena_debates')` + fix FK aliases |
| `colosseum-arena-schema.sql` | Update CREATE TABLE to include new columns (documentation accuracy) |
| `colosseum-schema-production.sql` | Delete/comment debates CREATE TABLE + update FK references in dependent tables |
| `colosseum-rls-hardened.sql` | Remove debates-specific policy lines |
| `colosseum-references-migration.sql` | Update ALTER TABLE target + FK references |
| `colosseum-analytics-migration.sql` | 1 JOIN reference to update |

---

## Verification Checklist

After all changes, before committing:

1. `grep -rn "public\.debates" --include="*.js" --include="*.sql" | grep -v async_debates | grep -v auto_debates | grep -v debate_votes | grep -v debate_ref | grep -v debate_messages | grep -v mod_debates | grep -v debates_completed` — should return ZERO results
2. `grep -rn "from('debates')" --include="*.js"` — should return ZERO results
3. `grep -rn "\.debates " --include="*.sql" | grep -v "async_debates\|auto_debates\|arena_debates\|debate_votes\|debate_ref\|debate_messages\|mod_debates\|debates_completed"` — should return ZERO results (or only commented-out lines)
4. Every function in wire-log-event.sql that previously used `v_debate public.debates%ROWTYPE` now uses `v_debate arena_debates%ROWTYPE` (or just `RECORD`)
5. The `winner` column writes in `finalize_debate` produce 'a'/'b'/'draw' text, NOT a UUID
6. Column names `votes_a`/`votes_b` are replaced with `vote_count_a`/`vote_count_b` everywhere

---

## SQL to Run in Supabase SQL Editor (Steps 1-3, 12)

Steps 1, 2, 3, and 12 require SQL execution in Supabase SQL Editor. These CANNOT be done via file changes — they modify live database schema.

Steps 4-11 are file changes that Claude Code commits and pushes to GitHub for Vercel auto-deploy.

**Execution order:**
1. Run Steps 1-3 SQL in Supabase (expand schema, migrate data, re-point FKs)
2. Claude Code does Steps 4-11 (file changes, commit, push)
3. Verify Vercel deployment works
4. Run Step 12 SQL in Supabase (drop legacy table)

---

## CASTLE DEFENSE RULES (reminders for Claude Code)

- All Supabase writes go through `.rpc()` SECURITY DEFINER functions
- `safeRpc()` wraps all RPC calls for 401 retry
- Direct table writes from client are the anti-pattern
- All user data entering innerHTML must pass through `escapeHTML()`
- SECURITY DEFINER RPCs must use `auth.uid()` internally, not accept `user_id` as parameter
- Do NOT touch `async_debates`, `auto_debates`, or `auto_debate_votes`
