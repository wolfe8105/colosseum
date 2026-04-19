# Stage 2 Outputs — async.utils.ts

## Agent 01

### _timeAgo

This function reads the parameter `dateStr`, which is a string, undefined, or null. If `dateStr` is falsy, it returns an empty string immediately. Otherwise, it parses `dateStr` as a date using `new Date(dateStr)`, calculates the difference in milliseconds between the current time (`Date.now()`) and that parsed date, and converts that difference into minutes. It then branches: if less than one minute, it returns `'now'`; if less than 60 minutes, it returns the count of minutes followed by `'m'`; if less than 24 hours, it converts to hours and returns the count followed by `'h'`; otherwise it converts to days and returns the count followed by `'d'`. The function is synchronous and returns a string in all paths.

### _enterArenaWithTopic

This function reads the parameter `topic` (a string) and the module-level declaration `ModeratorArena`, which is either an object with an `enterQueue` method or `undefined`. It calls `setTimeout` with a callback and an 800-millisecond delay. Inside the callback, it calls `navigateTo('arena')` from the imported `navigation.ts` module, then checks whether `ModeratorArena` is defined and `enterQueue` is truthy. If both are true, it calls `ModeratorArena.enterQueue('ai', topic)`. The function is synchronous and returns `void`; the navigation and queue entry occur asynchronously after the 800ms delay. The `setTimeout` callback is fire-and-forget.

## Agent 02

### _timeAgo

This function reads a single parameter: `dateStr` (string, undefined, or null). It reads no module-level state. Returns a string. If `dateStr` is falsy, returns an empty string immediately. Otherwise, constructs a `Date` from `dateStr`, computes the millisecond difference from `Date.now()`, converts to minutes, then branches: less than 1 → `'now'`; less than 60 → minutes + `'m'`; less than 24h → hours + `'h'`; else → days + `'d'`. No try/catch, no async operations, no external calls.

### _enterArenaWithTopic

Reads parameter `topic` (string) and module-level variable `ModeratorArena` (object with `enterQueue` or undefined). Returns void. Calls `setTimeout` with callback after 800ms. Inside the callback: calls `navigateTo('arena')`, then conditionally calls `ModeratorArena.enterQueue('ai', topic)` if `ModeratorArena` is defined and `enterQueue` exists. `setTimeout` is fire-and-forget. No try/catch, no loops, no async/await.

## Agent 03

### _timeAgo

Reads parameter `dateStr` (string, undefined, or null). If falsy, returns empty string. Otherwise: parses into a Date, calls `Date.now()` for current time, computes `diff` in ms, calculates `mins = Math.floor(diff / 60000)`. Branches: `mins < 1` → `'now'`; `mins < 60` → mins + `'m'`; else compute `hrs = Math.floor(mins / 60)`, `hrs < 24` → hrs + `'h'`; else compute `days = Math.floor(hrs / 24)` → days + `'d'`. Synchronous. No external calls.

### _enterArenaWithTopic

Reads parameter `topic` (string). Calls `setTimeout` with 800ms delay. Callback (fire-and-forget): calls `navigateTo('arena')`, then checks `typeof ModeratorArena !== 'undefined' && ModeratorArena?.enterQueue` — if true, calls `ModeratorArena.enterQueue('ai', topic)`. Returns void immediately. Synchronous with async side effect.

## Agent 04

### _timeAgo

Reads `dateStr` (string, undefined, or null) and `Date.now()`. Returns string. If `dateStr` falsy → empty string. Otherwise: parses date, computes ms diff, converts to minutes. Returns `'now'` if < 1 min; minutes + `'m'` if < 60 min; hours + `'h'` if < 24h; days + `'d'` otherwise. Synchronous. No I/O or external calls.

### _enterArenaWithTopic

Reads `topic` (string) and module-level `ModeratorArena` (object with `enterQueue` or undefined). Schedules `setTimeout` at 800ms. Callback: calls `navigateTo('arena')`, then conditionally calls `ModeratorArena.enterQueue('ai', topic)` if not undefined and has `enterQueue`. Returns `undefined` immediately. Navigation and queue entry occur 800ms later asynchronously.

## Agent 05

### _timeAgo

Reads `dateStr` parameter and `Date.now()`. Returns empty string if parameter is falsy. Otherwise: parses date, computes ms difference, converts to minutes. Branches: < 1 min → `'now'`; < 60 min → minutes + `'m'`; < 24h → hours + `'h'`; else → days + `'d'`. Synchronous. No other function calls.

### _enterArenaWithTopic

Reads `topic` parameter and global `ModeratorArena` (undefined or object with `enterQueue`). Calls `setTimeout` with 800ms. Callback: calls `navigateTo('arena')`, then calls `ModeratorArena.enterQueue('ai', topic)` if `ModeratorArena` defined and has `enterQueue`. Returns void. No return value, no module-level state writes, no error handling.
