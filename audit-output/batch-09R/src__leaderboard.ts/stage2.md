# Stage 2 Outputs — src/leaderboard.ts

## Agent 01

### fetchLeaderboard

`fetchLeaderboard` is async and accepts one optional boolean parameter `append` (defaults to `false`). It reads the module-level `isLoading` flag first and returns immediately without doing anything if it is `true`. It then calls `getSupabaseClient()` and `getIsPlaceholderMode()`: if either the client is falsy or placeholder mode is active, it returns immediately. Otherwise it sets `isLoading` to `true` and enters a try block.

Inside the try block it derives a sort column string from `currentTab` — `'elo_rating'` for `'elo'`, `'wins'` for `'wins'`, and `'current_streak'` otherwise. It then awaits `safeRpc<LeaderboardRpcRow[]>('get_leaderboard', { p_sort_by, p_limit: PAGE_SIZE, p_offset: currentOffset })`. If the result carries an error, has no data, or the data array is empty, it sets `liveData` to `null` when `append` is false and sets `hasMore` to `false`. In the success branch it maps each raw `LeaderboardRpcRow` to a `LeaderboardEntry`, computing the rank as `currentOffset + i + 1` and casting every numeric field with `Number()`, defaulting zeros or 1200 as appropriate. It sets `hasMore` to `true` if the returned row count equals `PAGE_SIZE`, then either concatenates rows onto `liveData` (when `append` is `true`) or replaces it. When `append` is `false` it also calls `getCurrentUser()` to obtain the current user's id, searches `liveData` with `findIndex` for a matching id, and writes the result to `myRank` (1-based index, or `null` if not found). The catch block logs to console, sets `liveData` to `null` when not appending, and sets `hasMore` to `false`. In all paths `isLoading` is set back to `false` before the function returns. The function returns `void`.

### getData

`getData` takes no parameters. It reads `liveData` and returns it unchanged if it is non-null, or returns the module-level constant `PLACEHOLDER_DATA` if `liveData` is `null`. It has no side effects.

### renderShimmer

`renderShimmer` takes no parameters and reads no module state. It builds a string by concatenating six iterations of a flex-row HTML skeleton, where the widths of two inner shimmer divs vary per iteration using the loop index (`55 + i * 5`% and `35 + i * 3`%). It returns the concatenated HTML string. It has no side effects.

### showEloExplainer

`showEloExplainer` takes no parameters and reads no module state. It first calls `document.getElementById('elo-explainer-modal')` and removes any existing element with that id, preventing duplicates. It then creates a new `div` element, assigns `id = 'elo-explainer-modal'`, sets `style.cssText` to a fixed full-screen overlay style, and sets `innerHTML` to a multi-section bottom-sheet panel containing an ELO explanation, a "how it moves" section with four bullet rows, and a "what the numbers mean" tier table. A click listener is attached to the outer overlay `div`: if the click target is the overlay itself (not the inner panel), `modal.remove()` is called. The modal is appended to `document.body`. The close button inside the panel carries `data-action="close-elo-explainer"` and is wired by the module-level event delegation listener, not by a local listener.

### renderList

`renderList` takes no parameters. It reads `liveData`, `isLoading`, `currentTab`, and `hasMore`. If `liveData` is `null` and `isLoading` is `false` it returns an error message div immediately without calling `getData`. Otherwise it calls `getData()` to obtain either `liveData` or `PLACEHOLDER_DATA`, then creates a shallow copy via spread and sorts it by the column corresponding to `currentTab` (descending by `elo`, `wins`, or `streak`). It then mutates the rank property of each element in-place to `i + 1`. It maps each entry to an HTML string for a row div. Each row sets a `data-username` attribute to the escaped username, uses `escHtml()` on the first character of `p.user` for the avatar, and calls `vgBadge(p.verified_gladiator)` and `bountyDot(p.id)` inline in the display name cell. Rank 1–3 rows receive a gold-tinted background; medal emoji replace numeric rank for those three. The stat value displayed and its label both depend on `currentTab`. Streak values of 5 or above are colored with `var(--mod-magenta)` rather than `var(--mod-accent)`. After the `.map().join('')` the function appends a "LOAD MORE" button block if `hasMore` is `true`. The function returns the assembled HTML string. It does not write to any state.

### render

`render` is synchronous and exported. It reads `currentTab`, `isLoading`, `myRank`, and calls `getCurrentProfile()` to get the current user's profile. From the profile it reads `elo_rating` and `wins` (both cast with `Number()`, defaulting to 1200 and 0), and `username` (defaulting to `'YOU'`), all escaped with `escHtml`. `myRank` is rendered as `#${myRank}` or `#--` if null. It then calls `document.getElementById('screen-leaderboard')` and returns immediately if that element is not found. It sets the container's `innerHTML` to the full leaderboard shell: a heading block, a personal stats card, three tab buttons (one for each of `'elo'`, `'wins'`, `'streak'`), and a `#lb-list` div whose inner content is either the result of `renderShimmer()` (when `isLoading` is `true`) or the result of `renderList()` (when `isLoading` is `false`). The ELO tab button includes an inline `?` span with `data-action="show-elo-explainer"`.

After setting `innerHTML`, it calls `document.getElementById('lb-list')` and, if found, attaches a click listener using event delegation. Within that listener, if the clicked element (or any ancestor up to the container) has a `data-username` attribute, `window.location.href` is set to `'/u/' + encodeURIComponent(username)`, navigating to that user's profile page.

