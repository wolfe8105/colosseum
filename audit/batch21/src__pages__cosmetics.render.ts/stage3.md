# Stage 3 — Verification: cosmetics.render.ts

Source: src/pages/cosmetics.render.ts (126 lines)
Anchors verified: depthLabel (14), badgeIcon (20), itemPreview (25), renderItemCard (39), renderBadgeCabinet (71), renderItemGrid (102), renderTab (119)
Stage 2 findings under test: COS-1 (Low), COS-3 (Low), COS-4 (Low); COS-2 withdrawn
Agents: 5 (independent, parallel)

---

## Agent 1

Verified against source lines 14–126.

| Claim | Line(s) | Result |
|-------|---------|--------|
| `depthLabel`: numeric pipeline — no user string in output | 14–18 | PASS |
| `badgeIcon`: `escHtml(item.asset_url)` in src | 21 | PASS |
| `badgeIcon`: `escHtml(item.name)` in alt | 21 | PASS |
| `badgeIcon`: `item.name.charAt(0).toUpperCase()` unescaped — COS-1 | 22 | PASS (confirmed) |
| `itemPreview`: `escHtml(item.asset_url)` in video src | 28 | PASS |
| `itemPreview`: `escHtml(item.asset_url)` in img src | 30 | PASS |
| `itemPreview`: `escHtml(item.name)` in alt | 30 | PASS |
| `itemPreview`: `glyphs[item.category]` — hardcoded emoji | 36 | PASS |
| `renderItemCard`: `escHtml(item.cosmetic_id)` × 3 in data-id | 48, 52, 54 | PASS |
| `renderItemCard`: `(item.token_cost ?? 0).toLocaleString()` unescaped — COS-4 | 50 | PASS (confirmed) |
| `renderItemCard`: `escHtml(item.name)` in item-name | 64 | PASS |
| `renderItemCard`: `escHtml(item.unlock_condition)` | 65 | PASS |
| `renderBadgeCabinet`: `${owned.length}` no `Number()` — COS-3 | 76 | PASS (confirmed) |
| `renderBadgeCabinet`: `${items.length}` no `Number()` — COS-3 | 76 | PASS (confirmed) |
| `renderBadgeCabinet`: `escHtml(item.cosmetic_id)` in data-id | 79 | PASS |
| `renderBadgeCabinet`: `escHtml(item.name)` in aria-label + badge-name | 79, 81 | PASS |
| `renderItemGrid`: innerHTML via renderItemCard map — inherits renderItemCard | 103 | PASS |
| `renderTab`: null guard on container | 121 | PASS |

**All 3 confirmed findings verified in source. No Stage 2 PASS claim overturned.**

Score: **18 PASS / 0 PARTIAL / 0 FAIL**

---

## Agent 2

Verified against source lines 14–126.

| Claim | Line(s) | Result |
|-------|---------|--------|
| `item.name.charAt(0).toUpperCase()` — no escHtml — COS-1 | 22 | PASS (confirmed) |
| `(item.token_cost ?? 0).toLocaleString()` — no escHtml — COS-4 | 50 | PASS (confirmed) |
| `${owned.length}` + `${items.length}` — no Number() — COS-3 | 76 | PASS (confirmed) |
| `escHtml(item.asset_url)` in both img and video | 21, 28, 30 | PASS |
| `escHtml(item.name)` in alt | 21, 30 | PASS |
| `escHtml(item.cosmetic_id)` in data-id | 48, 52, 54, 79 | PASS |
| `escHtml(item.name)` in item-name div | 64 | PASS |
| `escHtml(item.unlock_condition)` | 65 | PASS |
| `escHtml(item.name)` in aria-label and badge-name | 79, 81 | PASS |
| `stateClass` — closed ternary | 40 | PASS |
| `tile.dataset.id` used for lookup only | 94 | PASS |
| `renderTab` null guard | 121 | PASS |

**COS-2 withdrawal verified**: `item.tier` on line 57 is `item.tier ?` — used as number boolean, and in `tier-${item.tier}` (class) and `T${item.tier}` (text). With `CosmeticItem.tier: number | null` confirmed, output is digits or "null" — no HTML injection. Withdrawal correct.

Score: **12 PASS / 0 PARTIAL / 0 FAIL**

---

## Agent 3

Verified against source lines 14–126.

| Claim | Line(s) | Result |
|-------|---------|--------|
| COS-1: `item.name.charAt(0).toUpperCase()` unescaped | 22 | PASS (confirmed) |
| COS-3: `${owned.length}` / `${items.length}` no cast | 76 | PASS (confirmed) |
| COS-4: `toLocaleString()` no escHtml | 50 | PASS (confirmed) |
| `escHtml(item.asset_url)` in src attrs (img + video) | 21, 28, 30 | PASS |
| `escHtml(item.name)` in alt | 21, 30 | PASS |
| `glyphs[item.category]` — hardcoded emoji | 36 | PASS |
| `escHtml(item.cosmetic_id)` all 3 occurrences | 48, 52, 54 | PASS |
| `depthLabel(item.depth_threshold)` in button text — bounded output | 52 | PASS |
| `escHtml(item.name)` in item-name | 64 | PASS |
| `escHtml(item.unlock_condition)` | 65 | PASS |
| `escHtml(item.cosmetic_id)` in badge data-id | 79 | PASS |
| `escHtml(item.name)` in badge aria-label | 79 | PASS |
| `escHtml(item.name)` in badge-name | 81 | PASS |
| `el.dataset.action` and `el.dataset.id` — pass to modals, no innerHTML | 107–113 | PASS |
| `renderTab` filter/sort — no innerHTML injection | 123 | PASS |

