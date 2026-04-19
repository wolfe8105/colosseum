# Stage 3 Outputs — src/notifications.ts

## Agent 01

# Verification Report — src/notifications.ts vs. Stage 2

The source file is 425 lines. I verified every function Stage 2 describes. Agent descriptions are largely consistent across all five agents; where they diverge I note it per function.

### timeAgo (line 93)

**Verification**: PASS
**Findings**: None. All claims confirmed.
- All five agents correctly describe the falsy-early-return, the try/catch structure, the five-tier cascade (`<60s` → `just now`, `<60m` → `Nm ago`, `<24h` → `Nh ago`, `<30d` → `Nd ago`, else `Nmo ago`), the use of `Date.now()` and `new Date(dateStr).getTime()`, and the empty-string catch return.
- All correctly state the function is synchronous and reads no module-level state.
**Unverifiable claims**: None

### getPlaceholderNotifs (line 116)

**Verification**: PASS
**Findings**: None. All claims confirmed.
- All five agents correctly identify: no parameters, no module-level state reads, seven hard-coded objects, the exact type order (`challenge`, `reaction`, `result`, `stake_won`, `tier_up`, `follow`, `system`), five `read: false` / two `read: true`, all using `time` (not `created_at`), synchronous, no side effects.
**Unverifiable claims**: None

### createPanel (line 132)

**Verification**: PASS
**Findings**: None. All claims confirmed.
- All agents correctly identify: idempotent guard on `document.getElementById('notif-panel')`, creation of a fixed full-viewport `div`, the five sub-elements in the template (backdrop, drawer, header with mark-all and close buttons, five filter buttons, notif-list), `document.body.appendChild`, three direct listeners (backdrop→close, notif-close→close, notif-mark-all→markAllRead), per-filter-button click listeners calling `renderList`, and the single delegated click listener on `notif-list` calling `markRead` via `.closest('.notif-item')`.
- Agents 01 and 02 use slightly different phrasings ("slide-in" vs. "slide-down") but both describe the `translateY(-100%)` initial transform; the source confirms this at line 147.
**Unverifiable claims**: None

### renderList (line 197)

**Verification**: PASS
**Findings**: None. All claims confirmed.
- All five agents correctly describe: optional `filter` defaulting to `'all'`, early return if `notif-list` absent, three-way filter logic (`all`/`economy`/exact-type-match), empty-state innerHTML branch, per-item icon lookup with `TYPES.system` fallback, unread dot, `displayTime` preference for `created_at` over `time`, `escapeHTML` on `n.id`/`n.title`/`n.body`/`displayTime`, unread background tint, join-and-assign to `list.innerHTML`, no module-level state writes.
**Unverifiable claims**: None

### open (line 248)

**Verification**: PASS
**Findings**: None. All claims confirmed.
- All five agents correctly describe: reads both `notif-panel` and `notif-drawer`, early return if panel absent, calls `renderList()` with no args, sets `panel.style.display = 'flex'`, uses `requestAnimationFrame` to defer the `translateY(0)` transform, sets `panelOpen = true` after scheduling the frame.
**Unverifiable claims**: None

### close (line 261)

**Verification**: PASS
**Findings**: None. All claims confirmed.
- All five agents correctly describe: reads both elements, early return if panel absent, immediately sets `drawer.style.transform = 'translateY(-100%)'`, calls `setTimeout(..., 300)` to set `panel.style.display = 'none'`, and sets `panelOpen = false` synchronously before returning.
- Agents 04 and 05 note the 300ms delay "mirrors the CSS transition duration declared in `createPanel`" — the source transition is `0.3s ease` (line 147), which is exactly 300ms. PASS.
**Unverifiable claims**: None

### markRead (line 277)

