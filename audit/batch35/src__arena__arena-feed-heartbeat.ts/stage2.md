# Stage 2 Outputs — arena-feed-heartbeat.ts

## Agent 01

### setParticipantGoneCallback
Assigns the parameter `fn` to the module-level variable `_onParticipantGone` (line 28). Synchronous, no branches, no other calls, no return value.

### startHeartbeat
First calls `stopHeartbeat()` (line 37). Reads `currentDebate` and calls `isPlaceholder()`; returns early if either fails (lines 39-40). Determines `myRole` from `debate.modView`, `debate.spectatorView`, `debate.role` (line 43). If not spectatorView, seeds `lastSeen['a']`, `lastSeen['b']`, and optionally `lastSeen['mod']` (if moderatorId and moderatorType === 'human') with `Date.now()` (lines 46-51). Calls `set_disconnectHandled(false)` (line 52). Defines inner `sendBeat` closure that checks `feedRealtimeChannel` and calls `feedRealtimeChannel.send(...)` with heartbeat payload. Calls `sendBeat()` immediately (line 64), then registers it via `setInterval` every `HEARTBEAT_INTERVAL_MS`, stored via `set_heartbeatSendTimer` (line 65). For non-spectators, registers a second interval calling `checkStaleness()` every 5000ms, stored via `set_heartbeatCheckTimer` (lines 68-70). Synchronous overall; intervals are scheduled but fire after return.

### stopHeartbeat
Reads `heartbeatSendTimer`; if truthy, calls `clearInterval()` and `set_heartbeatSendTimer(null)` (line 74). Reads `heartbeatCheckTimer`; if truthy, calls `clearInterval()` and `set_heartbeatCheckTimer(null)` (line 75). Deletes `lastSeen['a']`, `lastSeen['b']`, `lastSeen['mod']` (lines 76-78). Synchronous, no async work.

### sendGoodbye
Reads `currentDebate` and `feedRealtimeChannel`; returns early if either is falsy (lines 83-84). Determines `myRole` same way as `startHeartbeat` (line 85). Calls `feedRealtimeChannel.send(...)` with 'goodbye' event and role in payload (lines 87-91). Fire-and-forget; synchronous.

### checkStaleness
Reads `disconnectHandled`, returns early if true (line 95). Returns early if `phase` is 'finished' or 'vote_gate' (line 96). Reads `currentDebate`, returns early if falsy (lines 97-98). Returns early if `debate.concededBy` or `debate._nulled` are truthy (line 100). Reads `Date.now()` (line 102). For non-modView: reads opponent's role, reads `lastSeen[opponentRole]`; if timestamp exists and stale, calls `_onParticipantGone?.(opponentRole)` and returns (lines 105-111). For non-modView with human moderator: reads `lastSeen['mod']`; if stale, calls `_onParticipantGone?.('mod')` and returns (lines 115-121). Synchronous; optional-chained callback means no-op if `_onParticipantGone` is null.

## Agent 02

### setParticipantGoneCallback
Assigns `fn` to `_onParticipantGone`. Synchronous, no conditions.

### startHeartbeat
Calls `stopHeartbeat()` first. Reads `currentDebate`, calls `isPlaceholder()`, returns early if invalid. Computes `myRole` from debate properties. Seeds `lastSeen` with current timestamp for participants; sets `disconnectHandled` false. Defines `sendBeat` closure, calls it immediately, registers interval via `set_heartbeatSendTimer`. If non-spectator, registers staleness check interval via `set_heartbeatCheckTimer`. Synchronous.

### stopHeartbeat
Clears both intervals if truthy, nulls them via setters. Deletes lastSeen['a'], ['b'], ['mod'].

### sendGoodbye
Returns early if `currentDebate` or `feedRealtimeChannel` is falsy. Computes `myRole`. Broadcasts 'goodbye' via `feedRealtimeChannel.send()`. Fire-and-forget.

### checkStaleness
Returns early on: disconnectHandled, phase is finished/vote_gate, no debate, debate ended. Checks opponent staleness for non-modView, calls `_onParticipantGone?.(opponentRole)` if stale. Checks mod staleness for non-modView with human mod, calls `_onParticipantGone?.('mod')` if stale. At most one callback invocation per execution.

## Agent 03

### setParticipantGoneCallback
Writes `fn` to `_onParticipantGone` (line 28). Reads: parameter only. Writes: module-level `_onParticipantGone`. No other calls. Synchronous.

