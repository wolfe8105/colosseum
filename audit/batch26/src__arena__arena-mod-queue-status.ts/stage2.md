# Stage 2 Outputs — arena-mod-queue-status.ts

## Agent 01

### startModStatusPoll
Calls `stopModStatusPoll()` unconditionally, then calls `set_modRequestModalShown(false)`. Calls `set_modStatusPollTimer(setInterval(..., 4000))` to start a 4-second polling interval. Each tick of the interval first checks `view !== 'room'`; if true, calls `stopModStatusPoll()` and returns. Otherwise, awaits `safeRpc<ModStatusResult>('get_debate_mod_status', { p_debate_id: debateId })`. On error or missing data, returns. Casts `data` to `ModStatusResult`. If `result.mod_status === 'requested'` and `modRequestModalShown` is false, calls `showModRequestModal(result.moderator_display_name, result.moderator_id ?? '', debateId)`. If `result.mod_status === 'claimed'` or `'none'`, removes `#mod-request-modal` from the DOM and calls `stopModStatusPoll()`. Interval callback is wrapped in try/catch that silently discards exceptions. The function itself is synchronous (void return) despite the inner async callback.

### stopModStatusPoll
Checks if `modStatusPollTimer` is truthy. If so, calls `clearInterval(modStatusPollTimer)` and calls `set_modStatusPollTimer(null)`. Returns void.

### showModRequestModal
Calls `set_modRequestModalShown(true)`. Removes any existing `#mod-request-modal` element from the DOM. Initializes `secondsLeft = 30`. Creates a `div` element with `id="mod-request-modal"` and inline CSS fixing it to the viewport. Sets `modal.innerHTML` to a template literal that renders `modName` raw (no escapeHTML) in the moderator name `<div>`, a countdown display in `#mod-req-countdown`, and DECLINE / ACCEPT buttons. Appends the modal to `document.body`.

Starts a 1-second `setInterval` stored as `countdownTimer`. Each tick decrements `secondsLeft`, updates `#mod-req-countdown` textContent, and when `secondsLeft <= 0`, calls `clearInterval(countdownTimer)` and fire-and-forgets `handleModResponse(false, debateId, modal, modId, modName)` via `void`.

Attaches a click listener to `#mod-req-accept` that clears `countdownTimer` and fire-and-forgets `handleModResponse(true, ...)`. Attaches a click listener to `#mod-req-decline` that clears `countdownTimer` and fire-and-forgets `handleModResponse(false, ...)`.

Both button listeners are attached via `document.getElementById` (global, not scoped to the modal).

### handleModResponse
Async. Reads `#mod-req-accept` and `#mod-req-decline` via `document.getElementById`, casts to `HTMLButtonElement | null`. Disables both buttons if non-null. Awaits `safeRpc('respond_to_mod_request', { p_debate_id: debateId, p_accept: accept })`. On error: calls `modal.remove()`, calls `set_modRequestModalShown(false)`, returns. On success: calls `modal.remove()`. If `accept` is true, calls `stopModStatusPoll()`, and if `currentDebate` is non-null, mutates `currentDebate.moderatorId = modId` and `currentDebate.moderatorName = modName`. Calls `showToast('Moderator accepted — debate is now moderated')`. If `accept` is false, calls `set_modRequestModalShown(false)` (poll continues).

## Agent 02

### startModStatusPoll
Sets `modStatusPollTimer` to a new 4-second interval after first calling `stopModStatusPoll()` and `set_modRequestModalShown(false)`. Each interval tick: if `view !== 'room'`, calls `stopModStatusPoll()` and returns. Otherwise awaits `safeRpc<ModStatusResult>('get_debate_mod_status', { p_debate_id: debateId })`. Returns early on error or null data. On `mod_status === 'requested'` with `modRequestModalShown` false, calls `showModRequestModal`. On `mod_status === 'claimed'` or `'none'`, removes `#mod-request-modal` and calls `stopModStatusPoll()`. Exceptions silently caught with `/* retry next tick */`.

### stopModStatusPoll
Reads `modStatusPollTimer` module-level state. If set, calls `clearInterval` on it and `set_modStatusPollTimer(null)`.

### showModRequestModal
Sets `modRequestModalShown` true. Removes any existing `#mod-request-modal`. Creates a modal div appended to `document.body` with the moderator name `modName` interpolated raw into innerHTML (no escapeHTML). Starts a countdown timer (`setInterval` 1s) stored in local `countdownTimer`. On `secondsLeft <= 0`, clears interval and calls `void handleModResponse(false, ...)`. Wires ACCEPT/DECLINE buttons via `document.getElementById` (not scoped); each clears `countdownTimer` and fires `handleModResponse`. Returns void.

