# Stage 2 Outputs — arena-mod-refs-ai.ts

## Agent 01

### requestAIModRuling

`requestAIModRuling` accepts five parameters: `debate` (a `CurrentDebate` object containing at minimum `messages`, `topic`, and `round` fields), `referenceId` (a string identifying the reference to be ruled on), `url` and `description` (strings describing the reference content), and `supportsSide` (a nullable string indicating which debate side the reference supports). The function returns `Promise<void>` — it produces no return value regardless of path.

Execution enters a `try` block immediately. The local variable `supabaseUrl` is assigned the imported constant `SUPABASE_URL` from `../config.ts`. If `supabaseUrl` is falsy (empty string, undefined, null), an `Error` with the message `'No supabase URL'` is thrown synchronously, transferring control to the `catch` block. If truthy, `edgeUrl` is constructed by stripping any trailing slash from `supabaseUrl` via `.replace(/\/$/, '')` and appending the literal string `'/functions/v1/ai-moderator'`.

The expression `debate.messages || []` is evaluated — if `debate.messages` is falsy, an empty array is used instead. `.slice(-6)` takes at most the last six elements of that array. Each element `m` is mapped to a string of the form `"Side A (R<round>): <text>"` if `m.role === 'user'`, or `"Side B (R<round>): <text>"` otherwise, where `<round>` is `m.round` and `<text>` is `m.text`. These strings are joined with newline characters (`'\n'`). The result is stored in `recentMessages`.

`getUserJwt()` from `./arena-room-ai-response.ts` is awaited and the result assigned to `jwt`. If `jwt` is falsy, an `Error` with the message `'Not authenticated'` is thrown, transferring control to the `catch` block.

A `fetch` POST request is made to `edgeUrl`. The request carries two headers: `'Content-Type': 'application/json'` and `'Authorization': 'Bearer ' + jwt`. The request body is a JSON-serialized object with four fields: `topic` set to `debate.topic`; `reference` set to an object `{ url, description, supports_side: supportsSide }`; `round` set to `debate.round`; and `debateContext` set to `recentMessages` if `recentMessages` is a non-empty string, or `null` if it is an empty string (the `|| null` coercion). The `fetch` call is awaited and the response assigned to `res`.

If `res.ok` is falsy (HTTP status outside 200–299), an `Error` with the message `'Edge Function error: ' + res.status` is thrown, transferring control to the `catch` block. Otherwise, `res.json()` is awaited and cast to `{ ruling?: string; reason?: string }`, assigned to `data`. The variable `ruling` is assigned `data?.ruling` if truthy, otherwise the literal string `'allowed'`. The variable `reason` is assigned `data?.reason` if truthy, otherwise the literal string `'AI ruling.'`.

`ruleOnReference(referenceId, ruling, '🤖 ' + reason)` from `../auth.ts` is awaited and the result assigned to `result`. If `result?.error` is truthy, a console warning is emitted: `'[Arena] AI mod ruling RPC failed:'` followed by `result.error`. This warning does not abort execution.

`icon` is assigned the Unicode character `'\u2705'` (✅) if `ruling === 'allowed'`, otherwise `'\u274C'` (❌). `addSystemMessage` from `./arena-room-live-messages.ts` is called with the string `` `${icon} AI Moderator: Evidence ${ruling.toUpperCase()} — ${reason}` ``. The function then returns `undefined`.

Any thrown error (missing Supabase URL, unauthenticated JWT, non-ok HTTP response, fetch network failure, JSON parse error, or any other synchronous/asynchronous throw within the `try` block) is caught. `err` is logged via `console.warn('[Arena] AI Moderator Edge Function failed:', err)`. Then `ruleOnReference(referenceId, 'denied', '🤖 Auto-denied (AI moderator unavailable)')` is awaited unconditionally — this is the fallback ruling. Finally, `addSystemMessage('\u274C AI Moderator: Evidence AUTO-DENIED (moderator unavailable)')` is called. Note that if `ruleOnReference` itself throws inside the catch block, that error is unhandled and will propagate as a rejected promise.

## Agent 02

### requestAIModRuling

The function accepts five parameters: `debate` (a `CurrentDebate` object), `referenceId` (a string UUID identifying the reference submission to be ruled on), `url` (the URL of the submitted reference), `description` (a text description of the reference), and `supportsSide` (either a string identifying which debate side the reference supports, or `null`). The function returns `Promise<void>` — it has no return value, only side effects.

