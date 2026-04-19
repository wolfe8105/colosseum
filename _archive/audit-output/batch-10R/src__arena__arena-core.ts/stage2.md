# Stage 2 — Runtime Walk: src/arena/arena-core.ts

Batch: 10R
Agents: 5 (independent, parallel)
Anchor list: 9 functions

---

## Agent 01

### isPlaceholder (line 36)
Returns a boolean indicating whether the arena is in a degraded or placeholder state. Calls `getSupabaseClient()` — if it returns a falsy value (null/undefined), the function returns `true`. Also returns `true` if the module-level `isAnyPlaceholder` flag from config is truthy. Returns `false` only when both conditions are clear, meaning a real Supabase client exists and no placeholder flag is set.

### formatTimer (line 40)
Converts a raw second count into a `"M:SS"` display string. Divides `sec` by 60 with `Math.floor` to get minutes, takes the remainder for seconds. Pads the seconds component with a leading zero if it is less than 10. Returns the formatted string with no side effects.

### randomFrom (line 46)
Selects and returns a uniformly random element from a readonly typed array. Multiplies `Math.random()` by the array length, floors the result to get an integer index, and returns the element at that index. The non-null assertion (`!`) suppresses the TypeScript undefined possibility. Has no side effects and does not mutate the array.

### pushArenaState (line 54)
Pushes a new entry onto the browser history stack via `history.pushState`, storing `{ arenaView: viewName }` as the state object with an empty title string. This records the current arena view so that the popstate handler can later identify which view was active. No return value; the sole side effect is the history mutation.

### _onPopState (line 58)
Handles browser back-navigation events by tearing down UI overlays and cleaning up the currently active arena view. First, it unconditionally removes three overlay elements by ID (`arena-rank-overlay`, `arena-ruleset-overlay`, `arena-mode-overlay`). If a `mod-ruling-overlay` exists, it clears the ruling countdown interval and removes that overlay too. If the current view is `'room'` or `'preDebate'`, it clears the round timer and ruling countdown intervals, stops the reference poll, opponent poll, and mod status poll; if the debate mode is `'live'`, it also calls `cleanupFeedRoom()` and `leaveDebate()` to tear down WebRTC and feed state. If the view is `'queue'`, it clears queue timers and — provided the client is not a placeholder — fires a `leave_debate_queue` RPC (errors are caught and logged as warnings). If the view is `'matchFound'`, it clears match-accept timers and nulls out `matchFoundDebate`. Finally, unless the current view is already `'lobby'`, it dynamically imports `arena-lobby.ts` and calls `renderLobby()` to return to the lobby UI. This handler is registered on `window` at module load time via `window.addEventListener('popstate', _onPopState)`.

### init (line 96)
Bootstraps the arena module if the `FEATURES.arena` flag is enabled. Returns immediately if the feature flag is off. Otherwise calls `injectCSS()` to inject arena styles, then locates the `#screen-arena` DOM element and stores it via `set_screenEl`; if the element is absent it warns to the console and returns early. Dynamically imports `arena-lobby.ts` and calls `renderLobby()`; if the `shop=1` query param is present, also calls `showPowerUpShop()`. Checks the `joinCode` query param: if present, strips it from the URL with `replaceState` and calls `joinWithCode()` with the uppercased code. If no `joinCode` is found, attempts to read `mod_pending_challenge` from `localStorage`, and if found, removes it, cleans the URL, and calls `joinWithCode()` with the stored code (localStorage errors are silently swallowed). Finally, checks for a `spectate` query param; if present and it matches a full UUID regex, strips the param from the URL and calls `enterFeedRoomAsSpectator()` with that ID. This function is called at module load time via `ready.then(() => init()).catch(() => init())`, ensuring it runs after auth resolves regardless of success or failure.

### getView (line 139)
Returns the current arena view string by reading the module-level `view` state variable imported from `arena-state.ts`. No side effects, no arguments, no branching — a pure state accessor.

### getCurrentDebate (line 143)
Returns a shallow copy of the current debate object, or `null` if no debate is active. Reads the module-level `currentDebate` state variable; if it is truthy, spreads it into a new object (`{ ...currentDebate }`) before returning to prevent external callers from mutating shared state. Returns `null` directly when `currentDebate` is falsy.

