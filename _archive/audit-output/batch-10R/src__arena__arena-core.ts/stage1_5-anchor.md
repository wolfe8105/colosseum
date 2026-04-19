# Anchor List — src/arena/arena-core.ts

Source: src/arena/arena-core.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. isPlaceholder  (line 36)
2. formatTimer  (line 40)
3. randomFrom  (line 46)
4. pushArenaState  (line 54)
5. _onPopState  (line 58)
6. init  (line 96)
7. getView  (line 139)
8. getCurrentDebate  (line 143)
9. destroy  (line 151)

## Resolution notes
Both arbiter runs agreed. Combined notes:

- `window.addEventListener('popstate', _onPopState)` (line 90): excluded — top-level statement (event listener registration), not a function definition.
- `ready.then(() => init()).catch(() => init())` (line 173): excluded — top-level promise chain statement, not a function definition.
- Inline callbacks inside `_onPopState` and `init` (dynamic import `.then()` handlers): excluded — inline callbacks passed as arguments, not top-level named bindings.
