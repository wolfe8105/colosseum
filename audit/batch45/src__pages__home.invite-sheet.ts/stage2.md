# Stage 2 Outputs — home.invite-sheet.ts

## Agent 01

### openClaimSheet

The function is `async` and returns `Promise<() => void>`. It receives four arguments closed over for the lifetime of the sheet: `rewardId` (string, the reward DB record ID), `rewardType` (union literal from `InviteReward['reward_type']`), `onClose` (caller callback invoked on any dismissal), and `onReload` (caller callback invoked only on successful claim).

**DOM construction:** `document.createElement('div')` creates a detached div. Its `className` is set to `'bottom-sheet-overlay'`. Its `innerHTML` is assigned a template literal that produces a `.bottom-sheet` wrapper containing: a `.sheet-handle` div, a `.sheet-title` div whose text is `"PICK YOUR "` followed by `rewardTypeLabel(rewardType)?.toUpperCase() ?? 'REWARD'` (synchronous call; uppercased if non-nullish, else literal `'REWARD'`), a `.invite-claim-grid#claim-picker-grid` div with a `.invite-loading` child showing `"Loading catalog…"`, and a `button#claim-cancel` with text `"Cancel"`. `document.body.appendChild(overlay)` attaches the overlay to the live DOM immediately.

**close closure:** `close` is defined as `(): void => { overlay.remove(); onClose(); }`. It closes over `overlay` and `onClose`. When called it removes the overlay from the DOM then calls `onClose()`.

**Event wiring (before async):** (1) `overlay.addEventListener('click', ...)` — checks `e.target === overlay` (backdrop click only) and calls `close()` if true. (2) `overlay.querySelector('#claim-cancel')?.addEventListener('click', close)` — attaches `close` to the Cancel button via optional chain.

**Async fetch:** `await getModifierCatalog()` suspends. The overlay is live and both dismiss paths are active during this pause. On resolution `catalog` holds an array of `ModifierEffect` objects.

**Tier filtering:** `tierNeeded` is `'legendary'` if `rewardType === 'legendary_powerup'`, else `'mythic'`. `eligible` is `catalog.filter(e => e.tier_gate === tierNeeded)`.

**Grid reference:** `grid` is retrieved via `overlay.querySelector<HTMLElement>('#claim-picker-grid')!` with non-null assertion.

**Empty branch:** If `eligible.length === 0`, `grid.innerHTML` is replaced with a `"No eligible effects found."` div, and the function **returns `close` immediately**. No button listeners are wired.

**Card rendering:** `eligible.map(e => renderEffectCard(e, { showModButton: rewardType === 'mythic_modifier', showPuButton: rewardType !== 'mythic_modifier', modButtonLabel: "Select · " + tierLabel(e.tier_gate), puButtonLabel: "Select · " + tierLabel(e.tier_gate) })).join('')` replaces `grid.innerHTML`.

**Button wiring:** `grid.querySelectorAll<HTMLButtonElement>('.mod-buy-btn').forEach(btn => ...)` attaches an async click handler per button. Each handler closes over `btn`, `eligible`, `rewardId`, `close`, and `onReload`.

**Click handler execution:** (1) Reads `btn.dataset.effectId`; returns if falsy. (2) Finds `effect` in `eligible` by `e.id === effectId`; returns if not found. (3) `btn.disabled = true; btn.textContent = 'Claiming…'`. (4) `try`: `await safeRpc('claim_invite_reward', { p_reward_id: rewardId, p_effect_id: effect.effect_num })`. Casts `res.data` to `{ ok?: boolean; error?: string; effect_name?: string } | null` as `data`. Success (`data?.ok` truthy): calls `close()`, calls `showToast("🎁 " + (data.effect_name ?? 'Item') + " added to your inventory!", 'success')`, calls `onReload()`. Failure: calls `showToast(data?.error ?? 'Claim failed', 'error')`, sheet stays open. (5) `finally`: `btn.disabled = false; btn.textContent = 'Select'` — always runs, including after `close()` has already removed the overlay (no-op visually on detached element).

