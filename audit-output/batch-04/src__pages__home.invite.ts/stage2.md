# Stage 2 Outputs — home.invite.ts

## Agent 01

### loadInviteScreen

Reads `_sheetCleanup` module-level state. If non-null, calls it and sets `_sheetCleanup = null` (cleanup before re-render). Writes `container.innerHTML` to a loading placeholder string. Awaits `safeRpc('get_my_invite_stats', {})` — async RPC call to the backend. Reads `result.data` and `result.error`. Two branches: if `stats` is null or `result.error` is truthy, writes an error message to `container.innerHTML` and returns early. Otherwise calls `render(container, stats)` synchronously before returning.

### _readTokenBalance

N/A — this function does not exist in this file.

### render

Pure DOM write function — no async, no module state reads or writes. Computes three derived values from `stats`:
- `converts` from `stats.total_converts`
- `nextMilestone` from `stats.next_milestone`
- `progressPct`: branches on `converts >= 25` — if so, uses `((converts - 25) % 25) / 25 * 100` clamped to 100; otherwise `converts / nextMilestone * 100` clamped to 100.

Builds `headlineTo` string with three branches: `converts < 25` calls `rewardLabel(nextMilestone)`, `converts === 25` hardcodes a string, `converts > 25` computes repeating Mythic count.

Builds `unclaimedHtml`: if `stats.unclaimed_rewards` is empty produces empty string; otherwise maps each reward through `rewardRowHtml()`.

Builds `activityHtml`: if `stats.activity` is empty produces a static empty-state string; otherwise maps each entry through `activityRowHtml()`.

Writes the entire invite panel as one large `container.innerHTML` template literal. User-supplied values passed through `escapeHTML()`: `headlineTo`, `stats.invite_url`. Numeric stats (`converts`, `total_signups`, `total_clicks`) are interpolated directly (not through `escapeHTML`). `progressPct.toFixed(1)` is used for the inline style width. The invite URL is also passed raw into `encodeURIComponent()` for the WhatsApp/SMS links. Finally calls `wireInviteScreen(container, stats)`.

### rewardLabel

Pure function. Reads parameter `milestone: number`. Returns a string via three `if` branches on exact values 1, 5, 25; falls through to default `'Mythic Power-Up'`. No side effects, no external calls.

### rewardTypeLabel

Pure function. Reads parameter `type`. Returns a string from a one-line object literal lookup using `type` as key. No side effects, no external calls. Will return `undefined` (cast as string) for an unrecognized type, though TypeScript constrains the union.

### rewardRowHtml

Reads parameter `r: InviteReward`. Computes `date` by constructing a `Date` from `r.awarded_at` and calling `.toLocaleDateString()`. Derives `btnLabel` ('PENDING REVIEW' or 'CLAIM') and `btnDisabled` (empty string or 'disabled') based on `r.pending_review`. Calls `escapeHTML()` on `r.id` (×2, in `data-reward-id` on both the wrapper div and the button), `rewardTypeLabel(r.reward_type)`, `date`, and `r.reward_type` and `r.id` again on the button attributes. Returns an HTML string — no DOM writes, no side effects.

### activityRowHtml

Reads parameter `a: ActivityEntry`. Computes `when` via `new Date(a.event_at).toLocaleDateString()`. Computes `name`: if `a.username` is truthy, calls `escapeHTML(a.username)`, otherwise literal `'Someone'`. Builds a `msg` lookup object keyed on status strings. Returns an HTML string using `msg[a.status]` if the status matches a known key, else falls back to `escapeHTML(a.status)`. No DOM writes, no side effects.

### wireInviteScreen

Reads `container` and `stats`. Queries the DOM for three sets of elements within `container`:

**Copy button** (`#invite-copy-btn`): if found and `stats.invite_url` is truthy, attaches a `click` listener. On click: awaits `navigator.clipboard.writeText(stats.invite_url!)`. On success, sets `copyBtn.textContent = 'Copied!'` and schedules a `setTimeout` to reset it to `'Copy'` after 2000ms. On failure (catch block), calls `showToast('Copy failed — tap the link to select it')`.

**Native share button** (`#invite-native-share`): if found and `stats.invite_url` is truthy, attaches a `click` listener. On click: awaits `navigator.share({ title: ..., url: stats.invite_url! })`. Catch block is silent (user cancel or unsupported API).

