# Stage 2 Outputs — powerups.shop.ts

## Agent 01

### renderShop

**Signature and async status:** Synchronous. Takes one parameter, `tokenBalance: number`. Returns a `string`.

**Reads:** `tokenBalance` (parameter) and `CATALOG` (module-level import from `./powerups.types.ts`) — an object keyed by `PowerUpId` values, each value a `PowerUpCatalogEntry` with at least `icon`, `name`, `desc`, and `cost` fields.

**Control flow:**

1. `balance` is set to `tokenBalance || 0`. If `tokenBalance` is falsy (`0`, `undefined`, `null`, `NaN`), `balance` becomes `0`. A legitimate `0` balance is also replaced by `0`, so no loss in that case; `NaN` is silently coerced to `0`.

2. `Object.entries(CATALOG)` is cast as `[PowerUpId, PowerUpCatalogEntry][]` and `.map()` iterates every entry in insertion order. For each entry:
   - `canAfford` is computed as `balance >= pu.cost` (boolean).
   - An HTML string for a single shop-item `<div>` is produced. The `<button>` varies by `canAfford`:
     - `canAfford === true`: `disabled` attribute omitted; background `linear-gradient(135deg,var(--mod-text-heading),#B8860B)`; color `#0f0f1a`; cursor `pointer`.
     - `canAfford === false`: `disabled` attribute added; background `#2a2a3e`; color `#666`; cursor `default`.
   - `pu.icon`, `pu.name`, `pu.desc`, `pu.cost`, and `id` are interpolated directly into the HTML string without escaping. `CATALOG` is a compile-time import so XSS risk from user data is low, but uncertain if entries are ever populated from user input.

3. `items` (array of HTML strings) is joined with `''` and embedded in a wrapping `.powerup-shop` `<div>` that also displays `balance`.

**Error paths:** No `try/catch`. If `CATALOG` is empty, `items.join('')` is `''` and the function returns the shop container with no rows. If an entry is missing `cost`, `canAfford` evaluates `balance >= undefined` = `false`, button renders disabled showing `undefined 🪙`. If `CATALOG` itself is `null`/`undefined`, `Object.entries(CATALOG)` throws a `TypeError` uncaught.

**Writes:** No state mutations, no DOM writes. Returns the assembled HTML string.

## Agent 02

### renderShop

**Signature and sync status:** Synchronous. Returns a `string`. Takes `tokenBalance: number`.

**Module state read:** `CATALOG` from `./powerups.types.ts`. Read once via `Object.entries()`. No async state.

**Control flow:**
1. `balance = tokenBalance || 0`.
2. `Object.entries(CATALOG).map(...)` iterates every entry. No guard on empty `CATALOG`.
3. Inside `.map()`, `canAfford = balance >= pu.cost`. Template literal string built per item. Button receives `disabled` when `!canAfford`. Background, color, cursor switch via ternary.
4. `items.join('')` concatenated, embedded in outer `.powerup-shop` wrapper.

**DOM writes:** None. Pure string builder.

**Return value:** HTML string. Outer wrapper `.powerup-shop`, header row (balance + label), per-item `.powerup-shop-item` divs with `.powerup-buy-btn` buttons carrying `data-id` and `data-cost`.

**No `escapeHTML()` applied to `pu.icon`, `pu.name`, or `pu.desc`** — `CATALOG` is a static compile-time import, so XSS risk is low, but values are unescaped. **No `Number()` cast on `balance` before interpolation into the balance display span (line 31).** No `Number()` cast on `pu.cost` before interpolation into the button label (line 23).

**Error paths:** No try/catch. Empty `CATALOG` → empty item list, no error. Missing `pu.cost` → `canAfford = false`, button disabled, label shows `undefined 🪙`.

**Inline style notes:** Several hardcoded hex values (`#1a1a2e`, `#2a2a3e`, `#0f0f1a`, `#666`, `#B8860B`) and the font `'Oswald'` in the header are present. File's own JSDoc flags these as LANDMINE LM-PU-001.

