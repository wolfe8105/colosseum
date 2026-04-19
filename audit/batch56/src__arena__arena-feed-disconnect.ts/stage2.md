# Stage 2 Outputs — arena-feed-disconnect.ts

## Agent 01

### handleParticipantGone

The function accepts a `role` parameter (string) and returns void.

Reads `disconnectHandled` from arena-feed-state. If already true, returns immediately without further execution. Otherwise, writes to `disconnectHandled` by calling `set_disconnectHandled(true)`, marking that a disconnect has been processed (preventing duplicate handling).

Reads `currentDebate` from arena-state and stores it in a local `debate` variable. If `debate` is falsy, returns immediately. This protects against cases where no debate is active.

Reads three properties from the `debate` object — `concededBy`, `_nulled` — and compares the `phase` variable (read from arena-feed-state) to the string `'finished'`. If any of these conditions are true (debate already conceded, nulled, or in finished phase), returns immediately without cleanup or dispatcher logic.

Executes four cleanup operations in sequence: calls `clearFeedTimer()` (from arena-feed-machine-turns.ts), `stopTranscription()` (from arena-deepgram.ts), `clearInterimTranscript()` (from arena-feed-room.ts), and `stopHeartbeat()` (from arena-feed-heartbeat.ts) — all synchronous fire-and-go with no await. Reads `debate.modView` and `debate.spectatorView`; if both are falsy (meaning the user is an active debater), calls `setDebaterInputEnabled(false)`.

Role-based dispatch: if `role === 'mod'`, calls `handleModDisconnect(debate)` with void prefix (fire-and-forget async). If `role === 'a' || role === 'b'`: if `debate.modView` is truthy, calls `handleDebaterDisconnectAsViewer(debate, role as 'a' | 'b')` synchronously; else if `debate.spectatorView` is truthy, calls `handleDebaterDisconnectAsViewer(debate, role as 'a' | 'b')` synchronously; else calls `handleDebaterDisconnect(debate, role as 'a' | 'b')` with void prefix (fire-and-forget async). If `role` matches neither 'mod' nor 'a'/'b', the function returns without dispatching to any handler.

## Agent 02

### handleParticipantGone

The function begins with an idempotency guard that reads the `disconnectHandled` flag. If already `true`, the function returns immediately without any further execution, preventing duplicate disconnect handling. If the guard passes, the function writes `true` to `disconnectHandled` via `set_disconnectHandled()`, locking out all future invocations.

The function reads `currentDebate` into a local variable for repeated access. If `currentDebate` is falsy (null or undefined), the function returns early, preventing any teardown logic from executing when there is no active debate to clean up.

A second guarding check reads three fields from the `debate` object: `concededBy`, `_nulled`, and `phase`. If any condition indicates a terminal state (`concededBy` is truthy, `_nulled` is truthy, or `phase === 'finished'`), the function returns without proceeding.

Once both guards pass, the function executes a synchronous teardown sequence: `clearFeedTimer()` stops any active feed polling, `stopTranscription()` halts audio transcription, `clearInterimTranscript()` purges partial transcript data, and `stopHeartbeat()` disables the heartbeat mechanism. Reads `debate.modView` and `debate.spectatorView`; if neither viewer mode is active, calls `setDebaterInputEnabled(false)` writing to UI state.

Dispatches based on `role`: if `role === 'mod'`, invokes `handleModDisconnect(debate)` as fire-and-forget (void). For debater roles (`'a'` or `'b'`): reads `debate.modView` — if true, calls `handleDebaterDisconnectAsViewer(debate, role)` synchronously; else reads `debate.spectatorView` — if true, calls `handleDebaterDisconnectAsViewer(debate, role)` synchronously; else calls `handleDebaterDisconnect(debate, role)` as fire-and-forget (void).

## Agent 03

### handleParticipantGone

**Guard Clause 1 (Idempotency Gate):** Checks the module-level `disconnectHandled` boolean. If already `true`, returns immediately. If `false`, sets it to `true` via `set_disconnectHandled(true)`, locking out further invocations.

**State Read — Debate Reference:** Captures `currentDebate` from module-level state. If falsy, returns early.

**Guard Clause 2 (Already-Ending Check):** Checks three terminal-state conditions: `debate.concededBy`, `debate._nulled`, or `phase === 'finished'`. If any is true, returns without further action.

**Teardown Sequence:** Calls `clearFeedTimer()`, `stopTranscription()`, `clearInterimTranscript()`, and `stopHeartbeat()` in order — all synchronous. If the user is a debater (not `modView` and not `spectatorView`), calls `setDebaterInputEnabled(false)`.

**Role-Dispatch:** If `role === 'mod'`, invokes `handleModDisconnect(debate)` fire-and-forget (void). If `role === 'a' || role === 'b'`: if `debate.modView`, calls `handleDebaterDisconnectAsViewer(debate, role)` synchronously; else if `debate.spectatorView`, calls `handleDebaterDisconnectAsViewer(debate, role)` synchronously; else calls `handleDebaterDisconnect(debate, role)` fire-and-forget (void). If `role` is neither 'mod' nor 'a'/'b', no handler is invoked — function completes after teardown.

## Agent 04

### handleParticipantGone

**Idempotency guard:** Checks `disconnectHandled`. If already true, returns immediately to prevent duplicate execution. On first execution, sets `disconnectHandled = true` via `set_disconnectHandled(true)`, ensuring single execution.

**Debate existence guard:** Captures `currentDebate`. If null/undefined, returns early.

**Debate state guards:** Checks `debate.concededBy`, `debate._nulled`, or `phase === 'finished'`. If any hold, returns early.

**Synchronous teardown cascade:** Calls `clearFeedTimer()`, `stopTranscription()`, `clearInterimTranscript()`, `stopHeartbeat()` in sequence. Conditionally calls `setDebaterInputEnabled(false)` if `!debate.modView && !debate.spectatorView`.

**Role-based dispatch:** If `role === 'mod'`, calls `void handleModDisconnect(debate)` (async fire-and-forget). Else if `role === 'a' || role === 'b'`: if `debate.modView`, calls synchronous `handleDebaterDisconnectAsViewer(debate, role)`; else if `debate.spectatorView`, calls synchronous `handleDebaterDisconnectAsViewer(debate, role)`; else calls `void handleDebaterDisconnect(debate, role)` (async fire-and-forget).

## Agent 05

### handleParticipantGone

**Idempotency Guard & State Lock:** Checks `disconnectHandled`. If already true, returns immediately. On first entry, sets `disconnectHandled` to true via `set_disconnectHandled(true)`.

**Debate Null Guard:** Retrieves `currentDebate`. If no debate is active, returns early.

**Already-Ending Guard:** Checks `debate.concededBy`, `debate._nulled`, or `phase === 'finished'`. If any is true, returns without further action.

**Full Teardown Sequence:** Calls `clearFeedTimer()`, `stopTranscription()`, `clearInterimTranscript()`, `stopHeartbeat()` — all synchronous. Conditionally calls `setDebaterInputEnabled(false)` when `!debate.modView && !debate.spectatorView`.

**Role Dispatch Tree:** If `role === 'mod'`, invokes `handleModDisconnect(debate)` as async/void-fired operation. If `role === 'a' || role === 'b'`: if `debate.modView`, calls `handleDebaterDisconnectAsViewer(debate, role)` synchronously; else if `debate.spectatorView`, calls `handleDebaterDisconnectAsViewer(debate, role)` synchronously; else calls `handleDebaterDisconnect(debate, role)` as async/void-fired operation.
