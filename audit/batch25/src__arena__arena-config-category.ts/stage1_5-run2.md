# Anchor List — arena-config-category.ts

1. `showCategoryPicker`  (line 10)

## Resolution notes
- All 5 Stage 1 agents reached unanimous consensus on exports, internal symbols, and imports — no conflicts to resolve.
- No candidates excluded: `showCategoryPicker` is the sole export and is a concrete function with runtime behavior (builds a picker UI, wires event handlers, manages queue state), making it a clear Stage 2 walk target.
- No type-only exports, re-exports without local body, or pure constants present.
