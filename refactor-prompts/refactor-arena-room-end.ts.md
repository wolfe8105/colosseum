# Refactor Prompt — arena-room-end.ts (556 lines)

Read CLAUDE.md first. Then:

```
Refactor src/arena/arena-room-end.ts.

This file handles end-of-debate logic. It is 556 lines. Target: under 300,
preference for 150.

Rules:
- Read the full file before proposing anything
- Propose a split map. Likely candidates: scoring/results rendering,
  RPC calls, share/social flow, cleanup helpers
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports
- Dependency direction: types → state → utils → features → orchestrator
- No circular dependencies
- Run npm run build after the split and report chunk sizes + line counts
- Log any landmines as comments: // LANDMINE [LM-ROOMEND-NNN]: description
- Do NOT fix bugs. Refactor only.

Wait for approval of the split map before writing any code.
```
