# Stage 2 — Runtime Walk · plinko.ts

Source: src/pages/plinko.ts
Anchors: 10 functions (from stage1_5-anchor.md)

---

## Agent 01

### 1. getReturnTo (line 47)

Reads `window.location.search` into a `URLSearchParams` instance and extracts the value of the `returnTo` query parameter into `dest`. If `dest` is truthy, starts with `/`, does not start with `//`, and does not contain a backslash character `\`, returns `dest` unchanged. Otherwise returns the literal string `'index.html?screen=arena'`.

### 2. updateProgress (line 54)

Queries the DOM for an element with id `'progress'`. If found, sets its `style.width` to the string result of `(currentStep / TOTAL_STEPS) * 100 + '%'`, where `TOTAL_STEPS` is the constant `5` and `currentStep` is the module-level mutable variable (initialized to `1`, mutated by `goToStep`).

### 3. goToStep (line 59)

Calls `document.querySelectorAll('.plinko-step')` and removes the class `'active'` from every matched element. Then queries for an element with id `'step-' + n`. If that element exists, adds the class `'active'` to it. Assigns `n` to the module-level `currentStep` variable. Calls `updateProgress()`, which repaints the progress bar based on the new `currentStep`. If `n === 5`, calls `injectInviteNudge()` with `void` (fire-and-forget, no await, rejection silently discarded).

### 4. showMsg (line 72)

Queries the DOM for an element with id equal to the `id` argument. If not found, returns immediately. If found, sets `el.className` to the string `'form-msg ' + type` (so either `'form-msg success'` or `'form-msg error'`), then sets `el.textContent` to `text`. No HTML injection; uses `textContent`.

### 5. clearMsg (line 79)

Queries the DOM for an element with id equal to the `id` argument. If not found, returns immediately. If found, sets `el.className` to `'form-msg'` (stripping any `success` or `error` modifier) and sets `el.textContent` to an empty string `''`.

### 6. injectInviteNudge (line 88)

Queries for element with id `'step-5'`. If absent, or if an element with id `'plinko-invite-nudge'` already exists in the DOM, returns immediately (idempotent guard). Otherwise dynamically imports `'../auth.ts'` to obtain `safeRpc`, then calls `safeRpc('get_my_invite_link', {})`. Casts `result.data` as `{ url?: string } | null` and reads the optional `url` property into `inviteUrl`. Any exception from the import or RPC is caught and swallowed; `inviteUrl` remains `null`. If `inviteUrl` is `null` after the try/catch, returns immediately. Otherwise creates a `<div>` with id `'plinko-invite-nudge'`, sets inline `style.cssText` for layout, sets `innerHTML` to a hardcoded template containing a heading, description, and a `<button id="plinko-invite-copy">`. Appends the div to `step5`. Attaches a `click` listener to the button: on click, attempts `navigator.clipboard.writeText(inviteUrl)`. On success, sets `btn.textContent` to `'✓ COPIED!'` and restores it after 2500 ms via `setTimeout`. On failure, creates a `<textarea>`, sets its `value` to `inviteUrl`, appends it to `document.body`, calls `ta.select()` and `document.execCommand('copy')`, removes it, sets button text to `'✓ COPIED!'`, and restores after 2500 ms. The `inviteUrl` captured in the closure is the non-null value from the outer scope, asserted with `!`.

### 7. validatePasswordComplexity (line 134)

Runs five sequential length and regex checks against the `password` string argument, returning the first failing error message string, or `null` if all pass:
- Returns `'Password must be at least 8 characters.'` if `password.length < 8`.
- Returns `'Password needs at least one lowercase letter.'` if `/[a-z]/` does not match.
- Returns `'Password needs at least one uppercase letter.'` if `/[A-Z]/` does not match.
- Returns `'Password needs at least one digit.'` if `/[0-9]/` does not match.
- Returns `'Password needs at least one symbol (!@#$%^&* etc).'` if the symbol regex does not match.
- Returns `null` if all five checks pass.

### 8. checkHIBP (line 144)

Encodes `password` to UTF-8 bytes via `TextEncoder`, computes a SHA-1 digest via `crypto.subtle.digest`, converts the resulting `Uint8Array` to an uppercase hex string. Slices the first 5 characters as `prefix` and the remaining 35 as `suffix`. Creates an `AbortController` and schedules `controller.abort()` after 3000 ms via `setTimeout`. Fetches `https://api.pwnedpasswords.com/range/{prefix}` with the abort signal. Calls `clearTimeout` on the timeout handle after the fetch resolves. If `response.ok` is false, returns `false`. Otherwise reads the response body as text, splits on `'\n'`, and for each line splits on `':'`, trims the first segment, and compares to `suffix`. Returns `true` if any line matches (password is compromised), `false` otherwise. Any exception (including abort, network error) is caught and returns `false`.