**Claim buttons** (`.invite-claim-btn:not([disabled])`): queries all non-disabled claim buttons. For each, attaches a `click` listener that reads `btn.dataset.rewardId` and `btn.dataset.rewardType`. If either is missing, returns early. Otherwise calls `openClaimSheet(rewardId, rewardType, container, stats)`.

No module state reads or writes. Multiple event listeners attached to the live DOM.

### openClaimSheet

Reads and writes `_sheetCleanup`. If non-null at entry, calls it and nulls it.

Creates a `div.bottom-sheet-overlay` element, sets its `className` and `innerHTML` with a bottom sheet structure including a picker grid and cancel button. Appends it to `document.body`.

Defines `close()`: removes the overlay from the DOM and sets `_sheetCleanup = null`. Attaches a `click` listener on the overlay that calls `close()` if `e.target === overlay` (backdrop click). Attaches `click` on `#claim-cancel` to call `close()`. Sets `_sheetCleanup = close`.

Awaits `getModifierCatalog()` — async call returning an array of modifier effects. Reads `rewardType` to determine `tierNeeded`: `'legendary'` if `rewardType === 'legendary_powerup'`, else `'mythic'`. Filters catalog to `eligible` entries where `e.tier_gate === tierNeeded`.

Queries `#claim-picker-grid` from the overlay. If not found, returns early (sheet stays open but grid is missing).

If `eligible.length === 0`, writes an empty-state message to `grid.innerHTML` and returns.

Otherwise maps `eligible` through `renderEffectCard()` with options derived from `rewardType` (`showModButton` true only for `mythic_modifier`, `showPuButton` true otherwise) and joins to set `grid.innerHTML`.

Queries all `.mod-buy-btn` buttons in the grid. For each, attaches a `click` listener:
- Reads `btn.dataset.effectId`. If missing, returns.
- Finds the matching `effect` in `eligible` by id. If not found, returns.
- Sets `btn.disabled = true` and `btn.textContent = 'Claiming…'`.
- Awaits `safeRpc('claim_invite_reward', { p_reward_id: rewardId, p_effect_id: effect.effect_num })`.
- Reads `res.data` cast to `{ ok?, error?, effect_name? } | null`.
- On success (`data?.ok` truthy): calls `close()`, calls `showToast(...)` with success toast, then calls `loadInviteScreen(container)` to re-render the parent screen (async, not awaited).
- On failure: calls `showToast(data?.error ?? 'Claim failed', 'error')`, re-enables button, resets its text to `'Select'`.

Side effects: modifies `document.body`, modifies `_sheetCleanup`, makes two network calls.

### cleanupInviteScreen

Reads `_sheetCleanup`. If non-null, calls it (which removes any open overlay from `document.body` and nulls `_sheetCleanup`), then explicitly sets `_sheetCleanup = null` again. If already null, does nothing. No async, no DOM reads, no external calls beyond the stored closure.

---

## Agent 02

### loadInviteScreen

Async. On entry, checks the module-level `_sheetCleanup` closure; if non-null, calls it immediately and nulls it (tears down any open bottom sheet from a prior call). Writes a loading placeholder string into `container.innerHTML`. Awaits `safeRpc('get_my_invite_stats', {})` — a network call that returns `{ data, error }`. Casts `result.data` to `InviteStats | null`. If `stats` is falsy or `result.error` is set, replaces `container.innerHTML` with an error message and returns early. On success, delegates all rendering to `render(container, stats)`. No return value.

### render

Synchronous. Reads `stats.total_converts`, `stats.next_milestone`, `stats.unclaimed_rewards`, and `stats.activity` from the passed `InviteStats` object. Computes `progressPct`: if converts >= 25, cycles in 25-unit bands (modulo 25); otherwise normalises against `nextMilestone`. Builds `headlineTo` string via three-branch conditional on the converts count. Builds `unclaimedHtml` by mapping `stats.unclaimed_rewards` through `rewardRowHtml()` (empty string if none). Builds `activityHtml` by mapping `stats.activity` through `activityRowHtml()` (fallback empty-state string if none). Writes a complete HTML template into `container.innerHTML`, embedding all computed strings. Calls `wireInviteScreen(container, stats)` to attach event listeners to the newly written DOM. No async work, no network calls.

### rewardLabel

