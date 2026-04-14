# Refactor Prompt — arena-feed-machine.ts (556 lines)

Read CLAUDE.md first. Then:

```
Refactor src/arena/arena-feed-machine.ts.

This file owns the turn-taking state machine and pause control. It is 556 lines.
Target: under 300, preference for 150.

Rules:
- Read the full file before proposing anything
- Propose a split map. Likely candidates: timer management, phase transitions,
  ad break logic, challenge ruling logic
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports
- Dependency direction: types → state → utils → features → orchestrator
- No circular dependencies
- Run npm run build after the split and report chunk sizes + line counts
- Log any landmines as comments: // LANDMINE [LM-FEEDMACHINE-NNN]: description
- Do NOT fix bugs. Refactor only.

Wait for approval of the split map before writing any code.
```
