# Four-Stage Code Audit Method — v3 (5-file batch, with verification step)

This is a revision of `THE-MODERATOR-AUDIT-METHOD-V2.md`. The only change from v2 is the batch-size ceiling: **5 files per run instead of 15.** Everything else — stages, prompts, manifest schema, resume semantics — is unchanged.

> **Revision 2026-04-13 (post-Batch-3):** Stages 1, 2, and 3 now dispatch **5 parallel agents instead of 11.** Stage 1.5 is structurally unchanged (still 2 arbiter runs + reconciliation), but its prompt text was updated to refer to 5 stage-1 inputs instead of 11. Rationale: Batch 3 hit Claude Code context compaction mid-run on the 11-agent config; Stage 1.5 arbiter runs reported zero disagreements across all 10 files in Batches 1 and 2, meaning the 11-agent parallelism was spending tokens to push detection from "four nines" to "ten nines" on tasks where Sonnet is already consistent enough that disagreement does not materialize. 5 is the structural minimum for robust 3-2 majority voting with one slack agent. Estimated token savings: ~55% with no loss of robustness where it matters. Do NOT downgrade the model — Sonnet has been catching Stage 2 hallucinations cleanly in Stage 3; Haiku's failure mode is "verifier agrees with Stage 2 mistakes more often," which would silently erode the whole method.

> **Revision 2026-04-13 (Batch 5 attempt):** The Stage 3 section previously said "use the Stage 3 prompt from the v1 document, verbatim." v1 and v2 are not in this repo, so CC wasted ~1 hour on Batch 5 file 1 hunting through git history for a file that never existed before we killed the session. The full Stage 3 agent prompt is now inlined in the Stage 3 section below, reverse-engineered from the Stage 3 outputs of Batches 1–3 which were clearly all produced by the same prompt shape. Batches 1–3 worked because CC had the earlier batches' output as reference; a fresh CC on a new machine with no prior audit/ directory didn't.

The changes from v1 (carried forward from v2):

1. **Step 1.5 — Anchor Verification.** An arbiter agent runs twice, independently, to produce the locked anchor list from Stage 1's five outputs. If the two runs agree, done. If they disagree, a third reconciliation pass resolves the specific contested items against the source. Items still unresolved after reconciliation are flagged to a human-review file and the pipeline continues with them included as union-with-provenance entries.
2. **5-file batch orchestration with manifest tracking.** One run processes up to 5 files through stages 1 → 1.5 → 2 → 3. A JSON manifest on disk records per-file, per-stage status, so the run is resumable and inspectable.
3. **File-first order.** Each file is walked through all four stages before the next file starts. Interruption leaves N completed audits and one partial, not 5 partials.

Stage 4 (Triage) is still run separately after a human reviews Stage 3, unchanged from v1.

---

## Manifest schema

Path: `audit/manifest.json`

```json
{
  "run_id": "audit-run-YYYYMMDD-HHMMSS",
  "created_at": "ISO timestamp",
  "files": [
    {
      "path": "src/example.ts",
      "stage1":   {"status": "pending", "output_path": "audit/example.ts/stage1.md"},
      "stage1_5": {"status": "pending", "output_path": "audit/example.ts/stage1_5-anchor.md", "arbiter_runs": 0, "runs_agreed": null, "reconciliation_run": false, "unresolved_count": 0},
      "stage2":   {"status": "pending", "output_path": "audit/example.ts/stage2.md"},
      "stage3":   {"status": "pending", "output_path": "audit/example.ts/stage3.md"}
    }
  ]
}
```

Status values per stage: `pending`, `in_progress`, `done`, `needs_review`.

`needs_review` at stage 1.5 does not block the pipeline. The stage still produces a usable anchor list (with unresolved items included as union-with-provenance entries) and the file proceeds through stages 2 and 3. `audit/needs-human-review.md` accumulates one section per file that hit unresolved disagreements, so a human can audit those specific items later without stalling the run.

---

## Directory layout

```
audit/
  manifest.json
  needs-human-review.md
  [sanitized-filename]/
    stage1.md
    stage1_5-run1.md
    stage1_5-run2.md
    stage1_5-reconcile.md   (only written if runs disagreed)
    stage1_5-anchor.md      (the locked anchor list — input to stage 2)
    stage2.md
    stage3.md
```

