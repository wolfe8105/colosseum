# Stage 3 Outputs — plinko-step1-method.ts

## Agent 01

### handleOAuth

All claims CONFIRMED.
- Synchronous, non-exported, single `provider` string parameter. (line 13)
- Reads module-level `isPlaceholder` aliased from `isAnyPlaceholder` (config.ts). (lines 6, 11)
- Guard truthy → `showMsg('step1-msg', 'Demo mode — OAuth not available.', 'error')` + return. (lines 14-17)
- Guard falsy → `set_signupMethod('oauth')` then `oauthLogin(provider, window.location.href)`. (lines 18-19)
- Return value of `oauthLogin` not captured. (line 19)
- No try/catch. Exception from `oauthLogin` propagates to caller.

### attachStep1

All claims CONFIRMED.
- Exported, synchronous, no parameters. (line 22)
- Four optional-chaining `?.addEventListener` calls — absent elements silently skipped. (lines 23, 24, 26, 38)
- `btn-google` click → `handleOAuth('google')`. (line 23)
- `btn-apple` click → `handleOAuth('apple')`. (line 24)
- `email-toggle` click uses **function keyword** (not arrow) with typed `this: HTMLElement`. (line 26)
  - Reads `email-fields` by ID; absent → return. (lines 27-28)
  - Toggles `open` class on `email-fields`. (line 29)
  - Sets `this.textContent` to `'Hide email signup ▴'` or `'Use email instead ▾'`. (line 30)
  - If newly opened: `setTimeout` 350 ms → `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on `btn-email-next`. (lines 31-35)
- `btn-email-next` click is `async () =>`. (line 38)
  - `clearMsg('step1-msg')`. (line 39)
  - Trimmed email from `signup-email` (`HTMLInputElement | null`, fallback `''`). (line 40)
  - Raw password from `signup-password`. (line 41)
  - Empty-email guard → `showMsg` + return. (line 43)
  - `validatePasswordComplexity` guard → `showMsg` + return. (lines 46-47)
  - Disable `btn-email-next`, set textContent `'CHECKING...'`. (lines 50-51)
  - `await checkHIBP(password)`. (line 53)
  - Pwned truthy → breach `showMsg`, re-enable button, `'CONTINUE'`, return. (lines 54-58)
  - Clean path → re-enable button, `'CONTINUE'`. (line 60)
    - `set_signupMethod('email')` → `set_signupEmail(email)` → `set_signupPassword(password)`. (lines 62-64)
    - `goToStep(2)`. (line 65)
  - **No try/catch around `await checkHIBP`**. Exception leaves button permanently disabled.

## Agent 02

All claims CONFIRMED. No refuted claims.
- Matches Agent 01 analysis on all points.
- `checkHIBP` throws → unhandled promise rejection → button stuck disabled. CONFIRMED.

## Agent 03

All claims CONFIRMED. No refuted claims.
- All flow descriptions match source lines 39-65 exactly.
- No try/catch around `await checkHIBP`. CONFIRMED.

## Agent 04

All claims CONFIRMED. No refuted claims.
- `handleOAuth` makes no DOM reads — confirmed, reads only module-level `isPlaceholder` and `window.location.href`.
- State write trio (signupMethod, signupEmail, signupPassword) all before `goToStep(2)`. CONFIRMED (lines 62-65).

## Agent 05

All claims CONFIRMED. One UNVERIFIABLE.
- `email-toggle` uses `function` keyword for `this` binding. CONFIRMED (line 26).
- `btn-email-next` uses `async () =>` arrow function. CONFIRMED (line 38).
- `checkHIBP` described as "k-anonymity, 3s timeout, resolves boolean" — UNVERIFIABLE from this file alone (implementation in `plinko-password.ts`).
- Password only stored to state after both validation layers pass. CONFIRMED.
- No state writes on any error path. CONFIRMED.

## Consensus

### Refuted Claims
None.

### Findings Confirmed by Source

**FINDING — MEDIUM (Reliability):** No try/catch around `await checkHIBP(password)` (line 53).

If `checkHIBP` rejects (network error, timeout, unexpected throw), the async handler exits with an unhandled promise rejection. The button was set `disabled = true` / `'CHECKING...'` at line 51 and is never re-enabled on the exception path. The user cannot retry without reloading the page.

All five agents agree this is present and unmitigated. Fix: wrap the `await` in `try/finally` to unconditionally re-enable the button on any thrown error, consistent with the project's established `try/finally` re-enable pattern.

### No Other Issues
- No XSS risk (no `innerHTML` in this file).
- No direct DB mutations (writes go to plinko in-memory state only).
- `handleOAuth` has no async operations so no stuck-button risk there.
- State writes are correctly ordered and scoped to the clean success path only.