### setTab

`setTab` is async and exported. It accepts a `LeaderboardTab` value and writes it to `currentTab`. It resets `currentOffset` to `0`, `hasMore` to `false`, and `liveData` to `null`. It then calls `render()` synchronously — this produces a loading state in the DOM because `liveData` is null but `isLoading` is still `false` at this point, so `renderList()` returns the error div. It then awaits `fetchLeaderboard()` with no arguments, which populates `liveData` with fresh data for the new tab. After the await resolves it calls `render()` a second time to display the fetched results.

### setTime

`setTime` is synchronous and exported. It accepts a `LeaderboardTimeFilter` value and writes it to `currentTime`. It resets `currentOffset` to `0` and `hasMore` to `false`. It calls `render()`. A comment in the function notes that week/month time filters are not currently operative because the underlying `get_leaderboard` RPC has no time parameter, so this function produces a re-render with the new `currentTime` value stored but no effect on the actual data fetched.

### loadMore

`loadMore` is async and exported. It reads `isLoading` and `hasMore`: if either guard fails — `isLoading` is `true` or `hasMore` is `false` — it returns immediately. Otherwise it increments `currentOffset` by `PAGE_SIZE` and awaits `fetchLeaderboard(true)`, which appends the next page of results to `liveData`. After the await resolves it calls `document.getElementById('lb-list')` and, if found, sets its `innerHTML` to the result of `renderList()`, which now reflects the expanded `liveData`. It does not call `render()`, so only the list portion of the DOM is updated rather than the full container.

### init

`init` is synchronous and exported. It reads `FEATURES.leaderboard` first; if that flag is falsy it returns immediately without doing anything. Otherwise it constructs a `MutationObserver` whose callback checks whether the `#screen-leaderboard` element now has the class `'active'` and has no children (`children.length === 0`). When both conditions are true the observer calls `observer.disconnect()` to stop watching, calls `render()` synchronously to insert the initial shimmer skeleton, and then fires `fetchLeaderboard()` as a non-awaited promise (via `void`) chained with `.then(() => render())` to replace the skeleton with live data once the fetch completes. After defining the observer it calls `document.getElementById('screen-leaderboard')` and, if that element exists, calls `observer.observe(screen, { attributes: true, attributeFilter: ['class'] })` to watch for class attribute changes on the screen element. At the module level, `ready.then(() => init())` defers this call until the auth subsystem signals readiness.

## Agent 02

### fetchLeaderboard

`fetchLeaderboard` is async and accepts a single boolean parameter `append` (default `false`). It reads the module-level `isLoading` flag at the top; if `isLoading` is `true` it returns immediately without doing anything. It calls `getSupabaseClient()` and `getIsPlaceholderMode()` — if no client is available or placeholder mode is active, it returns immediately without modifying state. Otherwise it sets `isLoading` to `true` and enters a try block.

Inside the try block it derives a sort column string from `currentTab` — `'elo_rating'`, `'wins'`, or `'current_streak'`. It then awaits `safeRpc<LeaderboardRpcRow[]>('get_leaderboard', ...)` passing `p_sort_by`, `p_limit` (always `PAGE_SIZE` = 50), and `p_offset` (the current value of `currentOffset`). If the call returns an error, a null data payload, or an empty array, it sets `liveData = null` when `append` is false and sets `hasMore = false`. In the success branch it maps the raw RPC rows into `LeaderboardEntry` objects, casting every numeric field with `Number()` and defaulting missing values. It sets `hasMore` to `true` only when the returned row count equals `PAGE_SIZE`. When `append` is false it assigns the new rows directly to `liveData`; when `append` is true it concatenates them onto the existing `liveData` array. After mapping, and only when `append` is false, it calls `getCurrentUser()` and searches the newly populated `liveData` for an entry matching the current user's `id`, writing the found index (plus 1) to `myRank`, or `null` if not found. The catch block logs the error, sets `liveData = null` if not appending, and sets `hasMore = false`. In all code paths, `isLoading` is set back to `false` before the function returns. The function returns `void` — it communicates all results through module-level state.

### getData

`getData` takes no parameters. It reads `liveData` and returns it if non-null; otherwise it returns the module-level constant `PLACEHOLDER_DATA`. This is a synchronous, non-throwing accessor with no side effects and no control flow beyond the null coalescing.

### renderShimmer

`renderShimmer` takes no parameters and reads no module-level state. It runs a `for` loop six times, building an HTML string that represents six skeleton loading rows. Each row contains shimmer `<div>` elements styled with widths that vary by loop index (`55 + i * 5` percent and `35 + i * 3` percent for the two text lines), giving them a progressively wider appearance. The function returns the concatenated HTML string without writing to the DOM or any state.

### showEloExplainer

`showEloExplainer` is synchronous and exported. It reads no module-level state. It first calls `document.getElementById('elo-explainer-modal')?.remove()` to remove any existing instance of the modal. It then creates a new `<div>` element, sets its `id` to `'elo-explainer-modal'`, applies fixed-position overlay styles to it, and assigns a large HTML string to its `innerHTML` — this string contains a bottom-sheet panel with Elo rating explanations, a close button with `data-action="close-elo-explainer"`, and styled tier breakdowns. It attaches a `click` listener to the modal element itself: if the click target is the backdrop (i.e., `e.target === modal`), it calls `modal.remove()`. Finally it calls `document.body.appendChild(modal)`. The close button within the modal is wired by the module-level event delegation listener at the bottom of the file, not by a listener attached here. The function returns `void`.

