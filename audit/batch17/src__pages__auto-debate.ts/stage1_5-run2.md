# Anchor List — src/pages/auto-debate.ts

1. showError  (line 50)
2. shareDebateImpl  (line 60)
3. loadDebate  (line 88)

Resolution notes
- `sb`, `app`, `loadingEl`, `urlParams`, `debateId` — excluded: bindings to non-function values (client object, DOM elements, URL parser, string).
- IIFE at lines 118–129 — excluded: anonymous immediately-invoked async function expression, not a named callable binding.
- Click handler at line 138 (`document.addEventListener('click', (e) => ...)`) — excluded: inline callback passed to addEventListener, not a top-level binding.
- `void showResults;` at line 152 — excluded: statement referencing an imported symbol, not a function definition.
