# Stage 2 Outputs — src/bounties.ts

## Agent 01

### loadBountyDotSet

`loadBountyDotSet` is async and takes no parameters. It first calls `getIsPlaceholderMode()` and returns immediately without doing anything if that returns true. Otherwise it enters a try block and awaits `safeRpc<{ user_id: string }[]>('get_bounty_dot_user_ids')`, which issues an RPC to the server with no arguments. If the response contains an `error`, that error is thrown. On success, it replaces the module-level `_bountyDotSet` variable with a new `Set` built by mapping over the returned array (defaulting to an empty array if `data` is null) and extracting each `user_id` string. If any exception is thrown — either the thrown `error` from the RPC or any network-level failure — the catch block logs a warning via `console.warn` and the function returns without modifying `_bountyDotSet`. The function returns `Promise<void>`; callers receive no value.

### userHasBountyDot

`userHasBountyDot` is synchronous. It accepts a single parameter `userId` typed as `string | null | undefined`. If `userId` is falsy, it returns `false` immediately. Otherwise it calls `_bountyDotSet.has(userId)` against the module-level `_bountyDotSet` set and returns the boolean result. It reads no external state beyond that set and writes nothing.

### bountyDot

`bountyDot` is synchronous. It accepts `userId` typed as `string | null | undefined`. It calls `userHasBountyDot(userId)` and, if that returns `false`, immediately returns an empty string `''`. If `userHasBountyDot` returns `true`, it returns a literal HTML string: a `<span>` element with `title="Active bounty"`, `aria-label="Active bounty"`, inline styles for display and spacing, `class="bounty-dot"`, and the 🟡 emoji as content. The function writes nothing and reads no state directly, delegating the cache lookup entirely to `userHasBountyDot`.

### postBounty

`postBounty` is async. It accepts `targetId: string`, `amount: number`, and `durationDays: number`. If `getIsPlaceholderMode()` returns true, it returns `{ success: true, bounty_id: 'placeholder' }` immediately without a network call. Otherwise, inside a try block, it awaits `safeRpc<PostBountyResult>('post_bounty', { p_target_id: targetId, p_amount: amount, p_duration_days: durationDays })`. If the response contains an `error`, that error is thrown. If `data` is non-null, it returns `data`; if `data` is null, it returns `{ success: true }`. The catch block intercepts any thrown value, casts it to `Error`, and returns `{ success: false, error: (e as Error).message }`.

### cancelBounty

`cancelBounty` is async. It accepts a single `bountyId: string`. If `getIsPlaceholderMode()` returns true, it returns `{ success: true }` immediately. Otherwise, inside a try block, it awaits `safeRpc` calling the `'cancel_bounty'` RPC with `{ p_bounty_id: bountyId }`, typed to return `AuthResult & { refund?: number; burned?: number }`. If the response carries an `error`, that error is thrown. It returns `data` if present, or `{ success: true }` if `data` is null. The catch block returns `{ success: false, error: (e as Error).message }`.

### getMyBounties

`getMyBounties` is async and takes no parameters. If `getIsPlaceholderMode()` returns true, it returns `{ incoming: [], outgoing: [] }` immediately. Otherwise, inside a try block, it awaits `safeRpc<MyBountiesResult>('get_my_bounties')` with no additional arguments. If the response carries an `error`, that error is thrown. It returns `data` if present, or `{ incoming: [], outgoing: [] }` if `data` is null. The catch block logs the error via `console.error` and returns the same empty-arrays fallback `{ incoming: [], outgoing: [] }`. Unlike `postBounty` and `cancelBounty`, this function uses `console.error` rather than `console.warn` for the error path.

### getOpponentBounties

`getOpponentBounties` is async. It accepts `opponentId: string`. If `getIsPlaceholderMode()` returns true, it returns `[]` immediately. Otherwise, inside a try block, it awaits `safeRpc<OpponentBounty[]>('get_opponent_bounties', { p_opponent_id: opponentId })`. If the response carries an `error`, that error is thrown. It returns `data` if non-null, or `[]` if null. The catch block logs via `console.warn` and returns `[]`. The return type is `Promise<OpponentBounty[]>`; no `AuthResult` wrapper is included.

### selectBountyClaim

`selectBountyClaim` is async. It accepts `bountyId: string` and `debateId: string`. If `getIsPlaceholderMode()` returns true, it returns `{ success: true }` immediately. Otherwise, inside a try block, it awaits `safeRpc<SelectClaimResult>('select_bounty_claim', { p_bounty_id: bountyId, p_debate_id: debateId })`. If the response carries an `error`, that error is thrown. It returns `data` if non-null, or `{ success: true }` if null. The catch block returns `{ success: false, error: (e as Error).message }`. The `SelectClaimResult` type extends `AuthResult` with optional `attempt_fee` and `bounty_amount` fields, but those fields are only present if the server populates them in `data`.

### bountySlotLimit

`bountySlotLimit` is synchronous. It accepts a single `depthPct: number` parameter and reads no module-level or external state. It evaluates a cascade of `if` statements in descending threshold order — 75, 65, 55, 45, 35, 25 — and returns the integer 6, 5, 4, 3, 2, or 1 for the first threshold that `depthPct` meets or exceeds. If `depthPct` is below 25, none of the branches match and the function returns 0. The function has no loops, no async behavior, and no error path.

### renderProfileBountySection

`renderProfileBountySection` is async. It accepts a `container: HTMLElement`, `targetId: string`, `viewerDepth: number`, `viewerBalance: number`, and `_openCountHint: number` (the underscore-prefixed parameter is declared but not read at any point in the function body). It begins by calling `bountySlotLimit(viewerDepth)` to get `slotLimit`, then writes a skeleton HTML structure into `container.innerHTML` containing a header div and a `#bounty-section-body` child. It then queries the container for `#bounty-section-body` with a non-null assertion.

If `slotLimit` is 0, it sets `body.innerHTML` to a "reach 25% depth" message and returns early.

