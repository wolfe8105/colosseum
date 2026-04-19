# Anchor List — groups.types.ts

*(none)*

## Resolution notes

All five agents classified all top-level bindings as `bind name to type` (interface declarations). No agent listed any function definition as a candidate. Direct scan of the source confirms: three top-level declarations — `GroupListItem` (line 10), `GroupDetail` (line 25), `GroupMember` (line 54) — all `export interface`. Interface declarations are type signatures and are explicitly excluded. The anchor list is empty.