Pure function. Takes a numeric `milestone`. Returns a string label via sequential equality checks: 1 → `'Legendary Power-Up'`, 5 → `'Mythic Power-Up'`, 25 → `'Mythic Modifier'`, any other value → `'Mythic Power-Up'`. No side effects, no reads, no writes.

### rewardTypeLabel

Pure function. Takes a `reward_type` string (one of `'legendary_powerup'`, `'mythic_powerup'`, `'mythic_modifier'`). Returns the corresponding emoji-prefixed label from a literal object lookup. Returns `undefined` if the key is not present (no explicit fallback). No side effects.

### rewardRowHtml

Pure function. Takes an `InviteReward` object. Reads `r.awarded_at` (formats to locale date string), `r.pending_review` (controls button label and `disabled` attribute), `r.id`, `r.reward_type`, and `r.milestone`. Calls `escapeHTML()` on `r.id`, the result of `rewardTypeLabel(r.reward_type)`, the formatted date, and the reward type string used in `data-reward-type`. Returns a raw HTML string for a single reward row with a claim button. No DOM writes, no side effects.

### activityRowHtml

Pure function. Takes an `ActivityEntry` object. Reads `a.event_at` (formats to locale date string), `a.username`, and `a.status`. Calls `escapeHTML()` on `a.username` if present; falls back to the literal string `'Someone'`. Builds a `msg` lookup object keyed by status (`clicked`, `signed_up`, `converted`). Returns the matched message string, or `escapeHTML(a.status)` for unknown statuses. Returns a raw HTML string for a single activity row. No DOM writes, no side effects.

### wireInviteScreen

Synchronous. Queries the container for `#invite-copy-btn` and `#invite-native-share` by ID, and all `.invite-claim-btn:not([disabled])` buttons by class.

**Copy button**: if found and `stats.invite_url` is truthy, attaches an async click handler that calls `navigator.clipboard.writeText(stats.invite_url)`. On success, sets `copyBtn.textContent` to `'Copied!'` and schedules a `setTimeout` (2000 ms) to reset it to `'Copy'`. On failure, calls `showToast('Copy failed — tap the link to select it')`.

**Share button**: if found and `stats.invite_url` is truthy, attaches an async click handler that calls `navigator.share({ title, url })`. Swallows all errors silently (user cancel or API not supported).

**Claim buttons**: iterates all enabled claim buttons; for each, attaches a synchronous click handler that reads `btn.dataset.rewardId` and `btn.dataset.rewardType`, validates both are present, then calls `openClaimSheet(rewardId, rewardType, container, stats)`. No return value.

### openClaimSheet

Async. Tears down any existing sheet by calling `_sheetCleanup()` and nulling it. Creates a `<div class="bottom-sheet-overlay">` element, writes a full HTML template into it (sheet handle, title, loading grid, cancel button), and appends it to `document.body`. Defines a `close` closure that removes the overlay from the DOM and nulls `_sheetCleanup`. Registers `close` on: overlay background click (if `e.target === overlay`), and the `#claim-cancel` button click. Assigns `close` to `_sheetCleanup` (module-level write) so external callers can tear it down.

Awaits `getModifierCatalog()` to fetch the effect catalog. Filters results to only entries whose `tier_gate` matches `tierNeeded` (derived from `rewardType`: `'legendary'` for `legendary_powerup`, `'mythic'` for others). Queries the grid element by `#claim-picker-grid`; returns early if not found. If `eligible` is empty, writes an empty-state message into the grid and returns.

Otherwise, maps `eligible` through `renderEffectCard()` (passing button visibility and label options based on `rewardType`) and writes the result into `grid.innerHTML`.

For each `.mod-buy-btn` in the grid, attaches a click handler that: reads `btn.dataset.effectId`, finds the matching effect object, disables the button and sets text to `'Claiming…'`, then awaits `safeRpc('claim_invite_reward', { p_reward_id, p_effect_id })`. On success (`data?.ok` truthy): calls `close()`, calls `showToast()` with a success message, and calls `loadInviteScreen(container)` to reload the screen. On failure: calls `showToast()` with the error string, re-enables the button, and resets its text to `'Select'`.

### cleanupInviteScreen

Synchronous. Reads the module-level `_sheetCleanup`. If non-null, calls it (which removes any open bottom sheet overlay from the DOM) and sets `_sheetCleanup` to null. Intended to be called by the parent navigation system when navigating away from the invite screen. No return value, no network calls.

