# Stage 3 Outputs — notifications.state.ts

## Agent 01

### setNotifications (line 12)
**Verification**: PASS
**Findings**: All claims accurate. No null/undefined guard on `n` — confirmed.
**Unverifiable claims**: Downstream breakage behavior (passing null crashes consumers) requires reading consumers.

### setPanelOpen (line 13)
**Verification**: PASS
**Findings**: All claims accurate.
**Unverifiable claims**: None.

### setPollInterval (line 14)
**Verification**: PASS
**Findings**: All claims accurate. No `clearInterval` call before overwriting — confirmed in source.
**Unverifiable claims**: Whether callers clear before calling — requires reading `notifications.ts`.

### markOneRead (line 16)
**Verification**: PASS
**Findings**: All claims accurate. Three-branch logic, `Math.max(0, ...)` floor, in-place mutation all confirmed.
**Unverifiable claims**: Whether `notifications` could be null/undefined before call.

### markAllAsRead (line 22)
**Verification**: PASS
**Findings**: All claims accurate.
**Unverifiable claims**: None.

### computeUnreadCount (line 27)
**Verification**: PASS
**Findings**: All claims accurate. Not called from `setNotifications` — confirmed by source.
**Unverifiable claims**: Caller sequencing.

### getPlaceholderNotifs (line 31)
**Verification**: PASS
**Findings**: All claims accurate. 7 items, types, read states all confirmed.
**Unverifiable claims**: None.

### Cross-Agent Consensus Summary
All five agents agree on every material behavioral fact across all 7 functions. `setPollInterval` timer-leak risk flagged by all five agents independently (high confidence). `setNotifications` null/undefined gap flagged by all five agents. `computeUnreadCount` not called from `setNotifications` noted by all. No divergences on factual claims.

### needs_review
1. **`setPollInterval` timer leak (Medium)**: Line 14 — overwrites `pollInterval` without calling `clearInterval` on the existing handle. Any caller that passes a new handle or `null` without first clearing the old interval orphans the timer indefinitely. CLAUDE.md requires all `setInterval` polling to be clearable. Requires checking callers in `notifications.ts` to confirm they always call `clearInterval(pollInterval)` before `setPollInterval(...)`.
2. **`setNotifications` no null guard (Low)**: Line 12 — no runtime guard on `n`. Passing `null`/`undefined` silently corrupts `notifications` and causes TypeErrors in all downstream callers.

---

## Agent 02

### setNotifications (line 12)
**Verification**: PASS
**Findings**: All claims accurate.
**Unverifiable claims**: None.

### setPanelOpen (line 13)
**Verification**: PASS
**Findings**: All claims accurate.
**Unverifiable claims**: None.

### setPollInterval (line 14)
**Verification**: PASS
**Findings**: All claims accurate. `clearInterval` absence confirmed. "Canonical `null` pattern" is a design inference.
**Unverifiable claims**: Whether callers honor the contract — requires reading `notifications.ts`.

### markOneRead (line 16)
**Verification**: PASS
**Findings**: All claims accurate. `Math.max(0, ...)` floor prevents negative unreadCount — confirmed.
**Unverifiable claims**: None.

### markAllAsRead (line 22)
**Verification**: PASS
**Findings**: All claims accurate. Empty array edge case (no per-item mutations, `unreadCount = 0`) confirmed.
**Unverifiable claims**: None.

### computeUnreadCount (line 27)
**Verification**: PASS
**Findings**: Accurate. Agent 02 notes `!n.read` predicate would count notifications where `read` is `undefined` — technically correct per `!undefined === true`.
**Unverifiable claims**: Whether `read` can be `undefined` depends on `Notification` type in `notifications.types.ts`.

### getPlaceholderNotifs (line 31)
**Verification**: PASS
**Findings**: All claims accurate. All data matches source.
**Unverifiable claims**: None.

### Cross-Agent Consensus Summary
All five agents in near-perfect agreement. `setPollInterval` interval-leak concern unanimous. `setNotifications` null gap unanimous. `computeUnreadCount` sequencing concern unanimous.

### needs_review
None raised by Agent 02 — observations treated as caller-contract design notes.

---

## Agent 03

### setNotifications (line 12)
**Verification**: PASS
**Findings**: All claims accurate.
**Unverifiable claims**: Downstream breakage requires reading consumers.

### setPanelOpen (line 13)
**Verification**: PASS
**Findings**: All claims accurate.
**Unverifiable claims**: None.

### setPollInterval (line 14)
**Verification**: PASS
**Findings**: All claims accurate. Agent 04's framing ("passing `null` without first clearing would leak") is slightly imprecise — the leak occurs when overwriting a live handle with a new one; passing `null` also leaks if old interval not first cleared. The general concern is correct.
**Unverifiable claims**: Whether callers clear before calling.

