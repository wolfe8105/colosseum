# Anchor List — rivals-presence.ts

1. _injectCSS  (line 40)
2. _dismissPopup  (line 134)
3. _showNext  (line 148)
4. _queueAlert  (line 195)
5. _buildRivalSet  (line 204)
6. _startPresence  (line 219)
7. init  (line 280)
8. destroy  (line 292)

## Resolution notes

- rivalsPresence (line 312): `const rivalsPresence = { init, destroy } as const` — this is an object literal binding, not a function definition; excluded.
- Anonymous arrow callbacks inside `_dismissPopup` (setTimeout callbacks at lines 138–145): inner callbacks, not top-level.
- Anonymous arrow callbacks inside `_showNext` (addEventListener callbacks at lines 178–192): inline callbacks passed to addEventListener, not top-level.
- Anonymous arrow/async callback passed to `presenceChannel.subscribe` (line 260): inline callback argument, not top-level.
- Anonymous arrow callbacks on `presenceChannel.on` (lines 240, 253): inline callbacks passed to `.on()`, not top-level.
