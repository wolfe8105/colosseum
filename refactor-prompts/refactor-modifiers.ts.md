# Refactor Prompt — src/modifiers.ts (414 lines)

Read CLAUDE.md first. Then:

```
Refactor src/modifiers.ts.

This file holds the modifier/power-up system. It is 414 lines. Target: under 300,
preference for 150.

Rules:
- Read the full file before proposing anything
- Propose a split map. Likely candidates: types/interfaces, RPC helpers,
  render functions, buy handlers
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports
- Dependency direction: types → utils → rpc → render → orchestrator
- No circular dependencies
- Run npm run build after the split and report chunk sizes + line counts
- Log any landmines as comments: // LANDMINE [LM-MODIFIERS-NNN]: description
- Do NOT fix bugs. Refactor only.

Wait for approval of the split map before writing any code.
```
