# Stage 2 Outputs — auth.profile.ts

## Agent 01

### updateProfile

`updateProfile` is async and accepts a `updates` parameter of type `ProfileUpdate`. At the start it reads two pieces of module-level state by calling `getCurrentProfile()` and `getCurrentUser()`, then calls `getIsPlaceholderMode()`. If placeholder mode is active, it mutates the object returned by `getCurrentProfile()` in place using `Object.assign`, then calls `_notify(currentUser, currentProfile)` to broadcast the change, and returns `{ success: true }` immediately without touching the network.

In the non-placeholder path, the function enters a try/catch block and awaits `safeRpc('update_profile', ...)`. The RPC payload maps six fields from `updates` — `display_name`, `avatar_url`, `bio`, `username`, `preferred_language`, and `is_private` — passing `null` for any field not present in `updates`. If `safeRpc` returns an `error`, that error is thrown. On success, five of those six fields (all except `is_private`) are written back into the `currentProfile` object for any key present in `updates`. `_notify` is then called with the current user and updated profile, and the function returns `{ success: true }`. If the thrown error or any other exception is caught, the function returns `{ success: false, error: (e as Error).message }`.

---

### deleteAccount

`deleteAccount` is async and takes no parameters. It reads `getIsPlaceholderMode()` first; if placeholder mode is active, it returns `{ success: true }` immediately.

In the non-placeholder path, inside a try/catch block, it awaits `safeRpc('soft_delete_account', {})`. If the RPC returns an error, that error is thrown. On success, it calls `_clearAuthState()` to wipe module-level auth state, then calls `_notify(null, null)` to broadcast a signed-out state to all listeners. It then issues a best-effort sign-out by awaiting `getSupabaseClient()!.auth.signOut()` inside a nested try/catch that silently swallows any error from that call. After that nested block completes, the function returns `{ success: true }`. If the outer catch fires — from the RPC call or the `throw error` — the function returns `{ success: false, error: (e as Error).message }`. Note that if `_clearAuthState()` or `_notify` throws, the nested sign-out and the return are skipped and the outer catch runs instead.

---

### getPublicProfile

`getPublicProfile` is async and accepts a `userId` string. It first calls `isUUID(userId)` and returns `null` immediately if the value is not a valid UUID. It then calls `getIsPlaceholderMode()`; if placeholder mode is active, it returns a hardcoded `PublicProfile` literal assembled from the passed `userId` and fixed stub values, with `created_at` set to `new Date().toISOString()`.

In the non-placeholder path, inside a try/catch block, it awaits `safeRpc<PublicProfile>('get_public_profile', { p_user_id: userId })`. If the RPC returns an error that error is thrown, and the catch block calls `console.error` and returns `null`. On success, the function returns the `data` field of the RPC response, which may itself be `null` if the server returns nothing.

---

### showUserProfile

`showUserProfile` is async and accepts a `userId` string. It reads `getCurrentUser()` at the start. If `userId` is falsy, fails `isUUID`, or equals `currentUser?.id`, the function returns immediately without side effects.

The function then constructs and appends a fixed-position overlay `div` to `document.body`, first removing any existing element with id `user-profile-modal`. The overlay contains a loading placeholder and a click-outside-to-close listener attached directly to the overlay element. It then awaits `getPublicProfile(userId)`. If the returned `profile` is falsy or has a `profile.error` property, it targets the last child `div` inside the modal's first child `div` and rewrites its `innerHTML`: the `profile_private` error code produces a lock-icon private-profile message; any other error produces a "User not found" message. The function then returns early, leaving the modal in the error state.

On a successful profile load, the function removes the loading placeholder child, then appends a fully-rendered HTML block to the modal's inner container via `innerHTML +=`. All user-supplied string values (`display_name`, `username`, `bio`, `avatar_url`) pass through `escapeHTML` before interpolation. Numeric stat values (`elo_rating`, `wins`, `losses`, `followers`, `following`) are cast with `Number()` before interpolation. The avatar is rendered as an emoji character if `avatar_url` starts with `"emoji:"`, otherwise the first character of the display name or username is used as the initial. `vgBadge` and `bountyDot` are called synchronously with profile data to inject badge and bounty-dot markup.