Otherwise it declares `existingBounty` as null and `viewerOpenCount` as 0, then awaits `getMyBounties()`. If that succeeds, it counts the outgoing bounties with `status === 'open'` into `viewerOpenCount`, and searches those outgoing bounties for one whose `target_id` matches `targetId` and whose status is `'open'`, storing the result in `existingBounty`. If `getMyBounties()` throws, the empty catch block leaves both variables at their initial values.

If `existingBounty` is non-null, the function renders a card showing the bounty amount, days remaining (computed from `existingBounty.expires_at` vs `Date.now()`, floored at 0), and a "CANCEL BOUNTY (85% refund)" button. A click listener is attached to that button via `document.getElementById('bounty-cancel-btn')`. The first click mutates the button's text to show the calculated refund amount — computed as `Math.round((amount + duration_days) * 0.85 * 100) / 100` — and changes the button's background color, then replaces `btn.onclick` with a new async handler. That second handler disables the button, sets its text to `'…'`, awaits `cancelBounty(existingBounty.id)`, and on success replaces `body.innerHTML` with a confirmation message including `result.refund`. On failure it re-enables the button and shows `result.error`. After wiring this cancel path, the function returns.

If `existingBounty` is null, the function renders a post-new-bounty form into `body.innerHTML` with two numeric inputs (`#bounty-amount-input` and `#bounty-duration-input`) and a `#bounty-post-btn`. An inner function `_updatePreview` is defined: it reads both inputs from the DOM, and if both are positive it computes `total = amt + dur`, writes a preview string to `#bounty-cost-preview`, and colors it red if `viewerBalance - total < 0` or muted otherwise; if either value is zero it clears the preview text. `_updatePreview` is attached as an `input` event listener on both inputs, and is also called once immediately after attachment. A click listener on `#bounty-post-btn` reads both input values from the DOM, validates them (amount > 0; duration 1–365; total cost within `viewerBalance`), shows inline errors in `#bounty-post-error` on failure, disables the button and sets text to `'…'` before awaiting `postBounty(targetId, amt, dur)`. On success it replaces `body.innerHTML` with a confirmation message and fires `loadBountyDotSet()` as a fire-and-forget call (`void`). On failure it re-enables the button, restores its label, and shows the error.

### renderMyBountiesSection

`renderMyBountiesSection` is async. It accepts a `container: HTMLElement` and writes an initial loading placeholder into `container.innerHTML`. It then awaits `getMyBounties()` and destructures the result into `incoming` and `outgoing` arrays of `BountyRow`.

An inner function `_row` is defined but not exported. It accepts a `BountyRow` and a `'incoming' | 'outgoing'` type string. It computes `daysLeft` from `b.expires_at` vs `Date.now()` (floored at 0), sets `statusColor` to `'#F5A623'` if `b.status === 'open'` or to `'var(--mod-text-muted)'` otherwise, and builds a `who` string that uses `b.poster_username` for incoming rows or `b.target_username` for outgoing rows, falling back to `'?'` if either is absent. It returns an HTML string for a row div. For outgoing rows with `status === 'open'`, the row includes a `<button class="bounty-cancel-row-btn">` with `data-bounty-id`, `data-amount`, and `data-duration` attributes encoded from the row's fields. Other statuses produce no cancel button.

After defining `_row`, the function builds `incomingHTML` by mapping the `incoming` array through `_row(..., 'incoming')` and joining, or using a "no active bounties" fallback string if the array is empty. It builds `outgoingHTML` the same way for `outgoing`. It then replaces `container.innerHTML` with a two-section layout containing both lists under labeled headers.

Finally, it queries all `.bounty-cancel-row-btn` elements within `container` and attaches a click listener to each. The listener reads `bountyId`, `amt`, and `dur` from the button's dataset. On first click, if `btn.dataset.confirmed` is not set, it sets that attribute to `'1'`, changes the button text to a confirmation prompt showing the computed 85% refund, and applies a red background tint, then returns. On a second click (when `confirmed` is already set), it disables the button, sets text to `'…'`, and awaits `cancelBounty(bountyId)`. On success it awaits `renderMyBountiesSection(container)` — re-rendering the entire section recursively — and fires `loadBountyDotSet()` as fire-and-forget. On failure it re-enables the button, sets its text to `result.error` or `'Error'`, and deletes `btn.dataset.confirmed` to reset the two-click confirmation state.

## Agent 02

### loadBountyDotSet

`loadBountyDotSet` is async and takes no parameters. It first calls `getIsPlaceholderMode()` and returns immediately without doing anything if that returns true. Otherwise it calls `safeRpc<{ user_id: string }[]>('get_bounty_dot_user_ids')` and awaits the result. If the RPC returns an error object, that error is thrown. On a successful response, the module-level `_bountyDotSet` variable is replaced entirely with a new `Set` built by mapping `data` (defaulting to `[]` if null) to its `user_id` strings. If any exception is thrown — from the RPC call itself or from the thrown error — the catch block logs a warning via `console.warn` and returns without updating `_bountyDotSet`.

### userHasBountyDot

`userHasBountyDot` is synchronous and takes a single parameter `userId`, typed as `string | null | undefined`. If `userId` is falsy it returns `false` immediately. Otherwise it calls `_bountyDotSet.has(userId)` and returns the boolean result. The value of `_bountyDotSet` at call time is whatever was last written by `loadBountyDotSet`; if `loadBountyDotSet` has never run or has never successfully completed, `_bountyDotSet` is the empty set initialized at module load, so this function returns `false` for all inputs.

### bountyDot

`bountyDot` is synchronous and takes `userId` typed as `string | null | undefined`. It calls `userHasBountyDot(userId)` and if that returns `false`, returns an empty string. If `userHasBountyDot` returns `true`, it returns a fixed HTML string: a `<span>` element styled for inline display with a gold circle emoji and ARIA label text `"Active bounty"`. The return value is safe to concatenate directly into template literals used for `innerHTML`.

