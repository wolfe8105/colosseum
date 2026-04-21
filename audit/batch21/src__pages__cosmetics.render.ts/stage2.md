# Stage 2 — Runtime Walk: cosmetics.render.ts

Source: src/pages/cosmetics.render.ts (126 lines)
Anchors: 7
Agents: 5 (independent, parallel)
Verdict: **0 High · 0 Medium · 4 Low · 0 PARTIAL**

---

## Agent 1

### depthLabel (line 14)
- Input: `threshold: number | null` — typed, not user-string input
- `threshold.toFixed(2)` → `Number.parseFloat(...)` → `String(...)` → key for DEPTH_LABEL lookup — numeric pipeline, no user string — SAFE
- `DEPTH_LABEL[key]` — lookup on a const from cosmetics.types.ts. Value is a hardcoded label string (e.g., `"Top 50%"`). If DEPTH_LABEL is a compiled-in const, values are author-controlled. No user data. — SAFE (pending DEPTH_LABEL verification)
- `${Math.round(threshold * 100)}%` — numeric computation, produces only digits + `%` — SAFE

### badgeIcon (line 20)
- `escHtml(item.asset_url)` in src attr — SAFE
- `escHtml(item.name)` in alt attr — SAFE
- `item.name.charAt(0).toUpperCase()` — returns single char, unescaped, into innerHTML — **Low**: if `item.name` begins with `<`, `>`, or `&`, the raw character enters innerHTML. Single character reduces exploitability, but project escaping policy requires `escHtml()` on all user strings entering innerHTML.

### itemPreview (line 25)
- `escHtml(item.asset_url)` in src attrs (video and img branches) — SAFE
- `escHtml(item.name)` in alt attr — SAFE
- `glyphs[item.category]` — Category type guarantees one of 6 keys; value is a hardcoded emoji string — SAFE

### renderItemCard (line 39)
- `stateClass` — closed ternary of 3 literals — SAFE
- `escHtml(item.cosmetic_id)` in data-id attrs — SAFE
- `(item.token_cost ?? 0).toLocaleString()` — numeric value formatted as locale string. Returns digits + locale separators only; no HTML special chars. Technically unescaped — **Low**: consistent with DAR-1 pattern; `escHtml()` should wrap locale-formatted numbers per project policy.
- `depthLabel(item.depth_threshold)` — computed safe string — SAFE
- `item.tier` in `tier-${item.tier}` class name and `T${item.tier}` text content — no escaping. **Low**: if `item.tier` is a string type containing `<`/`>`/`&`, text content `T${item.tier}` would enter innerHTML unescaped. Class name injection cannot cause XSS but text content can.
- `${itemPreview(item)}` — trusted output from audited function — SAFE
- `${escHtml(item.name)}` — SAFE
- `${escHtml(item.unlock_condition)}` — SAFE
- `${actionBtn}` — builder-controlled HTML variable — SAFE

### renderBadgeCabinet (line 71)
- `${owned.length}` and `${items.length}` — `.length` is always a non-negative integer. No `Number()` cast — **Low**: violates project "Numeric casting before innerHTML" rule.
- `${escHtml(item.cosmetic_id)}` in data-id — SAFE
- `${escHtml(item.name)}` in aria-label and badge-name — SAFE
- `${badgeIcon(item)}` — output includes potential unescaped single char (see badgeIcon finding) — risk flows through from COS-1
- Unowned tiles: all hardcoded literals — SAFE
- `tile.dataset.id` → `catalog.find(i => i.cosmetic_id === tile.dataset.id)` — lookup only, no DOM injection — SAFE
- `showInfoModal(item.name, item.unlock_condition ?? '...')` — passes raw strings; safety depends on showInfoModal (out of scope) — noted

### renderItemGrid (line 102)
- `container.innerHTML` set to `items.map(i => renderItemCard(i, isLoggedIn)).join('')` — HTML built by `renderItemCard`; safety depends on renderItemCard analysis — inherits any renderItemCard findings
- `el.dataset.action` and `el.dataset.id` — read from DOM, passed to modal functions — no DOM injection at this layer — SAFE
- `openConfirmModal(id, catalog)`, `handleEquip(id, el, catalog)`, `showInfoModal(...)` — out-of-scope delegations

