# Refactor Prompt — home.arsenal-shop.ts (368 lines)

Read CLAUDE.md first. Then:

```
Refactor src/pages/home.arsenal-shop.ts.

This file renders the modifier/power-up shop tab. It is 368 lines.
Target: under 300, preference for 150.

Rules:
- Read the full file before proposing anything
- Propose a split map. Likely candidates: state/types, render/filter logic,
  bottom sheet, event wiring
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports
- Dependency direction: types → state → render → wiring → orchestrator
- No circular dependencies
- Run npm run build after the split and report chunk sizes + line counts
- Log any landmines as comments: // LANDMINE [LM-ARSENALSHOP-NNN]: description
- Do NOT fix bugs. Refactor only.

Wait for approval of the split map before writing any code.
```
