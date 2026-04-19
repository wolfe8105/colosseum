# Anchor List — home.arsenal-shop-wiring.ts

1. wireShopEvents  (line 17)

---

**Resolution notes**

- `ProductType` (line 10): excluded — local `type` alias, not a callable binding.
- `import type` entries (lines 6–7): excluded — type-only imports, no runtime value.
- `openBottomSheet` (line 8): excluded — imported value binding, not a function definition in this file.
- forEach/addEventListener callbacks (lines 26, 34, 42, 50, 60, 68, 83): excluded — inline closures passed as arguments, inner to `wireShopEvents`.
