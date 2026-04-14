# Stage 2 Outputs — spectate.ts

## Agent 01

### startPolling

`startPolling` is async and returns `Promise<void>`. It reads `state.pollTimer` and `state.debateId`, and reads and writes several other `state` fields throughout its interval callback. On entry, if `state.pollTimer` is already set, it calls `clearInterval` on it. It then assigns a new interval ID to `state.pollTimer` via `setInterval`, scheduling a callback to fire every 5000 milliseconds.

Each time the interval fires, the callback executes the following in a single `try` block. It declares a local `freshDebate` as null, then awaits `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`. If that call returns an error or no data, it falls back to a direct PostgREST query on the `arena_debates` table via `state.sb`, selecting all columns for the matching `state.debateId`. If the direct query returns a row, it constructs a `SpectateDebate` object from that row, filling `debater_a_name` and `debater_b_name` from `state.debateData` if present or defaulting to `'Side A'` / `'Side B'`. If the RPC succeeds, `freshDebate` is set to the RPC result cast as `SpectateDebate`. If `freshDebate` remains null after both attempts, the callback returns early. Otherwise, it queries the DOM for the element with id `spectator-count` and, if found, sets its `textContent` to the string form of `Number(freshDebate.spectator_count) || 1`. It reads `freshDebate.vote_count_a` and `vote_count_b`, defaulting both to 0, and if either is truthy calls `updateVoteBar(freshVA, freshVB)` followed by `updatePulse(freshVA, freshVB)`. It then attempts to load messages by awaiting `safeRpc('get_debate_messages', { p_debate_id: state.debateId })`; if that throws, a catch block falls back to a direct query on `debate_messages` ordered by `round` then `created_at` with a limit of 100. If the resulting `allMessages` array is non-empty, it queries the DOM for the element with id `messages`; if that element exists and `allMessages.length` exceeds `state.lastRenderedMessageCount`, it slices the new messages, calls `renderMessages(newMessages, freshDebate)` to produce HTML, checks whether the scroll position is within 80px of the bottom, then calls `insertAdjacentHTML('beforeend', newHtml)` on the messages element, writes the new count to `state.lastRenderedMessageCount`, and if the element was near the bottom calls `messagesEl.scrollTo` with smooth behavior. After message rendering, the callback checks whether `freshDebate.status` is one of `'complete'`, `'completed'`, `'cancelled'`, or `'canceled'`. If so, it calls `clearInterval(state.pollTimer!)` and sets `state.pollTimer = null`, then if `state.chatPollTimer` is set it clears that interval and sets it to null, writes `freshDebate` to `state.debateData`, calls `renderSpectateView(freshDebate, allMessages)`, and fires a dynamic `import('../onboarding-drip.ts')` as a fire-and-forget call (`.then` calls `triggerDripDay(3)` and `.catch` swallows errors). The outer `try` block has a single `catch` that logs a warning and returns, preventing any uncaught exception from escaping the interval.

---

### loadDebate

`loadDebate` is async and returns `Promise<void>`. It reads `state.debateId` and `state.sb` throughout, and writes to `state.debateData`, `state.chatMessages`, `state.lastChatMessageAt`, and `state.replayData`. The entire body is wrapped in a single `try/catch`; the catch logs the error and calls `showError` with the error message before returning.

On entry, it awaits `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`. If the RPC returns an error (not null data — an error object), it enters a three-level fallback chain. The first fallback awaits a PostgREST query on `arena_debates` that joins both debater profiles via foreign-key aliases. If that query errors or returns no data, a second fallback awaits a bare `select('*')` on `arena_debates` for the same ID. If the bare query also errors or returns no data, it calls `showError` with a message and returns. If the bare query succeeds, it constructs a `SpectateDebate` with placeholder names (`'Side A'` / `'Side B'`) and default elo of 1200. If the first fallback succeeds, it extracts `debater_a_profile` and `debater_b_profile` from the result and constructs a `SpectateDebate` using `display_name || username || 'Side A/B'` and elo/avatar fields. Back on the main branch: if the RPC returned no error but `rpcData` is null, it calls `showError('Debate not found or has been removed.')` and returns. If the RPC succeeded and returned data, it sets `debate` directly from that data.

After resolving `debate`, it writes `state.debateData = debate`. It then checks `debate.status === 'live'` and, if true, performs a full navigation to `'/?spectate=' + encodeURIComponent(state.debateId!)` and returns immediately. If the status is not `'live'`, it sets `document.title`, then queries the DOM for `meta[property="og:title"]` and `meta[property="og:description"]` and, if found, updates their `content` attributes. It then fires three `safeRpc` calls as fire-and-forget (each chained with `.catch` that logs a warning): `bump_spectator_count`, `log_debate_watch`, and `log_event` with event type `'spectate_view'`.

