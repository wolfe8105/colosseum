# Stage 2 Outputs — auth.ops.ts

## Agent 01

### signUp

Reads: destructured params `email`, `password`, `username`, `displayName`, `dob` from `SignUpParams`; calls `getIsPlaceholderMode()`; reads `APP.baseUrl`; calls `getSupabaseClient()` (non-null asserted with `!`). Writes: no module-level state; no DOM mutations. Side effect: Supabase signUp network call, sends confirmation email. Control flow: (1) guard `if (getIsPlaceholderMode())` → early return `{ success: true, placeholder: true }`; (2) guard `if (!email || !password)` → early return `{ success: false, error: 'Email and password are required. Please start over.' }`; (3) try: constructs `redirectTo = APP.baseUrl + '/moderator-login.html'`, awaits `getSupabaseClient()!.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo, data: { username, display_name: displayName, date_of_birth: dob } } })`, destructures `{ data, error }`, if `error` throws, else returns `{ success: true, user: data.user ?? undefined, session: data.session }` (`data.user` null-coalesced to `undefined`); (4) catch: returns `{ success: false, error: (e as Error).message }`. Async: yes. Returns: `Promise<AuthResult>`.

### logIn

Reads: params `email`, `password`; `getIsPlaceholderMode()`; `getSupabaseClient()` (non-null asserted). Writes: none. Side effect: Supabase signInWithPassword network call. Control flow: (1) placeholder guard → early return `{ success: true, placeholder: true }`; (2) try: awaits `getSupabaseClient()!.auth.signInWithPassword({ email, password })`, destructures `{ data, error }`, if `error` throws, else returns `{ success: true, user: data.user, session: data.session }` — `data.user` is NOT null-coalesced (unlike `signUp`); (3) catch: returns `{ success: false, error: (e as Error).message }`. Async: yes. Returns: `Promise<AuthResult>`.

### oauthLogin

Reads: params `provider` (`'google' | 'apple' | string`), `redirectTo?` (optional string); `getIsPlaceholderMode()`; `getSupabaseClient()` (non-null asserted); `window.location.href` (only if `redirectTo` is null/undefined via `??`). Writes: none. Side effect: Supabase signInWithOAuth network call; returns URL for caller to navigate to — does NOT navigate. Control flow: (1) placeholder guard → early return `{ success: true, placeholder: true }`; (2) try: awaits `getSupabaseClient()!.auth.signInWithOAuth({ provider: provider as 'google', options: { redirectTo: redirectTo ?? window.location.href } })` — `provider as 'google'` is a TS-only type cast, runtime value is the raw `provider` string; `??` reads `window.location.href` only if `redirectTo` is undefined/null; destructures `{ data, error }`, if `error` throws, else returns `{ success: true, url: data.url }`; (3) catch: returns `{ success: false, error: (e as Error).message }`. Async: yes. Returns: `Promise<AuthResult>`.

### logOut

Reads: `getIsPlaceholderMode()`; `(window as { ColosseumNotifications?: { destroy?: () => void } }).ColosseumNotifications` via type cast; `getSupabaseClient()` (non-null asserted). Writes: calls `_clearAuthState()` (mutates auth.core module-level state); calls `_notify(null, null)` (fires all auth listeners). Side effects: `notif?.destroy?.()`, Supabase signOut, console.warn on timeout, console.error on error. Control flow: (1) placeholder guard → early return `{ success: true }` (no `placeholder: true` field, unlike all other functions); (2) `const notif = (window as ...).ColosseumNotifications`; (3) `notif?.destroy?.()` — double optional chain; (4) try: `await Promise.race([getSupabaseClient()!.auth.signOut(), new Promise<void>(resolve => setTimeout(() => { console.warn('ModeratorAuth: signOut timed out after 3s — forcing local cleanup'); resolve(); }, 3000))])` — 3s timeout resolves (never rejects); race result discarded; (5) catch: `console.error('ModeratorAuth: signOut error (continuing anyway)', e)`, falls through; (6) unconditional: `_clearAuthState()`, `_notify(null, null)`, `return { success: true }`. Async: yes. Returns: `Promise<AuthResult>` — always `{ success: true }`, errors swallowed.

### resetPassword