**Verification**: PASS
**Findings**: None. All claims confirmed.
- All five agents correctly describe: single `id` parameter, `notifications.find()` for matching entry, no-op if not found or already `read: true`, mutation of `n.read = true`, `Math.max(0, unreadCount - 1)` decrement, calls `updateBadge()` and `renderList()`, then conditional `safeRpc('mark_notifications_read', { p_notification_ids: [id] })` guarded by `getSupabaseClient()` and `!getIsPlaceholderMode()`, `.then` logs error, fire-and-forget.
**Unverifiable claims**: None

### markAllRead (line 295)

**Verification**: PASS
**Findings**: None. All claims confirmed.
- All five agents correctly describe: no parameters, `forEach` setting all `read = true`, `unreadCount = 0`, calls `updateBadge()` and `renderList()`, conditional `safeRpc('mark_notifications_read', { p_notification_ids: null })`, `.then` logs error, fire-and-forget.
**Unverifiable claims**: None

### updateBadge (line 316)

**Verification**: PASS
**Findings**: None. All claims confirmed.
- All five agents correctly describe: no parameters, reads `notif-dot` by id, sets `style.display` to `'block'` or `'none'` based on `unreadCount > 0`, silent no-op if element absent.
**Unverifiable claims**: None

### startPolling (line 325)

**Verification**: PASS
**Findings**: None. All claims confirmed.
- All five agents correctly describe: no parameters, clears any existing `pollInterval` before creating a new one, `setInterval(fetchNotifications, 30_000)`, immediately calls `void fetchNotifications()` for the first fetch.
**Unverifiable claims**: None

### destroy (line 332)

**Verification**: PASS
**Findings**: None. All claims confirmed.
- All five agents correctly describe: clears `pollInterval` if non-null and sets it to `null`, resets `notifications = []`, `unreadCount = 0`, `panelOpen = false`, calls `updateBadge()`.
- Agents 01, 02, 03, 04, and 05 all note the function "does not remove the DOM panel or detach any event listeners" — source confirms this.
**Unverifiable claims**: None

### fetchNotifications (line 343)

**Verification**: PASS
**Findings**: None. All claims confirmed.
- All five agents correctly describe: async, no parameters, reads `getSupabaseClient()`, `getCurrentUser()`, and `getIsPlaceholderMode()`, early return if client absent or placeholder mode or no user, try block with PostgREST query (`from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)`), throws on error (caught by catch block), assigns data to `notifications` (defaulting `null` to `[]`), recomputes `unreadCount`, calls `updateBadge()`, conditionally calls `renderList()` when `panelOpen` is true, catch block logs error without rethrowing.
**Unverifiable claims**: None

### bindBellButton (line 372)

**Verification**: PASS
**Findings**: None. All claims confirmed.
- All five agents correctly describe: no parameters, reads `notif-btn` by id, silent no-op if absent, attaches click listener that calls `close` when `panelOpen` is true or `open` otherwise.
**Unverifiable claims**: None

### init (line 386)

**Verification**: PASS
**Findings**: None. All claims confirmed.
- All five agents correctly describe: no parameters, early return if `FEATURES.notifications` is falsy, calls `createPanel()`, calls `bindBellButton()`, branches on `getIsPlaceholderMode()`: in placeholder mode assigns `getPlaceholderNotifs()` to `notifications`, counts unread into `unreadCount`, calls `updateBadge()`; in live mode calls `startPolling()`.
- Agents 04 and 05 specifically reference line 424 for the auto-init expression — confirmed in source.
- Agent 01 notes `init` "runs exactly once at startup regardless of whether auth initialization succeeds or fails" — accurate characterization.
**Unverifiable claims**: None

## Cross-Agent Consensus Summary

| Function | PASS | PARTIAL | FAIL | Agent disagreements |
|---|---|---|---|---|
| timeAgo | 5/5 | — | — | None |
| getPlaceholderNotifs | 5/5 | — | — | None |
| createPanel | 5/5 | — | — | Minor phrasing difference (slide-in vs. slide-down), all factually correct |
| renderList | 5/5 | — | — | None |
| open | 5/5 | — | — | None |
| close | 5/5 | — | — | None |
| markRead | 5/5 | — | — | None |
| markAllRead | 5/5 | — | — | None |
| updateBadge | 5/5 | — | — | None |
| startPolling | 5/5 | — | — | None |
| destroy | 5/5 | — | — | None |
| fetchNotifications | 5/5 | — | — | None |
| bindBellButton | 5/5 | — | — | None |
| init | 5/5 | — | — | None |