### renderList

`renderList` is synchronous and takes no parameters. It reads `liveData`, `isLoading`, `currentTab`, and `hasMore` from module-level state.

If `liveData` is `null` and `isLoading` is `false`, it returns an error message string immediately without calling `getData` or doing any further work.

Otherwise it calls `getData()` to obtain the data array. It creates a shallow copy with spread, then sorts it in-place: descending by `elo` when `currentTab === 'elo'`, by `wins` when `currentTab === 'wins'`, and by `streak` when `currentTab === 'streak'`. It then iterates the sorted array with `forEach` to rewrite the `rank` property of each item to its new sorted position (mutating the objects in the array). It then maps each entry to an HTML string representing a row div. Each row carries a `data-username` attribute holding the HTML-escaped username. The displayed stat value and label are selected from the entry based on `currentTab`. Rank 1–3 entries use medal emoji and gold-tinted row backgrounds; ranks 4+ show the numeric rank in a grey color. The tier string on each entry controls the avatar border color via a lookup table. The user's display name passes through `escHtml`. `vgBadge(p.verified_gladiator)` and `bountyDot(p.id)` are called inline within the name cell — their return values are interpolated directly into the HTML. If `hasMore` is true, a "LOAD MORE" button with `data-action="load-more"` is appended after all row strings. The function returns the joined HTML string; it writes nothing to the DOM directly.

### render

`render` is synchronous and exported. It reads the module-level state variables `currentTab`, `isLoading`, `myRank`, and implicitly `liveData` (via the calls it makes). It calls `document.getElementById('screen-leaderboard')`; if the element is not found it returns immediately.

It calls `getCurrentProfile()` to read the current user's profile, then derives `myElo`, `myWins`, and `myName` from that profile, defaulting to `1200`, `0`, and `'YOU'` respectively. `rankDisplay` is `'#--'` when `myRank` is null, or `'#N'` where N is `myRank`.

It sets `container.innerHTML` to a large HTML string. That string includes: a header section, a personal stats card showing `myName`, `myElo`, `myWins`, and `rankDisplay`; a tab bar with three buttons (`elo`, `wins`, `streak`) each styled according to whether it matches `currentTab`, with the Elo tab including an inline `?` span that carries `data-action="show-elo-explainer"`; and a `<div id="lb-list">` whose inner content is either the result of `renderShimmer()` (when `isLoading` is true) or the result of `renderList()` (when `isLoading` is false). The week/month time filter UI is intentionally absent, noted in a comment.

After writing `innerHTML`, it queries `document.getElementById('lb-list')` and, if found, attaches a delegated `click` listener. That listener walks up from the click target to find the nearest `[data-username]` ancestor; if one is found and it has a non-empty `username` dataset value, it sets `window.location.href` to `/u/` followed by the encoded username. This listener is re-attached on every call to `render`, so multiple calls accumulate multiple listeners on the `lb-list` element if the element persists across renders — though `innerHTML` replacement re-creates the element each time, which resets it.

### setTab

`setTab` is async and exported. It takes a `LeaderboardTab` value as its parameter. It writes `currentTab` to the passed value, then resets `currentOffset` to 0, `hasMore` to false, and `liveData` to null. It calls `render()` synchronously — this causes the UI to draw immediately with no data (which triggers the shimmer path in `render` only if `isLoading` is already true at this point; since it was just reset to false and data is null, `renderList` will show the error message). It then awaits `fetchLeaderboard()` with no arguments, which populates `liveData`. After the await resolves, it calls `render()` again to display the fetched data.

### setTime

`setTime` is synchronous and exported. It takes a `LeaderboardTimeFilter` value as its parameter. It writes `currentTime` to the passed value, then resets `currentOffset` to 0 and `hasMore` to false. It then calls `render()`. It does not call `fetchLeaderboard()` — the comment in the source notes that time-bucketed stats do not exist yet in the schema, so the RPC would not honor a time parameter regardless. `currentTime` is written but not read by any other function visible in this file — the `get_leaderboard` RPC call in `fetchLeaderboard` passes no time parameter.

### loadMore

`loadMore` is async and exported. It reads `isLoading` and `hasMore`; if either `isLoading` is true or `hasMore` is false it returns immediately. Otherwise it increments `currentOffset` by `PAGE_SIZE`. It then awaits `fetchLeaderboard(true)`, which appends the next page of results to `liveData`. After the await, it queries `document.getElementById('lb-list')`; if found, it sets `lbList.innerHTML` to the result of `renderList()`, updating the list in place without re-rendering the full container. This means the tab bar, header card, and personal stats section are not re-drawn on load-more.

### init

`init` is synchronous and exported. It reads `FEATURES.leaderboard`; if that flag is falsy it returns immediately without doing anything. Otherwise it creates a `MutationObserver`. The observer callback reads `document.getElementById('screen-leaderboard')` and checks two conditions on it: that the element exists, has the CSS class `active`, and has no children (`children.length === 0`). When those conditions are met, the observer calls `observer.disconnect()` to stop watching, then calls `render()` synchronously, and then calls `fetchLeaderboard()` as a fire-and-forget promise (`void fetchLeaderboard().then(() => render())`) — the fetch runs asynchronously and when it resolves, `render()` is called a second time to display the data.

