# Anchor List — src/pages/auto-debate.ts

1. showError  (line 50)
2. shareDebateImpl  (line 60)
3. loadDebate  (line 88)

Resolution notes
- `sb`, `app`, `loadingEl`, `urlParams`, `debateId` — excluded; bindings to non-function values (Supabase client, DOM elements, URL params, string).
- Anonymous async IIFE at lines 118-129 — excluded; unnamed expression, not a named top-level binding.
- `document.addEventListener('click', ...)` callback at lines 138-149 — excluded; inline callback passed to addEventListener.
- `void showResults;` at line 152 — excluded; reference-use statement, not a function definition.
