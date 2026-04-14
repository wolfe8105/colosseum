# Stage 1 Outputs — home.arsenal-shop.ts

## Agent 01
1. comment — block comment (file header: Home — Arsenal "Shop" tab, F-10 Power-Up Shop, description of layout)
2. blank
3. import — named import of `getModifierCatalog`, `getUserInventory`, `renderEffectCard`, `handleBuyModifier`, `handleBuyPowerup`, `tierLabel`, `categoryLabel` (values) and `ModifierEffect`, `ModifierCategory`, `RarityTier` (type-only) from `'../modifiers.ts'`
4. import — named import of `escapeHTML`, `showToast` from `'../config.ts'`
5. blank
6. comment — section marker `// ── Types ──`
7. blank
8. bind name to type — `ProductType` (type alias)
9. blank
10. bind name to type — `ShopState` (interface)
11. blank
12. comment — section marker `// ── Module-level state ──`
13. blank
14. bind name to value — `_state`
15. blank
16. bind name to value — `_container`
17. bind name to value — `_sheetCleanup`
18. blank
19. comment — section marker `// ── Category labels for chips ──`
20. blank
21. bind name to value — `CATEGORIES`
22. blank
23. bind name to value — `RARITIES`
24. blank
25. comment — section marker `// ── Entry point ──`
26. blank
27. bind name to function definition — `loadShopScreen` (exported `async function`)
28. blank
29. comment — line comment describing `_readTokenBalance`
30. bind name to function definition — `_readTokenBalance`
31. blank
32. comment — section marker `// ── Render ──`
33. blank
34. bind name to function definition — `render`
35. blank
36. comment — section marker `// ── Filtering ──`
37. blank
38. bind name to function definition — `applyFilters`
39. blank
40. comment — section marker `// ── Event wiring ──`
41. blank
42. bind name to function definition — `wireEvents`
43. blank
44. comment — section marker `// ── Bottom sheet ──`
45. blank
46. bind name to function definition — `openBottomSheet`
47. blank
48. comment — line comment describing `rarityClass`
49. bind name to function definition — `rarityClass`
50. blank
51. comment — line comment `// Cleanup when leaving the tab`
52. bind name to function definition — `cleanupShopScreen` (exported)

## Agent 02
1. comment — block comment (lines 1–14)
2. blank
3. import — named imports `getModifierCatalog`, `getUserInventory`, `renderEffectCard`, `handleBuyModifier`, `handleBuyPowerup`, `tierLabel`, `categoryLabel`, and type-only imports `ModifierEffect`, `ModifierCategory`, `RarityTier` from `'../modifiers.ts'`
4. import — named imports `escapeHTML`, `showToast` from `'../config.ts'`
5. blank
6. comment
7. blank
8. bind name to type — `ProductType`
9. blank
10. bind name to type — `ShopState` (interface)
11. blank
12. comment
13. blank
14. bind name to value — `_state`
15. blank
16. bind name to value — `_container`
17. bind name to value — `_sheetCleanup`
18. blank
19. comment
20. blank
21. bind name to value — `CATEGORIES`
22. blank
23. bind name to value — `RARITIES`
24. blank
25. comment
26. blank
27. bind name to function definition — `loadShopScreen` (exported)
28. blank
29. comment
30. bind name to function definition — `_readTokenBalance`
31. blank
32. comment
33. blank
34. bind name to function definition — `render`
35. blank
36. comment
37. blank
38. bind name to function definition — `applyFilters`
39. blank
40. comment
41. blank
42. bind name to function definition — `wireEvents`
43. blank
44. comment
45. blank
46. bind name to function definition — `openBottomSheet`
47. blank
48. comment
49. bind name to function definition — `rarityClass`
50. blank
51. comment
52. bind name to function definition — `cleanupShopScreen` (exported)

## Agent 03
1. comment — block comment (lines 1–14): file-level JSDoc header
2. blank — line 15
3. import — named imports (`getModifierCatalog`, `getUserInventory`, `renderEffectCard`, `handleBuyModifier`, `handleBuyPowerup`, `tierLabel`, `categoryLabel`) and type-only imports (`ModifierEffect`, `ModifierCategory`, `RarityTier`) from `'../modifiers.ts'`
4. import — named imports (`escapeHTML`, `showToast`) from `'../config.ts'`
5. blank — line 29
6. comment — line 30: section label `// ── Types ──`
7. blank — line 31
8. bind name to type — `ProductType` (type alias)
9. blank — line 33
10. bind name to type — `ShopState` (interface)
11. blank — line 43
12. comment — line 44: section label `// ── Module-level state ──`
13. blank — line 45
14. bind name to value — `_state`
15. blank — line 55
16. bind name to value — `_container`
17. bind name to value — `_sheetCleanup`
18. blank — line 58
19. comment — line 59: section label `// ── Category labels for chips ──`
20. blank — line 60
21. bind name to value — `CATEGORIES`
22. blank — line 73
23. bind name to value — `RARITIES`
24. blank — line 82
25. comment — line 83: section label `// ── Entry point ──`
26. blank — line 84
27. bind name to function definition — `loadShopScreen` (exported, async)
28. blank — line 104
29. comment — line 105: inline comment about `_readTokenBalance`
30. bind name to function definition — `_readTokenBalance`
31. blank — line 110
32. comment — line 111: section label `// ── Render ──`
33. blank — line 112
34. bind name to function definition — `render`
35. blank — line 176
36. comment — line 177: section label `// ── Filtering ──`
37. blank — line 178
38. bind name to function definition — `applyFilters`
39. blank — line 191
40. comment — line 192: section label `// ── Event wiring ──`
41. blank — line 193
42. bind name to function definition — `wireEvents`
43. blank — line 263
44. comment — line 264: section label `// ── Bottom sheet ──`
45. blank — line 265
46. bind name to function definition — `openBottomSheet`
47. blank — line 354
48. comment — line 355: inline comment about `rarityClass`
49. bind name to function definition — `rarityClass`
50. blank — line 363
51. comment — line 364: inline comment about cleanup
52. bind name to function definition — `cleanupShopScreen` (exported)

