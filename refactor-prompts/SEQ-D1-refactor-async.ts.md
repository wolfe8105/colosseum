# Refactor Prompt — src/async.ts (327 lines → 2 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/async.ts (327 lines).

Read CLAUDE.md first, then read src/async.ts in full before touching anything.
This file is the async module orchestrator but has grown to contain three large
event delegation wiring functions (_wireTakeDelegation, _wirePredictionDelegation,
_wireRivalDelegation) totalling ~150 lines. These belong in their own file.

SPLIT MAP (verify against file before executing):

  src/async.wiring.ts  (~150 lines)
    Keeps: _wireTakeDelegation, _wirePredictionDelegation, _wireRivalDelegation
    These three functions wire click/input delegation for their respective containers.
    Imports: all dependencies those functions need (react, challenge, shareTake,
             toggleModerator, showToast, loadHotTakes, state, requireAuth,
             showUserProfile, placePrediction, pickStandaloneQuestion,
             openCreatePredictionForm, _showWagerPicker, _hideWagerPicker,
             getBalance, getCurrentProfile, respondRival, refreshRivals,
             _registerWiring, _registerRivalWiring)
    Exports: nothing — this file calls _registerWiring and _registerRivalWiring
             at module load time as a side effect.
    NOTE: This file must be imported by async.ts to trigger its side effects.

  src/async.ts  (orchestrator, ~175 lines)
    Keeps: all imports, all re-exports from sub-modules, init, destroy,
           getComposerHTML, ModeratorAsync facade, _onDocClick, document.addEventListener,
           auto-init (ready.then)
    Removes: the three _wire*Delegation functions
    Adds: import './async.wiring.ts' (side-effect import — triggers registration)

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- async.wiring.ts must call _registerWiring and _registerRivalWiring directly —
  do not export them or make async.ts call them.
- Run npm run build after the split. Report chunk sizes and line counts.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-ASYNC-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
```
