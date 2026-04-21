# Stage 1 — Primitive Inventory: async.wiring.ts

Source: src/async.wiring.ts (171 lines)
Agents: 5 (independent, parallel)
Consensus: unanimous — all 5 agents identified the same 3 callable bindings

---

## Callable Bindings (all agents agree)

- `_wireTakeDelegation` (line 41): Named function. Registers a delegated click listener on the hot-takes container; routes `data-action` attribute values (react, challenge, share, become-mod, mod-signup, expand, profile) to their respective handlers.
- `_wirePredictionDelegation` (line 89): Named function. Registers delegated click and input listeners on the predictions container; routes predict, wager-quick, wager-confirm, wager-cancel, standalone-pick, create-prediction actions; validates wager amount against token balance.
- `_wireRivalDelegation` (line 147): Named function. Registers a delegated click listener on the rivals container; routes profile and accept-rival actions.

---

## Excluded (all agents agree)

- Import statements (lines 1–36): not callable bindings defined in this file
- No interfaces or type aliases in this file
- No const value bindings (non-function) in this file
- Inline arrow `(e: Event) => {...}` click handler inside `_wireTakeDelegation` (line 42): anonymous inline callback
- Inline arrow `(result) => {...}` in `become-mod` `.then()` inside `_wireTakeDelegation`: anonymous inline callback
- Inline arrow `(e: Event) => {...}` click handler inside `_wirePredictionDelegation` (line 90): anonymous inline callback
- Inline arrow `(e: Event) => {...}` input handler inside `_wirePredictionDelegation` (line 130): anonymous inline callback
- Inline arrow `(e: Event) => {...}` click handler inside `_wireRivalDelegation` (line 148): anonymous inline callback
- Inline `() => void refreshRivals()` in `accept-rival` `.then()` inside `_wireRivalDelegation`: anonymous inline callback
- `_registerWiring(_wireTakeDelegation, _wirePredictionDelegation)` (line 170): module-level side-effect statement, not a binding
- `_registerRivalWiring(_wireRivalDelegation)` (line 171): module-level side-effect statement, not a binding

---

## Agent line number variation (minor, immaterial)

Agents 1–2 reported slightly different line numbers (38/81/135 and 37/71/121) vs. the source-verified lines (41/89/147). This is due to minor whitespace differences in the source snippets provided. Source-verified line numbers above are authoritative.