### 9. getAge (line 171)

Constructs `today` as `new Date()` (current local datetime) and `birth` as `new Date(year, month - 1, day)` (month is converted from 1-based to 0-based). Computes initial `age` as `today.getFullYear() - birth.getFullYear()`. Computes `m` as `today.getMonth() - birth.getMonth()`. If `m < 0`, or if `m === 0` and `today.getDate() < birth.getDate()` (i.e., birthday has not yet occurred this calendar year), decrements `age` by 1. Returns the final integer `age`.

### 10. handleOAuth (line 209)

Checks the module-level constant `isPlaceholder` (set at module load from `isAnyPlaceholder`). If truthy, calls `showMsg('step1-msg', 'Demo mode — OAuth not available.', 'error')` and returns immediately, taking no further action. If `isPlaceholder` is false, sets the module-level `signupMethod` variable to the string `'oauth'`, then calls `oauthLogin(provider, window.location.href)`, passing the `provider` argument and the current full page URL as the redirect destination.

---

## Agent 02

### 1. getReturnTo (line 47)

Reads `window.location.search` and constructs a `URLSearchParams` object from it. Calls `.get('returnTo')` on that object. If the result is a non-null string that starts with `/`, does not start with `//`, and does not include the character `\`, that string is returned as-is. If any of those three conditions fail, or if the param is absent, returns the string literal `'index.html?screen=arena'`.

### 2. updateProgress (line 54)

Calls `document.getElementById('progress')`. If the element is not found, the function exits without error. If found, sets `element.style.width` to the string result of `(currentStep / TOTAL_STEPS) * 100 + '%'`, where `currentStep` is the module-level variable tracking the current step and `TOTAL_STEPS` is the module-level constant `5`. This produces values like `'20%'`, `'40%'`, etc.

### 3. goToStep (line 59)

Queries all elements matching `.plinko-step` and removes the class `active` from each. Then calls `document.getElementById('step-' + n)` and adds `active` to that element's class list. Sets the module-level `currentStep` variable to `n`. Calls `updateProgress()` synchronously. If `n === 5`, fires `injectInviteNudge()` as a fire-and-forget (`void` discards the returned Promise; any rejection is unhandled).

### 4. showMsg (line 72)

Calls `document.getElementById(id)`. If the element is not found, returns immediately with no side effects. If found, sets `element.className` to the concatenated string `'form-msg ' + type` (overwriting any existing classes) and sets `element.textContent` to `text`.

### 5. clearMsg (line 79)

Calls `document.getElementById(id)`. If the element is not found, returns immediately with no side effects. If found, sets `element.className` to `'form-msg'` (overwriting any existing classes) and sets `element.textContent` to `''` (empty string).

### 6. injectInviteNudge (line 88)

1. Calls `document.getElementById('step-5')`. If not found, returns.
2. Calls `document.getElementById('plinko-invite-nudge')`. If already exists, returns (idempotency guard).
3. Dynamically imports `../auth.ts` and calls `safeRpc('get_my_invite_link', {})` on the result. The entire call is wrapped in try/catch; any thrown error is swallowed and `inviteUrl` remains `null`.
4. If `inviteUrl` is null after the RPC attempt, returns.
5. Creates a `div` element, sets its `id` to `'plinko-invite-nudge'`, applies inline styles, and sets `innerHTML` to static promo text containing a button with `id='plinko-invite-copy'`. Appends the div to the step-5 element.
6. Queries `#plinko-invite-copy` and attaches an async click listener. On click: calls `navigator.clipboard.writeText(inviteUrl)`; on success, sets the button's `textContent` to `'✓ COPIED!'` and schedules restoration of the original text after 2500ms via `setTimeout`. On failure (catch), falls back to creating a `textarea`, setting its value to `inviteUrl`, appending it to the body, selecting it, calling `document.execCommand('copy')`, removing the textarea, then performs the same button text update and 2500ms restore.