After the HTML is injected, event listeners are attached to three buttons. The close button (`upm-close-btn`) removes the modal from the DOM. The follow button (`upm-follow-btn`) is hidden entirely if `FEATURES.followsUI` is falsy. When clicked, it calls `requireAuth('follow users')` and returns without action if the user is not authenticated. It then sets the button opacity to `0.5` and, depending on a captured `isFollowing` boolean initialized from `profile.is_following`, either awaits `unfollowUser(userId)` or awaits `followUser(userId)`. On success, `isFollowing` is toggled and the button's text and style are updated to reflect the new state. Opacity is restored to `1` regardless of outcome. The rival button (`upm-rival-btn`) follows the same `requireAuth('declare rivals')` gate, sets opacity and changes text to `⏳`, then awaits `declareRival(userId)`. On success, the button text becomes `⚔️ SENT`, its background is updated, and it is disabled. On failure, `console.error` is called and the button text changes to `"Try again"`, reverting to `⚔️ RIVAL` after a 2000 ms `setTimeout`. Opacity is restored either way.

After attaching the button listeners, the function checks whether `currentUser` and `currentProfile` are both truthy and `userId` does not equal `currentUser.id`. If so, it creates a new `div`, appends it to the modal inner container, computes `viewerDepth` and `viewerBalance` from `currentProfile`, calls `bountySlotLimit(viewerDepth)`, and if the result is greater than zero fires `renderProfileBountySection(...)` as a fire-and-forget call (via `void`). Separately, if `currentUser` is truthy and `userId` equals `currentUser.id`, a second `div` is appended and `renderMyBountiesSection` is called fire-and-forget. The function itself returns `void` after all synchronous setup is complete; the bounty renders resolve independently.

## Agent 02

### updateProfile

`updateProfile` is async and accepts a `ProfileUpdate` object. It first reads the module-level state variables `currentProfile` (via `getCurrentProfile()`) and `currentUser` (via `getCurrentUser()`). It then calls `getIsPlaceholderMode()`. If placeholder mode is active, it directly mutates `currentProfile` in-place via `Object.assign`, calls `_notify(currentUser, currentProfile)` to broadcast the updated state to subscribers, and returns `{ success: true }` immediately without making any network call.

If placeholder mode is not active, the function enters a try/catch block. It awaits `safeRpc('update_profile', ...)`, passing six named parameters derived from the `updates` argument — each field is sent as its value if present in `updates`, or as `null` otherwise. If the RPC returns an error, it is thrown. On success, the function iterates over a hardcoded list of five safe field names (`display_name`, `avatar_url`, `bio`, `username`, `preferred_language`) and, for each field present in `updates`, writes the new value back onto `currentProfile`. It then calls `_notify(currentUser, currentProfile)` and returns `{ success: true }`. The `is_private` field is sent to the RPC but is not written back to `currentProfile` in the safe-fields loop. On any thrown error, the catch block returns `{ success: false, error: (e as Error).message }`.

---

### deleteAccount

`deleteAccount` is async and takes no parameters. It calls `getIsPlaceholderMode()` first; if placeholder mode is active it returns `{ success: true }` immediately with no side effects.

Otherwise it enters a try/catch block. It awaits `safeRpc('soft_delete_account', {})`. If the RPC returns an error, it is thrown. On success, it calls `_clearAuthState()` to wipe module-level auth state, then calls `_notify(null, null)` to broadcast a signed-out state to all subscribers. It then attempts to sign out of the Supabase client by awaiting `getSupabaseClient()!.auth.signOut()` inside a nested try/catch that discards any error silently (the comment labels this best-effort). The function then returns `{ success: true }`. If the outer try block throws at any point before the return, the catch block returns `{ success: false, error: (e as Error).message }`.

---

### getPublicProfile

`getPublicProfile` is async and accepts a `userId` string. It immediately calls `isUUID(userId)`; if the value fails UUID validation it returns `null` without any network call. It then calls `getIsPlaceholderMode()`; if active, it constructs and returns a hardcoded `PublicProfile` stub object using the provided `userId` as the `id` field, with fixed placeholder values for all other fields and `new Date().toISOString()` as `created_at`.

If placeholder mode is not active, the function enters a try/catch block. It awaits `safeRpc<PublicProfile>('get_public_profile', { p_user_id: userId })`. If the RPC returns an error, the error is thrown. On success it returns `data` — the typed profile object from the RPC response. If the try block throws, the catch block logs the error with `console.error` and returns `null`.