Next it loads messages by awaiting `safeRpc('get_debate_messages', { p_debate_id: state.debateId })`; if that throws, a catch block falls back to a direct `debate_messages` query ordered by `round` ascending then `created_at` ascending with limit 100. It then loads spectator chat by awaiting `safeRpc('get_spectator_chat', { p_debate_id: state.debateId, p_limit: 100 })`; on success it writes the result to `state.chatMessages` and, if the array is non-empty, sets `state.lastChatMessageAt` to the `created_at` field of the last element; on failure (catch block) it sets `state.chatMessages = []`. It then checks `debate.status` against `'complete'` and `'completed'`: if true, it awaits `safeRpc('get_debate_replay_data', { p_debate_id: state.debateId })` and, if data is returned, writes it to `state.replayData`; on catch it logs a warning and sets `state.replayData = null`.

After all data loading, it calls `renderSpectateView(debate, messages)`. It then evaluates whether the status is any of `'live'`, `'pending'`, `'round_break'`, or `'voting'`; if true, it calls `startPolling()` (the function on the anchor list) and `startChatPolling()` as synchronous calls (both return promises that are not awaited — fire-and-forget). If the status is none of those, it calls `nudge('replay_entry', '👁️ Watching the replay. Judge for yourself.')`.

---

### init

`init` is an immediately-invoked async function expression. It takes no parameters and reads from the DOM, browser APIs, and module-level `state`. On entry it awaits the `ready` promise imported from `auth.ts`, which blocks until auth initialization completes. It then calls `getSupabaseClient()` and writes the result to `state.sb`, queries the DOM for elements with ids `'app'` and `'loading'` and writes them to `state.app` and `state.loading`, and calls `getCurrentUser()` and `getIsPlaceholderMode()` to compute and write a boolean to `state.isLoggedIn` (true only if a user exists and placeholder mode is not active).

It attaches a click listener to the element with id `'back-btn'` (if present): the listener checks `document.referrer` for the current `location.host` and either calls `history.back()` or navigates to `'/'`. It calls `getCurrentUser()` a second time; if it returns a truthy value, it queries for the element with id `'join-btn'` and, if found, sets its `display` style to `'none'`.

It reads `window.location.search` via `new URLSearchParams` and extracts the `'id'` parameter as `debateId`. It then applies a UUID regex test against `debateId` if it is present; if the string fails the test, it writes an error message to `state.app.innerHTML`, hides `state.loading`, and returns, ending execution. If `debateId` is absent (null or empty), it writes a different error message to `state.app.innerHTML`, hides `state.loading`, and returns.

If both validations pass, it writes `debateId` to `state.debateId`. It then attaches a `beforeunload` listener on `window` that calls `clearInterval` on `state.pollTimer` and `state.chatPollTimer` if either is set. Finally, it calls `loadDebate()` without awaiting the returned promise, making it fire-and-forget from `init`'s perspective.

## Agent 02

### startPolling

`startPolling` is async and returns `Promise<void>`. It reads `state.pollTimer` and, if that value is truthy, calls `clearInterval` on it before replacing it. It writes a new interval ID to `state.pollTimer` by calling `setInterval` with a 5000ms delay. The interval callback is itself async.

On each tick, the callback reads `state.debateId` and `state.debateData` from module-level state. It first awaits `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`. If that call returns an error or no data, the callback falls back to a direct PostgREST query against `arena_debates` via `state.sb!.from(...).select('*').eq(...).single()`, awaited. If that direct query returns data, it assembles a `SpectateDebate` object from it, filling `debater_a_name` and `debater_b_name` from `state.debateData` if present, falling back to the strings `'Side A'` and `'Side B'`. If neither path yields a `freshDebate` value, the callback returns early with no side effects. If the RPC succeeded and returned data, `freshDebate` is set directly from `rpcData`.

With `freshDebate` in hand, the callback reads the DOM element with id `spectator-count` and, if found, writes `String(Number(freshDebate.spectator_count) || 1)` to its `textContent`. It then reads `freshDebate.vote_count_a` and `freshDebate.vote_count_b`; if either is nonzero, it calls `updateVoteBar(freshVA, freshVB)` and `updatePulse(freshVA, freshVB)`.

