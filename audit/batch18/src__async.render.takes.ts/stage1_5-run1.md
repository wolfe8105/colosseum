# Anchor List — async.render.takes.ts

1. _setWireTakes  (line 24)
2. loadHotTakes  (line 32)
3. _renderTake  (line 68)
4. _renderModeratorCard  (line 118)

## Resolution notes
- esc (line 15): excluded — alias binding to an imported function, not a new function definition.
- _wireTakes (line 22): excluded — uninitialized `let` variable typed as `WireFn | undefined`, not a function definition.
- WireFn (line 21): excluded — type alias, not a callable binding.
