# Refactor Prompt — src/async.render.ts (329 lines → 4 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/async.render.ts (329 lines).

Read CLAUDE.md first, then read src/async.render.ts in full before touching
anything. This file has three distinct render jobs plus wiring registration.

SPLIT MAP (verify against file before executing):

  src/async.render.takes.ts  (~150 lines)
    Keeps: WireFn type, _wireTakes/_wirePredictions module vars,
            _registerWiring, loadHotTakes, _renderTake, _renderModeratorCard
    Exports: _registerWiring, loadHotTakes

  src/async.render.predictions.ts  (~130 lines)
    Keeps: renderPredictions, _renderPredictionCard, _renderStandaloneCard
    Imports: state from async.state.ts, escapeHTML/FEATURES from config.ts
    Exports: renderPredictions
    Does NOT import from async.render.takes.ts

  src/async.render.wager.ts  (~70 lines)
    Keeps: _activeWagerDebateId, _showWagerPicker, _hideWagerPicker
    Imports: state from async.state.ts, escapeHTML from config.ts,
             getCurrentProfile from auth.ts
    Exports: _showWagerPicker, _hideWagerPicker

  src/async.render.ts  (thin orchestrator, ~20 lines)
    Re-exports: _registerWiring, loadHotTakes from async.render.takes.ts
    Re-exports: renderPredictions from async.render.predictions.ts
    Re-exports: _showWagerPicker, _hideWagerPicker from async.render.wager.ts
    All existing importers of async.render.ts continue to work unchanged.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: takes/predictions/wager are siblings — none imports another.
  All three import from async.state.ts, config.ts, auth.ts only.
- Run npm run build after the split. Zero new errors.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-ASYNCRENDER-NNN]: description. Do NOT fix them.
- Refactor only.

After build passes, commit and push directly to main:
git add -A
git commit -m "refactor: split async.render.ts — takes / predictions / wager sub-modules"
git push origin HEAD:main
Confirm push succeeded.
```
