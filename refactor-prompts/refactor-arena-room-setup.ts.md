# Refactor Prompt — arena-room-setup.ts (406 lines)

Read CLAUDE.md first. Then:

```
Refactor src/arena/arena-room-setup.ts.

This file handles pre-debate setup and room entry. It is 406 lines.
Target: under 300, preference for 150.

Rules:
- Read the full file before proposing anything
- Propose a split map. Likely candidates: pre-debate render, room entry,
  loadout/powerup wiring, staking panel
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports
- Dependency direction: types → state → utils → features → orchestrator
- No circular dependencies
- Run npm run build after the split and report chunk sizes + line counts
- Log any landmines as comments: // LANDMINE [LM-ROOMSETUP-NNN]: description
- Do NOT fix bugs. Refactor only.

Wait for approval of the split map before writing any code.
```
