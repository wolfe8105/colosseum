# Anchor List — async.rivals.ts

1. _registerRivalWiring (line 21)
2. renderRivals (line 29)
3. refreshRivals (line 76)

## Resolution notes

- esc (line 12): alias binding to imported escapeHTML, not a new function definition.
- WireFn (line 18): type alias, excluded.
- _wireRivals (line 19): variable binding for callback slot, not a function definition.
- .map callback (lines 51-73): inline arrow callback, excluded as inner callback.
