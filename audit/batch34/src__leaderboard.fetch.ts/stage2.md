# Stage 2 Outputs — leaderboard.fetch.ts

## Agent 01

### getData
Reads the module-level state variable `liveData` and returns it. If `liveData` is falsy, returns `PLACEHOLDER_DATA`, an exported constant array of 10 LeaderboardEntry objects. Has no side effects and is synchronous.

### fetchLeaderboard
Reads module-level state variables `isLoading` and `currentOffset`, and returns early if `isLoading` is true. Retrieves a Supabase client and checks placeholder mode; returns if either fails. Sets `isLoading` to true, then calls `safeRpc` with `'get_leaderboard'` as the RPC name, deriving the sort column from `currentTab` (reads `currentTab` module state), and PAGE_SIZE and current offset from module state. If the RPC returns an error, empty data, or zero rows, calls `setLiveData(null)` only if `append` is false, and calls `setHasMore(false)`. Otherwise, maps the raw RPC rows into LeaderboardEntry objects with computed rank values based on `currentOffset`, transforms usernames to uppercase, and applies defaults for missing numeric fields. Calls `setHasMore` with true if the returned rows length equals PAGE_SIZE, and calls `setLiveData` with either the new rows (if not appending) or the concatenation of existing `liveData` and new rows (if appending). If not appending, calls `getCurrentUser()` to get the current user ID, searches `liveData` for that ID using `findIndex`, and calls `setMyRank` with the 1-indexed position or null. On catch, logs the error, calls `setLiveData(null)` only if not appending, and calls `setHasMore(false)`. Finally sets `isLoading` to false. The function is async and awaits the RPC call.

### setTab
Receives a `LeaderboardTab` parameter. Calls `setCurrentTab(tab)`, `setCurrentOffset(0)`, `setHasMore(false)`, and `setLiveData(null)` to reset all leaderboard state. Dynamically imports `'./leaderboard.render.ts'` and calls `render()`. Then awaits `fetchLeaderboard()` with no parameters (append defaults to false). Finally calls `render()` again. The function is async.

### setTime
Receives a `LeaderboardTimeFilter` parameter named `_time`, which is prefixed with underscore and not used in the function body. Calls `setCurrentOffset(0)` and `setHasMore(false)` to reset pagination state. Dynamically imports `'./leaderboard.render.ts'` via promise chain (not awaited) and calls `render()` on the result. Includes a comment noting that week/month time filters require schema changes. The function is synchronous and the import is fire-and-forget.

### loadMore
Reads module-level state variables `isLoading`, `hasMore`, `currentOffset`, and PAGE_SIZE. Returns early if `isLoading` is true or `hasMore` is false. Calls `setCurrentOffset(currentOffset + PAGE_SIZE)` to advance pagination. Awaits `fetchLeaderboard(true)` to fetch the next page with append set to true. Dynamically imports `'./leaderboard.list.ts'` and awaits it, then calls `renderList()` on the result. Queries the DOM for an element with id `'lb-list'`; if found, sets its `innerHTML` to the rendered list HTML. The function is async.

## Agent 02

### getData
`getData` reads the module-level state variable `liveData` and returns it if truthy, otherwise returns `PLACEHOLDER_DATA`. The function performs no writes and calls no other functions. It returns a `LeaderboardEntry[]` array: either the live data or the static placeholder entries.

### fetchLeaderboard
`fetchLeaderboard` accepts an optional boolean `append` parameter (defaults to false) and is an async function that returns `Promise<void>`. It reads `isLoading`, `currentTab`, `currentOffset`, and `liveData` from module-level state, plus the Supabase client via `getSupabaseClient()`, the current user via `getCurrentUser()`, and placeholder mode via `getIsPlaceholderMode()`. The function returns early if `isLoading` is true or if the Supabase client is unavailable or placeholder mode is active. It sets `isLoading` to true, then calls `safeRpc` with the RPC name `'get_leaderboard'` passing a sort column determined by `currentTab` ('elo_rating', 'wins', or 'current_streak'), the `PAGE_SIZE` limit, and `currentOffset`. On RPC error, empty data, or zero-length response, it calls `setLiveData(null)` if not appending and calls `setHasMore(false)`; on success it transforms the RPC rows into `LeaderboardEntry` objects by mapping over them, computing rank from `currentOffset + i + 1`, extracting and defaulting numeric and string fields, and uppercasing the user name. It calls `setHasMore(true)` if the response length equals `PAGE_SIZE`, otherwise false. It calls `setLiveData` with either the new rows (if not appending) or the concatenation of existing `liveData` and new rows (if appending). If not appending, it calls `getCurrentUser()` to get the current user's id, then calls `findIndex` on `liveData` to find the user's rank and calls `setMyRank` with the rank or null. Exceptions are caught, logged to console.error, and handled the same way as errors: `setLiveData(null)` if not appending and `setHasMore(false)`. Finally it calls `setIsLoading(false)`.

