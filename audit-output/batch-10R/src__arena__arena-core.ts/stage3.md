# Stage 3 — Verification: src/arena/arena-core.ts

Batch: 10R
Agents: 5 (independent, parallel)
Anchor list: 9 functions

---

## Agent 01

| Function | Verdict | Notes |
|----------|---------|-------|
| isPlaceholder | PASS | Accurately describes the two-condition OR, falsy client check, and no side effects. |
| formatTimer | PARTIAL | Omits that `sec % 60` is used without `Math.floor` — fractional input produces decimal seconds. |
| randomFrom | PASS | Accurate: non-null assertion, empty-array undefined-at-runtime caveat noted. |
| pushArenaState | PARTIAL | Minor: description omits that no URL argument is passed (third arg omitted), so URL unchanged by omission not by explicit `''`. Trivial. |
| _onPopState | PARTIAL | `_rulingCountdownTimer` is cleared unconditionally in the overlay block AND again inside the `room/preDebate` branch — description presents only one clearing, obscuring the double-clear. |
| init | PARTIAL | "Finally checks spectate" language implies mutual exclusivity with joinCode block; no `else` before spectate check means both joinCode and spectate branches can execute in the same call if both params are present. |
| getView | PASS | Accurate. Pure accessor, no side effects. |
| getCurrentDebate | PASS | Accurate. Shallow copy confirmed; null guard confirmed. |
| destroy | PARTIAL | Omits that `removeEventListener` works correctly only because `_onPopState` is the same named `const` reference used in `addEventListener`. |

### needs_review
- **`init` — `joinCode`/`spectate` co-execution**: No `else` before the `spectate` block — if both `?joinCode=X&spectate=Y` are present, both `joinWithCode` and `enterFeedRoomAsSpectator` fire and `replaceState` is called twice. Undefined arena state race.
- **`_onPopState` — double `clearInterval(_rulingCountdownTimer!)`**: Cleared once in the overlay block and again in `room/preDebate` branch. Safe (idempotent) but undocumented; could mask a timer-reuse bug in future.
- **`formatTimer` — float input**: No `Math.floor` on `sec % 60`; fractional seconds produce decimal output strings.
- **`ready.then(() => init()).catch(() => init())`**: Auth rejection still calls `init()`, swallowing the rejection reason. Worth reviewing given 6-second safety timeout documented in CLAUDE.md.

---

## Agent 02

| Function | Verdict | Notes |
|----------|---------|-------|
| isPlaceholder | PASS | Accurate. Returns `!getSupabaseClient() || isAnyPlaceholder`. No side effects. |
| formatTimer | PARTIAL | Accurate logic, but omits that `sec % 60` without flooring means fractional input produces float seconds in the output. |
| randomFrom | PASS | Accurate. Non-null assertion confirmed, empty-array undefined noted. |
| pushArenaState | PARTIAL | Accurate, but omits that the second argument to `pushState` is an empty string `''` (legacy title param). Trivial. |
| _onPopState | PARTIAL | Description omits the second unconditional `clearInterval(_rulingCountdownTimer!)` inside the `room/preDebate` branch (first clear is in the overlay-removal block). |
| init | PARTIAL | Does not note that the dynamic import for `renderLobby`/`showPowerUpShop` runs concurrently and is not awaited before the `joinCode`/`spectate` checks proceed — independent async paths. |
| getView | PASS | Accurate. Pure accessor returning module-level `view`. |
| getCurrentDebate | PASS | Accurate. Shallow copy confirmed; null guard correct. |
| destroy | PASS | Accurate. Conditional live-mode cleanup, then unconditional cleanup and listener removal. |

