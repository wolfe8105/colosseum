# Anchor List — arena-feed-heartbeat.ts

Source: src/arena/arena-feed-heartbeat.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. setParticipantGoneCallback  (line 30)
2. startHeartbeat  (line 34)
3. stopHeartbeat  (line 73)
4. sendGoodbye  (line 82)
5. checkStaleness  (line 94)

## Resolution notes
Both runs agreed. sendBeat (line 55) excluded — inner helper inside startHeartbeat. setInterval callback at line 69 excluded — inline callback.
