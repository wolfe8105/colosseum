# Claude Code Prompt — Bulk Interaction Map Run (S258)

**Target directory:** `docs/interaction-maps/`
**Spec version:** v1.2 (see `docs/interaction-maps/_SPEC.md`)
**Canonical exemplars:** `docs/interaction-maps/F-48-mod-initiated-debate.md`, `docs/interaction-maps/F-47-moderator-marketplace.md`
**Session:** 258
**Scope:** shipped features, one markdown file per feature — target 3, acceptable 2+ at F-47 quality bar

---

## Your job

Produce spec-v1.2-compliant interaction maps in a single Claude Code session. The spec has now held up across three runs (F-48 in S255, F-47 in S256, and the S257 bulk run of F-01/F-02/F-09/F-46/F-50) and received one scope-expansion amendment between S256 and S257 driven by bulk-run findings. v1.2 is the current bar.

Output: new markdown files in `docs/interaction-maps/`. Do NOT modify the 11 existing files in that directory except as noted in the back-fill step at the end.

**Existing files — DO NOT MODIFY:**
- `_SPEC.md`
- `_CLAUDE-CODE-PROMPT-BULK-S257.md`, `_CLAUDE-CODE-PROMPT-F47.md` (historical)
- `F-01-queue-matchmaking.md`, `F-02-match-found.md`, `F-09-token-staking.md`, `F-46-private-lobby.md`, `F-47-moderator-marketplace.md`, `F-48-mod-initiated-debate.md`, `F-50-moderator-discovery.md` (v1.2 compliant, the 7 reviewed files)
- `F-49-go-guest-sparring.md` (pre-spec legacy, not v1.2 compliant; retrofit is a separate job — do not touch)

## Before you start (read once, applies to all features)

1. **Read `docs/interaction-maps/_SPEC.md` end to end.** Format rulebook. Non-negotiable. Pay particular attention to the two sections called out below in "FRONT-LOADED RULES" — the S257 bulk run dropped both of these in 5-of-5 files. Do not repeat that failure.
2. **Read `docs/interaction-maps/F-48-mod-initiated-debate.md` AND `docs/interaction-maps/F-47-moderator-marketplace.md` end to end.** Primary canonical exemplars. F-48 is the tightest example (single-purpose debate lifecycle, 5 diagrams, nested alts). F-47 is the sprawling example (5 disparate actions, parent feature with cross-ref handoffs).
3. **Skim `docs/interaction-maps/F-02-match-found.md` and `docs/interaction-maps/F-50-moderator-discovery.md`** as secondary reference. These were reviewed against v1.2 in S257 and show the mandatory button-note rule applied at review time. Useful pattern-reference for how the Notes should look in your output.
4. **Read the full punch list** (`THE-MODERATOR-PUNCH-LIST.md`) once, at the start. You will reference it repeatedly for feature metadata.
5. **Read `THE-MODERATOR-LAND-MINE-MAP.md` once** at the start. You'll grep it per-feature but having it loaded helps you recognize landmine patterns faster.

---

## FRONT-LOADED RULES — read these twice

These are the two rules the S257 bulk run dropped in every single file. The spec language was strengthened in v1.2 but strengthening didn't help because the rules only get applied at review time. They need to be applied at generation time. That is your job this session.

### Rule 1 — MANDATORY BUTTON NOTE RULE (spec line 142)

> Every button, input, card, or other clickable/interactive element that appears as a participant in a sequenceDiagram MUST have an adjacent `Note over <Participant>: "..."` block. NO EXCEPTIONS.

- If the element HAS enable/disable logic, the Note describes it. This is the whole point of the format.
- If the element has NO disabled-state logic, the Note still exists and says so — use `"ALWAYS ENABLED"`, `"ALWAYS VISIBLE"`, or `"NO DISABLED-STATE LOGIC"`.
- **Before writing each diagram**, do this self-check: count every `participant` that represents a button/input/card. Count the `Note over` blocks targeting those participants. **The two counts MUST be equal.** If they aren't, fix the diagram before moving on. Do not write the next diagram until the current one passes this check.
- **S257 evidence:** 5 of 5 files in the bulk run dropped this rule on at least one button participant. F-50 was the only file that got it partially right (diagram 2 had it, diagrams 1/3/4 dropped it). Do not rely on "I'll remember" — do the count check on every diagram.

### Rule 2 — FORBIDDEN CHARACTERS APPLY EVERYWHERE INSIDE A `sequenceDiagram` BLOCK (spec line 150)

> These rules apply to ALL text inside a `sequenceDiagram` code block — participant aliases, message labels (text after arrow colons), alt/else/loop/opt condition text, Note text, and any other string the parser encounters.

The five characters to avoid:

