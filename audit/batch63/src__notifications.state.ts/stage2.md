# Stage 2 Outputs — notifications.state.ts

## Agent 01

### setNotifications (line 12)

`setNotifications` accepts one parameter, `n` of type `Notification[]`, with no default. It reads no module-level state and writes `notifications`, replacing the entire array reference with `n`. There are no branches and no functions called. Returns `void`. Not async. No error handling — no null/undefined guard on `n`; passing `null` or `undefined` would silently corrupt `notifications` and break any downstream `.filter`/`.find` calls.

### setPanelOpen (line 13)

`setPanelOpen` accepts one parameter, `v` of type `boolean`, with no default. It reads no module-level state and writes `panelOpen`, setting it to `v`. No branches, no functions called. Returns `void`. Not async. No error handling.

### setPollInterval (line 14)

`setPollInterval` accepts one parameter, `v` of type `ReturnType<typeof setInterval> | null`, with no default. It reads no module-level state and writes `pollInterval`, replacing it with `v`. No branches, no functions called. Returns `void`. Not async. No error handling. Notably does NOT call `clearInterval` on the existing `pollInterval` before overwriting — if a live interval handle is already stored and the caller passes a new value without first clearing the old one, the old interval leaks. The caller is responsible for clearing.

### markOneRead (line 16)

`markOneRead` accepts one parameter, `id` of type `string`, with no default. It reads `notifications` (via `.find`) and `unreadCount` (for decrement math). On the true path it writes `n.read = true` in-place on the matched object and writes `unreadCount = Math.max(0, unreadCount - 1)`. Three branches:
1. `notifications.find(n => n.id === id)` returns `undefined` → returns `false`, no mutation.
2. Match found but `n.read` is already `true` → condition `n && !n.read` is false → returns `false`, no mutation.
3. Match found and `n.read` is `false` → mutates `n.read = true`, decrements `unreadCount` floored at 0, returns `true`.

Calls `Array.prototype.find` (result in `n`) and `Math.max(0, unreadCount - 1)` (result assigned to `unreadCount`). Returns `boolean`. Not async. No error handling beyond implicit `undefined` check from `.find`. If `notifications` is `null`/`undefined`, `.find` would throw.

### markAllAsRead (line 22)

`markAllAsRead` accepts no parameters. It reads `notifications` (iterated) and writes every notification object's `read` property to `true` in-place, then hard-sets `unreadCount = 0`. No conditional branches — `forEach` iterates unconditionally. Calls `Array.prototype.forEach` on `notifications` (return value discarded). Returns `void`. Not async. No error handling.

### computeUnreadCount (line 27)

`computeUnreadCount` accepts no parameters. It reads `notifications` (filtered) and writes `unreadCount`, replacing it with the count of items where `n.read` is falsy. No branches. Calls `Array.prototype.filter` on `notifications` with predicate `n => !n.read`; `.length` of the result is assigned to `unreadCount`. Returns `void`. Not async. No error handling. This is the canonical full-recount path, healing any drift from `markOneRead`'s arithmetic. Should be called after `setNotifications` but is not called there — sequencing is the caller's responsibility.

### getPlaceholderNotifs (line 31)

`getPlaceholderNotifs` accepts no parameters. Reads and writes no module-level state. Returns a freshly created `Notification[]` literal of 7 hardcoded items on every call. No functions called. Items have fields `id` (string numerals `'1'`–`'7'`), `type`, `title`, `body`, `read`. Items 1–5 have `read: false`; items 6–7 have `read: true`. Types used: `'challenge'`, `'reaction'`, `'result'`, `'stake_won'`, `'tier_up'`, `'follow'`, `'system'`. A new array is returned each call — no shared references. Not async. No error handling needed.

---

## Agent 02

### setNotifications (line 12)

`setNotifications(n: Notification[]): void`. Parameter `n` is `Notification[]`, required, no default. Writes `notifications` — the entire array reference is replaced with `n`. No branches, no functions called. Returns `void`. Not async. No error handling. No null/undefined guard; passing a non-array would corrupt the module variable and break all downstream consumers silently.

### setPanelOpen (line 13)

`setPanelOpen(v: boolean): void`. Parameter `v` is `boolean`, required, no default. Writes `panelOpen = v`. No branches, no functions called. Returns `void`. Not async. No error handling. TypeScript enforces boolean at compile time; no runtime guard.

### setPollInterval (line 14)

