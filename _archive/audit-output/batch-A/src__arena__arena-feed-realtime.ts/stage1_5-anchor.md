# Anchor List — arena-feed-realtime.ts

Source: src/arena/arena-feed-realtime.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. subscribeRealtime  (line 37)
2. unsubscribeRealtime  (line 79)

## Resolution notes
All five stage-1 agents agreed on exactly the same 2 function definitions. Both arbiter runs agreed. No reconciliation required. No candidates were excluded. Re-exported functions (`startHeartbeat`, `stopHeartbeat`, `sendGoodbye`, `modNullDebate`) and the module-level call expression `setParticipantGoneCallback(handleParticipantGone)` were confirmed as non-qualifying. Inline `.on(...)` callbacks inside `subscribeRealtime` are anonymous and not top-level named bindings.
