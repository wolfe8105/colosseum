# Anchor List — arena-room-setup.ts

Source: src/arena/arena-room-setup.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. showPreDebate  (line 34)
2. showPreDebateLoadout  (line 189)
3. enterRoom  (line 207)
4. _renderRoom  (line 231)

## Resolution notes

Both arbiter runs agreed on all four entries. No reconciliation needed.

- Anonymous async IIFE (inside _renderRoom): inner immediately-invoked expression, not a top-level named binding — excluded
- Anonymous addEventListener callbacks: inline callbacks, not top-level named bindings — excluded
- Anonymous promise chain callbacks (.then/.catch/.finally): inline callbacks — excluded
- onSilence / onShield / onReveal object literal methods inside _renderRoom: inline callbacks passed to wireActivationBar — excluded
