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

No candidates were excluded. All five agents agreed on exactly these nine function definitions, and direct inspection of the source confirms each one is a top-level named function declaration. No additional definitions were found during the independent scan of the source file. Non-function top-level bindings (`esc`, `_wireTakes`, `_wirePredictions`, `_activeWagerDebateId`) and the `WireFn` type alias were correctly omitted by all agents and are not function definitions.
