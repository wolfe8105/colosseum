# Stage 2 Outputs — arena-core.ts

## Agent 01

### isPlaceholder

Reads `getSupabaseClient()` (a function call that returns the current Supabase client instance from the auth module) and the module-level `isAnyPlaceholder` (a module-level state variable from config.ts). Returns `true` if either the Supabase client is falsy or `isAnyPlaceholder` is true; otherwise returns `false`. No side effects.

### formatTimer

Takes a number parameter `sec` representing seconds. Calculates minutes by dividing seconds by 60 and flooring the result, and calculates remaining seconds using modulo. Constructs and returns a string in "M:SS" format, padding single-digit seconds with a leading zero.

### randomFrom

Takes a readonly array parameter `arr` of type `T`. Generates a random integer between 0 and the array length minus 1 using `Math.random()` and `Math.floor()`, then returns the element at that index. The return type is `T`.

### pushArenaState

Takes a `viewName` string parameter. Calls `history.pushState()` with an object containing `{ arenaView: viewName }`, an empty string as the title, and no URL parameter. This adds an entry to the browser history without navigating.

### _onPopState

An arrow function that is called when the browser's `popstate` event fires (registered via `window.addEventListener('popstate', _onPopState)` at the module level). It performs cascading cleanup based on the current view state.

First, it removes three overlay elements from the DOM by ID: 'arena-rank-overlay', 'arena-ruleset-overlay', and 'arena-mode-overlay'. It then queries for 'mod-ruling-overlay'; if it exists, clears the interval stored in the module-level `_rulingCountdownTimer` variable and removes the overlay.

Next, it branches on the current `view` state variable. If `view` is 'room' or 'preDebate', it clears intervals for `roundTimer` and `_rulingCountdownTimer`, calls `stopReferencePoll()` and `stopOpponentPoll()` and `stopModStatusPoll()` (from other arena modules), and if `currentDebate?.mode` is 'live', calls `cleanupFeedRoom()` and `leaveDebate()`. If `view` is 'queue', it calls `clearQueueTimers()` and if not in placeholder mode (checked via `isPlaceholder()`), makes a fire-and-forget RPC call to 'leave_debate_queue' with error logging. If `view` is 'matchFound', it calls `clearMatchAcceptTimers()` and sets `matchFoundDebate` to null via the setter.

Finally, if `view` is not 'lobby', it dynamically imports arena-lobby.ts and calls `renderLobby()` as a fire-and-forget async operation.

### init

Checks if `FEATURES.arena` is false and returns early if so. Calls `injectCSS()` to load arena stylesheets. Sets the `screenEl` module-level state variable by querying the DOM for an element with ID 'screen-arena'; if not found, logs a warning and returns early.

Then, it dynamically imports arena-lobby.ts and calls `renderLobby()`. If the URL search parameter 'shop' equals '1', also calls `showPowerUpShop()` from the imported module.

Next, it queries the 'joinCode' URL search parameter. If present, it replaces the browser history state to remove the search params and calls `joinWithCode()` with the uppercase-normalized code as a fire-and-forget async operation. If no joinCode, it attempts to read 'mod_pending_challenge' from localStorage (wrapped in a try/catch to handle localStorage being blocked); if found, removes it from storage, replaces the history state, and calls `joinWithCode()` with the uppercase code.

Then, it queries the 'spectate' URL search parameter. If present and matches the UUID pattern (8-4-4-4-12 hexadecimal format), it replaces the history state and calls `enterFeedRoomAsSpectator()` with the spectate ID as a fire-and-forget async operation.

### getView

Returns the current value of the module-level `view` state variable of type `ArenaView`.

### getCurrentDebate

Returns a shallow copy of the `currentDebate` module-level state variable if it is truthy (using the spread operator), or null if it is falsy. The copy is of type `CurrentDebate | null`.

### destroy

Checks if `currentDebate?.mode` is 'live' and if so, calls `cleanupFeedRoom()` and `leaveDebate()` to disconnect from any active live debate. Calls `cleanupPendingRecording()` to stop and clean up any pending voice memo recordings. Calls `resetState()`, which according to the comment clears all timers (queue, match, round, vm, reference, ruling countdown, private lobby, mod queue, mod status, mod debate, opponent poll, silence) and resets all mutable state variables. Finally, removes the 'popstate' event listener for `_onPopState` from the window object.

## Agent 02

### isPlaceholder