After constructing the observer, `init` queries `document.getElementById('screen-leaderboard')` again. If the element exists, it calls `observer.observe(screen, { attributes: true, attributeFilter: ['class'] })`, watching only for class attribute mutations. If the element does not exist at call time, the observer is created but never attached. The `init` function itself is called from the module-level statement `ready.then(() => init())`, so it runs once after the auth module's `ready` promise resolves.

## Agent 03

### fetchLeaderboard

`fetchLeaderboard` is async and accepts one boolean parameter, `append`, which defaults to `false`. It reads module-level state `isLoading` and returns immediately if it is `true`. It then calls `getSupabaseClient()` and `getIsPlaceholderMode()`; if either the client is falsy or placeholder mode is active, it returns without doing anything further. Otherwise it sets `isLoading` to `true` and enters a try block.

Inside the try block it derives `sortCol` from module-level `currentTab`, mapping `'elo'` to `'elo_rating'`, `'wins'` to `'wins'`, and anything else (i.e., `'streak'`) to `'current_streak'`. It then awaits `safeRpc<LeaderboardRpcRow[]>('get_leaderboard', { p_sort_by, p_limit: PAGE_SIZE, p_offset: currentOffset })`. If the response contains an error, an absent `data`, or an empty array, it sets `liveData = null` when `append` is false and sets `hasMore = false`. On a successful non-empty response it maps each row to a `LeaderboardEntry`, computing `rank` as `currentOffset + i + 1` for each row. All numeric fields are cast with `Number()` and fall back to defaults (1200 for elo, 0 for others, 1 for level). `hasMore` is set to `true` if the row count equals `PAGE_SIZE`, otherwise `false`. If `append` is `false`, `liveData` is replaced with the new rows; if `true`, the new rows are appended to the existing `liveData` array (treating `null` as empty). When `append` is `false` and a current user is found via `getCurrentUser()`, it searches the new `liveData` for a row whose `id` matches the current user's id and writes the 1-based index to module-level `myRank`, or sets `myRank` to `null` if not found. The catch block logs the error, sets `liveData = null` if `append` is false, and sets `hasMore = false`. Whether or not an exception occurred, `isLoading` is set back to `false` before returning. The function returns `void`.

### getData

`getData` reads module-level `liveData`. If `liveData` is non-null it returns `liveData`; otherwise it returns the module-level constant `PLACEHOLDER_DATA`. The function is synchronous and takes no parameters.

### renderShimmer

`renderShimmer` is synchronous and takes no parameters. It builds and returns an HTML string consisting of six skeleton-row `<div>` elements. Each row contains four shimmer placeholder elements styled with the `colo-shimmer` CSS class: a rank placeholder, a circular avatar placeholder, two stacked text-line placeholders (whose widths vary based on the loop index `i`), and a stat placeholder. The function reads no module-level state and writes nothing outside itself. It returns the concatenated HTML string.

### showEloExplainer

`showEloExplainer` is synchronous and exported. It first calls `document.getElementById('elo-explainer-modal')` and removes any existing element with that id, preventing duplicates. It then creates a new `<div>` element, assigns it the id `elo-explainer-modal`, and sets its `style.cssText` to position it as a fixed full-screen overlay with a slide-up inner panel. It sets the inner HTML of the modal to a static explanatory layout covering how Elo moves and what score ranges mean; this content contains no user-supplied data and requires no escaping. It attaches a `click` event listener to the outer modal element: if the click target is the modal backdrop itself (not the inner panel), the modal is removed from the DOM. Finally it calls `document.body.appendChild(modal)` to insert the modal. The `data-action="close-elo-explainer"` button inside the modal is not wired here; it is wired by the module-level event delegation block at the bottom of the file. The function returns `void`.

### renderList

`renderList` is synchronous and takes no parameters. It first checks whether `liveData` is `null` and `isLoading` is `false` simultaneously; if both are true, it returns an error-state HTML string telling the user rankings could not be loaded. Otherwise it calls `getData()` to obtain the current data set (live or placeholder). It creates a shallow copy of that array with spread syntax and sorts it in-place: descending by `elo`, `wins`, or `streak`; the default comparator returns 0 for any other value. After sorting it mutates each entry's `rank` property in-place to be the 1-based index in the sorted order.

It then maps each entry to an HTML string for a row. For each entry it derives: the numeric stat to display based on `currentTab`; the label string (`'ELO'`, `'WINS'`, or `'🔥'`); a rank color from a hardcoded map for ranks 1–3 and a fallback gray otherwise; a tier border color from a map keyed by `p.tier` with a fallback. The display username is passed through `escHtml`. The first character of `p.user` is passed through `escHtml` for the avatar initial. The full `p.user` string and optional `vgBadge(p.verified_gladiator)` and `bountyDot(p.id)` calls are inlined. Each row `<div>` carries a `data-username` attribute set to the escaped username. The stat color in the right column is `var(--mod-magenta)` when `currentTab === 'streak'` and `p.streak >= 5`, otherwise `var(--mod-accent)`. All numeric values rendered in the subtext are cast with `Number()` before insertion. After all rows are joined, if module-level `hasMore` is `true`, a "LOAD MORE" button with `data-action="load-more"` is appended to the output. The function returns the complete HTML string.