`setPollInterval(v: ReturnType<typeof setInterval> | null): void`. Parameter `v` is `ReturnType<typeof setInterval> | null`, required, no default. Writes `pollInterval = v`. No branches, no functions called. Returns `void`. Not async. No error handling. Does NOT call `clearInterval` on the previous value before overwriting; if a live interval handle is already stored and the caller neglects to clear it first, the old interval leaks. When `v` is `null`, this is the canonical "clear the stored handle" operation; the caller is responsible for having called `clearInterval` beforehand.

### markOneRead (line 16)

`markOneRead(id: string): boolean`. Parameter `id` is `string`, required. Reads `notifications` (to find matching item) and `unreadCount` (to decrement). Writes: mutates the matched `Notification` object in-place (`n.read = true`); decrements `unreadCount` by 1 (floored at 0 via `Math.max`). Three branches: (1) no notification matches `id` → `n` is `undefined`, returns `false`; (2) match found but `n.read` is already `true` → combined guard `n && !n.read` is falsy, no mutation, returns `false`; (3) match found and `n.read` is `false` → sets `n.read = true`, sets `unreadCount = Math.max(0, unreadCount - 1)`, returns `true`. Calls `Array.prototype.find` (result in `n`) and `Math.max` (result assigned to `unreadCount`). Returns `boolean`. Not async. No error handling. `Math.max(0, ...)` floor prevents `unreadCount` going negative if it is somehow already 0. No guard against `unreadCount` being out of sync with actual array state before the call.

### markAllAsRead (line 22)

`markAllAsRead(): void`. No parameters. Reads `notifications` (iterated). Writes: mutates every `Notification` object in `notifications` in-place (`read = true` on each); sets `unreadCount = 0`. No branches — `forEach` iterates all items unconditionally; if `notifications` is empty, no per-item mutations occur but `unreadCount` is still set to `0`. Calls `Array.prototype.forEach` on `notifications` (return value discarded). Returns `void`. Not async. No error handling.

### computeUnreadCount (line 27)

`computeUnreadCount(): void`. No parameters. Reads `notifications` (filtered). Writes `unreadCount` — overwrites with the computed count of items where `n.read` is falsy (includes `undefined` if the `read` property is absent). No branches. Calls `Array.prototype.filter` on `notifications` with predicate `n => !n.read`; `.length` of result assigned to `unreadCount`. Returns `void`. Not async. No error handling. Self-heals any drift between `unreadCount` and the actual array state. Should be called after `setNotifications` but is not called there — the caller is responsible for sequencing.

### getPlaceholderNotifs (line 31)

`getPlaceholderNotifs(): Notification[]`. No parameters. Reads and writes no module-level state. Returns a new `Notification[]` literal with 7 items each invocation. Items 1–5 have `read: false`; items 6–7 have `read: true`. Types: `'challenge'`, `'reaction'`, `'result'`, `'stake_won'`, `'tier_up'`, `'follow'`, `'system'`. IDs are string numerals `'1'`–`'7'`, not UUIDs. No functions called. Not async. No error handling needed. A new array is created on each call; callers cannot accidentally share references.

---

## Agent 03

### setNotifications (line 12)

`setNotifications(n: Notification[]): void`. Parameter `n` is `Notification[]`, no default, required. Writes `notifications` — replaced entirely with the incoming array `n`. No branches, no functions called. Returns `void`. Not async. No error handling — no null/undefined guard on `n`; passing a non-array would corrupt the module-level `notifications` reference.

### setPanelOpen (line 13)

`setPanelOpen(v: boolean): void`. Parameter `v` is `boolean`, no default, required. Writes `panelOpen = v`. No branches, no functions called. Returns `void`. Not async. No error handling.

### setPollInterval (line 14)

`setPollInterval(v: ReturnType<typeof setInterval> | null): void`. Parameter `v` is `ReturnType<typeof setInterval> | null`, no default, required. Writes `pollInterval = v`. No branches, no functions called. Returns `void`. Not async. No error handling — does NOT call `clearInterval` on the existing handle before overwriting it. The caller is responsible for clearing before calling this setter.

### markOneRead (line 16)

`markOneRead(id: string): boolean`. Parameter `id` is `string`, no default, required. Reads `notifications` (searched) and `unreadCount` (read for decrement math). Writes: mutates matched `Notification` object in-place (`n.read = true`); writes `unreadCount = Math.max(0, unreadCount - 1)`. Three branches: (1) `notifications.find(n => n.id === id)` returns `undefined` → `return false`; (2) match found but `n.read` is already `true` → `n && !n.read` is false → `return false`; (3) match found and `n.read` is `false` → sets `n.read = true`, decrements `unreadCount`, `return true`. Calls `Array.prototype.find` on `notifications` with predicate `n => n.id === id` (result in `n`); `Math.max(0, unreadCount - 1)` (result assigned to `unreadCount`). Returns `boolean`. Not async. No error handling beyond `n && !n.read` guard. Mutation is by object reference — any other holder of a reference to the same `Notification` object will observe the mutation.

