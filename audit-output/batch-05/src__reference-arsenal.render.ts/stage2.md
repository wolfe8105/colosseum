# Stage 2 Outputs — reference-arsenal.render.ts

## Agent 01
### rarityCardStyle

`rarityCardStyle` takes a single `rarity` parameter of type `Rarity` and returns an inline CSS string. It reads the module-level constant `RARITY_COLORS` (imported from `reference-arsenal.constants.ts`) to obtain the color value for the given rarity. The function branches on whether `rarity` is exactly `'mythic'`: if so, it returns a style string with a full 1.5px solid border on all sides using the mythic color and a low-opacity red background. For every other rarity value, it returns a style string where only the left border is 3px solid using the rarity color, and the remaining three sides receive 1px solid `var(--mod-border-subtle)`. The function is synchronous, has no early returns, writes nothing, calls nothing else, and has no error path.

### renderSocketDots

`renderSocketDots` takes a single `ref` parameter of type `ArsenalReference` and returns an HTML string. It reads `ref.rarity` to look up the total socket count from the module-level `RARITY_SOCKET_COUNT` map, falling back to `1` if the rarity key is absent. It reads `ref.sockets` (treated as potentially `null` or `undefined`, defaulting to an empty array via `?? []`) and constructs a `Map` from `socket_index` to `effect_id` for O(1) lookup. It then iterates `total` times, checking whether each index `i` is present in that map. For each filled socket it emits a `<span class="ref-socket-dot filled">` with a `title` attribute containing the `effect_id` passed through `escapeHTML`; for each empty socket it emits a `<span class="ref-socket-dot empty">`. The accumulated spans are wrapped in a `<div class="ref-socket-dots">` and returned. The function is synchronous, writes nothing, and has no error path or early return.

### renderReferenceCard

`renderReferenceCard` takes an `ArsenalReference` object, a boolean `showSecondBtn`, and an optional boolean `showEditBtn` (default `false`), and returns an HTML string. It reads several fields from `ref` directly: `id`, `rarity`, `source_type`, `graduated`, `claim_text`, `source_title`, `source_author`, `source_date`, `locator`, `owner_username`, `seconds`, `strikes`, `sockets`, `challenge_status`, `source_url`. It looks up `SOURCE_TYPES[ref.source_type]` for the label, calls `compositeScore(ref)` to compute the score value, and looks up `CHALLENGE_STATUS_LABELS[ref.challenge_status]` for the status label (empty string if absent). All user-derived string fields are passed through `escapeHTML`. Numeric fields `seconds`, `strikes`, and the computed score are cast with `Number()` before insertion.

Control flow consists of five conditional inclusions in the template literal: the graduated badge appears only when `ref.graduated` is truthy; the forger div appears only when `ref.owner_username` is truthy; the socket dots div is included only when `ref.sockets != null` (calls `renderSocketDots`); the status div is included only when `statusLabel` is non-empty; the source URL link is included only when `ref.source_url` is truthy. The Second button is rendered only when `showSecondBtn` is `true`; the Edit and Delete buttons are rendered only when `showEditBtn` is `true`. The function is synchronous, writes nothing to the DOM, and has no error path or early return.

### renderArsenal

`renderArsenal` takes an `HTMLElement` container and is async, returning `Promise<ArsenalReference[]>`. It first calls `getCurrentUser()` (synchronous). If the result is falsy, it writes a sign-in prompt to `container.innerHTML` and returns `[]` immediately.

If a user exists, it writes a loading message to `container.innerHTML`, then awaits `safeRpc<ArsenalReference[]>('get_my_arsenal', {})`. On completion, it destructures `data` and `error`. If `error` is truthy or the resulting array is empty, it writes an empty-state div containing a "Forge Your First Weapon" button to `container.innerHTML` and returns `[]`. No distinction is made between the error case and the empty case in the returned value — both return `[]`.

On success with at least one item, the refs array is sorted in place: descending by `current_power`, with ties broken by `created_at` parsed via `Date.parse` descending. It then builds an HTML string consisting of a header row (with another forge button) and an `.arsenal-grid` div, calling `renderReferenceCard(ref, false, true)` for each item in the sorted array. The assembled HTML is written to `container.innerHTML` and the refs array is returned. The function does not attach any event listeners; the caller is responsible for handling button clicks. There is no try/catch — if `safeRpc` throws rather than returning an error object, the exception propagates to the caller.

