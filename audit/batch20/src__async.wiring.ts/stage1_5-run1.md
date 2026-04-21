# Anchor List — async.wiring.ts

1. _wireTakeDelegation  (line 41)
2. _wirePredictionDelegation  (line 89)
3. _wireRivalDelegation  (line 147)

## Resolution notes

- `_wireTakeDelegation`: Confirmed. Top-level named `function` declaration. Routes 7 data-action values via delegated click listener on hot-takes container. Included.
- `_wirePredictionDelegation`: Confirmed. Top-level named `function` declaration. Wires both `click` and `input` listeners on predictions container; inline balance validation logic. Inline arrow callbacks excluded. Included.
- `_wireRivalDelegation`: Confirmed. Top-level named `function` declaration. Routes `profile` and `accept-rival` on rivals container. Included.
- All `import` bindings: Excluded — defined elsewhere, imported for use here only.
- `_registerWiring(...)` (line 170): Excluded — module-level call expression, not a binding definition.
- `_registerRivalWiring(...)` (line 171): Excluded — module-level call expression, not a binding definition.
- No interfaces, type aliases, or const value bindings in this file.
