# Anchor List — src/pages/settings.ts

1. toast  (line 59)
2. getEl  (line 67)
3. getChecked  (line 71)
4. setChecked  (line 75)
5. validateTier  (line 80)
6. loadSettings  (line 88)
7. saveSettings  (line 173)
8. loadModeratorSettings  (line 348)

---

**Resolution notes**

- `isPlaceholder` (line 46): const bound to a boolean value (`isAnyPlaceholder`), not a function definition. Excluded.
- `VALID_TIERS` (line 48): const array literal, not a function. Excluded.
- `TIER_LABELS` (lines 51–53): const object literal, not a function. Excluded.
- `SettingsData` (lines 22–40): interface type definition. Excluded.
- `ValidTier` (line 49): type alias. Excluded.
- All `addEventListener` callbacks (lines 252, 255, 265, 275, 285, 308, 318, 324, 328, 332, 390, 406, 424): inline callbacks passed to event listeners; not top-level named bindings. Excluded.
- `window.addEventListener('DOMContentLoaded', ...)` (line 455): anonymous async callback passed inline to an event listener. Excluded.
- `.forEach` chip handler (line 424): callback passed inline to `forEach`. Excluded.