### render

`render` is synchronous and exported. It reads the DOM element with id `screen-leaderboard`; if absent, it returns immediately. It then calls `getCurrentProfile()` and derives display values from the result: `myElo` as `Number(profile?.elo_rating) || 1200`, `myWins` as `Number(profile?.wins) || 0`, `myName` as the profile's uppercase username (defaulting to `'YOU'`) passed through `escHtml`, and `rankDisplay` from module-level `myRank` (formatted as `#N` or `#--` if null).

It overwrites `container.innerHTML` with the full leaderboard screen markup. This markup contains: a heading, a "your stats" card displaying `myName`, `myElo`, `myWins`, and `rankDisplay`, a row of three tab buttons (ELO, WINS, STREAK) each with `data-action="set-tab"` and a `data-tab` attribute, with active-state styling derived from `currentTab`. The ELO tab button also includes an inline `?` span with `data-action="show-elo-explainer"`. Below the tabs is a `<div id="lb-list">` whose inner content is either `renderShimmer()` (if `isLoading` is true) or `renderList()` (if not). Tab buttons and the elo explainer button are not directly wired here; they are handled by the module-level event delegation listener.

After setting `innerHTML`, it queries the freshly created `lb-list` element and attaches a `click` event listener to it. In that listener, the closest ancestor `[data-username]` element is found for the click target; if one exists with a non-empty `dataset.username`, the browser navigates to `/u/` followed by the URL-encoded username via `window.location.href`. The function returns `void`.

### setTab

`setTab` is async and exported. It receives a `LeaderboardTab` value and writes it to module-level `currentTab`. It then resets `currentOffset` to 0, `hasMore` to `false`, and `liveData` to `null`. It calls `render()` synchronously, which will render the shimmer-or-empty state immediately. It then awaits `fetchLeaderboard()`, which fetches the first page of data for the new tab. After the fetch resolves, it calls `render()` again to display the fetched results. The function returns `void`.

### setTime

`setTime` is synchronous and exported. It receives a `LeaderboardTimeFilter` value and writes it to module-level `currentTime`. It resets `currentOffset` to 0 and `hasMore` to `false`. A comment in the source notes that week/month filtering is not functional because the schema lacks time-bucketed stats. Regardless of the filter value, the function calls `render()` and returns `void`. Module-level `liveData` is not cleared and no fetch is initiated.

### loadMore

`loadMore` is async and exported. It reads module-level `isLoading` and `hasMore`; if either `isLoading` is true or `hasMore` is false, it returns immediately. Otherwise it increments `currentOffset` by `PAGE_SIZE` and awaits `fetchLeaderboard(true)`, which fetches the next page and appends results to `liveData`. After the fetch resolves, it queries `document.getElementById('lb-list')`; if that element exists, it sets its `innerHTML` to the result of `renderList()`, replacing the list content in place without re-rendering the entire screen. The function returns `void`.

### init

`init` is synchronous and exported. It reads `FEATURES.leaderboard`; if that flag is falsy, it returns immediately without doing anything. Otherwise it creates a `MutationObserver`. The observer's callback reads the DOM element with id `screen-leaderboard`; if that element exists, has the CSS class `active`, and has no children (`children.length === 0`), the observer calls `observer.disconnect()` to stop watching, calls `render()` synchronously, and then fires `fetchLeaderboard()` as a promise with `.then(() => render())` — this fetch-then-render sequence is not awaited and is fire-and-forget from the perspective of `init` itself, though `void` is applied to suppress the floating promise. After constructing the observer, `init` queries `document.getElementById('screen-leaderboard')` again; if the element exists, it calls `observer.observe(screen, { attributes: true, attributeFilter: ['class'] })` to watch for class attribute changes. If the element does not exist at call time, no observation is set up. The function is called at module load time via `ready.then(() => init())`, meaning it runs after the auth system signals readiness.

## Agent 04

### fetchLeaderboard

`fetchLeaderboard` is an async function that accepts one optional boolean parameter `append` (default `false`). At entry, it reads the module-level `isLoading` flag and returns immediately without doing anything if `isLoading` is `true`. It then calls `getSupabaseClient()` and `getIsPlaceholderMode()`; if no client is returned or placeholder mode is active, it returns immediately. Otherwise, it sets `isLoading = true` and enters a try block.

Inside the try block, it derives a sort column string from `currentTab`: `'elo_rating'` when `currentTab` is `'elo'`, `'wins'` when it is `'wins'`, and `'current_streak'` for any other value. It then awaits `safeRpc<LeaderboardRpcRow[]>('get_leaderboard', { p_sort_by, p_limit: PAGE_SIZE, p_offset: currentOffset })`, where `PAGE_SIZE` is the module constant `50` and `currentOffset` is module-level state. If `error` is truthy, `data` is falsy, or `data` is an empty array, it sets `liveData = null` when `append` is false and sets `hasMore = false`. On a successful non-empty response, it maps each row to a `LeaderboardEntry`, computing `rank` as `currentOffset + i + 1`, casting all numeric fields with `Number()` and defaulting missing values. It sets `hasMore = true` if the number of rows equals `PAGE_SIZE`, and either replaces `liveData` with the new array (when `append` is false) or appends to the existing `liveData` array (when `append` is true, using `liveData ?? []` as the base). After setting `liveData`, if `append` is false and the current user ID is available from `getCurrentUser()`, it searches `liveData` for the user's entry by `id` and sets `myRank` to the 1-based index, or to `null` if not found. The catch block logs the error, sets `liveData = null` when `append` is false, and sets `hasMore = false`. In all code paths, `isLoading` is set back to `false` before the function returns. The function returns `Promise<void>` and does not return a value.

