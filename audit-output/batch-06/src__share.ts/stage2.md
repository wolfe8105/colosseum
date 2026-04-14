# Stage 2 Outputs — src/share.ts

## Agent 01

### getBaseUrl

`getBaseUrl` is a synchronous function that takes no parameters. It reads `APP.baseUrl` from the imported `APP` config object and reads `window.location.origin` from the browser. It returns `APP.baseUrl` if that value is truthy; otherwise it falls back to and returns `window.location.origin`. It writes nothing and calls no other functions.

### getStableInviteUrl

`getStableInviteUrl` is async. It reads the module-level variable `_cachedInviteUrl` and returns it immediately if it is non-null, skipping all network work. When the cache is empty, it dynamically imports `./auth.ts` via `import()` and awaits the result to obtain `safeRpc`, then awaits `safeRpc('get_my_invite_link', {})`. It casts the returned `result.data` to `{ url?: string; ref_code?: string } | null`. If `data.url` is truthy, it writes that value to `_cachedInviteUrl` and writes `data.ref_code` (or `null`) to `_cachedRefCode`, then returns `_cachedInviteUrl`. If `data.url` is absent or falsy, execution falls through the `if` block without writing either cache variable. The entire `import`-and-`safeRpc` block is wrapped in a `try/catch` that silently swallows any error and falls through. In both the falsy-data and error cases, the function calls `getBaseUrl()` and returns the string `${getBaseUrl()}/moderator-plinko.html` without caching it, leaving `_cachedInviteUrl` null for future calls.

### share

`share` is async and accepts a `ShareData` object with `title`, `text`, and `url` fields. It first checks `navigator.share`; if that API exists, it awaits `navigator.share({ title, text, url })` inside a `try/catch`. If the call succeeds, the function returns immediately. If the call throws and the error is an `Error` with `name === 'AbortError'` (the user dismissed the native share sheet), the function also returns immediately. Any other error from `navigator.share` is silently swallowed and execution continues to the fallback path. When `navigator.share` is absent or its call threw a non-abort error, the function attempts to await `navigator.clipboard.writeText(text)` inside its own `try/catch`. On success it calls `showToast('Copied to clipboard!')` and the function ends. If `clipboard.writeText` throws, the final fallback runs synchronously: it creates a `<textarea>`, sets its `value` to `text` and its `style` to position it off-screen, appends it to `document.body`, selects it, calls `document.execCommand('copy')`, removes it, and then calls `showToast('Copied to clipboard!')`. The function writes nothing to module-level state and returns `void`.

### shareResult

`shareResult` is synchronous and accepts a `ShareResultParams` object. It calls `getBaseUrl()` to construct the URL string `${getBaseUrl()}/debate/${encodeURIComponent(debateId ?? 'demo')}`. It builds a multi-line `text` string inline using the `winner`, `winnerElo`, `loser`, `loserElo`, `topic`, and `spectators` fields, supplying defaults (`'Winner'`, `1200`, `'Loser'`, `1200`, `'Debate'`, `0`) via `??` for any missing fields. It then calls `share({ title: 'Debate Result — The Moderator', text, url })` as a fire-and-forget (`void`). It returns `void` and writes nothing to module-level state.

### shareProfile

`shareProfile` is synchronous and accepts a `ShareProfileParams` object. It calls `getBaseUrl()` and encodes `username ?? userId ?? 'debater'` to build the profile URL. It resolves the display name as `displayName ?? username ?? 'Debater'`. It assembles a `text` string with emoji, the resolved name, and ELO/win/loss/streak fields (each defaulting to `1200`, `0`, `0`, `0` respectively). It calls `share({ title: '${name} — The Moderator', text, url })` as fire-and-forget (`void`). It returns `void` and writes nothing to module-level state.

### inviteFriend

`inviteFriend` is synchronous in its own execution but internally spawns async work. It calls `getStableInviteUrl()`, which returns a promise, and chains a `.then()` callback onto it, marking the whole expression as fire-and-forget with `void`. Inside the `.then()` callback, it receives the resolved `url` string, constructs the `text` string `'Think you can hold your own? Join me on The Moderator.\n\n${url}'`, and calls `share({ title: 'Join The Moderator', text, url })` as another fire-and-forget `void`. It writes nothing to module-level state and returns `void`.

### shareTake