### handleModResponse
Async. Disables both ACCEPT/DECLINE buttons via `document.getElementById`. Awaits `safeRpc('respond_to_mod_request', ...)`. On error, removes modal and resets `modRequestModalShown`. On success, removes modal. If accepted, calls `stopModStatusPoll()` and updates `currentDebate.moderatorId`/`currentDebate.moderatorName` if `currentDebate` is non-null. Shows toast. If declined, resets `modRequestModalShown` and leaves the poll running.

## Agent 03

### startModStatusPoll
Takes `debateId: string`. Calls `stopModStatusPoll()` to clear any existing poll. Sets `modRequestModalShown` to false via setter. Sets a 4000ms interval: each iteration checks `view !== 'room'` (stops poll and returns if not room), then awaits `safeRpc` for `get_debate_mod_status`. On error/null, returns. On `requested` + not yet shown modal, calls `showModRequestModal`. On `claimed`/`none`, removes modal and stops poll. Catch block discards exceptions.

### stopModStatusPoll
Reads `modStatusPollTimer`. If truthy, clears interval and nulls the timer via setter.

### showModRequestModal
Takes `modName`, `modId`, `debateId`. Sets modal-shown flag. Removes any existing modal. Builds and appends a full-screen overlay with `modName` interpolated into innerHTML directly without escapeHTML. Countdown ticks every 1s; on expiry fires decline handler. Two buttons wired via global `getElementById`; both clear the interval and call `handleModResponse`. Function is synchronous (no async/await).

### handleModResponse
Async function. Disables both buttons. Awaits the RPC. On error: removes modal, resets shown flag. On success: removes modal; if accept is true, stops poll, mutates `currentDebate` fields, shows toast; if false, resets shown flag (poll continues on its own).

## Agent 04

### startModStatusPoll
Clears any existing poll via `stopModStatusPoll()`. Resets `modRequestModalShown` to false. Starts a new 4-second setInterval, stored via `set_modStatusPollTimer`. Each tick: if `view !== 'room'`, stops poll. Otherwise calls `safeRpc` for moderator status. On `mod_status === 'requested'` with modal not yet shown, calls `showModRequestModal`. On `claimed` or `none`, removes modal from DOM and stops poll. Exceptions silently swallowed.

### stopModStatusPoll
If `modStatusPollTimer` is truthy, calls `clearInterval` and sets timer to null.

### showModRequestModal
Sets shown flag. Removes existing modal. Creates modal element; sets innerHTML with `modName` unescaped. Appends to body. Starts 1-second countdown interval in local `countdownTimer`. When countdown reaches 0, auto-declines via `void handleModResponse(false, ...)`. ACCEPT/DECLINE buttons found by global `getElementById` and wired to `handleModResponse` with appropriate `accept` boolean. Countdown interval cleared on button click.

### handleModResponse
Async. Finds buttons by `document.getElementById`, disables them. Awaits `safeRpc('respond_to_mod_request', ...)`. Error path: removes modal, resets shown flag. Success path: removes modal. Accept=true: calls `stopModStatusPoll()`, updates `currentDebate.moderatorId` and `currentDebate.moderatorName` (guarded by null check on `currentDebate`), shows success toast. Accept=false: resets shown flag, leaving poll active.

## Agent 05

### startModStatusPoll
Calls `stopModStatusPoll()` first, then resets `modRequestModalShown` flag. Starts 4s setInterval via `set_modStatusPollTimer`. Inner async callback: if not in room view, stops poll and returns. Awaits `safeRpc` for `get_debate_mod_status`. Returns on error/null data. If status is `requested` and modal not shown, calls `showModRequestModal`. If status is `claimed` or `none`, removes `#mod-request-modal` and stops poll. Exceptions silently discarded.

### stopModStatusPoll
Guards on `modStatusPollTimer`, clears interval, sets to null via setter.

### showModRequestModal
Sets `modRequestModalShown` true. Removes existing modal. Creates div with `id="mod-request-modal"`, sets innerHTML containing unescaped `modName` at line 53. Appends to `document.body`. Starts 1-second countdown interval as local `countdownTimer`. At `secondsLeft <= 0`, clears interval and calls `void handleModResponse(false, ...)`. DECLINE/ACCEPT listeners attached via global `getElementById`. Each clears `countdownTimer` and calls `void handleModResponse` with appropriate boolean.

### handleModResponse
Async. Disables ACCEPT and DECLINE buttons via global `getElementById`. Awaits `safeRpc`. On error, removes modal, resets `modRequestModalShown`. On success (no error): removes modal. If `accept`: stops poll, mutates `currentDebate.moderatorId` and `.moderatorName` under null guard, calls `showToast`. If not `accept`: resets `modRequestModalShown`.
