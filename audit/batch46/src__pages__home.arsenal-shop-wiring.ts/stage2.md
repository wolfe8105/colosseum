# Stage 2 Outputs — home.arsenal-shop-wiring.ts

## Agent 01

### wireShopEvents

`wireShopEvents` is a synchronous, void-returning function that accepts four parameters: `container` (an `HTMLElement` — the rendered shop's root element), `state` (a `ShopState` object holding mutable filter values and the product catalog), `onStateChange` (a zero-argument callback invoked after any state mutation to trigger a re-render), and `onSheetOpen` (a one-argument callback that receives a cleanup function and is invoked when a bottom sheet should open). The function reads no module-level state. It writes exclusively to `state` (mutating its properties) and to the DOM (attaching event listeners). It imports `openBottomSheet` from `./home.arsenal-shop-sheet.ts`.

The function body consists of seven sequential event-wiring blocks. There are no early returns, no try/catch blocks, and no async operations at the top level (though one event handler is declared `async`).

**Block 1 — Product type toggle (lines 25–30):** `container.querySelectorAll<HTMLButtonElement>('[data-product]')` selects all product-type toggle buttons. For each, a `click` listener is attached. On click, `state.productType` is assigned `btn.dataset.product` cast to `ProductType`. `onStateChange()` is called.

**Block 2 — Category chips (lines 33–38):** `container.querySelectorAll<HTMLButtonElement>('[data-cat]')` selects all category filter buttons. For each, a `click` listener sets `state.categoryFilter` to `btn.dataset.cat` cast to `ModifierCategory | 'all'`, then calls `onStateChange()`.

**Block 3 — Rarity chips (lines 41–46):** `container.querySelectorAll<HTMLButtonElement>('[data-rarity]')` selects all rarity filter buttons. For each, a `click` listener sets `state.rarityFilter` to `btn.dataset.rarity` cast to `RarityTier | 'all'`, then calls `onStateChange()`.

**Block 4 — Timing chips (lines 49–55):** `container.querySelectorAll<HTMLButtonElement>('[data-timing]')` selects all timing filter buttons. The click handler reads `btn.dataset.timing` cast to `'in_debate' | 'end_of_debate'` into local `t`. It then toggles: if `state.timingFilter === t`, it sets `state.timingFilter` to `'all'`; otherwise it sets it to `t`. `onStateChange()` is called.

**Block 5 — Afford toggle (lines 58–64):** `container.querySelector<HTMLButtonElement>('[data-afford]')` selects a single optional afford-filter button. If it exists, a `click` listener toggles `state.affordableOnly` by negation (`!state.affordableOnly`), then calls `onStateChange()`.

**Block 6 — Card tap to bottom sheet (lines 67–76):** `container.querySelectorAll<HTMLElement>('.mod-effect-card')` selects all product cards. The click handler first checks whether the click target (or any ancestor up to the card) is a `.mod-buy-btn`; if so, it returns early without opening a sheet. Otherwise it reads `card.dataset.effectId`; if absent, returns. It calls `state.catalog.find()` to locate the matching `ModifierEffect` by `id`; if not found, returns. Finally it calls `onSheetOpen(openBottomSheet(effect, state, onStateChange))`, passing the cleanup function returned by `openBottomSheet` to the orchestrator via `onSheetOpen`.

**Block 7 — Buy button (lines 82–91):** `container.querySelectorAll<HTMLButtonElement>('.mod-buy-btn')` selects all buy buttons. The click handler is declared `async`. It calls `e.stopPropagation()` to prevent the parent card's click handler from firing. It then reads `btn.dataset.effectId`; if absent, returns. It calls `state.catalog.find()` to locate the `ModifierEffect`; if not found, returns. It calls `onSheetOpen(openBottomSheet(effect, state, onStateChange))` — identical logic to Block 6's sheet-opening path. The `async` keyword on this handler is unused: the function body contains no `await` expression and no asynchronous operation. The comment at lines 78–81 labels this handler as "bypasses sheet" but the implementation calls `openBottomSheet`, which is factually incorrect.

---

## Agent 02

### wireShopEvents

`wireShopEvents` is a synchronous void function. Its four parameters are: `container` (HTMLElement — the shop container), `state` (ShopState — a mutable object tracking product type, category, rarity, timing, affordable filters, and the effect catalog), `onStateChange` (() => void — re-render trigger), and `onSheetOpen` ((cleanup: () => void) => void — sheet lifecycle handoff). The function reads no module-level variables. It writes to `state` properties and registers DOM event listeners on elements within `container`. No early returns. No try/catch blocks.

**Product type toggle (lines 25–30):** Attaches click listeners to all `[data-product]` buttons within `container`. Each listener assigns `btn.dataset.product` (cast to `ProductType`) to `state.productType` and calls `onStateChange()`.

**Category filter chips (lines 33–38):** Attaches click listeners to all `[data-cat]` buttons. Each listener assigns `btn.dataset.cat` (cast to `ModifierCategory | 'all'`) to `state.categoryFilter` and calls `onStateChange()`.

**Rarity filter chips (lines 41–46):** Attaches click listeners to all `[data-rarity]` buttons. Each listener assigns `btn.dataset.rarity` (cast to `RarityTier | 'all'`) to `state.rarityFilter` and calls `onStateChange()`.

**Timing filter chips — toggle behavior (lines 49–55):** Attaches click listeners to all `[data-timing]` buttons. Each listener reads `btn.dataset.timing` (cast to `'in_debate' | 'end_of_debate'`) into `t`, then sets `state.timingFilter` to `'all'` if it was already `t` (deselect), or to `t` otherwise (select). Calls `onStateChange()`.

**Affordable toggle (lines 58–64):** Queries for a single `[data-afford]` button. If present, attaches a click listener that negates `state.affordableOnly` and calls `onStateChange()`. If the button is absent, this block is a no-op.

**Card tap — bottom sheet open (lines 67–76):** Attaches click listeners to all `.mod-effect-card` elements. Each listener has a `.mod-buy-btn` guard: if the click target or any ancestor matches `.mod-buy-btn`, the handler returns early to avoid double-triggering. If `card.dataset.effectId` is absent, returns early. Looks up the effect in `state.catalog` by id. If not found, returns early. Calls `onSheetOpen(openBottomSheet(effect, state, onStateChange))`.

**Buy button (lines 82–91):** Attaches `async` click listeners to all `.mod-buy-btn` buttons. The `async` keyword is present but the handler body contains no `await` — the async annotation is superfluous. `e.stopPropagation()` prevents the parent card handler from firing. Reads `btn.dataset.effectId`; if absent, returns early. Looks up the effect in `state.catalog` by id; if not found, returns early. Calls `onSheetOpen(openBottomSheet(effect, state, onStateChange))`. The comment at lines 78–81 is misleading: it describes this handler as bypassing the sheet, but the implementation calls `openBottomSheet` — the same as Block 6.

---

## Agent 03

### wireShopEvents

`wireShopEvents` is a synchronous void function with four parameters: `container` (HTMLElement — the rendered shop root), `state` (ShopState — mutable filter and catalog state), `onStateChange` (callback invoked after state mutations to trigger re-renders), and `onSheetOpen` (callback that receives the sheet cleanup function). There is no module-level state. Writes are to `state` properties and to DOM event listener registrations. No early returns. No try/catch blocks. No async top-level logic.

The function body executes seven sequential event-wiring operations:

1. **Product type (lines 25–30):** `querySelectorAll('[data-product]')` → forEach → `click`: sets `state.productType` from `btn.dataset.product`, calls `onStateChange()`.

2. **Category (lines 33–38):** `querySelectorAll('[data-cat]')` → forEach → `click`: sets `state.categoryFilter` from `btn.dataset.cat`, calls `onStateChange()`.

3. **Rarity (lines 41–46):** `querySelectorAll('[data-rarity]')` → forEach → `click`: sets `state.rarityFilter` from `btn.dataset.rarity`, calls `onStateChange()`.

4. **Timing (lines 49–55):** `querySelectorAll('[data-timing]')` → forEach → `click`: reads `t = btn.dataset.timing`; sets `state.timingFilter` to `'all'` if currently `t`, else to `t` (toggle). Calls `onStateChange()`.

5. **Afford (lines 58–64):** `querySelector('[data-afford]')` → if present → `click`: toggles `state.affordableOnly` by negation. Calls `onStateChange()`.

6. **Card tap (lines 67–76):** `querySelectorAll('.mod-effect-card')` → forEach → `click`: if target is `.mod-buy-btn` descendant, return early. If no `effectId` on `card.dataset`, return early. Find `effect` in `state.catalog`; if not found, return early. Call `onSheetOpen(openBottomSheet(effect, state, onStateChange))`.

7. **Buy button (lines 82–91):** `querySelectorAll('.mod-buy-btn')` → forEach → `async click`: `e.stopPropagation()`. If no `effectId` on `btn.dataset`, return early. Find `effect` in `state.catalog`; if not found, return early. Call `onSheetOpen(openBottomSheet(effect, state, onStateChange))`. The `async` declaration on the handler is unused — no `await` expressions are present. The inline LANDMINE comment (lines 78–81) describes this handler as "bypasses sheet" but both this handler and the card-tap handler call `openBottomSheet`; the comment is factually incorrect.

---

## Agent 04

### wireShopEvents

`wireShopEvents` accepts `container: HTMLElement`, `state: ShopState`, `onStateChange: () => void`, and `onSheetOpen: (cleanup: () => void) => void`. It returns `void`. It is synchronous (one handler is declared `async` but awaits nothing). It reads no module-level variables. It mutates `state` properties and attaches DOM event listeners; it does not write to `innerHTML` or any other DOM property other than listener registration. No try/catch.

**Filter wiring (blocks 1–5):** Five wiring blocks attach click listeners for product type, category, rarity, timing, and affordable-only filters. Blocks 1–4 use `querySelectorAll` + `forEach`. Block 5 uses `querySelector` with an existence guard. All five blocks follow the same pattern: read a `dataset` attribute from the clicked button, assign the cast value to the relevant `state` property, call `onStateChange()`. The timing block additionally implements a toggle: if `state.timingFilter` already equals the selected value, it reverts to `'all'`.

**Sheet wiring (blocks 6–7):** Block 6 wires `.mod-effect-card` click handlers. Each handler contains three early-return guards in sequence: (a) if the click target is a `.mod-buy-btn` or its descendant, return — prevents overlap with block 7; (b) if `card.dataset.effectId` is absent, return; (c) if `state.catalog.find()` returns `undefined` for that id, return. On the happy path, `openBottomSheet(effect, state, onStateChange)` is called and its return value (the cleanup function) is passed to `onSheetOpen`. Block 7 wires `.mod-buy-btn` click handlers. Identical sheet-opening logic, but additionally calls `e.stopPropagation()` to prevent card-tap propagation. The handler is declared `async` but contains no `await` — the `async` keyword serves no purpose and means the handler returns a `Promise<void>` rather than `void`; if any code within the handler threw synchronously, the error would be swallowed as a rejected promise rather than propagating as a thrown exception. The inline comment at line 78–81 reads "Buy button (direct tap, bypasses sheet)" but the implementation opens a bottom sheet via `openBottomSheet` — it does not bypass the sheet.

---

## Agent 05

### wireShopEvents

`wireShopEvents` is a synchronous void function. Parameters: `container` (HTMLElement), `state` (ShopState — mutable), `onStateChange` (() => void), `onSheetOpen` ((cleanup: () => void) => void). It reads no module-level state. It attaches event listeners and mutates `state`. No innerHTML writes occur. No try/catch blocks.

The function wires seven event categories in sequence:

**[data-product] buttons (lines 25–30):** Click → `state.productType = btn.dataset.product as ProductType` → `onStateChange()`.

**[data-cat] buttons (lines 33–38):** Click → `state.categoryFilter = btn.dataset.cat as ModifierCategory | 'all'` → `onStateChange()`.

**[data-rarity] buttons (lines 41–46):** Click → `state.rarityFilter = btn.dataset.rarity as RarityTier | 'all'` → `onStateChange()`.

**[data-timing] buttons (lines 49–55):** Click → toggle: `const t = btn.dataset.timing as 'in_debate' | 'end_of_debate'`; `state.timingFilter = state.timingFilter === t ? 'all' : t`; `onStateChange()`.

**[data-afford] button (lines 58–64):** Optional single button. Click → `state.affordableOnly = !state.affordableOnly` → `onStateChange()`. No-op if button absent.

**.mod-effect-card elements (lines 67–76):** Click → guard: if `.mod-buy-btn` is in click path, return early. Guard: if `card.dataset.effectId` absent, return early. Guard: if `state.catalog.find(ef => ef.id === effectId)` returns undefined, return early. Happy path: `onSheetOpen(openBottomSheet(effect, state, onStateChange))`.

**.mod-buy-btn buttons (lines 82–91):** Declared `async`. Click → `e.stopPropagation()`. Guard: if `btn.dataset.effectId` absent, return early. Guard: if `state.catalog.find(ef => ef.id === effectId)` returns undefined, return early. Happy path: `onSheetOpen(openBottomSheet(effect, state, onStateChange))`. The `async` keyword is dead — no `await` in body. The comment at lines 78–81 claims this handler "bypasses sheet" which is false; it opens the same sheet as the card-tap handler.