When called, this function reads the result of `getSupabaseClient()` (checking whether a Supabase client exists) and the module-level `isAnyPlaceholder` constant from config.ts. It returns `true` if either `getSupabaseClient()` is falsy or `isAnyPlaceholder` is `true`; otherwise it returns `false`. The function is synchronous and performs no side effects.

### formatTimer

When called with a number of seconds, this function performs arithmetic to convert it to minutes and seconds format. It computes the floor division of the input by 60 to get minutes, computes the remainder to get seconds, and constructs and returns a string in the format "m:ss" (with a leading zero on the seconds if less than 10). For example, 125 seconds becomes "2:05". The function is synchronous, reads no external state, and performs no side effects.

### randomFrom

When called with a readonly array, this function generates a random integer using `Math.random()` and `Math.floor()` to index into the array, and returns the element at that index. The function is synchronous, reads only its parameter, and performs no side effects.

### pushArenaState

When called with a string view name, this function calls the browser's `history.pushState()` API, passing an object with an `arenaView` property set to the view name and an empty string for the title. This pushes a new entry onto the browser's history stack. The function is synchronous, writes to browser history, and returns nothing.

### _onPopState

This function is an event listener registered to the `popstate` event on the window object. When the browser back button is clicked (or `history.back()` is called), the function executes the following cleanup sequence: First, it removes three overlay elements from the DOM by ID (`arena-rank-overlay`, `arena-ruleset-overlay`, `arena-mode-overlay`) if they exist. Then it checks if a mod-ruling-overlay element exists; if so, it clears the `_rulingCountdownTimer` interval and removes the element. Next, it checks the current `view` value (module-level state imported from arena-state.ts). If the view is `'room'` or `'preDebate'`, it clears the `roundTimer` and `_rulingCountdownTimer` intervals, calls `stopReferencePoll()`, `stopOpponentPoll()`, and `stopModStatusPoll()` functions, and then checks if `currentDebate?.mode === 'live'`; if so, it calls `cleanupFeedRoom()` and `leaveDebate()`. If the view is `'queue'`, it calls `clearQueueTimers()` and makes a fire-and-forget RPC call to `safeRpc('leave_debate_queue')` (unless `isPlaceholder()` returns true), with errors logged but not thrown. If the view is `'matchFound'`, it calls `clearMatchAcceptTimers()` and sets `matchFoundDebate` to `null` using `set_matchFoundDebate()`. Finally, if the view is not `'lobby'`, the function dynamically imports arena-lobby.ts and calls `renderLobby()`. The function is synchronous, reads module-level state (`view`, `currentDebate`, timers), performs interval clearances and DOM removals, calls multiple external functions, and returns nothing.

### init

When called, this function checks whether `FEATURES.arena` is enabled; if not, it returns immediately. Otherwise, it calls `injectCSS()` to inject arena CSS. It then retrieves the DOM element with id `'screen-arena'` and stores it via `set_screenEl()`; if the element is not found, it logs a warning and returns. It then dynamically imports arena-lobby.ts and calls `renderLobby()`. Additionally, if the URL query parameter `shop` is set to `'1'`, it calls `showPowerUpShop()`. The function then checks for a URL query parameter `joinCode`; if present, it replaces the browser history state (removing the query string), converts the code to uppercase, and makes a fire-and-forget call to `joinWithCode()`. If no `joinCode` is present, the function attempts to read from `localStorage` for a key `'mod_pending_challenge'`; if found, it removes the item from localStorage, replaces the browser history state, and calls `joinWithCode()` with the uppercase value. This localStorage check is wrapped in a try-catch block to handle cases where localStorage is blocked. Next, the function checks for a URL query parameter `spectate`; if present and matching a UUID pattern, it replaces the browser history state and makes a fire-and-forget call to `enterFeedRoomAsSpectator()` with the ID. The function is synchronous, reads URL parameters and localStorage, writes to browser history and the `screenEl` variable, calls multiple async functions as fire-and-forget (not awaited), and returns nothing.

### getView

When called, this function returns the current value of the module-level `view` variable imported from arena-state.ts. The function is synchronous and performs no side effects.

### getCurrentDebate

When called, this function checks if the module-level `currentDebate` variable is truthy. If it is, the function creates a shallow copy of the object using the spread operator and returns the copy; if not, it returns `null`. The function is synchronous and performs no side effects beyond reading module state.

### destroy

