# Stage 2 Outputs — src/async.render.ts

## Agent 01

### _registerWiring

`_registerWiring` accepts two callback functions typed as `WireFn` (each taking an `HTMLElement` and returning `void`) and assigns them to the module-level variables `_wireTakes` and `_wirePredictions`, replacing whatever values those variables held before. Both variables are declared at module scope and initialized as `undefined`. The function is synchronous, takes no reads from the DOM or any external state, and returns `void`. It has no control flow branches, loops, or error paths. After this call, `_wireTakes` and `_wirePredictions` hold the caller-supplied callbacks, which will be invoked conditionally in `loadHotTakes` and `renderPredictions`.

### loadHotTakes

`loadHotTakes` is synchronous and accepts an optional `category` parameter of type `CategoryFilter`, defaulting to `'all'`. It first writes `category` to `state.currentFilter`. It then queries the DOM for the element with id `hot-takes-feed` and returns immediately if that element is not found.

If the element has not yet been recorded in `state.wiredContainers`, `loadHotTakes` calls `_wireTakes?.(container)` — a conditional call that fires only if `_wireTakes` is not `undefined` — and then adds the container to `state.wiredContainers` so the wiring call does not repeat on subsequent invocations.

Next it filters `state.hotTakes`: if `category` is `'all'`, the full array is used; otherwise only entries whose `section` matches `category` are kept. If the filtered array is empty, it writes a "no takes" placeholder string directly to `container.innerHTML` and returns early.

When takes exist, it maps each entry through `_renderTake`, collecting the returned HTML strings into `rendered`. It then calls `getCurrentUser()` and `getCurrentProfile()` to read the current auth state. If the profile's `is_moderator` field is falsy and `rendered` has at least two entries, it calls `_renderModeratorCard(!user)` — passing `true` when `user` is null/undefined — and splices the resulting string into `rendered` at index 2, inserting it after the second take. Finally, it joins `rendered` into a single string and assigns it to `container.innerHTML`, replacing the container's previous content entirely.

### _renderTake

`_renderTake` is a synchronous function that accepts a single `HotTake` object `t` and returns a string of HTML. It calls `getCurrentUser()` to read the current authenticated user, then derives `userClickable` as `true` when `t.user_id` is truthy and does not equal the current user's `id`. It passes `t.user`, the first character of `t.user`, `t.text`, `t.id`, `t.user_id`, and `t.username` through `esc` (the module-level alias for `escapeHTML`) to produce safe output strings. It calls `vgBadge(t.verified_gladiator)` and `bountyDot(t.user_id)` to obtain badge and bounty HTML fragments; neither return value is escaped further.

The function computes `catLabel` from `t.section` but does not use it in the returned string (it is assigned but not interpolated). It checks `t.text.length > 150` twice: once to set the CSS text-clamp styles on the main content `div`, and again in an inline conditional that appends a "tap to read more" `div` only when the text exceeds 150 characters. The reaction button's background and color depend on `t.userReacted`; `t.reactions` and `t.challenges` are cast with `Number()` before interpolation. The share button embeds `esc(t.text)` in a `data-text` attribute. The function has no branches beyond the two text-length checks and the `userClickable` ternary, no loops, no error paths, and no async operations. It returns the completed HTML string.

### _renderModeratorCard

`_renderModeratorCard` is a synchronous function that accepts a boolean `isGuest`, defaulting to `false`. It reads no external state. Based on `isGuest`, it assigns one of two string literals to `btnLabel` (`'SIGN UP TO MODERATE'` when `true`, `'BECOME A MODERATOR'` when `false`) and one of two `data-action` values to `btnAction` (`'mod-signup'` or `'become-mod'`). Neither value is passed through `esc` because both are string literals, not user content. The function returns a fixed HTML string containing the chosen label and action attribute. It has no loops, no error paths, and no async operations.

### renderPredictions

`renderPredictions` is a synchronous function that accepts an `HTMLElement` `container`. It returns immediately without writing anything if `container` is falsy, or if the feature flag `FEATURES.predictionsUI` is falsy.

If the container has not been recorded in `state.wiredContainers`, it calls `_wirePredictions?.(container)` conditionally and adds the container to `state.wiredContainers`. It then reads `state.predictions` and `state.standaloneQuestions` to determine whether either array is non-empty. If both are empty, it writes a "no active predictions" placeholder with a `data-action="create-prediction"` button to `container.innerHTML` and returns early.

When at least one array has entries, it writes a larger HTML block to `container.innerHTML`. That block includes a header row with a "create-prediction" button, followed by the result of mapping `state.predictions` through `_renderPredictionCard` and mapping `state.standaloneQuestions` through `_renderStandaloneCard`, both joined into strings. The two map calls are synchronous and their results are interpolated directly into the template literal.

### _renderPredictionCard

`_renderPredictionCard` is a synchronous function that accepts a `Prediction` object `p` and returns an HTML string. It escapes `p.topic`, `p.p1`, `p.p2`, and `p.debate_id` with `esc`. It computes `isLive` as `true` when `p.status` is `'live'` or `'in_progress'`. In the returned HTML, `isLive` controls whether a pulsing "LIVE" badge or an "UPCOMING" label appears in the card header. The total prediction count, both ELO values, `p.pct_a`, and `p.pct_b` are all cast with `Number()` before interpolation. Each of the two pick buttons receives a `data-pick` of `'a'` or `'b'`, and their background and border colors depend on `p.user_pick` matching `'a'` or `'b'` respectively. A progress bar is rendered using `p.pct_a` as the width percentage. The function has no loops, no async operations, and no error paths.

### _renderStandaloneCard

