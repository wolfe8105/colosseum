# Anchor List — spectate.ts

1. startPolling  (line 22)
2. loadDebate  (line 90)
3. init  (line 224)

## Resolution notes

- init (line 224): All five agents flagged this as a top-level IIFE (`(async function init() { ... })()`). The function is named and defined at the top level of the module, not inside another function, and it is immediately invoked. It qualifies as a top-level named async function expression, so it is included. It is not exported, but the inclusion criteria do not require export.
- setInterval callback (line 24): Inner async callback passed to `setInterval` inside `startPolling` — excluded as an inline callback.
- `beforeunload` listener callback (line 268): Arrow function passed inline to `addEventListener` — excluded as an inline callback.
- `click` listener callback (line 234): Arrow function passed inline to `addEventListener` — excluded as an inline callback.
- `import(...).then(...)` callback (line 82): Arrow function passed as `.then()` argument — excluded as an inline callback.
- No function definitions were found in the source that all five agents missed.