`shareTake` is synchronous and accepts `takeId: string` and `takeText: string`. It calls `getBaseUrl()` and encodes `takeId` to build the take URL. It calls `decodeURIComponent(takeText)` to produce `decoded`. It assembles a `text` string with a fire emoji, the decoded take text, and the URL. It calls `share({ title: 'Hot Take — The Moderator', text, url })` as fire-and-forget. It returns `void` and writes nothing to module-level state.

### showPostDebatePrompt

`showPostDebatePrompt` is synchronous and accepts a `ShareResultParams` as `result`. It reads `FEATURES.shareLinks`; if that flag is falsy, it returns immediately. It reads the DOM via `document.getElementById('post-debate-share')` and removes that element if found, ensuring only one modal exists at a time. It writes `result || {}` to the module-level variable `_pendingShareResult`. It reads a `won` field from `result` by casting it to `Record<string, unknown>` — this field is not declared in `ShareResultParams`, so its presence is treated as uncertain. It creates a `<div>` with `id="post-debate-share"`, sets inline CSS to make it a fixed full-screen overlay, and sets its `innerHTML` to a bottom-sheet panel whose content (trophy vs. sword emoji, heading text, sub-text, button labels) branches on whether `won` is truthy. The `innerHTML` block contains three buttons: `post-debate-share-btn`, `post-debate-invite-btn`, and `post-debate-skip-btn`.

After injecting the HTML, the function attaches four event listeners. One is on the modal element itself: clicking the modal backdrop (`e.target === modal`) removes the modal. The other three are attached via `getElementById` calls on the buttons just written: the share button calls `shareResult(_pendingShareResult)` if `_pendingShareResult` is non-null and then removes the modal; the invite button calls `inviteFriend()` and removes the modal; the skip button removes the modal. Finally the function appends the modal to `document.body`. The function does not return a value.

### handleDeepLink

`handleDeepLink` is synchronous in its own frame but spawns async and deferred work. It reads `window.location.search` and constructs a `URLSearchParams` from it, then reads three query parameters: `ref` (as `ref`), `debate` (as `debate`), and `from` (as `challenge`).

If `ref` is non-null, it writes the value to `localStorage` under the key `'colosseum_referrer'`. It then calls `getCurrentUser()` (imported from `auth.ts`). If that returns a truthy user object, it dynamically imports `./auth.ts` as a fire-and-forget promise chain. Inside that chain, it reads `localStorage.getItem('mod_visitor_id')` as `deviceId`, then calls `safeRpc('attribute_signup', { p_ref_code: ref, ...})` — conditionally including `p_device_id: deviceId` if `deviceId` is non-null — as a second fire-and-forget `void` nested inside the import's `.then()`.

If `debate` is non-null, it calls `setTimeout(() => navigateTo('arena'), 500)`, scheduling a navigation to the arena page 500 ms later.

If `challenge` is non-null, it sanitizes the value by calling `String(challenge).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30)` to produce `safeName`, reads the `topic` query parameter (defaulting to `'Open challenge'`), and produces `safeTopic` by calling `decodeURIComponent(topic)` cast to a string and sliced to 100 characters. It then calls `setTimeout(() => showToast('⚔️ Challenge from ${safeName}: "${safeTopic}"'), 1000)`, scheduling the toast 1000 ms later. The function returns `void`. All three parameter branches are independent and non-exclusive; more than one can execute in the same call.

## Agent 02

### getBaseUrl

`getBaseUrl` is synchronous and takes no parameters. It reads the module-level import `APP` from `config.ts` and accesses `APP.baseUrl`. If that value is truthy it is returned directly; otherwise `window.location.origin` is returned as a fallback. The function writes nothing and has no side effects.

### getStableInviteUrl

`getStableInviteUrl` is async and takes no parameters. It first checks the module-level variable `_cachedInviteUrl`; if that value is non-null it is returned immediately without any network call. When the cache is empty the function dynamically imports `./auth.ts` to obtain `safeRpc`, then awaits `safeRpc('get_my_invite_link', {})`. If the returned `result.data` object contains a `url` property, that string is written to `_cachedInviteUrl`, the accompanying `ref_code` (if present) is written to `_cachedRefCode`, and the URL is returned. If `result.data` is null, missing a `url`, or if the `safeRpc` call throws, execution falls through a bare `catch` block (silently discarding the error) and the function returns the fallback string built by calling `getBaseUrl()` concatenated with `/moderator-plinko.html`. The function never writes to `_cachedRefCode` on the error path.

