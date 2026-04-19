# Anchor List — arena-private-lobby.ts

Source: src/arena/arena-private-lobby.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. createAndWaitPrivateLobby  (line 27)
2. startPrivateLobbyPoll  (line 130)
3. onPrivateLobbyMatched  (line 178)
4. cancelPrivateLobby  (line 201)

## Resolution notes

Both arbiter runs agreed. No reconciliation required.

- Anonymous inline callbacks (addEventListener, setTimeout, setInterval, .then/.catch): inner callbacks, not top-level named bindings — excluded.
- All five stage 1 agents identified the same four functions.
