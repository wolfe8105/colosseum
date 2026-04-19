# Anchor List — home.arsenal-shop-wiring.ts

1. wireShopEvents  (line 17)

## Resolution notes

- `ProductType` (line 10): excluded — `type` alias, not a callable function binding.
- `ModifierEffect`, `ModifierCategory`, `RarityTier` (line 6): excluded — `import type`, no runtime presence.
- `ShopState` (line 7): excluded — `import type`, no runtime presence.
- `openBottomSheet` (line 8): excluded — imported value from another module, not a function definition in this file.
- All `forEach` callbacks and `addEventListener` handlers (lines 26, 34, 42, 50, 60, 68, 83): excluded — inner closures, not top-level named bindings.
