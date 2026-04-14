# Stage 3 Outputs — src/share.ts

## Agent 01

### getBaseUrl (line 58)
**Verification**: PASS
**Findings**: None. All claims confirmed. Reads `APP.baseUrl`, falls back to `window.location.origin`, no writes.
**Unverifiable claims**: None.

### getStableInviteUrl (line 66)
**Verification**: PASS
**Findings**: None. All agents correctly described cache-first return, dynamic import + safeRpc path, writes to `_cachedInviteUrl`/`_cachedRefCode` on success only, silent catch, fallback to `${getBaseUrl()}/moderator-plinko.html` without caching.
**Unverifiable claims**: None.

### share (line 83)
**Verification**: PASS
**Findings**: None. All three tiers confirmed: navigator.share → AbortError early return; non-abort swallowed; clipboard.writeText + showToast; textarea execCommand fallback + showToast. No state written.
**Unverifiable claims**: None.

### shareResult (line 114)
**Verification**: PASS
**Findings**: None. URL pattern, all defaults, title, fire-and-forget `void share(...)` confirmed.
**Unverifiable claims**: None.

### shareProfile (line 128)
**Verification**: PASS
**Findings**: None. URL construction, name resolution chain, numeric defaults, title, fire-and-forget confirmed.
**Unverifiable claims**: None.

### inviteFriend (line 143)
**Verification**: PASS
**Findings**: None. Fire-and-forget `.then()` chain, exact text string, title confirmed. Agents 04/05 note unhandled rejection if getStableInviteUrl rejects (no .catch) — accurate.
**Unverifiable claims**: None.

### shareTake (line 150)
**Verification**: PASS
**Findings**: None. URL, decodeURIComponent on takeText, text construction, title, fire-and-forget confirmed.
**Unverifiable claims**: None.

### showPostDebatePrompt (line 157)
**Verification**: PARTIAL
**Findings**:
- All agents correctly described FEATURES.shareLinks guard, dedup, _pendingShareResult write, won duck-type read, three buttons, backdrop listener, button listeners.
- **Agent 01 ordering error**: States modal is appended "Finally" after all listeners. Source: backdrop listener attached at line 203, `appendChild` at line 207, button listeners at lines 209–221. The append is not last — it comes after the backdrop listener and before the button listeners. Minor prose inaccuracy; no functional consequence.
- Agents 04/05 note optional chaining on getElementById calls — confirmed by source.
**Unverifiable claims**: None.

### handleDeepLink (line 228)
**Verification**: PASS
**Findings**: None. All three branches, localStorage writes, getCurrentUser guard, conditional safeRpc, setTimeouts confirmed. Agent 05 alone notes module-level auto-init `ready.then(() => handleDeepLink())` at line 281 — accurate and a substantive omission by Agents 01–04.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

| Function | A01 | A02 | A03 | A04 | A05 | Overall |
|---|---|---|---|---|---|---|
| getBaseUrl | PASS | PASS | PASS | PASS | PASS | PASS |
| getStableInviteUrl | PASS | PASS | PASS | PASS | PASS | PASS |
| share | PASS | PASS | PASS | PASS | PASS | PASS |
| shareResult | PASS | PASS | PASS | PASS | PASS | PASS |
| shareProfile | PASS | PASS | PASS | PASS | PASS | PASS |
| inviteFriend | PASS | PASS | PASS | PASS | PASS | PASS |
| shareTake | PASS | PASS | PASS | (omitted) | PASS | PASS |
| showPostDebatePrompt | PARTIAL | PASS | PASS | PASS | PASS | PARTIAL |
| handleDeepLink | PASS | PASS | PASS | PASS | PASS | PASS |

**Totals**: 8 PASS, 1 PARTIAL, 0 FAIL

**Disagreements**: Agent 01 minor ordering error on showPostDebatePrompt. Agent 05 alone captured auto-init context for handleDeepLink.

## needs_review

- **Auto-init omission (Agents 01–04 / handleDeepLink)**: `ready.then(() => handleDeepLink())` at line 281 means the function fires automatically once per page load after auth resolves. Only Agent 05 captured this.
- **`_cachedRefCode` set but never read in this file (line 74)**: Written on success path of getStableInviteUrl. No function in the file reads it back. May be consumed externally or may be vestigial dead state.

---

## Agent 02

### getBaseUrl (line 58)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### getStableInviteUrl (line 66)
**Verification**: PASS
**Findings**: None. All confirmed. Agent 02's note "never writes to `_cachedRefCode` on the error path" — accurate.
**Unverifiable claims**: None.

