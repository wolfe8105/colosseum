# Stage 2 Outputs — profile-debate-archive.picker.ts

## Agent 01

### showAddPicker

`showAddPicker` is async and accepts a single parameter, `container`, which is an `HTMLElement`. It reads no module-level state.

On entry, it immediately `await`s a call to `safeRpc<RecentDebate[]>('get_my_recent_debates_for_archive', { p_limit: 30 })`, which fetches up to 30 recent debates for the authenticated user. The destructured result is `{ data: rows, error }`. If `error` is truthy, the function calls `showToast('Could not load debates', 'error')` and returns early — no DOM changes are made.

If the call succeeds, `rows` is coerced to `RecentDebate[]` (defaulting to an empty array if `rows` is null or undefined) and assigned to `list`. A local alias `esc` is set to `escapeHTML` from `config.ts`. The function then creates a `div` element, assigns it the class `dba-picker-overlay`, and sets its `innerHTML` to a bottom-sheet structure containing a handle, a title, and a list container. If `list` is empty, the list container is populated with a single empty-state `div`. If `list` is non-empty, each `RecentDebate` entry is mapped to a `dba-picker-row` div: the entry's `debate_created_at` is formatted with `toLocaleDateString` using `'en-US'` locale with short month, numeric day, and two-digit year; `opponent_name` is used if present, falling back to `opponent_username`, then `'Unknown'`, and passed through `escapeHTML`; `is_win` is used to choose between `'✅ W'` and `'❌ L'`; `debate_id`, `topic`, and the opponent string are all passed through `escapeHTML` before insertion into `innerHTML`. The `debate_id` is stored as the `data-debate` attribute on each row element.

A click listener is attached to the overlay element itself: if the click target is the overlay (i.e., a click on the backdrop outside the sheet), `overlay.remove()` is called, dismissing the sheet. The overlay is then appended to `document.body`.

Next, the function queries all `.dba-picker-row` elements within the overlay and attaches an async click listener to each. When a row is clicked, the listener immediately calls `overlay.remove()`, then reads `row.dataset.debate` (asserted non-null) as `debateId`. It `await`s `safeRpc('add_debate_to_archive', { p_debate_id: debateId })`. If the returned `addErr` is truthy, `showToast('Could not add debate', 'error')` is called and the listener returns early. On success, `showToast('Added to archive', 'success')` is called, then `await loadAndRender(container)` is called, passing the original `container` parameter. The function itself returns `void` unconditionally; it does not return the created overlay or any other value. There are no `try/catch` blocks anywhere in the function.

## Agent 02

### showAddPicker

`showAddPicker` is an async function that accepts a single parameter, `container`, typed as `HTMLElement`. It returns `Promise<void>`.

On entry, it immediately calls `safeRpc<RecentDebate[]>('get_my_recent_debates_for_archive', { p_limit: 30 })` and awaits the result, destructuring `data` (aliased `rows`) and `error`. If `error` is truthy, it calls `showToast('Could not load debates', 'error')` and returns early — no DOM is created. If the call succeeds, `rows` is coerced to a `RecentDebate[]` via a nullish-coalescing fallback to an empty array, and `escapeHTML` is aliased locally as `esc`.

The function then creates a `div` element, assigns it the class `dba-picker-overlay`, and sets its `innerHTML` to a bottom-sheet structure. Inside that structure, if `list` is empty, a single `dba-picker-empty` div with the text "No unarchived completed debates." is rendered. If `list` is non-empty, it maps each `RecentDebate` entry `d` into a `dba-picker-row` div: the row's `data-debate` attribute is set to `esc(d.debate_id)`, the topic span renders `esc(d.topic ?? 'Untitled debate')`, and the meta line renders the opponent name (falling through `d.opponent_name`, `d.opponent_username`, then `'Unknown'` — all passed through `esc`), a formatted date derived from `new Date(d.debate_created_at).toLocaleDateString` with `month: 'short'`, `day: 'numeric'`, `year: '2-digit'`, and a win/loss indicator (`'✅ W'` or `'❌ L'` based on `d.is_win`). All user-supplied strings entering `innerHTML` pass through `esc`.