`[sanitized-filename]` replaces `/` with `__` and strips leading `./`. For example `src/arena/arena-feed-room.ts` becomes `src__arena__arena-feed-room.ts`.

---

## Top-level orchestration prompt

Paste this into a fresh Claude Code session with the repo already cloned. Substitute the file list at `[FILE_LIST]` before running.

```
You are running a four-stage code audit on a batch of files. The method is
defined below. A JSON manifest on disk tracks per-file, per-stage progress.
The run must be resumable: if interrupted, the next invocation re-reads the
manifest and resumes at the first non-done stage.

REPO ROOT: [REPO_ROOT_PATH]
AUDIT DIR: [REPO_ROOT_PATH]/audit
MANIFEST:  [REPO_ROOT_PATH]/audit/manifest.json

FILE LIST (up to 5):
[FILE_LIST]

TASK LIST — MANDATORY FORMAT
============================

Before doing anything else, create your task list with EXACTLY these items,
using EXACTLY these names. No additions. No rewordings. No batch numbers in
task names. No file names in the setup task. Every session must look identical.

  - Setup audit directory and manifest
  - Audit [file1_basename] (Stages 1 → 1.5 → 2 → 3)
  - Audit [file2_basename] (Stages 1 → 1.5 → 2 → 3)
  - Audit [file3_basename] (Stages 1 → 1.5 → 2 → 3)
  - Audit [file4_basename] (Stages 1 → 1.5 → 2 → 3)
  - Report batch summary

Where [fileN_basename] is the filename only — no path, no batch number prefix.
Example: "Audit arena-feed-references.ts (Stages 1 → 1.5 → 2 → 3)"
NOT: "Batch 19 File 2: audit src/arena/arena-feed-references.ts (Stages 1→1.5→2→3)"
NOT: "File 2: audit src/pages/auto-debate.ts (Stages 1→1.5→2→3)"

BEFORE STARTING
===============

1. Check whether audit/manifest.json exists.
   - If it does NOT exist: create audit/ and audit/[sanitized]/ directories,
     write a fresh manifest with every file at stage1.status = "pending" and
     every later stage also "pending", and create an empty
     audit/needs-human-review.md file.
   - If it DOES exist: read it. Verify the file list in the manifest matches
     the file list above. If they differ, STOP and report the mismatch to
     the user — do not silently proceed.

2. Find the first file in the manifest with any stage != "done". Begin there.
   Within that file, find the first stage != "done". Begin at that stage.
   If an in-progress stage is found on resume, restart that stage from scratch
   (do not trust partial output).

MAIN LOOP
=========

For each file in manifest order, process stages in this sequence:
  Stage 1   → Stage 1.5 → Stage 2 → Stage 3

After each stage completes successfully, update that stage's entry in
manifest.json to status = "done" (or "needs_review" for stage 1.5 if unresolved
items remain) and write the updated manifest back to disk before starting the
next stage.

Only after all four stages complete for a file, move to the next file.
Never start stage N+1 of a file before stage N of that file is "done" or
"needs_review".

Stage prompts follow below. The placeholders [SOURCE_FILE_PATH] and output
paths must be substituted from the current file's manifest entry before each
dispatch.
```

---

## Stage 1 — Primitive Inventory

**Revised from v1.** Five agents dispatch in parallel. Each receives the same prompt. When all return, write verbatim to `stage1.md` and update manifest.

