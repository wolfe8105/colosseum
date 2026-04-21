# Anchor List — cosmetics.render.ts

Source: src/pages/cosmetics.render.ts
Produced by: stage 1.5 (arbiter runs 1 and 2 agreed; no reconciliation)
Unresolved items: 0

1. depthLabel  (line 14)
2. badgeIcon  (line 20)
3. itemPreview  (line 25)
4. renderItemCard  (line 39)
5. renderBadgeCabinet  (line 71)
6. renderItemGrid  (line 102)
7. renderTab  (line 119)

## Resolution notes

- `depthLabel` (line 14): Exported function. Converts numeric threshold to depth display label via DEPTH_LABEL lookup or percentage computation.
- `badgeIcon` (line 20): Exported function. Returns HTML `<img>` with escaped src/alt, or `item.name.charAt(0).toUpperCase()` as text fallback.
- `itemPreview` (line 25): Exported function. Returns HTML `<video>`, `<img>`, or `<span>` with hardcoded glyph based on item category.
- `renderItemCard` (line 39): Exported function. Builds full item card HTML string. Calls `itemPreview` and `depthLabel` internally.
- `renderBadgeCabinet` (line 71): Exported function. Sets `container.innerHTML` directly. Wires click/keydown handlers on badge tiles.
- `renderItemGrid` (line 102): Exported function. Sets `container.innerHTML` via `renderItemCard` map. Wires data-action click handlers.
- `renderTab` (line 119): Exported function. Filters and sorts catalog items; dispatches to renderBadgeCabinet or renderItemGrid.
- `const escHtml = escapeHTML` (line 12): Excluded — module-scope alias to imported function; not a new callable definition.
- All import bindings and anonymous inline callbacks: Excluded.
- Both arbiter runs independently produced the same 7-entry anchor list.
