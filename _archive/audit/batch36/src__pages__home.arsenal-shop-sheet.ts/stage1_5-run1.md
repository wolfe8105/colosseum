# Anchor List — home.arsenal-shop-sheet.ts

1. rarityClass  (line 15)
2. openBottomSheet  (line 27)

## Resolution notes

- `close` (line 82): inner arrow function assigned inside `openBottomSheet` body — excluded as an inner helper, not a top-level binding.
- Anonymous async click handler (line 89): inline callback passed to `addEventListener` — excluded as an inline callback.
- `ProductType` (line 11): type alias, not a callable function binding — excluded.