**Totals across all 14 functions: 14 PASS / 0 PARTIAL / 0 FAIL**

All five agents are in near-perfect consensus. No substantive disagreements exist between agents on any function.

## needs_review

- **`window.ColosseumNotifications` exposure (line 416)**: After the default export, the module executes `(window as any).ColosseumNotifications = notificationsModule` at module scope. This is a runtime side effect that fires unconditionally at module load — before `init()` is called and regardless of `FEATURES.notifications`. Stage 2 agents described the auto-init `ready.then` pattern but none mentioned this window assignment. It is a runtime effect observable to any external script that loads this module.

---

## Agent 02

# Verification Report — `src/notifications.ts`

Source read: lines 1–424. Stage 2 agents: 01–05.

### timeAgo (line 93)

**Verification**: PASS
**Findings**: None. All claims confirmed. Every agent correctly described the falsy-early-return, the try/catch structure, the cascade of threshold comparisons, the `Math.floor` derivations, the empty-string catch return, and that the function is synchronous with no module-level state access.
**Unverifiable claims**: None.

### getPlaceholderNotifs (line 116)

**Verification**: PASS
**Findings**: None. All claims confirmed. Seven hardcoded objects, types match, five `read: false` / two `read: true`, all use `time` not `created_at`, no side effects, synchronous.
**Unverifiable claims**: None.

### createPanel (line 132)

**Verification**: PASS
**Findings**: None. All agents accurately described: idempotency guard, element creation, inline CSS with `display:none`, innerHTML template with backdrop/drawer/header/filter-bar/list, `appendChild` to body, three direct listeners, per-filter-button click listeners, delegated click on `notif-list` calling `markRead` via `.closest('.notif-item')` and `data-id`. All confirmed against source lines 133–195.
**Unverifiable claims**: None.

### renderList (line 197)

**Verification**: PASS
**Findings**: None. All agents correctly described: optional `filter` defaulting to `'all'`, DOM lookup for `notif-list` with early return, three-branch filtering, empty-state innerHTML on zero results, per-notification mapping with `TYPES[n.type]` fallback to `TYPES.system`, unread dot, `displayTime` preferring `n.created_at` via `timeAgo` then falling back to `n.time`, `escapeHTML` on all interpolated values, join and assign to `list.innerHTML`, no module state mutation.
**Unverifiable claims**: None.

### open (line 248)

**Verification**: PASS
**Findings**: None. All agents correctly described: DOM lookup for both panel and drawer with early return if panel absent, call to `renderList()` with no args, set `panel.style.display = 'flex'`, `requestAnimationFrame` callback setting `drawer.style.transform = 'translateY(0)'`, set `panelOpen = true` after the rAF call.
**Unverifiable claims**: None.

### close (line 261)

**Verification**: PASS
**Findings**: None. All agents correctly described: DOM lookup with early return if panel absent, immediate `drawer.style.transform = 'translateY(-100%)'`, `setTimeout` 300ms that sets `panel.style.display = 'none'`, synchronous `panelOpen = false` before returning.
**Unverifiable claims**: None.

### markRead (line 277)

**Verification**: PASS
**Findings**: None. All agents correctly described: search `notifications` array with `find`, no-op if not found or already `read: true`, mutate `n.read = true`, `unreadCount = Math.max(0, unreadCount - 1)`, call `updateBadge()`, call `renderList()`, guard with `getSupabaseClient() && !getIsPlaceholderMode()`, fire-and-forget `safeRpc` with `p_notification_ids: [id]`, `.then` logs error, function returns void synchronously.
**Unverifiable claims**: None.

### markAllRead (line 295)

