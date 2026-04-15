# Anchor List — src/intro-music.ts

1. _injectCSS  (line 19)
2. openIntroMusicPicker  (line 207)
3. _refreshSelected  (line 339)
4. _close  (line 347)
5. _saveIntroMusic  (line 357)

## Resolution notes

- `_cssInjected` (line 18): excluded — `let` binding to a boolean value (`false`), not a function definition.
- Inline arrow callbacks on `.forEach`, `.addEventListener`, `.map` (lines 248, 272–279, 283–287, 294, 296–310, 314–327, 330–332, 340–341): excluded — callbacks passed inline to higher-order methods, not top-level named bindings.