When called, this function performs a complete cleanup of the arena module. First, it checks if `currentDebate?.mode === 'live'`; if so, it calls `cleanupFeedRoom()` and `leaveDebate()`. It then calls `cleanupPendingRecording()` to clean up any pending voice memo state. It then calls `resetState()`, which according to the comment clears all timers (queue, match, round, vm, reference, ruling countdown, private lobby, mod queue, mod status, mod debate, opponent poll, silence) and resets all mutable state variables. Finally, it removes the `_onPopState` event listener from the window's `popstate` event. The function is synchronous, reads module-level state, calls multiple external functions, and returns nothing.

## Agent 03

### isPlaceholder

This function reads the return value of `getSupabaseClient()` (from `auth.ts`) and the module-level variable `isAnyPlaceholder` (from `config.ts`). It returns `true` if either `getSupabaseClient()` is falsy or `isAnyPlaceholder` is truthy; otherwise it returns `false`.

### formatTimer

This function takes a number `sec` and converts it to a timer display string in the format "MM:SS". It calculates minutes by dividing `sec` by 60 and flooring the result, calculates seconds as `sec` modulo 60, and returns a string with the minutes, a colon, and the seconds zero-padded to two digits.

### randomFrom

This function takes a read-only array `arr` and returns one element from it chosen at random. It uses `Math.random()` multiplied by the array length, floors the result, and accesses that index with a non-null assertion.

### pushArenaState

This function calls `history.pushState()` with an object containing the key `arenaView` set to the `viewName` parameter, an empty string as the title, and no URL argument. It writes to the browser's history stack but does not return a value.

### _onPopState

This is an arrow function assigned to module scope that is invoked by the browser's `popstate` event (registered at line 90). When called, it performs the following sequence:

It removes DOM elements with IDs `arena-rank-overlay`, `arena-ruleset-overlay`, and `arena-mode-overlay` if they exist. It checks for a `mod-ruling-overlay` element; if found, it calls `clearInterval()` on the module-level `_rulingCountdownTimer` and then removes the overlay.

Next, it branches on the current `view` state variable. If `view` is `'room'` or `'preDebate'`, it calls `clearInterval()` on both `roundTimer` and `_rulingCountdownTimer`, calls `stopReferencePoll()`, `stopOpponentPoll()`, and `stopModStatusPoll()` in that order. Then it checks if `currentDebate?.mode === 'live'`; if true, it calls `cleanupFeedRoom()` and `leaveDebate()`. If `view` is `'queue'`, it calls `clearQueueTimers()`, and if not in placeholder mode, it calls `safeRpc('leave_debate_queue')` as a fire-and-forget promise (the `.catch()` logs a warning if it rejects). If `view` is `'matchFound'`, it calls `clearMatchAcceptTimers()` and sets `matchFoundDebate` to `null` via `set_matchFoundDebate()`.

Finally, if `view` is not `'lobby'`, it dynamically imports `arena-lobby.ts`, extracts the `renderLobby` function, and calls it without awaiting.

### init

This function is called automatically at startup (line 173) after the `ready` promise resolves. It reads the `FEATURES.arena` configuration value and returns early if it is falsy. Otherwise, it calls `injectCSS()` and retrieves the DOM element with ID `'screen-arena'`, storing it via `set_screenEl()`. If the element is not found, it logs a warning and returns early.

It then dynamically imports `arena-lobby.ts` without awaiting, and within the import's `.then()` callback, it calls `renderLobby()`. It checks `window.location.search` for a query parameter named `'shop'`; if its value is `'1'`, it calls `showPowerUpShop()`.

Next it reads `window.location.search` for a parameter named `'joinCode'`. If present, it calls `window.history.replaceState()` to clean the URL, then calls `joinWithCode()` with the code uppercased. If no `joinCode` is present, it enters a try block that reads `localStorage.getItem('mod_pending_challenge')`. If a value exists, it removes it from localStorage, calls `window.history.replaceState()` to clean the URL, and calls `joinWithCode()` with the stored code uppercased. Any exception caught by the try/catch is silently ignored.

Finally, it reads `window.location.search` for a parameter named `'spectate'`. If present and matches a UUID regex pattern, it calls `window.history.replaceState()` to clean the URL and calls `enterFeedRoomAsSpectator()` with the spectate ID, again without awaiting.

### getView

This function returns the module-level `view` variable, which is of type `ArenaView`.

### getCurrentDebate

This function returns either `null` or a shallow copy of the module-level `currentDebate` object (created via the spread operator). If `currentDebate` is falsy, it returns `null`; if truthy, it returns a new object with the same properties.

### destroy

