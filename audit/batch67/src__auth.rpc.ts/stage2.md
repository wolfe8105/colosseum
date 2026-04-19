# Stage 2 Outputs — auth.rpc.ts

## Agent 01

### safeRpc

`safeRpc` is an async generic function that accepts two parameters: `fnName` (a string naming the Supabase RPC function to call) and `args` (a plain object of key-value pairs, defaulting to an empty object). It returns a `Promise<SafeRpcResult<T>>`, where `T` defaults to `unknown`. It reads no module-level state directly — it obtains the Supabase client on each invocation by calling `getSupabaseClient()`, which is imported from `auth.core.ts`. If `getSupabaseClient()` returns a falsy value (client not yet initialized), the function returns immediately with `{ data: null, error: { message: 'Supabase not initialized' } }` and calls nothing further.

When the client is present, `safeRpc` defines a local async closure called `attempt` that forwards `fnName` and `args` to `supabaseClient.rpc()`, casting the result to `Promise<SafeRpcResult<T>>`. It immediately awaits `attempt()` and stores the result. It then checks whether the result carries a 401-class error by inspecting three conditions on `result.error`: a numeric `status` field equal to `401`, a `code` field equal to `'PGRST301'`, or a `message` field (lowercased) containing the substring `'jwt expired'`. If any condition is true, it logs a warning to `console.warn` and awaits `supabaseClient.auth.refreshSession()`. If that refresh call itself returns an error, it logs to `console.error`, fires `supabaseClient.auth.signOut()` as a fire-and-forget call (prefixed with `void`), and returns `{ data: null, error: { message: refreshError.message } }` without retrying the original RPC. If the refresh succeeds, it awaits `attempt()` a second time and overwrites `result` with that second response — no further 401 detection is performed on the retry. Whether the 401 branch was taken or not, `safeRpc` returns `result` as its final value. No try/catch block is present anywhere in the function; uncaught promise rejections from either `supabaseClient.rpc()` or `supabaseClient.auth.refreshSession()` would propagate to the caller.

---

## Agent 02

### safeRpc

`safeRpc` is an `async` generic function that accepts two parameters: `fnName` (a string naming the Postgres RPC function to call) and `args` (a plain object of key-value pairs, defaulting to an empty object). It returns a `Promise<SafeRpcResult<T>>`, where `SafeRpcResult` is an imported type from `auth.types.ts`.

At the top of the function body, it calls `getSupabaseClient()` (imported from `auth.core.ts`), which reads and returns the module-level Supabase client instance held in that module. If `getSupabaseClient()` returns a falsy value — meaning the client has not been initialized — the function returns immediately with `{ data: null, error: { message: 'Supabase not initialized' } }` and does not proceed further.

After the null guard, a closure named `attempt` is defined. `attempt` is itself an `async` function that calls `supabaseClient!.rpc(fnName, args)` on the Supabase client, casting the result to `Promise<SafeRpcResult<T>>`. `attempt` does not catch any errors itself. The function then `await`s the first invocation of `attempt()`, storing the result in `result`.

Next, `safeRpc` inspects `result.error` to determine whether the first call returned a 401-class failure. The `is401` flag is set to `true` if `result.error` is non-null and any of three sub-conditions hold: the error carries a `.status` property equal to `401`, the error has a `.code` of `'PGRST301'`, or the error's `.message` string (lowercased) contains the substring `'jwt expired'`. No other error codes trigger the retry branch.

If `is401` is `true`, the function logs a warning to the console and then `await`s `supabaseClient.auth.refreshSession()`. If the refresh itself returns an error (`refreshError` is truthy), the function logs that error to the console, calls `supabaseClient.auth.signOut()` as a fire-and-forget `void` expression (not awaited), and returns early with `{ data: null, error: { message: refreshError.message } }`. If the refresh succeeds, `attempt()` is called a second time and its result overwrites `result`. Whether or not the 401 branch was taken, `safeRpc` concludes by returning `result`. There is no try/catch block anywhere in the function; thrown exceptions from `supabaseClient.rpc()` or from `auth.refreshSession()` would propagate uncaught to the caller.

---

## Agent 03

### safeRpc

`safeRpc` is an async generic function that accepts two parameters: `fnName` (a string naming the Supabase RPC function to call) and `args` (a plain object of key/value pairs, defaulting to an empty object). It returns a `Promise<SafeRpcResult<T>>`, where `T` defaults to `unknown`. The function reads no module-level state directly; instead it calls the imported `getSupabaseClient()` from `auth.core.ts` on every invocation to obtain the current Supabase client instance. If `getSupabaseClient()` returns a falsy value (i.e., the client has not been initialized), the function returns immediately with `{ data: null, error: { message: 'Supabase not initialized' } }` — no RPC is attempted.