Score: **15 PASS / 0 PARTIAL / 0 FAIL**

---

## Agent 4

Verified against source lines 14–126.

| Claim | Line(s) | Result |
|-------|---------|--------|
| COS-1: unescaped first char at line 22 | 22 | PASS (confirmed) |
| COS-3: `.length` values no Number() cast | 76 | PASS (confirmed) |
| COS-4: `toLocaleString()` no escHtml | 50 | PASS (confirmed) |
| `escHtml` correctly applied to all 3 data-id cosmetic_id occurrences | 48, 52, 54 | PASS |
| `escHtml(item.name)` and `escHtml(item.unlock_condition)` in card body | 64–65 | PASS |
| `escHtml` on badge cosmetic_id and name | 79, 81 | PASS |
| `item.tier` — `number \| null` — produces digits/null in class and text — no injection | 57 | PASS (COS-2 withdrawal confirmed) |
| `badgeIcon` img/alt escaping correct | 21 | PASS |
| `itemPreview` src/alt escaping correct, glyph hardcoded | 28–36 | PASS |

Score: **9 PASS / 0 PARTIAL / 0 FAIL**

---

## Agent 5

Verified against source lines 14–126.

Systematic verification of every non-literal entering innerHTML:

| Value | Line | Expected | Actual | Result |
|-------|------|----------|--------|--------|
| `item.asset_url` (badgeIcon img src) | 21 | `escHtml(...)` | `escHtml(item.asset_url)` | PASS |
| `item.name` (badgeIcon alt) | 21 | `escHtml(...)` | `escHtml(item.name)` | PASS |
| `item.name.charAt(0).toUpperCase()` | 22 | `escHtml(...)` | Raw char | PASS — COS-1 confirmed |
| `item.asset_url` (video src) | 28 | `escHtml(...)` | `escHtml(item.asset_url)` | PASS |
| `item.asset_url` (img src) | 30 | `escHtml(...)` | `escHtml(item.asset_url)` | PASS |
| `item.name` (img alt) | 30 | `escHtml(...)` | `escHtml(item.name)` | PASS |
| `glyphs[item.category]` | 36 | hardcoded | hardcoded emoji | PASS |
| `item.cosmetic_id` (equip btn) | 48 | `escHtml(...)` | `escHtml(item.cosmetic_id)` | PASS |
| `item.token_cost toLocaleString` | 50 | `escHtml(...)` | Raw locale string | PASS — COS-4 confirmed |
| `item.cosmetic_id` (depth-info btn) | 52 | `escHtml(...)` | `escHtml(item.cosmetic_id)` | PASS |
| `item.cosmetic_id` (free equip btn) | 54 | `escHtml(...)` | `escHtml(item.cosmetic_id)` | PASS |
| `item.tier` (class + text) | 57 | safe type | `number\|null` — digits/null | PASS — COS-2 withdrawal confirmed |
| `item.name` (item-name div) | 64 | `escHtml(...)` | `escHtml(item.name)` | PASS |
| `item.unlock_condition` | 65 | `escHtml(...)` | `escHtml(item.unlock_condition)` | PASS |
| `owned.length` | 76 | `Number(...)` | Raw `.length` | PASS — COS-3 confirmed |
| `items.length` | 76 | `Number(...)` | Raw `.length` | PASS — COS-3 confirmed |
| `item.cosmetic_id` (badge data-id) | 79 | `escHtml(...)` | `escHtml(item.cosmetic_id)` | PASS |
| `item.name` (badge aria-label) | 79 | `escHtml(...)` | `escHtml(item.name)` | PASS |
| `item.name` (badge-name) | 81 | `escHtml(...)` | `escHtml(item.name)` | PASS |

Score: **19 PASS / 0 PARTIAL / 0 FAIL**

---

## Consolidated Verification

| Finding | Stage 2 Claim | Stage 3 Result | Agents Confirming |
|---------|--------------|----------------|-------------------|
| COS-1 (Low): `badgeIcon` unescaped char at line 22 | 1 Low | **CONFIRMED** | 1, 2, 3, 4, 5 |
| COS-2 (withdrawn): `item.tier` text unescaped | Withdrawn | **WITHDRAWAL CONFIRMED** — `tier: number\|null` | 1, 2, 3, 4, 5 |
| COS-3 (Low): `owned.length`/`items.length` no `Number()` at line 76 | 1 Low | **CONFIRMED** | 1, 2, 3, 4, 5 |
| COS-4 (Low): `toLocaleString()` no escHtml at line 50 | 1 Low | **CONFIRMED** | 1, 2, 3, 4, 5 |

**All Stage 2 PASS claims verified. No Stage 2 claim overturned. No new findings introduced.**

## Final Verdict

**0 High · 0 Medium · 3 Low · 0 PARTIAL**

**COS-1** (Low, confirmed): `src/pages/cosmetics.render.ts` line 22 — `item.name.charAt(0).toUpperCase()` enters innerHTML without `escHtml()`. Fix: wrap with `escHtml()`.

**COS-3** (Low, confirmed): `src/pages/cosmetics.render.ts` line 76 — `${owned.length}` and `${items.length}` without `Number()` cast. Fix: `${Number(owned.length)}` / `${Number(items.length)}`.

**COS-4** (Low, confirmed): `src/pages/cosmetics.render.ts` line 50 — `(item.token_cost ?? 0).toLocaleString()` enters innerHTML without `escHtml()`. Fix: wrap with `escHtml()`.
