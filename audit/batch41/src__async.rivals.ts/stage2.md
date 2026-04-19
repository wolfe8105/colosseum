# Stage 2 Outputs — async.rivals.ts

## Agent 01

### _registerRivalWiring

Reads: parameter `fn` (a function of type `WireFn`). Writes: assigns `fn` to module-level variable `_wireRivals`. Calls/APIs: none. Control flow: none (single assignment). Async: no. Returns: `void`.

### renderRivals

Reads: parameter `container` (HTMLElement); module-level variable `_wireRivals`; module-level variable `state.wiredContainers` (a Set); result of calling `getMyRivals()` from './auth.ts'; properties on RivalEntry objects (`rival_display_name`, `rival_username`, `rival_id`, `rival_elo`, `rival_wins`, `rival_losses`, `status`, `direction`, `id`). Writes: to `state.wiredContainers` (adds container via `.add()`); to `container.innerHTML`. Calls in order: (1) early return check `!container`; (2) conditional check if container not in `state.wiredContainers`, calls `_wireRivals?.(container)` (optional chaining) then adds container to Set; (3) awaits `getMyRivals()` cast to `RivalEntry[]` with fallback to `[]`; (4) early return if `!rivals.length`, sets innerHTML to empty state HTML; (5) maps over rivals array building HTML strings for each rival, escapes properties, joins and sets innerHTML. Two early returns (lines 30, 46). Within map, conditional on `r.status === 'pending'` and `r.direction === 'received'`. Async: yes, awaits `getMyRivals()`. Returns: `Promise<void>`.

### refreshRivals

Reads: DOM via `document.getElementById('rivals-feed')`. Writes: none directly; indirectly writes via `renderRivals()`. Calls in order: (1) `document.getElementById('rivals-feed')`; (2) if truthy, awaits `renderRivals(container)`. Control flow: single conditional check. Async: yes, awaits `renderRivals`. Returns: `Promise<void>`.

## Agent 02

### _registerRivalWiring

Reads: parameter `fn` (a callback function of type `WireFn`). Writes: the module-level variable `_wireRivals`, assigning it the value of `fn`. Calls/APIs: none. Control flow: straightforward assignment, no branching or error handling. Returns: `void`. Not async.

### renderRivals

Reads: parameter `container` (HTMLElement); module-level state `state.wiredContainers` (a Set); module-level `_wireRivals` (the callback function, may be undefined); external API `getMyRivals()` (imported from `auth.ts`); properties of rival objects: `rival_display_name`, `rival_username`, `rival_id`, `rival_elo`, `rival_wins`, `rival_losses`, `status`, `direction`, `id`. Writes: to `state.wiredContainers` (adds the container to the Set if not already present); to `container.innerHTML`. Calls in order: (1) checks `container` truthiness; (2) checks if container not in `state.wiredContainers`; if not, calls `_wireRivals?.(container)` (optional chaining, so no-op if undefined) and adds container to Set; (3) awaits `getMyRivals()` with fallback to empty array; (4) if empty array, sets innerHTML to empty state message and returns; (5) maps over rivals array building HTML strings, uses `escapeHTML` on user-controlled data, sets innerHTML to header plus joined rival cards. Within map, conditional rendering based on `r.status === 'pending'` and `r.direction === 'received'`. Async: yes. Returns: `Promise<void>`.

### refreshRivals

Reads: DOM via `document.getElementById('rivals-feed')`. Writes: none directly; indirectly via `renderRivals`. Calls: (1) `document.getElementById('rivals-feed')`; (2) if truthy, awaits `renderRivals(container)`. Control flow: conditional execution — if null, no further action. Async: yes. Returns: `Promise<void>`.

## Agent 03

### _registerRivalWiring

Reads: the `fn` parameter. Writes: module-level variable `_wireRivals` with the value of `fn`. Calls: none. Control flow: no branches or early returns. Async: no. Returns: undefined.

### renderRivals

