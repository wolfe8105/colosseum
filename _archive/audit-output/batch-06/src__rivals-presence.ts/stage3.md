# Stage 3 Outputs — src/rivals-presence.ts

## Agent 01

### _injectCSS (line 40)
**Verification**: PASS
**Findings**: None. All claims confirmed across all five agents.
- Source line 41: `if (document.getElementById('rival-presence-css')) return;` — early-exit guard confirmed.
- Source lines 42–131: creates `<style>` element, sets `id = 'rival-presence-css'`, sets `textContent` to CSS string containing `rivalSlideIn`, `rivalSlideOut`, and all child class rules, appends to `document.head`. All confirmed.
- No module-level state written. Returns `void`. All confirmed.
**Unverifiable claims**: None.

### _dismissPopup (line 134)
**Verification**: PASS
**Findings**: None. All claims confirmed across all five agents.
- Source line 135: `document.getElementById('rival-alert-popup')` — early return if null, confirmed.
- Source line 137: `popup.classList.add('dismissing')` — confirmed.
- Source lines 138–145: outer `setTimeout` at 300ms; callback calls `popup.remove()`, sets `alertActive = false`, checks `alertQueue.length > 0`, schedules inner `setTimeout` at 600ms calling `_showNext`. Confirmed.
- Agent 04's note that "neither of the setTimeout handles is stored or clearable from outside this function" is a true observation.
**Unverifiable claims**: None.

### _showNext (line 148)
**Verification**: PASS
**Findings**: None. All claims confirmed across all five agents.
- All control flow, DOM operations, `safeName` derivation, innerHTML template, timers, and event listeners confirmed.
- Agent 01 correctly notes `safeName` is NOT passed through `escapeHTML()` — only `<>` stripped.
**Unverifiable claims**: None.

### _queueAlert (line 195)
**Verification**: PASS
**Findings**: None. All claims confirmed across all five agents.
- Source line 196: `alertQueue.push(payload)` — confirmed.
- Source line 197: `if (!alertActive) _showNext()` — confirmed.
**Unverifiable claims**: None.

### _buildRivalSet (line 204)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the `try/catch` structure, filtering logic, and `console.warn` on error. Confirmed.
- **Shared error across all agents**: All agents state that when `getMyRivals()` throws, `rivalSet` is left empty because `rivalSet.clear()` already ran. This is incorrect. `rivalSet.clear()` is on source line 207, inside the `try` block, after `const rivals = (await getMyRivals())` on line 206. If `getMyRivals()` rejects, the catch fires before `clear()` is ever reached, leaving `rivalSet` with its prior (stale) contents, not empty.
**Unverifiable claims**: None.

### _startPresence (line 219)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe: guards, channel teardown, `setAuth()` silent-catch, channel creation, join/leave listeners, subscribe callback SUBSCRIBED/CHANNEL_ERROR paths.
- Agent 03 describes the dynamic import as occurring "synchronously via `import()`" — self-contradictory. Source line 263: `const profile = (await import('./auth.ts')).getCurrentProfile()` — it is an awaited async import. PARTIAL for Agent 03 on this specific claim only.
**Unverifiable claims**: None.

### init (line 280)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the four guards, sequential awaits, and `initialized = true` set before awaiting.
- Agent 01/04 state that if `_buildRivalSet` throws the error propagates to `init` uncaught — technically correct per `init`'s code, but practically moot because `_buildRivalSet` has an internal `try/catch` with no rethrow and cannot throw to its caller under normal conditions.
**Unverifiable claims**: None.

### destroy (line 292)
**Verification**: PASS
**Findings**: None. All claims confirmed across all five agents.
- Channel removal, all state clears, DOM cleanup, bypasses dismiss animation — all confirmed.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

| Function | Agent 01 | Agent 02 | Agent 03 | Agent 04 | Agent 05 | Overall |
|---|---|---|---|---|---|---|
| `_injectCSS` | PASS | PASS | PASS | PASS | PASS | PASS |
| `_dismissPopup` | PASS | PASS | PASS | PASS | PASS | PASS |
| `_showNext` | PASS | PASS | PASS | PASS | PASS | PASS |
| `_queueAlert` | PASS | PASS | PASS | PASS | PASS | PASS |
| `_buildRivalSet` | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| `_startPresence` | PASS | PASS | FAIL(phrase) | PASS | PASS | PARTIAL |
| `init` | PASS | PASS | PASS | PASS | PASS | PARTIAL |
| `destroy` | PASS | PASS | PASS | PASS | PASS | PASS |

**Totals**: 6 PASS, 2 PARTIAL, 0 FAIL

**Agent disagreements**: Agent 03 used "synchronously via `import()`" for `_startPresence` subscribe callback — contradiction not shared by other agents. All other agents agreed.

