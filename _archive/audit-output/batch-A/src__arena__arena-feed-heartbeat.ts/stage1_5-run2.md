# Anchor List — arena-feed-heartbeat.ts

1. setParticipantGoneCallback  (line 30)
2. startHeartbeat  (line 34)
3. stopHeartbeat  (line 73)
4. sendGoodbye  (line 82)
5. checkStaleness  (line 94)

## Resolution notes

All five Stage 1 agents agreed on these five candidates. No conflicts to resolve.

Confirmed inclusions: `setParticipantGoneCallback` — top-level exported function with body defined here; `startHeartbeat` — top-level exported function (inner `const sendBeat` at line 55 excluded as inner-scope); `stopHeartbeat` — top-level exported function; `sendGoodbye` — top-level exported function; `checkStaleness` — top-level non-exported private function; qualifies as a named callable binding defined at top-level scope.

Confirmed exclusions: `_onParticipantGone` (line 28) — variable initialized to `null`, not a function definition. `sendBeat` (line 55) — inner scope `const` inside `startHeartbeat`, not top-level.
