# Refactor Prompt — src/reference-arsenal.armory.ts (303 lines → 2 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/reference-arsenal.armory.ts (303 lines).

Read CLAUDE.md first, then read src/reference-arsenal.armory.ts in full before
touching anything. This file is a single-job renderer (the Armory tab) but the
bottom sheet logic (~100 lines) is a self-contained sub-unit that can be extracted.

SPLIT MAP (verify against file before executing):

  src/reference-arsenal.armory.sheet.ts  (~105 lines)
    Keeps: the openSheet and closeSheet inner functions, extracted as named exports.
    openSheet(ref, myId, deps) — needs access to: showToast, escapeHTML, RARITY_COLORS,
    SOURCE_TYPES, CHALLENGE_STATUS_LABELS, powerDisplay, secondReference,
    challengeReference, renderReferenceCard. Pass these as a deps object parameter,
    or import them directly.
    closeSheet() — closes the armory-sheet-backdrop and armory-sheet elements.
    Exports: openSheet, closeSheet
    Imports: all dependencies directly (showToast, escapeHTML, etc.)
    NOTE: openSheet was originally a closure with access to loadCards. This creates
    a circular dep if openSheet imports armory.ts. Solution: pass a reloadFn callback
    parameter to openSheet: openSheet(ref, myId, onReload: () => void).

  src/reference-arsenal.armory.ts  (~200 lines)
    Keeps: ArmoryState interface, rarityCardStyle helper,
            renderArmory (main export) with all its inner logic:
            state setup, container HTML injection, trending shelf,
            loadCards, filter/badge wiring, search wiring
    Removes: openSheet and closeSheet (moved to sheet file)
    Imports: openSheet, closeSheet from ./reference-arsenal.armory.sheet.ts
    Calls openSheet(ref, myId, loadCards) — passing loadCards as the reload callback.
    Keeps: renderLibrary backward-compat alias

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: armory.sheet.ts → armory.ts (sheet has no dep on armory).
- Run npm run build after the split. Report chunk sizes and line counts.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-ARMORY-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
After build passes, commit and push directly to main:
git add -A
git commit -m "refactor: $(basename $(pwd)) split complete"
git push origin HEAD:main
Confirm push succeeded.
```