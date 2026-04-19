# Anchor List — auth.types.ts

All five agents consistently classified every top-level binding in this file as "bind name to type" — interfaces, type aliases, and imports. No agent identified any function declaration, arrow function binding, function expression binding, or class definition in the file. Direct inspection of the source confirms this: the file contains only `import type`, `export interface`, and `export type` declarations. There is no runtime code of any kind.

There are zero function definitions in `src/auth.types.ts`.

---

Resolution notes:

- `SafeRpcResult` (line 11) — excluded: exported interface, not a callable function definition.
- `AuthResult` (line 17) — excluded: exported interface, not a callable function definition.
- `Profile` (line 29) — excluded: exported interface, not a callable function definition.
- `PublicProfile` (line 63) — excluded: exported interface, not a callable function definition.
- `FollowRow` (line 88) — excluded: exported interface, not a callable function definition.
- `ModeratorInfo` (line 99) — excluded: exported interface, not a callable function definition.
- `DebateReference` (line 108) — excluded: exported interface, not a callable function definition.
- `RivalData` (line 119) — excluded: exported interface, not a callable function definition.
- `ProfileUpdate` (line 128) — excluded: exported interface, not a callable function definition.
- `AuthListener` (line 138) — excluded: exported type alias declaring a function signature, not a callable function definition (it is a type, not a value binding).
- `SignUpParams` (line 141) — excluded: exported interface, not a callable function definition.
- `LogInParams` (line 150) — excluded: exported interface, not a callable function definition.