### postBounty

`postBounty` is async and takes three parameters: `targetId` (string), `amount` (number), and `durationDays` (number). If `getIsPlaceholderMode()` returns true, it returns `{ success: true, bounty_id: 'placeholder' }` without making any network call. Otherwise it awaits `safeRpc<PostBountyResult>('post_bounty', { p_target_id: targetId, p_amount: amount, p_duration_days: durationDays })`. If the RPC response contains an error, that error is thrown. On success it returns `data` if present, or `{ success: true }` if `data` is null. If any exception is caught, it returns `{ success: false, error: (e as Error).message }`.

### cancelBounty

`cancelBounty` is async and takes a single `bountyId` string. If `getIsPlaceholderMode()` is true it returns `{ success: true }` immediately. Otherwise it awaits `safeRpc<AuthResult & { refund?: number; burned?: number }>('cancel_bounty', { p_bounty_id: bountyId })`. If the response contains an error, that error is thrown. On success it returns `data` or, if `data` is null, `{ success: true }`. Exceptions are caught and returned as `{ success: false, error: (e as Error).message }`.

### getMyBounties

`getMyBounties` is async and takes no parameters. If `getIsPlaceholderMode()` returns true it returns `{ incoming: [], outgoing: [] }`. Otherwise it awaits `safeRpc<MyBountiesResult>('get_my_bounties')`. If the response has an error, that error is thrown. On success it returns `data`, or `{ incoming: [], outgoing: [] }` if `data` is null. The catch block logs an error via `console.error` and returns `{ incoming: [], outgoing: [] }`. This is the only RPC wrapper in the file whose catch block uses `console.error` rather than `console.warn` or silent swallowing.

### getOpponentBounties

`getOpponentBounties` is async and takes a single `opponentId` string. If `getIsPlaceholderMode()` returns true it returns `[]`. Otherwise it awaits `safeRpc<OpponentBounty[]>('get_opponent_bounties', { p_opponent_id: opponentId })`. If the response has an error, that error is thrown. On success it returns `data` or `[]` if `data` is null. The catch block logs a warning via `console.warn` and returns `[]`.

### selectBountyClaim

`selectBountyClaim` is async and takes two strings: `bountyId` and `debateId`. If `getIsPlaceholderMode()` returns true it returns `{ success: true }`. Otherwise it awaits `safeRpc<SelectClaimResult>('select_bounty_claim', { p_bounty_id: bountyId, p_debate_id: debateId })`. If the response has an error, that error is thrown. On success it returns `data` or `{ success: true }` if `data` is null. Exceptions are caught and returned as `{ success: false, error: (e as Error).message }`.

### bountySlotLimit

`bountySlotLimit` is synchronous and takes a single `depthPct` number. It evaluates a cascade of six `if` comparisons against decreasing thresholds — 75, 65, 55, 45, 35, 25 — returning 6, 5, 4, 3, 2, or 1 respectively for the first threshold that `depthPct` meets or exceeds. If `depthPct` is below 25, it returns 0. No external state is read; the return value depends only on the input parameter.

### renderProfileBountySection

`renderProfileBountySection` is async and takes a `container` HTMLElement, `targetId` string, `viewerDepth` number, `viewerBalance` number, and `_openCountHint` number (which is declared but never read). It first calls `bountySlotLimit(viewerDepth)` to compute `slotLimit`, then sets `container.innerHTML` to a skeleton with a loading placeholder and a `#bounty-section-body` element. It queries that element into `body`.

If `slotLimit` is 0, `body.innerHTML` is replaced with a depth gate message and the function returns early.

Otherwise, it calls `getMyBounties()` and awaits the result. From the returned `outgoing` array it computes `viewerOpenCount` (count of `status === 'open'` entries) and searches for an `existingBounty` whose `target_id` matches `targetId` and whose `status` is `'open'`. This entire block is wrapped in a try/catch whose catch is empty and marked non-fatal, so both variables remain at their defaults (`null` and `0`) if `getMyBounties` throws.

If `existingBounty` is non-null, `body.innerHTML` is set to a card showing the bounty amount, a computed `daysLeft` value, and a cancel button labeled "CANCEL BOUNTY (85% refund)". A click listener is attached to the cancel button by `getElementById`. On first click, the button's text is changed to a confirmation prompt showing a locally computed `refundAmt` (85% of `existingBounty.amount + existingBounty.duration_days`, rounded to two decimal places), and `btn.onclick` is replaced with an async handler. That second handler disables the button, awaits `cancelBounty(existingBounty.id)`, and on success replaces `body.innerHTML` with a confirmation message showing `result.refund`; on failure it re-enables the button and displays `result.error`. After the cancel button wiring, the function returns early.

If there is no `existingBounty`, the function falls through to render the post-bounty form. It computes `slotsLeft = slotLimit - viewerOpenCount` and sets `body.innerHTML` to a form with `#bounty-amount-input`, `#bounty-duration-input`, a `#bounty-cost-preview` div, a `#bounty-post-error` div, and a `#bounty-post-btn` button. A local `_updatePreview` function reads both input values from the DOM via `getElementById`, computes a total cost display string, and updates the preview element's text and color based on whether `viewerBalance - total` would go negative. `_updatePreview` is registered as an `input` event listener on both inputs and called once immediately.

A click listener on `#bounty-post-btn` reads both input values, validates that `amt` is positive, `dur` is 1–365, and `amt + dur <= viewerBalance`, displaying an error in `#bounty-post-error` and returning early for each failing condition. If validation passes, it disables the button and awaits `postBounty(targetId, amt, dur)`. On success it replaces `body.innerHTML` with a confirmation message and calls `loadBountyDotSet()` as a fire-and-forget (`void`). On failure it re-enables the button and shows `result.error` in the error element.

### renderMyBountiesSection

`renderMyBountiesSection` is async and takes a single `container` HTMLElement. It immediately sets `container.innerHTML` to a loading message, then awaits `getMyBounties()` and destructures the result into `incoming` and `outgoing` arrays.

