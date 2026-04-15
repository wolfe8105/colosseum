# Refactor Prompt — reference-arsenal.render.ts (401 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/reference-arsenal.render.ts (401 lines).

Read CLAUDE.md first, then read src/reference-arsenal.render.ts in full before touching anything. The file is a sub-module of the reference-arsenal barrel. It contains renderReferenceCard (~40 lines), renderArsenal (~35 lines), renderArmory (~265 lines — very large), and renderLibrary (~5 lines stub).

SPLIT MAP (verify against the file before executing):

1. reference-arsenal.render.ts (orchestrator, ~50 lines)
   Keeps: renderReferenceCard, renderArsenal, renderLibrary. These are smaller entry points that belong together as the card/list renderers. All imports.

2. reference-arsenal.render-armory.ts (~265 lines)
   renderArmory in full, plus extracted private helpers to bring the main function under 80 lines. renderArmory currently handles: loading state, empty state, reference card grid, "Second" button per card, and wires click handlers inline. Extract at minimum: _renderArmoryCard(ref) → the per-card HTML builder, _renderArmoryEmpty() → the empty state HTML, _wireArmoryCard(container, refs) → the event wiring loop. These helpers stay private (not exported).

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (ArsenalReference, Rarity).
- Dependency direction: orchestrator imports render-armory. render-armory is standalone — imports from auth.ts, config.ts, reference-arsenal.rpc.ts directly. No cross-imports.
- Target under 270 lines per file. render-armory.ts at ~265 is acceptable after helper extraction reduces the main function.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in reference-arsenal.render* files.

LANDMINES — log these as // LANDMINE [LM-ARM-NNN]: description comments. Do NOT fix them:

- LM-ARM-001 (in reference-arsenal.render-armory.ts at renderArmory Second button handler, already catalogued as M-D1 in AUDIT-FINDINGS.md, member of disable-button-no-finally family — fixed in Prompt 2): The Second button was one of the 7 disable-button-no-finally fixes. Verify the try/finally fix is present before splitting. If the fix is already applied, no landmine comment needed.

- LM-ARM-002 (in reference-arsenal.render-armory.ts): renderArmory fetches all references via RPC on every call with no caching. If the arsenal tab is opened and closed repeatedly, each open triggers a full network round-trip.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
