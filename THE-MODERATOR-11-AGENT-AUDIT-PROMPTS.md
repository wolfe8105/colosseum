# Four-Stage Code Audit Method — Prompts Reference

Each stage dispatches eleven parallel Task agents in Claude Code (stage 4 dispatches one). Stages must run in order — each stage reads the prior stage's output as a fixed file on disk.

Before running: substitute the placeholder paths in `[BRACKETS]` with real paths on your machine. Source file path comes from cloning the repo. Intermediate output paths are wherever you want to write them (e.g., `C:\Users\you\Downloads\audit-stage1.md`).

---

## Stage 1 — Primitive Inventory

**Purpose:** Eleven agents independently catalogue what is literally in the file at the primitive-language level. Output is forced-convergent — all eleven should agree on the same content.

**Inputs:** source file only.

**Output:** one file on disk, eleven agent outputs concatenated, used as anchor for stage 2.

```
In a single assistant message, emit 11 Task tool_use blocks simultaneously.
Do not reason between spawns. Do not wait for any agent to return before
spawning the next. All 11 dispatch in one batch, run concurrently, and
return independently.

Each of the 11 Task calls uses the exact same prompt below, verbatim. No
agent is told about the others. No agent receives a different instruction.
No agent is given an index or a role.

When all 11 have returned, write their outputs verbatim to disk at
[STAGE1_OUTPUT_FILE_PATH], formatted as:

    # Stage 1 Outputs — [filename]

    ## Agent 01
    [verbatim output]

    ## Agent 02
    [verbatim output]

    ...through Agent 11.

Then extract the list of function definitions that all eleven agents
identified and return it as a numbered anchor list in source order. This
anchor list will be used in stage 2.

PROMPT FOR EACH AGENT (identical across all 11)
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

## Stage 2 — Runtime Walk

**Purpose:** Eleven agents independently describe what each function does at runtime, using the stage 1 anchor list so every agent walks the same functions in the same order.

**Inputs:** source file + stage 1 anchor list.

**Output:** one file on disk with eleven independent runtime-behavior descriptions, used as evidence for stage 3.

```
Dispatch eleven Task tool_use blocks simultaneously in a single assistant
message. Each agent receives the exact same prompt below, verbatim, with
the anchor list from stage 1 substituted into the marked slot. Wait for
all eleven to return.

PROMPT FOR EACH STAGE 2 AGENT:

Read the file at [SOURCE_FILE_PATH].

An earlier pass catalogued the primitive structure of this file. Eleven
independent agents agreed on the following function list. You do not
need to rediscover it. Treat this list as the anchor — these are the
functions whose runtime behavior you are describing, in this order:

[ANCHOR LIST FROM STAGE 1]

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

When all eleven stage 2 agents return, write their outputs to disk at
[STAGE2_OUTPUT_FILE_PATH], formatted exactly like this:

    # Stage 2 Outputs — [filename]

    Eleven parallel agents produced independent runtime-behavior
    descriptions of every function in [filename].

    ## Agent 01
    [verbatim output]

    ## Agent 02
    [verbatim output]

    ...through Agent 11.
```

---

## Stage 3 — Verification

**Purpose:** Eleven agents take the eleven stage 2 outputs as fixed evidence, find the places where they disagree, and verify each disagreement against the source file. Load-bearing rule: numerical majority carries no weight. A 1-of-11 finding that the source confirms is REAL; a 10-of-11 finding the source contradicts is PHANTOM.

**Inputs:** source file + stage 2 outputs file.

**Output:** one file on disk with eleven independent verification reports, consolidated into a findings list for stage 4.

```
Dispatch eleven Task tool_use blocks simultaneously in a single assistant
message. Each agent receives the exact same prompt below, verbatim. Wait
for all eleven to return.

PROMPT FOR EACH STAGE 3 AGENT:

You are the third stage of a multi-stage code audit method. You will
analyze the outputs produced by an earlier stage and verify their claims
against the source. You are not writing a fresh review of the file. You
are reading prior reviews of it, as evidence, and checking that evidence
against the source.

Two input files:

1. SOURCE FILE: [SOURCE_FILE_PATH]
   This is the code being audited.

2. PRIOR STAGE OUTPUTS: [STAGE2_OUTPUT_FILE_PATH]
   This file contains eleven independent runtime-behavior descriptions of
   every function in the source file, produced by eleven parallel agents
   in an earlier stage. Each description was produced independently. Each
   is labeled with a header like "## Agent 01" through "## Agent 11".
   Open this file and read it in full before you begin.

Open both files using your file-reading tools. Do not ask for them to be
pasted into the prompt.

Your job:

Read the eleven prior descriptions as raw material. For each function,
identify the places where the descriptions disagree, and verify each
disagreement against the source file. Proceed function by function in
the order the prior descriptions use.

For each function:

1. Extract every factual claim made by at least one agent about that
   function's runtime behavior. A factual claim is a statement about
   what the function reads, what it writes, what it calls, how it
   branches, what it returns, its async/sync status, its error
   handling, or a cross-function consequence naming another specific
   function. Framing, tone, rhetorical emphasis, and phrasing choices
   are not claims.

