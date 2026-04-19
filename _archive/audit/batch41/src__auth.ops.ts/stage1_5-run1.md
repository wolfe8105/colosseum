# Anchor List — auth.ops.ts

1. signUp  (line 9)
2. logIn  (line 34)
3. oauthLogin  (line 46)
4. logOut  (line 61)
5. resetPassword  (line 84)
6. updatePassword  (line 98)

## Resolution notes

- All five Stage 1 agents agreed unanimously on all six functions and every line number.
- `new Promise<void>(resolve => setTimeout(..., 3000))` at line 70 inside `logOut`: inline callback — excluded.
- `getCurrentUser` and `getCurrentProfile` at line 5: imported identifiers, not definitions — excluded.
- `AuthResult`, `SignUpParams`, `LogInParams` at line 7: type-only imports — excluded.
