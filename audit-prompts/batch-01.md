# Batch 1 Audit Prompt

Paste the fenced block below into a fresh Claude Code session with the
colosseum repo checked out. No substitutions needed — this prompt is
pre-filled for Batch 1.

---

```
Run audit Batch 1 from THE MODERATOR repo.

The repo you are in contains two documents that fully define this task:

1. THE-MODERATOR-AUDIT-METHOD-V3.md
   The four-stage code audit method (Stage 1 → 1.5 → 2 → 3). This is your
   complete operating instructions. Read the whole file before doing anything.
   Follow it exactly. Do not summarize it to yourself and skip steps.

2. FIRST-RUN-FILES.md
   The deduped list of 57 files broken into 12 batches of 5. For this run,
   use Batch 1 only. Ignore the other batches.

BEFORE STARTING
===============

1. Read THE-MODERATOR-AUDIT-METHOD-V3.md in full.
2. Read FIRST-RUN-FILES.md and extract exactly the file paths listed
   under "## Batch 1".
3. Treat that list as your [FILE_LIST] for the v3 orchestration prompt.
   The repo root is your current working directory. The audit directory
   is ./audit (create it if it does not exist).
4. Follow v3's "Top-level orchestration prompt" section using those values,
   then proceed through its main loop — Stage 1 → 1.5 → 2 → 3 per file,
   updating audit/manifest.json after each stage, file-first order.

RESUME BEHAVIOR
===============

This is the first batch of the run. The audit/ directory and
audit/manifest.json should not yet exist. Create them fresh per
v3's "Top-level orchestration prompt" section.

If audit/manifest.json DOES already exist for some reason, STOP
and report it to the user before doing anything else.

WHEN DONE
=========

Report:
- How many files completed all four stages
- How many hit needs_review at stage 1.5 (if any)
- Path to audit/needs-human-review.md if it is not empty
- Any files where a stage errored or produced unusable output

Do not advance to Batch 2 on your own. Stop after Batch 1
and wait.
```