**Return:** Function returns `close`. Caller receives a handle to programmatically dismiss the sheet.

## Agent 02

### openClaimSheet

(Note: Agent 02 received a corrupted prompt containing a duplicate `#claim-picker-grid` element that does not exist in the real source. Its description of "two nested elements with that id" reflects the prompt error, not the actual code. The consensus of agents 01, 03, 04, 05 is authoritative.)

## Agent 03

### openClaimSheet

The function creates a detached overlay div, sets its class to `'bottom-sheet-overlay'`, assigns a multi-line innerHTML template literal that embeds a bottom sheet with: sheet-handle, sheet-title (using `rewardTypeLabel(rewardType)?.toUpperCase() ?? 'REWARD'`), `#claim-picker-grid` with loading placeholder, and `#claim-cancel` button. Appends to `document.body`.

Defines `close` closing over `overlay` + `onClose` (removes overlay, calls `onClose`). Wires backdrop click (target equality check) and cancel button click (optional chain) both to `close`. These are active during the subsequent async pause.

`await getModifierCatalog()` suspends. On resolution: ternary assigns `tierNeeded` (`'legendary'` or `'mythic'`); filters `catalog` to `eligible`; retrieves `grid` with non-null assertion.

Empty guard returns `close` early with "No eligible effects found." message. Otherwise renders cards via `eligible.map(renderEffectCard(...)).join('')` into `grid.innerHTML`, then `querySelectorAll('.mod-buy-btn').forEach` wires per-button async click handlers.

Each handler: guard on `effectId`, guard on `effect` found in `eligible`, disable + relabel button, `try/await safeRpc(...)`, cast `res.data`, success/failure toast branches, `finally` always re-enables button. Returns `close`.

## Agent 04

### openClaimSheet

The function constructs and mounts an overlay div with a bottom sheet template (including a `#claim-picker-grid` loading placeholder). It synchronously wires dismiss paths (`close` closure, backdrop click, cancel button). After `await getModifierCatalog()` resolves, it determines `tierNeeded` via ternary, filters `catalog` to `eligible`, looks up `grid` with non-null assertion.

Empty path: replaces grid with error message, returns `close`. Non-empty path: renders all eligible cards via `renderEffectCard` calls, sets `grid.innerHTML`, then wires each `.mod-buy-btn` button with an async handler.

The handler guards on `effectId` and `effect`, disables the button, calls `await safeRpc('claim_invite_reward', ...)`, branches on `data?.ok`: on success calls `close()` + `showToast(...)` + `onReload()`; on failure calls `showToast(error)`. `finally` block always re-enables the button (executes even after successful `close()` call on the now-detached button element). Returns `close`.

## Agent 05

### openClaimSheet

Creates overlay div, sets className, assigns innerHTML template (title derived from `rewardTypeLabel(rewardType)?.toUpperCase() ?? 'REWARD'`, loading grid placeholder, cancel button). Appends to body. Defines `close = () => { overlay.remove(); onClose(); }`. Wires backdrop (target check) and cancel button (optional chain) to `close`.

Suspends on `await getModifierCatalog()`. After resuming: `tierNeeded` = `'legendary'` if `rewardType === 'legendary_powerup'` else `'mythic'`. `eligible` = filtered catalog. `grid` = querySelector with non-null assertion.

If `eligible.length === 0`: set error innerHTML, return `close`. Otherwise: set `grid.innerHTML` to mapped `renderEffectCard` output with per-card options (`showModButton`, `showPuButton`, `modButtonLabel`, `puButtonLabel`).

Wire `.mod-buy-btn` buttons via `querySelectorAll + forEach`. Each async handler: guard on `effectId`, guard on `effect` in `eligible`, disable + label, `try/await safeRpc`, cast data, success branch (`close()` + toast + `onReload()`) or failure branch (toast), `finally` re-enable. Return `close`.