### share (line 83)
**Verification**: PASS
**Findings**: None. All three branches confirmed.
**Unverifiable claims**: None.

### shareResult (line 114)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### shareProfile (line 128)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### inviteFriend (line 143)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### shareTake (line 150)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### showPostDebatePrompt (line 157)
**Verification**: PARTIAL
**Findings**:
- All major behaviors confirmed.
- **Ordering error (all agents)**: All agents state the modal is appended then button event listeners are attached. Source shows backdrop listener at line 203 BEFORE `appendChild` at line 207, then button listeners at lines 209–221. The append is not the last step before button wiring; the backdrop listener comes first. Minor prose inaccuracy across all five agents.
- Agent 01's description explicitly says "append...Finally" — most wrong on ordering. Agents 02–05 leave ordering ambiguous or get it partially right.
**Unverifiable claims**: None.

### handleDeepLink (line 228)
**Verification**: PARTIAL
**Findings**:
- All core behaviors confirmed.
- **Agent 03 error on deviceId spread**: Agent 03 writes `safeRpc(...{ p_ref_code: ref, ...deviceId })` — spreading `deviceId` (a string or undefined) directly. Source line 243 uses `...(deviceId ? { p_device_id: deviceId } : {})` — a conditional object spread. Agent 03's phrasing is inaccurate on this specific detail.
- **Agent 05 uniquely notes auto-init** at line 281; Agents 01–04 omit it.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

**Totals**: PASS: 7, PARTIAL: 2, FAIL: 0

**Disagreements**:
- showPostDebatePrompt event listener ordering: all agents partially wrong, Agent 01 most wrong.
- handleDeepLink: Agent 03 mischaracterizes deviceId spread; only Agent 05 notes auto-init.

## needs_review

1. **`showPostDebatePrompt` event listener ordering**: backdrop listener is attached at line 203 before `appendChild` at line 207. No agent described this precisely.
2. **`_pendingShareResult` overwrite on concurrent calls**: second call to showPostDebatePrompt before share button is clicked overwrites the first result. No agent noted this.
3. **Module-level auto-init (line 281)**: Only Agent 05 described it. Agents 01–04 omitted it.

---

## Agent 03

### getBaseUrl (line 58)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### getStableInviteUrl (line 66)
**Verification**: PASS
**Findings**: None. Agent 02's note about success-only write to `_cachedRefCode` is accurate.
**Unverifiable claims**: None.

### share (line 83)
**Verification**: PASS
**Findings**: None. All branches confirmed.
**Unverifiable claims**: None.

### shareResult (line 114)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### shareProfile (line 128)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### inviteFriend (line 143)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### shareTake (line 150)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### showPostDebatePrompt (line 157)
**Verification**: PARTIAL
**Findings**:
- All core behaviors confirmed.
- **Ordering (Agent 01)**: same error as above. Agents 02–05 more accurate on ordering (modal appended at line 207, before button listeners).
- Source line 203 shows backdrop listener attached before `appendChild` at 207. No agent noted this exact detail.
**Unverifiable claims**: None.

### handleDeepLink (line 228)
**Verification**: PARTIAL
**Findings**:
- All core behaviors confirmed.
- **Agent 03 deviceId spread error**: writes `...deviceId` rather than `...(deviceId ? { p_device_id: deviceId } : {})`. Source line 243 uses the conditional form. All other agents describe it correctly.
- Only Agent 05 mentioned auto-init. Omission by Agents 01–04.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

**Totals**: PASS: 7, PARTIAL: 2, FAIL: 0

## needs_review

1. **`showPostDebatePrompt` event listener ordering** (line 203 vs 207): no agent precisely described the backdrop listener attaching before `appendChild`.
2. **`showPostDebatePrompt` hardcoded color in innerHTML** (line 175): `#132240` in gradient. CLAUDE.md lists `src/cards.ts` Canvas API as the only intentional hardcoded-hex exception. This may be a policy violation.
3. **Module-level auto-init** (line 281): four of five agents omitted.

---

## Agent 04

### getBaseUrl (line 58)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### getStableInviteUrl (line 66)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### share (line 83)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### shareResult (line 114)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### shareProfile (line 128)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### inviteFriend (line 143)
**Verification**: PASS
**Findings**: None. All confirmed. Agent 04 correctly notes unhandled rejection.
**Unverifiable claims**: None.

