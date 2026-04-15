# Refactor Prompt — profile-debate-archive.ts (521 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/profile-debate-archive.ts (521 lines).

Read CLAUDE.md first, then read src/profile-debate-archive.ts in full before touching anything. The file is the F-53 Debate Archive — a filterable spreadsheet-style table of a user's past debates with owner edit/add/hide actions.

SPLIT MAP (verify against the file before executing):

1. profile-debate-archive.ts (orchestrator, ~45 lines)
   Keeps: module-level state (_entries, _filterCat, _filterResult, _filterSearch, _isOwner, _cssInjected), the two public entry points (loadDebateArchive, loadPublicDebateArchive), and _loadAndRender. Imports all sub-modules.

2. profile-debate-archive.css.ts (~100 lines)
   The _injectCSS function in full. The CSS injection block is ~90 lines of style rules. Exports _injectCSS only.

3. profile-debate-archive.filter.ts (~30 lines)
   _filtered function (the filter predicate logic), _archiveUrl helper. Pure functions with no DOM dependency.

4. profile-debate-archive.render.ts (~110 lines)
   _renderTable, _wireTable. Builds the table HTML and wires search/filter chips/row clicks/owner action buttons. Imports from filter.ts.

5. profile-debate-archive.picker.ts (~65 lines)
   _showAddPicker. The bottom sheet for adding a debate from recent debates. Overlay build, RPC call, row wiring.

6. profile-debate-archive.edit.ts (~100 lines)
   _showEditSheet, _toggleHide, _removeEntry. Owner-only mutation actions and their overlays.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (ArchiveEntry, RecentDebate).
- Dependency direction: orchestrator imports render, picker, edit, css. render imports filter. picker and edit are standalone leaf modules. No cross-imports between picker/edit/render.
- Target under 120 lines per file. render.ts at ~110 is acceptable.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in profile-debate-archive* files.

LANDMINES — log these as // LANDMINE [LM-DBA-NNN]: description comments. Do NOT fix them:

- LM-DBA-001 (in profile-debate-archive.css.ts, .dba-badge.win rule): win badge hardcodes color: #16c784 — no CSS var token exists for this green. TODO comment already present in source. Tracked in hex-color sweep.

- LM-DBA-002 (in profile-debate-archive.edit.ts at _showEditSheet save handler): Save button is disabled before the RPC but re-enabled only on the error branch (saveBtn.disabled = false after the error toast). Success path calls overlay.remove() which removes the button from DOM — the button is never explicitly re-enabled. If overlay.remove() is ever called async or the DOM is reused, the button stays disabled permanently. Follows the disable-button-no-finally pattern.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