```
Before dispatching: set manifest.files[i].stage1.status = "in_progress"
and write manifest back to disk.

In a single assistant message, emit 5 Task tool_use blocks simultaneously.
Do not reason between spawns. Do not wait for any agent to return before
spawning the next. All 5 dispatch in one batch, run concurrently, and
return independently.

Each of the 5 Task calls uses the exact same prompt below, verbatim. No
agent is told about the others. No agent receives a different instruction.
No agent is given an index or a role.

When all 5 have returned, write their outputs verbatim to disk at
[STAGE1_OUTPUT_PATH], formatted as:

    # Stage 1 Outputs — [filename]

    ## Agent 01
    [verbatim output]

    ## Agent 02
    [verbatim output]

    ...through Agent 05.

Do NOT extract the anchor list in this stage. Anchor extraction is Stage 1.5.

After writing: set manifest.files[i].stage1.status = "done" and write
manifest back to disk. Proceed to Stage 1.5 for this file.

PROMPT FOR EACH AGENT (identical across all 5)
================================================

Read the file at [SOURCE_FILE_PATH].

For each line or contiguous block of this file, emit one primitive
language operation. Operations are:

- import (including side-effect and type-only imports)
- bind name to value
- bind name to function definition
- bind name to class definition
- bind name to type (type alias, interface, or enum)
- re-export (export { ... } or export * from ..., with no new binding)
- top-level statement (bare expression or function call executed at module load)
- declare (ambient declaration with no runtime effect)
- directive (string-literal pragma such as 'use strict' or 'use client')
- decorator (applied to the following binding)
- comment (no operation)
- blank (no operation)

For function, class, and type bindings, name only the binding — do not
summarize the body, the members, or the shape. When a binding is exported
in place (e.g., export function foo, export const bar), emit the binding
operation and note that it is exported; do not count the export as a
separate entry. Do not describe grouping, purpose, intent, or relationship
across lines. Produce a flat numbered inventory in source order. Stop when
the file ends.
```

---

## Stage 1.5 — Anchor Verification

**Purpose:** Take the five Stage 1 outputs and produce a single locked anchor list of function definitions to be walked in Stage 2. Disagreements between the five agents are resolved by reading the source, not by vote.

**Mechanism:** Two independent arbiter runs. If they agree, the locked anchor list is written and the stage is done. If they disagree, a third reconciliation pass adjudicates the specific contested items against the source. If any items remain unresolved after reconciliation, they are included in the anchor list as union-with-provenance entries (so Stage 2 walks them, and Stage 3 will classify them as REAL or PHANTOM), and the file's entry is flagged to `needs-human-review.md`. The pipeline continues.

**Inputs:** source file + `stage1.md`.

**Outputs:**
- `stage1_5-run1.md` — first arbiter's output
- `stage1_5-run2.md` — second arbiter's output
- `stage1_5-reconcile.md` — written only if runs 1 and 2 disagreed
- `stage1_5-anchor.md` — the locked anchor list (always written)