### getData

`getData` is a synchronous function that takes no parameters. It reads the module-level `liveData` variable and returns it directly if it is non-null. If `liveData` is `null`, it returns the module-level constant `PLACEHOLDER_DATA`, which is a hard-coded array of ten `LeaderboardEntry` objects. No state is written. No external calls are made.

### renderShimmer

`renderShimmer` is a synchronous function that takes no parameters and returns a string. It builds an HTML string by iterating a `for` loop exactly six times. Each iteration appends one div row containing five child elements styled as loading skeleton placeholders using the CSS class `colo-shimmer`. The widths of two of the inner elements vary per iteration using `55 + i * 5` percent and `35 + i * 3` percent respectively, producing progressively wider shimmer bars across the six rows. No module-level state is read or written. No external calls are made. The accumulated string is returned at the end.

### showEloExplainer

`showEloExplainer` is a synchronous exported function that takes no parameters. It first calls `document.getElementById('elo-explainer-modal')?.remove()`, removing any existing modal with that ID from the DOM. It then creates a new `div` element, assigns it the ID `'elo-explainer-modal'`, sets its `style.cssText` to make it a fixed full-screen overlay with flex layout, and assigns a multi-section HTML string to its `innerHTML`. The HTML content includes a close button with `data-action="close-elo-explainer"`, explanatory text about the Elo rating system, and two styled info blocks. An event listener is attached to the modal element itself: clicking directly on the modal backdrop (i.e., when `e.target === modal`) calls `modal.remove()`. Finally, the modal is appended to `document.body`. Clicks on the close button (`data-action="close-elo-explainer"`) are caught by the module-level event delegation listener at the bottom of the file, which calls `document.getElementById('elo-explainer-modal')?.remove()`. No module-level state is read or written. No value is returned.

### renderList

`renderList` is a synchronous function that takes no parameters and returns an HTML string. At entry, if `liveData === null` and `isLoading` is false, it returns early with a single error-message div string. Otherwise, it calls `getData()` to get either `liveData` or `PLACEHOLDER_DATA`, then creates a shallow copy of that array via spread and sorts it in descending order by the field corresponding to `currentTab`: `elo` for `'elo'`, `wins` for `'wins'`, or `streak` for `'streak'`; the default comparator returns 0 for any other value. After sorting, it mutates each entry's `rank` field in place, assigning 1-based positions. It then calls `.map()` on the sorted array to produce one HTML string per entry. Each entry's rendered stat value and label are chosen based on `currentTab`. Medal colors for ranks 1–3 are gold/silver/bronze CSS variables; other ranks use a grey color. Tier border color is chosen from a record keyed on `p.tier`, falling back to `'var(--mod-border-primary)'`. The username is passed through `escHtml()` before being placed in a `data-username` attribute, and `p.user` and `p.user[0]` are also escaped via `escHtml()`. `vgBadge(p.verified_gladiator)` and `bountyDot(p.id)` are called inline within the template to produce badge/dot HTML. The streak stat value is colored `'var(--mod-magenta)'` when `currentTab === 'streak'` and `p.streak >= 5`, otherwise `'var(--mod-accent)'`. All numeric values displayed in innerHTML are cast with `Number()`. The joined entry HTML is concatenated with a "LOAD MORE" button div if `hasMore` is true; otherwise nothing is appended. The combined string is returned.

### render

`render` is a synchronous exported function that takes no parameters. It reads `document.getElementById('screen-leaderboard')` and returns immediately if the element is not found. It then calls `getCurrentProfile()` to read the current user's profile, extracting `elo_rating` and `wins` as numbers (defaulting to 1200 and 0 respectively) and `username` as an escaped uppercase string. `myRank` is read from module-level state to produce a rank display string (`#N` or `#--` if null).

It then sets the full `innerHTML` of the container to a large HTML string that includes: a header section; a "your stats" card showing `myName`, `myElo`, `myWins`, and `rankDisplay`; a row of three tab buttons (`elo`, `wins`, `streak`) using `currentTab` to apply active styles, with the ELO tab including an inline `?` button bearing `data-action="show-elo-explainer"`; a commented-out note about removed week/month filters; and a `#lb-list` div whose content is either `renderShimmer()` (when `isLoading` is true) or `renderList()` (when it is false).

After setting `innerHTML`, it retrieves the newly created `#lb-list` element and, if found, attaches a click event listener via event delegation. This listener uses `.closest('[data-username]')` to find a clicked row and, if a `data-username` attribute is present, navigates to `/u/` + `encodeURIComponent(username)` by setting `window.location.href`. No value is returned.

### setTab

`setTab` is an async exported function that takes a `LeaderboardTab` parameter. It writes `currentTab = tab`, resets `currentOffset = 0`, sets `hasMore = false`, and sets `liveData = null`. It then calls `render()` synchronously to immediately repaint the UI in the cleared state. It then awaits `fetchLeaderboard()` with no arguments, which populates `liveData` with the first page of results for the new tab. After the fetch resolves, it calls `render()` a second time to repaint with the loaded data. No value is returned.

