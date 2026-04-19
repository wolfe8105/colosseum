# Anchor List — auth.rpc.ts

1. safeRpc  (line 21)

## Resolution notes

- `attempt` (line 30): excluded — const arrow function binding inside `safeRpc`'s body; inner helper, not top-level.
- All five stage 1 agents agreed on exactly one function definition. No candidates to exclude from the uncontested set.
