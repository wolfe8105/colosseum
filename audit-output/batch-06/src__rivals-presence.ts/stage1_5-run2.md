# Anchor List — rivals-presence.ts

1. _injectCSS  (line 40)
2. _dismissPopup  (line 134)
3. _showNext  (line 148)
4. _queueAlert  (line 195)
5. _buildRivalSet  (line 204)
6. _startPresence  (line 219)
7. init  (line 280)
8. destroy  (line 292)

---

**Resolution notes**

- `rivalsPresence` (line 312) — excluded; it is a `const` bound to an object literal `{ init, destroy }`, not a function definition.
- `PresencePayload` — excluded; it is an interface (type declaration), not a callable binding.
- All module-level `let` state variables (`rivalSet`, `onlineRivals`, `alertQueue`, `alertActive`, `presenceChannel`, `initialized`) — excluded; plain value bindings, not functions.
- Inline callbacks inside `_startPresence` (the `presenceChannel.on(...)` arrow callbacks and the `.subscribe(async ...)` callback) — excluded; inner callbacks passed to method calls, not top-level named bindings.
- The `.then(({ showUserProfile }) => ...)` callback inside `_showNext` — excluded; inner callback, not a top-level named binding.
