# Anchor List — spectate.vote.ts

1. wireVoteButtons  (line 13)
2. castVote  (line 21)
3. updateVoteBar  (line 64)
4. updatePulse  (line 81)

## Resolution notes
- Arrow functions `() => castVote('a', d)` and `() => castVote('b', d)` inside `wireVoteButtons` body: excluded — anonymous callbacks, not top-level named callables.
- 5 imports (lines 7–11): excluded — non-callable module-level bindings.
