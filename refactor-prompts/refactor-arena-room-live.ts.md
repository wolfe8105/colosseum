# Refactor Prompt — arena-room-live.ts (352 lines)

Read CLAUDE.md first. Then:

```
Refactor src/arena/arena-room-live.ts.

This file handles input controls, text/live mode, and messaging. It is 352 lines.
Target: under 300, preference for 150.

Rules:
- Read the full file before proposing anything
- Propose a split map. Likely candidates: input controls render, text argument
  submission, opponent polling, live audio init
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports
- Dependency direction: types → state → utils → features → orchestrator
- No circular dependencies
- Run npm run build after the split and report chunk sizes + line counts
- Log any landmines as comments: // LANDMINE [LM-ROOMLIVE-NNN]: description
- Do NOT fix bugs. Refactor only.

Wait for approval of the split map before writing any code.
```