Reads: param `email: string`; `getIsPlaceholderMode()`; `getSupabaseClient()` (non-null asserted); `window.location.origin` (in template literal). Writes: none. Side effect: Supabase resetPasswordForEmail network call, sends reset email. Control flow: (1) placeholder guard → early return `{ success: true, placeholder: true }`; (2) try: awaits `getSupabaseClient()!.auth.resetPasswordForEmail(email, { redirectTo: \`${window.location.origin}/moderator-login.html?reset=true\` })`, destructures `{ error }` only, if `error` throws, else returns `{ success: true }`; (3) catch: returns `{ success: false, error: (e as Error).message }`. Note: uses `window.location.origin` (dynamic) not `APP.baseUrl` (static) — different base URL strategy from `signUp`. Async: yes. Returns: `Promise<AuthResult>`.

### updatePassword

Reads: param `newPassword: string`; `getIsPlaceholderMode()`; `getSupabaseClient()` (non-null asserted). Writes: none. Side effect: Supabase updateUser network call, updates authenticated user's password server-side. Control flow: (1) placeholder guard → early return `{ success: true, placeholder: true }`; (2) try: awaits `getSupabaseClient()!.auth.updateUser({ password: newPassword })`, destructures `{ error }` only, if `error` throws, else returns `{ success: true }`; (3) catch: returns `{ success: false, error: (e as Error).message }`. Requires active Supabase session. Async: yes. Returns: `Promise<AuthResult>`.

## Agent 02

### signUp

Reads: destructured params `email`, `password`, `username`, `displayName`, `dob`; `getIsPlaceholderMode()`; `APP.baseUrl`; `getSupabaseClient()` (non-null asserted). Writes: none. Side effect: Supabase signUp. Control flow: placeholder guard early return; missing-credentials guard (`!email || !password`) early return; try: await signUp with email, password, options including emailRedirectTo and data mapping (displayName→display_name, dob→date_of_birth), throw on error, return success with `data.user ?? undefined`; catch returns error. Async: yes. Returns: `Promise<AuthResult>`.

### logIn

Reads: params `email`, `password`; `getIsPlaceholderMode()`; `getSupabaseClient()`. Writes: none. Control flow: placeholder guard; try: await signInWithPassword, throw on error, return `{ success: true, user: data.user, session: data.session }` — `data.user` not null-coalesced; catch returns error. Async: yes.

### oauthLogin

Reads: params `provider`, `redirectTo?`; `getIsPlaceholderMode()`; `getSupabaseClient()`; `window.location.href` (fallback). Writes: none. Side effect: Supabase OAuth initiation. Control flow: placeholder guard; try: await signInWithOAuth with provider cast and `redirectTo ?? window.location.href`, throw on error, return `{ success: true, url: data.url }`; catch returns error. No navigation performed. Async: yes.

### logOut

Reads: `getIsPlaceholderMode()`; `window.ColosseumNotifications` via cast; `getSupabaseClient()`. Writes: `_clearAuthState()`, `_notify(null, null)`. Control flow: placeholder guard returns `{ success: true }` (no `placeholder` field); `notif?.destroy?.()` double optional chain; try: await `Promise.race([signOut(), 3s timeout])`, timeout resolves with console.warn; catch: console.error, falls through; unconditional: clearAuthState, notify, return `{ success: true }`. Async: yes.

### resetPassword

Reads: param `email`; `getIsPlaceholderMode()`; `getSupabaseClient()`; `window.location.origin`. Writes: none. Side effect: Supabase resetPasswordForEmail. Control flow: placeholder guard; try: await resetPasswordForEmail with `window.location.origin`-based redirectTo, throw on error, return `{ success: true }`; catch returns error. Async: yes.

### updatePassword

Reads: param `newPassword`; `getIsPlaceholderMode()`; `getSupabaseClient()`. Writes: none. Side effect: Supabase updateUser. Control flow: placeholder guard; try: await updateUser with `{ password: newPassword }`, throw on error, return `{ success: true }`; catch returns error. Async: yes.

## Agent 03

### signUp

Async. Reads params `{ email, password, username, displayName, dob }` from `SignUpParams`. Reads `getIsPlaceholderMode()`, `APP.baseUrl`, `getSupabaseClient()` (non-null asserted). No module-level state mutations, no DOM writes. Calls: (1) `getIsPlaceholderMode()` — if truthy, early return `{ success: true, placeholder: true }`; (2) evaluates `!email || !password` — if truthy, early return `{ success: false, error: 'Email and password are required. Please start over.' }`; (3) constructs `redirectTo`; (4) awaits `getSupabaseClient()!.auth.signUp(...)`, destructures `{ data, error }`, throws if error, returns `{ success: true, user: data.user ?? undefined, session: data.session }`. Catch: returns `{ success: false, error: (e as Error).message }`. Returns `Promise<AuthResult>`.