- **Backticks** — never. Use plain words.
- **Ampersand `&`** — replace with the word "and" everywhere inside diagram blocks. `"CREATE and GET CODE button"` not `"CREATE & GET CODE button"`.
- **Angle brackets `<` `>`** — only allowed as part of `<br/>` inside quoted labels. Never as comparison operators anywhere — including alt conditions and message labels. Use "less than" / "greater than" / "not equal" / "at or over" / "at or under". `alt profile less than 25 percent`, not `alt profile < 25%`.
- **Double quotes inside diagram text** — avoid. Includes empty-string literals like `""` in message labels and quoted strings inside alt conditions. `"enterQueue(ai, empty topic)"` not `"enterQueue(ai, \"\")"`. `"status is matched"` not `"status === \"matched\""`.
- **Triple backtick code fences** — never inside diagram blocks.

**S257 evidence:** 30 forbidden-character violations across 5 files in the bulk run. Dominant failure mode was wrapping user-facing UI strings in double quotes inside message labels. If you find yourself typing `"` inside a diagram block to quote a string, stop and rewrite without quotes.

**Before writing each diagram's final line**, visually scan the whole block for any of the five forbidden characters. Treat it like a lint step.

### Rule 3 — Container-participant Note precedent (S257 judgment call, not yet spec)

If a user-tappable surface is folded into a container participant (e.g. a card that contains a button, where you chose to make the card a participant rather than the button), the container gets the Note describing the surface's state. This is a judgment-call precedent from S257 (four instances across F-01 and F-46 patches) and is a v1.3 candidate — not a spec rule yet. If you use this pattern, flag it in your final report so it can be evaluated for formalization.

---

## Feature selection

There are no non-negotiable picks this session — the cross-reference loops that drove F-01 and F-46 to be mandatory in S257 are now closed. Select features from the punch list using these criteria, in order:

- MUST be `shipped` status (not specced, not specced_not_built, not in_progress)
- MUST have a dedicated client file or module you can identify from a grep
- SHOULD be medium-sized: client code path fits in under ~500 lines across all files you'd need to cite
- SHOULD NOT have `depends_on` relationships to features not yet mapped and not in this batch — prefer standalone or already-mapped-parent features
- SHOULD surface something interesting: either known-quirks-heavy or clean-architecture-worth-documenting

Good candidates to consider (verify status in punch list before committing):

- **F-28 Bounty Board** — mentioned in S255 handoff as medium-sized and shipped; still unmapped as of S258
- Any of the smaller shipped features in the F-20s through F-40s range
- **Avoid** F-55 (deferred), F-57 (not built), F-58 (not built), F-23 (specced not built), F-13/F-34/F-40 (scratched), F-49 (legacy pre-spec), and any feature already in the existing-files list above

**Report your selected features at the top of your final output report**, with selection reasoning for each. If you can't find enough good candidates meeting the criteria, map fewer and report why.

## Per-feature workflow (repeat per selected feature)

1. **Grep the feature's files.** Start from the punch list row, follow file references, follow imports, follow callers. Establish the full set of files touched.
2. **Grep landmines.** Search `THE-MODERATOR-LAND-MINE-MAP.md` for the feature ID and for file paths and RPC names you identified in step 1. Include genuinely relevant LM-XXX entries.
3. **Identify user actions.** 2–5 typical, up to 6. If a feature genuinely has more than 6, stop and flag it in your report rather than splitting or truncating.
4. **Draft the YAML frontmatter.** All 13 required fields. Empty lists as `[]`. `generated_by: claude-code`. `last_verified_session: 258`.
5. **Draft the Summary and User actions list.**
6. **Draft each numbered action section** with prose + sequence diagram + Notes bullets. Per-diagram sizing: 6–12 participants, 10–25 arrows (3–5 / 3–8 for genuinely trivial actions, per spec).
7. **Run the two self-checks from the FRONT-LOADED RULES section above** on every diagram before moving on. Button-participant count equals Note-over count. Visual scan for forbidden characters. Do not skip this.
8. **Verify every citation** before moving to the next feature. Every `file.ts:NN` reference must be openable and point to what you say it does. Target F-47 standard: 0 unverifiable, corrections applied inline, no silent drops. If something genuinely can't be verified, add to Known Quirks or Open Questions per spec.
9. **Write the file** to `docs/interaction-maps/F-XX-<slug>.md`.
10. **Move on to the next feature.** Do NOT re-read the spec or exemplars between features — keep the format rules in working memory. But DO re-run the two self-checks on every diagram of every feature. Those are cheap and they are the thing S257 proved you cannot skip.

## Things to actively watch for (updated running quirk-hunt list as of S258)

The format has now surfaced ~27 real code issues across 7 features, plus 12 confirmed silent catches and 1 unhandled promise chain. The payoff keeps paying. Things to specifically look for during this batch:

