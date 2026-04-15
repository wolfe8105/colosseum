# Stage 2 Outputs — src/notifications.ts

## Agent 01

### timeAgo

`timeAgo` accepts a single parameter `dateStr`, which may be a string, `undefined`, or `null`. If `dateStr` is falsy, it returns the empty string immediately. Otherwise it enters a `try` block and computes the difference between `Date.now()` and `new Date(dateStr).getTime()`, storing the result in `diffSec`. It then walks through a cascade of threshold comparisons: if `diffSec` is under 60 it returns `'just now'`; if the derived `diffMin` is under 60 it returns a string like `'5m ago'`; if the derived `diffHr` is under 24 it returns a string like `'3h ago'`; if the derived `diffDay` is under 30 it returns a string like `'12d ago'`; otherwise it returns a month approximation like `'2mo ago'`. If `new Date(dateStr)` throws, the `catch` block returns the empty string. The function is synchronous and does not read or write any module-level state.

### getPlaceholderNotifs

`getPlaceholderNotifs` takes no parameters and reads no module-level state or external sources. Each call constructs and returns a fresh seven-element array of hard-coded `Notification` objects. The objects cover types `challenge`, `reaction`, `result`, `stake_won`, `tier_up`, `follow`, and `system`. Five of the seven have `read: false`; two have `read: true`. All use the `time` field (a human-readable string) rather than `created_at`. The function is synchronous and has no side effects.

### createPanel

`createPanel` checks the DOM for an element with `id="notif-panel"` and returns immediately if one exists, preventing duplicate panel creation. When none is found it creates a `div` element, assigns it that id, sets its `cssText` to a fixed-position full-viewport overlay (initially `display:none`), and assigns a multi-section HTML template to its `innerHTML`. The template contains: a backdrop div (`id="notif-backdrop"`), a slide-in drawer (`id="notif-drawer"`), a header row with a title, a "Mark all read" button (`id="notif-mark-all"`), and a close button (`id="notif-close"`), a horizontal filter row (`id="notif-filters"`) containing five `button.notif-filter` elements with `data-filter` values `all`, `challenge`, `result`, `reaction`, and `economy`, and a scrollable list container (`id="notif-list"`). After appending the panel to `document.body`, it attaches three direct event listeners: a click on `notif-backdrop` calls `close`, a click on `notif-close` calls `close`, and a click on `notif-mark-all` calls `markAllRead`. It then iterates over all `.notif-filter` buttons and attaches a click listener to each; that listener strips the `active` class and resets styles on every filter button, adds `active` and highlighted styles to the clicked button, then calls `renderList` with the button's `data-filter` value cast to `NotificationFilter`. Finally it attaches a delegated click listener to `notif-list`; when a click bubbles up from an element that matches `.closest('.notif-item')`, it calls `markRead` with that item's `data-id` attribute. The function is synchronous and returns `void`.

### renderList

`renderList` accepts an optional `filter` parameter of type `NotificationFilter`, defaulting to `'all'`. It reads `document.getElementById('notif-list')` and returns immediately if the element is absent. It then reads the module-level `notifications` array and builds a filtered subset: if `filter` is `'all'` the full array is used; if `filter` is `'economy'` it keeps only entries whose `type` is in the module-level `ECONOMY_TYPES` set; for any other value it keeps entries whose `type` exactly equals `filter`. If the filtered array is empty, `list.innerHTML` is set to a centered empty-state div containing a muted bell icon. Otherwise it maps each `Notification` in the filtered array to an HTML string. For each notification it looks up the `icon` from the module-level `TYPES` constant, falling back to `TYPES.system` if the type is unrecognized. It computes `displayTime` by preferring `n.created_at` (passed through `timeAgo`) over `n.time`. It passes `n.id`, `n.title`, `n.body`, and `displayTime` through `escapeHTML` before inserting them into the template. Unread notifications receive a small magenta dot and a faintly tinted background. The mapped strings are joined and assigned to `list.innerHTML`. The function is synchronous and does not modify any module-level state.

### open

`open` reads `document.getElementById('notif-panel')` and `document.getElementById('notif-drawer')`. If `notif-panel` is absent, it returns immediately. Otherwise it calls `renderList` with no arguments (which will render with the default `'all'` filter against the current `notifications` state). It then sets `panel.style.display` to `'flex'` to make the overlay visible, and schedules a `requestAnimationFrame` callback that sets `drawer.style.transform` to `'translateY(0)'`, triggering the CSS slide-in transition. After scheduling the callback, it sets the module-level `panelOpen` to `true`. The function is synchronous in terms of its own return, but the transform update is deferred one animation frame.

### close

`close` reads `document.getElementById('notif-panel')` and `document.getElementById('notif-drawer')`. If `notif-panel` is absent, it returns immediately. It sets `drawer.style.transform` to `'translateY(-100%)'` to trigger the slide-out transition, then schedules a `setTimeout` with a 300-millisecond delay that sets `panel.style.display` to `'none'`. It immediately sets the module-level `panelOpen` to `false`. The `display:none` assignment is fire-and-forget inside the timeout; no state is modified inside that callback beyond the DOM write.

### markRead

`markRead` accepts a notification `id` string. It searches the module-level `notifications` array for an entry whose `id` matches. If no match is found, or if the matched notification already has `read: true`, it returns without doing anything. When a matching unread notification is found, it mutates that object's `read` property to `true`, decrements `unreadCount` (clamped to a minimum of 0 via `Math.max`), calls `updateBadge` to sync the badge dot, and calls `renderList` with no arguments to repaint the visible list. It then checks whether a Supabase client is available via `getSupabaseClient()` and whether `getIsPlaceholderMode()` is false. If both conditions pass, it calls `safeRpc('mark_notifications_read', { p_notification_ids: [id] })`. The returned promise's `.then` callback logs any error to `console.error`; the promise itself is not awaited at the call site, making this network call fire-and-forget. The function is synchronous from the caller's perspective.

### markAllRead

`markAllRead` takes no parameters. It iterates over every entry in the module-level `notifications` array and sets each `read` property to `true`. It then sets `unreadCount` to `0`, calls `updateBadge`, and calls `renderList` with no arguments. It then checks `getSupabaseClient()` and `getIsPlaceholderMode()` in the same way as `markRead`. If the client is available and not in placeholder mode, it calls `safeRpc('mark_notifications_read', { p_notification_ids: null })` — passing `null` rather than an array of ids to signal a mark-all operation on the server. The returned promise's `.then` callback logs any error to `console.error`; the call is fire-and-forget. The function is synchronous from the caller's perspective.

