# Anchor List — arena-core.ts

1. _onPopState  (line 35)
2. init  (line 73)
3. getView  (line 116)
4. getCurrentDebate  (line 120)
5. destroy  (line 128)

## Resolution notes

- Source scan confirmed exactly five top-level exported function-like definitions; no additional candidates found.
- `_onPopState` meets the anchor criterion: exported const binding holding an arrow function.
- Excluded: module-level side-effect expressions at lines 67 and 150 (not definitions).
- Excluded: all anonymous inline callbacks nested inside anchor bodies.
- Excluded: all imports, type imports, and comments.
- Both arbiter runs returned identical list; no discrepancies to reconcile.
