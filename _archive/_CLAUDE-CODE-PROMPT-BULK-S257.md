# Claude Code Prompt — Bulk Interaction Map Run (S257)

**Target directory:** `docs/interaction-maps/`
**Spec version:** v1.1 (see `docs/interaction-maps/_SPEC.md`)
**Canonical exemplars:** `docs/interaction-maps/F-48-mod-initiated-debate.md`, `docs/interaction-maps/F-47-moderator-marketplace.md`
**Session:** 257
**Scope:** 5 shipped features, one markdown file per feature

---

## Your job

Produce 5 spec-v1.1-compliant interaction maps in a single Claude Code session. This is the first bulk run — prior runs (F-48 in S255, F-47 in S256) were single-feature. The spec has held up across two runs under v1.1 with two different feature shapes, so scaling is now green-lit.

Output: 5 new markdown files in `docs/interaction-maps/`. Do NOT modify the 4 existing files in that directory (`_SPEC.md`, `F-48-mod-initiated-debate.md`, `F-47-moderator-marketplace.md`, `F-49-go-guest-sparring.md`) except as noted in the back-fill step at the end.

## Before you start (read once, applies to all 5 features)

1. **Read `docs/interaction-maps/_SPEC.md` end to end.** Format rulebook. Non-negotiable.
2. **Read `docs/interaction-maps/F-48-mod-initiated-debate.md` AND `docs/interaction-maps/F-47-moderator-marketplace.md` end to end.** These are both canonical exemplars. F-48 is the tightest example (single-purpose debate lifecycle, 5 diagrams, nested alts). F-47 is the sprawling example (5 disparate actions, parent feature with cross-ref handoffs). Your output for each feature should look like one or the other depending on feature shape.
3. **Read the full punch list** (`THE-MODERATOR-PUNCH-LIST.md`) once, at the start. You will reference it repeatedly for feature metadata across all 5 maps.
4. **Read `THE-MODERATOR-LAND-MINE-MAP.md` once** at the start. You'll grep it per-feature but having the full contents loaded helps you recognize landmine patterns faster.

## The 5 features to map

**Two are non-negotiable** because they close cross-reference loops with all three already-mapped features (F-47, F-48, F-49):

1. **F-01 Queue / Matchmaking** — foundational. Referenced as cross-ref by both F-47 and F-48 (`arena_debates` table and `enterRoom()` flow). This is probably one of the largest features in the app — if you find it's too big for a single file (more than 6 genuinely distinct user actions), stop and report before writing, don't split on your own.
2. **F-46 Private Lobby** — provides the `joinWithCode()` entry point that F-48 piggybacks on. Cross-ref from F-48. Includes the `join_private_lobby` RPC and the join-code mechanism for direct-challenge debates.

**Three more features — you select them from the punch list** using these criteria, in order:

- MUST be `shipped` status (not specced, not specced_not_built, not in_progress)
- MUST have a dedicated client file or module you can identify from a grep (not features that are just flags/toggles on other features)
- SHOULD be medium-sized: the client code path fits in under ~500 lines across all files you'd need to cite
- SHOULD NOT have `depends_on` relationships to features not yet mapped and not in this batch — i.e. prefer standalone or already-mapped-parent features
- SHOULD surface something interesting (either a known-quirks-heavy area or a feature with clean architecture worth documenting as a positive exemplar)

Good candidates to consider (verify status in punch list before committing):
- **F-28 Bounty Board** — mentioned in S255 handoff as medium-sized and shipped
- Any of the smaller shipped features in the F-20s through F-40s range
- Avoid F-55 (deferred), F-57 (not built), F-58 (not built), F-23 (specced not built), F-13/F-34/F-40 (scratched)

**Report your 3 selected features at the top of your final output report**, with the selection reasoning for each. If you can't find 3 good candidates meeting the criteria, map fewer and report why.

## Per-feature workflow (repeat 5 times)

For each of the 5 features, in this order (F-01, F-46, then your 3 selections):

1. **Grep the feature's files.** Start from the punch list row, follow file references, follow imports, follow callers. Establish the full set of files touched.
2. **Grep landmines.** Search `THE-MODERATOR-LAND-MINE-MAP.md` for the feature ID and for file paths and RPC names you identified in step 1. Include genuinely relevant LM-XXX entries.
3. **Identify user actions.** 2–5 typical, up to 6. If a feature genuinely has more than 6, stop and flag it in your report rather than splitting or truncating.
4. **Draft the YAML frontmatter.** All 13 required fields. Empty lists as `[]`. `generated_by: claude-code`. `last_verified_session: 257`.
5. **Draft the Summary and User actions list.**
6. **Draft each numbered action section** with prose + sequence diagram + Notes bullets. Per-diagram sizing: 6–12 participants, 10–25 arrows (3–5 / 3–8 for genuinely trivial actions, per spec).
7. **Verify every citation** before moving to the next feature. Every `file.ts:NN` reference must be openable and point to what you say it does. Target the F-47 standard: 0 unverifiable, corrections applied inline, no silent drops. If something genuinely can't be verified, add to Known Quirks or Open Questions per spec.
8. **Write the file** to `docs/interaction-maps/F-XX-<slug>.md`.
9. **Move on to the next feature.** Do NOT re-read the spec or exemplars between features — keep the format rules in working memory.