`_renderStandaloneCard` is a synchronous function that accepts a `StandaloneQuestion` object `q` and returns an HTML string. It escapes `q.topic`, `q.side_a_label`, `q.side_b_label`, and `q.id` with `esc`. It computes `total` from `q.total_picks` if that value is truthy after `Number()` conversion; otherwise it falls back to the sum of `Number(q.picks_a)` and `Number(q.picks_b)`; if both are zero, `total` is `0`. `pctA` is computed as `Math.round((Number(q.picks_a) / total) * 100)` when `total > 0`, and `50` when `total` is zero. `pctB` is `100 - pctA` when `total > 0`, and `50` otherwise. The creator display string is derived from `q.creator_display_name`, falling back to `q.creator_username`, then to `'Anonymous'`, and is passed through `esc`. `userPick` is read from `q._userPick`, defaulting to `null` when absent.

The two side buttons use `data-action="standalone-pick"` and receive `data-pick` of `'a'` or `'b'`. Their background and border depend on whether `userPick` equals `'a'` or `'b'` respectively. The progress bar width uses `pctA`. The function has no loops, no async operations, and no error paths.

### _showWagerPicker

`_showWagerPicker` is a synchronous function that accepts a `debateId` string and a `side` string. It first calls `_hideWagerPicker()`, which clears `_activeWagerDebateId` and removes any existing picker from the DOM. It then calls `getCurrentProfile()` to read the current user's profile and extracts `token_balance`, defaulting to `0` if the profile is absent or the field is falsy. It searches `state.predictions` for an entry whose `debate_id` matches `debateId`; if none is found, it returns immediately without writing anything.

When a matching prediction is found, it determines `sideLabel` by selecting `pred.p1` or `pred.p2` based on whether `side === 'a'`, and escapes the result. `safeSide` is constrained to literal `'a'` or `'b'`: it is `'a'` when `side === 'a'`, and `'b'` in all other cases. `quickAmounts` is built by filtering `[10, 25, 50, 100, 250]` to keep only amounts at or below `Math.min(500, balance)`.

It builds a `pickerHtml` string containing a number input bounded at `Math.min(500, balance)`, quick-amount buttons for each entry in `quickAmounts`, a disabled "CONFIRM WAGER" button with `data-id` and `data-pick` attributes, a cancel button, and conditionally a low-balance warning when `balance < 1`.

To insert the picker into the DOM, it queries for the first element matching `[data-action="predict"][data-id="${safeDebateId}"]` and then traverses up to the nearest ancestor `div` whose inline style contains `background:#132240`. If that card element is not found, the function returns without inserting anything. Otherwise, it sets `_activeWagerDebateId = debateId`, creates a new `div` with id `wager-picker-wrapper`, sets its `innerHTML` to `pickerHtml`, and appends it to the card element. Finally it queries for `#wager-amount-input` within the card and calls `.focus()` on it if found.

### _hideWagerPicker

`_hideWagerPicker` is a synchronous function that accepts no parameters. It unconditionally sets the module-level variable `_activeWagerDebateId` to `null`. It then calls `document.getElementById('wager-picker-wrapper')` to query the DOM; if an element is returned, it calls `.remove()` on it, detaching it from the document. If no such element exists, no DOM mutation occurs. The function returns `void` and has no error paths, no loops, and no async operations.

## Agent 02

### _registerWiring

`_registerWiring` accepts two callback functions typed as `WireFn` (a function taking an `HTMLElement` and returning `void`): `takes` and `predictions`. It writes both into module-level variables `_wireTakes` and `_wirePredictions`, which are declared at module scope and initialized to `undefined`. The function is synchronous, reads nothing from the DOM, network, or other state, returns nothing, and has no control flow beyond the two assignments. After this function runs, subsequent calls in other functions that invoke `_wireTakes?.(container)` or `_wirePredictions?.(container)` will call the registered callbacks rather than no-oping.

### loadHotTakes

`loadHotTakes` is synchronous and accepts an optional `category` parameter of type `CategoryFilter`, defaulting to `'all'`. It first writes `state.currentFilter` to the given `category`, then queries the DOM for the element with id `hot-takes-feed`. If that element is not found, it returns immediately with no further action.

If the container has not been seen before — checked by testing `state.wiredContainers.has(container)` — it calls `_wireTakes?.(container)` (invoking the callback registered by `_registerWiring` if one exists, otherwise no-oping) and then adds the container to `state.wiredContainers` to prevent repeated wiring on subsequent calls.

It then derives the set of takes to display: if `category` is `'all'`, it uses `state.hotTakes` directly; otherwise it filters `state.hotTakes` to those whose `section` property matches `category`. If the resulting array is empty, it sets `container.innerHTML` to a static empty-state message and returns.

When takes are present, it maps each `HotTake` through `_renderTake` to produce an array of HTML strings. It then calls `getCurrentUser()` and `getCurrentProfile()` to read the current auth state. If the profile does not have `is_moderator` set to a truthy value and the rendered array has at least two entries, it calls `_renderModeratorCard(!user)` — passing `true` when there is no current user — and inserts the resulting string at index 2 of the rendered array via `splice`. Finally, it sets `container.innerHTML` to all rendered strings joined without separator.

### _renderTake

`_renderTake` is a synchronous function that accepts a single `HotTake` object `t` and returns a raw HTML string. It calls `getCurrentUser()` once to read the current user's id, and uses it to compute `userClickable`: a boolean that is true when `t.user_id` is truthy and differs from the current user's id. All user-supplied string fields (`t.user`, `t.user_id`, `t.text`, `t.id`, `t.username`) are passed through `esc` (which is `escapeHTML`) before being interpolated into the template.

The avatar initial is taken as the first character of `t.user`, falling back to `'?'` if that is empty or nullish, then escaped. The `profileAttr` string is built conditionally: when `userClickable` is true, it includes `data-action="profile"` attributes and a pointer cursor; when false, it is an empty string. This attribute is applied to both the avatar circle element and the username span.

