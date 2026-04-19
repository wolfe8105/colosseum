# Stage 2 Outputs — home.invite.ts

## Agent 01

### loadInviteScreen

`loadInviteScreen` is an async function that accepts a single `container` parameter of type `HTMLElement` and returns `Promise<void>`. It reads and potentially writes the module-level variable `_sheetCleanup`, which holds a cleanup callback or `null`.

On entry, the function checks `_sheetCleanup`: if it is non-null, it calls it immediately and then sets `_sheetCleanup` to `null`, tearing down any previously open claim sheet before proceeding. It then sets `container.innerHTML` to a loading placeholder string. Next, it `await`s a call to `safeRpc('get_my_invite_stats', {})`, which performs an authenticated RPC call to the database function `get_my_invite_stats` with an empty params object. The resolved value is stored in `result`, and `result.data` is cast as `InviteStats | null` and stored in `stats`.

The function then enters an error branch: if `stats` is falsy or `result.error` is truthy, it replaces `container.innerHTML` with an error message string and returns early, writing nothing to `_sheetCleanup`. On the happy path — `stats` is a valid `InviteStats` object and no error — it calls `renderInvite(container, stats, claimCallback)`, passing the container element, the fetched stats, and an inline callback. `renderInvite` is called synchronously here and its return value is not used.

The inline claim callback is invoked by the rendered UI when the user selects a reward. When triggered, it first checks `_sheetCleanup` again; if non-null, it calls it and nulls it out. It then calls `openClaimSheet(rewardId, rewardType, onClose, onClaimed)` with the reward ID and type, an `onClose` callback that sets `_sheetCleanup` to `null`, and an `onClaimed` callback that re-invokes `loadInviteScreen(container)` — restarting the whole load cycle with the same container. `openClaimSheet` returns a promise; `.then(cleanup => { _sheetCleanup = cleanup; })` stores the returned cleanup function in module state. A `.catch` on that same promise logs any rejection to the console with the prefix `[invite]` but does not rethrow. The `openClaimSheet` call chain is fire-and-forget relative to the `renderInvite` synchronous call — `loadInviteScreen` itself does not `await` it.

### cleanupInviteScreen

`cleanupInviteScreen` is a synchronous function that accepts no parameters and returns `void`. It reads the module-level variable `_sheetCleanup`. If `_sheetCleanup` is non-null, the function calls it — invoking whatever teardown the currently open claim sheet registered — and then sets `_sheetCleanup` to `null`. If `_sheetCleanup` is already `null`, the function does nothing. There is no branching beyond that single null check, no error path, no return value, and no calls to external APIs or other functions beyond the stored cleanup callback itself.

---

## Agent 02

### loadInviteScreen

`loadInviteScreen` is an async function that accepts a single parameter, `container`, which is an `HTMLElement`. It reads and writes the module-level variable `_sheetCleanup`, which is either a cleanup callback or `null`.

At the start, it checks whether `_sheetCleanup` is non-null. If it is, the stored cleanup function is called immediately and `_sheetCleanup` is set to `null`, tearing down any previously open sheet before proceeding. It then overwrites `container.innerHTML` with a loading message string.

Next, it `await`s a call to `safeRpc('get_my_invite_stats', {})`, passing the RPC name and an empty params object. The resolved value is stored as `result`, and `result.data` is cast to `InviteStats | null` and stored as `stats`.

The function then enters its only branch: if `stats` is falsy or `result.error` is truthy, it overwrites `container.innerHTML` with an error message and returns early, producing no further side effects. No `try/catch` block wraps the `safeRpc` call, so a thrown rejection would propagate to the caller unhandled.

