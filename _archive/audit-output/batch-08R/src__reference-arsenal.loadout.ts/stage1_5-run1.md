# Anchor List — src/reference-arsenal.loadout.ts

1. renderLoadoutPicker  (line 15)

---

## Resolution notes

**`render` (line 49) — excluded.** This is an inner `function` declaration defined inside the body of `renderLoadoutPicker`. It is not a top-level binding; it is local to the enclosing function scope. Excluded per the "inner helper functions defined inside other functions" rule. Agents 01 and 03 listed it; Agents 02, 04, and 05 correctly omitted it.
