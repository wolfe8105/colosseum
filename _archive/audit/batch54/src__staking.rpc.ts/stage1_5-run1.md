# Anchor List — staking.rpc.ts

1. placeStake  (line 13)
2. getPool  (line 42)
3. settleStakes  (line 57)
4. getOdds  (line 71)

## Resolution notes

No candidates were excluded. All five agents agreed on exactly the same four function definitions, and direct source inspection confirms each is a top-level exported async function declaration (placeStake, getPool, settleStakes) or a non-async exported function declaration (getOdds). No inner helpers, callbacks, class methods, or additional top-level bindings exist in the file.