```
Before dispatching: set manifest.files[i].stage1_5.status = "in_progress"
and write manifest back to disk.

STEP A — Dispatch arbiter run 1 as a single Task agent with the
ARBITER PROMPT below. Wait for it to return. Write its full output
verbatim to [STAGE1_5_RUN1_PATH]. Increment
manifest.files[i].stage1_5.arbiter_runs to 1.

STEP B — Dispatch arbiter run 2 as a single Task agent with the same
ARBITER PROMPT, in a fresh dispatch (no shared state with run 1).
Wait for it to return. Write its full output verbatim to
[STAGE1_5_RUN2_PATH]. Increment arbiter_runs to 2.

STEP C — Compare the two anchor lists. "Agreement" means: the same set
of function names in the same source order. Ordering differences that
reflect source order are fine; name differences or set differences are
disagreements.

  IF runs 1 and 2 agree:
    - Write the agreed anchor list to [STAGE1_5_ANCHOR_PATH] in the
      format shown at the bottom of this section.
    - Set manifest.files[i].stage1_5.runs_agreed = true
    - Set manifest.files[i].stage1_5.status = "done"
    - Write manifest, proceed to Stage 2.

  IF runs 1 and 2 disagree:
    - Set manifest.files[i].stage1_5.runs_agreed = false
    - Set manifest.files[i].stage1_5.reconciliation_run = true
    - Proceed to STEP D.

STEP D — Dispatch one reconciliation agent with the RECONCILIATION
PROMPT below. It receives the source file plus both run 1 and run 2
outputs, and its job is to adjudicate only the items where the two
runs differ, by reading the source. Write its output verbatim to
[STAGE1_5_RECONCILE_PATH].

STEP E — Parse the reconciliation output. Every contested item is
classified as:
  - RESOLVED_INCLUDE  — source confirms it belongs in the anchor list
  - RESOLVED_EXCLUDE  — source confirms it does not belong
  - UNRESOLVED        — source is ambiguous or reconciliation could not decide

Build the final anchor list:
  - Every item both run 1 and run 2 agreed on (the uncontested core)
  - Every RESOLVED_INCLUDE item from reconciliation
  - Every UNRESOLVED item from reconciliation, marked with "[UNRESOLVED]"
    suffix. These will be walked by Stage 2 and classified by Stage 3.
  - No RESOLVED_EXCLUDE items.

Write the final anchor list to [STAGE1_5_ANCHOR_PATH].

Set manifest.files[i].stage1_5.unresolved_count to the count of
UNRESOLVED items.

  IF unresolved_count == 0:
    - Set manifest.files[i].stage1_5.status = "done"

  IF unresolved_count > 0:
    - Append a section to audit/needs-human-review.md in the format
      shown at the bottom of this section
    - Set manifest.files[i].stage1_5.status = "needs_review"

Write manifest. Proceed to Stage 2 regardless of status.

ARBITER PROMPT
==============

Read the source file at [SOURCE_FILE_PATH].
Read the stage 1 outputs at [STAGE1_OUTPUT_PATH].

The stage 1 outputs contain five independent primitive-language
inventories of the same source file. Your job is to produce the
authoritative anchor list of function definitions that will be walked
in stage 2.

A function definition is any top-level, named, callable binding in
the source file. Specifically:

- function declarations (function foo() { ... })
- const/let/var bindings to arrow functions (const foo = () => { ... })
- const/let/var bindings to function expressions (const foo = function () { ... })
- exported variants of all of the above
- async variants of all of the above

Exclude:
- methods inside class bodies (the class itself is one entry if the
  five agents consistently identified it as a function; otherwise
  it is not a function and does not belong here)
- inner helper functions defined inside other functions
- callbacks passed inline to .map, .forEach, addEventListener, etc.
- object literal methods unless they are a top-level exported const
- type signatures and interface method declarations
- function overload signatures (treat overloaded functions as one entry
  named after the implementation signature)

Process:

1. Read the stage 1 outputs and extract every item any agent classified
   as a function definition. Call this the candidate list.

2. For each candidate, read the source file and confirm whether it meets
   the definition above. Do not rely on how many agents listed it — a
   candidate listed by one agent is just as valid as one listed by
   five, if the source confirms it. A candidate listed by all five
   is invalid if the source contradicts them.

3. Also scan the source file directly for function definitions that no
   agent listed, in case all five missed one. Add any you find to
   the candidate list and verify them the same way.

4. Produce the final anchor list in source order, numbered. Format:

       # Anchor List — [filename]

       1. functionNameA  (line NN)
       2. functionNameB  (line NN)
       ...

   For each entry, include the line number where the binding appears
   in the source file.

5. After the numbered list, emit a short "Resolution notes" section
   listing each candidate you excluded and why, in one line each.
   Example:

       ## Resolution notes

       - handleClick (line 47): inner callback inside initUI, not top-level
       - OverloadFoo (line 12): overload signature, folded into Foo (line 18)

Do not write a preamble. Do not write a conclusion. The numbered list
and the resolution notes are the entire output.

END ARBITER PROMPT.

RECONCILIATION PROMPT
=====================

Read the source file at [SOURCE_FILE_PATH].
Read arbiter run 1 output at [STAGE1_5_RUN1_PATH].
Read arbiter run 2 output at [STAGE1_5_RUN2_PATH].

Two independent arbiters produced anchor lists for the same file and
they disagreed. Your job is to adjudicate the specific items where
they differ, by reading the source.

Process:

1. Compute the set difference between run 1's anchor list and run 2's.
   Produce two lists:
   - ONLY_IN_RUN1: items in run 1 that run 2 did not list
   - ONLY_IN_RUN2: items in run 2 that run 1 did not list

2. For each item in ONLY_IN_RUN1 and ONLY_IN_RUN2, open the source
   file, find the relevant lines, and decide whether the item meets
   the function definition criteria (top-level, named, callable
   binding). Classify as:

   - RESOLVED_INCLUDE: source confirms it belongs in the anchor list
   - RESOLVED_EXCLUDE: source confirms it does not belong
   - UNRESOLVED: source is ambiguous — e.g. a construct that could
     reasonably be classified either way, or a TypeScript edge case
     where the language spec itself is unclear

3. Produce output in this format:

       # Reconciliation — [filename]

       ## Contested items

       ### 1. itemName (line NN)
       - In run 1: yes/no
       - In run 2: yes/no
       - Source evidence: [quoted lines with line numbers]
       - Classification: RESOLVED_INCLUDE | RESOLVED_EXCLUDE | UNRESOLVED
       - Reason: [one sentence]

       ### 2. nextItem (line NN)
       ...

       ## Summary

       - Contested items: [count]
       - RESOLVED_INCLUDE: [count]
       - RESOLVED_EXCLUDE: [count]
       - UNRESOLVED: [count]

Do not revisit items that both runs agreed on. Do not write a preamble
or conclusion. The contested items section and summary are the entire
output.

END RECONCILIATION PROMPT.

FORMAT — stage1_5-anchor.md
===========================

    # Anchor List — [filename]

    Source: [SOURCE_FILE_PATH]
    Produced by: stage 1.5 (arbiter + optional reconciliation)
    Unresolved items: [count]

    1. functionNameA  (line NN)
    2. functionNameB  (line NN)
    3. functionNameC  (line NN) [UNRESOLVED]
    ...

    ## Resolution notes
    [combined from arbiter runs and reconciliation if applicable]

FORMAT — appended to audit/needs-human-review.md when unresolved_count > 0
=========================================================================

    ## [filename]

    Stage 1.5 completed with [N] unresolved items. These were included
    in the anchor list and walked by stage 2, but a human should verify
    their classification before trusting the final audit output.

    Unresolved items:
    - itemName (line NN): [one-sentence reason from reconciliation]
    - itemName (line NN): [one-sentence reason from reconciliation]

    Arbiter run 1: [STAGE1_5_RUN1_PATH]
    Arbiter run 2: [STAGE1_5_RUN2_PATH]
    Reconciliation: [STAGE1_5_RECONCILE_PATH]
    Final anchor: [STAGE1_5_ANCHOR_PATH]
```