The category label is taken from `t.section`, falling back to `'general'`, and uppercased. Whether to truncate display is computed once as `truncate = t.text.length > 150`, though the template tests `t.text.length > 150` again inline rather than using that variable. When the text exceeds 150 characters, the text container gets CSS that clamps it to three lines with `-webkit-line-clamp`, and an additional "tap to read more" element is appended after the text div. Both the text container and the "tap to read more" element carry `data-action="expand"` and `data-id` attributes.

Three action buttons are rendered: a react button with `data-action="react"` whose background and border color vary based on `t.userReacted`, displaying a fire emoji and `Number(t.reactions)` as the count; a challenge button with `data-action="challenge"` displaying `Number(t.challenges)`; and a share button with `data-action="share"` that additionally writes `t.text` (escaped) into a `data-text` attribute. All numeric values are cast with `Number()` before interpolation. The function calls `vgBadge(t.verified_gladiator)` and `bountyDot(t.user_id)`, interpolating their return values into the username span; it does not branch on their return values internally. The function has no error path and no try/catch.

### _renderModeratorCard

`_renderModeratorCard` is synchronous and accepts a single boolean parameter `isGuest`, defaulting to `false`. It reads no external state, DOM, or network. Based on `isGuest`, it selects one of two strings: `btnLabel` is `'SIGN UP TO MODERATE'` when `isGuest` is true and `'BECOME A MODERATOR'` otherwise; `btnAction` is `'mod-signup'` when `isGuest` is true and `'become-mod'` otherwise. It returns a single HTML string representing a card with cyan border styling, a heading, a body line, and a button whose `data-action` attribute is set to the selected `btnAction` value and whose visible text uses `btnLabel`. No user-supplied data enters the template, so no escaping is performed. The function has no branches beyond the two ternary expressions and no error path.

### renderPredictions

`renderPredictions` is synchronous and accepts an `HTMLElement` as its sole parameter, referred to internally as `container`. It has two early-return guards: if `container` is falsy, it returns immediately; if `FEATURES.predictionsUI` is falsy (read from the imported `config.ts` module), it returns immediately.

If the container has not been recorded in `state.wiredContainers`, it calls `_wirePredictions?.(container)` — invoking the callback registered by `_registerWiring` if present — and adds the container to `state.wiredContainers`.

It then reads `state.predictions` and `state.standaloneQuestions` to determine whether either array is non-empty. If both are empty, it sets `container.innerHTML` to a static "No active predictions yet" message with a `data-action="create-prediction"` button and returns.

When at least one of the arrays is non-empty, it sets `container.innerHTML` to a header section followed by the output of mapping `state.predictions` through `_renderPredictionCard` and `state.standaloneQuestions` through `_renderStandaloneCard`, all joined and concatenated. The function writes only to `container.innerHTML` and `state.wiredContainers`; it returns nothing.

### _renderPredictionCard

`_renderPredictionCard` is synchronous and accepts a `Prediction` object `p`. It returns a raw HTML string. All string fields interpolated from `p` — `p.topic`, `p.p1`, `p.p2`, `p.debate_id` — are passed through `esc`. All numeric values — `p.total`, `p.p1_elo`, `p.p2_elo`, `p.pct_a`, `p.pct_b` — are cast with `Number()` before interpolation. The function does not call `getCurrentUser()` or `getCurrentProfile()`.

`isLive` is computed as `p.status === 'live' || p.status === 'in_progress'`. When true, the status indicator renders as a pulsing magenta dot with the text "LIVE"; when false, it renders as "UPCOMING" in accent color.

Both side-A and side-B buttons carry `data-action="predict"`, `data-id` set to the escaped debate id, and `data-pick` set to `'a'` or `'b'`. Their background and border colors vary based on whether `p.user_pick` equals `'a'` or `'b'` respectively, producing a highlighted appearance for the previously selected pick. A progress bar at the bottom uses `Number(p.pct_a)` as the width percentage and displays both `pct_a` and `pct_b` as inline percentage labels. The function reads no state beyond the `p` parameter, has no error path, and performs no DOM manipulation.

### _renderStandaloneCard

`_renderStandaloneCard` is synchronous and accepts a `StandaloneQuestion` object `q`. It returns a raw HTML string. Escaped fields are `q.topic`, `q.side_a_label`, `q.side_b_label`, `q.id`, and the creator display string. The creator string is computed by selecting the first truthy value from `q.creator_display_name`, then `q.creator_username`, then the literal string `'Anonymous'`.

The total pick count is derived as `Number(q.total_picks)`, and if that is falsy (zero or NaN), it falls back to `Number(q.picks_a) + Number(q.picks_b)`, and if that is still falsy, to `0`. The percentage for side A is computed as `Math.round((Number(q.picks_a) / total) * 100)` when `total > 0`, otherwise `50`. Side B's percentage is `100 - pctA` when `total > 0`, otherwise `50`. The current user's pick is read from `q._userPick ?? null`.

Both side-A and side-B buttons carry `data-action="standalone-pick"`, `data-id` set to the escaped question id, and `data-pick` of `'a'` or `'b'`. Their background and border colors vary based on whether `userPick` matches `'a'` or `'b'`. A progress bar identical in structure to `_renderPredictionCard`'s bar uses `pctA` as its width percentage. Unlike `_renderPredictionCard`, the side buttons do not display ELO values. The function reads no module-level state, calls no external functions beyond `esc`, and has no error path.

### _showWagerPicker

`_showWagerPicker` is synchronous and accepts two strings: `debateId` and `side`. It begins by calling `_hideWagerPicker()`, which removes any existing wager picker from the DOM and resets `_activeWagerDebateId` to `null`.

It then reads the current token balance from `getCurrentProfile()?.token_balance`, defaulting to `0`. It searches `state.predictions` for an entry whose `debate_id` matches the given `debateId`. If none is found, the function returns immediately with no further action.

With the matching prediction `pred` available, it escapes `pred.p1` or `pred.p2` (depending on whether `side === 'a'`) to produce `sideLabel`, escapes `debateId` into `safeDebateId`, and sanitizes `side` into `safeSide` by only accepting `'a'` — otherwise defaulting to `'b'`. `quickAmounts` is computed by filtering `[10, 25, 50, 100, 250]` to those not exceeding `Math.min(500, balance)`.