After `innerHTML` is assigned, a `click` listener is added to the overlay itself: if `e.target === overlay` (i.e., the click landed on the backdrop and not a child), `overlay.remove()` is called. The overlay is then appended to `document.body`.

Finally, the function queries all `.dba-picker-row` elements inside the overlay and attaches an async `click` listener to each. When a row is clicked, the listener first removes the overlay from the DOM, then reads `row.dataset.debate` (non-null asserted) as `debateId`, and awaits `safeRpc('add_debate_to_archive', { p_debate_id: debateId })`. If that call returns an `error`, `showToast('Could not add debate', 'error')` is called and the listener returns early. On success, it calls `showToast('Added to archive', 'success')` and then awaits `loadAndRender(container)`, passing the original `container` parameter. The outer `showAddPicker` function itself returns nothing; it does not await the row-click listeners — those are fire-and-forget relative to the outer call site.

## Agent 03

### showAddPicker

`showAddPicker` is an async function that receives a single parameter, `container`, which is an `HTMLElement` reference passed in by the caller. It reads no module-level state; all state it acts on is local.

The function begins by awaiting `safeRpc<RecentDebate[]>('get_my_recent_debates_for_archive', { p_limit: 30 })`, which issues an RPC to the server requesting up to 30 of the current user's recent debates that are not yet in the archive. If the returned `error` is truthy, the function calls `showToast('Could not load debates', 'error')` and returns immediately — no DOM is written in this case. If the call succeeds, the response rows are coerced to a `RecentDebate[]` array (defaulting to `[]` if `rows` is `null` or `undefined`) and assigned to `list`. A local alias `esc` is assigned to `escapeHTML` from `config.ts`.

The function then creates a `div` element, assigns it the class `dba-picker-overlay`, and sets its `innerHTML` to a bottom-sheet structure containing a handle, a title, and a list area. The list area branches on `list.length`: if zero, a single empty-state `div` is injected; otherwise, each `RecentDebate` entry is mapped to a `dba-picker-row` div. For each row, the `debate_created_at` field is formatted with `Date.toLocaleDateString` using `en-US` locale with short month, numeric day, and 2-digit year. The opponent display string is built by preferring `opponent_name` over `opponent_username`, falling back to the string `'Unknown'`, then passed through `escapeHTML`. The `is_win` boolean is rendered as either `'✅ W'` or `'❌ L'`. The `debate_id` and `topic` fields are also passed through `escapeHTML` before being written into the HTML. The `debate_id` is stored in a `data-debate` attribute on the row element.

After building the overlay, the function attaches a click listener to the overlay element itself: if the click target is exactly the overlay (i.e., a backdrop click rather than a click on the sheet contents), the overlay is removed from the DOM. The overlay is then appended to `document.body`.

Next, the function queries all `.dba-picker-row` elements inside the overlay and attaches an async click listener to each. When a row is clicked, the listener immediately removes the overlay from the DOM, then reads `row.dataset.debate` to get the `debateId`. It awaits `safeRpc('add_debate_to_archive', { p_debate_id: debateId })`. If that call returns an error, the listener calls `showToast('Could not add debate', 'error')` and returns early. On success, it calls `showToast('Added to archive', 'success')` and then awaits `loadAndRender(container)`, passing the original `container` reference, which re-renders the archive list in place. There is no try/catch block anywhere in this function — unhandled rejections from `safeRpc` or `loadAndRender` would propagate as unhandled promise rejections. The function itself returns `Promise<void>` and the outer call site receives no meaningful return value.

## Agent 04

### showAddPicker

`showAddPicker` is async and accepts a single parameter, `container`, which is an `HTMLElement`. It writes nothing to module-level state; all side effects are DOM mutations and network calls.

On entry, it immediately awaits `safeRpc<RecentDebate[]>('get_my_recent_debates_for_archive', { p_limit: 30 })`, which returns a `{ data, error }` object. If `error` is truthy, it calls `showToast('Could not load debates', 'error')` and returns early, leaving the DOM unchanged. If the call succeeds, it coerces `data` to an array via `rows ?? []` and assigns that to `list`, and aliases `escapeHTML` as the local variable `esc`.

