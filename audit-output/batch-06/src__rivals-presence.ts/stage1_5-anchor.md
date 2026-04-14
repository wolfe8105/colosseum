# Anchor List — src/rivals-presence.ts

Source: src/rivals-presence.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. _injectCSS  (line 40)
2. _dismissPopup  (line 134)
3. _showNext  (line 148)
4. _queueAlert  (line 195)
5. _buildRivalSet  (line 204)
6. _startPresence  (line 219)
7. init  (line 280)
8. destroy  (line 292)

## Resolution notes

- rivalsPresence (line 312): const bound to object literal `{ init, destroy }`, not a function definition; excluded.
- PresencePayload: interface/type declaration, not a callable binding; excluded.
- Module-level let state variables (rivalSet, onlineRivals, alertQueue, alertActive, presenceChannel, initialized): plain value bindings, not functions; excluded.
- Inline callbacks inside _startPresence (presenceChannel.on and .subscribe callbacks): inner callbacks, not top-level named bindings; excluded.
- Inner .then callback inside _showNext: inner callback, not top-level; excluded.