The function then builds a `pickerHtml` string containing a labeled section header showing the chosen side's name in uppercase, a balance display, a number input with min `1` and max `Math.min(500, balance)`, quick-amount buttons (one per entry in `quickAmounts`), a disabled "CONFIRM WAGER" button carrying `data-action="wager-confirm"` with `data-id` and `data-pick` attributes, and a cancel button with `data-action="wager-cancel"`. If `balance < 1`, an additional warning message is appended inside the picker.

To locate the insertion point, it queries the DOM for any element matching `[data-action="predict"][data-id="${safeDebateId}"]` and then climbs to the nearest ancestor `div` with inline style containing `background:#132240`. If no such card element is found, the function returns without inserting anything.

When the card is found, it writes `_activeWagerDebateId = debateId`, creates a new `div` element with id `wager-picker-wrapper`, sets its `innerHTML` to `pickerHtml`, and appends it to the card. It then queries the card for `#wager-amount-input` and calls `focus()` on it if found. The function returns nothing.

### _hideWagerPicker

`_hideWagerPicker` is synchronous and accepts no parameters. It writes `_activeWagerDebateId = null` unconditionally. It then calls `document.getElementById('wager-picker-wrapper')` to find the currently active picker element in the DOM. If that element exists, it calls `existing.remove()` to detach it from the DOM. If no element is found, the removal is skipped. The function returns nothing and has no error path.

## Agent 03

### _registerWiring

`_registerWiring` accepts two callback functions, `takes` and `predictions`, both typed as `WireFn` (a function from `HTMLElement` to `void`). It writes both arguments directly into the module-level variables `_wireTakes` and `_wirePredictions`, overwriting whatever values those variables previously held (they start as `undefined`). The function is synchronous, performs no reads, has no branches, no loops, and returns `void`. Its sole effect is to make the two callbacks available to subsequent calls in the same module.

### loadHotTakes

`loadHotTakes` is synchronous and accepts an optional `category` parameter of type `CategoryFilter`, defaulting to `'all'`. It first writes `category` into `state.currentFilter`. It then reads the DOM by calling `document.getElementById('hot-takes-feed')`; if that element is not found, the function returns immediately. If the element is found but is not yet in `state.wiredContainers`, it calls `_wireTakes?.(container)` (the call is guarded by the optional-chaining operator, so it is a no-op if `_wireTakes` is `undefined`) and then adds the container to `state.wiredContainers`.

Next it computes the `takes` array: if `category` is `'all'`, it uses `state.hotTakes` directly; otherwise it filters `state.hotTakes` to entries whose `section` property matches `category`. If `takes` is empty, it writes a static "no takes yet" HTML string into `container.innerHTML` and returns. If `takes` is non-empty, it maps each element through `_renderTake`, producing an array of HTML strings called `rendered`. It then calls `getCurrentUser()` and `getCurrentProfile()`. If the profile has no `is_moderator` flag set to a truthy value and `rendered` has at least two entries, it splices the result of `_renderModeratorCard(!user)` into position 2 of `rendered`, shifting later entries. Finally, it joins `rendered` with `''` and writes the result to `container.innerHTML`. The function returns `void`.

### _renderTake

`_renderTake` is synchronous and accepts a single `HotTake` object `t`. It calls `getCurrentUser()` to read the currently authenticated user, then computes `userClickable` as `true` if `t.user_id` is truthy and differs from the current user's id. It then passes `t.user`, the first character of `t.user` (falling back to `'?'`), `t.text`, `t.id`, `t.user_id`, and `t.username` each through `esc` (which is `escapeHTML`). It also escapes `t.time`. `t.section` is read to produce `catLabel` (uppercased, defaulting to `'general'`), though `catLabel` is not used in the returned string — it is computed and discarded. `truncate` is set to `true` if `t.text.length > 150`, and this condition is evaluated again inline within the template literal.

It calls `vgBadge(t.verified_gladiator)` and `bountyDot(t.user_id)` and interpolates their return values directly into the HTML without further escaping. The function constructs and returns a template literal string containing the full card HTML. The `profileAttr` variable is conditionally populated with `data-action`, `data-user-id`, `data-username`, and `style` attributes when `userClickable` is true, and is empty otherwise; this string is placed on the avatar `div` and on the username `span`. When `t.text.length > 150`, the take body div is styled with `-webkit-line-clamp:3` to truncate, and an additional "tap to read more" div is appended immediately after; neither element is rendered when the text is 150 characters or fewer. The react button's background and border colors vary based on `t.userReacted`. The reaction count and challenge count are both passed through `Number()` before interpolation. The function has no branches beyond the ternary expressions within the template and no error paths; it always returns a string.

### _renderModeratorCard

`_renderModeratorCard` is synchronous and accepts a single boolean parameter `isGuest`, defaulting to `false`. Based on `isGuest`, it sets `btnLabel` to either `'SIGN UP TO MODERATE'` or `'BECOME A MODERATOR'`, and sets `btnAction` to either `'mod-signup'` or `'become-mod'`. It then constructs and returns a template literal string containing a styled card with a recruitment heading, descriptive text, and a single button whose `data-action` attribute is set to `btnAction` and whose visible label includes `btnLabel`. No external state is read beyond the parameter. No writes occur. The function has no loops, no error paths, and returns a string unconditionally.

### renderPredictions

`renderPredictions` is synchronous and accepts an `HTMLElement` called `container`. It returns immediately without writing anything if `container` is falsy, or if `FEATURES.predictionsUI` is falsy — these are the two early-return guards, checked in that order. If the container is not yet in `state.wiredContainers`, it calls `_wirePredictions?.(container)` (no-op if `_wirePredictions` is `undefined`) and adds the container to `state.wiredContainers`.