2. Group claims by meaning, not by wording. Two claims phrased
   differently but asserting the same runtime fact are the same claim.
   Two claims phrased similarly but asserting different runtime facts
   are different claims. When uncertain whether two claims mean the
   same thing, split them.

3. Count how many of the eleven agents made each claim.

4. Identify divergences: any claim made by fewer than eleven agents.
   Claims made by all eleven are consensus and do not appear in your
   output — they are the floor, not the signal. Claims made by one
   through ten agents are divergences and must all appear.

5. For each divergence, read the source file directly and classify the
   claim as one of:

   REAL      — the source confirms the claim.
   PHANTOM   — the source contradicts the claim.
   AMBIGUOUS — the claim cannot be verified from this file alone
               (e.g., it depends on the behavior of an imported
               function whose contract is not decidable from the
               call site).

6. For each REAL divergence, classify its significance as one of:

   MEANINGFUL — the finding tells an auditor something about the
                function's behavior, correctness, or design that the
                consensus did not already convey. Bugs, correctness
                invariants, cross-function consequences, architectural
                decisions, fragile patterns, and state-management
                observations all qualify.
   COSMETIC   — the finding is true but low-value. Logging statements
                that were omitted by most agents, level-of-detail
                restatements of consensus claims, formatting
                observations, and any finding that would not change an
                auditor's decisions about the function qualify as
                cosmetic.

7. For each MEANINGFUL divergence, state in one sentence what the
   finding tells an auditor that the consensus did not.

Verification rules:

- Quote exact source lines with line numbers as evidence for every
  REAL and PHANTOM classification. Do not paraphrase the source in
  place of quoting it.
- Do not mark a divergence REAL because it sounds plausible. Mark it
  REAL only because the source supports it.
- Do not mark a divergence PHANTOM because most of the eleven agents
  did not mention it. The agents are not ground truth. The source is.
- Numerical majority carries no weight. A claim made by one agent
  that the source confirms is REAL. A claim made by ten agents that
  the source contradicts is PHANTOM. Verify each claim against the
  file on its own merits. Do not reason "only one agent said this,
  so it is probably noise." That reasoning is explicitly forbidden
  by this method and is the single failure mode stage 3 exists to
  prevent.
- When a claim references another function defined in the same source
  file, you may verify by reading that function. When a claim
  references an imported function from another file, mark the claim
  AMBIGUOUS unless the behavior is decidable from the call site alone.

Output format:

## functionName

### Divergence N: short descriptive name
- Claim: [plain-language statement of the asserted runtime fact]
- Agents making it: [list, e.g., Agent 03, Agent 05, Agent 09]
- Agents not making it: [list]
- Verification: REAL | PHANTOM | AMBIGUOUS
- Significance: MEANINGFUL | COSMETIC (REAL findings only; omit this
  line for PHANTOM and AMBIGUOUS)
- Evidence: [quoted source lines with line numbers, or explanation of
  why no verification is possible for AMBIGUOUS]
- Note: [one sentence; MEANINGFUL findings only; what this tells an
  auditor that the consensus did not]

### Divergence N+1: ...

If a function has no divergences, emit:

## functionName
No divergences. All eleven agents in consensus.

Proceed through every function in source order. After the last function,
produce a summary in this exact format:

## Summary

- Functions analyzed: [count]
- Functions with no divergences: [count]
- Total divergences found: [count]
- REAL / MEANINGFUL: [count]
- REAL / COSMETIC: [count]
- PHANTOM: [count]
- AMBIGUOUS: [count]

### Meaningful findings, in priority order

1. [function.divergence-name] — [one-line description]
2. ...

END STAGE 3 AGENT PROMPT.

When all eleven stage 3 agents return, write their outputs to disk at
[STAGE3_OUTPUT_FILE_PATH].
```

**Intermediate consolidation (between stage 3 and stage 4):** The eleven stage 3 outputs contain overlapping MEANINGFUL findings. Before running stage 4, consolidate them into a single deduplicated findings file — one entry per finding, with the claim, the source evidence, and the significance classification. Either do this by hand or with a small helper pass that reads the eleven stage 3 outputs and produces the consolidated file.

---

## Stage 4 — Triage

**Purpose:** One agent walks the consolidated findings list and decides what action each finding deserves. Bias toward leaving things alone.

**Inputs:** source file + consolidated stage 3 findings file.

**Output:** a triaged patch proposal. One agent, not eleven.

```
You are the fourth and final stage of a multi-stage code audit method.
Prior stages produced a list of verified, meaningful findings about a
source file. Your job is to decide, for each finding, what action it
deserves.

Two input files:

1. SOURCE FILE: [SOURCE_FILE_PATH]
2. CONSOLIDATED FINDINGS: [STAGE3_CONSOLIDATED_FINDINGS_PATH]

Open both files yourself. Do not ask for them to be pasted in.

Proceed through the findings in the order they appear in the input file.
For each finding:

1. Read the relevant source region yourself. Do not trust the stage 3
   quotes — open the file, find the lines, confirm the source still says
   what stage 3 said it said.

