# Stage 3 — Verification: src/arena/arena-bounty-claim.ts

Batch: 10R
Agents: 5 (independent, parallel)
Anchor list: 3 functions
Source file: src/arena/arena-bounty-claim.ts

---

## Agent 01

### getSelectedBountyId (line 17)
PASS. Returns `_selectedBountyId` directly. No branching, no side effects. Stage 2 description accurate.

### resetBountyClaim (line 21)
PASS. Sets `_selectedBountyId = null` and `_attemptFeePaid = false`. Synchronous, no inputs, no return. Stage 2 description accurate.

### renderBountyClaimDropdown (line 30)
PARTIAL.

Confirmed claims:
- Accepts `container`, `debateId`, `opponentId`, `opponentName` and returns `Promise<void>`.
- On entry writes into `container.innerHTML`; renders `opponentName` via `escapeHTML(opponentName)`.
- Queries `#bounty-claim-inner` from rendered HTML.
- Calls `getOpponentBounties(opponentId)`; on error writes error message into `inner` and returns early.
- If array is empty writes "no open bounties" message and returns early.
- Maps bounties to `<option>` elements with `data-fee` and `data-amount` attributes.
- Computes `daysLeft` from `expires_at` relative to `Date.now()`, clamped to 0.
- Renders `<select>`, preview `<div>`, lock button (disabled), error `<div>`, locked-state `<div>` into `inner`.
- `change` listener: blank option → clears preview, disables button; valid option → sets preview text, enables button.
- `click` listener: guards via `_attemptFeePaid`, disables button, calls `selectBountyClaim(bountyId, debateId)`.
- On success: sets `_selectedBountyId`, sets `_attemptFeePaid = true`, hides select/preview/button, reveals locked-state panel.
- On failure: re-enables button, restores label, displays error.

Inaccuracies found:
1. Stage 2 described the initial write as "a loading skeleton." The actual `container.innerHTML` write renders the full outer wrapper structure including a header section, not merely a skeleton. The "Checking bounties…" placeholder is inside `#bounty-claim-inner` only.
2. Stage 2 described net-win rounding as `amount * 0.95` rounded to two decimal places. The actual expression is `Math.round(b.amount * 0.95 * 100) / 100`, not `.toFixed(2)` — the result is a number, not a string.

needs_review:
- **_attemptFeePaid singleton across renders**: `_attemptFeePaid` is module-level and not reset between calls to `renderBountyClaimDropdown`. If a caller does not invoke `resetBountyClaim()` before re-rendering, the lock button's click handler will silently no-op on the first click of the new render, with no user feedback.
- **Hardcoded hex colors**: The lock button success state and background colors use hardcoded hex values (`#F5A623`, `#0A1128`) injected via `style.*` property assignments. This violates the design DNA rule that no hardcoded hex values appear outside `src/cards.ts`.
- **opponentId UUID not validated**: `opponentId` is passed directly to `getOpponentBounties(opponentId)` without format validation. If an invalid ID is passed, any PostgREST filter interpolation inside that function could be at risk per the UUID validation rule.

---

## Agent 02

### getSelectedBountyId (line 17)
PASS. Pure read of `_selectedBountyId`. Stage 2 description fully accurate.

### resetBountyClaim (line 21)
PASS. Resets both module-level flags. Stage 2 description fully accurate.

### renderBountyClaimDropdown (line 30)
PARTIAL.

Confirmed claims:
- Async function accepting container, debateId, opponentId, opponentName.
- Writes loading state to `container.innerHTML` with `escapeHTML`-sanitized opponentName.
- Queries `#bounty-claim-inner`.
- `getOpponentBounties` failure → error in `inner`, early return.
- Empty array → no-bounties message, early return.
- Maps bounties to `<option>` elements with `data-fee` and `data-amount`; computes daysLeft.
- Renders full UI (select, preview, button, error, locked panel) into `inner`.
- `change` listener: blank → clear + disable; valid → preview + enable.
- `click` listener: `_attemptFeePaid` guard, `selectBountyClaim` call.
- Success path: set state, hide controls, show locked panel.
- Failure path: re-enable button, display error string from `result.error`.

Inaccuracies found:
1. Stage 2 described the initial write as "a loading skeleton." The actual write includes the full component shell including header markup; the skeleton description understates the initial render scope.
2. Rounding described as `amount * 0.95` rounded to two decimal places is ambiguous; the actual is `Math.round(... * 100) / 100`, a numeric result.
3. Bounty option content (`b.bounty_id`, `b.amount`, `b.attempt_fee`) is interpolated directly into `innerHTML` without passing through `escapeHTML`. If these values contain user-influenced content, this is an XSS surface.

