# Anchor List — src/arena/arena-loadout-presets.ts

1. renderPresetBar  (line 31)
2. renderBar  (line 50)
3. applyPreset  (line 123)
4. handleSave  (line 181)
5. handleDelete  (line 236)

## Resolution notes

- `interface LoadoutPreset` (lines 17–22): type declaration, excluded.
- `addEventListener` callbacks inside `renderBar` (lines 85, 90–120): inner callbacks, excluded.
- `forEach` callbacks inside `renderBar`: inline callbacks, excluded.
- `setTimeout` callback inside `applyPreset` (line 132): inner callback, excluded.
- All static imports (lines 9–13): not functions, excluded.