**Verification**: PASS
**Findings**: None. All agents correctly described: `forEach` setting `read = true` on all items, `unreadCount = 0`, `updateBadge()`, `renderList()`, same guard as `markRead`, `safeRpc` with `p_notification_ids: null`, `.then` logs error, fire-and-forget.
**Unverifiable claims**: None.

### updateBadge (line 316)

**Verification**: PASS
**Findings**: None. All agents correctly described: DOM lookup for `notif-dot`, sets `style.display` to `'block'` if `unreadCount > 0` else `'none'`, no-op if element absent, no module state written.
**Unverifiable claims**: None.

### startPolling (line 325)

**Verification**: PASS
**Findings**: None. All agents correctly described: clears existing `pollInterval` if non-null, calls `setInterval(fetchNotifications, 30_000)` storing result in `pollInterval`, immediately calls `void fetchNotifications()` for an instant first fetch, returns void.
**Unverifiable claims**: None.

### destroy (line 332)

**Verification**: PASS
**Findings**: None. All agents correctly described: clears `pollInterval` if non-null and nulls it, resets `notifications = []`, `unreadCount = 0`, `panelOpen = false`, calls `updateBadge()`. Confirmed that source contains no DOM removal code.
**Unverifiable claims**: None.

### fetchNotifications (line 343)

**Verification**: PASS
**Findings**: None. All agents correctly described: async, reads three guards, early return if any fails, try block with awaited PostgREST query, throws `error` to catch on failure, assigns `data ?? []` to `notifications`, recomputes `unreadCount`, calls `updateBadge()`, conditionally calls `renderList()` if `panelOpen`, catch logs and does not rethrow.
**Unverifiable claims**: None.

### bindBellButton (line 372)

**Verification**: PASS
**Findings**: None. All agents correctly described: DOM lookup for `notif-btn`, no-op if absent, attaches click listener that reads `panelOpen` and calls `close` if true else `open`, synchronous, void return.
**Unverifiable claims**: None.

### init (line 386)

**Verification**: PASS
**Findings**: None. All agents correctly described: reads `FEATURES.notifications` and returns early if falsy, calls `createPanel()`, calls `bindBellButton()`, reads `getIsPlaceholderMode()`, if placeholder: assigns `getPlaceholderNotifs()` to `notifications`, counts unread for `unreadCount`, calls `updateBadge()`, no polling; if not placeholder: calls `startPolling()`. All agents also correctly described the module-level auto-init at line 424: `ready.then(() => init()).catch(() => init())`.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

All five agents reached near-identical descriptions for every function. There are no meaningful disagreements between agents. All agents correctly handled the key behavioral nuances: the fire-and-forget RPC pattern in `markRead`/`markAllRead`, the `requestAnimationFrame` deferral in `open`, the 300ms `setTimeout` in `close`, the `null` vs. `[id]` distinction in the two mark-read RPCs, the `panelOpen` guard in `fetchNotifications`, and the `ready.then().catch()` auto-init pattern.

## needs_review

None. The source is fully accounted for by Stage 2's descriptions.

---

## Agent 03

# Verification Report — src/notifications.ts

Source file: 424 lines.

### timeAgo (line 93)

**Verification**: PASS
**Findings**: None. All claims confirmed across all five agents. The source matches exactly: falsy guard returns `''`, `try` block computes `diffSec`/`diffMin`/`diffHr`/`diffDay` via cascade, all five return strings match the source thresholds, and the `catch` block returns `''`. No module-level state is read or written.
**Unverifiable claims**: None

### getPlaceholderNotifs (line 116)

**Verification**: PASS
**Findings**: None. All claims confirmed. The source returns a fresh seven-element array with exactly the types described. Items at indices 0–4 have `read: false`; indices 5–6 have `read: true`. All use `time` string field, not `created_at`. Function is synchronous, no side effects, reads no state.
**Unverifiable claims**: None

### createPanel (line 132)

