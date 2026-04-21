# Anchor List — arena-feed-wiring.ts

Source: src/arena/arena-feed-wiring.ts
Produced by: stage 1.5 (arbiter runs 1 and 2 agreed; no reconciliation)
Unresolved items: 0

1. renderControls  (line 26)

## Resolution notes

- `renderControls`: Exported top-level named function at line 26. Sets `controlsEl.innerHTML` to one of 3 role-specific HTML template branches (mod/spectator/debater), then calls the corresponding wire function (`wireModControls`, `wireSpectatorTipButtons`, `wireDebaterControls`).
- All import bindings (lines 12–23): Excluded — imported from other modules, not defined here.
- Wire function call-sites inside renderControls body: Excluded — invocations, not definitions.
- No module-level side effects, const function bindings, interfaces, type aliases, or enums.
- Both arbiter runs independently produced the same 1-entry anchor list.