### renderArmory

`renderArmory` takes an `HTMLElement` container and is async, returning `Promise<void>`. On call, it initializes a local `ArmoryState` object with default values and writes a full scaffold of HTML — a search row, a collapsible filter drawer (built from `CATEGORIES`, `CATEGORY_LABELS`, `RARITY_COLORS`, `SOURCE_TYPES`, and `CHALLENGE_STATUS_LABELS` via template literals), an empty trending shelf div, and a loading placeholder for cards — into `container.innerHTML`. This single write replaces any prior content.

It then conditionally injects a bottom sheet host into `document.body` if `#armory-sheet` does not already exist, creating a singleton backdrop and sheet div. A `closeSheet` closure is defined and attached to the backdrop's click event.

Two async operations are launched independently. The trending shelf fires as an immediately-invoked async IIFE (not awaited): it calls `getTrendingReferences()`, and if items are returned, writes a shelf of `.armory-trending-card` elements into `#armory-trending`, attaching click listeners that call the internal `openSheet` closure with a partially constructed `ArsenalReference` (fields `source_date`, `locator`, `source_url`, and `created_at` hardcoded to empty/null). If the trending fetch returns an empty array, the IIFE returns without writing anything.

The `loadCards` inner async function reads the current `state` object and calls `getLibrary(...)` with filter/sort parameters derived from it. It guards against concurrent execution via `state.loading`. On success with results it writes a `.library-grid` of `.armory-card-wrap` elements (each using `renderReferenceCard(ref, false)`) into `#armory-cards` and attaches click listeners that call `openSheet`. On an empty result set it writes an empty-state div and attaches a click listener to navigate to the forge tab by simulating a click on `[data-arsenal-tab="forge"]`. On a thrown exception (catch block) it writes an error message to `#armory-cards`. The `finally` block always resets `state.loading = false`.

The `openSheet` inner function writes full reference detail HTML into `#armory-sheet-body` and action buttons into `#armory-sheet-actions`, then adds the `open` class to both the backdrop and the sheet. It branches on `ref.user_id === myId` (own reference) and `ref.challenge_status === 'frozen'` to suppress the Second and Challenge buttons respectively. The Second button's click handler awaits `secondReference(ref.id)`, shows a success toast and triggers `loadCards` on success, or shows an error toast and re-enables the button on failure. The Challenge button's click handler injects a textarea form inline into the sheet body and a submit button into the actions row; the submit button's click handler validates the grounds text (minimum 5 characters, otherwise shows an error toast) then awaits `challengeReference(ref.id, grounds, null)`, inspecting the `result.action` field for `'shield_blocked'` to show a blocked toast, otherwise showing a success toast, closing the sheet, and triggering `loadCards`. Errors in both async handlers are caught and surfaced as toasts.

Filter chip click listeners toggle `state` fields (sort replaces, others toggle off when re-clicked) and call `loadCards` immediately. The search input fires a debounced `loadCards` call after 320ms using `state.searchTimer`. A `updateBadge` helper counts non-empty filter state fields and updates the `#armory-filter-badge` display. `loadCards` is called once unconditionally at the end of `renderArmory` to populate the initial view.

### renderLibrary

`renderLibrary` takes an `HTMLElement` container and an optional ignored second parameter (`_?: unknown`), and is async returning `Promise<void>`. It immediately awaits `renderArmory(container)` and returns. It performs no reads of its own, writes nothing directly, calls no other functions, and has no branches, early returns, or error paths beyond whatever propagates from `renderArmory`. It exists solely as a backward-compatibility alias.

## Agent 02
### rarityCardStyle

Takes a single `Rarity` string parameter. Branches on whether the rarity is `'mythic'`: if so, returns an inline style string with a full four-sided border using the mythic color from `RARITY_COLORS` and a semi-transparent red background. For all other rarity values it returns a style string with a thicker left border using the corresponding `RARITY_COLORS[rarity]` value and thinner, CSS-variable-colored borders on the other three sides. Reads only `RARITY_COLORS` from the imported constants. Writes nothing. Calls no other functions. Synchronous, no error path — if `rarity` is not `'mythic'` and is not a valid key in `RARITY_COLORS`, `RARITY_COLORS[rarity]` resolves to `undefined`, producing a malformed CSS string (no explicit guard).

### renderSocketDots