### 7. validatePasswordComplexity (line 134)

Runs five sequential regex tests against the input string, returning an error string on the first failure encountered:
- `password.length < 8` → minimum length error
- `/[a-z]/.test(password)` false → lowercase error
- `/[A-Z]/.test(password)` false → uppercase error
- `/[0-9]/.test(password)` false → digit error
- symbol regex false → symbol error
Returns `null` if all pass.

### 8. checkHIBP (line 144)

1. Encodes the password as UTF-8 via `TextEncoder` and calls `crypto.subtle.digest('SHA-1', ...)` to get a raw hash buffer.
2. Converts the buffer to a hex string. Takes the first 5 characters as `prefix` and the remainder as `suffix`.
3. Creates an `AbortController`. Calls `setTimeout` to invoke `controller.abort()` after 3000ms.
4. Calls `fetch('https://api.pwnedpasswords.com/range/' + prefix, { signal: controller.signal })`.
5. On receiving a response, calls `clearTimeout` on the abort timer.
6. If `response.ok` is false, returns `false` (treat as not leaked, do not block).
7. Calls `response.text()`, splits the result on `'\n'`, checks each line: takes the substring before `:` (the hash suffix portion), checks if it matches `suffix`. If any line matches, returns `true` (password is leaked).
8. If no match found, returns `false`.
9. Any exception thrown at any point (network error, abort, parse failure) is caught and returns `false`.

### 9. getAge (line 171)

Creates `today` as `new Date()`. Creates `birth` as `new Date(year, month - 1, day)` (month is zero-indexed). Computes `age = today.getFullYear() - birth.getFullYear()`. Then checks: if `today.getMonth() < birth.getMonth()`, or if `today.getMonth() === birth.getMonth()` and `today.getDate() < birth.getDate()`, decrements `age` by 1 (birthday has not yet occurred this calendar year). Returns the final integer `age`.

### 10. handleOAuth (line 209)

Checks the module-level boolean `isPlaceholder`. If `true`, calls `showMsg('step1-msg', 'Demo mode — OAuth not available.', 'error')` and returns immediately — no OAuth flow is initiated. If `false`, sets the module-level variable `signupMethod` to the string `'oauth'`, then calls `oauthLogin(provider, window.location.href)`, passing the `provider` argument and the current full page URL as the redirect target.

---

## Agent 03

### 1. getReturnTo (line 47)

