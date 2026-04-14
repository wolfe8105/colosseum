# Anchor List — home.arsenal.ts

Source: src/pages/home.arsenal.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. loadArsenalScreen  (line 11)
2. loadMyArsenal  (line 23)
3. loadArmory  (line 28)
4. loadForge  (line 32)
5. wireArsenalButtons  (line 56)

## Resolution notes

- `document.querySelectorAll('[data-arsenal-tab]').forEach(...)` at module load: excluded — top-level side-effect statement with an inline anonymous callback, not a named callable binding.
- Both arbiter runs agreed on the same 5 functions in the same order. No reconciliation run needed.
