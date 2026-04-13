# Stage 2 Outputs — arena-types.ts

Note: This file has no callable functions. Stage 2 is a schema/constant deep-analysis pass. Each agent examines the types and constants for correctness, consistency, and cross-cutting concerns.

---

## Agent 01

### Imports
Three `import type` statements. `SettleResult` (staking.ts) is used in `CurrentDebate._stakingResult`. `SafeRpcResult` (auth.ts) and `EquippedItem` (powerups.ts) are imported but not referenced anywhere in this file. Both are dead imports.

### Type Aliases
- `ArenaView` (line 13): 11 string literal values. Covers all known view states.
- `DebateMode` (line 14): 4 values — 'live', 'voicememo', 'text', 'ai'. All four modes covered.
- `DebateStatus` (line 15): 6 values including both 'completed' and 'complete'. Dual-status pattern is documented technical debt. Server uses 'complete'; 'completed' may exist in client-side guard logic.
- `DebateRole` (line 17): 'a' | 'b'. Minimal and correct.

### Key Interfaces
- `CurrentDebate` (lines 33-61): The central runtime state object. 20 fields total, 15 optional. The `_`-prefixed fields (`_stakingResult`, `_nulled`, `_nullReason`) are internal sentinel fields. `modView` (line 51) and `spectatorView` (line 56) overlap — two booleans tracking viewing modes. `concededBy` (line 56) is `'a' | 'b' | null` — correct three-way union.
- `opponentElo: number | string` (line 41): broad type. String variant likely used when ELO is placeholder text like 'N/A' or when not yet resolved.

---

## Agent 02

### Constant Analysis

**MODES** (lines 358-363): `as const` applied to the whole object. The `color` fields use hex-like values — `'#E7442A'`, `'#8890A8'`, `'#555E78'`, `'#5DCAA5'`. CLAUDE.md says "No hardcoded hex colors anywhere except `src/cards.ts` Canvas API (intentional)." These hex colors in MODES are a CLAUDE.md policy violation — they should use CSS custom property tokens (`--mod-*`). SEVERITY: Low (policy violation, not a runtime bug).

**QUEUE_CATEGORIES** (lines 368-375): `as const` applied. 6 categories. Correct.

**ROUND_OPTIONS** (lines 416-421): NOT marked `as const`, NOT wrapped in `Readonly<>`. Every other array constant in this file uses either `readonly` or `as const`. This is an inconsistency. A caller could push to ROUND_OPTIONS at runtime. SEVERITY: Low.

---

## Agent 03

### ELO Type Survey

`opponentElo` appears across interfaces with different types:
- `CurrentDebate.opponentElo: number | string` (line 41) — broadest
- `MatchData.opponent_elo?: number` (line 76) — number only, optional
- `ModDebateJoinResult.opponent_elo: number | null` (line 196)
- `CheckPrivateLobbyResult.opponent_elo: number | null` (line 248)
- `JoinPrivateLobbyResult.opponent_elo: number` (line 261)
- `PendingChallenge.challenger_elo: number` (line 238)

The journey from DB (`number | null`) to UI state (`number | string`) involves multiple implicit coercions. Callers in arena-room-setup.ts, arena-queue.ts etc. must perform their own coercions. No type guard helper exists in this file. This is a type-system debt item.

---

## Agent 04

### FeedEventType Union

`FeedEventType` (lines 269-280): 9 values. The comment on `'sentiment_vote'` says "legacy rows — keep for historical replay compat." `'sentiment_tip'` replaces `'sentiment_vote'` for new events. Both must remain because historical FeedEvent rows may have `'sentiment_vote'`. The union is correct for backward compat.

### FeedTurnPhase Union

`FeedTurnPhase` (lines 334-343): 9 values mapping the feed room state machine:
- `'pre_round'` → `'speaker_a'` → `'pause_ab'` → `'speaker_b'` → `'pause_ba'` → (next round or `'ad_break'`) → `'final_ad_break'` → `'vote_gate'` → `'finished'`

The state machine is linear with a loop back for multiple rounds. `'ad_break'` is between rounds; `'final_ad_break'` is after the last round. Both are 60s and 30s respectively (`FEED_AD_BREAK_DURATION = 60`, `FEED_FINAL_AD_BREAK_DURATION = 30`). Consistent.

---

## Agent 05

### FEED_SCORE_BUDGET Analysis

`FEED_SCORE_BUDGET` (lines 326-332): maps score point values (5,4,3,2,1) to max uses per round (2,3,4,5,6). Higher value scores have lower budgets — inverse relationship. This is a game balance mechanic. The object is typed as `Readonly<Record<number, number>>` — correct.

The keys are numeric (5,4,3,2,1) but the type is `Record<number, number>` — any number key can be accessed without a type error. TypeScript won't catch `FEED_SCORE_BUDGET[0]` (returns undefined at runtime). A stricter type would use `Record<1|2|3|4|5, number>`. Low-severity type weakness.

---

## Agent 06

### Constant Numeric Values

