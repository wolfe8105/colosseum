# Stage 1 Outputs — arena-feed-heartbeat.ts

## Agent 01

1. setParticipantGoneCallback  (line 30)
2. startHeartbeat  (line 34)
3. stopHeartbeat  (line 73)
4. sendGoodbye  (line 82)
5. checkStaleness  (line 94)

Exclusions: `_onParticipantGone` — `let` initialized to `null`, not a callable binding. `sendBeat` — `const` arrow function defined inside `startHeartbeat`; inner function, not top-level.

## Agent 02

1. setParticipantGoneCallback  (line 30)
2. startHeartbeat  (line 34)
3. stopHeartbeat  (line 73)
4. sendGoodbye  (line 82)
5. checkStaleness  (line 94)

Exclusions: `_onParticipantGone` (line 28) — `let` initialized to `null`, not a callable binding. `sendBeat` (line 55) — `const` arrow function defined inside `startHeartbeat`, not top-level.

## Agent 03

1. setParticipantGoneCallback  (line 30)
2. startHeartbeat  (line 34)
3. stopHeartbeat  (line 73)
4. sendGoodbye  (line 82)
5. checkStaleness  (line 94)

Exclusions: `_onParticipantGone` (line 28) — `let` variable initialized to `null`; it holds a function reference at runtime but its body is not defined here. `sendBeat` (line 55) — `const` arrow function declared inside `startHeartbeat`'s body. Not top-level. `setInterval(() => checkStaleness(), 5000)` callback — anonymous and inline; not a named binding. All imported symbols defined elsewhere.

## Agent 04

1. setParticipantGoneCallback  (line 30)
2. startHeartbeat  (line 34)
3. stopHeartbeat  (line 73)
4. sendGoodbye  (line 82)
5. checkStaleness  (line 94)

Exclusions: `_onParticipantGone` (line 28) — module-level `let` variable holding a nullable function reference initialized to `null`. It is a variable, not a callable binding definition. `sendBeat` (line 55) — `const` arrow function declared inside `startHeartbeat`; inner/local scope, not top-level. Anonymous arrow `() => checkStaleness()` (line 69) — anonymous callback passed to `setInterval`; not a named binding.

## Agent 05

1. setParticipantGoneCallback  (line 30)
2. startHeartbeat  (line 34)
3. stopHeartbeat  (line 73)
4. sendGoodbye  (line 82)
5. checkStaleness  (line 94)

Exclusions: `_onParticipantGone` (line 28) — `let` variable initialized to `null`, not a callable definition. It is a slot that holds a callback once assigned, but it is not itself a named function binding. `sendBeat` (line 55) — `const` arrow function declared inside `startHeartbeat`'s body — not top-level scope.
