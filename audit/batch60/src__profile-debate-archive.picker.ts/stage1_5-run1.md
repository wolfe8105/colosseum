# Anchor List — profile-debate-archive.picker.ts

1. showAddPicker  (line 11)

## Resolution notes

- `{ data: rows, error }` (Agent 02, item 9): destructured variable binding from an `await` expression inside `showAddPicker`; inner local, not a top-level function definition.
- `list`, `esc`, `overlay` (Agent 02, items 11–14): local variable bindings inside `showAddPicker`; none are function definitions.
- `overlay.addEventListener('click', ...)` callback (Agent 02, item 18): inline callback passed to `addEventListener`; excluded per rules.
- `.forEach(row => ...)` callback and its inner `async () => { ... }` (Agent 02, item 21): callbacks passed to `forEach` and `addEventListener`; inner helpers, excluded per rules.