### share

`share` is async and accepts a `ShareData` object with `title`, `text`, and `url` fields. It first tests `navigator.share`. If that API exists it awaits `navigator.share({ title, text, url })`; on success it returns immediately. If the call throws and the error is an `AbortError` (meaning the user dismissed the native share sheet) it also returns immediately without further action. Any other error from `navigator.share` is silently swallowed and execution continues to the clipboard fallback. The clipboard branch awaits `navigator.clipboard.writeText(text)`; on success it calls `showToast('Copied to clipboard!')` and returns. If the clipboard write throws, a final fallback creates a `<textarea>` element, sets its `value` to `text`, positions it off-screen, appends it to `document.body`, calls `ta.select()`, fires the deprecated `document.execCommand('copy')`, removes the element, and calls `showToast('Copied to clipboard!')`. The function returns `void` in all branches.

### shareResult

`shareResult` is synchronous and accepts a `ShareResultParams` object. It calls `getBaseUrl()` to assemble a URL of the form `<base>/debate/<debateId>`, using the string `'demo'` when `debateId` is absent. It constructs a `text` string embedding `winner`, `winnerElo`, `loser`, `loserElo`, `topic`, and `spectators`, each falling back to a default value when the parameter is undefined. It then calls `share({ title, text, url })` as a fire-and-forget void expression. The function writes nothing to module-level state and returns `void`.

### shareProfile

`shareProfile` is synchronous and accepts a `ShareProfileParams` object. It calls `getBaseUrl()` and builds a URL of the form `<base>/u/<username>`, preferring `username` over `userId` and falling back to the string `'debater'` when both are absent. It assembles a `text` string from `displayName` (or `username`, or `'Debater'`), `elo`, `wins`, `losses`, and `streak`, each with numeric defaults. It calls `share({ title, text, url })` as a fire-and-forget void expression and returns `void`.

### inviteFriend

`inviteFriend` is synchronous at its call site but schedules async work. It calls `getStableInviteUrl()` and attaches a `.then()` callback; both the promise and the inner `share` call are fired as void expressions, making the entire operation fire-and-forget. Inside the callback, the resolved `url` is embedded in a text string and `share({ title: 'Join The Moderator', text, url })` is called, itself also fire-and-forget. The function reads no module-level state directly (the state read happens inside `getStableInviteUrl`) and writes nothing.

### shareTake

`shareTake` is synchronous and accepts `takeId` (string) and `takeText` (string). It calls `getBaseUrl()` to build a URL of the form `<base>/take/<takeId>`. It calls `decodeURIComponent(takeText)` to produce `decoded` and embeds that in a text string. It then calls `share({ title, text, url })` as a fire-and-forget void expression and returns `void`. The function writes nothing to module-level state.

### showPostDebatePrompt

`showPostDebatePrompt` is synchronous and accepts a `ShareResultParams` object as `result`. It reads `FEATURES.shareLinks` from config; if that flag is falsy it returns immediately. It queries the DOM for an element with id `'post-debate-share'` and removes it if found. It writes the `result` parameter (or an empty object if `result` is falsy) to the module-level variable `_pendingShareResult`. It reads the `won` property from `result` by casting to a plain record (the `ShareResultParams` type does not formally declare `won`, so this is a runtime duck-type read). It then creates a `<div>` with id `'post-debate-share'`, builds its inner HTML as a fixed-position bottom-sheet containing a share button, an invite button, and a skip button, and appends the element to `document.body`.

Four event listeners are registered. A click listener on the modal backdrop removes the modal when the user clicks outside the inner card. A click listener on `'post-debate-share-btn'` reads `_pendingShareResult`, and if non-null calls `shareResult(_pendingShareResult)`, then removes the modal. A click listener on `'post-debate-invite-btn'` calls `inviteFriend()` and removes the modal. A click listener on `'post-debate-skip-btn'` removes the modal. The button listeners are registered via `getElementById` with optional chaining, so if any button element is absent for any reason the listener is simply not attached. The function returns `void`.

### handleDeepLink

`handleDeepLink` is synchronous. It reads `window.location.search` and constructs a `URLSearchParams` object from it, then reads three parameters: `ref`, `debate`, and `from` (aliased as `challenge`).