If the data check passes, `renderInvite` is called synchronously with `container`, `stats`, and an inline callback. `renderInvite` is responsible for populating the DOM; the inline callback is passed as a click handler for reward claims. When that callback is invoked with a `rewardId` and `rewardType`, it first runs the same guard as above — calling and nulling any existing `_sheetCleanup` — then calls `openClaimSheet` with four arguments: `rewardId`, `rewardType`, an `onClose` callback that nulls `_sheetCleanup`, and an `onClaimed` callback that recursively calls `loadInviteScreen(container)` to reload the screen. `openClaimSheet` returns a promise; `.then` stores the resolved cleanup function into `_sheetCleanup`, and `.catch` logs any error to the console with the `[invite]` prefix. This `.then`/`.catch` chain is fire-and-forget relative to `loadInviteScreen`'s own execution — `loadInviteScreen` does not await it. The function itself returns `void` (implicitly `undefined`) after `renderInvite` returns.

### cleanupInviteScreen

`cleanupInviteScreen` is a synchronous function that takes no parameters and returns `void`. It reads and writes the module-level variable `_sheetCleanup`. If `_sheetCleanup` is non-null, it calls the stored function and then sets `_sheetCleanup` to `null`. If `_sheetCleanup` is already `null`, the function does nothing. There are no branches beyond this single null check, no loops, no error paths, no async operations, and no calls to external APIs or other functions on the anchor list.

---

## Agent 03

### loadInviteScreen

`loadInviteScreen` is an async function that accepts a single parameter, `container`, typed as `HTMLElement`, and returns `Promise<void>`. It reads and writes the module-level variable `_sheetCleanup`, which is initialized to `null` and holds either a cleanup callback or `null`.

At the start, it checks whether `_sheetCleanup` is non-null. If it is, it immediately calls the stored cleanup function and then sets `_sheetCleanup` back to `null`, tearing down any previously opened sheet before proceeding. It then sets `container.innerHTML` to a loading placeholder string.

Next, it awaits `safeRpc('get_my_invite_stats', {})`, passing the RPC name and an empty params object. The resolved value is stored in `result`, and `result.data` is cast as `InviteStats | null` and stored in `stats`. Control then reaches a guard branch: if `stats` is falsy or `result.error` is truthy, `container.innerHTML` is overwritten with an error message string and the function returns early via an explicit `return`. This is the error path and receives the same weight as the success path — when either condition is met, no further work is done.

If the guard passes, `renderInvite` is called synchronously with three arguments: `container`, `stats`, and an inline callback. That callback is the click handler for individual reward claims. When the callback fires (with `rewardId` and `rewardType` arguments), it first repeats the `_sheetCleanup` guard — calling and nulling it if present — then calls `openClaimSheet`, passing `rewardId`, `rewardType`, a close callback that sets `_sheetCleanup = null`, and a success callback that calls `loadInviteScreen(container)` recursively (fire-and-forget; the returned promise is not awaited at that point in the callback). `openClaimSheet` itself returns a promise, and `.then(cleanup => { _sheetCleanup = cleanup; })` stores the returned cleanup function into `_sheetCleanup`. A `.catch(e => console.error('[invite]', e))` is chained to log any rejection from `openClaimSheet` to the console without rethrowing. The `.then/.catch` chain is not awaited; after calling `renderInvite`, `loadInviteScreen` returns immediately.

### cleanupInviteScreen

`cleanupInviteScreen` is a synchronous function that takes no parameters and returns `void`. It reads and writes the module-level variable `_sheetCleanup`. If `_sheetCleanup` is non-null, it calls the stored cleanup callback and then sets `_sheetCleanup` to `null`. If `_sheetCleanup` is already `null`, the body of the `if` block is skipped and the function exits without doing anything. There are no loops, no async operations, no external API calls, no DOM reads or writes, and no error path beyond the single conditional check.

---

## Agent 04

### loadInviteScreen

`loadInviteScreen` is an async function that accepts a single parameter, `container`, which is an `HTMLElement`. It reads and may write the module-level variable `_sheetCleanup`, which is either a cleanup callback or `null`.

On entry, it checks whether `_sheetCleanup` is non-null. If it is, it calls the stored cleanup function immediately and sets `_sheetCleanup` to `null` before doing anything else. It then writes a loading placeholder into `container.innerHTML`.

