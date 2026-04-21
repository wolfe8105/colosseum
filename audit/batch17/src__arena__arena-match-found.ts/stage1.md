# Stage 1 Outputs — src/arena/arena-match-found.ts

## Agent 01
Read 163 lines of 163 total.

1. comment — line 1
2. comment — line 2
3. comment — line 3
4. comment — line 4
5. comment — line 5
6. comment — line 6
7. comment — line 7
8. comment — line 8
9. comment — line 9
10. blank — line 10
11. import — line 11 (`safeRpc`, `getCurrentProfile` from `'../auth.ts'`)
12. import — line 12 (`escapeHTML`, `DEBATE` from `'../config.ts'`)
13. import — lines 13-19 (named bindings from `'./arena-state.ts'`)
14. import — line 20 (type-only `CurrentDebate` from `'./arena-types.ts'`)
15. import — line 21 (type-only `MatchData` from `'./arena-types-match.ts'`)
16. import — line 22 (`MATCH_ACCEPT_SEC`, `AI_TOTAL_ROUNDS`, `AI_TOPICS` from `'./arena-constants.ts'`)
17. import — line 23 (`isPlaceholder`, `randomFrom`, `pushArenaState` from `'./arena-core.utils.ts'`)
18. import — line 24 (`enterRoom` from `'./arena-room-enter.ts'`)
19. import — line 25 (`showPreDebate` from `'./arena-room-predebate.ts'`)
20. import — line 26 (`playIntroMusic` from `'./arena-sounds.ts'`)
21. import — line 27 (`clearMatchAcceptTimers` from `'./arena-match-timers.ts'`)
22. comment — lines 28-31
23. import — line 32 (`enterQueue` from `'./arena-queue.ts'`)
24. blank — line 33
25. bind name to function definition — `clearQueueTimersInline` (lines 34-37, not exported)
26. blank — line 38
27. bind name to function definition — `onMatchFound` (lines 39-68, exported)
28. blank — line 69
29. bind name to function definition — `showMatchFound` (lines 70-120, exported)
30. blank — line 121
31. bind name to function definition — `onMatchDecline` (lines 122-128, exported)
32. blank — line 129
33. bind name to function definition — `returnToQueueAfterDecline` (lines 130-137, exported)
34. blank — line 138
35. bind name to function definition — `startAIDebate` (lines 139-163, exported, async)

## Agent 02
Read 163 lines of 163 total.

1–9. comments — lines 1–9
10. blank — line 10
11. import — line 11
12. import — line 12
13. import — lines 13–19
14. import — line 20 (type-only)
15. import — line 21 (type-only)
16. import — line 22
17. import — line 23
18. import — line 24
19. import — line 25
20. import — line 26
21. import — line 27
22. comment — lines 28–31
23. import — line 32
24. blank — line 33
25. bind name to function definition — `clearQueueTimersInline` (lines 34–37)
26. blank — line 38
27. bind name to function definition — `onMatchFound` (lines 39–68, exported)
28. blank — line 69
29. bind name to function definition — `showMatchFound` (lines 70–120, exported)
30. blank — line 121
31. bind name to function definition — `onMatchDecline` (lines 122–128, exported)
32. blank — line 129
33. bind name to function definition — `returnToQueueAfterDecline` (lines 130–137, exported)
34. blank — line 138
35. bind name to function definition — `startAIDebate` (lines 139–163, exported async)

## Agent 03
Read 163 lines of 163 total.

[same inventory as Agents 01/02; 6 functions: clearQueueTimersInline (34-37), onMatchFound (39-68, exported), showMatchFound (70-120, exported), onMatchDecline (122-128, exported), returnToQueueAfterDecline (130-137, exported), startAIDebate (139-163, exported async); additional inline comments inside showMatchFound body at lines 82-83, 101-102, 108]

## Agent 04
Read 163 lines of 163 total.

[same inventory as above; 6 functions with same line ranges and export status]

## Agent 05
Read 163 lines of 163 total.

Summary of top-level bindings in source order:
1. Function `clearQueueTimersInline` (34-37) — internal, not exported
2. Function `onMatchFound` (39-68) — exported
3. Function `showMatchFound` (70-120) — exported
4. Function `onMatchDecline` (122-128) — exported
5. Function `returnToQueueAfterDecline` (130-137) — exported
6. Async function `startAIDebate` (139-163) — exported

No classes, type aliases, interfaces, enums, variable bindings, re-exports, declares, directives, or decorators at the top level.