If `ref` is present it is written to `localStorage` under the key `'colosseum_referrer'`. It then calls `getCurrentUser()` to check whether a user is currently authenticated. If a user exists, it dynamically imports `./auth.ts` to obtain `safeRpc`, reads `'mod_visitor_id'` from `localStorage`, and fires a void call to `safeRpc('attribute_signup', { p_ref_code: ref, ...optionalDeviceId })` as fire-and-forget. The dynamic import and the `safeRpc` call are both void expressions with no error handling.

If `debate` is present, `navigateTo('arena')` is scheduled via `setTimeout` with a 500 ms delay.

If `challenge` is present, the raw value is sanitized by stripping any character outside `[a-zA-Z0-9_]` and truncating to 30 characters. A `topic` parameter is read from the URL params, falling back to `'Open challenge'`, then decoded via `decodeURIComponent` and truncated to 100 characters. `showToast(...)` is scheduled via `setTimeout` with a 1000 ms delay. All three parameter branches are independent — multiple may execute in the same call. The function returns `void`.

## Agent 03

### getBaseUrl

`getBaseUrl` is a synchronous function that takes no parameters. It reads `APP.baseUrl` from the imported `APP` object in `config.ts` and, if that value is falsy, falls back to reading `window.location.origin` from the browser. It returns the resolved string directly and writes no state.

### getStableInviteUrl

`getStableInviteUrl` is an async function that takes no parameters. It first checks the module-level variable `_cachedInviteUrl`; if it is non-null, it returns that cached value immediately without any network activity. On a cache miss, it dynamically imports `./auth.ts` to obtain `safeRpc` and then awaits `safeRpc('get_my_invite_link', {})`. If the returned `data` object contains a `url` property, it writes that string to `_cachedInviteUrl` and also writes `data.ref_code` (or `null`) to `_cachedRefCode`, then returns `_cachedInviteUrl`. If the RPC throws, the `catch` block silently swallows the error and falls through. If the call succeeds but `data.url` is absent, or if the catch block runs, the function calls `getBaseUrl()` to build a fallback string and returns `${getBaseUrl()}/moderator-plinko.html` without writing any cached state. The module-level `_cachedRefCode` is set only on a successful RPC response that includes a `ref_code` field.

### share

`share` is an async function that receives a `ShareData` object containing `title`, `text`, and `url` strings. It first tests `navigator.share`; if that property exists on the browser, it awaits `navigator.share({ title, text, url })` and returns early on success. If `navigator.share` throws and the error is an `AbortError` (meaning the user dismissed the share sheet), it also returns early without any further action. Any other error from `navigator.share` causes the function to fall through to the clipboard path. In the clipboard path, it awaits `navigator.clipboard.writeText(text)` and, on success, calls `showToast('Copied to clipboard!')`. If `navigator.clipboard.writeText` throws, a final fallback runs: a `textarea` element is created and appended to `document.body`, its `value` is set to `text`, `select()` is called on it, the deprecated `document.execCommand('copy')` is invoked, the element is removed from the DOM, and `showToast('Copied to clipboard!')` is called. The function returns `void` in all paths and writes no module-level state.

### shareResult

`shareResult` is a synchronous function that receives a `ShareResultParams` object. It calls `getBaseUrl()` to build a `url` string incorporating `debateId` (defaulting to `'demo'` if absent). It constructs a `text` string from `winner`, `winnerElo`, `loser`, `loserElo`, `topic`, and `spectators`, each with a fallback default. It then calls `share({ title: 'Debate Result — The Moderator', text, url })` as a fire-and-forget call (the returned promise is discarded with `void`). The function returns `void` and writes no state.

### shareProfile

`shareProfile` is a synchronous function that receives a `ShareProfileParams` object. It calls `getBaseUrl()` and constructs a `url` using `username` if present, falling back to `userId`, and then to the literal string `'debater'`. It builds a `name` string from `displayName`, then `username`, then `'Debater'`. It assembles a `text` string with ELO, win, loss, and streak figures, each defaulting to `0` or `1200` if absent. It calls `share({ title, text, url })` as a fire-and-forget call. Returns `void` and writes no state.

### inviteFriend

`inviteFriend` is a synchronous function that takes no parameters. It calls `getStableInviteUrl()` and attaches a `.then()` callback; both the promise and the inner `share` call are fire-and-forget (`void`). Inside the callback, once `getStableInviteUrl()` resolves with a `url` string, it constructs a `text` string and calls `share({ title: 'Join The Moderator', text, url })`, which is itself also discarded with `void`. The function returns `void` immediately and writes no state.

