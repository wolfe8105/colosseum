# Stage 3 Verification — arena-core.ts

Source: src/arena/arena-core.ts (150 lines)
Anchors: _onPopState · init · getView · getCurrentDebate · destroy

---

## Agent 01

### _onPopState — FAIL

Walk accurate. Two confirmed findings:

```
ID: M-J1
Severity: Medium
Function: _onPopState
Lines: 41, 46
Issue: clearInterval(_rulingCountdownTimer!) called at lines 41 and 46 but set__rulingCountdownTimer(null) is never called; module state retains a stale dead timer handle, causing future if(_rulingCountdownTimer) guards to return a false positive.
Evidence: L41: `clearInterval(_rulingCountdownTimer!); rulingOverlay.remove();` — no set__rulingCountdownTimer(null). L46: same.
Fix: Call set__rulingCountdownTimer(null) immediately after each clearInterval call.
```

```
ID: M-J2
Severity: Medium
Function: _onPopState
Lines: 44–53
Issue: Back navigation from 'room'/'preDebate' view omits cleanupPendingRecording(); voice memo recording continues after user navigates back in non-live modes.
Evidence: The if(currentDebate?.mode === 'live') block at L50 only covers WebRTC teardown; no cleanupPendingRecording() call for voicememo/text/AI modes.
Fix: Call cleanupPendingRecording(null) unconditionally within the room/preDebate branch (before the mode check), matching what destroy() does at line 136.
```

```
ID: L-J1
Severity: Low
Function: _onPopState
Lines: 57
Issue: safeRpc('leave_debate_queue').catch() — safeRpc always resolves; .catch() is dead code; server-side queue-leave errors are silently dropped.
Evidence: `safeRpc('leave_debate_queue').catch((e) => console.warn('[Arena] leave_debate_queue failed:', e))`
Fix: Replace with `void safeRpc('leave_debate_queue')` or `safeRpc(...).then(({ error }) => { if (error) console.warn(...); })`.
```

```
ID: L-J2
Severity: Low
Function: _onPopState
Lines: 45, 46, 41
Issue: Non-null assertions on roundTimer and _rulingCountdownTimer — both may be null depending on what was started in the current view.
Evidence: `clearInterval(roundTimer!)` L45, `clearInterval(_rulingCountdownTimer!)` L41/46.
Fix: Use clearInterval(roundTimer ?? undefined) or check truthy before clearing; remove assertions.
```

```
ID: L-J5
Severity: Low
Function: _onPopState
Line: 65
Issue: void import('./arena-lobby.ts').then(…) — dynamic import rejection and renderLobby() errors are silently swallowed.
Evidence: `void import('./arena-lobby.ts').then(({ renderLobby }) => renderLobby())`
Fix: Add .catch(e => console.warn('[Arena] renderLobby failed:', e)).
```

### init — PARTIAL

Walk accurate. One confirmed finding:

```
ID: L-J3
Severity: Low
Function: init
Lines: 91–95
Issue: challengeCode from URL query string passed to joinWithCode() without client-side format validation; spectateId path validates with UUID regex (inconsistent defense-in-depth).
Evidence: `const challengeCode = new URLSearchParams(window.location.search).get('joinCode');` … `void joinWithCode(challengeCode.toUpperCase())`
Fix: Add a simple format check (e.g. /^[A-Z0-9]{4,16}$/.test) matching the expected code format before invoking joinWithCode.
```

```
ID: L-J4
Severity: Low
Function: init
Line: 81
Issue: void import('./arena-lobby.ts').then(…) — errors in lobby render fire-and-forget silently dropped.
Evidence: `void import('./arena-lobby.ts').then(({ renderLobby, showPowerUpShop }) => { renderLobby(); … })`
Fix: Add .catch(e => console.warn('[Arena] lobby render failed:', e)).
```

### getView — PASS
Walk accurate. Trivial read accessor. No findings.

### getCurrentDebate — PASS
Walk accurate. Defensive spread copy. No findings.