## Agent 03

### renderShop

**Signature:** `renderShop(tokenBalance: number): string` — synchronous.

**Parameters / external state read:** `tokenBalance` and `CATALOG` (imported constant from `./powerups.types.ts`). No DOM, no Supabase, no mutable module-level state.

**Control flow:**
1. `balance = tokenBalance || 0`. `NaN` silently coerces to `0`.
2. `Object.entries(CATALOG)` cast and `.map()` over every entry in insertion order.
3. Inside map: `canAfford = balance >= pu.cost`. Template literal built per item. Values interpolated: `pu.icon`, `pu.name`, `pu.desc`, `id`, `pu.cost` (×2: `data-cost` and button label). Three ternaries on `canAfford`: `disabled` attribute, button background, button color.
4. Map returns per-item HTML strings. Joined with `''`. Embedded in outer wrapper.
5. Full template literal returned.

**Writes:** Nothing — no state mutations, no DOM writes.

**Return value:** HTML string, complete shop UI.

**Error paths:** No `try/catch`. Empty `CATALOG` → header + no items. Missing `PowerUpCatalogEntry` field → `"undefined"` literal in markup, no throw.

**Uncertainty:** Exact `CATALOG` shape requires reading `./powerups.types.ts`. Whether click listener checks `disabled` on buttons is outside this function.

## Agent 04

### renderShop

**Synchronous.** Returns a `string`. Takes `tokenBalance: number`.

**Parameter normalization:** `tokenBalance || 0` → `balance`. `NaN`, `null`, `undefined`, `0` all → `0`. Negative numbers pass through unchanged.

**External module state read:** `CATALOG` from `powerups.types.ts`. Read-only.

**Control flow — item loop:** `Object.entries(CATALOG)` cast and mapped. For each `[id, pu]`:
- `canAfford = balance >= pu.cost`.
- Three ternaries on `canAfford`: disabled attribute, button background (`linear-gradient(135deg,var(--mod-text-heading),#B8860B)` vs `#2a2a3e`), button color (`#0f0f1a` vs `#666`).

No try/catch. Empty `CATALOG` → empty items. Missing field → `"undefined"` in markup.

**Return value:** HTML string. `.powerup-shop` outer div, header row with hardcoded `'Oswald'` font, per-item rows.

**No DOM writes, no state writes, no async, no side effects.**

## Agent 05

### renderShop

**Synchronous.** Returns a `string`. Takes `tokenBalance: number`.

**Parameters read:** `tokenBalance` coerced to `0` via `|| 0`. `NaN`, `null`, `undefined`, `false`, `0` all → `balance = 0`.

**External state read:** `CATALOG` — module-level constant from `./powerups.types.ts`. Plain object keyed by `PowerUpId`, values are `PowerUpCatalogEntry` objects with at least `icon`, `name`, `desc`, `cost`. Fields read directly with no null-guards; missing fields produce `"undefined"` literally in the HTML.

**Calls and order:**
1. `Object.entries(CATALOG)` — native, synchronous.
2. `.map(([id, pu]) => ...)` — one iteration per catalog entry.
   - `canAfford = balance >= pu.cost`.
   - Template literal per item. `pu.icon`, `pu.name`, `pu.desc` inserted directly into innerHTML without `escapeHTML()`. `CATALOG` is compile-time constant, not user input, so XSS risk depends on whether `CATALOG` entries are ever dynamically populated at runtime elsewhere.
   - Button: `data-id="${id}"`, `data-cost="${pu.cost}"`, `disabled` when `!canAfford`, background/color/cursor ternaries.
3. `items.join('')` — concatenates, no separator.

**Return value:** `.powerup-shop` wrapper div, header row ("POWER-UP SHOP" + `${balance} 🪙`), joined items.

**State written:** None.

**Control flow:** No branches beyond `canAfford` ternaries inside `.map`. No `try/catch`. No early returns. Empty `CATALOG` → header + empty item list.