### shareTake

`shareTake` is a synchronous function that receives two strings: `takeId` and `takeText`. It calls `getBaseUrl()` to construct a `url` with `takeId` percent-encoded. It calls `decodeURIComponent(takeText)` to produce a `decoded` string and incorporates it into `text`. It then calls `share({ title: 'Hot Take — The Moderator', text, url })` as a fire-and-forget call. Returns `void` and writes no state.

### showPostDebatePrompt

`showPostDebatePrompt` is a synchronous function that receives a `ShareResultParams` object assigned to `result`. It reads `FEATURES.shareLinks` from the imported config and returns immediately if that flag is falsy. It queries the DOM for an element with id `'post-debate-share'` and removes it if found, preventing duplicate modals. It then writes `result || {}` to the module-level variable `_pendingShareResult`. It reads `result.won` via a type-cast index access to determine which copy to display.

The function creates a `div` element, sets its `id` to `'post-debate-share'`, and sets an inline `style` for fixed full-screen overlay positioning. It sets `modal.innerHTML` to a string containing a bottom-sheet panel whose heading and icon differ based on the truthiness of `won`. The inner HTML contains three buttons with ids `'post-debate-share-btn'`, `'post-debate-invite-btn'`, and `'post-debate-skip-btn'`. A click listener is added to `modal` itself: if the click target is the overlay backdrop (i.e., `e.target === modal`), `modal.remove()` is called. The modal is appended to `document.body`. Three separate event listeners are then wired to the three buttons via `getElementById`: the share button reads `_pendingShareResult` and, if non-null, calls `shareResult(_pendingShareResult)` then removes the modal; the invite button calls `inviteFriend()` then removes the modal; the skip button only removes the modal. All button callbacks are synchronous from the perspective of `showPostDebatePrompt`; the async work initiated by `shareResult` and `inviteFriend` runs independently.

### handleDeepLink

`handleDeepLink` is a synchronous function that takes no parameters. It reads `window.location.search` and constructs a `URLSearchParams` object from it. It extracts three params: `ref`, `debate` (via key `'debate'`), and `challenge` (via key `'from'`).

If `ref` is present, it writes the value to `localStorage` under the key `'colosseum_referrer'`. It then calls `getCurrentUser()` from `auth.ts` to check whether a user is currently authenticated. If a user exists, it dynamically imports `./auth.ts` to obtain `safeRpc`, reads `localStorage.getItem('mod_visitor_id')` as an optional `deviceId`, and calls `safeRpc('attribute_signup', { p_ref_code: ref, ...deviceId })` as a fire-and-forget call (both the import promise and the RPC call are discarded with `void`).

If `debate` is present, a `setTimeout` of 500 ms is registered that calls `navigateTo('arena')` when it fires.

If `challenge` is present, the raw `from` param value is sanitized by stripping all characters outside `[a-zA-Z0-9_]` and truncating to 30 characters, stored as `safeName`. The `topic` param is read and decoded with `decodeURIComponent`, defaulting to `'Open challenge'`, then truncated to 100 characters as `safeTopic`. A `setTimeout` of 1000 ms is registered that calls `showToast` with a formatted challenge string. The function returns `void` and writes only to `localStorage`.

## Agent 04

### getBaseUrl

`getBaseUrl` is a synchronous function that takes no parameters. It reads `APP.baseUrl` from the imported `APP` config object and reads `window.location.origin` from the browser API. It returns `APP.baseUrl` if that value is truthy, otherwise it returns `window.location.origin`. It writes nothing. It calls no other functions from the module.

### getStableInviteUrl

`getStableInviteUrl` is an async function that takes no parameters. It first checks the module-level variable `_cachedInviteUrl`; if it is non-null, it returns that value immediately without any network call. If not cached, it dynamically imports `./auth.ts` to obtain `safeRpc` and then awaits a call to `safeRpc('get_my_invite_link', {})`. If the RPC result contains a `url` field, it writes that value to `_cachedInviteUrl` and also writes the `ref_code` field (or `null` if absent) to the module-level variable `_cachedRefCode`, then returns `_cachedInviteUrl`. If the RPC call throws or if the result contains no `url`, the catch block silently swallows the error and the function falls through to a fallback return value: the string formed by calling `getBaseUrl()` concatenated with `/moderator-plinko.html`. In the fallback path, neither `_cachedInviteUrl` nor `_cachedRefCode` is written.

