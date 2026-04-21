# Anchor List — cosmetics.render.ts (Arbiter Run 1)

1. depthLabel  (line 14)
2. badgeIcon  (line 20)
3. itemPreview  (line 25)
4. renderItemCard  (line 39)
5. renderBadgeCabinet  (line 71)
6. renderItemGrid  (line 102)
7. renderTab  (line 119)

## Resolution notes

- `depthLabel` (line 14): Exported function. Converts numeric threshold to human-readable depth label string. Returns from DEPTH_LABEL lookup or computed percentage.
- `badgeIcon` (line 20): Exported function. Returns HTML string: `<img>` with escaped attrs, or `item.name.charAt(0).toUpperCase()` as text fallback.
- `itemPreview` (line 25): Exported function. Returns HTML string: `<video>`, `<img>`, or `<span>` with hardcoded glyph.
- `renderItemCard` (line 39): Exported function. Returns full item card HTML string. Called by renderItemGrid.
- `renderBadgeCabinet` (line 71): Exported function. Sets `container.innerHTML` to badge grid; wires click/keydown handlers.
- `renderItemGrid` (line 102): Exported function. Sets `container.innerHTML` to item grid; wires data-action click handlers.
- `renderTab` (line 119): Exported function. Top-level dispatcher — routes to renderBadgeCabinet or renderItemGrid based on category.
- `const escHtml = escapeHTML` (line 12): Excluded — module-scope alias to imported function, not a new callable definition.
- All import bindings: Excluded.
- All inline anonymous callbacks: Excluded.
