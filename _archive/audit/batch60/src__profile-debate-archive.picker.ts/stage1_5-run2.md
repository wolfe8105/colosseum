# Anchor List — profile-debate-archive.picker.ts

1. showAddPicker  (line 11)

## Resolution notes

- `{ data: rows, error }` (Agent 02, item 9): destructured variable binding from an `await` expression inside `showAddPicker`; inner local, not a top-level function definition.
- `list` (Agent 02, item 11): local `const` binding to an array value inside `showAddPicker`; not a function.
- `esc` (Agent 02, item 12): local `const` binding to an imported function reference inside `showAddPicker`; not a top-level definition.
- `overlay` (Agent 02, item 14): local `const` binding to a DOM element inside `showAddPicker`; not a function.
- All `overlay.addEventListener` / `overlay.querySelectorAll().forEach` callbacks (Agent 02, items 18, 21): inline callbacks passed to event listener APIs; excluded per the callback rule.
- No missed top-level function definitions were found on direct scan of the source.