It reads `state.predictions` and `state.standaloneQuestions` to determine `hasDebatePreds` and `hasStandalone`. If both are empty or zero-length, it writes a "No active predictions yet" HTML string with a `data-action="create-prediction"` button to `container.innerHTML` and returns. Otherwise it writes a richer HTML string to `container.innerHTML`: a header row with a "PREDICTIONS" label and a create button, followed by `state.predictions` mapped through `_renderPredictionCard` and `state.standaloneQuestions` mapped through `_renderStandaloneCard`, all joined and concatenated. The function returns `void`.

### _renderPredictionCard

`_renderPredictionCard` is synchronous and accepts a single `Prediction` object `p`. It passes `p.topic`, `p.p1`, `p.p2`, and `p.debate_id` through `esc`. It computes `isLive` as `true` if `p.status` is `'live'` or `'in_progress'`. It then constructs and returns a template literal string for a prediction card. The card contains a status indicator (a pulsing "LIVE" badge when `isLive` is true, or "UPCOMING" text when false), a prediction count showing `Number(p.total)`, the escaped topic text, and two side-by-side vote buttons. Each button carries `data-action="predict"`, `data-id` set to the escaped debate ID, and `data-pick` set to `'a'` or `'b'`. The background and border of each button varies based on whether `p.user_pick` matches that button's side. ELO values are rendered as `Number(p.p1_elo)` and `Number(p.p2_elo)`. Below the buttons is a progress bar whose left segment width is `Number(p.pct_a)%`, with percentage labels showing `Number(p.pct_a)` and `Number(p.pct_b)`. The function has no loops, no error paths, and always returns a string.

### _renderStandaloneCard

`_renderStandaloneCard` is synchronous and accepts a single `StandaloneQuestion` object `q`. It passes `q.topic`, `q.side_a_label`, `q.side_b_label`, and `q.id` through `esc`. It computes `total` as `Number(q.total_picks)` if that is nonzero, otherwise as `Number(q.picks_a) + Number(q.picks_b)`, otherwise as `0`. It computes `pctA` as `Math.round((Number(q.picks_a) / total) * 100)` when `total > 0`, or `50` otherwise; `pctB` is `100 - pctA` when `total > 0`, or `50` otherwise. The creator display name is derived by escaping the first truthy value among `q.creator_display_name`, `q.creator_username`, and the string `'Anonymous'`. `userPick` is set to `q._userPick ?? null`.

The returned template literal string contains a "COMMUNITY" label, a count-and-creator subtitle, the topic, and two vote buttons. Each button carries `data-action="standalone-pick"`, the escaped `q.id` as `data-id`, and `data-pick` of `'a'` or `'b'`. Button backgrounds and borders are conditional on whether `userPick` matches the button's side. Below the buttons is a progress bar identical in structure to the one in `_renderPredictionCard`, using the locally computed `pctA` and `pctB`. No ELO values appear. The function has no error paths and always returns a string.

### _showWagerPicker

`_showWagerPicker` is synchronous and accepts a `debateId` string and a `side` string. It first calls `_hideWagerPicker()` to remove any existing picker from the DOM and clear `_activeWagerDebateId`. It then calls `getCurrentProfile()` and reads `token_balance` from the result, falling back to `0` if the profile is absent or the field is falsy. It reads `state.predictions` and calls `.find()` to locate the `Prediction` whose `debate_id` matches `debateId`; if none is found, the function returns immediately without making any further changes.

With a match found, it escapes `pred.p1` or `pred.p2` depending on `side` to produce `sideLabel`, escapes `debateId` to `safeDebateId`, and normalizes `side` to either `'a'` or `'b'` for `safeSide`. It computes `quickAmounts` by filtering `[10, 25, 50, 100, 250]` to values at or below `Math.min(500, balance)`. It then builds the picker HTML string, which contains a header with `sideLabel` and the balance, a number input capped at `Math.min(500, balance)`, quick-amount buttons for each entry in `quickAmounts`, a disabled "CONFIRM WAGER" button with `data-id` and `data-pick`, a cancel button, and conditionally (when `balance < 1`) a warning message. No input sanitization on `sideLabel` beyond `esc` is applied before the label is further uppercased and re-inserted via template literal — the escaped value is what goes in.

It then queries the DOM for the first element matching `[data-action="predict"][data-id="${safeDebateId}"]` and calls `.closest('div[style*="background:#132240"]')` on it to find the containing card element. If no card is found, the function returns without inserting anything. Otherwise, it sets `_activeWagerDebateId = debateId`, creates a new `div` element, sets its `id` to `'wager-picker-wrapper'`, sets its `innerHTML` to the picker HTML, and appends it to the card. Finally, it queries the card for `#wager-amount-input` and calls `.focus()` on it if found. The function returns `void`.

### _hideWagerPicker

`_hideWagerPicker` is synchronous and takes no parameters. It writes `null` to the module-level variable `_activeWagerDebateId`. It then queries the DOM with `document.getElementById('wager-picker-wrapper')`; if an element is found, it calls `.remove()` on it, removing it from the document. If no such element exists, the `getElementById` call returns `null` and no removal occurs. The function has no return value and no error paths.

## Agent 04

### _registerWiring

`_registerWiring` accepts two callback functions, `takes` and `predictions`, both typed as `WireFn` (a function that receives an `HTMLElement` and returns `void`). It writes both values directly into the module-level variables `_wireTakes` and `_wirePredictions`, overwriting whatever was previously stored there (including `undefined`). It reads no DOM, state, or external sources. It returns `void`. There is no control flow — no branches, no loops, no error handling. It is synchronous.

### loadHotTakes

`loadHotTakes` is synchronous and accepts an optional `CategoryFilter` parameter that defaults to `'all'`. It immediately writes `category` into `state.currentFilter`. It then reads the DOM via `document.getElementById('hot-takes-feed')` and returns early with no output if that element is absent.

