# Anchor List — arena-config-category.ts

1. `showCategoryPicker`  (line 10)

## Resolution notes
- All 5 Stage 1 agents reached unanimous consensus on exactly 1 exported symbol with no conflicts to resolve.
- No type-only exports, re-exports without local bodies, or pure constants were identified by any agent.
- The 8 named imports are consumed dependencies, not candidates for the anchor list.
- `showCategoryPicker` is a function with a concrete signature `(mode: string, topic: string): void` and is the sole entry point with runtime behavior worth walking in Stage 2.
