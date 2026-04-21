# Anchor List — async.render.takes.ts

1. _setWireTakes  (line 24)
2. loadHotTakes  (line 32)
3. _renderTake  (line 68)
4. _renderModeratorCard  (line 118)

## Resolution notes
- esc (line 15): excluded — alias binding to imported `escapeHTML`, not a new function definition.
- _wireTakes (line 22): excluded — variable holding an injected callback, not a function definition at this site.
- WireFn (line 21): excluded — type alias, not a callable binding.