---

## Stage 2 — Runtime Walk

**Unchanged from v1 except the anchor source and manifest updates.** The anchor list now comes from `stage1_5-anchor.md` instead of being extracted at Stage 1. Entries marked `[UNRESOLVED]` are walked the same as any other entry — Stage 3 will classify them.

```
Before dispatching: set manifest.files[i].stage2.status = "in_progress"
and write manifest back to disk.

Read [STAGE1_5_ANCHOR_PATH] to get the anchor list. Substitute it into
the marked slot in the agent prompt below.

Dispatch five Task tool_use blocks simultaneously in a single assistant
message. Each agent receives the exact same prompt below, verbatim. Wait
for all five to return.

When all five return, write their outputs verbatim to [STAGE2_OUTPUT_PATH].

Set manifest.files[i].stage2.status = "done" and write manifest.
Proceed to Stage 3.

PROMPT FOR EACH STAGE 2 AGENT
=============================

Read the file at [SOURCE_FILE_PATH].

An earlier pass catalogued the primitive structure of this file and a
verification pass produced the following anchor list. You do not need
to rediscover it. Treat this list as the anchor — these are the
functions whose runtime behavior you are describing, in this order:

[ANCHOR LIST FROM STAGE 1.5]

Note: any entry marked [UNRESOLVED] is included because a prior
verification step could not determine whether it qualifies as a
top-level function definition. Walk it the same as any other entry.
If you find, while describing it, that it is not actually a callable
function, say so explicitly in its description and move on.

For each function on the anchor list, in the order given, produce a
description of what happens at runtime when that function is called.
Work function by function. Write one paragraph per function, or two if
the function is complex enough to need them. Do not write a module-level
summary at the top. Do not write a conclusion at the bottom. Do not
describe the file as a whole. Describe the functions.

Each function description must cover:

- What the function reads: parameters, module-level state, and external
  state such as storage, the DOM, network responses, or browser APIs
- What the function writes: module-level state, external state, and the
  value it returns
- What other functions and APIs it calls, and in what order
- Its control flow: branches, early returns, loops, error paths, and
  try/catch blocks
- Whether it is async, and if so, which calls are awaited and which are
  fire-and-forget

Rules:

- You are running independently. Do not reference, defer to, or summarize
  what other agents may have said. Do not write "as noted by Agent 01" or
  "I agree with the prior analysis" or any variation. Produce your own
  description from the source file. Every agent output must stand alone.
- Describe the function, not the module. Do not write "this function is
  part of the X system" or "this function is responsible for Y."
- Describe what, not why. Do not speculate about design rationale,
  intent, or why the code is structured the way it is. If a branch
  exists, describe the branch; do not explain why the branch exists.
- Do not use the words "handles," "manages," "ensures," "responsible
  for," "takes care of," "makes sure," "deals with," or "oversees."
  These are narrative labels that stand in for actual behavior. Replace
  them with the actual behavior.
- When one function on the anchor list calls another function on the
  anchor list, name the callee and describe only what calling it at
  that call site does in context. Do not re-describe the callee's
  internals — the callee has its own entry on the list.
- If a function has an error path, fallback branch, or catch block,
  describe it with the same weight as the happy path. Do not skip error
  paths as implementation detail.
- If a function's behavior depends on module-level state set elsewhere,
  name the state variable. Do not describe when or how the state got
  set in other functions — that will be covered by those functions'
  entries.
- If you are uncertain about a claim, label the uncertainty explicitly
  ("unclear whether X or Y," "the code reads Z but it is not obvious
  from this file what Z contains"). Do not hedge with "probably,"
  "appears to," or "seems to." Either say what you see or say you
  cannot tell.

Format:

### functionName
[description]

### nextFunctionName
[description]

Proceed in source order. Cover every function on the anchor list.

END STAGE 2 AGENT PROMPT.
```

