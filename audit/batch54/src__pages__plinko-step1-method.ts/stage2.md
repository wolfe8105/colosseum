# Stage 2 Outputs — plinko-step1-method.ts

## Agent 01

### handleOAuth

`handleOAuth` is a synchronous, non-exported function that accepts a single `provider` string parameter. It reads the module-level constant `isPlaceholder`, which is aliased from `isAnyPlaceholder` imported from `config.ts`. If `isPlaceholder` is truthy, it calls `showMsg('step1-msg', 'Demo mode — OAuth not available.', 'error')` and returns immediately without writing any state. When `isPlaceholder` is falsy, it calls `set_signupMethod('oauth')` to write the string `'oauth'` into the `signupMethod` field of the plinko module state, then calls `oauthLogin(provider, window.location.href)`, passing the provider string and the current page URL as the post-redirect destination. `oauthLogin` is imported from `auth.ts`; its return value is not captured. `handleOAuth` returns `void` in all branches.

### attachStep1

`attachStep1` is a synchronous exported function that takes no parameters. It performs four DOM queries and conditionally attaches event listeners to each element using optional chaining, so any missing element is silently skipped.

It attaches a click listener to `btn-google` that calls `handleOAuth('google')` and a click listener to `btn-apple` that calls `handleOAuth('apple')`. It attaches a click listener to `email-toggle` that queries `email-fields` by ID and returns early if that element is absent. Otherwise it toggles the `open` CSS class on `email-fields` and sets `this.textContent` to either `'Hide email signup ▴'` or `'Use email instead ▾'` depending on whether `open` is now present. If `open` was added, a `setTimeout` of 350 ms fires and calls `scrollIntoView` with smooth/nearest behavior on `btn-email-next`. It attaches an `async` click listener to `btn-email-next`. That listener first calls `clearMsg('step1-msg')`, then reads the trimmed `.value` of `signup-email` (cast to `HTMLInputElement | null`, falling back to an empty string) and the raw `.value` of `signup-password`. If `email` is falsy, it calls `showMsg('step1-msg', 'Please enter your email.', 'error')` and returns. Otherwise it calls `validatePasswordComplexity(password)`; if that returns a truthy error string, it calls `showMsg` with that string and returns. If both checks pass, it reads `btn-email-next` as an `HTMLButtonElement | null`, and if non-null sets its `disabled` to `true` and its `textContent` to `'CHECKING...'`. It then `await`s `checkHIBP(password)`. If `checkHIBP` resolves truthy, it calls `showMsg` with a breach warning, re-enables and resets the button text to `'CONTINUE'`, and returns. If `checkHIBP` resolves falsy, it re-enables and resets the button, then calls `set_signupMethod('email')`, `set_signupEmail(email)`, and `set_signupPassword(password)` in sequence to write all three values into plinko state, and finally calls `goToStep(2)`. There is no try/catch around `checkHIBP`; if it rejects, the error propagates as an unhandled promise rejection and the button remains disabled. `attachStep1` itself returns `void` synchronously after all four `addEventListener` calls complete.

## Agent 02

### handleOAuth

`handleOAuth` accepts a `provider` string and returns `void`. On entry it reads the module-level `isPlaceholder` constant. If that flag is truthy, it calls `showMsg('step1-msg', 'Demo mode — OAuth not available.', 'error')` and returns immediately. When the flag is falsy it calls `set_signupMethod('oauth')` to write the chosen auth method into plinko state, then calls `oauthLogin(provider, window.location.href)`. The function is synchronous throughout and has no try/catch; any exception thrown by `oauthLogin` propagates to the caller.

### attachStep1

`attachStep1` is an exported synchronous function that wires four event listeners onto DOM elements, using optional chaining so absent elements are silently skipped. The first two listeners bind click on `#btn-google` and `#btn-apple`, each delegating to `handleOAuth` with the respective provider string. The third listener binds click on `#email-toggle`. On each click it reads `#email-fields` by ID; if that element does not exist the handler returns. Otherwise it toggles the `open` CSS class on `#email-fields`, then sets the toggle button's `textContent` depending on whether `open` is now present. If `open` was just added, a `setTimeout` of 350 ms is queued; when it fires it calls `scrollIntoView` on `#btn-email-next`. The fourth listener binds click on `#btn-email-next` as an `async` handler. It calls `clearMsg('step1-msg')`, reads trimmed email and raw password values (with `''` fallbacks). If email is falsy, shows error and returns. It calls `validatePasswordComplexity`; if it returns an error string, shows it and returns. Then disables the button, sets text to `'CHECKING...'`, and `await`s `checkHIBP(password)`. If truthy, shows breach warning, re-enables/relabels button, returns. If falsy, re-enables/relabels button, calls `set_signupMethod('email')`, `set_signupEmail(email)`, `set_signupPassword(password)` in sequence, and calls `goToStep(2)`. If `checkHIBP` throws, the exception propagates unhandled, leaving the button disabled.

