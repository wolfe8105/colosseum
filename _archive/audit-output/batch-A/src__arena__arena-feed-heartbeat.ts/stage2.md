# Stage 2 Outputs — arena-feed-heartbeat.ts

## Agent 01

### setParticipantGoneCallback
`setParticipantGoneCallback` accepts a single parameter `fn`, a callback of type `(role: string) => void`, and has no guard conditions or return value. Its sole effect is to assign `fn` to the module-level variable `_onParticipantGone`, overwriting whatever was previously stored there (including `null`). No state from `arena-feed-state` or `arena-state` is read or written. This function exists purely as a registration hook so that an external caller — typically the disconnect orchestrator — can inject the handler that `checkStaleness` will invoke when it detects a stale participant. It returns `void`.

### startHeartbeat
`startHeartbeat` takes no parameters. It begins by unconditionally calling `stopHeartbeat()`, which clears any pre-existing send and check intervals and deletes all `lastSeen` entries, ensuring a clean slate before re-initializing. It then reads `currentDebate` from `arena-state`; if `currentDebate` is falsy or `isPlaceholder()` returns `true`, the function returns early with no further effect. Otherwise it derives `myRole` from the debate's flags: `'mod'` if `debate.modView`, `'spec'` if `debate.spectatorView`, or `debate.role` otherwise. If the debate is not a spectator view, it seeds `lastSeen['a']` and `lastSeen['b']` with the current timestamp, and also seeds `lastSeen['mod']` if `debate.moderatorId` is set and `debate.moderatorType` is `'human'`. It then calls `set_disconnectHandled(false)` to reset any prior disconnect flag. A closure `sendBeat` is defined that reads `feedRealtimeChannel` and, if it exists, calls `.send()` on it to broadcast a `heartbeat` event carrying the derived `myRole` and the current timestamp. `sendBeat` is invoked immediately (eager first beat), and then `setInterval(sendBeat, HEARTBEAT_INTERVAL_MS)` is started and stored via `set_heartbeatSendTimer`. Finally, if the view is not a spectator view, a second interval is started every 5 000 ms that calls `checkStaleness()`, and its handle is stored via `set_heartbeatCheckTimer`. The function returns `void`.

### stopHeartbeat
`stopHeartbeat` takes no parameters and returns `void`. It reads `heartbeatSendTimer` from `arena-feed-state`; if it is truthy it calls `clearInterval` on it and then `set_heartbeatSendTimer(null)`. It performs the identical sequence for `heartbeatCheckTimer` via `set_heartbeatCheckTimer(null)`. After clearing both intervals it unconditionally deletes the `'a'`, `'b'`, and `'mod'` keys from the `lastSeen` object, regardless of whether those keys were previously set. There are no guard conditions beyond the truthiness checks on the timer handles themselves. This function is designed to be idempotent — calling it when no heartbeat is running is safe.

### sendGoodbye
`sendGoodbye` takes no parameters and returns `void`. It reads `currentDebate` from `arena-state` and `feedRealtimeChannel` from `arena-state`; if either is falsy it returns immediately without sending anything. Otherwise it derives `myRole` using the same three-way flag check as `startHeartbeat` (`'mod'`, `'spec'`, or `debate.role`). It then calls `.send()` on `feedRealtimeChannel`, broadcasting a `goodbye` event whose payload carries only `{ role: myRole }` with no timestamp. This function does not modify any state variables and does not interact with the heartbeat timers or `lastSeen`; it is a one-shot fire-and-forget farewell signal intended to be called just before a participant intentionally leaves.

