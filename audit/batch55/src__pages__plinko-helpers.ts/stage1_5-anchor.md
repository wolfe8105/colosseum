# Anchor List — plinko-helpers.ts

Source: src/pages/plinko-helpers.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. getReturnTo  (line 8)
2. updateProgress  (line 15)
3. goToStep  (line 20)
4. showMsg  (line 34)
5. clearMsg  (line 41)
6. getAge  (line 48)

## Resolution notes

Both arbiter runs agreed exactly. No reconciliation needed. All six entries are top-level exported function declarations confirmed in source. daySelect and yearSelect (lines 61, 71) are const bindings to getElementById calls, not function definitions. The inline arrow inside goToStep's .then() chain (line 30) is an inner callback, excluded.
