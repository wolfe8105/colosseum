# Anchor List — arena-core.ts

Source: src/arena/arena-core.ts
Produced by: stage 1.5 (arbiter, runs agreed)
Unresolved items: 0

1. _onPopState  (line 35)
2. init  (line 73)
3. getView  (line 116)
4. getCurrentDebate  (line 120)
5. destroy  (line 128)

## Resolution notes

- All five Stage 1 agents agreed on the anchor list; both arbiter runs confirmed against source.
- `_onPopState` is an exported const arrow function — qualifies as a top-level exported callable definition.
- Excluded: `window.addEventListener('popstate', _onPopState)` at line 67 — side effect registration, not a definition.
- Excluded: `ready.then(() => init()).catch(() => init())` at line 150 — auto-init side effect, not a definition.
- Excluded: all anonymous inline arrow callbacks nested inside anchor bodies.
- No class bodies, no overload signatures, no object-literal methods present.
