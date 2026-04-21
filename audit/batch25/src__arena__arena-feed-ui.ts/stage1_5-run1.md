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
- All 11 Stage 1 nominees confirmed. Each has a concrete function body with live DOM side effects.
- No type-only exports, re-exports, or pure constants present in this file.
- `budgetRound` (imported from arena-feed-state.ts) is never read in any function body — only its setter `set_budgetRound` is used inside `resetBudget`. Confirmed unused import; flagged for cleanup but has no bearing on the anchor list.
- Line numbers verified against source; minor off-by-one discrepancies from Stage 1 submissions due to header comment counting conventions.
