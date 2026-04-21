# Anchor List — src/async.state.ts

1. `state` — line 43

## Resolution notes

- `_hotTakes`, `_predictions`, `_standaloneQuestions`, `_currentFilter`, `_pendingChallengeId`, `_reactingIds`, `_postingInFlight`, `_challengeInFlight`, `_predictingInFlight`, `_wiredContainers` (lines 28–37): excluded — private/unexported backing variables.
- `PLACEHOLDER_TAKES` (line 76): excluded — static data constant, literal data only, no functions.
- `PLACEHOLDER_PREDICTIONS` (line 157): excluded — static data constant, literal data only, no functions.
- Module-level side effect (lines 200–202): excluded — not a binding, bare forEach statement.