Reads `window.location.search` into a `URLSearchParams` object and calls `.get('returnTo')`. If the result is truthy and passes three guards — starts with `/`, does not start with `//`, and does not contain `\` — it returns that string directly. If any guard fails or the param is absent, it returns the hardcoded string `'index.html?screen=arena'`.

### 2. updateProgress (line 54)

Looks up `document.getElementById('progress')`. If the element exists, sets its inline `style.width` to `(currentStep / TOTAL_STEPS) * 100 + '%'`. If the element is absent, no side effect occurs. `currentStep` is read from module-level state at call time.

### 3. goToStep (line 59)

Queries all elements matching `.plinko-step` and removes the `active` CSS class from each. Then looks up `document.getElementById('step-' + n)` and, if found, adds the `active` class to it. Sets the module-level `currentStep` to `n`. Calls `updateProgress()`, which reads the now-updated `currentStep`. If `n === 5`, calls `injectInviteNudge()` as a floating promise (prefixed `void`), discarding any rejection.

### 4. showMsg (line 72)

Looks up `document.getElementById(id)`. If the element is absent, returns immediately with no side effect. If found, sets `el.className` to `'form-msg ' + type` (replacing any prior class string entirely) and sets `el.textContent` to `text`. Uses `textContent`, not `innerHTML`, so no XSS risk from `text`.

### 5. clearMsg (line 79)

Looks up `document.getElementById(id)`. If absent, returns immediately. If found, sets `el.className` to `'form-msg'` (the base class only, stripping `success`/`error` suffix) and sets `el.textContent` to an empty string, making the element visually blank.

### 6. injectInviteNudge (line 88)

Looks up `document.getElementById('step-5')`. If absent, returns early. If `document.getElementById('plinko-invite-nudge')` already exists, returns early (idempotency guard). Declares `inviteUrl` as `null`. Dynamically imports `safeRpc` from `../auth.ts` and awaits `safeRpc('get_my_invite_link', {})`. Casts `result.data` to `{ url?: string } | null` and reads `.url` with optional chaining, nullish-coalescing to `null`. Any exception in this block is swallowed silently. If `inviteUrl` remains `null`, returns early. Otherwise, creates a `<div id="plinko-invite-nudge">` via `document.createElement`, sets its `innerHTML` with a copy button, and appends it to `step5`. Attaches a click listener to `#plinko-invite-copy`: on click, awaits `navigator.clipboard.writeText(inviteUrl!)`, sets button text to `'✓ COPIED!'`, and schedules a `setTimeout` at 2500 ms to reset the label. If the clipboard write throws, a `<textarea>`-based `execCommand` fallback runs.

### 7. validatePasswordComplexity (line 134)

Runs five sequential regex/length checks against `password` and returns the first failure message as a string, or `null` if all pass:
1. `password.length < 8` → length error
2. `/[a-z]/` does not match → lowercase error
3. `/[A-Z]/` does not match → uppercase error
4. `/[0-9]/` does not match → digit error
5. symbol regex does not match → symbol error
Returns `null` if all pass. No side effects; pure function.

### 8. checkHIBP (line 144)

Computes a SHA-1 hash of `password` via `crypto.subtle.digest` and converts it to an uppercase hex string. Takes the first 5 characters as `prefix` and the remainder as `suffix`. Creates an `AbortController` and sets a `setTimeout` to call `controller.abort()` after 3000 ms. Sends a `fetch` GET to `https://api.pwnedpasswords.com/range/${prefix}` with the abort signal. Calls `clearTimeout(timeout)` on success. If `response.ok` is false, returns `false`. Otherwise reads the full response body as text, splits on `'\n'`, and checks whether any line's first colon-delimited token (trimmed) equals `suffix`. Returns `true` if a match is found, `false` otherwise. Any thrown exception (including abort) is caught and returns `false`.

### 9. getAge (line 171)