A local `_row` function takes a `BountyRow` and a `'incoming' | 'outgoing'` label. It computes `daysLeft` from `b.expires_at` minus `Date.now()`, selects `statusColor` based on whether `b.status` is `'open'`, builds a `who` string showing either `poster_username` (for incoming) or `target_username` (for outgoing), and returns an HTML string for a single list row. For outgoing rows whose `status` is `'open'`, the row HTML includes a cancel button with `data-bounty-id`, `data-amount`, and `data-duration` attributes.

`incomingHTML` is built by mapping `incoming` through `_row(..., 'incoming')` and joining, or a "no active bounties" message if `incoming` is empty. `outgoingHTML` follows the same pattern for `outgoing`. `container.innerHTML` is then replaced with a two-section layout containing both HTML blocks.

After rendering, the function queries all `.bounty-cancel-row-btn` elements inside `container` and attaches a click listener to each. On first click, if `btn.dataset.confirmed` is not set, it sets it to `'1'`, updates the button text to show a locally computed `refundAmt` (85% of `amt + dur`), and returns. On second click (when `dataset.confirmed` is present), it disables the button and awaits `cancelBounty(bountyId)`. On success it awaits `renderMyBountiesSection(container)` (recursively re-rendering the entire section) and then calls `loadBountyDotSet()` as fire-and-forget. On failure it re-enables the button, restores an error text from `result.error`, and deletes `btn.dataset.confirmed` to reset the two-click confirmation state.

## Agent 03

### loadBountyDotSet

`loadBountyDotSet` is async and takes no parameters. It first calls `getIsPlaceholderMode()` and returns immediately if that returns true. Otherwise, it calls `safeRpc<{ user_id: string }[]>('get_bounty_dot_user_ids')` and awaits the result. If the response contains an `error` field, it throws that error. On success, the module-level variable `_bountyDotSet` is replaced with a new `Set` built by mapping each element of the response `data` array (defaulting to an empty array if `data` is null) to its `user_id` string. If any exception is thrown — either from the `safeRpc` call or from the thrown error — the catch block calls `console.warn` with the error and the function returns without updating `_bountyDotSet`. The function returns `Promise<void>` and has no other return value.

### userHasBountyDot

`userHasBountyDot` is synchronous and takes a single parameter `userId`, typed as `string | null | undefined`. If `userId` is falsy it returns `false` immediately. Otherwise it calls `_bountyDotSet.has(userId)` and returns the boolean result. The function never writes to any state; it only reads from the module-level `_bountyDotSet`.

### bountyDot

`bountyDot` is synchronous and takes a `userId` parameter typed as `string | null | undefined`. It calls `userHasBountyDot(userId)` and, if that returns `false`, returns an empty string. If `userHasBountyDot` returns `true`, it returns a fixed HTML string: a `<span>` element styled as a small gold circle emoji with inline CSS, a `title` and `aria-label` of "Active bounty", and a class of `bounty-dot`. The function writes nothing and has no other branches.

### postBounty

`postBounty` is async and accepts `targetId` (string), `amount` (number), and `durationDays` (number). If `getIsPlaceholderMode()` returns true, it immediately returns `{ success: true, bounty_id: 'placeholder' }` without any network call. Otherwise, it enters a try block and awaits `safeRpc<PostBountyResult>('post_bounty', { p_target_id: targetId, p_amount: amount, p_duration_days: durationDays })`. If the response has an `error` property, it throws that error. On success it returns `data` if non-null, or `{ success: true }` if `data` is null. In the catch block, it returns `{ success: false, error: (e as Error).message }`.

### cancelBounty

`cancelBounty` is async and accepts a single `bountyId` string. If `getIsPlaceholderMode()` returns true, it immediately returns `{ success: true }`. Otherwise, it enters a try block and awaits `safeRpc<AuthResult & { refund?: number; burned?: number }>('cancel_bounty', { p_bounty_id: bountyId })`. If the response has an `error` property, it throws that error. On success it returns `data` if non-null, or `{ success: true }` if `data` is null. The returned object may carry optional `refund` and `burned` numeric fields alongside the `AuthResult` fields. In the catch block, it returns `{ success: false, error: (e as Error).message }`.

### getMyBounties

`getMyBounties` is async and takes no parameters. If `getIsPlaceholderMode()` returns true, it returns `{ incoming: [], outgoing: [] }` immediately. Otherwise, it enters a try block and awaits `safeRpc<MyBountiesResult>('get_my_bounties')`. If the response has an `error` property, it throws. On success it returns `data` if non-null, or `{ incoming: [], outgoing: [] }` if `data` is null. In the catch block, it calls `console.error` with the error and then returns `{ incoming: [], outgoing: [] }`.

### getOpponentBounties

`getOpponentBounties` is async and takes an `opponentId` string. If `getIsPlaceholderMode()` returns true, it returns `[]` immediately. Otherwise, it enters a try block and awaits `safeRpc<OpponentBounty[]>('get_opponent_bounties', { p_opponent_id: opponentId })`. If the response has an `error` property, it throws. On success it returns `data` if non-null, or `[]` if `data` is null. In the catch block, it calls `console.warn` and returns `[]`.

### selectBountyClaim

`selectBountyClaim` is async and accepts `bountyId` and `debateId` as strings. If `getIsPlaceholderMode()` returns true, it returns `{ success: true }` immediately. Otherwise, it enters a try block and awaits `safeRpc<SelectClaimResult>('select_bounty_claim', { p_bounty_id: bountyId, p_debate_id: debateId })`. If the response has an `error` property, it throws. On success it returns `data` if non-null, or `{ success: true }` if `data` is null. The returned object may carry optional `attempt_fee` and `bounty_amount` numeric fields. In the catch block, it returns `{ success: false, error: (e as Error).message }`.

### bountySlotLimit

