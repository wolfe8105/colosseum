# Anchor List — arena-feed-ui.ts

Source: src/arena/arena-feed-ui.ts
Produced by: stage 1.5 (arbiter runs 1 and 2 agreed unanimously)
Unresolved items: 0

1. updateTimerDisplay  (line 31)
2. updateTurnLabel  (line 36)
3. updateRoundLabel  (line 41)
4. setDebaterInputEnabled  (line 46)
5. updateBudgetDisplay  (line 61)
6. resetBudget  (line 76)
7. updateSentimentGauge  (line 84)
8. applySentimentUpdate  (line 94)
9. updateCiteButtonState  (line 102)
10. updateChallengeButtonState  (line 117)
11. showDisconnectBanner  (line 130)

## Resolution notes
- All five Stage 1 agents unanimously identified the same 11 exported functions. Both arbiter runs agree. No type-only exports, re-exports, or pure constants present.
- `budgetRound` is imported but unused in any function body (only its setter `set_budgetRound` is called). Dead import — does not affect anchor list. Flagged for Stage 2/3 review.