### markAllAsRead (line 22)

`markAllAsRead(): void`. No parameters. Reads `notifications` (iterated). Writes: each `Notification` object in `notifications` has `read` set to `true` in-place; `unreadCount` set to `0` unconditionally. No branches. Calls `Array.prototype.forEach` on `notifications` with callback `n => { n.read = true; }` (return value discarded). Returns `void`. Not async. No error handling.

### computeUnreadCount (line 27)

`computeUnreadCount(): void`. No parameters. Reads `notifications` (filtered). Writes `unreadCount` — replaced with count of items where `n.read` is falsy. No branches. Calls `Array.prototype.filter` on `notifications` with predicate `n => !n.read`; `.length` of result used to set `unreadCount`; filtered array itself discarded. Returns `void`. Not async. No error handling. This is the only setter that re-derives `unreadCount` from actual array state rather than maintaining it incrementally; callers should use this after `setNotifications` to re-sync the count.

### getPlaceholderNotifs (line 31)

`getPlaceholderNotifs(): Notification[]`. No parameters. Reads and writes no module-level state. Returns a fresh `Notification[]` array literal with 7 hardcoded entries every call. Each entry has shape `{ id, type, title, body, read }`. First 5 are `read: false`; last 2 are `read: true`. IDs: string integers `'1'`–`'7'`. Types: `'challenge'`, `'reaction'`, `'result'`, `'stake_won'`, `'tier_up'`, `'follow'`, `'system'`. `title` and `body` values contain static string literals (not user-supplied content). No functions called. Not async. No error handling needed — pure static data factory. New array allocated on every call; no shared mutable references.

---

## Agent 04

### setNotifications (line 12)

`setNotifications(n: Notification[]): void`. Parameter `n` is `Notification[]`, no default, required. Writes `notifications` — replaced wholesale with `n`. No branches, no functions called. Returns `void`. Not async. No error handling — no null/undefined guard on `n`; passing `null` or `undefined` would silently set `notifications` to that value, which would crash any downstream `.filter()`/`.forEach()`/`.find()` call.

### setPanelOpen (line 13)

`setPanelOpen(v: boolean): void`. Parameter `v` is `boolean`, no default, required. Writes `panelOpen = v`. No branches, no functions called. Returns `void`. Not async. No error handling. TypeScript enforces boolean at compile time; no runtime guard.

### setPollInterval (line 14)

`setPollInterval(v: ReturnType<typeof setInterval> | null): void`. Parameter `v` is `ReturnType<typeof setInterval> | null`, no default, required. Writes `pollInterval = v`. No branches, no functions called. Returns `void`. Not async. No error handling — caller is responsible for calling `clearInterval` on the old handle before passing `null`; this function does NOT call `clearInterval` itself, so passing `null` without first clearing the old interval would leak the old timer.

### markOneRead (line 16)

`markOneRead(id: string): boolean`. Parameter `id` is `string`, no default, required. Reads `notifications` (searched by `id`) and `unreadCount` (read to compute decremented value). Writes: `n.read` — mutated to `true` on matched item in-place; `unreadCount` — decremented by 1 via `Math.max(0, unreadCount - 1)` when notification found and was previously unread. Two branches: (A) `n` exists AND `n.read === false` → sets `n.read = true`, decrements `unreadCount` (floored at 0), returns `true`; (B) `n` not found OR `n.read` is already `true` → no state change, returns `false`. Calls `notifications.find(predicate)` (result in `n`) and `Math.max(0, unreadCount - 1)` (result assigned to `unreadCount`). Returns `boolean`. Not async. No error handling — relies on `Array.find` returning `undefined` safely; no guard against malformed `id` values.

### markAllAsRead (line 22)

`markAllAsRead(): void`. No parameters. Reads `notifications` (iterated over). Writes: every element `n` in `notifications` has `n.read` mutated to `true` in-place; `unreadCount` hard-set to `0`. No branches. Calls `notifications.forEach(callback)` (return value discarded). Returns `void`. Not async. No error handling.

### computeUnreadCount (line 27)

