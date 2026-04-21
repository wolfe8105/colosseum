# Anchor List — src/async.state.ts

Source: src/async.state.ts
Produced by: stage 1.5 (arbiter, runs agreed — no reconciliation needed)
Unresolved items: 0

1. state  (line 43)

## Resolution notes

- Private backing variables `_hotTakes`, `_predictions`, `_standaloneQuestions`, `_currentFilter`, `_pendingChallengeId`, `_reactingIds`, `_postingInFlight`, `_challengeInFlight`, `_predictingInFlight`, `_wiredContainers` (lines 28–37): excluded — unexported module-level vars.
- `PLACEHOLDER_TAKES` (line 76): excluded — static data constant (Record of HotTake arrays), no callable behavior.
- `PLACEHOLDER_PREDICTIONS` (line 157): excluded — static data constant (Prediction array), no callable behavior.
- Module-level side effect (lines 200–202): excluded — bare forEach statement, not a named binding.
