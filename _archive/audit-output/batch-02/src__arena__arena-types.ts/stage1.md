# Stage 1 Outputs — arena-types.ts

## Agent 01

### File Character
Pure type-declaration and constant-definition file. Zero function declarations (no `function` keyword, no arrow-function assignments to exported names). The file exports:
- 4 type aliases (ArenaView, DebateMode, DebateStatus, DebateRole)
- 16 interfaces (ModeInfo, DebateMessage, CurrentDebate, SelectedModerator, MatchData, MatchAcceptResponse, ArenaFeedItem, AutoDebateItem, AvailableModerator, PowerUpEquipped, RankedCheckResult, UpdateDebateResult, ReferenceItem, CriterionScore, SideScores, AIScoreResult, ModQueueItem, ModDebateJoinResult, ModDebateCheckResult, QueueCategory, ModStatusResult, PrivateLobbyResult, PendingChallenge, CheckPrivateLobbyResult, JoinPrivateLobbyResult)
- 2 union type aliases (FeedEventType, FeedTurnPhase)
- 1 const object (FEED_SCORE_BUDGET — Readonly<Record<number, number>>)
- 1 const object (MODES — Readonly<Record<DebateMode, ModeInfo>>)
- 2 const objects (QUEUE_AI_PROMPT_SEC, QUEUE_HARD_TIMEOUT_SEC — Readonly<Record<DebateMode, number>>)
- 1 const array (QUEUE_CATEGORIES — readonly QueueCategory[])
- 7 primitive constants (MATCH_ACCEPT_SEC, MATCH_ACCEPT_POLL_TIMEOUT_SEC, ROUND_DURATION, AI_TOTAL_ROUNDS, OPPONENT_POLL_MS, OPPONENT_POLL_TIMEOUT_SEC, TEXT_MAX_CHARS)
- 1 const array (AI_TOPICS — readonly string[])
- 1 const object (AI_RESPONSES — Readonly<Record<string, readonly string[]>>)
- 1 const array (ROUND_OPTIONS — plain array of objects)
- 8 numeric constants in FEED section (FEED_TURN_DURATION, FEED_PAUSE_DURATION, FEED_TOTAL_ROUNDS, FEED_MAX_CHALLENGES, FEED_CHALLENGE_RULING_SEC, FEED_AD_BREAK_DURATION, FEED_FINAL_AD_BREAK_DURATION, FEED_VOTE_GATE_DURATION)
- 3 imported types (SettleResult, SafeRpcResult, EquippedItem)

**No callable functions whatsoever.** SafeRpcResult is imported but not referenced in any exported type.

### Callable Anchor Candidates
NONE. There are no exported or unexported function declarations or function-valued expressions. The Stage 1.5 anchor will be an empty list.

## Agent 02

### File Character
Confirmed: arena-types.ts is a pure schema/constants module. Every top-level statement is either `export type`, `export interface`, `export const` (holding a literal value, object literal, or array literal), or an `import type`. No runtime behavior other than constant initialization.