---

### showUserProfile

`showUserProfile` is async and accepts a `userId` string. It reads `currentUser` via `getCurrentUser()`. If `userId` is falsy, fails `isUUID()` validation, or equals `currentUser?.id`, the function returns immediately with no side effects.

The function then removes any existing element with id `user-profile-modal` from the DOM. It creates a new `div` element, assigns it that id, applies inline positioning styles, and sets its `innerHTML` to a bottom-sheet skeleton containing a "Loading profile..." message. It attaches a click listener to the modal backdrop that removes the modal when the user clicks outside the sheet. The modal is appended to `document.body`.

The function then awaits `getPublicProfile(userId)`. If the returned `profile` is null or has a truthy `error` property, it selects the last child `div` inside the modal's first child and replaces its `innerHTML`: if `profile?.error === 'profile_private'` it renders a lock icon and "PRIVATE PROFILE" message; otherwise it renders a "User not found" message. The function then returns early, leaving the modal in the DOM in its error state.

If a valid profile is returned, the loading content is removed from the DOM (`lastChild.remove()`), and a block of HTML is appended to `modalInner` via `innerHTML +=`. This block contains an avatar circle (using either the emoji extracted from an `emoji:`-prefixed `avatar_url`, or the first character of the display name, both passed through `escapeHTML`), the display name passed through `escapeHTML` followed by `vgBadge(profile.verified_gladiator)` and `bountyDot(profile.id)`, the subscription tier label, an optional bio, an optional link to `/u/<username>`, four stat tiles showing ELO, W-L record, followers, and following (each numeric value wrapped in `Number()`), and three buttons: follow, rival, and close. All user-supplied string values are run through `escapeHTML` before insertion.

After the HTML is injected, event listeners are attached. The close button listener removes the modal from the DOM by id. The follow button is hidden if `FEATURES.followsUI` is falsy. The follow button listener calls `requireAuth('follow users')` first; if that returns falsy it returns without action. Otherwise it sets the button's opacity to `0.5`, reads the local closure variable `isFollowing`, and branches: if currently following, it awaits `unfollowUser(userId)` and on success sets `isFollowing = false` and updates the button's text and background styles; if not following, it awaits `followUser(userId)` and on success sets `isFollowing = true` and updates the button. In both branches opacity is restored to `1` regardless of the result. The rival button listener calls `requireAuth('declare rivals')`; if that returns falsy it returns. Otherwise it sets the button's opacity to `0.5` and text to `⏳`, then awaits `declareRival(userId)`. On success it sets the button text to `⚔️ SENT`, changes its background, and disables it. On failure it logs the error, sets text to "Try again", and after 2000 ms via `setTimeout` resets the text to `⚔️ RIVAL`. Opacity is restored to `1` either way.

After button wiring, the function checks two final conditions. If `currentUser`, `currentProfile`, and `userId !== currentUser.id` are all truthy, it creates a new `div` with id `upm-bounty-section`, appends it to `modalInner`, computes `viewerDepth` and `viewerBalance` from `currentProfile` fields, calls `bountySlotLimit(viewerDepth)`, and if that returns a value greater than zero calls `renderProfileBountySection(...)` as a fire-and-forget (prefixed with `void`). Separately, if `currentUser` is truthy and `userId === currentUser.id`, a `div` with id `upm-my-bounties-section` is appended to `modalInner` and `renderMyBountiesSection(...)` is called fire-and-forget. These two branches are mutually exclusive because the first guards `userId !== currentUser.id` and the second guards `userId === currentUser.id`.

## Agent 03

### updateProfile

`updateProfile` is async and accepts a `updates` parameter typed as `ProfileUpdate`. At the start it reads two pieces of module-level state by calling `getCurrentProfile()` and `getCurrentUser()`, then reads `getIsPlaceholderMode()`. If placeholder mode is active, it mutates the object returned by `getCurrentProfile()` in place using `Object.assign`, calls `_notify(currentUser, currentProfile)` to propagate the change, and returns `{ success: true }` immediately without any network call.