---

## Agent 03

### loadInviteScreen

Async. Exported entry point.

**Cleanup guard:** Reads module-level `_sheetCleanup`. If non-null, calls it (removes any open bottom-sheet overlay from the DOM and nulls `_sheetCleanup`), then sets it to `null`.

**Immediate DOM write:** Sets `container.innerHTML` to a loading placeholder string. This destroys any prior child nodes in the container.

**Network call:** `await safeRpc('get_my_invite_stats', {})` — suspends here. `safeRpc` wraps the Supabase RPC call with 401-retry logic. No arguments are passed to the server function beyond an empty params object.

**Error path:** If `result.data` is falsy or `result.error` is truthy, sets `container.innerHTML` to an error message and returns early. No toast is shown.

**Success path:** Casts `result.data` to `InviteStats | null` and immediately delegates to the synchronous `render(container, stats)`.

### render

Synchronous. Pure computation followed by a single `innerHTML` assignment and event wiring.

**Reads from `stats`:** `total_converts`, `next_milestone`, `unclaimed_rewards` (array), `activity` (array), `invite_url`, `total_signups`, `total_clicks`.

**Progress calculation:**
- If `converts >= 25`: progress within the current repeating 25-cycle, clamped to 100. Formula: `((converts - 25) % 25) / 25 * 100`.
- Otherwise: `converts / nextMilestone * 100`, clamped to 100.
- Result is used inline as `progressPct.toFixed(1)%` in a `style="width:..."` attribute.

**Headline string selection (ternary chain):**
- `converts < 25`: shows count toward next milestone, calling `rewardLabel(nextMilestone)`.
- `converts === 25`: fixed congratulation string.
- `converts > 25`: shows count plus number of repeating Mythics earned, with correct plural suffix.

**Conditional HTML fragments:**
- `unclaimedHtml`: empty string if no unclaimed rewards; otherwise a section div with each reward rendered via `rewardRowHtml(r)`.
- `activityHtml`: empty-state string if no activity entries; otherwise rows from `activityRowHtml(a)`.

**DOM write:** Assigns a large template literal to `container.innerHTML`. User-supplied values passed through `escapeHTML()`: `headlineTo`, `stats.invite_url` (in the link display). Raw numeric values `converts`, `stats.total_signups`, `stats.total_clicks` are interpolated directly (integers from the server, not user-supplied strings). WhatsApp and SMS hrefs use `encodeURIComponent` on the invite URL. `unclaimedHtml` and `activityHtml` are injected verbatim (each was already escaped at the point of construction).

**Calls:** `rewardLabel`, `rewardRowHtml`, `activityRowHtml`, `escapeHTML`, `wireInviteScreen`.

### rewardLabel

Synchronous. Pure function. No reads or writes. Takes a `milestone: number` and returns a human-readable reward name by testing for exact equality against `1`, `5`, and `25`. Falls through to `'Mythic Power-Up'` for any other value.

### rewardTypeLabel

Synchronous. Pure function. No reads or writes. Builds a single-use object literal mapping all three `reward_type` string values to emoji-prefixed labels, then immediately indexes it with `type`. Returns `undefined` (typed as `string`) if `type` is not one of the three known keys — no null guard. Used in display HTML and as the basis for the claim sheet title (via `.toUpperCase()`).

### rewardRowHtml

Synchronous. Returns an HTML string. No DOM mutations, no network calls.

**Reads from `r`:** `awarded_at`, `pending_review`, `id`, `reward_type`, `milestone`.

**Computations:**
- `date`: `new Date(r.awarded_at).toLocaleDateString()` — locale-formatted date string.
- `btnLabel`: `'PENDING REVIEW'` or `'CLAIM'` depending on `r.pending_review`.
- `btnDisabled`: literal `'disabled'` attribute string or empty string.

**Escaping:** `r.id` escaped via `escapeHTML` in both the wrapper `data-reward-id` attribute and the button's `data-reward-id` attribute. `rewardTypeLabel(r.reward_type)` result escaped via `escapeHTML`. `r.reward_type` escaped via `escapeHTML` in `data-reward-type`. `date` (a `toLocaleDateString()` output) escaped via `escapeHTML`. `r.milestone` (numeric) interpolated raw.

Returns a `div.invite-reward-row` containing reward info and a `button.invite-claim-btn`. The button gets `.invite-claim-btn--review` class when pending and `disabled` attribute.

