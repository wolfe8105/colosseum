# Anchor List — home.arsenal-shop.ts

Source: src/pages/home.arsenal-shop.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. loadShopScreen  (line 85)
2. _readTokenBalance  (line 106)
3. render  (line 113)
4. applyFilters  (line 179)
5. wireEvents  (line 194)
6. openBottomSheet  (line 266)
7. rarityClass  (line 356)
8. cleanupShopScreen  (line 365)

## Resolution notes

- `close` (inner arrow inside `openBottomSheet`): excluded — inner helper, not top-level.
- `CATEGORIES` / `RARITIES`: excluded — array literals, not function definitions.
- `_state` / `_container` / `_sheetCleanup`: excluded — value bindings, not function definitions.
- Inline callbacks (forEach, addEventListener, map, filter): excluded — not top-level named bindings.
- `ProductType` / `ShopState`: excluded — type-level constructs.
- Both arbiter runs agreed on the same 8 functions in the same order. No reconciliation run needed.
