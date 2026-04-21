# Anchor List — async.fetch.ts

1. fetchTakes  (line 19)
2. fetchPredictions  (line 117)
3. fetchStandaloneQuestions  (line 167)

## Resolution notes

- All five agents converged on the same three top-level exported async function declarations: `fetchTakes` (line 19), `fetchPredictions` (line 117), `fetchStandaloneQuestions` (line 167). Direct source verification confirms each is an `export async function` declared at module scope.
- Excluded: the inline arrow callbacks passed to `.map(...)` at lines 58, 99, 102, 103, 128 (Records → typed objects, hot-take id mapping, Set construction, forEach mutation) — these are inline callbacks, not top-level bindings.
- Excluded: the inline `.forEach((t) => { ... })` callback at line 103 — inline callback.
- Excluded: the inline arrow inside `state.hotTakes.map((t) => t.id)` at line 99 and `reacts.map((r) => r.hot_take_id)` at line 102 — inline callbacks.
- Excluded: all `import` bindings — these are imports, not function definitions in this file.
- Excluded: the JSDoc header (lines 1–6) and the inline TypeScript type-cast object literal type signatures (e.g. the `from`/`select`/`order`/`limit`/`eq`/`in` shapes at lines 24–38 and 81–92) — these are type signatures, not function definitions.
- No additional function definitions were discovered in the direct source scan beyond the three already listed.