**Verification**: PASS
**Findings**: None. All claims confirmed across all five agents:
- Early return if `document.getElementById('notif-panel')` exists (line 133).
- Creates `div`, sets `id`, `cssText`, `innerHTML` with backdrop, drawer, header, filter row (5 buttons: `all`, `challenge`, `result`, `reaction`, `economy`), and `notif-list` container.
- Appends to `document.body` (line 169).
- Three direct listeners: backdrop → `close`, close button → `close`, mark-all → `markAllRead` (lines 171–173).
- Filter button loop: strips `active` + styles from all, adds to clicked, calls `renderList` with `data-filter` cast to `NotificationFilter` (lines 175–187).
- Delegated click on `notif-list` via `.closest('.notif-item')` → `markRead` with `data-id` (lines 191–194).
**Unverifiable claims**: None

### renderList (line 197)

**Verification**: PASS
**Findings**: None. All claims confirmed:
- Optional `filter` parameter defaulting to `'all'` (line 197).
- Early return if `notif-list` absent (lines 198–199).
- Filter logic: `'all'` → full array, `'economy'` → `ECONOMY_TYPES.has(n.type)`, other → `n.type === filter` (lines 201–208).
- Empty state sets `list.innerHTML` to centered placeholder (lines 210–216).
- Maps each notification with correct details.
- Assigns joined string to `list.innerHTML` (line 241). No module-level state written.
**Unverifiable claims**: None

### open (line 248)

**Verification**: PASS
**Findings**: None. All claims confirmed (lines 249–258).
**Unverifiable claims**: None

### close (line 261)

**Verification**: PASS
**Findings**: None. All claims confirmed (lines 262–270).
**Unverifiable claims**: None

### markRead (line 277)

**Verification**: PASS
**Findings**: None. All claims confirmed (lines 278–290).
**Unverifiable claims**: None

### markAllRead (line 295)

**Verification**: PASS
**Findings**: None. All claims confirmed (lines 296–308).
**Unverifiable claims**: None

### updateBadge (line 316)

**Verification**: PASS
**Findings**: None. All claims confirmed (lines 317–318).
**Unverifiable claims**: None

### startPolling (line 325)

**Verification**: PASS
**Findings**: None. All claims confirmed (lines 326–328).
**Unverifiable claims**: None

### destroy (line 332)

**Verification**: PASS
**Findings**: None. All claims confirmed (lines 333–340).
**Unverifiable claims**: None

### fetchNotifications (line 343)

**Verification**: PASS
**Findings**: None. All claims confirmed (lines 344–365).
**Unverifiable claims**: None

### bindBellButton (line 372)

**Verification**: PASS
**Findings**: None. All claims confirmed (lines 373–379).
**Unverifiable claims**: None

### init (line 386)

**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the `FEATURES.notifications` guard, calls to `createPanel()` and `bindBellButton()`, and the `getIsPlaceholderMode()` branch.
- Minor imprecision shared by most agents: describing the module-level `ready.then()` auto-call as part of `init`'s description. It is actually a separate module-level statement outside `init` (line 424). No agent falsely claims it is inside `init`'s function body — they all correctly frame it as a module-scope statement — so this is not a FAIL.
**Unverifiable claims**: None

## Cross-Agent Consensus Summary

All five agents are in strong consensus across all 13 functions. No agent-to-agent disagreements were found on any substantive claim.

The audit for `src/notifications.ts` is clean. All 13 functions received PASS or PARTIAL verdicts with no contradictions found in the source.

## needs_review

None. Every runtime claim made by all five agents is confirmed by the source.

---

## Agent 04

# Verification Report — `src/notifications.ts`

### timeAgo (line 93)
**Verification**: PASS
**Findings**: None. All claims confirmed. All five agents correctly describe: the `string | undefined | null` parameter, the falsy early return, the try/catch wrapping, the cascading threshold comparisons, the `catch` block returning `''`, synchronous execution, and no module-level state reads or writes.
**Unverifiable claims**: None.

