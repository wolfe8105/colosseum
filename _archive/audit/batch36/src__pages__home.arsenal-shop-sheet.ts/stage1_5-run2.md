# Anchor List — home.arsenal-shop-sheet.ts

1. rarityClass  (line 15)
2. openBottomSheet  (line 27)

## Resolution notes

- `close` (line 82): inner arrow function assigned inside `openBottomSheet` — excluded as an inner helper defined inside another function.
- Anonymous async arrow on line 89 (`confirmBtn.addEventListener('click', async () => {...})`): inline callback passed to `addEventListener` — excluded.
- `ProductType` (line 11): type alias, not a callable function binding — excluded.