### updateBadge

`updateBadge` takes no parameters. It reads `document.getElementById('notif-dot')`. If that element exists, it sets its `style.display` to `'block'` if the module-level `unreadCount` is greater than zero, or `'none'` if it is zero or below. If the element does not exist, the function does nothing. The function is synchronous, does not modify module-level state, and returns `void`.

### startPolling

`startPolling` takes no parameters. It first checks the module-level `pollInterval`: if it is non-null it calls `clearInterval(pollInterval)` to cancel any existing interval before creating a new one. It then calls `setInterval(fetchNotifications, 30_000)`, storing the interval ID in `pollInterval`, so `fetchNotifications` will be invoked every 30 seconds. It immediately calls `fetchNotifications()` once (with `void` to discard the returned promise), making the first fetch fire-and-forget relative to `startPolling` itself. The function is synchronous and returns `void`.

### destroy

`destroy` takes no parameters. If the module-level `pollInterval` is non-null, it calls `clearInterval(pollInterval)` and sets `pollInterval` to `null`. It then resets `notifications` to an empty array, sets `unreadCount` to `0`, sets `panelOpen` to `false`, and calls `updateBadge` to hide the badge dot. The function is synchronous and returns `void`. It does not remove the DOM panel or detach any event listeners.

### fetchNotifications

`fetchNotifications` is an async function that takes no parameters. It reads `getSupabaseClient()`, `getCurrentUser()`, and `getIsPlaceholderMode()`. If the client is falsy, placeholder mode is active, or no user is present, it returns immediately without making a network request. Inside a `try` block it awaits a PostgREST query on the `notifications` table: it selects all columns, filters by `user_id` equal to `user.id`, orders by `created_at` descending, and limits results to 50 rows. If the query returns an `error`, the code throws it, which falls into the `catch` block. On success it assigns the returned data (cast to `Notification[]`, defaulting to `[]` if null) to the module-level `notifications`, recomputes `unreadCount` by counting entries where `read` is false, calls `updateBadge`, and — if `panelOpen` is `true` — calls `renderList` with no arguments to refresh the visible list. The `catch` block logs the error to `console.error` and does not rethrow, so polling continues on subsequent interval ticks regardless of errors.

### bindBellButton

`bindBellButton` takes no parameters. It reads `document.getElementById('notif-btn')`. If that element exists, it attaches a click event listener to it. When clicked, the listener reads the module-level `panelOpen`: if `true` it calls `close`, otherwise it calls `open`. If no element with `id="notif-btn"` is found, the function does nothing. The function is synchronous and returns `void`.

### init

`init` takes no parameters. It reads `FEATURES.notifications` from the imported config; if that flag is falsy it returns immediately without doing anything else. Otherwise it calls `createPanel` to build and insert the notification panel into the DOM, then calls `bindBellButton` to wire the bell toggle. It then checks `getIsPlaceholderMode()`. If placeholder mode is active, it assigns the return value of `getPlaceholderNotifs()` to the module-level `notifications`, counts the unread entries and assigns the count to `unreadCount`, then calls `updateBadge`. If not in placeholder mode, it calls `startPolling`, which immediately fetches notifications and sets up the 30-second interval. The function is synchronous and returns `void`. At the bottom of the module, after all function declarations, the module-level statement `ready.then(() => init()).catch(() => init())` calls `init` once after the auth `ready` promise resolves, and also calls `init` if that promise rejects, so `init` runs exactly once at startup regardless of whether auth initialization succeeds or fails.

## Agent 02

### timeAgo

`timeAgo` receives one parameter, `dateStr`, which is a string, `undefined`, or `null`. If `dateStr` is falsy, the function returns an empty string immediately without entering the try block. Otherwise it reads `Date.now()` from the browser clock and calls `new Date(dateStr).getTime()` to convert the input string to a millisecond timestamp. It computes `diffSec` as the floored difference in seconds between now and then. From there it branches through a cascade: if `diffSec` is under 60 it returns `'just now'`; if the floored minutes are under 60 it returns a `'Nm ago'` string; if the floored hours are under 24 it returns an `'Nh ago'` string; if the floored days are under 30 it returns an `'Nd ago'` string; otherwise it returns an `'Nmo ago'` string. Any exception thrown during `new Date()` construction or arithmetic is caught and the catch block returns an empty string. The function is synchronous and returns a string in all paths.

### getPlaceholderNotifs

`getPlaceholderNotifs` takes no parameters and reads no module-level state. Each time it is called it constructs and returns a fresh array literal of seven hardcoded `Notification` objects covering types `challenge`, `reaction`, `result`, `stake_won`, `tier_up`, `follow`, and `system`. Five of the seven objects have `read: false`; the remaining two have `read: true`. Each object carries a `time` string (human-readable, e.g. `'2m ago'`) rather than a `created_at` ISO timestamp. The function is synchronous, has no branches, performs no I/O, and writes nothing.

### createPanel

`createPanel` takes no parameters. Its first action is to query the DOM for an element with id `notif-panel`; if that element already exists the function returns immediately, making subsequent calls idempotent. When the panel does not yet exist, it creates a `div` element, assigns it `id="notif-panel"`, and sets inline styles that make it a fixed full-viewport flex container initially hidden (`display:none`). It sets `innerHTML` to a template that includes: a semi-transparent backdrop div (`notif-backdrop`), a slide-down drawer (`notif-drawer`) containing a header row with a "Mark all read" button (`notif-mark-all`) and a close button (`notif-close`), a horizontally scrollable filter bar with five filter buttons (All, Challenges, Results, Reactions, Economy), and an empty scrollable list container (`notif-list`). The assembled element is appended to `document.body`. The function then attaches three click listeners: the backdrop and close button both call `close`; the mark-all button calls `markAllRead`. It iterates all `.notif-filter` buttons and attaches a click listener to each; that listener removes the `active` class and resets background/color styles on all filter buttons, applies the active styles to the clicked button, reads the button's `data-filter` attribute, and calls `renderList` with that filter value cast to `NotificationFilter`. Finally, a single delegated click listener is added to `notif-list`; it walks up from the click target to the nearest `.notif-item` element, reads its `data-id` attribute, and calls `markRead` with that id. The function is synchronous and returns nothing.

### renderList

