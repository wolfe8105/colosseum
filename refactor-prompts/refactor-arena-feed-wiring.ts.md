# Refactor Prompt — arena-feed-wiring.ts (482 lines)

Read CLAUDE.md first. Then:

```
Refactor src/arena/arena-feed-wiring.ts.

This file wires DOM event listeners for the feed room. It is 482 lines.
Target: under 300, preference for 150.

Rules:
- Read the full file before proposing anything
- Propose a split map. Likely candidates: debater controls, spectator controls,
  moderator controls, message submission helpers
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports
- Dependency direction: types → state → utils → features → orchestrator
- No circular dependencies
- Run npm run build after the split and report chunk sizes + line counts
- Log any landmines as comments: // LANDMINE [LM-FEEDWIRING-NNN]: description
- Do NOT fix bugs. Refactor only.

Wait for approval of the split map before writing any code.
```
