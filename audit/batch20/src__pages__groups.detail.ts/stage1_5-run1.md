# Anchor List — groups.detail.ts

1. openGroup  (line 21)
2. updateJoinBtn  (line 80)
3. toggleMembership  (line 98)

Resolution notes
- `currentGroupData` (line 19): excluded — it is a `let`-bound value initialized to `null`, not a function definition.
- All import bindings (lines 6-17): excluded — imports, not local function definitions.
- Comments and blanks: excluded — not bindings.
- No inner helpers, class methods, or inline callbacks exist in the file; no candidates were missed by the five agents.
