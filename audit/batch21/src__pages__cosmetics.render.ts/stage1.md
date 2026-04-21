# Stage 1 — Primitive Inventory: cosmetics.render.ts

Source: src/pages/cosmetics.render.ts (126 lines)
Agents: 5 (independent, parallel)

---

## Agent 1

Top-level named callable bindings:

1. `depthLabel` (line 14) — `export function depthLabel(threshold: number | null): string`
2. `badgeIcon` (line 20) — `export function badgeIcon(item: CosmeticItem): string`
3. `itemPreview` (line 25) — `export function itemPreview(item: CosmeticItem): string`
4. `renderItemCard` (line 39) — `export function renderItemCard(item: CosmeticItem, isLoggedIn: boolean): string`
5. `renderBadgeCabinet` (line 71) — `export function renderBadgeCabinet(container: HTMLElement, items: CosmeticItem[], catalog: CosmeticItem[]): void`
6. `renderItemGrid` (line 102) — `export function renderItemGrid(container: HTMLElement, items: CosmeticItem[], isLoggedIn: boolean, catalog: CosmeticItem[]): void`
7. `renderTab` (line 119) — `export function renderTab(category: Category, catalog: CosmeticItem[], isLoggedIn: boolean, activeTab: Category, onRender: () => void): void`

Excluded:
- All import bindings (lines 6–9): `escapeHTML`, `CosmeticItem`, `Category` (type imports), `DEPTH_LABEL`, `openConfirmModal`, `handleEquip`, `showInfoModal` — imported, not defined here
- `const escHtml = escapeHTML` (line 12): module-scope alias to imported function — value binding, not a new function definition; excluded as import alias
- Anonymous callbacks inside `renderBadgeCabinet` and `renderItemGrid`: excluded (inline/anonymous)
- No interfaces, enums, or module-level side effects

**Count: 7**

---

## Agent 2

Top-level named callable bindings:

1. `depthLabel` (line 14)
2. `badgeIcon` (line 20)
3. `itemPreview` (line 25)
4. `renderItemCard` (line 39)
5. `renderBadgeCabinet` (line 71)
6. `renderItemGrid` (line 102)
7. `renderTab` (line 119)

Excluded:
- All import bindings — not defined here
- `const escHtml = escapeHTML` — alias to imported function; excluded
- All inline arrow callbacks inside renderBadgeCabinet (lines 93, 98) and renderItemGrid (line 106): anonymous, excluded

**Count: 7**

---

## Agent 3

Top-level named callable bindings:

1. `depthLabel` (line 14) — converts numeric threshold to display string
2. `badgeIcon` (line 20) — returns HTML img or single char for badge display
3. `itemPreview` (line 25) — returns HTML img/video/glyph for item preview
4. `renderItemCard` (line 39) — builds full item card HTML string
5. `renderBadgeCabinet` (line 71) — sets container.innerHTML to badge cabinet, wires click handlers
6. `renderItemGrid` (line 102) — sets container.innerHTML to item grid, wires action handlers
7. `renderTab` (line 119) — top-level dispatcher: routes to renderBadgeCabinet or renderItemGrid

Excluded:
- `const escHtml = escapeHTML` (line 12) — alias, not a function definition
- All import bindings
- Inline event callbacks

**Count: 7**

---

## Agent 4

Top-level named callable bindings:

1. `depthLabel` (line 14)
2. `badgeIcon` (line 20)
3. `itemPreview` (line 25)
4. `renderItemCard` (line 39)
5. `renderBadgeCabinet` (line 71)
6. `renderItemGrid` (line 102)
7. `renderTab` (line 119)

Excluded:
- `const escHtml = escapeHTML` (line 12): module-scope re-assignment of imported symbol. Not a new callable definition — excluded per alias rule (same as `const esc = escapeHTML` in profile-debate-archive.render.ts being excluded when it was inside a function body; here it is module-scope but still only an alias).
- All import bindings
- All anonymous inline callbacks

**Count: 7**

---

## Agent 5

Top-level named callable bindings:

1. `depthLabel` (line 14) — exported
2. `badgeIcon` (line 20) — exported
3. `itemPreview` (line 25) — exported
4. `renderItemCard` (line 39) — exported
5. `renderBadgeCabinet` (line 71) — exported
6. `renderItemGrid` (line 102) — exported
7. `renderTab` (line 119) — exported

Excluded:
- `const escHtml = escapeHTML` — alias binding to imported `escapeHTML`. Callable but not a new function definition. Excluded.
- `import { escapeHTML }`, `import type { CosmeticItem, Category }`, etc. — all excluded
- Inline callbacks at lines 93, 98, 106 — anonymous, excluded
- No module-level side effects

**Count: 7**

---

## Summary

All 5 agents unanimous: **7 top-level named callable bindings**.

| # | Name | Line | Exported |
|---|------|------|----------|
| 1 | `depthLabel` | 14 | Yes |
| 2 | `badgeIcon` | 20 | Yes |
| 3 | `itemPreview` | 25 | Yes |
| 4 | `renderItemCard` | 39 | Yes |
| 5 | `renderBadgeCabinet` | 71 | Yes |
| 6 | `renderItemGrid` | 102 | Yes |
| 7 | `renderTab` | 119 | Yes |