## needs_review

- **`_showNext` partial-sanitization XSS surface (line 159)**: `safeName` strips only `<` and `>` via regex replace; it is not passed through `escapeHTML()`. Characters like `"`, `'`, and `&` are not encoded. User-supplied `display_name`/`username` are interpolated directly into `innerHTML`. CLAUDE.md security rule requires `escapeHTML()` for all user content entering `innerHTML`. This is a policy violation.

- **`_buildRivalSet` pre-clear failure preserves stale state (lines 206–207)**: If `getMyRivals()` rejects, `rivalSet.clear()` (line 207) is never called because it comes after the `await`. `rivalSet` retains whatever IDs were loaded in the prior init cycle. All Stage 2 agents described the error path as leaving the set empty — this is wrong.

- **`_startPresence` subscribe callback missing try/catch on `track()` (lines 263–267)**: When `status === 'SUBSCRIBED'`, the `await presenceChannel!.track(...)` call has no `try/catch`. A network failure here would cause an unhandled rejection inside the async callback. No Stage 2 agent flagged this.

- **`_dismissPopup` timers not cancellable on `destroy()` (lines 138–143)**: The 300ms and 600ms timers set inside `_dismissPopup` are anonymous and cannot be cancelled. If `destroy()` is called while a dismiss is in flight, the callbacks will still fire and attempt to call `_showNext()` after the module state has been reset.

- **`_dismissPopup` no `alertActive` reset on missing popup (line 136)**: If `getElementById('rival-alert-popup')` returns null but `alertActive` is `true`, the function returns without setting `alertActive = false`, permanently stalling the queue.

---

## Agent 02

### _injectCSS (line 40)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### _dismissPopup (line 134)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Agent 04 additionally notes "Neither of the setTimeout handles is stored or clearable from outside this function" — correct observation, confirmed by source.
**Unverifiable claims**: None.

### _showNext (line 148)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe core behavior — PASS on all major claims.
- Minor omission across all agents: none mention the optional chaining `?.addEventListener` on the button lookups (lines 178, 183). If button elements are not found in the DOM, the listener attachment silently fails. Not an inaccuracy but a structural detail all agents missed.
**Unverifiable claims**: None.

### _queueAlert (line 195)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### _buildRivalSet (line 204)
**Verification**: PARTIAL
**Findings**:
- **Shared error all agents**: All agents state that when `getMyRivals()` throws, `rivalSet` is left empty. Source lines 206–207 show `rivalSet.clear()` is called after the `await` — so if `getMyRivals()` rejects, `clear()` never runs and `rivalSet` retains stale prior state.
**Unverifiable claims**: None.

### _startPresence (line 219)
**Verification**: PARTIAL
**Findings**:
- Agent 03 "synchronously via `import()`" — inaccurate phrasing, `import()` is always async. Source line 263 confirms awaited dynamic import.
- All other claims accurate.
**Unverifiable claims**: None.

### init (line 280)
**Verification**: PARTIAL
**Findings**:
- All claims accurate. Agent 01's claim that `_buildRivalSet` can throw to `init` is misleading given `_buildRivalSet` has internal try/catch with no rethrow — but technically correct per `init`'s own code structure.
**Unverifiable claims**: None.

### destroy (line 292)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

| Function | Overall |
|---|---|
| `_injectCSS` | PASS |
| `_dismissPopup` | PASS |
| `_showNext` | PARTIAL |
| `_queueAlert` | PASS |
| `_buildRivalSet` | PARTIAL |
| `_startPresence` | PARTIAL |
| `init` | PARTIAL |
| `destroy` | PASS |

**Totals**: 4 PASS, 4 PARTIAL, 0 FAIL

## needs_review

1. **`_showNext` XSS exposure**: `safeName` interpolated directly into `innerHTML` with only `<>` stripped. `escapeHTML()` not called. Policy violation per CLAUDE.md.

2. **`_buildRivalSet` pre-clear failure preserves stale state**: If `getMyRivals()` rejects, `rivalSet.clear()` never runs. All agents described the post-failure state as empty — incorrect.

3. **`_dismissPopup` timer from `_showNext` not cancelled on `destroy()`**: `timer` is local to `_showNext`'s closure and persists after `destroy()` resets module state. The 8s auto-dismiss fires on a non-existent popup, but `alertActive`/queue state could be inconsistent.

---

## Agent 03

### _injectCSS (line 40)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### _dismissPopup (line 134)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### _showNext (line 148)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Agent 01 correctly flags `escapeHTML()` absence. All other observations accurate.
**Unverifiable claims**: None.

### _queueAlert (line 195)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### _buildRivalSet (line 204)
**Verification**: PARTIAL
**Findings**:
- All five agents shared the same error: `rivalSet.clear()` is inside the `try` block after the `await` (line 207), so a rejection from `getMyRivals()` leaves the set in prior state, not empty.
**Unverifiable claims**: None.

