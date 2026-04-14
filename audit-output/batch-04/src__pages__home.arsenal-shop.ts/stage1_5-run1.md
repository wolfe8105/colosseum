# Anchor List — home.arsenal-shop.ts

1. loadShopScreen  (line 85)
2. _readTokenBalance  (line 106)
3. render  (line 113)
4. applyFilters  (line 179)
5. wireEvents  (line 194)
6. openBottomSheet  (line 266)
7. rarityClass  (line 356)
8. cleanupShopScreen  (line 365)

---

Resolution notes

- `close` (inner arrow function, line 319 inside `openBottomSheet`): excluded — inner helper defined inside another function body, not a top-level binding.
- `CATEGORIES` (line 61): excluded — top-level `const` bound to an array literal, not a function definition.
- `RARITIES` (line 74): excluded — top-level `const` bound to an array literal, not a function definition.
- `_state` (line 46): excluded — module-level object literal, not a function.
- `_container` (line 56): excluded — module-level variable, not a function.
- `_sheetCleanup` (line 57): excluded — module-level variable holding a nullable function reference, not a function definition at this binding site.
- `ProductType` / `ShopState`: excluded — type alias and interface, not callable bindings.
- All `.forEach` / `.addEventListener` / `.map` callbacks: excluded — inline callbacks, not top-level named bindings.
- The async click handler on `confirmBtn` (line 331): excluded — anonymous async callback passed to `addEventListener` inside `openBottomSheet`.
