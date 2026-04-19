# Anchor List — src/async.render.ts

Source: src/async.render.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. _registerWiring  (line 30)
2. loadHotTakes  (line 39)
3. _renderTake  (line 75)
4. _renderModeratorCard  (line 127)
5. renderPredictions  (line 150)
6. _renderPredictionCard  (line 180)
7. _renderStandaloneCard  (line 223)
8. _showWagerPicker  (line 277)
9. _hideWagerPicker  (line 325)

## Resolution notes

Both arbiter runs agreed with no contested items.

- `esc` (line 20): excluded — value alias (`const esc = escapeHTML`), not a function definition.
- `WireFn` (line 26): excluded — type alias, not a callable binding.
- `_wireTakes` (line 27): excluded — `let` variable holding a function reference, not a function definition.
- `_wirePredictions` (line 28): excluded — `let` variable holding a function reference, not a function definition.
- `_activeWagerDebateId` (line 275): excluded — `let` variable, not a function definition.
- Inline callbacks inside `.map()`, `.filter()`, `.forEach()`, `addEventListener`: excluded — not top-level named bindings.
