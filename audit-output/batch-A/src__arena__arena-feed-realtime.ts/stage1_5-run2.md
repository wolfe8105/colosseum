# Anchor List — arena-feed-realtime.ts

1. subscribeRealtime  (line 37)
2. unsubscribeRealtime  (line 79)

## Resolution notes

Both candidates confirmed. `subscribeRealtime` and `unsubscribeRealtime` are top-level named function definitions with bodies written in this file (`export function` declarations). All other items in the file are disqualified: the `.on(...)` callbacks are inline expressions inside `subscribeRealtime`, the `export { ... } from` lines are re-exports of bindings defined in sibling files, `setParticipantGoneCallback(...)` is a module-level call expression, and `void currentDebate` is a standalone expression. No candidates excluded or added beyond the unanimous Stage 1 consensus.
