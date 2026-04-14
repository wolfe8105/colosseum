# Stage 1 — Primitive Inventory: src/arena/arena-core.ts

Batch: 10R
Agents: 5 (independent, parallel)
Consensus: All 5 agents agree on the same 9 top-level named callables.

---

## Agent 01

| # | Name | Line | Kind |
|---|------|------|------|
| 1 | isPlaceholder | 46 | export function |
| 2 | formatTimer | 50 | export function |
| 3 | randomFrom | 55 | export function |
| 4 | pushArenaState | 63 | export function |
| 5 | _onPopState | 67 | export const arrow |
| 6 | init | 100 | export function |
| 7 | getView | 134 | export function |
| 8 | getCurrentDebate | 138 | export function |
| 9 | destroy | 146 | export function |

### Excluded (with reason)
- `window.addEventListener('popstate', _onPopState)` (line 95): top-level statement, not a function definition
- `ready.then(() => init()).catch(() => init())` (line 166): top-level statement / promise chain, not a function definition
- inline `() => init()` callbacks (line 166): inline callbacks passed as arguments
- `({ renderLobby, showPowerUpShop }) => { ... }` (inside init): inline callback passed as argument to `.then()`
- `({ renderLobby }) => renderLobby()` (inside _onPopState): inline callback passed as argument to `.then()`

---

## Agent 02

| # | Name | Line | Kind |
|---|------|------|------|
| 1 | isPlaceholder | 46 | export function |
| 2 | formatTimer | 50 | export function |
| 3 | randomFrom | 55 | export function |
| 4 | pushArenaState | 63 | export function |
| 5 | _onPopState | 67 | export const arrow |
| 6 | init | 100 | export function |
| 7 | getView | 138 | export function |
| 8 | getCurrentDebate | 142 | export function |
| 9 | destroy | 150 | export function |

### Excluded (with reason)
- `ready.then(() => init()).catch(() => init())` (line 170): top-level statement, not a function definition; inline callbacks passed as arguments
- `window.addEventListener('popstate', _onPopState)` (line 96): top-level statement, event listener registration, not a function definition

---

## Agent 03

| # | Name | Line | Kind |
|---|------|------|------|
| 1 | isPlaceholder | 44 | export function |
| 2 | formatTimer | 48 | export function |
| 3 | randomFrom | 53 | export function |
| 4 | pushArenaState | 61 | export function |
| 5 | _onPopState | 65 | export const arrow |
| 6 | init | 95 | export function |
| 7 | getView | 133 | export function |
| 8 | getCurrentDebate | 137 | export function |
| 9 | destroy | 145 | export function |

### Excluded (with reason)
- `ready.then(() => init()).catch(() => init())` (line 163): Top-level statement (promise chain), not a function definition
- Inline arrow `() => init()` (line 163): Inline callback passed as argument to `.then()` and `.catch()`
- `renderLobby` / `showPowerUpShop` (line 104): Destructured from dynamic import, not defined in this file

---

## Agent 04

| # | Name | Line | Kind |
|---|------|------|------|
| 1 | isPlaceholder | 44 | export function |
| 2 | formatTimer | 48 | export function |
| 3 | randomFrom | 54 | export function |
| 4 | pushArenaState | 62 | export function |
| 5 | _onPopState | 66 | export const arrow |
| 6 | init | 99 | export function |
| 7 | getView | 136 | export function |
| 8 | getCurrentDebate | 140 | export function |
| 9 | destroy | 149 | export function |

### Excluded (with reason)
- `ready.then(() => init()).catch(() => init())` (line 168): top-level statement, not a function definition; inline arrow functions are callbacks passed as arguments

---

## Agent 05

| # | Name | Line | Kind |
|---|------|------|------|
| 1 | isPlaceholder | 45 | export function |
| 2 | formatTimer | 49 | export function |
| 3 | randomFrom | 54 | export function |
| 4 | pushArenaState | 63 | export function |
| 5 | _onPopState | 67 | export const arrow |
| 6 | init | 97 | export function |
| 7 | getView | 131 | export function |
| 8 | getCurrentDebate | 135 | export function |
| 9 | destroy | 143 | export function |

### Excluded (with reason)
- `window.addEventListener('popstate', _onPopState)` (line 94): top-level statement, event listener registration, not a function definition
- `ready.then(() => init()).catch(() => init())` (line 163): top-level statement, promise chain, not a function definition
- `() => init()` (line 163): inline arrow function passed as argument to `.then()` and `.catch()`
- `({ renderLobby }) => renderLobby()` / dynamic import callbacks inside `init`: inline callbacks passed as arguments to `.then()`

---

## Consensus

All 5 agents identified the same 9 top-level named callables (line numbers differ slightly due to agent rendering; canonical lines from source read):

1. isPlaceholder  (line 36)
2. formatTimer  (line 40)
3. randomFrom  (line 46)
4. pushArenaState  (line 54)
5. _onPopState  (line 58)
6. init  (line 96)
7. getView  (line 139)
8. getCurrentDebate  (line 143)
9. destroy  (line 151)

No disagreements. Proceed to Stage 1.5.