### renderTab (line 119)
- `document.getElementById('tab-content')` + null guard — SAFE
- `catalog.filter(i => i.category === category)` — comparison, no injection — SAFE
- `.sort((a, b) => a.sort_order - b.sort_order)` — numeric — SAFE
- Delegates to `renderBadgeCabinet` or `renderItemGrid` — SAFE
- `onRender` callback parameter — accepted but NOT called in this function body (potential dead param, not security issue)

**Summary: 4 Low (COS-1: badgeIcon char, COS-2: tier unescaped, COS-3: .length no cast, COS-4: toLocaleString unescaped)**

---

## Agent 2 (read `cosmetics.types.ts` for DEPTH_LABEL and item.tier type)

**Key findings: DEPTH_LABEL confirmed; `tier` type confirmed.**

```typescript
export const DEPTH_LABEL: Record<string, string> = {
  '0': 'Starter',
  '0.25': 'Top 25%',
  '0.5': 'Top 50%',
  '0.75': 'Top 75%',
  '1': 'Complete',
};
// (approximate — values are author-controlled strings)

export interface CosmeticItem {
  ...
  tier: number | null;
  token_cost: number | null;
  ...
}
```

- `DEPTH_LABEL` values: author-controlled static strings. No user data. `depthLabel()` — SAFE.
- `item.tier: number | null` — typed as `number`. `tier-${item.tier}` in class name produces `tier-1`, `tier-null` etc. Text content `T${item.tier}` produces `T1`, `Tnull` — no HTML injection possible from a `number | null` type. **COS-2 withdrawn: item.tier is number | null — TypeScript prevents string injection.**
- `item.token_cost: number | null` — typed as `number`. `(item.token_cost ?? 0).toLocaleString()` produces a formatted number string. No HTML special chars possible from a number type. However, project rule requires explicit handling — **Low** (policy, not exploitable).
- `badgeIcon` single char: Low — still valid finding.
- `owned.length` / `items.length`: numeric `.length` — always non-negative integer. Low per project rule.

**Summary: 3 Low (COS-1, COS-3, COS-4). COS-2 withdrawn (tier is number|null type).**

---

## Agent 3

### depthLabel (line 14)
- Numeric input pipeline — SAFE

### badgeIcon (line 20)
- `escHtml(item.asset_url)` — SAFE
- `escHtml(item.name)` in alt — SAFE
- `item.name.charAt(0).toUpperCase()` — single char, no `escHtml()` — **Low**: project policy requires escaping all user strings entering innerHTML, regardless of length.

### itemPreview (line 25)
- All user strings escaped — SAFE

### renderItemCard (line 39)
- `escHtml(item.cosmetic_id)` × 3 data-id — SAFE
- `item.tier` in class and text: `T${item.tier}` — **Low** if string type (see type confirmation discussion). Agents 2 confirmed number|null — if confirmed, withdraw.
- `(item.token_cost ?? 0).toLocaleString()` — **Low**: unescaped locale-formatted number per project policy.
- `depthLabel(...)` embedded in button text unescaped — SAFE (depthLabel output is controlled)
- `escHtml(item.name)`, `escHtml(item.unlock_condition)` — SAFE

### renderBadgeCabinet (line 71)
- `${owned.length}` / `${items.length}` — **Low**: no `Number()` cast
- `${escHtml(item.cosmetic_id)}` — SAFE
- `${escHtml(item.name)}` — SAFE
- `${badgeIcon(item)}` — inherits COS-1 risk

### renderItemGrid (line 102)
- Inherits renderItemCard findings
- Dataset lookups — SAFE

### renderTab (line 119)
- SAFE throughout

**Summary: 3 Low (COS-1, COS-3, COS-4). COS-2 rated None pending type confirmation.**

---

## Agent 4

Confirms Agent 2's type read. `item.tier: number | null` — no string injection possible.

### badgeIcon (line 20)
- `item.name.charAt(0).toUpperCase()` — **Low**: single unescaped user-sourced char in innerHTML. Even one char: if name is `<script>` the first char `<` enters unescaped. No practical exploit path (single `<` is not a complete tag), but policy violation.

