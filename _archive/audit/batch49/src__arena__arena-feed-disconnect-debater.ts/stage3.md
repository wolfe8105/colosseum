# Stage 3 Outputs — arena-feed-disconnect-debater.ts

## Agent 01

### handleDebaterDisconnect (line 19)
**Verification**: PASS
**Findings**:
- All 11 claims confirmed against source. Async function, Promise<void> — confirmed line 19. Nested ternary disconnectorName resolution — confirmed lines 20–22. `void writeFeedEvent(...)` fire-and-forget no .catch() — confirmed line 25. `addLocalSystem(...)` synchronous — confirmed line 26. scoreA/scoreB module imports — confirmed lines 14, 29–30. Winning branch: _nulled, _nullReason, p_status:'cancelled', no scores — confirmed lines 34–40. Else branch: winnerSide, p_status:'complete', all scores — confirmed lines 43–51. Both .catch() swallow errors — confirmed. Unconditional setTimeout 1500ms — confirmed line 56. Timer ID not stored, endCurrentDebate voided — confirmed. No top-level try/catch — confirmed.

### handleDebaterDisconnectAsViewer (line 59)
**Verification**: PASS
**Findings**:
- All 7 claims confirmed. Synchronous void function — confirmed line 59. disconnectorName from debaterAName||'Side A' / debaterBName||'Side B' — confirmed lines 60–62. addLocalSystem/showDisconnectBanner called before branch — confirmed lines 63–64. showDisconnectBanner message exact — confirmed line 64. Branch on debate.spectatorView with 5000ms setTimeout — confirmed lines 66–73. Timer callback: ?.remove(), cleanupFeedRoom(), dynamic import no .catch() — confirmed lines 69–71. Timer ID not stored — confirmed.

**Unverifiable claims**: behavior of endCurrentDebate (double-finalize guard); CurrentDebate type fields (_nulled, _nullReason); whether scoreA/scoreB are live bindings.

---

## Agent 02

### handleDebaterDisconnect (line 19)
**Verification**: PASS
**Findings**: All material claims confirmed against source. Lines 20–22 nested ternary exact. Line 25 void writeFeedEvent no .catch(). Lines 34–40 winning branch: _nulled, _nullReason, cancelled, no scores. Lines 43–51 else branch: complete, winner, scores. Line 56 unconditional setTimeout. No contradictions between agents.

### handleDebaterDisconnectAsViewer (line 59)
**Verification**: PASS
**Findings**: All material claims confirmed. Lines 60–62 disconnectorName. Lines 63–64 synchronous calls before branch. Line 64 exact message string. Lines 66–73 spectatorView branch with 5s timer and dynamic import no .catch(). No contradictions between agents.

**Unverifiable claims**: update_arena_debate double-finalize guard; CurrentDebate type; scoreA/scoreB liveness.

---

## Agent 03

### handleDebaterDisconnect (line 19)
**Verification**: PASS
**Findings**: All claims confirmed. Agent additionally notes: `debate._nulled` and `debate._nullReason` are direct property mutations — if CurrentDebate does not declare these fields in arena-types.ts, these are ad-hoc property additions (TypeScript type gap, not a runtime error).

### handleDebaterDisconnectAsViewer (line 59)
**Verification**: PASS
**Findings**: All claims confirmed. Falsy spectatorView path is comment-only no-op — confirmed line 74.

**Unverifiable claims**: CurrentDebate type fields; RPC double-finalize guard; scoreA/scoreB binding type.

---

## Agent 04

### handleDebaterDisconnect (line 19)
**Verification**: PASS
**Findings**: All claims confirmed against source. Notes: if `safeRpc` throws synchronously before the .catch() is reached (highly unlikely), the function rejects its returned promise with no recovery. `void writeFeedEvent` drops rejection entirely unlike the .warn() logging pattern used on both safeRpc calls.

### handleDebaterDisconnectAsViewer (line 59)
**Verification**: PASS
**Findings**: All claims confirmed. Dynamic import .then() with no .catch() confirmed line 71 — on chunk-load failure, cleanupFeedRoom() will have already run and the spectator is left on a dead screen. Mod viewer falsy path is purely comment-dependent on a remote RPC being triggered by the remaining debater.

**Unverifiable claims**: endCurrentDebate implementation; CurrentDebate type; scoreA/scoreB binding type.

---

## Agent 05

### handleDebaterDisconnect (line 19)
**Verification**: PASS
**Findings**: All claims confirmed. Additional finding: `endCurrentDebate` is called unconditionally (line 56) even in the winning/nulled branch where `p_status: 'cancelled'` was written. Whether `endCurrentDebate` correctly handles cancelled-state debates is unverifiable from this file — depends on arena-room-end.ts implementation. `.warn()` pattern on safeRpc vs. void on writeFeedEvent is an inconsistency.

