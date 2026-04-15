# Refactor Prompt — arena-entrance.ts (496 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-entrance.ts (496 lines).

Read CLAUDE.md first, then read src/arena/arena-entrance.ts in full before touching anything. The file is the Arena Entrance Sequence — CSS injection (~295 lines), tier detection, and 3 tier-specific entrance render functions plus the main playEntranceSequence orchestrator.

SPLIT MAP (verify against the file before executing):

1. arena-entrance.ts (orchestrator, ~45 lines)
   Keeps: playEntranceSequence export, _getTier helper, all imports. Calls _injectCSS from css file and render functions from render file. Imports escapeHTML from config.ts to replace the local _esc helper.

2. arena-entrance-css.ts (~295 lines)
   The _injectCSS function in full. The CSS block is ~285 lines of entrance animation styles. Exports _injectCSS only. Follows the arena-css.ts naming pattern already established in the codebase.

3. arena-entrance-render.ts (~110 lines)
   _renderTier1, _renderTier2, _renderTier3. The three tier-specific HTML builders. Replace all _esc(...) calls with escapeHTML from config.ts — the local helper is a weaker duplicate (missing apostrophe, see LM-ENT-001).

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (CurrentDebate).
- Replace all _esc(...) calls in arena-entrance-render.ts with escapeHTML imported from config.ts. The local _esc helper is deleted — it is a weaker version of the project standard (missing apostrophe escape) and has no callers outside this file.
- Dependency direction: orchestrator imports css and render. No cross-imports between css and render.
- Target under 300 lines per file. css.ts at ~295 is acceptable — pure CSS.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in arena-entrance* files.

LANDMINES — log these as // LANDMINE [LM-ENT-NNN]: description comments. Do NOT fix them:

- LM-ENT-001 (fixed during refactor — do NOT log as landmine): The local _esc helper was weaker than escapeHTML. It is being replaced by the project standard as part of this refactor. No landmine comment needed.

- LM-ENT-002 (in arena-entrance.ts at playEntranceSequence tier 3 branch): The second playSound call is scheduled via setTimeout(..., 600) outside the function's try/catch scope. Already flagged as L-O2 and fixed in Prompt 5 (fix(memory) commit). Verify the fix is present before splitting — if not, apply it as part of this refactor.

Do NOT fix other landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