When the client is present, the function defines a local async closure called `attempt` that calls `supabaseClient.rpc(fnName, args)` and casts the result to `Promise<SafeRpcResult<T>>`. It immediately awaits `attempt()` and stores the result in `result`. It then inspects `result.error` for three 401-equivalent signals: an HTTP `status` property equal to `401`, an error `code` of `'PGRST301'`, or a `message` string containing `'jwt expired'` (case-insensitive). If none of these conditions are true, `result` is returned directly. If any condition matches, the function logs a warning to the console, awaits `supabaseClient.auth.refreshSession()`, and inspects its own error. If the refresh itself fails, the function logs an error, calls `supabaseClient.auth.signOut()` as a fire-and-forget `void` expression (not awaited), and returns `{ data: null, error: { message: refreshError.message } }`. If the refresh succeeds, the function awaits `attempt()` a second time, storing the new result in `result`, and returns that second result regardless of whether it also contains an error — there is no second 401 check and no further retry loop.

---

## Agent 04

### safeRpc

`safeRpc` is an async generic function that accepts two parameters: `fnName` (a string naming the Postgres RPC function to call) and `args` (a plain object of key-value pairs, defaulting to an empty object). It returns a `Promise<SafeRpcResult<T>>`, where `T` defaults to `unknown`. It reads no module-level state of its own; all external state access goes through the imported `getSupabaseClient` function.

The function begins by calling `getSupabaseClient()`, which is imported from `auth.core.ts` and returns the initialized Supabase client or a falsy value. If the client is absent, `safeRpc` returns immediately with `{ data: null, error: { message: 'Supabase not initialized' } }` — no RPC call is made. If the client exists, a local closure `attempt` is defined; calling `attempt()` invokes `supabaseClient.rpc(fnName, args)` and casts the result to `Promise<SafeRpcResult<T>>`. `safeRpc` then awaits `attempt()` to produce an initial `result`. It inspects `result.error` for three 401-class signals: an HTTP `status` property equal to `401`, an error `code` of `'PGRST301'`, or a `message` that contains the substring `'jwt expired'` (case-insensitive). If none of those conditions hold, the function skips the recovery block and returns `result` directly. If any condition holds, `safeRpc` logs a warning to the console and awaits `supabaseClient.auth.refreshSession()`. If `refreshSession` itself returns an error, `safeRpc` logs that error, then calls `supabaseClient.auth.signOut()` as a fire-and-forget (`void`), and returns `{ data: null, error: { message: refreshError.message } }` without retrying the RPC. If `refreshSession` succeeds (no error), `safeRpc` awaits `attempt()` a second time, overwrites `result` with the new outcome, and returns that second result unconditionally — there is no second 401 check on the retry, so a persistent auth failure on the retry will be returned as-is to the caller.

---

## Agent 05

### safeRpc

`safeRpc` is an async generic function that accepts two parameters: `fnName` (a string naming the Postgres RPC function to call) and `args` (an optional plain object of named arguments, defaulting to an empty object). It returns a `Promise<SafeRpcResult<T>>`, where `SafeRpcResult<T>` is a type imported from `auth.types.ts`.

At the start of every call, `safeRpc` calls `getSupabaseClient()` — imported from `auth.core.ts` — to obtain the Supabase client singleton. If that call returns a falsy value (client not yet initialized), `safeRpc` returns immediately with `{ data: null, error: { message: 'Supabase not initialized' } }`, writing nothing to module-level or external state.

If the client is present, `safeRpc` defines a local inner async function `attempt` that invokes `supabaseClient.rpc(fnName, args)` and casts the result to `Promise<SafeRpcResult<T>>`. It immediately awaits `attempt()` and stores the result in the local variable `result`. After the first call completes, `safeRpc` evaluates three conditions against `result.error` to determine whether a 401-class auth error occurred: it checks whether the error's `status` property equals `401`, whether `error.code` equals `'PGRST301'`, or whether `error.message` contains the substring `'jwt expired'` (case-insensitive). The `status` property is accessed via a type cast, indicating the type definition for the error object does not declare it directly.

If none of those conditions is true, `safeRpc` skips the recovery block and returns `result` unchanged.

If any condition is true, `safeRpc` emits a `console.warn`, then awaits `supabaseClient.auth.refreshSession()`. If that call produces a `refreshError`, `safeRpc` emits a `console.error`, fires `supabaseClient.auth.signOut()` as a fire-and-forget call (prefixed with `void`, not awaited), and returns `{ data: null, error: { message: refreshError.message } }` immediately — no second RPC attempt is made. If `refreshSession()` succeeds (no `refreshError`), `safeRpc` awaits `attempt()` a second time, storing the new result back into `result`, and then falls through to return that second `result`. There is no try/catch block anywhere in the function; any unhandled rejection from `rpc()` or `refreshSession()` propagates to the caller.