Output formatting and disk write format match v1.

---

## Stage 3 — Verification

**Revised to be self-contained.** v3 previously said "use the Stage 3 prompt from the v1 document" — v1 and v2 are not in this repo, so the full Stage 3 agent prompt is now inlined below.

```
Before dispatching: set manifest.files[i].stage3.status = "in_progress"
and write manifest back to disk.

Dispatch five Task tool_use blocks simultaneously in a single assistant
message. Each agent receives the exact same prompt below, verbatim, with
[SOURCE_FILE_PATH] and [STAGE2_OUTPUT_PATH] substituted. Wait for all
five to return.

When all five return, write their outputs verbatim to [STAGE3_OUTPUT_PATH],
formatted as:

    # Stage 3 Outputs — [filename]

    ## Agent 01
    [verbatim output]

    ## Agent 02
    [verbatim output]

    ...through Agent 05.

Set manifest.files[i].stage3.status = "done" and write manifest.

If this was not the last file in the manifest, proceed to Stage 1 of
the next file. If this was the last file, STOP. Report a summary to the
user: how many files were completed, how many hit needs_review at
stage 1.5, and the path to audit/needs-human-review.md if it is not empty.

PROMPT FOR EACH STAGE 3 AGENT (identical across all 5)
======================================================

Read the source file at [SOURCE_FILE_PATH].
Read the Stage 2 output at [STAGE2_OUTPUT_PATH].

Stage 2 contains runtime descriptions of the functions in this file,
produced by five independent agents. Your job is verification: for every
function Stage 2 describes, check the descriptions against the actual
source and produce a verdict.

You are not rewriting Stage 2. You are not adding new findings of your
own unrelated to Stage 2's claims. You are checking Stage 2's claims
against the source, function by function, and saying whether they are
accurate, partially accurate, or wrong.

Process:

1. For each function that appears in Stage 2, extract the specific
   claims Stage 2 makes about its runtime behavior — what it reads,
   what it writes, what it calls, its control flow, its error handling,
   whether it is async, what it returns.

2. For each claim, read the corresponding lines of the source file and
   determine one of three verdicts:

   - PASS: the source confirms the claim exactly as stated.
   - PARTIAL: the claim is mostly accurate but incomplete or slightly
     misleading — for example, Stage 2 says "calls X" but omits that
     the call is conditional on a branch; or Stage 2 describes a
     structural detail that is functionally equivalent but doesn't
     match the actual code shape. Describe the gap explicitly.
   - FAIL: the claim is contradicted by the source — Stage 2 says
     the function reads four elements but it actually reads five;
     Stage 2 says the function uses a helper but it uses raw DOM;
     Stage 2 misidentifies the control flow. Quote the source line(s)
     or identifier(s) that contradict the claim.

3. If multiple Stage 2 agents made different claims about the same
   function, note the disagreement and verdict each version. A function
   can have mixed verdicts across different claims.

4. If the source contains runtime behavior that no Stage 2 agent
   described — missing functions, missing error paths, missing branches,
   unhandled edge cases — you MAY flag them under a "needs_review"
   section at the end of your output. This is optional and should be
   reserved for substantive omissions, not for every line Stage 2
   didn't mention.

Rules:

- You are running independently. Do not reference, defer to, or summarize
  what other agents may have said. Do not write "as Agent 03 noted" or
  "I agree with the prior verdict" or any variation. Produce your own
  verdicts from the source file. Every agent output must stand alone.
- Anchor every verdict to the source. Quote the relevant line,
  identifier, or structural element. Do not verdict from memory of
  Stage 2 alone.
- Do not speculate about intent or design. If Stage 2 says "the function
  silently swallows errors" and the source shows an empty catch, that
  is PASS regardless of whether silent swallowing is a good idea.
- Do not re-describe the function. Your output is a list of verdicts
  on Stage 2's specific claims, not a fresh runtime walk.
- If Stage 2 made a claim you cannot verify from the source file alone
  (for example, a claim about what a helper function in another file
  does), mark it "unverifiable" and say what would be needed to verify.
  Do not guess.
- If a Stage 2 claim is ambiguous enough that you cannot tell what it
  is asserting, say so and move on. Do not charitable-read it into a
  claim it didn't make.

Format:

### functionName (line N)
**Verification**: PASS | PARTIAL | FAIL
**Findings**: [bulleted list of specific claim verdicts with evidence,
or "None. All claims confirmed." if PASS with no issues]
**Unverifiable claims**: [list, or "None"]

### nextFunctionName (line N)
...

At the end, include a "Cross-Agent Consensus Summary" section that
counts PASS / PARTIAL / FAIL results across all functions and notes
any findings where Stage 2 agents disagreed with each other.

If you have "needs_review" items (source behavior Stage 2 missed
entirely), list them in a "needs_review" section at the very end.

END STAGE 3 AGENT PROMPT.
```

