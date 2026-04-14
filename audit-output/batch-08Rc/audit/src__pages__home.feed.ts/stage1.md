# Stage 1 Outputs — src/pages/home.feed.ts

## Agent 01
1. comment — block comment: "Home — Live debate card feed"
2. import — `getSupabaseClient`, `getIsPlaceholderMode` from `'../auth.ts'`
3. import — `escapeHTML` from `'../config.ts'`
4. import — `bountyDot` from `'../bounties.ts'`
5. import — `ModeratorAsync` from `'../async.ts'`
6. import — type-only import of `LiveDebate` from `'./home.types.ts'`
7. blank
8. bind `fetchLiveDebates` to function definition
9. blank
10. bind `renderFeed` to function definition (exported)

## Agent 02
1. comment — block comment `/** Home — Live debate card feed */`
2. import — `getSupabaseClient`, `getIsPlaceholderMode` from `'../auth.ts'`
3. import — `escapeHTML` from `'../config.ts'`
4. import — `bountyDot` from `'../bounties.ts'`
5. import — `ModeratorAsync` from `'../async.ts'`
6. import — type-only import of `LiveDebate` from `'./home.types.ts'`
7. blank
8. bind `fetchLiveDebates` to function definition (async)
9. blank
10. bind `renderFeed` to function definition (async), exported

## Agent 03
1. comment — block comment `/** Home — Live debate card feed */`
2. import — `getSupabaseClient`, `getIsPlaceholderMode` from `'../auth.ts'`
3. import — `escapeHTML` from `'../config.ts'`
4. import — `bountyDot` from `'../bounties.ts'`
5. import — `ModeratorAsync` from `'../async.ts'`
6. import — type-only import of `LiveDebate` from `'./home.types.ts'`
7. blank
8. bind `fetchLiveDebates` to function definition (async, not exported)
9. blank
10. bind `renderFeed` to function definition (async, exported)

## Agent 04
1. comment — block comment `/* Home — Live debate card feed */`
2. import — `getSupabaseClient`, `getIsPlaceholderMode` from `'../auth.ts'`
3. import — `escapeHTML` from `'../config.ts'`
4. import — `bountyDot` from `'../bounties.ts'`
5. import — `ModeratorAsync` from `'../async.ts'`
6. import (type-only) — `LiveDebate` from `'./home.types.ts'`
7. blank
8. bind `fetchLiveDebates` to function definition
9. blank
10. bind `renderFeed` to function definition (exported)

## Agent 05
1. comment — block comment: "Home — Live debate card feed"
2. import — `getSupabaseClient`, `getIsPlaceholderMode` from `'../auth.ts'`
3. import — `escapeHTML` from `'../config.ts'`
4. import — `bountyDot` from `'../bounties.ts'`
5. import — `ModeratorAsync` from `'../async.ts'`
6. import (type-only) — `LiveDebate` from `'./home.types.ts'`
7. blank
8. bind `fetchLiveDebates` to function definition
9. blank
10. bind `renderFeed` to function definition (exported)
