# Anchor List — src/arena/arena-mod-scoring.ts

1. `renderModScoring`  (line 6)

---

## Resolution notes

- `renderModScoring` (lines 6–85): confirmed — declared with `export function renderModScoring(...)` at module scope. Qualifies as anchor.
- Anonymous arrow function at line 52 (`btn.addEventListener('click', async () => {...})`): excluded — inner closure inside `renderModScoring`.
- Anonymous arrow function at line 69 (`slider.addEventListener('input', () => {...})`): excluded — inner closure.
- Anonymous arrow function at line 71 (`document.getElementById(...)?.addEventListener('click', async () => {...})`): excluded — inner closure.
- Import statements (lines 1–4): excluded.
- No type aliases, interfaces, enums, or literal bindings present.
- Stage 1 correctly identified the only anchor. No misses.
