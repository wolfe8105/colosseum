# Stage 2 Outputs — arena-feed-disconnect-debater.ts

## Agent 01

### handleDebaterDisconnect (line 19)

Async function. Reads `disconnectedSide` and `debate.role` to resolve `disconnectorName` via nested ternary: if the disconnected side matches the local user's role, uses `getCurrentProfile()?.display_name || 'You'`; otherwise uses `debate.opponentName`. Calls `void writeFeedEvent('disconnect', `${disconnectorName} disconnected.`, 'mod')` — fire-and-forget, no `.catch()`, rejection silently lost. Calls `addLocalSystem(...)` synchronously. Reads `scoreA`/`scoreB` from `arena-feed-state.ts` to compute `disconnectorScore` and `opponentScore`.

Branch: if `disconnectorScore > opponentScore` (disconnector was winning) — mutates `debate._nulled = true` and `debate._nullReason`; awaits `safeRpc('update_arena_debate', { p_debate_id: debate.id, p_status: 'cancelled', p_current_round: round })` with `.catch((e) => console.warn('[FeedRoom] cancel debate failed:', e))`. Else (losing or tied) — computes `winnerSide` as the opposite of `disconnectedSide`; awaits `safeRpc('update_arena_debate', { p_debate_id: debate.id, p_status: 'complete', p_current_round: round, p_winner: winnerSide, p_score_a: scoreA, p_score_b: scoreB })` with `.catch((e) => console.warn('[FeedRoom] finalize debate failed:', e))`. Both `.catch()` handlers log and swallow errors; execution continues regardless.

After whichever branch: `setTimeout(() => void endCurrentDebate(), 1500)` — unconditional, fires 1500ms after the awaited RPC resolves; timer ID not stored; `endCurrentDebate()` promise discarded via `void`; any rejection silently lost. Function returns `Promise<void>`. No top-level try/catch.

### handleDebaterDisconnectAsViewer (line 59)

Synchronous function. Resolves `disconnectorName` via ternary: `debate.debaterAName || 'Side A'` if `disconnectedSide === 'a'`, else `debate.debaterBName || 'Side B'`. Calls `addLocalSystem(...)` and `showDisconnectBanner(...)` synchronously.

Branch on `debate.spectatorView`: if truthy, registers `setTimeout` at 5000ms — callback removes `#feed-disconnect-banner` from DOM (optional-chained), calls `cleanupFeedRoom()` synchronously, then `import('./arena-lobby.ts').then(m => m.renderLobby())` — no `.catch()`; if import fails or `renderLobby()` throws, rejection is silently lost. Timer ID not stored; cannot be cancelled. If `debate.spectatorView` is falsy (mod viewer path): no-op; comment states `endCurrentDebate` will be triggered by the remaining debater's RPC. Returns `void`.

---

## Agent 02

### handleDebaterDisconnect (line 19)

Async function. Resolves `disconnectorName` via nested ternary on `disconnectedSide` and `debate.role`; reads `getCurrentProfile()` (sync call) when the disconnected side matches local role, with `?.display_name || 'You'`; reads `debate.opponentName` otherwise. Fire-and-forget `void writeFeedEvent('disconnect', ..., 'mod')` — no `.catch()`, rejection silently swallowed. `addLocalSystem(...)` synchronous.

Reads `scoreA`/`scoreB`/`round` from `arena-feed-state.ts` module-level imports (live bindings, values at call time). Winning-disconnector branch: mutates `debate._nulled = true` and `debate._nullReason`; awaits `safeRpc` with `p_status: 'cancelled'`; `.catch()` logs warning. Else branch: computes `winnerSide` opposite to `disconnectedSide`; awaits `safeRpc` with `p_status: 'complete'`, `p_winner`, `p_score_a`, `p_score_b`; `.catch()` logs warning. `safeRpc` errors swallowed after logging in both branches.

Unconditional `setTimeout(() => void endCurrentDebate(), 1500)` after both branches complete. No try/catch. Returns `Promise<void>`. `endCurrentDebate` return value voided; rejection silently lost.

### handleDebaterDisconnectAsViewer (line 59)

Synchronous function. Resolves `disconnectorName` from `debate.debaterAName`/`debate.debaterBName` with fallbacks. Calls `addLocalSystem(...)` and `showDisconnectBanner(...)` synchronously. No mutation of `debate`.

`if (debate.spectatorView)`: registers `setTimeout` at 5000ms; callback (1) removes `#feed-disconnect-banner` from DOM via `?.remove()`, (2) calls `cleanupFeedRoom()`, (3) calls `import('./arena-lobby.ts').then(m => m.renderLobby())` with no `.catch()` — import or `renderLobby()` failure silently lost. Timer ID not captured. Mod viewer path is comment-only no-op. Returns `void`.

---

## Agent 03

### handleDebaterDisconnect (line 19)

Async function. `disconnectorName` computed via two levels of nested ternary: outer on `disconnectedSide`, inner on `debate.role`; local-user-is-disconnector path calls `getCurrentProfile()?.display_name || 'You'`; opponent path uses `debate.opponentName`. `void writeFeedEvent(...)` fire-and-forget, rejection unhandled. `addLocalSystem(...)` synchronous. `disconnectorScore`/`opponentScore` read from `scoreA`/`scoreB` module-level imports.

