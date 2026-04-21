# Stage 2 Outputs — tokens.ts

## Agent 01

### init (line 20)

`init` takes no parameters and has a declared return type of `void`. It is not async.

`init` does not directly read or write any module-level state variables within `tokens.ts` itself. All module-level state it touches is owned by sub-modules and accessed through the imported functions it calls.

`init` begins by calling `_injectCSS()` with no arguments. The return value is not used or captured.

It then calls `_initBroadcast()` with no arguments. The return value is not used or captured.

Next, `init` calls `onChange` (imported from `./auth.ts`), passing a single anonymous callback function as the argument. The return value of `onChange` is not captured or used.

The anonymous callback passed to `onChange` accepts two parameters: `user` and `profile`. Inside the callback, there is a single conditional branch: if `user` is truthy AND `profile` is truthy, the following four operations execute in sequence:

1. A nested conditional checks whether `profile.token_balance != null` (loose inequality, so guards against both `null` and `undefined`). If that condition is true, `_updateBalanceDisplay` is called with `profile.token_balance` as the sole argument. The return value is not used. If `profile.token_balance` is `null` or `undefined`, `_updateBalanceDisplay` is not called and execution continues.

2. `claimDailyLogin()` is called with no arguments. The return value is not captured.

3. `_loadMilestones()` is called with no arguments. The return value is not captured.

4. `_rpc` is called with two arguments: the string `'notify_followers_online'` and an object `{ p_user_id: user.id }`. The call is prefixed with `void`, meaning the returned Promise is explicitly discarded. No `await` is present; this is a fire-and-forget invocation.

If either `user` or `profile` is falsy (the else path), none of the four operations above execute and the callback returns without doing anything.

There is no try/catch anywhere inside `init` or its callback. The `void` prefix on `_rpc` means any Promise rejection from that call is silently swallowed with no error handling at the call site.

## Agent 02

### init (line 20)

`init` is a synchronous, exported, named function. It takes no parameters and returns `void`.

It reads no module-level state directly, but it calls functions that do read and write module-level state in their respective sub-modules.

`init` calls `_injectCSS()` with no arguments. The return value is discarded.

`init` calls `_initBroadcast()` with no arguments. The return value is discarded.

`onChange(callback)` is called with a single arrow-function argument. `onChange` is imported from `./auth.ts`. The callback registered with `onChange` receives two parameters: `user` and `profile`.

Inside that callback, there is a single conditional branch on `user && profile` (both must be truthy):

- **True path:** Three actions are taken sequentially.
  - `profile.token_balance != null` is evaluated. If that inner condition is true, `_updateBalanceDisplay(profile.token_balance)` is called with the numeric value `profile.token_balance` as its sole argument; the return value is discarded. If the inner condition is false (token_balance is null or undefined), `_updateBalanceDisplay` is not called and execution continues.
  - `claimDailyLogin()` is called with no arguments. The return value is discarded (not awaited; any returned promise is silently dropped).
  - `_loadMilestones()` is called with no arguments. The return value is discarded.
  - `void _rpc('notify_followers_online', { p_user_id: user.id })` is called. `_rpc` receives the string `'notify_followers_online'` as its first argument and an object `{ p_user_id: user.id }` as its second argument. The `void` operator explicitly discards the returned promise — no await, no error handling on the resulting promise.

- **False path (user or profile is falsy):** None of the four inner calls are made; the callback body exits silently with no further action.

`init` itself returns `void` after registering the `onChange` callback. It does not `await` anything, does not use try/catch, and performs no error handling at any point in its own body.

## Agent 03

### init (line 20)

`init` takes no parameters and is declared with a `void` return type. It is synchronous (not `async`).

The function itself does not directly read any module-level state variables. It does reference imported names (`_injectCSS`, `_initBroadcast`, `onChange`, `_updateBalanceDisplay`, `claimDailyLogin`, `_loadMilestones`, `_rpc`) all of which are imported from sub-modules. No module-level state is written directly by `init`.

First, `init` calls `_injectCSS()` with no arguments. The return value is discarded.

Second, `init` calls `_initBroadcast()` with no arguments. The return value is discarded.

Third, `init` calls `onChange` (imported from `./auth.ts`) with a single argument: an inline callback function. The return value of `onChange` is discarded.

The `onChange` callback has the signature `(user, profile) => { ... }`. It contains one branch:

- **Condition:** `user && profile` — both must be truthy.
  - **True path:** Four operations execute in sequence:
    1. A nested condition checks `profile.token_balance != null`. If true, `_updateBalanceDisplay` is called with `profile.token_balance` as its sole argument. The return value is discarded. If `profile.token_balance` is `null` or `undefined`, this call is skipped entirely.
    2. `claimDailyLogin()` is called with no arguments. The return value is discarded.
    3. `_loadMilestones()` is called with no arguments. The return value is discarded.
    4. `_rpc('notify_followers_online', { p_user_id: user.id })` is called with two arguments: the string `'notify_followers_online'` and an object literal `{ p_user_id: user.id }`. The call is prefixed with `void`, meaning the returned Promise is explicitly discarded and no `await` is applied. This fire-and-forget pattern means errors from this call are silently swallowed unless `_rpc` handles them internally.
  - **False path:** If either `user` or `profile` is falsy, the entire callback body is skipped — none of the four operations above execute.

There is no `try/catch` block inside `init`. No error handling is present at this level. The `void` before `_rpc(...)` explicitly suppresses the Promise result, meaning any rejection from that call is unhandled at this scope.

## Agent 04

### init (line 20)

`init` is a synchronous, non-async function with no parameters and a declared return type of `void`.

`init` does not directly read or write any module-level variables itself. It delegates all state concerns to the functions it calls. The module-level `lastKnownBalance` and `MILESTONES` are accessed only through imported helpers, not touched directly inside `init`.

First, `init` calls `_injectCSS()` with no arguments. The return value is discarded.

Second, `init` calls `_initBroadcast()` with no arguments. The return value is discarded.

Third, `init` calls `onChange(callback)`, passing a single inline arrow function as the callback argument. The return value of `onChange` is discarded. The callback itself receives two parameters — `user` and `profile` — and is executed at some future time by the auth system, not by `init` directly.

Inside the callback registered with `onChange`: the callback first evaluates the condition `user && profile`. If either is falsy, the callback body does nothing and returns implicitly.

If both `user` and `profile` are truthy, the callback enters its branch and performs four sequential operations:

1. It checks `profile.token_balance != null` (loose inequality, so this is true if `token_balance` is neither `null` nor `undefined`). If that check passes, it calls `_updateBalanceDisplay(profile.token_balance)`, passing the raw `token_balance` value. The return value is discarded. If the check fails, `_updateBalanceDisplay` is not called.

2. It calls `claimDailyLogin()` with no arguments. The return value is discarded.

3. It calls `_loadMilestones()` with no arguments. The return value is discarded.

4. It calls `_rpc('notify_followers_online', { p_user_id: user.id })` — the string `'notify_followers_online'` as the first argument and an object literal `{ p_user_id: user.id }` as the second argument. The call is prefixed with `void`, so the returned Promise is explicitly discarded and any rejection is silently swallowed.

`init` returns `void`. There is no `try/catch` block inside `init`. The `void` prefix on the `_rpc` call discards its Promise, meaning any rejection from that call is not caught and will not propagate. All other called functions (`_injectCSS`, `_initBroadcast`, `onChange`, `_updateBalanceDisplay`, `claimDailyLogin`, `_loadMilestones`) are called without any surrounding error handling; thrown synchronous exceptions from any of them would propagate up to `init`'s caller uncaught.

## Agent 05

### init (line 20)

`init` takes no parameters and returns `void`. It is not async.

There are no try/catch blocks, no `.catch()` handlers, and no conditional checks for failure. The `void` keyword explicitly discards the promise returned by `_rpc`, meaning any rejection from that call is silently swallowed.

1. Calls `_injectCSS()` with no arguments. The return value is discarded.

2. Calls `_initBroadcast()` with no arguments. The return value is discarded.

3. Calls `onChange(callback)` from `./auth.ts`, passing an inline arrow function as the sole argument. The return value of `onChange` is discarded. The registered callback receives two parameters — `user` and `profile` — and executes the following when invoked by the auth system:

   - **Branch condition:** `if (user && profile)` — both values must be truthy for the inner block to execute. If either is falsy (null, undefined, or any falsy value), the entire inner block is skipped with no else path.

   - **Inside the truthy branch:**
     - Checks `profile.token_balance != null` (loose inequality, so it passes for any value that is not `null` and not `undefined`). If true, calls `_updateBalanceDisplay(profile.token_balance)`, passing the raw `token_balance` value from the profile object. The return value is discarded. If `profile.token_balance` is null or undefined, this call is skipped entirely.
     - Calls `claimDailyLogin()` with no arguments. The return value is discarded.
     - Calls `_loadMilestones()` with no arguments. The return value is discarded.
     - Calls `_rpc('notify_followers_online', { p_user_id: user.id })` — the string `'notify_followers_online'` is the RPC name, and `{ p_user_id: user.id }` is the params object. The call is prefixed with `void`, so the returned promise is explicitly discarded and any rejection is not handled.

`init` does not directly read or write any module-level variables declared in `tokens.ts` itself. The `onChange`, `_injectCSS`, `_initBroadcast`, `_updateBalanceDisplay`, `_rpc`, `claimDailyLogin`, and `_loadMilestones` identifiers are all imported from sub-modules; any state mutations happen inside those imported functions.
