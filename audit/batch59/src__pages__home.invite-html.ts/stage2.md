# Stage 2 Runtime Walk — home.invite-html.ts

Anchor list: rewardLabel (9), rewardTypeLabel (19), rewardRowHtml (23), activityRowHtml (41)

---

## Agent 01

### rewardLabel (line 9)
Params: `milestone: number` → `string`.
Line 10: `if (milestone === 1) return 'Legendary Power-Up'`
Line 11: `if (milestone === 5) return 'Mythic Power-Up'`
Line 12: `if (milestone === 25) return 'Mythic Modifier'`
Line 13: fallthrough `return 'Mythic Power-Up'`
No DOM access, no async, no side effects. Pure mapping.
Observation: Milestone 5 and fallthrough both return `'Mythic Power-Up'` — milestone 5 path is unreachable-equivalent (same string), but not a bug.

### rewardTypeLabel (line 19)
Params: `type: InviteReward['reward_type']` → `string | undefined`.
Line 20: builds object literal inline, indexes by `type`. Returns `string` for known keys, `undefined` for unknown.
LANDMINE comment (LM-INVITE-001) documents the undefined-return risk for callers doing `.toUpperCase()`.
Line 30 caller (`rewardRowHtml`): `rewardTypeLabel(...) ?? 'Reward'` — safe, undefined handled.
No other callers in this file.

### rewardRowHtml (line 23)
Params: `r: InviteReward` → `string` (HTML template literal).
Line 24: `new Date(r.awarded_at).toLocaleDateString()` — if `r.awarded_at` is malformed, `new Date(...)` produces `Invalid Date`, `.toLocaleDateString()` returns `'Invalid Date'` string. Not XSS-exploitable (no user-controlled path through escapeHTML bypass).
Line 25-26: boolean branch on `r.pending_review` for `btnLabel`/`btnDisabled`.
Line 28: `escapeHTML(r.id)` — id XSS-safe.
Line 30: `escapeHTML(rewardTypeLabel(r.reward_type) ?? 'Reward')` — safe.
Line 31: `${r.milestone}` — no escapeHTML. `milestone` is typed `number`; numeric values are XSS-safe.
Line 32: `escapeHTML(date)` — date string from `.toLocaleDateString()`, safe.
Lines 35-36: `escapeHTML(r.id)` and `escapeHTML(r.reward_type)` — safe.
No findings.

### activityRowHtml (line 41)
Params: `a: ActivityEntry` → `string`.
Line 42: `new Date(a.event_at).toLocaleDateString()` — same Invalid Date note as above; not XSS risk.
Line 43: `a.username ? escapeHTML(a.username) : 'Someone'` — safe.
Lines 45-47: `name` interpolated into string literals. `name` is already HTML-escaped (line 43). Safe.
Line 50: `msg[a.status] ?? escapeHTML(a.status)` — if status unknown, falls back to escapeHTML. Safe.
Line 51: `${when}` — date string from `.toLocaleDateString()`. Safe.
No findings.

---

## Agent 02

### rewardLabel (line 9)
Sequential equality checks for milestone values 1, 5, 25. Returns static strings. Fallthrough returns 'Mythic Power-Up'.
Milestone 5 and fallthrough return identical string — code is correct but milestone === 5 branch is effectively redundant.
No error paths, no DOM, no async.

### rewardTypeLabel (line 19)
Single-expression function: object literal keyed by reward_type, returns string or undefined.
LM-INVITE-001 documented inline. The open landmine is that callers outside this file doing `.toUpperCase()` on the result will throw if reward_type is unrecognized.
Within this file, the only caller (`rewardRowHtml` line 30) uses `?? 'Reward'` — safe.

### rewardRowHtml (line 23)
Reads: `r.awarded_at`, `r.pending_review`, `r.id`, `r.reward_type`, `r.milestone`.
All string/unknown fields passed through `escapeHTML()` before innerHTML interpolation.
`r.milestone` (number) not escaped — correct, numbers are safe.
`btnLabel` and `btnDisabled` are string literals derived from boolean, not user input — safe.
OBSERVATION: `r.pending_review` is a boolean; the conditional produces either `'disabled'` or `''` — no injection path.