### activityRowHtml

Synchronous. Returns an HTML string. No DOM mutations, no network calls.

**Reads from `a`:** `event_at`, `username`, `status`.

**Computations:**
- `when`: `new Date(a.event_at).toLocaleDateString()` — not escaped (locale date string, no user content).
- `name`: `escapeHTML(a.username)` if username is truthy, otherwise the literal `'Someone'`.

**Message lookup:** Builds an inline `Record<string, string>` with keys `clicked`, `signed_up`, `converted`. Each value interpolates the already-escaped `name` string directly. If `a.status` is not one of those three keys, falls back to `escapeHTML(a.status)`.

Returns a `div.invite-activity-row` with two spans: the message and the date.

### wireInviteScreen

Synchronous. Attaches event listeners; no DOM mutations beyond what the listeners do.

**Copy button (`#invite-copy-btn`):** Queried from `container`. Only wired if the element exists and `stats.invite_url` is truthy. Click handler is async:
- Calls `navigator.clipboard.writeText(stats.invite_url!)` — awaits.
- On success: sets `copyBtn.textContent = 'Copied!'`, then after 2000 ms via `setTimeout` resets it to `'Copy'`.
- On failure (clipboard permission denied etc.): calls `showToast('Copy failed — tap the link to select it')`.

**Native share button (`#invite-native-share`):** Queried from `container`. Only wired if element exists and `stats.invite_url` is truthy. Click handler is async:
- Calls `navigator.share({ title: 'Join The Moderator', url: stats.invite_url! })` — awaits.
- Catch block is empty — dismissal and unsupported-API errors are silently swallowed.

**Claim buttons (`.invite-claim-btn:not([disabled])`):** `querySelectorAll` scoped to `container`. For each enabled claim button, attaches a synchronous click handler that reads `btn.dataset.rewardId` and `btn.dataset.rewardType`. If either is missing, returns early. Otherwise calls `openClaimSheet(rewardId, rewardType, container, stats)` — fire-and-forget (no `await`).

### openClaimSheet

Async. Manages the module-level `_sheetCleanup` ref and a bottom-sheet overlay attached directly to `document.body`.

**Cleanup guard:** Same pattern as `loadInviteScreen` — calls and nulls any existing `_sheetCleanup` before proceeding, preventing stacked sheets.

**DOM creation and body append:**
- Creates a `div.bottom-sheet-overlay` via `document.createElement`.
- Sets `innerHTML` to a sheet structure containing: a drag handle, a title built from `rewardTypeLabel(rewardType).toUpperCase()` (not escaped), a `div#claim-picker-grid` with a loading placeholder, and a `button#claim-cancel`.
- Appends overlay to `document.body`.

**Close function:** `const close` removes the overlay from the DOM and sets `_sheetCleanup = null`. Registered as `_sheetCleanup`. Two event paths invoke it:
- Backdrop click: listener on `overlay` itself checks `e.target === overlay`.
- Cancel button: `overlay.querySelector('#claim-cancel')` click.

**Catalog fetch:** `await getModifierCatalog()` — suspends. Returns an array of `ModifierEffect` objects. After resuming, filters to entries where `tier_gate` matches `tierNeeded`: `'legendary'` if `rewardType === 'legendary_powerup'`, `'mythic'` for both `'mythic_powerup'` and `'mythic_modifier'`.

**Grid population:**
- Re-queries `#claim-picker-grid` from the overlay. If not found (overlay was closed before catalog returned), returns early — the sheet has already been removed.
- If `eligible` is empty, sets `grid.innerHTML` to an empty-state message and returns.
- Otherwise renders each eligible effect via `renderEffectCard(e, {...})`. `showModButton` is true only when `rewardType === 'mythic_modifier'`; `showPuButton` is true for the other two types. Both button labels are `"Select · <tierLabel>"`.

**Select button wiring:** `grid.querySelectorAll('.mod-buy-btn')` — async click handlers on each rendered card button. On click:
- Reads `btn.dataset.effectId`. Guards for missing value.
- Finds the matching `ModifierEffect` in `eligible` by `id`. Guards for not-found.
- Sets `btn.disabled = true; btn.textContent = 'Claiming…'`.
- `await safeRpc('claim_invite_reward', { p_reward_id: rewardId, p_effect_id: effect.effect_num })` — suspends.
- Casts `res.data` to `{ ok?, error?, effect_name? } | null`.
- **Success path (`data?.ok` truthy):** calls `close()`, then `showToast(...)` with effect name, then calls `loadInviteScreen(container)` — fire-and-forget re-render.
- **Failure path:** calls `showToast(data?.error ?? 'Claim failed', 'error')`, re-enables the button and restores its label to `'Select'`.

