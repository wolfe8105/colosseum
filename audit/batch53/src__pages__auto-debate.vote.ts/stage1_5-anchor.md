# Anchor List — auto-debate.vote.ts

Source: src/pages/auto-debate.vote.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. showResults  (line 10)
2. castVoteImpl  (line 35)

## Resolution notes

Both arbiter runs agreed unanimously.
- castVoteImpl is declared `async` (line 35); Agents 03 and 04 omitted `async` from the signature notation but correctly identified it as top-level callable.
- getFingerprint parameter (line 40): inner parameter callback type — not a top-level binding, correctly excluded by all agents.
