# Anchor List — vite.config.ts (Arbiter Run 2)

There are no top-level, named, callable function definitions in this file. The source contains:

- Line 6: `htmlEntries` — a `const` bound to an **object literal**, not a function expression or arrow function.
- Line 23: `export default defineConfig({...})` — a default export of a **call expression** (invoking the imported `defineConfig`). There is no named binding; the argument is an anonymous configuration object literal, not a function definition.
- Line 32: `manualChunks(id) { ... }` — a **method shorthand** inside a nested object literal passed as an argument to `defineConfig`. This is an inner callback/object-method, not a top-level named function binding.

The file defines zero top-level named callable functions under the stated criteria.

---

# Resolution notes

- `htmlEntries` (line 6): excluded — `const` bound to an object literal, not a function expression.
- `export default defineConfig(...)` (line 23): excluded — a call expression producing a default export; no named function binding is created; `defineConfig` itself is an imported external symbol, not defined here.
- `manualChunks` (line 32): excluded — method shorthand inside a nested object literal (a callback argument), not a top-level named binding.