Inside the `try` block, the function reads `SUPABASE_URL` from `../config.ts` into the local constant `supabaseUrl`. If `supabaseUrl` is falsy, it immediately throws `new Error('No supabase URL')`, which transfers control to the `catch` block. If the value is truthy, it constructs the edge function endpoint by stripping any trailing slash from `supabaseUrl` using `.replace(/\/$/, '')` and appending the literal string `'/functions/v1/ai-moderator'`, storing the result in `edgeUrl`.

The function reads `debate.messages`, defaulting to an empty array `[]` if `debate.messages` is falsy. It takes the last 6 elements via `.slice(-6)` and maps each message object `m` to a formatted string: if `m.role === 'user'` the prefix is `'Side A'`, otherwise `'Side B'`; the full string is `'<prefix> (R<m.round>): <m.text>'`. The resulting array is joined with newline characters `'\n'` and stored in `recentMessages`.

The function calls `await getUserJwt()` and stores the result in `jwt`. If `jwt` is falsy, it throws `new Error('Not authenticated')`, transferring control to the `catch` block.

The function calls the native `fetch` API with `edgeUrl` as the target, using method `'POST'`. The headers object sets `'Content-Type'` to `'application/json'` and `'Authorization'` to the literal string `'Bearer '` concatenated with `jwt`. The request body is `JSON.stringify`'d from an object with four fields: `topic` set to `debate.topic`; `reference` set to an object `{ url, description, supports_side: supportsSide }`; `round` set to `debate.round`; and `debateContext` set to `recentMessages` if `recentMessages` is truthy, otherwise `null`. The function awaits the `Response` object into `res`.

If `res.ok` is falsy, the function throws `new Error('Edge Function error: ' + res.status)`. Otherwise, it calls `await res.json()` and type-asserts the result as `{ ruling?: string; reason?: string }`, storing it in `data`. It then resolves `ruling` as `data?.ruling` if truthy, or falls back to `'allowed'`. It resolves `reason` as `data?.reason` if truthy, or falls back to `'AI ruling.'`.

The function calls `await ruleOnReference(referenceId, ruling, '🤖 ' + reason)`, storing the result in `result`. If `result?.error` is truthy, it calls `console.warn('[Arena] AI mod ruling RPC failed:', result.error)` but does not throw — execution continues.

The function determines `icon`: if `ruling === 'allowed'` the icon is `'\u2705'` (✅), otherwise `'\u274C'` (❌). It then calls `addSystemMessage` with the string `` `${icon} AI Moderator: Evidence ${ruling.toUpperCase()} — ${reason}` ``.

Any thrown error from any phase above routes to the catch block. The caught value is logged via `console.warn('[Arena] AI Moderator Edge Function failed:', err)`. The function then unconditionally calls `await ruleOnReference(referenceId, 'denied', '🤖 Auto-denied (AI moderator unavailable)')` — a fallback denial. Finally, it calls `addSystemMessage('\u274C AI Moderator: Evidence AUTO-DENIED (moderator unavailable)')`. Errors thrown by either of these two fallback calls are not caught, and would propagate as unhandled rejections.

## Agent 03

### requestAIModRuling

`requestAIModRuling` accepts five parameters: `debate` (a `CurrentDebate` object), `referenceId` (a string identifying the reference to be ruled on), `url` (a string URL of the reference), `description` (a string description of the reference), and `supportsSide` (a string or null indicating which debate side the reference supports). The function returns `Promise<void>`.

Execution begins inside a `try` block. The function reads `SUPABASE_URL` from the config module into the local variable `supabaseUrl`. If `supabaseUrl` is falsy, it immediately throws `new Error('No supabase URL')`, which transfers control to the catch block. If truthy, it constructs `edgeUrl` by stripping any trailing slash from `supabaseUrl` via `.replace(/\/$/, '')` and appending the literal string `'/functions/v1/ai-moderator'`.

The function takes `debate.messages`, falling back to an empty array `[]` if `debate.messages` is nullish. It calls `.slice(-6)` on that array to take at most the last six messages, then maps each message `m` to a formatted string: if `m.role === 'user'` the prefix is `'Side A'`, otherwise `'Side B'`, followed by ` (R${m.round}): ${m.text}`. The resulting strings are joined with `'\n'` into the variable `recentMessages`.

The function `await`s `getUserJwt()`. If the resolved value is falsy, it immediately throws `new Error('Not authenticated')`, transferring control to the catch block.

