# Anchor List — arena-lobby.ts

1. renderLobby  (line 39)
2. loadLobbyFeed  (line 181)
3. showPowerUpShop  (line 246)

## Resolution notes

- renderArenaFeedCard (line 297): re-exported from `./arena-lobby.cards.ts` via `export { ... } from`, not defined in this file — no binding or function body here
- renderAutoDebateCard (line 297): same — re-export only, not a definition in this file
- renderPlaceholderCards (line 297): same — re-export only, not a definition in this file
- async arrow callback on line 134 (`arena-become-mod-btn` click handler): inner callback passed to `addEventListener`, not a top-level named binding
- arrow callback on line 146 (`arena-join-code-btn` click handler): inner callback passed to `addEventListener`, not top-level named
- arrow callback on line 151 (`keydown` handler on joinCodeInput): inner callback passed to `addEventListener`, not top-level named
- arrow callback on line 159 (`arena-challenge-cta` click handler): inner callback passed to `addEventListener`, not top-level named
- arrow callback on line 168 (lobby `click` event delegation handler): inner callback passed to `addEventListener`, not top-level named
- async arrow callback on line 278 (`.powerup-buy-btn` forEach handler): inner callback passed to `addEventListener` inside `showPowerUpShop`, not top-level named