### setTab
`setTab` is an async function that accepts a `LeaderboardTab` and returns `Promise<void>`. It reads and writes module-level state by calling `setCurrentTab` with the tab parameter, `setCurrentOffset(0)`, `setHasMore(false)`, and `setLiveData(null)`. It dynamically imports the render function from `'./leaderboard.render.ts'`, awaits the import, calls `render()` with no arguments, then calls `fetchLeaderboard()` with no arguments and awaits it, then calls `render()` again. This performs two render cycles—before and after fetching.

### setTime
`setTime` is a synchronous function that accepts a `LeaderboardTimeFilter` parameter named `_time` (the underscore indicates it is not used) and returns `void`. It calls `setCurrentOffset(0)` and `setHasMore(false)` synchronously, then fires an asynchronous side-effect: it dynamically imports `'./leaderboard.render.ts'`, and when the import resolves, it destructures `render` and calls it. The return statement is reached before the import completes; the import and render are fire-and-forget.

### loadMore
`loadMore` is an async function with no parameters that returns `Promise<void>`. It reads `isLoading`, `hasMore`, `currentOffset`, and `PAGE_SIZE` from module-level state. It returns early if `isLoading` is true or `hasMore` is false. It calls `setCurrentOffset(currentOffset + PAGE_SIZE)`, then awaits `fetchLeaderboard(true)` to append rows. It then dynamically imports `'./leaderboard.list.ts'`, awaits the import, destructures `renderList`, and calls it. It reads the DOM element with id `'lb-list'`, and if present, sets its `innerHTML` to the result of `renderList()`.

## Agent 03

### getData
Reads the module-level state variable `liveData`. Returns `liveData` if it is truthy, otherwise returns the `PLACEHOLDER_DATA` constant. No async operations, no external calls, no side effects.

### fetchLeaderboard
Accepts an optional `append` parameter (defaults to false). First checks the module-level state variable `isLoading` and returns early if true. Obtains the Supabase client via `getSupabaseClient()` and returns early if the client is null or if `getIsPlaceholderMode()` returns true. Sets `isLoading` to true. Determines the sort column based on the module-level state variable `currentTab`: 'elo_rating' for 'elo', 'wins' for 'wins', or 'current_streak' otherwise. Calls `safeRpc()` with the sort column and pagination parameters (using the module-level state `currentOffset` and the constant `PAGE_SIZE`), awaiting the result. On error, missing data, or empty data response, sets `liveData` to null if not appending and sets `hasMore` to false. On success, transforms the RPC rows by calculating rank from `currentOffset` and array index, uppercasing the user name, and coercing numeric fields with defaults. Sets `hasMore` to true if returned rows count equals `PAGE_SIZE`. Calls `setLiveData()` with either the new rows or the concatenation of existing `liveData` and new rows depending on the `append` flag. If not appending, reads the current user's ID via `getCurrentUser()?.id` and searches the updated `liveData` for a matching ID, then calls `setMyRank()` with the rank or null. Catches exceptions, logs them, and applies the same error-state updates as the error branch. Finally sets `isLoading` to false.

### setTab
Accepts a `tab` parameter of type `LeaderboardTab`. Calls `setCurrentTab(tab)`, `setCurrentOffset(0)`, `setHasMore(false)`, and `setLiveData(null)` to reset state. Dynamically imports `./leaderboard.render.ts` and destructures the `render` function, then calls `render()`. Awaits the call to `fetchLeaderboard()` with no arguments. After `fetchLeaderboard()` completes, calls `render()` again.

### setTime
Accepts a `_time` parameter of type `LeaderboardTimeFilter` (the underscore suggests the parameter is currently unused). Calls `setCurrentOffset(0)` and `setHasMore(false)`. Returns a promise that dynamically imports `./leaderboard.render.ts`, destructures the `render` function from the promise result, and calls `render()` without awaiting. The function itself is synchronous and does not await the import chain, so it returns immediately while the render import and call occur asynchronously in the background.

### loadMore
Reads the module-level state variables `isLoading` and `hasMore` and returns early if `isLoading` is true or `hasMore` is false. Increments `currentOffset` by `PAGE_SIZE` via `setCurrentOffset()`. Awaits the call to `fetchLeaderboard(true)` to append rows. Dynamically imports `./leaderboard.list.ts` and destructures `renderList`, awaiting the import. Queries the DOM for an element with id 'lb-list' and if found, sets its `innerHTML` to the result of `renderList()`.

## Agent 04

### getData
Reads the module-level state variable `liveData` and returns it if truthy; otherwise returns `PLACEHOLDER_DATA`. No parameters. Returns a `LeaderboardEntry[]` synchronously.

