# Batch 9 Audit Prompt

Paste the fenced block below into a fresh Claude Code session with the
colosseum repo checked out. No substitutions needed — this prompt is
pre-filled for Batch 9.

---

```
Run audit Batch 9 from THE MODERATOR repo.

The repo you are in contains two documents that fully define this task:

1. THE-MODERATOR-AUDIT-METHOD-V3.md
   The four-stage code audit method (Stage 1 → 1.5 → 2 → 3). This is your
   complete operating instructions. Read the whole file before doing anything.
   Follow it exactly. Do not summarize it to yourself and skip steps.

2. FIRST-RUN-FILES.md
   The deduped list of 57 files broken into 12 batches of 5. For this run,
   use Batch 9 only. Ignore the other batches.

BEFORE STARTING
===============

1. Read THE-MODERATOR-AUDIT-METHOD-V3.md in full.
2. Read FIRST-RUN-FILES.md and extract exactly the file paths listed
   under "## Batch 9".
3. Treat that list as your [FILE_LIST] for the v3 orchestration prompt.
   The repo root is your current working directory. The audit directory
   is ./audit (create it if it does not exist).
4. Follow v3's "Top-level orchestration prompt" section using those values,
   then proceed through its main loop — Stage 1 → 1.5 → 2 → 3 per file,
   updating audit/manifest.json after each stage, file-first order.

RESUME BEHAVIOR
===============

If audit/manifest.json already exists from a previous batch, DO NOT
overwrite it blindly. v3 specifies: verify the file list in the
manifest matches the file list for this batch; if they differ, STOP
and report the mismatch.

Each batch run gets its own manifest. Before starting Batch 9,
if an old manifest from Batch 8 (or earlier) is present at
audit/manifest.json, archive it by renaming to
audit/manifest.batch08.json, then create the fresh manifest
for Batch 9.

WHEN DONE
=========

Report:
- How many files completed all four stages
- How many hit needs_review at stage 1.5 (if any)
- Path to audit/needs-human-review.md if it is not empty
- Any files where a stage errored or produced unusable output

Do not advance to Batch 10 on your own. Stop after Batch 9
and wait.
```