Next the callback attempts to load messages. It awaits `safeRpc('get_debate_messages', { p_debate_id: state.debateId })`. If that call throws, the catch block falls back to a direct query against `debate_messages`, ordering by `round` then `created_at`, limited to 100 rows, awaited. The resulting array is assigned to local `allMessages`. If `allMessages` has any entries, the callback reads the DOM element with id `messages`. If found, and if `allMessages.length` exceeds `state.lastRenderedMessageCount`, it computes `newMessages` by slicing `allMessages` from `state.lastRenderedMessageCount`, calls `renderMessages(newMessages, freshDebate)` to obtain HTML, checks whether the element is scrolled to within 80px of the bottom, appends the HTML with `insertAdjacentHTML('beforeend', ...)`, writes the new count to `state.lastRenderedMessageCount`, and conditionally calls `messagesEl.scrollTo` with smooth behavior.

Finally, the callback checks `freshDebate.status`. If it is `'complete'`, `'completed'`, `'cancelled'`, or `'canceled'`, it calls `clearInterval(state.pollTimer!)`, sets `state.pollTimer` to `null`, and if `state.chatPollTimer` is set, clears and nulls that too. It then writes `freshDebate` to `state.debateData`, calls `renderSpectateView(freshDebate, allMessages)`, and fires a dynamic `import('../onboarding-drip.ts')` that calls `triggerDripDay(3)` — this import is fire-and-forget; errors are silently caught. The entire tick body is wrapped in a `try/catch` that logs a warning on any uncaught error and does not rethrow.

---

### loadDebate

`loadDebate` is async and returns `Promise<void>`. The entire body is wrapped in a `try/catch`; the catch block calls `console.error` and then `showError` with the error message before returning.

It reads `state.debateId` and `state.sb` from module-level state. It first awaits `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`. The result branches on `rpcErr`:

If `rpcErr` is truthy, the function logs a warning and falls back to a direct PostgREST query that joins both debater profiles via foreign key aliases, awaited. If that query also fails (`directErr` truthy or no data), a second fallback issues a bare `select('*')` query, awaited. If that too fails, `showError` is called with the error message and the function returns early. If the bare query succeeds, `debate` is built with placeholder names `'Side A'` / `'Side B'` and default Elo 1200. If the profile-joined query succeeded, `debate` is built by reading `debater_a_profile` and `debater_b_profile` off `directData`, using `display_name || username || 'Side A'` and equivalent for side B.

If `rpcErr` is falsy but `rpcData` is null, `showError('Debate not found or has been removed.')` is called and the function returns early. If both are fine, `debate` is set to `rpcData`.

After obtaining `debate`, the function writes `debate` to `state.debateData`. It then reads `debate.status`: if it is `'live'`, it writes `window.location.href` to redirect the browser to `'/?spectate=' + encodeURIComponent(state.debateId!)` and returns immediately.

For non-live debates, it writes to `document.title` using `debate.topic`, and conditionally writes to the `og:title` and `og:description` meta elements if they exist in the DOM.

Three fire-and-forget `safeRpc` calls follow: `bump_spectator_count`, `log_debate_watch`, and `log_event` (with `p_event_type: 'spectate_view'`). Each has a `.catch()` that logs a warning; none is awaited.

The function then awaits `safeRpc('get_debate_messages', ...)`. If that throws, the catch block falls back to a direct `debate_messages` query ordered by `round` ascending then `created_at` ascending, limited to 100, awaited. The result is assigned to local `messages`.

Next it awaits `safeRpc('get_spectator_chat', { p_debate_id: state.debateId, p_limit: 100 })`. On success it writes `state.chatMessages` from the result array, and if that array is non-empty, writes `state.lastChatMessageAt` from the last element's `created_at`. On any throw, the catch block writes `state.chatMessages = []`.

If `debate.status` is `'complete'` or `'completed'`, the function awaits `safeRpc('get_debate_replay_data', { p_debate_id: state.debateId })`. On success, if data was returned, it writes `state.replayData`. On any throw it logs a warning and sets `state.replayData = null`.

The function then calls `renderSpectateView(debate, messages)`. After that, it checks `debate.status` against `'live'`, `'pending'`, `'round_break'`, and `'voting'`. If any match, it calls `startPolling()` and `startChatPolling()` (neither is awaited — both are fire-and-forget at this call site). If none match, it calls `nudge('replay_entry', '...')` with a fixed string.

---

### init

`init` is declared as an async IIFE (`(async function init() { ... })()`). It is not externally callable; the binding is local to the IIFE expression. It runs immediately when the module loads.