If the container exists, it checks `state.wiredContainers` (a `Set`) for the container element. If the container is not yet in the set, it calls `_wireTakes?.(container)` (a fire-and-forget optional call to the wiring callback) and then adds the container to `state.wiredContainers`. Next, it reads `state.hotTakes`: if `category` is `'all'`, it uses the full array; otherwise it filters to items whose `section` property matches `category`. If the resulting `takes` array is empty, it sets `container.innerHTML` to an empty-state message and returns. There is no error path for this branch — it is a clean early return.

If `takes` is non-empty, it maps over the array calling `_renderTake(t)` for each item to produce an array of HTML strings. It then calls `getCurrentUser()` and `getCurrentProfile()` (both synchronous reads from the auth module — what exactly they read internally is not visible in this file). If `profile?.is_moderator` is falsy and the rendered array has at least two entries, it splices the result of `_renderModeratorCard(!user)` into position 2 (index 2) of the rendered array, shifting subsequent elements. Finally, it sets `container.innerHTML` to the joined string of all rendered cards. It returns `void`.

### _renderTake

`_renderTake` is synchronous and accepts a single `HotTake` object `t`. It calls `getCurrentUser()` to read the current user's `id` and computes `userClickable` as `true` when `t.user_id` is truthy and differs from the current user's id. All user-supplied string fields — `t.user`, `t.user`, the first character of `t.user`, `t.text`, `t.id`, `t.user_id`, and `t.username` — are passed through `esc` (which is `escapeHTML`) before interpolation into HTML. Numeric values `t.reactions` and `t.challenges` are each wrapped in `Number()` before interpolation. `t.time` is also escaped.

If `userClickable` is true, the avatar `div` and the display-name `span` receive `data-action="profile"`, `data-user-id`, and `data-username` attributes, along with a pointer cursor style; otherwise those attributes are absent. The text body `div` receives `data-action="expand"` and `data-id` attributes unconditionally. If `t.text.length > 150`, the text container receives CSS that clamps it to three lines via `-webkit-line-clamp`, and an additional "tap to read more" `div` is inserted immediately after, also carrying `data-action="expand"` and `data-id`. If the text is 150 characters or shorter, neither the clamp styles nor the secondary div are emitted.

`vgBadge(t.verified_gladiator)` and `bountyDot(t.user_id)` are called inline within the name span; their return values are inserted directly into the HTML. The function returns the complete card HTML string. It writes nothing to module-level state or the DOM.

### _renderModeratorCard

`_renderModeratorCard` is synchronous and accepts an optional boolean `isGuest` defaulting to `false`. It reads no module-level state and makes no external calls. Based solely on the `isGuest` parameter, it selects between two button labels: `'SIGN UP TO MODERATE'` when `isGuest` is `true`, and `'BECOME A MODERATOR'` otherwise. Correspondingly, it selects the `data-action` attribute value: `'mod-signup'` for guests, `'become-mod'` for non-guests. It returns a complete HTML string for the recruitment card with those values interpolated. It writes nothing to state or the DOM, and has no error paths or loops.

### renderPredictions

`renderPredictions` is synchronous and accepts an `HTMLElement` parameter named `container`. It has two early-return guards at the top: it returns immediately if `container` is falsy, and it returns immediately if `FEATURES.predictionsUI` is falsy, in that order. Both guards produce no output.

If both guards pass, it checks `state.wiredContainers` for the container. If absent, it calls `_wirePredictions?.(container)` and adds the container to `state.wiredContainers`. It then reads `state.predictions` and `state.standaloneQuestions` to check whether both are empty. If both arrays are empty, it sets `container.innerHTML` to an empty-state message that includes a `data-action="create-prediction"` button, then returns.

If at least one array is non-empty, it sets `container.innerHTML` to a header block followed by two mapped sections: `state.predictions.map((p) => _renderPredictionCard(p)).join('')` and `state.standaloneQuestions.map((q) => _renderStandaloneCard(q)).join('')`. Both are always emitted in the same template literal — if one array is empty its section contributes an empty string. The function returns `void`.

### _renderPredictionCard

`_renderPredictionCard` is synchronous and accepts a single `Prediction` object `p`. It escapes `p.topic`, `p.p1`, `p.p2`, and `p.debate_id` via `esc`. It computes `isLive` as `true` when `p.status` is either `'live'` or `'in_progress'`. Numeric fields `p.total`, `p.p1_elo`, `p.p2_elo`, `p.pct_a`, and `p.pct_b` are each wrapped in `Number()` before interpolation.

The card contains two side buttons (player A and player B), each carrying `data-action="predict"`, `data-id`, and `data-pick` attributes. The `background` and `border` styles on each button vary based on whether `p.user_pick` equals `'a'` or `'b'` respectively, using CSS variable alternatives for the selected and unselected states. The header row conditionally renders either a pulsing "LIVE" badge (when `isLive` is true) or an "UPCOMING" label. A percentage bar is rendered using `p.pct_a` as the width. The function returns the complete HTML string and writes nothing to state or the DOM. There are no error paths or loops.

### _renderStandaloneCard

`_renderStandaloneCard` is synchronous and accepts a single `StandaloneQuestion` object `q`. It escapes `q.topic`, `q.side_a_label`, `q.side_b_label`, and `q.id` via `esc`. The display name for the creator is computed by picking the first truthy value among `q.creator_display_name`, `q.creator_username`, and the string `'Anonymous'`, then escaping the result. `userPick` is read from `q._userPick`, defaulting to `null` if absent.

The total vote count `total` is computed as `Number(q.total_picks)` if truthy, otherwise as `Number(q.picks_a) + Number(q.picks_b)`, otherwise `0`. `pctA` is `Math.round((Number(q.picks_a) / total) * 100)` when `total > 0`, falling back to `50`. `pctB` is `100 - pctA` when `total > 0`, falling back to `50`. These percentages are used both in the bar width and in the displayed labels.