### setTime

`setTime` is a synchronous exported function that takes a `LeaderboardTimeFilter` parameter. It writes `currentTime = time`, resets `currentOffset = 0`, and sets `hasMore = false`. It then calls `render()`. It does not call `fetchLeaderboard()`. A code comment notes that week/month time filters require time-bucketed stats that do not yet exist in the schema. No value is returned.

### loadMore

`loadMore` is an async exported function that takes no parameters. It reads `isLoading` and `hasMore`; if either `isLoading` is true or `hasMore` is false, it returns immediately without doing anything. Otherwise, it increments `currentOffset` by `PAGE_SIZE` (50) and awaits `fetchLeaderboard(true)`, passing `append = true` so the new page is concatenated onto `liveData` rather than replacing it. After the fetch resolves, it reads `document.getElementById('lb-list')` and, if found, replaces its `innerHTML` with the return value of `renderList()`. No value is returned.

### init

`init` is a synchronous exported function that takes no parameters. It reads `FEATURES.leaderboard` from the imported config; if that flag is falsy, it returns immediately. Otherwise, it creates a `MutationObserver`. The observer callback reads `document.getElementById('screen-leaderboard')` each time it fires; if the element exists, has the CSS class `'active'`, and has zero children (`children.length === 0`), the observer calls `observer.disconnect()` to stop observing, calls `render()` synchronously, then calls `fetchLeaderboard()` with no arguments and chains `.then(() => render())` as a fire-and-forget promise (prefixed with `void`). After constructing the observer, `init` again calls `document.getElementById('screen-leaderboard')`; if the element exists, it calls `observer.observe(screen, { attributes: true, attributeFilter: ['class'] })`, causing the observer to fire only when the element's `class` attribute changes. No value is returned.

`init` is called at module load time via the expression `ready.then(() => init())`, where `ready` is a promise imported from `auth.ts` that resolves once auth initialization completes.

## Agent 05

### fetchLeaderboard

`fetchLeaderboard` is async and accepts a single boolean parameter `append` (default `false`). It reads the module-level `isLoading` flag first; if `isLoading` is `true`, it returns immediately without doing anything. It then calls `getSupabaseClient()` and `getIsPlaceholderMode()`. If the Supabase client is not available or placeholder mode is active, it returns without touching any state. Otherwise it sets `isLoading = true` and enters a `try` block.

Inside the `try`, it maps `currentTab` to a sort column string (`elo_rating`, `wins`, or `current_streak`) and awaits `safeRpc<LeaderboardRpcRow[]>('get_leaderboard', ...)`, passing `p_sort_by`, `p_limit` set to `PAGE_SIZE` (50), and `p_offset` set to `currentOffset`. If the RPC returns an error, an empty `data`, or a zero-length array, the function sets `hasMore = false` and, when `append` is `false`, also sets `liveData = null`. When the RPC returns rows, it maps each `LeaderboardRpcRow` into a `LeaderboardEntry`, using `currentOffset + i + 1` to compute `rank`, coercing all numeric fields with `Number()` and defaulting missing values. It then sets `hasMore` to `true` if the row count equals `PAGE_SIZE`, and sets `liveData` either by appending to the existing array (when `append` is `true`) or replacing it entirely. When `append` is `false`, it also calls `getCurrentUser()` to retrieve the current user's `id`, and if the user is found it searches `liveData` with `findIndex` for a matching `id`, writing that 1-based index to `myRank`, or `null` if not found. The `catch` block logs the error to the console, sets `hasMore = false`, and sets `liveData = null` when `append` is `false`. In all exit paths `isLoading` is reset to `false` at the end. The function returns `Promise<void>`.

### getData

`getData` takes no parameters. It reads the module-level `liveData` variable and returns it directly if it is non-null. If `liveData` is `null`, it returns the module-level constant `PLACEHOLDER_DATA`, a hard-coded array of ten `LeaderboardEntry` objects. It calls no other functions and writes no state.

### renderShimmer

`renderShimmer` takes no parameters and returns a string. It builds an HTML string by iterating a `for` loop six times, concatenating a row template for each iteration. Each row template is a `div` containing shimmer placeholder elements; the width of two inner shimmer bars is varied by using the loop index `i` in inline percentage calculations (`55 + i * 5` and `35 + i * 3`), producing progressively different bar widths across rows. The function reads no module-level state, writes nothing, and calls no other functions. It returns the concatenated HTML string.

### showEloExplainer

`showEloExplainer` is synchronous and takes no parameters. It first calls `document.getElementById('elo-explainer-modal')` and, if the element exists, calls `.remove()` on it, clearing any previously open copy of the modal. It then creates a new `div` element, assigns it the id `elo-explainer-modal`, sets its `style.cssText` to fixed-position overlay styles, and sets its `innerHTML` to a multi-section modal template describing Elo rating mechanics. The template includes a close button with `data-action="close-elo-explainer"` and a question-mark span that triggers `show-elo-explainer` (the close-explainer action is wired through the module-level event delegation listener, not directly inside this function). After setting `innerHTML`, the function attaches a `click` listener directly to the modal element: if the click target is the modal element itself (i.e., the overlay backdrop), it calls `modal.remove()`. It then calls `document.body.appendChild(modal)` to insert the modal into the DOM. The function writes nothing to module-level state and returns `void`.

