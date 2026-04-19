# Anchor List — spectate.ts

Source: src/pages/spectate.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. startPolling  (line 22)
2. loadDebate  (line 90)
3. init  (line 224)

## Resolution notes

Both arbiter runs agreed on all three entries. No reconciliation needed.

- init (line 224): Named async IIFE `(async function init() { ... })()` — included as top-level named async function expression per both arbiters.
- setInterval callback (line 24): inner anonymous async callback inside `startPolling` — excluded as inline callback.
- addEventListener callbacks (lines 234, 268): anonymous arrows inside `init` — excluded as inline callbacks.
- `.then()` callback (line 82): arrow function inside `startPolling` — excluded as inline callback.