## Agent 04
1. comment — block comment (lines 1–14)
2. blank
3. import — `getModifierCatalog`, `getUserInventory`, `renderEffectCard`, `handleBuyModifier`, `handleBuyPowerup`, `tierLabel`, `categoryLabel`, `type ModifierEffect`, `type ModifierCategory`, `type RarityTier` from `../modifiers.ts`
4. import — `escapeHTML`, `showToast` from `../config.ts`
5. blank
6. comment — section comment `// ── Types ──`
7. blank
8. bind name to type — `ProductType`
9. blank
10. bind name to type — `ShopState` (interface)
11. blank
12. comment — section comment `// ── Module-level state ──`
13. blank
14. bind name to value — `_state`
15. blank
16. bind name to value — `_container`
17. bind name to value — `_sheetCleanup`
18. blank
19. comment — section comment `// ── Category labels for chips ──`
20. blank
21. bind name to value — `CATEGORIES`
22. blank
23. bind name to value — `RARITIES`
24. blank
25. comment — section comment `// ── Entry point ──`
26. blank
27. bind name to function definition — `loadShopScreen` (exported)
28. blank
29. comment — line comment `// Read live token balance from the DOM …`
30. bind name to function definition — `_readTokenBalance`
31. blank
32. comment — section comment `// ── Render ──`
33. blank
34. bind name to function definition — `render`
35. blank
36. comment — section comment `// ── Filtering ──`
37. blank
38. bind name to function definition — `applyFilters`
39. blank
40. comment — section comment `// ── Event wiring ──`
41. blank
42. bind name to function definition — `wireEvents`
43. blank
44. comment — section comment `// ── Bottom sheet ──`
45. blank
46. bind name to function definition — `openBottomSheet`
47. blank
48. comment — line comment `// Inline helper to avoid re-importing …`
49. bind name to function definition — `rarityClass`
50. blank
51. comment — line comment `// Cleanup when leaving the tab`
52. bind name to function definition — `cleanupShopScreen` (exported)

## Agent 05
1. comment — JSDoc block describing module purpose, dependencies, and layout (lines 1–14)
2. blank (line 15)
3. import — named imports `getModifierCatalog`, `getUserInventory`, `renderEffectCard`, `handleBuyModifier`, `handleBuyPowerup`, `tierLabel`, `categoryLabel` and type-only imports `ModifierEffect`, `ModifierCategory`, `RarityTier` from `'../modifiers.ts'` (lines 16–27)
4. import — named imports `escapeHTML`, `showToast` from `'../config.ts'` (line 28)
5. blank (line 29)
6. comment (line 30)
7. blank (line 31)
8. bind name to type — `ProductType` (type alias) (line 32)
9. blank (line 33)
10. bind name to type — `ShopState` (interface) (lines 34–42)
11. blank (line 43)
12. comment (line 44)
13. blank (line 45)
14. bind name to value — `_state` (lines 46–54)
15. blank (line 55)
16. bind name to value — `_container` (line 56)
17. bind name to value — `_sheetCleanup` (line 57)
18. blank (line 58)
19. comment (line 59)
20. blank (line 60)
21. bind name to value — `CATEGORIES` (lines 61–72)
22. blank (line 73)
23. bind name to value — `RARITIES` (lines 74–81)
24. blank (line 82)
25. comment (line 83)
26. blank (line 84)
27. bind name to function definition — `loadShopScreen` (exported) (lines 85–103)
28. blank (line 104)
29. comment (line 105)
30. bind name to function definition — `_readTokenBalance` (lines 106–109)
31. blank (line 110)
32. comment (line 111)
33. blank (line 112)
34. bind name to function definition — `render` (lines 113–175)
35. blank (line 176)
36. comment (line 177)
37. blank (line 178)
38. bind name to function definition — `applyFilters` (lines 179–190)
39. blank (line 191)
40. comment (line 192)
41. blank (line 193)
42. bind name to function definition — `wireEvents` (lines 194–262)
43. blank (line 263)
44. comment (line 264)
45. blank (line 265)
46. bind name to function definition — `openBottomSheet` (lines 266–353)
47. blank (line 354)
48. comment (line 355)
49. bind name to function definition — `rarityClass` (lines 356–362)
50. blank (line 363)
51. comment (line 364)
52. bind name to function definition — `cleanupShopScreen` (exported) (lines 365–368)
