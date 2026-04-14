# Anchor List — src/arena/arena-mod-scoring.ts

1. `renderModScoring`  (line 6)

---

## Resolution notes

- `renderModScoring` (lines 6–85): confirmed as a named top-level callable function definition using `export function` declaration syntax. Sole anchor.
- Anonymous async arrow function at lines 51–63: excluded — inner closure passed to `addEventListener('click', ...)` inside `renderModScoring`.
- Anonymous arrow functions at lines 69 and 71–84: excluded — inner closures wired to event listeners inside `renderModScoring`.
- Import statements (lines 1–4): excluded per rules.
- No type aliases, interfaces, enums, or other non-function top-level bindings present.
- Stage 1 correctly identified the only anchor; nothing missed.