---

## Resume semantics

On any re-invocation of this orchestration prompt with the same audit directory present:

1. Read `audit/manifest.json`.
2. Walk files in manifest order. For each file, walk stages in order (1 → 1.5 → 2 → 3).
3. Find the first stage with status != `done`. (status = `needs_review` at stage 1.5 still counts as "done enough" — skip past it.)
4. If that stage is `in_progress`, restart it from scratch (discard any partial output on disk for that stage).
5. If that stage is `pending`, start it.
6. Continue from there through the rest of the pipeline.

Never trust partial stage outputs. A stage is either complete (all five agent outputs written, manifest updated) or it starts over.

---

## Known property: cross-run variance (unchanged from v1)

The headline finding on a file tends to be stable across repeated runs. Subtler meaningful findings are variable. To get fuller coverage on an important file, run the full pipeline two or three times and union the meaningful findings from Stage 3. One run is sufficient for the major bug; multiple runs are needed for everything.

---

## Why fresh sessions per stage (unchanged from v1)

Each Stage 1 / 2 / 3 five-agent wave must run as a fresh parallel dispatch with no shared state between agents. The independence of the agents is the method's load-bearing assumption. Within the orchestration prompt, this is achieved by dispatching five Task blocks in a single assistant message — Claude Code's parallel Task mechanism gives each its own context.

Stage 1.5's arbiter runs must also be dispatched as fresh Task agents (not inline reasoning in the orchestration session), for the same reason: run 2 must not see run 1's output until the comparison step.