It begins by awaiting `ready`, a promise imported from `auth.ts` that resolves when auth initialization is complete. After that resolves, it writes `state.sb` from `getSupabaseClient()`, writes `state.app` from `document.getElementById('app')`, writes `state.loading` from `document.getElementById('loading')`, and writes `state.isLoggedIn` by evaluating whether `getCurrentUser()` is truthy and `getIsPlaceholderMode()` is falsy.

It attaches a `click` listener to the element with id `back-btn` (if it exists). When triggered, that listener checks `document.referrer`: if it is non-empty and contains `location.host`, it calls `history.back()`; otherwise it sets `window.location.href` to `'/'`.

It then calls `getCurrentUser()` again; if the result is truthy, it reads the element with id `join-btn` and, if found, sets its `display` style to `'none'`.

It reads `window.location.search` and extracts the `id` parameter. If `debateId` is present but fails a UUID regex test (`/^[0-9a-f]{8}-...-[0-9a-f]{12}$/i`), it writes an error message to `state.app.innerHTML`, sets `state.loading.style.display = 'none'` on each if those elements exist, and returns. If `debateId` is absent entirely, it writes a different error message with a home link to `state.app.innerHTML`, hides the loading element, and returns.

If `debateId` passes validation, it is written to `state.debateId`. A `beforeunload` listener is then attached to `window`; when it fires, it clears `state.pollTimer` and `state.chatPollTimer` if either is set.

Finally, the function calls `loadDebate()` without awaiting it. Execution of `init` does not wait for `loadDebate` to complete; `loadDebate` runs concurrently from this point.

## Agent 03

### startPolling

`startPolling` is async and returns `Promise<void>`. It reads `state.pollTimer` and `state.debateId` from module-level state. On entry, if `state.pollTimer` is truthy it calls `clearInterval(state.pollTimer)`, then immediately assigns a new interval ID to `state.pollTimer` by calling `setInterval` with a 5000ms period. The function returns after registering the interval; none of the interval's async work is awaited by `startPolling` itself.

Each tick of the interval fires an async callback. The callback first calls `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })` and awaits it. If that call returns an error or null data, the callback falls back to a direct PostgREST query on `state.sb` against `arena_debates`, filtered by `state.debateId`; if that direct query returns data it constructs a `SpectateDebate` object using the existing `state.debateData` fields for debater names as fallbacks. If the RPC succeeds, `freshDebate` is set to its data. If `freshDebate` is still null after both attempts, the callback returns early. Otherwise, it reads the DOM element with id `spectator-count` and sets its `textContent` to the stringified, `Number()`-cast `spectator_count` field. It then reads `vote_count_a` and `vote_count_b` from `freshDebate`; if either is non-zero, it calls `updateVoteBar(freshVA, freshVB)` and `updatePulse(freshVA, freshVB)`. Next it fetches messages: it awaits `safeRpc('get_debate_messages', { p_debate_id: state.debateId })`; if that throws, it falls back to a direct PostgREST query on `debate_messages` ordered by `round` then `created_at`, limited to 100. If the resulting `allMessages` array is non-empty, it reads the DOM element with id `messages`; if found and if `allMessages.length` exceeds `state.lastRenderedMessageCount`, it slices the new messages, calls `renderMessages(newMessages, freshDebate)` to get HTML, checks whether the container is scrolled within 80px of the bottom, calls `messagesEl.insertAdjacentHTML('beforeend', newHtml)`, updates `state.lastRenderedMessageCount` to the new total, and if the scroll position was at the bottom it calls `messagesEl.scrollTo` with smooth behavior. After message processing, the callback checks `freshDebate.status` against four terminal values (`complete`, `completed`, `cancelled`, `canceled`). If matched, it calls `clearInterval(state.pollTimer)` and sets `state.pollTimer = null`, then checks `state.chatPollTimer` and clears it if set, assigns `freshDebate` to `state.debateData`, calls `renderSpectateView(freshDebate, allMessages)`, and fires a dynamic `import('../onboarding-drip.ts')` that calls `triggerDripDay(3)` on the resolved module — this import is fire-and-forget with `.catch(() => {})`. The entire interval callback is wrapped in a `try/catch` that logs a warning to the console on any error.

---

### loadDebate

`loadDebate` is async and returns `Promise<void>`. It reads `state.debateId` and `state.sb` from module-level state. The entire body is wrapped in a `try/catch`; the catch block logs to the console and calls `showError` with the error message.