It then awaits `safeRpc('get_my_invite_stats', {})`, a network call that returns a result object. The resolved value's `.data` property is cast to `InviteStats | null` and stored as `stats`. If `stats` is falsy or `result.error` is truthy, the function replaces `container.innerHTML` with an error message string and returns early, abandoning the rest of execution.

On the happy path, it calls `renderInvite(container, stats, callback)` synchronously, passing the container element, the fetched stats, and an inline callback function. The callback is invoked externally (by the rendered UI, presumably when the user clicks a claim button) and receives two arguments: `rewardId` and `rewardType`. When that callback fires, it first checks `_sheetCleanup` again and calls and nulls it if present, then calls `openClaimSheet(rewardId, rewardType, onClose, onClaim)`. `openClaimSheet` receives two further callbacks: the first sets `_sheetCleanup` to `null` on close, and the second re-invokes `loadInviteScreen(container)` on a successful claim, which restarts the entire load cycle for the same container. `openClaimSheet` returns a promise; `.then` assigns the resolved cleanup function to `_sheetCleanup`. The `.catch` handler logs any rejection to the console with the prefix `[invite]`. This entire `openClaimSheet` chain is fire-and-forget relative to the outer `loadInviteScreen` execution — no `await` is used on it. The function returns `Promise<void>` and no value is explicitly returned on the happy path.

### cleanupInviteScreen

`cleanupInviteScreen` is a synchronous function that takes no parameters and returns `void`. It reads the module-level variable `_sheetCleanup`. If `_sheetCleanup` is non-null, it calls the stored function and then sets `_sheetCleanup` to `null`. If `_sheetCleanup` is already `null`, the function exits immediately with no side effects. There are no branches beyond that check, no loops, no error paths, and no calls to any other function on the anchor list.

---

## Agent 05

### loadInviteScreen

`loadInviteScreen` is an async function that accepts a single `container` parameter of type `HTMLElement` and returns `Promise<void>`. It reads and writes the module-level variable `_sheetCleanup`, which holds a cleanup callback (`() => void`) or `null`.

On entry, if `_sheetCleanup` is non-null, the function calls it immediately and sets `_sheetCleanup` to `null`, tearing down any previously open claim sheet before proceeding. It then writes a loading placeholder into `container.innerHTML`.

Next it awaits `safeRpc('get_my_invite_stats', {})`, an RPC call that returns a result object. The resolved value's `.data` property is cast to `InviteStats | null` and assigned to `stats`. If `stats` is falsy or `result.error` is truthy, the function writes an error message into `container.innerHTML` and returns early — no further calls are made.

On the happy path, `renderInvite` is called synchronously with `container`, `stats`, and an inline callback. `renderInvite` is responsible for populating the DOM; the callback it receives is invoked when the user selects a reward. When that callback fires, it again checks `_sheetCleanup` and calls and nulls it if present, then calls `openClaimSheet` with four arguments: `rewardId`, `rewardType`, an `onClose` callback that sets `_sheetCleanup` to `null`, and an `onClaim` callback that re-invokes `loadInviteScreen(container)` — reloading the entire screen after a successful claim. `openClaimSheet` returns a promise; `.then(cleanup => { _sheetCleanup = cleanup; })` stores the returned cleanup function into `_sheetCleanup`. The `.catch` block logs any rejection to the console with the prefix `[invite]`. The `openClaimSheet` promise chain is fire-and-forget from the perspective of `loadInviteScreen` — it is not awaited.

### cleanupInviteScreen

`cleanupInviteScreen` is a synchronous function that accepts no parameters and returns `void`. It reads and writes the module-level `_sheetCleanup` variable. If `_sheetCleanup` is non-null, it calls the stored cleanup function and then sets `_sheetCleanup` to `null`. If `_sheetCleanup` is already `null`, the function does nothing. There are no branches beyond that single null check, no loops, no error paths, and no external calls other than invoking `_sheetCleanup` itself.
