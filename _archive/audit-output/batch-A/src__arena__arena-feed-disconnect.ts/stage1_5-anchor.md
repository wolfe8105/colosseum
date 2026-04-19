# Anchor List — arena-feed-disconnect.ts

Source: src/arena/arena-feed-disconnect.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. handleParticipantGone  (line 33)
2. handleDebaterDisconnect  (line 65)
3. handleDebaterDisconnectAsViewer  (line 105)
4. handleModDisconnect  (line 123)
5. modNullDebate  (line 141)
6. showDisconnectBanner  (line 176)

## Resolution notes
All five stage-1 agents agreed on exactly the same 6 function definitions. Both arbiter runs agreed. No reconciliation required. No candidates were excluded. Anonymous setTimeout callbacks are inner-scope and excluded. `void feedRealtimeChannel` and `void appendFeedEvent` (lines 187-188) are side-effect statements, not function definitions. Final count: 6 anchors.
