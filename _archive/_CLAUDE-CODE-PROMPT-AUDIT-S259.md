# CLAUDE CODE PROMPT — S259 COVERAGE AUDIT

**Session:** S259
**Track:** A (Coverage Audit)
**Output:** One gap report markdown file. **Do not create, edit, or patch any interaction maps during this session.**
**Repo:** `wolfe8105/colosseum` on `main`
**Existing maps live at:** `docs/interaction-maps/F-*.md`

---

## WHAT THIS SESSION IS

An audit, not a mapping session. You are producing a **gap report** that answers one question: *what interactive elements exist in the codebase that are not currently captured in any of the 11 existing feature interaction maps?*

The output is exactly one file: `docs/interaction-maps/_AUDIT-S259-GAP-REPORT.md`. Do not create new F-number maps. Do not patch existing maps. Do not refactor. If you find a bug, note it in the report; do not fix it.

---

## FRONT-LOADED RULES — READ BEFORE STARTING

These are the rules the S258 experiment proved need to live in the prompt, not buried in a spec. Treat them as hard constraints.

**R1. Scope of "interactive element."** An interactive element is any DOM node or code location that a user can trigger, or that triggers in response to a user reaching a surface. Specifically:
- `<button>`, `<a href>` (excluding pure external links), `<input>`, `<select>`, `<textarea>`, `<form>`
- Any element with an `onclick`, `onchange`, `onsubmit`, `oninput`, `onkeydown`, `onkeyup`, `onblur`, `onfocus`, `addEventListener(...)` binding
- Any element with a framework event binding (`@click`, `v-on`, `onClick={}`, etc. — check what the repo uses)
- Page-load side effects that fire a fetch/RPC when a surface mounts (these count as "system-on-arrival" interactions and belong in the audit even though no click occurred)
- Modal/dialog open/close triggers
- Keyboard shortcuts registered globally or per-surface

**R2. Scope of "featured."** A file is "featured" if its path appears in the `files_touched` section of any existing `F-*.md` map under `docs/interaction-maps/`. Enumerate these once at the start of the audit by reading every `F-*.md` file and collecting the union of all `files_touched` paths into one set. Reuse that set for the whole audit. **Do not reconstruct it per-element.**

**R3. Scope of "captured."** An interactive element inside a featured file is "captured" if any user action section within the relevant F-map describes a flow that reaches that element. "Reaches" means the element appears in the action's trigger, the sequence diagram, or the prose walkthrough. An element in a featured file that no action reaches is **uncaptured** and belongs in the gap report under category (2).

**R4. Two categories, no others.** The gap report has exactly two gap categories:
- **Category 1 — Unfeatured files.** Interactive elements whose containing file is not in the featured set at all.
- **Category 2 — Uncaptured elements in featured files.** Interactive elements whose file is featured but where no existing map's user action reaches the element.

If you find something that doesn't fit either category, stop and add a note to the report's "Audit anomalies" section at the end. Do not invent a category 3.

**R5. File-level rollup for category 1.** In category 1, group elements by containing file. Do not list 40 buttons in `moderator-settings.html` as 40 separate rows. One row per file, with an element count and a short list of the most prominent elements (5 max per file, truncate with `... (+N more)`).

**R6. Element-level detail for category 2.** In category 2, list every uncaptured element individually — one row per element. These are the precise gaps in existing maps and each one is a candidate map patch.

**R7. Evidence columns are mandatory.** Every row in every category must include:
- A file path (repo-relative, no leading slash)
- A line number or line range
- A one-line description of the element (what it does, not just `<button>`)

Rows missing any of these three fields are invalid. Self-check before writing each row.

**R8. Forbidden characters in report tables.** Markdown table cells must not contain unescaped pipe `|` characters. If an element's description naturally contains one, substitute with the word "or" or rewrite. Also substitute compound operators: `>=` → `at or over`, `<=` → `at or under`, `!==` or `!=` → `is not`, `===` or `==` → `is`. Scan each row as a two-character sequence, not only single characters. This is the S258 `>=` escape lesson applied here.

**R9. No map edits. No code edits.** This session is read-only on everything except `_AUDIT-S259-GAP-REPORT.md`. If you are tempted to patch a map because "it's obviously missing this button," resist — that's Track B's job, and the whole point of the audit is to produce the input to the Track B scoping decision. Patching maps mid-audit corrupts the before-state the audit is measuring.