On entry it awaits `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`. If that call returns an error, it falls back to a direct PostgREST query on `arena_debates` with an explicit join on both debater profiles. If that query also fails, it makes a second fallback: a bare `select('*')` on `arena_debates` with no joins. If the bare query fails, it calls `showError` and returns. If the bare query succeeds, it constructs a `SpectateDebate` with placeholder strings `'Side A'` / `'Side B'` and default elo 1200. If the profile-joined query succeeded, it extracts display names, elo ratings, and avatar URLs from the joined profile objects, falling back to `'Side A'`/`'Side B'` and 1200 when fields are absent. If the RPC returned null data with no error, it calls `showError('Debate not found or has been removed.')` and returns. If the RPC succeeded it uses the data directly.

After obtaining a `debate` object, it assigns it to `state.debateData`. It then checks `debate.status === 'live'`; if true, it sets `window.location.href` to `'/?spectate=' + encodeURIComponent(state.debateId!)` and returns immediately. Otherwise, it sets `document.title`, and reads and updates the `og:title` and `og:description` meta elements if they are present. It then issues two fire-and-forget `safeRpc` calls — `bump_spectator_count` and `log_debate_watch` — each with `.catch()` that logs a warning. A third fire-and-forget `safeRpc('log_event', ...)` follows.

Next it awaits `safeRpc('get_debate_messages', ...)` inside a `try/catch`; on failure it falls back to a direct PostgREST query on `debate_messages` ordered ascending by `round` and `created_at`, limited to 100. Then it awaits `safeRpc('get_spectator_chat', ...)` inside its own `try/catch`; on success it assigns the result to `state.chatMessages` and, if the array is non-empty, sets `state.lastChatMessageAt` to the `created_at` field of the last element; on failure it sets `state.chatMessages = []`. It then checks if `debate.status` is `complete` or `completed`; if so, it awaits `safeRpc('get_debate_replay_data', ...)` inside a `try/catch` and assigns the result to `state.replayData` on success; on failure it logs a warning and sets `state.replayData = null`.

After all data loading, it calls `renderSpectateView(debate, messages)`. It then checks whether `debate.status` is any of `live`, `pending`, `round_break`, or `voting`; if true it calls `startPolling()` and `startChatPolling()`; if false it calls `nudge('replay_entry', ...)` with a fixed string.

---

### init

`init` is an async IIFE — it is not a named, callable export. It is defined as `async function init()` but invoked immediately via the `(async function init() { ... })()` pattern. It cannot be called from outside the module.

On invocation it awaits `ready` (a module-level promise imported from `auth.ts`). Once `ready` resolves, it calls `getSupabaseClient()` and assigns the result to `state.sb`, reads the DOM elements with ids `app` and `loading` and assigns them to `state.app` and `state.loading`, and calls `getCurrentUser()` and `getIsPlaceholderMode()` to compute and assign a boolean to `state.isLoggedIn`.

It attaches a `click` listener to the element with id `back-btn`. That listener checks `document.referrer` for the current `location.host`; if matched it calls `history.back()`, otherwise it sets `window.location.href = '/'`.

It calls `getCurrentUser()` a second time; if the result is truthy it reads the element with id `join-btn` and, if found, sets its `display` style to `'none'`.

It reads `window.location.search` via `URLSearchParams` and extracts the `id` parameter as `debateId`. If `debateId` is present but fails a UUID regex test (`/^[0-9a-f]{8}-...-[0-9a-f]{12}$/i`), it sets `state.app.innerHTML` to an error div, sets `state.loading.style.display = 'none'` on each if those elements exist, and returns. If `debateId` is absent entirely, it sets `state.app.innerHTML` to a different error div with a home link, hides the loading element, and returns.

If `debateId` passes validation, it assigns it to `state.debateId`. It then attaches a `beforeunload` listener to `window` that calls `clearInterval` on both `state.pollTimer` and `state.chatPollTimer` if they are set. Finally, it calls `loadDebate()` without awaiting it — fire-and-forget.

## Agent 04

### startPolling

`startPolling` is async and returns `Promise<void>`. It reads `state.pollTimer` and `state.debateId` from module-level state, and reads `state.sb`, `state.debateData`, and `state.lastRenderedMessageCount` inside the interval callback.

On entry, if `state.pollTimer` is set it calls `clearInterval(state.pollTimer)` before registering a new interval. It then assigns a new interval ID to `state.pollTimer` via `setInterval` with a 5000ms period. The interval callback is itself async.

Each tick of the interval begins a `try/catch`. It calls `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })` and awaits the result. If that call returns an error or null `rpcData`, it falls back to a direct PostgREST query on `state.sb` against the `arena_debates` table filtered by `state.debateId`, using `.single()`. If that direct query returns data, it constructs a `SpectateDebate` object from `directData`, filling `debater_a_name` and `debater_b_name` from `state.debateData` if available, defaulting to `'Side A'` / `'Side B'`. If the RPC succeeds, `freshDebate` is set to `rpcData` cast as `SpectateDebate`. If `freshDebate` is still null after both paths, the callback returns early.