### handleDebaterDisconnectAsViewer (line 59)
**Verification**: PASS
**Findings**: All claims confirmed. Notes: mod viewer path has no timeout fallback — if the remaining debater also disconnects before triggering the RPC, mod viewers are permanently stranded.

**Unverifiable claims**: endCurrentDebate cancelled-debate handling; CurrentDebate type; scoreA/scoreB liveness; update_arena_debate double-finalize guard.

---

## Cross-Agent Consensus Summary

| Claim | Result |
|---|---|
| handleDebaterDisconnect: async, Promise<void> | PASS (5/5) |
| disconnectorName nested ternary, all 4 paths | PASS (5/5) |
| void writeFeedEvent fire-and-forget, no .catch() | PASS (5/5) |
| addLocalSystem synchronous | PASS (5/5) |
| scoreA/scoreB module imports for scores | PASS (5/5) |
| Winning branch: _nulled, _nullReason, cancelled, no scores | PASS (5/5) |
| Else branch: winnerSide, complete, all scores | PASS (5/5) |
| Both .catch() swallow, setTimeout unconditional | PASS (5/5) |
| setTimeout 1500ms unconditional, timer ID discarded | PASS (5/5) |
| endCurrentDebate voided, rejection lost | PASS (5/5) |
| No top-level try/catch | PASS (5/5) |
| handleDebaterDisconnectAsViewer: sync void | PASS (5/5) |
| disconnectorName from debaterAName/B with fallbacks | PASS (5/5) |
| addLocalSystem + showDisconnectBanner before branch | PASS (5/5) |
| showDisconnectBanner exact message string | PASS (5/5) |
| spectatorView branch, 5000ms setTimeout | PASS (5/5) |
| Timer: ?.remove(), cleanupFeedRoom(), import no .catch() | PASS (5/5) |
| Timer ID not stored, import failure silently lost | PASS (5/5) |

**Overall: PASS. 18/18 claims verified. No agent contradictions.**

---

## Findings

### F1 — Dynamic import no .catch() in handleDebaterDisconnectAsViewer timer
**Severity**: Medium
`import('./arena-lobby.ts').then(m => m.renderLobby())` (line 71) has no `.catch()`. On a chunk-load failure (network partition, Vercel CDN miss, deploy rollout), this rejects silently. By the time the timer fires, `cleanupFeedRoom()` has already been called and the disconnect banner has been removed — the spectator is left on a blank/dead screen with no feedback and no recovery path. A `.catch(e => console.warn(...))` minimum, or a fallback `window.location.reload()` / navigation, would prevent the stranded state.

### F2 — void writeFeedEvent with no .catch() (inconsistent with safeRpc pattern)
**Severity**: Low
Line 25: `void writeFeedEvent('disconnect', ..., 'mod')` discards the promise entirely with no `.catch()`. Both `safeRpc` calls in the same function log via `.catch((e) => console.warn(...))` on failure. If `writeFeedEvent` fails, the failure is completely invisible — no log, no user feedback. The inconsistency is worth flagging; at minimum a `.catch(e => console.warn(...))` would match the existing pattern.

### F3 — void endCurrentDebate() in 1500ms timer with no .catch()
**Severity**: Low
Line 56: `setTimeout(() => void endCurrentDebate(), 1500)` — `endCurrentDebate()` is an async function whose returned promise is discarded. Any throw from `endCurrentDebate` is silently lost, leaving the user on the disconnect screen indefinitely with no end-screen transition.

### F4 — Both setTimeout timer IDs not stored (uncancellable)
**Severity**: Low
Neither `setTimeout` call captures the return value. The 1500ms timer in `handleDebaterDisconnect` and the 5000ms timer in `handleDebaterDisconnectAsViewer` cannot be cancelled. If either function is called multiple times (e.g., due to a reconnect/disconnect race on the signaling channel), both timers fire, potentially calling `endCurrentDebate` or `renderLobby` twice.

### F5 — Mod viewer has no timeout fallback (coordination assumption)
**Severity**: Low (informational)
In `handleDebaterDisconnectAsViewer`, when `debate.spectatorView` is falsy (mod viewer), no action is taken — a comment states `endCurrentDebate` will be triggered by the remaining debater's RPC. If the remaining debater also disconnects before triggering that RPC, mod viewers are permanently stranded on the disconnect screen with no fallback.

---

## needs_review

- **debate._nulled / debate._nullReason type gap**: These fields are mutated directly on the `debate` parameter (lines 34–35). Whether `CurrentDebate` in `arena-types.ts` declares these as optional fields cannot be verified from this file. If they are not declared, this is an ad-hoc property addition invisible to TypeScript consumers reading those fields. Recommend verifying against `arena-types.ts`.
- **endCurrentDebate after cancelled branch**: `endCurrentDebate()` fires unconditionally (line 56) even when the debate was cancelled/nulled (line 38 sets `p_status: 'cancelled'`). Whether `endCurrentDebate` correctly handles a cancelled debate requires reading `arena-room-end.ts`.