`bountySlotLimit` is synchronous and takes a single `depthPct` number. It evaluates a descending chain of threshold comparisons against `depthPct` (75, 65, 55, 45, 35, 25) and returns the integer slot limit associated with the first threshold met (6, 5, 4, 3, 2, 1 respectively). If `depthPct` is below 25, it returns 0. It reads no external state and writes nothing.

### renderProfileBountySection

`renderProfileBountySection` is async and accepts a `container` HTMLElement, `targetId` string, `viewerDepth` number, `viewerBalance` number, and `_openCountHint` number (the last parameter is declared but never read). It begins by calling `bountySlotLimit(viewerDepth)` to compute `slotLimit`, then writes a skeleton HTML structure with a loading placeholder into `container.innerHTML`. It queries `#bounty-section-body` from the updated container and holds a reference in `body`.

If `slotLimit` is 0, it sets `body.innerHTML` to a message prompting the viewer to reach 25% profile depth and returns early.

Otherwise, it awaits `getMyBounties()` inside a try/catch (errors are swallowed silently). From the returned `outgoing` array, it counts open bounties into `viewerOpenCount` and searches for an existing open bounty against `targetId`, storing the first match in `existingBounty`.

If `existingBounty` is non-null, it computes `daysLeft` from `existingBounty.expires_at` and `Date.now()`, renders a read-only display of the bounty amount and days remaining into `body.innerHTML`, and attaches a click listener to the `#bounty-cancel-btn` button. On the first click, the button text changes to show the calculated refund (85% of `amount + duration_days`), the background shifts, and a new `onclick` handler is installed. That inner handler disables the button, awaits `cancelBounty(existingBounty.id)`, then either replaces `body.innerHTML` with a success message (including `result.refund`) or re-enables the button with an error message. After setting up this listener the function returns early.

If no existing bounty is found, it computes `slotsLeft = slotLimit - viewerOpenCount` and renders a post-new-bounty form with two number inputs (amount and duration) into `body.innerHTML`. It defines an inner `_updatePreview` function that reads both inputs from the DOM, computes total cost, and writes a cost-and-balance preview string into `#bounty-cost-preview`, coloring it red if the balance would go negative. `_updatePreview` is attached to the `input` event of both fields and called once immediately. A click listener on `#bounty-post-btn` reads both inputs, validates amount (must be positive), duration (1–365), and affordability (amount + duration <= viewerBalance), displaying errors in `#bounty-post-error` and returning early on any failure. On passing all checks, the button is disabled and awaits `postBounty(targetId, amt, dur)`. On success, `body.innerHTML` is replaced with a success message and `loadBountyDotSet()` is called fire-and-forget via `void`. On failure, the button is re-enabled and the error message is displayed.

### renderMyBountiesSection

`renderMyBountiesSection` is async and accepts a single `container` HTMLElement. It first writes a loading message into `container.innerHTML`, then awaits `getMyBounties()` and destructures `incoming` and `outgoing` from the result.

It defines an inner `_row` function that takes a `BountyRow` and a `'incoming' | 'outgoing'` type label. `_row` computes `daysLeft` from `b.expires_at` and `Date.now()`, picks a status color (gold for `'open'`, muted otherwise), builds a `who` string showing either the poster username (for incoming) or target username (for outgoing), and returns an HTML string for one row. For outgoing rows with status `'open'`, the row HTML includes a CANCEL button with `data-bounty-id`, `data-amount`, and `data-duration` attributes.

After constructing `incomingHTML` and `outgoingHTML` by mapping `_row` over each array (or substituting a fallback empty-state message if the array is empty), it sets `container.innerHTML` to the full two-section layout.

It then queries all `.bounty-cancel-row-btn` elements inside `container` and attaches a click listener to each. On first click, if `btn.dataset.confirmed` is not set, the button text is updated to show the 85% refund amount (calculated from `data-amount + data-duration`), the background is changed, `btn.dataset.confirmed` is set to `'1'`, and the handler returns without proceeding. On the second click (confirmed state), the button is disabled and `cancelBounty(bountyId)` is awaited. On success, `renderMyBountiesSection(container)` is awaited to re-render the section, and `loadBountyDotSet()` is called fire-and-forget via `void`. On failure, the button is re-enabled, the error text is set, and `btn.dataset.confirmed` is deleted so the two-click confirmation resets.

## Agent 04

### loadBountyDotSet

`loadBountyDotSet` is async. It takes no parameters. On entry it calls `getIsPlaceholderMode()`, and if that returns true it returns immediately without doing anything. Otherwise it calls `safeRpc<{ user_id: string }[]>('get_bounty_dot_user_ids')` and awaits the result. If the response carries an `error`, that error is thrown. If the call succeeds, the module-level variable `_bountyDotSet` is replaced with a new `Set` built by mapping each element of the response `data` array (defaulting to an empty array if `data` is null) to its `user_id` string. If the `safeRpc` call throws or the re-throw fires, the catch block calls `console.warn` with the error and the function returns without updating `_bountyDotSet`. The function returns `Promise<void>` and has no other return value.

### userHasBountyDot

`userHasBountyDot` is synchronous. It accepts a single parameter `userId`, typed as `string | null | undefined`. If `userId` is falsy it returns `false` immediately. Otherwise it calls `_bountyDotSet.has(userId)` and returns the boolean result. The function never writes to any state; it only reads from the module-level `_bountyDotSet`.

### bountyDot

`bountyDot` is synchronous. It accepts `userId` typed as `string | null | undefined`. It calls `userHasBountyDot(userId)` and, if that returns `false`, returns an empty string. If `userHasBountyDot` returns `true`, it returns a fixed HTML string: a `<span>` element styled as an inline-block gold circle emoji (`🟡`) with `title` and `aria-label` attributes set to `"Active bounty"` and the CSS class `bounty-dot`. The function writes nothing and has no side effects beyond the call to `userHasBountyDot`.

### postBounty

