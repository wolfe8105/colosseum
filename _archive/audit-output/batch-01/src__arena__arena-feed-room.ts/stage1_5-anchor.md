# Anchor List — arena-feed-room.ts

Source: src/arena/arena-feed-room.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. enterFeedRoom (line 115)
2. enterFeedRoomAsSpectator (line 215)
3. cleanupFeedRoom (line 249)

## Resolution notes

Both arbiter runs agreed. Three top-level exported function declarations confirmed by independent source inspection. Re-exports on lines 59–62 (`appendFeedEvent`, `addLocalSystem`, `writeFeedEvent`, `setDebaterInputEnabled`, `clearFeedTimer`, `clearInterimTranscript`) are forwarding declarations only — not defined in this file, excluded from anchor list. No reconciliation run needed.
