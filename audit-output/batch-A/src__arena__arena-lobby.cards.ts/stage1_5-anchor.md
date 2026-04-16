# Anchor List — arena-lobby.cards.ts

Source: src/arena/arena-lobby.cards.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. renderArenaFeedCard  (line 11)
2. renderAutoDebateCard  (line 40)
3. renderPlaceholderCards  (line 54)

## Resolution notes
All five stage-1 agents agreed on exactly the same 3 function definitions. Both arbiter runs agreed. No reconciliation required. The file contains exactly three exported top-level function declarations. The anonymous arrow callback at line 63 (inside `.map()` within `renderPlaceholderCards`) is inner scope and correctly excluded. No top-level non-exported functions or const/let arrow bindings exist. Final count: 3 anchors.