needs_review:
- **Hardcoded hex colors**: `#F5A623` and `#0A1128` appear in inline style assignments inside the success path. Violates design DNA.
- **XSS on option content**: `b.bounty_id`, `b.amount`, and `b.attempt_fee` are interpolated into `innerHTML` without escaping. If these originate from user-controlled data, they create an XSS vector.
- **_attemptFeePaid singleton**: Module-level flag not cleared between renders. Callers must invoke `resetBountyClaim()` or the new render's lock button will silently no-op.
- **selectBountyClaim unhandled rejection**: The `await selectBountyClaim(bountyId, debateId)` call is not wrapped in try/catch. A thrown rejection would leave the button disabled with a spinner label and no error displayed to the user.

---

## Agent 03

### getSelectedBountyId (line 17)
PASS. Returns `_selectedBountyId`. No side effects. Stage 2 description accurate.

### resetBountyClaim (line 21)
PASS. Resets both flags. Stage 2 description accurate.

### renderBountyClaimDropdown (line 30)
PARTIAL.

Confirmed claims:
- Accepts four params, returns `Promise<void>`.
- Writes to `container.innerHTML` on entry with `escapeHTML`-wrapped opponentName.
- Queries `#bounty-claim-inner`.
- `getOpponentBounties` failure → error message → early return.
- Empty array → no-bounties message → early return.
- Builds `<option>` elements with daysLeft computed and clamped to 0.
- Renders full UI including select, preview, button (disabled), error div, locked panel.
- `change` listener: blank → clear/disable; valid → preview populated, button enabled.
- `click` listener: `_attemptFeePaid` check, blank selection check.
- `selectBountyClaim` call on click.
- Success: `_selectedBountyId` set, `_attemptFeePaid = true`, UI transitions to locked state.
- Failure: error message displayed, button restored.

Inaccuracies found:
1. Stage 2 did not mention that `opponentName` is uppercased (`.toUpperCase()`) before being passed to `escapeHTML`. The actual call order is `escapeHTML(opponentName.toUpperCase())` — the case transform happens before HTML escaping, not after.
2. On success, Stage 2 described hiding select/preview/button. The preview `<div>` is also hidden. Stage 2 agents captured this, but one agent's wording omitted it.
3. Stage 2 did not mention that the lock button's `textContent` is set to `'…'` (spinner indicator) when the click handler disables the button before the async call.
4. Stage 2 did not mention that `errEl.style.display = 'none'` is executed at the start of the click handler, hiding any previously displayed error before the async call begins.

needs_review:
- **_attemptFeePaid singleton**: Module-level, not reset between renders. Silent failure on new render if `resetBountyClaim()` not called.
- **lockBtn style not fully restored on failure**: On the failure path, the button has `disabled` removed and `textContent` restored, but `style.background` and `style.color` set during the success-setup phase are not explicitly reset. If they were applied before the async call, they remain on the button after failure.
- **opponentName.toUpperCase() before escapeHTML**: While `.toUpperCase()` on an already-escaped string vs. before escaping produces the same output for most inputs, the ordering `escapeHTML(s.toUpperCase())` is safer — this is already correct in the code, but Stage 2's description implied the inverse order in one agent's account.

---

## Agent 04

### getSelectedBountyId (line 17)
PASS. Pure read of `_selectedBountyId`. Stage 2 description accurate.

### resetBountyClaim (line 21)
PASS. Resets both module-level flags to initial values. Stage 2 description accurate.

### renderBountyClaimDropdown (line 30)
PARTIAL.

Confirmed claims:
- Async, four params, returns `Promise<void>`.
- `container.innerHTML` written on entry; `escapeHTML` applied to opponentName.
- `#bounty-claim-inner` queried.
- Error and empty-array early-return paths present.
- Option elements carry `data-fee`, `data-amount`; daysLeft computed from `expires_at`.
- Full UI rendered; `change` listener and `click` listener wired.
- `_attemptFeePaid` guard in click handler.
- Success path: state set, controls hidden, locked panel revealed.
- Failure path: button re-enabled, label restored, error string displayed.

Inaccuracies found:
1. Stage 2 omitted that the preview `<div>` is hidden on the success path alongside select and lock button. All three controls (select, preview, button) are hidden on success.
2. Stage 2 described rounding as `amt * 0.95` "rounded to two decimal places" — the actual implementation is `Math.round(b.amount * 0.95 * 100) / 100`, a numeric round not a string format operation.

needs_review:
- **errEl not cleared on `change`**: The error div is not hidden or cleared when the user changes the dropdown selection after a failed lock attempt. A stale error message remains visible while the user makes a new selection, which is misleading.
- **_attemptFeePaid singleton**: Module-level flag persists across re-renders. Missing `resetBountyClaim()` call before re-render silently blocks all future lock attempts.
- **Hardcoded hex colors**: Inline `style.background = '#F5A623'` and related hex assignments violate the design DNA constraint.