### destroy (line 151)
Performs full arena teardown, typically called when the user navigates away from the arena page. If a live debate is active (`currentDebate?.mode === 'live'`), calls `cleanupFeedRoom()` and `leaveDebate()` to shut down the feed and WebRTC connection. Always calls `cleanupPendingRecording()` to abort any in-progress voice memo, then `resetState()` to zero out all arena state module variables. Finally removes the `_onPopState` handler from `window` to prevent stale event handling after the arena is torn down.

---

## Agent 02

### isPlaceholder (line 36)
Returns a boolean indicating whether the arena is operating in a degraded or placeholder state. Calls `getSupabaseClient()` and treats a falsy result (no client initialized) as a placeholder condition. Also ORs in the module-level `isAnyPlaceholder` flag imported from config. Returns `true` if either condition holds, `false` only when a Supabase client exists and `isAnyPlaceholder` is false. No side effects.

### formatTimer (line 40)
Converts a raw seconds count into a `"M:SS"` display string. Computes whole minutes via `Math.floor(sec / 60)` and the remainder seconds via `sec % 60`. Zero-pads the seconds component with a leading `'0'` when it is less than 10. Returns the formatted string; no side effects, no error handling needed.

### randomFrom (line 46)
Picks and returns a uniformly random element from a readonly typed array. Generates a random index by multiplying `Math.random()` by the array length and flooring the result. Uses a non-null assertion on the result, so passing an empty array produces `undefined` at runtime despite the return type. No side effects.

### pushArenaState (line 54)
Pushes a new browser history entry with a state object `{ arenaView: viewName }` and an empty title string. Wraps a single call to `history.pushState`. This enables the `popstate` handler to identify arena navigation events. No return value, no error handling, no other side effects.

### _onPopState (line 58)
Handles browser back-navigation within the arena by tearing down whatever state was active. First unconditionally removes three overlay elements (`arena-rank-overlay`, `arena-ruleset-overlay`, `arena-mode-overlay`) from the DOM if present, and clears the ruling countdown interval and removes `mod-ruling-overlay` if it exists. Then branches on the current `view` value: if `'room'` or `'preDebate'`, clears `roundTimer` and `_rulingCountdownTimer` intervals, stops the reference poll, opponent poll, and mod-status poll, and if the debate mode is `'live'` also calls `cleanupFeedRoom()` and `leaveDebate()`. If `view` is `'queue'`, calls `clearQueueTimers()` and, when not in placeholder mode, fires `safeRpc('leave_debate_queue')` with a `.catch` that logs a warning. If `view` is `'matchFound'`, calls `clearMatchAcceptTimers()` and sets `matchFoundDebate` to null via its setter. Finally, if the current view is anything other than `'lobby'`, dynamically imports `arena-lobby.ts` and calls `renderLobby()` to return the user to the lobby. This handler is registered on `window` immediately at module evaluation time.

### init (line 96)
Bootstraps the arena when called after auth is ready. Returns immediately if `FEATURES.arena` is disabled. Calls `injectCSS()` to load arena styles, then looks up `#screen-arena` in the DOM and stores it via `set_screenEl`; warns and returns if the element is absent. Dynamically imports `arena-lobby.ts` and calls `renderLobby()`, then conditionally calls `showPowerUpShop()` if the `shop=1` query param is present. Checks for a `joinCode` query param: if found, cleans the URL with `replaceState` and calls `joinWithCode()` with the uppercased code. Otherwise checks `localStorage` for a `mod_pending_challenge` key, removes it if found, cleans the URL, and calls `joinWithCode()` with that value; localStorage errors are silently swallowed. Finally, checks for a `spectate` query param, validates it as a UUID with a regex, and if valid cleans the URL and calls `enterFeedRoomAsSpectator()`. All async calls are fire-and-forget via `void`.

### getView (line 139)
Returns the current arena view string by reading the module-level `view` variable from `arena-state.ts`. No logic, no side effects, no error handling. The return type is `ArenaView`.

### getCurrentDebate (line 143)
Returns a shallow copy of the current debate object, or `null` if none exists. Uses a ternary: if `currentDebate` is truthy, spreads it into a new object (`{ ...currentDebate }`) and returns that copy, preventing external mutation of state. Returns `null` directly when `currentDebate` is falsy. No side effects.

### destroy (line 151)
Tears down all arena state when the arena module is being unloaded. If the current debate mode is `'live'`, calls `cleanupFeedRoom()` and `leaveDebate()` to release WebRTC and feed resources. Calls `cleanupPendingRecording()` to discard any in-progress voice memo. Calls `resetState()` to zero out all arena state variables. Removes the `_onPopState` handler from `window` to prevent stale event callbacks. No return value.