2. Decide which of these four outcomes applies:

   FIX         — the finding describes a real problem, and the code
                 should change. Propose a specific patch.
   PRESERVE    — the finding describes real behavior that is already
                 correct and should not change. Some findings are
                 load-bearing invariants that an auditor needs to know
                 but nobody should touch. State explicitly that the
                 current code is correct and name the reason.
   ACCEPT      — the finding is real but cosmetic and not worth
                 changing. Logging omissions, stylistic oddities, and
                 protocol mismatches that work fine in practice
                 typically fall here. Acknowledge and move on.
   REJECT      — the finding is wrong, misleading, or a phantom that
                 slipped through stage 3. Explain why the source does
                 not support the claim.

3. If the outcome is FIX, produce the patch as a literal code block
   showing the exact replacement. Identify the line numbers being
   replaced and the new code. Do not edit the file directly. Do not
   produce unified-diff format. Show the old lines and the new lines
   side by side.

4. If the outcome is PRESERVE, state in one sentence what invariant or
   constraint the current code satisfies and what would break if it
   changed.

5. If the outcome is ACCEPT, state in one sentence why the finding is
   not worth acting on. Do not write a long justification.

6. If the outcome is REJECT, quote the source lines that contradict the
   finding's claim.

Rules:

- Bias toward ACCEPT and PRESERVE over FIX. Most findings in an audit
  are not bugs. A stage-4 agent that tries to "fix" everything makes
  the file worse. If you find yourself proposing more than four or
  five FIX actions out of twenty findings, stop and reconsider whether
  you are being too aggressive.
- Never propose a FIX whose justification is "the code would be
  cleaner" or "this is more consistent." FIX is for behavior changes
  that address real problems, not style.
- Never propose a FIX that removes logging, error handling, or defensive
  checks. If a finding points at a missing log statement or missing
  null check, PRESERVE or ACCEPT.
- Never propose a FIX that changes the order of statements unless the
  finding explicitly identifies an ordering bug and the source confirms
  the reordering is safe.
- If two findings conflict (one says "add X," another says "X should
  not be added"), resolve by reading the source and picking the
  outcome the source supports. If the source is ambiguous, PRESERVE.

Output format:

## Finding N: [short name from stage 3]

- Outcome: FIX | PRESERVE | ACCEPT | REJECT
- [If FIX] Patch:
  ```
  OLD (lines X-Y):
  [current source]

  NEW:
  [proposed replacement]
  ```
- Reasoning: [one to three sentences]

Repeat for all findings in order.

After the last finding, produce a summary:

## Summary

- Findings reviewed: [count]
- FIX: [count]
- PRESERVE: [count]
- ACCEPT: [count]
- REJECT: [count]

### Patches proposed, in priority order

1. [Finding N] — [one-line description of the change]
2. [Finding M] — [one-line description of the change]
...

Stop after the summary. Do not write a narrative conclusion.
```

---

## Running the method per file — quick checklist

1. Clone the repo (once per codebase, not per file).
2. Pick the file to audit. Confirm its full path.
3. Run stage 1 with `[SOURCE_FILE_PATH]` and `[STAGE1_OUTPUT_FILE_PATH]` substituted. Eleven agents dispatch in parallel; output file gets written to disk.
4. Run stage 2 with `[SOURCE_FILE_PATH]`, `[STAGE2_OUTPUT_FILE_PATH]`, and the anchor list from stage 1 substituted. Eleven agents dispatch in parallel.
5. Run stage 3 with `[SOURCE_FILE_PATH]`, `[STAGE2_OUTPUT_FILE_PATH]`, and `[STAGE3_OUTPUT_FILE_PATH]` substituted. Eleven agents dispatch in parallel.
6. Consolidate the stage 3 outputs into a single deduplicated findings list (by hand or with a small helper prompt).
7. Run stage 4 with `[SOURCE_FILE_PATH]` and the consolidated findings file. One agent, not eleven.
8. Review stage 4's proposed patches. Apply the ones you agree with.

Stages 1–3 can be orchestrated into a single dispatched prompt that runs all three waves sequentially and writes each stage's output to disk before starting the next. Stage 4 is typically run separately after a human reviews stage 3.

---

## Known property: cross-run variance

The headline finding on a file (the major bug, if any) tends to be stable across repeated runs. Subtler meaningful findings are variable across runs — a finding surfaced by one agent out of eleven in run 1 may be absent from all eleven agents in run 2, and run 2 may surface different subtler findings that run 1 missed. To get fuller coverage of subtler findings on an important file, run the full pipeline two or three times and union the meaningful findings. One run is sufficient to catch the major bug; multiple runs are needed to catch everything.

---

## Why fresh sessions per stage

Each stage must run in a fresh Claude Code session with no memory of prior stages. The only things that cross between sessions are the file on disk (unchanged) and the explicit inputs named in the next stage's prompt. Shared session state between stages is contamination — it lets later agents anchor on earlier agents' reasoning without knowing they are anchoring. The independence of the stages is the method's load-bearing assumption, and fresh sessions are how that independence is enforced.
