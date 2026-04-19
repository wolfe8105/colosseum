# Stage 3 Outputs — arena-types.ts

Note: No callable functions in this file. Stage 3 is a cross-verification of Stage 2 schema/constant findings. Each agent independently verifies or disputes Stage 2 findings.

---

## Agent 01

### Dead Imports — SafeRpcResult, EquippedItem
CONFIRM. Lines 5-7: `import type { SettleResult } from '../staking.ts'` (USED — CurrentDebate._stakingResult), `import type { SafeRpcResult } from '../auth.ts'` (UNUSED — zero occurrences in file), `import type { EquippedItem } from '../powerups.ts'` (UNUSED — zero occurrences in file). Both SafeRpcResult and EquippedItem are dead imports.

### Hardcoded Hex Colors in MODES
CONFIRM. Lines 359-362: color fields in MODES object contain `'#E7442A'`, `'#8890A8'`, `'#555E78'`, `'#5DCAA5'`. CLAUDE.md states: "No hardcoded hex colors anywhere except `src/cards.ts` Canvas API (intentional)." This file is not cards.ts. SEVERITY: Low.

### ROUND_OPTIONS Not as const
CONFIRM. Line 416: `export const ROUND_OPTIONS = [...]` — no `as const`, no `Readonly<>` wrapper. All other array constants in this file (`QUEUE_CATEGORIES`, `AI_TOPICS`) use `readonly` or `as const`. SEVERITY: Low (style inconsistency).

---

## Agent 02

### ELO Type Scatter
CONFIRM. Verified across interfaces:
- CurrentDebate.opponentElo: `number | string` (line 41)
- MatchData.opponent_elo?: `number` (optional, line 76)
- ModDebateJoinResult.opponent_elo: `number | null` (line 196)
- CheckPrivateLobbyResult.opponent_elo: `number | null` (line 248)
- JoinPrivateLobbyResult.opponent_elo: `number` (line 261)
- PendingChallenge.challenger_elo: `number` (line 238)

The widest type is `number | string`. The narrowest is `number`. The coercion chain (DB → RPC result type → state object) is not enforced by TypeScript. This is a correctness risk at assignment sites. SEVERITY: Low (type weakness, not runtime error in current code).

### AI_RESPONSES Weak Key Typing
CONFIRM. `Readonly<Record<string, readonly string[]>>` on line 398. Accessing with any key outside `'opening'`, `'rebuttal'`, `'closing'` returns `undefined` at runtime with no TypeScript error. SEVERITY: Low.

---

## Agent 03

### FEED_SCORE_BUDGET Key Typing
CONFIRM. `Readonly<Record<number, number>>` — integer keys 1-5 are the intended range, but the type accepts any number. No TypeScript error for `FEED_SCORE_BUDGET[0]` or `FEED_SCORE_BUDGET[99]`. At runtime these return `undefined` which would cause `NaN` in arithmetic. The implementation is correct only because callers always pass 1-5. SEVERITY: Low.

### DebateStatus Dual Values
CONFIRM. Line 15: both `'completed'` and `'complete'` in the union. This is documented tech debt from DB rename. Requires double-checking in any equality comparison. SEVERITY: Low (known, not new).

---

## Agent 04

### mod_status Untyped
CONFIRM. `ModQueueItem.mod_status: string` (line 182) and `ModStatusResult.mod_status: string` (line 220). Untyped as `string` rather than a union of known statuses. This means callers can write `item.mod_status === 'typo'` with no TypeScript error. SEVERITY: Low.

### modView / spectatorView Overlap
Noting: `CurrentDebate.modView?: boolean` (line 51) and `CurrentDebate.spectatorView?: boolean` (line 56). Both are view-role flags on the same object. They could theoretically both be true simultaneously — there is no exclusivity constraint. A debater-moderator hybrid is not a valid role, but the type permits it. SEVERITY: Low (design concern, not a bug in this file).

---

## Agent 05

### FeedEventType Backward Compatibility
CONFIRM. `'sentiment_vote'` retained in union (line 277) with comment confirming it is for legacy historical replay. `'sentiment_tip'` is the current paid-tip value. Both values must remain in the union as long as historical feed event rows exist. Correct.

### FeedTurnPhase Completeness
CONFIRM. 9 values cover the full state machine. No transitions appear unreachable given the constants (FEED_TOTAL_ROUNDS=4, FEED_PAUSE_DURATION=10, FEED_AD_BREAK_DURATION=60, etc.). The `'pre_round'` phase is the initial state. `'finished'` is terminal. Correct.

---

## Agent 06

### LoadoutReference Consistency
CONFIRM. `cited: boolean` and `cited_at: string | null`. Agent 10 Stage 2 noted these could become inconsistent (`cited=true, cited_at=null` or vice versa). This is a consumer-side concern — the type definition is valid. The interface has no invariant enforcement (TypeScript interfaces cannot enforce invariants). Not a bug in the type file itself.

