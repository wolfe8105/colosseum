# Anchor List — async.render.ts

Source: src/async.render.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. _registerWiring  (line 19)

## Resolution notes

Both arbiter runs agreed. No reconciliation needed.

- loadHotTakes, renderPredictions, _showWagerPicker, _hideWagerPicker: re-exports only — bindings live in sub-module files, not in this file.