### cleanupInviteScreen

Synchronous. Exported lifecycle hook. Reads `_sheetCleanup`. If non-null, calls it and sets `_sheetCleanup = null`. No DOM queries, no network calls, no return value.

---

## Agent 04

### loadInviteScreen

Async. On entry, reads `_sheetCleanup`; if non-null, calls it and sets `_sheetCleanup = null`. Sets `container.innerHTML` to a loading placeholder. Awaits `safeRpc('get_my_invite_stats', {})`. Reads `result.data` cast to `InviteStats | null` and `result.error`. Error branch: if `!stats || result.error`, sets `container.innerHTML` to error message and returns. Happy path: calls `render(container, stats)`.

### render

Synchronous. Reads `stats.total_converts`, `stats.next_milestone`, `stats.unclaimed_rewards`, `stats.activity`, `stats.invite_url`, `stats.total_signups`, `stats.total_clicks`. Computes progress percentage, headline string (three-way branch on converts count), unclaimed HTML (maps through `rewardRowHtml`), activity HTML (maps through `activityRowHtml`). Assigns template literal to `container.innerHTML`. Calls `wireInviteScreen(container, stats)`.

### rewardLabel

Pure. Returns string label for milestone values 1, 5, 25; default `'Mythic Power-Up'`.

### rewardTypeLabel

Pure. Object-literal lookup for `reward_type` to emoji-prefixed label. No fallback for unrecognized types.

### rewardRowHtml

Pure string-returning. Formats date, reads `pending_review` for button state. Applies `escapeHTML` to `r.id` (twice), `rewardTypeLabel(r.reward_type)`, formatted date, and `r.reward_type`. Returns HTML string with reward row and claim button.

### activityRowHtml

Pure string-returning. Formats date, escapes username, builds msg lookup object. Falls back to `escapeHTML(a.status)` for unknown statuses. Returns activity row HTML string.

### wireInviteScreen

Synchronous. Wires three groups: (1) copy button with `navigator.clipboard` async handler and `setTimeout` text reset; (2) share button with `navigator.share` async handler, silent catch; (3) claim buttons with sync handler calling `openClaimSheet`.

### openClaimSheet

Async. Tears down prior sheet if open. Creates and appends `div.bottom-sheet-overlay` to `document.body`. Sets up `close` closure (removes overlay, nulls `_sheetCleanup`). Registers close on backdrop and cancel button. Sets `_sheetCleanup = close`. Awaits `getModifierCatalog()`. Filters by tier. Populates grid with `renderEffectCard` calls. Wires `.mod-buy-btn` clicks: disable button, await `safeRpc('claim_invite_reward', {...})`, on success call `close()`+`showToast()`+`loadInviteScreen(container)`, on failure call `showToast()`+re-enable button.

### cleanupInviteScreen

Synchronous. If `_sheetCleanup` non-null, calls it and sets to null. No-op otherwise.

---

## Agent 05

### loadInviteScreen

**Entry guard — sheet cleanup:** Checks the module-level `_sheetCleanup` closure. If non-null, calls it immediately (removes any open bottom-sheet overlay from the DOM) and sets `_sheetCleanup = null`.

**Immediate DOM write:** Sets `container.innerHTML` to a single loading div. Synchronous, before any await.

**Async RPC read:** Calls `safeRpc('get_my_invite_stats', {})` and awaits the result. `result.data` is cast to `InviteStats | null`.

**Error branch:** If `stats` is falsy or `result.error` is truthy, overwrites `container.innerHTML` with an error message div and returns early.

**Happy path:** Calls `render(container, stats)` synchronously and returns.

### render

**Progress calculation:** If `converts >= 25`, cycles modulo-25 within the repeating Mythic tier; otherwise linear fraction of `nextMilestone`. Clamped to 100 via `Math.min`.

**Headline string construction:** Builds `headlineTo` via nested ternaries — three possible string values depending on `converts < 25`, `=== 25`, or `> 25`. The `> 25` branch computes `Math.floor((converts - 25) / 25)` and pluralises.

