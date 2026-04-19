# Anchor List — src/pages/settings.ts

Source: src/pages/settings.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. toast  (line 59)
2. getEl  (line 67)
3. getChecked  (line 71)
4. setChecked  (line 75)
5. validateTier  (line 80)
6. loadSettings  (line 88)
7. saveSettings  (line 173)
8. loadModeratorSettings  (line 348)

## Resolution notes

Both arbiter runs agreed on the same 8 functions. No reconciliation pass was needed.

Excluded candidates:
- `isPlaceholder` (line 46): const bound to a boolean value, not a function definition.
- `VALID_TIERS` (line 48): const array literal, not a function.
- `TIER_LABELS` (lines 51–53): const object literal, not a function.
- `SettingsData` (lines 22–40): interface type definition.
- `ValidTier` (line 49): type alias.
- All anonymous addEventListener callbacks (lines 252, 255, 265, 275, 285, 308, 318, 324, 328, 332, 390, 406, 424, 455): inline callbacks, not top-level named bindings.
- `.mod-cat-chip` forEach callback (line 424): callback passed inline to `forEach`.
