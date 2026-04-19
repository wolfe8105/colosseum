# Stage 2 Outputs — notifications.ts

## Agent 01

### fetchNotifications

When called, fetchNotifications first reads the Supabase client via getSupabaseClient(), the current user via getCurrentUser(), and the placeholder mode flag via getIsPlaceholderMode(). It returns immediately if any of these reads—client, user, or placeholder mode enabled—indicate the function should not proceed. If execution continues, it performs a try-catch block: within the try, it awaits a Supabase query that selects all notification records for the user, ordering them by creation date descending and limiting to 50 results. Upon successful query completion, it extracts the data field and passes either the data array or an empty array to setNotifications() to update module-level state. It then calls computeUnreadCount() to recalculate unread state, updateBadge() to refresh the UI badge, and if panelOpen (a module-level state variable) is truthy, it calls renderList() to redraw the notification panel. If the query returns an error or any exception occurs, the catch block logs the error to the console without rethrowing.

### startPolling

When called, startPolling reads the module-level pollInterval variable. If pollInterval is currently set to a non-null value, it calls clearInterval() to stop the existing interval. It then calls setPollInterval() to write a new interval ID returned from setInterval(), setting the interval to invoke fetchNotifications every 30,000 milliseconds. After establishing the interval, it immediately calls fetchNotifications() without awaiting—this is a fire-and-forget invocation that starts fetching before the polling cadence begins.

### destroy

When called, destroy reads the module-level pollInterval variable. If pollInterval is set, it calls clearInterval() to stop the running interval and calls setPollInterval() with null to clear the module-level state. It then calls setNotifications() with an empty array to clear the notifications state, calls computeUnreadCount() to update unread counts, and calls updateBadge() to refresh the UI badge.

### init

When called, init first reads FEATURES.notifications from the config module. If this flag is falsy, the function returns immediately and performs no further work. If the flag is truthy, it calls createPanel() to create the notification panel DOM structure. It then reads document.getElementById('notif-btn') from the DOM and, if an element is found, attaches a click event listener that toggles the panel—reading panelOpen to decide whether to call close_panel() or open_panel(). Next, it reads getIsPlaceholderMode() to branch: in placeholder mode, it calls getPlaceholderNotifs() to read mock notification data, passes it to setNotifications() to write module state, then calls computeUnreadCount() and updateBadge() to update derived state and UI. In non-placeholder mode, it calls startPolling() to begin the polling cycle.

## Agent 02

### fetchNotifications

This async function reads the Supabase client via `getSupabaseClient()`, the current user via `getCurrentUser()`, and checks placeholder mode via `getIsPlaceholderMode()`. If any of these are falsy or if placeholder mode is active, the function returns early. Within a try block, it awaits a Supabase query to the notifications table filtered by user_id and ordered by created_at descending, limited to 50 records. On error, the error is thrown and caught in the catch block, which logs it. On success, it writes the fetched notifications to module state via `setNotifications()`, calls `computeUnreadCount()` to update unread count state, calls `updateBadge()` to update the UI badge, and if `panelOpen` state is true, calls `renderList()` to re-render the notification panel. If the query returns null data, it treats it as an empty array.

### startPolling

This function reads the current `pollInterval` state and clears it if it exists via `clearInterval()`. It then writes a new interval ID to `pollInterval` state via `setPollInterval()`, creating an interval that calls `fetchNotifications` every 30,000 milliseconds. It also immediately invokes `fetchNotifications()` with void to fire-and-forget, not awaiting the result.

### destroy

This function reads the `pollInterval` state and, if it exists, calls `clearInterval()` to stop the interval and writes null to `pollInterval` state via `setPollInterval()`. It then writes an empty array to notifications state via `setNotifications()`, calls `computeUnreadCount()` to update unread count state, and calls `updateBadge()` to update the UI badge.

### init

This function first reads the `FEATURES.notifications` configuration flag. If it is falsy, the function returns early. It calls `createPanel()` to initialize the notification panel DOM, then reads the DOM element with ID 'notif-btn'. If the element exists, it attaches a click event listener that checks the `panelOpen` state and calls either `close_panel()` or `open_panel()` accordingly. It then reads `getIsPlaceholderMode()`. If true, it calls `setNotifications()` with placeholder notifications from `getPlaceholderNotifs()`, calls `computeUnreadCount()` to update state, and calls `updateBadge()`. If placeholder mode is false, it calls `startPolling()` instead.

## Agent 03

### fetchNotifications

Reads the Supabase client from `getSupabaseClient()`, the current user from `getCurrentUser()`, and the placeholder mode flag from `getIsPlaceholderMode()`. If any of these are unavailable or placeholder mode is active, the function returns without executing further. Otherwise, it queries the 'notifications' table from Supabase, filtering by the current user's ID and ordering by creation date in descending order with a limit of 50 results. If the query returns an error, it throws the error; otherwise, it casts the returned data to a `Notification[]` array or uses an empty array as default, then passes this to `setNotifications()` to update module-level state. It then calls `computeUnreadCount()` to recalculate the unread notification count and `updateBadge()` to refresh the badge display. If the panel is currently open (determined by checking `panelOpen`), it calls `renderList()` to update the notification list view. All errors are caught and logged to the console without rethrowing. This function is async and does not await any calls other than the Supabase `.select()` operation.

### startPolling

Checks if `pollInterval` (module-level state holding an interval ID) is already set, and if so, clears it with `clearInterval()`. It then creates a new interval using `setInterval()` that calls `fetchNotifications()` every 30 seconds, stores the interval ID in module-level state via `setPollInterval()`, and immediately calls `fetchNotifications()` once as a fire-and-forget call (preceded by `void` to suppress async warnings). This function is synchronous.

### destroy

