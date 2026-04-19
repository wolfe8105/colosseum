# Anchor List — vite.config.ts

Source: vite.config.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

(empty — no top-level named function definitions found)

## Resolution notes

Both arbiter runs agreed. No candidates emerged from Stage 1 or direct source scan.

- `htmlEntries` (line 6): excluded — `const` bound to a plain object literal, not a function expression or arrow function.
- `export default defineConfig(...)` (line 23): excluded — unnamed default export wrapping a call expression; no named callable binding is created.
- `manualChunks` (line 32): excluded — method shorthand on a nested object literal inside the `defineConfig` call argument; inner callback, not a top-level named binding.
