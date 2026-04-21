# Anchor List — powerups.loadout.ts

1. renderLoadout  (line 16)
2. wireLoadout  (line 82)

## Resolution notes
- Arrow callbacks passed to `forEach` / `addEventListener` (lines 36, 57, 85, 86, 90, 96, 97): inline callbacks, not top-level named bindings.
- `equippedMap` (line 35), `slots` (line 38), `invItems` (line 57), `selectedSlot` (line 83): data bindings, not callable function definitions.
