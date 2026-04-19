# Needs Human Review

Files where Stage 1.5 produced unresolved items will be listed here.

No files in Batch 8R had unresolved Stage 1.5 items.

---

## Batch 8R — Stage 3 needs_review items

### src/reference-arsenal.loadout.ts

**Item 1 — Empty-state message never shown when all entries are frozen** (Medium severity)

`renderLoadoutPicker` checks `arsenal.length === 0` at line 31 using the raw RPC result, before the frozen-entry filter runs at line 41. If the user has references but all are frozen (`challenge_status === 'frozen'`), the early-return path is skipped and `render()` is called on an empty array. The empty-state div (the "add a reference" prompt) is never displayed; instead the user sees a header row and an empty grid. Fix: move the frozen-entry filter to run before the empty check, or add a second `arsenal.length === 0` guard after filtering.

Flagged by: all 5 Stage 3 agents.

---

### src/profile-debate-archive.ts

**Item 1 — `d.winner === undefined` in `_showAddPicker` always evaluates true (TypeScript error + runtime bug)** (High severity)

`_showAddPicker` (line 352) computes `const result = d.winner === undefined ? '' : (d.is_win ? '✅ W' : '❌ L')` where `d: RecentDebate`. The `RecentDebate` interface (lines 39–50) declares no `winner` field. Accessing `d.winner` is a TypeScript type error. At runtime the property is always `undefined`, so `result` is always `''` and the W/L indicator is never rendered in the add-debate picker. Users cannot see which debates they won or lost when choosing what to archive.

Fix options:
- Add `winner: string | null` to the `RecentDebate` interface and change the check to `d.winner === null` (matching `_renderTable`'s logic at line 233), or
- Replace the ternary with `d.is_win ? '✅ W' : '❌ L'` (simpler, uses the field that is actually present).

Flagged by: all 5 Stage 3 agents.

**Item 2 — `getCurrentUser` imported but never called** (Low severity)

`getCurrentUser` is imported at line 10 but not referenced anywhere in the module body. `loadDebateArchive` relies on the caller to pass `isOwner` rather than checking the current user internally. The import is dead code.

Fix: remove the `getCurrentUser` import from line 10, or implement the ownership check internally and remove the `isOwner` parameter.

Flagged by: all 5 Stage 3 agents.

---

## Stage 2 agent errors noted by Stage 3 (not source bugs, but audit record)

- `src/reference-arsenal.loadout.ts` — Stage 2 Agent 03 used "filters in place" language for the frozen-entry filter; the source uses `arsenal = arsenal.filter(...)` which is reassignment to a new array, not mutation. Agents 01, 02, 04, 05 were correct or neutral on this point.
- `src/profile-debate-archive.ts` — Stage 2 Agent 04 described the `update_archive_entry` RPC parameters in `_showEditSheet` as `p_name` and `p_desc`. The source at lines 422–423 uses `p_custom_name` and `p_custom_desc`. Agents 01, 02, 03, and 05 were correct.
