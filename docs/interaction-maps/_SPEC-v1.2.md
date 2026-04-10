# Interaction Map Format Spec
### Version: 1.2 (Session 256)
### v1.2 changelog: ALWAYS ENABLED/VISIBLE rule made mandatory with blunter enforcement language; forbidden-character rule scope expanded to cover all text inside sequenceDiagram blocks (alt/else conditions, message labels, Note text, participant aliases). See bottom of file for amendment notes.
### v1.1 changelog: special-character rule for Mermaid labels, ALWAYS ENABLED/VISIBLE note rule, nested alt blocks explicitly allowed.

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
- **MANDATORY BUTTON NOTE RULE (v1.2):** Every button, input, card, or other clickable/interactive element that appears as a participant in a sequenceDiagram MUST have an adjacent `Note over <Participant>: "..."` block. NO EXCEPTIONS. A missing Note is a spec violation, not a style choice. This rule applies whether or not the element has disabled-state logic:
  - If the element HAS non-trivial enable/disable logic, the Note describes it. This is the "why is this greyed out" answer and it's the whole point of the format from the user's perspective.
  - If the element has NO disabled-state logic, the Note still exists and explicitly states so — use `"ALWAYS ENABLED"`, `"ALWAYS VISIBLE"`, or `"NO DISABLED-STATE LOGIC"` as appropriate. The absence of complexity is itself a useful claim; readers must not have to wonder whether an omitted Note means "no logic" or "forgot to document."
  - Self-check before writing each diagram: count every `participant` that represents a button/input/card. Count the `Note over` blocks targeting those participants. The two counts MUST be equal. If they aren't, the diagram is non-compliant.
  - (Strengthened v1.2 after F-46 and F-01 bulk-run drafts both dropped the rule. v1.1's softer phrasing did not survive bulk-run context pressure.)
- `alt` / `else` blocks for branching logic that affects what the user sees (e.g. round < total vs round === total). **Nested `alt` blocks are explicitly allowed and encouraged** for compound branching (e.g. an outer alt on "is anyone matched yet" with an inner alt on "am I the moderator or the debater"). The Mermaid parser handles nesting cleanly and the readability gain on complex branching is worth it. (Clarified v1.1.)
- A `Note over` block on the final participant describing the user-visible outcome OR the next action's entry point.

**Forbidden / escaped characters inside sequenceDiagram blocks (v1.2 expanded scope):**

The Mermaid sequence diagram parser (specifically the one used by the Figma MCP integration that renders these) is fragile around several characters. **These rules apply to ALL text inside a `sequenceDiagram` code block**, including: participant aliases, message labels (text after arrow colons), `alt` / `else` / `loop` / `opt` condition text, Note text, and any other string the parser encounters. Do not assume a rule scoped to "Note text" is safe in alt conditions — the parser has the same sensitivity everywhere inside the block. (Scope expanded v1.2 after F-01 surfaced violations in alt conditions and message labels that v1.1's "Note text" phrasing did not explicitly forbid.)

- **Literal backticks** — NEVER use them in Note text, participant labels, or message text. The parser interprets them as code fences and crashes. Use plain words instead (e.g. "JSON string" not "`JSON`", "strip code fences" not "strip \`\`\`json\`\`\`").
- **Ampersand `&`** — replace with the word "and" anywhere inside a sequenceDiagram block (participant labels, message text, Note text, alt conditions — all of it). Example: write `"CREATE and GET CODE button"` not `"CREATE & GET CODE button"`. The ampersand can be used freely in prose and markdown outside of diagram blocks.
- **Angle brackets `<` and `>`** — only allowed as part of `<br/>` line breaks inside quoted label strings. Never as literal comparison operators anywhere inside a sequenceDiagram block — this includes alt conditions and message labels, not just Note text. Use the words "less than" / "greater than" / "not equal" / "at or over" / "at or under" instead. Examples: write `"status not matched"` not `"status !== matched"`; write `alt profile less than 25 percent` not `alt profile < 25%`; write `"queueSeconds at or over 180"` not `"queueSeconds >= 180"`. (Scope clarified v1.2 after F-01 draft used `<` in an alt condition and `>=` in a message label, both of which v1.1's "Note text"-scoped phrasing did not explicitly forbid.)
- **Double quotes inside any diagram text** — avoid. This includes nested double quotes in participant alias labels (which are themselves wrapped in double quotes), empty-string literals like `""` in message text, and quoted strings inside alt conditions. If you must refer to a quoted string or an empty string, use single quotes, describe it in words, or rewrite the reference. Examples: write `"enterQueue(ai, empty topic)"` not `"enterQueue(ai, \"\")"`; write `"status is matched"` not `"status === \"matched\""`. (Scope clarified v1.2 after F-01 draft used `""` as an empty-string literal inside message text.)
- **Triple backtick code fences** — NEVER inside diagram blocks. The diagram itself lives inside a code fence; a nested fence terminates it prematurely.
- **Colons inside Note text** — generally safe, but avoid `::` sequences and avoid colons at the very start of a Note line, both of which the parser can misread as separator tokens.

Participants without file:line annotations are forbidden except for `User` (always an `actor`) and database tables (which use the form `"<table_name> table"` with no line number).

(Expanded v1.1 after F-48 exemplar run surfaced the `&` and `!==` cases. Scope expanded further in v1.2 after F-01 bulk-run draft surfaced `<` in alt conditions, `>=` in message labels, and `""` nested empty-string quotes in message text — all cases v1.1's "Note text"-scoped phrasing did not explicitly forbid.)

**Participant label format:**

```
participant AliasName as "Function or element name<br/>file-path:line-number"
```

Example:
```
participant CreateFn as "createModDebate()<br/>arena-mod-debate.ts:88"
participant Table as "arena_debates table"
```

**Sizing and scope:**

- Each `## <N>. <Action>` section contains exactly ONE `sequenceDiagram` block.
- Do NOT combine multiple user actions into one mega-trace. Split them into separate sections.
- Sizing target per diagram: 6-12 participants and 10-25 message arrows.
- Trivially short actions (e.g. "tap button → open picker") may have 3-5 participants and 3-8 arrows. That is fine as long as the action is genuinely standalone (a distinct user interaction worth documenting). Do NOT pad a trivial diagram to hit the 6-participant floor.
- Oversized diagrams (more than 12 participants or more than 25 arrows) should be split into multiple actions.

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

- **`F-48-mod-initiated-debate.md`** — the **original canonical exemplar**. Produced by Claude Code under the spec v1.0 prompt in session 255. Conforms to the full YAML frontmatter schema, has 5 diagrams at the target fidelity level, uses nested `alt` blocks, demonstrates the `ALWAYS ENABLED`/`ALWAYS VISIBLE` Note pattern, and surfaced 4 real code quirks in Known Quirks.

- **`F-47-moderator-marketplace.md`** — the **second canonical exemplar**. Produced by Claude Code under the spec v1.1 prompt in session 256. First feature mapped under v1.1 and first bulk-workflow-ready exemplar. Passed spec review on first draft with zero deviations. Demonstrates the format holding up under a different feature shape than F-48 (sprawling parent feature with 5 disparate actions, cross-ref handoffs to child features). **Use both F-48 and F-47 as references when producing new maps** — F-48 for tightly-scoped single-purpose features, F-47 for sprawling multi-action features.

- `F-49-go-guest-sparring.md` — a pre-spec hand-written file by chat-Claude. Does NOT have the YAML frontmatter (predates the spec). Useful only as a secondary fidelity reference for the Mermaid diagrams themselves. Will be retrofitted to the spec in a later session.

- `F-46-private-lobby.md` and `F-01-queue-matchmaking.md` — produced by Claude Code under the v1.1 bulk prompt in session 256. Both shipped with spec-compliance gaps (missing `ALWAYS ENABLED` Notes; F-01 additionally has forbidden-character violations in alt conditions and message labels). **Do NOT use as format references** — they are pending v1.2 compliance patches. The gaps they surfaced drove the v1.2 amendments in this spec.

---

## Future: additional fields that may be added in v1.3+

These are NOT required in v1.2 but are being flagged for consideration in future versions:

- `migration_files: []` — explicit list of `.sql` migration files vs general SQL files
- `test_files: []` — paths to the feature's test files
- `figma_diagram_urls: []` — URLs to FigJam canvases for this feature (generated by chat-Claude after Claude Code writes the markdown)
- `build_sessions: []` — list of session numbers where significant work happened on this feature
- `complexity_score` — integer 1-5 indicating how hard this feature is to modify safely

Do not add these fields in v1.2. They're here as a note to future-self.

---

## v1.1 amendment notes (Session 255)

After the F-48 exemplar run, three amendments were applied to v1.0:

1. **Special character rule expanded.** The old "forbidden characters" bullet listed only backticks and code fences. F-48 surfaced that `&` breaks the parser inside participant labels, and `<`/`>` as comparison operators also break it. v1.1 lists all the affected characters explicitly with substitution guidance (`&` → `and`, `!==` → `not`, etc.).

2. **ALWAYS ENABLED / ALWAYS VISIBLE Note rule added.** v1.0 required a Note over buttons with disabled-state logic but said nothing about buttons without it. Claude Code correctly inferred the right behavior on F-48 (adding explicit "ALWAYS ENABLED" notes on the CREATE & GET CODE button and the CANCEL button) but the spec should pin this down so future runs don't have to guess. The rule is now: if a button has no disabled-state logic, still add a Note saying so explicitly. Absence of complexity is itself a useful claim.

3. **Nested `alt` blocks explicitly allowed.** v1.0 mentioned `alt`/`else` but said nothing about nesting. F-48's diagram 4 used a nested alt (outer: "is anyone matched yet", inner: "am I the moderator or the debater") and it rendered cleanly. v1.1 explicitly encourages this pattern for compound branching.

Claude Code running under v1.1 on subsequent features should produce output that is format-identical to F-48 modulo genuine feature differences. If a v1.1 run produces something that differs *structurally* from F-48, that's a spec gap and should be flagged.

---

## v1.2 amendment notes (Session 256)

After the S256 bulk run produced five files (F-47 single-run clean, then F-01 + F-46 + three CC-selected in a single bulk run), review surfaced two spec gaps that v1.1 did not adequately protect against under bulk-run context pressure. F-47 (mapped under v1.1 as a single-feature run) passed clean. F-46 and F-01 (mapped under v1.1 as part of the bulk run) both dropped rules that F-47 had followed cleanly. The gaps are not ambiguity in the spec — v1.1 technically covered both cases — but the phrasing was soft enough that CC deprioritized the rules when juggling 5 features in one context. v1.2 hardens the phrasing.

1. **Mandatory Button Note rule strengthened.** v1.1 said buttons with no disabled-state logic "STILL include a Note stating this explicitly." That phrasing was followed by F-48 (the v1.0/v1.1 exemplar) and F-47 (the first v1.1 run) but dropped by F-46 and F-01 in the bulk run. v1.2 rewrites the rule as: "Every button, input, card, or other clickable/interactive element that appears as a participant in a sequenceDiagram MUST have an adjacent Note over block. NO EXCEPTIONS. A missing Note is a spec violation, not a style choice." Also adds an explicit self-check: count interactive-element participants, count Note over blocks targeting them, the counts must match. The blunter language and the self-check together should make the rule hard to drop under context pressure.

2. **Forbidden-character rule scope expanded.** v1.1 phrased the rule as applying to "participant labels and Note text" and listed violations in terms of "Note text." F-01's draft used `<` as a comparison operator in an `alt` condition and `>=` in a message label, neither of which is strictly "Note text." The violations rendered incorrectly in Figma. v1.2 rewrites the rule's scope paragraph to explicitly cover: participant aliases, message labels (text after arrow colons), alt/else/loop/opt condition text, and Note text — in other words, ALL text inside a sequenceDiagram block. Individual character rules (backticks, `&`, `<`/`>`, nested double quotes) are updated to use the broader scope language. Example violations from F-01 are cited inline in the rule bullets so future CC runs can pattern-match against them.

**Files requiring v1.2 compliance patches** (deferred from S256, queued for S257):

- `F-46-private-lobby.md` — add ~5 missing `ALWAYS ENABLED` / `ALWAYS VISIBLE` Notes across diagrams 1, 2, 4, 5
- `F-01-queue-matchmaking.md` — add `ALWAYS ENABLED` Notes across all 5 diagrams (~7 buttons affected); substitute forbidden characters in diagrams 1 (`profile < 25%`), 4 (`enterQueue(ai, "")`), and 5 (`queueSeconds >= 180`, `enterQueue(ai, "")`)

F-47 and F-48 are v1.2-compliant as written — no retrofit needed. F-49 remains pre-spec and still awaits its full v1.1/v1.2 retrofit in a later session.

**Expectation for v1.2 runs:** Claude Code running under v1.2 on subsequent features should produce output that is format-identical to F-47 or F-48 modulo genuine feature differences. If a v1.2 run produces something that differs structurally from either exemplar, or drops the Mandatory Button Note rule, that's a spec gap and should be flagged as a v1.3 candidate.
