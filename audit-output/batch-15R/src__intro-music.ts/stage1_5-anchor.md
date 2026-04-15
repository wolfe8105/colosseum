# Anchor List — src/intro-music.ts

Source: src/intro-music.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. _injectCSS  (line 19)
2. openIntroMusicPicker  (line 207)
3. _refreshSelected  (line 339)
4. _close  (line 347)
5. _saveIntroMusic  (line 357)

## Resolution notes

Both arbiter runs agreed on all 5 entries. No reconciliation needed.

Excluded candidates:
- `_cssInjected` (line 18): `let` binding to boolean `false`, not a function definition
- Inline arrow callbacks inside `openIntroMusicPicker`, `_refreshSelected` etc. (various lines): callbacks passed to `.forEach`, `.addEventListener`, `.map` — not top-level named bindings
