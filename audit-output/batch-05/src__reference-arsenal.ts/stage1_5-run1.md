# Anchor List — reference-arsenal.ts

*(empty — no function definitions)*

## Resolution notes

`src/reference-arsenal.ts` is a barrel orchestrator with 82 lines. Every top-level statement is one of: a block comment, an `export type { ... } from`, an `export { ... } from`, an `import { ... } from`, or a single expression statement that assigns an object literal of imported names to `window.ModeratorArsenal`. None of these forms constitute a function definition under the stated criteria. All five stage-1 agents reached the same conclusion: zero function definitions exist in this file. A direct scan of the source confirms it. The anchor list is intentionally empty.
