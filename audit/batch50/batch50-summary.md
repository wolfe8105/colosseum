# Batch 50 Audit Summary

**Run ID**: audit-run-batch50-20260418
**Date**: 2026-04-18
**Method**: Full Monty V3 (5-agent, 4-stage)
**Files**: 4

---

## Files Audited

| File | Anchors | Result |
|------|---------|--------|
| `src/arena/arena-room-live-input.ts` | 1 (`renderInputControls`) | CLEAN |
| `src/arena/arena-feed-transcript.ts` | 4 functions | 2 LOW findings |
| `src/rivals-presence-css.ts` | 1 (`injectRivalsPresenceCSS`) | 2 LOW findings |
| `src/scoring.ts` | 3 functions | 2 MEDIUM + 5 LOW findings |

---

## Findings

### HIGH — 0

### MEDIUM — 2

| ID | File | Line | Issue |
|----|------|------|-------|
| M-B50-4a | `src/scoring.ts` | 81 | `castVote`: `data as CastVoteResult` with no null guard — safeRpc can return `{ data: null, error: null }`, caller receives null typed as CastVoteResult, any property access throws TypeError |
| M-B50-4b | `src/scoring.ts` | 104 | `placePrediction`: same unsafe null cast pattern — `data as PlacePredictionResult` with no null guard |

### LOW — 9

| ID | File | Line | Issue |
|----|------|------|-------|
| L-B50-1 | `src/arena/arena-feed-transcript.ts` | 42–55 | `showInterimTranscript`: optional chaining skips insertBefore when stream.parentElement is null, but writes continue on detached element — silent failure, no interim transcript shown |
| L-B50-2 | `src/arena/arena-feed-transcript.ts` | 66–88 | `updateDeepgramStatus`: unknown status value leaves indicator visible with empty/stale text — maintenance risk if DeepgramStatus union extended |
| L-B50-3a | `src/rivals-presence-css.ts` | 29 | Hardcoded hex `#1a0a0a`, `#2d0a0a` in background gradient — CLAUDE.md policy violation (TODO comment present) |
| L-B50-3b | `src/rivals-presence-css.ts` | 35 | Hardcoded `rgba(204,41,54,0.4)` and `rgba(0,0,0,0.6)` in box-shadow — same policy violation, no TODO comment |
| L-B50-4a | `src/scoring.ts` | 74–77 | `castVote`: debateId/votedFor sent to RPC without `validateUUID()` call |
| L-B50-4b | `src/scoring.ts` | 97–100 | `placePrediction`: debateId/predictedWinnerId sent to RPC without `validateUUID()` call |
| L-B50-4c | `src/scoring.ts` | 11 | `SafeRpcResult` type imported but never referenced — dead import |
| L-B50-4d | `src/scoring.ts` | 94 | Placeholder stub `new_balance: 50 - amount` produces negative balance when `amount > 50` |
| L-B50-4e | `src/scoring.ts` | 97–101 | `placePrediction`: `amount` has no client-side bounds validation (negative, zero, NaN pass to RPC) |

---

## Batch Totals

- **HIGH**: 0
- **MEDIUM**: 2
- **LOW**: 9
- **Total new findings**: 11

## Cumulative Audit Totals (post-Batch 50)

- Prior totals: 0 High, 47 Medium, 86 Low
- Batch 50 adds: 0 High, 2 Medium, 9 Low
- **Updated totals: 0 High, 49 Medium, 95 Low**

---

## Fix Guidance

### M-B50-4a/4b (scoring.ts) — Priority: Fix before next deployment

Both `castVote` (line 81) and `placePrediction` (line 104): add a null check before the `as` cast:

```typescript
// castVote
if (error) throw new Error(error.message);
if (!data) throw new Error('cast_vote returned no data');
return data as CastVoteResult;

// placePrediction
if (error) throw new Error(error.message);
if (!data) throw new Error('place_prediction returned no data');
return data as PlacePredictionResult;
```

### L-B50-1 (arena-feed-transcript.ts) — Priority: Low

`showInterimTranscript`: change optional chaining to an explicit guard:

```typescript
if (!stream.parentElement) return;
stream.parentElement.insertBefore(el, stream.nextSibling);
```

### L-B50-3a/3b (rivals-presence-css.ts) — Priority: Low (acknowledged TODO)

Replace hardcoded hex/rgba values on lines 29 and 35 with CSS variable tokens. Requires defining `--mod-bg-rival-gradient-dark` and `--mod-magenta-glow` (or similar) in the design token sheet.

### L-B50-4c (scoring.ts) — Priority: Low

Remove `import type { SafeRpcResult } from './auth.ts'` at line 11.