`renderList` takes one optional parameter `filter` of type `NotificationFilter`, defaulting to `'all'`. It queries the DOM for the `notif-list` element and returns immediately if that element is not found. It reads the module-level `notifications` array and filters it: if `filter` is `'all'`, the full array is used unchanged; if `filter` is `'economy'`, it filters to notifications whose `type` is a member of the module-level `ECONOMY_TYPES` set; for any other filter value it filters to notifications whose `type` exactly equals the filter string. If the filtered result is empty, it sets `list.innerHTML` to a centered "No notifications yet" placeholder and returns. For a non-empty filtered list, it builds an HTML string by mapping each notification to a `div.notif-item` element. For each notification it looks up the icon and label from the module-level `TYPES` record (falling back to `TYPES.system` if the type is unrecognized), computes an unread dot element if `n.read` is false, and computes `displayTime` as `timeAgo(n.created_at)` when `created_at` is present or falls back to `n.time`. The notification id, title, body, and display time are all passed through `escapeHTML` before insertion into the template. The background of each row is transparent for read notifications or a faint red tint for unread ones. The joined HTML string is assigned to `list.innerHTML`. The function is synchronous and returns nothing.

### open

`open` takes no parameters. It queries the DOM for `notif-panel` and `notif-drawer`. If `notif-panel` is not found it returns immediately. Otherwise it calls `renderList` with no arguments (which uses the default `'all'` filter), applying the current `notifications` state to the list. It then sets `panel.style.display` to `'flex'` to make the overlay visible. Inside a `requestAnimationFrame` callback it sets `drawer.style.transform` to `'translateY(0)'`, which triggers the CSS transition that slides the drawer into view; this call is fire-and-forget relative to the synchronous function body. After scheduling the animation frame, the function sets the module-level `panelOpen` to `true`. The function is synchronous and returns nothing.

### close

`close` takes no parameters. It queries the DOM for `notif-panel` and `notif-drawer`. If `notif-panel` is not found it returns immediately. If `notif-drawer` is found it sets `drawer.style.transform` to `'translateY(-100%)'`, which triggers the CSS transition that slides the drawer back off-screen. It then calls `setTimeout` with a 300 ms delay; when that timer fires it sets `panel.style.display` to `'none'`, hiding the overlay after the animation completes. The `setTimeout` callback is fire-and-forget relative to the synchronous function body. The module-level `panelOpen` is set to `false` synchronously before the function returns. The function returns nothing.

### markRead

`markRead` receives one parameter, `id`, a string. It searches the module-level `notifications` array for the first element whose `id` matches. If no match is found, the function does nothing and returns. If a matching notification is found but its `read` property is already `true`, the function also does nothing and returns. When the notification exists and is unread, it sets `n.read` to `true`, decrements the module-level `unreadCount` by one (floored at 0 via `Math.max`), then calls `updateBadge` to reflect the new count in the DOM, and calls `renderList` with no arguments to redraw the list. It then checks whether a Supabase client is available via `getSupabaseClient()` and whether the app is not in placeholder mode via `getIsPlaceholderMode()`. If both conditions pass, it fires a `safeRpc` call to `'mark_notifications_read'` with `p_notification_ids` set to an array containing only `id`. The `.then()` callback logs to `console.error` if the RPC returns an error. This network call is fire-and-forget from the function's perspective. The function is synchronous in its DOM and state effects and returns nothing.

### markAllRead

`markAllRead` takes no parameters. It iterates the module-level `notifications` array and sets `read` to `true` on every element unconditionally. It then sets the module-level `unreadCount` to `0`, calls `updateBadge` to hide the badge, and calls `renderList` with no arguments to redraw the list. It then checks `getSupabaseClient()` and `getIsPlaceholderMode()` the same way `markRead` does. If the checks pass, it fires a `safeRpc` call to `'mark_notifications_read'` with `p_notification_ids` set to `null`, which signals the server to mark all notifications as read. The `.then()` callback logs to `console.error` on error. The RPC call is fire-and-forget. The function is synchronous in its state and DOM effects and returns nothing.

### updateBadge

`updateBadge` takes no parameters. It queries the DOM for the element with id `notif-dot`. If that element is found, it sets its `style.display` to `'block'` when the module-level `unreadCount` is greater than zero, or to `'none'` when it is zero or below. If no element with that id exists, the function does nothing. The function is synchronous and returns nothing.

### startPolling

`startPolling` takes no parameters. It first checks whether the module-level `pollInterval` is non-null; if so, it calls `clearInterval(pollInterval)` to cancel any existing interval before creating a new one. It assigns a new interval to `pollInterval` via `setInterval`, scheduling `fetchNotifications` to be called every 30,000 ms. It then immediately calls `fetchNotifications()` once as a fire-and-forget invocation (the returned promise is discarded with `void`). The function is synchronous and returns nothing.

### destroy

`destroy` takes no parameters. It checks whether the module-level `pollInterval` is non-null; if so, it calls `clearInterval(pollInterval)` and sets `pollInterval` to `null`. It then resets the module-level `notifications` array to an empty array, sets `unreadCount` to `0`, and sets `panelOpen` to `false`. Finally it calls `updateBadge`, which hides the badge dot because `unreadCount` is now zero. The function is synchronous and returns nothing.

### fetchNotifications

`fetchNotifications` is an async function that takes no parameters. It reads `getSupabaseClient()`, `getIsPlaceholderMode()`, and `getCurrentUser()`. If the Supabase client is absent, if placeholder mode is active, or if no current user exists, the function returns immediately without making any network request. When all three conditions pass, it enters a try block and performs an `await`ed PostgREST query: it selects all columns from the `notifications` table filtered to the current user's `id`, ordered by `created_at` descending, limited to 50 rows. If the query returns an error object, the function throws it, which jumps to the catch block. On success, `notifications` (module-level) is assigned the returned data array cast to `Notification[]`, or an empty array if data is null. `unreadCount` is recomputed by counting elements where `read` is false. `updateBadge` is called to refresh the badge. If the module-level `panelOpen` is `true`, `renderList` is called with no arguments to redraw the visible panel. The catch block logs the error to `console.error` and returns without rethrowing. The function returns a `Promise<void>`.

### bindBellButton

`bindBellButton` takes no parameters. It queries the DOM for the element with id `notif-btn`. If that element is found, it attaches a `'click'` event listener to it. When that listener fires, it reads the module-level `panelOpen`: if `true` it calls `close`; if `false` it calls `open`. If no element with id `notif-btn` exists in the DOM, the function does nothing. The function is synchronous and returns nothing.

