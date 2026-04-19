# Audit Session Playbook
# How Claude and Pat run a batch audit session

This document captures the full workflow so any new Claude session can
pick up without needing the full chat history.

---

## Environment facts

**Two computers. Know which one you're on.**

| Computer | Username | Path | Used for |
|---|---|---|---|
| Old computer | `PatrickWolfe` | `C:\Users\PatrickWolfe\colosseum` | Batches 1–4, 8Rc, 9R, 10R+ |
| New computer | `wolfe` | `C:\Users\wolfe\colosseum-main` | Batches 5–8R, 7R (night) |

**Critical:** `C:\Users\wolfe\colosseum` is a STALE April-12 fork. Never use it.
Always use `C:\Users\wolfe\colosseum-main` on the new computer.

**`grep` does not exist on Windows.** Don't suggest it. Use `findstr` instead.

**CC creates worktrees**, not an `audit/` folder in the repo root (old computer).
On the old computer, CC output lands in `.claude\worktrees\<name>\audit\`.
On the new computer, CC output lands directly in `audit\` at the repo root.

---

## Step 1 — CC finishes a batch

CC reports completion. Do NOT trust CC's summary — always read Stage 3 files
directly. But first, push the output.

---

## Step 2 — Find the worktree (old computer only)

If on the old computer, CC put the audit in a worktree. Find the newest one:

```cmd
dir C:\Users\PatrickWolfe\colosseum\.claude\worktrees\
```

Look for the folder created today at the right time. That's the worktree.

On the new computer, skip this — output is in `audit\` directly.

---

## Step 3 — Push the batch output

**Old computer** (replace `<worktree>` with the name from Step 2):

```cmd
cd C:\Users\PatrickWolfe\colosseum
mkdir audit-output\batch-<NN>
xcopy /E /I .claude\worktrees\<worktree>\audit audit-output\batch-<NN>
git add audit-output/batch-<NN>
git commit -m "Add Batch <NN> audit output"
git pull --no-edit
git push
```

**New computer:**

```cmd
cd C:\Users\wolfe\colosseum-main
mkdir audit-output\batch-<NN>
xcopy /E /I audit audit-output\batch-<NN>
git add audit-output/batch-<NN>
git commit -m "Add Batch <NN> audit output"
git pull --no-edit
git push
rmdir /S /Q audit
```

**If git push is rejected** (remote has changes you don't have):
```cmd
git pull --no-edit
git push
```

**If vim opens for a merge message** (black screen with tildes):
- Type `:wq` and hit Enter while the terminal is focused
- If that doesn't work: close the terminal, reopen it, run `git commit --no-edit` then `git push`

**If git says "unfinished merge":**
```cmd
git commit --no-edit
git push
```

---

## Step 4 — Claude pulls and reads Stage 3 files

Tell Claude: "Batch <NN> is pushed." Claude will:

1. `git pull` the repo in its sandbox
2. `cat` every Stage 3 file directly — never trust CC's summary
3. Note all `needs_review` items confirmed by 2+ agents

---

## Step 5 — Claude synthesizes findings

Claude uses the next letter series for finding IDs:

| Batches | Series |
|---|---|
| 1 | A |
| 2 | B |
| 3 | C |
| 4 | F |
| 5 | D |
| 6 | E |
| 7R | G (reserved — not yet pushed) |
| 8R | H |
| 8Rc | (clean — no findings) |
| 9R | I |
| 10R | J |
| 11R | K |
| 12R | L (skip if conflicts with Low prefix) → use K2 |
| ... | ... |

**Severity thresholds:**
- **High** — data corruption, security hole, financial impact, age gate bypass
- **Medium** — real bug, user-visible failure, stuck UI state, XSS surface
- **Low** — dead code, design rule violation, brittle pattern, doc gap

**Disable-button-no-finally pattern** — currently 7 instances (M-B5, M-C2,
M-D1, M-E1, M-F1, M-F3, M-J3). Every new instance adds to this count.
A grep-sweep PR is overdue — Pat has not acted on it yet. Nudge each session.

---

## Step 6 — Claude updates AUDIT-FINDINGS.md

Claude adds new findings in the right severity section, updates:
- Cross-cutting patterns section (disable-button count, verifier catches)
- Progress table row for the batch
- Footer totals (High / Medium / Low / FIXED count)
- Last updated date

Then commits and pushes from its sandbox.

---

## Step 7 — Hand off next batch prompt

Tell Pat which batch is next and that the prompt is in `audit-prompts/batch-<NN>.md`.
Pat pastes it into a fresh CC session.

---

## Batch queue (as of 2026-04-14)

| Batch | Files | Bytes | Status |
|---|---|---|---|
| 7R | arena-room-setup, spectate, auth.types, auth.profile | 46,789 | Output on night computer — push when available |
| 8Rc | vite.config, async.types, home.feed, home.types | 7,357 | Done |
| 9R | leaderboard, arena-ads, arena-mod-scoring | 29,246 | Done |
| 10R | tokens, arena-core, arena-bounty-claim | 31,471 | Done |
| 11R | arena-entrance, async.fetch, spectate.types | 28,861 | Pending |
| 12R | spectate.render, arena-feed-spec-chat | 30,806 | Pending |
| 13R | group-banner, async.render | 33,959 | Pending |
| 14R | bounties, arena-sounds | 30,677 | Pending |
| 15R | notifications, intro-music | 29,914 | Pending |

**Byte budget: ≤ 40,000 bytes per batch.**
Empirical: 46,789 bytes worked (7R), 49,048 bytes failed (old 8R).

---

## Current audit totals (end of Batch 10R)

- **Files audited:** 38 of 57 (Batch 7R output still pending from night computer)
- **0 High / 39 Medium / 55 Low**
- **2 FIXED:** H-A2 (apply_end_of_debate_modifiers idempotency), L-C8 (wrong group ID on withdraw)
- **AUDIT-FINDINGS.md** is the source of truth — always read it fresh

---

## How to start a new Claude session for audit work

Paste this as the first message:

```
Clone https://ghp_TOKEN@github.com/wolfe8105/colosseum.git
into /home/claude/colosseum using bash_tool (get token from past
chats — search "github token colosseum ghp").
Then read AUDIT-SESSION-PLAYBOOK.md and AUDIT-FINDINGS.md.
We are running the code audit. Batch <NN> just finished in CC.
```

---

## Key files in the repo

| File | Purpose |
|---|---|
| `AUDIT-FINDINGS.md` | All confirmed findings, severity-ranked |
| `AUDIT-SESSION-PLAYBOOK.md` | This file |
| `FIRST-RUN-FILES.md` | Batch file assignments with byte sizes |
| `THE-MODERATOR-AUDIT-METHOD-V3.md` | The 4-stage audit method CC follows |
| `audit-prompts/batch-<NN>.md` | Ready-to-paste CC prompts |
| `audit-output/batch-<NN>/` | Raw stage output from each batch |
| `REFACTOR-HANDOFF.md` | Parallel refactor workstream handoff |
| `refactor-prompts/` | CC prompts for refactoring 13 large files |