### checkStaleness
`checkStaleness` takes no parameters and returns `void`. It is a private function, called only by the interval established in `startHeartbeat`. It applies a series of early-exit guards in order: if `disconnectHandled` is `true` it returns immediately; if `phase` is `'finished'` or `'vote_gate'` it returns; if `currentDebate` is falsy it returns; if `debate.concededBy` or `debate._nulled` is set it returns. After all guards pass it reads the current timestamp. If the debate is not in `modView`, it computes the opponent's role (the opposite of `debate.role`), reads `lastSeen[opponentRole]`, and if that timestamp exists and is more than `HEARTBEAT_STALE_MS` milliseconds in the past, it fires `_onParticipantGone?.(opponentRole)` and returns, short-circuiting any further checks. If the opponent is not stale (or is a mod viewing), and the debate is not in `modView` and has a human moderator (`debate.moderatorId` set and `debate.moderatorType === 'human'`), it reads `lastSeen['mod']` and applies the same staleness threshold; if stale it fires `_onParticipantGone?.('mod')` and returns. Spectator-view debates are never the subject of staleness checks because the check timer is never started for them in `startHeartbeat`. The function writes no state directly — all consequence flows through the externally registered `_onParticipantGone` callback.

## Agent 02

### setParticipantGoneCallback
Stores a caller-supplied callback in the module-level `_onParticipantGone` variable. The callback accepts a role string (`'a'`, `'b'`, or `'mod'`) and is invoked later by `checkStaleness` when a participant's heartbeat goes silent. This is a simple setter with no immediate side effects; it merely registers the handler so the rest of the heartbeat machinery knows where to route disconnect notifications.

### startHeartbeat
Tears down any existing heartbeat timers first (via `stopHeartbeat`), then exits early if there is no current debate or if the debate is a placeholder. It resolves the local user's role to `'mod'`, `'spec'`, or the debate's own role string. For non-spectator sessions it seeds `lastSeen` with the current timestamp for both sides (`'a'` and `'b'`) and, when a human moderator is present, for `'mod'` as well — this prevents a false-stale detection before the first real beat arrives. It then clears the `disconnectHandled` flag, defines an inner `sendBeat` closure that broadcasts a `heartbeat` event carrying the role and current timestamp over `feedRealtimeChannel`, fires `sendBeat` immediately, and schedules it to repeat on `HEARTBEAT_INTERVAL_MS`. For non-spectator sessions it also starts a second interval that calls `checkStaleness` every 5 seconds. Spectators only send beats; they never run the staleness check.

### stopHeartbeat
Cancels both recurring intervals (the send timer and the check timer) and nulls their references via the state setters. It then deletes the `lastSeen` entries for all three roles (`'a'`, `'b'`, `'mod'`), fully resetting the staleness tracking table. This is called at the top of `startHeartbeat` to ensure a clean restart, and can be called independently to halt the heartbeat system entirely (e.g., when leaving a debate).

### sendGoodbye
Performs a one-shot broadcast of a `goodbye` event on `feedRealtimeChannel` when called. It resolves the local user's role the same way `startHeartbeat` does and sends the role in the payload. There are no timers or state changes; the function is a fire-and-forget signal that lets other participants know this user is intentionally leaving, as opposed to silently going stale. It exits early if there is no current debate or no realtime channel.

### checkStaleness
Runs on the 5-second interval established by `startHeartbeat` (non-spectators only). It is a no-op if `disconnectHandled` is already true, if the debate phase is `'finished'` or `'vote_gate'`, if there is no current debate, or if the debate has already been conceded or nulled. For debaters (non-mod view) it looks up the opponent's last-seen timestamp and fires `_onParticipantGone(opponentRole)` if the gap exceeds `HEARTBEAT_STALE_MS`, then returns. In the same non-mod branch, if a human moderator was assigned, it checks `lastSeen['mod']` against the same threshold and fires `_onParticipantGone('mod')` if stale. Only one participant-gone event is raised per check cycle because of the early `return` after each trigger.

## Agent 03

### setParticipantGoneCallback
Stores a callback function in the module-level `_onParticipantGone` variable. The callback accepts a role string (`'a'`, `'b'`, or `'mod'`) and is invoked later by `checkStaleness` when a participant's heartbeat goes stale. Calling this function a second time replaces any previously registered callback. No immediate side effects occur at registration time.

