# Anchor List — src/reference-arsenal.loadout.ts

1. renderLoadoutPicker  (line 15)

---

## Resolution notes

**`render` (line 49) — excluded.** This is an inner `function` declaration defined inside the body of `renderLoadoutPicker`. It is not a top-level binding; it is scoped entirely within the enclosing async function. Per the stated exclusion rule, inner helper functions defined inside other functions are excluded.

No other candidates were proposed by any agent, and a direct scan of the source file confirms no additional top-level function definitions exist.
