# Anchor List — src/arena/arena-loadout-presets.ts

1. renderPresetBar  (line 31)
2. renderBar  (line 50)
3. applyPreset  (line 123)
4. handleSave  (line 181)
5. handleDelete  (line 236)

## Resolution notes

- `LoadoutPreset` interface (lines 17–22): excluded — type definition, not a function.
- `forEach`, `addEventListener`, and `setTimeout` callbacks inside `renderBar`: excluded — inline/nested callbacks, not module-scope definitions.
- `dynamic import()` calls inside `applyPreset`: excluded — call expressions, not function definitions.
- `void applyPreset(...)`, `void handleSave(...)`, `void handleDelete(...)` inside `renderBar`: excluded — call sites, not definitions.
