# Stage 2 Outputs — async.actions-challenge.ts

## Agent 01

### challenge
Synchronous, void-returning, one parameter `takeId: string`. Calls `requireAuth('challenge someone to a debate')` — early-returns (silent) if auth fails. Searches `state.hotTakes` with `.find(t => t.id === takeId)`; early-returns (silent) if not found. If found, calls `_showChallengeModal(take)`. No state writes. No DOM ops. No error handling.

### _showChallengeModal
Synchronous, void-returning, one parameter `take: HotTake`. Linear body — no branches. Removes any existing `#challenge-modal` element via optional chaining. Escapes `take.user` and `take.text` via `escapeHTML` into `safeUser`/`safeText`. Writes `state.pendingChallengeId = take.id`. Creates `<div id="challenge-modal">` with fixed/overlay inline styles (z-index 10000). Sets `modal.innerHTML` to a bottom-sheet template containing: subtitle with `safeUser`, quoted `safeText`, ELO via `Number(take.elo)`, textarea `#challenge-response`, CANCEL and "⚔️ BET." buttons (both use `data-action` attributes). Attaches single delegated click listener: backdrop click removes modal; `cancel-challenge` removes modal; `submit-challenge` calls `void _submitChallenge(state.pendingChallengeId)`. Appends to `document.body`. No error handling.

### _submitChallenge
Async, returns `Promise<void>`, parameter `takeId: string | null`.

Early returns:
1. `!takeId` → return (flag never set).
2. `state.challengeInFlight` → return (flag unchanged).
3. Sets `state.challengeInFlight = true`.
4. `!take` from hotTakes lookup → sets `state.challengeInFlight = false`, return.
5. `!text` (textarea value trimmed) → sets textarea border to `--mod-magenta`, sets flag false, return.

Main path: `take.challenges++` (optimistic), removes `#challenge-modal`, calls `loadHotTakes(state.currentFilter)`.

Branch A (real backend — `getSupabaseClient() && !getIsPlaceholderMode()`): `try { await safeRpc('create_challenge', { p_hot_take_id, p_counter_argument, p_topic }) }`. On `error` from RPC: rolls back `take.challenges--`, re-renders, shows error toast, sets flag false, returns. On success: shows success toast, calls `_enterArenaWithTopic(take.text)`. Catch block: rolls back, re-renders, shows error toast — does NOT explicitly reset flag in catch body (falls through to line 109).

Branch B (placeholder): skips RPC, shows success toast, calls `_enterArenaWithTopic(take.text)`.

Line 109 (always reached after try/catch or else): `state.challengeInFlight = false`.

State reads: `state.challengeInFlight`, `state.hotTakes`, `state.currentFilter`. State writes: `state.challengeInFlight`, `take.challenges`. DOM reads: `#challenge-response` textarea value. DOM writes: textarea border color, removes `#challenge-modal`.

## Agent 02

### challenge
Synchronous void. Calls `requireAuth('challenge someone to a debate')` — early-returns if false. Searches `state.hotTakes.find()` — early-returns if not found. Calls `_showChallengeModal(take)`. No state mutations. No DOM operations. Silent failures on both early-exit conditions.

### _showChallengeModal
Synchronous void. Unconditionally removes any existing `#challenge-modal` from DOM (optional chaining). Escapes `take.user` and `take.text` via `escapeHTML`. Writes `state.pendingChallengeId = take.id`. Creates div modal with id `challenge-modal`, fixed overlay styles, and sets `innerHTML` with bottom-sheet HTML template (includes `safeUser`, `safeText`, `Number(take.elo)`, textarea `#challenge-response`, buttons with `data-action="cancel-challenge"` and `data-action="submit-challenge"`). Attaches delegated click listener to modal — closes on backdrop click, removes on cancel, calls `void _submitChallenge(state.pendingChallengeId)` on submit. Appends modal to `document.body`. No branches, no error handling.

### _submitChallenge
Async, `Promise<void>`. Guards: `!takeId` → return; `challengeInFlight` → return. Sets `challengeInFlight = true`. Looks up take; if not found → resets flag, returns. Reads textarea `#challenge-response` value; if empty → visual feedback, resets flag, returns. Optimistically increments `take.challenges++`, removes modal, re-renders. Real backend branch: `await safeRpc(...)`, error case rolls back + toast + resets flag + returns; success case shows toast + navigates arena. Catch block rolls back + toast but does not reset flag (line 109 handles it). Else branch (placeholder): toast + navigate. Line 109 always resets flag.

## Agent 03

### challenge
Synchronous void. Two early-return guards: auth failure (via `requireAuth`), missing take in `state.hotTakes`. Calls `_showChallengeModal(take)` on success. No state writes.