## Agent 03

### handleOAuth

A synchronous void function. Takes a `provider` string. Reads module-level `isPlaceholder` (aliased from `isAnyPlaceholder`). If truthy, calls `showMsg('step1-msg', 'Demo mode — OAuth not available.', 'error')` and returns. If falsy: calls `set_signupMethod('oauth')` (writes `'oauth'` to plinko state), then calls `oauthLogin(provider, window.location.href)` (OAuth redirect, page navigates away). No async, no try/catch, no return value.

### attachStep1

Exported synchronous setup function. Wires four DOM listeners via optional chaining (silent on missing elements). Google/Apple buttons: click → `handleOAuth('google'/'apple')`. Email toggle: click → reads `#email-fields`, early-return if absent, toggles `open` class, updates button `textContent`, schedules 350 ms `setTimeout` for smooth scroll if newly opened. Email-next button async handler: `clearMsg` → read trimmed email + raw password → empty-email guard (showMsg + return) → `validatePasswordComplexity` guard (showMsg + return) → disable button + set `'CHECKING...'` → `await checkHIBP(password)`. If pwned: showMsg + re-enable + return. If not: re-enable → `set_signupMethod` + `set_signupEmail` + `set_signupPassword` → `goToStep(2)`. No try/catch around `await checkHIBP` — thrown error leaves button stuck disabled.

## Agent 04

### handleOAuth

Synchronous, module-private. Takes `provider` string. Reads `isPlaceholder` from module scope. Guard: if truthy, `showMsg('step1-msg', 'Demo mode — OAuth not available.', 'error')` and return. Happy path: `set_signupMethod('oauth')` writes to state; `oauthLogin(provider, window.location.href)` triggers Supabase OAuth redirect. No reads from DOM. No async, no return value, no try/catch.

### attachStep1

Exported synchronous setup. Wires four listeners with optional chaining (silent no-op on absent elements). Execution order: (1) `#btn-google` click → `handleOAuth('google')`; (2) `#btn-apple` click → `handleOAuth('apple')`; (3) `#email-toggle` click: reads `#email-fields`, bails if absent, toggles `open` class, writes `this.textContent` to label string, if now open: `setTimeout` 350ms → `scrollIntoView` on `#btn-email-next`; (4) `#btn-email-next` async click: `clearMsg('step1-msg')` → read trimmed email (`??''`) + raw password → empty-email guard → `validatePasswordComplexity` guard → disable button + `'CHECKING...'` → `await checkHIBP(password)` → if pwned: showMsg + re-enable + return; if not: re-enable → `set_signupMethod` + `set_signupEmail` + `set_signupPassword` → `goToStep(2)`. No try/catch around HIBP — thrown error leaves button disabled. State writes (email path) are `signupMethod`, `signupEmail`, `signupPassword` as a trio before step transition.

## Agent 05

### handleOAuth

Synchronous void, module-private. Takes `provider` string. Reads `isPlaceholder` (module-level const from `isAnyPlaceholder`). Guard: truthy → `showMsg('step1-msg', '…', 'error')`, return. Happy path: `set_signupMethod('oauth')` (writes `'oauth'` to plinko state), `oauthLogin(provider, window.location.href)` (OAuth redirect, page navigates away). No async, no try/catch.

### attachStep1

Exported synchronous setup. Wires four listeners via optional chaining (absent elements silently no-op). (1) `#btn-google` click → `handleOAuth('google')`; (2) `#btn-apple` click → `handleOAuth('apple')`; (3) `#email-toggle` click (function keyword for `this`): reads `#email-fields`, absent → return; toggles `open` class; writes `this.textContent`; if opened: `setTimeout` 350ms → `scrollIntoView` on `#btn-email-next` smooth. (4) `#btn-email-next` async click: `clearMsg` → trimmed email + raw password reads → empty-email guard → `validatePasswordComplexity` guard → disable button + `'CHECKING...'` → `await checkHIBP(password)` (k-anonymity, 3s timeout, resolves boolean) → if pwned: showMsg + re-enable + return; if not: re-enable → `set_signupMethod('email')` + `set_signupEmail(email)` + `set_signupPassword(password)` → `goToStep(2)`. No try/catch around HIBP await — exception leaves button in disabled/CHECKING state. Password stored in state only after both validation layers pass. No state writes on any error path.
