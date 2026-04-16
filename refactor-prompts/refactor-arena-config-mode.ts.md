# Refactor Prompt — src/arena/arena-config-mode.ts (266 lines → 2 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-config-mode.ts (266 lines).

Read CLAUDE.md first, then read src/arena/arena-config-mode.ts in full before
touching anything. This file has two distinct bottom-sheet screens:
  1. Mode select sheet (showModeSelect + closeModeSelect + wireModPicker + loadAvailableModerators)
  2. Category picker sheet (showCategoryPicker)

IMPORTANT PRE-CHECK: After Wave 0-B runs, this file imports roundPickerCSS,
roundPickerHTML, wireRoundPicker from arena-config-settings.ts. Those will move
to arena-config-round-picker.ts. Update that import as part of this refactor.
If Wave 0-B has not run yet, note it as a LANDMINE.

SPLIT MAP (verify against file before executing):

  src/arena/arena-config-mode-select.ts  (~145 lines)
    Keeps: showModeSelect, closeModeSelect, wireModPicker, loadAvailableModerators
    This is the mode/moderator selection bottom sheet.
    Imports: roundPickerCSS, roundPickerHTML, wireRoundPicker from
             './arena-config-round-picker.ts' (after Wave 0-B)
    Imports: showCategoryPicker from ./arena-config-category.ts

  src/arena/arena-config-category.ts  (~110 lines)
    Keeps: showCategoryPicker
    This is the category + rounds picker bottom sheet (shown after mode selection).
    Imports: roundPickerCSS, roundPickerHTML, wireRoundPicker from
             './arena-config-round-picker.ts' (after Wave 0-B)
    Imports: enterQueue from ./arena-queue.ts
    Does NOT import from arena-config-mode-select.ts.

  src/arena/arena-config-mode.ts  (redirect OR delete)
    Check who imports from arena-config-mode.ts (grep for arena-config-mode).
    If only showModeSelect is imported, update those callers to import from
    arena-config-mode-select.ts directly and delete this file.
    If multiple exports are used by different callers, keep a thin re-export file.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: category → mode-select (category has no dep on mode-select).
- Run npm run build after the split. Report chunk sizes and line counts.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-CONFIGMODE-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
```

AFTER BUILD PASSES — commit and push to main:
```
git add -A
git commit -m "refactor: <describe what was split>"
git push origin HEAD:main
```
Confirm the push succeeded before ending the session.