- `MATCH_ACCEPT_SEC = 12`: accept window
- `MATCH_ACCEPT_POLL_TIMEOUT_SEC = 15`: 3s buffer over accept window
- `ROUND_DURATION = 120`: non-feed debate round length (seconds)
- `AI_TOTAL_ROUNDS = 6`: AI sparring rounds
- `OPPONENT_POLL_MS = 3000`: poll interval (milliseconds)
- `OPPONENT_POLL_TIMEOUT_SEC = 120`: poll timeout (seconds) = 40 ticks
- `TEXT_MAX_CHARS = 2000`: max text per submission
- `FEED_TURN_DURATION = 120`: feed room turn (seconds) — same numeric value as ROUND_DURATION but distinct constants, correct
- `FEED_PAUSE_DURATION = 10`: between-turn pause
- `FEED_TOTAL_ROUNDS = 4`: feed room rounds
- `FEED_MAX_CHALLENGES = 3`: derived from FEED_TOTAL_ROUNDS - 1
- `FEED_CHALLENGE_RULING_SEC = 60`: mod ruling window
- `FEED_AD_BREAK_DURATION = 60`
- `FEED_FINAL_AD_BREAK_DURATION = 30`
- `FEED_VOTE_GATE_DURATION = 30`

All numeric values are plausible. No obvious off-by-one concerns for the constants themselves.

---

## Agent 07

### AI_RESPONSES Typing

`AI_RESPONSES: Readonly<Record<string, readonly string[]>>` (lines 398-414): The key type is `string`, not a literal union. Consumers that call `AI_RESPONSES['someKey']` get `readonly string[]` back with no compile-time guarantee the key exists. At runtime, accessing a missing key returns `undefined`, which would crash callers expecting an array.

A stricter type: `Readonly<Record<'opening' | 'rebuttal' | 'closing', readonly string[]>>`.

The current definition works because the only callers are in arena-room-ai.ts which uses the known keys. But TypeScript provides no safety net.

---

## Agent 08

### Interface Field Consistency

**AvailableModerator** (lines 114-121): Both `display_name` and `username` are optional. A render that falls back `display_name ?? username ?? '[unknown]'` works, but if both are absent, the moderator list would show '[unknown]'. The DB may guarantee one exists, but the type doesn't.

**ModDebateCheckResult** (lines 201-211): `debater_a_name: string` and `debater_b_name: string` are required (no null). But `debater_a_id` and `debater_b_id` are `string | null`. A debate without a debater_a_id but with a debater_a_name is possible per the type — e.g., while waiting for the second debater to join.

**ModQueueItem.mod_status: string** (line 182): Untyped string rather than a union of expected values. Same pattern for `ModStatusResult.mod_status` (line 220). If there are known statuses (e.g., 'pending', 'active', 'completed'), a union would be safer.

---

## Agent 09

### Cross-Reference: Constants vs. Usage

- `TEXT_MAX_CHARS = 2000`: used as guard in arena-room-live.ts `submitTextArgument`. Consistent.
- `OPPONENT_POLL_MS = 3000` and `OPPONENT_POLL_TIMEOUT_SEC = 120`: used in arena-room-live.ts `startOpponentPoll`. Consistent.
- `ROUND_DURATION = 120`: used in arena-room-live.ts `startLiveRoundTimer`. Consistent.
- `FEED_TOTAL_ROUNDS = 4` and `FEED_MAX_CHALLENGES = 3`: FEED_MAX_CHALLENGES is imported in arena-feed-wiring.ts but (as noted in that audit) is imported and NOT used in arena-feed-wiring.ts. It appears to be a dead import there.
- `MATCH_ACCEPT_SEC = 12` and `MATCH_ACCEPT_POLL_TIMEOUT_SEC = 15`: used in arena-match.ts (not in this batch).

---

## Agent 10

### LoadoutReference and OpponentCitedRef

`LoadoutReference` (lines 296-312): 16 fields. `cited: boolean` and `cited_at: string | null` — the `cited` boolean is a derived truth (`cited === (cited_at !== null)`) but both are stored separately. Potential inconsistency if one is updated without the other. Not an issue in this file, but a consumer concern.

`OpponentCitedRef` (lines 315-323): includes `already_challenged: boolean`. This is a client-side computed field (not from DB directly) — set by the consumer when building this object. The type is correct.

`FeedEvent.metadata: Record<string, unknown> | null` (line 291): typed as a generic record. The actual shape of metadata varies by event_type but is not typed at this layer. Consumers must cast. This is a pragmatic trade-off for a flexible event system.

---

## Agent 11

### DebateStatus Dual Values

`DebateStatus = 'pending' | 'lobby' | 'matched' | 'live' | 'completed' | 'complete'` (line 15).

Both `'completed'` and `'complete'` exist. The DB column `arena_debates.status` uses `'complete'` per CLAUDE.md (canonical table is `arena_debates`). Some client code likely originated from an older `debates` table or API and used `'completed'`. Both values are in the type union to avoid TypeScript errors on either path. The technical debt is: any status equality check must check both values to be exhaustive.

Example pattern that would be BUG-PRONE without this: `if (debate.status === 'complete')` — would miss legacy `'completed'` rows. With the union both must be handled.

This is a documented architectural issue, not a new finding.

### Summary of Stage 2 Findings

1. **Dead imports**: SafeRpcResult and EquippedItem imported but not used.
2. **Hardcoded hex colors in MODES**: Policy violation per CLAUDE.md.
3. **ROUND_OPTIONS not Readonly/as const**: Inconsistency with other constants.
4. **ELO type scatter**: number, number|null, number|string, number|undefined across 6+ interfaces.
5. **AI_RESPONSES weak key typing**: string key allows undefined access.
6. **FEED_SCORE_BUDGET numeric key allows out-of-range access**: Record<number,number> vs. Record<1|2|3|4|5,number>.
7. **DebateStatus dual values ('complete'/'completed')**: Known tech debt.
8. **mod_status untyped as string**: ModQueueItem and ModStatusResult.