### init

`init` takes no parameters. Its first action is to read `FEATURES.notifications` from the imported config; if that flag is falsy the function returns immediately and no further setup occurs. When the flag is truthy, it calls `createPanel` to build and inject the notification panel DOM (or no-op if it already exists), then calls `bindBellButton` to wire the toggle button. It then reads `getIsPlaceholderMode()`. If placeholder mode is active, it assigns the return value of `getPlaceholderNotifs()` to the module-level `notifications` array, computes `unreadCount` by counting the unread elements in that array, and calls `updateBadge`. If placeholder mode is not active, it calls `startPolling`, which immediately calls `fetchNotifications` once and schedules it to repeat every 30 seconds. The function is synchronous and returns nothing. It is invoked automatically at module load time via `ready.then(() => init()).catch(() => init())`, so `init` runs after the auth-ready promise settles regardless of whether that promise resolves or rejects.

## Agent 03

### timeAgo

`timeAgo` takes a single `dateStr` parameter of type `string | undefined | null`. If `dateStr` is falsy it returns an empty string immediately. Otherwise it enters a `try` block and reads `Date.now()` to get the current epoch millisecond value, then calls `new Date(dateStr).getTime()` to parse the input. It computes `diffSec` as the floored number of elapsed seconds. It then works through a cascade of comparisons: if `diffSec < 60` it returns `'just now'`; if the derived `diffMin < 60` it returns a minutes string; if `diffHr < 24` it returns an hours string; if `diffDay < 30` it returns a days string; otherwise it returns a months string derived by dividing `diffDay` by 30 and flooring. If `new Date(dateStr)` throws, the `catch` block swallows the exception and returns an empty string. The function is synchronous and writes no state.

### getPlaceholderNotifs

`getPlaceholderNotifs` takes no parameters and reads no module-level state. Each call constructs and returns a fresh seven-element array of `Notification` literals covering types `challenge`, `reaction`, `result`, `stake_won`, `tier_up`, `follow`, and `system`. Five of the seven objects have `read: false`; two have `read: true`. All objects use the `time` field for display time rather than `created_at`, so `timeAgo` will not be called on them. The function is synchronous and writes no state.

### createPanel

`createPanel` is synchronous. It first queries the DOM for an element with id `notif-panel`; if one exists it returns immediately, making the function idempotent. Otherwise it calls `document.createElement('div')`, assigns the id `notif-panel`, sets inline `style.cssText` to make the panel a fixed full-viewport flex container initially hidden with `display:none`, and sets `innerHTML` to a string containing the backdrop, the animated drawer, the header row with "Mark all read" and close buttons, a filter row of five `.notif-filter` buttons, and the `notif-list` scroll container. It then calls `document.body.appendChild(panel)` to attach the structure.

After attaching, it wires three event listeners: a `click` listener on `notif-backdrop` that calls `close`, a `click` listener on `notif-close` that calls `close`, and a `click` listener on `notif-mark-all` that calls `markAllRead`. It then calls `document.querySelectorAll('.notif-filter').forEach` and attaches a `click` listener to each filter button. Each listener removes the `active` class and resets the inline `background` and `color` of every filter button, then adds `active` and sets accent styles on the clicked button, and finally calls `renderList` with the button's `data-filter` attribute value cast to `NotificationFilter`. Finally it attaches a delegated `click` listener on `notif-list` that walks up the event target via `.closest('.notif-item')` and, if found, calls `markRead` with the element's `data-id` attribute value.

### renderList

`renderList` is synchronous and accepts an optional `filter` parameter of type `NotificationFilter`, defaulting to `'all'`. It reads the DOM for the element with id `notif-list` and returns early if it is absent. It then reads the module-level `notifications` array and derives `filtered`: if the filter is `'all'`, `filtered` is the full array; if `'economy'`, it filters to notifications whose `type` is in the module-level `ECONOMY_TYPES` set; otherwise it filters to notifications whose `type` strictly equals the filter string. If `filtered` is empty, it sets `list.innerHTML` to an empty-state message and returns. If there are items, it maps each `Notification` to an HTML string: it looks up the type's icon from the `TYPES` constant (falling back to `TYPES.system`), builds an unread indicator dot if `n.read` is false, computes `displayTime` as `timeAgo(n.created_at)` if `created_at` is present or falls back to `n.time`, and builds a `div.notif-item` element with `data-id` set to `escapeHTML(n.id)`, background tinted for unread items, and inner content passing `n.title`, `n.body`, and the display time through `escapeHTML`. The concatenated strings are joined and assigned to `list.innerHTML`. The function writes no module-level state and returns `void`.

### open

`open` is synchronous and exported. It reads the DOM for `notif-panel` and `notif-drawer` by id, and returns early if `notif-panel` is absent. It calls `renderList()` with no arguments to populate the list using the current `notifications` state and the default `'all'` filter. It then sets `panel.style.display` to `'flex'` to make the container visible. It passes an arrow function to `requestAnimationFrame` that sets `drawer.style.transform` to `'translateY(0)'`, which triggers the CSS slide-down transition defined in `createPanel`. After the `requestAnimationFrame` call, it sets the module-level `panelOpen` to `true`. The function writes `panelOpen` and two DOM properties, and returns `void`.

### close

`close` is synchronous and exported. It reads the DOM for `notif-panel` and `notif-drawer` by id and returns early if `notif-panel` is absent. It sets `drawer.style.transform` to `'translateY(-100%)'` immediately, triggering the slide-up CSS transition. It then calls `setTimeout` with a 300 ms delay, inside which it sets `panel.style.display` to `'none'`, hiding the element after the transition completes. It sets the module-level `panelOpen` to `false` synchronously before the timeout fires. The function writes `panelOpen` and schedules one DOM mutation via the timer; it returns `void`.

### markRead

`markRead` is synchronous and exported. It takes an `id` string and searches the module-level `notifications` array for the first element whose `id` matches. If no match is found, or if the matched notification already has `read === true`, the function does nothing. If a matching unread notification is found, it sets `n.read = true` directly on the object in the array, decrements `unreadCount` via `Math.max(0, unreadCount - 1)` and writes the result back to `unreadCount`, then calls `updateBadge()` to sync the DOM badge, and calls `renderList()` with no arguments to re-render the visible list.

