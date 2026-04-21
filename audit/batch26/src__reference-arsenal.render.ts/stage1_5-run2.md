# Anchor List — reference-arsenal.render.ts (Run 2)

Source: src/reference-arsenal.render.ts

1. rarityCardStyle    (line 20)
2. renderSocketDots   (line 27)
3. renderReferenceCard (line 44)
4. renderArsenal      (line 87)

## Resolution notes

- `RARITY_SOCKET_COUNT` (line 16): const binding to an object literal, not a function. Excluded.
- Inner functions/callbacks inside `renderArsenal` (sort comparator, `html +=` loop): inner, not top-level.