With a valid `freshDebate`, the callback queries the DOM for `#spectator-count` and, if found, sets its `textContent` to `String(Number(freshDebate.spectator_count) || 1)`. It reads `vote_count_a` and `vote_count_b` from `freshDebate`; if either is truthy it calls `updateVoteBar(freshVA, freshVB)` and `updatePulse(freshVA, freshVB)`.

Next it attempts to load messages by awaiting `safeRpc('get_debate_messages', { p_debate_id: state.debateId })` inside a nested `try/catch`. If that throws, it falls back to a direct PostgREST query on `debate_messages` ordered by `round` then `created_at`, limited to 100 rows. If the resulting `allMessages` array is non-empty and the DOM element `#messages` exists, it compares `allMessages.length` to `state.lastRenderedMessageCount`. If new messages exist, it slices the new portion, calls `renderMessages(newMessages, freshDebate)` to get HTML, checks whether the scroll position is within 80px of the bottom, appends the HTML via `insertAdjacentHTML('beforeend', ...)`, updates `state.lastRenderedMessageCount` to `allMessages.length`, and if the scroll was at the bottom calls `messagesEl.scrollTo` with smooth behavior.

Finally, it checks `freshDebate.status` against the values `'complete'`, `'completed'`, `'cancelled'`, and `'canceled'`. If any match, it calls `clearInterval(state.pollTimer!)` and sets `state.pollTimer = null`, then clears `state.chatPollTimer` if set. It writes `freshDebate` to `state.debateData`, calls `renderSpectateView(freshDebate, allMessages)`, and fire-and-forgets a dynamic import of `'../onboarding-drip.ts'` calling `triggerDripDay(3)` with a `.catch(() => {})`. Any error thrown by the entire tick body is caught and logged with `console.warn`.

---

### loadDebate

`loadDebate` is async and returns `Promise<void>`. It reads `state.debateId`, `state.sb`, and writes `state.debateData`, `state.chatMessages`, `state.lastChatMessageAt`, and `state.replayData`. The entire body is wrapped in a `try/catch` that calls `showError` and logs on any uncaught exception.

It opens by awaiting `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`. Three branches follow. If `rpcErr` is truthy, it falls back to a direct PostgREST query joining both debater profiles via foreign-key aliases (`debater_a_profile`, `debater_b_profile`) using `.single()`. If that also errors or returns no data, it makes a second bare `select('*')` query against `arena_debates`. If that bare query fails too, it calls `showError` with the error message and returns early. If the bare query succeeds, it constructs a minimal `SpectateDebate` with placeholder names and ELO 1200. If the profile-joined query succeeds, it extracts display names, ELO, and avatar URLs from the joined profile objects, defaulting to `'Side A'`/`'Side B'` and 1200 when absent. If `rpcData` is null (no error but empty result), it calls `showError('Debate not found or has been removed.')` and returns. If the RPC succeeds with data, `debate` is set directly from `rpcData`.

After resolving `debate`, it writes `state.debateData = debate`. It then checks `debate.status === 'live'`: if true, it sets `window.location.href` to `'/?spectate=' + encodeURIComponent(state.debateId!)` and returns immediately.

For non-live debates, it updates `document.title` and two `<meta>` OG tags (`og:title`, `og:description`) with the debate topic and debater names. It then fires three RPC calls as fire-and-forget (each with `.catch()` for warnings): `bump_spectator_count`, `log_debate_watch`, and `log_event` with event type `'spectate_view'`.

It then loads messages by awaiting `safeRpc('get_debate_messages', { p_debate_id: state.debateId })` inside a `try/catch`. On failure it falls back to a direct query on `debate_messages` ordered by `round` ascending then `created_at` ascending, limited to 100.

It loads spectator chat by awaiting `safeRpc('get_spectator_chat', { p_debate_id: state.debateId, p_limit: 100 })` inside a separate `try/catch`. On success it writes `state.chatMessages` and, if that array is non-empty, sets `state.lastChatMessageAt` to the `created_at` of the last element. On failure it sets `state.chatMessages = []`.

It checks `debate.status` for `'complete'` or `'completed'`. If true, it awaits `safeRpc('get_debate_replay_data', { p_debate_id: state.debateId })` inside a `try/catch`, writing `state.replayData` from the result. If that call fails, it logs a warning and sets `state.replayData = null`.

