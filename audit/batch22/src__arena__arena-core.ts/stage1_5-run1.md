# Anchor List — arena-core.ts

1. _onPopState  (line 35)
2. init  (line 73)
3. getView  (line 116)
4. getCurrentDebate  (line 120)
5. destroy  (line 128)

## Resolution notes

- All five Stage 1 agents agreed on the same five anchors; both arbiter runs confirmed against source.
- `_onPopState` is an `export const` arrow function — qualifies as a top-level exported callable definition.
- Excluded: `window.addEventListener('popstate', _onPopState)` at line 67 — side effect, not a definition.
- Excluded: `ready.then(() => init()).catch(() => init())` at line 150 — module auto-init side effect, not a definition.
- Excluded: inline arrow callbacks inside `_onPopState` body (`.then(({ renderLobby }) => ...)` at line 65, `.catch(e => ...)` at line 57) — anonymous inline callbacks.
- Excluded: inline `.then(({ renderLobby, showPowerUpShop }) => ...)` in `init` at line 81 — anonymous inline callback.
- No class bodies, no overload signatures, no object-literal methods present in source.
