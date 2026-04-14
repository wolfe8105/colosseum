# Anchor List — vite.config.ts (Arbiter Run 1)

There are no top-level named function definitions in this file. The source contains:

- Line 6: `htmlEntries` — a `const` bound to a plain object literal (not a function expression or arrow function)
- Line 23: `export default defineConfig({...})` — an unnamed default export that is a call expression passed a configuration object literal; it is not a named callable binding
- Line 32: `manualChunks(id) { ... }` — a method shorthand inside the `output` object literal nested inside the `defineConfig` call; this is an inner callback/object method, not a top-level named callable binding

None of these meet the inclusion criteria for the anchor list.

# Anchor List — vite.config.ts

(empty — no qualifying function definitions found)

---

**Resolution notes**

- `htmlEntries` (line 6): excluded — `const` bound to a plain object literal, not a function expression or arrow function.
- `export default defineConfig(...)` (line 23): excluded — unnamed default export wrapping a call expression; no named callable binding is created.
- `manualChunks` (line 32): excluded — method shorthand on an object literal nested inside the `defineConfig` call argument; it is an inner callback, not a top-level named binding.
