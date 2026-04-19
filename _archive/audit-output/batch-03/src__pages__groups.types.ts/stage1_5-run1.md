# Anchor List — groups.types.ts

(none)

---

# Resolution notes

- `GroupListItem` — excluded: exported interface, a type declaration, not a function definition.
- `GroupDetail` — excluded: exported interface extending `GroupListItem`, a type declaration, not a function definition.
- `GroupMember` — excluded: exported interface, a type declaration, not a function definition.

The source file contains only interface declarations and no top-level callable bindings of any form (function declarations, arrow functions, function expressions). All eleven agents consistently classified every binding as `bind name to type`, confirming there are zero function definitions in this file. A direct scan of the source confirms no candidates were missed.