This function performs cleanup when the arena module is shutting down. It first checks if `currentDebate?.mode === 'live'`; if true, it calls `cleanupFeedRoom()` and `leaveDebate()`. It then calls `cleanupPendingRecording()` to clean up voice memo state. It calls `resetState()`, which according to the comment clears all timers (queue, match, round, vm, reference, ruling countdown, private lobby, mod queue, mod status, mod debate, opponent poll, silence) and resets all mutable state variables. Finally, it removes the `popstate` event listener by calling `window.removeEventListener('popstate', _onPopState)`.

## Agent 04

### isPlaceholder

Reads two pieces of state to determine if the arena system is disabled: the result of `getSupabaseClient()` from the auth module, and the `isAnyPlaceholder` boolean from the config module. Returns true if either Supabase is not available (falsy) or if `isAnyPlaceholder` is true; returns false if both Supabase is available and `isAnyPlaceholder` is false.

### formatTimer

Takes a number of seconds as input and formats it into a minute:second display string. Divides the input by 60 and floors it to get minutes, then takes the remainder to get seconds. Pads seconds with a leading zero if less than 10, then returns a string in the format `m:ss` (e.g., `3:05` or `0:42`).

### randomFrom

Takes a readonly array and returns a random element from it by generating a random number between 0 and the array length, flooring it, and indexing into the array.

### pushArenaState

Calls the browser's `history.pushState` API with a state object containing `{ arenaView: viewName }` where `viewName` is the function parameter. Adds an entry to the browser history without navigating.

### _onPopState

This function is registered as a popstate event listener and runs when the browser back button is pressed. It first removes any overlay elements from the DOM (arena-rank-overlay, arena-ruleset-overlay, arena-mode-overlay, and mod-ruling-overlay). If the mod-ruling-overlay was present, it also clears the `_rulingCountdownTimer` interval before removing the element.

It then cleans up state based on the current `view` value. If view is 'room' or 'preDebate', it clears the `roundTimer` and `_rulingCountdownTimer` intervals, calls `stopReferencePoll()`, `stopOpponentPoll()`, and `stopModStatusPoll()`, and if the current debate mode is 'live', it calls `cleanupFeedRoom()` and `leaveDebate()`. If view is 'queue', it calls `clearQueueTimers()` and if not a placeholder, makes a non-awaited RPC call to 'leave_debate_queue' (with a catch block that logs warnings to console). If view is 'matchFound', it calls `clearMatchAcceptTimers()` and sets `matchFoundDebate` to null.

Finally, unless the current view is already 'lobby', it dynamically imports arena-lobby.ts and calls `renderLobby()` to return the user to the lobby.

### init

This function is called during app initialization and returns early if `FEATURES.arena` is false. It calls `injectCSS()`, then retrieves the element with id 'screen-arena' from the DOM and stores it via `set_screenEl()`. If the element is not found, it logs a warning and returns early.

It then dynamically imports arena-lobby.ts and calls `renderLobby()`. Next, it checks the URL query parameter `shop`; if it equals '1', it calls `showPowerUpShop()`.

It checks for a `joinCode` query parameter and if present, replaces the history state to clean the URL, uppercases the code, and makes a non-awaited call to `joinWithCode()`. If there is no `joinCode`, it attempts to read `'mod_pending_challenge'` from localStorage; if that key exists, it removes the key, replaces the history state, uppercases the pending value, and makes a non-awaited call to `joinWithCode()`. This localStorage read is wrapped in a try/catch that silently ignores errors (e.g., when localStorage is blocked).

It then checks for a `spectate` query parameter. If present and matches a UUID regex pattern, it replaces the history state and makes a non-awaited call to `enterFeedRoomAsSpectator()` with the spectate ID.

### getView

Reads the module-level `view` variable from arena-state.ts and returns it.

### getCurrentDebate

Reads the module-level `currentDebate` variable from arena-state.ts. If it is null or falsy, returns null. Otherwise, returns a shallow copy of the object using the spread operator.

### destroy

Cleans up the arena system for shutdown. If the current `currentDebate` has mode 'live', it calls `cleanupFeedRoom()` and `leaveDebate()`. It then calls `cleanupPendingRecording()` to tear down any pending voice memo recordings.

It calls `resetState()`, which the comments indicate clears all timers (queue, match, round, vm, reference, ruling countdown, private lobby, mod queue, mod status, mod debate, opponent poll, silence) and resets all mutable state variables.

Finally, it removes the _onPopState function from the window's popstate event listeners.

## Agent 05

### isPlaceholder

When called, this function reads two pieces of external state: it calls `getSupabaseClient()` to check if a Supabase client exists, and it reads the module-level `isAnyPlaceholder` boolean imported from config.ts. The function returns `true` if either the Supabase client is falsy or `isAnyPlaceholder` is true; otherwise it returns `false`.

