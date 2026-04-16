# Anchor List — arena-lobby.ts

Source: src/arena/arena-lobby.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. renderLobby  (line 39)
2. loadLobbyFeed  (line 181)
3. showPowerUpShop  (line 246)

## Resolution notes

Both arbiter runs agreed. No reconciliation required.

- renderArenaFeedCard, renderAutoDebateCard, renderPlaceholderCards (line 297): re-exports from `./arena-lobby.cards.ts`, not defined in this file — excluded.
- Anonymous inline callbacks inside renderLobby and showPowerUpShop (addEventListener / forEach handlers): inner callbacks, not top-level named bindings — excluded.
