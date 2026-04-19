# Stage 2 Outputs — powerups.activation.ts

## Agent 01

### renderActivationBar

This function accepts an array of `EquippedItem` objects as `equipped`. If `equipped` is nullish or empty (checked via optional chain `equipped?.length`), it immediately returns an empty string. Otherwise it calls `Array.prototype.map` over `equipped`, producing one template-literal string per item. Inside the map callback: it looks up `CATALOG[eq.power_up_id as PowerUpId]` to get the catalog entry `cat`; it computes `isPassive` as `true` if `eq.power_up_id === 'multiplier_2x'`. It then returns a template literal containing a `<button>` element. The button has class `powerup-activate-btn` plus `passive` if `isPassive`. Data attributes `data-id` and `data-slot` receive `eq.power_up_id` and `eq.slot_number` respectively. If `isPassive`, the button is rendered `disabled` with a title attribute. Inline styles are computed via ternaries on `isPassive`. Inside the button, `escapeHTML(eq.icon ?? cat?.icon ?? '?')` is called to produce a safe icon span. A second span shows `'ACTIVE'` if passive, `'USE'` otherwise. The function wraps all button strings with `buttons.join('')` inside an outer template literal producing a `div#powerup-activation-bar`. Returns the complete HTML string. Synchronous.

### wireActivationBar

This function accepts `debateId` (string) and `callbacks` (ActivationCallbacks). It calls `document.querySelectorAll('.powerup-activate-btn:not(.passive):not(.used)')` to select active non-used power-up buttons currently in the DOM. It iterates via `.forEach`, attaching an async `'click'` event listener to each button. Inside the click handler: the button element is cast to `HTMLButtonElement`. `powerUpId` is read from `el.dataset.id` with a `?? ''` fallback. The button is immediately disabled (`el.disabled = true`) and visually dimmed (`el.style.opacity = '0.5'`). It then `await`s `activate(debateId, powerUpId)`. If `result.success` is falsy, the button is re-enabled (`el.disabled = false`, `opacity = '1'`) and the handler returns early. On success: `'used'` class is added, background and border styles are updated to a green tint, `span:last-child` label is set to `'USED'`. Then `powerUpId` is compared to `'silence'`, `'shield'`, and `'reveal'`; the matching optional callback is invoked via `?.()`. No try/catch or finally block — if `activate()` throws, the button remains permanently disabled.

---

## Agent 02

### renderActivationBar

Accepts `equipped: EquippedItem[]`. Guards against nullish/empty with `equipped?.length` falsy check — returns `''` immediately. Maps over equipped items: for each reads `eq.power_up_id`, `eq.slot_number`, `eq.icon`; looks up `CATALOG[eq.power_up_id as PowerUpId]`; derives `isPassive` from strict equality to `'multiplier_2x'`. Constructs a `<button>` template string with conditional CSS classes, data attributes (`data-id`, `data-slot`), conditional `disabled` attribute, inline styles varying by `isPassive`, and an icon span using `escapeHTML(eq.icon ?? cat?.icon ?? '?')`. Returns joined button strings wrapped in the activation bar `div`. Synchronous; no state writes; no DOM mutation.

### wireActivationBar

Accepts `debateId: string` and `callbacks: ActivationCallbacks`. Queries DOM for `.powerup-activate-btn:not(.passive):not(.used)`. For each found button, registers an async click handler. Handler: casts to `HTMLButtonElement`, reads `dataset.id` (fallback `''`), sets `disabled = true` and `opacity = '0.5'`. Awaits `activate(debateId, powerUpId)`. On failure (`!result.success`): restores `disabled = false` and `opacity = '1'`, returns. On success: adds `'used'` class, updates styles, sets `span:last-child` textContent to `'USED'`, calls appropriate callback via optional chaining. No try/catch — if `activate` throws, button stays disabled permanently. No cleanup/destroy mechanism. Returns void.

---

## Agent 03

### renderActivationBar

Takes `equipped: EquippedItem[]`. Returns `''` if `equipped?.length` is falsy. Maps each `EquippedItem` to an HTML button string: looks up CATALOG entry, determines passive state, builds template literal with ternary-controlled classes, disabled attribute, inline styles, data attributes for id and slot, and an icon wrapped in `escapeHTML()`. The `escapeHTML` call uses `eq.icon ?? cat?.icon ?? '?'` — icon from item first, fallback to catalog icon, fallback to `'?'`. Joins the button strings and wraps in the activation bar container div. Returns HTML string. No side effects.

### wireActivationBar

Takes `debateId: string` and `callbacks: ActivationCallbacks`. Selects non-passive, non-used power-up buttons via querySelectorAll. For each button attaches an async click listener. Handler disables the button visually (disabled + opacity), awaits activate RPC, and on failure restores the button and returns. On success: marks button as used (class, styles, label text), then dispatches to appropriate callback. No error handling around the await — an exception from `activate()` would leave the button in a permanently disabled state. No try/finally.

---

## Agent 04

### renderActivationBar

Accepts `EquippedItem[]`. Returns empty string if equipped is nullish or has zero items. Maps over equipped to build button HTML: for each item accesses CATALOG by power_up_id (type assertion), determines isPassive, emits a button element with conditional class, disabled attribute, inline styles, data-attributes, and icon content sanitized with `escapeHTML(eq.icon ?? cat?.icon ?? '?')`. Returns the buttons joined in a wrapper div. Synchronous, pure HTML generator.

### wireActivationBar

Accepts debateId and ActivationCallbacks. Queries all active power-up buttons. Attaches async click handlers. On click: disables button, awaits `activate()`; if failure, re-enables and returns; if success, marks button used and fires appropriate optional callback. No try/catch — thrown errors leave button permanently disabled. Void return; no interval or cleanup required.

---

## Agent 05

### renderActivationBar

When called with an `EquippedItem[]`, guards against nullish/empty and returns `''`. Calls `Array.prototype.map` on `equipped`. For each item: looks up `CATALOG[eq.power_up_id as PowerUpId]`, computes `isPassive`. Returns template literal button with conditional class `passive`, data attributes `data-id` and `data-slot`, conditional `disabled` attribute, inline styles switching on `isPassive`, an icon span with `escapeHTML(eq.icon ?? cat?.icon ?? '?')`, and a label span (`'ACTIVE'` or `'USE'`). Wraps result in activation bar div. Synchronous.

### wireActivationBar

When called with `debateId` and `callbacks`, selects `.powerup-activate-btn:not(.passive):not(.used)` via querySelectorAll and attaches async click listeners. Each listener: casts button to HTMLButtonElement, reads `dataset.id ?? ''`, immediately sets `disabled = true` and `opacity = '0.5'`. Awaits `activate(debateId, powerUpId)`. If not successful: restores button state, returns early. If successful: adds `'used'` class, updates styles, sets label to `'USED'`, calls matching optional callback. No exception handling — `activate()` throwing permanently disables the button. Returns void.
