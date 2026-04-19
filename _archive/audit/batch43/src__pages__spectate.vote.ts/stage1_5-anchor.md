# Anchor List — spectate.vote.ts

Source: src/pages/spectate.vote.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. wireVoteButtons  (line 13)
2. castVote  (line 21)
3. updateVoteBar  (line 64)
4. updatePulse  (line 81)

## Resolution notes
- Anonymous arrow callbacks `() => castVote('a', d)` / `() => castVote('b', d)` inside `wireVoteButtons`: excluded — not top-level named callables.
- 5 imports (lines 7–11): excluded — non-callable bindings.
