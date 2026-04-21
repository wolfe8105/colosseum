# Stage 1 Outputs — arena-core.ts

Source: src/arena/arena-core.ts (150 lines)

---

## Agent 01

Top-level exported callable definitions:

1. `_onPopState` — line 35 — `export const _onPopState = () => { ... }` — arrow function assigned to exported const; registered as popstate listener at line 67
2. `init` — line 73 — `export function init(): void`
3. `getView` — line 116 — `export function getView(): ArenaView`
4. `getCurrentDebate` — line 120 — `export function getCurrentDebate(): CurrentDebate | null`
5. `destroy` — line 128 — `export function destroy(): void`

Excluded: module-level side effects — `window.addEventListener('popstate', _onPopState)` at line 67 and `ready.then(() => init()).catch(() => init())` at line 150. Imports, type imports, comments excluded.

---

## Agent 02

Exported callable definitions found:

1. `_onPopState` (line 35) — exported const arrow function; immediately wired to popstate at line 67
2. `init` (line 73) — exported function declaration
3. `getView` (line 116) — exported function declaration
4. `getCurrentDebate` (line 120) — exported function declaration
5. `destroy` (line 128) — exported function declaration

Excluded: line 67 addEventListener call (side effect, not a definition); line 150 ready.then chain (IIFE-style auto-init, not a callable export). No classes, no overloads, no object-literal methods.

---

## Agent 03

Five exported function-like definitions:

1. `_onPopState` — line 35 — exported const, arrow function body spans lines 35–66
2. `init` — line 73
3. `getView` — line 116
4. `getCurrentDebate` — line 120
5. `destroy` — line 128

Excluded: `window.addEventListener` at line 67 (registration, not definition), `ready.then(...)` at line 150 (auto-init side effect), all imports, the comment block lines 1–4, inline callbacks inside _onPopState body.

---

## Agent 04

Anchor candidates:

1. `_onPopState` (line 35) — `export const` + arrow — callable reference
2. `init` (line 73) — `export function`
3. `getView` (line 116) — `export function`
4. `getCurrentDebate` (line 120) — `export function`
5. `destroy` (line 128) — `export function`

Not anchors: line 67 addEventListener (wires existing function), line 150 auto-init chain, inline `.then(({ renderLobby, showPowerUpShop }) => ...)` callbacks (anonymous, inline), `.catch((e) => console.warn(...))` at line 57 (inline callback).

---

## Agent 05

Exported top-level callable definitions:

1. `_onPopState` — line 35 — `export const _onPopState = () => { ... }`
2. `init` — line 73 — `export function init(): void`
3. `getView` — line 116 — `export function getView(): ArenaView`
4. `getCurrentDebate` — line 120 — `export function getCurrentDebate(): CurrentDebate | null`
5. `destroy` — line 128 — `export function destroy(): void`

Module-level side effects excluded: popstate registration (line 67), auto-init (line 150). Inline arrow callbacks inside function bodies excluded.
