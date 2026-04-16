# Anchor List — arena-lobby.ts

1. renderLobby  (line 39)
2. loadLobbyFeed  (line 181)
3. showPowerUpShop  (line 246)

## Resolution notes

- `renderArenaFeedCard`, `renderAutoDebateCard`, `renderPlaceholderCards` — re-exported via `export { ... } from './arena-lobby.cards.ts'` at line 297; they are not defined in this file, only re-exported, so they are excluded.
- Anonymous async arrow function passed to `addEventListener('click', async () => {...})` at line 134 — inner callback, not a top-level named binding; excluded.
- Anonymous arrow function passed to `addEventListener('click', () => {...})` at line 146 — inline callback; excluded.
- Anonymous arrow function passed to `addEventListener('keydown', ...)` at line 151 — inline callback; excluded.
- Anonymous arrow function passed to `addEventListener('click', ...)` at line 159 — inline callback; excluded.
- Anonymous arrow function passed to `lobby.addEventListener('click', ...)` at line 168 — inline callback; excluded.
- Anonymous async arrow function passed to `.forEach` on `.powerup-buy-btn` at line 278 — inline callback inside `showPowerUpShop`; excluded.
