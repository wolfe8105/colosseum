# Anchor List — arena-config-settings.ts

1. showRankedPicker  (line 14)
2. closeRankedPicker  (line 93)
3. showRulesetPicker  (line 109)
4. closeRulesetPicker  (line 163)

## Resolution notes
- All five Stage 1 agents unanimously identify the same four top-level exported functions.
- All four are `export function` declarations at module scope.
- No other top-level callable bindings exist.
- `getCurrentProfile` and `selectedRanked` are unreferenced imports — not anchors.
- Inner arrow handlers inside forEach/addEventListener callbacks are excluded.
