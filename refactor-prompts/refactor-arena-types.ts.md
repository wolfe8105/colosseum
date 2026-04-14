# Refactor Prompt — arena-types.ts (421 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-types.ts (421 lines).

Read CLAUDE.md first, then read src/arena/arena-types.ts in full before touching anything. The file is pure type/interface/constant declarations — no runtime logic. Split axis is domain, not lifecycle.

This refactor will touch many consumers across the codebase because every file currently doing `import { X } from './arena-types.ts'` needs its import path updated. Plan to grep for all consumers before starting and update them methodically.

SPLIT MAP (verify against the file before executing):

1. arena-types.ts (core, ~70 lines)
   Keeps: ArenaView, DebateMode, DebateStatus, DebateRole, ModeInfo, DebateMessage, CurrentDebate, SelectedModerator
   These are the types every arena consumer imports. Keeping them in arena-types.ts minimizes downstream import churn because most callers only need CurrentDebate / DebateRole / ArenaView.

2. arena-types-match.ts (~30 lines)
   MatchData, MatchAcceptResponse, MATCH_ACCEPT_SEC, MATCH_ACCEPT_POLL_TIMEOUT_SEC

3. arena-types-feed-list.ts (~35 lines)
   ArenaFeedItem (lobby feed list item), AutoDebateItem

4. arena-types-moderator.ts (~75 lines)
   AvailableModerator, ModQueueItem, ModDebateJoinResult, ModDebateCheckResult, ModStatusResult

5. arena-types-private-lobby.ts (~50 lines)
   PrivateLobbyResult, PendingChallenge, CheckPrivateLobbyResult, JoinPrivateLobbyResult

6. arena-types-results.ts (~35 lines)
   UpdateDebateResult, RankedCheckResult, PowerUpEquipped, ReferenceItem

7. arena-types-ai-scoring.ts (~25 lines)
   CriterionScore, SideScores, AIScoreResult

8. arena-types-feed-room.ts (~110 lines)
   The whole F-51 FEED ROOM TYPES block: FeedEventType, FeedEvent, LoadoutReference, OpponentCitedRef, FEED_SCORE_BUDGET, FeedTurnPhase, FEED_TURN_DURATION, FEED_PAUSE_DURATION, FEED_TOTAL_ROUNDS, FEED_MAX_CHALLENGES, FEED_CHALLENGE_RULING_SEC, FEED_AD_BREAK_DURATION, FEED_FINAL_AD_BREAK_DURATION, FEED_VOTE_GATE_DURATION

9. arena-constants.ts (~80 lines)
   QueueCategory interface + MODES, QUEUE_AI_PROMPT_SEC, QUEUE_HARD_TIMEOUT_SEC, QUEUE_CATEGORIES, ROUND_DURATION, AI_TOTAL_ROUNDS, OPPONENT_POLL_MS, OPPONENT_POLL_TIMEOUT_SEC, TEXT_MAX_CHARS, AI_TOPICS, AI_RESPONSES, ROUND_OPTIONS

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- `import type` for all type-only imports at consumer sites. Constants (FEED_TURN_DURATION, MODES, AI_TOPICS, etc) are value imports, not type imports.
- Dependency direction: core types (arena-types.ts) have no imports from other arena-types-*.ts files. The other split files may import from core types if they need DebateRole etc.
- Target under 300 lines, preference 150. Every file in this split should land well under 150.
- Run `npm run build` after the split, report chunk sizes and line counts for every new file.
- Run `npm run typecheck` and confirm zero NEW errors. There will be many MISSING import errors after the split until you update every consumer; fix those by updating imports, NOT by re-exporting from arena-types.ts.

CONSUMER IMPORT UPDATE PROCEDURE:

1. Run: `grep -rn "from.*arena-types" src/` to find every consumer.
2. For each consumer, read the import list and move each symbol to its new file:
   - CurrentDebate, DebateRole, ArenaView, DebateMode, DebateStatus, ModeInfo, DebateMessage, SelectedModerator → stay on arena-types.ts (no change needed)
   - MatchData, MatchAcceptResponse, MATCH_ACCEPT_SEC, MATCH_ACCEPT_POLL_TIMEOUT_SEC → arena-types-match.ts
   - ArenaFeedItem, AutoDebateItem → arena-types-feed-list.ts
   - AvailableModerator, ModQueueItem, ModDebateJoinResult, ModDebateCheckResult, ModStatusResult → arena-types-moderator.ts
   - PrivateLobbyResult, PendingChallenge, CheckPrivateLobbyResult, JoinPrivateLobbyResult → arena-types-private-lobby.ts
   - UpdateDebateResult, RankedCheckResult, PowerUpEquipped, ReferenceItem → arena-types-results.ts
   - CriterionScore, SideScores, AIScoreResult → arena-types-ai-scoring.ts
   - FeedEventType, FeedEvent, LoadoutReference, OpponentCitedRef, FEED_SCORE_BUDGET, FeedTurnPhase, FEED_* constants → arena-types-feed-room.ts
   - QueueCategory, MODES, QUEUE_AI_PROMPT_SEC, QUEUE_HARD_TIMEOUT_SEC, QUEUE_CATEGORIES, ROUND_DURATION, AI_TOTAL_ROUNDS, OPPONENT_POLL_MS, OPPONENT_POLL_TIMEOUT_SEC, TEXT_MAX_CHARS, AI_TOPICS, AI_RESPONSES, ROUND_OPTIONS → arena-constants.ts
3. A single consumer file may end up with 2-3 import statements (one per source module). That's expected and correct.
4. After every few consumer updates, run `npm run typecheck` to catch issues early.

LANDMINES — log these as `// LANDMINE [LM-TYPES-NNN]: description` comments in arena-types.ts. Do NOT fix them:

- LM-TYPES-001: `DebateStatus` includes both `'completed'` and `'complete'`. These look like the same state with two spellings. One is probably legacy from the DB, one is post-migration. Verify before cleanup.
- LM-TYPES-002 (in arena-constants.ts near ROUND_OPTIONS): ROUND_OPTIONS array lacks `as const` while every other readonly constant in the file uses it. Minor consistency issue.
- LM-TYPES-003 (in arena-types-feed-room.ts near FeedTurnPhase): The comment on the legacy `'sentiment_vote'` member of FeedEventType says "keep for historical replay compat". If no live code still emits this type, it can be narrowed to a replay-only type in a follow-up; don't touch now.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
