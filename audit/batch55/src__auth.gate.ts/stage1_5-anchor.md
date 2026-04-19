# Anchor List — auth.gate.ts

Source: src/auth.gate.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. esc  (line 12)
2. requireAuth  (line 20)

## Resolution notes

Both arbiter runs agreed exactly. esc is a non-exported top-level function declaration (line 12). requireAuth is an exported top-level function declaration (line 20). Two inner callbacks (addEventListener at line 41, click handler at line 44) excluded as non-top-level bindings.