### renderList

`renderList` takes no parameters and returns a string. It first checks whether `liveData` is `null` and `isLoading` is `false`; if both are true, it returns an error message string immediately. Otherwise it calls `getData()` to obtain either `liveData` or `PLACEHOLDER_DATA`, then copies the result into a new array `sorted` and sorts it in-place based on `currentTab`: descending by `elo`, `wins`, or `streak`. After sorting, it iterates `sorted` with `forEach` and reassigns each entry's `rank` field to `i + 1`. It then calls `.map()` on `sorted` to produce an HTML string for each entry. Within the map callback it selects which numeric field to display as `stat` and which label to use based on `currentTab`, computes a rank color from a map keying ranks 1–3 to gold/silver/bronze colors, computes a tier border color from a map of four tiers, and calls `escHtml` on the entry's `username`. Each row `div` carries a `data-username` attribute and a `cursor:pointer` style. The first character of `p.user` is extracted for the avatar initial via `escHtml`. For the display name it calls `vgBadge(p.verified_gladiator)` and `bountyDot(p.id)` inline in the template. The streak stat value is colored `var(--mod-magenta)` when the tab is `streak` and the streak is 5 or more; otherwise `var(--mod-accent)` is used. After joining all row strings, if `hasMore` is `true`, the function appends a "LOAD MORE" button `div` with `data-action="load-more"`. It returns the complete concatenated HTML string.

### render

`render` is synchronous and takes no parameters. It reads the DOM element `screen-leaderboard` via `document.getElementById`; if that element does not exist it returns immediately. It then calls `getCurrentProfile()` and reads `elo_rating`, `wins`, and `username` from the returned profile, coercing numeric fields with `Number()` and defaulting to `1200`, `0`, and `'YOU'` respectively. It reads `myRank` from module-level state to produce a rank display string (`#--` if null). It sets the container's `innerHTML` to a full template string containing: a header section, a personal stats card showing `myName`, `myElo`, `myWins`, and the rank display, a tab button row generated by mapping over the literal array `['elo', 'wins', 'streak']` where the active tab is highlighted using `currentTab` and the ELO tab receives an inline `?` explainer button with `data-action="show-elo-explainer"`, and a `div#lb-list` whose content is either `renderShimmer()` (when `isLoading` is `true`) or `renderList()` (when `isLoading` is `false`). After setting `innerHTML`, it retrieves `lb-list` from the DOM and, if found, attaches a `click` event listener that walks up from the click target with `.closest('[data-username]')` and navigates to `/u/<encoded-username>` via `window.location.href` when a row with a `data-username` attribute is found. The function returns `void`.

### setTab

`setTab` is async and accepts a `tab` parameter of type `LeaderboardTab`. It writes `tab` to `currentTab`, resets `currentOffset` to `0`, resets `hasMore` to `false`, and sets `liveData` to `null`. It then calls `render()` synchronously — this call will render the shimmer state because `isLoading` is still `false` at this point and `liveData` is now `null`, so `renderList()` would return the error string, but `isLoading` is false so shimmer is not shown; the list will show the error fallback text until the fetch completes. It then awaits `fetchLeaderboard()` with no arguments. After the fetch resolves, it calls `render()` again to repaint with the newly populated `liveData`. The function returns `Promise<void>`.

### setTime

`setTime` is synchronous and accepts a `time` parameter of type `LeaderboardTimeFilter`. It writes `time` to `currentTime`, resets `currentOffset` to `0`, and resets `hasMore` to `false`. It then calls `render()`. It does not call `fetchLeaderboard()`. A code comment notes that week and month time filters require time-bucketed stats not yet present in the schema. The function returns `void`.

### loadMore

`loadMore` is async and takes no parameters. It reads `isLoading` and `hasMore`; if either `isLoading` is `true` or `hasMore` is `false`, it returns immediately without doing anything. Otherwise it increments `currentOffset` by `PAGE_SIZE` and awaits `fetchLeaderboard(true)` — the `true` argument causes the fetch to append to the existing `liveData` rather than replace it. After the fetch resolves, it reads `document.getElementById('lb-list')` from the DOM; if that element exists it sets its `innerHTML` to `renderList()`, updating the list in place without a full `render()` repaint. The function returns `Promise<void>`.

### init

`init` is synchronous and takes no parameters. It reads the `FEATURES.leaderboard` flag from the imported config; if that flag is falsy it returns immediately without doing anything. Otherwise it creates a `MutationObserver` with a callback that reads the `screen-leaderboard` element from the DOM, checks whether it has the CSS class `active` and has no child elements (`children.length === 0`), and if both conditions are met, calls `observer.disconnect()` to stop observing, calls `render()` synchronously, and then fires `fetchLeaderboard()` as a floating promise (prefixed with `void`) chained with `.then(() => render())` to repaint after the fetch completes. After creating the observer, the function reads `document.getElementById('screen-leaderboard')` and, if that element exists, calls `observer.observe(screen, { attributes: true, attributeFilter: ['class'] })` to watch for class attribute changes on it. The function returns `void`. At module level, `ready.then(() => init())` schedules `init` to run after the auth ready promise resolves.
