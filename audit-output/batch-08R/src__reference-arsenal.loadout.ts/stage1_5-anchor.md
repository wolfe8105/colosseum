# Anchor List — src/reference-arsenal.loadout.ts

Source: src/reference-arsenal.loadout.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. renderLoadoutPicker  (line 15)

## Resolution notes

Both arbiter runs agreed. No reconciliation pass needed.

- `render` (line 49): inner function declaration defined inside `renderLoadoutPicker`. Not a top-level binding. Excluded per inner-helper rule.
- `arsenal` (line 22): local `let` variable binding inside `renderLoadoutPicker`. Not a function. Excluded.
- `selected` (line 45): local `const` Set binding inside `renderLoadoutPicker`. Not a function. Excluded.
- All callbacks passed to `.forEach`, `addEventListener`, etc. inside `render`: anonymous inline callbacks. Excluded.