---

## Agent 03

### isPlaceholder (line 36)
Returns `true` if the Supabase client is not yet initialized (i.e., `getSupabaseClient()` returns a falsy value) or if `isAnyPlaceholder` from config is truthy. Both conditions indicate the app is running in a degraded or pre-auth state where real backend calls should be suppressed. Returns `false` only when both the client exists and the placeholder flag is clear. No side effects.

### formatTimer (line 40)
Converts a raw second count into a `"M:SS"` display string. Divides by 60 (floor) for minutes, takes modulo 60 for seconds, then zero-pads the seconds component if it is less than 10. Returns the formatted string; no side effects.

### randomFrom (line 46)
Selects and returns a uniformly random element from a read-only typed array using `Math.random()` scaled to the array length and floored to an integer index. The non-null assertion (`!`) suppresses the TypeScript undefined concern; if called with an empty array it returns `undefined` at runtime despite the return type. No side effects.

### pushArenaState (line 54)
Pushes a new browser history entry by calling `history.pushState` with a state object `{ arenaView: viewName }` and an empty title string. This allows the popstate handler to later detect arena navigation when the user presses the browser back button. No return value; no other side effects beyond mutating the browser history stack.

### _onPopState (line 58)
Fires on every browser `popstate` event (registered immediately at module load via `window.addEventListener`). First unconditionally removes three overlay elements (`arena-rank-overlay`, `arena-ruleset-overlay`, `arena-mode-overlay`) from the DOM if present, and removes the mod-ruling overlay while also clearing its countdown interval. Then branches on the current `view` value: if `room` or `preDebate`, it clears `roundTimer` and `_rulingCountdownTimer` intervals, stops reference, opponent, and mod-status polls, and if the current debate mode is `live` also calls `cleanupFeedRoom()` and `leaveDebate()`. If `view` is `queue`, it clears queue timers and fires a `leave_debate_queue` RPC (guarded by `isPlaceholder()` check, errors are swallowed with a warning). If `view` is `matchFound`, it clears match-accept timers and nulls out `matchFoundDebate`. Finally, if the current view is anything other than `lobby`, it dynamically imports `arena-lobby.ts` and calls `renderLobby()` to return the user to the lobby screen.

### init (line 96)
Entry point called after auth is ready (via `ready.then(() => init())`). If the `FEATURES.arena` flag is falsy, returns immediately with no action. Otherwise calls `injectCSS()` to inject arena styles, then looks up the `#screen-arena` DOM element and stores it via `set_screenEl`; if not found, logs a warning and returns early. Dynamically imports `arena-lobby.ts` and calls `renderLobby()`; if the `shop=1` query parameter is present it also calls `showPowerUpShop()`. Checks for a `joinCode` query parameter: if found, strips it from the URL with `replaceState` and calls `joinWithCode()` with the uppercased code. If no URL join code exists, checks `localStorage` for `mod_pending_challenge`, consuming and clearing it before calling `joinWithCode()` (localStorage errors are silently swallowed). Finally, checks for a `spectate` query parameter; if it matches a UUID pattern it strips the param from the URL and calls `enterFeedRoomAsSpectator()` with the ID.

### getView (line 139)
Returns the current arena view state by reading the module-level `view` variable from `arena-state.ts`. No logic, no side effects, no mutation — a pure accessor returning the `ArenaView` enum/string value.

### getCurrentDebate (line 143)
Returns a shallow copy of the `currentDebate` state object using spread syntax (`{ ...currentDebate }`) if it is truthy, or `null` if there is no active debate. The spread prevents external callers from directly mutating the shared state object. No side effects.

### destroy (line 151)
Tears down all arena resources. If `currentDebate` exists and its mode is `live`, calls `cleanupFeedRoom()` and `leaveDebate()` to release WebRTC and feed room resources. Unconditionally calls `cleanupPendingRecording()` to discard any in-progress voice memo, then calls `resetState()` to zero out all arena state variables. Finally removes the `_onPopState` listener from `window`, preventing stale popstate handling after the module is torn down.

---

## Agent 04