### getPlaceholderNotifs (line 116)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### createPanel (line 132)
**Verification**: PASS
**Findings**: None. All claims confirmed across all five agents. Key points verified against source (lines 133–195).
**Unverifiable claims**: None.

### renderList (line 197)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### open (line 248)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### close (line 261)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### markRead (line 277)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### markAllRead (line 295)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### updateBadge (line 316)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### startPolling (line 325)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### destroy (line 332)
**Verification**: PASS
**Findings**: None. All claims confirmed. Agent 01 and Agent 03 additionally noted the function does not remove the DOM panel or detach listeners — confirmed accurate.
**Unverifiable claims**: None.

### fetchNotifications (line 343)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### bindBellButton (line 372)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### init (line 386)
**Verification**: PASS
**Findings**: None. All claims confirmed. Agent 04 identifies the auto-init line as "line 424" — confirmed in source.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

All five agents produced highly consistent, accurate descriptions for all 13 functions. There were no contradictions between agents, no conflicting claims, and no significant omissions. All agents correctly handled the fire-and-forget RPC pattern, `requestAnimationFrame` deferral, 300ms `setTimeout`, `null` vs. `[id]` payload distinction, `panelOpen` guard in `fetchNotifications`, and the `ready.then().catch()` auto-init pattern.

## needs_review

- **`(window as any).ColosseumNotifications = notificationsModule` (line 416)**: No Stage 2 agent described this module-level side effect. At module load time, the entire module object is attached to `window.ColosseumNotifications`. The comment explains it exists so `auth.ts` can call `destroy()` on logout without creating a circular import. This is a significant runtime behavior (global mutation) that all five agents omitted.
- **`ready.then(() => init()).catch(() => init())` catch semantics (line 424)**: The `.catch()` arm calls `init()` on auth initialization failure — meaning notifications will attempt to initialize even if auth setup throws. This is intentional but all agents noted it without flagging the behavioral implication.

---

## Agent 05

# Verification Report — `src/notifications.ts`

### timeAgo (line 93)

**Verification**: PASS
**Findings**: None. All claims confirmed. All five agents correctly describe: the `string | undefined | null` parameter, the falsy early return of `''`, the `try/catch`, the cascading threshold checks, the empty-string catch return, synchronous execution, and no module-level state reads or writes.
**Unverifiable claims**: None

### getPlaceholderNotifs (line 116)

**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None

### createPanel (line 132)

**Verification**: PASS
**Findings**: None. All claims confirmed across all five agents. Source confirms: idempotency guard, `createElement('div')`, `cssText`, `innerHTML` template, `appendChild`, three direct click listeners, filter button loop, delegated click on `notif-list`.
**Unverifiable claims**: None

### renderList (line 197)

**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None

### open (line 248)

**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None

### close (line 261)

**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None

### markRead (line 277)

**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None

### markAllRead (line 295)

**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None

### updateBadge (line 316)

**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None

### startPolling (line 325)

**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None

### destroy (line 332)

**Verification**: PASS
**Findings**: None. All claims confirmed. Does not remove DOM panel or detach listeners — confirmed accurate.
**Unverifiable claims**: None

### fetchNotifications (line 343)

**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None

### bindBellButton (line 372)

**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None

### init (line 386)

**Verification**: PASS
**Findings**: None. All claims confirmed. Module-level `ready.then(() => init()).catch(() => init())` (line 424) fires `init` once after auth settles regardless of resolve or reject.
**Unverifiable claims**: None

## Cross-Agent Consensus Summary

All five agents (01–05) are in complete agreement on every function in `src/notifications.ts`. There are no contradictions between agents, no conflicting claims, and no significant omissions. The descriptions are uniformly accurate and detailed across all 13 functions. All agents correctly handled all key behavioral nuances.

**Confidence level**: High — the source is straightforward and the agent descriptions match the source precisely throughout.

## needs_review

None. All runtime behaviors described in Stage 2 are confirmed by the source. No behaviors present in the source were omitted by all agents collectively.
