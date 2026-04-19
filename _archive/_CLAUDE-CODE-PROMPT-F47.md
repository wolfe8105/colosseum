# Claude Code Prompt — F-47 Moderator Marketplace Interaction Map

**Target file:** `docs/interaction-maps/F-47-moderator-marketplace.md`
**Spec version:** v1.1 (see `docs/interaction-maps/_SPEC.md`)
**Canonical exemplar:** `docs/interaction-maps/F-48-mod-initiated-debate.md`
**Session:** 256

---

## Your job

Produce a spec-v1.1-compliant interaction map for **F-47 Moderator Marketplace**, the parent feature for F-48 (Mod-Initiated Debate) and the moderator-side surface that gates `is_moderator` access throughout the app. Output a single markdown file at `docs/interaction-maps/F-47-moderator-marketplace.md`. Do not modify any other files.

## Before you start

1. **Read `docs/interaction-maps/_SPEC.md` end to end.** This is the format rulebook. Pay special attention to:
   - The YAML frontmatter schema (13 required fields, empty lists as `[]`)
   - The Mermaid fidelity rules (6–12 participants, 10–25 arrows per diagram, file:line annotations on every non-User non-table participant)
   - The forbidden-character list for Mermaid labels (no backticks, no `&` → use "and", no `<`/`>`/`!==` → use words, no nested double quotes)
   - The ALWAYS ENABLED / ALWAYS VISIBLE Note rule — every button MUST have a Note explaining its disabled-state logic OR explicitly stating there is none
   - Nested `alt` blocks are explicitly allowed and encouraged for compound branching

2. **Read `docs/interaction-maps/F-48-mod-initiated-debate.md` end to end.** This is the canonical exemplar. Your output should be format-identical to this file modulo genuine feature differences. If you find yourself doing something structurally different from F-48, stop and reconsider — that's a signal you're drifting from the format.

3. **Read the F-47 punch list row.** Grep `THE-MODERATOR-PUNCH-LIST.md` for `F-47` and read the full row (feature name, status, shipped session, notes). Record the line number of the row header for the `punch_list_row` frontmatter field.

4. **Grep for relevant landmines.** Search `THE-MODERATOR-LAND-MINE-MAP.md` for `F-47`, for `arena-mod-queue`, for `is_moderator`, and for any RPC names you identify as belonging to F-47. Include any LM-XXX entries that are genuinely relevant.

## Scope of F-47

F-47 is the Moderator Marketplace — the feature that makes a user a moderator, gives them a Mod Queue screen, and surfaces mod-only UI throughout the app. It is the **parent** of F-48 (the Create Debate button that F-48 maps lives inside the Mod Queue screen that F-47 owns). Expect the feature to cover at minimum:

