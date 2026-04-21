# Anchor List — src/arena/arena-mod-refs-ruling.ts

1. `showRulingPanel` — line 10
2. `startReferencePoll` — line 107
3. `stopReferencePoll` — line 118

## Resolution notes

- Imports (`ruleOnReference`, `escapeHTML`, `friendlyError`, `_rulingCountdownTimer`, `set__rulingCountdownTimer`, `referencePollTimer`, `set_referencePollTimer`, `set_pendingReferences`, `ReferenceItem`, `addSystemMessage`): excluded — imported bindings, not function definitions in this file.
- Inline click handlers on lines 57, 79, 102 and the `setInterval` callback on line 44: excluded — anonymous callbacks passed inline to `addEventListener`/`setInterval`, not top-level named bindings.
- `_rulingBusy` (line 56): excluded — boolean local variable inside `showRulingPanel`, not a callable binding.