## Things to actively watch for (updated running quirk-hunt list)

The format has surfaced 8 real code issues across 3 features so far. The payoff. Things to specifically look for during this batch:

- **Silent error swallowing.** Now a confirmed pattern — 4 found across F-09 (fixed S250), F-48 `cancelModDebate`, F-47 `handleModResponse`, F-47 `startModStatusPoll`. Grep every `catch` block in files you touch. Empty catches and `catch (e) {}` patterns go in Known Quirks.
- **Stale SQL doc drift.** F-48 had its original migration file overwritten by a later migration; the in-repo SQL is stale vs deployed. Check `supabase-deployed-functions-export.sql` for the canonical deployed version of any RPC you cite, and flag mismatches between that and per-feature migration files.
- **Type-interface mismatches between SQL return types and TypeScript interfaces.** F-48's `check_mod_debate` was missing fields that the TS interface expected, silently defaulted via `??`. Grep TS interfaces against SQL return types for any RPC you cite.
- **Missing server notifications on client navigation.** F-48 debater LEAVE and F-47 mod-request have client-side exits that fail to notify the server. Any "back out" or "leave" button in a feature should be traced to verify it does server cleanup.
- **Client-side gates without matching server checks.** Look for `if (profile.xxx)` gates in the client that don't have a corresponding server-side RPC check.
- **NEW watchlist — 30s / 60s client-side timers.** F-47 surfaced that the auto-decline timer is client-side only and can stall if the tab is backgrounded. Any similar timer pattern in a feature you map should be flagged.

## Context budget warning — the important one

This is a bulk run. Your context will grow with each feature. **If after mapping 3 features you notice your context is heavy or you're starting to lose track of verification details, STOP.** Write a clean stopping-point report and let Pat run the rest in a separate session. Degraded quality on feature 4 and 5 is worse than not mapping them. Target the F-47 quality bar (0 unverifiable citations, format-identical to exemplar) on every file or don't ship it.

Signs to stop:
- You catch yourself guessing at a line number instead of re-verifying
- You catch yourself copy-pasting structure from a previous feature without re-reading the spec mentally
- You catch yourself skipping the landmine grep
- Your mental model of the punch list starts going fuzzy

If you stop early, finish the current feature cleanly and report how many you completed. Pat would rather have 3 pristine files than 5 half-verified ones.

## Cross-reference back-fill (do this ONLY after all 5 feature files are written)

After writing the 5 new files, the existing F-47 and F-48 files have `depended_on_by` fields that may now need updates:

- F-47 currently has `depended_on_by: [F-48]`. If any of your 5 new maps declare `depends_on: [F-47, ...]`, add them to F-47's `depended_on_by` list.
- F-48 currently has `depended_on_by: []`. Same check — add any new dependents.

This is the ONLY modification allowed to existing interaction map files in this run. Do NOT touch the rest of F-47 or F-48. Do NOT touch F-49 (pre-spec, separate retrofit later). Do NOT touch `_SPEC.md`.

## Final report format (at end of session)

When all mapping is done, report:

1. **Number of features completed** (expected: 5, acceptable: 3+ with clean stopping-point rationale)
2. **Selection rationale for the 3 auto-picked features** (the 3 beyond F-01 and F-46)
3. **Per-feature stats:** participants and arrows per diagram, total citations, corrections made during verification, any unverifiable citations and how handled
4. **Total Known Quirks surfaced across the batch** — with a one-line summary of each. This is the running tally extension.
5. **Silent-catch pattern update:** how many new silent catches you found during this batch (add to the running count of 4)
6. **Cross-reference back-fill:** which existing files you updated and what the new `depended_on_by` values are
7. **Any spec gaps** — places where v1.1 didn't tell you what to do and you had to make a judgment call. These are v1.2 candidates.
8. **Context budget debrief:** did you complete all 5? If not, where did you stop and why? If yes, how much headroom did you have left?

Then stop. Do not commit. Do not run tests. Pat will paste each file back to chat-Claude one at a time for review and Figma push, or will paste them all at once if chat-Claude's budget allows.

---

**The spec and the exemplars carry the memory. Trust them. F-47 was a first-pass clean run; match or beat that bar on every file in this batch or flag the ones that didn't meet it.**
