# Anchor List — async.wiring.ts

1. _wireTakeDelegation  (line 41)
2. _wirePredictionDelegation  (line 89)
3. _wireRivalDelegation  (line 147)

## Resolution notes

- `_wireTakeDelegation`: Confirmed. Top-level named `function` declaration at line 41. Routes data-action clicks (react, challenge, share, become-mod, mod-signup, expand, profile) on hot-takes container.
- `_wirePredictionDelegation`: Confirmed. Top-level named `function` declaration at line 89. Registers `click` and `input` listeners; `input` listener validates wager amount against balance and toggles confirm button.
- `_wireRivalDelegation`: Confirmed. Top-level named `function` declaration at line 147. Routes `profile` and `accept-rival` actions on rivals container.
- `_registerWiring(...)` (line 170): Excluded — bare call expression (side effect), not a callable binding.
- `_registerRivalWiring(...)` (line 171): Excluded — bare call expression (side effect), not a callable binding.
- All import bindings: Excluded — none defined here.
- Inline arrow callbacks inside function bodies: Excluded — anonymous, not top-level, not independently callable.
- No interfaces, type aliases, enums, or const value bindings in this file.
- File exports nothing — three functions are module-private, used only in the side-effect calls at lines 170-171.