`postBounty` is async. It accepts three parameters: `targetId` (string), `amount` (number), and `durationDays` (number). If `getIsPlaceholderMode()` returns true it immediately returns `{ success: true, bounty_id: 'placeholder' }`. Otherwise it calls `safeRpc<PostBountyResult>('post_bounty', { p_target_id: targetId, p_amount: amount, p_duration_days: durationDays })` and awaits the result. If the response contains an `error`, that error is thrown. On success it returns `data` if non-null, otherwise `{ success: true }`. If any exception is thrown (either from the `safeRpc` call or the re-throw), the catch block returns `{ success: false, error: (e as Error).message }`. The function does not write to any module-level state.

### cancelBounty

`cancelBounty` is async. It accepts `bountyId` (string). If `getIsPlaceholderMode()` returns true it immediately returns `{ success: true }`. Otherwise it calls `safeRpc<AuthResult & { refund?: number; burned?: number }>('cancel_bounty', { p_bounty_id: bountyId })` and awaits the result. If the response contains an `error`, that error is thrown. On success it returns `data` if non-null, otherwise `{ success: true }`. On any exception the catch block returns `{ success: false, error: (e as Error).message }`. The returned object may include `refund` and `burned` numeric fields depending on what the RPC returns. The function writes to no module-level state.

### getMyBounties

`getMyBounties` is async and takes no parameters. If `getIsPlaceholderMode()` returns true it immediately returns `{ incoming: [], outgoing: [] }`. Otherwise it calls `safeRpc<MyBountiesResult>('get_my_bounties')` and awaits the result. If the response carries an `error`, that error is thrown. On success it returns `data` if non-null, otherwise `{ incoming: [], outgoing: [] }`. If any exception is caught, it calls `console.error` with the error and returns `{ incoming: [], outgoing: [] }`. The function does not write to any module-level state.

### getOpponentBounties

`getOpponentBounties` is async. It accepts `opponentId` (string). If `getIsPlaceholderMode()` returns true it immediately returns an empty array. Otherwise it calls `safeRpc<OpponentBounty[]>('get_opponent_bounties', { p_opponent_id: opponentId })` and awaits the result. If the response carries an `error`, that error is thrown. On success it returns `data` if non-null, otherwise `[]`. If any exception is caught, it calls `console.warn` with the error and returns `[]`. The function writes to no module-level state.

### selectBountyClaim

`selectBountyClaim` is async. It accepts two parameters: `bountyId` (string) and `debateId` (string). If `getIsPlaceholderMode()` returns true it immediately returns `{ success: true }`. Otherwise it calls `safeRpc<SelectClaimResult>('select_bounty_claim', { p_bounty_id: bountyId, p_debate_id: debateId })` and awaits the result. If the response carries an `error`, that error is thrown. On success it returns `data` if non-null, otherwise `{ success: true }`. On any exception the catch block returns `{ success: false, error: (e as Error).message }`. The returned object may include `attempt_fee` and `bounty_amount` numeric fields if the RPC returns them. The function writes to no module-level state.

### bountySlotLimit

`bountySlotLimit` is synchronous. It accepts `depthPct` (number) and returns a number between 0 and 6. It evaluates a chain of `if` comparisons against the thresholds 75, 65, 55, 45, 35, and 25 in descending order, returning 6, 5, 4, 3, 2, and 1 respectively for the first threshold that `depthPct` meets or exceeds. If none of those thresholds are met, it returns 0. The function reads only its parameter and writes nothing.

### renderProfileBountySection

`renderProfileBountySection` is async and accepts four used parameters: `container` (HTMLElement), `targetId` (string), `viewerDepth` (number), `viewerBalance` (number); the fifth parameter `_openCountHint` is declared but never read.

On entry it calls `bountySlotLimit(viewerDepth)` to compute `slotLimit`. It then sets `container.innerHTML` to a skeleton containing a "BOUNTY" heading and a `#bounty-section-body` div showing a loading state. It queries `container` for `#bounty-section-body` and assigns it to `body`.

If `slotLimit` is 0, `body.innerHTML` is replaced with a "Reach 25% profile depth" message and the function returns early.

Otherwise it declares `existingBounty` (null) and `viewerOpenCount` (0), then awaits `getMyBounties()`. From the returned `outgoing` array it counts open bounties into `viewerOpenCount` and searches for an open bounty whose `target_id` matches `targetId`, assigning the result (or null) to `existingBounty`. If `getMyBounties` throws, the catch block is silent and both variables retain their initial values.

If `existingBounty` is non-null, `body.innerHTML` is set to a card showing the bounty amount, a computed `daysLeft` value (floored at 0, computed from `existingBounty.expires_at` minus `Date.now()` divided by 86,400,000 and ceiling-rounded), and a "CANCEL BOUNTY (85% refund)" button with id `bounty-cancel-btn`. An event listener is attached to that button via `document.getElementById`. On first click the button text changes to a confirmation prompt showing a refund amount computed as `Math.round((existingBounty.amount + existingBounty.duration_days) * 0.85 * 100) / 100` and its `onclick` is replaced. On the replacement `onclick`, the button is disabled, its text set to `'…'`, and `cancelBounty(existingBounty.id)` is awaited. If the result is successful, `body.innerHTML` is replaced with a confirmation message showing `result.refund`. If not successful, the button is re-enabled and its text set to `result.error` or `'Error — try again'`. After setting the existing-bounty UI, the function returns early.

If there is no existing bounty, `slotsLeft` is computed as `slotLimit - viewerOpenCount` and `body.innerHTML` is set to a form with two number inputs (`#bounty-amount-input` with max `viewerBalance`, `#bounty-duration-input` defaulting to 7), a `#bounty-cost-preview` div, a `#bounty-post-error` div, and a `#bounty-post-btn` button. A local function `_updatePreview` is defined: it reads the current numeric values of both inputs from the DOM via `document.getElementById`, computes a total cost display string, and sets `#bounty-cost-preview` text to show the total, the breakdown, and the remaining balance. If either input is zero or empty the preview is cleared. The preview text color is set to `var(--mod-magenta)` if the balance would go negative, otherwise `var(--mod-text-muted)`. `_updatePreview` is registered on `input` events of both inputs and called immediately once.