In the non-placeholder path, `updateProfile` enters a try/catch block and awaits `safeRpc('update_profile', {...})`, mapping each field of `updates` to a named parameter and passing `null` for any field not present in `updates`. If the RPC returns an `error`, that error is thrown immediately. On success, the function iterates over a fixed list of five safe field names (`display_name`, `avatar_url`, `bio`, `username`, `preferred_language`), and for each one that is present in `updates`, writes the new value directly onto the `currentProfile` object. It then calls `_notify(currentUser, currentProfile)` and returns `{ success: true }`. The `is_private` field is sent to the RPC but is intentionally excluded from the local `safeFields` list and is not written back to `currentProfile`. The catch block returns `{ success: false, error: (e as Error).message }`.

---

### deleteAccount

`deleteAccount` is async and takes no parameters. It reads `getIsPlaceholderMode()` first; if placeholder mode is active, it returns `{ success: true }` immediately.

In the non-placeholder path, it enters a try/catch block and awaits `safeRpc('soft_delete_account', {})`. If the RPC returns an error, it is thrown. On success, `_clearAuthState()` is called to wipe module-level auth state, then `_notify(null, null)` is called to broadcast the cleared state. A nested try/catch then calls `getSupabaseClient()!.auth.signOut()` and awaits it; any error thrown in this inner block is silently swallowed (the comment reads "best-effort"). After the nested try/catch, the outer block returns `{ success: true }`. If the initial `safeRpc` call throws, the outer catch block returns `{ success: false, error: (e as Error).message }`, and neither `_clearAuthState` nor `signOut` is called.

---

### getPublicProfile

`getPublicProfile` is async and accepts a `userId` string. It calls `isUUID(userId)` first; if the value is not a valid UUID, it returns `null` immediately without a network call. It then reads `getIsPlaceholderMode()`; if placeholder mode is active, it returns a hardcoded `PublicProfile` object with stub values and a `created_at` of `new Date().toISOString()`, bypassing all network calls.

In the non-placeholder path, it enters a try/catch block and awaits `safeRpc<PublicProfile>('get_public_profile', { p_user_id: userId })`. If the RPC returns an error, it is thrown. On success, `data` is returned directly. The catch block logs the error with `console.error` and returns `null`.

---

### showUserProfile

`showUserProfile` is async and accepts a `userId` string. At the top it reads module-level state by calling `getCurrentUser()`. It then validates that `userId` is non-empty, passes `isUUID(userId)`, and is not equal to `currentUser?.id`; if any of these checks fail, it returns immediately with no DOM changes.

After validation, it calls `document.getElementById('user-profile-modal')?.remove()` to remove any pre-existing modal, then creates a new `div` with `id="user-profile-modal"`, sets its inline styles and a loading-state inner HTML, and appends it to `document.body`. A click listener is attached to the modal backdrop that removes the modal when the backdrop itself (not a child) is clicked. The function then awaits `getPublicProfile(userId)`. If the returned `profile` is falsy or has a truthy `error` property, the function queries for the last child `div` inside the modal and overwrites its `innerHTML` with either a "PRIVATE PROFILE" message (if `profile?.error === 'profile_private'`) or a "User not found" message, then returns early.

If the profile loads successfully, the loading placeholder is removed from the DOM and the modal's inner container is populated via `innerHTML +=` with a full profile sheet: an avatar circle (either an emoji extracted from `avatar_url` after stripping the `emoji:` prefix, or the uppercased first character of `display_name` or `username`), the display name passed through `escapeHTML`, a `vgBadge` call, a `bountyDot` call, tier label, optional bio, optional link to `/u/<username>`, and four stat tiles (ELO, W-L, followers, following) whose numeric values are each cast through `Number()` before insertion. Below the stats, three buttons are rendered: follow, rival, and close.

Event listeners are then attached. The close button removes the modal. The follow button checks `FEATURES.followsUI`; if that flag is falsy, the button is hidden via `style.display = 'none'`. The follow button listener calls `requireAuth('follow users')` and returns if auth is absent. A closure variable `isFollowing` is initialized from `profile.is_following`. On click, the button's opacity is set to `0.5`, then either `unfollowUser(userId)` or `followUser(userId)` is awaited depending on `isFollowing`. On success, `isFollowing` is toggled and the button's text and styles are updated. Regardless of success or failure, opacity is restored to `1`. The rival button listener calls `requireAuth('declare rivals')` and returns if absent; on click the button shows a spinner glyph and awaits `declareRival(userId)`. On success the button text becomes "SENT", its background is updated, and the button is disabled. On failure, `result.error` is logged and the button text is set to "Try again", reverting to "RIVAL" after a 2000 ms `setTimeout`.