It then calls `renderSpectateView(debate, messages)`. After that it evaluates whether the status is `'live'`, `'pending'`, `'round_break'`, or `'voting'`. If any match, it calls `startPolling()` and `startChatPolling()` (neither awaited). If none match, it calls `nudge('replay_entry', '...')` with a fixed string. The outer `catch` calls `console.error` and `showError` with the exception message.

---

### init

`init` is an immediately-invoked async function expression (IIFE). It is not callable by name from outside the module; it is declared and invoked at parse time as `(async function init() { ... })()`. The return value of the invocation is a `Promise<void>` that is not awaited by any other code in this file.

It begins by awaiting `ready`, a promise imported from `auth.ts` that resolves when auth initialization is complete. After `ready` resolves, it calls `getSupabaseClient()` and assigns the result to `state.sb`, then writes `state.app` and `state.loading` by querying the DOM for `#app` and `#loading`. It calls `getCurrentUser()` and `getIsPlaceholderMode()` to set `state.isLoggedIn` to true only if a user exists and is not in placeholder mode.

It attaches a `click` listener to `#back-btn`. When that button is clicked, if `document.referrer` is non-empty and contains `location.host`, the listener calls `history.back()`; otherwise it navigates to `'/'`.

It calls `getCurrentUser()` again: if it returns a truthy value, it looks up `#join-btn` and, if found, sets its `style.display` to `'none'`.

