# Anchor List — arena-match-flow.ts

1. onMatchAccept (line 20)
2. onMatchConfirmed (line 72)
3. onOpponentDeclined (line 85)

## Resolution notes
No candidates excluded. All five agents unanimously identified the three top-level exported function definitions. The async arrow function callback at line 44 is an inline callback passed to setInterval — not a top-level named binding.
