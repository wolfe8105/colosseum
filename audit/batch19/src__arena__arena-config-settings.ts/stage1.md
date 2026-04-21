# Stage 1 Outputs — arena-config-settings.ts

## Agent 01

Read 174 lines of 174 total.

1. comment — file header
2. comment — "Part of the arena.ts monolith split"
3. blank
4. import — `safeRpc, getCurrentUser, getCurrentProfile` from `../auth.ts`
5. import — `selectedRanked, set_selectedRanked, set_selectedRuleset` from `./arena-state.ts`
6. import type — `RankedCheckResult` from `./arena-types-results.ts`
7. import — `isPlaceholder, pushArenaState` from `./arena-core.utils.ts`
8. import — `showModeSelect` from `./arena-config-mode-select.ts`
9. blank
10-12. comments — RANKED PICKER divider
13. blank
14. bind name to function definition — `showRankedPicker` (exported)
15. blank
16. bind name to function definition — `closeRankedPicker` (exported)
17. blank
18-20. comments — RULESET PICKER divider
21. blank
22. bind name to function definition — `showRulesetPicker` (exported)
23. blank
24. bind name to function definition — `closeRulesetPicker` (exported)
25. blank

## Agent 02

Read 174 lines of 174 total.

1. comment — file header
2. comment — part-of note
3. blank
4. import — `safeRpc`, `getCurrentUser`, `getCurrentProfile` from `../auth.ts`
5. import — `selectedRanked`, `set_selectedRanked`, `set_selectedRuleset` from `./arena-state.ts`
6. import type — `RankedCheckResult` from `./arena-types-results.ts`
7. import — `isPlaceholder`, `pushArenaState` from `./arena-core.utils.ts`
8. import — `showModeSelect` from `./arena-config-mode-select.ts`
9. blank
10-12. comment — RANKED PICKER divider
13. blank
14. bind name to function definition — `showRankedPicker` (exported)
15-39. (inline body statements: guest guard, overlay creation, pushArenaState, querySelectorAll forEach wiring, RPC eligibility check, close handlers)
40. blank
41. bind name to function definition — `closeRankedPicker` (exported)
42-43. (inline body: overlay lookup, remove, forward/history logic)
44. blank
45-47. comment — RULESET PICKER divider
48. blank
49. bind name to function definition — `showRulesetPicker` (exported)
50-65. (inline body: overlay creation, wiring)
66. blank
67. bind name to function definition — `closeRulesetPicker` (exported)
68-69. (inline body)
70. blank

Notes: `getCurrentProfile` and `selectedRanked` are imported but never referenced.

## Agent 03

Read 174 lines of 174 total.

1. comment — file header
2. comment — monolith split note
3. blank
4. import — `safeRpc` from `../auth.ts`
5. import — `getCurrentUser` from `../auth.ts`
6. import — `getCurrentProfile` from `../auth.ts`
7. import — `selectedRanked` from `./arena-state.ts`
8. import — `set_selectedRanked` from `./arena-state.ts`
9. import — `set_selectedRuleset` from `./arena-state.ts`
10. import type — `RankedCheckResult` from `./arena-types-results.ts`
11. import — `isPlaceholder` from `./arena-core.utils.ts`
12. import — `pushArenaState` from `./arena-core.utils.ts`
13. import — `showModeSelect` from `./arena-config-mode-select.ts`
14. blank
15. comment — RANKED PICKER section divider
16. blank
17. bind to function — `showRankedPicker` (exported)
18. blank
19. bind to function — `closeRankedPicker` (exported)
20. blank
21. comment — RULESET PICKER section divider
22. blank
23. bind to function — `showRulesetPicker` (exported)
24. blank
25. bind to function — `closeRulesetPicker` (exported)
26. blank

Notes: `getCurrentProfile` and `selectedRanked` are imported but not referenced.

## Agent 04

Read 174 lines of 174 total.

Agent 04 emitted a detailed op-by-op list but the substantive bindings in source order are:

- imports 1-5 (grouped): `safeRpc, getCurrentUser, getCurrentProfile` from `../auth.ts`; `selectedRanked, set_selectedRanked, set_selectedRuleset` from `./arena-state.ts`; type-only `RankedCheckResult` from `./arena-types-results.ts`; `isPlaceholder, pushArenaState` from `./arena-core.utils.ts`; `showModeSelect` from `./arena-config-mode-select.ts`
- bind to function (exported) — `showRankedPicker`
- bind to function (exported) — `closeRankedPicker(forward?: boolean)`
- bind to function (exported) — `showRulesetPicker`
- bind to function (exported) — `closeRulesetPicker(forward?: boolean)`

Notes: `getCurrentProfile` is imported but never referenced in this file (dead import); `selectedRanked` is imported but never referenced (only the setter is used). Two `close*Picker` functions share identical structural shape (getElementById → remove → forward branch → replaceState / back).

## Agent 05

Read 174 lines of 174 total.

1. comment — file header
2. comment — monolith split note
3. blank
4. import — `safeRpc` from `../auth.ts`
5. import — `getCurrentUser` from `../auth.ts`
6. import — `getCurrentProfile` from `../auth.ts`
7. import — `selectedRanked` from `./arena-state.ts`
8. import — `set_selectedRanked` from `./arena-state.ts`
9. import — `set_selectedRuleset` from `./arena-state.ts`
10. import type — `RankedCheckResult` from `./arena-types-results.ts`
11. import — `isPlaceholder` from `./arena-core.utils.ts`
12. import — `pushArenaState` from `./arena-core.utils.ts`
13. import — `showModeSelect` from `./arena-config-mode-select.ts`
14. blank
15-17. comments — RANKED PICKER divider
18. blank
19. bind to function — `showRankedPicker` (exported)
20. blank
21. bind to function — `closeRankedPicker` (exported)
22. blank
23-25. comments — RULESET PICKER divider
26. blank
27. bind to function — `showRulesetPicker` (exported)
28. blank
29. bind to function — `closeRulesetPicker` (exported)
30. blank

Notes: `getCurrentProfile` and `selectedRanked` are imported but not referenced.