After the button wiring, the function reads `currentProfile` via a previously established reference to `getCurrentUser()` result and checks two bounty-related conditions. If `currentUser` is set, `currentProfile` is set, and `userId` does not equal `currentUser.id`, a new `div` with `id="upm-bounty-section"` is created and appended to the modal inner container. `bountySlotLimit` is called with the viewer's `profile_depth_pct` cast to a number; if the result is greater than zero, `renderProfileBountySection` is called and its returned promise is explicitly discarded with `void`. Separately, if `currentUser` is set and `userId` equals `currentUser.id`, a `div` with `id="upm-my-bounties-section"` is appended and `renderMyBountiesSection` is called as a fire-and-forget `void` call. The function returns `undefined` (implicitly) after all synchronous wiring completes; the bounty render calls continue asynchronously after the function returns.

## Agent 04

### updateProfile

`updateProfile` is async and accepts a `updates` parameter of type `ProfileUpdate`. It reads two pieces of module-level state by calling `getCurrentProfile()` and `getCurrentUser()`, then immediately calls `getIsPlaceholderMode()` to check a flag. If placeholder mode is active, it mutates the object returned by `getCurrentProfile()` in place using `Object.assign`, then calls `_notify(currentUser, currentProfile)` to broadcast the change, and returns `{ success: true }` without touching the network.

Outside placeholder mode, the function enters a try/catch block. It awaits `safeRpc('update_profile', {...})`, mapping each field from `updates` onto a named parameter, substituting `null` for any field that is `undefined`. If the RPC returns an error object, it throws it. On a successful response, the function iterates over a fixed list of five safe field names (`display_name`, `avatar_url`, `bio`, `username`, `preferred_language`) and copies any defined values from `updates` back onto the `currentProfile` object directly. It then calls `_notify(currentUser, currentProfile)` and returns `{ success: true }`. The catch block returns `{ success: false, error: (e as Error).message }`. The `is_private` field is sent to the RPC but is not written back into `currentProfile` on success.

---

### deleteAccount

`deleteAccount` is async and takes no parameters. It reads `getIsPlaceholderMode()` first; if active, it returns `{ success: true }` immediately without any side effects.

Outside placeholder mode, it enters a try/catch block. It awaits `safeRpc('soft_delete_account', {})`. If that call returns an error, it throws. On success, it calls `_clearAuthState()` to wipe module-level auth state, then calls `_notify(null, null)` to broadcast the cleared state. It then attempts `getSupabaseClient()!.auth.signOut()` inside a nested try/catch with an empty catch body — this sign-out call is awaited but its failure is explicitly swallowed. The outer function then returns `{ success: true }`. If the outer try block throws at any point before the sign-out, the catch block returns `{ success: false, error: (e as Error).message }`.

---

### getPublicProfile

`getPublicProfile` is async and accepts a `userId` string. It calls `isUUID(userId)` first; if the string is not a valid UUID, it returns `null` immediately with no network activity. It then calls `getIsPlaceholderMode()`; if active, it returns a hardcoded `PublicProfile`-shaped object with fixed placeholder values and the provided `userId` as the `id`, with no network call.

Outside placeholder mode, it enters a try/catch block, awaits `safeRpc<PublicProfile>('get_public_profile', { p_user_id: userId })`, and returns `data` if there is no error. If the RPC returns an error, it throws. The catch block calls `console.error` with the error and returns `null`.

---

### showUserProfile

`showUserProfile` is async and accepts a `userId` string. It reads `getCurrentUser()` into a local variable. If `userId` is falsy, not a valid UUID per `isUUID()`, or equals the current user's own ID, it returns immediately with no side effects.

Execution then proceeds to DOM manipulation. It removes any existing element with id `user-profile-modal` from the document, creates a new `div` with that id, sets its inline style, injects a "Loading profile..." shell into its `innerHTML`, and attaches a click listener on the overlay that calls `modal.remove()` when the click target is the backdrop itself. The modal is appended to `document.body`.

