# Stage 2 Outputs — groups.load.ts

## Agent 01

### setLoadOpenGroupCallback

Receives a callback function `fn` typed as `(id: string) => void`. Assigns it to module-level variable `_openGroup`, replacing any previous value. Returns void immediately. No DOM access, no I/O, no branching. Side effect: mutates the module-scoped `_openGroup` reference that all three load functions use when invoking `renderGroupList`.

### loadDiscover

Immediately mutates the DOM by calling `document.getElementById('discover-list')` (TypeScript-cast to HTMLElement) and setting its innerHTML to a loading-state div — this occurs outside the try block. Enters a try block and awaits `safeRpc('discover_groups', { p_limit: 30, p_category: activeCategory })`, reading `activeCategory` from groups.state.ts. If the returned `error` is truthy, throws it into the catch. Otherwise type-normalizes the response: if `data` is a string, calls `JSON.parse(data)`; otherwise uses `data` directly, assigning the result to `groups`. Calls `renderGroupList('discover-list', groups || [], false, false, _openGroup!)`, passing an empty-array fallback and a non-null-asserted `_openGroup` callback. Catch block: re-queries the element and sets innerHTML to `renderEmpty('⚠️', 'Could not load groups', 'Try again in a moment')` — error is silently swallowed.

### loadMyGroups

Reads `currentUser` from groups.state.ts. If falsy, calls `document.getElementById('mine-list')` and sets innerHTML to `renderEmpty('🔒', 'Sign in to see your groups', '')`, then returns early — no RPC call. If authenticated, sets `mine-list` innerHTML to a loading-state div. Enters try block and awaits `safeRpc('get_my_groups')` with no parameters. If error, throws. Type-normalizes data with same JSON.parse branch. If `groups` is falsy or `groups.length === 0`, sets innerHTML to `renderEmpty('👥', "You haven't joined any groups yet", 'Discover groups or create your own')` and returns early. Otherwise calls `renderGroupList('mine-list', groups, true, false, _openGroup!)` (showRole=true). Catch block: sets innerHTML to `renderEmpty('⚠️', 'Could not load groups', '')`.

### loadLeaderboard

Sets `leaderboard-list` innerHTML to loading-state div (outside try). Enters try and awaits `safeRpc('get_group_leaderboard', { p_limit: 20 })`. If error, throws. Type-normalizes with JSON.parse branch. Calls `renderGroupList('leaderboard-list', groups || [], false, true, _openGroup!)` (showRank=true). Catch block: sets innerHTML to `renderEmpty('⚠️', 'Could not load rankings', '')`.

## Agent 02

### setLoadOpenGroupCallback

Accepts callback `fn: (id: string) => void`. Assigns to module-level `_openGroup`. Closure capture operation. If called multiple times, latest callback overwrites previous. No DOM mutations, no async operations.

### loadDiscover

Sets `#discover-list` innerHTML to loading div. Awaits `safeRpc('discover_groups', { p_limit: 30, p_category: activeCategory })` reading activeCategory from state. If error truthy, throws to catch. Type-normalizes data (string → JSON.parse, otherwise direct). Calls `renderGroupList('discover-list', groups || [], false, false, _openGroup!)`. Catch: sets error state HTML via `renderEmpty`. Error silently swallowed.

### loadMyGroups

Auth check on `currentUser`. If null: sets `#mine-list` to sign-in prompt via renderEmpty, returns. If authenticated: sets loading state. Awaits `safeRpc('get_my_groups')`. If error: throws to catch. Type-normalizes. If groups null or empty: sets empty-state HTML, returns. If groups non-empty: calls `renderGroupList('mine-list', groups, true, false, _openGroup!)` (showRole=true). Catch: sets error state.

### loadLeaderboard

Sets loading state. Awaits `safeRpc('get_group_leaderboard', { p_limit: 20 })`. Error check. Type-normalize. Calls `renderGroupList('leaderboard-list', groups || [], false, true, _openGroup!)` (showRank=true). Catch: error state.

## Agent 03

### setLoadOpenGroupCallback

Assigns `fn` to `_openGroup`. Synchronous write, no DOM, no async.

### loadDiscover

DOM write (immediate, outside try): `#discover-list` loading state. Try: await `safeRpc('discover_groups', { p_limit: 30, p_category: activeCategory })`. Error → throw. JSON.parse if string. `renderGroupList('discover-list', groups || [], false, false, _openGroup!)`. Catch: DOM write error state.

### loadMyGroups

`!currentUser` guard → DOM write sign-in state, return early. Else: DOM write loading state. Try: await `safeRpc('get_my_groups')`. Error → throw. JSON.parse. `!groups || groups.length === 0` → DOM write empty state, return early. Else: `renderGroupList('mine-list', groups, true, false, _openGroup!)`. Catch: DOM write error state.

### loadLeaderboard

DOM write loading state (outside try). Try: await `safeRpc('get_group_leaderboard', { p_limit: 20 })`. Error → throw. JSON.parse. `renderGroupList('leaderboard-list', groups || [], false, true, _openGroup!)`. Catch: DOM write error state.

## Agent 04

### setLoadOpenGroupCallback

Receives `fn` parameter. Writes to `_openGroup`. Void, synchronous, no DOM. Must be called before any renderGroupList call to avoid null `_openGroup` reference.

### loadDiscover

DOM write loading (outside try). Try: await safeRpc 'discover_groups' with p_limit=30 and activeCategory. Error throws to catch. JSON.parse branch. renderGroupList with canDelete=false, isLeaderboard=false, _openGroup!. Catch: error UI DOM write. Non-null assertion on _openGroup.

### loadMyGroups

Authentication gate: !currentUser → unauthenticated DOM write, early return. Loading DOM write. Try: await safeRpc 'get_my_groups'. Error throws. JSON.parse. Empty/null groups → empty-state DOM write, early return. renderGroupList with showOwner=true, showRank=false, _openGroup!. Catch: error UI.

### loadLeaderboard

Loading DOM write. Try: await safeRpc 'get_group_leaderboard' p_limit=20. Error throws. JSON.parse. renderGroupList with showOwner=false, showRank=true, _openGroup!. Catch: error UI.

## Agent 05

### setLoadOpenGroupCallback

Assigns `fn` to `_openGroup`. Used to break circular dep with groups.detail.ts. Synchronous, no DOM, no reads.

### loadDiscover

Line 15: `document.getElementById('discover-list') as HTMLElement` — null check suppressed by cast. If element missing, crashes here (outside try). Sets loading innerHTML. Try: await safeRpc 'discover_groups' with p_limit=30 and activeCategory read from state. Error → throw. `typeof data === 'string' ? JSON.parse(data) : data` — JSON.parse may throw SyntaxError (caught). `renderGroupList('discover-list', groups || [], false, false, _openGroup!)` — _openGroup! is non-null assertion on potentially null value; if null, renderGroupList may crash when user clicks (not caught at render time since renderGroupList likely attaches click listeners without invoking callback immediately). Catch: getElementById again (also unguarded), renderEmpty HTML written to innerHTML — all arguments are hardcoded strings, no XSS risk.

### loadMyGroups

!currentUser early path: getElementById unguarded cast, renderEmpty write, return. Authenticated path: loading state. Try: safeRpc 'get_my_groups'. Error → throw. JSON.parse. `!groups || groups.length === 0` — .length on non-array would throw (caught by catch). renderGroupList with showRole=true. Catch: error state.

### loadLeaderboard

Same pattern as loadDiscover with leaderboard-list and showRank=true.
