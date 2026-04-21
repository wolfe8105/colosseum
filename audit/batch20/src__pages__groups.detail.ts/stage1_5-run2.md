# Anchor List — groups.detail.ts

1. openGroup  (line 21)
2. updateJoinBtn  (line 80)
3. toggleMembership  (line 98)

Resolution notes
- `currentGroupData` (line 19): excluded — it is a top-level `let` binding to a value (`null` / `GroupDetail`), not a callable function definition.
- All imports (lines 6-17): excluded — imports are not function definitions in this file.
- Comment header (lines 1-4) and blanks: excluded — not bindings.
- No agent missed a top-level callable binding; the direct scan confirms only the three exported functions above.