After the synchronous DOM updates, it reads `getSupabaseClient()` and `getIsPlaceholderMode()` to determine whether a server call is warranted. If a client exists and placeholder mode is false, it calls `safeRpc('mark_notifications_read', { p_notification_ids: [id] })` and chains `.then` on the returned promise. Inside the `.then` callback, if the result contains an `error`, it logs it with `console.error`. The RPC call is fire-and-forget relative to the calling site — `markRead` itself returns `void` synchronously.

### markAllRead

`markAllRead` is synchronous and exported. It iterates the module-level `notifications` array with `forEach` and sets `read = true` on every element. It then sets `unreadCount` to `0` directly. It calls `updateBadge()` to hide the badge, and calls `renderList()` with no arguments to refresh the panel. It then checks `getSupabaseClient()` and `getIsPlaceholderMode()`. If a client exists and placeholder mode is false, it calls `safeRpc('mark_notifications_read', { p_notification_ids: null })`, where `null` signals the server function to mark all notifications read rather than a specific subset. The `.then` callback logs any error. As with `markRead`, the RPC call is fire-and-forget; the function returns `void` synchronously.

### updateBadge

`updateBadge` is synchronous. It reads the DOM for an element with id `notif-dot`. If found, it sets `dot.style.display` to `'block'` when the module-level `unreadCount` is greater than zero, or to `'none'` otherwise. It reads no parameters and no module-level state beyond `unreadCount`, writes one DOM property, and returns `void`.

### startPolling

`startPolling` is synchronous. It first checks the module-level `pollInterval`: if it is non-null, it calls `clearInterval(pollInterval)` to cancel any existing interval before registering a new one. It then calls `setInterval(fetchNotifications, 30_000)` and stores the returned interval id in `pollInterval`. Immediately after registering the interval, it calls `fetchNotifications()` and discards the returned promise with `void`, so the first fetch fires without waiting for the 30-second timer. The function returns `void`.

### destroy

`destroy` is synchronous and exported. It checks the module-level `pollInterval` and, if non-null, calls `clearInterval(pollInterval)` and sets `pollInterval` to `null`. It then resets module-level state: sets `notifications` to an empty array, `unreadCount` to `0`, and `panelOpen` to `false`. Finally it calls `updateBadge()`, which reads the now-zero `unreadCount` and hides the badge dot in the DOM. The function writes four module-level variables and one DOM property indirectly through `updateBadge`, and returns `void`.

### fetchNotifications

`fetchNotifications` is `async`. It reads `getSupabaseClient()`, `getIsPlaceholderMode()`, and `getCurrentUser()`. If any of the following is true — the client is falsy, placeholder mode is active, or the user is falsy — it returns early without making a network request.

If all guards pass, it enters a `try` block and calls `client.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)` and awaits the result. If the result contains an `error`, it throws it, jumping to the `catch` block where the error is logged with `console.error` and the function returns without updating state. On success, it writes the module-level `notifications` to the returned `data` array cast as `Notification[]`, or to an empty array if `data` is null. It recomputes `unreadCount` by counting notifications where `read` is false. It calls `updateBadge()` to sync the DOM. Finally, if the module-level `panelOpen` is `true`, it calls `renderList()` with no arguments to refresh the visible panel in place. The function is `async` and the PostgREST query is the single awaited call.

### bindBellButton

`bindBellButton` is synchronous. It reads the DOM for an element with id `notif-btn`. If none is found, the function does nothing. If found, it attaches a `click` event listener. The listener reads the module-level `panelOpen`: if `true`, it calls `close()`; if `false`, it calls `open()`. The function writes no state itself and returns `void`.

### init

`init` is synchronous and exported. It first reads `FEATURES.notifications` from the imported config; if falsy, it returns immediately and no UI is created or polling started. Otherwise, it calls `createPanel()` to build and attach the notification panel DOM structure, then calls `bindBellButton()` to wire the toggle listener on the bell element. It then reads `getIsPlaceholderMode()`. If placeholder mode is active, it writes the module-level `notifications` by calling `getPlaceholderNotifs()`, computes `unreadCount` by counting items with `read === false` in that array, and calls `updateBadge()` to show the badge count — no polling is started. If placeholder mode is inactive, it calls `startPolling()`, which immediately fires `fetchNotifications` and schedules subsequent fetches every 30 seconds. The function returns `void`. At module scope, outside `init`, the module also calls `ready.then(() => init()).catch(() => init())`, so `init` is called automatically once the auth `ready` promise settles, whether it resolves or rejects.

## Agent 04

### timeAgo

`timeAgo` receives a single parameter `dateStr`, which may be a string, `undefined`, or `null`. If `dateStr` is falsy it returns an empty string immediately. Otherwise it enters a `try` block and computes `diffSec` as the floor of `(Date.now() - new Date(dateStr).getTime()) / 1000`. It then applies a waterfall of comparisons: if `diffSec` is less than 60 it returns `'just now'`; if the derived `diffMin` (floor of `diffSec / 60`) is less than 60 it returns that number suffixed with `'m ago'`; if the derived `diffHr` (floor of `diffMin / 60`) is less than 24 it returns `diffHr + 'h ago'`; if the derived `diffDay` (floor of `diffHr / 24`) is less than 30 it returns `diffDay + 'd ago'`; otherwise it returns `Math.floor(diffDay / 30) + 'mo ago'`. The `catch` block swallows any exception (for example from an unparseable date string) and returns an empty string. The function is synchronous and reads no module-level state.

### getPlaceholderNotifs

`getPlaceholderNotifs` takes no parameters and reads no module-level state. Each call constructs and returns a freshly allocated array of seven hard-coded `Notification` objects. The objects cover types `challenge`, `reaction`, `result`, `stake_won`, `tier_up`, `follow`, and `system`. Each object carries a `time` string field rather than a `created_at` ISO timestamp. The first five have `read: false`; the last two have `read: true`. The function is synchronous and has no side effects.

### createPanel

`createPanel` is synchronous and takes no parameters. It begins by querying the DOM for an element with id `notif-panel`; if one already exists, it returns immediately without creating a second panel. Otherwise it creates a `<div>` element, assigns it the id `notif-panel`, and sets inline CSS that positions it as a fixed full-viewport overlay with `display:none`. It sets the element's `innerHTML` to a string containing a backdrop `<div>` (`notif-backdrop`), a slide-down drawer `<div>` (`notif-drawer`) with `transform:translateY(-100%)` as its initial state, a header row with "NOTIFICATIONS" text and two buttons (`notif-mark-all`, `notif-close`), a filter strip with five `.notif-filter` buttons (`all`, `challenge`, `result`, `reaction`, `economy`), and a scrollable list container (`notif-list`). The panel is appended to `document.body`.