### startHeartbeat
Tears down any existing heartbeat timers first by calling `stopHeartbeat()`, then aborts early if there is no current debate or if the debate is a placeholder. Determines the local user's role (`'mod'`, `'spec'`, or the debate role `'a'`/`'b'`). For non-spectator sessions it seeds `lastSeen` for both debaters and, when a human moderator is present, for `'mod'` as well, using the current timestamp. Resets the `disconnectHandled` flag to `false`. Immediately broadcasts a heartbeat event on the realtime channel with the local role and current timestamp, then schedules that same broadcast to repeat on a `HEARTBEAT_INTERVAL_MS` interval stored as `heartbeatSendTimer`. For non-spectator sessions it also starts a second interval every 5 000 ms that calls `checkStaleness`, stored as `heartbeatCheckTimer`.

### stopHeartbeat
Clears both active intervals (`heartbeatSendTimer` and `heartbeatCheckTimer`) if they exist, setting each back to `null` via the corresponding setter. Then deletes all three `lastSeen` entries (`'a'`, `'b'`, `'mod'`), effectively resetting all presence tracking state. Safe to call even when no heartbeat is running, since it guards each clear with a truthiness check.

### sendGoodbye
Sends a one-shot broadcast event on the realtime channel with event type `'goodbye'` and a payload containing the local user's role, determined the same way as in `startHeartbeat` (`'mod'`, `'spec'`, or the debate role). Returns silently if there is no current debate or no realtime channel. This is a fire-and-forget signal intended to let other participants know the local user is deliberately leaving rather than silently going stale.

### checkStaleness
Called every 5 000 ms by the check timer installed in `startHeartbeat`. Returns immediately if disconnect has already been handled, if the debate phase is `'finished'` or `'vote_gate'`, if there is no current debate, or if the debate has already been conceded or nulled. For non-moderator views it looks up the opponent's last-seen timestamp and, if that timestamp exists and is older than `HEARTBEAT_STALE_MS`, fires `_onParticipantGone` with the opponent's role and returns. After that check, if a human moderator is assigned and the local view is not the mod view, it performs the same staleness test against `lastSeen['mod']`, firing `_onParticipantGone('mod')` if stale. Only one gone event is emitted per invocation due to the early returns.

## Agent 04

### setParticipantGoneCallback
Stores a caller-supplied callback into the module-level `_onParticipantGone` variable. The callback accepts a role string (`'a'`, `'b'`, or `'mod'`) and is invoked later by `checkStaleness` when a participant is determined to have gone silent. Calling this function a second time simply overwrites the previous registration with no cleanup of the old callback.

### startHeartbeat
Tears down any existing heartbeat timers first by calling `stopHeartbeat`, then bails out early if there is no current debate or if the debate is a placeholder. It resolves the local participant's role (`'mod'`, `'spec'`, or the debate's own `role` field) and, for non-spectator views, seeds the `lastSeen` map with the current timestamp for both debaters and, when a human moderator is present, for `'mod'` as well. It resets `disconnectHandled` to `false`. It then defines `sendBeat`, which broadcasts a `heartbeat` event carrying the local role and a fresh timestamp over the realtime channel, and fires it immediately once before scheduling it to repeat on `HEARTBEAT_INTERVAL_MS` via `setInterval`. For non-spectator sessions a second `setInterval` running every 5 seconds is also registered to call `checkStaleness` and detect silent peers.

### stopHeartbeat
Clears and nullifies both the send timer and the check timer if they are active, then deletes all three keys (`'a'`, `'b'`, `'mod'`) from the `lastSeen` map. After this call the module holds no active intervals and no recorded presence timestamps, making it safe to call `startHeartbeat` again cleanly or to tear down without leaking intervals.

### sendGoodbye
Performs a one-shot broadcast of a `goodbye` event on the realtime channel immediately before a participant navigates away or disconnects intentionally. It resolves the same role string as `startHeartbeat` (`'mod'`, `'spec'`, or `debate.role`) and sends it as the event payload. No timers are touched; this is a fire-and-forget signal so that peers can react instantly rather than waiting for the stale-detection window to expire.

