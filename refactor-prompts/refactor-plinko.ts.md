# Refactor Prompt — src/pages/plinko.ts (551 lines)

Read CLAUDE.md first. Then:

```
Refactor src/pages/plinko.ts.

This is the signup/onboarding gate controller. It is 551 lines. Target: under 300,
preference for 150.

Rules:
- Read the full file before proposing anything
- Propose a split map. Likely candidates: step navigation, validation helpers,
  OAuth/email handlers, HIBP password check, invite nudge
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports
- Dependency direction: types → state → utils → features → orchestrator
- No circular dependencies
- Run npm run build after the split and report chunk sizes + line counts
- Log any landmines as comments: // LANDMINE [LM-PLINKO-NNN]: description
- Do NOT fix bugs. Refactor only.

Wait for approval of the split map before writing any code.
```