- **Silent error swallowing.** Running count: 12 silent catches across 7 features. Confirmed codebase-wide idiom. Grep every `catch` block in files you touch. Empty catches, `catch (e) {}`, and `catch { /* non-critical */ }` patterns all go in Known Quirks.
- **Unhandled promise chains — distinct failure mode from silent catches.** New pattern from S257 F-50: `async.ts:505` has `toggleModerator(true).then(...)` with no `.catch()` at all. Track these separately from silent catches in your report. Grep for `.then(` without a paired `.catch(` in files you touch.
- **Fire-and-forget RPC calls.** New pattern from S257 F-02: `request_mod_for_debate` at `arena-match.ts:171` is called without awaiting the result and without checking for success, so the RPC can silently fail and the flow proceeds. Any `supabase.rpc(...)` call not awaited and not `.then()`-chained is a candidate. Track these in Known Quirks.
- **Stale SQL doc drift.** `supabase-deployed-functions-export.sql` has been stale since S227 per S257. Check it for the canonical deployed version of any RPC you cite, and flag mismatches between that and per-feature migration files. This file is overdue for re-sync; flagging mismatches feeds that work.
- **Type-interface mismatches between SQL return types and TypeScript interfaces.** F-48's `check_mod_debate` was missing fields that the TS interface expected, silently defaulted via `??`. Grep TS interfaces against SQL return types for any RPC you cite.
- **Missing server notifications on client navigation.** F-48 debater LEAVE and F-47 mod-request and F-46 DECLINE have client-side exits that fail to notify the server. Any "back out" / "leave" / "decline" button in a feature should be traced to verify it does server cleanup.
- **Client-side gates without matching server checks.** Look for `if (profile.xxx)` gates in the client that don't have a corresponding server-side RPC check.
- **30s / 60s client-side timers.** F-47 auto-decline timer is client-side only and can stall if the tab is backgrounded. Any similar timer in a feature you map should be flagged. F-02 also has a countdown timer that doesn't account for accept-RPC latency — related pattern.
- **Hardcoded hex colors surviving the S205 visual token migration.** F-09's `_renderPoolBar()` was flagged in S257. Any component rendering with hex literals instead of CSS vars is a minor but trackable Known Quirks entry.

## Context budget warning — the important one

S257's bulk run completed 3 reviews + 10 Figma pushes + a full 5-file patch batch in one chat-Claude session, but that was "above ceiling on purpose" per the S257 handoff. The honest ceiling for generation work in one CC session is **probably 3 new feature files at the F-47 quality bar, maybe 4 if the features are small**. Degraded quality on feature 4 is worse than not mapping it.

If you notice any of these signs, STOP, finish the current feature cleanly, and write a clean stopping-point report:

- You catch yourself guessing at a line number instead of re-verifying
- You catch yourself copy-pasting structure from a previous feature without running the two self-checks
- You catch yourself skipping the landmine grep
- You catch yourself writing a diagram and only checking button-note count at the end instead of during drafting
- Your mental model of the punch list starts going fuzzy

Pat would rather have 2 pristine files than 4 half-verified ones.

## Cross-reference back-fill (do this ONLY after all new feature files are written)

After writing the new files, existing interaction map files have `depended_on_by` fields that may now need updates. The 7 v1.2-compliant files are: `F-01`, `F-02`, `F-09`, `F-46`, `F-47`, `F-48`, `F-50`. For each of your new maps:

- Look at its `depends_on` list.
- For every entry in that list that's one of the 7 existing files, open that existing file and add your new feature to its `depended_on_by` list.

This is the ONLY modification allowed to existing interaction map files in this run. Do NOT touch the rest of any existing file. Do NOT touch F-49 (pre-spec legacy). Do NOT touch `_SPEC.md`.

## Final report format (at end of session)

When all mapping is done, report:

1. **Number of features completed** (target: 3, acceptable: 2+ with clean stopping-point rationale)
2. **Selection rationale for each feature** you chose from the punch list
3. **Per-feature stats:** participants and arrows per diagram, total citations, corrections made during verification, any unverifiable citations and how handled
4. **Self-check compliance report:** for each diagram, confirm the button-participant-count equals Note-over-count check passed, and confirm the forbidden-character scan passed. If any diagram failed either check during drafting and was corrected, report that too — it's useful signal.
5. **Total Known Quirks surfaced across the batch** — one-line summary of each. Running tally extension.
6. **Silent-catch / unhandled-promise / fire-and-forget pattern update:** count each category separately. Add to the running totals (12 silent catches, 1 unhandled promise, 1 fire-and-forget at start of session).
7. **Cross-reference back-fill:** which existing files you updated and what the new `depended_on_by` values are.
8. **Container-participant precedent usage:** if you used the Rule 3 judgment-call pattern, flag each instance for v1.3 evaluation.
9. **Any spec gaps** — places where v1.2 didn't tell you what to do and you had to make a judgment call. These are v1.3 candidates.
10. **Context budget debrief:** did you complete the target? If not, where did you stop and why? If yes, how much headroom did you have left?

Then stop. Do not commit. Do not run tests. Pat will paste each file back to chat-Claude one at a time for review and Figma push.

---

**The spec and the exemplars carry the memory. Trust them. The two front-loaded rules are not optional — S257 proved the spec alone can't carry them through a bulk run. Apply them at generation time, with per-diagram self-checks, or the file is non-compliant.**