Constructs `today = new Date()` (current local date) and `birth = new Date(year, month - 1, day)` (month is 0-indexed). Computes `age = today.getFullYear() - birth.getFullYear()`. Computes `m = today.getMonth() - birth.getMonth()`. If `m < 0`, or if `m === 0` and `today.getDate() < birth.getDate()` (birthday hasn't occurred yet this year), decrements `age` by 1. Returns the integer `age`. Pure function; no side effects.

### 10. handleOAuth (line 209)

Checks the module-level boolean `isPlaceholder`. If true, calls `showMsg('step1-msg', 'Demo mode — OAuth not available.', 'error')` and returns immediately. Otherwise, sets the module-level `signupMethod` to `'oauth'` and calls `oauthLogin(provider, window.location.href)`, passing the current full URL as the redirect target after OAuth completes.

---

## Agent 04

### 1. getReturnTo (line 47)

Reads `window.location.search` via `URLSearchParams` and extracts the `returnTo` parameter. Applies a 3-condition open-redirect guard: `dest` must be truthy AND must start with `'/'` AND must NOT start with `'//'` AND must NOT contain a backslash character. All conditions must pass simultaneously. If any condition fails — including a missing `returnTo` param, a protocol-relative URL (`//evil.com`), an absolute URL (`https://...`), or a path containing a backslash — the function discards `dest` and returns the hard-coded safe fallback `'index.html?screen=arena'`. Returns the validated `dest` string or the fallback. No module state is written.

### 2. updateProgress (line 54)

Reads module-level `currentStep` (integer, 1–5) and the constant `TOTAL_STEPS` (5). Looks up `#progress` by ID. If the element exists, sets its `style.width` to `(currentStep / 5) * 100 + '%'`. On step 1 that is 20%; step 5 is 100%. No return value. No module state written. Pure DOM side effect.

### 3. goToStep (line 59)

Takes an integer `n`. Iterates all `.plinko-step` elements and removes the `active` class from each. Looks up `#step-{n}` by ID and adds `active` to it if found. Writes `currentStep = n` to module state. Calls `updateProgress()` synchronously, which reflects the new `currentStep` into the progress bar. If `n === 5`, calls `void injectInviteNudge()` — fire-and-forget async, no await, no error propagation to caller. Returns `void`.

### 4. showMsg (line 72)

Takes `id`, `text`, and `type`. Looks up the element by ID. If not found, returns immediately. Otherwise sets `el.className` to `'form-msg ' + type` (replaces entire class string) and sets `el.textContent` to `text`. Uses `textContent` not `innerHTML` — XSS-safe. No module state written. Returns `void`.

### 5. clearMsg (line 79)

Takes `id`. Looks up element by ID. If not found, returns. Sets `el.className` to `'form-msg'` (removes success/error variant) and sets `el.textContent` to `''`. Inverse of `showMsg`. Uses `textContent` — XSS-safe. No module state written. Returns `void`.

### 6. injectInviteNudge (line 88)

Async. Idempotency guard runs first: looks up `#step-5` and `#plinko-invite-nudge`. If `#step-5` is absent OR `#plinko-invite-nudge` already exists in the DOM, returns immediately — prevents double-injection on repeated calls to `goToStep(5)`.

If proceeding: dynamically imports `'../auth.ts'` and destructures `safeRpc` from the result. Calls `safeRpc('get_my_invite_link', {})` and coerces `result.data` to `{ url?: string } | null`. Extracts `inviteUrl` via optional chain; on any exception the catch block silently swallows it and `inviteUrl` remains `null`. If `inviteUrl` is null, returns without injecting.

If `inviteUrl` is non-null: creates a `<div id="plinko-invite-nudge">` with inline styles and injects static HTML via `innerHTML` — the injected HTML contains no user-supplied data, only design strings and a button with a hardcoded ID. Appends the element to `#step-5`.

Attaches a click listener on `#plinko-invite-copy`. On click: attempts `navigator.clipboard.writeText(inviteUrl)` (modern async API). On success: sets `btn.textContent` to `'✓ COPIED!'`, schedules a 2500ms `setTimeout` to restore original label. On failure: falls back to creating a hidden `<textarea>`, sets its `.value` to `inviteUrl`, appends to `document.body`, calls `.select()` and `document.execCommand('copy')` (deprecated but functional fallback), removes the textarea, then performs same label swap. The `inviteUrl` used inside the click closure is the non-null value captured at injection time. Returns `Promise<void>`.

### 7. validatePasswordComplexity (line 134)

Takes `password` string. Executes 5 sequential regex checks in strict order, returning a descriptive error string on the first failure:
1. `password.length < 8` → length error
2. `!/[a-z]/.test(password)` → lowercase error
3. `!/[A-Z]/.test(password)` → uppercase error
4. `!/[0-9]/.test(password)` → digit error
5. symbol regex fails → symbol error
If all five pass, returns `null`. Pure function. No module state read or written.

### 8. checkHIBP (line 144)

Async. Takes `password` string. Computes SHA-1 hash via `crypto.subtle.digest('SHA-1', TextEncoder.encode(password))`. Converts hash bytes to uppercase hex string. Splits into `prefix` (first 5 chars) and `suffix` (remaining 35 chars) — k-anonymity: only the prefix is transmitted. Creates an `AbortController` and schedules `controller.abort()` after 3000ms via `setTimeout`. Fetches `https://api.pwnedpasswords.com/range/{prefix}` with the abort signal attached. On successful fetch, clears the timeout with `clearTimeout`. If `response.ok` is false, returns `false`. Reads response as text, splits on `'\n'`, checks whether any line's prefix (before `:`, trimmed) equals `suffix`. Returns `true` if a match is found, `false` if not. On any exception: catch block returns `false` — explicitly non-blocking, signup is never blocked on API failure. Returns `Promise<boolean>`.

### 9. getAge (line 171)

Takes `month` (1-based integer), `day` (integer), `year` (integer). Constructs `today = new Date()` (current local date). Constructs `birth = new Date(year, month - 1, day)` (month converted to 0-based). Computes naive age as `today.getFullYear() - birth.getFullYear()`. Then computes month delta `m = today.getMonth() - birth.getMonth()`. If `m < 0` OR `m === 0` AND `today.getDate() < birth.getDate()`, decrements `age` by 1. Returns the integer age. Note: `Date` constructor with out-of-range day values (e.g., day 31 in a 30-day month) will overflow silently to the next month, which could produce a slightly incorrect age — no validation of calendar validity is performed here.

### 10. handleOAuth (line 209)

Takes `provider` string. First checks the module-level `isPlaceholder` boolean. If `true`, calls `showMsg('step1-msg', 'Demo mode — OAuth not available.', 'error')` and returns immediately — no auth call is made, no state is written. If `isPlaceholder` is `false`: writes `signupMethod = 'oauth'` to module state (overwriting any previous value), then calls `oauthLogin(provider, window.location.href)` — passing the full current URL as the redirect-back destination. `oauthLogin` initiates the OAuth redirect flow; this function does not await it. Returns `void`.

---

## Agent 05

### 1. getReturnTo (line 47)

Reads `window.location.search` via `new URLSearchParams(...)`, extracts the `returnTo` parameter. Applies three sequential guards: (1) if falsy, returns default `'index.html?screen=arena'`; (2) if does not start with `/`, returns default; (3) if starts with `//`, returns default (blocks protocol-relative redirects); (4) if includes `\`, returns default (blocks Windows-style path injection). If all guards pass, returns the raw `returnTo` string. No module state read or written. No side effects.

### 2. updateProgress (line 54)

Reads module-level `currentStep` (integer) and constant `TOTAL_STEPS` (5). Calls `document.getElementById('progress')`. If the element is absent, returns immediately with no effect. If present, sets `el.style.width = (currentStep / TOTAL_STEPS * 100) + '%'`. No return value. No module state written. Side effect: mutates DOM width of the progress bar element.

### 3. goToStep (line 59)

Takes integer `n`. Queries `document.querySelectorAll('.plinko-step')` and removes the `active` class from every result. Then calls `document.getElementById('step-' + n)` and adds `active` to that element's class list. Writes `currentStep = n` to module state. Calls `updateProgress()` (which re-reads `currentStep` to repaint the progress bar). If `n === 5`, calls `void injectInviteNudge()` as a fire-and-forget async call — no `await`, no `.catch()`, so any rejection is silently swallowed. No return value.

### 4. showMsg (line 72)

Takes `id`, `text`, `type`. Calls `document.getElementById(id)`. If element is absent, returns immediately. If present, sets `el.className = 'form-msg ' + type` and `el.textContent = text`. Uses `textContent`, not `innerHTML`, so no XSS risk and no escaping required. No module state read or written. Side effect: mutates DOM class and text of the target element.

### 5. clearMsg (line 79)

Takes `id`. Calls `document.getElementById(id)`. If element is absent, returns immediately. If present, resets `el.className = 'form-msg'` (removes type suffix) and `el.textContent = ''` (clears any message). No module state read or written. Side effect: mutates DOM class and text of the target element back to neutral state.

### 6. injectInviteNudge (line 88)

Async. No parameters. Guards run first: queries `document.getElementById('step-5')` — if absent, returns immediately. Then checks whether `document.getElementById('plinko-invite-nudge')` already exists — if so, returns immediately (idempotent, prevents duplicate injection).

Dynamically imports `safeRpc` from `../auth.ts`, then calls `safeRpc('get_my_invite_link', {})`. The entire network call is wrapped in a `try/catch` that swallows all exceptions. On success, reads `data.url` from the RPC response into `inviteUrl`. If `inviteUrl` is null or falsy, returns immediately.

If a valid URL is obtained, creates a `div` element, sets `id = 'plinko-invite-nudge'`, and assigns `innerHTML` containing a "BRING YOUR FRIENDS" promo block and a copy button. Appends the div to the `step-5` element.

Attaches a `click` listener to the copy button: calls `navigator.clipboard.writeText(inviteUrl)`. On success, sets button text to `'✓ COPIED!'` and after 2500ms resets it to the original label. On clipboard failure, falls back to creating a temporary `textarea`, setting its value, selecting it, and calling `document.execCommand('copy')`, then applies the same text/reset sequence. No return value. Side effects: DOM mutation, async RPC call, clipboard write.

### 7. validatePasswordComplexity (line 134)

Takes `password` (string). Performs five sequential regex/length checks, returning the first failure as an error string, or `null` if all pass:
1. `password.length < 8` → length error
2. `!/[a-z]/.test(password)` → lowercase error
3. `!/[A-Z]/.test(password)` → uppercase error
4. `!/[0-9]/.test(password)` → digit error
5. symbol regex fails → symbol error
All five pass → returns `null`. No module state read or written. No side effects. Pure function.

### 8. checkHIBP (line 144)

Async. Takes `password` (string). Computes SHA-1 hash of the password using `crypto.subtle.digest('SHA-1', encoded)`, converts the resulting `ArrayBuffer` to an uppercase hex string. Splits into `prefix` (first 5 chars) and `suffix` (remaining chars).

Creates an `AbortController` and sets a `setTimeout` of 3000ms to call `controller.abort()`. Fetches `https://api.pwnedpasswords.com/range/{prefix}` with the abort signal. Calls `clearTimeout` on the timeout handle immediately after the response arrives.

If `!response.ok`, returns `false`. Otherwise reads the response body as text, splits by `'\n'`, and for each line splits on `':'` to extract the hash suffix portion. If any line's suffix (uppercased) strictly equals `suffix`, returns `true` (password is leaked). If no match found, returns `false`.

The entire function body is wrapped in a `try/catch` — any exception (network error, abort, crypto failure) causes it to return `false`. No module state read or written. No side effects beyond the outbound HTTP request.

### 9. getAge (line 171)

Takes `month` (1-based), `day`, `year`. Constructs `today = new Date()` and `birth = new Date(year, month - 1, day)`. Computes `age = today.getFullYear() - birth.getFullYear()`. Then checks whether the birthday has not yet occurred this calendar year: compares month and day. If the birthday is still in the future this year, decrements `age` by 1. Returns `age` as an integer. No module state read or written. No side effects. Pure function modulo `new Date()` wall-clock read.

### 10. handleOAuth (line 209)

Takes `provider` (string). Reads `isPlaceholder` (module-level boolean flag).

Branch 1 — `isPlaceholder` is truthy: calls `showMsg('step1-msg', 'Demo mode — OAuth not available.', 'error')`, then returns immediately. No auth flow initiated.

Branch 2 — `isPlaceholder` is falsy: writes `signupMethod = 'oauth'` to module state, then calls `oauthLogin(provider, window.location.href)`. `oauthLogin` initiates the Supabase OAuth redirect flow. No return value from `handleOAuth` itself.
