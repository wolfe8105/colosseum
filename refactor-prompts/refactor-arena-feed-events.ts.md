# Refactor Prompt — arena-feed-events.ts (304 lines)

Read CLAUDE.md first. Then:

```
Refactor src/arena/arena-feed-events.ts.

This file renders and persists feed events. It is 304 lines — just over the
300-line target. Target: under 300, preference for 150.

Rules:
- Read the full file before proposing anything
- Propose the minimal clean split to get under 300. Likely: extract the large
  appendFeedEvent switch statement renderers into arena-feed-event-renderers.ts
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports
- Dependency direction: types → state → utils → render → orchestrator
- No circular dependencies
- Run npm run build after the split and report chunk sizes + line counts
- Log any landmines as comments: // LANDMINE [LM-FEEDEVENTS-NNN]: description
- Do NOT fix bugs. Refactor only.

Wait for approval of the split map before writing any code.
```
