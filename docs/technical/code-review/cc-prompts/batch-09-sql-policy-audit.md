# Code Review Fix — Batch 09: SQL Policy Audit Results — Pre-Run

**Layer:** 1A (SQL — policy correctness audit)
**Guide reference:** Colosseum-SQL-Review-Checklist.docx, Sections 2 and 3
**Dependency:** Batch 08 must be committed before this runs.

---

## SETUP

```bash
git clone https://GITHUB_TOKEN@github.com/wolfe8105/colosseum.git
cd colosseum
git remote set-url origin https://GITHUB_TOKEN@github.com/wolfe8105/colosseum.git
```

---

## MANDATORY FILE READ VERIFICATION

  Step 1: `wc -l <filename>`. Step 2: read file. Step 3: confirm line count.
  If count wrong: stop, re-read.

---

## BEFORE STARTING

1. Read `docs/technical/AUDIT-FINDINGS.md`.
2. Confirm Batch 08 committed: `git log --oneline -3`.
3. The three live audit queries were already run against the production database
   on April 20, 2026. Results are embedded below — no Supabase CLI needed.
   This batch only requires writing one migration file based on known results.

---

## PRE-RUN AUDIT RESULTS (April 20, 2026)

### Audit 1: USING(true) policies — 36 tables returned

All 36 are SELECT-only policies on public reference or activity data.
The full list is documented here for the record:

achievements, app_config, arena_debates, arena_votes, arsenal_references,
async_debates, auto_debates, classifier_keywords, cosmetic_items, cosmetics,
debate_feed_events, debate_messages, debate_references, debate_votes, follows,
group_challenges, hot_take_reactions, hot_takes, moderator_scores,
modifier_effects, power_ups, prediction_picks, prediction_questions,
predictions, profiles, reference_challenges, reference_seconds,
reference_sockets, search_index, spectator_chat, stake_pools,
tournament_entries, tournament_matches, tournaments (×2), user_achievements

**reference_sockets columns confirmed:** id (uuid), reference_id (uuid),
socket_index (integer), modifier_id (uuid), effect_id (text), socketed_at
(timestamptz). No user IDs, emails, or session data. **→ USING(true) is OK.**

**Verdict: All 36 USING(true) policies are on genuinely public tables. No fixes needed.**

---

### Audit 2: UPDATE/ALL policies without WITH CHECK — 13 results

These are the 13 policies returned. Read them carefully:

| Table | Policy | CMD | QUAL (who can access) |
|-------|--------|-----|-----------------------|
| arsenal_references | Arsenal references updated by server | UPDATE | false |
| daily_snapshots | snapshots_service_only | ALL | service_role only |
| debate_feed_events | feed_events_no_update | UPDATE | false |
| debate_references | References updated by server | UPDATE | false |
| event_log | event_log_service_only | ALL | service_role only |
| group_auditions | group_auditions_rpc_only | ALL | false |
| job | cron_job_policy | ALL | CURRENT_USER only |
| job_run_details | cron_job_run_details_policy | ALL | CURRENT_USER only |
| mod_dropout_log | mod_dropout_no_update | UPDATE | false |
| objects | group_banner_leader_update | UPDATE | bucket_id = 'group-banners' |
| objects | intro_music_owner_update | UPDATE | bucket_id + owner check |
| reference_challenges | Reference challenges updated by server | UPDATE | false |
| stripe_processed_events | stripe_events_no_user_access | ALL | false |

**Analysis:**

- **QUAL = false** (7 policies): arsenal_references, debate_feed_events,
  debate_references, group_auditions, mod_dropout_log, reference_challenges,
  stripe_processed_events. These policies BLOCK all direct writes — they are
  intentional deny policies. WITH CHECK is irrelevant when QUAL is false
  (no row can pass the USING check to reach a WITH CHECK evaluation).
  **→ No fix needed.**

- **Service-role-only** (2 policies): daily_snapshots, event_log.
  These are restricted to postgres/service_role. Client users never reach them.
  **→ No fix needed.**

- **CURRENT_USER** (2 policies): job, job_run_details — pg_cron internal tables.
  **→ Not our code, no fix needed.**

- **Storage objects** (2 policies): group_banner_leader_update and
  intro_music_owner_update have legitimate QUAL conditions restricting to the
  right bucket + owner. These do need WITH CHECK to prevent users from writing
  to rows they can read but shouldn't be able to write to.
  **→ FIX NEEDED for these two.**

---

## THE FIX

Create a migration file to add WITH CHECK to the two storage object policies.

**Read `supabase/functions/` directory to find the most recent session number:**
```bash
ls supabase/session-*.sql 2>/dev/null | sort | tail -3
```

Name the new file: `supabase/session-NNN-batch09-rls-with-check.sql`
(replace NNN with the next session number after the latest one you find)

**Migration content:**

```sql
-- Batch 09: Add WITH CHECK to storage object UPDATE policies
-- These policies had QUAL conditions but no WITH CHECK, meaning
-- authenticated users could update rows they can read to point at
-- buckets they shouldn't write to.

-- group_banner_leader_update: users can only update objects in group-banners bucket
DROP POLICY IF EXISTS "group_banner_leader_update" ON storage.objects;
CREATE POLICY "group_banner_leader_update"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'group-banners')
WITH CHECK (bucket_id = 'group-banners');

-- intro_music_owner_update: users can only update their own intro music files
DROP POLICY IF EXISTS "intro_music_owner_update" ON storage.objects;
CREATE POLICY "intro_music_owner_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'intro-music'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'intro-music'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
```

Write this file, then verify it parses correctly:
```bash
# Check for syntax issues by searching for common mistakes:
grep -n 'DROP POLICY\|CREATE POLICY\|WITH CHECK\|USING' supabase/session-NNN-batch09-rls-with-check.sql
```

---

## VERIFICATION

After writing the migration file, confirm the policy structure looks correct:
```bash
wc -l supabase/session-NNN-batch09-rls-with-check.sql
```

The file should be 25–35 lines. If it is 0 lines or does not exist, stop and report.

**Note:** This migration must be applied in the Supabase dashboard (SQL editor)
or via `supabase db push` — it is not auto-applied by creating the file.
Add a comment to the file header noting it needs to be applied manually.

---

## COMMIT

```bash
git add supabase/session-NNN-batch09-rls-with-check.sql
git commit -m "Batch 09: add WITH CHECK to group_banner and intro_music storage UPDATE policies"
```

---

## WHEN DONE — report

- The exact filename used (with session number)
- Line count of the migration file
- Confirmation that both DROP POLICY and CREATE POLICY statements are present for both policies
- Note that the migration still needs to be applied in Supabase dashboard

Stop. Do not start Batch 10.