### share

`share` is an async function that destructures a `ShareData` object parameter into `title`, `text`, and `url`. It reads `navigator.share` to determine whether the Web Share API is available. If `navigator.share` is truthy, it awaits `navigator.share({ title, text, url })`; if that call succeeds, the function returns immediately. If the call throws an `AbortError` (the user cancelled the share sheet), the function also returns immediately without further action. If the call throws any other error, execution falls through to the clipboard path. If `navigator.share` is falsy or if a non-`AbortError` was thrown, the function attempts to await `navigator.clipboard.writeText(text)`. On success it calls `showToast('Copied to clipboard!')` and returns. If `navigator.clipboard.writeText` throws, it enters a final fallback: it creates a `<textarea>` element, sets its `value` to `text`, appends it to `document.body` with off-screen CSS, selects the text, calls the deprecated `document.execCommand('copy')`, removes the element, and calls `showToast('Copied to clipboard!')`. The function returns `void` and writes nothing to module-level state.

### shareResult

`shareResult` is a synchronous function that accepts a `ShareResultParams` object. It calls `getBaseUrl()` to form the debate URL, constructing it as `<baseUrl>/debate/<encoded debateId>` (defaulting `debateId` to `'demo'` if absent). It assembles a `text` string embedding `winner`, `winnerElo`, `loser`, `loserElo`, `topic`, and `spectators`, each falling back to a default if the parameter is absent. It then calls `share({ title: 'Debate Result — The Moderator', text, url })` as a fire-and-forget call (the returned promise is discarded with `void`). It writes nothing to module-level state and has no error path of its own.

### shareProfile

`shareProfile` is a synchronous function that accepts a `ShareProfileParams` object. It calls `getBaseUrl()` and builds a profile URL as `<baseUrl>/u/<encoded username or userId>`, defaulting to `'debater'` if both are absent. It computes a display name from `displayName`, then `username`, then `'Debater'`. It assembles a `text` string embedding the name, `elo`, `wins`, `losses`, and `streak`, each defaulting to zero or 1200. It calls `share({ title: '<name> — The Moderator', text, url })` as fire-and-forget via `void`. It writes nothing to module-level state and has no error path of its own.

### inviteFriend

`inviteFriend` is a synchronous function that takes no parameters. It calls `getStableInviteUrl()` and chains a `.then()` callback onto the returned promise, discarding the outer promise with `void`. Inside the callback, it assembles a `text` string embedding the resolved URL, then calls `share({ title: 'Join The Moderator', text, url })`, also discarded with `void`. Both promises are fire-and-forget. No module-level state is written. Any rejection from `getStableInviteUrl` is unhandled (the `.then` has no `.catch`), though `getStableInviteUrl` itself never rejects — it catches internally and returns a fallback URL.

### showPostDebatePrompt

`showPostDebatePrompt` is a synchronous function that accepts a `ShareResultParams` value as `result`. It first reads `FEATURES.shareLinks`; if that flag is falsy, it returns immediately without further action. It then queries the DOM for an element with `id='post-debate-share'` and removes it if found, preventing duplicate modals. It writes `result || {}` to the module-level variable `_pendingShareResult`. It reads a `won` property from `result` via a runtime cast (the property is not declared on `ShareResultParams`, so this is an uncertain read that may always be `undefined` unless the caller passes extra fields). Based on whether `won` is truthy, it constructs different trophy icon, heading text, color, and subtext strings. It creates a `<div>` element, sets its `id` to `'post-debate-share'` and inline styles for a full-viewport overlay, and sets its `innerHTML` to a template containing three buttons: `post-debate-share-btn`, `post-debate-invite-btn`, and `post-debate-skip-btn`. It attaches a click listener on the outer modal element that removes the modal when the user clicks the backdrop. It appends the modal to `document.body`. It then queries each button by ID and attaches click listeners: the share button calls `shareResult(_pendingShareResult)` using the current module-level value of `_pendingShareResult` then removes the modal; the invite button calls `inviteFriend()` then removes the modal; the skip button removes the modal. The function writes to the DOM and to `_pendingShareResult` but returns `void`.

### handleDeepLink