After appending, `createPanel` attaches three event listeners. A `click` listener on `notif-backdrop` calls `close`. A `click` listener on `notif-close` also calls `close`. A `click` listener on `notif-mark-all` calls `markAllRead`. It then iterates over all `.notif-filter` buttons with `querySelectorAll` and, for each, attaches a `click` listener that removes the `active` class and resets the background and color style of every filter button, then adds `active` and applies accent styles to the clicked button, and finally calls `renderList` with the clicked button's `data-filter` attribute value cast to `NotificationFilter`. Finally, it attaches a single delegated `click` listener on `notif-list` that walks up from the event target via `closest('.notif-item')` and, if an item is found, calls `markRead` with the item's `data-id` attribute value. This delegation means the listener is registered once and covers all dynamically rendered items.

### renderList

`renderList` is synchronous and accepts an optional `filter` parameter of type `NotificationFilter`, defaulting to `'all'`. It queries the DOM for `notif-list` and returns immediately if that element is absent. It reads the module-level `notifications` array to compute a `filtered` subset: if `filter` is `'all'`, `filtered` is the full `notifications` array; if `filter` is `'economy'`, it filters to entries whose `type` is a member of the module-level constant set `ECONOMY_TYPES`; for any other filter value, it filters to entries whose `type` strictly equals the filter string. If `filtered` is empty, it sets `list.innerHTML` to a centered empty-state message with a muted bell icon and returns. If there are items, it maps each `Notification` to an HTML string: it looks up `TYPES[n.type]` (falling back to `TYPES.system`), builds an unread indicator dot if `n.read` is false, computes `displayTime` by calling `timeAgo(n.created_at)` if `created_at` is present or falling back to `n.time`, and interpolates all values into a `.notif-item` div that embeds `n.id` in a `data-id` attribute and passes `n.title`, `n.body`, and `displayTime` through `escapeHTML`. The joined HTML string is assigned to `list.innerHTML`. The function writes no module-level state.

### open

`open` is synchronous and takes no parameters. It queries the DOM for `notif-panel` and `notif-drawer`. If `notif-panel` is absent, it returns immediately. Otherwise, it calls `renderList` with no argument (using the `'all'` default) to populate the list with the current contents of the module-level `notifications` array. It then sets `panel.style.display` to `'flex'` to make the panel visible, then schedules a `requestAnimationFrame` callback that sets `drawer.style.transform` to `'translateY(0)'` — this deferred assignment allows the browser to register the element as visible before applying the CSS transition, producing the slide-down animation. After scheduling the frame, it sets the module-level `panelOpen` to `true`.

### close

`close` is synchronous and takes no parameters. It queries the DOM for `notif-panel` and `notif-drawer`. If `notif-panel` is absent, it returns immediately. Otherwise it sets `drawer.style.transform` back to `'translateY(-100%)'`, triggering the CSS slide-up transition. It then calls `setTimeout` with a 300-millisecond delay; when that timer fires, it sets `panel.style.display` to `'none'`, hiding the panel after the animation completes. Immediately after calling `setTimeout` (without waiting for it), it sets the module-level `panelOpen` to `false`. The 300ms delay mirrors the CSS transition duration declared in `createPanel`.

### markRead

`markRead` is synchronous in its main body but initiates a fire-and-forget async operation. It receives a single parameter `id`. It searches the module-level `notifications` array with `find` for a `Notification` whose `id` matches. If no matching notification is found, or if the found notification already has `read: true`, the function does nothing and returns. If the notification is found and unread, it mutates `n.read` to `true` in place, decrements the module-level `unreadCount` by one (clamped to 0 via `Math.max`), then calls `updateBadge` to refresh the bell indicator and calls `renderList` with no argument to re-render the current list. It then checks whether a Supabase client exists (via `getSupabaseClient()`) and whether placeholder mode is inactive (via `getIsPlaceholderMode()`). If both conditions are true, it calls `safeRpc('mark_notifications_read', { p_notification_ids: [id] })` and attaches a `.then` callback that logs any returned `error` to `console.error`. This RPC call is fire-and-forget; the function does not await it and returns before it resolves.

### markAllRead

`markAllRead` is synchronous in its main body but also initiates a fire-and-forget async operation. It takes no parameters. It iterates the module-level `notifications` array with `forEach` and sets `read` to `true` on every entry in place. It sets module-level `unreadCount` to `0`. It then calls `updateBadge` and calls `renderList` with no argument. It checks `getSupabaseClient()` and `getIsPlaceholderMode()` under the same condition as `markRead`: if a real client is present and placeholder mode is off, it calls `safeRpc('mark_notifications_read', { p_notification_ids: null })` — passing `null` as the ID list rather than an array, which signals the RPC to mark all notifications read for the current user. The `.then` callback logs any error to `console.error`. The RPC call is fire-and-forget.

### updateBadge

`updateBadge` is synchronous and takes no parameters. It queries the DOM for an element with id `notif-dot`. If that element exists, it sets its `style.display` to `'block'` when the module-level `unreadCount` is greater than zero, and to `'none'` otherwise. It reads no parameters and writes no module-level state; its sole effect is the DOM mutation on the badge element.

### startPolling

`startPolling` is synchronous in its own body and takes no parameters. It first checks the module-level `pollInterval`: if it is non-null, it calls `clearInterval` on it to cancel any existing interval before creating a new one. It then calls `setInterval` with `fetchNotifications` as the callback and 30,000 ms as the interval, storing the result in `pollInterval`. Immediately after registering the interval, it calls `fetchNotifications()` directly — prefixed with `void` to discard the returned promise — so that notifications are fetched once at startup without waiting for the first 30-second tick.

### destroy

`destroy` is synchronous and takes no parameters. It checks the module-level `pollInterval`; if it is non-null, it calls `clearInterval` to cancel the running interval and then sets `pollInterval` to `null`. It then resets module-level `notifications` to an empty array, sets `unreadCount` to `0`, and sets `panelOpen` to `false`. It calls `updateBadge` to hide the notification dot given that `unreadCount` is now zero. The function writes four module-level variables and produces one DOM side effect via `updateBadge`. It does not remove the DOM panel itself.

### fetchNotifications

