# Anchor List — groups.types.ts

(none)

---

**Resolution notes**

- `GroupListItem` — excluded; it is a TypeScript `interface` declaration, not a function definition. All eleven agents classified it as "bind name to type." Source confirms: `export interface GroupListItem { ... }` (lines 10–22).
- `GroupDetail` — excluded; same reason. `export interface GroupDetail extends GroupListItem { ... }` (lines 25–51).
- `GroupMember` — excluded; same reason. `export interface GroupMember { ... }` (lines 54–65).

The source file contains no function declarations, no arrow-function bindings, and no function-expression bindings. It is a pure type-definition module. No agent proposed any function candidate, and a direct scan of the source confirms none exist.
