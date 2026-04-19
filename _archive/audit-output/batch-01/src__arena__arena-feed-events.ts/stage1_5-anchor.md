# Anchor List — arena-feed-events.ts

Source: src/arena/arena-feed-events.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. appendFeedEvent  (line 34)
2. addLocalSystem  (line 273)
3. writeFeedEvent  (line 283)

## Resolution notes

Both arbiter runs agreed. Three top-level exported function declarations confirmed by source inspection. All inner callbacks and anonymous functions excluded. `writeFeedEvent` is async; `appendFeedEvent` and `addLocalSystem` are synchronous.