`fetchNotifications` is an `async` function that takes no parameters. It reads the Supabase client via `getSupabaseClient()`, the current user via `getCurrentUser()`, and the placeholder-mode flag via `getIsPlaceholderMode()`. If the client is absent, placeholder mode is active, or `user` is falsy, the function returns immediately without making a network request. Otherwise, it enters a `try` block and `await`s a Supabase PostgREST query: it selects all columns from the `notifications` table, filters with `.eq('user_id', user.id)`, orders by `created_at` descending, and limits results to 50 rows. If the query returns an `error` object, it throws that error, transferring execution to the `catch` block. If the query succeeds, it assigns the returned `data` (cast to `Notification[] | null`, with `null` coerced to `[]`) to the module-level `notifications` array, recomputes `unreadCount` as the count of entries with `read: false`, and calls `updateBadge`. If the module-level `panelOpen` is `true`, it additionally calls `renderList` with no argument to refresh the visible panel. The `catch` block logs the error to `console.error` and does not re-throw.

### bindBellButton

`bindBellButton` is synchronous and takes no parameters. It queries the DOM for an element with id `notif-btn`. If that element is found, it attaches a `click` event listener. When the listener fires, it reads the module-level `panelOpen` flag: if `panelOpen` is `true`, it calls `close`; otherwise it calls `open`. If no element with id `notif-btn` exists in the DOM at the time `bindBellButton` runs, the function exits silently and no listener is registered.

### init

`init` is synchronous and takes no parameters. It reads the `FEATURES.notifications` flag from `config.ts`; if that flag is falsy, the function returns immediately and performs no further action. If the flag is truthy, it calls `createPanel` to build the drawer DOM (which is a no-op if the panel already exists) and calls `bindBellButton` to attach the toggle listener to the bell button. It then checks `getIsPlaceholderMode()`: if placeholder mode is active, it calls `getPlaceholderNotifs()` and assigns the returned array to module-level `notifications`, computes `unreadCount` as the count of entries with `read: false` in that array, and calls `updateBadge` to show the badge. If placeholder mode is not active, it calls `startPolling`, which immediately fires `fetchNotifications` and schedules it to repeat every 30 seconds. The module-level auto-init expression at line 424 calls `init` inside a `.then` callback on the imported `ready` promise, with a `.catch` fallback that also calls `init`, meaning `init` runs once after auth is ready regardless of whether the `ready` promise resolves or rejects.

## Agent 05

### timeAgo

`timeAgo` receives a single parameter `dateStr`, which may be a string, `undefined`, or `null`. If `dateStr` is falsy, the function returns an empty string immediately. Otherwise, it enters a `try` block where it reads `Date.now()` for the current timestamp and parses `dateStr` via `new Date(dateStr).getTime()` to compute `then`. It subtracts `then` from `now` and divides by 1000 to get a `diffSec` value. The function then applies a cascading series of threshold checks: if `diffSec` is under 60 it returns `'just now'`; if the derived `diffMin` is under 60 it returns a string of the form `Nm ago`; if the derived `diffHr` is under 24 it returns `Nh ago`; if the derived `diffDay` is under 30 it returns `Nd ago`; otherwise it returns `Nmo ago`. If `new Date(dateStr)` throws, the `catch` block returns an empty string. The function is synchronous and writes no state.

### getPlaceholderNotifs

`getPlaceholderNotifs` takes no parameters and reads no module-level state or external state. Each call constructs and returns a fresh array literal of seven hard-coded `Notification` objects covering types `challenge`, `reaction`, `result`, `stake_won`, `tier_up`, `follow`, and `system`. All objects use the `time` field (a human-readable string) rather than `created_at`, and five of the seven have `read: false`. The function is synchronous and writes nothing.

### createPanel

`createPanel` is synchronous and takes no parameters. It begins by querying the DOM for an element with id `notif-panel`; if one already exists, it returns immediately without creating a second panel. Otherwise it creates a `<div>` element, assigns it the id `notif-panel`, and sets inline CSS that positions it as a fixed full-viewport overlay with `display:none`. It sets the element's `innerHTML` to a string containing a backdrop `<div>` (`notif-backdrop`), a slide-down drawer `<div>` (`notif-drawer`) with `transform:translateY(-100%)` as its initial state, a header row with "NOTIFICATIONS" text and two buttons (`notif-mark-all`, `notif-close`), a filter strip with five `.notif-filter` buttons (`all`, `challenge`, `result`, `reaction`, `economy`), and a scrollable list container (`notif-list`). The panel is appended to `document.body`.

After appending, `createPanel` attaches three event listeners. A `click` listener on `notif-backdrop` calls `close`. A `click` listener on `notif-close` also calls `close`. A `click` listener on `notif-mark-all` calls `markAllRead`. It then iterates over all `.notif-filter` buttons with `querySelectorAll` and, for each, attaches a `click` listener that removes the `active` class and resets the background and color style of every filter button, then adds `active` and applies accent styles to the clicked button, and finally calls `renderList` with the clicked button's `data-filter` attribute value cast to `NotificationFilter`. Finally, it attaches a single delegated `click` listener on `notif-list` that walks up from the event target via `closest('.notif-item')` and, if an item is found, calls `markRead` with the item's `data-id` attribute value.

### renderList

`renderList` is synchronous and accepts an optional `filter` parameter of type `NotificationFilter`, defaulting to `'all'`. It queries the DOM for `notif-list` and returns immediately if that element is absent. It reads the module-level `notifications` array to compute a `filtered` subset: if `filter` is `'all'`, `filtered` is the full `notifications` array; if `filter` is `'economy'`, it filters to entries whose `type` is a member of the module-level constant set `ECONOMY_TYPES`; for any other filter value, it filters to entries whose `type` strictly equals the filter string. If `filtered` is empty, it sets `list.innerHTML` to a centered empty-state message with a muted bell icon and returns. If there are items, it maps each `Notification` to an HTML string: it looks up `TYPES[n.type]` (falling back to `TYPES.system`), builds an unread indicator dot if `n.read` is false, computes `displayTime` by calling `timeAgo(n.created_at)` if `created_at` is present or falling back to `n.time`, and interpolates all values into a `.notif-item` div that embeds `n.id` in a `data-id` attribute and passes `n.title`, `n.body`, and `displayTime` through `escapeHTML`. The joined HTML string is assigned to `list.innerHTML`. The function writes no module-level state.

### open