`computeUnreadCount(): void`. No parameters. Reads `notifications` (filtered). Writes `unreadCount` — replaced with count of items where `n.read` is falsy. No branches. Calls `notifications.filter(predicate)` (result's `.length` assigned to `unreadCount`). Returns `void`. Not async. No error handling. Intended to be called after `setNotifications` to sync `unreadCount` with actual array state; if `notifications` is null/undefined it will throw. This function and `markOneRead`/`markAllAsRead` maintain `unreadCount` via two different strategies (incremental vs. full recount) — they can diverge if `notifications` items are mutated outside these helpers without calling `computeUnreadCount` afterward.

### getPlaceholderNotifs (line 31)

`getPlaceholderNotifs(): Notification[]`. No parameters. Reads and writes no module-level state. Returns a freshly created `Notification[]` literal containing 7 hardcoded items. Fields per item: `id` (string), `type` (string literal), `title` (string), `body` (string), `read` (boolean). Items 1–5 have `read: false`; items 6–7 have `read: true`. Types: `'challenge'`, `'reaction'`, `'result'`, `'stake_won'`, `'tier_up'`, `'follow'`, `'system'`. No functions called. Not async. No error handling needed — pure factory, no external dependencies. A new array returned on every call — no shared references.

---

## Agent 05

### setNotifications (line 12)

`setNotifications(n: Notification[]): void`. Parameter `n` is `Notification[]`, no default, required. Writes `notifications` — replaced entirely with the incoming array reference. No branches, no functions called. Returns `void`. Not async. No error handling. No null/undefined guard on `n`; passing `null` or `undefined` would silently corrupt `notifications` and break all downstream consumers that iterate the array.

### setPanelOpen (line 13)

`setPanelOpen(v: boolean): void`. Parameter `v` is `boolean`, no default, required. Writes `panelOpen = v`. No branches, no functions called. Returns `void`. Not async. No error handling.

### setPollInterval (line 14)

`setPollInterval(v: ReturnType<typeof setInterval> | null): void`. Parameter `v` is `ReturnType<typeof setInterval> | null`, no default, required. Writes `pollInterval = v`. No branches, no functions called. Returns `void`. Not async. No error handling. Does NOT call `clearInterval` on the existing `pollInterval` before overwriting — if a non-null interval handle is already stored and the caller passes a new handle (or `null`) without first clearing the old one, the old timer is orphaned.

### markOneRead (line 16)

`markOneRead(id: string): boolean`. Parameter `id` is `string`, no default, required. Reads `notifications` (via `.find()`) and `unreadCount` (via `Math.max`). Writes: `n.read` on the found notification object — mutated in-place to `true`; `unreadCount` — decremented by 1, floored at 0 via `Math.max(0, unreadCount - 1)`. Three branches: (1) `.find` returns `undefined` → returns `false`, no mutation; (2) notification found AND `n.read` is already `true` → returns `false`, no mutation; (3) notification found AND `n.read` is `false` → mutates `n.read = true`, decrements `unreadCount`, returns `true`. Calls `notifications.find(predicate)` (result in `n`) and `Math.max(0, unreadCount - 1)` (result assigned to `unreadCount`). Returns `boolean`. Not async. No error handling beyond truthiness guard. Does not validate UUID format on `id`. `unreadCount` is decremented by direct arithmetic rather than recomputed from the array, so it can drift if `setNotifications` was called without a subsequent `computeUnreadCount`.

### markAllAsRead (line 22)

`markAllAsRead(): void`. No parameters. Reads `notifications` (iterated via `.forEach()`). Writes: each notification object's `.read` property mutated in-place to `true`; `unreadCount` set to `0`. No branches. If `notifications` is an empty array, `forEach` is a no-op and `unreadCount` is set to `0`. Calls `notifications.forEach(callback)` (return value discarded). Returns `void`. Not async. No error handling. Mutates objects in-place — any external references to items in the `notifications` array will see the mutation.

### computeUnreadCount (line 27)

`computeUnreadCount(): void`. No parameters. Reads `notifications` (filtered via `.filter()`). Writes `unreadCount` — set to the count of notifications where `n.read` is falsy. No branches. If `notifications` is empty, `unreadCount` is set to `0`. Calls `notifications.filter(n => !n.read)` (result's `.length` assigned to `unreadCount`). Returns `void`. Not async. No error handling. This is the canonical recompute path; calling it after `setNotifications` synchronizes `unreadCount` with the array, healing any drift caused by `markOneRead`'s arithmetic approach.

### getPlaceholderNotifs (line 31)

`getPlaceholderNotifs(): Notification[]`. No parameters. Reads and writes no module-level state. Returns a freshly constructed `Notification[]` literal of 7 items — 5 with `read: false`, 2 with `read: true`. Types: `'challenge'`, `'reaction'`, `'result'`, `'stake_won'`, `'tier_up'`, `'follow'`, `'system'`. All IDs are string numerals `'1'`–`'7'`. No functions called. Not async. No error handling needed — purely static data construction. Each call returns a new array with new object references; mutations to the returned array do not affect module state.