**Unclaimed rewards HTML:** Empty string if no unclaimed rewards; otherwise builds section div that maps each reward through `rewardRowHtml(r)`.

**Activity HTML:** Static "no activity" message if empty; otherwise maps through `activityRowHtml(a)`.

**Single bulk DOM write:** Assigns one large template-literal to `container.innerHTML`. Safety: `escapeHTML(headlineTo)`, `escapeHTML(stats.invite_url)`, `encodeURIComponent` for WhatsApp/SMS hrefs. Numeric values (`converts`, `total_signups`, `total_clicks`) interpolated directly. `progressPct.toFixed(1)` for inline style.

**Wiring:** Calls `wireInviteScreen(container, stats)` synchronously.

### rewardLabel

Pure function. Returns string by testing milestone for exact equality against 1, 5, 25; default `'Mythic Power-Up'`.

### rewardTypeLabel

Pure function. Object-literal lookup map. Returns `undefined` if `type` not in the three known keys — callers that call `.toUpperCase()` on the result (see `openClaimSheet`) would throw on an invalid type.

### rewardRowHtml

Pure function — produces HTML string. Reads `r.awarded_at` (locale date), `r.pending_review` (button state), `r.id`, `r.reward_type`, `r.milestone`. Applies `escapeHTML` to `r.id` (twice), `rewardTypeLabel(r.reward_type)` output, formatted date, and `r.reward_type`. `r.milestone` is a number and is interpolated directly. Returns claim row HTML string.

### activityRowHtml

Pure function — produces HTML string. Reads `a.event_at` (formatted date), `a.username` (optional; falls back to `'Someone'`), `a.status`. Applies `escapeHTML` to username when present. Builds `msg` record for three status keys; falls back to `escapeHTML(a.status)` for unknown statuses. `when` date is interpolated raw.

### wireInviteScreen

**Copy button:** Guards on element existence and `stats.invite_url`. Async click: `await navigator.clipboard.writeText`, on success sets `'Copied!'` and `setTimeout` 2000ms reset, on catch calls `showToast`.

**Share button:** Guards on element existence and `stats.invite_url`. Async click: `await navigator.share`, catch silently ignored.

**Claim buttons:** `querySelectorAll('.invite-claim-btn:not([disabled])')`. Sync click per button. Reads `rewardId`, `rewardType` from dataset. Guards if either missing. Calls `openClaimSheet(rewardId, rewardType, container, stats)` — fire-and-forget async call; return promise not awaited or caught here.

### openClaimSheet

**Entry guard:** Calls and nulls existing `_sheetCleanup` if set.

**DOM creation:** Creates `div.bottom-sheet-overlay`. Sets `innerHTML` with `rewardTypeLabel(rewardType).toUpperCase()` in title (not escaped), loading placeholder in grid, cancel button. Appends to `document.body`.

**Close closure:** Removes overlay, nulls `_sheetCleanup`. Registered on backdrop click and `#claim-cancel`. `_sheetCleanup = close`.

**Async catalog fetch:** `await getModifierCatalog()`. Filters to `eligible` by `tier_gate`. `tierNeeded` is `'legendary'` for `legendary_powerup`, `'mythic'` for both other types.

**Grid population:** Re-queries `#claim-picker-grid`. If missing, returns early (overlay stays in DOM — latent orphan bug). If `eligible` empty, sets empty-state message and returns. Otherwise `grid.innerHTML` = `eligible.map(e => renderEffectCard(e, options)).join('')`.

**Select button wiring:** Async click per `.mod-buy-btn`. Reads `effectId`, guards. Finds `effect` in `eligible`, guards. Sets `btn.disabled = true`, `textContent = 'Claiming…'`. Awaits `safeRpc('claim_invite_reward', { p_reward_id: rewardId, p_effect_id: effect.effect_num })`. On `data.ok`: `close()`, `showToast(success)`, `loadInviteScreen(container)` (fire-and-forget). On failure: `showToast(error)`, `btn.disabled = false`, `textContent = 'Select'`.

### cleanupInviteScreen

Synchronous exported teardown. Reads `_sheetCleanup`; if non-null, calls it (removes overlay from `document.body`, clears `_sheetCleanup`), then sets `_sheetCleanup = null` explicitly. No-op if already null.
