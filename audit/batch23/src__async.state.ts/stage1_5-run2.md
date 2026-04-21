# Anchor List — src/async.state.ts

1. `state` — line 43

## Resolution notes

- `_hotTakes`, `_predictions`, `_standaloneQuestions`, `_currentFilter`, `_pendingChallengeId`, `_reactingIds`, `_postingInFlight`, `_challengeInFlight`, `_predictingInFlight`, `_wiredContainers` (lines 28–37): excluded — private backing variables, not exported.
- `PLACEHOLDER_TAKES` (line 76): excluded — static data-only constant, no runtime behavior.
- `PLACEHOLDER_PREDICTIONS` (line 157): excluded — static data-only constant, no runtime behavior.
- Module-level side effect (lines 200–202): excluded — bare statement, not an exported symbol.