- The Mod Queue screen itself (`src/arena/arena-mod-queue.ts` based on F-48 cross-refs)
- How a user becomes a moderator (`profiles.is_moderator` is mentioned in F-48 — find the path that sets it)
- How the Mod Queue is entered from the lobby (there's some button or menu item gated by `is_moderator`)
- Any queue of pending debates that moderators can claim (the name "marketplace" suggests a list view of available work)
- Any mod-only UI badges, labels, or indicators rendered elsewhere in the app when `is_moderator` is true
- The polling mechanism on the Mod Queue (F-48 references `stopModQueuePoll()` — there must be a `startModQueuePoll()`)

**You do not know the full shape of F-47 yet.** Discover it by grepping. Start with `arena-mod-queue.ts`, follow imports and callers, and work outward. Check `arena-lobby.ts` for the entry point into Mod Queue. Grep for `is_moderator` across the codebase to find every place moderator status gates behavior.

## User actions to map

You decide. Spec says 2–5 typical, up to 6. Each distinct user action gets its own numbered `##` section with its own sequence diagram. Likely candidates based on what F-47 probably does:

1. User enters the Mod Queue (from lobby, via some entry point)
2. Mod Queue loads and displays available debates or pending work
3. Moderator claims a debate from the queue (if there's a claim action separate from F-48's CREATE DEBATE)
4. Moderator exits / back-button out of the queue
5. (Possibly) how `is_moderator` gets set on a profile in the first place — if this is a user-visible action (e.g. an apply-to-be-moderator button) it's in scope; if it's an admin-only DB flip it is NOT a user action and belongs in Known Quirks instead.

Use your judgment. If you find the feature is actually smaller than 2 user actions, write what's there and note it. If it's larger than 6, split the file — but talk to the spec first before splitting.

**Do NOT duplicate F-48's CREATE DEBATE button flow.** That button is rendered by F-47's Mod Queue but its handler logic belongs to F-48. F-47's diagram of the Mod Queue screen should show the CREATE DEBATE button as a participant with a Note like `"handoff to F-48<br/>see F-48 diagram 1"` and stop there. Do not re-map what F-48 already maps.

## Verification requirements (non-negotiable)

Every single `file.ts:NN` reference you write MUST be verified against the actual repo. Per spec section "Verification requirements":

1. Every path in `files_touched` must be an openable file
2. Every line number must point to a line that actually contains what you say it contains
3. Every RPC name in `rpcs` must exist in a `CREATE FUNCTION` SQL statement OR a `safeRpc('xxx', ...)` call
4. Every table name in `tables` must exist in a `CREATE TABLE` / `SELECT FROM` / `UPDATE` statement
5. Every LM-XXX in `landmines` must exist in `THE-MODERATOR-LAND-MINE-MAP.md`
6. Every F-XX in `depends_on` / cross-references must exist in the punch list

F-48 achieved 60/61 first-pass citation accuracy (98.4%). Target the same or better. If you cite a line and on re-check the line number is wrong, **fix it**, don't leave it stale. If a citation genuinely can't be verified (file moved, function renamed, etc.), either correct it or add the discrepancy to `## Known quirks` with explanation. **Do not silently drop failed verifications.**

## Cross-references to include

At minimum:
- **F-48 Mod-Initiated Debate** — F-47 is the parent; the CREATE DEBATE button that F-48 maps is rendered inside F-47's Mod Queue screen
- **F-01 Queue / Matchmaking** — probably shares the `arena_debates` table and `enterRoom()` flow; verify by grepping
- Any other feature you discover is connected during grepping

Write cross-refs in the spec-v1.1 format: `[F-XX Feature Name](./F-XX-feature-slug.md)` even for files that don't exist yet.

## Known quirks — things to actively look for

The F-48 run surfaced 4 real code issues in its Known Quirks section. That's the payoff of the format. Things to specifically watch for during F-47:

- **Silent error swallowing.** F-48 had `cancelModDebate()` silently catching errors (`arena-mod-debate.ts:264`). F-09 had a similar silent catch fixed in S250. If you see empty `catch` blocks or `catch (e) {}` in F-47's code path, flag them in Known Quirks.
- **Stale doc drift.** F-48 surfaced that the original SQL migration was stale vs the deployed function (round-count-picker-migration.sql overwrote part of it). If you find any RPC whose behavior in the repo SQL file differs from what the TypeScript client expects, flag it.
- **Type-interface mismatches.** F-48's `check_mod_debate` SQL return type was missing fields that the TS interface `ModDebateCheckResult` expected, silently defaulted via `??`. Look for similar mismatches in F-47 RPCs.
- **Missing server notifications on navigation.** F-48's debater LEAVE button navigates away without notifying the server, leaving a ghost debater. If F-47 has any "back out of the Mod Queue" path that should tell the server something but doesn't, flag it.
- **Moderator-gating edge cases.** Grep every `is_moderator` check. If any are client-side-only without a matching server-side check, that's a security-adjacent quirk worth flagging.

## Deliverable

One file: `docs/interaction-maps/F-47-moderator-marketplace.md`

It must:
- Start with the YAML frontmatter block, all 13 required fields populated
- `generated_by: claude-code`
- `last_verified_session: 256`
- Match the exact section structure of F-48 (`# heading`, `## Summary`, `## User actions in this feature`, numbered `## N. Action` sections each with prose + diagram + Notes bullets, `## Cross-references`, `## Known quirks`, optional `## Open questions`)
- Contain one Mermaid `sequenceDiagram` per user action section, sized 6–12 participants and 10–25 arrows (or 3–5 / 3–8 for genuinely trivial actions, per spec)
- Pass all verification rules with every citation openable
- Note the F-48 handoff explicitly — the CREATE DEBATE button shows up as a participant in one of your diagrams but is not re-mapped

## What to do when you finish

When the file is written and self-verified:

1. Report the participant count and arrow count for each diagram
2. Report the total citation count and any that were corrected during verification
3. Report any citations that could not be verified and how you handled them
4. Report the contents of the `## Known quirks` section — list each quirk you surfaced
5. Confirm cross-references are valid (file names match spec's `F-XX-<slug>.md` pattern)
6. Stop. Do not modify any other files. Do not run any tests. Do not commit. Pat will paste the file back to chat-Claude for review and Figma push.

Good luck. The spec carries the memory — trust it.