It reads the `id` query parameter from `window.location.search` via `URLSearchParams`. If `debateId` is non-null and fails a UUID regex test (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`), it writes `'<div class="error-state">Invalid debate link.</div>'` to `state.app.innerHTML`, hides `state.loading`, and returns early. If `debateId` is null, it writes a different error message with a home link to `state.app.innerHTML`, hides `state.loading`, and returns early.

If `debateId` passes validation, it writes `state.debateId = debateId`. It then registers a `beforeunload` listener on `window` that calls `clearInterval` on both `state.pollTimer` and `state.chatPollTimer` if they are set. Finally, it calls `loadDebate()` without awaiting it, and the function returns.

## Agent 05

### startPolling

`startPolling` is async and returns `Promise<void>`. It reads `state.pollTimer` and `state.debateId` from module-level state. On entry, if `state.pollTimer` is already set, it calls `clearInterval(state.pollTimer)` to cancel any existing interval before creating a new one. It then sets `state.pollTimer` to the return value of `setInterval`, registering a callback that fires every 5000 milliseconds.

Inside the interval callback, the code first calls `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })` and awaits the result. If that call returns an error or no data, the callback falls back to a direct PostgREST query against the `arena_debates` table via `state.sb`, selecting all columns and filtering by `state.debateId`. If that direct query returns data, it constructs a `SpectateDebate` object by spreading the raw row and supplying debater names from `state.debateData` or the string literals `'Side A'` / `'Side B'`. If the RPC succeeds, `freshDebate` is set to `rpcData` cast as `SpectateDebate`. If `freshDebate` is still `null` after both paths, the callback returns early. Next, the callback reads the DOM element with id `spectator-count` and, if found, sets its `textContent` to the string form of `Number(freshDebate.spectator_count) || 1`. It reads `freshDebate.vote_count_a` and `vote_count_b` (defaulting to `0`) and, if either is nonzero, calls `updateVoteBar(freshVA, freshVB)` and `updatePulse(freshVA, freshVB)`. It then attempts to fetch messages by calling `safeRpc('get_debate_messages', { p_debate_id: state.debateId })` inside a nested `try` block. If that throws, it falls back to a direct PostgREST query on `debate_messages` ordered by `round` and `created_at` with a limit of 100. If the resulting `allMessages` array is non-empty and the DOM element with id `messages` exists, it compares `allMessages.length` to `state.lastRenderedMessageCount`; if there are new messages, it slices the new portion, calls `renderMessages(newMessages, freshDebate)` to produce HTML, checks whether the messages container is scrolled within 80 pixels of the bottom, appends the HTML via `insertAdjacentHTML('beforeend', ...)`, updates `state.lastRenderedMessageCount` to `allMessages.length`, and conditionally calls `messagesEl.scrollTo` with smooth behavior. Finally, if `freshDebate.status` is `'complete'`, `'completed'`, `'cancelled'`, or `'canceled'`, the callback calls `clearInterval(state.pollTimer!)` and sets `state.pollTimer = null`, then clears `state.chatPollTimer` if set, writes `freshDebate` to `state.debateData`, calls `renderSpectateView(freshDebate, allMessages)`, and fire-and-forgets a dynamic import of `'../onboarding-drip.ts'` to call `triggerDripDay(3)`. The entire interval callback body is wrapped in a `try/catch` that logs a warning on any error without rethrowing.

---

### loadDebate

`loadDebate` is async and returns `Promise<void>`. The entire body is wrapped in a top-level `try/catch`; on any uncaught error it calls `showError` with the error message. It reads `state.debateId` and `state.sb` from module-level state.

It first calls `safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })` and awaits the result. The result is inspected in a three-way branch. If `rpcErr` is set, the code falls back to a direct PostgREST query on `arena_debates` with a join to both debater profiles via foreign key aliases `debater_a_profile` and `debater_b_profile`. If that query fails (`directErr` is set or `directData` is null), it issues a further fallback: a bare `select('*')` query on `arena_debates` with no profile join. If that also fails, it calls `showError` and returns early. If the bare query succeeds, it builds a minimal `SpectateDebate` with placeholder names `'Side A'` / `'Side B'` and Elo 1200. If the profile-joined query succeeds, it extracts display names, Elo ratings, and avatar URLs from the joined profile objects (defaulting to `'Side A'` / `'Side B'` and 1200 if fields are absent). If `rpcData` is null but `rpcErr` is not set, it calls `showError('Debate not found or has been removed.')` and returns early. If `rpcData` is present and no error, it sets `debate = rpcData` directly.

After a `debate` value is obtained, `state.debateData` is set to it. If `debate.status === 'live'`, the function sets `window.location.href` to `'/?spectate=' + encodeURIComponent(state.debateId!)` and returns immediately — the redirect terminates further execution. Otherwise, it updates `document.title` and two `<meta>` OG tags (`og:title`, `og:description`) by reading `debate.topic` and the debater names. It then fires three `safeRpc` calls as fire-and-forget (each `.catch`-logged): `bump_spectator_count`, `log_debate_watch`, and `log_event` with event type `'spectate_view'`.

Next it awaits a message load: it tries `safeRpc('get_debate_messages', ...)` and on throw falls back to a direct PostgREST query on `debate_messages` ordered by `round` and `created_at` ascending, limit 100. It then awaits a spectator chat load via `safeRpc('get_spectator_chat', ...)` inside a `try/catch`; on success it writes to `state.chatMessages` and sets `state.lastChatMessageAt` to the `created_at` of the last message if any; on catch it sets `state.chatMessages = []`. If `debate.status` is `'complete'` or `'completed'`, it awaits `safeRpc('get_debate_replay_data', ...)` inside a `try/catch`; on success it writes the result to `state.replayData`; on catch it logs a warning and sets `state.replayData = null`. It then calls `renderSpectateView(debate, messages)`. Finally, it checks whether `debate.status` is `'live'`, `'pending'`, `'round_break'`, or `'voting'`; if so, it calls `startPolling()` and `startChatPolling()`; otherwise it calls `nudge('replay_entry', '...')`.

---

### init

`init` is an async IIFE (immediately invoked function expression) declared at line 224. It is not callable from outside this module — it executes once at module load time. It first awaits the `ready` promise imported from `auth.ts`, which blocks until auth initialization completes. After that resolves, it assigns `state.sb = getSupabaseClient()`, reads `document.getElementById('app')` into `state.app`, reads `document.getElementById('loading')` into `state.loading`, and sets `state.isLoggedIn` to `true` if and only if `getCurrentUser()` returns a truthy value and `getIsPlaceholderMode()` returns falsy.

It then registers a `click` handler on the element with id `back-btn`. That handler checks `document.referrer`: if it is non-empty and contains `location.host`, it calls `history.back()`; otherwise it sets `window.location.href = '/'`. Separately, if `getCurrentUser()` is truthy, it looks up the element with id `join-btn` and sets its `display` style to `'none'`.

It reads the `id` query parameter from `window.location.search` via `URLSearchParams`. If `debateId` is present, it validates the value against a UUID regex (`/^[0-9a-f]{8}-...-[0-9a-f]{12}$/i`). If validation fails, it writes an error message to `state.app.innerHTML`, hides `state.loading`, and returns. If `debateId` is absent entirely, it writes a different error message (with a home link) to `state.app.innerHTML`, hides `state.loading`, and returns. If the UUID is present and valid, it sets `state.debateId = debateId`. It then registers a `beforeunload` event listener on `window` that calls `clearInterval` on both `state.pollTimer` and `state.chatPollTimer` if they are set. Finally, it calls `loadDebate()` without awaiting it — the call is fire-and-forget relative to the IIFE's own async context.
