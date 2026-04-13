# Audit Run Prompt

Reusable Claude Code prompt for running the v3 audit method against `FIRST-RUN-FILES.md`, one batch at a time.

**Usage:** Paste the prompt below into a fresh Claude Code session with the repo checked out. Replace `[N]` with the batch number (1 through 12). Everything else stays identical across runs.

---

```
Run audit batch [N] from THE MODERATOR repo.

The repo you are in contains two documents that fully define this task:

1. THE-MODERATOR-AUDIT-METHOD-V3.md
   The four-stage code audit method (Stage 1 → 1.5 → 2 → 3). This is your
   complete operating instructions. Read the whole file before doing anything.
   Follow it exactly. Do not summarize it to yourself and skip steps.

2. FIRST-RUN-FILES.md
   The deduped list of 57 files broken into 12 batches of 5. For this run,
   use Batch [N] only. Ignore the other batches.

BEFORE STARTING
===============

1. Read THE-MODERATOR-AUDIT-METHOD-V3.md in full.
2. Read FIRST-RUN-FILES.md and extract exactly the 5 file paths listed
   under "## Batch [N]".
3. Treat that 5-file list as your [FILE_LIST] for the v3 orchestration
   prompt. The repo root is your current working directory. The audit
   directory is ./audit (create it if it does not exist).
4. Follow v3's "Top-level orchestration prompt" section using those values,
   then proceed through its main loop — Stage 1 → 1.5 → 2 → 3 per file,
   updating audit/manifest.json after each stage, file-first order.

RESUME BEHAVIOR
===============

If audit/manifest.json already exists from a previous batch, DO NOT overwrite
it. v3 specifies: verify the file list in the manifest matches the file list
for this batch; if they differ, STOP and report the mismatch.

This means each batch run gets its own manifest. Before starting Batch [N],
if an old manifest exists from Batch [N-1] or earlier, archive it by renaming
to audit/manifest.batch[previous].json, then create the fresh manifest for
this batch.

WHEN DONE
=========

Report:
- How many of the 5 files completed all four stages
- How many hit needs_review at stage 1.5 (if any)
- Path to audit/needs-human-review.md if it is not empty
- Any files where a stage errored or produced unusable output

Do not advance to Batch [N+1] on your own. Stop after Batch [N] and wait.
```

---

## Notes

- **No v3 paste-in needed.** CC reads the method from the repo directly. Single source of truth — if v3 is edited later, the next batch picks up the change automatically.
- **Batch number is the only variable.** Run this 12 times, swapping `[N]` from 1 to 12. Everything else stays identical.
- **Manifest archiving between batches.** v3's "verify the file list matches" check protects in-progress runs but would block a clean start on Batch 2 if Batch 1's manifest were still present. The rename step sidesteps that cleanly and leaves a per-batch manifest trail you can inspect later.
- **Stops between batches by design.** Keeps the feedback loop tight — read Stage 3 output between batches and catch method issues before committing to the next 5 files.