Takes one `ArsenalReference` param. Reads `ref.rarity` to look up the total socket count from the module-level `RARITY_SOCKET_COUNT` map, defaulting to `1` if the rarity is missing or unrecognized. Builds a `Map` from `ref.sockets` (defaulting to an empty array if `ref.sockets` is nullish) keyed by `socket_index` with `effect_id` as the value. Iterates `total` times, emitting a filled `<span>` with a `title` attribute equal to the escaped `effect_id` if that index exists in the map, or an empty `<span>` otherwise. Calls `escapeHTML` on each non-empty `effect_id`. Writes nothing to the DOM; returns the completed `<div class="ref-socket-dots">` HTML string. Synchronous. No error path.

### renderReferenceCard

Takes an `ArsenalReference`, a boolean `showSecondBtn`, and an optional boolean `showEditBtn` (defaults to `false`). Reads several fields from the `ref` object: `id`, `rarity`, `source_type`, `claim_text`, `source_title`, `source_author`, `source_date`, `locator`, `owner_username`, `source_url`, `graduated`, `challenge_status`, `seconds`, `strikes`, `sockets`, `user_id`. Looks up `SOURCE_TYPES[ref.source_type]` for the label and `RARITY_COLORS[ref.rarity]` for the color. Calls `compositeScore(ref)` for the score display, `powerDisplay(ref)` for the power string, `rarityCardStyle(ref.rarity)` for the card's inline style, and `renderSocketDots(ref)` when `ref.sockets != null`. Calls `escapeHTML` on all user-supplied string fields. Casts `ref.seconds`, `ref.strikes`, and `score` with `Number()` before interpolating into innerHTML. Conditionally includes: a graduated star badge, an owner forger line, a challenge status label, a source URL anchor, a Second button, and Edit/Delete buttons. Writes nothing to the DOM — returns a complete HTML string. Synchronous. No explicit error path; if `SOURCE_TYPES[ref.source_type]` is undefined, `srcInfo.label` will throw a property access on undefined.

### renderArsenal

Async. Takes one `HTMLElement` container param. Calls `getCurrentUser()` synchronously; if no user is returned, writes a sign-in prompt to `container.innerHTML` and returns an empty array (early return). Writes a loading placeholder to `container.innerHTML`, then awaits `safeRpc<ArsenalReference[]>('get_my_arsenal', {})`. If `error` is truthy or the returned array is empty, writes an empty-state div containing a "Forge Your First Weapon" button to `container.innerHTML` and returns an empty array. On a non-empty result, sorts the refs in place descending by `current_power`, then by `created_at` date parsed via `Date.parse`. Builds a full HTML string by calling `renderReferenceCard(ref, false, true)` for each sorted ref (showSecondBtn=false, showEditBtn=true) and writes the combined grid to `container.innerHTML`. Returns the sorted `ArsenalReference[]`.

### renderArmory

Async. Takes one `HTMLElement` container param. Initializes a local `ArmoryState` object with default filter values. Writes the full armory scaffold — search input, filter drawer with chip rows for category, rarity, source type, status, and sort — plus placeholder divs for trending and cards. Conditionally appends a bottom-sheet host element to `document.body` if one with id `armory-sheet` does not already exist; attaches a `click` listener on `armory-sheet-backdrop` to close the sheet.

Immediately fires a detached async IIFE to load trending: awaits `getTrendingReferences()`, and if results are returned, writes a trending shelf into `#armory-trending`. Each shelf card gets a click listener that calls the closure-scoped `openSheet()` with a partial `ArsenalReference` object. If `getTrendingReferences()` returns an empty array the trending section remains empty with no error shown.

Defines and immediately calls `loadCards()`. `loadCards` is an async closure: it guards against concurrent calls via `state.loading`. Sets `#armory-cards` to a loading placeholder, then awaits `getLibrary(...)` with the current `state` fields mapped to filter params. On empty results, writes a forge-CTA empty state and attaches a click listener to navigate to the forge tab. On non-empty results, renders a grid by calling `renderReferenceCard(ref, false)` for each ref and attaches click listeners on each `.armory-card-wrap` that call `openSheet(ref, myId)`. On any thrown error, writes an error message to `#armory-cards`. The `finally` block always resets `state.loading`. The `openSheet` closure renders a detail sheet with a full metadata table and conditionally shows Second and Challenge buttons based on ownership and frozen status. The Second button awaits `secondReference(ref.id)` and on success calls `closeSheet()` and re-invokes `loadCards()`. The Challenge button injects a textarea form and a Submit button inline; the Submit button awaits `challengeReference(ref.id, grounds, null)`, branches on `result.action === 'shield_blocked'` to show an error toast, or on success calls `closeSheet()` and re-invokes `loadCards()`. Both async sheet actions disable the triggering button on fire and restore it on caught errors.