### formatTimer

When called with a numeric parameter `sec`, this function computes minutes by dividing the seconds by 60 and flooring the result, then computes remaining seconds using the modulo operator. It constructs and returns a string by concatenating the minutes value, a colon, and the seconds value zero-padded to two digits if necessary.

### randomFrom

When called with an array parameter, this function generates a random integer between 0 (inclusive) and the array length (exclusive) using `Math.random()` and `Math.floor()`, then returns the element at that index from the array. The function assumes the array is non-empty.

### pushArenaState

When called with a `viewName` string parameter, this function calls `history.pushState()` with an object containing the property `arenaView` set to the `viewName`, along with an empty string for the title parameter. This adds a new entry to the browser's session history stack with the arena view encoded in the state object.

### _onPopState

When the browser's `popstate` event fires (registered on line 90), this arrow function executes. It first reads the module-level `view` variable to determine which view is currently active. It removes any overlays from the DOM with IDs `arena-rank-overlay`, `arena-ruleset-overlay`, and `arena-mode-overlay`. If a `mod-ruling-overlay` element exists, it clears the interval referenced by the module-level `_rulingCountdownTimer` variable before removing the element.

The function then branches based on the current `view`. If `view` is `'room'` or `'preDebate'`, it clears the intervals for `roundTimer` and `_rulingCountdownTimer`, calls `stopReferencePoll()`, `stopOpponentPoll()`, and `stopModStatusPoll()` from other arena modules. If the module-level `currentDebate` object exists and has `mode === 'live'`, it calls `cleanupFeedRoom()` and `leaveDebate()`.

If `view` is `'queue'`, it calls `clearQueueTimers()` and then, if not a placeholder, fires a non-awaited RPC call to `leave_debate_queue` with a catch block that logs warnings.

If `view` is `'matchFound'`, it calls `clearMatchAcceptTimers()` and sets the module-level `matchFoundDebate` to `null` using `set_matchFoundDebate()`.

Finally, if `view` is not `'lobby'`, the function dynamically imports `arena-lobby.ts` and calls its `renderLobby()` function, firing this import as a non-awaited promise.

### init

When called, this function first checks if `FEATURES.arena` is falsy, and if so returns early. Otherwise, it calls `injectCSS()` to load arena styles, then retrieves the DOM element with ID `'screen-arena'` and sets it as module-level state using `set_screenEl()`. If the element is not found (falsy), the function logs a warning and returns early.

The function then dynamically imports `arena-lobby.ts` as a non-awaited promise and calls its `renderLobby()` function. Within that same promise, it reads the URL search parameters and if `shop=1` is present, it calls `showPowerUpShop()`.

Next, the function reads the URL search parameter `joinCode`. If a join code is present, it uses `history.replaceState()` to remove the parameter from the URL, and fires a non-awaited call to `joinWithCode()` with the code uppercased. If no join code is in the URL, it attempts to read `localStorage.getItem('mod_pending_challenge')` inside a try block. If that item exists, it removes it from localStorage, replaces the URL state, and fires a non-awaited call to `joinWithCode()` with the stored code uppercased. If localStorage is blocked or any error occurs, the catch block silently ignores it.

The function then reads the URL search parameter `spectate`. If it exists and matches a UUID regex pattern, it replaces the URL state and fires a non-awaited call to `enterFeedRoomAsSpectator()` with the spectate ID.

### getView

When called, this function reads and returns the module-level `view` variable imported from arena-state.ts, which is of type `ArenaView`.

### getCurrentDebate

When called, this function reads the module-level `currentDebate` variable. If it is truthy, the function creates and returns a shallow copy of it using the spread operator; if `currentDebate` is falsy, it returns `null`. The returned type is `CurrentDebate | null`.

### destroy

When called, this function performs cleanup by first checking if the module-level `currentDebate` object exists and has `mode === 'live'`. If so, it calls `cleanupFeedRoom()` and `leaveDebate()`.

The function then calls `cleanupPendingRecording()` to clean up any pending voice memo state.

Next, it calls `resetState()`, a function that the comment on line 161–163 describes as clearing all timers and resetting all mutable state variables across multiple features (queue, match, round, vm, reference, ruling countdown, private lobby, mod queue, mod status, mod debate, opponent poll, and silence timers).

Finally, the function removes the `_onPopState` event listener from the `popstate` event, preventing further navigation-triggered cleanup.
