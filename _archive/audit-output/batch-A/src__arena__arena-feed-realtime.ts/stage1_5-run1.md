# Anchor List — arena-feed-realtime.ts

1. subscribeRealtime  (line 37)
2. unsubscribeRealtime  (line 79)

## Resolution notes
All five Stage 1 agents agreed unanimously on both candidates and all exclusions. No conflict resolution was required.

Verified against the source file summary: both functions have their bodies defined in `arena-feed-realtime.ts`. All other named symbols at the top level are either imported re-exports (`startHeartbeat`, `stopHeartbeat`, `sendGoodbye`, `modNullDebate`, `handleParticipantGone`, `setParticipantGoneCallback`) or non-function expressions (the `setParticipantGoneCallback(handleParticipantGone)` call at line 35). Anonymous inline callbacks inside `subscribeRealtime` are not top-level named bindings and are correctly excluded.
