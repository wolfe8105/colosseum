# Interaction Map Format Spec
### Version: 1.0 (Session 255 draft)

This document defines the machine-readable format for per-feature interaction maps in `docs/interaction-maps/`. Every file in that directory (except this spec and `README.md`) MUST conform. The format is designed to be:

1. **Queryable** — a future Claude session or script can parse the YAML frontmatter deterministically without reading prose.
2. **Verifiable** — every code citation points to a real file and line range that can be checked against the current repo.
3. **Durable** — includes a `last_verified_session` field so staleness is explicit, not guessed.
4. **Human-readable** — the prose and Mermaid diagrams under the frontmatter are for humans looking at the file directly; the frontmatter is for machines.

---

## File naming

`F-XX-<kebab-case-slug>.md` — e.g. `F-48-mod-initiated-debate.md`, `F-49-go-guest-sparring.md`.

One file per feature ID from the punch list. Scratched features (F-13, F-34, F-40, etc.) do NOT get files. Shipped, specced-not-built, and in-progress features all get files.

---

## Required YAML frontmatter schema

Every file MUST begin with a YAML block delimited by `---` on its own line top and bottom. Fields below are REQUIRED unless marked optional. Lists that have no entries MUST be written as empty arrays `[]`, never omitted.

```yaml
---
feature_id: F-48                       # string, F-XX format, required
feature_name: "Mod-Initiated Debate"   # string, required, matches punch list
status: shipped                        # enum: shipped | specced | specced_not_built | in_progress | scratched | parked
shipped_session: 210                   # integer or null; session number when shipped (null if not shipped)
last_verified_session: 255             # integer, required; session number of last code-against-doc check

# All paths relative to repo root. Real files only. Verified to exist at time of write.
files_touched:
  - src/arena/arena-mod-debate.ts
  - F48-MOD-INITIATED-DEBATE.sql

# RPC names called by the client code of this feature. Sql-function names, not client wrappers.
rpcs:
  - create_mod_debate
  - join_mod_debate
  - check_mod_debate
  - cancel_mod_debate

# Postgres tables read/written by this feature's code path. Include the RPCs' effects.
tables:
  - arena_debates

# External APIs or third-party services called (Anthropic, Groq, Stripe, Deepgram, etc.)
external_services: []

# Feature IDs this feature requires to be present. Use punch list IDs.
depends_on:
  - F-46   # Private lobby infrastructure (join code mechanism)
  - F-47   # Moderator marketplace (entry point)

# Feature IDs that require this feature. Reverse of depends_on, filled at write time.
depended_on_by: []

# LM-XXX references from THE-MODERATOR-LAND-MINE-MAP.md relevant to this feature.
landmines: []

# Punch list row line number in THE-MODERATOR-PUNCH-LIST.md as of last_verified_session.
# Used for fast round-trip to source-of-truth status.
punch_list_row: 77

# Author of this version of the map. "claude-code" or "chat-claude".
generated_by: claude-code
---
```

**Field rules Claude Code MUST follow:**

- `feature_id` — pull from the punch list. No invention.
- `feature_name` — exact match to the punch list Feature column. No rewording.
- `status` — one of the six enum values, lowercase with underscores. `specced_not_built` means a spec exists in `THE-MODERATOR-FEATURE-SPECS-PENDING.md` but no code has been written. `in_progress` means some code exists but the punch list row isn't marked ✅.
- `shipped_session` — null if status != shipped. Integer otherwise, grep from the punch list Notes column or the relevant `SESSION-XXX-*` file.
- `last_verified_session` — the CURRENT session when this file is being written. For the exemplar Claude Code run, this will be 255.
- `files_touched` — every file Claude Code actually grepped or read while building this map. Verified to exist. Repo-relative paths. Sorted alphabetically. Include the SQL migration file if one exists.
- `rpcs` — exact SQL function names as they appear in `CREATE FUNCTION` statements or `safeRpc('xxx', ...)` calls. Deduped. Sorted alphabetically.
- `tables` — Postgres table names. No schema prefix unless non-public. Sorted alphabetically.
- `external_services` — short identifiers: `anthropic_api`, `groq_api`, `stripe`, `deepgram`, `supabase_realtime`, `supabase_storage`, `resend`. Empty array if none.
- `depends_on` — features that must exist for this one to work. Read the spec file or code comments if ambiguous; do NOT guess. If genuinely unclear, leave empty and note it in `## Open questions` at the bottom of the file.
- `depended_on_by` — fill with the best-effort list based on grepping other features' specs. Safe to leave `[]` on the first pass; Claude Code will do a reverse-link pass later.
- `landmines` — grep `THE-MODERATOR-LAND-MINE-MAP.md` for the feature ID and for file paths in `files_touched`. Include any LM-XXX entries that match. Verify each match is actually relevant before including.
- `punch_list_row` — `grep -n` the feature_id in `THE-MODERATOR-PUNCH-LIST.md`, take the line number of the row header.
- `generated_by` — `claude-code` when Claude Code writes it; `chat-claude` when chat-Claude writes it directly (as happened for F-49).

---

## Required markdown body structure

After the frontmatter, the file MUST contain the following sections in this order. Extra sections MAY be added at the end.

### `# F-XX — <Feature Name> — Interaction Map`

Top-level heading, matches frontmatter `feature_id` and `feature_name`.

### `## Summary`

One paragraph, 3-6 sentences. Plain English answer to: "What does this feature do, what code implements it, and what should a future reader know before diving in?" No marketing. Include known discrepancies between the punch list and the code (like the Groq → Claude drift in F-49).

### `## User actions in this feature`

Numbered list of distinct user interactions. Each interaction gets its own diagram section below. Typical feature has 2-5 actions. If a feature has more than 6 distinct actions, consider splitting it across multiple files.

