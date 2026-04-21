# Anchor List — async.fetch.ts

1. fetchTakes  (line 19)
2. fetchPredictions  (line 117)
3. fetchStandaloneQuestions  (line 167)

## Resolution notes

- All five stage 1 agents agree on the same three top-level exported async function declarations: `fetchTakes`, `fetchPredictions`, `fetchStandaloneQuestions`. Source verification confirms each is declared with `export async function` at the cited line.
- Excluded: the JSDoc header (lines 1–6) and all `import` statements (lines 8–17) — these are not function definitions.
- Excluded: the inline arrow callbacks passed to `.map(...)` at lines 58, 99, 102, 128 and to `.forEach(...)` at line 103 — these are inline callbacks per the exclusion rules.
- Excluded: object/type-literal method shapes inside the `as unknown as { ... }` casts at lines 24–39 and 81–92 — these are TypeScript type signatures, not function definitions.
- No additional top-level function definitions were found in source that the agents missed.