Filter chips attach click listeners that toggle `state` fields (sort chips set exclusively; all others toggle off if already active), then call `updateBadge()` and `loadCards()`. The search input debounces `loadCards()` with a 320ms `setTimeout` stored in `state.searchTimer`.

### renderLibrary

Async. Takes an `HTMLElement` container and an ignored second parameter (`_?: unknown`). Directly awaits `renderArmory(container)` and returns `Promise<void>`. No logic of its own; all behavior is that of `renderArmory`.

## Agent 03
### rarityCardStyle

`rarityCardStyle` takes a single `Rarity` string parameter. It reads the `RARITY_COLORS` constant object using `rarity` as the key. It branches once: if `rarity` is `'mythic'`, it returns a CSS inline-style string with a full border using `RARITY_COLORS.mythic` and a faint red rgba background. For all other rarity values it returns a string with an asymmetric border layout — a 3px solid left border colored with `RARITY_COLORS[rarity]` and 1px subtle-token borders on the other three sides. The function is synchronous, calls nothing else, and has no error path. There is no guard against a rarity value absent from `RARITY_COLORS`.

### renderSocketDots

`renderSocketDots` takes a single `ArsenalReference` param. It reads `ref.rarity` to look up the total socket count in `RARITY_SOCKET_COUNT`, falling back to `1`. It reads `ref.sockets` and builds a `Map` keyed by socket index. If `ref.sockets` is null or undefined the nullish-coalescing `?? []` produces an empty map. The function iterates `total` times; for each iteration it checks whether the current index exists in the map. If it does, it emits a `<span class="ref-socket-dot filled">` with a `title` attribute set to `escapeHTML(eid)`. If not, it emits an empty-class span. It returns the full dot strip wrapped in a div. Synchronous, calls `escapeHTML`, has no error path.

### renderReferenceCard

`renderReferenceCard` takes an `ArsenalReference` object, a boolean `showSecondBtn`, and an optional `showEditBtn` (defaults to `false`). It reads fields directly from `ref` and calls `compositeScore(ref)`, `powerDisplay(ref)`, `rarityCardStyle(ref.rarity)`, and conditionally `renderSocketDots(ref)`. All user-supplied string fields are passed through `escapeHTML`. Numeric fields are cast with `Number()`. The function is synchronous and returns a plain HTML string. No error path, no early returns.

### renderArsenal

`renderArsenal` is async and takes a single `HTMLElement` container. It first calls `getCurrentUser()`; if falsy, writes sign-in prompt and returns `[]`. Otherwise writes loading placeholder, then awaits `safeRpc('get_my_arsenal', {})`. If error or empty array, writes empty-state and returns `[]`. On success, sorts by `current_power` descending then `created_at` descending, builds HTML via `renderReferenceCard(ref, false, true)`, writes to container, returns refs. No try/catch.

### renderArmory

`renderArmory` is async and takes an `HTMLElement` container. Initializes local `ArmoryState`, writes full scaffold HTML. Conditionally appends bottom sheet host to `document.body`. Fire-and-forget IIFE fetches trending via `getTrendingReferences()`. `loadCards` inner async function reads state, calls `getLibrary(...)`, guards concurrent execution. `openSheet` inner function writes detail HTML and action buttons. Filter chips toggle state and call `loadCards`. Search input debounces at 320ms. `loadCards` called once at end for initial population.

### renderLibrary

`renderLibrary` is async, takes container and ignored second param. Awaits `renderArmory(container)` and returns. Backward-compatibility alias.

## Agent 04
### rarityCardStyle

Takes a single `rarity: Rarity` parameter and reads the module-level `RARITY_COLORS` constant. Synchronous, no side effects. Branches: if `rarity` is `'mythic'`, returns full four-border rule with rgba background. For all other values returns left-border-heavy style. No fallback for unrecognized rarity; `RARITY_COLORS[rarity]` would silently be `undefined`.

