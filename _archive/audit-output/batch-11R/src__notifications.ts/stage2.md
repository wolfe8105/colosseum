# Stage 2 Outputs — notifications.ts

## Agent 01

### timeAgo
Accepts a date string and returns a human-readable relative time string. Returns empty string for falsy input; wraps the computation in try/catch returning '' on any parse error. Thresholds: <60s → 'just now'; <60m → 'Xm ago'; <24h → 'Xh ago'; <30d → 'Xd ago'; else 'Xmo ago'. No side effects; pure computation.

### getPlaceholderNotifs
Returns a hardcoded array of 7 mock Notification objects covering: challenge, reaction, result, stake_won, tier_up, follow, system. Five are unread (ids 1–5), two are read (ids 6–7). Uses the `time` field (pre-formatted strings), not `created_at` — `timeAgo()` is not called on them during rendering. No I/O or side effects.

### createPanel
Injects the notification drawer UI into document.body if it does not already exist (guards on #notif-panel presence). Builds a fixed-position full-screen overlay with a backdrop, slide-down drawer, header with "Mark all read" and close buttons, 5 filter tabs (all/challenge/result/reaction/economy), and empty notif-list container. Wires four categories of event listeners: backdrop/close-btn → close(); mark-all-btn → markAllRead(); filter tabs → update active CSS then renderList(filter); delegated click on notif-list → markRead(item.dataset.id). All listeners are wired once — not re-attached on re-render.

### renderList
Guard: no #notif-list → return. Filters module `notifications` array: 'all' passes all; 'economy' uses ECONOMY_TYPES.has(n.type); else n.type === filter exact match. If empty: renders 🔕 empty-state. Otherwise maps to HTML rows: escapeHTML on id/title/body/display time, TYPES[n.type] icon (fallback TYPES.system), timeAgo(n.created_at) with n.time as fallback, magenta dot if !n.read. Sets notif-list innerHTML.

### open
Guard: no #notif-panel → return. Calls renderList() to populate content. Sets panel display to 'flex'. Uses requestAnimationFrame to set drawer transform to 'translateY(0)'. Sets panelOpen = true.

### close
Guard: no #notif-panel → return. Sets drawer transform to 'translateY(-100%)'. setTimeout 300ms → sets panel display to 'none'. Sets panelOpen = false immediately (synchronously, before the timeout fires).

### markRead
Finds notification by id in module array. If found and !n.read: sets n.read=true, decrements unreadCount (floor at 0), calls updateBadge() and renderList(). If real mode (client && !placeholder): fires safeRpc('mark_notifications_read', {p_notification_ids: [id]}) fire-and-forget; logs error on failure. Optimistic local update — not rolled back on RPC error.

### markAllRead
Sets all notifications.read=true via forEach. Sets unreadCount=0. Calls updateBadge() and renderList(). If real mode: fires safeRpc('mark_notifications_read', {p_notification_ids: null}) fire-and-forget (null = mark all for user server-side). Logs RPC errors.

### updateBadge
Gets #notif-dot. If found: shows (display:block) when unreadCount > 0, hides (display:none) otherwise. Pure DOM side effect.

### startPolling
Clears any existing pollInterval to prevent duplicates. Sets new setInterval(fetchNotifications, 30000). Immediately calls void fetchNotifications() so data loads without waiting for the first tick.

### destroy
Clears and nulls pollInterval. Resets notifications=[], unreadCount=0, panelOpen=false. Calls updateBadge() to hide the badge dot. Does not remove the panel from the DOM.

### fetchNotifications
Async. Guards: no client, placeholder mode, or no user → early return. Queries `notifications` table directly via PostgREST (.from().select(), not safeRpc), filtered by user_id, ordered by created_at descending, limit 50. On success: overwrites module notifications array, recomputes unreadCount, calls updateBadge(). If panelOpen: calls renderList(). On error: console.error.

### bindBellButton
Gets #notif-btn. If found: attaches click listener — if panelOpen → close(); else → open(). Toggle behavior. No-ops silently if button absent.

### init
Guard: !FEATURES.notifications → return. Calls createPanel() and bindBellButton() unconditionally. In placeholder mode: populates notifications with getPlaceholderNotifs(), computes unreadCount (5 of 7 unread), calls updateBadge(). In real mode: calls startPolling() (immediate fetch + 30s interval). At module load, init is invoked automatically via ready.then(() => init()).catch(() => init()).

---

## Agent 02

### timeAgo
Converts an ISO date string to a human-readable relative time label. Guards against null/undefined by returning ''. Computes delta in seconds from Date.now() and steps through thresholds (60s → minutes, 60m → hours, 24h → days, 30d → months). Any parse error is swallowed; returns ''.

### getPlaceholderNotifs
Returns a hardcoded array of 7 mock Notification objects covering every notification type. Last two are read:true; rest are unread. Used exclusively in placeholder/guest mode — no I/O or side effects.

### createPanel
Idempotent: bails immediately if notif-panel already exists. Creates slide-down notification drawer injected into document.body. Wires four event listener groups: backdrop/close-btn → close(); mark-all → markAllRead(); filter buttons → deactivate siblings, call renderList(filter); notif-list delegation → markRead(data-id).

### renderList
Reads notifications array, applies filter, rewrites notif-list innerHTML. Empty filtered set → 🔕 placeholder. Each item: escapeHTML on all user-derived fields, unread magenta dot when n.read=false. timeAgo() on created_at; fallback to static time string.

### open
Guard: no panel → return. Calls renderList(), sets panel to display:flex, requestAnimationFrame slides drawer to translateY(0). Sets panelOpen = true.

### close
Guard: no panel → return. Slides drawer to translateY(-100%), hides panel after 300ms timeout. Sets panelOpen = false synchronously (before panel is visually hidden).

### markRead
Looks up by id. If found and !read: marks read, decrements unreadCount (min 0), updateBadge(), renderList(). Fires async safeRpc('mark_notifications_read', {p_notification_ids: [id]}) if real mode. Optimistic update — no rollback on error.

### markAllRead
Sets all n.read=true, unreadCount=0, updateBadge(), renderList(). Fires safeRpc with p_notification_ids=null (mark all server-side) if real mode. Errors logged.

### updateBadge
Toggles #notif-dot display:block/none based on unreadCount > 0. Pure DOM side effect.

### startPolling
Clears existing interval, sets new 30s interval calling fetchNotifications. Immediately fires fetchNotifications() via void. pollInterval handle stored for destroy().

### destroy
Cancels interval, nulls pollInterval. Resets notifications=[], unreadCount=0, panelOpen=false. Calls updateBadge(). Does not remove panel from DOM.

### fetchNotifications
Async. Guards: no client, placeholder mode, no user → return. PostgREST query on notifications table (not safeRpc), user_id filter, created_at desc, limit 50. Success: replaces notifications array, recomputes unreadCount, updateBadge(), renderList() if panelOpen. Error: console.error.

### bindBellButton
Finds #notif-btn, attaches click listener toggling close()/open() based on panelOpen. Silent no-op if button absent.

### init
Gates on FEATURES.notifications. Calls createPanel() and bindBellButton(). Placeholder: loads mock data, unreadCount from array, updateBadge(). Real: startPolling(). Auto-called via ready.then().catch() at module load.

---

## Agent 03

### timeAgo
Guard: falsy → return ''. Try/catch wraps calculation (returns '' on error). Computes seconds difference. Five thresholds: <60s → 'just now'; <60m → 'Xm ago'; <24h → 'Xh ago'; <30d → 'Xd ago'; else 'Xmo ago'. Pure; no side effects.

### getPlaceholderNotifs
Returns hardcoded array of 7 Notification objects. Types: challenge, reaction, result, stake_won, tier_up, follow, system. Items 1–5 read:false; 6–7 read:true. Uses time field (pre-formatted), not created_at. Static data factory — no I/O.

### createPanel
Idempotent: returns if #notif-panel exists. Creates fixed full-screen overlay div appended to body, containing backdrop, drawer with header, 5 filter tabs, empty #notif-list. Wires: backdrop/close-btn → close(); mark-all → markAllRead(); filter tabs → update active styles, renderList(filter); delegated list click → markRead(item.dataset.id). All events wired once.

### renderList
Guard: no #notif-list → return. Filters notifications: 'all'→all; 'economy'→ECONOMY_TYPES.has(n.type); else strict n.type match. Empty → 🔕 empty-state. Map to HTML: escapeHTML on id/title/body/time; TYPES[n.type] icon (fallback system); timeAgo(created_at) || n.time; magenta dot for !read. Sets innerHTML.

### open
Guard: no #notif-panel → return. renderList(). Panel display:flex. requestAnimationFrame → drawer translateY(0). panelOpen=true.

### close
Guard: no #notif-panel → return. Drawer translateY(-100%). setTimeout 300ms → panel display:none. panelOpen=false immediately.

### markRead
Find by id. If found and !read: n.read=true, unreadCount-- (min 0), updateBadge(), renderList(). Real mode: safeRpc('mark_notifications_read', {p_notification_ids: [id]}) fire-and-forget; log error. Optimistic update.

### markAllRead
forEach n.read=true. unreadCount=0. updateBadge(). renderList(). Real mode: safeRpc('mark_notifications_read', {p_notification_ids: null}) — null means mark all. Log errors.

### updateBadge
#notif-dot display toggle: block if unreadCount>0, none if 0. Silent no-op if element absent.

### startPolling
Clear existing interval. setInterval(fetchNotifications, 30000). void fetchNotifications() immediately.

### destroy
clearInterval + null pollInterval. notifications=[], unreadCount=0, panelOpen=false. updateBadge(). Panel stays in DOM.

### fetchNotifications
Guards: no client, placeholder, no user → return. PostgREST query: notifications table, eq user_id, order created_at desc, limit 50. Error → throw (caught → console.error). Success: replace notifications, recompute unreadCount, updateBadge(), renderList() if panelOpen.

### bindBellButton
#notif-btn: click → panelOpen ? close() : open(). Silent if absent.

### init
Guard: !FEATURES.notifications → return. createPanel(), bindBellButton(). Placeholder: getPlaceholderNotifs(), unreadCount, updateBadge(). Real: startPolling().

---

## Agent 04

### timeAgo
Converts date string to relative time. Guard: falsy → ''; try/catch → '' on error. Thresholds: <60s → 'just now'; <60m → 'Xm ago'; <24h → 'Xh ago'; <30d → 'Xd ago'; else 'Xmo ago'. Pure function.

### getPlaceholderNotifs
Returns 7 hardcoded Notification objects. Types: challenge, reaction, result, stake_won, tier_up, follow, system. IDs 1–5 read:false; 6–7 read:true (5 unread establishes initial unreadCount in placeholder mode). Uses time strings, not created_at.

### createPanel
Idempotent — exits immediately if #notif-panel exists. Builds fixed full-screen overlay containing backdrop, drawer (header + 5 filter tabs + #notif-list). Appends to body. Wires all listeners once: backdrop/close → close(); mark-all → markAllRead(); filter tabs → renderList(filter) + active styles; delegated notif-list click → markRead(item.dataset.id).

### renderList
Guard: no #notif-list → return. Filter logic: 'all'→all; 'economy'→ECONOMY_TYPES set; else n.type===filter. Empty → 🔕 empty state. Build HTML: escapeHTML on id/title/body/time; TYPES icon (fallback system); timeAgo(created_at) preferred, n.time fallback; magenta dot if !read. Sets innerHTML.

### open
Guard: no panel → return. renderList(), display:flex, rAF → translateY(0), panelOpen=true.

### close
Guard: no panel → return. translateY(-100%), setTimeout(300) → display:none, panelOpen=false (synchronously).

### markRead
Find by id, if found and !read: n.read=true, unreadCount Math.max(0, -1), updateBadge(), renderList(). Real mode: safeRpc('mark_notifications_read', {p_notification_ids: [id]}) fire-and-forget. Optimistic; no rollback.

### markAllRead
forEach n.read=true. unreadCount=0. updateBadge(). renderList(). Real mode: safeRpc('mark_notifications_read', {p_notification_ids: null}). Logs errors.

### updateBadge
#notif-dot: display:block if unreadCount>0, display:none otherwise. Silent no-op if absent.

### startPolling
Clear old interval. setInterval(fetchNotifications, 30000) → pollInterval. void fetchNotifications() immediately.

### destroy
clearInterval(pollInterval), pollInterval=null. notifications=[], unreadCount=0, panelOpen=false. updateBadge(). Panel not removed from DOM.

### fetchNotifications
Async. Guards: no client, placeholder, no user → return. PostgREST query notifications table, user_id eq, created_at desc, limit 50. On success: replace notifications array, recompute unreadCount, updateBadge(), renderList() if panelOpen. catch → console.error.

### bindBellButton
#notif-btn click → panelOpen ? close() : open(). Silent if button absent. Should only be called once (init calls it exactly once).

### init
Guard: !FEATURES.notifications → return. createPanel(), bindBellButton(). Placeholder: getPlaceholderNotifs(), unreadCount=5, updateBadge(). Real: startPolling() → immediate fetch + 30s interval.

---

## Agent 05

### timeAgo
Converts ISO date string to human-readable relative time. Guard: falsy → ''. Try/catch → '' on error. Thresholds cascade: <60s → 'just now'; <1h → 'Nm ago'; <24h → 'Nh ago'; <30d → 'Nd ago'; else 'Nmo ago'. No side effects.

### getPlaceholderNotifs
Returns hardcoded array of 7 Notification objects (challenge/reaction/result/stake_won/tier_up/follow/system). Items 1–5 read:false; 6–7 read:true. All use time field (not created_at), so timeAgo() returns '' for them and n.time fallback applies in renderList.

### createPanel
Idempotent — returns if #notif-panel exists. Creates fixed full-screen overlay containing backdrop, slide-down drawer (header, 5 filter buttons, empty #notif-list). Appends to body. Wires all event listeners once: backdrop/close → close(); mark-all → markAllRead(); filter tabs → update styles, renderList(filter); notif-list delegated click → markRead(item.dataset.id).

### renderList
Guard: no #notif-list → return. Filter: 'all'→all; 'economy'→ECONOMY_TYPES.has(n.type); else n.type===filter. Empty → 🔕 empty-state block. Otherwise: map to HTML with escapeHTML(id/title/body/time), TYPES[n.type] icon (system fallback), timeAgo(created_at) || n.time, magenta dot if !read. Sets innerHTML.

### open
Guard: no #notif-panel → return. renderList(), panel display:flex, rAF → drawer translateY(0), panelOpen=true.

### close
Guard: no #notif-panel → return. drawer translateY(-100%), panelOpen=false immediately, setTimeout(300) → panel display:none.

### markRead
Find notification by id. If found and !read: n.read=true, unreadCount Math.max(0, n-1), updateBadge(), renderList(). Real mode: safeRpc('mark_notifications_read', {p_notification_ids: [id]}) fire-and-forget; log error. Optimistic — no rollback.

### markAllRead
forEach n.read=true. unreadCount=0. updateBadge(). renderList(). Real mode: safeRpc('mark_notifications_read', {p_notification_ids: null}) — null marks all for user. Log errors.

### updateBadge
Reads #notif-dot, toggles display:block (unreadCount>0) or display:none. Silent no-op if element absent.

### startPolling
Clear existing interval. setInterval(fetchNotifications, 30_000) → pollInterval. void fetchNotifications() immediately (no 30s cold start).

### destroy
clearInterval + null pollInterval. notifications=[], unreadCount=0, panelOpen=false. updateBadge(). Panel not removed from DOM. Exposed on window.ColosseumNotifications so auth.ts can call without circular import.

### fetchNotifications
Async. Three guards: no client, placeholder mode, no user → return. Direct PostgREST query (not safeRpc): notifications table, user_id eq, created_at desc, limit 50. Success: replace notifications, recompute unreadCount, updateBadge(), renderList() only if panelOpen. Error: console.error.

### bindBellButton
#notif-btn click → panelOpen ? close() : open(). No-op if absent.

### init
Guard: !FEATURES.notifications → return. createPanel(), bindBellButton(). Placeholder: getPlaceholderNotifs(), unreadCount, updateBadge(). Real: startPolling(). Auto-invoked via ready.then(() => init()).catch(() => init()) at module load.
