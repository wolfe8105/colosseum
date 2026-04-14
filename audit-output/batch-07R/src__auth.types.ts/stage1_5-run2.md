# Anchor List — auth.types.ts

There are no function definitions in this file. The source is a pure-types module containing only `interface` declarations and one `type` alias. All five agents classified every top-level binding as "bind name to type," and direct inspection of the source confirms this: no `function` declarations, no `const`/`let`/`var` bindings to arrow functions or function expressions appear anywhere in the file.

Resolution notes:

- `SafeRpcResult` (line 11) — excluded: exported interface, not a callable function definition
- `AuthResult` (line 17) — excluded: exported interface, not a callable function definition
- `Profile` (line 29) — excluded: exported interface, not a callable function definition
- `PublicProfile` (line 63) — excluded: exported interface, not a callable function definition
- `FollowRow` (line 88) — excluded: exported interface, not a callable function definition
- `ModeratorInfo` (line 99) — excluded: exported interface, not a callable function definition
- `DebateReference` (line 108) — excluded: exported interface, not a callable function definition
- `RivalData` (line 119) — excluded: exported interface, not a callable function definition
- `ProfileUpdate` (line 128) — excluded: exported interface, not a callable function definition
- `AuthListener` (line 138) — excluded: exported type alias, not a callable function definition
- `SignUpParams` (line 141) — excluded: exported interface, not a callable function definition
- `LogInParams` (line 150) — excluded: exported interface, not a callable function definition
