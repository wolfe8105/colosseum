# Anchor List — async.wiring.ts

Source: src/async.wiring.ts
Produced by: stage 1.5 (arbiter runs 1 and 2 agreed; no reconciliation)
Unresolved items: 0

1. _wireTakeDelegation  (line 41)
2. _wirePredictionDelegation  (line 89)
3. _wireRivalDelegation  (line 147)

## Resolution notes

- `_wireTakeDelegation`: Top-level named function. Routes delegated click events on the hot-takes container (react, challenge, share, become-mod, mod-signup, expand, profile actions).
- `_wirePredictionDelegation`: Top-level named function. Wires click and input delegation on the predictions container; validates wager amount against token balance.
- `_wireRivalDelegation`: Top-level named function. Routes delegated click events on the rivals container (profile, accept-rival actions).
- All import bindings: excluded — defined in other modules.
- `_registerWiring(...)` (line 170) and `_registerRivalWiring(...)` (line 171): excluded — module-level side-effect call expressions, not binding definitions.
- Inline arrow callbacks inside function bodies: excluded — anonymous, not top-level named bindings.
- No interfaces, type aliases, or const value bindings present in this file.
- Both arbiter runs independently produced the same 3-entry anchor list.
