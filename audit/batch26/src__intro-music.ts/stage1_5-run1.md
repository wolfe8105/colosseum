# Anchor List — intro-music.ts (Run 1)

Source: src/intro-music.ts

1. _refreshSelected  (line 13)
2. _close            (line 20)
3. openIntroMusicPicker (line 26)

## Resolution notes

- Inner event listener callbacks (forEach, click, change, save click, backdrop click) are inner callbacks, not top-level bindings.