**R10. Stop at the report.** When the report is written and self-checked, stop. Do not start drafting Track B prompts, do not start patching, do not start mapping. Hand off to chat-Claude for the Step 3 decision.

---

## PROCEDURE

**Phase 1 — Build the featured-file set.**
1. `ls docs/interaction-maps/F-*.md` — enumerate all existing feature maps.
2. For each map, extract the `files_touched` list. Collect into a single deduplicated set. Call this `FEATURED`.
3. Write the `FEATURED` set to a scratch section at the top of the gap report under `## Featured file set (derived)`. This is your ground truth for the rest of the audit.

**Phase 2 — Enumerate interactive elements across the codebase.**
1. Grep for each element class listed in R1 across the repo. Suggested patterns (adapt to the repo's actual stack):
   - `grep -rn '<button' --include='*.html' --include='*.tsx' --include='*.jsx' --include='*.vue'`
   - `grep -rn 'onClick\|onclick\|@click\|addEventListener' --include='*.html' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx'`
   - `grep -rn '<form\|onSubmit\|onsubmit' ...`
   - `grep -rn '<input\|<select\|<textarea' ...`
   - Page-mount fetches: look for `useEffect(() => { ... fetch/rpc ... }, [])`, `onMounted`, `DOMContentLoaded`, top-level script fetches in `.html` files.
2. For each hit, record `(file, line, short_description)`.
3. Exclude node_modules, build output, dist, `.next`, `.nuxt`, any generated folders.
4. Exclude third-party vendored files.
5. Exclude pure external `<a href="https://...">` links to non-app domains.

**Phase 3 — Classify each element.**
For each element from Phase 2:
- If `file not in FEATURED` → Category 1 bucket, grouped by file.
- If `file in FEATURED`:
  - Open the F-maps that list that file in their `files_touched`.
  - Read each relevant map's user action sections. Does any action's trigger, diagram, or prose reach this element?
  - If yes → captured, skip.
  - If no → Category 2 bucket, one row.

**Phase 4 — Write the report.**

Report structure:

```markdown
# S259 COVERAGE AUDIT — GAP REPORT

## Summary
- Featured files: N
- Interactive elements enumerated: N
- Category 1 (unfeatured files): N files containing N elements
- Category 2 (uncaptured elements in featured files): N elements
- Audit anomalies: N

## Featured file set (derived)
[bulleted list of every path in FEATURED, sorted]

## Category 1 — Unfeatured files
[table: file path | element count | prominent elements | notes]

## Category 2 — Uncaptured elements in featured files
[table: file path | line | element description | host map(s) | notes]

## Audit anomalies
[anything that didn't fit R4's two categories, with explanation]

## Methodology notes
- Grep patterns used
- Exclusions applied
- Any files that were ambiguous and how you resolved them
```

**Phase 5 — Self-check before handing off.**

Run these checks explicitly. For each, write PASS or FAIL plus a one-line justification at the bottom of the report under `## Self-check`.

- **SC1.** Every row in Category 1 and Category 2 has a file path, a line or line range, and a description. (Grep the report for rows missing any of the three.)
- **SC2.** Every Category 2 row names at least one host map (the F-map(s) whose `files_touched` includes that file).
- **SC3.** No table cell contains unescaped `|`, `>=`, `<=`, `!==`, `!=`, `===`, `==`. Scan as two-char sequences.
- **SC4.** The `FEATURED` set in the report matches what a fresh `grep -l files_touched docs/interaction-maps/F-*.md` walk would produce. No drift.
- **SC5.** No interaction maps were modified. `git status docs/interaction-maps/F-*.md` shows clean.
- **SC6.** The report exists at exactly `docs/interaction-maps/_AUDIT-S259-GAP-REPORT.md` and nowhere else.

If any self-check is FAIL, fix it before stopping. If you cannot fix it, document the failure in the report and stop anyway — don't paper over it.

---

## WHAT COMES AFTER THIS SESSION

Chat-Claude reads the gap report and makes a call: are the gaps small enough to absorb as patches to existing maps, or large enough to justify launching Track B (surface-first mapping)? Your job ends at the report. The decision is not yours to make and the report should not recommend one path over the other — present the evidence cleanly and let the Step 3 decision be made against clean data.

---

## ONE FINAL REMINDER

The S258 experiment showed that rules in the prompt beat rules in the spec by a wide margin. R1 through R10 above are not suggestions. If you find yourself about to violate one because "it seems fine in this case," that's exactly the failure mode the front-loading is designed to catch. Re-read the rule and comply.

**END OF PROMPT.**
