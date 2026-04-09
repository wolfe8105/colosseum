# THE MODERATOR — MOTHER DOC PREP
### Created: Session 253 (April 9, 2026)

> **What this is:** The prep doc for the Role × Capability Map — the "mother document" that has been the stated end goal of the current phase since Session 243. This file is not the mother doc itself; it's the list of inputs the synthesis will draw from, plus the gating conditions, plus the status flag that says whether every feature in the app is now knowable.
>
> **Why it matters:** The mother doc is a single table with one row per user-facing interaction in the app, each row tied to the role(s) it's available to (guest / signup / debater / moderator / spectator / leader / admin) and the code path that implements it. Once the mother doc exists, any question about "who can do what, and where does that live in code" is a lookup, not an investigation. That's the unlock for build planning, onboarding, test coverage, and any future audit work.

---

## STATUS (as of S253)

**Mother doc is UNBLOCKED.** Every feature in the app is either fully specced or shipped. The three phantom blockers from the unwalked list (F-23 DM/Chat, F-24 Search, F-32 AI Coach) were all crossed off in S253:

- **F-23** walked to full spec. Ready to build. 5 tables + 9 RPCs. Land Mines LM-217/218/219. Standalone, no dependencies.
- **F-24** walked to full spec. Ready to build after F-23 ships. 1 table + 1 column + 3 RPCs + 3 triggers + 1 cron. Land Mines LM-220/221/222/223.
- **F-32** discovered SHIPPED since Session 220. The scoring prompt is at `supabase/functions/ai-sparring/index.ts:67`. Misnamed on the punch list for 30+ sessions ("AI Coach") — the real feature is the 4-criteria AI judge rubric that grades debates in AI Sparring mode. Zero build work required.

**What this means for the synthesis:** no more walking, no more discovery, no more "we don't know what this feature is yet." Every row in the mother doc has a source to pull from. The work is mechanical — open all source docs, join them on feature ID + role, and emit the table.

---

## SOURCE DOCUMENTS FOR THE SYNTHESIS

The mother doc synthesizes the following inputs. All files are in the repo root unless otherwise noted.

### Feature definitions (WHAT exists)
1. **`THE-MODERATOR-FEATURE-SPECS-PENDING.md`** — the canonical spec paragraphs for every fully-walked feature that hasn't shipped yet. As of S253 this is the authoritative spec file for F-04, F-05, F-07, F-08, F-10, F-11, F-16, F-17, F-18, F-23, F-24, F-27, F-28, F-33, F-40 (scratched), F-53, F-54, F-55, F-57, F-58, F-59, and several F-09 audit notes, plus the new `SHIPPED — DOCUMENTED SPEC-ONLY` section containing F-32.
2. **`THE-MODERATOR-NEW-TESTAMENT.md`** — the source-of-truth state doc. Describes shipped infrastructure, existing RPCs, existing tables, existing edge functions, Castle Ring architecture, and any feature-specific notes for shipped features (F-47, F-48, F-51, F-32 status section added S253, etc.).
3. **`THE-MODERATOR-PUNCH-LIST.md`** — the single-source-of-truth list of every open work item. Features section has one row per feature with status emoji + short description + spec pointer. Use as the canonical feature ID list for the mother doc's row keys.
4. **`THE-MODERATOR-PRODUCT-VISION.md`** — the higher-level philosophy and intent document. Useful for resolving role questions where the spec doc is ambiguous about who sees what.

### UI / Role mapping (WHO can do WHAT)
5. **`THE-MODERATOR-UI-INTERACTION-MAP.md`** — the existing map of UI affordances and their role gates. Closest existing document to the mother doc; the synthesis will largely extend and reshape this.
6. **`THE-MODERATOR-USER-GUIDE.md`** — walks through the app from a user's perspective. Useful for resolving "what does a debater actually see on this screen" kinds of questions.
7. **`THE-MODERATOR-WIRING-MANIFEST.md`** — maps UI elements to their backend calls. The join key between "user clicks this" and "this RPC fires."

### Code paths (WHERE it lives)
8. **`THE-MODERATOR-LAND-MINE-MAP.md`** — 223+ documented pitfalls. Referenced per-feature in the mother doc's notes column when a feature has known build-time concerns.
9. **Supabase deployed functions export** — `supabase-deployed-functions-export.sql` (last re-synced S250, 186 functions). The authoritative list of every RPC in production. Mother doc's "code path" column points into this list for each row.
10. **`src/` directory** — the TypeScript client. Mother doc references specific files (`src/arena/arena-room-end.ts`, `src/dm-inbox.ts` once built, etc.) in the code-path column.
11. **`supabase/functions/` directory** — edge functions. Particularly `ai-sparring/index.ts` (F-32 + AI Sparring opponent) and `ai-moderator/index.ts` (reference validator, mis-labeled file).

