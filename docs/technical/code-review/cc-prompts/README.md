# Code Review CC Prompts — colosseum / themoderator.app

17 paste-and-go prompts for Claude Code. Each prompt patches one batch of files
and presents the result for manual upload to GitHub.

## How it works now

1. Paste a batch prompt into Claude Code (the repo must already be cloned at `/home/claude/colosseum`).
2. CC reads the file(s), applies the fix, runs verification, and presents the patched file(s) via `present_files`.
3. You download the patched file(s) and upload them to GitHub manually.
4. No git push, no PAT required. Nothing gets lost.

## Run order

```
Batch 01 first (JSON — unblocks everything)

Then parallel:
  Track A: 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09  (SQL)
  Track B: 10  (TypeScript — independent of SQL)

After both tracks done:
  11 → 12 → 13 → 14 → 15 → 16 → 17  (sequential)
```

## Status

| Batch | File(s) | Status |
|-------|---------|--------|
| 01 | JSON configs | Done (on branch, needs merge) |
| 02 | arena.sql | **RE-RUN NEEDED** (lost — branch never pushed) |
| 03 | auth.sql | **RE-RUN NEEDED** (lost — branch never pushed) |
| 04 | references.sql | Done (`8d3fc39` on keen-swanson) |
| 05 | moderation.sql | Done (`0f787cb` on keen-swanson) |
| 06 | groups.sql | Done (`93c932e` local — needs upload) |
| 07 | tokens.sql | Not started |
| 08 | predictions, hot-takes, admin, notifications | Not started |
| 09 | RLS policy audit + migration | Not started |
| 10 | TypeScript any casts + void async | Not started |
| 11 | JavaScript API routes | Not started |
| 12 | index.html OG tags | Not started |
| 13 | moderator-groups.html OG tags | Not started |
| 14 | settings + login OG tags | Not started |
| 15 | terms + plinko OG tags | Not started |
| 16 | cosmetics + privacy + profile-depth OG tags | Not started |
| 17 | Anon key comments + CSP hash audit | Not started |

Generated: April 2026
