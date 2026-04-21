# Stage 1 — Primitive Inventory: async.ts

Source: src/async.ts (194 lines)
Agents: 5 (independent, parallel)

---

## Agent 1

Top-level named callable bindings:

1. `init` (line 108) — `export function init(): void`
2. `getComposerHTML` (line 118) — `export function getComposerHTML(): string`
3. `_onDocClick` (line 165) — `const _onDocClick = (e: Event): void => {...}` — module-scope named arrow function
4. `destroy` (line 176) — `export function destroy(): void`

Excluded:
- All import bindings (lines 24–59): `state`, `PLACEHOLDER_TAKES`, `PLACEHOLDER_PREDICTIONS`, `loadHotTakes`, `renderPredictions`, `_hideWagerPicker`, `react`, `challenge`, `postTake`, `_submitChallenge`, `placePrediction`, `pickStandaloneQuestion`, `openCreatePredictionForm`, `fetchTakes`, `fetchPredictions`, `fetchStandaloneQuestions`, `renderRivals`, `refreshRivals`, `FEATURES`, `ready` — all imported, not defined here
- Side-effect import `./async.wiring.ts` (line 51) — not a callable
- All `export { ... } from '...'` re-exports (lines 78–102) — pass-through re-exports, not defined here
- All `export type { ... }` re-exports (lines 64–72) — type-only
- `export const ModeratorAsync` (line 141) — const object facade aggregating already-anchored/imported functions. Excluded as value binding (namespace/facade object, not a new callable definition; same pattern as `ModeratorShare` in share.ts)
- Module-level side effects: `document.addEventListener('click', _onDocClick)` (line 170) and `ready.then(() => init())` (line 194) — not callable bindings

**Count: 4**

---

## Agent 2

Top-level named callable bindings:

1. `init` (line 108)
2. `getComposerHTML` (line 118)
3. `_onDocClick` (line 165) — named const arrow function at module scope
4. `destroy` (line 176)

Excluded:
- All imports (lines 24–59): not defined here
- Re-exports (lines 64–102): pass-through, not defined here
- `export const ModeratorAsync` (line 141): const object aggregating already-audited functions. Excluded — facade object, not new callable.
- `document.addEventListener(...)` (line 170): side effect
- `ready.then(...)` (line 194): side effect

**Count: 4**

---

## Agent 3

Top-level named callable bindings:

1. `init` (line 108) — initializes state with placeholder data
2. `getComposerHTML` (line 118) — returns hardcoded composer HTML string
3. `_onDocClick` (line 165) — document-level click delegation for `data-action="post-take"` buttons
4. `destroy` (line 176) — teardown: removes listener, clears all state

Excluded:
- Import bindings (lines 24–59): all imported
- Type re-exports: excluded
- Function re-exports (lines 78–102): defined elsewhere
- `ModeratorAsync` const object (line 141): facade/namespace, excluded
- Side effects (lines 170, 194): not callable bindings
- Anonymous callback in `ready.then(() => init())`: excluded

**Count: 4**

---

## Agent 4

Top-level named callable bindings:

1. `init` (line 108)
2. `getComposerHTML` (line 118)
3. `_onDocClick` (line 165) — named const referencing an arrow function; module-scope; callable
4. `destroy` (line 176)

Note on `ModeratorAsync` (line 141): This is a `const` object with method references and a getter. While the getter `get predictions()` is technically a callable, `ModeratorAsync` is a facade/namespace object re-referencing already-defined functions. Excluded following the batch21 convention for const facade objects.

**Count: 4**

---

## Agent 5

Top-level named callable bindings:

1. `init` (line 108) — exported function, feature-gated state initializer
2. `getComposerHTML` (line 118) — exported function, returns hardcoded HTML template
3. `_onDocClick` (line 165) — non-exported named const arrow function; wires post-take delegation; removed in `destroy()`
4. `destroy` (line 176) — exported function, full teardown

Excluded:
- All import/re-export bindings — not defined in this file
- `ModeratorAsync` const (line 141) — aggregation facade, not a new callable; excluded per share.ts precedent
- Side-effect statements at lines 170 and 194 — not callable bindings
- Anonymous `() => init()` in ready.then — inline callback, anonymous

**Count: 4**

---

## Summary

All 5 agents unanimous: **4 top-level named callable bindings**.

| # | Name | Line | Exported |
|---|------|------|----------|
| 1 | `init` | 108 | Yes |
| 2 | `getComposerHTML` | 118 | Yes |
| 3 | `_onDocClick` | 165 | No |
| 4 | `destroy` | 176 | Yes |
