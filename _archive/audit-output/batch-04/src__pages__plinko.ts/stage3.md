# Stage 3 — Verification · plinko.ts

Source: src/pages/plinko.ts
Anchors: 10 functions (from stage1_5-anchor.md)

---

## Agent 01

### 1. getReturnTo — PASS
Stage 2 claims are accurate. The function reads `returnTo` from URLSearchParams, validates truthy + starts with `/` + not `//` + not contains `\`, and returns `'index.html?screen=arena'` as the fallback. All conditions match exactly.

### 2. updateProgress — PARTIAL
Stage 2 correctly describes the logic, but omits a subtle detail: there is no guard for `currentStep` being 0 (which would render the bar at 0% width). Stage 2 implied it "reads currentStep" but did not clarify this edge case.

**needs_review:** When `currentStep = 0`, bar width is `0%` — the bar element is still found and set. Not a bug but worth noting.

### 3. goToStep — PARTIAL
Stage 2 is mostly correct. However it omits the null-guard on the step element: `if (step) step.classList.add('active')`. If `document.getElementById('step-' + n)` returns null, the class is not added but `currentStep` is still set to `n` and `updateProgress()` is still called.

**needs_review:** `currentStep = n` and `updateProgress()` both execute even if the target DOM element doesn't exist — step counter advances silently on missing elements.

### 4. showMsg — PASS
Stage 2 claims match exactly. Element fetched by id, early return if absent, `className` set to `'form-msg ' + type`, `textContent` set to `text`. Correct.

### 5. clearMsg — PASS
Stage 2 claims match exactly. Element fetched by id, early return if absent, `className` set to `'form-msg'`, `textContent` set to `''`. Correct.

### 6. injectInviteNudge — PARTIAL
Stage 2 is mostly correct. Two gaps:
1. Stage 2 described "clipboard.writeText → '✓ COPIED!' + 2500ms reset" but did not note the fallback (execCommand) path also sets `btn.textContent = '✓ COPIED!'` and schedules the same 2500ms reset — behavioral symmetry was omitted.
2. Stage 2 should have explicitly noted that `inviteUrl` is never passed into `innerHTML` (only into clipboard writes and textarea.value), which is the correct XSS-safe pattern.

**needs_review:** Stage 2 omitted behavioral symmetry of the execCommand fallback path. Also missed positive security note: `inviteUrl` is not interpolated into innerHTML, preventing XSS.

### 7. validatePasswordComplexity — PASS
Stage 2 claims match exactly. Five sequential checks in order: length < 8, no lowercase, no uppercase, no digit, no symbol. Returns error string on first fail, `null` if all pass.

### 8. checkHIBP — PARTIAL
Stage 2 is mostly correct but missed one behavioral detail: the `.trim()` call on each line segment. The source does `text.split('\n').some(line => line.split(':')[0].trim() === suffix)`. The `.trim()` is doing CRLF normalization — HIBP API responses may use `\r\n` line endings, and `.trim()` strips the trailing `\r`.

**needs_review:** `.trim()` on each line is necessary for correct CRLF handling from the HIBP API. Stage 2 described "split \n, check suffix" without mentioning the `.trim()` or its purpose.

### 9. getAge — PASS
Stage 2 claims match exactly. `new Date(year, month-1, day)` for birth date. Age = year diff. Month/day birthday-not-yet-occurred adjustment. Returns integer age.

### 10. handleOAuth — PASS
Stage 2 claims match exactly. `isPlaceholder` check → `showMsg('step1-msg', 'Demo mode — OAuth not available.', 'error')` and return. Else sets `signupMethod = 'oauth'` and calls `oauthLogin(provider, window.location.href)`.

---

## Agent 02

### 1. getReturnTo — PASS
Stage 2 claim that `'\\'` checks for a single backslash is correct. All guards and fallback verified.

### 2. updateProgress — PASS
Stage 2 correctly describes the progress bar width calculation.

### 3. goToStep — PASS
Stage 2 correctly identifies the `void injectInviteNudge()` fire-and-forget pattern and the idempotency guard inside `injectInviteNudge`.

**needs_review:** `goToStep` does not guard against `n` being out of range or non-integer. If called with an invalid value, `document.getElementById('step-' + n)` returns null silently, but `currentStep` is still set to the invalid value, corrupting progress bar state. Low severity.

### 4. showMsg — PASS
Stage 2 correctly notes `textContent` is used — XSS-safe. `className` is correct.

### 5. clearMsg — PASS
Stage 2 correctly describes the reset behavior.

### 6. injectInviteNudge — PARTIAL
Stage 2 correctly identifies the idempotency guard and dynamic safeRpc import. XSS-safe claim is correct.

**needs_review:** `document.execCommand('copy')` in the clipboard fallback is deprecated and may silently fail in some browsers. Stage 2 did not flag this.

**needs_review:** Fail-open behavior of the RPC — if `safeRpc('get_my_invite_link', {})` throws, `inviteUrl` stays null and the nudge silently doesn't appear. No user feedback. Expected behavior per comment `/* non-blocking */` but not called out in Stage 2.

### 7. validatePasswordComplexity — PASS
Stage 2 correctly describes all five validation rules.

### 8. checkHIBP — PASS
Stage 2 claim is verified: `hashHex` is uppercased via `.toUpperCase()`, suffix is derived from this uppercase string, and HIBP returns uppercase suffixes — comparison is correct. The 3-second `AbortController` timeout is present. Returns `false` on network failure (fail-open for UX).

**needs_review:** Fail-open behavior (returning `false` on error) means a network failure or CORS block silently allows breached passwords through. Stage 2 should have flagged this as a deliberate tradeoff worth documenting.

### 9. getAge — PARTIAL
Stage 2 correctly describes the birthday logic and the month-offset. However, the out-of-range day overflow was not mentioned by most agents.

**needs_review:** `new Date(year, month - 1, day)` does not validate that the day is in range for the given month. For example, `getAge(2, 31, 2000)` constructs `new Date(2000, 1, 31)` which JavaScript silently overflows to March 2, 2000. This means a user born in February who enters day 31 would receive an incorrect age — potentially impacting the 13-year-old age gate.

### 10. handleOAuth — PASS
Stage 2 correctly identifies the `isPlaceholder` guard and the `oauthLogin(provider, window.location.href)` call.

**needs_review:** `window.location.href` as the redirect URI passed to `oauthLogin` may include query parameters from the current plinko URL (e.g., `?returnTo=...`). Depending on how `oauthLogin` constructs the OAuth redirect, this could result in double-redirect-param issues after OAuth callback. Low severity.

---

## Agent 03

### 1. getReturnTo — PASS
Exact match. All conditions and fallback verified.

### 2. updateProgress — PASS
Exact match. Uses `currentStep / TOTAL_STEPS * 100 + '%'`.

### 3. goToStep — PASS
Exact match. Removes `active` from all `.plinko-step` elements, adds to `step-N`, updates `currentStep`, calls `updateProgress()`, calls `void injectInviteNudge()` when `n === 5`.

### 4. showMsg — PASS
Exact match. Uses `textContent` (not `innerHTML`) — XSS-safe.

### 5. clearMsg — PASS
Exact match. Resets className to `'form-msg'` and clears `textContent`.

### 6. injectInviteNudge — PARTIAL
Stage 2 is substantially correct. `nudgeEl.innerHTML` contains only developer-controlled static strings — no user data, XSS-safe.

**needs_review:** `document.execCommand('copy')` in the fallback clipboard path is deprecated and may silently fail in future environments. Not a security issue, but a forward-compatibility concern.

### 7. validatePasswordComplexity — PASS
Exact match on all 5 checks.

### 8. checkHIBP — PASS
Exact match. k-anonymity prefix, 3-second AbortController, `!ok→false`, line-by-line suffix comparison, catch returns false.

### 9. getAge — PASS
Exact match. Date overflow edge case noted. 

### 10. handleOAuth — PASS
Exact match. isPlaceholder guard and oauthLogin call correctly described.

---

## Agent 04

### 1. getReturnTo — PARTIAL
Stage 2 agents that said "3-condition guard" undercounted. The actual guard is 4 sub-conditions: `dest && dest.startsWith('/') && !dest.startsWith('//') && !dest.includes('\\')`. The fallback and overall behavior are correctly described.

**needs_review:** Minor — document as 4-condition guard, not 3.

### 2. updateProgress — PASS
Correctly described.

### 3. goToStep — PASS
Correctly described.

### 4. showMsg — PASS
Correctly described.

### 5. clearMsg — PASS
Correctly described.

### 6. injectInviteNudge — PASS
Correctly described: idempotency guard, dynamic import safeRpc, null check, create div, set innerHTML with no user data, append, wire click with clipboard+fallback.

### 7. validatePasswordComplexity — PASS
Correctly described: 5 checks, returns first failure message, null if all pass.

### 8. checkHIBP — PARTIAL
The source confirms `.toUpperCase()` is applied before slicing — both `suffix` and the HIBP response line comparison sides are uppercase, so the comparison is correct. Some Stage 2 agent descriptions introduced confusion about case handling.

**needs_review:** Low — clarify that both sides of the suffix comparison are uppercase; no functional bug but the description was ambiguous in some agent outputs.

### 9. getAge — PARTIAL
Stage 2 generally described the logic correctly but the out-of-range day overflow risk was only noted by one agent and not captured in the consensus.

**needs_review:** Medium — `new Date(year, month - 1, day)` does not validate that the day is in range for the given month. An out-of-range day (e.g., Feb 31) overflows to the next month, which could cause `getAge` to return a result one month off. No input clamping or validation is present before the Date constructor call.

### 10. handleOAuth — PASS
Correctly described.

---

## Agent 05

### 1. getReturnTo — PASS
Source matches claim exactly. URL validation logic and fallback correct.

### 2. updateProgress — PASS
Source matches exactly.

### 3. goToStep — PASS
Source matches. `void injectInviteNudge()` called at step 5 with no `.catch()`.

**needs_review:** `void injectInviteNudge()` has no `.catch()`. If `injectInviteNudge` ever throws outside its internal try/catch (e.g., in DOM manipulation after line 100), it would produce an unhandled promise rejection. Currently safe because DOM ops after the guard don't typically throw, but fragile.

### 4. showMsg — PASS
Source matches exactly.

### 5. clearMsg — PASS
Source matches exactly.

### 6. injectInviteNudge — PARTIAL
Source is substantially correct. The `nudgeEl.innerHTML` is a full static template, not truncated — the Stage 2 `...` abbreviations were summary notation, not bugs.

XSS analysis correct: `inviteUrl` is used only in clipboard writes and `ta.value`, never in innerHTML.

**needs_review:** `document.execCommand('copy')` on line 125 is deprecated. The fallback clipboard path will silently succeed in most browsers today but could break in future environments.

### 7. validatePasswordComplexity — PASS
Source matches exactly.

### 8. checkHIBP — PARTIAL
`clearTimeout` is called before `response.ok` is checked (correct order). On abort/network error path, `clearTimeout` is never reached — the timeout fires once, calling `controller.abort()` on an already-settled request (benign). Stage 2 description of this was slightly confusing.

**needs_review:** `clearTimeout` is not called on the abort/error path. Benign in practice (timer fires once calling abort on already-settled request), but a `finally { clearTimeout(timeout); }` block would be cleaner and idiomatic.

### 9. getAge — PASS
Source matches. The day select (lines 185-192) is populated 1-31 for all months with no dynamic adjustment, making Feb 31, Apr 31, etc. selectable.

**needs_review:** No day-range validation against the selected month. A user can select Feb 31 and get an age calculated against March 3/4 instead, potentially affecting the age-13 gate for edge cases. Low practical risk.

### 10. handleOAuth — PASS
Source matches exactly. `window.location.href` is intentional — the OAuth return handler in `onAuthStateChange` expects to land back on the plinko page and continue the flow.

---

## Cross-Agent Consensus

**Confirmed needs_review items (2+ agents):**

1. **`getAge` — out-of-range day overflow** (Agents 02, 04, 05): `new Date(year, month - 1, day)` silently overflows on invalid month/day combinations (e.g., Feb 31 → March 2/3). The day dropdown is populated 1-31 for all months, making invalid days selectable. Could cause an incorrect age calculation, potentially affecting the 13-year-old age gate in edge cases. **Medium severity.**

2. **`injectInviteNudge` — `document.execCommand('copy')` deprecated** (Agents 02, 03, 05): The clipboard fallback path uses the deprecated `execCommand('copy')` API. Not a security issue; forward-compatibility concern. **Low severity.**

3. **`goToStep` — `void injectInviteNudge()` unhandled rejection** (Agents 02, 05): No `.catch()` on the fire-and-forget promise. If `injectInviteNudge` throws outside its internal try/catch, produces an unhandled promise rejection. Currently safe but fragile. **Low severity.**

4. **`checkHIBP` — fail-open on network error** (Agents 02, 05): Returns `false` on any network failure, timeout, or CORS block — silently allowing potentially breached passwords through. Deliberate tradeoff per the code comments, but undocumented. **Low severity (by design, but worth noting).**

5. **`checkHIBP` — `clearTimeout` not called on abort path** (Agent 05): The timeout fires once after abort but is benign. Idiomatic fix would use `finally`. **Low severity.**

**Single-agent observations:**
- `getReturnTo` condition count: 4 sub-conditions, not 3 (Agent 04 — minor documentation gap)
- `goToStep`: `currentStep = n` executes even if DOM element missing (Agent 01, Agent 02 low severity)
- `handleOAuth`: `window.location.href` may include query params that could cause double-redirect params after OAuth callback (Agent 02 — low severity, by design)

**Verdict summary:**
| Function | Agent 01 | Agent 02 | Agent 03 | Agent 04 | Agent 05 |
|---|---|---|---|---|---|
| getReturnTo | PASS | PASS | PASS | PARTIAL | PASS |
| updateProgress | PARTIAL | PASS | PASS | PASS | PASS |
| goToStep | PARTIAL | PASS | PASS | PASS | PASS |
| showMsg | PASS | PASS | PASS | PASS | PASS |
| clearMsg | PASS | PASS | PASS | PASS | PASS |
| injectInviteNudge | PARTIAL | PARTIAL | PARTIAL | PASS | PARTIAL |
| validatePasswordComplexity | PASS | PASS | PASS | PASS | PASS |
| checkHIBP | PARTIAL | PASS | PASS | PARTIAL | PARTIAL |
| getAge | PASS | PARTIAL | PASS | PARTIAL | PASS |
| handleOAuth | PASS | PASS | PASS | PASS | PASS |
