# Anchor List — arena-match-flow.ts

1. onMatchAccept (line 20)
2. onMatchConfirmed (line 72)
3. onOpponentDeclined (line 85)

## Resolution notes
No candidates excluded. Callback at line 44 (inline arrow fn to setInterval) is not a top-level named binding.