### logIn

Async. Reads params `{ email, password }`. Reads `getIsPlaceholderMode()`, `getSupabaseClient()`. No writes. Calls: (1) placeholder guard; (2) awaits `signInWithPassword({ email, password })`, throws if error, returns `{ success: true, user: data.user, session: data.session }`. Catch returns error. Returns `Promise<AuthResult>`.

### oauthLogin

Async. Reads params `provider`, `redirectTo?`. Reads `getIsPlaceholderMode()`, `getSupabaseClient()`, `window.location.href`. No writes. Calls: (1) placeholder guard; (2) awaits `signInWithOAuth({ provider: provider as 'google', options: { redirectTo: redirectTo ?? window.location.href } })`, throws if error, returns `{ success: true, url: data.url }`. Catch returns error. Returns `Promise<AuthResult>`.

### logOut

Async. Reads `getIsPlaceholderMode()`, `window.ColosseumNotifications`, `getSupabaseClient()`. Writes: `_clearAuthState()`, `_notify(null, null)`. Calls: (1) placeholder guard → `{ success: true }` (no `placeholder` field); (2) `notif?.destroy?.()` with double optional chain; (3) try: `await Promise.race([signOut(), new Promise<void>(resolve => setTimeout(() => { console.warn(...); resolve(); }, 3000))])`; catch: console.error, fall-through; unconditional: `_clearAuthState()`, `_notify(null, null)`, return `{ success: true }`. Returns `Promise<AuthResult>` — always succeeds.

### resetPassword

Async. Reads param `email`, `getIsPlaceholderMode()`, `getSupabaseClient()`, `window.location.origin`. No writes. Calls: (1) placeholder guard; (2) awaits `resetPasswordForEmail(email, { redirectTo: \`${window.location.origin}/moderator-login.html?reset=true\` })`, destructures `{ error }`, throws if error, returns `{ success: true }`. Catch returns error. Returns `Promise<AuthResult>`.

### updatePassword

Async. Reads param `newPassword`, `getIsPlaceholderMode()`, `getSupabaseClient()`. No writes. Calls: (1) placeholder guard; (2) awaits `updateUser({ password: newPassword })`, destructures `{ error }`, throws if error, returns `{ success: true }`. Catch returns error. Returns `Promise<AuthResult>`.

## Agent 04

### signUp

Async function. Reads: destructured `{ email, password, username, displayName, dob }` from `SignUpParams`; `getIsPlaceholderMode()`; `APP.baseUrl`; `getSupabaseClient()` (non-null asserted). Writes: none. Side effects: Supabase signUp network call. Control flow: guard on `getIsPlaceholderMode()` → `{ success: true, placeholder: true }`; guard on `!email || !password` → `{ success: false, error: ... }`; try: await signUp, throw on error, return `{ success: true, user: data.user ?? undefined, session: data.session }`; catch: return `{ success: false, error: (e as Error).message }`. Returns `Promise<AuthResult>`.

### logIn

Async. Reads: `{ email, password }`, `getIsPlaceholderMode()`, `getSupabaseClient()`. No writes. Guard on placeholder. Try: await signInWithPassword, throw on error, return `{ success: true, user: data.user, session: data.session }` — `data.user` not null-coalesced. Catch. Returns `Promise<AuthResult>`.

### oauthLogin

Async. Reads: `provider`, `redirectTo?`, `getIsPlaceholderMode()`, `getSupabaseClient()`, `window.location.href`. Guard on placeholder. Try: await signInWithOAuth with `provider as 'google'` (TS cast only) and `redirectTo ?? window.location.href`, return `{ success: true, url: data.url }`. Catch. Returns `Promise<AuthResult>`.

### logOut

Async. Reads: `getIsPlaceholderMode()`, `window.ColosseumNotifications`, `getSupabaseClient()`. Writes: `_clearAuthState()`, `_notify(null, null)`. Placeholder guard returns `{ success: true }` without `placeholder` field. Double-optional-chain `notif?.destroy?.()`. Try: Promise.race of signOut vs 3s-timeout-that-resolves. Catch: console.error, fall through. Unconditional post-try: `_clearAuthState()`, `_notify(null, null)`, return `{ success: true }`. Returns `Promise<AuthResult>` — always `{ success: true }`.

### resetPassword