It then awaits `getPublicProfile(userId)`. If the returned value is null or has a truthy `error` property, the function queries the modal's last inner child and replaces its `innerHTML` with either a "PRIVATE PROFILE" message (if `profile.error === 'profile_private'`) or a "User not found" message, then returns. On a successful profile response, the function computes display values — resolving an emoji avatar prefix from `avatar_url`, computing initials, mapping `subscription_tier` to a label, and running user-supplied strings (`display_name`, `username`, `bio`) through `escapeHTML` (aliased locally as `esc`). It removes the loading shell child, then appends a fully constructed HTML block to the inner modal div via `innerHTML +=`. The block includes an avatar, name, tier label, bio, stats grid (ELO, W-L, followers, following), follow button, rival button, and close button. Numeric stats are each wrapped in `Number()` before insertion.

After the HTML is appended, the function attaches three event listeners. The close button listener calls `document.getElementById('user-profile-modal')?.remove()`. The follow button listener checks `FEATURES.followsUI` — if false, the button is hidden. The listener reads a local `isFollowing` variable initialized from `profile.is_following`; on click it calls `requireAuth('follow users')`, returning early if auth is absent, then awaits either `unfollowUser(userId)` or `followUser(userId)` depending on the current `isFollowing` state, updating button text, styles, and the `isFollowing` variable on success, and toggling button opacity around the call. The rival button listener calls `requireAuth('declare rivals')`, returning early if absent, sets the button to a loading state, then awaits `declareRival(userId)`. On success it updates the button text, applies a style, and sets `disabled = true`. On failure it logs the error, sets the button text to "Try again", and restores the original label after a `setTimeout` of 2000ms (fire-and-forget). Both follow and rival click handlers restore button opacity to `'1'` after the await resolves regardless of outcome.

Finally, two bounty sections are conditionally appended. If `currentUser` is set, `getCurrentProfile()` returned a truthy value (read into `currentProfile` at call time — note: `currentProfile` is not a local variable here; the module-level call `getCurrentUser()` was made at the top of the function, but `currentProfile` used in the bounty block is read via a reference that [uncertain: the code references `currentProfile` as a local variable that does not appear to be declared in this function — it may be an implicit reference to the module-level `getCurrentProfile()` result from an earlier read, or it may be a bug]), and `userId` is not the current user's own ID, the function creates a container div, computes `viewerDepth` and `viewerBalance` from `currentProfile`, calls `bountySlotLimit(viewerDepth)`, and if the limit is greater than zero calls `renderProfileBountySection(...)` as a fire-and-forget void call. If `currentUser` is set and `userId` equals the current user's ID, a separate container is created and `renderMyBountiesSection(myBountiesContainer)` is called as a fire-and-forget void call.

## Agent 05

### updateProfile

`updateProfile` is async and accepts a `ProfileUpdate` object. It reads two module-level state variables via imported accessors: `getCurrentProfile()` and `getCurrentUser()`, and reads the placeholder flag via `getIsPlaceholderMode()`. If placeholder mode is active, it merges `updates` directly into the in-memory `currentProfile` object using `Object.assign`, then calls `_notify(currentUser, currentProfile)` to broadcast the change to auth listeners, and returns `{ success: true }` without making a network call. In the non-placeholder path, the function enters a `try` block and awaits `safeRpc('update_profile', {...})`, mapping each of the six fields (`display_name`, `avatar_url`, `bio`, `username`, `preferred_language`, `is_private`) to named parameters, passing `null` for any field not present in `updates`. If the RPC returns an error object, it is thrown immediately. On a successful RPC response, the function iterates over a hardcoded array of five field names (`safeFields` — notably omitting `is_private`) and, for each field present in `updates`, writes the new value into the live `currentProfile` object. It then calls `_notify(currentUser, currentProfile)` and returns `{ success: true }`. If any exception is thrown inside the `try` block — from the RPC or from the thrown error — the `catch` block returns `{ success: false, error: (e as Error).message }`.

### deleteAccount

`deleteAccount` is async and takes no parameters. It reads `getIsPlaceholderMode()` and, if true, returns `{ success: true }` immediately without side effects. In the live path, it enters a `try` block and awaits `safeRpc('soft_delete_account', {})`. If the RPC returns an error, it is thrown. On success, it calls `_clearAuthState()` to wipe module-level auth state, then calls `_notify(null, null)` to broadcast a signed-out state to all auth listeners. It then attempts to sign out of the Supabase client with `getSupabaseClient()!.auth.signOut()`, which is awaited inside its own inner `try/catch` that silently swallows any error — making the sign-out best-effort. The function then returns `{ success: true }`. If the outer `try` block catches an exception (from the RPC or the thrown error), it returns `{ success: false, error: (e as Error).message }`. The inner sign-out `try/catch` is only reached if the RPC succeeded, so a sign-out failure does not affect the returned result.