---

## Agent 05

### getSelectedBountyId (line 17)
PASS. Returns module-level `_selectedBountyId`. No side effects. Stage 2 description accurate.

### resetBountyClaim (line 21)
PASS. Resets both flags. Stage 2 description accurate.

### renderBountyClaimDropdown (line 30)
PARTIAL.

Confirmed claims:
- Accepts container, debateId, opponentId, opponentName; returns `Promise<void>`.
- Writes to `container.innerHTML` on entry; opponentName sanitized via `escapeHTML`.
- Queries `#bounty-claim-inner`.
- `getOpponentBounties` error → early return with error message.
- Empty array → early return with no-bounties message.
- Options built with `data-fee`, `data-amount`; daysLeft from `expires_at`, clamped to 0.
- Full UI rendered into `inner`.
- `change` listener: blank → clear preview + disable button; valid → populate preview + enable button.
- `click` listener: `_attemptFeePaid` guard + blank-selection guard.
- `selectBountyClaim` called after disabling button.
- Success: `_selectedBountyId` set, `_attemptFeePaid = true`, locked panel shown.
- Failure: button restored, error shown in `#bounty-claim-error`.

Inaccuracies found:
1. Stage 2 did not note that `opponentName.toUpperCase()` is called before being passed to `escapeHTML`. Order matters semantically: `escapeHTML(s.toUpperCase())` is the actual call.
2. Stage 2 omitted that the preview `<div>` is hidden alongside select and button on the success path.
3. Stage 2 described rounding as `amount * 0.95` rounded to two decimal places; actual is `Math.round(b.amount * 0.95 * 100) / 100`.

needs_review:
- **_attemptFeePaid idempotency gap**: `_attemptFeePaid` is set but never cleared except by `resetBountyClaim()`. A second call to `renderBountyClaimDropdown` on the same container (e.g., after an opponent switch) will produce a lock button that silently does nothing on click.
- **XSS on `b.bounty_id` in option `value` attribute**: `b.bounty_id` is a UUID from the server, but it is interpolated directly as the `value` attribute of an `<option>` element without escaping. If the server ever returns a non-UUID value (malformed response or injection), this attribute could carry unexpected content.
- **errEl behavior on retry after failure**: The error element is not hidden when the `change` listener fires. If the user fails a lock attempt and then changes the dropdown selection without a page refresh, the previous error message remains visible while a new valid bounty is selected.

---

## Consolidated Verdict

| Function | Result | Notes |
|---|---|---|
| getSelectedBountyId | PASS | All 5 agents: pure read, accurate description |
| resetBountyClaim | PASS | All 5 agents: synchronous reset, accurate description |
| renderBountyClaimDropdown | PARTIAL | All 5 agents: behavioral logic confirmed; inaccuracies in initial-render scope description, rounding notation, and omission of preview hide on success |

**Stage 2 FAILs**: 0

---

## needs_review (consolidated, de-duplicated)

1. **_attemptFeePaid module-level singleton** — `_attemptFeePaid` persists across calls to `renderBountyClaimDropdown`. If the caller does not invoke `resetBountyClaim()` between renders (e.g., when switching opponents), the lock button silently no-ops with no user feedback. This is a silent behavioral bug, not a crash.

2. **Hardcoded hex colors** — `#F5A623` and `#0A1128` are assigned directly to `style.background` and `style.color` inside the click handler. This violates the design DNA constraint that no hardcoded hex values appear outside `src/cards.ts`. The correct fix is to use `--mod-*` CSS variable tokens.

3. **selectBountyClaim unhandled rejection** — the `await selectBountyClaim(bountyId, debateId)` call inside the click handler is not wrapped in try/catch. A thrown (vs. returned-error) rejection will leave the button disabled with a spinner label indefinitely, with no error displayed. Users would have no way to recover without a page reload.

4. **XSS on bounty option content** — `b.bounty_id`, `b.amount`, and `b.attempt_fee` are interpolated into `innerHTML` (option element content and attributes) without passing through `escapeHTML`. If any of these values contain unexpected characters, this is an XSS surface. UUIDs and numerics from a trusted Supabase RPC are low risk in practice, but the pattern violates the stated rule.

5. **Error div not cleared on selection change** — `errEl` (the `#bounty-claim-error` element) is not hidden or cleared when the `change` listener fires. After a failed lock attempt, a stale error message remains visible while the user selects a different bounty, producing misleading UX.

6. **Preview div omitted from Stage 2 success-path description** — minor documentation gap (all 5 Stage 3 agents noted it): the preview `<div>` is hidden on the success path alongside select and lock button. Stage 2 described hiding "select/preview/button" but some agents' accounts omitted the preview. Confirmed: preview is hidden on success.
