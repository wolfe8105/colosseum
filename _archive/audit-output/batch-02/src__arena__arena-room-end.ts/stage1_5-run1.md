# Anchor List — arena-room-end.ts (Arbiter Run 1)

1. endCurrentDebate  (line 32)
2. renderAfterEffects  (line 462)

## Resolution notes

- `renderChain` (line 481): inner function defined inside `renderAfterEffects` body — not top-level.
- `renderInventoryEvent` (line 501): inner function defined inside `renderAfterEffects` body — not top-level.
- All other identified names are imported, not locally defined.
- `friendlyError` imported but not visibly used — that's an import issue, not a function definition in this file.