`handleDeepLink` is a synchronous function that takes no parameters. It reads `window.location.search`, constructs a `URLSearchParams` object, and extracts three parameters: `ref`, `debate`, and `from` (stored as `challenge`). If `ref` is present, it writes the value to `localStorage` under the key `'colosseum_referrer'` and then calls `getCurrentUser()` to read the current auth state. If a user is returned, it dynamically imports `./auth.ts` to obtain `safeRpc` and fires a fire-and-forget call to `safeRpc('attribute_signup', { p_ref_code: ref, ...optionally p_device_id })`, where `p_device_id` is read from `localStorage` under `'mod_visitor_id'` if present. Both the dynamic import and the `safeRpc` call are discarded with `void` — rejections are unhandled. If `debate` is present, a `setTimeout` of 500ms is scheduled that calls `navigateTo('arena')`. If `challenge` (the `from` param) is present, the raw string is sanitized by stripping all characters outside `[a-zA-Z0-9_]` and truncating to 30 characters. The `topic` query parameter is read and decoded via `decodeURIComponent`, defaulting to `'Open challenge'`, then truncated to 100 characters. A `setTimeout` of 1000ms is scheduled that calls `showToast` with a formatted challenge string. The three branches (`ref`, `debate`, `challenge`) are independent and all three can execute in the same call if all three params are present. The function returns `void` and has no try/catch; the only guarded code path is the inner async work for `ref` attribution, which uses fire-and-forget.

## Agent 05

### getBaseUrl

`getBaseUrl` is a synchronous function that takes no parameters. It reads `APP.baseUrl` from the imported `APP` config object and reads `window.location.origin` from the browser API. It returns `APP.baseUrl` if that value is truthy; otherwise it returns `window.location.origin`. It writes nothing and calls no other functions.

### getStableInviteUrl

`getStableInviteUrl` is an async function that takes no parameters. On entry it reads the module-level variable `_cachedInviteUrl`; if that variable is non-null, it returns it immediately without doing any further work. When the cache is empty, it dynamically imports `./auth.ts` to destructure `safeRpc`, then awaits a call to `safeRpc('get_my_invite_link', {})`. It treats the result's `data` field as an object that may carry `url` and `ref_code` string properties. If `data.url` is present, it writes that value to `_cachedInviteUrl` and writes `data.ref_code` (or `null`) to `_cachedRefCode`, then returns the cached URL. If the RPC returns no `url`, or if any exception is thrown during the import or RPC call, the catch block silently swallows the error and execution falls through to the fallback return, which calls `getBaseUrl()` and appends `/moderator-plinko.html` to form the returned string. `_cachedRefCode` is only written on the success path; the fallback path leaves it untouched.

### share

`share` is an async function that destructures `title`, `text`, and `url` from a single `ShareData` argument. It first checks `navigator.share`. If the Web Share API is available, it awaits `navigator.share({ title, text, url })` inside a try block; if that call throws an `AbortError` (user dismissed the share sheet), the function returns early without further action. Any other error from `navigator.share` is swallowed, and execution continues to the clipboard fallback. In the clipboard path, it awaits `navigator.clipboard.writeText(text)` inside a second try block; on success it calls `showToast('Copied to clipboard!')` and returns. If the clipboard write throws, a final fallback runs synchronously: a `textarea` element is created, given a value of `text`, positioned off-screen, appended to `document.body`, selected, subjected to the deprecated `document.execCommand('copy')`, then removed from the DOM. After that, `showToast('Copied to clipboard!')` is called. The function returns `void` on all paths.

### shareResult

`shareResult` is a synchronous function that destructures `debateId`, `topic`, `winner`, `winnerElo`, `loser`, `loserElo`, and `spectators` from a `ShareResultParams` argument, applying defaults inline for each via the nullish coalescing operator when a property is absent. It calls `getBaseUrl()` to build a URL string of the form `<baseUrl>/debate/<encodedDebateId>`. It assembles a multi-line `text` string embedding winner name, Elo, loser name, Elo, topic, spectator count, and the URL. It then calls `share({ title: 'Debate Result — The Moderator', text, url })` as a fire-and-forget (prefixed with `void`). The function returns `void` and writes nothing to module-level state.

### shareProfile

`shareProfile` is a synchronous function that destructures `userId`, `username`, `displayName`, `elo`, `wins`, `losses`, and `streak` from a `ShareProfileParams` argument. It calls `getBaseUrl()` and constructs a URL using `username` if present, falling back to `userId`, then to the string `'debater'`. It assembles a `text` string with display name, ELO, win/loss counts, and streak, then calls `share({ title: '<name> — The Moderator', text, url })` as a fire-and-forget `void` call. The function returns `void` and writes nothing to module-level state.

