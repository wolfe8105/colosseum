# Anchor List — src/pages/auto-debate.ts

Source: src/pages/auto-debate.ts
Produced by: stage 1.5 (arbiter; no reconciliation needed — both runs agreed)
Unresolved items: 0

1. showError  (line 50)
2. shareDebateImpl  (line 60)
3. loadDebate  (line 88)

## Resolution notes
- `sb`, `app`, `loadingEl`, `urlParams`, `debateId` — bindings to non-function values (Supabase client, DOM elements, URL params, string).
- Anonymous async IIFE at lines 118-129 — unnamed expression, not a named top-level binding.
- `document.addEventListener('click', ...)` callback at lines 138-149 — inline callback, not a top-level binding.
- `void showResults;` at line 152 — reference-use statement, not a function definition.