A `POST` fetch request is sent to `edgeUrl` with headers `'Content-Type': 'application/json'` and `'Authorization': 'Bearer ' + jwt`. The JSON body contains four fields: `topic` set to `debate.topic`; `reference` as an object with keys `url`, `description`, and `supports_side` set to `supportsSide`; `round` set to `debate.round`; and `debateContext` set to `recentMessages` if `recentMessages` is truthy, otherwise `null`. The function awaits this fetch call into `res`.

If `res.ok` is false, the function throws `new Error('Edge Function error: ' + res.status)`, transferring to the catch block. Otherwise, `res.json()` is awaited and the result is cast to `{ ruling?: string; reason?: string }` into `data`.

`ruling` is set to `data?.ruling` if truthy, otherwise the literal string `'allowed'`. `reason` is set to `data?.reason` if truthy, otherwise the literal string `'AI ruling.'`. The function then `await`s `ruleOnReference(referenceId, ruling, '🤖 ' + reason)`. If the returned `result` has a truthy `result?.error`, `console.warn('[Arena] AI mod ruling RPC failed:', result.error)` is called, but execution continues without throwing.

`icon` is set to `'\u2705'` (✅) if `ruling === 'allowed'`, otherwise `'\u274C'` (❌). `addSystemMessage` is called with the string `` `${icon} AI Moderator: Evidence ${ruling.toUpperCase()} — ${reason}` ``. The `try` block ends and the function resolves `void`.

If any `throw` or rejected `await` in the `try` block transfers control to catch, the caught value is logged with `console.warn('[Arena] AI Moderator Edge Function failed:', err)`. The function then unconditionally `await`s `ruleOnReference(referenceId, 'denied', '🤖 Auto-denied (AI moderator unavailable)')` — the result of this fallback RPC call is not inspected. Then `addSystemMessage` is called with `'\u274C AI Moderator: Evidence AUTO-DENIED (moderator unavailable)'`. If the fallback `ruleOnReference` call itself throws, that error is not caught and the returned promise rejects.

## Agent 04

### requestAIModRuling

`requestAIModRuling` accepts five parameters: `debate` (a `CurrentDebate` object containing at minimum `messages`, `topic`, and `round` fields), `referenceId` (a string identifying the reference to be ruled on), `url` (the reference URL string), `description` (a string describing the reference), and `supportsSide` (either a string or `null` indicating which debate side the reference supports). The function returns `Promise<void>`.

Execution begins inside a `try` block. The function reads `SUPABASE_URL` from the config import into a local variable `supabaseUrl`. If `supabaseUrl` is falsy, it immediately throws `new Error('No supabase URL')`, which transfers control to the `catch` block. If `supabaseUrl` is truthy, the function constructs `edgeUrl` by stripping any trailing slash from `supabaseUrl` using `.replace(/\/$/, '')` and appending the literal string `'/functions/v1/ai-moderator'`.

The function builds `recentMessages` by taking `debate.messages` (falling back to an empty array `[]` if `debate.messages` is falsy), calling `.slice(-6)` to get at most the last six messages, and `.map()`-ing each message `m` to the template string `` `${m.role === 'user' ? 'Side A' : 'Side B'} (R${m.round}): ${m.text}` ``. If `m.role` is the literal string `'user'`, the prefix is `'Side A'`; for any other role value, the prefix is `'Side B'`. The resulting array of strings is joined with `'\n'`. The function then `await`s `getUserJwt()`. If the resolved value `jwt` is falsy, it throws `new Error('Not authenticated')`, transferring control to the `catch` block.

If `jwt` is truthy, the function `await`s a `fetch` call to `edgeUrl` using method `'POST'`, headers `{ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt }`, and a JSON-serialized body containing `topic` (from `debate.topic`), `reference` (an object with fields `url`, `description`, and `supports_side` set to `supportsSide`), `round` (from `debate.round`), and `debateContext` (set to `recentMessages` if it is a non-empty string, otherwise `null`). If the HTTP response's `ok` property is falsy, the function throws `new Error('Edge Function error: ' + res.status)`, transferring control to the `catch` block.

If the response is `ok`, the function `await`s `res.json()` and casts the result as `{ ruling?: string; reason?: string }` into `data`. It then evaluates `ruling` as `data?.ruling` if truthy, otherwise the literal string `'allowed'`. It evaluates `reason` as `data?.reason` if truthy, otherwise the literal string `'AI ruling.'`. The function then `await`s `ruleOnReference(referenceId, ruling, '🤖 ' + reason)`. If the resolved `result` has a truthy `error` property, the function logs a warning to the console via `console.warn('[Arena] AI mod ruling RPC failed:', result.error)` but does not throw.

