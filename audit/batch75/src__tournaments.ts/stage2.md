# Stage 2 Outputs — tournaments.ts

## Agent 01

### initTournaments

`initTournaments` is a synchronous function that takes no parameters and returns a `Promise<void>`. It reads no module-level state directly; instead it reads `ready`, a promise imported from `./auth.ts` that resolves once auth initialization completes. When called, the function chains a `.then()` callback onto `ready` and immediately returns the resulting promise to the caller — it does not `await` internally, and it is not declared `async`. The single branch inside the `.then()` callback calls `startTournamentMatchPoll`, imported from `./tournaments.indicator.ts`, with no arguments. That call is fire-and-forget within the callback: whatever `startTournamentMatchPoll` returns is discarded, and the `.then()` callback itself returns `undefined`, which is why the outer promise resolves to `void`. There is no error path, no catch block, no early return, and no conditional logic. If `ready` rejects — for example, if auth initialization fails — the returned promise rejects with that same error and `startTournamentMatchPoll` is never called. The function writes nothing to module-level state and produces no return value beyond the promise chain.

## Agent 02

### initTournaments

`initTournaments` is a synchronous function that takes no parameters and returns a `Promise<void>`. It reads the module-level `ready` promise imported from `./auth.ts`, which resolves when authentication state has been established. The function calls `.then()` on `ready`, registering a callback that, when `ready` resolves, calls `startTournamentMatchPoll()` imported from `./tournaments.indicator.ts`. The return value is the `Promise<void>` produced by that `.then()` chain — the caller receives a promise that settles after `startTournamentMatchPoll()` returns. There is no `await` inside the function body; the `.then()` callback is registered synchronously and the promise is returned immediately. There are no branches, loops, early returns, or error paths — no `.catch()` is attached, so if `ready` rejects or `startTournamentMatchPoll()` throws, the rejection propagates to the caller unhandled. The function writes no module-level state and touches neither the DOM nor storage directly; any side effects belong entirely to `startTournamentMatchPoll()`.

## Agent 03

### initTournaments

`initTournaments` is a synchronous function that takes no parameters and returns a `Promise<void>`. It reads no module-level state of its own. It accesses the module-level `ready` promise imported from `./auth.ts`, which resolves when auth initialization completes. The function calls `.then()` on `ready`, registering a callback that calls `startTournamentMatchPoll()` — imported from `./tournaments.indicator.ts` — when `ready` resolves. The return value is the promise produced by `.then()`, so the caller receives a promise that resolves (to `undefined`) after `startTournamentMatchPoll()` has been invoked. There is no `await`, no `async` keyword, no error path, no catch block, and no branches. The call to `startTournamentMatchPoll()` is not awaited within the callback — if `startTournamentMatchPoll` itself returns a promise, that promise is not chained and its rejection would go unobserved from within `initTournaments`. The function writes nothing to module-level state, the DOM, storage, or any external API directly; all side effects are deferred to `startTournamentMatchPoll` once auth is ready.

## Agent 04

### initTournaments

`initTournaments` is a synchronous function that takes no parameters and returns a `Promise<void>`. It reads no module-level state of its own. It accesses `ready`, a promise imported from `./auth.ts` that resolves once authentication state has initialized. The function calls `ready.then()`, attaching a callback that calls `startTournamentMatchPoll()` — imported from `./tournaments.indicator.ts` — and returns the resulting promise chain directly to the caller. No `await` is used; the function itself is not declared `async`. The returned promise resolves to `undefined` after `startTournamentMatchPoll()` returns. There is no error handling: no `catch` block is attached, so any rejection from `ready` or any synchronous throw from `startTournamentMatchPoll()` propagates to the caller as a rejected promise. There are no branches, loops, or early returns. The function writes nothing to module-level state and produces no DOM or storage side effects directly; any side effects are produced by `startTournamentMatchPoll()` at the time `ready` resolves.

## Agent 05

### initTournaments

`initTournaments` is a synchronous function that returns a `Promise<void>`. It takes no parameters and reads no module-level state directly. It accesses `ready`, a promise imported from `./auth.ts` that resolves when the auth subsystem has finished initializing. The function calls `.then()` on `ready`, passing a callback that calls `startTournamentMatchPoll()`, imported from `./tournaments.indicator.ts`. The returned promise is the promise produced by that `.then()` chain, which resolves to `void` once the callback completes. There is no `await` keyword used — the function simply attaches a `.then()` handler and returns the resulting promise to the caller, who may or may not await it. There are no branches, no loops, no error paths, and no catch block; if `ready` rejects or `startTournamentMatchPoll()` throws, the rejection propagates through the returned promise unhandled. The function writes nothing to module-level or external state itself — the only side effect is the deferred invocation of `startTournamentMatchPoll()`, which begins tournament match polling on behalf of the authenticated user.
