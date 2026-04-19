# Anchor List — src/arena/arena-loadout-presets.ts

Source: src/arena/arena-loadout-presets.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. renderPresetBar  (line 31)
2. renderBar  (line 50)
3. applyPreset  (line 123)
4. handleSave  (line 181)
5. handleDelete  (line 236)

## Resolution notes

- `interface LoadoutPreset` (lines 17–22): type definition, not a function — excluded.
- Inline callbacks inside `renderBar` (addEventListener ×4 per chip, forEach, setTimeout): inner callbacks, excluded.
- Dynamic `import()` call sites inside `applyPreset`: call expressions, not definitions — excluded.
- `void applyPreset(...)`, `void handleSave(...)`, `void handleDelete(...)` in `renderBar`: call sites, not definitions — excluded.
