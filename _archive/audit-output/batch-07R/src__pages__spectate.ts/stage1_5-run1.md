# Anchor List — spectate.ts

1. startPolling  (line 22)
2. loadDebate  (line 90)
3. init  (line 224)

## Resolution notes

- init (line 224): The IIFE `(async function init() { ... })()` is a named async function expression that is immediately invoked at the top level of the module. All five agents identified it. It is a named, callable binding at module scope — not a variable binding, but it qualifies as a top-level named function definition under the "function declarations / async variants" criterion. Included.
- The `setInterval` callback (line 24): inner anonymous async callback passed to `setInterval` inside `startPolling`. Excluded — inline callback.
- `triggerDripDay` dynamic import call (line 82): destructured import used in a `.then()` callback. Not a definition in this file.
- `back-btn` click handler (line 234): anonymous arrow function passed to `addEventListener` inside `init`. Excluded — inline callback.
- `beforeunload` handler (line 268): anonymous arrow function passed to `addEventListener` inside `init`. Excluded — inline callback.