### _startPresence (line 219)
**Verification**: PARTIAL
**Findings**:
- Agent 03's "synchronously via `import()`" is a contradiction; `import()` is always async. Source line 263 confirms it is awaited. PARTIAL for Agent 03 on this wording.
- All other agents accurate.
**Unverifiable claims**: None.

### init (line 280)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### destroy (line 292)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

**Totals**: 6 PASS, 2 PARTIAL, 0 FAIL
- `_buildRivalSet`: PARTIAL (shared error all agents on throw-before-clear)
- `_startPresence`: PARTIAL (Agent 03 wording issue on dynamic import)

## needs_review

1. **`_buildRivalSet` error-path behavior**: All agents wrong on post-`getMyRivals()`-rejection state.
2. **`_showNext` XSS**: `safeName` not sanitized via `escapeHTML()`; only `<>` stripped.

---

## Agent 04

### _injectCSS (line 40)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### _dismissPopup (line 134)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### _showNext (line 148)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### _queueAlert (line 195)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### _buildRivalSet (line 204)
**Verification**: PARTIAL
**Findings**:
- Shared error: all agents claim post-rejection `rivalSet` is empty. Source lines 206–207 contradict this — `clear()` is after the `await`, so rejection skips `clear()` and leaves stale state.
**Unverifiable claims**: None.

### _startPresence (line 219)
**Verification**: PASS
**Findings**: All claims confirmed. Agent 03's "synchronously via `import()`" is mildly ambiguous but the surrounding description is accurate.
**Unverifiable claims**: None.

### init (line 280)
**Verification**: PASS
**Findings**: None. All claims confirmed. `initialized = true` before awaits confirmed as preventing concurrent double-init.
**Unverifiable claims**: None.

### destroy (line 292)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

**Totals**: 7 PASS, 1 PARTIAL, 0 FAIL — single shared PARTIAL on `_buildRivalSet`

## needs_review

- **`_showNext` XSS surface**: `safeName` in `innerHTML` without `escapeHTML()` — policy violation.
- **`_buildRivalSet` pre-clear failure**: All agents wrong about post-rejection `rivalSet` state.
- **`_startPresence` subscribe callback `track()` unhandled rejection**: No `try/catch` around `await presenceChannel!.track(...)` (lines 263–267). No Stage 2 agent flagged this.

---

## Agent 05

### _injectCSS (line 40)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### _dismissPopup (line 134)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### _showNext (line 148)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### _queueAlert (line 195)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### _buildRivalSet (line 204)
**Verification**: PARTIAL
**Findings**:
- **All five agents shared error**: All described post-`getMyRivals()`-rejection state as empty `rivalSet`. Incorrect — `rivalSet.clear()` (line 207) is inside `try` after the `await` (line 206), so a rejection leaves `rivalSet` with stale prior contents.
**Unverifiable claims**: None.

### _startPresence (line 219)
**Verification**: PASS
**Findings**: All confirmed. Agent 03's "synchronously via `import()`" is ambiguous phrasing but not a material claim error; rest of Agent 03's description accurate.
**Unverifiable claims**: None.

### init (line 280)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### destroy (line 292)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

| Function | Overall |
|---|---|
| `_injectCSS` | PASS |
| `_dismissPopup` | PASS |
| `_showNext` | PASS |
| `_queueAlert` | PASS |
| `_buildRivalSet` | PARTIAL |
| `_startPresence` | PASS |
| `init` | PASS |
| `destroy` | PASS |

**Totals**: 7 PASS, 1 PARTIAL, 0 FAIL

**The shared error** (`_buildRivalSet`): All five Stage 2 agents stated that after a `getMyRivals()` rejection, `rivalSet` would be empty because `rivalSet.clear()` had already run. Source lines 206–207 contradict this: `rivalSet.clear()` is sequenced after `await getMyRivals()`, so a rejection skips `clear()` entirely and `rivalSet` retains its prior state.

## needs_review

- **`_showNext` XSS surface (lines 158–159)**: All agents noted `safeName` only strips `<>`, not a full `escapeHTML()`. Policy violation per CLAUDE.md.
- **`_buildRivalSet` pre-clear failure preserves stale state**: Shared Stage 2 error — all agents wrong.
- **`_startPresence` subscribe callback missing try/catch on `track()` (lines 263–267)**: Unhandled rejection on `await presenceChannel!.track(...)`. No Stage 2 agent flagged.
- **`_dismissPopup` `alertActive` not reset on missing popup (line 136)**: If popup disappears from DOM by other means while `alertActive = true`, `_dismissPopup` returns silently without resetting `alertActive`, permanently stalling the queue.
