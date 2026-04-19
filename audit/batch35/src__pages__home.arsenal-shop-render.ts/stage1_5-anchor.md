# Anchor List — home.arsenal-shop-render.ts

Source: src/pages/home.arsenal-shop-render.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. renderShop  (line 35)

## Resolution notes
Both arbiter runs agreed. CATEGORIES (line 13) and RARITIES (line 26) are array-literal const bindings, not functions. wireShopEvents call at line 102 is inside renderShop body, not a top-level definition.