Winning branch: sets `debate._nulled = true`, `debate._nullReason`; awaits `safeRpc` `p_status:'cancelled'`, `p_current_round:round`; `.catch()` logs+swallows. Losing/tied branch: `winnerSide` opposite of `disconnectedSide`; awaits `safeRpc` `p_status:'complete'`, `p_winner:winnerSide`, `p_score_a:scoreA`, `p_score_b:scoreB`, `p_current_round:round`; `.catch()` logs+swallows. `setTimeout(() => void endCurrentDebate(), 1500)` unconditional. Note in code: `endCurrentDebate` will re-call `update_arena_debate`; double-finalize guard handles it. No top-level try/catch. `Promise<void>`.

Note: `debate._nulled` and `debate._nullReason` are ad-hoc property writes — Stage 3 should verify whether `CurrentDebate` declares these fields.

### handleDebaterDisconnectAsViewer (line 59)

Synchronous void function. `disconnectorName` from `debate.debaterAName || 'Side A'` or `debate.debaterBName || 'Side B'`. Calls `addLocalSystem(...)` and `showDisconnectBanner(...)` synchronously. Branch on `debate.spectatorView`: truthy → `setTimeout` 5000ms with DOM removal of `#feed-disconnect-banner`, `cleanupFeedRoom()`, then dynamic import with `.then(m => m.renderLobby())` — no `.catch()`, rejection lost. Timer ID not stored. Falsy → no-op comment. Returns `undefined`.

---

## Agent 04

### handleDebaterDisconnect (line 19)

Async function. Nested ternary resolves `disconnectorName` from `disconnectedSide`/`debate.role`; uses `getCurrentProfile()?.display_name || 'You'` for local-user-disconnector path, `debate.opponentName` otherwise. `void writeFeedEvent(...)` fire-and-forget no `.catch()`. `addLocalSystem(...)` synchronous. `disconnectorScore`/`opponentScore` from module-level `scoreA`/`scoreB`.

`if disconnectorScore > opponentScore`: mutates `debate._nulled = true`, `debate._nullReason`; `await safeRpc('update_arena_debate', { p_debate_id, p_status:'cancelled', p_current_round:round }).catch(...)` logs+swallows. Else: `winnerSide` opposite; `await safeRpc('update_arena_debate', { p_debate_id, p_status:'complete', p_current_round:round, p_winner:winnerSide, p_score_a:scoreA, p_score_b:scoreB }).catch(...)` logs+swallows. Unconditional `setTimeout(() => void endCurrentDebate(), 1500)` after branch completes. `endCurrentDebate` promise voided, rejection lost. No top-level try/catch. `Promise<void>`.

`round`/`scoreA`/`scoreB` are live ES module bindings — values captured at time of RPC call, not at function entry.

### handleDebaterDisconnectAsViewer (line 59)

Synchronous void function. `disconnectorName` from `debate.debaterAName || 'Side A'` (side A) or `debate.debaterBName || 'Side B'` (side B). Calls `addLocalSystem(...)` and `showDisconnectBanner(...)` synchronously. `if (debate.spectatorView)`: 5000ms `setTimeout`; callback removes `#feed-disconnect-banner` (optional-chain), `cleanupFeedRoom()`, `import('./arena-lobby.ts').then(m => m.renderLobby())` — no `.catch()`, rejection silently lost. Timer ID not stored, uncancellable. Else: comment-only no-op. Returns `void`.

---

## Agent 05

### handleDebaterDisconnect (line 19)

Async function. Nested ternary resolves `disconnectorName` via 4-branch evaluation on `disconnectedSide` and `debate.role`. `getCurrentProfile()` called synchronously only on local-user-disconnector paths; `?.display_name || 'You'` guards null/undefined profile. `void writeFeedEvent(...)` fire-and-forget; rejection silently lost; no `.catch()`. `addLocalSystem(...)` synchronous. Module-level bindings `scoreA`/`scoreB`/`round` read at call time.

Winning branch: `debate._nulled = true`; `debate._nullReason` set; `await safeRpc` `p_status:'cancelled'`; `.catch()` logs+swallows. Else branch: `winnerSide` computed; `await safeRpc` `p_status:'complete'` with winner and scores; `.catch()` logs+swallows. Both branches fall through to unconditional `setTimeout(() => void endCurrentDebate(), 1500)`. Timer registered after awaited RPC completes; timer ID discarded; `endCurrentDebate` promise discarded; rejection lost. No top-level try/catch. Returns `Promise<void>`.

### handleDebaterDisconnectAsViewer (line 59)

Synchronous void function. `disconnectorName` from `debate.debaterAName || 'Side A'` or `debate.debaterBName || 'Side B'`. `addLocalSystem(...)` and `showDisconnectBanner(...)` called synchronously. `if (debate.spectatorView)`: `setTimeout(5000ms)` registers callback: `document.getElementById('feed-disconnect-banner')?.remove()`, `cleanupFeedRoom()`, `import('./arena-lobby.ts').then(m => m.renderLobby())` — no `.catch()`, import/render failure silently lost. Timer ID not stored. Else: no-op comment. Returns `void` immediately.

Note: If `cleanupFeedRoom()` throws inside the timer callback, it becomes an uncaught synchronous exception (not a Promise rejection) propagating to the global error handler.