### _showChallengeModal
Synchronous void. Removes stale `#challenge-modal`. Escapes user/text via `escapeHTML`. Writes `state.pendingChallengeId`. Builds div modal with inline overlay CSS, bottom-sheet HTML template (escaped user/text, `Number(take.elo)`, textarea, two data-action buttons). Attaches delegated click handler: backdrop → remove modal; cancel-challenge → remove modal; submit-challenge → `void _submitChallenge(state.pendingChallengeId)`. Appends to body. No branching, no error handling.

### _submitChallenge
Async, `Promise<void>`. Five early-exit paths before main body: null takeId (flag not set); in-flight flag already true (flag unchanged); take not found (flag reset); empty textarea (flag reset + visual feedback). Main body: optimistic `take.challenges++`, remove modal, `loadHotTakes`. Real backend: try/await `safeRpc('create_challenge', ...)` — error branch: rollback, re-render, toast, flag reset, early return; success: toast + `_enterArenaWithTopic`; catch: rollback + re-render + toast (no explicit flag reset in catch). Placeholder: toast + navigate. Line 109 resets flag unconditionally. State.challengeInFlight reset trace: correct on all paths. `take.challenges` rollback on both error object and exception.

## Agent 04

### challenge
Synchronous void, one parameter `takeId: string`. Calls `requireAuth(...)` — returns early if false. Searches `state.hotTakes` — returns early if not found. Calls `_showChallengeModal(take)`. Zero state mutations. Zero DOM ops. No error handling.

### _showChallengeModal
Synchronous void, one parameter `take: HotTake`. Linear body. Removes existing `#challenge-modal` (optional chaining). Escapes `take.user` and `take.text`. Sets `state.pendingChallengeId = take.id`. Creates div, sets id and inline styles, sets innerHTML with bottom-sheet template. Template includes escaped user/text, `Number(take.elo)`, textarea `#challenge-response`, cancel and submit buttons. Attaches click listener: backdrop click removes modal; `data-action="cancel-challenge"` removes modal; `data-action="submit-challenge"` fires `void _submitChallenge(state.pendingChallengeId)`. Appends to body. No error handling.

### _submitChallenge
Async. Guards: `!takeId` exits (flag not set); `challengeInFlight` exits (flag unchanged). Sets flag true. Take not found: flag false, return. Empty textarea: border color → magenta, flag false, return. Main: `take.challenges++`, remove modal, `loadHotTakes`. Branch real: try/await `safeRpc`; on error: rollback, re-render, toast, flag false, return; on success: toast + `_enterArenaWithTopic`; catch: rollback, re-render, toast (flag reset by line 109, not inline in catch). Branch placeholder: toast + navigate. Line 109: flag false unconditionally. All paths that set flag to true eventually reset it to false (line 109 is the catch-all after the if/else block).

## Agent 05

### challenge
Synchronous void. Parameter `takeId: string`. Auth guard via `requireAuth('challenge someone to a debate')` — early return if false. `state.hotTakes.find()` lookup — early return if not found. Calls `_showChallengeModal(take)`. No mutations.

### _showChallengeModal
Synchronous void. Parameter `take: HotTake`. Removes existing `#challenge-modal`. Escapes `take.user` → `safeUser`, `take.text` → `safeText` via `escapeHTML`. Writes `state.pendingChallengeId = take.id`. Creates div modal: fixed overlay, z-index 10000, flexbox. Sets innerHTML bottom-sheet template with: heading "⚔️ CHALLENGE", `safeUser` in subtitle, quoted `safeText`, `Number(take.elo)` for ELO display, textarea `#challenge-response`, CANCEL and "⚔️ BET." buttons.

**Hardcoded color values in template:** `#132240` (gradient start, line 36 — marked `/* TODO: needs CSS var token */`) and `#6a7a90` (ELO line metadata text, line 42 — also commented TODO). All other colors use `--mod-*` tokens.

Delegated click listener: backdrop → remove; cancel-challenge → remove; submit-challenge → `void _submitChallenge(state.pendingChallengeId)`. Appends to body.

### _submitChallenge
Async `Promise<void>`. Early exits: null/falsy `takeId` (flag never set); `challengeInFlight` true (flag unchanged); take not found (flag reset); empty textarea (border red + flag reset). Optimistic: `take.challenges++`, remove `#challenge-modal`, `loadHotTakes(state.currentFilter)`. Real backend: `await safeRpc('create_challenge', { p_hot_take_id, p_counter_argument, p_topic })`. Error object → rollback + re-render + toast + flag false + return. No error → toast + `_enterArenaWithTopic(take.text)`. Exception → rollback + re-render + toast (flag handled by line 109). Placeholder: toast + navigate. Line 109: `state.challengeInFlight = false`.

Outbound calls: `loadHotTakes` (async.render.ts), `getSupabaseClient`/`getIsPlaceholderMode` (auth.ts), `safeRpc` (auth.rpc.ts), `showToast` (config.ts), `_enterArenaWithTopic` (async.utils.ts).
