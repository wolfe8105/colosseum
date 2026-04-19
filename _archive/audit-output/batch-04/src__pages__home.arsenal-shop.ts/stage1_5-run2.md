# Anchor List — home.arsenal-shop.ts

1. loadShopScreen  (line 85)
2. _readTokenBalance  (line 106)
3. render  (line 113)
4. applyFilters  (line 179)
5. wireEvents  (line 194)
6. openBottomSheet  (line 266)
7. rarityClass  (line 356)
8. cleanupShopScreen  (line 365)

## Resolution notes

- `close` (inner arrow function, line 319): excluded — defined inside `openBottomSheet`, qualifies as an inner helper function.
- `CATEGORIES` (line 61): excluded — array literal, not a function binding.
- `RARITIES` (line 74): excluded — array literal, not a function binding.
- `_state` (line 46): excluded — plain object literal, not a function binding.
- `_container` (line 56): excluded — variable holding a DOM element reference, not a function.
- `_sheetCleanup` (line 57): excluded — variable holding a nullable callback reference, not a named function definition.
- All callbacks passed to `.forEach`, `.addEventListener`, `.map`, `.filter`: excluded — inline callbacks, not top-level named bindings.
- `ProductType` / `ShopState`: excluded — type alias and interface, not callable function definitions.