Reads: parameter `container`; module-level variable `_wireRivals`; `state.wiredContainers` (a Set from module state); calls `getMyRivals()` for rivals data; accesses properties on each `RivalEntry` object. Writes: `state.wiredContainers` (adds `container`); `container.innerHTML`. Calls in order: (1) optional call to `_wireRivals?.(container)` if condition met; (2) `getMyRivals()` awaited; (3) `escapeHTML()` called multiple times for each rival entry. Control flow: early return at line 30 if `container` is falsy; early return at line 46 if `rivals.length` is 0; conditional block checking `!state.wiredContainers.has(container)`; conditional rendering at lines 66-70 based on `r.status` and `r.direction`; `map()` loop over rivals. Async: yes. Returns: `Promise<void>`.

### refreshRivals

Reads: DOM, calls `document.getElementById('rivals-feed')`. Writes: nothing directly; calls `renderRivals()`. Calls: (1) `document.getElementById('rivals-feed')`; (2) conditionally awaits `renderRivals(container)`. Control flow: conditional at line 78. Async: yes. Returns: `Promise<void>`.

## Agent 04

### _registerRivalWiring

Reads: parameter `fn` (function of type `WireFn`). Writes: module-level variable `_wireRivals` to the value of `fn`. No other functions called. No async. Returns: `void`.

### renderRivals

Async function. Reads: parameter `container`; module-level `_wireRivals`; module-level `state.wiredContainers`; result of awaiting `getMyRivals()`. Writes: `state.wiredContainers`; `container.innerHTML`. Control flow: early return if `container` is falsy; checks if `container` in `state.wiredContainers`—if not, calls `_wireRivals?.(container)` (optional chaining) and adds to Set; awaits `getMyRivals()`, coerces to `RivalEntry[]` with fallback to empty array; if empty, sets innerHTML to empty state and returns; otherwise maps over rivals, escaping `rival_display_name`, `rival_username`, `rival_id`, `id` through `esc()`, renders card with rival name, ELO, win-loss; branches on `r.status === 'pending'` — further branches on `r.direction === 'received'` to show ACCEPT button or PENDING label; otherwise shows ACTIVE label; joins and sets innerHTML. No error handling via try/catch. Returns: `Promise<void>`.

### refreshRivals

Async function. Reads: DOM via `document.getElementById('rivals-feed')`. Writes: nothing directly. Control flow: if container truthy, awaits `renderRivals(container)`; if falsy, no action. No error handling. Returns: `Promise<void>`.

## Agent 05

### _registerRivalWiring

Reads parameter `fn` of type `WireFn`. Writes to module-level variable `_wireRivals`, assigning it the `fn` parameter. Returns `undefined` (void). Not async. No error paths. No branches.

### renderRivals

Async function. Returns `Promise<void>`. Reads parameter `container` (HTMLElement). Reads module-level `_wireRivals` (WireFn | undefined). Reads module-level `state.wiredContainers` (Set tracking wired containers). At line 30: checks if `container` is falsy; if true, returns early. At lines 32-35: checks if `container` not in `state.wiredContainers`; if not, calls `_wireRivals?.(container)` (optional chaining), then adds `container` to `state.wiredContainers`. At line 38: awaits `getMyRivals()`, casts result as unknown then as `RivalEntry[]`, with nullish coalescing fallback to empty array. At lines 40-47: if `rivals` empty, writes empty state HTML to `container.innerHTML` and returns early. At lines 49-73: maps over `rivals` array; for each rival extracts and escapes properties using `esc()`; renders card with rival name, ELO rating, win-loss record; at lines 66-70, branches on `r.status === 'pending'`—if pending, further branches on `r.direction === 'received'` to show ACCEPT button or PENDING label; otherwise shows ACTIVE label; joins HTML and sets `container.innerHTML`. No explicit error handling.

### refreshRivals

Async function. Returns `Promise<void>`. At line 77: reads from DOM using `document.getElementById('rivals-feed')`. At line 78: checks if `container` is truthy; if true, awaits `renderRivals(container)`. If `container` is falsy, does nothing and returns. No explicit error handling.
