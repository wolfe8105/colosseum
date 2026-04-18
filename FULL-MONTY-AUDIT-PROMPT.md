# Full Monty Audit — CC Run Prompt

Paste into a fresh Claude Code session. **Change the batch number (two places marked ★) before pasting. That is the only edit needed.**

Swap TOKEN for the GitHub token from the session handoff before pasting.

---

```
/model claude-sonnet-4-6

Run Full Monty audit Batch 26 from THE MODERATOR repo.

SETUP
=====
git clone https://TOKEN_HERE@github.com/wolfe8105/colosseum.git
cd colosseum
git remote set-url origin https://TOKEN_HERE@github.com/wolfe8105/colosseum.git

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
2. Read FULL-MONTY-BATCH-PLAN.md and extract the file list for Batch ★NN★ only.
3. Read AUDIT-FINDINGS.md — do not re-report anything already listed as fixed.
   Mark any encounter of a fixed item as PREVIOUSLY FIXED and move on.
4. Audit directory is audit/batch26/ — create it if it does not exist.
   Manifest path: audit/batch26/manifest.json
   Do NOT use audit/manifest.json (reserved for the legacy 16R run).
5. Follow the v3 orchestration prompt using the Batch ★NN★ file list.
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

Stop after Batch 26. Do not start the next batch.
```

---

## How to use

1. Copy the block above
2. Replace both `★NN★` with the batch number (e.g. `27`)
3. Replace `TOKEN` with the GitHub token from the session handoff
4. Paste into a fresh Claude Code session launched with `claude --dangerously-skip-permissions`

## Rules

- **Sonnet only.** Opus costs ~15x more per token. The `/model` line enforces this — do not remove it.
- **One batch per session.** Each session writes to its own `audit/batchNN/` directory. Parallel sessions never collide.
- **Stop after each batch.** Do not let CC auto-advance. Human reviews Stage 3 output first.
- **Triage is separate.** After all 85 batches complete, one dedicated session merges findings into `AUDIT-FINDINGS.md`. Do not run triage concurrently with active batch sessions.
