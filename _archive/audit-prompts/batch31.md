TOKEN=$(cat .github-token | tr -d '[:space:]') && git clone https://${TOKEN}@github.com/wolfe8105/colosseum.git && cd colosseum && git remote set-url origin https://${TOKEN}@github.com/wolfe8105/colosseum.git

Then run Full Monty audit Batch 31.

MANDATORY FILE READ VERIFICATION
=================================
Every file you read must follow this exact sequence. No exceptions.

  Step 1: run `wc -l <filename>` and note the total.
  Step 2: read the file.
  Step 3: confirm "Read [N] lines of [total] total."

If N ≠ total: stop, re-read. Do not proceed on a partial read.
Applies to every file this session — method docs, batch plan, source files, everything.

BEFORE STARTING
===============
1. Read THE-MODERATOR-AUDIT-METHOD-V3.md in full (verify line count first).
2. Read FULL-MONTY-BATCH-PLAN.md and extract the file list for Batch 31 only.
3. Read AUDIT-FINDINGS.md — do not re-report anything already listed as fixed.
   Mark any encounter of a fixed item as PREVIOUSLY FIXED and move on.
4. Audit directory is audit/batch31/ — create it if it does not exist.
   Manifest path: audit/batch31/manifest.json
   Do NOT use audit/manifest.json (reserved for the legacy 16R run).
5. Follow the v3 orchestration prompt using the Batch 31 file list.
   Process file-first: Stage 1 → 1.5 → 2 → 3 for each file before moving to the next.
   Update the manifest after every stage.

WHEN DONE
=========
Report:
- Files that completed all four stages (count and list)
- Files that hit needs_review at Stage 1.5
- Any stage that errored or produced unusable output
- All findings with severity (HIGH / MEDIUM / LOW) and file + line
- Any PREVIOUSLY FIXED encounters

Stop after Batch 31. Do not start the next batch.