### renderSocketDots

Takes a single `ref: ArsenalReference`. Reads `ref.rarity` for socket count from `RARITY_SOCKET_COUNT` (fallback `1`). Reads `ref.sockets` (`?? []` guard). Builds `Map` keyed by `socket_index`. Iterates `total` times, calls `escapeHTML` on filled sockets. Returns wrapped HTML string. Synchronous, no writes, no external state.

### renderReferenceCard

Takes `ref`, `showSecondBtn`, optional `showEditBtn` (default `false`). Reads from `ref`, calls `compositeScore(ref)`, `powerDisplay(ref)`, `rarityCardStyle(ref.rarity)`. Looks up `SOURCE_TYPES`, `RARITY_COLORS`, `CHALLENGE_STATUS_LABELS`. All user strings through `escapeHTML`. Numerics cast with `Number()`. Synchronous, returns HTML string. Conditional branches for graduated badge, owner line, sockets, status label, source URL, Second button, Edit/Delete buttons. No error paths; missing `SOURCE_TYPES` lookup would cause runtime TypeError.

### renderArsenal

Async. Takes `container: HTMLElement`. Calls `getCurrentUser()`; if falsy, writes sign-in prompt, returns `[]`. Writes loading placeholder, awaits `safeRpc('get_my_arsenal', {})`. If error or empty, writes empty-state, returns `[]`. Sorts by `current_power` descending then `created_at` descending. Builds HTML via `renderReferenceCard(ref, false, true)`. Returns sorted refs. No try/catch.

### renderArmory

Async. Takes `container: HTMLElement`. Initializes `ArmoryState`, writes scaffold HTML. Conditionally appends bottom sheet host. Fire-and-forget trending IIFE. `loadCards` inner function with `state.loading` guard. `openSheet` with conditional Second/Challenge buttons. Filter chip listeners toggle state. Search debounced at 320ms. `loadCards` called at end for initial population.

### renderLibrary

Async. Takes container and ignored param. Awaits `renderArmory(container)`. Backward-compat wrapper.

## Agent 05
### rarityCardStyle

Takes a single `rarity: Rarity` parameter. Reads `RARITY_COLORS`. Branches on `'mythic'` vs other. Synchronous, no side effects, no error path. No guard for unrecognized rarity values.

### renderSocketDots

Takes one `ArsenalReference` param. Reads `ref.rarity` for socket count from `RARITY_SOCKET_COUNT` (fallback `1` via `?? 1`). Reads `ref.sockets` (`?? []` guard). Builds `Map`, iterates, calls `escapeHTML` on filled sockets. Returns wrapped HTML string. Synchronous.

### renderReferenceCard

Takes `ref`, `showSecondBtn`, optional `showEditBtn` (default `false`). Reads from `ref`, calls `compositeScore(ref)`, `powerDisplay(ref)`, `rarityCardStyle(ref.rarity)`. Looks up `SOURCE_TYPES`, `RARITY_COLORS`, `CHALLENGE_STATUS_LABELS`. All user strings through `escapeHTML`. Numerics cast with `Number()`. Synchronous, returns HTML string. Multiple conditional branches for optional sections. No error paths; missing constant lookup would cause TypeError.

### renderArsenal

Async. Takes `container: HTMLElement`. Calls `getCurrentUser()`; if falsy, writes sign-in prompt, returns `[]`. Writes loading placeholder, awaits `safeRpc('get_my_arsenal', {})`. If error or empty, writes empty-state, returns `[]`. Sorts by `current_power` descending then `created_at` descending. Builds HTML via `renderReferenceCard(ref, false, true)`. Returns sorted refs. No try/catch.

### renderArmory

Async. Takes `container: HTMLElement`, returns `Promise<void>`. Initializes `ArmoryState`, writes scaffold HTML. Conditionally appends bottom sheet to `document.body`. Fire-and-forget trending IIFE via `getTrendingReferences()`. `loadCards` async closure with `state.loading` guard, `getLibrary(...)` call, empty/error/success branches. `openSheet` writes detail HTML and conditional buttons (Second, Challenge). Filter chips toggle state fields and call `loadCards`. Search debounced at 320ms. `loadCards` called once at end. No top-level try/catch.

### renderLibrary

Async. Takes container and ignored `_?: unknown`. Awaits `renderArmory(container)`. Backward-compat alias, no logic of its own.