### needs_review
- **`_onPopState` — double-clear of `_rulingCountdownTimer`**: Cleared in overlay block and again in `room/preDebate` branch — undocumented double-clear.
- **`init` — race between renderLobby import and joinCode/spectate calls**: Dynamic import of arena-lobby is fire-and-forget; joinWithCode and enterFeedRoomAsSpectator execute before renderLobby resolves. If renderLobby sets up DOM that joinWithCode depends on, a race exists.
- **`_onPopState` — non-exhaustive view branches**: Unknown view values silently skip all three branches, and the lobby re-render fires anyway (since view !== 'lobby'). No error surface, but corrupted view state would cause silent misbehavior.
- **`destroy` — does not clear non-live mode timers**: If `currentDebate.mode` is not `'live'` (e.g., `'voiceMemo'` or `'text'`), `cleanupFeedRoom`/`leaveDebate` are skipped. `resetState()` presumably clears timers, but if it doesn't, intervals leak.

---

## Agent 03

| Function | Verdict | Notes |
|----------|---------|-------|
| isPlaceholder | PASS | Accurate. |
| formatTimer | PARTIAL | `sec % 60` used without `Math.floor`; fractional input yields float seconds display. |
| randomFrom | PASS | Accurate. Non-null assertion, empty-array edge case noted. |
| pushArenaState | PASS | Accurate. |
| _onPopState | PARTIAL | `_rulingCountdownTimer` is cleared twice: once in the overlay block (conditional) and again in the `room/preDebate` branch (unconditional within that branch). Description mentions only one. |
| init | PARTIAL | `showPowerUpShop` is inside the same `.then()` callback as `renderLobby`, meaning it fires sequentially after `renderLobby`, not independently — description implies independence. |
| getView | PASS | Accurate. |
| getCurrentDebate | PASS | Accurate. |
| destroy | PASS | Accurate. |

### needs_review
- **`_onPopState` — `_rulingCountdownTimer` double-clear**: Cleared in overlay block and again in `room/preDebate` branch — safe but undocumented maintenance hazard.
- **`_onPopState` — async teardown race**: `leaveDebate()` and `cleanupFeedRoom()` are called without awaiting; rapid back-navigation could trigger partial teardown.
- **`init` — `joinCode` + `spectate` co-execution**: No mutual exclusion — both can fire in the same invocation if both params are present.
- **`ready.then(...).catch(() => init())`**: Auth errors silently swallow rejection reason. Guest-access intent per CLAUDE.md, but diagnostic information is lost on auth failure.

---

## Agent 04

| Function | Verdict | Notes |
|----------|---------|-------|
| isPlaceholder | PASS | Accurate. |
| formatTimer | PARTIAL | `sec % 60` without `Math.floor` — float input yields decimal seconds. |
| randomFrom | PASS | Accurate. |
| pushArenaState | PASS | Accurate. |
| _onPopState | PARTIAL | `_rulingCountdownTimer` cleared in overlay block AND unconditionally in `room/preDebate` branch — description mentions only one site. |
| init | PARTIAL | Does not document that `spectate` block has no `else` guard — both joinCode and spectate branches can execute if both params present; `replaceState` called twice. |
| getView | PASS | Accurate. |
| getCurrentDebate | PASS | Accurate. |
| destroy | PASS | Accurate. |

### needs_review
- **`init` — concurrent param handling**: Both `joinCode`/`mod_pending_challenge` and `spectate` can execute simultaneously; `replaceState` called twice; `joinWithCode` and `enterFeedRoomAsSpectator` both fire.
- **`_onPopState` — double `clearInterval(_rulingCountdownTimer!)`**: Two clear sites; could mask timer-reuse bug.
- **`formatTimer` — float input**: No floor on seconds component.
- **`_onPopState` — module-load side effect**: `window.addEventListener('popstate', _onPopState)` executes at module parse time, not inside `init()`. The listener is active even if `FEATURES.arena` is false or `init` was never called — this is inconsistent with the `init` guard pattern and could access uninitialized state.

---

## Agent 05

