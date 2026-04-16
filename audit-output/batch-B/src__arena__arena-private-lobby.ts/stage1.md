# Stage 1 Outputs — arena-private-lobby.ts

## Agent 01

1. comment — block comment naming the file, describing extracted functions, and session track
2. blank
3. import — `safeRpc` from `../auth.ts`
4. import — `escapeHTML`, `showToast`, `friendlyError`, `DEBATE` from `../config.ts`
5. import — `view`, `selectedMode`, `selectedRanked`, `selectedRuleset`, `selectedRounds`, `selectedCategory`, `privateLobbyPollTimer`, `privateLobbyDebateId`, `screenEl`, `set_view`, `set_privateLobbyPollTimer`, `set_privateLobbyDebateId` from `./arena-state.ts`
6. import — type-only: `CurrentDebate`, `DebateMode`, `DebateRole` from `./arena-types.ts`
7. import — type-only: `PrivateLobbyResult`, `CheckPrivateLobbyResult` from `./arena-types-private-lobby.ts`
8. import — `AI_TOPICS` from `./arena-constants.ts`
9. import — `isPlaceholder`, `randomFrom`, `pushArenaState` from `./arena-core.ts`
10. import — `showMatchFound` from `./arena-match.ts`
11. blank
12. bind name to function definition — `createAndWaitPrivateLobby` (exported, async)
13. blank
14. bind name to function definition — `startPrivateLobbyPoll` (exported)
15. blank
16. bind name to function definition — `onPrivateLobbyMatched` (exported)
17. blank
18. bind name to function definition — `cancelPrivateLobby` (exported, async)

## Agent 02

1. comment — block comment naming the file and listing exported functions
2. blank
3. import — `safeRpc` from `../auth.ts`
4. import — `escapeHTML`, `showToast`, `friendlyError`, `DEBATE` from `../config.ts`
5. import — `view`, `selectedMode`, `selectedRanked`, `selectedRuleset`, `selectedRounds`, `selectedCategory`, `privateLobbyPollTimer`, `privateLobbyDebateId`, `screenEl`, `set_view`, `set_privateLobbyPollTimer`, `set_privateLobbyDebateId` from `./arena-state.ts`
6. import — type `CurrentDebate`, `DebateMode`, `DebateRole` from `./arena-types.ts`
7. import — type `PrivateLobbyResult`, `CheckPrivateLobbyResult` from `./arena-types-private-lobby.ts`
8. import — `AI_TOPICS` from `./arena-constants.ts`
9. import — `isPlaceholder`, `randomFrom`, `pushArenaState` from `./arena-core.ts`
10. import — `showMatchFound` from `./arena-match.ts`
11. blank
12. bind name to function definition — `createAndWaitPrivateLobby` (exported)
13. blank
14. bind name to function definition — `startPrivateLobbyPoll` (exported)
15. blank
16. bind name to function definition — `onPrivateLobbyMatched` (exported)
17. blank
18. bind name to function definition — `cancelPrivateLobby` (exported)

## Agent 03

1. comment — block comment: module header (lines 1–10)
2. blank
3. import — `safeRpc` from `../auth.ts`
4. import — `escapeHTML`, `showToast`, `friendlyError`, `DEBATE` from `../config.ts`
5. import — `view`, `selectedMode`, `selectedRanked`, `selectedRuleset`, `selectedRounds`, `selectedCategory`, `privateLobbyPollTimer`, `privateLobbyDebateId`, `screenEl`, `set_view`, `set_privateLobbyPollTimer`, `set_privateLobbyDebateId` from `./arena-state.ts`
6. import — (type-only) `CurrentDebate`, `DebateMode`, `DebateRole` from `./arena-types.ts`
7. import — (type-only) `PrivateLobbyResult`, `CheckPrivateLobbyResult` from `./arena-types-private-lobby.ts`
8. import — `AI_TOPICS` from `./arena-constants.ts`
9. import — `isPlaceholder`, `randomFrom`, `pushArenaState` from `./arena-core.ts`
10. import — `showMatchFound` from `./arena-match.ts`
11. blank
12. bind name to function definition — `createAndWaitPrivateLobby` (exported, async)
13. blank
14. bind name to function definition — `startPrivateLobbyPoll` (exported)
15. blank
16. bind name to function definition — `onPrivateLobbyMatched` (exported)
17. blank
18. bind name to function definition — `cancelPrivateLobby` (exported, async)

## Agent 04

1. comment — block comment: file header describing purpose and extraction history
2. blank
3. import — `safeRpc` from `'../auth.ts'`
4. import — `escapeHTML`, `showToast`, `friendlyError`, `DEBATE` from `'../config.ts'`
5. import — `view`, `selectedMode`, `selectedRanked`, `selectedRuleset`, `selectedRounds`, `selectedCategory`, `privateLobbyPollTimer`, `privateLobbyDebateId`, `screenEl`, `set_view`, `set_privateLobbyPollTimer`, `set_privateLobbyDebateId` from `'./arena-state.ts'`
6. import — type-only: `CurrentDebate`, `DebateMode`, `DebateRole` from `'./arena-types.ts'`
7. import — type-only: `PrivateLobbyResult`, `CheckPrivateLobbyResult` from `'./arena-types-private-lobby.ts'`
8. import — `AI_TOPICS` from `'./arena-constants.ts'`
9. import — `isPlaceholder`, `randomFrom`, `pushArenaState` from `'./arena-core.ts'`
10. import — `showMatchFound` from `'./arena-match.ts'`
11. blank
12. bind name to function definition — `createAndWaitPrivateLobby` (exported, async)
13. blank
14. bind name to function definition — `startPrivateLobbyPoll` (exported)
15. blank
16. bind name to function definition — `onPrivateLobbyMatched` (exported)
17. blank
18. bind name to function definition — `cancelPrivateLobby` (exported, async)

## Agent 05

1. comment — block comment (file header, lines 1–10)
2. blank
3. import — `safeRpc` from `'../auth.ts'`
4. import — `escapeHTML`, `showToast`, `friendlyError`, `DEBATE` from `'../config.ts'`
5. import — `view`, `selectedMode`, `selectedRanked`, `selectedRuleset`, `selectedRounds`, `selectedCategory`, `privateLobbyPollTimer`, `privateLobbyDebateId`, `screenEl`, `set_view`, `set_privateLobbyPollTimer`, `set_privateLobbyDebateId` from `'./arena-state.ts'`
6. import — (type-only) `CurrentDebate`, `DebateMode`, `DebateRole` from `'./arena-types.ts'`
7. import — (type-only) `PrivateLobbyResult`, `CheckPrivateLobbyResult` from `'./arena-types-private-lobby.ts'`
8. import — `AI_TOPICS` from `'./arena-constants.ts'`
9. import — `isPlaceholder`, `randomFrom`, `pushArenaState` from `'./arena-core.ts'`
10. import — `showMatchFound` from `'./arena-match.ts'`
11. blank
12. bind name to function definition — `createAndWaitPrivateLobby` (exported, async)
13. blank
14. bind name to function definition — `startPrivateLobbyPoll` (exported)
15. blank
16. bind name to function definition — `onPrivateLobbyMatched` (exported)
17. blank
18. bind name to function definition — `cancelPrivateLobby` (exported, async)