Checks if `pollInterval` is set and, if it is, clears the interval with `clearInterval()` and sets the module-level state to `null` via `setPollInterval()`. It then clears the notifications list by calling `setNotifications([])`, recalculates the unread count with `computeUnreadCount()`, and updates the badge with `updateBadge()`. This function is synchronous.

### init

Checks if the notifications feature is enabled via `FEATURES.notifications`; if not, the function returns early. Otherwise, it calls `createPanel()` to construct the notification panel in the DOM. It then queries the DOM for an element with ID 'notif-btn' and, if found, attaches a click event listener that toggles the panel by calling `close_panel()` if `panelOpen` is true or `open_panel()` if it is false. The function then checks `getIsPlaceholderMode()`; if true, it populates notifications with placeholder data via `getPlaceholderNotifs()`, then calls `setNotifications()` to update module-level state, followed by `computeUnreadCount()` and `updateBadge()`. If placeholder mode is false, it calls `startPolling()` to begin the polling cycle. This function is synchronous.

## Agent 04

### fetchNotifications

This async function reads the Supabase client, current user, and placeholder mode state. If the client is unavailable, placeholder mode is active, or the user is not authenticated, the function returns early without side effects. On the happy path, it queries the `notifications` table using Supabase's client, filtering by `user_id`, ordering by `created_at` in descending order, and limiting results to 50 rows. If the query returns an error, the error is thrown. On success, `setNotifications` is called to update the module-level `notifications` state with the returned data (or an empty array if null), then `computeUnreadCount` is called to recalculate unread notification counts, `updateBadge` is called to refresh the UI badge, and if `panelOpen` is true, `renderList` is called to update the notification list display. If any exception occurs during the try block, it is caught and logged to the console as "Notifications fetch error".

### startPolling

This synchronous function reads the module-level `pollInterval` state. If `pollInterval` is truthy, `clearInterval` is called to stop the existing interval. Then `setPollInterval` is called to set a new interval that runs `fetchNotifications` every 30 seconds (30,000 milliseconds), storing the interval ID in module-level state. Finally, `fetchNotifications` is invoked immediately as a fire-and-forget call (preceded by `void` to suppress async warnings), initiating the first fetch without waiting for its result.

### destroy

This synchronous function reads the module-level `pollInterval` state. If `pollInterval` is truthy, `clearInterval` is called to stop the polling interval and `setPollInterval` is called to set the module-level state to `null`. Then `setNotifications` is called to clear the module-level `notifications` state to an empty array, `computeUnreadCount` is called to recalculate unread counts, and `updateBadge` is called to refresh the UI badge.

### init

This synchronous function first reads the `FEATURES.notifications` flag and returns early if notifications are disabled. If notifications are enabled, `createPanel` is called to construct the notification panel UI. The function then reads `document` to locate an element with id `notif-btn` and, if it exists, attaches a click event listener that checks the module-level `panelOpen` state: if the panel is open, `close_panel` is called; if closed, `open_panel` is called. Next, the function reads `getIsPlaceholderMode()` to determine the initialization path. In placeholder mode, `setNotifications` is called to populate notifications with placeholder data from `getPlaceholderNotifs()`, `computeUnreadCount` is called, and `updateBadge` is called. In non-placeholder mode, `startPolling` is called to begin polling for notifications. The function is called automatically when the `ready` promise resolves, with any rejection also triggering `init()`.

## Agent 05

### fetchNotifications

When called, this async function reads the Supabase client from `getSupabaseClient()`, the current user from `getCurrentUser()`, and checks module-level state via `getIsPlaceholderMode()`. If any of these preconditions fail (no client, placeholder mode active, or no user), the function returns early without proceeding. In the normal path, it queries the 'notifications' table from Supabase, filtering by `user_id` matching the current user's id, ordering by `created_at` descending, and limiting to 50 results. If the query returns an error, it throws. Otherwise, it writes the returned data (or an empty array if null) to module-level state via `setNotifications()`, then calls `computeUnreadCount()` to update the unread count. It then calls `updateBadge()` to update the UI badge. If the notification panel is currently open (checked via the `panelOpen` module-level variable), it calls `renderList()` to redraw the panel. Any error caught in the try block is logged to the console. The function returns a Promise that resolves to void.

### startPolling

This synchronous function begins by checking the module-level `pollInterval` variable; if it holds an active interval, it clears it. It then calls `setPollInterval()` with a new interval set to fire `fetchNotifications` every 30,000 milliseconds (30 seconds), and sets this interval in module-level state. Finally, it fire-and-forgets a call to `fetchNotifications()` by prefixing it with `void` to suppress the async warning, immediately fetching notifications before waiting for the polling interval.

### destroy

This exported synchronous function clears the polling state by checking the module-level `pollInterval` variable and, if it exists, calling `clearInterval()` on it and then writing `null` back via `setPollInterval()`. It then resets the notification list by calling `setNotifications([])` with an empty array, recomputes the unread count via `computeUnreadCount()`, and updates the UI badge via `updateBadge()`. The function returns void.

### init

This exported synchronous function first checks the `FEATURES.notifications` flag; if it is falsy, the function returns early. Otherwise, it calls `createPanel()` to render the notification panel UI. It then queries the DOM for an element with id 'notif-btn' and, if found, attaches a click event listener that toggles the panel open or closed by checking the `panelOpen` module-level variable and calling either `close_panel()` or `open_panel()` accordingly. The function then branches on `getIsPlaceholderMode()`: in placeholder mode, it calls `setNotifications()` with placeholder notifications from `getPlaceholderNotifs()`, then `computeUnreadCount()` and `updateBadge()` to update the UI; in normal mode, it calls `startPolling()` to begin polling for real notifications. The function returns void.
