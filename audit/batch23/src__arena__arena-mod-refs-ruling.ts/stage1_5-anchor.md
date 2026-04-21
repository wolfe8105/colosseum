# Anchor List — src/arena/arena-mod-refs-ruling.ts

Source: src/arena/arena-mod-refs-ruling.ts
Produced by: stage 1.5 (arbiter, runs agreed — no reconciliation needed)
Unresolved items: 0

1. showRulingPanel  (line 10)
2. startReferencePoll  (line 107)
3. stopReferencePoll  (line 118)

## Resolution notes

- Imports (`ruleOnReference`, `escapeHTML`, `friendlyError`, `_rulingCountdownTimer`, `set__rulingCountdownTimer`, `referencePollTimer`, `set_referencePollTimer`, `set_pendingReferences`, `ReferenceItem`, `addSystemMessage`): excluded — imported bindings.
- Inline callbacks at lines 44 (setInterval), 51 (.catch), 57 (addEventListener), 79 (addEventListener), 102 (addEventListener): inline anonymous callbacks, not top-level named bindings.
- `_rulingBusy` (line 56), `countdown` (line 41), and DOM-element `const`s: inner locals inside `showRulingPanel`, not top-level.
