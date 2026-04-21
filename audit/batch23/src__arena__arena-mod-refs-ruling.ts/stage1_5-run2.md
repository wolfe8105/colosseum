# Anchor List — src/arena/arena-mod-refs-ruling.ts

1. `showRulingPanel` — line 10
2. `startReferencePoll` — line 107
3. `stopReferencePoll` — line 118

## Resolution notes

- Two inline async arrow callbacks passed to `addEventListener` at lines 57 and 79 — excluded as inline callbacks, not top-level bindings.
- Inline arrow callback passed to `setInterval` at line 44 — excluded as inline callback.
- Inline arrow callback passed to `.catch()` at line 51 — excluded as inline callback.
- Inline arrow callback passed to `addEventListener` on the backdrop at line 102 — excluded as inline callback.
- Local `let _rulingBusy` (line 56), `let countdown` (line 41), and DOM element consts inside `showRulingPanel` — excluded as inner bindings (not top-level, not functions).
- All five imports (lines 1–8) — excluded as import bindings, not function definitions.
