# Anchor List — auth.ops.ts

Source: src/auth.ops.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. signUp  (line 9)
2. logIn  (line 34)
3. oauthLogin  (line 46)
4. logOut  (line 61)
5. resetPassword  (line 84)
6. updatePassword  (line 98)

## Resolution notes

- Both arbiter runs agreed on all six anchors. No reconciliation run needed.
- Inner Promise executor callback at line 70 inside `logOut`: excluded — inline anonymous callback.
- `getCurrentUser` and `getCurrentProfile` imported at line 5 but never used in this file — dead imports (flagged for Stage 2/3 observation).
- Type-only imports excluded.
