# Anchor List — async.rivals.ts

1. _registerRivalWiring (line 21)
2. renderRivals (line 29)
3. refreshRivals (line 76)

## Resolution notes

- esc (line 12): binding to imported value, not a function definition.
- WireFn (line 18): type alias signature, excluded.
- _wireRivals (line 19): module-scoped variable for callback registration slot, not a function definition.
- .map callback (lines 51-73): arrow function in method chain, excluded as inner callback.
