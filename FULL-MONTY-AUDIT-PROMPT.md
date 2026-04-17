# Full Monty Audit — CC Run Prompt

Reusable prompt for running the Full Monty 5-agent audit.
Paste into a fresh Claude Code session with the repo cloned.
Change the batch number on line 1 between runs (01 through 85).

---

```
Run Full Monty audit Batch [NN] from THE MODERATOR repo.

MANDATORY FIRST STEP — FILE READ VERIFICATION
==============================================
Every file you read must follow this exact sequence. No exceptions.

  Step 1: run `wc -l <filename>` and paste the output.
  Step 2: read the file.
  Step 3: write "Read [N] lines of [total] total."

If N ≠ total: stop. Re-read. Do not proceed on a partial read.
This applies to every file in this session — method docs, file lists, source files, everything.

SETUP
=====
Clone the repo and set the remote:
  git clone https://TOKEN@github.com/wolfe8105/colosseum.git
  git remote set-url origin https://TOKEN@github.com/wolfe8105/colosseum.git

The repo contains two documents that fully define this task:

1. THE-MODERATOR-AUDIT-METHOD-V3.md
   The four-stage audit method (Stage 1 → 1.5 → 2 → 3).
   Read the WHOLE file before doing anything else.
   Follow it exactly. Do not summarize and skip steps.

2. FULL-MONTY-BATCH-PLAN.md
   The 85-batch file list. For this run, use Batch [NN] only.
   Ignore all other batches.

BEFORE STARTING
===============
1. Read THE-MODERATOR-AUDIT-METHOD-V3.md in full (verify line count).
2. Read FULL-MONTY-BATCH-PLAN.md and extract the file paths under "Batch [NN]".
3. Read AUDIT-FINDINGS.md — the pre-audit state section lists every fix
   already applied before this audit started. Do not re-report fixed items
   as open findings. Note them as PREVIOUSLY FIXED if you encounter them.
4. Treat the Batch [NN] file list as your [FILE_LIST] for the v3 orchestration
   prompt. Repo root is your working directory. Audit directory is ./audit/batch[NN]/
   (create if it does not exist — use the batch-namespaced subdirectory so
   parallel sessions do not collide).
5. Follow v3's orchestration prompt using those values, then proceed through
   Stage 1 → 1.5 → 2 → 3 per file, updating the manifest after each stage,
   file-first order.

MANIFEST PATH
=============
Use: audit/batch[NN]/manifest.json
(Not audit/manifest.json — the root manifest is reserved for the old 16R run.)
This keeps parallel batch sessions fully isolated.

RESUME BEHAVIOR
===============
If audit/batch[NN]/manifest.json already exists, verify the file list matches
Batch [NN]. If it matches, resume from the last completed stage. If it does not
match, stop and report the mismatch.

WHEN DONE
=========
Report:
- How many files completed all four stages
- How many hit needs_review at stage 1.5
- Path to audit/batch[NN]/needs-human-review.md if not empty
- Any files where a stage errored or produced unusable output
- Whether any findings were marked PREVIOUSLY FIXED

Do not advance to the next batch on your own. Stop after Batch [NN] and wait.
```

---

## Notes

- **Token is the only thing to swap in addition to batch number.** Everything else is self-contained in the repo.
- **Batch subdirectory isolation.** Each session writes to `audit/batch[NN]/` — parallel sessions never collide on the manifest.
- **Pre-audit state.** `AUDIT-FINDINGS.md` has a section listing all Stage 5 fixes applied before the audit. Auditors must read it so they don't re-report already-closed issues.
- **Stop after each batch.** Keeps the feedback loop tight. Human reads Stage 3 output, then feeds the next batch.
- **Triage is separate.** After all 85 batches complete, one dedicated triage session merges all `audit/batch*/stage3.md` outputs into `AUDIT-FINDINGS.md`. Do not run triage concurrently with active batch sessions.