### startHeartbeat
Calls `stopHeartbeat()`. Returns early if `!currentDebate || isPlaceholder()`. Determines `myRole` from debate properties. Seeds `lastSeen` timestamps for 'a', 'b', and 'mod' (conditional on moderator config). Sets `disconnectHandled` false. Defines `sendBeat` inner function. Calls `sendBeat()` immediately. Sets heartbeatSendTimer interval. If non-spectatorView, sets heartbeatCheckTimer interval calling `checkStaleness()` every 5000ms. Synchronous.

### stopHeartbeat
Conditionally clears `heartbeatSendTimer` and `heartbeatCheckTimer` with `clearInterval()`, nulls via setters. Deletes lastSeen entries for 'a', 'b', 'mod'. Synchronous.

### sendGoodbye
Returns early if `!currentDebate || !feedRealtimeChannel`. Computes `myRole`. Calls `feedRealtimeChannel.send()` with 'goodbye' broadcast and role. Fire-and-forget. Synchronous.

### checkStaleness
Returns early if disconnectHandled, or phase is 'finished'/'vote_gate', or no debate, or debate ended. Computes current timestamp. Checks opponent staleness (non-modView): if `lastSeen[opponentRole]` stale, calls `_onParticipantGone?.(opponentRole)` and returns. Checks mod staleness (non-modView, human mod): if `lastSeen['mod']` stale, calls `_onParticipantGone?.('mod')` and returns. Synchronous.

## Agent 04

### setParticipantGoneCallback
Writes `fn` to `_onParticipantGone` (line 31). Synchronous, no other state read or written.

### startHeartbeat
Calls `stopHeartbeat()` first (line 37). Reads `currentDebate`, checks `isPlaceholder()`, returns early if invalid. Determines `myRole` from `debate.modView`, `debate.spectatorView`, `debate.role` (line 43). Seeds `lastSeen['a']`, `lastSeen['b']`, optionally `lastSeen['mod']` with current timestamp. Writes `disconnectHandled` false. Defines `sendBeat` closure. Calls `sendBeat()` immediately; sets heartbeatSendTimer interval. For non-spectators, sets heartbeatCheckTimer interval calling `checkStaleness()` every 5000ms. Synchronous.

### stopHeartbeat
Reads `heartbeatSendTimer` and `heartbeatCheckTimer`. Clears and nulls both if truthy. Deletes lastSeen keys 'a', 'b', 'mod'. Synchronous.

### sendGoodbye
Returns early if `currentDebate` or `feedRealtimeChannel` falsy. Determines `myRole`. Calls `feedRealtimeChannel.send()` with 'goodbye' event. Fire-and-forget. Synchronous.

### checkStaleness
Returns early if `disconnectHandled`, `phase` is 'finished'/'vote_gate', `currentDebate` falsy, or debate ended. Reads current time. Checks opponent timestamp for non-modView; calls `_onParticipantGone?.(opponentRole)` if stale. Checks mod timestamp for non-modView with human mod; calls `_onParticipantGone?.('mod')` if stale. Synchronous.

## Agent 05

### setParticipantGoneCallback
Writes `fn` to `_onParticipantGone` (line 31). Synchronous.

### startHeartbeat
Calls `stopHeartbeat()`. Reads `currentDebate`, checks `isPlaceholder()`, returns early if invalid. Determines `myRole`. Seeds `lastSeen` timestamps. Sets `disconnectHandled` false. Defines `sendBeat` closure. Calls `sendBeat()` immediately; sets heartbeatSendTimer interval. For non-spectators, sets heartbeatCheckTimer interval. Synchronous.

### stopHeartbeat
Clears both interval timers if truthy, nulls via setters. Deletes lastSeen 'a', 'b', 'mod'. Synchronous.

### sendGoodbye
Returns early if `currentDebate` or `feedRealtimeChannel` falsy. Determines `myRole`. Broadcasts 'goodbye' via `feedRealtimeChannel.send()`. Fire-and-forget. Synchronous.

### checkStaleness
Returns early on disconnectHandled, finished/vote_gate phase, no debate, debate ended. Checks opponent staleness (non-modView); calls `_onParticipantGone?.()` with opponent role if stale. Checks mod staleness (non-modView, human mod); calls `_onParticipantGone?.('mod')` if stale. Synchronous. No state mutations.
