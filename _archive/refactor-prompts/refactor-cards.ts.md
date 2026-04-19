# Refactor Prompt — src/cards.ts (343 lines → 3 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/cards.ts (343 lines).

Read CLAUDE.md first, then read src/cards.ts in full before touching anything.
This module generates Canvas-based debate result cards for social sharing in
four sizes. It has three separable layers: type definitions + constants,
private drawing helpers, and the public card generation + sharing API.

SPLIT MAP (verify against file before executing):

  src/cards.types.ts  (~45 lines)
    Keeps: CardSize type alias, CardDimensions interface,
            GenerateCardOptions interface, SIZES constant, COLORS constant,
            CANVAS_FONT constant, the document.fonts.load preload calls
    These are the data shapes and static config for the module.
    Imports: nothing

  src/cards.helpers.ts  (~55 lines)
    Keeps: truncLabel, roundRect, wrapText, validateSize, VALID_SIZES
    These are private drawing helpers used only within cards.ts.
    Imports: import type { CardSize } from './cards.types.ts'
    Imports: SIZES, VALID_SIZES from './cards.types.ts'

  src/cards.ts  (orchestrator, ~245 lines)
    Keeps: generateCard, downloadCard, shareCard, ModeratorCards export bridge
    These are the public API — the functions callers actually use.
    Removes: type definitions and helpers (now in their own files)
    Imports: import type { CardSize, CardDimensions, GenerateCardOptions }
             from './cards.types.ts'
    Imports: SIZES, COLORS, CANVAS_FONT from './cards.types.ts'
    Imports: truncLabel, roundRect, wrapText, validateSize from './cards.helpers.ts'
    Re-exports: import type { CardSize, CardDimensions, GenerateCardOptions }
               from './cards.types.ts' (preserves existing import paths)

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: cards.types.ts → cards.helpers.ts → cards.ts.
  helpers imports types. cards imports both.
- Run npm run build after the split. Report chunk sizes and line counts for
  each new file.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-CARDS-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
After build passes, commit and push directly to main:
git add -A
git commit -m "refactor: $(basename $(pwd)) split complete"
git push origin HEAD:main
Confirm push succeeded.
```