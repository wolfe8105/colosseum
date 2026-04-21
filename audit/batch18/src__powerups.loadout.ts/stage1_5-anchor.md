# Anchor List — powerups.loadout.ts

Source: src/powerups.loadout.ts
Produced by: stage 1.5 (arbiter, both runs agreed)
Unresolved items: 0

1. renderLoadout  (line 16)
2. wireLoadout  (line 82)

## Resolution notes
- Arrow callbacks passed to `forEach` / `addEventListener` / `.map`: inline, not top-level.
- `equippedMap`, `slots`, `invItems`, `selectedSlot`: data bindings, not callable definitions.
