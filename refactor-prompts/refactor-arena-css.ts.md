# Refactor Prompt — arena-css.ts (773 lines)

Read CLAUDE.md first. Then:

```
Refactor src/arena/arena-css.ts.

This file is a single injectCSS() function that builds one giant <style> tag.
It is 773 lines. Target: split into multiple focused CSS injection files,
each under 300 lines, preference for 150.

Rules:
- Read the full file before proposing anything
- Propose a split map grouped by UI section (lobby, room, feed, modals, etc.)
- The injectCSS() entry point must remain in arena-css.ts as an orchestrator
  that calls each section's inject function in order
- Each section file: arena-css-lobby.ts, arena-css-room.ts, arena-css-feed.ts, etc.
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports
- Run npm run build after the split and report chunk sizes + line counts
- Log any landmines as comments: // LANDMINE [LM-CSS-NNN]: description
- Do NOT fix bugs. Refactor only.

Wait for approval of the split map before writing any code.
```