### getPublicProfile

`getPublicProfile` is async and accepts a `userId` string. It first calls `isUUID(userId)` and returns `null` immediately if the value fails UUID validation. It then reads `getIsPlaceholderMode()` and, if active, returns a hardcoded stub `PublicProfile` object with fixed values (`elo_rating: 1200`, `wins: 5`, etc.) and a freshly generated `created_at` timestamp — no network call is made. In the live path, the function enters a `try` block and awaits `safeRpc<PublicProfile>('get_public_profile', { p_user_id: userId })`. If the RPC returns an error, it is thrown. On success, it returns `data` directly as received from the RPC (which may be `null` if no profile exists — the type signature permits this). If an exception is thrown, the `catch` block logs the error to `console.error` and returns `null`.

### showUserProfile

`showUserProfile` is async and accepts a `userId` string. It reads `getCurrentUser()` from module-level state and performs three guard checks at entry: if `userId` is falsy, fails `isUUID()`, or equals `currentUser?.id`, the function returns immediately without taking any action. It then removes any existing element with id `user-profile-modal` from the DOM, creates a new `div` element with that id, sets fixed-position overlay styles on it directly via `style.cssText`, and injects a loading-state inner HTML. A click listener is attached to the modal that removes it when the backdrop (not inner content) is clicked. The modal is appended to `document.body`. The function then awaits `getPublicProfile(userId)`. If the returned `profile` is falsy or has a truthy `profile.error` field, it queries for the last child `div` inside the modal and replaces its innerHTML: a `profile_private` error produces a lock-icon message; any other failure produces a "User not found" message. In both error cases the function returns early, leaving the modal in the DOM with the error content.

If the profile loads successfully, the function computes display values: it checks `profile.avatar_url` for an `emoji:` prefix to determine whether to render an emoji or an initial letter. It calls `escapeHTML` (aliased as `esc`) on all user-supplied strings before inserting them into HTML — `display_name`, `username`, `bio`, and the emoji content. Numeric fields (`elo_rating`, `wins`, `losses`, `followers`, `following`) are each cast through `Number()` before insertion into innerHTML. It removes the loading placeholder from the DOM, then appends full profile HTML (avatar, stats row, follow/rival/close buttons) to the modal's inner container using `innerHTML +=`. After building the HTML, it attaches three event listeners by querying ids `upm-close-btn`, `upm-follow-btn`, and `upm-rival-btn`. The close button listener removes the modal from the DOM. If `FEATURES.followsUI` is falsy, the follow button is hidden via `display: none`. The follow button listener checks auth via `requireAuth('follow users')` and returns without action if auth is absent; otherwise it reads a closure variable `isFollowing` (initialized from `profile.is_following`) and either awaits `unfollowUser(userId)` or `followUser(userId)`, updating `isFollowing` and the button's text and background styles on success. The rival button listener checks auth via `requireAuth('declare rivals')` and returns without action if absent; otherwise it sets the button to a spinner state and awaits `declareRival(userId)`. On success, the button text changes to `⚔️ SENT` and the button is disabled. On failure, the error is logged and the button text reverts to `⚔️ RIVAL` after a 2000ms `setTimeout`. Both button listeners set `opacity` to `0.5` before the async call and restore it to `1` afterward, regardless of outcome. After wiring all buttons, the function checks whether `currentUser` and `currentProfile` are set and that `userId !== currentUser.id`. If so, it creates a new `div` with id `upm-bounty-section`, appends it to the modal, reads `profile_depth_pct` and `token_balance` from `currentProfile`, computes `slotLimit` via `bountySlotLimit(viewerDepth)`, and if `slotLimit > 0` fires `renderProfileBountySection(...)` as a fire-and-forget call (via `void`). Separately, if `currentUser` is set and `userId === currentUser.id`, it creates a `div` with id `upm-my-bounties-section`, appends it to the modal, and fires `renderMyBountiesSection(myBountiesContainer)` as fire-and-forget. The function returns `void` (implicitly `undefined`) after all synchronous wiring is complete; the bounty render calls complete asynchronously.