An async click handler is attached to `#bounty-post-btn`. When fired, it reads `amt` and `dur` from the DOM inputs. It hides `#bounty-post-error`. If `amt` is zero or negative it shows "Enter a bounty amount." and returns. If `dur` is outside 1–365 it shows "Duration must be 1–365 days." and returns. If `amt + dur > viewerBalance` it shows "Insufficient tokens." and returns. Otherwise the button is disabled and set to `'…'`, then `postBounty(targetId, amt, dur)` is awaited. If successful, `body.innerHTML` is replaced with a success message and `loadBountyDotSet()` is called as a fire-and-forget (`void`). If not successful, the button is re-enabled and `#bounty-post-error` is shown with `result.error` or a fallback message.

### renderMyBountiesSection

`renderMyBountiesSection` is async. It accepts `container` (HTMLElement) and returns `Promise<void>`.

On entry it sets `container.innerHTML` to a loading message, then awaits `getMyBounties()` and destructures `incoming` and `outgoing` from the result.

A local function `_row` is defined. It accepts a `BountyRow` and a type string `'incoming' | 'outgoing'`. It computes `daysLeft` the same way as in `renderProfileBountySection`. It sets `statusColor` to `'#F5A623'` if `b.status === 'open'`, otherwise `'var(--mod-text-muted)'`. The `who` string differs by type: for `'incoming'` it uses `b.poster_username` (falling back to `'?'`); for `'outgoing'` it uses `b.target_username` (falling back to `'?'`). It returns a `div.bounty-list-row` HTML string with a `data-bounty-id` attribute, displaying the who-label, days remaining, duration window, amount, and status. For `'outgoing'` rows where `b.status === 'open'`, it appends a `button.bounty-cancel-row-btn` carrying `data-bounty-id`, `data-amount`, and `data-duration` data attributes.

After `_row` is defined, `incomingHTML` is built by mapping `incoming` through `_row` with `'incoming'`, or set to a fallback empty-state message if `incoming` is empty. `outgoingHTML` is built the same way with `'outgoing'` and its own fallback message.

`container.innerHTML` is then set to the full rendered layout with two sections: "BOUNTIES ON ME" and "BOUNTIES I'VE POSTED".

After rendering, `container.querySelectorAll('.bounty-cancel-row-btn')` is iterated. Each button gets an async click listener. On first click, if `btn.dataset.confirmed` is not set, the button text is changed to `"Confirm (${refundAmt} back)"` (where `refundAmt` is `Math.round((amt + dur) * 0.85 * 100) / 100`), its background is changed, and `btn.dataset.confirmed` is set to `'1'` before returning. On the second click (when `btn.dataset.confirmed` is already set), the button is disabled and set to `'…'`, then `cancelBounty(bountyId)` is awaited. If the result is successful, `renderMyBountiesSection(container)` is awaited (re-rendering the entire section) and `loadBountyDotSet()` is called fire-and-forget. If not successful, the button is re-enabled, its text set to `result.error` or `'Error'`, and `btn.dataset.confirmed` is deleted so the two-click confirmation sequence resets.

## Agent 05

### loadBountyDotSet

`loadBountyDotSet` is async and takes no parameters. It first calls `getIsPlaceholderMode()` and returns immediately if that returns true. Otherwise, it calls `safeRpc<{ user_id: string }[]>('get_bounty_dot_user_ids')` and awaits the result. If the response contains an `error` property, it throws that error. On success, it replaces the module-level `_bountyDotSet` variable with a new `Set` built by mapping each row in the returned array (defaulting to an empty array if `data` is null) to its `user_id` string. If any exception is thrown — either from the `safeRpc` call or from the thrown error — the catch block calls `console.warn` with the error and returns without updating `_bountyDotSet`.

### userHasBountyDot

`userHasBountyDot` is synchronous and takes a single `userId` parameter typed as `string | null | undefined`. If `userId` is falsy, it returns `false` immediately. Otherwise it calls `_bountyDotSet.has(userId)` and returns the boolean result. It reads only the module-level `_bountyDotSet`; it writes nothing and makes no external calls.

### bountyDot

`bountyDot` is synchronous and takes a `userId` parameter typed as `string | null | undefined`. It calls `userHasBountyDot(userId)` and, if that returns `false`, immediately returns an empty string. If `userHasBountyDot` returns `true`, it returns a fixed HTML string: a `<span>` element styled as a small gold circle emoji with inline CSS, a `title` and `aria-label` of "Active bounty", and a class of `bounty-dot`. The function writes nothing and has no other branches.

### postBounty

`postBounty` is async and accepts `targetId` (string), `amount` (number), and `durationDays` (number). If `getIsPlaceholderMode()` returns true, it immediately returns `{ success: true, bounty_id: 'placeholder' }` without any network call. Otherwise, it enters a try block and awaits `safeRpc<PostBountyResult>('post_bounty', { p_target_id: targetId, p_amount: amount, p_duration_days: durationDays })`. If the response has an `error` property, it throws that error. On success it returns `data` if non-null, or `{ success: true }` if `data` is null. In the catch block, it returns `{ success: false, error: (e as Error).message }`.

### cancelBounty

`cancelBounty` is async and accepts a single `bountyId` string. If `getIsPlaceholderMode()` returns true, it immediately returns `{ success: true }`. Otherwise, it enters a try block and awaits `safeRpc<AuthResult & { refund?: number; burned?: number }>('cancel_bounty', { p_bounty_id: bountyId })`. If the response has an `error` property, it throws that error. On success it returns `data` if non-null, or `{ success: true }` if `data` is null. The returned object may carry optional `refund` and `burned` numeric fields alongside the `AuthResult` fields. In the catch block, it returns `{ success: false, error: (e as Error).message }`.

