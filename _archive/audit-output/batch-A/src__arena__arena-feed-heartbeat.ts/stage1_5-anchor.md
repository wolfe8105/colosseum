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
All five stage-1 agents agreed on exactly the same 5 function definitions. Both arbiter runs agreed. No reconciliation required. No candidates were excluded. `_onParticipantGone` (let = null) and `sendBeat` (const inside startHeartbeat) were confirmed as non-qualifying. `checkStaleness` is included despite being non-exported — it is a top-level named function declaration.