### shareTake (line 150)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### showPostDebatePrompt (line 157)
**Verification**: PARTIAL
**Findings**:
- All core behaviors confirmed.
- Same ordering issue: Agent 01 implies append is last; source shows backdrop listener (line 203) before append (line 207) before button listeners (lines 209–221).
- Agent 04 correctly notes optional chaining on getElementById.
**Unverifiable claims**: None.

### handleDeepLink (line 228)
**Verification**: PARTIAL
**Findings**:
- All core behaviors confirmed.
- Agent 03 deviceId spread error noted above.
- Agents 01–04 omit auto-init; only Agent 05 captures it.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

**Totals**: PASS: 7, PARTIAL: 2, FAIL: 0

## needs_review

- **`shareTake` decodeURIComponent error path**: a malformed percent-encoded string throws `URIError`. No try/catch exists. No agent flagged this edge case.
- **`_cachedRefCode` is written but never read in this file**: may be vestigial or consumed externally.
- **Auto-init**: four of five agents omitted the module-level `ready.then(() => handleDeepLink())` call.

---

## Agent 05

### getBaseUrl (line 58)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### getStableInviteUrl (line 66)
**Verification**: PASS
**Findings**: None. All confirmed. Agent 05 correctly notes `_cachedRefCode` written only on success.
**Unverifiable claims**: None.

### share (line 83)
**Verification**: PASS
**Findings**: None. All three tiers confirmed.
**Unverifiable claims**: None.

### shareResult (line 114)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### shareProfile (line 128)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### inviteFriend (line 143)
**Verification**: PASS
**Findings**: None. Unhandled rejection noted by Agents 04/05 — confirmed accurate.
**Unverifiable claims**: None.

### shareTake (line 150)
**Verification**: PASS
**Findings**: None. All confirmed.
**Unverifiable claims**: None.

### showPostDebatePrompt (line 157)
**Verification**: PARTIAL
**Findings**:
- All core behaviors confirmed.
- Ordering: Agent 01 most wrong; Agents 02–05 partially ambiguous. Source: backdrop listener (line 203) → appendChild (line 207) → button listeners (lines 209–221). No agent precisely matched this order.
- Hardcoded `#132240` gradient in innerHTML (line 175) — no agent noted this.
**Unverifiable claims**: None.

### handleDeepLink (line 228)
**Verification**: PARTIAL
**Findings**:
- All core behaviors confirmed.
- Agent 03 inaccuracy on deviceId spread noted.
- Agent 05 uniquely and correctly captured the auto-init behavior at line 281.
- Agent 03 also: `deviceId` is `string | undefined` after `?? undefined` coercion (line 241), not `string | null`. Agents 02/03 describe it as `string | null` — minor type inaccuracy.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

| Function | A01 | A02 | A03 | A04 | A05 | Overall |
|---|---|---|---|---|---|---|
| getBaseUrl | PASS | PASS | PASS | PASS | PASS | PASS |
| getStableInviteUrl | PASS | PASS | PASS | PASS | PASS | PASS |
| share | PASS | PASS | PASS | PASS | PASS | PASS |
| shareResult | PASS | PASS | PASS | PASS | PASS | PASS |
| shareProfile | PASS | PASS | PASS | PASS | PASS | PASS |
| inviteFriend | PASS | PASS | PASS | PASS | PASS | PASS |
| shareTake | PASS | PASS | PASS | PASS | PASS | PASS |
| showPostDebatePrompt | PARTIAL | PASS | PASS | PASS | PASS | PARTIAL |
| handleDeepLink | PASS | PASS | PARTIAL | PASS | PASS | PARTIAL |

**Totals**: 7 PASS, 2 PARTIAL, 0 FAIL

**Disagreements**:
- showPostDebatePrompt: Agent 01 ordering error. All others accurate on core behavior.
- handleDeepLink: Agent 03 deviceId spread mischaracterization. Agent 05 uniquely captured auto-init.

## needs_review

- **`showPostDebatePrompt` hardcoded color in innerHTML** (line 175): `#132240` in a gradient string — possible violation of the no-hardcoded-hex rule in CLAUDE.md.
- **`_cachedRefCode` is set but never read in share.ts**: possibly vestigial or used by external callers. Worth investigating.
- **`ready.then(() => handleDeepLink())` auto-init** (line 281): load-bearing module-level behavior described only by Agent 05.
- **`shareTake` — no error handling on `decodeURIComponent(takeText)`**: a malformed percent-encoded string would throw a `URIError`. No try/catch around this call. No Stage 2 agent flagged this.
