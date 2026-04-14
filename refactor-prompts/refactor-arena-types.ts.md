# Refactor Prompt — arena-types.ts (421 lines)

Read CLAUDE.md first. Then:

```
Refactor src/arena/arena-types.ts.

This file holds all arena types and constants. It is 421 lines. Target: under 300,
preference for 150.

Rules:
- Read the full file before proposing anything
- Propose a split map. Likely candidates: arena-types.ts (core interfaces),
  arena-constants.ts (numeric/string constants), arena-feed-types.ts (feed-specific types)
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports
- Dependency direction: types → constants → everything else. Types file must not
  import from any arena-*.ts file.
- No circular dependencies
- Run npm run build after the split and report chunk sizes + line counts
- Log any landmines as comments: // LANDMINE [LM-TYPES-NNN]: description
- Do NOT fix bugs. Refactor only.

Wait for approval of the split map before writing any code.
```
