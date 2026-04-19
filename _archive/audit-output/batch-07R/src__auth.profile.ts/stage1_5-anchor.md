# Anchor List — auth.profile.ts

Source: src/auth.profile.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. updateProfile  (line 13)
2. deleteAccount  (line 46)
3. getPublicProfile  (line 64)
4. showUserProfile  (line 90)

## Resolution notes

Both arbiter runs agreed on all four entries. No reconciliation needed.

- All four are exported async function declarations at module top level.
- Inner callbacks (forEach at line 34, click handlers at lines 106, 171, 179, 204) excluded as inline callbacks.
