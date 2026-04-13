# Anchor List — arena-types.ts (Arbiter Run 2)

Independent review of source file and Stage 1 outputs.

**Conclusion: Zero callable functions.**

Systematic scan of all 422 lines:
- Lines 1-7: `import type` statements — not functions
- Lines 13-17: `export type` aliases — not functions
- Lines 18-264: `export interface` declarations — not functions
- Lines 269-280: `export type FeedEventType` union — not a function
- Lines 281-293: `export interface FeedEvent` — not a function
- Lines 295-323: `export interface LoadoutReference`, `export interface OpponentCitedRef` — not functions
- Lines 326-332: `export const FEED_SCORE_BUDGET = { ... }` — object literal, not a function
- Lines 334-343: `export type FeedTurnPhase` union — not a function
- Lines 345-352: `export const FEED_*` numeric constants — not functions
- Lines 358-421: `export const MODES`, `QUEUE_AI_PROMPT_SEC`, `QUEUE_HARD_TIMEOUT_SEC`, `QUEUE_CATEGORIES`, `MATCH_ACCEPT_SEC`, `MATCH_ACCEPT_POLL_TIMEOUT_SEC`, `ROUND_DURATION`, `AI_TOTAL_ROUNDS`, `OPPONENT_POLL_MS`, `OPPONENT_POLL_TIMEOUT_SEC`, `TEXT_MAX_CHARS`, `AI_TOPICS`, `AI_RESPONSES`, `ROUND_OPTIONS` — all literal values or object/array literals, none are functions

**Anchor list: (empty)**

## Resolution notes

Runs 1 and 2 agree. No reconciliation needed. Unresolved count: 0.