The function constructs `icon` as `'\u2705'` (✅) if `ruling` is the exact string `'allowed'`, or `'\u274C'` (❌) for any other value. It then calls `addSystemMessage` with `` `${icon} AI Moderator: Evidence ${ruling.toUpperCase()} — ${reason}` ``. This is the final statement of the `try` block; the function returns `undefined`.

If any `throw` or rejected `await` in the `try` block transfers control to catch, the caught error `err` is logged with `console.warn('[Arena] AI Moderator Edge Function failed:', err)`. The function then unconditionally `await`s `ruleOnReference(referenceId, 'denied', '🤖 Auto-denied (AI moderator unavailable)')`, applying a hard-denied ruling. No check is made on the result of this fallback RPC call. Finally, `addSystemMessage` is called with `'\u274C AI Moderator: Evidence AUTO-DENIED (moderator unavailable)'`.

## Agent 05

### requestAIModRuling

`requestAIModRuling` accepts five parameters: `debate` (a `CurrentDebate` object containing at minimum a `messages` array, a `topic` string, and a `round` value), `referenceId` (a string identifying the reference to be ruled on), `url` (the URL of the submitted reference), `description` (a text description of the reference), and `supportsSide` (a nullable string indicating which debate side the reference supports). It returns `Promise<void>`.

Execution begins inside a `try` block. The function reads `SUPABASE_URL` from the config module into the local variable `supabaseUrl`. If `supabaseUrl` is falsy, it immediately throws `new Error('No supabase URL')`, which exits the `try` block and falls through to the `catch`. Otherwise, it constructs `edgeUrl` by stripping any trailing slash from `supabaseUrl` using the regex `/\/$/` and appending the literal string `'/functions/v1/ai-moderator'`.

The function takes `debate.messages`, defaulting to an empty array `[]` if `debate.messages` is nullish, then calls `.slice(-6)` to take at most the last six messages. Each message object `m` is mapped to a formatted string: if `m.role === 'user'` the prefix is `'Side A'`, otherwise `'Side B'`; the full string is `` `${prefix} (R${m.round}): ${m.text}` ``. The resulting array is joined with `'\n'` and stored in `recentMessages`.

The function `await`s `getUserJwt()`, storing the result in `jwt`. If `jwt` is falsy, it throws `new Error('Not authenticated')`.

The function calls `fetch(edgeUrl, ...)` with method `'POST'`, headers `{ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt }`, and a JSON body containing: `topic` set to `debate.topic`; `reference` as an object with `url`, `description`, and `supports_side` set to `supportsSide`; `round` set to `debate.round`; and `debateContext` set to `recentMessages` if it is a non-empty string, or `null` if `recentMessages` is an empty string (the `|| null` coercion). If `res.ok` is false, it throws `` new Error('Edge Function error: ' + res.status) ``.

The response body is parsed with `res.json()`, cast to `{ ruling?: string; reason?: string }`, and stored in `data`. The variable `ruling` is set to `data?.ruling` if truthy, otherwise the literal string `'allowed'`. The variable `reason` is set to `data?.reason` if truthy, otherwise the literal string `'AI ruling.'`. The function then `await`s `ruleOnReference(referenceId, ruling, '🤖 ' + reason)`, storing the result in `result`. If `result?.error` is truthy, a console warning is emitted: `'[Arena] AI mod ruling RPC failed:'` followed by `result.error`. Execution continues regardless of this warning — it is non-throwing.

The function determines `icon`: if `ruling === 'allowed'` the icon is `'\u2705'` (✅), otherwise `'\u274C'` (❌). It calls `addSystemMessage` with the string `` `${icon} AI Moderator: Evidence ${ruling.toUpperCase()} — ${reason}` ``. The `try` block ends and the function returns `undefined`.

If any `throw` in the `try` block is reached — missing Supabase URL, missing JWT, non-OK HTTP response, a network error from `fetch`, or a JSON parse error — control jumps to catch. The caught error `err` is logged via `console.warn('[Arena] AI Moderator Edge Function failed:', err)`. The function then unconditionally `await`s `ruleOnReference(referenceId, 'denied', '🤖 Auto-denied (AI moderator unavailable)')`, providing a hard-coded fallback denial ruling. Finally, it calls `addSystemMessage('\u274C AI Moderator: Evidence AUTO-DENIED (moderator unavailable)')`. Note that if `ruleOnReference` itself throws inside the catch block, that error is unhandled and will propagate as an uncaught rejection.
