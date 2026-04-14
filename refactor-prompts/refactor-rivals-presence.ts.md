# Refactor Prompt — rivals-presence.ts (313 lines)

Read CLAUDE.md first. Then:

```
Refactor src/rivals-presence.ts.

This file tracks rival presence via Supabase Realtime. It is 313 lines.
Target: under 300, preference for 150.

Rules:
- Read the full file before proposing anything
- Propose a split map. Likely: may only need to extract CSS injection and
  popup DOM helpers to get under 300 — propose the minimal clean split
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports
- Dependency direction: types → utils → presence → orchestrator
- No circular dependencies
- Run npm run build after the split and report chunk sizes + line counts
- Log any landmines as comments: // LANDMINE [LM-RIVALS-NNN]: description
- Do NOT fix bugs. Refactor only.

Wait for approval of the split map before writing any code.
```