| Function | Verdict | Notes |
|----------|---------|-------|
| isPlaceholder | PASS | Accurate. |
| formatTimer | PARTIAL | `sec % 60` not floored — float input produces decimal seconds. |
| randomFrom | PASS | Accurate. |
| pushArenaState | PARTIAL | Omits that `history` (bare) is used instead of `window.history`. Minor but distinguishable. |
| _onPopState | PARTIAL | `_rulingCountdownTimer` double-clear not documented (overlay block + `room/preDebate` branch). |
| init | PARTIAL | `injectCSS()` called before the `#screen-arena` null guard — CSS injected even if element absent. Description does not note this. |
| getView | PASS | Accurate. |
| getCurrentDebate | PASS | Accurate. |
| destroy | PARTIAL | Omits that `removeEventListener` depends on reference identity of the named `_onPopState` const — if anything rebinds it, removal silently fails. |

### needs_review
- **`init`: `injectCSS()` runs before null guard** — if `#screen-arena` is absent (non-arena page with FEATURES.arena true), CSS is injected into the document anyway.
- **`_onPopState`: `_rulingCountdownTimer` double-clear** — two clear sites; safe but uncoordinated.
- **`destroy`: listener removal depends on `_onPopState` reference identity** — if `_onPopState` is ever wrapped or rebound, `removeEventListener` silently fails and the handler leaks.
- **`randomFrom`: empty-array type-unsafety** — non-null assertion suppresses TypeScript warning; callers have no compile-time protection against empty-array undefined.

---

## Aggregate Verdict Summary

| Function | PASS | PARTIAL | FAIL | Dominant |
|----------|------|---------|------|---------|
| isPlaceholder | 5 | 0 | 0 | **PASS** |
| formatTimer | 0 | 5 | 0 | **PARTIAL** |
| randomFrom | 5 | 0 | 0 | **PASS** |
| pushArenaState | 2 | 3 | 0 | PARTIAL |
| _onPopState | 0 | 5 | 0 | **PARTIAL** |
| init | 0 | 5 | 0 | **PARTIAL** |
| getView | 5 | 0 | 0 | **PASS** |
| getCurrentDebate | 5 | 0 | 0 | **PASS** |
| destroy | 3 | 2 | 0 | PASS |

**Total: ~36 PASS, ~9 PARTIAL, 0 FAIL** across 9 functions × 5 agents.

Zero FAILs — all fundamental Stage 2 behavioral claims confirmed against source.

## Consolidated needs_review Items

1. **`init` — `joinCode`/`spectate` co-execution** (flagged by 4/5 agents): No `else` guard before the `spectate` block. If both `?joinCode=X` and `?spectate=Y` are present in the URL, both `joinWithCode` and `enterFeedRoomAsSpectator` fire, and `window.history.replaceState` is called twice. Potential arena state collision.

2. **`_onPopState` — double-clear of `_rulingCountdownTimer`** (flagged by 5/5 agents): Cleared once in the `if (rulingOverlay)` block (conditional on overlay presence) and again unconditionally inside the `view === 'room' || view === 'preDebate'` branch. Safe as `clearInterval` is idempotent, but undocumented duplication could mask a timer-reuse bug.

3. **`_onPopState` — module-load side effect** (flagged by Agent 04): `window.addEventListener('popstate', _onPopState)` executes at module parse time, not inside `init()`. The listener is active even when `FEATURES.arena` is false or `init` was never called — could access uninitialized `view`/`currentDebate` state.

4. **`formatTimer` — float input** (flagged by 5/5 agents): `sec % 60` is not floored; fractional seconds input (e.g., `90.5`) produces `"1:30.5"` instead of `"1:30"`. No caller guard exists within this function.

5. **`init` — `injectCSS()` before null guard** (flagged by Agent 05): `injectCSS()` fires before the `#screen-arena` check. CSS is injected even when the element is absent, potentially polluting non-arena pages.

6. **`destroy` — listener removal via reference identity** (flagged by 2 agents): `removeEventListener('popstate', _onPopState)` only works because `_onPopState` is the same exported `const` reference used at registration. If anything wraps or rebinds `_onPopState`, removal silently fails and the handler leaks.

7. **`ready.catch(() => init())`** (flagged by 2 agents): Auth rejection still triggers `init()`, swallowing the error reason. Intentional per CLAUDE.md guest-access design, but diagnostic information is lost on auth failure.
