# Stage 1 Outputs — arena-feed-realtime.ts

## Agent 01

1. subscribeRealtime  (line 37)
2. unsubscribeRealtime  (line 79)

Exclusions: `startHeartbeat`, `stopHeartbeat`, `sendGoodbye`, `handleParticipantGone`, `modNullDebate` — imported from other modules, not defined here; re-export statements do not qualify. `setParticipantGoneCallback(handleParticipantGone)` — module-level expression statement, not a callable binding. Inline arrow functions passed to `.on(...)` — inline callbacks, not top-level named bindings.

## Agent 02

1. subscribeRealtime  (line 37)
2. unsubscribeRealtime  (line 79)

Exclusions: `setParticipantGoneCallback(handleParticipantGone)` — bare expression statement at module level; not a binding. `startHeartbeat`, `stopHeartbeat`, `sendGoodbye` — appear in `export { ... } from './arena-feed-heartbeat.ts'`; re-exports of imported bindings, not defined here. `modNullDebate` — same: re-exported from `./arena-feed-disconnect.ts`, not defined here. `handleParticipantGone` — imported, not defined here. `void currentDebate` — bare expression statement; not a binding. The arrow function callbacks inside `.on(...)` calls — inline anonymous callbacks, not top-level named bindings.

## Agent 03

1. subscribeRealtime  (line 37)
2. unsubscribeRealtime  (line 79)

Exclusions: `setParticipantGoneCallback`, `handleParticipantGone`, `startHeartbeat`, `stopHeartbeat`, `sendGoodbye`, `modNullDebate` — all imported, not defined here. `export { startHeartbeat, stopHeartbeat, sendGoodbye }` and `export { modNullDebate }` — re-exports of bindings defined in other files. `setParticipantGoneCallback(handleParticipantGone)` — module-level expression call, not a function definition. `void currentDebate` — expression statement. Inline `.on(...)` callbacks inside `subscribeRealtime` — anonymous callbacks passed as arguments, not top-level named bindings.

## Agent 04

1. subscribeRealtime  (line 37)
2. unsubscribeRealtime  (line 79)

Exclusions: `startHeartbeat`, `stopHeartbeat`, `sendGoodbye`: re-exported from `arena-feed-heartbeat.ts`, not defined here. `modNullDebate`: re-exported from `arena-feed-disconnect.ts`, not defined here. `handleParticipantGone`, `setParticipantGoneCallback`: imported, not defined here. Anonymous `.on(...)` callbacks inside `subscribeRealtime`: inline, not top-level named bindings. `void currentDebate` at line 92: expression statement, not a definition.

## Agent 05

1. subscribeRealtime  (line 37)
2. unsubscribeRealtime  (line 79)

Exclusions: Line 35 — `setParticipantGoneCallback(handleParticipantGone)` — module-level call expression (side-effect wiring), not a function definition. Lines 43–70 — `.on(...)` anonymous arrow callbacks inside `subscribeRealtime` — inline, not top-level named bindings. Line 88 — `export { startHeartbeat, stopHeartbeat, sendGoodbye } from './arena-feed-heartbeat.ts'` — re-exports; bodies defined in `arena-feed-heartbeat.ts`. Line 89 — `export { modNullDebate } from './arena-feed-disconnect.ts'` — re-export; body defined in `arena-feed-disconnect.ts`. Line 92 — `void currentDebate` — expression statement to suppress an unused-import warning, not a callable binding.
