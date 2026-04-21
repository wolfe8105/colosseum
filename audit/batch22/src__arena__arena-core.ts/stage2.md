# Stage 2 Outputs — arena-core.ts

## Agent 01

### _onPopState
Arrow function, no parameters, no return value. Registered as a popstate listener at module load (line 67). When invoked:

Removes three overlay elements unconditionally via optional-chained `getElementById(...).remove()`: `#arena-rank-overlay`, `#arena-ruleset-overlay`, `#arena-mode-overlay`. Reads `#mod-ruling-overlay`; if present, calls `clearInterval(_rulingCountdownTimer!)` (non-null assertion; `set__rulingCountdownTimer` is NOT called to null the module reference) then removes the overlay element.

Reads module-level `view`. If `view === 'room' || view === 'preDebate'`: calls `clearInterval(roundTimer!)` (non-null assertion), `clearInterval(_rulingCountdownTimer!)` (non-null assertion — second call possible if ruling overlay also existed), `stopReferencePoll()`, `stopOpponentPoll()`, `stopModStatusPoll()`. Then if `currentDebate?.mode === 'live'`, calls `cleanupFeedRoom()` and `leaveDebate()`. No cleanup for non-live modes (voice memo, text, AI) — no `cleanupPendingRecording()` call here.

If `view === 'queue'`: calls `clearQueueTimers()`. If `!isPlaceholder()`, fires `safeRpc('leave_debate_queue').catch((e) => console.warn(...))` — note `safeRpc` always resolves with `{data, error}` and never rejects; the `.catch()` will never fire; any server-side queue-leave error is silently dropped.

If `view === 'matchFound'`: calls `clearMatchAcceptTimers()` then `set_matchFoundDebate(null)`.

Finally, if `view !== 'lobby'`: fires `void import('./arena-lobby.ts').then(({ renderLobby }) => renderLobby())` — fire-and-forget; errors in the import or in `renderLobby()` are silently lost.

### init
Synchronous function, no parameters, returns void. First guard: `if (!FEATURES.arena) return`. Calls `injectCSS()`. Calls `set_screenEl(document.getElementById('screen-arena'))`. If `!screenEl` after setter: logs a console warning and returns.

Fires `void import('./arena-lobby.ts').then(({ renderLobby, showPowerUpShop }) => { renderLobby(); if (new URLSearchParams(window.location.search).get('shop') === '1') showPowerUpShop(); })` — fire-and-forget; errors silently lost; creates a new URLSearchParams instance inside the callback.

Reads `challengeCode` from `new URLSearchParams(window.location.search).get('joinCode')`. Reads `spectateId` from `new URLSearchParams(window.location.search).get('spectate')` — three separate URLSearchParams instances total across lines 84, 91, 92.

If `challengeCode`: replaces history state, fires `void joinWithCode(challengeCode.toUpperCase())` — no format validation on challengeCode before use; `spectateId` path validates with UUID regex (inconsistent).

Else if `spectateId` AND UUID regex `/^[0-9a-f]{8}-...-[0-9a-f]{12}$/i` passes: replaces history state, fires `void enterFeedRoomAsSpectator(spectateId)`.

Else: try block reads `localStorage.getItem('mod_pending_challenge')` into `pending`; if truthy, removes the key, replaces history state, fires `void joinWithCode(pending.toUpperCase())`. Catch block is empty (comment: localStorage blocked — ignore).

### getView
Synchronous accessor, no parameters. Returns the module-level `view` (type `ArenaView`). No state mutation, no async work, no error paths.

### getCurrentDebate
Synchronous accessor, no parameters. Returns `currentDebate ? { ...currentDebate } : null` — shallow spread copy when non-null, preventing callers from mutating module state. No async work, no error paths.

### destroy
Synchronous function, no parameters, returns void. If `currentDebate?.mode === 'live'`: calls `cleanupFeedRoom()` then `leaveDebate()`. Always calls `cleanupPendingRecording(null)` (null argument; cleans up any pending voice memo recording and ObjectURLs per comment). Always calls `resetState()` (clears ALL timers and resets all mutable state). Always calls `window.removeEventListener('popstate', _onPopState)` to unregister the module-load-time listener. No return value.

---

## Agent 02

### _onPopState
Arrow function registered on the global `window` popstate event at line 67. No parameters, no return value. On invocation: optionally removes three known overlay elements. Reads `#mod-ruling-overlay`; if found, clears the ruling countdown timer via non-null assertion (`clearInterval(_rulingCountdownTimer!)`) and removes the element — but does NOT call `set__rulingCountdownTimer(null)` to null the module reference. Then branches on module-level `view`:

- `'room' | 'preDebate'`: Clears `roundTimer!` (non-null) and `_rulingCountdownTimer!` (non-null, potentially second call on same timer), then calls three poll-stop functions. Conditionally calls `cleanupFeedRoom()` and `leaveDebate()` if `currentDebate?.mode === 'live'`. No cleanup invoked for voice-memo or text mode debates.
- `'queue'`: Calls `clearQueueTimers()`. Conditionally fires `safeRpc('leave_debate_queue').catch(console.warn)` — `safeRpc` always resolves; `.catch()` is dead code for normal paths; server errors silently dropped.
- `'matchFound'`: Calls `clearMatchAcceptTimers()`, nulls `matchFoundDebate`.

Unconditionally (if not lobby): fire-and-forgets `renderLobby()` via dynamic import — rejection silently lost.