The two side buttons carry `data-action="standalone-pick"`, `data-id`, and `data-pick` attributes. Their background and border styles vary based on whether `userPick` equals `'a'` or `'b'`, using the same CSS variable pattern as `_renderPredictionCard`. No ELO values are displayed (unlike the debate prediction card). The function returns the complete HTML string and writes nothing to state or the DOM.

### _showWagerPicker

`_showWagerPicker` is synchronous and accepts two parameters: `debateId` (a string) and `side` (a string). It begins by calling `_hideWagerPicker()`, which clears any previously active picker from the DOM and sets `_activeWagerDebateId` to `null`. It then reads `getCurrentProfile()?.token_balance`, defaulting to `0` if absent. It searches `state.predictions` for an entry whose `debate_id` matches the given `debateId` and returns early (with no output and no state change beyond the `_hideWagerPicker()` side effect) if no match is found.

If a matching prediction exists, `sideLabel` is set to `esc(pred.p1)` when `side === 'a'`, and `esc(pred.p2)` otherwise. `safeSide` is set to the literal `'a'` if `side === 'a'`, and `'b'` otherwise — no other values are passed through. `quickAmounts` is the array `[10, 25, 50, 100, 250]` filtered to values at or below `Math.min(500, balance)`. The `sideLabel` value is also uppercased and re-escaped inside the template literal (`esc(sideLabel.toUpperCase())`).

The picker HTML is assembled as a string and includes: a number input (`id="wager-amount-input"`) with `min="1"` and `max` set to `Math.min(500, balance)`, quick-amount buttons each carrying `data-action="wager-quick"` and `data-amount`, a confirm button carrying `data-action="wager-confirm"`, `data-id`, and `data-pick`, initially rendered as `disabled` with reduced opacity, and a cancel button carrying `data-action="wager-cancel"`. If `balance < 1`, a warning message is appended to the picker. The picker string is wrapped in a container div with `id="wager-picker-wrapper"`.

A DOM query finds the prediction card by locating any element matching `[data-action="predict"][data-id="${safeDebateId}"]` and calling `.closest('div[style*="background:#132240"]')`. If no such card is found, the function returns without writing any state (though `_activeWagerDebateId` remains `null` at this point — the assignment `_activeWagerDebateId = debateId` occurs after the card lookup, so a missing card means the module-level variable is not updated). If the card is found, `_activeWagerDebateId` is set to `debateId`, a new `div` element is created, its `innerHTML` is set to `pickerHtml`, and the element is appended to `card`. Finally, a query for `#wager-amount-input` within `card` is made, and if the input is found, `.focus()` is called on it. The function returns `void`.

### _hideWagerPicker

`_hideWagerPicker` is synchronous and takes no parameters. It writes `null` to the module-level variable `_activeWagerDebateId`. It then queries the DOM for an element with `id="wager-picker-wrapper"` via `document.getElementById('wager-picker-wrapper')`. If that element exists, it calls `.remove()` on it, detaching it from the DOM. If the element does not exist, no DOM mutation occurs. The function returns `void`. There are no branches beyond the existence check, no loops, and no error handling.

## Agent 05

### _registerWiring

`_registerWiring` takes two callbacks, `takes` and `predictions`, both typed as `WireFn` (a function from `HTMLElement` to `void`). It writes them directly into the module-level variables `_wireTakes` and `_wirePredictions`, replacing whatever was previously stored. It performs no reads, no branching, no async work, and returns nothing. After this call, both module-level wiring variables hold the injected callbacks, which other functions in this module will invoke conditionally.

### loadHotTakes

`loadHotTakes` is synchronous and accepts an optional `CategoryFilter` parameter that defaults to `'all'`. It immediately writes `category` into `state.currentFilter`. It then reads the DOM for the element with id `hot-takes-feed`; if that element is not found, the function returns early without doing anything else.

If the container is found, the function checks `state.wiredContainers` (a `Set`) to see whether the container has already been wired. If it has not, it calls `_wireTakes?.(container)` — a fire-and-forget invocation of the wiring callback if it is defined — and then adds the container to `state.wiredContainers` to prevent re-wiring on future calls.

Next it builds a filtered array: if `category` is `'all'`, it uses `state.hotTakes` directly; otherwise it filters `state.hotTakes` to entries whose `section` matches the category. If the resulting array is empty, it writes an empty-state HTML string (a centered emoji and message) into `container.innerHTML` and returns early.

If there are takes, it maps each one through `_renderTake`, producing an array of HTML strings. It then reads the current user via `getCurrentUser()` and the current profile via `getCurrentProfile()`. If the profile is not a moderator (`!profile?.is_moderator`) and the rendered array has at least two entries, it calls `_renderModeratorCard(!user)` — passing `true` if the user is a guest, `false` if authenticated — and splices the returned string into position 2 of the rendered array. Finally it joins the array and writes the result to `container.innerHTML`.

### _renderTake

`_renderTake` is synchronous and takes a single `HotTake` object `t`. It calls `getCurrentUser()` once to determine whether the take's author (`t.user_id`) differs from the current user's id, storing the result in `userClickable`. It then passes `t.user`, the first character of `t.user`, `t.text`, `t.id`, `t.user_id`, and `t.username` through `esc` (which is `escapeHTML`) to produce XSS-safe strings. Two additional escaped values are derived: `safeUserId` and `safeUsername`, conditional on `userClickable`, are used to compose a `profileAttr` string that adds `data-action="profile"` attributes and a pointer cursor when the author is a different user. The category label is constructed from `t.section`, defaulting to `'general'`, and uppercased. A boolean `truncate` is set if `t.text` exceeds 150 characters, though this variable is only used implicitly: the inline template checks `t.text.length > 150` directly to conditionally apply CSS line-clamping and render a "tap to read more" link. The function calls `vgBadge(t.verified_gladiator)` and `bountyDot(t.user_id)` to obtain badge and dot HTML strings that are interpolated into the author name span. Reaction and challenge counts are passed through `Number()` before insertion. The function returns a single HTML string representing the complete card. It writes nothing to module state and has no error paths or branches beyond the profile-clickability and text-truncation checks.

