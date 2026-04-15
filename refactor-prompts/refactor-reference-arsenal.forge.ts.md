# Refactor Prompt — reference-arsenal.forge.ts (356 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/reference-arsenal.forge.ts (356 lines).

Read CLAUDE.md first, then read src/reference-arsenal.forge.ts in full before touching anything. The file has a single exported function showForgeForm (~325 lines) — one massive function that builds the 5-step forge bottom-sheet, wires all its interactions, and submits the forge RPC. It is too large to read or reason about as a single unit.

SPLIT MAP (verify against the file before executing):

1. reference-arsenal.forge.ts (orchestrator, ~50 lines)
   showForgeForm entry point. Opens the bottom-sheet overlay, injects CSS if needed, calls _buildForgeSheet to get the DOM, calls _wireForgeSheet to attach handlers, appends to body.

2. reference-arsenal.forge-render.ts (~100 lines)
   _buildForgeSheet: builds and returns the full sheet DOM element. Extract step renderers as private helpers: _renderStep1(data), _renderStep2(data), _renderStep3(data), _renderStep4(data), _renderStep5(data). Each step returns an HTML string. _buildForgeSheet assembles them into the sheet shell.

3. reference-arsenal.forge-wiring.ts (~100 lines)
   _wireForgeSheet: attaches all event listeners to the sheet — step navigation (next/back buttons), input change handlers, preview updates, close/backdrop handlers, and the submit button listener (which calls _submitForge).

4. reference-arsenal.forge-submit.ts (~80 lines)
   _submitForge: validates the completed form state, builds the RPC payload, calls the forge RPC, handles success (shows confirmation, closes sheet) and error (shows error toast, re-enables submit button). try/finally on the submit button disable.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: orchestrator imports render, wiring, submit. wiring imports submit (to attach the submit handler). render and submit are standalone.
- Target under 105 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in reference-arsenal.forge* files.

LANDMINES — log these as // LANDMINE [LM-FRG-NNN]: description comments. Do NOT fix them:

- LM-FRG-001 (in reference-arsenal.forge-submit.ts at _submitForge): Verify that the submit button disable uses try/finally after the split. If the original showForgeForm had the disable-button-no-finally pattern, this refactor is the opportunity to apply try/finally — this is a fix, not a landmine to preserve.

- LM-FRG-002 (in reference-arsenal.forge-render.ts): The 5-step forge form re-renders the entire sheet HTML on step transitions. Step state (already-entered field values) must be preserved across re-renders either via a state object passed into each render, or by reading from DOM inputs before re-render and restoring after. Verify the current approach before extracting step renderers — the split must not break step state persistence.

Do NOT fix other landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