### FEED_MAX_CHALLENGES Derivation
CONFIRM. Line 348: `export const FEED_MAX_CHALLENGES = FEED_TOTAL_ROUNDS - 1`. This evaluates to 3 at module load. It is a constant-time arithmetic expression, not a function call. Correct.

---

## Agent 07

### OpponentCitedRef already_challenged
CONFIRM. The `already_challenged` field is a required boolean. Callers who build this object must set it explicitly. The field is consumed in arena-feed-wiring.ts to gate the challenge button. The type definition is correct.

### FeedEvent.metadata Generic Type
CONFIRM. `Record<string, unknown>` is the appropriate pragmatic type for polymorphic event metadata. Consumers cast to specific types based on `event_type`. Correct tradeoff.

---

## Agent 08

### Numeric Constants Cross-Check
CONFIRM all values.
- MATCH_ACCEPT_SEC=12, MATCH_ACCEPT_POLL_TIMEOUT_SEC=15: 3s buffer — intentional, non-bug.
- ROUND_DURATION=120: 2 minutes per non-feed round.
- FEED_TURN_DURATION=120: same numeric value, different constant — both 2 minutes, different contexts.
- OPPONENT_POLL_MS=3000, OPPONENT_POLL_TIMEOUT_SEC=120: 40 maximum poll ticks.
- TEXT_MAX_CHARS=2000: guard in submitTextArgument.
- FEED_AD_BREAK_DURATION=60, FEED_FINAL_AD_BREAK_DURATION=30, FEED_VOTE_GATE_DURATION=30.
No numerical inconsistencies found.

---

## Agent 09

### AvailableModerator Optional Display Fields
CONFIRM. Both `display_name` and `username` are optional. A moderator row without either would render as '[unknown]' or similar. This is a schema permissiveness issue. The DB may guarantee at least one, but the TypeScript type does not enforce it. SEVERITY: Low.

### SafeRpcResult Import
Additional check: searched all 422 lines for 'SafeRpcResult' — appears only on line 6 in the import statement. Zero usages. Dead import confirmed. Same for 'EquippedItem' — appears only on line 7. Dead import confirmed.

---

## Agent 10

### AI_TOPICS Array
`AI_TOPICS: readonly string[]` (line 385). 10 debate topics. These are the sample topics for AI sparring mode. The type is `readonly string[]` — callers cannot push. Correct. The content is hardcoded — no DB-driven topics. This is by design for AI mode.

### MODES Object
`MODES: Readonly<Record<DebateMode, ModeInfo>>` with `as const` (lines 358-363). Every DebateMode key is present ('live', 'voicememo', 'text', 'ai'). The `as const` ensures literal types on all inner values. The hex colors are a policy violation but the structure is correct.

---

## Agent 11

### Overall Assessment
All Stage 2 findings confirmed by multiple agents. No false positives identified. No new findings beyond what Stage 2 surfaced.

The file's primary risks are:
1. Type weakness (ELO scatter, weak key types, untyped status strings) — none are runtime bugs in current code, all are places where future code could introduce bugs with no compiler safety net.
2. Two dead imports — cleanup only.
3. One policy violation (hex colors in MODES) — cosmetic/policy.

## Consolidated Findings Summary

**REAL — Low severity (type/style):**
1. **Dead imports**: `SafeRpcResult` (line 6) and `EquippedItem` (line 7) imported but never referenced.
2. **Hardcoded hex colors in MODES** (lines 359-362): Violates CLAUDE.md "No hardcoded hex colors" policy. Intentionality unclear — not marked as intentional unlike cards.ts.
3. **ROUND_OPTIONS not Readonly/as const** (line 416): Inconsistency with all other array constants in this file.
4. **ELO type scatter**: `opponentElo` represented as `number`, `number|null`, `number|string`, `number|undefined` across 6 interfaces. Coercion burden on all consumers.
5. **AI_RESPONSES weak key type**: `Record<string, readonly string[]>` allows undefined access on missing keys at runtime.
6. **FEED_SCORE_BUDGET weak key type**: `Record<number, number>` allows out-of-range numeric key access.
7. **DebateStatus dual values** ('complete' and 'completed'): Documented tech debt requiring dual-check in all status comparisons.
8. **mod_status untyped as string**: Both ModQueueItem and ModStatusResult use `string` instead of a known-values union.

**NON-BUG OBSERVATIONS:**
- `FeedEventType` retains `'sentiment_vote'` correctly for historical replay.
- `FeedTurnPhase` covers the full feed room state machine.
- `FEED_MAX_CHALLENGES = FEED_TOTAL_ROUNDS - 1` is a correct derived constant.
- All numeric timing constants are consistent with their usage in arena-room-live.ts (confirmed).
