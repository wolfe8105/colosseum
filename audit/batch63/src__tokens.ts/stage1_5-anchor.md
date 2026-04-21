# Anchor List — tokens.ts

Source: src/tokens.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. init    (line 20)

## Resolution notes

Unanimous 5/5 Stage 1 agents. Both arbiters agreed. The `tokens` object literal (`const tokens = { ... } as const`, lines 33–42) is excluded — it is a plain value binding whose methods are defined in sub-modules and re-exported here. Re-exports are excluded; callable definitions live in the originating sub-modules. The auto-init conditional (lines 46–50) is a top-level statement, not a named callable.