### inviteFriend

`inviteFriend` is a synchronous function that takes no parameters. It calls `getStableInviteUrl()` as a fire-and-forget (the outer `void` wraps the entire `.then()` chain). Inside the `.then()` callback, the resolved `url` is incorporated into a `text` string inviting someone to join The Moderator, and `share({ title: 'Join The Moderator', text, url })` is called as another fire-and-forget `void` call. If `getStableInviteUrl()` rejects, the rejection is unhandled (no `.catch()` is attached). The function returns `void` immediately without awaiting anything.

### shareTake

`shareTake` is a synchronous function that takes two parameters: `takeId` (a string) and `takeText` (a string). It calls `getBaseUrl()` and builds a URL of the form `<baseUrl>/take/<encodedTakeId>`. It calls `decodeURIComponent(takeText)` to produce `decoded`. It assembles a `text` string quoting `decoded` and appending the URL, then calls `share({ title: 'Hot Take — The Moderator', text, url })` as a fire-and-forget `void` call. The function returns `void` and writes nothing to module-level state.

### showPostDebatePrompt

`showPostDebatePrompt` is a synchronous function that takes a `ShareResultParams` argument named `result`. At the top it reads `FEATURES.shareLinks`; if that flag is falsy, the function returns immediately. It then queries the DOM for an element with id `post-debate-share` and, if found, removes it. It writes `result` (or an empty object if `result` is falsy) to the module-level variable `_pendingShareResult`. It reads a `won` property from `result` by casting it to `Record<string, unknown>` — this is a property not declared in `ShareResultParams`, so its presence is uncertain at compile time.

A `div` element is created with id `post-debate-share`, given fixed full-screen overlay styles, and its `innerHTML` is set to a bottom-sheet panel. The panel's heading and icon vary based on `won`: truthy renders a trophy and "YOU WON" text in accent color; falsy renders a sword-crossed icon and "GOOD DEBATE" in heading color. The panel contains three buttons: SHARE (`post-debate-share-btn`), INVITE (`post-debate-invite-btn`), and Skip (`post-debate-skip-btn`). The modal then receives a `click` listener on itself: clicking the overlay backdrop directly (i.e., `e.target === modal`) removes the modal from the DOM. The modal is appended to `document.body`. Three `addEventListener` calls attach click handlers to the three buttons by id. The SHARE button's handler reads `_pendingShareResult` and, if non-null, calls `shareResult(_pendingShareResult)`, then removes the modal. The INVITE button's handler calls `inviteFriend()` then removes the modal. The Skip button's handler removes the modal. All three button handlers are synchronous wrappers — `shareResult` and `inviteFriend` themselves fire their async work without being awaited here. The function returns `void`.

### handleDeepLink

`handleDeepLink` is a synchronous function that takes no parameters. It reads `window.location.search` and constructs a `URLSearchParams` object from it. It reads three query parameters: `ref`, `debate`, and `from` (stored as `challenge`).

If `ref` is present, it writes the value to `localStorage` under the key `'colosseum_referrer'`. It then calls `getCurrentUser()` to check whether a user is currently authenticated. If a user is returned, it dynamically imports `./auth.ts` to get `safeRpc`, then fires `safeRpc('attribute_signup', { p_ref_code: ref, ...optionalDeviceId })` as a fire-and-forget `void` call. The `p_device_id` field is included only if `localStorage.getItem('mod_visitor_id')` returns a non-null value. Any rejection from the import or RPC call is unhandled.

If `debate` is present, a `setTimeout` of 500 ms is set that calls `navigateTo('arena')` when it fires.

If `challenge` is present, the raw string is sanitized by stripping all characters outside `[a-zA-Z0-9_]` and truncating to 30 characters to produce `safeName`. A second query parameter `topic` is read (defaulting to `'Open challenge'`), decoded with `decodeURIComponent`, and truncated to 100 characters to produce `safeTopic`. A `setTimeout` of 1000 ms is set that calls `showToast(...)` with a string combining `safeName` and `safeTopic`. The three branches (`ref`, `debate`, `challenge`) are all independent `if` checks; none is mutually exclusive. The function returns `void`. At module evaluation time (line 281), `ready.then(() => handleDeepLink())` schedules the function to be called once after the auth `ready` promise resolves.