### _renderModeratorCard

`_renderModeratorCard` is synchronous and takes a single boolean parameter `isGuest` (defaulting to `false`). Based on `isGuest`, it selects one of two button label strings (`'SIGN UP TO MODERATE'` or `'BECOME A MODERATOR'`) and one of two `data-action` values (`'mod-signup'` or `'become-mod'`). It reads no module state, calls no external functions, and performs no escaping (all string content is hardcoded, not user-supplied). It returns a single HTML string for a styled card with a cyan border and a single button. There are no loops, no async operations, and no error paths.

### renderPredictions

`renderPredictions` is synchronous and accepts an `HTMLElement` as `container`. It returns immediately without doing anything if `container` is falsy. It then checks the `FEATURES.predictionsUI` feature flag imported from `config.ts`; if that flag is falsy, the function returns early. If the container has not been seen before in `state.wiredContainers`, it calls `_wirePredictions?.(container)` and adds the container to `state.wiredContainers`. It then reads `state.predictions` and `state.standaloneQuestions` to determine whether either array has entries. If both are empty, it writes an empty-state HTML string (with a `data-action="create-prediction"` button) to `container.innerHTML` and returns. If at least one array has data, it writes a full HTML structure to `container.innerHTML`: a header row with a "CREATE" button, followed by each prediction rendered by calling `_renderPredictionCard`, followed by each standalone question rendered by calling `_renderStandaloneCard`. The two mapped arrays are joined and concatenated directly into the template literal. There is no error path beyond the two early returns.

### _renderPredictionCard

`_renderPredictionCard` is synchronous and takes a `Prediction` object `p`. It passes `p.topic`, `p.p1`, `p.p2`, and `p.debate_id` through `esc`. It reads `p.status` to compute `isLive`, which is `true` when status is `'live'` or `'in_progress'`. `isLive` controls a conditional expression inside the template that renders either a pulsing "LIVE" badge or an "UPCOMING" label. `p.user_pick` is read twice, once for each side button, to conditionally apply highlighted background and border styles to the button whose side matches the user's stored pick. The counts `p.total`, `p.p1_elo`, `p.p2_elo`, `p.pct_a`, and `p.pct_b` are all wrapped in `Number()` before insertion. The percentage bar's width is set from `Number(p.pct_a)`. The function calls no external functions beyond `esc`, writes nothing to state, and returns the HTML string. There are no loops, no async operations, and no error paths.

### _renderStandaloneCard

`_renderStandaloneCard` is synchronous and takes a `StandaloneQuestion` object `q`. It passes `q.topic`, `q.side_a_label`, `q.side_b_label`, and `q.id` through `esc`. It computes `total` by preferring `Number(q.total_picks)`, then falling back to `Number(q.picks_a) + Number(q.picks_b)`, then to `0` if both are falsy. It computes `pctA` as the rounded percentage of `q.picks_a` out of `total` when `total > 0`, defaulting to `50` when `total` is zero. `pctB` is `100 - pctA` when `total > 0`, also defaulting to `50`. The creator display name is resolved from `q.creator_display_name`, falling back to `q.creator_username`, then to the string `'Anonymous'`, and is passed through `esc`. `userPick` is read from `q._userPick`, defaulting to `null` if absent. `userPick` is compared against `'a'` and `'b'` to set highlighted styles on the respective side buttons, using the same pattern as `_renderPredictionCard`. The percentage bar width is set from `pctA`. The function calls no external functions beyond `esc`, writes nothing to state, and returns the HTML string. There are no loops, no async operations, and no error paths.

### _showWagerPicker

`_showWagerPicker` is synchronous and takes a `debateId` string and a `side` string. It begins by calling `_hideWagerPicker()` unconditionally, which removes any existing wager picker from the DOM and nulls `_activeWagerDebateId`. It then reads the current user's token balance from `getCurrentProfile()?.token_balance`, defaulting to `0`. It searches `state.predictions` for an entry whose `debate_id` matches `debateId`; if none is found, the function returns early without modifying the DOM. If a match is found, it escapes `pred.p1` or `pred.p2` based on whether `side` is `'a'` or `'b'` to form `sideLabel`. `debateId` is escaped to `safeDebateId`, and `safeSide` is normalized to the literal `'a'` or `'b'` to prevent injection. It computes `quickAmounts` by filtering the array `[10, 25, 50, 100, 250]` to only include amounts at or below `Math.min(500, balance)`. It then constructs a `pickerHtml` string containing a number input (with `min="1"` and `max` capped at `Math.min(500, balance)`), one button per entry in `quickAmounts`, a disabled "CONFIRM WAGER" button with `data-id` and `data-pick` attributes, a cancel button, and a conditional low-balance warning when `balance < 1`. To find where to insert the picker, it uses `document.querySelector` with a compound attribute selector targeting a `[data-action="predict"][data-id="${safeDebateId}"]` element, then walks up to its closest ancestor `div[style*="background:#132240"]`. If no such card is found, the function returns early. If a card is found, it writes `debateId` (the raw parameter, not the escaped form) into `_activeWagerDebateId`, creates a new `div` element with id `wager-picker-wrapper`, assigns `pickerHtml` to its `innerHTML`, and appends it to the card. Finally it queries the card for `#wager-amount-input` and calls `.focus()` on it if found.

### _hideWagerPicker

`_hideWagerPicker` is synchronous and takes no parameters. It unconditionally writes `null` to the module-level variable `_activeWagerDebateId`. It then calls `document.getElementById('wager-picker-wrapper')` and, if that element exists, calls `.remove()` on it to detach it from the DOM. There are no branches beyond the null check on the found element, no reads from module state beyond resetting it, no return value, and no async operations.