### destroy — PASS
Walk accurate. Correct teardown sequence: live cleanup, pending recording cleanup, full state reset, listener removal. No findings.

---

## Agent 02

### _onPopState — FAIL

Confirmed M-J1, M-J2, L-J1, L-J2, L-J5 (see Agent 01 definitions — identical findings).

Supplemental note on M-J1: The stale `_rulingCountdownTimer` handle affects any arena sub-module that reads this value from `arena-state.ts` to decide if a ruling countdown is active. Since the timer was already cleared, any `clearInterval` call on it is a no-op — but `if (modQueuePollTimer)` style guards would incorrectly fire.

### init — PARTIAL
Confirmed L-J3 and L-J4. Three separate `new URLSearchParams(window.location.search)` instances at lines 84, 91, 92 is a minor inefficiency (not a bug). No additional findings.

### getView — PASS

### getCurrentDebate — PASS

### destroy — PASS

---

## Agent 03

### _onPopState — FAIL

All five agents confirm the following consolidated findings: M-J1, M-J2, L-J1, L-J2, L-J5.

Additional note on M-J2: The project CLAUDE.md notes `cleanupPendingRecording(null)` is explicitly called in `destroy()` at line 136 for exactly this scenario. The `_onPopState` handler is the "user hits back" path — it should mirror destroy()'s recording cleanup for the room/preDebate case.

### init — PARTIAL
L-J3 and L-J4 confirmed.

### getView — PASS

### getCurrentDebate — PASS

### destroy — PASS

---

## Agent 04

### _onPopState — FAIL
Confirmed M-J1, M-J2, L-J1, L-J2, L-J5.

Note on L-J2 scope: `clearInterval(null)` and `clearInterval(undefined)` are safe browser no-ops. The practical risk of the non-null assertion is the TypeScript suppression of legitimate type-safety checking, not a runtime crash. Low severity is appropriate.

### init — PARTIAL
Confirmed L-J3, L-J4. No new findings.

### getView — PASS

### getCurrentDebate — PASS

### destroy — PASS

---

## Agent 05

### _onPopState — FAIL
Confirmed M-J1, M-J2, L-J1, L-J2, L-J5.

Note on M-J2 impact: In the voicememo debate mode, the user can record a voice response. If they hit the browser back button while recording, `_onPopState` runs without `cleanupPendingRecording()` — the MediaRecorder stays active and any ObjectURLs are not revoked, leaking memory and potentially causing a "microphone in use" indicator to persist in the browser tab.

### init — PARTIAL
Confirmed L-J3, L-J4.

### getView — PASS

### getCurrentDebate — PASS

### destroy — PASS

---

## Consolidated Findings

| ID    | Severity | Function      | Lines    | Summary |
|-------|----------|---------------|----------|---------|
| M-J1  | Medium   | _onPopState   | 41, 46   | clearInterval(_rulingCountdownTimer!) called without set__rulingCountdownTimer(null); stale dead handle causes false-positive guards elsewhere |
| M-J2  | Medium   | _onPopState   | 44–53    | Non-live back navigation omits cleanupPendingRecording(); voice memo recording leaks after user hits back |
| L-J1  | Low      | _onPopState   | 57       | safeRpc().catch() is dead code; server-side queue-leave errors silently dropped |
| L-J2  | Low      | _onPopState   | 41,45,46 | Non-null assertions on potentially-null timer handles (roundTimer!, _rulingCountdownTimer!) |
| L-J3  | Low      | init          | 91–95    | challengeCode passed to joinWithCode() without format validation; inconsistent with spectateId UUID-check |
| L-J4  | Low      | init          | 81       | void import().then(renderLobby) — errors silently swallowed |
| L-J5  | Low      | _onPopState   | 65       | void import().then(renderLobby) — errors silently swallowed |

All 5 agents: PASS on init (with Low findings L-J3, L-J4), getView, getCurrentDebate, destroy.
All 5 agents: FAIL on _onPopState (M-J1, M-J2, L-J1, L-J2, L-J5).
No disagreements. No reconciliation needed.