It then creates a `div` element with class `dba-picker-overlay` and builds its `innerHTML` as a bottom-sheet structure. Inside the sheet, if `list` is empty it renders a single empty-state `div`; otherwise it maps over `list`, constructing one `.dba-picker-row` per `RecentDebate`. For each row it formats `debate_created_at` into a short locale date string using `Date.prototype.toLocaleDateString` with `'en-US'` locale, passes `opponent_name` or `opponent_username` (falling back to `'Unknown'`) through `escapeHTML`, and formats a win/loss indicator from `d.is_win`. The `debate_id` value is set as a `data-debate` attribute after passing through `escapeHTML`. The topic is also passed through `escapeHTML`, defaulting to `'Untitled debate'`. All user-supplied fields entering `innerHTML` are escaped.

After setting `innerHTML`, a click listener is attached to `overlay` itself: if the click target is the overlay element directly (i.e., a tap on the backdrop outside the sheet), it removes `overlay` from the DOM. The overlay is then appended to `document.body`.

Finally, the function queries all `.dba-picker-row` elements within the overlay and attaches an async click listener to each. When a row is clicked, the listener first removes the overlay from the DOM, then reads `row.dataset.debate` (asserted non-null) as `debateId`. It awaits `safeRpc('add_debate_to_archive', { p_debate_id: debateId })`. If that call returns an error, it calls `showToast('Could not add debate', 'error')` and returns early. On success, it calls `showToast('Added to archive', 'success')` and then awaits `loadAndRender(container)`, passing the original `container` parameter to re-render the archive list in place. There is no try/catch anywhere in this function; unhandled rejections from either `safeRpc` call or `loadAndRender` within the row click handler would propagate as unhandled promise rejections.

## Agent 05

### showAddPicker

`showAddPicker` is async and accepts one parameter, `container`, which is an `HTMLElement`. It reads no module-level state.

On entry, it immediately `await`s a call to `safeRpc<RecentDebate[]>('get_my_recent_debates_for_archive', { p_limit: 30 })`, which fetches up to 30 of the calling user's recent debates that are not yet archived. If the destructured `error` is truthy, it calls `showToast('Could not load debates', 'error')` and returns early, writing nothing to the DOM. If the call succeeds, `rows` is coerced through `?? []` into a local `list` array of `RecentDebate` objects, and `escapeHTML` is aliased as `esc`.

A new `div` element with class `dba-picker-overlay` is created and its `innerHTML` is set to a bottom-sheet structure containing a handle bar, a title, and a list area. If `list` is empty, the list area contains a single empty-state message. Otherwise it iterates over every element in `list` with `.map()`, formatting a `date` string via `Date.toLocaleDateString`, building an escaped opponent display name by preferring `d.opponent_name` over `d.opponent_username` with a fallback of `'Unknown'`, and producing a win/loss indicator from `d.is_win`. Each item is rendered as a `div.dba-picker-row` with `data-debate` set to the escaped `debate_id`, and containing two child divs for topic and metadata. The mapped strings are joined and embedded in the template. All user-supplied string values (`topic`, `opponent_name`, `opponent_username`, `debate_id`) are passed through `escapeHTML` before insertion into `innerHTML`.

A click listener is attached to the overlay element itself: if the click target is exactly the overlay (i.e., the backdrop rather than any child), it calls `overlay.remove()`, dismissing the sheet. The overlay is then appended to `document.body`.

After mounting, `querySelectorAll('.dba-picker-row')` collects all row elements and attaches an async click listener to each. When a row is clicked, it first calls `overlay.remove()` synchronously to close the sheet, then reads `row.dataset.debate` as the `debateId`. It `await`s `safeRpc('add_debate_to_archive', { p_debate_id: debateId })`. If the resulting `addErr` is truthy, it calls `showToast('Could not add debate', 'error')` and returns early from the row handler. On success, it calls `showToast('Added to archive', 'success')` and then `await`s `loadAndRender(container)`, which re-renders the archive list in the original `container` element. There is no try/catch block anywhere in this function; all error branching relies on the `error` fields returned by `safeRpc`.
