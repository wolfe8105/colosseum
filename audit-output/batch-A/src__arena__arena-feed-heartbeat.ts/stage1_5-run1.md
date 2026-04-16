# Anchor List — arena-feed-heartbeat.ts

1. setParticipantGoneCallback  (line 30)
2. startHeartbeat  (line 34)
3. stopHeartbeat  (line 73)
4. sendGoodbye  (line 82)
5. checkStaleness  (line 94)

## Resolution notes
All five Stage 1 agents returned identical lists with zero disagreement. No arbitration was required. Exclusions confirmed: `_onParticipantGone` is a `let` variable initialized to `null`, not a callable binding; `sendBeat` is a `const` declared inside `startHeartbeat` and is not top-level; anonymous `setInterval` callbacks carry no named binding; all imports are defined elsewhere. `checkStaleness` is included despite lacking an `export` keyword — it is a top-level function declaration and qualifies as an anchor. Final count: 5 anchors.