### Notable Items
- `FEED_MAX_CHALLENGES = FEED_TOTAL_ROUNDS - 1` — computed constant (3), not a function call.
- `SafeRpcResult` is imported from `../auth.ts` but not used in any type definition in this file. Dead import.
- `EquippedItem` is imported from `../powerups.ts` but not used in any type definition in this file. Dead import (unless used by consumers who re-export via this barrel — but this is not a barrel file, it's a direct export file).
- All `as const` / `Readonly<>` usage is correct defensive pattern for constants.

### Callable Anchor Candidates
NONE.

## Agent 03

### File Character
Confirmed pure types + constants. No functions. Verified line by line:
- Lines 1-10: imports (type-only)
- Lines 13-17: type aliases
- Lines 18-264: interfaces and union types
- Lines 326-421: const declarations

### Specific Observations
- `CurrentDebate` interface (lines 33-61): has optional fields `_stakingResult`, `_nulled`, `_nullReason` prefixed with `_` — private-by-convention fields that are set at runtime but are part of the exported contract. These are not functions.
- `FeedEventType` union (lines 269-280): includes `'sentiment_vote'` with comment "legacy rows — keep for historical replay compat." This signals the type must remain backward-compatible.
- `FEED_SCORE_BUDGET` (lines 326-332): maps score values (1–5) to budget limits (2–6 per round). Readonly record.
- `DebateStatus` (line 15): includes both `'completed'` and `'complete'` — two different status strings. This might be intentional (legacy compat) or a typo. Not a function issue but notable for future data migration.

### Callable Anchor Candidates
NONE.

## Agent 04

### File Character
Confirmed. No callable exports.

### Specific Observations
- `ROUND_OPTIONS` (lines 416-421): plain mutable array (no `as const`, no `Readonly<>`). The other arrays use `readonly` or `as const`. Inconsistency — but not a runtime bug since this array is read-only by convention.
- `AI_RESPONSES` (lines 398-414): Record keyed by `'opening'`, `'rebuttal'`, `'closing'`. Uses `Readonly<Record<string, readonly string[]>>`. The keys are string literals but the type is `string` — callers can try to access any key without TypeScript error. Weak typing.
- `QUEUE_AI_PROMPT_SEC` and `QUEUE_HARD_TIMEOUT_SEC` for `'ai'` mode are both `0` — this is correct (AI mode skips the queue).

### Callable Anchor Candidates
NONE.

## Agent 05

### File Character
Confirmed pure declaration file. Callable anchor list is empty.

### Specific Observations
- `DebateStatus` has `'completed'` and `'complete'` as separate values (line 15). This dual-value pattern is a known technical debt — DB uses `'complete'`, some client code might use `'completed'`. Not a function issue.
- `LoadoutReference` interface (lines 296-312): `cited` is boolean, `cited_at` is string | null. No optional marker on `cited` — it's required. This is consistent.
- `OpponentCitedRef` (lines 315-323): `already_challenged` is required boolean. Correct.
- All FEED_* constants are `export const` primitive numbers — safe for tree-shaking by bundler.
- `FeedTurnPhase` union (lines 334-343): 9 values covering the full turn state machine.

### Callable Anchor Candidates
NONE.

## Agent 06

### File Character
Confirmed. No function declarations or arrow function assignments.

### Specific Observations
- `SafeRpcResult` from `../auth.ts` is imported but NEVER referenced in any type or interface in this file. Dead import.
- `EquippedItem` from `../powerups.ts` is imported but NEVER referenced in any type or interface in this file. Dead import.
- `SettleResult` from `../staking.ts` IS referenced — `CurrentDebate._stakingResult?: SettleResult | null`. This import is live.
- `ModeInfo.available` field is typed as `string` but only used for display text (human-readable availability description). Appropriate.
- `ArenaFeedItem.score_a` and `score_b` are `number | null` (not `number | undefined`). Consistent with DB nullable columns.

### Callable Anchor Candidates
NONE.

## Agent 07

### File Character
Confirmed. No functions.

### Specific Observations
- `ModDebateJoinResult.opponent_elo` is `number | null` (line 196). `CurrentDebate.opponentElo` is `number | string` (line 41). Type mismatch between the join result and the debate state — callers must coerce. Potential bug surface.
- `MatchData.opponent_elo` is `number | undefined` (line 76 — optional field). Three different representations of opponent ELO across three interfaces. Technical debt.
- `PendingChallenge.challenger_elo` is `number` (required, line 238). Consistent with DB (NOT NULL column presumably).
- `CheckPrivateLobbyResult.opponent_elo` is `number | null` (line 248).
- `JoinPrivateLobbyResult.opponent_elo` is `number` (required, line 261).
- Pattern: ELO typing is inconsistent across interfaces — `number`, `number | null`, `number | string`, `number | undefined`.

### Callable Anchor Candidates
NONE.

## Agent 08

### File Character
Confirmed. No functions.

### Specific Observations
- `FeedEvent.side` is `'a' | 'b' | 'mod' | null` (line 286). `DebateRole` type (line 17) only covers `'a' | 'b'`. Feed events add `'mod'` and `null` — these are valid in context but not composable with DebateRole. Minor inconsistency.
- `ReferenceItem.supports_side` is `string | undefined` (line 152) rather than `DebateRole | null`. Weak typing.
- `AIScoreResult.overall_winner` is `string` (line 170) not `DebateRole`. Weak typing — could be `'a'`, `'b'`, `'tie'`, or anything.
- `UpdateDebateResult` (lines 135-142): all fields optional. This is a partial result type, appropriate for RPC returns.
- `MATCH_ACCEPT_SEC = 12` and `MATCH_ACCEPT_POLL_TIMEOUT_SEC = 15` — the accept timeout (15s) is 3 seconds longer than the accept window (12s). This provides a buffer for the poll to catch late-arriving server state.

### Callable Anchor Candidates
NONE.

## Agent 09

### File Character
Confirmed. No functions.

### Specific Observations
- `ROUND_DURATION = 120` (seconds). `FEED_TURN_DURATION = 120` (seconds). Both are 2 minutes. They appear to be the same concept applied in different contexts (non-feed rounds vs. feed room turns) but are separate constants — not cross-referenced.
- `AI_TOTAL_ROUNDS = 6` while `FEED_TOTAL_ROUNDS = 4`. Different round counts for different modes.
- `FEED_MAX_CHALLENGES = FEED_TOTAL_ROUNDS - 1 = 3`. This is a derived constant computed at module evaluation time, not a function call.
- `TEXT_MAX_CHARS = 2000`. Used by submitTextArgument guard in arena-room-live.ts.
- `OPPONENT_POLL_TIMEOUT_SEC = 120` and `OPPONENT_POLL_MS = 3000`. So the poll runs for 120 / (3000/1000) = 40 ticks maximum.

### Callable Anchor Candidates
NONE.

## Agent 10

### File Character
Confirmed. No functions.

### Specific Observations
- `AvailableModerator` (lines 114-121): has `display_name?: string` and `username?: string` — both optional. This allows a moderator row with neither field set, which would produce an empty display in any render. Weak schema.
- `PowerUpEquipped` (lines 123-128): `activated: boolean` — required. This is the equipped-power-up state.
- `RankedCheckResult` (lines 130-133): `profile_pct: number` — completion percentage for the ranked eligibility check.
- `ModStatusResult.moderator_display_name` (line 223): typed as `string` (not optional). Consistent with DB NOT NULL column.
- `AutoDebateItem` (lines 103-112): includes `score_a: number` and `score_b: number` (required). These are bot debate scores.

### Callable Anchor Candidates
NONE.

## Agent 11

### File Character
Confirmed. No functions.

### Full Import Analysis
- `import type { SettleResult } from '../staking.ts'` — USED in CurrentDebate._stakingResult
- `import type { SafeRpcResult } from '../auth.ts'` — NOT USED anywhere in this file
- `import type { EquippedItem } from '../powerups.ts'` — NOT USED anywhere in this file

### Consolidated Observations
All 11 agents agree: no callable functions exist in arena-types.ts. The file is a pure schema/constants module.

Noteworthy items for Stage 3:
1. Dead imports: SafeRpcResult, EquippedItem
2. DebateStatus dual values: 'completed' and 'complete'
3. ELO type inconsistency: number vs. number|null vs. number|string vs. number|undefined across interfaces
4. ROUND_OPTIONS not `as const` / not Readonly (inconsistency with other const arrays)
5. AI_RESPONSES keys typed as `string` not literal union (weak typing)
6. AIScoreResult.overall_winner typed as `string` not DebateRole (weak typing)

### Callable Anchor Candidates
NONE.
