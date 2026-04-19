# Batch 49 Audit Summary

**Run ID**: audit-run-20260418-batch49
**Date**: 2026-04-18
**Method**: Full Monty V3 (5-agent Stage 1, 2-run Stage 1.5 arbiter, 5-agent Stage 2, 5-agent Stage 3)
**Files processed**: 4 of 4

---

## Files Completing All Stages

All 4 files completed all stages without needs_review escalation that blocked completion:

1. **src/modifiers-rpc.ts** — PASS, no findings
2. **src/voicememo.ts** — PASS, 1 needs_review (default export object getters/lambda — structural observation, no bug)
3. **api/challenge.js** — PASS, no findings
4. **src/arena/arena-feed-disconnect-debater.ts** — PASS, findings below

---

## Files Hitting needs_review

### src/voicememo.ts
- Default export object (`voicememo`) getters and lambda wrapper — structural observation noted; not a bug; no action required.

### src/arena/arena-feed-disconnect-debater.ts (both resolved during batch)
- **debate._nulled / debate._nullReason type gap** — RESOLVED: arena-types.ts confirms both `_nulled?: boolean` and `_nullReason?: string` are declared on `CurrentDebate` (lines 55–56). Not a bug.
- **endCurrentDebate after cancelled branch** — Noted as unverifiable; documented below as informational.

---

## Findings by File

### src/modifiers-rpc.ts
No findings.

### src/voicememo.ts
No bug findings. Structural observation on default export object only.

### api/challenge.js
No findings.

### src/arena/arena-feed-disconnect-debater.ts

#### F1 — Dynamic import no .catch() in handleDebaterDisconnectAsViewer timer
**Severity**: Medium
**Location**: line 71
**Description**: `import('./arena-lobby.ts').then(m => m.renderLobby())` inside the 5000ms `setTimeout` has no `.catch()`. On chunk-load failure, `cleanupFeedRoom()` has already run and the disconnect banner removed — the spectator is left on a dead screen with no fallback or feedback.
**Fix**: Add `.catch(e => console.warn('[FeedRoom] lobby import failed:', e))` at minimum; consider a fallback navigation (e.g., page reload).

#### F2 — void writeFeedEvent with no .catch() (inconsistent with safeRpc pattern)
**Severity**: Low
**Location**: line 25
**Description**: `void writeFeedEvent('disconnect', ..., 'mod')` discards the promise with no `.catch()`. Both `safeRpc` calls in the same function log failures via `.catch((e) => console.warn(...))`. If `writeFeedEvent` fails (network, DB), the failure is completely invisible.
**Fix**: `void writeFeedEvent(...).catch(e => console.warn('[FeedRoom] writeFeedEvent failed:', e))`

#### F3 — void endCurrentDebate() in 1500ms timer with no .catch()
**Severity**: Low
**Location**: line 56
**Description**: `setTimeout(() => void endCurrentDebate(), 1500)` — `endCurrentDebate()` is async; its promise is discarded. Any rejection leaves the user on the disconnect screen indefinitely.
**Fix**: `setTimeout(() => endCurrentDebate().catch(e => console.warn('[FeedRoom] endCurrentDebate failed:', e)), 1500)`

#### F4 — Both setTimeout timer IDs not stored
**Severity**: Low
**Location**: lines 56 and 68
**Description**: Neither `setTimeout` captures its return value. Timers cannot be cancelled if the component tears down or the function is called multiple times (signaling race). The 5000ms timer in `handleDebaterDisconnectAsViewer` could call `renderLobby` twice if the function is called twice.
**Fix**: Store timer IDs in module-level refs and cancel on cleanup if a cleanup path exists in this module.

#### F5 — Mod viewer no timeout fallback (informational)
**Severity**: Low (informational)
**Location**: lines 73–74
**Description**: When `debate.spectatorView` is falsy (mod viewer path), no action is taken — the comment relies on the remaining debater's RPC to trigger `endCurrentDebate`. If the remaining debater also disconnects before firing that RPC, mod viewers are permanently stranded.

---

## Previously Fixed Encounters

None. No findings encountered in Batch 49 that matched items already listed as fixed in AUDIT-FINDINGS.md.

---

## Errors

None. All agent dispatches completed. Both Stage 1.5 arbiter runs agreed on first pass for all 4 files (no reconciliation required).

---

## Summary Table

| File | Stages | High | Medium | Low | needs_review |
|---|---|---|---|---|---|
| src/modifiers-rpc.ts | All done | 0 | 0 | 0 | 0 |
| src/voicememo.ts | All done | 0 | 0 | 0 | 1 (obs.) |
| api/challenge.js | All done | 0 | 0 | 0 | 0 |
| src/arena/arena-feed-disconnect-debater.ts | All done | 0 | 1 | 4 | 2 (resolved) |
| **Batch 49 Total** | | **0** | **1** | **4** | |
