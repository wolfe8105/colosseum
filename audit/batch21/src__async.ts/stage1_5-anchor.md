# Anchor List — async.ts

Source: src/async.ts
Produced by: stage 1.5 (arbiter runs 1 and 2 agreed; no reconciliation)
Unresolved items: 0

1. init  (line 108)
2. getComposerHTML  (line 118)
3. _onDocClick  (line 165)
4. destroy  (line 176)

## Resolution notes

- `init` (line 108): Exported function. Feature-flagged state initializer. Spreads placeholder arrays into mutable state.
- `getComposerHTML` (line 118): Exported function. Returns hardcoded HTML template string for hot-take composer UI. Contains no user data.
- `_onDocClick` (line 165): Non-exported module-scope named const arrow function. Handles document-level delegation for `[data-action="post-take"]` buttons. Registered at line 170; cleaned up in `destroy()`.
- `destroy` (line 176): Exported function. Full lifecycle teardown — removes listener, resets all state fields to empty/null.
- All import bindings and re-exports (lines 24–102): Excluded — not defined in this file.
- `ModeratorAsync` const object (line 141): Excluded — facade/namespace aggregating already-defined functions; follows share.ts `ModeratorShare` precedent.
- Module-level side effects at lines 170 and 194: Not callable bindings.
- Both arbiter runs independently produced the same 4-entry anchor list.