Async. Reads: `email`, `getIsPlaceholderMode()`, `getSupabaseClient()`, `window.location.origin`. Guard on placeholder. Try: await resetPasswordForEmail with origin-based redirectTo, destructure `{ error }` only, throw on error, return `{ success: true }`. Catch. Returns `Promise<AuthResult>`.

### updatePassword

Async. Reads: `newPassword`, `getIsPlaceholderMode()`, `getSupabaseClient()`. Guard on placeholder. Try: await updateUser with `{ password: newPassword }`, destructure `{ error }` only, throw on error, return `{ success: true }`. Catch. Returns `Promise<AuthResult>`.

## Agent 05

### signUp

Async function. Returns `Promise<AuthResult>`. Reads params `{ email, password, username, displayName, dob }` from `SignUpParams`. At line 10: calls `getIsPlaceholderMode()` — if truthy, returns `{ success: true, placeholder: true }`. At lines 12-14: checks `!email || !password` — if truthy, returns `{ success: false, error: 'Email and password are required. Please start over.' }`. At line 17: constructs `redirectTo = APP.baseUrl + '/moderator-login.html'`. At lines 19-26: awaits `getSupabaseClient()!.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo, data: { username, display_name: displayName, date_of_birth: dob } } })`. At line 27: if `error` throws. At line 28: returns `{ success: true, user: data.user ?? undefined, session: data.session }`. Catch line 30: returns `{ success: false, error: (e as Error).message }`.

### logIn

Async. Returns `Promise<AuthResult>`. At line 35: placeholder guard. Try: awaits `getSupabaseClient()!.auth.signInWithPassword({ email, password })`; if error throws; returns `{ success: true, user: data.user, session: data.session }` (no `?? undefined` on user). Catch returns error.

### oauthLogin

Async. Returns `Promise<AuthResult>`. At line 47: placeholder guard. Try: awaits `getSupabaseClient()!.auth.signInWithOAuth({ provider: provider as 'google', options: { redirectTo: redirectTo ?? window.location.href } })`; `provider as 'google'` is TS-only; `redirectTo ?? window.location.href` reads window.location.href if redirectTo is null/undefined; if error throws; returns `{ success: true, url: data.url }`. Catch returns error.

### logOut

Async. Returns `Promise<AuthResult>`. At line 62: placeholder guard returns `{ success: true }` (no `placeholder: true`). Lines 64-65: reads `window.ColosseumNotifications` via cast, calls `notif?.destroy?.()` double optional chain. Try block line 68: `await Promise.race([getSupabaseClient()!.auth.signOut(), new Promise<void>(resolve => setTimeout(() => { console.warn('ModeratorAuth: signOut timed out after 3s — forcing local cleanup'); resolve(); }, 3000))])` — 3s timeout resolves, never rejects. Catch line 75: console.error, no rethrow. Lines 79-81: unconditional `_clearAuthState()`, `_notify(null, null)`, return `{ success: true }`.

### resetPassword

Async. Returns `Promise<AuthResult>`. Placeholder guard. Try: awaits `getSupabaseClient()!.auth.resetPasswordForEmail(email, { redirectTo: \`${window.location.origin}/moderator-login.html?reset=true\` })`; destructures `{ error }` only; if error throws; returns `{ success: true }`. Catch returns error.

### updatePassword

Async. Returns `Promise<AuthResult>`. Placeholder guard. Try: awaits `getSupabaseClient()!.auth.updateUser({ password: newPassword })`; destructures `{ error }` only; if error throws; returns `{ success: true }`. Catch returns error.

## Cross-cutting observations (all 5 agents agree)

1. **Dead imports:** `getCurrentUser` and `getCurrentProfile` are imported at line 5 but never referenced in this file.
2. **`logOut` placeholder inconsistency:** Returns `{ success: true }` without `placeholder: true` — all other functions include `placeholder: true` in their guard return.
3. **Non-null assertion `getSupabaseClient()!`** — used at every call site. If client is not initialized, throws TypeError (caught by try/catch in all functions).
4. **`signUp` vs `logIn` user nullability:** `signUp` uses `data.user ?? undefined`; `logIn` returns `data.user` directly (may be `null`).
5. **`resetPassword` uses `window.location.origin`**; `signUp` uses `APP.baseUrl` — inconsistent base URL strategy across functions.
6. **`logOut` always returns `{ success: true }`** — errors are swallowed with console.error.
7. **3s timeout in `logOut`**: The `setTimeout` continues running even if `signOut()` wins the race; `console.warn` fires after 3 seconds regardless.
