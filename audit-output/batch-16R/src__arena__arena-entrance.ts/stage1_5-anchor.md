# Anchor List — arena-entrance.ts

Source: src/arena/arena-entrance.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. _injectCSS  (line 25)
2. _getTier  (line 324)
3. playEntranceSequence  (line 342)
4. _esc  (line 403)
5. _renderTier1  (line 409)
6. _renderTier2  (line 436)
7. _renderTier3  (line 464)

## Resolution notes

Both arbiter runs agreed. No candidates excluded. All seven are top-level named function declarations confirmed in source. `_cssInjected` (line 23) is a plain value binding, not a function. Inline callbacks (Promise resolver, setTimeout callbacks) inside function bodies are not top-level bindings and are excluded.
