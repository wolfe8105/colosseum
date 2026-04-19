# Anchor List — arena-feed-realtime.ts

Source: src/arena/arena-feed-realtime.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. subscribeRealtime  (line 38) [exported] [async]
2. unsubscribeRealtime  (line 87) [exported]

## Resolution notes
Both arbiter runs agreed. `subscribeRealtime` (line 38, async) and `unsubscribeRealtime` (line 87) are the only top-level function definitions. Top-level statements (`setParticipantGoneCallback(handleParticipantGone)` at line 36, `void currentDebate` at line 100) and re-exports (lines 96–97) correctly excluded.