### isPlaceholder (line 36)
Returns a boolean indicating whether the arena is in a degraded or placeholder state. Calls `getSupabaseClient()` and checks the module-level `isAnyPlaceholder` flag imported from config. Returns `true` if either `getSupabaseClient()` returns a falsy value (no client initialized) or `isAnyPlaceholder` is truthy. Returns `false` only when both conditions are clear, meaning the app has a live Supabase client and is not flagged as a placeholder environment. No side effects.

### formatTimer (line 40)
Converts a raw integer number of seconds into a `MM:SS` display string. Computes minutes via `Math.floor(sec / 60)` and seconds via `sec % 60`. Zero-pads the seconds component with a leading `'0'` when it is less than 10. Returns the formatted string directly — no state mutation, no side effects.

### randomFrom (line 46)
Selects and returns a uniformly random element from a readonly typed array. Multiplies `Math.random()` by the array's length, floors the result to get an integer index, and returns the element at that index with a non-null assertion. The caller is responsible for ensuring the array is non-empty; passing an empty array produces `undefined` at runtime despite the return type signature. No side effects.

### pushArenaState (line 54)
Pushes a new entry onto the browser's History stack with a state object of the shape `{ arenaView: viewName }`. The URL is not changed — only the history state is updated. This enables `popstate` events to carry the arena view name when the user navigates back. No return value, no module state mutation.

### _onPopState (line 58)
Event handler fired whenever the browser emits a `popstate` event (back/forward navigation). First, it unconditionally removes three overlay elements (`arena-rank-overlay`, `arena-ruleset-overlay`, `arena-mode-overlay`) from the DOM if present. If the mod ruling overlay exists, it clears its countdown interval and removes the overlay. Then it branches on the current `view` state: if `view` is `'room'` or `'preDebate'`, it clears `roundTimer` and `_rulingCountdownTimer`, stops the reference poll, stops the opponent poll, stops the mod status poll, and — if the current debate mode is `'live'` — calls `cleanupFeedRoom()` and `leaveDebate()` to tear down WebRTC. If `view` is `'queue'`, it clears queue timers and, provided the app is not in placeholder mode, fires the `leave_debate_queue` RPC via `safeRpc()` (failure is caught and logged as a warning). If `view` is `'matchFound'`, it clears match-accept timers and nulls `matchFoundDebate` via `set_matchFoundDebate(null)`. Finally, unless the current view is already `'lobby'`, it dynamically imports `arena-lobby.ts` and calls `renderLobby()` to return the UI to the lobby state. The handler is registered on `window` at module load time.

### init (line 96)
Entry point that bootstraps the arena UI. Returns immediately if `FEATURES.arena` is disabled. Calls `injectCSS()` to attach arena styles, then resolves `#screen-arena` from the DOM via `document.getElementById` and stores it in module state via `set_screenEl()`; if the element is missing it logs a warning and returns early. Dynamically imports `arena-lobby.ts` and calls `renderLobby()`; if the `shop=1` query param is present it also calls `showPowerUpShop()`. Checks the `joinCode` query param: if found, strips it from the URL with `replaceState` and calls `joinWithCode()` with the uppercased code. If no `joinCode` is present, it checks `localStorage` for `mod_pending_challenge`; if found it removes the key, cleans the URL, and calls `joinWithCode()` with the stored code (localStorage errors are silently swallowed). Finally, checks the `spectate` query param; if present and it matches the UUID regex pattern, strips it from the URL and calls `enterFeedRoomAsSpectator()` with the ID. All async calls are fire-and-forget via `void`. This function is called from the module's bottom-level `ready.then(() => init()).catch(() => init())`, ensuring it runs after auth resolves regardless of whether auth succeeds or fails.

### getView (line 139)
Returns the current arena view identifier by reading the `view` variable from `arena-state.ts`. No computation, no side effects, no mutation — a pure state accessor returning an `ArenaView` string.

### getCurrentDebate (line 143)
Returns a shallow copy of the `currentDebate` state object, or `null` if no debate is active. If `currentDebate` is truthy, spreads the object into a new plain object (`{ ...currentDebate }`) so callers receive an independent snapshot that cannot mutate module state. If `currentDebate` is falsy, returns `null` directly. No side effects.

### destroy (line 151)
Tears down the entire arena module in preparation for unmounting. If the current debate mode is `'live'`, calls `cleanupFeedRoom()` and `leaveDebate()` to release WebRTC resources and feed room subscriptions. Calls `cleanupPendingRecording()` to discard any in-progress voice memo. Calls `resetState()` to zero out all arena state variables. Removes the `_onPopState` handler from `window` to prevent stale event handling after destruction. No return value.