### markOneRead (line 16)
**Verification**: PASS
**Findings**: All claims accurate. Agent 03 adds: mutation is by object reference — external holders of the same `Notification` object observe the mutation. Correct per source.
**Unverifiable claims**: Whether other code holds references.

### markAllAsRead (line 22)
**Verification**: PASS
**Findings**: All claims accurate.
**Unverifiable claims**: None.

### computeUnreadCount (line 27)
**Verification**: PASS
**Findings**: All claims accurate. Filtered array discarded — only `.length` used.
**Unverifiable claims**: Caller sequencing.

### getPlaceholderNotifs (line 31)
**Verification**: PASS
**Findings**: All claims accurate. Agent 03 notes title/body values are static literals (not user-supplied) — `escapeHTML` not required. Correct.
**Unverifiable claims**: None.

### Cross-Agent Consensus Summary
All five agents in strong agreement. No cross-agent factual disagreements.

### needs_review
1. **NS-1 — `setPollInterval` timer leak (Medium)**: Line 14 — overwrites `pollInterval` without `clearInterval`. Caller must clear manually; no enforcement. Verify callers in `notifications.ts`.
2. **NS-2 — `setNotifications` no null guard + `unreadCount` not resynced (Low)**: Line 12 — no null guard. Additionally, `computeUnreadCount` is not called inside `setNotifications`, leaving `unreadCount` stale after every array replacement unless caller sequences the calls.

---

## Agent 04

### setNotifications (line 12)
**Verification**: PASS
**Findings**: All claims accurate.
**Unverifiable claims**: None.

### setPanelOpen (line 13)
**Verification**: PASS
**Findings**: All claims accurate.
**Unverifiable claims**: None.

### setPollInterval (line 14)
**Verification**: PASS
**Findings**: All claims accurate. Agent 04's framing is slightly imprecise (see Agent 03 note) but the concern is correct.
**Unverifiable claims**: None.

### markOneRead (line 16)
**Verification**: PARTIAL
**Findings**: Agent 04 describes two branches but source has three logical branches (not-found / found+already-read / found+unread). Agent 04 collapses cases 1 and 2 (both return `false` with no mutation) into one branch — logically equivalent but less precise. Not an error.
**Unverifiable claims**: None.

### markAllAsRead (line 22)
**Verification**: PASS
**Findings**: All claims accurate.
**Unverifiable claims**: None.

### computeUnreadCount (line 27)
**Verification**: PASS
**Findings**: Accurate. Agent 04 notes the two-strategy divergence risk (incremental vs. full recount) — correct and insightful.
**Unverifiable claims**: Whether drift occurs in practice.

### getPlaceholderNotifs (line 31)
**Verification**: PASS
**Findings**: All claims accurate.
**Unverifiable claims**: None.

### Cross-Agent Consensus Summary
Strong consensus. Agent 04's two-branch framing for `markOneRead` is the only divergence — a simplification, not a factual error.

### needs_review
- **`setPollInterval` interval leak**: Verify callers in `notifications.ts` always `clearInterval` before calling `setPollInterval(...)`.

---

## Agent 05

### setNotifications (line 12)
**Verification**: PASS
**Findings**: All claims accurate.
**Unverifiable claims**: Downstream breakage requires reading consumers.

### setPanelOpen (line 13)
**Verification**: PASS
**Findings**: All claims accurate.
**Unverifiable claims**: None.

### setPollInterval (line 14)
**Verification**: PASS
**Findings**: All claims accurate. Timer-orphan concern correct.
**Unverifiable claims**: Whether callers handle this correctly.

### markOneRead (line 16)
**Verification**: PASS
**Findings**: All claims accurate. "Does not validate UUID format on `id`" — accurate per source, but this function searches a local in-memory array, not a PostgREST filter, so UUID validation is not required by CLAUDE.md rules here.
**Unverifiable claims**: Whether callers pass valid UUIDs.

### markAllAsRead (line 22)
**Verification**: PASS
**Findings**: All claims accurate. Empty-array edge case and in-place mutation both confirmed.
**Unverifiable claims**: None.

### computeUnreadCount (line 27)
**Verification**: PASS
**Findings**: All claims accurate. Drift-healing characterization correct.
**Unverifiable claims**: None.

### getPlaceholderNotifs (line 31)
**Verification**: PASS
**Findings**: All claims accurate.
**Unverifiable claims**: None.

### Cross-Agent Consensus Summary
All five agents in strong agreement. No divergences on factual claims. Both `setPollInterval` and `setNotifications` fragility concerns confirmed by all agents independently.

### needs_review
1. **`setPollInterval` timer leak (Medium)**: Line 14 — no `clearInterval` before overwrite. Callers must manually clear. Requires inspection of `notifications.ts`.
2. **`setNotifications` null guard (Low)**: Line 12 — `null`/`undefined` would corrupt module state. TypeScript compile-time typing does not protect against JavaScript callers.