`open` is synchronous and exported. It queries the DOM for `notif-panel` and `notif-drawer`. If `notif-panel` is absent, it returns immediately. Otherwise, it calls `renderList` with no argument (using the `'all'` default) to populate the list with the current contents of the module-level `notifications` array. It then sets `panel.style.display` to `'flex'` to make the panel visible, then schedules a `requestAnimationFrame` callback that sets `drawer.style.transform` to `'translateY(0)'` — this deferred assignment allows the browser to register the element as visible before applying the CSS transition, producing the slide-down animation. After scheduling the frame, it sets the module-level `panelOpen` to `true`.

### close

`close` is synchronous and exported. It queries the DOM for `notif-panel` and `notif-drawer`. If `notif-panel` is absent, it returns immediately. Otherwise it sets `drawer.style.transform` back to `'translateY(-100%)'`, triggering the CSS slide-up transition. It then calls `setTimeout` with a 300-millisecond delay; when that timer fires, it sets `panel.style.display` to `'none'`, hiding the panel after the animation completes. Immediately after calling `setTimeout` (without waiting for it), it sets the module-level `panelOpen` to `false`. The 300ms delay mirrors the CSS transition duration declared in `createPanel`.

### markRead

`markRead` is synchronous in its main body but initiates a fire-and-forget async operation. It receives a single parameter `id`. It searches the module-level `notifications` array with `find` for a `Notification` whose `id` matches. If no matching notification is found, or if the found notification already has `read: true`, the function does nothing and returns. If the notification is found and unread, it mutates `n.read` to `true` in place, decrements the module-level `unreadCount` by one (clamped to 0 via `Math.max`), then calls `updateBadge` to refresh the bell indicator and calls `renderList` with no argument to re-render the current list. It then checks whether a Supabase client exists (via `getSupabaseClient()`) and whether placeholder mode is inactive (via `getIsPlaceholderMode()`). If both conditions are true, it calls `safeRpc('mark_notifications_read', { p_notification_ids: [id] })` and attaches a `.then` callback that logs any returned `error` to `console.error`. This RPC call is fire-and-forget; the function does not await it and returns before it resolves.

### markAllRead

`markAllRead` is synchronous in its main body but also initiates a fire-and-forget async operation. It takes no parameters. It iterates the module-level `notifications` array with `forEach` and sets `read` to `true` on every entry in place. It sets module-level `unreadCount` to `0`. It then calls `updateBadge` and calls `renderList` with no argument. It checks `getSupabaseClient()` and `getIsPlaceholderMode()` under the same condition as `markRead`: if a real client is present and placeholder mode is off, it calls `safeRpc('mark_notifications_read', { p_notification_ids: null })` — passing `null` as the ID list rather than an array, which signals the RPC to mark all notifications read for the current user. The `.then` callback logs any error to `console.error`. The RPC call is fire-and-forget.

### updateBadge

`updateBadge` is synchronous and takes no parameters. It queries the DOM for an element with id `notif-dot`. If that element exists, it sets its `style.display` to `'block'` when the module-level `unreadCount` is greater than zero, and to `'none'` otherwise. It reads no parameters and writes no module-level state; its sole effect is the DOM mutation on the badge element.

### startPolling

`startPolling` is synchronous in its own body and takes no parameters. It first checks the module-level `pollInterval`: if it is non-null, it calls `clearInterval` on it to cancel any existing interval before creating a new one. It then calls `setInterval` with `fetchNotifications` as the callback and 30,000 ms as the interval, storing the result in `pollInterval`. Immediately after registering the interval, it calls `fetchNotifications()` directly — prefixed with `void` to discard the returned promise — so that notifications are fetched once at startup without waiting for the first 30-second tick.

### destroy

`destroy` is synchronous and takes no parameters. It checks the module-level `pollInterval`; if it is non-null, it calls `clearInterval` to cancel the running interval and then sets `pollInterval` to `null`. It then resets module-level `notifications` to an empty array, sets `unreadCount` to `0`, and sets `panelOpen` to `false`. It calls `updateBadge` to hide the notification dot given that `unreadCount` is now zero. The function writes four module-level variables and produces one DOM side effect via `updateBadge`. It does not remove the DOM panel itself.

### fetchNotifications

`fetchNotifications` is an `async` function that takes no parameters. It reads the Supabase client via `getSupabaseClient()`, the current user via `getCurrentUser()`, and the placeholder-mode flag via `getIsPlaceholderMode()`. If the client is absent, placeholder mode is active, or `user` is falsy, the function returns immediately without making a network request. Otherwise, it enters a `try` block and `await`s a Supabase PostgREST query: it selects all columns from the `notifications` table, filters with `.eq('user_id', user.id)`, orders by `created_at` descending, and limits results to 50 rows. If the query returns an `error` object, it throws that error, transferring execution to the `catch` block. If the query succeeds, it assigns the returned `data` (cast to `Notification[] | null`, with `null` coerced to `[]`) to the module-level `notifications` array, recomputes `unreadCount` as the count of entries with `read: false`, and calls `updateBadge`. If the module-level `panelOpen` is `true`, it additionally calls `renderList` with no argument to refresh the visible panel. The `catch` block logs the error to `console.error` and does not re-throw.

### bindBellButton

`bindBellButton` is synchronous and takes no parameters. It queries the DOM for an element with id `notif-btn`. If that element is found, it attaches a `click` event listener. When the listener fires, it reads the module-level `panelOpen` flag: if `panelOpen` is `true`, it calls `close`; otherwise it calls `open`. If no element with id `notif-btn` exists in the DOM at the time `bindBellButton` runs, the function exits silently and no listener is registered.

### init

`init` is synchronous and takes no parameters. It reads the `FEATURES.notifications` flag from `config.ts`; if that flag is falsy, the function returns immediately and performs no further action. If the flag is truthy, it calls `createPanel` to build the drawer DOM (which is a no-op if the panel already exists) and calls `bindBellButton` to attach the toggle listener to the bell button. It then checks `getIsPlaceholderMode()`: if placeholder mode is active, it calls `getPlaceholderNotifs()` and assigns the returned array to module-level `notifications`, computes `unreadCount` as the count of entries with `read: false` in that array, and calls `updateBadge` to show the badge. If placeholder mode is not active, it calls `startPolling`, which immediately fires `fetchNotifications` and schedules it to repeat every 30 seconds. The module-level auto-init expression at line 424 calls `init` inside a `.then` callback on the imported `ready` promise, with a `.catch` fallback that also calls `init`, meaning `init` runs once after auth is ready regardless of whether the `ready` promise resolves or rejects.
