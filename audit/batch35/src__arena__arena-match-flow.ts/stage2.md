# Stage 2 Outputs — arena-match-flow.ts

## Agent 01

### onMatchAccept

This async function (line 20) begins by reading the module-level `matchAcceptTimer` and clearing it via `clearInterval()`, then setting `matchAcceptTimer` to null via `set_matchAcceptTimer`. It reads DOM elements `mf-accept-btn`, `mf-decline-btn`, and `mf-status`; disables and fades both buttons (opacity 0.5); and updates the status text to "Waiting for opponent…". If `matchFoundDebate` exists and is not a placeholder, it awaits `safeRpc('respond_to_match', { p_debate_id, p_accept: true })`. If the RPC returns an error, it updates the status to "Error — retrying…", re-enables both buttons, and returns early. Otherwise it enters a 1500ms polling loop via `setInterval`, stored in module state via `set_matchAcceptPollTimer`. Each tick increments `pollElapsed` by 1.5; if it exceeds `MATCH_ACCEPT_POLL_TIMEOUT_SEC`, it calls `onOpponentDeclined()` and returns. If `matchFoundDebate` is missing or is a placeholder, it calls `onMatchConfirmed()` and returns. A `_pollInFlight` flag prevents concurrent RPC calls; when clear, it awaits `safeRpc('check_match_acceptance', ...)`. If the response status is `'cancelled'`, it calls `onOpponentDeclined()`. If the opponent's ready flag is false, it calls `onOpponentDeclined()`. If both players' ready flags are true, it calls `onMatchConfirmed()`. Errors are caught silently; `_pollInFlight` is reset in finally.

### onMatchConfirmed

This synchronous function (line 72) calls `clearMatchAcceptTimers()` to stop all polling and timers, then reads the DOM element `mf-status` and updates its text to "✅ Both ready — entering battle!". If `matchFoundDebate` exists and `selectedWantMod` is true and is not a placeholder, it calls `safeRpc('request_mod_for_debate', ...)` without awaiting, with a `.catch()` handler that logs a warning. It sets `selectedWantMod` to false via `set_selectedWantMod`. Finally, it schedules a `setTimeout` at 800ms that calls `showPreDebate(matchFoundDebate!)` as fire-and-forget (void-wrapped).

### onOpponentDeclined

This synchronous function (line 85) calls `clearMatchAcceptTimers()`, reads `mf-status` DOM element and updates its text to "Opponent declined — returning to queue…", reads `mf-accept-btn` and `mf-decline-btn` and disables and fades both buttons (opacity 0.5). It then schedules a `setTimeout` at 1500ms that calls `returnToQueueAfterDecline()` as fire-and-forget.

## Agent 02

### onMatchAccept

`onMatchAccept` is an async function that reads module-level state `matchAcceptTimer` and `matchFoundDebate`, queries the DOM for `mf-accept-btn`, `mf-decline-btn`, and `mf-status`, and calls `isPlaceholder()`. It first clears and nulls the timer state. It disables both buttons (opacity 0.5) and sets the status to "Waiting for opponent…". If not in placeholder mode and `matchFoundDebate` exists, it awaits `safeRpc('respond_to_match', ...)`. If an error is returned, the status is updated to "Error — retrying…", buttons re-enabled, and the function returns early. After the RPC succeeds, it starts a 1500ms `setInterval` stored via `set_matchAcceptPollTimer`. The polling callback: increments `pollElapsed` by 1.5 per tick; calls `onOpponentDeclined()` if timeout exceeded; calls `onMatchConfirmed()` if placeholder or no `matchFoundDebate`; uses `_pollInFlight` to gate concurrent RPC calls; awaits `safeRpc('check_match_acceptance', ...)`; calls `onOpponentDeclined()` on cancelled status or opponent-not-ready; calls `onMatchConfirmed()` on both-ready. Errors are caught silently; `_pollInFlight` resets in finally.

### onMatchConfirmed

`onMatchConfirmed` is synchronous. It calls `clearMatchAcceptTimers()`, reads and updates the `mf-status` element to "✅ Both ready — entering battle!", reads `matchFoundDebate` and `selectedWantMod`. If both exist and not placeholder, it calls `safeRpc('request_mod_for_debate', ...)` fire-and-forget with a `.catch()` console warning handler. Sets `selectedWantMod` false via `set_selectedWantMod`. Schedules 800ms `setTimeout` calling `void showPreDebate(matchFoundDebate!)`.

### onOpponentDeclined

`onOpponentDeclined` is synchronous. It calls `clearMatchAcceptTimers()`, updates `mf-status` to "Opponent declined — returning to queue…", disables and fades both buttons, and schedules 1500ms `setTimeout` calling `returnToQueueAfterDecline()`.

## Agent 03

### onMatchAccept

This async function (line 20) begins by reading `matchAcceptTimer` from module state and clearing it via `clearInterval()`, then setting it to null. It reads DOM buttons `mf-accept-btn` and `mf-decline-btn` and disables them with opacity 0.5. It reads `mf-status` and sets its text to 'Waiting for opponent…'. It then reads `matchFoundDebate` and `isPlaceholder()` state; if not placeholder, awaits `safeRpc('respond_to_match', ...)` with the debate ID and acceptance flag true. If the RPC returns an error, it updates status to 'Error — retrying…', re-enables buttons, and returns early. If the RPC succeeds or was skipped, it initializes `pollElapsed = 0` and `_pollInFlight = false` and starts a 1500ms interval. The interval callback increments `pollElapsed` by 1.5 each tick; calls `onOpponentDeclined()` if timeout exceeded; calls `onMatchConfirmed()` if placeholder or no `matchFoundDebate`; gates on `_pollInFlight`; awaits `safeRpc('check_match_acceptance', ...)`; returns if error/no data; calls `onOpponentDeclined()` if cancelled or opponent not ready; calls `onMatchConfirmed()` if both ready. Exceptions caught silently; `_pollInFlight` reset in finally.

