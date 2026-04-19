# Stage 1 Outputs — leaderboard.ts

## Agent 01
1. comment — block comment (lines 1–7)
2. blank — line 8
3. import — `FEATURES` from `./config.ts`
4. import — `ready` from `./auth.ts`
5. import — `render` from `./leaderboard.render.ts`
6. import — `fetchLeaderboard`, `setTab`, `setTime`, `loadMore` from `./leaderboard.fetch.ts`
7. import — `showEloExplainer` from `./leaderboard.elo.ts`
8. import — type-only import of `LeaderboardTab`, `LeaderboardTimeFilter` from `./leaderboard.types.ts`
9. blank — line 15
10. re-export — `export type { LeaderboardTab, LeaderboardTimeFilter }` (re-exports from prior type import)
11. re-export — `export type { LeaderboardEntry, LeaderboardTier }` from `./leaderboard.types.ts`
12. re-export — `export { render, setTab, setTime, loadMore, showEloExplainer }`
13. blank — line 19
14. bind name to function definition — `init`, exported
15. blank — line 33
16. top-level statement — `document.addEventListener('click', ...)` call executed at module load
17. blank — line 45
18. bind name to value — `ModeratorLeaderboard`, exported
19. top-level statement — `ready.then(() => init())` call executed at module load

## Agent 02
1. comment — block comment spanning lines 1–7
2. blank — line 8
3. import — `FEATURES` from `./config.ts`
4. import — `ready` from `./auth.ts`
5. import — `render` from `./leaderboard.render.ts`
6. import — `fetchLeaderboard`, `setTab`, `setTime`, `loadMore` from `./leaderboard.fetch.ts`
7. import — `showEloExplainer` from `./leaderboard.elo.ts`
8. import — type-only import of `LeaderboardTab`, `LeaderboardTimeFilter` from `./leaderboard.types.ts`
9. blank — line 15
10. re-export — `LeaderboardTab`, `LeaderboardTimeFilter`
11. re-export — `LeaderboardEntry`, `LeaderboardTier` from `./leaderboard.types.ts`
12. re-export — `render`, `setTab`, `setTime`, `loadMore`, `showEloExplainer`
13. blank — line 19
14. bind name to function definition — `init`, exported
15. blank — line 33
16. top-level statement — `document.addEventListener('click', ...)` call executed at module load
17. blank — line 45
18. bind name to value — `ModeratorLeaderboard`, exported
19. top-level statement — `ready.then(() => init())` call executed at module load

## Agent 03
1. comment — block comment (lines 1–7)
2. blank — line 8
3. import — `FEATURES` from `./config.ts`
4. import — `ready` from `./auth.ts`
5. import — `render` from `./leaderboard.render.ts`
6. import — `fetchLeaderboard`, `setTab`, `setTime`, `loadMore` from `./leaderboard.fetch.ts`
7. import — `showEloExplainer` from `./leaderboard.elo.ts`
8. import — type-only import of `LeaderboardTab`, `LeaderboardTimeFilter` from `./leaderboard.types.ts`
9. blank — line 15
10. re-export — `export type { LeaderboardTab, LeaderboardTimeFilter }`
11. re-export — `export type { LeaderboardEntry, LeaderboardTier }` from `./leaderboard.types.ts`
12. re-export — `export { render, setTab, setTime, loadMore, showEloExplainer }`
13. blank — line 19
14. bind name to function definition — `init` (exported)
15. blank — line 33
16. top-level statement — `document.addEventListener('click', ...)` call executed at module load
17. blank — line 45
18. bind name to value — `ModeratorLeaderboard` (exported)
19. top-level statement — `ready.then(() => init())` call executed at module load

## Agent 04
1. comment — block comment (lines 1–7)
2. blank — line 8
3. import — `FEATURES` from `./config.ts`
4. import — `ready` from `./auth.ts`
5. import — `render` from `./leaderboard.render.ts`
6. import — `fetchLeaderboard`, `setTab`, `setTime`, `loadMore` from `./leaderboard.fetch.ts`
7. import — `showEloExplainer` from `./leaderboard.elo.ts`
8. import — type-only `LeaderboardTab`, `LeaderboardTimeFilter` from `./leaderboard.types.ts`
9. blank — line 16
10. re-export — `LeaderboardTab`, `LeaderboardTimeFilter` (type re-export, no new binding)
11. re-export — `LeaderboardEntry`, `LeaderboardTier` from `./leaderboard.types.ts`
12. re-export — `render`, `setTab`, `setTime`, `loadMore`, `showEloExplainer` (value re-export)
13. blank — line 19
14. bind name to function definition — `init`, exported
15. blank — line 33
16. top-level statement — `document.addEventListener('click', ...)` call executed at module load
17. blank — line 45
18. bind name to value — `ModeratorLeaderboard`, exported
19. top-level statement — `ready.then(() => init())` call executed at module load

## Agent 05
1. comment — block comment (lines 1–7)
2. blank — line 8
3. import — `FEATURES` from `./config.ts`
4. import — `ready` from `./auth.ts`
5. import — `render` from `./leaderboard.render.ts`
6. import — `fetchLeaderboard`, `setTab`, `setTime`, `loadMore` from `./leaderboard.fetch.ts`
7. import — `showEloExplainer` from `./leaderboard.elo.ts`
8. import — type-only import of `LeaderboardTab`, `LeaderboardTimeFilter` from `./leaderboard.types.ts`
9. blank — line 15
10. re-export — `export type { LeaderboardTab, LeaderboardTimeFilter }`
11. re-export — `export type { LeaderboardEntry, LeaderboardTier }` from `./leaderboard.types.ts`
12. re-export — `export { render, setTab, setTime, loadMore, showEloExplainer }`
13. blank — line 19
14. bind name to function definition — `init`, exported
15. blank — line 33
16. top-level statement — `document.addEventListener('click', ...)` call executed at module load
17. blank — line 45
18. bind name to value — `ModeratorLeaderboard`, exported
19. top-level statement — `ready.then(() => init())` call executed at module load