### renderItemCard (line 39)
- `(item.token_cost ?? 0).toLocaleString()` — typed as `number`. Output: digit string + locale separators. Cannot produce HTML special chars. **Low** (policy violation).
- `tier-${item.tier}` / `T${item.tier}` — typed as `number | null`. Produces digits or "null". No injection. **None** (type-safe).
- `depthLabel(...)` in button text: output is bounded string from controlled lookup or numeric computation — **None**.

### renderBadgeCabinet (line 71)
- `owned.length` / `items.length`: `Array.length` always a non-negative safe integer. **Low** (policy).

### renderTab (line 119)
- All SAFE.

**Summary: 3 Low (COS-1, COS-3, COS-4).**

---

## Agent 5

Walk ordered by innerHTML injection surface:

**renderBadgeCabinet** (sets container.innerHTML):
- `${owned.length}` — no `Number()` — **Low** (COS-3)
- `${items.length}` — no `Number()` — **Low** (COS-3, same finding)
- `${escHtml(item.cosmetic_id)}` — SAFE
- `${escHtml(item.name)}` — SAFE
- `${badgeIcon(item)}` — calls badgeIcon; unescaped char path — flows COS-1

**renderItemGrid** (sets container.innerHTML via renderItemCard):
- All user strings routed through `escHtml()` in renderItemCard — SAFE, except:
  - `(item.token_cost ?? 0).toLocaleString()` — Low (COS-4)

**badgeIcon** (returns innerHTML-bound string):
- `item.name.charAt(0).toUpperCase()` — **Low** (COS-1)

**itemPreview** (returns innerHTML-bound string):
- All paths use `escHtml()` or hardcoded glyphs — SAFE

**depthLabel** (returns display string, not directly innerHTML):
- Numeric pipeline — SAFE

**renderItemCard** (returns innerHTML-bound string):
- `item.tier` in class/text: `number | null` type — SAFE
- `toLocaleString()` — Low (COS-4)
- All `escHtml()` calls correct — SAFE

**renderTab**:
- SAFE

**Summary: 3 Low (COS-1, COS-3, COS-4).**

---

## Consolidated Findings

| ID | Anchor | Severity | Finding | Agents |
|----|--------|----------|---------|--------|
| COS-1 | `badgeIcon` | Low | `item.name.charAt(0).toUpperCase()` returned as bare HTML content without `escHtml()`. Single character from user-sourced name enters innerHTML unescaped. `<` alone does not form a tag, but violates project "escape everything" policy. Fix: `escHtml(item.name.charAt(0).toUpperCase())` or `escHtml(item.name).charAt(0).toUpperCase()` at line 22. | 1, 2, 3, 4, 5 |
| COS-3 | `renderBadgeCabinet` | Low | `${owned.length}` and `${items.length}` interpolated into innerHTML (line 76) without `Number()` cast. `Array.length` is always a non-negative safe integer — zero actual risk, but violates project "Numeric casting before innerHTML" rule. Fix: `${Number(owned.length)} / ${Number(items.length)}`. | 1, 2, 3, 4, 5 |
| COS-4 | `renderItemCard` | Low | `(item.token_cost ?? 0).toLocaleString()` interpolated into innerHTML (line 50) without `escHtml()`. `item.token_cost` is `number | null` — locale-formatted output contains only digits and locale separators; no HTML special chars possible. Policy violation consistent with DAR-1 pattern. Fix: `escHtml(((item.token_cost ?? 0).toLocaleString()))`. | 1, 2, 3, 4, 5 |

**COS-2 withdrawn**: Agent 1 and Agent 3 initially flagged `item.tier` in `T${item.tier}` as a potential Low (unescaped string in text content). Agent 2 read `cosmetics.types.ts` and confirmed `item.tier: number | null` — TypeScript type prevents string injection. `T1`, `T2`, `Tnull` — no HTML special chars possible. **Finding withdrawn.**

**No High or Medium findings. No XSS paths. No open redirect.**

## Recommended Fixes

**COS-1** (line 22): `return item.name.charAt(0).toUpperCase();` → `return escHtml(item.name.charAt(0).toUpperCase());`

**COS-3** (line 76): `Earned — ${owned.length} / ${items.length}` → `Earned — ${Number(owned.length)} / ${Number(items.length)}`

**COS-4** (line 50): `${(item.token_cost ?? 0).toLocaleString()}` → `${escHtml(((item.token_cost ?? 0).toLocaleString()))}`
