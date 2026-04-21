# Anchor List — arena-feed-ui.ts

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
- All 11 symbols confirmed. Every entry is a locally-defined exported function with concrete runtime behavior (DOM reads/writes and/or state setter calls).
- No type-only exports, re-exports, or pure constants exist in this file.
- `budgetRound` is imported from `arena-feed-state.ts` but is never read inside any function body — only its setter `set_budgetRound` is called (in `resetBudget`). This is a dead import; has no bearing on the anchor list.
- No exclusions required.
