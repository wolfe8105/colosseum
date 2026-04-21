# Stage 2 Outputs — scoring.ts

## Agent 01

### validateUUID (line 48)
Receives `id: string`. Evaluates `!id` (falsy check); if true, throws `Error('Invalid user ID format')`. Then evaluates `!UUID_RE.test(id)` against the imported regex; if true, throws same error. If both pass, returns `id` unchanged. No DOM, no network, no side effects.
**No findings.**

### castVote (line 65)
Receives `debateId`, `votedFor`, `round` (default null). Calls `isPlaceholder()` → `getIsPlaceholderMode()`.
- Placeholder branch: returns hardcoded stub `{ success: true, vote_count_a: 5, vote_count_b: 3, your_vote: votedFor }`. No validation, no network.
- Live branch: `safeRpc<CastVoteResult>('cast_vote', { p_debate_id, p_voted_for, p_round })`. Awaits `{ data, error }`. If error: throws `new Error(error.message)`. Returns `data as CastVoteResult`.

**Finding**: `data as CastVoteResult` (line 81) — `safeRpc` can return `data: null` on a non-error path. Assertion silently produces `null` typed as `CastVoteResult`; callers destructuring vote counts will throw runtime TypeError. No null guard before cast. Severity: Medium.
**Finding (Low)**: No UUID validation on `debateId`/`votedFor` before RPC call. `validateUUID` is exported from this file but never called internally. RPC path not a `.or()` filter so not a strict policy violation — robustness gap.
**Finding (Low)**: `SafeRpcResult` type imported at line 11 but never referenced by name anywhere in the file — dead import.

### placePrediction (line 88)
Receives `debateId`, `predictedWinnerId`, `amount`. Calls `isPlaceholder()` → `getIsPlaceholderMode()`.
- Placeholder branch: returns `{ success: true, amount, new_balance: 50 - amount }`. No network.
- Live branch: `safeRpc<PlacePredictionResult>('place_prediction', { p_debate_id, p_predicted_winner, p_amount })`. If error: throws. Returns `data as PlacePredictionResult`.

**Finding**: `data as PlacePredictionResult` (line 104) — same unsafe null cast pattern. Medium.
**Finding (Low)**: `amount` not validated (negative, zero, NaN) before RPC dispatch. Server handles it but no client guard.
**Finding (Low)**: Placeholder stub `new_balance: 50 - amount` goes negative if `amount > 50` — misleading in dev/test mode.

## Agent 02

### validateUUID (line 48)
Pure guard — falsy check then UUID_RE regex test. Throws on failure; returns `id` on success. No side effects.
**No findings.**

### castVote (line 65)
Placeholder fast-path returns stub with `your_vote: votedFor` (raw string, no validation — only a risk if caller renders via innerHTML, not a bug in this function). Live path: `safeRpc('cast_vote', ...)` → destructure → throw on error → `data as CastVoteResult`.

**Finding (Medium)**: `data as CastVoteResult` (line 81) — null not guarded before cast. If RPC returns null data without error, caller receives null typed as CastVoteResult.
**Note**: `debateId`/`votedFor` passed to RPC without UUID validation — RPC param, not `.or()` filter; not a strict policy violation. Server validates.

### placePrediction (line 88)
Placeholder returns `{ success: true, amount, new_balance: 50 - amount }`. Live path: `safeRpc('place_prediction', ...)` → `data as PlacePredictionResult`.

**Finding (Medium)**: `data as PlacePredictionResult` (line 104) — same unsafe null cast.
**Finding (Low)**: `amount` has no bounds validation before RPC.

## Agent 03

### validateUUID (line 48)
Guard function. Pure. No flags.
**Additional observation**: `validateUUID` is exported and is the correct UUID guard for the project, but neither `castVote` nor `placePrediction` calls it before passing IDs to `safeRpc`. The function exists but is not used internally — callers must know to call it separately.

### castVote (line 65)
Standard pattern: placeholder fast-path, then `safeRpc` write, then null-unchecked cast.

**Finding (Medium)**: `data as CastVoteResult` (line 81) — null not guarded.
**Finding (Low)**: `validateUUID` exported from this file but never internally called on `debateId`/`votedFor`.

### placePrediction (line 88)
**Finding (Medium)**: `data as PlacePredictionResult` (line 104) — null not guarded.
**Finding (Low)**: `amount` unvalidated at client boundary.
**Finding (Low)**: Stub `new_balance: 50 - amount` uses magic constant 50; can go negative in dev mode.

## Agent 04

### validateUUID (line 48)
Pure guard. Correct. No issues.

### castVote (line 65)
Placeholder path: `{ success: true, vote_count_a: 5, vote_count_b: 3, your_vote: votedFor }`. Live: `safeRpc('cast_vote', {...})`, throw on error, `data as CastVoteResult`.

**Finding (Medium)**: `data as CastVoteResult` (line 81) — if data is null, cast bypasses null check. Castle Defense compliant.
**Finding (Low)**: No UUID validation on inputs. `SafeRpcResult` imported (line 11) but never used by name in this file — dead type import.

### placePrediction (line 88)
Same pattern.
**Finding (Medium)**: `data as PlacePredictionResult` (line 104) — unsafe cast.
**Finding (Low)**: `amount` not validated.
**Finding (Low)**: `SafeRpcResult` dead import.

## Agent 05

### validateUUID (line 48)
No findings.

### castVote (line 65)
**Finding (Medium)**: `data as CastVoteResult` (line 81) — null data not guarded before cast.
**Note**: No UUID validation on inputs for RPC args — robustness gap, not strict policy violation. Castle Defense compliant.

### placePrediction (line 88)
**Finding (Medium)**: `data as PlacePredictionResult` (line 104) — same unsafe null cast.
**Finding (Low)**: `amount` accepts NaN/negative/zero with no client guard.
**Note**: Stub `new_balance: 50 - amount` potentially negative — minor correctness in stub mode only.
