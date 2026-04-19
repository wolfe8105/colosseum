# Anchor List — home.arsenal-shop-render.ts

1. renderShop (line 35)

## Resolution notes

- CATEGORIES (line 13): Const binding to array literal, not a function.
- RARITIES (line 26): Const binding to array literal, not a function.
- wireShopEvents call (line 102): Function call statement inside renderShop body, not a function definition; inner/nested.
