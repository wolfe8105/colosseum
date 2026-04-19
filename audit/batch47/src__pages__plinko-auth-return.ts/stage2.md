# Stage 2 Outputs — plinko-auth-return.ts

## Agent 01

### restoreStep5UI (line 17)
Synchronous void function, no parameters, not exported.

Queries DOM: `document.querySelector('#step-5 .step-title')`, `document.querySelector('#btn-enter')`, `document.querySelector('#btn-resend-email')`. All three stored in local consts; each is individually null-guarded before mutation.

Mutations: title.textContent = "YOU'RE IN"; enterBtn.style.display = '' (unhides); resendBtn.style.display = 'none' (hides). No return value. No error handling. No async. No branches beyond null checks.

---

### attachAuthReturnHandler (line 31)
Exported async-capable function, no parameters, void return.

Setup: calls `getSupabaseClient()` cast to typed object. Line 10 assigns `const isPlaceholder = isAnyPlaceholder` — binds the function reference, not its return value. Guard at line 34: `if (!isPlaceholder && supabaseClient)`. Since `isPlaceholder` holds a function reference (truthy), `!isPlaceholder` is always `false`; this guard may always fail, meaning the `onAuthStateChange` subscription block never executes.

If the guard passes: calls `supabaseClient.auth.onAuthStateChange((event, session) => { ... })`. Inside callback: if `event === 'SIGNED_IN'` and `session?.user`:
- Branch A (email): if `window.location.hash` contains `'type=signup'` or `'type=email'` → writes welcome text to `#step-5 .step-title`, calls `restoreStep5UI()`, calls `window.history.replaceState(null, '', window.location.pathname)` to clear hash, calls `goToStep(5)`, returns.
- Branch B (OAuth): calls `set_signupMethod('oauth')`, calls `goToStep(2)`.

Independently (synchronous, outside the guard): reads `window.location.hash`. If hash contains `'access_token'`: parses as URLSearchParams, reads `type` param. If `type === 'signup'` or `type === 'email'`: calls `getCurrentUser()`, if result truthy (`hasRealSession`) → writes welcome text, calls `restoreStep5UI()`, calls `goToStep(5)`. Hash cleared via `window.history.replaceState()` unconditionally when `access_token` is present (outside the `hasRealSession` branch — cleared even if no session).

---

## Agent 02

### restoreStep5UI (line 17)
No-arg void function. Three querySelector calls. Null checks guard all writes. title.textContent set to "YOU'RE IN"; enter button display cleared; resend button hidden. Fully synchronous.

---

### attachAuthReturnHandler (line 31)
Exported function. Reads supabaseClient via getSupabaseClient(). `isPlaceholder` is bound to `isAnyPlaceholder` function object — not invoked. Guard `!isPlaceholder` evaluates to false always (function is truthy). onAuthStateChange block gated behind this guard; if guard always fails, subscription never registers.

Synchronous hash-check block runs unconditionally. Looks for `access_token` in `window.location.hash`. If found: parses URLSearchParams from hash. If type is signup or email: awaits getCurrentUser(); if user exists, writes welcome text, calls restoreStep5UI(), calls goToStep(5). Hash is cleared via replaceState regardless of whether hasRealSession is true.

LANDMINE comment (lines 26–30) warns of race between OAuth redirect restoring hash and SIGNED_IN firing — this module handles both paths to cover the race.

---

## Agent 03

### restoreStep5UI (line 17)
Pure DOM manipulation. querySelector for three elements. Null-guarded writes. textContent = "YOU'RE IN"; display = '' (enter btn); display = 'none' (resend btn). Synchronous, no return.

---

### attachAuthReturnHandler (line 31)
Guard: `!isPlaceholder` where `isPlaceholder = isAnyPlaceholder` (function ref). If isAnyPlaceholder is a function, `isPlaceholder` is truthy, guard always false → onAuthStateChange never registered.

Synchronous block: if hash has access_token, parse URLSearchParams. If type is signup or email and getCurrentUser() returns user: restoreStep5UI(), goToStep(5), welcome text written. replaceState clears hash whenever access_token present in hash (unconditionally).

OAuth path (no access_token in hash): relies entirely on onAuthStateChange branch B → set_signupMethod('oauth') → goToStep(2). If guard always fails, OAuth return path is broken.

---

## Agent 04

### restoreStep5UI (line 17)
Queries: `#step-5 .step-title`, `#btn-enter`, `#btn-resend-email`. Sets title textContent = "YOU'RE IN". Clears enterBtn display (shows it). Hides resendBtn. Null guards on all three elements. No return. Synchronous.

---

### attachAuthReturnHandler (line 31)
`const isPlaceholder = isAnyPlaceholder` — assigns function reference. Guard `if (!isPlaceholder && supabaseClient)` — if isAnyPlaceholder is a function, this is always false; onAuthStateChange block dead.

Hash block: if `window.location.hash` includes `'access_token'`: parses URLSearchParams. If type in ['signup','email'] and getCurrentUser() is truthy: writes welcome to step-5 title, calls restoreStep5UI(), goToStep(5). replaceState clears hash. This block runs regardless of guard.

Email signup return: covered by synchronous hash block. OAuth return: covered by onAuthStateChange branch B. If isPlaceholder guard always fails, OAuth return path covered only if supabaseClient itself is falsy — but OAuth returns don't include access_token in hash, so hash block won't fire for OAuth either.

---

## Agent 05

### restoreStep5UI (line 17)
Three querySelector calls targeting step-5 inner elements. Null-guarded mutations: title textContent written, enter button display reset, resend button hidden. Void, synchronous, no params.

---

### attachAuthReturnHandler (line 31)
Exported. Reads supabaseClient. isPlaceholder bound to function reference isAnyPlaceholder. Guard `!isPlaceholder && supabaseClient` — isPlaceholder is always truthy (function ref), so !isPlaceholder is always false. onAuthStateChange subscription may never register.

Unconditional hash-check: access_token in hash → URLSearchParams parse → type signup/email + getCurrentUser() truthy → welcome text + restoreStep5UI() + goToStep(5). Hash cleared via replaceState unconditionally on access_token presence.

OAuth return path (no access_token in hash, supabaseClient present): entirely dependent on onAuthStateChange branch B. If guard is always false, OAuth return is silently broken.

---

## Cross-Agent Consensus

All five agents agree on:
- restoreStep5UI: 3-element DOM manipulation, null-guarded, synchronous, "YOU'RE IN" text.
- attachAuthReturnHandler: isPlaceholder bound to function reference (not invocation); guard may always fail; onAuthStateChange block potentially dead; synchronous hash block fires unconditionally; hash cleared unconditionally on access_token presence.
- OAuth return path may be silently broken if isAnyPlaceholder is a function (not a boolean constant).

**Potential finding flagged by all 5 agents**: `isPlaceholder = isAnyPlaceholder` binding — if isAnyPlaceholder is a function, the onAuthStateChange guard always fails. Verifiability depends on src/config.ts — marked for Stage 3 source check.
