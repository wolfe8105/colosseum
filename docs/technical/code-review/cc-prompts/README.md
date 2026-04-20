# CC Prompts — Code Review Fix Batches

## Before running any batch — replace the token

Every batch file contains `GITHUB_TOKEN` as a placeholder in the SETUP block.
Before pasting a prompt into Claude Code, replace it with a live token:

```
https://GITHUB_TOKEN@github.com/...
         ↓ replace with
https://YOUR_TOKEN_HERE@github.com/...
```

Generate a token at: github.com → Settings → Developer settings → Personal access tokens
Scopes needed: `repo` (read + write).

17 Claude Code prompt files covering every fix item from the five review guides.
Each file is a self-contained prompt — paste it into Claude Code and it runs.

**ORDER IS MANDATORY.** Each batch depends on the previous one being committed.
The only exception: Batch 10 (TypeScript) can run in parallel with Batches 02–09
(SQL) because Layer 1A and Layer 1B are independent.

---

## The 17 batches

| Batch | File | Layer | What it fixes | Size constraint |
|-------|------|-------|---------------|-----------------|
| 01 | `batch-01-json.md` | 0 | vite CVE, supabase-js bucket, isolatedModules, mcp gitignore | Small — run first |
| 02 | `batch-02-sql-arena.md` | 1A | arena.sql — 55 SECURITY DEFINER + search_path | 98kb — solo |
| 03 | `batch-03-sql-auth.md` | 1A | auth.sql — 34 functions | 46kb — solo |
| 04 | `batch-04-sql-references.md` | 1A | references.sql — 18 functions | 44kb — solo |
| 05 | `batch-05-sql-moderation.md` | 1A | moderation.sql — 23 functions | 37kb — solo |
| 06 | `batch-06-sql-groups.md` | 1A | groups.sql — 16 functions | 27kb — solo |
| 07 | `batch-07-sql-tokens.md` | 1A | tokens.sql — 11 functions | 27kb — solo |
| 08 | `batch-08-sql-remaining.md` | 1A | predictions+hot-takes+admin+notifications (29 functions) + final 0-check | 44kb combined |
| 09 | `batch-09-sql-policy-audit.md` | 1A | USING(true) audit + WITH CHECK gaps — live DB queries | No file reads |
| 10 | `batch-10-typescript.md` | 1B | home.feed.ts + home.depth.ts any casts + void async WATCH | **Parallel with 02–09** |
| 11 | `batch-11-javascript.md` | 2A | JWT verify, SUPABASE_URL fallbacks, invite guard, AbortController | After 01+09 |
| 12 | `batch-12-html-index.md` | 2B | index.html OG tags | 62kb — solo |
| 13 | `batch-13-html-groups.md` | 2B | moderator-groups.html OG tags | 43kb — solo |
| 14 | `batch-14-html-settings-login.md` | 2B | settings + login OG tags | 22+20=42kb |
| 15 | `batch-15-html-terms-plinko.md` | 2B | terms + plinko OG tags | 19+17=36kb |
| 16 | `batch-16-html-cosmetics-privacy-depth.md` | 2B | cosmetics + privacy + profile-depth OG tags | 16+16+12=44kb |
| 17 | `batch-17-html-final.md` | 2B | Anon key rotation comments + CSP hash audit + final verification | Completion batch |

---

## Parallelism rules

```
Batch 01 (JSON)  ← must run first, unblocks everything

Then in parallel:
  Track A: 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09  (SQL, one CC session)
  Track B: 10                                         (TypeScript, second CC session)

After BOTH tracks complete:
  11 (JS) → 12 → 13 → 14 → 15 → 16 → 17  (sequential)
```

You can run Track A and Track B simultaneously in two separate Claude Code
windows. They touch completely different files — no conflicts.

---

## What each batch produces

Each batch ends with a commit. When all 17 are done, `git log --oneline | grep "Batch "` 
should show 17 commits (some batches may have no commit if no changes were needed,
such as if Batch 09 finds no policy issues).

The final verification in Batch 17 confirms the complete state:
- `npm audit` shows 0 high/critical
- `npm run typecheck` passes clean
- All SECURITY DEFINER functions have `search_path`
- All 9 missing-OG-tag pages now have OG tags
- No hardcoded SUPABASE_URL fallbacks in api/ files

---

## How to use these prompts

1. Open Claude Code in the repo root (`/path/to/colosseum`)
2. Paste the entire contents of the batch file into Claude Code
3. Let it run — each prompt is self-contained with verification steps
4. Review the WHEN DONE report before moving to the next batch
5. The batch will tell you exactly what to commit

Do not skip batches. Do not run batch N+1 until batch N is committed.