### init
Checks feature flag, injects CSS, sets `screenEl`. If no element found, early-returns with warning. Then fire-and-forgets lobby render. Reads `joinCode` and `spectate` from URL query string. joinCode path: no client-side validation — passed directly to `joinWithCode().toUpperCase()`. spectate path: UUID-regex-gated before use. localStorage fallback for pending challenge code: try/catch silently ignores access errors, passes `pending.toUpperCase()` to `joinWithCode()`.

### getView
Returns `view`. Trivial accessor.

### getCurrentDebate
Returns shallow spread of `currentDebate` or null. Defensive copy prevents external mutation of module state.

### destroy
Conditionally cleans up live debate. Calls `cleanupPendingRecording(null)`. Calls `resetState()` to clear all timers and state. Removes popstate listener. No error paths; no async operations.

---

## Agent 03

### _onPopState
Exported const arrow function, no parameters. Registered via `window.addEventListener('popstate', _onPopState)` at module scope immediately after definition. Removes three aria overlays via optional-chained remove. Checks for mod-ruling-overlay: if present, calls `clearInterval(_rulingCountdownTimer!)` but skips `set__rulingCountdownTimer(null)` — module state `_rulingCountdownTimer` retains the stale dead handle. Reads `view` module state and branches:

`room/preDebate`: clears `roundTimer!` and `_rulingCountdownTimer!` (possible double-clear); calls stop functions for reference, opponent, mod-status polls; if `currentDebate.mode === 'live'` cleans up feed and WebRTC. Non-live modes (voicememo, text, AI) receive no mode-specific cleanup here — `cleanupPendingRecording` is absent.

`queue`: clears queue timers; conditionally fires `safeRpc('leave_debate_queue').catch(...)` — `safeRpc` never rejects normally; catch is dead; server error is lost.

`matchFound`: clears match timers, nulls matchFoundDebate.

If not lobby: fire-and-forgets dynamic import + renderLobby.

### init
Feature-gated. Injects CSS. Sets screenEl, returns early if absent. Fire-and-forgets lobby render with conditional shop auto-open. Extracts `joinCode` (no validation) and `spectate` (UUID-regex validated) from URL params — three separate URLSearchParams instances created. Handles pending localStorage challenge code in try/catch. All async branches fire-and-forget.

### getView / getCurrentDebate
Trivial read accessors. getCurrentDebate returns defensive spread copy.

### destroy
Conditionally cleans up live debate. Cleans pending recording. Resets all state. Removes popstate listener. Correct and complete.

---

## Agent 04

### _onPopState
Arrow function exported as const; wired to popstate at module load. Removes overlay elements. Checks ruling overlay — clears interval with non-null assertion but leaves `_rulingCountdownTimer` module state non-null (stale handle). Branches on view:

Room/preDebate: two non-null-asserted clearInterval calls (roundTimer, _rulingCountdownTimer), three poll cleanups, conditional WebRTC teardown. Voice memo mode back-navigation omits `cleanupPendingRecording()`.

Queue: timer cleanup + conditional `safeRpc('leave_debate_queue').catch()` — catch is unreachable under normal safeRpc behavior.

MatchFound: accept-timer cleanup + state null.

Fallback: dynamic-import renderLobby fire-and-forget.

### init
Feature flag → CSS inject → screenEl bind. Early return if no element. Async lobby load fire-and-forget. URL param extraction: challengeCode unvalidated; spectateId UUID-gated. localStorage pending challenge in try/catch. All branches void-cast.

### getView
Returns view. No issues.

### getCurrentDebate
Returns spread copy or null. Defensive. No issues.

### destroy
cleanupFeedRoom + leaveDebate if live. cleanupPendingRecording(null). resetState(). removeEventListener. No async, no errors. Correct.

---

## Agent 05

### _onPopState
Exported const arrow function; no parameters; registered at module load line 67; removed in destroy(). Cleans up three overlays unconditionally. Handles mod-ruling-overlay: clears countdown interval via non-null assertion; does NOT null the module-level `_rulingCountdownTimer` reference via `set__rulingCountdownTimer(null)` — stale handle persists in state. View branch:

`room/preDebate`: clears roundTimer! (non-null assert) and _rulingCountdownTimer! (non-null assert, may double-clear); stops reference/opponent/mod-status polls; for live mode only — calls cleanupFeedRoom and leaveDebate. For voicememo/text/AI modes, no mode-specific cleanup (no cleanupPendingRecording call) — voice memo recording would continue after back navigation.

`queue`: clearQueueTimers; if not placeholder, fires `safeRpc('leave_debate_queue').catch(e => console.warn(...))` — safeRpc resolves always, catch dead, server errors swallowed.

`matchFound`: clearMatchAcceptTimers; set_matchFoundDebate(null).

Non-lobby fallback: void import + renderLobby, errors swallowed.

### init
Feature flag, CSS, screenEl. Early return with warning if no element. Lobby fire-and-forget. joinCode from URL: no format check; spectateId from URL: UUID-regex validated — asymmetric validation. localStorage pending challenge: try/catch ignores failures. Three URLSearchParams instances created.

### getView / getCurrentDebate
Trivial read accessors. getCurrentDebate shallow-copies to prevent mutation. Both correct.

### destroy
Handles live debate teardown. cleanupPendingRecording(null). resetState() clears all timers and state (per comment). Removes popstate listener. Correct and complete.
