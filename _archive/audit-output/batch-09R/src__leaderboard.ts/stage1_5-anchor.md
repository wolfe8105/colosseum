# Anchor List — src/leaderboard.ts

Source: src/leaderboard.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. fetchLeaderboard  (line 103)
2. getData  (line 158)
3. renderShimmer  (line 166)
4. showEloExplainer  (line 187)
5. renderList  (line 262)
6. render  (line 345)
7. setTab  (line 432)
8. setTime  (line 442)
9. loadMore  (line 451)
10. init  (line 463)

## Resolution notes

Both arbiter runs agreed. No reconciliation required.

- `ModeratorLeaderboard` (line 508): excluded — `const` bound to object literal, not a function definition.
- `escHtml` (line 67): excluded — value alias to imported `escapeHTML`, not a function definition in this file.
- `PLACEHOLDER_DATA` (line 86): excluded — array literal, not a function.
- State variables (`currentTab`, `currentTime`, `liveData`, `myRank`, `isLoading`, `currentOffset`, `hasMore`, `PAGE_SIZE`): excluded — scalar/value bindings.
- `document.addEventListener` callback (line 484): excluded — inline anonymous callback, not a named top-level binding.
- `ready.then()` callback (line 521): excluded — inline arrow, not a named top-level binding.
- Type aliases and interfaces (`LeaderboardTab`, `LeaderboardTimeFilter`, `LeaderboardTier`, `LeaderboardEntry`, `LeaderboardRpcRow`): excluded — type-only declarations.