### Narrative / historical context (only if needed)
12. **`THE-MODERATOR-OLD-TESTAMENT.md`** — deep historical context for pre-S200 decisions. Read only if the synthesis hits an unexplained design choice in one of the shipped features.
13. **`THE-MODERATOR-WAR-CHEST.md`** — go-to-market and business-side context. Useful for the B2B feature rows (F-42, F-43, F-44).

---

## ROLE TAXONOMY

The mother doc's column set. These are the roles that need a Yes/No column per feature row:

- **Guest (`/go`)** — unauthenticated visitor on the landing page or the guest AI Sparring flow. No DB write access, no persistent state.
- **Signup-in-progress** — user who has started but not completed Plinko onboarding. Limited surface.
- **Debater** — authenticated user, has completed Plinko, is the current combatant in a debate.
- **Moderator** — authenticated user acting as the mod in a live debate (has tapped the toggle, has a debate assigned).
- **Spectator** — authenticated user watching a live or replayed debate.
- **Voter / Staker / Tipper** — authenticated user interacting with a debate's prediction / sentiment surfaces (F-09 / F-58).
- **Group Member** — authenticated user who has joined a group (regular member).
- **Group Leader** — authenticated user with leader rights on a group (F-16 / F-17 / F-18 gate here).
- **Profile Owner** — authenticated user looking at their own profile (settings, archive, invite rewards).
- **Profile Visitor** — authenticated user looking at someone else's profile.
- **Admin** — Pat, with SQL editor access. Not a role inside the app, but some RPCs are admin-only and need representation.
- **AI (Sparring opponent + AI judge)** — not a user role but worth its own column because some code paths are "only fires when the opponent is AI" or "only fires when the mod is AI" (F-32 scorecard path).

Adjust this list during synthesis if new roles surface. The goal is that every user-facing interaction in the app has a clear answer for every role.

---

## ROW STRUCTURE (target shape)

Each row in the final mother doc will have:

| Feature ID | Capability | Guest | Signup | Debater | Mod | Spectator | Voter | Group Mem | Group Lead | Profile Own | Profile Vis | Admin | AI | Code Path | LM refs | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

- **Feature ID** — F-XX from the punch list.
- **Capability** — one-line description of the specific interaction (one feature may have multiple rows if it has multiple distinct capabilities — e.g., F-23 has `send_dm`, `read_inbox`, `block_user`, `report_message`, `delete_message` as separate rows).
- **Role columns** — ✅ / ❌ / 🟡 (conditional, note in Notes column).
- **Code path** — primary file/line pointer (`src/arena/arena-room-end.ts:253`) or RPC name (`send_dm`).
- **LM refs** — comma-separated list of relevant LM-XXX numbers.
- **Notes** — anything that doesn't fit in the role columns (rate limits, conditional gating, feature flags, etc.).

---

## SYNTHESIS GATING

**Do NOT start the synthesis until:**

- [x] All unwalked features walked (S253).
- [x] All shipped-but-undocumented features documented (F-32 in S253).
- [x] Pending spec file contains a paragraph for every non-shipped feature (S253).
- [x] Punch list F-23 / F-24 / F-32 rows updated to reflect reality (S254 doc sweep).
- [x] Land Mine Map contains LM-217 through LM-223 (S254 doc sweep).
- [x] New Testament has F-23 / F-24 / F-32 status section (S254 doc sweep).
- [x] This file exists (S254 doc sweep).

As of the S254 doc sweep, **all gates are green.** Synthesis can begin.

---

## RECOMMENDED SYNTHESIS APPROACH

1. **Start from the Punch List** — it's the canonical feature ID list. Emit one row per feature ID first, then expand features with multiple capabilities into multiple rows.
2. **Cross-reference the Pending Specs and NT** — fill in the role columns and code paths.
3. **Use the UI Interaction Map as a tie-breaker** — when the spec is ambiguous about which role sees a surface, the UI map usually resolves it.
4. **Skim the Wiring Manifest for RPC names** — populates the code-path column for the RPC-backed rows.
5. **Pull LM numbers from the Land Mine Map** — for each feature, scan the LM map for entries tagged to that feature and list them in the LM refs column.
6. **Flag ambiguities** — if a role answer is genuinely unclear, mark it with 🟡 and a note explaining what needs to be decided. Do NOT guess.

Expected session budget: **1-2 sessions.** Pure mechanical join work, no walking required.

---

## OUTPUT FILE

The mother doc itself will be `THE-MODERATOR-ROLE-CAPABILITY-MAP.md` (working title — Pat may rename). It replaces the UI Interaction Map's role-tracking function, which can either be folded into the mother doc or kept as a companion document covering pure UI layout separately.

---

*For the S253 walk-close context that produced this prep file, see the S253 handoff document.*
