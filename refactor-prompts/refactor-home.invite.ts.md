# Refactor Prompt — home.invite.ts (324 lines)

Read CLAUDE.md first. Then:

```
Refactor src/pages/home.invite.ts.

This file is the invite/rewards screen. It is 324 lines. Target: under 300,
preference for 150.

Rules:
- Read the full file before proposing anything
- Propose a split map. Likely candidates: types, render helpers, claim sheet,
  wiring — may only need minor extraction to get under 300
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports
- Dependency direction: types → utils → render → wiring → orchestrator
- No circular dependencies
- Run npm run build after the split and report chunk sizes + line counts
- Log any landmines as comments: // LANDMINE [LM-INVITE-NNN]: description
- Do NOT fix bugs. Refactor only.

Wait for approval of the split map before writing any code.
```