### `## 1. <Action name>`, `## 2. <Action name>`, ...

One section per user action. Each section contains:

1. **1-2 paragraphs of prose** explaining the trigger, the files involved, and the state mutations. Reference file:line for every claim. Example: *"The Create button lives in `arena-mod-debate.ts:73` and fires `createModDebate()` at `arena-mod-debate.ts:88` on click."*

2. **A Mermaid `sequenceDiagram` code block** at the fidelity level specified below.

3. **A `**Notes:**` bullet list** covering disabled-state logic, error paths, quirks, and anything that wouldn't fit in the diagram. Every bullet must cite file:line.

### `## Cross-references`

Bullet list of related features. Each bullet links to another interaction map file by relative path (e.g. `[F-46 Private Lobby](./F-46-private-lobby.md)`) even if that file doesn't exist yet — the link will resolve when that file is generated.

### `## Known quirks`

Bullet list of things that are weird or stale. Doc drift, filename confusions, missing tests, CORS lockdowns, anything a future session might trip over. Every bullet must cite file:line if it references code.

### `## Open questions` (OPTIONAL)

If Claude Code encountered ambiguity it couldn't resolve (e.g. can't tell if a dependency is real), list the questions here. Empty section means Claude Code was confident about everything; omit the section entirely in that case.

---

## Mermaid diagram fidelity rules

Each `## <N>. <Action>` section contains exactly ONE `sequenceDiagram` block. The diagrams are the primary artifact — everything else is context for them. Fidelity level is **mid-to-high**: function-level, not line-level, but each major function call in the trace is its own arrow.

**Required elements:**

- An `actor` for `User` on the left (for user-triggered actions). For auto-triggered actions (like F-49's verdict), start with the function that triggered it.
- A `participant` for each distinct piece of code: UI element, client handler function, RPC, table, external API. Use `as` aliases with the file:line annotation in the alias text. Example: `participant CreateFn as "createModDebate()<br/>arena-mod-debate.ts:88"`.
- Arrows `->>` for synchronous calls, `-->>` for responses or async returns.
- A `Note over <Participant>: "..."` block for any button or element with non-trivial enable/disable logic. This is the "why is this greyed out" answer and it's the whole point of the format from the user's perspective.
- `alt` / `else` blocks for branching logic that affects what the user sees (e.g. round < total vs round === total).
- A `Note over` block on the final participant describing the user-visible outcome OR the next action's entry point.

**Forbidden:**

- Literal backticks inside Note text or participant labels (the Mermaid parser chokes — use plain words or HTML entities).
- Code fence triple-backticks inside diagram text.
- Participants without file:line annotations (except `User` and database tables).
- Diagrams that combine multiple user actions into one mega-trace. Split them.

**Participant label format:**

```
participant AliasName as "Function or element name<br/>file-path:line-number"
```

Example:
```
participant CreateFn as "createModDebate()<br/>arena-mod-debate.ts:88"
participant Table as "arena_debates table"
```

**Sizing target:**

Each diagram should have **6-12 participants** and **10-25 message arrows**. If you're exceeding those counts, split the action. If you're below, the action is probably trivial and can be described in a Notes bullet of a larger diagram instead.

---

## Verification requirements

Every citation in the file (frontmatter `files_touched`, `rpcs`, `tables`; prose `file.ts:NN` refs; participant labels) MUST be verified against the actual repo at time of write. Specifically:

1. **File existence:** every path in `files_touched` and every file referenced in prose MUST be openable. Fail loudly if not.
2. **Line numbers:** every `file.ts:NN` reference MUST point to a line that actually contains the function, element, or logic being described. If the function starts on line 88 but the reference says 87, fix it.
3. **RPC names:** every name in `rpcs` MUST appear either in a `CREATE FUNCTION` statement in a `.sql` file OR in a `safeRpc('xxx', ...)` call in a `.ts`/`.js` file. Prefer the SQL source as canonical.
4. **Table names:** every name in `tables` MUST appear in a `CREATE TABLE`, `ALTER TABLE`, `INSERT INTO`, `UPDATE`, `SELECT FROM`, or similar statement somewhere in the repo.
5. **Landmine references:** every LM-XXX in `landmines` MUST exist in `THE-MODERATOR-LAND-MINE-MAP.md`. Do not invent LM numbers.
6. **Feature IDs:** every F-XX in `depends_on` / `depended_on_by` / cross-references MUST exist in the punch list.

If verification fails on any item, Claude Code should either (a) correct the reference and re-verify, or (b) add the discrepancy to the `## Known quirks` or `## Open questions` section and proceed. Do NOT silently drop failed verifications.

---

## Example files

- `F-49-go-guest-sparring.md` — exists in this directory as of S255. Was hand-written by chat-Claude BEFORE this spec existed, so it does NOT have the YAML frontmatter. It's the "before" version and will be retrofitted to the spec later. Use it as a fidelity reference for the diagrams only.

- `F-48-mod-initiated-debate.md` — will be the FIRST spec-compliant file. Generated by Claude Code using the prompt in session 255. Serves as the canonical exemplar for all future feature maps.

---

## Future: additional fields that may be added in v1.1+

These are NOT required in v1.0 but are being flagged for consideration in future versions:

- `migration_files: []` — explicit list of `.sql` migration files vs general SQL files
- `test_files: []` — paths to the feature's test files
- `figma_diagram_urls: []` — URLs to FigJam canvases for this feature (generated by chat-Claude after Claude Code writes the markdown)
- `build_sessions: []` — list of session numbers where significant work happened on this feature
- `complexity_score` — integer 1-5 indicating how hard this feature is to modify safely

Do not add these fields in v1.0. They're here as a note to future-self.
