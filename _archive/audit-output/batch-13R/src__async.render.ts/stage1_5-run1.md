# Anchor List — src/async.render.ts

1. _registerWiring  (line 30)
2. loadHotTakes  (line 39)
3. _renderTake  (line 75)
4. _renderModeratorCard  (line 127)
5. renderPredictions  (line 150)
6. _renderPredictionCard  (line 180)
7. _renderStandaloneCard  (line 223)
8. _showWagerPicker  (line 277)
9. _hideWagerPicker  (line 325)

---

**Resolution notes**

No candidates were excluded. All five agents agreed on the same nine function definitions, and source verification confirms each one is a top-level named callable binding (function declarations at module scope). No additional functions were found during the direct source scan. The following non-function items were noted in the stage 1 inventories but are correctly excluded:

- `esc` (line 20) — simple value alias (`const esc = escapeHTML`), not a function definition
- `WireFn` (line 26) — type alias, not a callable binding
- `_wireTakes` (line 27) — `let` variable holding a function reference, not a function definition
- `_wirePredictions` (line 28) — same as above
- `_activeWagerDebateId` (line 275) — `let` variable, not a function definition
- Arrow callbacks inside `.map()`/`.filter()` in `loadHotTakes`, `renderPredictions`, `_showWagerPicker` — inline callbacks, excluded per rules
- `quickAmounts.filter(a => ...)` and `quickAmounts.map(a => ...)` inside `_showWagerPicker` — inline callbacks, excluded per rules