### getMyBounties

`getMyBounties` is async and takes no parameters. If `getIsPlaceholderMode()` returns true, it returns `{ incoming: [], outgoing: [] }` immediately. Otherwise, it enters a try block and awaits `safeRpc<MyBountiesResult>('get_my_bounties')`. If the response has an `error` property, it throws. On success it returns `data` if non-null, or `{ incoming: [], outgoing: [] }` if `data` is null. In the catch block, it calls `console.error` with the error and then returns `{ incoming: [], outgoing: [] }`.

### getOpponentBounties

`getOpponentBounties` is async and takes an `opponentId` string. If `getIsPlaceholderMode()` returns true, it returns `[]` immediately. Otherwise, it enters a try block and awaits `safeRpc<OpponentBounty[]>('get_opponent_bounties', { p_opponent_id: opponentId })`. If the response has an `error` property, it throws. On success it returns `data` if non-null, or `[]` if `data` is null. In the catch block, it calls `console.warn` and returns `[]`.

### selectBountyClaim

`selectBountyClaim` is async and accepts `bountyId` and `debateId` as strings. If `getIsPlaceholderMode()` returns true, it returns `{ success: true }` immediately. Otherwise, it enters a try block and awaits `safeRpc<SelectClaimResult>('select_bounty_claim', { p_bounty_id: bountyId, p_debate_id: debateId })`. If the response has an `error` property, it throws. On success it returns `data` if non-null, or `{ success: true }` if `data` is null. The returned object may carry optional `attempt_fee` and `bounty_amount` numeric fields. In the catch block, it returns `{ success: false, error: (e as Error).message }`.

### bountySlotLimit

`bountySlotLimit` is synchronous and takes a single `depthPct` number. It evaluates a descending chain of threshold comparisons against `depthPct` (75, 65, 55, 45, 35, 25) and returns the integer slot limit associated with the first threshold met (6, 5, 4, 3, 2, 1 respectively). If `depthPct` is below 25, it returns 0. It reads no external state and writes nothing.

### renderProfileBountySection

`renderProfileBountySection` is async and accepts a `container` HTMLElement, `targetId` string, `viewerDepth` number, `viewerBalance` number, and `_openCountHint` number (the last parameter is declared but never read). It begins by calling `bountySlotLimit(viewerDepth)` to compute `slotLimit`, then writes a skeleton HTML structure with a loading placeholder into `container.innerHTML`. It queries `#bounty-section-body` from the updated container and holds a reference in `body`.

If `slotLimit` is 0, it sets `body.innerHTML` to a message prompting the viewer to reach 25% profile depth and returns early.

Otherwise, it awaits `getMyBounties()` inside a try/catch (errors are swallowed silently). From the returned `outgoing` array, it counts open bounties into `viewerOpenCount` and searches for an existing open bounty against `targetId`, storing the first match in `existingBounty`.

If `existingBounty` is non-null, it computes `daysLeft` from `existingBounty.expires_at` and `Date.now()`, renders a read-only display of the bounty amount and days remaining into `body.innerHTML`, and attaches a click listener to the `#bounty-cancel-btn` button. On the first click, the button text changes to show the calculated refund (85% of `amount + duration_days`), the background shifts, and a new `onclick` handler is installed. That inner handler disables the button, awaits `cancelBounty(existingBounty.id)`, then either replaces `body.innerHTML` with a success message (including `result.refund`) or re-enables the button with an error message. After setting up this listener the function returns early.

If no existing bounty is found, it computes `slotsLeft = slotLimit - viewerOpenCount` and renders a post-new-bounty form with two number inputs (amount and duration) into `body.innerHTML`. It defines an inner `_updatePreview` function that reads both inputs from the DOM, computes total cost, and writes a cost-and-balance preview string into `#bounty-cost-preview`, coloring it red if the balance would go negative. `_updatePreview` is attached to the `input` event of both fields and called once immediately. A click listener on `#bounty-post-btn` reads both inputs, validates amount (must be positive), duration (1–365), and affordability (amount + duration <= viewerBalance), displaying errors in `#bounty-post-error` and returning early on any failure. On passing all checks, the button is disabled and awaits `postBounty(targetId, amt, dur)`. On success, `body.innerHTML` is replaced with a success message and `loadBountyDotSet()` is called fire-and-forget via `void`. On failure, the button is re-enabled and the error message is displayed.

### renderMyBountiesSection

`renderMyBountiesSection` is async and accepts a single `container` HTMLElement. It first writes a loading message into `container.innerHTML`, then awaits `getMyBounties()` and destructures `incoming` and `outgoing` from the result.

A local `_row` function takes a `BountyRow` and a `'incoming' | 'outgoing'` type label. `_row` computes `daysLeft` from `b.expires_at` and `Date.now()`, picks a status color (gold for `'open'`, muted otherwise), builds a `who` string showing either the poster username (for incoming) or target username (for outgoing), and returns an HTML string for one row. For outgoing rows with status `'open'`, the row HTML includes a CANCEL button with `data-bounty-id`, `data-amount`, and `data-duration` attributes.

After constructing `incomingHTML` and `outgoingHTML` by mapping `_row` over each array (or substituting a fallback empty-state message if the array is empty), it sets `container.innerHTML` to the full two-section layout.

It then queries all `.bounty-cancel-row-btn` elements inside `container` and attaches a click listener to each. On first click, if `btn.dataset.confirmed` is not set, the button text is updated to show the 85% refund amount (calculated from `data-amount + data-duration`), the background is changed, `btn.dataset.confirmed` is set to `'1'`, and the handler returns without proceeding. On the second click (confirmed state), the button is disabled and `cancelBounty(bountyId)` is awaited. On success, `renderMyBountiesSection(container)` is awaited to re-render the section, and `loadBountyDotSet()` is called fire-and-forget via `void`. On failure, the button is re-enabled, the error text is set, and `btn.dataset.confirmed` is deleted so the two-click confirmation resets.
