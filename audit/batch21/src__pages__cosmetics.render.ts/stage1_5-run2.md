# Anchor List — cosmetics.render.ts (Arbiter Run 2)

1. depthLabel  (line 14)
2. badgeIcon  (line 20)
3. itemPreview  (line 25)
4. renderItemCard  (line 39)
5. renderBadgeCabinet  (line 71)
6. renderItemGrid  (line 102)
7. renderTab  (line 119)

## Resolution notes

- `depthLabel`: Confirmed exported function at line 14. Computes or looks up depth display label from numeric threshold.
- `badgeIcon`: Confirmed exported function at line 20. Returns HTML string for badge display.
- `itemPreview`: Confirmed exported function at line 25. Returns HTML string for item preview (video/img/glyph).
- `renderItemCard`: Confirmed exported function at line 39. Returns item card HTML string. Delegates to `itemPreview` and `depthLabel`.
- `renderBadgeCabinet`: Confirmed exported function at line 71. Mutates `container.innerHTML`. Wires event listeners for owned badge tiles.
- `renderItemGrid`: Confirmed exported function at line 102. Mutates `container.innerHTML`. Wires data-action handlers.
- `renderTab`: Confirmed exported function at line 119. Dispatches to renderBadgeCabinet or renderItemGrid.
- `const escHtml = escapeHTML`: Excluded — alias, not a new function.
- All imports and inline callbacks: Excluded.
- Both arbiter runs independently produced the same 7-entry anchor list.
