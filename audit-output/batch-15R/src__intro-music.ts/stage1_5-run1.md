# Anchor List — src/intro-music.ts

1. _injectCSS  (line 19)
2. openIntroMusicPicker  (line 207)
3. _refreshSelected  (line 339)
4. _close  (line 347)
5. _saveIntroMusic  (line 357)

## Resolution notes

- `_cssInjected`: Excluded — it is a `let` boolean binding (`let _cssInjected = false`), not a function definition. All five agents correctly classified it as "bind name to value," not a function.
- No additional top-level function definitions were found during direct source scan that all five agents missed.