### activityRowHtml (line 41)
Reads: `a.event_at`, `a.username`, `a.status`.
`a.username` escaped on line 43, or replaced with literal 'Someone'.
`a.status` used as Record key (no injection) or escaped as fallback on line 50.
`when` is from Date API — not user-controlled in a meaningful way.
No findings.

---

## Agent 03

### rewardLabel (line 9)
Pure lookup. Three if-returns covering known milestone values; fallthrough covers all others.
Note: milestone=5 → 'Mythic Power-Up', fallthrough → 'Mythic Power-Up'. Both paths reach same string — not a defect.
No state read or write.

### rewardTypeLabel (line 19)
Returns `string | undefined`. Known-bad pattern (LM-INVITE-001).
Line 30 in `rewardRowHtml` guards with `?? 'Reward'`. Safe for this file's internal usage.

### rewardRowHtml (line 23)
Data path:
- `r.id` → `escapeHTML()` → data-reward-id attr (×2, lines 28, 35) ✓
- `r.reward_type` → `rewardTypeLabel()` → `?? 'Reward'` → `escapeHTML()` → span (line 30) ✓
- `r.reward_type` → `escapeHTML()` → data-reward-type attr (line 36) ✓
- `r.milestone` → unescaped numeric interpolation (line 31) — typed `number`, safe ✓
- `r.awarded_at` → `new Date().toLocaleDateString()` → `escapeHTML(date)` (line 32) ✓
- `r.pending_review` → boolean → static string literals (lines 25-26, 34) ✓
No findings.

### activityRowHtml (line 41)
Data path:
- `a.event_at` → `new Date().toLocaleDateString()` → `${when}` (line 51) — date string, safe ✓
- `a.username` → `escapeHTML()` or `'Someone'` (line 43) ✓
- `name` → into msg string values (lines 45-47) — already escaped ✓
- `a.status` → Record key lookup or `escapeHTML(a.status)` fallback (line 50) ✓
No findings.

---

## Agent 04

### rewardLabel (line 9)
Static three-branch equality check. Returns one of three string constants. Fallthrough returns same value as milestone=5 branch. Deterministic, no I/O.

### rewardTypeLabel (line 19)
Object index expression. Returns `undefined` for unknown keys.
Known landmine (LM-INVITE-001): callers that don't guard undefined will throw on `.toUpperCase()`.
`rewardRowHtml` guards correctly.

### rewardRowHtml (line 23)
All user-facing string fields from `r` are passed through `escapeHTML()`.
Numeric field `r.milestone` interpolated bare — typed number, not an XSS vector.
Boolean `r.pending_review` drives static string literals only.
Return value is a complete `<div>` fragment with a `<button>`. No event wiring here — wiring is caller's responsibility.

### activityRowHtml (line 41)
Username: escaped or static fallback.
Status: used as Record key (no injection risk) or escaped as fallback.
Date: API-produced string.
msg object entries embed `name` (already escaped); no double-escaping issue since these are pre-built strings, not re-escaped.
No findings.

---

## Agent 05

### rewardLabel (line 9)
Observation: milestone values 1, 5, 25 are a dense enum. If a new milestone is added (e.g., 10), the fallthrough silently returns 'Mythic Power-Up'. Acceptable — fallthrough is documented implicitly by the return value.
No error states, no external calls.

### rewardTypeLabel (line 19)
Returns undefined for unrecognized reward_type. LM-INVITE-001 is the existing documentation of this risk.
OBSERVATION: The open call-site risk (external callers doing `.toUpperCase()`) is a pre-existing documented landmine. Not a new finding.

### rewardRowHtml (line 23)
Full escapeHTML coverage on string fields from InviteReward.
`r.milestone` bare numeric interpolation (line 31) — safe for type `number`.
No async, no DOM read/write, returns string only.

### activityRowHtml (line 41)
`when` (line 51) is from `Date.toLocaleDateString()` — not escaped. Date API output is locale-formatted text with no HTML metacharacters under normal operation. Low theoretical risk but consistent with how all other date renders in this codebase treat Date API output.
OBSERVATION: Could add `escapeHTML(when)` for defense-in-depth, but not a real XSS vector given Date API output.
No findings that rise above LOW.