### onMatchConfirmed

This synchronous function (line 72) calls `clearMatchAcceptTimers()`. Reads DOM `mf-status` and sets text to '✅ Both ready — entering battle!'. Reads `matchFoundDebate`; if present reads `selectedWantMod` and `isPlaceholder()`. If mod request flag is true and not placeholder, calls `safeRpc('request_mod_for_debate', ...)` without awaiting, with a `.catch()` handler that logs console warnings. Sets `selectedWantMod` to false in module state. Schedules 800ms `setTimeout` that calls `showPreDebate(matchFoundDebate!)` void-wrapped.

### onOpponentDeclined

This synchronous function (line 85) calls `clearMatchAcceptTimers()`. Reads `mf-status` and sets text to 'Opponent declined — returning to queue…'. Reads `mf-accept-btn` and `mf-decline-btn` and disables both with opacity 0.5. Schedules 1500ms `setTimeout` that calls `returnToQueueAfterDecline()`.

## Agent 04

### onMatchAccept

`onMatchAccept` is async and reads from module-level state `matchAcceptTimer` and `matchFoundDebate`, DOM elements `mf-accept-btn`, `mf-decline-btn`, `mf-status`, and `isPlaceholder()`. Clears and nulls the timer; disables and fades buttons; updates status text. If `matchFoundDebate` exists and not placeholder, awaits `safeRpc('respond_to_match', ...)`. On error: updates status, re-enables buttons, returns early. Otherwise sets up a 1500ms `setInterval` stored via `set_matchAcceptPollTimer`. Polling callback: increments `pollElapsed` by 1.5; calls `onOpponentDeclined()` on timeout; calls `onMatchConfirmed()` on placeholder/no debate; gates with `_pollInFlight`; awaits `safeRpc('check_match_acceptance', ...)`; on cancelled or opponent-not-ready calls `onOpponentDeclined()`; on both-ready calls `onMatchConfirmed()`. Exceptions caught; `_pollInFlight` reset in finally.

### onMatchConfirmed

`onMatchConfirmed` is synchronous. Calls `clearMatchAcceptTimers()`. Updates `mf-status` to "✅ Both ready — entering battle!". If `matchFoundDebate` exists and `selectedWantMod` is truthy and not placeholder, calls `safeRpc('request_mod_for_debate', ...)` fire-and-forget with `.catch()` logging. Sets `set_selectedWantMod(false)`. Schedules 800ms `setTimeout` calling `void showPreDebate(matchFoundDebate!)`.

### onOpponentDeclined

`onOpponentDeclined` is synchronous. Calls `clearMatchAcceptTimers()`. Updates `mf-status` to "Opponent declined — returning to queue…". Disables and fades both buttons. Schedules 1500ms `setTimeout` calling `returnToQueueAfterDecline()`.

## Agent 05

### onMatchAccept

This async function starts by clearing the interval stored in `matchAcceptTimer` and setting that module-level state to null. It reads DOM elements 'mf-accept-btn', 'mf-decline-btn', and 'mf-status'; disables and fades both buttons; and sets the status text to 'Waiting for opponent…'. If `isPlaceholder()` is false and `matchFoundDebate` exists, it awaits `safeRpc('respond_to_match', ...)` with the debate id and `p_accept: true`. If the RPC returns an error, it updates status, re-enables buttons, and returns early. If successful or skipped, initializes `pollElapsed = 0` and `_pollInFlight = false`, then calls `setInterval` with a 1500ms interval, storing the ID via `set_matchAcceptPollTimer`. Each tick: increments `pollElapsed` by 1.5; if exceeds timeout calls `onOpponentDeclined()` and returns; if no `matchFoundDebate` or placeholder calls `onMatchConfirmed()` and returns; if `_pollInFlight` returns early; sets `_pollInFlight = true`, awaits `safeRpc('check_match_acceptance', ...)`; if error or no data returns early; examines response status and player ready flags — calls `onOpponentDeclined()` on cancelled or opponent not ready; calls `onMatchConfirmed()` if both ready. Exceptions caught silently; `_pollInFlight` reset in finally.

### onMatchConfirmed

This synchronous function calls `clearMatchAcceptTimers()`, reads and updates `mf-status` to '✅ Both ready — entering battle!', checks `matchFoundDebate`, reads `selectedWantMod` and `isPlaceholder()`. If mod request flag is true and not placeholder, calls `safeRpc('request_mod_for_debate', ...)` non-awaited with a `.catch()` console warning handler. Sets `selectedWantMod` to false via `set_selectedWantMod`. Schedules 800ms `setTimeout` calling `void showPreDebate(matchFoundDebate!)`.

### onOpponentDeclined

This synchronous function calls `clearMatchAcceptTimers()`, reads and updates `mf-status` to 'Opponent declined — returning to queue…', reads `mf-accept-btn` and `mf-decline-btn` and disables and fades both. Schedules 1500ms `setTimeout` calling `returnToQueueAfterDecline()`.
