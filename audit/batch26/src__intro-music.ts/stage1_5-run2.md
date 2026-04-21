# Anchor List — intro-music.ts (Run 2)

Source: src/intro-music.ts

1. _refreshSelected  (line 13)
2. _close            (line 20)
3. openIntroMusicPicker (line 26)

## Resolution notes

- All addEventListener callbacks are inner lambdas — not top-level.
- `saveIntroMusic`, `injectIntroMusicCSS`, `playIntroMusic`, `getCurrentProfile`, `escapeHTML`, `showToast` are imported, not defined here.