### checkStaleness
Runs on the 5-second check interval and is the engine behind disconnect detection. It is a no-op if `disconnectHandled` is already true, if the debate phase is `'finished'` or `'vote_gate'`, if there is no current debate, or if the debate has already been conceded or nulled. For non-moderator views it looks up the opponent's last heartbeat timestamp and, if the gap exceeds `HEARTBEAT_STALE_MS`, fires `_onParticipantGone` with the opponent's role and returns immediately. If that check passes, and the debate has a human moderator, it performs the same staleness check against `lastSeen['mod']` and fires `_onParticipantGone('mod')` if that threshold is exceeded. Only one gone-event is emitted per invocation because each code path returns after firing, and subsequent calls are blocked by `disconnectHandled` once the caller sets it in response to the first event.

## Agent 05

### setParticipantGoneCallback
Stores the provided callback function in the module-level `_onParticipantGone` variable. This callback is later invoked by `checkStaleness` when a participant is detected as gone, receiving the role string (`'a'`, `'b'`, or `'mod'`) of the absent participant. Calling this function a second time overwrites any previously registered callback with no cleanup of the old one.

### startHeartbeat
Begins the two-timer heartbeat system for the local participant. It first calls `stopHeartbeat()` to clear any existing timers and prevent stacking on re-entry. It then bails out early if there is no current debate or if the debate is a placeholder. The local role is resolved from the debate state: `'mod'` if in mod view, `'spec'` if spectating, or the participant's own role otherwise. For non-spectator views, `lastSeen` timestamps for `'a'`, `'b'`, and (if a human moderator is present) `'mod'` are all initialized to the current time, and `disconnectHandled` is reset to `false`. A `sendBeat` closure is defined that broadcasts a `heartbeat` event on the realtime channel carrying the local role and the current timestamp. `sendBeat` is fired once immediately, then scheduled on a repeating interval via `set_heartbeatSendTimer` at `HEARTBEAT_INTERVAL_MS`. For non-spectator views only, a second interval is set via `set_heartbeatCheckTimer` to call `checkStaleness()` every 5000 ms.

### stopHeartbeat
Tears down both heartbeat timers unconditionally. It checks `heartbeatSendTimer` and `heartbeatCheckTimer`; if either exists, it calls `clearInterval` on it and resets the stored reference to `null` via the corresponding setter. It then deletes the `lastSeen` entries for all three roles (`'a'`, `'b'`, `'mod'`), effectively wiping the presence tracking state. This function is safe to call at any time, including when no timers are running.

### sendGoodbye
Broadcasts a one-shot `goodbye` event to the realtime channel on behalf of the local participant. It returns early if there is no current debate or no active realtime channel. The local role is resolved using the same three-way logic as `startHeartbeat` (`'mod'` / `'spec'` / own role). A broadcast message with event type `'goodbye'` and a payload containing just `{ role }` is sent. There is no timer or retry — this is a fire-and-forget signal intended to be called just before the participant leaves, giving peers a fast-path signal rather than waiting for staleness detection.

### checkStaleness
Runs on the 5-second check timer (non-spectator views only) and inspects the `lastSeen` map to detect absent participants. It returns early without action if `disconnectHandled` is already `true`, if the debate phase is `'finished'` or `'vote_gate'`, if there is no current debate, or if the debate has been conceded or nulled. For non-mod views, it checks whether the opponent's last heartbeat timestamp is older than `HEARTBEAT_STALE_MS`; if so, it fires `_onParticipantGone` with the opponent's role and returns. If the debate has a human moderator and the caller is not in mod view, it then checks the `'mod'` entry in `lastSeen`; if that timestamp is also stale, it fires `_onParticipantGone?.('mod')`. Only one gone event is emitted per invocation due to the early `return` after the opponent check.