---

## Agent 05

### isPlaceholder (line 36)
Returns a boolean indicating whether the arena is operating in a degraded or placeholder state. Calls `getSupabaseClient()` and checks the `isAnyPlaceholder` flag from config. Returns `true` if either the Supabase client is not yet initialized (falsy) or `isAnyPlaceholder` is truthy. Returns `false` only when both conditions are clear, meaning the app has a live client and no placeholder flags are active.

### formatTimer (line 40)
Converts a raw second count into a `"M:SS"` display string. Divides `sec` by 60 (floored) to get minutes, takes the remainder for seconds. Pads the seconds component with a leading zero if it is less than 10. Returns the resulting string — for example, `90` becomes `"1:30"` and `5` becomes `"0:05"`.

### randomFrom (line 46)
Selects and returns a uniformly random element from a read-only typed array. Generates a random index via `Math.floor(Math.random() * arr.length)`. Uses a non-null assertion on the access — no bounds check or empty-array guard is applied, so passing an empty array produces `undefined` at runtime despite the `T` return type.

### pushArenaState (line 54)
Pushes a new browser history entry with an `arenaView` key set to the provided `viewName` string. Calls `history.pushState` with a state object of shape `{ arenaView: viewName }` and an empty title string. Has no return value and no conditional logic — it always pushes regardless of the current history state.

### _onPopState (line 58)
Handles the browser `popstate` event, performing teardown of whatever arena view was active before the back navigation. First unconditionally removes three overlay elements by ID (`arena-rank-overlay`, `arena-ruleset-overlay`, `arena-mode-overlay`), then checks for `mod-ruling-overlay` and, if found, clears the ruling countdown interval and removes that overlay too. If the current `view` is `'room'` or `'preDebate'`, it clears the round timer, clears the ruling countdown timer again, stops the reference poll, opponent poll, and mod status poll, and additionally calls `cleanupFeedRoom()` and `leaveDebate()` if `currentDebate.mode` is `'live'`. If `view` is `'queue'`, it clears queue timers and (provided `isPlaceholder()` is false) fires a `leave_debate_queue` RPC, swallowing any rejection with a console warning. If `view` is `'matchFound'`, it clears match-accept timers and nulls `matchFoundDebate` via its setter. Finally, if the current view is not `'lobby'`, it dynamically imports `arena-lobby.ts` and calls `renderLobby()` to return the user to the lobby. This handler is registered on `window` at module load time.

### init (line 96)
Entry point for the arena module, called after the auth `ready` promise resolves. Guards immediately on `FEATURES.arena` — if that flag is falsy the function exits with no side effects. Calls `injectCSS()` to apply arena styles, then locates `#screen-arena` in the DOM and stores it via `set_screenEl`; if the element is absent it logs a warning and returns early. Dynamically imports `arena-lobby.ts` and calls `renderLobby()`, then conditionally calls `showPowerUpShop()` if the `shop=1` query parameter is present. Checks for a `joinCode` query parameter: if found, strips it from the URL via `replaceState` and calls `joinWithCode` with the uppercased code. If no URL `joinCode` exists, falls back to reading `mod_pending_challenge` from `localStorage` (deletes the key and strips the URL on hit, then calls `joinWithCode`), silently ignoring any `localStorage` access errors. Separately checks for a `spectate` query parameter, validates it against a full UUID regex, strips it from the URL, and calls `enterFeedRoomAsSpectator` with the ID if valid. All async sub-calls are fire-and-forget (`void`).

### getView (line 139)
Returns the current arena view state by reading the module-level `view` variable from `arena-state.ts`. No logic, no side effects — a pure read-through accessor returning a value of type `ArenaView`.

### getCurrentDebate (line 143)
Returns a shallow copy of the current debate object, or `null` if no debate is active. If `currentDebate` is truthy, spreads it into a new object (`{ ...currentDebate }`) to prevent external mutation of the state. The copy is shallow — nested objects within `currentDebate` are still shared by reference.

### destroy (line 151)
Tears down the entire arena module. If `currentDebate.mode` is `'live'`, calls `cleanupFeedRoom()` and `leaveDebate()` to release WebRTC and feed room resources. Always calls `cleanupPendingRecording()` to discard any in-progress voice memo, then calls `resetState()` to zero out all arena state variables. Finally removes the `_onPopState` handler from `window` so no stale popstate listeners remain after the module is torn down.
