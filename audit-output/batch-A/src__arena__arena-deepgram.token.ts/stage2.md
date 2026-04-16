# Stage 2 Outputs — arena-deepgram.token.ts

## Agent 01

### fetchDeepgramToken

`fetchDeepgramToken` is async and takes no parameters. It has no module-level state of its own; it reads two external dependencies imported at the module level: `getSupabaseClient` from `../auth.ts` and `SUPABASE_URL` from `../config.ts`. The entire body is wrapped in a single `try/catch` block that catches any thrown value, logs it with `console.warn('[Deepgram] Token fetch error:', err)`, and returns `null`.

Inside the `try` block, the function first calls `getSupabaseClient()` synchronously and assigns the result to `supabase`. If that returns a falsy value, the function returns `null` immediately. It then calls `supabase.auth.getSession()` and awaits the result, destructuring `data` from it. It reads `data?.session?.access_token` into `jwt`. If `jwt` is falsy — meaning there is no active authenticated session — the function returns `null` immediately. If a jwt is present, the function calls the browser's native `fetch` API, sending a POST request to `${SUPABASE_URL}/functions/v1/deepgram-token` with two headers: `Content-Type: application/json` and `Authorization: Bearer <jwt>`. That `fetch` call is awaited and the response assigned to `res`. If `res.ok` is false (any non-2xx HTTP status), the function logs `console.warn('[Deepgram] Token fetch failed: ${res.status}')` and returns `null`. Otherwise it awaits `res.json()` to parse the response body. If the parsed `body` object does not have a truthy `token` field, the function logs `console.warn('[Deepgram] Token response missing token field')` and returns `null`. If all checks pass, the function returns `body.token` cast as `string`. The function writes no module-level or external state; its only output is its return value, which is either a `string` token or `null` on every failure path.

## Agent 02

### fetchDeepgramToken

`fetchDeepgramToken` is an async function that takes no parameters and returns a `Promise<string | null>`. Its entire body is enclosed in a `try/catch` block; any thrown exception is caught, logged with `console.warn('[Deepgram] Token fetch error:', err)`, and the function returns `null`.

Inside the `try` block, the function first calls `getSupabaseClient()` (imported from `../auth.ts`) to retrieve the initialized Supabase client instance. If that call returns a falsy value, the function returns `null` immediately without making any network requests. Next, it awaits `supabase.auth.getSession()` and reads `data?.session?.access_token` into `jwt`. If `jwt` is falsy — meaning there is no active authenticated session — the function returns `null`. With a valid JWT in hand, the function awaits a `fetch` call that sends an HTTP POST to `${SUPABASE_URL}/functions/v1/deepgram-token`, where `SUPABASE_URL` is a module-level constant imported from `../config.ts`. The request carries two headers: `Content-Type: application/json` and `Authorization: Bearer <jwt>`. No request body is sent. If the response's `ok` property is `false`, the function logs `console.warn('[Deepgram] Token fetch failed: <status>')` and returns `null`. If the response is successful, the function awaits `res.json()` to parse the body. If the parsed body lacks a `token` field, the function logs `console.warn('[Deepgram] Token response missing token field')` and returns `null`. Otherwise it returns `body.token` cast as a `string`. The function writes no module-level state and has no side effects beyond the two network calls and the conditional `console.warn` emissions.

## Agent 03

### fetchDeepgramToken

`fetchDeepgramToken` is async and accepts no parameters. It reads no module-level state; its two external dependencies are the imported `getSupabaseClient` function from `../auth.ts` and the `SUPABASE_URL` constant from `../config.ts`.

The entire body is wrapped in a `try/catch`. Execution begins by calling `getSupabaseClient()`, which returns a Supabase client instance or a falsy value. If the return value is falsy, the function returns `null` immediately. Otherwise it awaits `supabase.auth.getSession()`, destructuring `data` from the result, then reads `data?.session?.access_token` into the local variable `jwt`. If `jwt` is absent or falsy, the function returns `null` immediately.

With a valid `jwt` in hand, the function awaits a `fetch` call to `${SUPABASE_URL}/functions/v1/deepgram-token` using the `POST` method. The request carries two headers: `Content-Type: application/json` and `Authorization: Bearer <jwt>`. No request body is sent. If the response's `ok` property is false, `console.warn` is called with the HTTP status code and the function returns `null`. If the response is `ok`, the function awaits `res.json()` to parse the response body. If `body.token` is absent or falsy, `console.warn` is called and the function returns `null`. If `body.token` is present, it is cast to `string` and returned. If any awaited call throws — including the `fetch` itself, the session retrieval, or the JSON parse — the `catch` block calls `console.warn` with the error and returns `null`. The function therefore always resolves to either a `string` (the token) or `null`; it never rejects.

## Agent 04

### fetchDeepgramToken

`fetchDeepgramToken` is an async function that accepts no parameters and returns a `Promise<string | null>`. The entire body executes inside a `try/catch` block, so any thrown exception routes to the `catch` path rather than propagating to the caller.

The function first calls `getSupabaseClient()`, which is imported from `../auth.ts`, and assigns the result to `supabase`. If `getSupabaseClient()` returns a falsy value — indicating the client has not been initialized — the function returns `null` immediately without making any network request. Otherwise it calls `supabase.auth.getSession()` and awaits the result, reading the `access_token` from the nested `data.session` object into `jwt`. If `jwt` is falsy (no active session), the function returns `null`.

With a valid JWT in hand, the function calls the browser `fetch` API with a `POST` request to the URL `${SUPABASE_URL}/functions/v1/deepgram-token`, constructed from the module-level `SUPABASE_URL` constant imported from `../config.ts`. The request carries a `Content-Type: application/json` header and an `Authorization: Bearer <jwt>` header. The function awaits this `fetch` call. If the response's `ok` property is false, it emits a `console.warn` with the HTTP status code and returns `null`. On a successful HTTP response, the function awaits `res.json()` to parse the body. If the parsed body does not contain a `token` field, it emits a `console.warn` and returns `null`. If the field is present, the function returns `body.token` cast to `string`. In the `catch` block, any exception — including network failures or JSON parse errors — causes a `console.warn` with the error and the function returns `null`.

## Agent 05

### fetchDeepgramToken

`fetchDeepgramToken` is async and takes no parameters. It reads no module-level state. Its entire body is wrapped in a `try/catch` block that catches any thrown error, emits a `console.warn` with the error value, and returns `null`.

Inside the `try` block, the function first calls `getSupabaseClient()` from `../auth.ts` and assigns the result to `supabase`. If that call returns a falsy value — indicating the Supabase client has not been initialized — the function returns `null` immediately with no further action. If the client exists, the function calls `supabase.auth.getSession()` and awaits the result, then reads `data?.session?.access_token` into `jwt`. If `jwt` is falsy — meaning no authenticated session is present — the function returns `null` immediately.

With a valid `jwt` in hand, the function calls the browser `fetch` API with a `POST` request to the URL formed by concatenating `SUPABASE_URL` (imported from `../config.ts`) with the literal path `/functions/v1/deepgram-token`. The request carries a `Content-Type: application/json` header and an `Authorization: Bearer <jwt>` header using the session token. This `fetch` call is awaited and the response is assigned to `res`. If `res.ok` is false — indicating any non-2xx HTTP status — the function emits a `console.warn` with the status code and returns `null`. If the response is OK, the function awaits `res.json()` and assigns the parsed body to `body`. If `body.token` is absent or falsy, the function emits a `console.warn` noting the missing field and returns `null`. If `body.token` is present, the function returns it cast as `string`. No module-level state is written at any point; the function's only output is its return value.
