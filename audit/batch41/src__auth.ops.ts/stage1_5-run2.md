# Anchor List — auth.ops.ts

1. signUp  (line 9)
2. logIn  (line 34)
3. oauthLogin  (line 46)
4. logOut  (line 61)
5. resetPassword  (line 84)
6. updatePassword  (line 98)

## Resolution notes

- All five Stage 1 agents produced identical inventories with identical line numbers; no disagreements.
- Inner `Promise` executor callback at line 70 (`resolve => setTimeout(...)`) inside `logOut`: excluded — inline anonymous callback.
- `getCurrentUser` and `getCurrentProfile` appear in the import at line 5 but are not defined in this file — excluded.
- All six included functions are top-level `export async function` declarations.