### fetchLeaderboard
Reads parameters `append` (defaults to false), module-level state `isLoading` and `currentOffset`, and reads via `getSupabaseClient()`, `getIsPlaceholderMode()`, and `getCurrentUser()`. Returns early if `isLoading` is true or if no Supabase client is available or placeholder mode is active. Sets module-level state `isLoading` to true, then awaits a call to `safeRpc()` with `'get_leaderboard'` and parameters mapping `currentTab` to a sort column, `PAGE_SIZE` to limit, and `currentOffset` to offset. On error, empty data, or zero-length data array, sets `liveData` to null (unless `append` is true) and `hasMore` to false. On success, maps the RPC result rows into `LeaderboardEntry` objects with ranks calculated from `currentOffset`, transforms the raw fields, and writes to `liveData` either as new entries (if `append` is false) or appended to existing `liveData` (if `append` is true); writes `hasMore` to true if the returned rows count equals `PAGE_SIZE`. If not appending and user exists, reads `liveData` to find the current user's index and writes that plus one to `myRank`, or null if not found. Catches exceptions, logs the error to console, sets `liveData` to null unless appending, sets `hasMore` to false, then sets `isLoading` to false in all paths.

### setTab
Takes a `tab` parameter of type `LeaderboardTab`. Writes module-level state: sets `currentTab` to the parameter, `currentOffset` to 0, `hasMore` to false, and `liveData` to null. Dynamically imports `leaderboard.render.ts`, calls `render()` synchronously, then awaits `fetchLeaderboard()` with no arguments (append defaults to false), then calls `render()` again. The function is async; the first `render()` is not awaited, and `fetchLeaderboard()` is awaited.

### setTime
Takes a `_time` parameter of type `LeaderboardTimeFilter` that is not used. Writes module-level state: sets `currentOffset` to 0 and `hasMore` to false. Dynamically imports `leaderboard.render.ts` and calls `render()` via `.then()`, which is a fire-and-forget async operation. The function is synchronous and returns void; the import and render are not awaited.

### loadMore
Reads module-level state `isLoading`, `hasMore`, and `currentOffset`, along with the `PAGE_SIZE` constant. Returns early if `isLoading` is true or `hasMore` is false. Increments `currentOffset` by `PAGE_SIZE`, then awaits `fetchLeaderboard(true)` to append results. Dynamically imports `leaderboard.list.ts`, awaits the import, destructures `renderList`, queries the DOM for element with id `'lb-list'`, and if found, sets its `innerHTML` to the result of calling `renderList()`. The function is async.

## Agent 05

### getData
Reads the module-level state variable `liveData` and returns it if truthy; otherwise returns the module-level constant `PLACEHOLDER_DATA`. No parameters, no external state accessed, no other functions called.

### fetchLeaderboard
Reads parameters `append` (defaults to false), module-level state variables `isLoading` and `currentOffset`, and calls external API functions `getSupabaseClient()` and `getIsPlaceholderMode()`. Returns early without modification if `isLoading` is true or if `getSupabaseClient()` returns falsy or `getIsPlaceholderMode()` returns true. Sets module-level state `isLoading` to true before proceeding. Reads `currentTab` to determine the sort column name. Calls `safeRpc('get_leaderboard', ...)` with the sort column, page size, and current offset, awaiting the result. If the RPC call errors, returns no data, or returns an empty array, sets `liveData` to null (unless appending) and `hasMore` to false. Otherwise transforms the returned RPC rows into `LeaderboardEntry` objects with calculated ranks starting from `currentOffset + 1`, reads the current user's ID via `getCurrentUser()?.id`, and if a user exists and not appending, searches `liveData` for the current user's index and sets `myRank`. Sets `hasMore` to true if the returned rows count exactly matches `PAGE_SIZE`. Sets `liveData` either to the new rows or to the previous `liveData` concatenated with new rows. Catches any error, logs it, and applies the same error-path state changes. Finally sets `isLoading` to false.

### setTab
Reads parameter `tab` and calls setter functions `setCurrentTab(tab)`, `setCurrentOffset(0)`, `setHasMore(false)`, and `setLiveData(null)`. Dynamically imports `leaderboard.render.ts`, calls `render()` synchronously, awaits the call to `fetchLeaderboard()` (with no parameters), then calls `render()` again. Returns a promise that resolves after both renders complete and the leaderboard fetch completes.

### setTime
Reads parameter `_time` but does not use it. Calls setter functions `setCurrentOffset(0)` and `setHasMore(false)`. Dynamically imports `leaderboard.render.ts` via a promise chain and calls `render()` in the `.then()` callback without awaiting; the function returns immediately without waiting.

### loadMore
Reads module-level state variables `isLoading`, `hasMore`, and `currentOffset`. Returns early without modification if `isLoading` is true or `hasMore` is false. Reads `PAGE_SIZE`, calls `setCurrentOffset(currentOffset + PAGE_SIZE)`, awaits `fetchLeaderboard(true)` to append new rows. Dynamically imports `leaderboard.list.ts`, awaits the import, calls `renderList()`, queries the DOM for an element with ID `lb-list`, and if found, sets its `innerHTML` to the rendered list string.
