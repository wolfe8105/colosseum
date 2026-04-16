# Wave 0-A — Extract arena-core.utils.ts (breaks 4 circular deps)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-core.ts to break four circular dependencies.

PROBLEM: arena-core.ts exports 4 pure utility functions (isPlaceholder,
formatTimer, randomFrom, pushArenaState). Multiple sibling arena files import
these utilities AND arena-core.ts imports cleanup/lifecycle functions from those
same siblings, creating cycles: arena-core ↔ arena-match, arena-core ↔ arena-feed-room,
arena-core ↔ arena-mod-refs, arena-core ↔ arena-room-ai.

FIX: Extract the 4 pure utilities to a new zero-dependency file.

SPLIT MAP:
  src/arena/arena-core.utils.ts  (new, ~25 lines)
    Moves: isPlaceholder, formatTimer, randomFrom, pushArenaState
    Imports nothing from other arena files — pure utils only.
    Import from: config.ts (for window.ModeratorConfig reference if needed)

  src/arena/arena-core.ts  (stays, shrinks ~25 lines)
    Removes: the 4 utility exports above
    Keeps: init, destroy, getView, getCurrentDebate, _onPopState,
            _clearAuthState equivalents, all lifecycle and orchestration code

IMPORT UPDATES needed in these files (update their imports of the 4 functions):
  src/arena/arena-match.ts
  src/arena/arena-feed-room.ts
  src/arena/arena-mod-refs.ts
  src/arena/arena-room-ai.ts
  src/arena/arena-config-settings.ts
  src/arena/arena-config-mode.ts
  src/arena/arena-queue.ts
  (grep for isPlaceholder|formatTimer|randomFrom|pushArenaState to find all)

RULES:
- import type for all type-only imports
- No barrel files. Direct imports only.
- Run npm run build after the change. Zero new errors.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-CORE-NNN]: description
- Do NOT fix any bugs. Refactor only.

Commit: "refactor: extract arena-core.utils.ts — break 4 circular deps"
After build passes, commit and push directly to main:
git add -A
git commit -m "refactor: $(basename $(pwd)) split complete"
git push origin HEAD:main
Confirm push succeeded.
```